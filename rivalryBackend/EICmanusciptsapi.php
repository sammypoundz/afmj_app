<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . "/config.php";
require_once __DIR__ . "/notification_helper.php";

// ===== ADD MISSING COLUMNS =====
$columnsToCheck = [
    'cover_letter_path' => "ALTER TABLE manuscripts ADD cover_letter_path VARCHAR(255) DEFAULT NULL AFTER file_path",
    'additional_reviewer_files' => "ALTER TABLE manuscripts ADD additional_reviewer_files TEXT DEFAULT NULL",
    'publication_file' => "ALTER TABLE manuscripts ADD publication_file VARCHAR(255) DEFAULT NULL",
    'deleted_at' => "ALTER TABLE manuscripts ADD deleted_at DATETIME DEFAULT NULL",
    'feedback_released' => "ALTER TABLE manuscripts ADD feedback_released TINYINT(1) DEFAULT 0"
];

foreach ($columnsToCheck as $col => $sql) {
    $check = $pdo->query("SHOW COLUMNS FROM manuscripts LIKE '$col'");
    if ($check === false || $check->rowCount() == 0) {
        $pdo->exec($sql);
    }
}

// ===== CREATE EMAIL_ATTACHMENTS TABLE IF MISSING =====
$tableCheck = $pdo->query("SHOW TABLES LIKE 'email_attachments'");
if ($tableCheck === false || $tableCheck->rowCount() == 0) {
    $pdo->exec("
        CREATE TABLE email_attachments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            manuscript_id INT NOT NULL,
            decision_type VARCHAR(20) NOT NULL,
            file_path VARCHAR(255) DEFAULT NULL,
            email_subject VARCHAR(500) DEFAULT NULL,
            email_body TEXT DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE
        )
    ");
} else {
    $checkSubject = $pdo->query("SHOW COLUMNS FROM email_attachments LIKE 'email_subject'");
    if ($checkSubject === false || $checkSubject->rowCount() == 0) {
        $pdo->exec("ALTER TABLE email_attachments ADD email_subject VARCHAR(500) DEFAULT NULL AFTER decision_type");
    }
    $checkBody = $pdo->query("SHOW COLUMNS FROM email_attachments LIKE 'email_body'");
    if ($checkBody === false || $checkBody->rowCount() == 0) {
        $pdo->exec("ALTER TABLE email_attachments ADD email_body TEXT DEFAULT NULL AFTER email_subject");
    }
}

