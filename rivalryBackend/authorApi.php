<?php
// ==================== CORS HEADERS ====================
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Session-Id");
header("Access-Control-Max-Age: 86400");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ==================== FIX: CUSTOM SESSION SAVE PATH ====================
$customSessionPath = __DIR__ . '/sessions';
if (!is_dir($customSessionPath)) {
    mkdir($customSessionPath, 0755, true);
}
session_save_path($customSessionPath);
// =======================================================================

// ==================== SESSION CONFIGURATION (no cookies) ====================
ini_set('session.use_cookies', 0);

$sessionId = $_SERVER['HTTP_X_SESSION_ID'] ?? null;
if ($sessionId) {
    session_id($sessionId);
}

session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized: No active session']);
    exit;
}

$authorId = $_SESSION['user_id'];

// ==================== REQUIREMENTS ====================
require_once __DIR__ . "/config.php";
require_once __DIR__ . "/notification_helper.php";

// ===== ADD MISSING COLUMNS =====
$columnsToCheck = [
    'cover_letter_path' => "ALTER TABLE manuscripts ADD cover_letter_path VARCHAR(255) DEFAULT NULL AFTER file_path",
    'payment_instructions' => "ALTER TABLE manuscripts ADD payment_instructions TEXT DEFAULT NULL AFTER payment_amount",
    'payment_amount_usd' => "ALTER TABLE manuscripts ADD payment_amount_usd DECIMAL(10,2) DEFAULT NULL AFTER payment_amount",
    'payment_date' => "ALTER TABLE manuscripts ADD payment_date DATETIME DEFAULT NULL",
    'payment_transaction_id' => "ALTER TABLE manuscripts ADD payment_transaction_id VARCHAR(100) DEFAULT NULL",
    'payment_notified_at' => "ALTER TABLE manuscripts ADD payment_notified_at DATETIME DEFAULT NULL",
    'galley_author_response' => "ALTER TABLE manuscripts ADD galley_author_response TEXT DEFAULT NULL",
    'galley_final_file' => "ALTER TABLE manuscripts ADD galley_final_file VARCHAR(255) DEFAULT NULL",
    'galley_proof_created_at' => "ALTER TABLE manuscripts ADD galley_proof_created_at DATETIME DEFAULT NULL",
    'galley_proof_responded_at' => "ALTER TABLE manuscripts ADD galley_proof_responded_at DATETIME DEFAULT NULL",
    'keywords' => "ALTER TABLE manuscripts ADD keywords TEXT DEFAULT NULL",
    'feedback_released' => "ALTER TABLE manuscripts ADD feedback_released TINYINT(1) DEFAULT 0"
];

foreach ($columnsToCheck as $col => $sql) {
    $check = $pdo->query("SHOW COLUMNS FROM manuscripts LIKE '$col'");
    if ($check === false || $check->rowCount() == 0) {
        $pdo->exec($sql);
    }
}

// Also ensure email_attachments columns
$checkSubject = $pdo->query("SHOW COLUMNS FROM email_attachments LIKE 'email_subject'");
if ($checkSubject === false || $checkSubject->rowCount() == 0) {
    $pdo->exec("ALTER TABLE email_attachments ADD email_subject VARCHAR(500) DEFAULT NULL AFTER decision_type");
}
$checkBody = $pdo->query("SHOW COLUMNS FROM email_attachments LIKE 'email_body'");
if ($checkBody === false || $checkBody->rowCount() == 0) {
    $pdo->exec("ALTER TABLE email_attachments ADD email_body TEXT DEFAULT NULL AFTER email_subject");
}
// Self-heal: revision_entries.reviewer_id must be nullable so the author's
// "General Revision Response" entry (reviewer_id = NULL) can be inserted.
try {
    $colCheck = $pdo->query("SHOW COLUMNS FROM revision_entries LIKE 'reviewer_id'");
    if ($colCheck && ($col = $colCheck->fetch(PDO::FETCH_ASSOC))) {
        if ($col['Null'] === 'NO') {
            $pdo->exec("ALTER TABLE revision_entries MODIFY reviewer_id INT DEFAULT NULL");
        }
    }
} catch (Throwable $e) {
    error_log('revision_entries reviewer_id self-heal skipped: ' . $e->getMessage());
}

// Data fix: decision emails stored as 'minor_revision'/'major_revision' by an older
// version of editorApi.makeDecision were never visible to the author, whose queries
// filter on decision_type = 'revision'. The UPDATE is idempotent (rows already
// stored as 'revision' are untouched), so it is safe to run on every request.
try {
    $pdo->exec("UPDATE email_attachments SET decision_type = 'revision'
                WHERE decision_type IN ('minor_revision', 'major_revision')
                  AND email_subject LIKE 'Decision on your manuscript%'");
} catch (Throwable $e) {
    error_log('decision_type normalization skipped: ' . $e->getMessage());
}

$action = $_GET['action'] ?? '';

function jsonInput(): ?array {
    $input = file_get_contents("php://input");
    return $input ? json_decode($input, true) : null;
}

function jsonResponse($data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

function errorResponse(string $message, int $code = 400): void {
    jsonResponse(["error" => $message], $code);
}

/**
 * Format manuscript ID for display (e.g., "AFMJ-October-2025-00001")
 */
function formatManuscriptDisplayId(int $id, string $dateString): string {
    $timestamp = strtotime($dateString);
    $month = strtoupper(date('F', $timestamp));
    $year = date('Y', $timestamp);
    $paddedId = str_pad($id, 5, '0', STR_PAD_LEFT);
    return "AFMJ-{$month}-{$year}-{$paddedId}";
}

function uploadFile(array $file, string $subfolder, array $allowedExtensions = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'], int $maxSize = 10 * 1024 * 1024): ?string {
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errors = [
            UPLOAD_ERR_INI_SIZE   => 'File exceeds upload_max_filesize',
            UPLOAD_ERR_FORM_SIZE  => 'File exceeds MAX_FILE_SIZE',
            UPLOAD_ERR_PARTIAL    => 'File only partially uploaded',
            UPLOAD_ERR_NO_FILE    => 'No file uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            UPLOAD_ERR_EXTENSION  => 'File upload stopped by extension',
        ];
        $message = $errors[$file['error']] ?? 'Unknown upload error';
        throw new Exception($message);
    }

    if ($file['size'] > $maxSize) {
        throw new Exception("File exceeds maximum size of " . ($maxSize / 1024 / 1024) . "MB");
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, $allowedExtensions)) {
        throw new Exception("File type not allowed. Allowed: " . implode(', ', $allowedExtensions));
    }

    $uploadDir = __DIR__ . "/../uploads/" . trim($subfolder, '/') . "/";
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    $safeName = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9\.\-]/', '_', $file['name']);
    $targetPath = $uploadDir . $safeName;
    if (move_uploaded_file($file['tmp_name'], $targetPath)) {
        return "uploads/" . trim($subfolder, '/') . "/" . $safeName;
    } else {
        throw new Exception("Failed to move uploaded file");
    }
}

