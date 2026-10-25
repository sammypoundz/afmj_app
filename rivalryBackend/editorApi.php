<?php
// ==================== CORS HEADERS ====================
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Session-Id");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ==================== SESSION (no cookies) ====================
$customSessionPath = __DIR__ . '/sessions';
if (!is_dir($customSessionPath)) {
    mkdir($customSessionPath, 0755, true);
}
session_save_path($customSessionPath);
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

$editorId = $_SESSION['user_id'];

// ==================== REQUIREMENTS ====================
require_once __DIR__ . "/config.php";
require_once __DIR__ . "/notification_helper.php";

// ==================== HELPER FUNCTIONS ====================
function jsonResponse($data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

function errorResponse(string $message, int $code = 400): void {
    jsonResponse(["error" => $message], $code);
}

function jsonInput(): ?array {
    $input = file_get_contents("php://input");
    return $input ? json_decode($input, true) : null;
}

// ==================== ACTIONS ====================
$action = $_GET['action'] ?? '';

try {
    switch ($action) {

        // ========== DASHBOARD STATS ==========
        case "getDashboardStats":
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM manuscripts WHERE editor_id = ? AND deleted_at IS NULL");
            $stmt->execute([$editorId]);
            $totalAssigned = (int)$stmt->fetchColumn();

            $stmt = $pdo->prepare("SELECT COUNT(*) FROM manuscripts WHERE editor_id = ? AND status = 'under_review' AND deleted_at IS NULL");
            $stmt->execute([$editorId]);
            $underReview = (int)$stmt->fetchColumn();

            $stmt = $pdo->prepare("
                SELECT COUNT(DISTINCT m.id)
                FROM manuscripts m
                JOIN manuscript_revisions mr ON mr.manuscript_id = m.id
                JOIN revision_entries re ON re.revision_id = mr.id
                WHERE m.editor_id = ? AND re.addressed = 0 AND m.deleted_at IS NULL
            ");
            $stmt->execute([$editorId]);
            $revisions = (int)$stmt->fetchColumn();

            $stmt = $pdo->prepare("SELECT COUNT(*) FROM manuscripts WHERE editor_id = ? AND status = 'accepted' AND deleted_at IS NULL");
            $stmt->execute([$editorId]);
            $accepted = (int)$stmt->fetchColumn();

            $stmt = $pdo->prepare("SELECT COUNT(*) FROM manuscripts WHERE editor_id = ? AND status = 'rejected' AND deleted_at IS NULL");
            $stmt->execute([$editorId]);
            $rejected = (int)$stmt->fetchColumn();

            jsonResponse([
                'totalAssigned' => $totalAssigned,
                'underReview'   => $underReview,
                'revisions'     => $revisions,
                'accepted'      => $accepted,
                'rejected'      => $rejected
            ]);
            break;

        // ========== PENDING ACTIONS ==========
        case "getPendingActions":
            $stmt = $pdo->prepare("
                SELECT COUNT(DISTINCT r.id)
                FROM reviews r
                JOIN manuscripts m ON m.id = r.manuscript_id
                WHERE m.editor_id = ? AND r.due_date < CURDATE() AND r.completed_at IS NULL AND m.deleted_at IS NULL
            ");
            $stmt->execute([$editorId]);
            $overdueReviews = (int)$stmt->fetchColumn();

            $stmt = $pdo->prepare("
                SELECT COUNT(*)
                FROM manuscripts m
                WHERE m.editor_id = ? AND m.status = 'submitted' AND m.deleted_at IS NULL
                  AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.manuscript_id = m.id)
            ");
            $stmt->execute([$editorId]);
            $newToTriage = (int)$stmt->fetchColumn();

            $stmt = $pdo->prepare("
                SELECT COUNT(DISTINCT m.id)
                FROM manuscripts m
                JOIN manuscript_revisions mr ON mr.manuscript_id = m.id
                JOIN revision_entries re ON re.revision_id = mr.id
                WHERE m.editor_id = ? AND re.addressed = 0 AND m.deleted_at IS NULL
                  AND (mr.revised_file IS NOT NULL OR re.author_response IS NOT NULL)
            ");
            $stmt->execute([$editorId]);
            $revisionsAwaitingDecision = (int)$stmt->fetchColumn();

            jsonResponse([
                'overdueReviews'           => $overdueReviews,
                'newManuscriptsToTriage'   => $newToTriage,
                'revisionsAwaitingDecision' => $revisionsAwaitingDecision
            ]);
            break;

        // ========== SIDEBAR COUNTS ==========
        case "getSidebarCounts":
            $stmt = $pdo->prepare("
                SELECT
                    (SELECT COUNT(*) FROM manuscripts WHERE editor_id = ? AND status = 'submitted' AND deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM reviews WHERE manuscript_id = manuscripts.id)) AS new_submissions,
                    (SELECT COUNT(*) FROM manuscripts WHERE editor_id = ? AND status = 'under_review' AND deleted_at IS NULL) AS under_review,
                    (SELECT COUNT(*) FROM manuscripts m WHERE m.editor_id = ? AND m.deleted_at IS NULL AND EXISTS (SELECT 1 FROM manuscript_revisions mr JOIN revision_entries re ON re.revision_id = mr.id WHERE mr.manuscript_id = m.id AND re.addressed = 0)) AS revisions,
                    (SELECT COUNT(*) FROM manuscripts WHERE editor_id = ? AND status = 'accepted' AND deleted_at IS NULL) AS accepted,
                    (SELECT COUNT(*) FROM manuscripts WHERE editor_id = ? AND status = 'rejected' AND deleted_at IS NULL) AS rejected
            ");
            $stmt->execute([$editorId, $editorId, $editorId, $editorId, $editorId]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            jsonResponse([
                'newSubmissions' => (int)$row['new_submissions'],
                'underReview'    => (int)$row['under_review'],
                'revisions'      => (int)$row['revisions'],
                'accepted'       => (int)$row['accepted'],
                'rejected'       => (int)$row['rejected']
            ]);
            break;

        // ========== LIST MANUSCRIPTS (with type filter) ==========
        case "listManuscripts":
            $type = $_GET['type'] ?? 'all';
            $sql = "SELECT m.id, m.title, m.slug, m.status, m.created_at, u.name AS author_name FROM manuscripts m JOIN users u ON u.id = m.author_id WHERE m.editor_id = ? AND m.deleted_at IS NULL";
            $params = [$editorId];

            switch ($type) {
                case 'new':
                    $sql .= " AND m.status = 'submitted' AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.manuscript_id = m.id)";
                    break;
                case 'under_review':
                    $sql .= " AND m.status = 'under_review'";
                    break;
                case 'revisions':
                    $sql .= " AND EXISTS (SELECT 1 FROM manuscript_revisions mr JOIN revision_entries re ON re.revision_id = mr.id WHERE mr.manuscript_id = m.id AND re.addressed = 0)";
                    break;
                case 'accepted':
                    $sql .= " AND m.status = 'accepted'";
                    break;
                case 'rejected':
                    $sql .= " AND m.status = 'rejected'";
                    break;
                default:
                    // all manuscripts assigned
                    break;
            }

            $sql .= " ORDER BY m.created_at DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $out = array_map(function($row) {
                return [
                    'id' => (int)$row['id'],
                    'title' => $row['title'],
                    'slug' => $row['slug'],
                    'status' => $row['status'],
                    'author' => $row['author_name'],
                    'submittedAt' => $row['created_at']
                ];
            }, $rows);

            jsonResponse($out);
            break;

        // ========== SEARCH ASSIGNED MANUSCRIPTS ==========
        case "searchAssigned":
            $query = trim($_GET['q'] ?? '');
            if (strlen($query) < 2) {
                jsonResponse([]);
                break;
            }

            $searchTerm = '%' . $query . '%';
            $stmt = $pdo->prepare("
                SELECT m.id, m.title, u.name AS author
                FROM manuscripts m
                JOIN users u ON u.id = m.author_id
                WHERE m.editor_id = ? AND m.deleted_at IS NULL
                  AND (m.title LIKE ? OR u.name LIKE ? OR m.slug LIKE ?)
                ORDER BY m.created_at DESC
                LIMIT 10
            ");
            $stmt->execute([$editorId, $searchTerm, $searchTerm, $searchTerm]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $out = array_map(function($row) {
                return [
                    'id' => (int)$row['id'],
                    'title' => $row['title'],
                    'author' => $row['author']
                ];
            }, $rows);

            jsonResponse($out);
            break;

        // ========== GET MANUSCRIPT DETAILS (with scores) ==========
        case "getManuscriptDetails":
            $manId = (int)($_GET['id'] ?? 0);
            if (!$manId) errorResponse("Manuscript ID required");

            $stmt = $pdo->prepare("SELECT * FROM manuscripts WHERE id = ? AND editor_id = ? AND deleted_at IS NULL");
            $stmt->execute([$manId, $editorId]);
            $man = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$man) errorResponse("Manuscript not found or not assigned to you", 404);

            $authorStmt = $pdo->prepare("SELECT name FROM users WHERE id = ?");
            $authorStmt->execute([$man['author_id']]);
            $authorName = $authorStmt->fetchColumn();

            // ✅ Fetch reviewers with scores
            $reviewStmt = $pdo->prepare("
                SELECT
                    u.name,
                    r.status,
                    r.accepted_at,
                    r.completed_at,
                    r.due_date,
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
            ");
            $reviewStmt->execute([$manId]);
            $reviewers = $reviewStmt->fetchAll(PDO::FETCH_ASSOC);

            // Structure reviewers with scores
            $reviewersOut = array_map(function($r) {
                return [
                    'name' => $r['name'],
                    'status' => $r['status'],
                    'accepted_at' => $r['accepted_at'],
                    'completed_at' => $r['completed_at'],
                    'due_date' => $r['due_date'],
                    'scores' => [
                        'originality' => $r['originality'] ? (int)$r['originality'] : null,
                        'methodology' => $r['methodology'] ? (int)$r['methodology'] : null,
                        'clarity' => $r['clarity'] ? (int)$r['clarity'] : null,
                        'relevance' => $r['relevance'] ? (int)$r['relevance'] : null,
                        'comments_to_author' => $r['comments_to_author'],
                        'confidential_comments' => $r['confidential_comments'],
                        'recommendation' => $r['recommendation']
                    ]
                ];
            }, $reviewers);

            $files = [
                'manuscript' => $man['file_path'],
                'cover_letter' => $man['cover_letter_path'],
                'circulating' => $man['circulating_file_path']
            ];

            jsonResponse([
                'manuscript' => [
                    'id' => (int)$man['id'],
                    'title' => $man['title'],
                    'slug' => $man['slug'],
                    'abstract' => $man['abstract'],
                    'status' => $man['status'],
                    'submittedAt' => $man['created_at'],
                    'author' => $authorName,
                    'study_type' => $man['study_type'],
                    'keywords' => $man['keywords'],
                    'objective' => $man['objective'],
                    'methods' => $man['methods'],
                    'results' => $man['results'],
                    'conclusion' => $man['conclusion'],
                    'files' => $files
                ],
                'reviewers' => $reviewersOut
            ]);
            break;

        // ========== GET REVIEWERS LIST ==========
        case "getReviewers":
            $stmt = $pdo->prepare("
                SELECT id, name, email, specializations AS expertise
                FROM users
                WHERE role = 'reviewer' AND active = 1 AND suspended = 0
                ORDER BY name ASC
            ");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $out = array_map(function($row) {
                $expertise = [];
                if (!empty($row['expertise'])) {
                    if (strpos($row['expertise'], ',') !== false) {
                        $expertise = array_map('trim', explode(',', $row['expertise']));
                    } elseif (strpos($row['expertise'], '[') === 0) {
                        $expertise = json_decode($row['expertise'], true) ?? [];
                    } else {
                        $expertise = [$row['expertise']];
                    }
                }
                return [
                    'id' => (int)$row['id'],
                    'name' => $row['name'],
                    'email' => $row['email'],
                    'expertise' => $expertise
                ];
            }, $rows);

            jsonResponse($out);
            break;

        // ========== GET ASSIGNABLE MANUSCRIPTS ==========
        case "getAssignableManuscripts":
            $stmt = $pdo->prepare("
                SELECT m.id, m.title, m.slug, m.status, u.name AS author,
                       COALESCE((SELECT COUNT(*) FROM reviews r WHERE r.manuscript_id = m.id), 0) AS assignedReviewers
                FROM manuscripts m
                JOIN users u ON u.id = m.author_id
                WHERE m.editor_id = ?
                  AND m.status IN ('submitted', 'under_review')
                  AND (SELECT COUNT(*) FROM reviews r WHERE r.manuscript_id = m.id) < 2
                ORDER BY m.created_at ASC
            ");
            $stmt->execute([$editorId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $out = array_map(function($row) {
                return [
                    'id' => (int)$row['id'],
                    'title' => $row['title'],
                    'slug' => $row['slug'],
                    'status' => $row['status'],
                    'author' => $row['author'],
                    'assignedReviewers' => (int)$row['assignedReviewers']
                ];
            }, $rows);

            jsonResponse($out);
            break;

        // ========== ASSIGN REVIEWER (with notifications) ==========
        case "assignReviewer":
            $data = jsonInput();
            $manuscriptId = (int)($data['manuscript_id'] ?? 0);
            $reviewerId = (int)($data['reviewer_id'] ?? 0);

            if (!$manuscriptId || !$reviewerId) {
                errorResponse("Manuscript ID and Reviewer ID are required");
            }

            // Fetch manuscript details (including slug for the email)
            $check = $pdo->prepare("SELECT id, title, author_id, slug FROM manuscripts WHERE id = ? AND editor_id = ? AND deleted_at IS NULL");
            $check->execute([$manuscriptId, $editorId]);
            $man = $check->fetch();
            if (!$man) errorResponse("Manuscript not found or not assigned to you", 404);

            // Check duplicate
            $dup = $pdo->prepare("SELECT id FROM reviews WHERE manuscript_id = ? AND reviewer_id = ?");
            $dup->execute([$manuscriptId, $reviewerId]);
            if ($dup->fetch()) errorResponse("Reviewer already assigned to this manuscript", 409);

            $dueDate = date('Y-m-d', strtotime('+14 days'));
            $stmt = $pdo->prepare("
                INSERT INTO reviews (manuscript_id, reviewer_id, status, assigned_at, due_date, accepted_at)
                VALUES (?, ?, 'pending', NOW(), ?, NULL)
            ");
            $stmt->execute([$manuscriptId, $reviewerId, $dueDate]);
            $reviewId = $pdo->lastInsertId();

            // Email reviewer using the new short template
            $revStmt = $pdo->prepare("SELECT email, name FROM users WHERE id = ?");
            $revStmt->execute([$reviewerId]);
            $reviewer = $revStmt->fetch();
            if ($reviewer) {
                // Use the helper function to generate the email body (new short template)
                $manData = ['slug' => $man['slug'], 'title' => $man['title']];
                $body = generateReviewerInvitationEmailBody($manData, $reviewer['name'], $reviewer['email']);
                $subject = "Review Invitation – African Medical Journal";
                sendEmail($reviewer['email'], $subject, $body);
            }

            // Notify author
            createNotification(
                $man['author_id'],
                'reviewer-assigned',
                'Reviewer Assigned',
                "A reviewer has been assigned to your manuscript \"{$man['title']}\".",
                $manuscriptId
            );

            // Notify editor (self)
            createNotification(
                $editorId,
                'reviewer-assigned',
                'Reviewer Assigned',
                "You assigned a reviewer to manuscript \"{$man['title']}\".",
                $manuscriptId
            );

            // Notify admins (EIC, publisher, etc.)
            notifyAdmins(
                'reviewer-assigned',
                'Reviewer Assigned to Manuscript',
                "Editor assigned a reviewer to manuscript \"{$man['title']}\" (ID: {$manuscriptId}).",
                $manuscriptId
            );

            jsonResponse([
                'success' => true,
                'message' => 'Reviewer assigned successfully',
                'review_id' => $reviewId
            ]);
            break;

        // ========== REVIEW PROGRESS ==========
        case "getReviewProgress":
            $stmt = $pdo->prepare("
                SELECT
                    m.id AS manuscript_id,
                    m.title AS manuscript_title,
                    m.status,
                    (SELECT COUNT(*) FROM reviews r WHERE r.manuscript_id = m.id) AS total_reviewers,
                    (SELECT COUNT(*) FROM reviews r WHERE r.manuscript_id = m.id AND r.completed_at IS NOT NULL) AS completed_reviews,
                    (SELECT MIN(r.due_date) FROM reviews r WHERE r.manuscript_id = m.id AND r.completed_at IS NULL) AS due_date
                FROM manuscripts m
                WHERE m.editor_id = ?
                  AND m.status IN ('submitted', 'under_review')
                  AND EXISTS (SELECT 1 FROM reviews r WHERE r.manuscript_id = m.id)
                ORDER BY m.created_at DESC
            ");
            $stmt->execute([$editorId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $out = array_map(function($row) {
                $total = (int)$row['total_reviewers'];
                $completed = (int)$row['completed_reviews'];
                $progress = $total > 0 ? round(($completed / $total) * 100) : 0;
                return [
                    'manuscriptId' => (int)$row['manuscript_id'],
                    'manuscriptTitle' => $row['manuscript_title'],
                    'totalReviewers' => $total,
                    'completedReviews' => $completed,
                    'progress' => $progress,
                    'status' => $row['status'],
                    'dueDate' => $row['due_date']
                ];
            }, $rows);

            jsonResponse($out);
            break;

        // ========== GET PENDING REVISIONS ==========
        case "getRevisions":
            $stmt = $pdo->prepare("
                SELECT
                    m.id AS manuscript_id,
                    m.title AS manuscript_title,
                    u.name AS author,
                    mr.revision_number,
                    re.reviewer_comment,
                    mr.submitted_at,
                    re.id AS entry_id
                FROM revision_entries re
                JOIN manuscript_revisions mr ON mr.id = re.revision_id
                JOIN manuscripts m ON m.id = mr.manuscript_id
                JOIN users u ON u.id = m.author_id
                WHERE m.editor_id = ?
                  AND re.addressed = 0
                  AND (mr.revised_file IS NOT NULL OR re.author_response IS NOT NULL)
                ORDER BY mr.submitted_at DESC
            ");
            $stmt->execute([$editorId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $out = array_map(function($row) {
                return [
                    'manuscriptId' => (int)$row['manuscript_id'],
                    'manuscriptTitle' => $row['manuscript_title'],
                    'author' => $row['author'],
                    'revisionNumber' => (int)$row['revision_number'],
                    'reviewerComment' => $row['reviewer_comment'],
                    'submittedAt' => $row['submitted_at'],
                    'entryId' => (int)$row['entry_id']
                ];
            }, $rows);

            jsonResponse($out);
            break;

        // ========== SEND REVISION FEEDBACK ==========
        case "sendRevisionFeedback":
            $data = jsonInput();
            $entryId = (int)($data['entry_id'] ?? 0);
            $manuscriptId = (int)($data['manuscript_id'] ?? 0);
            $feedback = trim($data['feedback'] ?? '');
            $attachment = $data['attachment'] ?? null;

            if (!$entryId || !$manuscriptId || empty($feedback)) {
                errorResponse("Entry ID, Manuscript ID, and feedback are required");
            }

            $check = $pdo->prepare("SELECT id, title, author_id FROM manuscripts WHERE id = ? AND editor_id = ? AND deleted_at IS NULL");
            $check->execute([$manuscriptId, $editorId]);
            $man = $check->fetch();
            if (!$man) errorResponse("Manuscript not found or not assigned to you", 404);

            $subject = "Revision Feedback for your manuscript";
            $body = "
                <p>Dear Author,</p>
                <p>Thank you for submitting your revision for <strong>\"" . htmlspecialchars($man['title']) . "\"</strong>.</p>
                <p>After careful review, here is our feedback:</p>
                <div style='background:#f8fafc; padding:12px; border-radius:8px;'>
                    " . nl2br(htmlspecialchars($feedback)) . "
                </div>
                <p>Please address the comments and submit a revised version.</p>
                <p>Best regards,<br>Editorial Team</p>
                " . SIGNATURE_EDITOR_IN_CHIEF . "
            ";

            $attStmt = $pdo->prepare("
                INSERT INTO email_attachments (manuscript_id, decision_type, email_subject, email_body, file_path, created_at)
                VALUES (?, 'revision', ?, ?, ?, NOW())
            ");
            $attStmt->execute([$manuscriptId, $subject, $body, $attachment]);

            $updStmt = $pdo->prepare("UPDATE revision_entries SET addressed = 1 WHERE id = ?");
            $updStmt->execute([$entryId]);

            // Notify author
            createNotification(
                $man['author_id'],
                'revision-feedback',
                'Revision Feedback Sent',
                "Feedback on your revision for \"{$man['title']}\" has been sent.",
                $manuscriptId
            );

            // Notify editor (self)
            createNotification(
                $editorId,
                'revision-feedback',
                'Revision Feedback Sent',
                "You sent feedback on revision for \"{$man['title']}\".",
                $manuscriptId
            );

            // Notify admins
            notifyAdmins(
                'revision-feedback',
                'Revision Feedback Sent',
                "Editor sent revision feedback for manuscript \"{$man['title']}\" (ID: {$manuscriptId}).",
                $manuscriptId
            );

            jsonResponse(['success' => true, 'message' => 'Feedback sent successfully']);
            break;

        // ========== MAKE EDITOR DECISION ==========
        case "makeDecision":
            $data = jsonInput();
            $manuscriptId = (int)($data['manuscript_id'] ?? 0);
            $decision = trim($data['decision'] ?? ''); // 'accept', 'reject', 'major_revision', 'minor_revision'
            $comments = trim($data['comments'] ?? '');
            $attachment = $data['attachment'] ?? null;

            if (!$manuscriptId || !in_array($decision, ['accept', 'reject', 'major_revision', 'minor_revision'])) {
                errorResponse("Valid manuscript_id and decision (accept/reject/major_revision/minor_revision) required");
            }

            // Fetch full manuscript details including slug and author name
            $check = $pdo->prepare("
                SELECT m.*, u.name AS author_name 
                FROM manuscripts m 
                JOIN users u ON u.id = m.author_id 
                WHERE m.id = ? AND m.editor_id = ?
            ");
            $check->execute([$manuscriptId, $editorId]);
            $man = $check->fetch();
            if (!$man) errorResponse("Manuscript not found or not assigned to you", 404);

            // Map decision to status and email decision type
            $statusMap = [
                'accept' => 'accepted',
                'reject' => 'rejected',
                'major_revision' => 'revision_requested',
                'minor_revision' => 'revision_requested'
            ];
            $newStatus = $statusMap[$decision];
            // For email generator, map major/minor to 'revision'
            $emailDecision = in_array($decision, ['major_revision', 'minor_revision']) ? 'revision' : $decision;

            $pdo->beginTransaction();
            try {
                // Update manuscript status
                $stmt = $pdo->prepare("UPDATE manuscripts SET status = ? WHERE id = ?");
                $stmt->execute([$newStatus, $manuscriptId]);

                // If revision decision, create revision entry
                if (in_array($decision, ['major_revision', 'minor_revision'])) {
                    // FLEXIBLE REVISION CYCLE: reuse the currently open
                    // (unsubmitted) revision row instead of stacking a new one
                    // each time, so the cycle can repeat indefinitely.
                    $openRevStmt = $pdo->prepare("
                        SELECT id FROM manuscript_revisions
                        WHERE manuscript_id = ? AND revised_file IS NULL
                        ORDER BY revision_number DESC
                        LIMIT 1
                    ");
                    $openRevStmt->execute([$manuscriptId]);
                    $openRev = $openRevStmt->fetch(PDO::FETCH_ASSOC);

                    if ($openRev) {
                        $revisionId = (int)$openRev['id'];
                    } else {
                        // Find latest revision number
                        $revStmt = $pdo->prepare("SELECT MAX(revision_number) FROM manuscript_revisions WHERE manuscript_id = ?");
                        $revStmt->execute([$manuscriptId]);
                        $maxRev = (int)$revStmt->fetchColumn();
                        $newRevNum = $maxRev + 1;

                        $insRev = $pdo->prepare("
                            INSERT INTO manuscript_revisions (manuscript_id, revision_number, submitted_at)
                            VALUES (?, ?, NOW())
                        ");
                        $insRev->execute([$manuscriptId, $newRevNum]);
                        $revisionId = $pdo->lastInsertId();
                    }

                    // Insert revision entry for the editor (placeholder reviewer_id = editorId)
                    // Skip the editor placeholder when the editor comment is empty to avoid
                    // empty "Reviewer Comment" blocks on repeated revision requests.
                    if ($comments !== '') {
                        $entryStmt = $pdo->prepare("
                            INSERT INTO revision_entries (revision_id, reviewer_id, reviewer_comment, addressed)
                            VALUES (?, ?, ?, 0)
                        ");
                        $entryStmt->execute([$revisionId, $editorId, $comments]);
                    }

                    // Pull in reviewer comments from completed reviews that recommended a revision
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
                    $revEntryStmt->execute([$revisionId, $manuscriptId, $manuscriptId]);
                }

                // Generate email using the helper
                $emailContent = generateDecisionEmailBody($manuscriptId, $emailDecision, $comments);
                if ($emailContent) {
                    $subject = $emailContent['subject'];
                    $body = $emailContent['body'];
                } else {
                    // Fallback to default
                    $subject = "Decision on your manuscript";
                    $body = "
                        <p>Dear Author,</p>
                        <p>We have made a decision on your manuscript <strong>\"" . htmlspecialchars($man['title']) . "\"</strong>.</p>
                        <p><strong>Decision:</strong> " . ucfirst(str_replace('_', ' ', $decision)) . "</p>
                        " . ($comments ? "<p><strong>Comments:</strong><br/>" . nl2br(htmlspecialchars($comments)) . "</p>" : "") . "
                        <p>Please log in to your author dashboard for more details.</p>
                        <p>Best regards,<br>Editorial Team</p>
                        " . SIGNATURE_EDITOR_IN_CHIEF . "
                    ";
                }

                // Store email record
                $attStmt = $pdo->prepare("
                    INSERT INTO email_attachments (manuscript_id, decision_type, email_subject, email_body, file_path, created_at)
                    VALUES (?, ?, ?, ?, ?, NOW())
                ");
                $attStmt->execute([$manuscriptId, $emailDecision, $subject, $body, $attachment]);

                $pdo->commit();

                // Send email to author
                $authorStmt = $pdo->prepare("SELECT email FROM users WHERE id = ?");
                $authorStmt->execute([$man['author_id']]);
                $authorEmail = $authorStmt->fetchColumn();
                if ($authorEmail) {
                    sendEmail($authorEmail, $subject, $body);
                }

                // In-app notifications
                $notifTitle = ucfirst(str_replace('_', ' ', $decision)) . " Decision";
                $notifDesc = "Your manuscript \"{$man['title']}\" has received a {$decision} decision. Please check your dashboard.";
                createNotification($man['author_id'], $decision, $notifTitle, $notifDesc, $manuscriptId);

                createNotification($editorId, $decision, "Decision Made", "You made a {$decision} decision on \"{$man['title']}\".", $manuscriptId);

                notifyAdmins(
                    'editor-decision',
                    "Editor Decision: " . ucfirst(str_replace('_', ' ', $decision)),
                    "Editor made a {$decision} decision on manuscript \"{$man['title']}\" (ID: {$manuscriptId}).",
                    $manuscriptId
                );

                jsonResponse(['success' => true, 'message' => 'Decision recorded successfully']);

            } catch (Exception $e) {
                $pdo->rollBack();
                errorResponse("Failed to record decision: " . $e->getMessage(), 500);
            }
            break;

        // ========== GET SINGLE REVIEW DETAILS (optional) ==========
        case "getReviewDetails":
            $reviewId = (int)($_GET['review_id'] ?? 0);
            if (!$reviewId) errorResponse("Review ID required");

            $stmt = $pdo->prepare("
                SELECT 
                    r.id,
                    r.manuscript_id,
                    r.reviewer_id,
                    r.status,
                    r.assigned_at,
                    r.completed_at,
                    r.due_date,
                    r.accepted_at,
                    r.declined_at,
                    u.name AS reviewer_name,
                    u.email AS reviewer_email,
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
                WHERE r.id = ? AND r.manuscript_id IN (SELECT id FROM manuscripts WHERE editor_id = ?)
            ");
            $stmt->execute([$reviewId, $editorId]);
            $review = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$review) errorResponse("Review not found or not accessible", 404);

            jsonResponse([
                'id' => (int)$review['id'],
                'manuscript_id' => (int)$review['manuscript_id'],
                'reviewer_id' => (int)$review['reviewer_id'],
                'reviewer_name' => $review['reviewer_name'],
                'reviewer_email' => $review['reviewer_email'],
                'status' => $review['status'],
                'assigned_at' => $review['assigned_at'],
                'completed_at' => $review['completed_at'],
                'due_date' => $review['due_date'],
                'accepted_at' => $review['accepted_at'],
                'declined_at' => $review['declined_at'],
                'scores' => [
                    'originality' => $review['originality'] ? (int)$review['originality'] : null,
                    'methodology' => $review['methodology'] ? (int)$review['methodology'] : null,
                    'clarity' => $review['clarity'] ? (int)$review['clarity'] : null,
                    'relevance' => $review['relevance'] ? (int)$review['relevance'] : null,
                    'comments_to_author' => $review['comments_to_author'],
                    'confidential_comments' => $review['confidential_comments'],
                    'recommendation' => $review['recommendation']
                ]
            ]);
            break;

        default:
            errorResponse("Invalid action. Available: getDashboardStats, getPendingActions, getSidebarCounts, listManuscripts, searchAssigned, getManuscriptDetails, getReviewers, getAssignableManuscripts, assignReviewer, getReviewProgress, getRevisions, sendRevisionFeedback, makeDecision, getReviewDetails", 400);
    }
} catch (PDOException $e) {
    error_log("Editor API DB Error: " . $e->getMessage());
    errorResponse("Database error", 500);
} catch (Exception $e) {
    error_log("Editor API Error: " . $e->getMessage());
    errorResponse($e->getMessage(), 500);
}
?>