// ===== SELF-HEAL: flip stale 'revision_requested' manuscripts to 'revised' =====
// If the author's latest revision already has an uploaded revised_file, the
// manuscript belongs in the Revised tab, regardless of any missed status update.
try {
    $pdo->exec("
        UPDATE manuscripts m
        SET m.status = 'revised'
        WHERE m.status = 'revision_requested'
          AND m.deleted_at IS NULL
          AND EXISTS (
              SELECT 1 FROM manuscript_revisions mr
              WHERE mr.manuscript_id = m.id
                AND mr.revised_file IS NOT NULL
                AND mr.revision_number = (
                    SELECT MAX(x.revision_number)
                    FROM manuscript_revisions x
                    WHERE x.manuscript_id = m.id
                )
          )
    ");
} catch (Exception $e) {
    error_log("Self-heal revised status failed: " . $e->getMessage());
}

// ===== SELF-HEAL: re-parent orphaned revision entries (revision_id = 0) =====
// Entries imported/migrated without a valid revision link are matched back to
// the manuscript via review_scores (same reviewer + identical comment text),
// then attached to that manuscript's latest revision so the revision history
// and the Revised tab render correctly.
try {
    $pdo->exec("
        UPDATE revision_entries re
        JOIN review_scores rs
          ON rs.reviewer_id = re.reviewer_id
         AND rs.comments_to_author = re.reviewer_comment
        JOIN reviews r ON r.id = rs.review_id
        SET re.revision_id = (
            SELECT mr.id FROM manuscript_revisions mr
            WHERE mr.manuscript_id = r.manuscript_id
            ORDER BY mr.revision_number DESC, mr.id DESC
            LIMIT 1
        )
        WHERE re.revision_id = 0
    ");
} catch (Exception $e) {
    error_log("Self-heal orphaned revision entries failed: " . $e->getMessage());
}

$checkFilePathNull = $pdo->query("SHOW COLUMNS FROM email_attachments LIKE 'file_path'");
if ($checkFilePathNull && $row = $checkFilePathNull->fetch(PDO::FETCH_ASSOC)) {
    if ($row['Null'] === 'NO') {
        $pdo->exec("ALTER TABLE email_attachments MODIFY file_path VARCHAR(255) DEFAULT NULL");
    }
}

$action = $_GET['action'] ?? '';

function jsonInput(): ?array {
    $input = file_get_contents("php://input");
    return $input ? json_decode($input, true) : null;
}

/**
 * Format manuscript ID for display (e.g., "AFMJ-October-2025-00001")
 */
if (!function_exists('formatManuscriptDisplayId')) {
    function formatManuscriptDisplayId(int $id, string $dateString): string {
        $timestamp = strtotime($dateString);
        $month = strtoupper(date('F', $timestamp));
        $year = date('Y', $timestamp);
        $paddedId = str_pad($id, 5, '0', STR_PAD_LEFT);
        return "AFMJ-{$month}-{$year}-{$paddedId}";
    }
}

function mapUiStatusToDb(string $status): ?string {
    $map = [
        "New Submissions" => "submitted",
        "Under Review"    => "under_review",
        "Revisions"       => "under_review",
        "Revision Requested" => null,
        "Revised"         => null,
        "Accepted"        => "accepted",
        "Rejected"        => "rejected",
        "Gallery Proof"   => "accepted",
        "Published"       => "published",
    ];
    return $map[$status] ?? null;
}

function mapDbStatusToUi(string $status): string {
    $map = [
        "submitted"     => "New Submissions",
        "under_review"  => "Under Review",
        "revision_requested" => "Revision Requested",
        "revised"       => "Revised",
        "accepted"      => "Accepted",
        "rejected"      => "Rejected",
        "published"     => "Published",
    ];
    return $map[$status] ?? $status;
}

function jsonResponse($data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

function errorResponse(string $message, int $code = 400): void {
    jsonResponse(["error" => $message], $code);
}

function successResponse(array $data = []): void {
    jsonResponse(array_merge(["success" => true], $data));
}

function formaterManuscriptId(string $slug): string {
    return strtoupper($slug);
}

function uploadFile(array $file, string $subfolder, array $allowedExtensions = ['pdf', 'doc', 'docx'], int $maxSize = 10 * 1024 * 1024): ?string {
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

function getFullUrl(string $relativePath): string {
    $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    return $protocol . '://' . $host . '/' . ltrim($relativePath, '/');
}

function parseAdditionalReviewerFiles($json): array {
    if (empty($json)) return [];
    $decoded = json_decode($json, true);
    if (!is_array($decoded)) return [];
    $result = [];
    foreach ($decoded as $item) {
        if (is_string($item)) {
            $result[] = ['path' => $item, 'purpose' => null];
        } elseif (is_array($item) && isset($item['path'])) {
            $result[] = [
                'path' => $item['path'],
                'purpose' => $item['purpose'] ?? null
            ];
        }
    }
    return $result;
}

function generateDecisionEmailBody($manuscriptId, $decision, $customReason = null) {
    global $pdo;
    $manStmt = $pdo->prepare("SELECT m.*, u.name AS author_name, u.email AS author_email FROM manuscripts m JOIN users u ON u.id = m.author_id WHERE m.id = ?");
    $manStmt->execute([$manuscriptId]);
    $man = $manStmt->fetch(PDO::FETCH_ASSOC);
    if (!$man) return null;

    $formattedId = formaterManuscriptId($man['slug']);

    $feedback = ['e_feedback' => '', 'r_feedback' => ''];
    if ($decision === 'reject' || $decision === 'revision') {
        $revStmt = $pdo->prepare("SELECT e_feedback, r_feedback FROM review_manuscripts WHERE manuscript_id = ?");
        $revStmt->execute([$manuscriptId]);
        $fb = $revStmt->fetch(PDO::FETCH_ASSOC);
        if ($fb) {
            $feedback = $fb;
        }
    }

    switch ($decision) {
        case 'accept':
            $subject = "Manuscript Acceptance – {$formattedId}";
            $body = "
                <p>Dear " . htmlspecialchars($man['author_name']) . ",</p>
                <p>Congratulations! Your manuscript <strong>\"" . htmlspecialchars($man['title']) . "\"</strong> (ID: {$formattedId}) has been accepted for publication in the African Medical Journal. We will now proceed with production.</p>
                <p>Best regards,<br>Editorial Team</p>
                " . SIGNATURE_EDITOR_IN_CHIEF . "
            ";
            break;
        case 'reject':
            $subject = "Decision on your manuscript {$formattedId}";
            $reason = $customReason ?: "The reviewers have advised against publication.";
            $body = "
                <p>African Medical Journal</p>
                <p>Ref.: No. {$formattedId}</p>
                <p>Title: " . htmlspecialchars($man['title']) . "</p>
                <p>Dear " . htmlspecialchars($man['author_name']) . ",</p>
                <p>Reviewers' comments on your work have now been received. You will see that they are advising against publication of your work. Therefore, I must reject it.</p>
                <p>For your guidance, I append the reviewers' comments below.</p>
                <p>Thank you for giving us the opportunity to consider your work.</p>
                " . SIGNATURE_EDITOR_IN_CHIEF . "
                <p><strong>Reviewers' comments:</strong><br/><br/>Reviewer #1: {$feedback['e_feedback']}<br/>Reviewer #2: {$feedback['r_feedback']}</p>
                <p><strong>Additional reason:</strong> " . htmlspecialchars($reason) . "</p>
            ";
            break;
        case 'revision':
            $subject = "Revision requested for your submission {$formattedId}";
            $revisionLink = 'https://afmjonline.com/pages/auth/login.php';
            $tabName = 'Revision Submission';
            $body = generateRevisionEmailBody($man, $feedback, $revisionLink, $tabName);
            break;
        default:
            return null;
    }
    return ['subject' => $subject, 'body' => $body];
}

function generateReviewerInvitationBody($manuscriptId, $reviewerId, $plainPassword = null) {
    global $pdo;
    $manStmt = $pdo->prepare("SELECT m.* FROM manuscripts m WHERE m.id = ?");
    $manStmt->execute([$manuscriptId]);
    $man = $manStmt->fetch(PDO::FETCH_ASSOC);
    if (!$man) return null;

    $revStmt = $pdo->prepare("SELECT name, email FROM users WHERE id = ?");
    $revStmt->execute([$reviewerId]);
    $reviewer = $revStmt->fetch(PDO::FETCH_ASSOC);
    if (!$reviewer) return null;

    return generateReviewerInvitationEmailBody($man, $reviewer['name'], $reviewer['email'], $plainPassword);
}

// Helper to get primary file path for a manuscript
function getPrimaryFilePath($manuscript) {
    // If published and publication_file exists, use it
    if ($manuscript['status'] === 'published' && !empty($manuscript['publication_file'])) {
        return $manuscript['publication_file'];
    }
    // Otherwise fallback to file_path
    return $manuscript['file_path'] ?? null;
}

try {

switch ($action) {

case "dashboard":
    $total = $pdo->query("SELECT COUNT(*) FROM manuscripts WHERE deleted_at IS NULL")->fetchColumn();
    $underReview = $pdo->query("SELECT COUNT(*) FROM manuscripts WHERE status = 'under_review' AND deleted_at IS NULL")->fetchColumn();
    $accepted = $pdo->query("SELECT COUNT(*) FROM manuscripts WHERE status = 'accepted' AND deleted_at IS NULL")->fetchColumn();
    $rejected = $pdo->query("SELECT COUNT(*) FROM manuscripts WHERE status = 'rejected' AND deleted_at IS NULL")->fetchColumn();
    $published = $pdo->query("SELECT COUNT(*) FROM manuscripts WHERE status = 'published' AND deleted_at IS NULL")->fetchColumn();

    $revisionsStmt = $pdo->query("
        SELECT COUNT(*)
        FROM manuscripts
        WHERE status = 'revision_requested' AND deleted_at IS NULL
    ");
    $revisions = (int)$revisionsStmt->fetchColumn();

    // Revised: author has resubmitted; waiting for admin to reassign reviewers
    $revisedReadyStmt = $pdo->query("
        SELECT COUNT(*)
        FROM manuscripts
        WHERE status = 'revised' AND deleted_at IS NULL
    ");
    $revisedReady = (int)$revisedReadyStmt->fetchColumn();

    $galleryProofStmt = $pdo->query("
        SELECT COUNT(*)
        FROM manuscripts
        WHERE in_production = 1
          AND galley_proof_status IS NOT NULL
          AND galley_proof_status != 'approved'
          AND deleted_at IS NULL
    ");
    $galleryProof = (int)$galleryProofStmt->fetchColumn();

    $authors = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'author' AND active = 1")->fetchColumn();
    $reviewers = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'reviewer' AND active = 1")->fetchColumn();
    $editors = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'editor' AND active = 1")->fetchColumn();
    $publishers = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'publisher' AND active = 1")->fetchColumn();

    $overdueReviews = $pdo->query("
        SELECT COUNT(*)
        FROM reviews r
        JOIN manuscripts m ON m.id = r.manuscript_id
        WHERE r.status = 'pending'
          AND r.due_date < CURDATE()
          AND m.deleted_at IS NULL
    ")->fetchColumn();

    $awaitingAssignment = $pdo->query("
        SELECT COUNT(*)
        FROM manuscripts
        WHERE status = 'submitted' AND deleted_at IS NULL
    ")->fetchColumn();

    $readyToPublish = $pdo->query("
        SELECT COUNT(*)
        FROM manuscripts
        WHERE status = 'accepted' AND in_production = 0 AND deleted_at IS NULL
    ")->fetchColumn();

    $avgReviewDaysStmt = $pdo->query("
        SELECT AVG(DATEDIFF(completed_at, accepted_at))
        FROM reviews r
        JOIN manuscripts m ON m.id = r.manuscript_id
        WHERE r.status = 'completed'
          AND r.accepted_at IS NOT NULL
          AND r.completed_at IS NOT NULL
          AND m.deleted_at IS NULL
    ");
    $avgReviewDays = round((float)$avgReviewDaysStmt->fetchColumn(), 1);

    $activeReviewersStmt = $pdo->query("
        SELECT COUNT(DISTINCT reviewer_id)
        FROM reviews r
        JOIN manuscripts m ON m.id = r.manuscript_id
        WHERE r.status = 'completed'
          AND r.completed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND m.deleted_at IS NULL
    ");
    $activeReviewers = (int)$activeReviewersStmt->fetchColumn();

    jsonResponse([
        "status" => "success",
        "kpi" => [
            "total_submissions" => (int)$total,
            "under_review"      => (int)$underReview,
            "revisions"         => $revisions,
            "revised"           => $revisedReady,
            "accepted"          => (int)$accepted,
            "rejected"          => (int)$rejected,
            "gallery_proof"     => $galleryProof,
            "published"         => (int)$published,
        ],
        "users" => [
            "authors"   => (int)$authors,
            "reviewers" => (int)$reviewers,
            "editors"   => (int)$editors,
            "publishers"=> (int)$publishers,
        ],
        "pending" => [
            "overdue_reviews"       => (int)$overdueReviews,
            "awaiting_assignment"   => (int)$awaitingAssignment,
            "ready_to_publish"      => (int)$readyToPublish,
        ],
        "reviewer_performance" => [
            "average_review_days" => $avgReviewDays,
            "active_reviewers"    => $activeReviewers,
        ]
    ]);
    break;

case "list":
    $uiStatus = $_GET['status'] ?? null;
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(50, max(1, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    $whereClause = "WHERE m.deleted_at IS NULL";
    $params = [];

    if ($uiStatus) {
        // =========================================================
        // STATUS-DRIVEN LIFECYCLE (single source of truth):
        //   submitted          -> New Submissions
        //   under_review       -> Under Review (assigned to reviewers/editor)
        //   revision_requested -> Revision Requested (admin requested revision,
        //                         waiting for author to resubmit)
        //   revised            -> Revised Manuscript (author resubmitted,
        //                         waiting for admin to reassign reviewers)
        //   accepted / rejected / published -> terminal tabs
        // =========================================================
        if ($uiStatus === "Under Review") {
            $whereClause .= " AND m.status = 'under_review'";
        } elseif ($uiStatus === "Revisions" || $uiStatus === "Revision Requested") {
            $whereClause .= " AND m.status = 'revision_requested'";
        } elseif ($uiStatus === "Revised") {
            $whereClause .= " AND m.status = 'revised'";
        } elseif ($uiStatus === "Gallery Proof") {
            $whereClause .= "
                AND m.in_production = 1
                AND m.galley_proof_status IS NOT NULL
                AND m.galley_proof_status != 'approved'
            ";
        } elseif ($uiStatus === "Published") {
            $whereClause .= " AND m.status = 'published'";
        } elseif ($uiStatus === "Accepted") {
            $whereClause .= " AND m.status = 'accepted' AND m.in_production = FALSE";
        } elseif ($uiStatus === "Rejected") {
            $whereClause .= " AND m.status = 'rejected'";
        } elseif ($uiStatus === "New Submissions") {
            $whereClause .= " AND m.status = 'submitted'";
        } else {
            // Fallback: try to map to database status
            $dbStatus = mapUiStatusToDb($uiStatus);
            if ($dbStatus) {
                $whereClause .= " AND m.status = ?";
                $params[] = $dbStatus;
            }
        }
    }

    // Count query
    $countSql = "SELECT COUNT(*) FROM manuscripts m $whereClause";
    $countStmt = $pdo->prepare($countSql);
    if (!$countStmt->execute($params)) {
        throw new Exception("Count query failed");
    }
    $total = (int)$countStmt->fetchColumn();

    // Main query - ADDED hasRevisions and hasUploadedRevision fields
    $sql = "
        SELECT
            m.id,
            m.title,
            m.slug,
            m.status,
            m.study_type,
            m.created_at,
            m.editor_id,
            m.in_production,
            m.galley_proof_status,
            m.cover_letter_path,
            m.views,
            m.downloads,
            u.name AS author_name,
            u.id AS author_id,
            e.name AS editor_name,
            (SELECT COUNT(*) FROM reviews r WHERE r.manuscript_id = m.id AND r.status = 'pending') AS pending_reviews,
            (SELECT COUNT(*) FROM reviews r WHERE r.manuscript_id = m.id AND r.status = 'completed') AS completed_reviews,
            (SELECT COUNT(*) FROM manuscript_revisions mr WHERE mr.manuscript_id = m.id) AS revision_count,
            (SELECT
                CASE
                    WHEN EXISTS (
                        SELECT 1 FROM manuscript_revisions mr
                        WHERE mr.manuscript_id = m.id
                        AND mr.revision_number = (
                            SELECT MAX(revision_number) FROM manuscript_revisions WHERE manuscript_id = m.id
                        )
                        AND mr.revised_file IS NOT NULL
                    ) THEN 1 ELSE 0
                END
            ) AS has_uploaded_revision,
            (SELECT revised_file
             FROM manuscript_revisions
             WHERE manuscript_id = m.id
             ORDER BY revision_number DESC
             LIMIT 1
            ) AS revised_file_path
        FROM manuscripts m
        JOIN users u ON u.id = m.author_id
        LEFT JOIN users e ON e.id = m.editor_id
        $whereClause
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
    ";

    $stmt = $pdo->prepare($sql);
    $paramIndex = 1;
    foreach ($params as $param) {
        $stmt->bindValue($paramIndex++, $param);
    }
    $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
    $stmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);
    if (!$stmt->execute()) {
        throw new Exception("List query failed");
    }

    $out = array_map(function($r) {
        return [
            "id"                 => (int)$r['id'],
            "title"              => $r['title'],
            "slug"               => $r['slug'],
            "studyType"          => $r['study_type'] ?? 'Original Research',
            "authors"            => $r['author_name'],
            "authorId"           => (int)$r['author_id'],
            "editor"             => $r['editor_name'] ?? null,
            "status"             => mapDbStatusToUi($r['status']),
            "date"               => date("Y-m-d", strtotime($r['created_at'])),
            "editorId"           => $r['editor_id'] ? (int)$r['editor_id'] : null,
            "pendingReviews"     => (int)$r['pending_reviews'],
            "completedReviews"   => (int)$r['completed_reviews'],
            "hasRevisions"       => (int)$r['revision_count'] > 0,
            "hasUploadedRevision"=> (bool)$r['has_uploaded_revision'],
            "inProduction"       => (bool)$r['in_production'],
            "galleyProofStatus"  => $r['galley_proof_status'],
            "revisedFilePath"    => $r['revised_file_path'] ?? null,
            "coverLetterPath"    => $r['cover_letter_path'] ?? null,
            "views"              => (int)($r['views'] ?? 0),
            "downloads"          => (int)($r['downloads'] ?? 0),
        ];
    }, $stmt->fetchAll(PDO::FETCH_ASSOC));

    jsonResponse([
        "data" => $out,
        "pagination" => [
            "page" => $page,
            "limit" => $limit,
            "total" => $total,
            "pages" => (int)ceil($total / $limit)
        ]
    ]);
    break;

case "search":
    $query = $_GET['q'] ?? '';
    if (strlen($query) < 2) {
        jsonResponse([]);
    }

    $stmt = $pdo->prepare("
        SELECT
            m.id,
            m.title,
            u.name AS author
        FROM manuscripts m
        JOIN users u ON u.id = m.author_id
        WHERE m.deleted_at IS NULL
          AND (m.title LIKE ? OR u.name LIKE ? OR m.id LIKE ?)
        LIMIT 10
    ");
    $searchTerm = "%$query%";
    $stmt->execute([$searchTerm, $searchTerm, $searchTerm]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    jsonResponse($results);
    break;

case "show":
    $id = (int)($_GET['id'] ?? 0);

    if (!$id) errorResponse("Manuscript ID required", 400);

    $stmt = $pdo->prepare("
        SELECT
            m.*,
            a.name AS author_name,
            e.name AS editor_name,
            e.id AS editor_id
        FROM manuscripts m
        JOIN users a ON a.id = m.author_id
        LEFT JOIN users e ON e.id = m.editor_id
        WHERE m.id = ? AND m.deleted_at IS NULL
    ");
    $stmt->execute([$id]);
    $m = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$m) errorResponse("Manuscript not found", 404);

    if ($m['status'] === 'published') {
        $updateView = $pdo->prepare("UPDATE manuscripts SET views = views + 1 WHERE id = ?");
        $updateView->execute([$id]);
        $m['views'] += 1;
    }

    $rvStmt = $pdo->prepare("
        SELECT
            u.id,
            u.name,
            r.status,
            r.assigned_at,
            r.accepted_at,
            r.due_date,
            r.completed_at,
            r.review_order,
            r.review_attachment,
            rs.originality,
            rs.methodology,
            rs.clarity,
            rs.relevance,
            rs.comments_to_author,
            rs.confidential_comments,
            rs.recommendation
        FROM reviews r
        JOIN users u ON u.id = r.reviewer_id
        LEFT JOIN review_scores rs ON rs.review_id = r.id
        WHERE r.manuscript_id = ?
        ORDER BY r.review_order ASC
    ");
    $rvStmt->execute([$id]);

    $reviewers = [];
    $progress = [];
    $completedCount = 0;

    foreach ($rvStmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
        if ($row['status'] === 'completed') $completedCount++;

        $reviewers[] = [
            "id" => (int)$row['id'],
            "name" => $row['name']
        ];

        $scores = null;
        if ($row['status'] === 'completed') {
            $scores = [
                "originality"          => $row['originality'] !== null ? (int)$row['originality'] : null,
                "methodology"          => $row['methodology'] !== null ? (int)$row['methodology'] : null,
                "clarity"              => $row['clarity'] !== null ? (int)$row['clarity'] : null,
                "relevance"            => $row['relevance'] !== null ? (int)$row['relevance'] : null,
                "commentsToAuthor"     => $row['comments_to_author'],
                "confidentialComments" => $row['confidential_comments'],
                "recommendation"       => $row['recommendation']
            ];
        }

        $frontendStatus = $row['status'] === 'completed' ? 'reviewed' :
                          ($row['status'] === 'expired' ? 'expired' :
                          ($row['accepted_at'] ? 'reviewing' : 'not_opened'));

        $progress[] = [
            "reviewer"     => $row['name'],
            "reviewerId"   => (int)$row['id'],
            "status"       => $frontendStatus,
            "assignedAt"   => $row['assigned_at'],
            "acceptedAt"   => $row['accepted_at'],
            "dueDate"      => $row['due_date'],
            "completedAt"  => $row['completed_at'],
            "reviewOrder"  => $row['review_order'],
            "attachment"   => $row['review_attachment'],
            "scores"       => $scores
        ];
    }

    // Build a map of reviewer comments -> reviewer names from completed reviews,
    // so revision entries whose reviewer_id is NULL can still show the actual
    // reviewer who requested the revision.
    $commentOwnerMap = [];
    $ownerStmt = $pdo->prepare("
        SELECT u.name AS reviewer_name, rs.comments_to_author
        FROM reviews r
        JOIN users u ON u.id = r.reviewer_id
        JOIN review_scores rs ON rs.review_id = r.id
        WHERE r.manuscript_id = ?
          AND r.status = 'completed'
          AND rs.comments_to_author IS NOT NULL
          AND rs.comments_to_author <> ''
    ");
    $ownerStmt->execute([$id]);
    foreach ($ownerStmt->fetchAll(PDO::FETCH_ASSOC) as $o) {
        $commentOwnerMap[trim($o['comments_to_author'])] = $o['reviewer_name'];
    }

    $revStmt = $pdo->prepare("
        SELECT *
        FROM manuscript_revisions
        WHERE manuscript_id = ?
        ORDER BY revision_number ASC
    ");
    $revStmt->execute([$id]);

    $revisions = [];
    $latestRevisedFile = null;
    foreach ($revStmt->fetchAll(PDO::FETCH_ASSOC) as $rev) {
        $latestRevisedFile = $rev['revised_file'];

        $entStmt = $pdo->prepare("
            SELECT
                re.*,
                u.name AS reviewer_name
            FROM revision_entries re
            LEFT JOIN users u ON u.id = re.reviewer_id
            WHERE re.revision_id = ? AND re.revision_id > 0
            ORDER BY re.id
        ");
        $entStmt->execute([$rev['id']]);

        $entries = [];
        $addressed = 0;
        $total = 0;

        foreach ($entStmt->fetchAll(PDO::FETCH_ASSOC) as $e) {
            $total++;
            if ($e['addressed']) $addressed++;

            // Reviewer name may be NULL for auto-created entries (e.g. the
            // author's "General Revision Response" entry). Backfill from the
            // completed reviews by matching the comment text so the actual
            // reviewer who requested the revision shows next to the icon.
            $reviewerName = !empty($e['reviewer_name'])
                ? $e['reviewer_name']
                : (!empty($commentOwnerMap[trim((string)$e['reviewer_comment'])])
                    ? $commentOwnerMap[trim((string)$e['reviewer_comment'])]
                    : 'Reviewer');

            $entries[] = [
                "id"               => (int)$e['id'],
                "reviewer"         => $reviewerName,
                "reviewerId"       => $e['reviewer_id'] !== null ? (int)$e['reviewer_id'] : null,
                "reviewerComment"  => $e['reviewer_comment'],
                "authorResponse"   => $e['author_response'],
                "addressed"        => (bool)$e['addressed']
            ];
        }

        $revisions[] = [
            "id"            => (int)$rev['id'],
            "revisionNumber" => (int)$rev['revision_number'],
            "submittedAt"   => $rev['submitted_at'],
            "revisedFile"   => $rev['revised_file'],
            "responseFile"  => $rev['response_file'],
            "entries"       => $entries,
            "entryStats"    => [
                "total"     => $total,
                "addressed" => $addressed,
                "pending"   => $total - $addressed
            ]
        ];
    }

    $additionalFiles = parseAdditionalReviewerFiles($m['additional_reviewer_files']);
    $primaryFile = getPrimaryFilePath($m);

    jsonResponse([
        "id"                => (int)$m['id'],
        "title"             => $m['title'],
        "slug"              => $m['slug'],
        "authors"           => !empty($m['authors']) ? $m['authors'] : $m['author_name'],
        "manuscriptId"      => formatManuscriptDisplayId((int)$m['id'], $m['created_at']),
        "status"            => mapDbStatusToUi($m['status']),
        "studyType"         => $m['study_type'] ?? 'Original Research',
        "date"              => date("Y-m-d", strtotime($m['created_at'])),
        "abstract"          => $m['abstract'],
        "background"        => $m['background'],
        "objective"         => $m['objective'],
        "methods"           => $m['methods'] ?? null,
        "results"           => $m['results'] ?? null,
        "conclusion"        => $m['conclusion'],
        "reviewers"         => array_map(fn($r) => $r['name'], $reviewers),
        "editor"            => $m['editor_name'],
        "editorId"          => $m['editor_id'] ? (int)$m['editor_id'] : null,
        "reviewerProgress"  => $progress,
        "reviewStats"       => [
            "total"     => count($reviewers),
            "completed" => $completedCount,
            "pending"   => count($reviewers) - $completedCount
        ],
        "revisions"         => $revisions,
        "revisionCount"     => count($revisions),
        "filePath"          => $m['file_path'],
        "circulatingFilePath" => $m['circulating_file_path'],
        "revisedFilePath"   => $latestRevisedFile,
        "coverLetterPath"   => $m['cover_letter_path'] ?? null,
        "publicationFile"   => $m['publication_file'] ?? null,
        "primaryFile"       => $primaryFile,
        "inProduction"      => (bool)$m['in_production'],
        "additionalReviewerFiles" => $additionalFiles,
        "views"             => (int)$m['views'],
        "downloads"         => (int)$m['downloads']
    ]);
    break;

case "reviewers":
    $stmt = $pdo->query("
        SELECT
            u.id,
            u.name,
            u.email,
            u.role,
            GROUP_CONCAT(re.expertise SEPARATOR ',') AS expertise_list
        FROM users u
        LEFT JOIN reviewer_expertise re ON re.reviewer_id = u.id
        WHERE u.role = 'reviewer'
          AND u.active = 1
        GROUP BY u.id
        ORDER BY u.name
    ");
    $reviewers = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $expertise = [];
        if (!empty($row['expertise_list'])) {
            $expertise = array_map('trim', explode(',', $row['expertise_list']));
        }
        $reviewers[] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'role' => $row['role'],
            'expertise' => $expertise
        ];
    }
    jsonResponse($reviewers);
    break;

case "editors":
    $stmt = $pdo->query("
        SELECT id, name, email, role
        FROM users
        WHERE role IN ('editor', 'publisher')
        AND active = 1
        ORDER BY name
    ");
    jsonResponse($stmt->fetchAll(PDO::FETCH_ASSOC));
    break;

case "assignReviewers":
    $data = jsonInput();

    if (empty($data['manuscript_id']) || !isset($data['reviewers'])) {
        errorResponse("manuscript_id and reviewers array required");
    }

    $mid = (int)$data['manuscript_id'];
    $reviewers = is_array($data['reviewers']) ? $data['reviewers'] : [];

    $pdo->beginTransaction();

    try {
        $manStmt = $pdo->prepare("SELECT title, author_id FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
        $manStmt->execute([$mid]);
        $man = $manStmt->fetch();
        if (!$man) throw new Exception("Manuscript not found");

        $pdo->prepare("DELETE FROM reviews WHERE manuscript_id = ? AND status IN ('pending', 'expired')")->execute([$mid]);

        if (!empty($reviewers)) {
            $ins = $pdo->prepare("
                INSERT INTO reviews
                    (manuscript_id, reviewer_id, status, assigned_at, accepted_at, due_date, review_order)
                VALUES (?, ?, 'pending', NOW(), ?, DATE_ADD(NOW(), INTERVAL 20 DAY), ?)
            ");

            $order = 1;
            $assignedReviewerIds = [];
            foreach ($reviewers as $rid) {
                $rid = (int)$rid;
                $check = $pdo->prepare("SELECT 1 FROM users WHERE id = ? AND role = 'reviewer' AND active = 1");
                $check->execute([$rid]);
                if (!$check->fetch()) {
                    throw new Exception("Invalid or inactive reviewer ID: $rid");
                }

                $prevStmt = $pdo->prepare("
                    SELECT 1 FROM reviews
                    WHERE manuscript_id = ? AND reviewer_id = ? AND status = 'completed'
                ");
                $prevStmt->execute([$mid, $rid]);
                $hasCompleted = $prevStmt->fetch() ? true : false;

                $acceptedAt = $hasCompleted ? date('Y-m-d H:i:s') : null;

                $ins->execute([$mid, $rid, $acceptedAt, $order]);
                $assignedReviewerIds[] = $rid;
                $order++;
            }

            $invitationMessage = "You have been invited to review the manuscript \"{$man['title']}\". Please log in to accept or decline.";
            createNotification($assignedReviewerIds, 'reviewer-invited', 'Review Invitation', $invitationMessage, $mid);
        }

        $pdo->prepare("UPDATE manuscripts SET status = 'under_review' WHERE id = ? AND status IN ('submitted', 'revision_requested', 'revised')")->execute([$mid]);

        $pdo->commit();

        createNotification(
            $man['author_id'],
            'reviewer-assigned',
            'Reviewers Assigned',
            "Your manuscript \"{$man['title']}\" has been assigned to reviewers.",
            $mid
        );

        $editorId = getAssignedEditorId($mid);
        if ($editorId) {
            createNotification(
                $editorId,
                'reviewer-assigned',
                'Reviewers Assigned',
                "Reviewers have been assigned to manuscript \"{$man['title']}\".",
                $mid
            );
        }

        successResponse(["manuscriptId" => $mid, "reviewersAssigned" => count($reviewers)]);
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    break;

case "replaceReviewer":
    $data = jsonInput();
    
    if (empty($data['manuscript_id']) || empty($data['old_reviewer_id']) || empty($data['new_reviewer_id'])) {
        errorResponse("manuscript_id, old_reviewer_id, and new_reviewer_id required");
    }

    $mid = (int)$data['manuscript_id'];
    $oldRid = (int)$data['old_reviewer_id'];
    $newRid = (int)$data['new_reviewer_id'];

    $pdo->beginTransaction();

    try {
        $manStmt = $pdo->prepare("SELECT title, author_id FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
        $manStmt->execute([$mid]);
        $man = $manStmt->fetch();
        if (!$man) throw new Exception("Manuscript not found");

        $orderStmt = $pdo->prepare("SELECT review_order FROM reviews WHERE manuscript_id = ? AND reviewer_id = ? AND status IN ('pending', 'expired')");
        $orderStmt->execute([$mid, $oldRid]);
        $orderRow = $orderStmt->fetch(PDO::FETCH_ASSOC);
        if (!$orderRow) {
            throw new Exception("No pending or expired review found for the specified reviewer");
        }
        $reviewOrder = $orderRow['review_order'];

        $checkNew = $pdo->prepare("SELECT 1 FROM users WHERE id = ? AND role = 'reviewer' AND active = 1");
        $checkNew->execute([$newRid]);
        if (!$checkNew->fetch()) {
            throw new Exception("Invalid or inactive new reviewer");
        }

        $updateOld = $pdo->prepare("
            UPDATE reviews SET status = 'expired' 
            WHERE manuscript_id = ? AND reviewer_id = ? AND status IN ('pending', 'expired')
        ");
        $updateOld->execute([$mid, $oldRid]);

        $prevStmt = $pdo->prepare("
            SELECT 1 FROM reviews 
            WHERE manuscript_id = ? AND reviewer_id = ? AND status = 'completed'
        ");
        $prevStmt->execute([$mid, $newRid]);
        $hasCompleted = $prevStmt->fetch() ? true : false;
        $acceptedAt = $hasCompleted ? date('Y-m-d H:i:s') : null;

        $ins = $pdo->prepare("
            INSERT INTO reviews 
                (manuscript_id, reviewer_id, status, assigned_at, accepted_at, due_date, review_order)
            VALUES (?, ?, 'pending', NOW(), ?, DATE_ADD(NOW(), INTERVAL 20 DAY), ?)
        ");
        $ins->execute([$mid, $newRid, $acceptedAt, $reviewOrder]);

        $pdo->commit();

        createNotification(
            $oldRid,
            'reviewer-replaced',
            'Review Assignment Removed',
            "You have been removed as a reviewer for manuscript \"{$man['title']}\".",
            $mid
        );
        createNotification(
            $newRid,
            'reviewer-invited',
            'New Review Invitation',
            "You have been invited to review the manuscript \"{$man['title']}\".",
            $mid
        );
        createNotification(
            $man['author_id'],
            'reviewer-replaced',
            'Reviewer Replaced',
            "A reviewer for your manuscript \"{$man['title']}\" has been replaced.",
            $mid
        );
        $editorId = getAssignedEditorId($mid);
        if ($editorId) {
            createNotification(
                $editorId,
                'reviewer-replaced',
                'Reviewer Replaced',
                "A reviewer for manuscript \"{$man['title']}\" has been replaced.",
                $mid
            );
        }

        successResponse([
            "message" => "Reviewer replaced successfully",
            "old_reviewer_id" => $oldRid,
            "new_reviewer_id" => $newRid,
            "review_order" => $reviewOrder
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
    break;

case "assignEditor":
    $data = jsonInput();
    
    if (empty($data['manuscript_id'])) errorResponse("manuscript_id required");

    $mid = (int)$data['manuscript_id'];
    $eid = isset($data['editor_id']) ? (int)$data['editor_id'] : null;

    if ($eid !== null && $eid <= 0) $eid = null;

    if ($eid !== null) {
        $check = $pdo->prepare("SELECT 1 FROM users WHERE id = ? AND role IN ('editor', 'publisher') AND active = 1");
        $check->execute([$eid]);
        if (!$check->fetch()) errorResponse("Invalid or inactive editor", 400);
    }

    $stmt = $pdo->prepare("UPDATE manuscripts SET editor_id = ? WHERE id = ? AND deleted_at IS NULL");
    $stmt->execute([$eid, $mid]);

    if ($stmt->rowCount() === 0 && $eid !== null) {
        $exists = $pdo->prepare("SELECT 1 FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
        $exists->execute([$mid]);
        if (!$exists->fetch()) errorResponse("Manuscript not found", 404);
    }

    // Fetch manuscript title and author details
    $manStmt = $pdo->prepare("SELECT title, author_id FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
    $manStmt->execute([$mid]);
    $man = $manStmt->fetch();

    // Notify author (in-app)
    if ($man) {
        createNotification(
            $man['author_id'],
            'editor-assigned',
            'Editor Assigned',
            "An editor has been assigned to your manuscript \"{$man['title']}\".",
            $mid
        );
    }

    // If editor assigned, notify editor (in-app and direct email)
    if ($eid) {
        // Fetch editor email and name
        $editorStmt = $pdo->prepare("SELECT email, name FROM users WHERE id = ?");
        $editorStmt->execute([$eid]);
        $editor = $editorStmt->fetch(PDO::FETCH_ASSOC);
        if ($editor) {
            // In-app notification for editor
            createNotification(
                $eid,
                'editor-assigned',
                'Manuscript Assigned to You',
                "You have been assigned as the handling editor for manuscript \"{$man['title']}\".",
                $mid
            );

            // Direct email to the assigned editor only
            $subject = "Manuscript Assigned to You";
            $emailBody = "
                <p>Dear " . htmlspecialchars($editor['name']) . ",</p>
                <p>You have been assigned as the handling editor for the manuscript titled <strong>\"" . htmlspecialchars($man['title']) . "\"</strong>.</p>
                <p>Please log in to the system to proceed.</p>
                <p>Best regards,<br>Editorial Team</p>
            ";
            sendEmail($editor['email'], $subject, $emailBody);
        }
    }

    successResponse(["editorId" => $eid]);
    break;

case "completeReview":
    $data = jsonInput();
    
    if (empty($data['manuscript_id']) || empty($data['reviewer_id'])) {
        errorResponse("manuscript_id and reviewer_id required");
    }

    $mid = (int)$data['manuscript_id'];
    $rid = (int)$data['reviewer_id'];

    $stmt = $pdo->prepare("
        UPDATE reviews
        SET status = 'completed', completed_at = NOW()
        WHERE manuscript_id = ? AND reviewer_id = ? AND status = 'pending'
    ");
    $stmt->execute([$mid, $rid]);

    if ($stmt->rowCount() === 0) errorResponse("No pending review found", 404);

    $pending = $pdo->prepare("SELECT COUNT(*) FROM reviews WHERE manuscript_id = ? AND status = 'pending'");
    $pending->execute([$mid]);
    $pendingCount = (int)$pending->fetchColumn();

    $manStmt = $pdo->prepare("SELECT title, author_id FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
    $manStmt->execute([$mid]);
    $man = $manStmt->fetch();

    if ($man) {
        createNotification(
            $man['author_id'],
            'review-submitted',
            'Review Submitted',
            "A reviewer has submitted comments on your manuscript \"{$man['title']}\".",
            $mid
        );
    }

    $editorId = getAssignedEditorId($mid);
    if ($editorId) {
        createNotification(
            $editorId,
            'review-submitted',
            'Review Submitted',
            "A reviewer has submitted comments on manuscript \"{$man['title']}\".",
            $mid
        );
    }

    successResponse([
        "completed" => true,
        "allReviewsComplete" => ($pendingCount === 0),
        "pendingReviews" => $pendingCount
    ]);
    break;

case "decision":
    $data = jsonInput();
    
    if (empty($data['manuscript_id']) || empty($data['decision'])) {
        errorResponse("manuscript_id and decision required");
    }

    $map = [
        "accept"  => "accepted", 
        "reject"  => "rejected", 
        "revision" => "revision_requested"
    ];
    $decision = strtolower($data['decision']);
    
    if (!isset($map[$decision])) {
        errorResponse("Invalid decision. Use: accept, reject, revision");
    }

    $newStatus = $map[$decision];
    $mid = (int)$data['manuscript_id'];

    $manStmt = $pdo->prepare("SELECT title, author_id FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
    $manStmt->execute([$mid]);
    $man = $manStmt->fetch();
    if (!$man) {
        error_log("Decision: Manuscript ID $mid not found or deleted");
        errorResponse("Manuscript not found", 404);
    }
    $title = $man['title'];
    $authorId = $man['author_id'];

    if ($decision === 'accept') {
        $pendingStmt = $pdo->prepare("SELECT COUNT(*) FROM reviews WHERE manuscript_id = ? AND status = 'pending'");
        $pendingStmt->execute([$mid]);
        if ((int)$pendingStmt->fetchColumn() > 0) {
            errorResponse("Cannot accept: pending reviews exist", 400);
        }
    }

    if ($decision === 'revision') {
        $pdo->beginTransaction();
        try {
            $revNumStmt = $pdo->prepare("
                SELECT COALESCE(MAX(revision_number), 0) + 1 
                FROM manuscript_revisions 
                WHERE manuscript_id = ?
            ");
            $revNumStmt->execute([$mid]);
            $nextRevision = (int)$revNumStmt->fetchColumn();

            $createStmt = $pdo->prepare("
                INSERT INTO manuscript_revisions 
                (manuscript_id, revision_number, submitted_at, revised_file, response_file)
                VALUES (?, ?, NOW(), NULL, NULL)
            ");
            $createStmt->execute([$mid, $nextRevision]);
            // Move out of Under Review until the revision is submitted and reviewers are re-assigned
            $statusStmt = $pdo->prepare("UPDATE manuscripts SET status = 'revision_requested' WHERE id = ? AND deleted_at IS NULL");
            $statusStmt->execute([$mid]);
            $newRevisionId = (int)$pdo->lastInsertId();

            $prevRevStmt = $pdo->prepare("
                SELECT id FROM manuscript_revisions
                WHERE manuscript_id = ? AND revision_number < ?
                ORDER BY revision_number DESC
                LIMIT 1
            ");
            $prevRevStmt->execute([$mid, $nextRevision]);
            $prevRev = $prevRevStmt->fetch(PDO::FETCH_ASSOC);

            if ($prevRev) {
                $copyStmt = $pdo->prepare("
                    INSERT INTO revision_entries 
                    (revision_id, reviewer_id, reviewer_comment, author_response, addressed)
                    SELECT ?, reviewer_id, reviewer_comment, NULL, 0
                    FROM revision_entries
                    WHERE revision_id = ?
                ");
                $copyStmt->execute([$newRevisionId, $prevRev['id']]);
            }

            // Pull in the reviewer comments from completed reviews that recommended a
            // revision, so the author sees them only after the admin requests the revision.
            $revEntryStmt = $pdo->prepare("
                INSERT INTO revision_entries (revision_id, reviewer_id, reviewer_comment, addressed)
                SELECT ?, r.reviewer_id, rs.comments_to_author, 0
                FROM review_scores rs
                JOIN reviews r ON r.id = rs.review_id
                WHERE r.manuscript_id = ?
                  AND r.status = 'completed'
                  AND rs.recommendation IN ('minor_revision', 'major_revision')
                  AND rs.comments_to_author IS NOT NULL AND rs.comments_to_author <> ''
                  AND NOT EXISTS (
                      SELECT 1 FROM revision_entries re2
                      JOIN manuscript_revisions mr2 ON mr2.id = re2.revision_id
                      WHERE mr2.manuscript_id = ?
                        AND re2.reviewer_id = r.reviewer_id
                        AND re2.reviewer_comment = rs.comments_to_author
                  )
            ");
            $revEntryStmt->execute([$newRevisionId, $mid, $mid]);
            $delStmt = $pdo->prepare("DELETE FROM reviews WHERE manuscript_id = ? AND status IN ('pending', 'expired')");
            $delStmt->execute([$mid]);

            $pdo->commit();

            createNotification(
                $authorId,
                'revision-requested',
                'Revision Requested',
                "Revision requested for your manuscript \"$title\". Please submit revised files.",
                $mid
            );

            $editorId = getAssignedEditorId($mid);
            if ($editorId) {
                createNotification(
                    $editorId,
                    'revision-requested',
                    'Revision Requested',
                    "Revision requested for manuscript \"$title\".",
                    $mid
                );
            }

            $reviewerIds = getReviewerIdsForManuscript($mid);
            if (!empty($reviewerIds)) {
                createNotification(
                    $reviewerIds,
                    'revision-requested',
                    'Revision Requested',
                    "A revision has been requested for manuscript \"$title\". You may be notified when the author submits.",
                    $mid
                );
            }

            successResponse([
                "decision" => "revision",
                "revision_number" => $nextRevision,
                "message" => "Revision created. Pending/expired reviews cleared."
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            throw $e;
        }
    } else {
        $stmt = $pdo->prepare("UPDATE manuscripts SET status = ? WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$newStatus, $mid]);

        if ($stmt->rowCount() === 0) errorResponse("Manuscript not found", 404);

        // If accept or reject, set feedback_released = 1 immediately
        if ($decision === 'accept' || $decision === 'reject') {
            $pdo->prepare("UPDATE manuscripts SET feedback_released = 1 WHERE id = ?")->execute([$mid]);
        }

        $notificationType = ($decision === 'accept') ? 'manuscript-accepted' : 'manuscript-rejected';
        $notificationTitle = ($decision === 'accept') ? 'Manuscript Accepted' : 'Manuscript Rejected';
        $notificationBody = ($decision === 'accept')
            ? "Your manuscript \"$title\" has been accepted."
            : "Your manuscript \"$title\" has been rejected.";

        createNotification($authorId, $notificationType, $notificationTitle, $notificationBody, $mid);

        $editorId = getAssignedEditorId($mid);
        if ($editorId) {
            $editorBody = ($decision === 'accept')
                ? "Manuscript \"$title\" has been accepted."
                : "Manuscript \"$title\" has been rejected.";
            createNotification($editorId, $notificationType, $notificationTitle, $editorBody, $mid);
        }

        if ($decision === 'accept') {
            $reviewerIds = getReviewerIdsForManuscript($mid);
            if (!empty($reviewerIds)) {
                createNotification(
                    $reviewerIds,
                    'manuscript-accepted',
                    'Manuscript Accepted',
                    "The manuscript \"$title\" you reviewed has been accepted.",
                    $mid
                );
            }
        }

        successResponse([
            "decision" => $decision,
            "newStatus" => mapDbStatusToUi($newStatus)
        ]);
    }
    break;

case "createRevisionEntries":
    $data = jsonInput();
    
    if (empty($data['revision_id']) || empty($data['entries']) || !is_array($data['entries'])) {
        errorResponse("revision_id and entries array required");
    }

    $revId = (int)$data['revision_id'];
    
    $check = $pdo->prepare("SELECT mr.manuscript_id FROM manuscript_revisions mr JOIN manuscripts m ON m.id = mr.manuscript_id WHERE mr.id = ? AND m.deleted_at IS NULL");
    $check->execute([$revId]);
    $rev = $check->fetch();
    if (!$rev) errorResponse("Revision not found or manuscript deleted", 404);
    $manuscriptId = $rev['manuscript_id'];

    $inserted = 0;
    $ins = $pdo->prepare("
        INSERT INTO revision_entries 
        (revision_id, reviewer_id, reviewer_comment, author_response, addressed)
        VALUES (?, ?, ?, ?, ?)
    ");

    $reviewerIds = [];
    foreach ($data['entries'] as $e) {
        if (empty($e['reviewer_id']) || !isset($e['reviewer_comment'])) continue;
        $reviewerIds[] = (int)$e['reviewer_id'];
        $ins->execute([
            $revId,
            (int)$e['reviewer_id'],
            $e['reviewer_comment'],
            $e['author_response'] ?? null,
            !empty($e['addressed']) ? 1 : 0
        ]);
        $inserted++;
    }

    if (!empty($reviewerIds)) {
        $manStmt = $pdo->prepare("SELECT title FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
        $manStmt->execute([$manuscriptId]);
        $manTitle = $manStmt->fetchColumn();

        $uniqueReviewerIds = array_unique($reviewerIds);
        createNotification(
            $uniqueReviewerIds,
            'revision-comment-added',
            'Revision Comment Added',
            "Your revision comments have been recorded for manuscript \"$manTitle\".",
            $manuscriptId
        );

        $authorId = getManuscriptAuthorId($manuscriptId);
        createNotification(
            $authorId,
            'revision-comment-added',
            'Revision Comments Added',
            "Revision comments have been added to your manuscript \"$manTitle\".",
            $manuscriptId
        );
    }

    successResponse(["revision_id" => $revId, "entries_created" => $inserted]);
    break;

case "updateRevisionEntry":
    $data = jsonInput();
    
    if (empty($data['entry_id'])) errorResponse("entry_id required");

    $entryId = (int)$data['entry_id'];
    
    $entryStmt = $pdo->prepare("
        SELECT re.reviewer_id, re.revision_id, mr.manuscript_id
        FROM revision_entries re
        JOIN manuscript_revisions mr ON mr.id = re.revision_id
        JOIN manuscripts m ON m.id = mr.manuscript_id
        WHERE re.id = ? AND m.deleted_at IS NULL
    ");
    $entryStmt->execute([$entryId]);
    $entry = $entryStmt->fetch();
    if (!$entry) errorResponse("Entry not found or manuscript deleted", 404);

    $fields = [];
    $values = [];
    
    if (isset($data['author_response'])) {
        $fields[] = "author_response = ?";
        $values[] = $data['author_response'];
    }
    
    if (isset($data['addressed'])) {
        $fields[] = "addressed = ?";
        $values[] = !empty($data['addressed']) ? 1 : 0;
    }
    
    if (empty($fields)) errorResponse("No fields to update");
    
    $values[] = $entryId;
    
    $stmt = $pdo->prepare("UPDATE revision_entries SET " . implode(", ", $fields) . " WHERE id = ?");
    $stmt->execute($values);

    if ($stmt->rowCount() > 0 && isset($data['author_response'])) {
        $manStmt = $pdo->prepare("SELECT title FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
        $manStmt->execute([$entry['manuscript_id']]);
        $manTitle = $manStmt->fetchColumn();

        createNotification(
            $entry['reviewer_id'],
            'author-responded',
            'Author Response',
            "The author has responded to your revision comment on manuscript \"$manTitle\".",
            $entry['manuscript_id']
        );
    }

    successResponse(["updated" => $stmt->rowCount() > 0]);
    break;

case "startProduction":
    $data = jsonInput();
    $mid = (int)($data['manuscript_id'] ?? 0);
    if (!$mid) errorResponse("manuscript_id required");

    $check = $pdo->prepare("SELECT status, in_production, title, author_id FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
    $check->execute([$mid]);
    $row = $check->fetch();
    if (!$row) errorResponse("Manuscript not found", 404);
    if ($row['status'] !== 'accepted') errorResponse("Only accepted manuscripts can be moved to production", 400);
    if ($row['in_production'] == 1) errorResponse("Manuscript already in production", 400);

    $stmt = $pdo->prepare("UPDATE manuscripts SET in_production = 1 WHERE id = ? AND deleted_at IS NULL");
    $stmt->execute([$mid]);

    createNotification(
        $row['author_id'],
        'production-started',
        'Production Started',
        "Your manuscript \"{$row['title']}\" has entered the production phase.",
        $mid
    );

    $editorId = getAssignedEditorId($mid);
    if ($editorId) {
        createNotification(
            $editorId,
            'production-started',
            'Production Started',
            "Manuscript \"{$row['title']}\" has entered production.",
            $mid
        );
    }

    $publisherStmt = $pdo->query("SELECT id FROM users WHERE role = 'publisher' AND active = 1");
    $publisherIds = $publisherStmt->fetchAll(PDO::FETCH_COLUMN);
    if (!empty($publisherIds)) {
        createNotification(
            $publisherIds,
            'production-started',
            'Production Started',
            "Manuscript \"{$row['title']}\" has entered production.",
            $mid
        );
    }

    successResponse(["message" => "Manuscript moved to production"]);
    break;

case "updateRevisedFile":
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        errorResponse("Method not allowed", 405);
    }

    $manuscriptId = isset($_POST['manuscript_id']) ? (int)$_POST['manuscript_id'] : 0;
    if (!$manuscriptId) {
        errorResponse("manuscript_id required", 400);
    }

    $manStmt = $pdo->prepare("SELECT id FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
    $manStmt->execute([$manuscriptId]);
    if (!$manStmt->fetch()) {
        errorResponse("Manuscript not found", 404);
    }

    if (!isset($_FILES['revised_file']) || $_FILES['revised_file']['error'] !== UPLOAD_ERR_OK) {
        errorResponse("No file uploaded or upload error", 400);
    }

    try {
        $relativePath = uploadFile($_FILES['revised_file'], 'revisions', ['pdf', 'doc', 'docx']);
    } catch (Exception $e) {
        errorResponse($e->getMessage(), 400);
    }

    $revStmt = $pdo->prepare("
        SELECT id FROM manuscript_revisions
        WHERE manuscript_id = ?
        ORDER BY revision_number DESC
        LIMIT 1
    ");
    $revStmt->execute([$manuscriptId]);
    $revision = $revStmt->fetch(PDO::FETCH_ASSOC);

    if (!$revision) {
        errorResponse("No revision record found for this manuscript", 404);
    }

    $revisionId = $revision['id'];

    $updateStmt = $pdo->prepare("
        UPDATE manuscript_revisions
        SET revised_file = ?
        WHERE id = ?
    ");
    $updateStmt->execute([$relativePath, $revisionId]);

    if ($updateStmt->rowCount() === 0) {
        errorResponse("Failed to update revision file path", 500);
    }

    // Move the manuscript into the 'revised' lifecycle state (Revised Manuscript tab)
    $pdo->prepare("
        UPDATE manuscripts
        SET status = 'revised'
        WHERE id = ? AND deleted_at IS NULL AND status IN ('revision_requested', 'under_review')
    ")->execute([$manuscriptId]);

    $fullUrl = getFullUrl($relativePath);
    successResponse([
        "message" => "Revised file updated successfully",
        "file_path" => $fullUrl
    ]);
    break;

case "updateManuscriptFile":
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        errorResponse("Method not allowed", 405);
    }

    $manuscriptId = isset($_POST['manuscript_id']) ? (int)$_POST['manuscript_id'] : 0;
    if (!$manuscriptId) {
        errorResponse("manuscript_id required", 400);
    }

    $check = $pdo->prepare("SELECT id, status FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
    $check->execute([$manuscriptId]);
    $man = $check->fetch(PDO::FETCH_ASSOC);
    if (!$man) {
        errorResponse("Manuscript not found", 404);
    }
    if ($man['status'] !== 'submitted') {
        errorResponse("Only new submissions can have the manuscript file updated", 400);
    }

    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        errorResponse("No file uploaded or upload error", 400);
    }

    try {
        $relativePath = uploadFile($_FILES['file'], 'manuscripts', ['pdf', 'doc', 'docx']);
    } catch (Exception $e) {
        errorResponse($e->getMessage(), 400);
    }

    $stmt = $pdo->prepare("UPDATE manuscripts SET file_path = ? WHERE id = ? AND deleted_at IS NULL");
    $stmt->execute([$relativePath, $manuscriptId]);

    $fullUrl = getFullUrl($relativePath);
    successResponse([
        "message" => "Manuscript file updated successfully",
        "file_path" => $fullUrl
    ]);
    break;

case "sendDecisionEmail":
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        errorResponse("Method not allowed", 405);
    }

    $isMultipart = !empty($_FILES) || !empty($_POST);
    if ($isMultipart) {
        $mid = (int)($_POST['manuscript_id'] ?? 0);
        $decision = strtolower($_POST['decision'] ?? '');
        $subject = $_POST['subject'] ?? '';
        $body = $_POST['body'] ?? '';
        $reason = $_POST['reason'] ?? null;
        $uploadedFiles = [];

        if (isset($_FILES['attachments'])) {
            $files = $_FILES['attachments'];
            if (is_array($files['name'])) {
                $fileCount = count($files['name']);
                for ($i = 0; $i < $fileCount; $i++) {
                    $file = [
                        'name'     => $files['name'][$i],
                        'type'     => $files['type'][$i],
                        'tmp_name' => $files['tmp_name'][$i],
                        'error'    => $files['error'][$i],
                        'size'     => $files['size'][$i],
                    ];
                    if ($file['error'] === UPLOAD_ERR_OK) {
                        try {
                            $relPath = uploadFile($file, 'email_attachments', ['pdf', 'doc', 'docx', 'txt']);
                            $uploadedFiles[] = $relPath;
                        } catch (Exception $e) {
                            error_log("Failed to upload email attachment: " . $e->getMessage());
                        }
                    }
                }
            } else {
                if ($files['error'] === UPLOAD_ERR_OK) {
                    try {
                        $relPath = uploadFile($files, 'email_attachments', ['pdf', 'doc', 'docx', 'txt']);
                        $uploadedFiles[] = $relPath;
                    } catch (Exception $e) {
                        error_log("Failed to upload email attachment: " . $e->getMessage());
                    }
                }
            }
        }
    } else {
        $data = jsonInput();
        if (!$data) errorResponse("Invalid JSON", 400);
        $mid = (int)($data['manuscript_id'] ?? 0);
        $decision = strtolower($data['decision'] ?? '');
        $subject = $data['subject'] ?? '';
        $body = $data['body'] ?? '';
        $reason = $data['reason'] ?? null;
        $uploadedFiles = [];
    }

    if (!$mid || !in_array($decision, ['accept', 'reject', 'revision'])) {
        errorResponse("manuscript_id and valid decision (accept/reject/revision) required", 400);
    }

    if (empty($subject) || empty($body)) {
        $generated = generateDecisionEmailBody($mid, $decision, $reason);
        if (!$generated) {
            errorResponse("Could not generate email content for this decision", 500);
        }
        if (empty($subject)) $subject = $generated['subject'];
        if (empty($body)) $body = $generated['body'];
    }

    $manStmt = $pdo->prepare("SELECT title, author_id FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
    $manStmt->execute([$mid]);
    $man = $manStmt->fetch(PDO::FETCH_ASSOC);
    if (!$man) {
        error_log("sendDecisionEmail: Manuscript ID $mid not found or deleted");
        errorResponse("Manuscript not found", 404);
    }

    $authorStmt = $pdo->prepare("SELECT email FROM users WHERE id = ?");
    $authorStmt->execute([$man['author_id']]);
    $authorEmail = $authorStmt->fetchColumn();
    if (!$authorEmail) {
        error_log("sendDecisionEmail: Author email not found for user ID {$man['author_id']}");
        errorResponse("Author email not found", 404);
    }

    if (!empty($uploadedFiles)) {
        $insertStmt = $pdo->prepare("
            INSERT INTO email_attachments (manuscript_id, decision_type, file_path, email_subject, email_body)
            VALUES (?, ?, ?, ?, ?)
        ");
        foreach ($uploadedFiles as $filePath) {
            $insertStmt->execute([$mid, $decision, $filePath, $subject, $body]);
        }
    } else {
        $insertStmt = $pdo->prepare("
            INSERT INTO email_attachments (manuscript_id, decision_type, file_path, email_subject, email_body)
            VALUES (?, ?, NULL, ?, ?)
        ");
        $insertStmt->execute([$mid, $decision, $subject, $body]);
    }

    try {
        $mailSent = sendEmailWithAttachments($authorEmail, $subject, $body, $uploadedFiles);
        if (!$mailSent) {
            error_log("sendDecisionEmail: Failed to send email to $authorEmail");
            errorResponse("Failed to send email", 500);
        }

        // ✅ Set feedback_released = 1 after email is successfully sent
        $pdo->prepare("UPDATE manuscripts SET feedback_released = 1 WHERE id = ?")->execute([$mid]);
    } catch (Exception $e) {
        error_log("sendDecisionEmail: Exception while sending email: " . $e->getMessage());
        errorResponse("Email sending failed: " . $e->getMessage(), 500);
    }

    successResponse(["message" => "Decision email sent successfully with attachments"]);
    break;

case "sendReviewerEmail":
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        errorResponse("Method not allowed", 405);
    }

    $isMultipart = !empty($_FILES) || !empty($_POST);
    if ($isMultipart) {
        $mid = (int)($_POST['manuscript_id'] ?? 0);
        $reviewersJson = $_POST['reviewers'] ?? '';
        $subject = $_POST['subject'] ?? '';
        $body = $_POST['body'] ?? '';
        $uploadedFiles = [];
        $reviewerIds = json_decode($reviewersJson, true);
        if (!is_array($reviewerIds)) {
            errorResponse("Invalid reviewers data", 400);
        }

        if (isset($_FILES['attachments'])) {
            $files = $_FILES['attachments'];
            if (is_array($files['name'])) {
                $fileCount = count($files['name']);
                for ($i = 0; $i < $fileCount; $i++) {
                    $file = [
                        'name'     => $files['name'][$i],
                        'type'     => $files['type'][$i],
                        'tmp_name' => $files['tmp_name'][$i],
                        'error'    => $files['error'][$i],
                        'size'     => $files['size'][$i],
                    ];
                    if ($file['error'] === UPLOAD_ERR_OK) {
                        try {
                            $relPath = uploadFile($file, 'email_attachments', ['pdf', 'doc', 'docx', 'txt']);
                            $uploadedFiles[] = $relPath;
                        } catch (Exception $e) {
                            error_log("Failed to upload reviewer email attachment: " . $e->getMessage());
                        }
                    }
                }
            } else {
                if ($files['error'] === UPLOAD_ERR_OK) {
                    try {
                        $relPath = uploadFile($files, 'email_attachments', ['pdf', 'doc', 'docx', 'txt']);
                        $uploadedFiles[] = $relPath;
                    } catch (Exception $e) {
                        error_log("Failed to upload reviewer email attachment: " . $e->getMessage());
                    }
                }
            }
        }
    } else {
        $data = jsonInput();
        if (!$data) errorResponse("Invalid JSON", 400);
        $mid = (int)($data['manuscript_id'] ?? 0);
        $reviewerIds = $data['reviewers'] ?? [];
        $subject = $data['subject'] ?? '';
        $body = $data['body'] ?? '';
        $uploadedFiles = [];
    }

    if (!$mid || empty($reviewerIds) || !is_array($reviewerIds)) {
        errorResponse("manuscript_id and reviewers array required", 400);
    }

    $manStmt = $pdo->prepare("SELECT title FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
    $manStmt->execute([$mid]);
    $manTitle = $manStmt->fetchColumn();
    if (!$manTitle) {
        errorResponse("Manuscript not found", 404);
    }

    $placeholders = implode(',', array_fill(0, count($reviewerIds), '?'));
    $reviewerStmt = $pdo->prepare("SELECT id, email, name FROM users WHERE id IN ($placeholders) AND role = 'reviewer' AND active = 1");
    $reviewerStmt->execute($reviewerIds);
    $reviewers = $reviewerStmt->fetchAll(PDO::FETCH_ASSOC);

    if (empty($reviewers)) {
        errorResponse("No valid reviewers found", 400);
    }

    $attachmentPaths = $uploadedFiles;
    if (!empty($attachmentPaths)) {
        $insertStmt = $pdo->prepare("
            INSERT INTO email_attachments (manuscript_id, decision_type, file_path, email_subject, email_body)
            VALUES (?, 'reviewer_assignment', ?, ?, ?)
        ");
        foreach ($attachmentPaths as $filePath) {
            $insertStmt->execute([$mid, $filePath, $subject, $body]);
        }
    } else {
        $insertStmt = $pdo->prepare("
            INSERT INTO email_attachments (manuscript_id, decision_type, file_path, email_subject, email_body)
            VALUES (?, 'reviewer_assignment', NULL, ?, ?)
        ");
        $insertStmt->execute([$mid, $subject, $body]);
    }

    $successCount = 0;
    $failures = [];
    foreach ($reviewers as $reviewer) {
        $finalSubject = $subject;
        $finalBody = $body;
        if (empty($finalSubject) || empty($finalBody)) {
            $generated = generateReviewerInvitationBody($mid, $reviewer['id']);
            if ($generated) {
                if (empty($finalSubject)) $finalSubject = $generated['subject'];
                if (empty($finalBody)) $finalBody = $generated['body'];
            } else {
                $failures[] = $reviewer['name'];
                continue;
            }
        }
        try {
            $sent = sendEmailWithAttachments($reviewer['email'], $finalSubject, $finalBody, $attachmentPaths);
            if ($sent) {
                $successCount++;
            } else {
                $failures[] = $reviewer['name'];
            }
        } catch (Exception $e) {
            error_log("Failed to send email to reviewer {$reviewer['email']}: " . $e->getMessage());
            $failures[] = $reviewer['name'];
        }
    }

    if ($successCount === 0 && !empty($failures)) {
        errorResponse("Failed to send emails to all reviewers", 500);
    }

    $message = "Emails sent to $successCount reviewer(s).";
    if (!empty($failures)) {
        $message .= " Failed for: " . implode(', ', $failures);
    }
    successResponse([
        "message" => $message,
        "sent" => $successCount,
        "total" => count($reviewers),
        "failures" => $failures
    ]);
    break;

case "sendReviewerFeedbackConfirmation":
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        errorResponse("Method not allowed", 405);
    }
    $data = jsonInput();
    if (!$data) errorResponse("Invalid JSON", 400);
    $manuscriptId = (int)($data['manuscript_id'] ?? 0);
    $reviewerId = (int)($data['reviewer_id'] ?? 0);
    if (!$manuscriptId || !$reviewerId) {
        errorResponse("manuscript_id and reviewer_id required", 400);
    }
    $manStmt = $pdo->prepare("SELECT m.id, m.slug, m.title, u.name AS reviewer_name, u.email AS reviewer_email FROM manuscripts m JOIN users u ON u.id = ? WHERE m.id = ? AND m.deleted_at IS NULL");
    $manStmt->execute([$reviewerId, $manuscriptId]);
    $row = $manStmt->fetch(PDO::FETCH_ASSOC);
    if (!$row) errorResponse("Manuscript or reviewer not found", 404);
    
    $formattedId = formaterManuscriptId($row['slug']);
    $subject = "ARTICLE REVIEW ALERT";
    $body = "
        <!DOCTYPE html>
        <html>
        <head><meta charset='UTF-8'><title>Review Feedback</title></head>
        <body>
            <p>Dear {$row['reviewer_name']},</p>
            <p>Thank you for reviewing manuscript ID: {$formattedId}, entitled \"{$row['title']}\". We greatly appreciate your efforts for the journal.</p>
            <p>You can access your comments by logging onto at: <a href='https://www.afmjonline.com/pages/reviewer'>https://www.afmjonline.com/pages/reviewer</a></p>
            <p>email: {$row['reviewer_email']}<br>password: your registered password</p>
            " . SIGNATURE_EDITOR_IN_CHIEF . "
        </body>
        </html>
    ";
    $storeStmt = $pdo->prepare("INSERT INTO email_attachments (manuscript_id, decision_type, email_subject, email_body) VALUES (?, 'reviewer_feedback', ?, ?)");
    $storeStmt->execute([$manuscriptId, $subject, $body]);
    $sent = sendEmail($row['reviewer_email'], $subject, $body);
    if (!$sent) errorResponse("Failed to send email", 500);
    successResponse(["message" => "Reviewer feedback confirmation sent"]);
    break;

case "uploadCirculatingFile":
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        errorResponse("Method not allowed", 405);
    }

    $manuscriptId = isset($_POST['manuscript_id']) ? (int)$_POST['manuscript_id'] : 0;
    if (!$manuscriptId) errorResponse("manuscript_id required", 400);

    $manStmt = $pdo->prepare("SELECT id FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
    $manStmt->execute([$manuscriptId]);
    if (!$manStmt->fetch()) errorResponse("Manuscript not found", 404);

    if (!isset($_FILES['circulating_file']) || $_FILES['circulating_file']['error'] !== UPLOAD_ERR_OK) {
        errorResponse("No file uploaded or upload error", 400);
    }

    try {
        $relativePath = uploadFile($_FILES['circulating_file'], 'circulating', ['pdf', 'doc', 'docx']);
    } catch (Exception $e) {
        errorResponse($e->getMessage(), 400);
    }

    $stmt = $pdo->prepare("UPDATE manuscripts SET circulating_file_path = ? WHERE id = ? AND deleted_at IS NULL");
    $stmt->execute([$relativePath, $manuscriptId]);

    $fullUrl = getFullUrl($relativePath);
    successResponse([
        "message" => "Circulating file uploaded successfully",
        "file_path" => $fullUrl
    ]);
    break;

case "uploadReviewerDocument":
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        errorResponse("Method not allowed", 405);
    }

    $manuscriptId = isset($_POST['manuscript_id']) ? (int)$_POST['manuscript_id'] : 0;
    if (!$manuscriptId) errorResponse("manuscript_id required", 400);

    $manStmt = $pdo->prepare("SELECT id FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
    $manStmt->execute([$manuscriptId]);
    if (!$manStmt->fetch()) errorResponse("Manuscript not found", 404);

    if (!isset($_FILES['reviewer_document']) || $_FILES['reviewer_document']['error'] !== UPLOAD_ERR_OK) {
        errorResponse("No file uploaded or upload error", 400);
    }

    $purpose = trim($_POST['purpose'] ?? '');
    if ($purpose === '') $purpose = null;

    try {
        $relativePath = uploadFile($_FILES['reviewer_document'], 'reviewer_documents', ['pdf', 'doc', 'docx']);
    } catch (Exception $e) {
        errorResponse($e->getMessage(), 400);
    }

    $fetchStmt = $pdo->prepare("SELECT additional_reviewer_files FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
    $fetchStmt->execute([$manuscriptId]);
    $existing = $fetchStmt->fetchColumn();
    $files = $existing ? json_decode($existing, true) : [];
    if (!is_array($files)) $files = [];

    $files[] = ['path' => $relativePath, 'purpose' => $purpose];
    $updateStmt = $pdo->prepare("UPDATE manuscripts SET additional_reviewer_files = ? WHERE id = ? AND deleted_at IS NULL");
    $updateStmt->execute([json_encode($files), $manuscriptId]);

    $fullUrl = getFullUrl($relativePath);
    successResponse([
        "message" => "Reviewer document uploaded successfully",
        "file_path" => $fullUrl,
        "all_files" => parseAdditionalReviewerFiles(json_encode($files))
    ]);
    break;

case "stats":
    $statusStmt = $pdo->query("SELECT status, COUNT(*) as count FROM manuscripts WHERE deleted_at IS NULL GROUP BY status");
    $byStatus = $statusStmt->fetchAll(PDO::FETCH_KEY_PAIR);
    $recentStmt = $pdo->query("SELECT COUNT(*) FROM manuscripts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND deleted_at IS NULL");
    $reviewStmt = $pdo->query("
        SELECT COUNT(*) as total, SUM(CASE WHEN r.status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM reviews r
        JOIN manuscripts m ON m.id = r.manuscript_id
        WHERE m.deleted_at IS NULL
    ");
    $reviewStats = $reviewStmt->fetch(PDO::FETCH_ASSOC);
    jsonResponse([
        "manuscripts" => [
            "byStatus" => $byStatus,
            "total" => array_sum($byStatus),
            "recent30Days" => (int)$recentStmt->fetchColumn()
        ],
        "reviews" => [
            "total" => (int)$reviewStats['total'],
            "completed" => (int)$reviewStats['completed'],
            "completionRate" => $reviewStats['total'] > 0 ? round(($reviewStats['completed'] / $reviewStats['total']) * 100, 1) : 0
        ]
    ]);
    break;

case "incrementDownload":
    $data = jsonInput();
    if (!$data) errorResponse("Invalid JSON", 400);
    $mid = (int)($data['manuscript_id'] ?? 0);
    if (!$mid) errorResponse("manuscript_id required", 400);

    $stmt = $pdo->prepare("UPDATE manuscripts SET downloads = downloads + 1 WHERE id = ? AND deleted_at IS NULL");
    $stmt->execute([$mid]);

    if ($stmt->rowCount() === 0) {
        errorResponse("Manuscript not found", 404);
    }

    successResponse(["message" => "Download count incremented"]);
    break;

// ==================== SOFT DELETE ====================
case "delete":
    $data = jsonInput();
    if (!$data) {
        errorResponse("Invalid JSON payload", 400);
    }

    $mid = (int)($data['manuscript_id'] ?? 0);
    $confirm = trim($data['confirm'] ?? '');

    if (!$mid) {
        errorResponse("manuscript_id is required", 400);
    }

    if (strtolower($confirm) !== 'delete') {
        errorResponse("Confirmation failed: please send 'confirm' => 'delete'", 400);
    }

    $stmt = $pdo->prepare("SELECT id, title FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
    $stmt->execute([$mid]);
    $man = $stmt->fetch(PDO::FETCH_ASSOC);
    if (!$man) {
        errorResponse("Manuscript not found or already deleted", 404);
    }

    $update = $pdo->prepare("UPDATE manuscripts SET deleted_at = NOW() WHERE id = ?");
    $update->execute([$mid]);

    successResponse([
        "message" => "Manuscript deleted successfully",
        "manuscript_id" => $mid,
        "title" => $man['title']
    ]);
    break;

default:
    errorResponse("Invalid action: $action", 400);
}

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("DB Error: " . $e->getMessage());
    errorResponse("Database error", 500);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log("API Error: " . $e->getMessage());
    errorResponse($e->getMessage(), 500);
}
?>