try {

switch ($action) {

    case "getDashboardStats":
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM manuscripts WHERE author_id = ? AND deleted_at IS NULL");
        $stmt->execute([$authorId]);
        $totalSubmissions = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM manuscripts WHERE author_id = ? AND status = 'under_review' AND deleted_at IS NULL");
        $stmt->execute([$authorId]);
        $underReview = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("
            SELECT COUNT(DISTINCT m.id)
            FROM manuscripts m
            LEFT JOIN manuscript_revisions mr ON mr.manuscript_id = m.id
            LEFT JOIN revision_entries re ON re.revision_id = mr.id AND re.addressed = 0
            WHERE m.author_id = ?
              AND m.deleted_at IS NULL
              AND (m.status = 'revision_requested' OR re.id IS NOT NULL)
        ");
        $stmt->execute([$authorId]);
        $revisionsRequired = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM manuscripts WHERE author_id = ? AND status = 'accepted' AND deleted_at IS NULL");
        $stmt->execute([$authorId]);
        $accepted = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM manuscripts WHERE author_id = ? AND status = 'rejected' AND deleted_at IS NULL");
        $stmt->execute([$authorId]);
        $rejected = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM manuscripts WHERE author_id = ? AND status = 'published' AND deleted_at IS NULL");
        $stmt->execute([$authorId]);
        $published = (int)$stmt->fetchColumn();

        jsonResponse([
            "totalSubmissions" => $totalSubmissions,
            "underReview"      => $underReview,
            "revisionsRequired" => $revisionsRequired,
            "accepted"         => $accepted,
            "rejected"         => $rejected,
            "published"        => $published
        ]);
        break;

    case "getSidebarCounts":
        // Flat keys so it works with useSidebarCounts() (no nested objects)
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM manuscripts WHERE author_id = ? AND deleted_at IS NULL");
        $stmt->execute([$authorId]);
        $totalSubmissions = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM manuscripts WHERE author_id = ? AND status = 'under_review' AND deleted_at IS NULL");
        $stmt->execute([$authorId]);
        $underReview = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("
            SELECT COUNT(DISTINCT m.id)
            FROM manuscripts m
            LEFT JOIN manuscript_revisions mr ON mr.manuscript_id = m.id
            LEFT JOIN revision_entries re ON re.revision_id = mr.id AND re.addressed = 0
            WHERE m.author_id = ?
              AND m.deleted_at IS NULL
              AND (m.status = 'revision_requested' OR re.id IS NOT NULL)
        ");
        $stmt->execute([$authorId]);
        $revisionsRequired = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM manuscripts WHERE author_id = ? AND status = 'accepted' AND deleted_at IS NULL");
        $stmt->execute([$authorId]);
        $accepted = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM manuscripts WHERE author_id = ? AND status = 'rejected' AND deleted_at IS NULL");
        $stmt->execute([$authorId]);
        $rejected = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare("SELECT COUNT(*) FROM manuscripts WHERE author_id = ? AND status = 'published' AND deleted_at IS NULL");
        $stmt->execute([$authorId]);
        $published = (int)$stmt->fetchColumn();

        jsonResponse([
            "totalSubmissions"  => $totalSubmissions,
            "underReview"       => $underReview,
            "revisionsRequired" => $revisionsRequired,
            "accepted"          => $accepted,
            "rejected"          => $rejected,
            "published"         => $published,
        ]);
        break;

    case "getActiveManuscripts":
        $stmt = $pdo->prepare("
            SELECT
                m.id,
                m.slug,
                m.title,
                m.status,
                m.created_at,
                CASE
                    WHEN m.status = 'revision_requested' THEN 1
                    WHEN EXISTS (
                        SELECT 1
                        FROM manuscript_revisions mr
                        JOIN revision_entries re ON re.revision_id = mr.id
                        WHERE mr.manuscript_id = m.id AND re.addressed = 0
                    ) THEN 1 ELSE 0
                END AS has_pending_revision
            FROM manuscripts m
            WHERE m.author_id = ?
              AND m.status NOT IN ('published', 'rejected')
              AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC
        ");
        $stmt->execute([$authorId]);
        $manuscripts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $out = array_map(function($row) {
            return [
                'id' => (int)$row['id'],
                'manuscriptId' => formatManuscriptDisplayId($row['id'], $row['created_at']),
                'slug' => $row['slug'],
                'title' => $row['title'],
                'status' => $row['status'],
                'submittedAt' => $row['created_at'],
                'hasPendingRevision' => (bool)$row['has_pending_revision']
            ];
        }, $manuscripts);
        jsonResponse($out);
        break;

    case "getManuscriptDetails":
        $manuscriptId = (int)($_GET['manuscript_id'] ?? 0);
        if (!$manuscriptId) errorResponse("manuscript_id required");

        $check = $pdo->prepare("SELECT id FROM manuscripts WHERE id = ? AND author_id = ? AND deleted_at IS NULL");
        $check->execute([$manuscriptId, $authorId]);
        if (!$check->fetch()) errorResponse("Manuscript not found or access denied", 404);

        // Include feedback_released in the query
        $stmt = $pdo->prepare("
            SELECT
                m.id,
                m.slug,
                m.title,
                m.abstract,
                m.background,
                m.objective,
                m.methods,
                m.results,
                m.conclusion,
                m.study_type,
                m.status,
                m.file_path,
                m.created_at AS submitted_at,
                m.payment_status,
                m.galley_proof_status,
                m.galley_proof_file,
                m.author_response_file,
                m.keywords,
                m.feedback_released,
                u.name AS author_name,
                editor.name AS editor_name
            FROM manuscripts m
            JOIN users u ON u.id = m.author_id
            LEFT JOIN users editor ON editor.id = m.editor_id
            WHERE m.id = ? AND m.deleted_at IS NULL
        ");
        $stmt->execute([$manuscriptId]);
        $manuscript = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$manuscript) errorResponse("Manuscript not found", 404);

        // Only fetch reviews if feedback has been released by admin
        $reviews = [];
        if ($manuscript['feedback_released'] == 1) {
            $stmt = $pdo->prepare("
                SELECT
                    r.id,
                    r.accepted_at,
                    r.completed_at,
                    rs.originality,
                    rs.methodology,
                    rs.clarity,
                    rs.relevance,
                    rs.comments_to_author,
                    rs.confidential_comments,
                    rs.recommendation,
                    rev.name AS reviewer_name
                FROM reviews r
                LEFT JOIN review_scores rs ON rs.review_id = r.id
                LEFT JOIN users rev ON rev.id = r.reviewer_id
                WHERE r.manuscript_id = ? AND r.completed_at IS NOT NULL
                ORDER BY r.completed_at DESC
            ");
            $stmt->execute([$manuscriptId]);
            $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        $stmt = $pdo->prepare("
            SELECT
                re.id,
                mr.revision_number,
                re.reviewer_comment,
                re.author_response,
                re.addressed,
                rev.name AS reviewer_name
            FROM revision_entries re
            JOIN manuscript_revisions mr ON mr.id = re.revision_id
            JOIN users rev ON rev.id = re.reviewer_id
            WHERE mr.manuscript_id = ?
            ORDER BY mr.submitted_at DESC
        ");
        $stmt->execute([$manuscriptId]);
        $revisionEntries = $stmt->fetchAll(PDO::FETCH_ASSOC);

        jsonResponse([
            "manuscript" => $manuscript,
            "reviews"    => $reviews,
            "revisions"  => $revisionEntries
        ]);
        break;

    case "listSubmissions":
        $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
        $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 10;
        $offset = ($page - 1) * $limit;

        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM manuscripts WHERE author_id = ? AND deleted_at IS NULL");
        $countStmt->execute([$authorId]);
        $total = (int)$countStmt->fetchColumn();

        $stmt = $pdo->prepare("
            SELECT
                m.id,
                m.slug,
                m.title,
                m.study_type AS section,
                m.keywords,
                m.status,
                m.created_at AS submitted,
                m.created_at AS updated,
                CASE
                    WHEN m.status = 'revision_requested' THEN 1
                    WHEN EXISTS (
                        SELECT 1
                        FROM manuscript_revisions mr
                        JOIN revision_entries re ON re.revision_id = mr.id
                        WHERE mr.manuscript_id = m.id AND re.addressed = 0
                    ) THEN 1 ELSE 0
                END AS has_pending_revision
            FROM manuscripts m
            WHERE m.author_id = ?
              AND m.deleted_at IS NULL
            ORDER BY m.created_at DESC
            LIMIT ? OFFSET ?
        ");
        $stmt->bindValue(1, $authorId, PDO::PARAM_INT);
        $stmt->bindValue(2, $limit, PDO::PARAM_INT);
        $stmt->bindValue(3, $offset, PDO::PARAM_INT);
        $stmt->execute();
        $submissions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $out = array_map(function($row) {
            $displayStatus = $row['status'];
            if ($row['status'] === 'revision_requested') {
                $displayStatus = 'Revision Requested';
            } elseif ($row['status'] === 'revised') {
                $displayStatus = 'Revised';
            } elseif ($row['status'] === 'under_review') {
                $displayStatus = 'Under Review';
            } elseif ($row['status'] === 'accepted') {
                $displayStatus = 'Accepted';
            } elseif ($row['status'] === 'rejected') {
                $displayStatus = 'Rejected';
            } elseif ($row['status'] === 'published') {
                $displayStatus = 'Published';
            } elseif ($row['status'] === 'submitted') {
                $displayStatus = 'Submitted';
            } else {
                $displayStatus = ucfirst($row['status']);
            }

            return [
                'id' => formatManuscriptDisplayId($row['id'], $row['submitted']),
                'slug' => $row['slug'],
                'title' => $row['title'],
                'section' => $row['section'] ?? 'General',
                'keywords' => $row['keywords'] ?? '',
                'status' => $displayStatus,
                'submitted' => $row['submitted'],
                'updated' => $row['updated'],
                'numericId' => (int)$row['id']
            ];
        }, $submissions);

        jsonResponse([
            'data' => $out,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => ceil($total / $limit)
            ]
        ]);
        break;

    case "submitManuscript":
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            errorResponse("Method not allowed", 405);
        }

        $title = $_POST['title'] ?? '';
        $abstract = $_POST['abstract'] ?? '';
        $study_type = $_POST['study_type'] ?? '';
        $background = $_POST['background'] ?? '';
        $objective = $_POST['objective'] ?? '';
        $methods = $_POST['methods'] ?? '';
        $results = $_POST['results'] ?? '';
        $conclusion = $_POST['conclusion'] ?? '';
        $co_authors = $_POST['co_authors'] ?? '';
        $keywords = $_POST['keywords'] ?? '';

        if (!$title || !$abstract || !$study_type) {
            errorResponse("Title, abstract, and study type are required", 400);
        }

        // Get author name
        $stmt = $pdo->prepare("SELECT name FROM users WHERE id = ?");
        $stmt->execute([$authorId]);
        $authorName = $stmt->fetchColumn();

        $baseSlug = preg_replace('/[^a-z0-9]+/i', '-', strtolower(trim($title)));
        $baseSlug = substr($baseSlug, 0, 40);
        $slug = $baseSlug;
        $counter = 1;
        while (true) {
            $check = $pdo->prepare("SELECT id FROM manuscripts WHERE slug = ?");
            $check->execute([$slug]);
            if (!$check->fetch()) break;
            $slug = $baseSlug . '-' . $counter++;
        }

        $manuscriptPath = null;
        if (isset($_FILES['manuscript_file']) && $_FILES['manuscript_file']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../uploads/manuscripts/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
            $ext = pathinfo($_FILES['manuscript_file']['name'], PATHINFO_EXTENSION);
            $filename = 'manuscript_' . $authorId . '_' . time() . '.' . $ext;
            $destination = $uploadDir . $filename;
            if (move_uploaded_file($_FILES['manuscript_file']['tmp_name'], $destination)) {
                $manuscriptPath = 'uploads/manuscripts/' . $filename;
            } else {
                errorResponse("Failed to upload manuscript file", 500);
            }
        } else {
            errorResponse("Manuscript file is required", 400);
        }

        $coverLetterPath = null;
        if (isset($_FILES['cover_letter']) && $_FILES['cover_letter']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../uploads/cover_letters/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
            $ext = pathinfo($_FILES['cover_letter']['name'], PATHINFO_EXTENSION);
            $filename = 'cover_' . $authorId . '_' . time() . '.' . $ext;
            $destination = $uploadDir . $filename;
            if (move_uploaded_file($_FILES['cover_letter']['tmp_name'], $destination)) {
                $coverLetterPath = 'uploads/cover_letters/' . $filename;
            }
        }

        $stmt = $pdo->prepare("
            INSERT INTO manuscripts
            (title, slug, study_type, status, author_id, abstract, background, objective, methods, results, conclusion, keywords, file_path, cover_letter_path, created_at)
            VALUES (?, ?, ?, 'submitted', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $title,
            $slug,
            $study_type,
            $authorId,
            $abstract,
            $background,
            $objective,
            $methods,
            $results,
            $conclusion,
            $keywords,
            $manuscriptPath,
            $coverLetterPath
        ]);
        $manuscriptId = $pdo->lastInsertId();

        // Notify author
        createNotification(
            $authorId,
            'manuscript-submitted',
            'Manuscript Submitted',
            "Your manuscript \"$title\" has been successfully submitted and is pending review.",
            $manuscriptId
        );

        // Notify admins
        $displayId = formatManuscriptDisplayId($manuscriptId, date('Y-m-d H:i:s'));
        notifyAdmins(
            'manuscript-submitted',
            'New Manuscript Submitted',
            "A new manuscript \"$title\" (ID: $displayId) has been submitted by $authorName.",
            $manuscriptId
        );

        jsonResponse([
            "success" => true,
            "message" => "Manuscript submitted successfully",
            "manuscript_id" => $manuscriptId,
            "slug" => $slug,
            "display_id" => $displayId
        ], 201);
        break;

    case "getRevisions":
        // Include manuscripts the EIC has requested a revision for, even when no
        // reviewer comments were attached (e.g. decision made without entries).
        $stmt = $pdo->prepare("
            SELECT DISTINCT m.id, m.slug, m.title, m.status, m.created_at
            FROM manuscripts m
            LEFT JOIN manuscript_revisions mr ON mr.manuscript_id = m.id
            LEFT JOIN revision_entries re ON re.revision_id = mr.id AND re.addressed = 0
            WHERE m.author_id = ?
              AND m.deleted_at IS NULL
              AND (m.status = 'revision_requested' OR re.id IS NOT NULL)
            ORDER BY m.created_at DESC
        ");
        $stmt->execute([$authorId]);
        $manuscripts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $result = [];
        foreach ($manuscripts as $man) {
            $stmt2 = $pdo->prepare("
                SELECT
                    re.id AS entry_id,
                    mr.id AS revision_id,
                    mr.revision_number,
                    mr.submitted_at,
                    re.reviewer_comment,
                    re.author_response,
                    re.addressed,
                    u.name AS reviewer_name
                FROM revision_entries re
                JOIN manuscript_revisions mr ON mr.id = re.revision_id
                LEFT JOIN users u ON u.id = re.reviewer_id
                WHERE mr.manuscript_id = ?
                ORDER BY mr.submitted_at DESC
            ");
            $stmt2->execute([$man['id']]);
            $entries = $stmt2->fetchAll(PDO::FETCH_ASSOC);

            $pendingRevisionId = null;
            foreach ($entries as $e) {
                if (!$e['addressed']) {
                    $pendingRevisionId = $e['revision_id'];
                    break;
                }
            }

            $revStmt = $pdo->prepare("
                SELECT
                    id AS revision_id,
                    revision_number,
                    submitted_at,
                    revised_file,
                    response_file
                FROM manuscript_revisions
                WHERE manuscript_id = ?
                ORDER BY revision_number ASC
            ");
            $revStmt->execute([$man['id']]);
            $revisionsData = $revStmt->fetchAll(PDO::FETCH_ASSOC);

            $revisionHistory = [];
            foreach ($revisionsData as $rev) {
                $isPending = ($rev['revision_id'] == $pendingRevisionId);
                $revisionHistory[] = [
                    'revision_number' => (int)$rev['revision_number'],
                    'submitted_at'    => $rev['submitted_at'],
                    'revised_file'    => $rev['revised_file'],
                    'response_file'   => $rev['response_file'],
                    'is_pending'      => $isPending
                ];
            }

            $emailStmt = $pdo->prepare("
                SELECT email_subject, email_body, created_at
                FROM email_attachments
                WHERE manuscript_id = ? AND decision_type = 'revision'
                ORDER BY created_at DESC
                LIMIT 1
            ");
            $emailStmt->execute([$man['id']]);
            $email = $emailStmt->fetch(PDO::FETCH_ASSOC);

            $attStmt = $pdo->prepare("
                SELECT id, file_path, decision_type, created_at
                FROM email_attachments
                WHERE manuscript_id = ? AND decision_type = 'revision'
                ORDER BY created_at ASC
            ");
            $attStmt->execute([$man['id']]);
            $attachments = $attStmt->fetchAll(PDO::FETCH_ASSOC);

            $outAttachments = array_map(function($att) {
                return [
                    'id' => (int)$att['id'],
                    'file_path' => $att['file_path'],
                    'decision_type' => $att['decision_type'],
                    'created_at' => $att['created_at']
                ];
            }, $attachments);

            $result[] = [
                'manuscript' => [
                    'id' => (int)$man['id'],
                    'slug' => $man['slug'],
                    'title' => $man['title'],
                    'status' => $man['status'],
                    'displayId' => formatManuscriptDisplayId($man['id'], $man['created_at'])
                ],
                'revisionEntries' => array_map(function($e) {
                    return [
                        'entry_id' => (int)$e['entry_id'],
                        'revision_id' => (int)$e['revision_id'],
                        'revision_number' => (int)$e['revision_number'],
                        'submitted_at' => $e['submitted_at'],
                        'reviewer_comment' => $e['reviewer_comment'],
                        'author_response' => $e['author_response'],
                        'addressed' => (bool)$e['addressed'],
                        'reviewer_name' => $e['reviewer_name'],
                    ];
                }, $entries),
                'revisionHistory' => $revisionHistory,
                'email_subject' => $email ? $email['email_subject'] : null,
                'email_body'    => $email ? $email['email_body'] : null,
                'attachments'   => $outAttachments
            ];
        }

        jsonResponse($result);
        break;

    case "submitRevision":
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            errorResponse("Method not allowed", 405);
        }

        $manuscriptId = isset($_POST['manuscript_id']) ? (int)$_POST['manuscript_id'] : 0;
        $responseMessage = $_POST['response_message'] ?? '';

        if (!$manuscriptId) errorResponse("manuscript_id required", 400);
        if (!$responseMessage) errorResponse("Response message is required", 400);

        $check = $pdo->prepare("SELECT id, title FROM manuscripts WHERE id = ? AND author_id = ? AND deleted_at IS NULL");
        $check->execute([$manuscriptId, $authorId]);
        $man = $check->fetch(PDO::FETCH_ASSOC);
        if (!$man) errorResponse("Manuscript not found or access denied", 404);
        $title = $man['title'];

        $pendingStmt = $pdo->prepare("
            SELECT re.id
            FROM revision_entries re
            JOIN manuscript_revisions mr ON mr.id = re.revision_id
            WHERE mr.manuscript_id = ? AND re.addressed = 0
        ");
        $pendingStmt->execute([$manuscriptId]);
        $pendingEntries = $pendingStmt->fetchAll(PDO::FETCH_COLUMN);

        // The EIC may request a revision without attaching reviewer-comment
        // entries (e.g. decision made via the revision email only). In that
        // case there is nothing to mark addressed — allow the submission as
        // long as the manuscript is actually in the revision_requested state.
        if (empty($pendingEntries)) {
            $statusStmt = $pdo->prepare("SELECT status FROM manuscripts WHERE id = ?");
            $statusStmt->execute([$manuscriptId]);
            $mStatus = $statusStmt->fetchColumn();
            if ($mStatus !== 'revision_requested') {
                errorResponse("No pending revision entries found for this manuscript", 400);
            }
            $pendingEntries = [];
        }

        $stmt = $pdo->prepare("
            SELECT id, revision_number
            FROM manuscript_revisions
            WHERE manuscript_id = ?
              AND (revised_file IS NULL OR response_file IS NULL)
            ORDER BY revision_number DESC
            LIMIT 1
        ");
        $stmt->execute([$manuscriptId]);
        $existingRevision = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existingRevision) {
            $revisionNumber = $existingRevision['revision_number'];
        } else {
            $stmt = $pdo->prepare("SELECT MAX(revision_number) FROM manuscript_revisions WHERE manuscript_id = ?");
            $stmt->execute([$manuscriptId]);
            $maxRev = (int)$stmt->fetchColumn();
            $revisionNumber = $maxRev + 1;
        }

        $revisedPath = null;
        if (isset($_FILES['revised_file']) && $_FILES['revised_file']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../uploads/revisions/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
            $ext = pathinfo($_FILES['revised_file']['name'], PATHINFO_EXTENSION);
            $filename = 'revised_' . $manuscriptId . '_v' . $revisionNumber . '_' . time() . '.' . $ext;
            $destination = $uploadDir . $filename;
            if (move_uploaded_file($_FILES['revised_file']['tmp_name'], $destination)) {
                $revisedPath = 'uploads/revisions/' . $filename;
            } else {
                errorResponse("Failed to upload revised manuscript", 500);
            }
        } else {
            // Give the author a precise reason instead of a misleading "file is required".
            // The most common real cause is the file exceeding the server's
            // upload_max_filesize / post_max_size, which PHP reports as a non-OK
            // upload error code (or drops $_FILES entirely).
            $uploadErr = $_FILES['revised_file']['error'] ?? null;
            if ($uploadErr !== null) {
                $msgMap = [
                    UPLOAD_ERR_INI_SIZE   => 'The revised manuscript exceeds the server upload limit. Please reduce the file size (compress images) and try again.',
                    UPLOAD_ERR_FORM_SIZE  => 'The revised manuscript exceeds the allowed upload size. Please reduce the file size and try again.',
                    UPLOAD_ERR_PARTIAL    => 'The revised manuscript was only partially uploaded (connection interrupted). Please try again.',
                    UPLOAD_ERR_NO_FILE    => 'Revised manuscript file is required',
                    UPLOAD_ERR_NO_TMP_DIR => 'Server misconfiguration: missing temporary upload folder. Contact the administrator.',
                    UPLOAD_ERR_CANT_WRITE => 'Server could not write the uploaded file. Contact the administrator.',
                    UPLOAD_ERR_EXTENSION  => 'A PHP extension stopped the file upload. Contact the administrator.',
                ];
                errorResponse($msgMap[$uploadErr] ?? 'Revised manuscript could not be uploaded (error code ' . $uploadErr . ')', 400);
            } elseif (!empty($_SERVER['CONTENT_LENGTH']) && empty($_POST) && empty($_FILES)) {
                // POST body larger than post_max_size: PHP discards $_POST and $_FILES
                errorResponse('The upload exceeds the server maximum request size. Please compress the revised manuscript (reduce image sizes) and try again.', 400);
            } else {
                errorResponse("Revised manuscript file is required", 400);
            }
        }

        $responsePath = null;
        if (isset($_FILES['response_file']) && $_FILES['response_file']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../uploads/revisions/';
            $ext = pathinfo($_FILES['response_file']['name'], PATHINFO_EXTENSION);
            $filename = 'response_' . $manuscriptId . '_v' . $revisionNumber . '_' . time() . '.' . $ext;
            $destination = $uploadDir . $filename;
            if (move_uploaded_file($_FILES['response_file']['tmp_name'], $destination)) {
                $responsePath = 'uploads/revisions/' . $filename;
            }
        }

        $pdo->beginTransaction();
        try {
            if ($existingRevision) {
                $updateSql = "UPDATE manuscript_revisions SET ";
                $params = [];
                $sets = [];
                if ($revisedPath) {
                    $sets[] = "revised_file = ?";
                    $params[] = $revisedPath;
                }
                if ($responsePath) {
                    $sets[] = "response_file = ?";
                    $params[] = $responsePath;
                }
                $sets[] = "submitted_at = NOW()";
                $updateSql .= implode(", ", $sets) . " WHERE id = ?";
                $params[] = $existingRevision['id'];
                $stmt = $pdo->prepare($updateSql);
                $stmt->execute($params);
                $revisionId = $existingRevision['id'];
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO manuscript_revisions (manuscript_id, revision_number, revised_file, response_file, submitted_at)
                    VALUES (?, ?, ?, ?, NOW())
                ");
                $stmt->execute([$manuscriptId, $revisionNumber, $revisedPath, $responsePath]);
                $revisionId = (int)$pdo->lastInsertId();
            }

            if (!empty($pendingEntries)) {
                $updateStmt = $pdo->prepare("
                    UPDATE revision_entries
                    SET addressed = 1, author_response = ?
                    WHERE id = ?
                ");
                foreach ($pendingEntries as $entryId) {
                    $updateStmt->execute([$responseMessage, $entryId]);
                }
            } else {
                // The revision request had no per-comment entries (e.g. decision was
                // sent via the revision email only). Persist the author's response
                // text as a general entry on this revision so the admin still sees it
                // under "Detailed Entries" on the Revised tab.
                $pdo->prepare("
                    INSERT INTO revision_entries
                        (revision_id, reviewer_id, reviewer_comment, author_response, addressed)
                    VALUES (?, NULL, 'General Revision Response', ?, 1)
                ")->execute([$revisionId, $responseMessage]);
            }

            // Move the manuscript into the 'revised' lifecycle state so the admin
            // sees it in the "Revised Manuscript" tab and can reassign reviewers.
            $pdo->prepare("
                UPDATE manuscripts
                SET status = 'revised'
                WHERE id = ? AND deleted_at IS NULL AND status IN ('revision_requested', 'under_review')
            ")->execute([$manuscriptId]);

            $pdo->commit();

            // Notify author
            createNotification(
                $authorId,
                'revision-submitted',
                'Revision Submitted',
                "Your revision for manuscript \"$title\" has been submitted.",
                $manuscriptId
            );

            // Notify admins
            notifyAdmins(
                'revision-submitted',
                'Revision Submitted',
                "A revision for manuscript \"$title\" (ID: " . formatManuscriptDisplayId($manuscriptId, date('Y-m-d H:i:s')) . ") has been submitted.",
                $manuscriptId
            );

            jsonResponse([
                "success" => true,
                "message" => "Revision submitted successfully",
                "revision_id" => $revisionId,
                "revision_number" => $revisionNumber
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            errorResponse("Failed to submit revision: " . $e->getMessage(), 500);
        }
        break;

    case "getPublishedManuscripts":
        $stmt = $pdo->prepare("
            SELECT
                m.id,
                m.slug,
                m.title,
                m.abstract,
                m.study_type,
                m.file_path,
                m.published_at,
                m.views,
                m.downloads,
                m.created_at,
                CONCAT('10.1234/afmj.', m.slug) AS doi,
                CONCAT('Vol ', YEAR(m.published_at), ', Issue ', QUARTER(m.published_at)) AS issue
            FROM manuscripts m
            WHERE m.author_id = ? AND m.status = 'published' AND m.deleted_at IS NULL
            ORDER BY m.published_at DESC
        ");
        $stmt->execute([$authorId]);
        $published = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $out = array_map(function($row) {
            return [
                'id' => (int)$row['id'],
                'slug' => $row['slug'],
                'displayId' => formatManuscriptDisplayId($row['id'], $row['created_at']),
                'title' => $row['title'],
                'abstract' => $row['abstract'],
                'study_type' => $row['study_type'],
                'file_path' => $row['file_path'],
                'doi' => $row['doi'],
                'issue' => $row['issue'] ?? 'TBD',
                'published_at' => $row['published_at'],
                'views' => (int)$row['views'],
                'downloads' => (int)$row['downloads'],
            ];
        }, $published);

        jsonResponse($out);
        break;

    case "getProfile":
        $stmt = $pdo->prepare("SELECT id, name, email, institution, orcid FROM users WHERE id = ?");
        $stmt->execute([$authorId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$user) errorResponse("User not found", 404);
        jsonResponse($user);
        break;

    case "updateProfile":
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            errorResponse("Method not allowed", 405);
        }
        $data = jsonInput();
        if (!$data) errorResponse("Invalid JSON", 400);

        $name = $data['name'] ?? '';
        $email = $data['email'] ?? '';
        $institution = $data['institution'] ?? '';
        $orcid = $data['orcid'] ?? '';

        if (!$name || !$email) {
            errorResponse("Name and email are required", 400);
        }

        $check = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
        $check->execute([$email, $authorId]);
        if ($check->fetch()) {
            errorResponse("Email already in use", 409);
        }

        $stmt = $pdo->prepare("UPDATE users SET name = ?, email = ?, institution = ?, orcid = ? WHERE id = ?");
        $stmt->execute([$name, $email, $institution, $orcid, $authorId]);

        createNotification(
            $authorId,
            'profile-updated',
            'Profile Updated',
            "Your profile information has been updated successfully."
        );

        jsonResponse(["success" => true, "message" => "Profile updated successfully"]);
        break;

    case "getNotifications":
        $stmt = $pdo->prepare("
            SELECT id, type, title, description, related_manuscript_id, is_read, created_at
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        ");
        $stmt->execute([$authorId]);
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $out = array_map(function($row) {
            return [
                'id' => (int)$row['id'],
                'type' => $row['type'],
                'title' => $row['title'],
                'description' => $row['description'],
                'related_manuscript_id' => $row['related_manuscript_id'] ? (int)$row['related_manuscript_id'] : null,
                'is_read' => (bool)$row['is_read'],
                'created_at' => $row['created_at'],
            ];
        }, $notifications);

        jsonResponse($out);
        break;

    case "getPendingPrePublicationActions":
        $stmt = $pdo->prepare("
            SELECT
                m.id,
                m.slug,
                m.title,
                m.created_at,
                'galley' AS action_type,
                m.galley_proof_status,
                m.galley_proof_file,
                m.galley_proof_comment,
                m.galley_author_response,
                m.galley_final_file,
                NULL AS payment_amount,
                NULL AS payment_amount_usd,
                NULL AS payment_status,
                NULL AS payment_instructions,
                NULL AS payment_proof
            FROM manuscripts m
            WHERE m.author_id = ? AND m.galley_proof_status = 'withAuthor' AND m.deleted_at IS NULL
        ");
        $stmt->execute([$authorId]);
        $galleyActions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $pdo->prepare("
            SELECT
                m.id,
                m.slug,
                m.title,
                m.created_at,
                'payment' AS action_type,
                NULL AS galley_proof_status,
                NULL AS galley_proof_file,
                NULL AS galley_proof_comment,
                NULL AS galley_author_response,
                NULL AS galley_final_file,
                m.payment_amount,
                m.payment_amount_usd,
                m.payment_status,
                m.payment_instructions,
                m.payment_proof
            FROM manuscripts m
            WHERE m.author_id = ? AND m.payment_assigned = 1 AND m.payment_status != 'paid' AND m.deleted_at IS NULL
        ");
        $stmt->execute([$authorId]);
        $paymentActions = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $result = array_merge($galleyActions, $paymentActions);

        $out = array_map(function($row) {
            return [
                'id'                    => (int)$row['id'],
                'manuscriptId'          => formatManuscriptDisplayId($row['id'], $row['created_at']),
                'slug'                  => $row['slug'],
                'title'                 => $row['title'],
                'actionType'            => $row['action_type'],
                'galleyProofStatus'     => $row['galley_proof_status'],
                'galleyProofFile'       => $row['galley_proof_file'],
                'galleyProofComment'    => $row['galley_proof_comment'],
                'galleyAuthorResponse'  => $row['galley_author_response'],
                'galleyFinalFile'       => $row['galley_final_file'],
                'paymentAmount'         => $row['payment_amount'] ? (float)$row['payment_amount'] : null,
                'paymentAmountUsd'      => $row['payment_amount_usd'] ? (float)$row['payment_amount_usd'] : null,
                'paymentStatus'         => $row['payment_status'],
                'paymentInstructions'   => $row['payment_instructions'],
                'paymentProof'          => $row['payment_proof']
            ];
        }, $result);

        jsonResponse($out);
        break;

    case "updateGalleyProof":
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            errorResponse("Method not allowed", 405);
        }

        $manuscriptId = isset($_POST['manuscript_id']) ? (int)$_POST['manuscript_id'] : 0;
        $action = $_POST['action'] ?? '';
        $comment = $_POST['comment'] ?? '';

        if (!$manuscriptId || !in_array($action, ['approve', 'reject'])) {
            errorResponse("manuscript_id and valid action (approve/reject) required", 400);
        }

        $check = $pdo->prepare("SELECT id, title, author_id, file_path, galley_proof_created_at FROM manuscripts WHERE id = ? AND author_id = ? AND deleted_at IS NULL");
        $check->execute([$manuscriptId, $authorId]);
        $manuscript = $check->fetch(PDO::FETCH_ASSOC);
        if (!$manuscript) errorResponse("Manuscript not found or access denied", 404);
        $title = $manuscript['title'];

        $finalFilePath = null;
        if (isset($_FILES['final_file']) && $_FILES['final_file']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../uploads/final_manuscripts/';
            if (!is_dir($uploadDir)) {
                mkdir($uploadDir, 0777, true);
            }
            $ext = pathinfo($_FILES['final_file']['name'], PATHINFO_EXTENSION);
            $filename = 'final_' . $manuscriptId . '_' . time() . '.' . $ext;
            $destination = $uploadDir . $filename;
            if (move_uploaded_file($_FILES['final_file']['tmp_name'], $destination)) {
                $finalFilePath = 'uploads/final_manuscripts/' . $filename;
            } else {
                errorResponse("Failed to upload final manuscript", 500);
            }
        }

        $newStatus = ($action === 'approve') ? 'approved' : 'awaitingReview';
        $respondedAt = date('Y-m-d H:i:s');
        $createdAtSet = $manuscript['galley_proof_created_at'] ?: $respondedAt;

        $stmt = $pdo->prepare("
            UPDATE manuscripts
            SET galley_proof_status = ?,
                galley_author_response = ?,
                galley_final_file = COALESCE(?, galley_final_file),
                galley_proof_responded_at = ?,
                galley_proof_created_at = COALESCE(galley_proof_created_at, ?)
            WHERE id = ?
        ");
        $stmt->execute([$newStatus, $comment, $finalFilePath, $respondedAt, $createdAtSet, $manuscriptId]);

        $statusText = ($newStatus === 'approved') ? 'approved' : 'rejected (revision requested)';
        createNotification(
            $authorId,
            'galley-proof-updated',
            'Galley Proof Update',
            "Your galley proof for manuscript \"$title\" has been $statusText.",
            $manuscriptId
        );

        // Notify admins
        notifyAdmins(
            'galley-proof-updated',
            'Galley Proof Response',
            "The author has responded to the galley proof for manuscript \"$title\" (ID: " . formatManuscriptDisplayId($manuscriptId, date('Y-m-d H:i:s')) . "). Status: $statusText.",
            $manuscriptId
        );

        jsonResponse(["success" => true, "message" => "Galley proof updated successfully"]);
        break;

    case "processPayment":
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            errorResponse("Method not allowed", 405);
        }
        $data = jsonInput();
        if (!$data) errorResponse("Invalid JSON", 400);

        $manuscriptId = (int)($data['manuscript_id'] ?? 0);
        $transactionId = $data['transaction_id'] ?? null;

        if (!$manuscriptId) errorResponse("manuscript_id required", 400);

        $check = $pdo->prepare("SELECT id, title FROM manuscripts WHERE id = ? AND author_id = ? AND deleted_at IS NULL");
        $check->execute([$manuscriptId, $authorId]);
        $man = $check->fetch(PDO::FETCH_ASSOC);
        if (!$man) errorResponse("Manuscript not found or access denied", 404);
        $title = $man['title'];

        $stmt = $pdo->prepare("
            UPDATE manuscripts
            SET payment_status = 'paid',
                payment_date = NOW(),
                payment_transaction_id = ?
            WHERE id = ?
        ");
        $stmt->execute([$transactionId, $manuscriptId]);

        createNotification(
            $authorId,
            'payment-received',
            'Payment Received',
            "Payment for manuscript \"$title\" has been confirmed.",
            $manuscriptId
        );

        // Notify admins
        notifyAdmins(
            'payment-confirmed',
            'Payment Confirmed',
            "Payment for manuscript \"$title\" (ID: " . formatManuscriptDisplayId($manuscriptId, date('Y-m-d H:i:s')) . ") has been confirmed.",
            $manuscriptId
        );

        jsonResponse(["success" => true, "message" => "Payment recorded"]);
        break;

    case "notifyPaymentMade":
        $isMultipart = !empty($_FILES) || !empty($_POST);
        $mid = 0;
        $paymentProofPath = null;

        if ($isMultipart) {
            $mid = (int)($_POST['manuscript_id'] ?? 0);
            if (isset($_FILES['payment_proof']) && $_FILES['payment_proof']['error'] === UPLOAD_ERR_OK) {
                try {
                    $paymentProofPath = uploadFile($_FILES['payment_proof'], 'payment_proofs', ['pdf', 'jpg', 'jpeg', 'png']);
                } catch (Exception $e) {
                    errorResponse("Payment proof upload failed: " . $e->getMessage(), 400);
                }
            }
        } else {
            $data = jsonInput();
            if (!$data) errorResponse("Invalid JSON", 400);
            $mid = (int)($data['manuscript_id'] ?? 0);
        }

        if (!$mid) errorResponse("manuscript_id required", 400);

        $check = $pdo->prepare("SELECT id, title, editor_id FROM manuscripts WHERE id = ? AND author_id = ? AND deleted_at IS NULL");
        $check->execute([$mid, $authorId]);
        $man = $check->fetch(PDO::FETCH_ASSOC);
        if (!$man) errorResponse("Manuscript not found or access denied", 404);
        $title = $man['title'];
        $editorId = $man['editor_id'];

        if ($paymentProofPath) {
            $stmt = $pdo->prepare("UPDATE manuscripts SET payment_proof = ? WHERE id = ?");
            $stmt->execute([$paymentProofPath, $mid]);
        }

        $pdo->prepare("UPDATE manuscripts SET payment_notified_at = NOW() WHERE id = ?")->execute([$mid]);

        if ($editorId) {
            createNotification(
                $editorId,
                'payment-notified',
                'Author Completed Payment',
                "The author has indicated that payment for manuscript \"$title\" has been made. Please verify.",
                $mid
            );
        }

        $publisherStmt = $pdo->query("SELECT id FROM users WHERE role = 'publisher' AND active = 1");
        $publisherIds = $publisherStmt->fetchAll(PDO::FETCH_COLUMN);
        if (!empty($publisherIds)) {
            createNotification(
                $publisherIds,
                'payment-notified',
                'Author Completed Payment',
                "The author has indicated that payment for manuscript \"$title\" has been made. Please verify.",
                $mid
            );
        }

        // Notify admins
        notifyAdmins(
            'payment-notified',
            'Payment Completed by Author',
            "The author has completed payment for manuscript \"$title\" (ID: " . formatManuscriptDisplayId($mid, date('Y-m-d H:i:s')) . "). Please verify.",
            $mid
        );

        jsonResponse(["success" => true, "message" => "Admin notified successfully"]);
        break;

    // ==================== SEND TICKET TO EIC/ADMIN ====================
    case "sendTicket":
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            errorResponse("Method not allowed", 405);
        }
        $subject = $_POST['subject'] ?? '';
        $message = $_POST['message'] ?? '';
        $manuscriptId = isset($_POST['manuscript_id']) ? (int)$_POST['manuscript_id'] : 0;

        if (empty($subject) || empty($message)) {
            errorResponse("Subject and message are required", 400);
        }

        // Get author details
        $stmt = $pdo->prepare("SELECT name, email FROM users WHERE id = ?");
        $stmt->execute([$authorId]);
        $author = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$author) {
            errorResponse("Author not found", 404);
        }
        $authorName = $author['name'];
        $authorEmail = $author['email'];

        $manuscriptDetails = '';
        if ($manuscriptId) {
            $stmt = $pdo->prepare("SELECT id, title, slug, created_at FROM manuscripts WHERE id = ? AND author_id = ? AND deleted_at IS NULL");
            $stmt->execute([$manuscriptId, $authorId]);
            $man = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($man) {
                $manuscriptDetails = "<p><strong>Manuscript:</strong> " . htmlspecialchars($man['title']) . " (ID: " . formatManuscriptDisplayId($man['id'], $man['created_at']) . ")</p>";
            }
        }

        // Build email body for admins
        $emailBody = "
            <p>Dear Editor-in-Chief,</p>
            <p>You have received a new message from author <strong>" . htmlspecialchars($authorName) . "</strong> (Email: " . htmlspecialchars($authorEmail) . ").</p>
            <p><strong>Subject:</strong> " . htmlspecialchars($subject) . "</p>
            <p><strong>Message:</strong><br/>" . nl2br(htmlspecialchars($message)) . "</p>
            " . ($manuscriptDetails ? $manuscriptDetails : "") . "
            <p>Please respond to the author via the journal system.</p>
            " . SIGNATURE_EDITOR_IN_CHIEF . "
        ";

        // Handle attachment
        $attachmentPaths = [];
        if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
            try {
                $uploadedPath = uploadFile($_FILES['attachment'], 'ticket_attachments', ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'txt']);
                $attachmentPaths[] = $uploadedPath;
            } catch (Exception $e) {
                errorResponse("Attachment upload failed: " . $e->getMessage(), 400);
            }
        }

        // Get admin users (role: editor, publisher, admin)
        $stmt = $pdo->prepare("SELECT id, email, name FROM users WHERE role IN ('editor', 'publisher', 'admin') AND active = 1 AND suspended = 0");
        $stmt->execute();
        $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($admins)) {
            errorResponse("No admin users found to send the message", 500);
        }

        $successCount = 0;
        foreach ($admins as $admin) {
            // ===== UPDATED: Include author name in description =====
            $richDescription = "From: " . $authorName . " <" . $authorEmail . ">\n\n" . $message;
            $notifTitle = "New Ticket from Author";
            createNotification($admin['id'], 'ticket-received', $notifTitle, $richDescription, $manuscriptId ?: null);

            // Send email
            $emailSent = sendEmail($admin['email'], $subject, $emailBody, $attachmentPaths);
            if ($emailSent) {
                $successCount++;
            }
        }

        if ($successCount > 0) {
            jsonResponse(["success" => true, "message" => "Your message has been sent to the editorial team."]);
        } else {
            errorResponse("Failed to send message to admins", 500);
        }
        break;

    // ==================== NEW: GET GALLEY HISTORY ====================
    case "getGalleyHistory":
        $stmt = $pdo->prepare("
            SELECT
                m.id,
                m.title,
                m.created_at,
                m.galley_proof_file,
                m.galley_proof_status,
                m.galley_proof_comment AS editor_comment,
                m.galley_author_response AS author_response,
                m.galley_final_file AS author_final_file,
                m.galley_proof_created_at,
                m.galley_proof_responded_at
            FROM manuscripts m
            WHERE m.author_id = ? AND m.deleted_at IS NULL
              AND (m.galley_proof_status IS NOT NULL AND m.galley_proof_status != '')
            ORDER BY m.galley_proof_created_at DESC, m.created_at DESC
        ");
        $stmt->execute([$authorId]);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $out = array_map(function($row) {
            $createdAt = $row['galley_proof_created_at'] ?? $row['created_at'];
            $status = $row['galley_proof_status'];
            if ($status === 'approved') {
                $displayStatus = 'approved';
            } elseif ($status === 'withAuthor') {
                $displayStatus = 'pending';
            } else {
                $displayStatus = 'rejected';
            }
            return [
                'id' => (int)$row['id'],
                'manuscriptId' => formatManuscriptDisplayId($row['id'], $row['created_at']),
                'title' => $row['title'],
                'galleyProofFile' => $row['galley_proof_file'],
                'status' => $displayStatus,
                'editorComment' => $row['editor_comment'],
                'authorResponse' => $row['author_response'],
                'authorFinalFile' => $row['author_final_file'],
                'createdAt' => $createdAt,
                'respondedAt' => $row['galley_proof_responded_at']
            ];
        }, $records);

        jsonResponse($out);
        break;

    // ==================== NEW: GET PAYMENT HISTORY ====================
    case "getPaymentHistory":
        $stmt = $pdo->prepare("
            SELECT
                m.id,
                m.title,
                m.created_at,
                m.payment_amount AS amount,
                m.payment_amount_usd AS amount_usd,
                m.payment_status,
                m.payment_instructions AS instructions,
                m.payment_date,
                m.payment_transaction_id AS transaction_id,
                m.payment_notified_at AS notified_at
            FROM manuscripts m
            WHERE m.author_id = ? AND m.deleted_at IS NULL
              AND m.payment_assigned = 1
            ORDER BY m.payment_date DESC, m.created_at DESC
        ");
        $stmt->execute([$authorId]);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $out = array_map(function($row) {
            $status = $row['payment_status'];
            if ($status === 'paid') {
                $displayStatus = 'completed';
            } elseif ($status === 'notified') {
                $displayStatus = 'notified';
            } else {
                $displayStatus = 'pending';
            }
            return [
                'id' => (int)$row['id'],
                'manuscriptId' => formatManuscriptDisplayId($row['id'], $row['created_at']),
                'title' => $row['title'],
                'amount' => (float)$row['amount'],
                'amountUsd' => $row['amount_usd'] ? (float)$row['amount_usd'] : null,
                'status' => $displayStatus,
                'paymentDate' => $row['payment_date'],
                'transactionId' => $row['transaction_id'],
                'instructions' => $row['instructions'],
                'notifiedAt' => $row['notified_at'],
                'createdAt' => $row['created_at']
            ];
        }, $records);

        jsonResponse($out);
        break;

    default:
        errorResponse("Invalid action. Available: getDashboardStats, getSidebarCounts, getActiveManuscripts, getManuscriptDetails, listSubmissions, submitManuscript, getRevisions, submitRevision, getPublishedManuscripts, getProfile, updateProfile, getNotifications, getPendingPrePublicationActions, updateGalleyProof, processPayment, notifyPaymentMade, getEmailAttachments, getGalleyHistory, getPaymentHistory, sendTicket", 400);
}

} catch (PDOException $e) {
    error_log("Author API PDO Error: " . $e->getMessage());
    error_log("SQL State: " . $e->errorInfo[0] . ", Code: " . $e->errorInfo[1] . ", Message: " . $e->errorInfo[2]);
    errorResponse("Database error", 500);
} catch (Exception $e) {
    error_log("Author API General Error: " . $e->getMessage());
    errorResponse($e->getMessage(), 500);
}
?>
