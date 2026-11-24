<?php
// ==================== CORS HEADERS ====================
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Session-Id");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json");

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
if ($sessionId) session_id($sessionId);
if (session_status() === PHP_SESSION_NONE) session_start();

// ==================== REQUIREMENTS ====================
require_once __DIR__ . "/config.php";
require_once __DIR__ . "/notification_helper.php";

$action = $_GET['action'] ?? '';

// ==================== HELPER FUNCTIONS ====================
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

function requireAuth($allowedRoles = null) {
    if (!isset($_SESSION['user_id'])) errorResponse("Unauthorized: Please log in", 401);
    $userId = $_SESSION['user_id'];
    if (!isset($_SESSION['user_role'])) {
        global $pdo;
        $stmt = $pdo->prepare("SELECT role FROM users WHERE id = ? AND active = 1 AND suspended = 0");
        $stmt->execute([$userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) errorResponse("User account is inactive or suspended", 403);
        $_SESSION['user_role'] = $row['role'];
    }
    $role = $_SESSION['user_role'];
    if ($allowedRoles !== null && !in_array($role, $allowedRoles)) errorResponse("Access denied: Insufficient permissions", 403);
    return $userId;
}

/**
 * Returns the most relevant manuscript file for a reviewer.
 * Priority: circulating_file_path > latest revised_file > original file_path.
 */
function getEffectiveManuscriptFilePath($manuscriptIdOrRow, $pdo) {
    if (is_array($manuscriptIdOrRow)) {
        $row = $manuscriptIdOrRow;
    } else {
        $stmt = $pdo->prepare("
            SELECT file_path, circulating_file_path, revisedFilePath
            FROM manuscripts m
            LEFT JOIN (
                SELECT manuscript_id, revised_file AS revisedFilePath
                FROM manuscript_revisions
                WHERE (manuscript_id, revision_number) IN (
                    SELECT manuscript_id, MAX(revision_number)
                    FROM manuscript_revisions
                    GROUP BY manuscript_id
                )
            ) r ON r.manuscript_id = m.id
            WHERE m.id = ? AND m.deleted_at IS NULL
        ");
        $stmt->execute([$manuscriptIdOrRow]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) return null;
    }

    if (!empty($row['circulating_file_path'])) return $row['circulating_file_path'];
    if (!empty($row['revisedFilePath'])) return $row['revisedFilePath'];
    return $row['file_path'] ?? null;
}

/**
 * Parse additional_reviewer_files JSON column into an array of objects with path and purpose.
 */
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

// ==================== MAIN ROUTER ====================
try {
    $reviewerId = requireAuth(['reviewer', 'admin', 'editor']);

    switch ($action) {
        case "getDashboardStats":
            $stmt = $pdo->prepare("
                SELECT COUNT(*) FROM reviews r
                JOIN manuscripts m ON m.id = r.manuscript_id
                WHERE r.reviewer_id = ? AND r.accepted_at IS NULL AND r.declined_at IS NULL AND r.completed_at IS NULL
                  AND m.deleted_at IS NULL
            ");
            $stmt->execute([$reviewerId]);
            $invitations = (int)$stmt->fetchColumn();

            $stmt = $pdo->prepare("
                SELECT COUNT(*) FROM reviews r
                JOIN manuscripts m ON m.id = r.manuscript_id
                WHERE r.reviewer_id = ? AND r.accepted_at IS NOT NULL AND r.completed_at IS NULL
                  AND m.deleted_at IS NULL
            ");
            $stmt->execute([$reviewerId]);
            $active = (int)$stmt->fetchColumn();

            $stmt = $pdo->prepare("
                SELECT COUNT(*) FROM reviews r
                JOIN manuscripts m ON m.id = r.manuscript_id
                WHERE r.reviewer_id = ? AND r.completed_at IS NOT NULL
                  AND m.deleted_at IS NULL
            ");
            $stmt->execute([$reviewerId]);
            $completed = (int)$stmt->fetchColumn();

            $stmt = $pdo->prepare("
                SELECT COUNT(*) FROM reviews r
                JOIN manuscripts m ON m.id = r.manuscript_id
                WHERE r.reviewer_id = ? AND r.due_date < CURDATE() AND r.completed_at IS NULL
                  AND m.deleted_at IS NULL
            ");
            $stmt->execute([$reviewerId]);
            $overdue = (int)$stmt->fetchColumn();

            $stmt = $pdo->prepare("
                SELECT COUNT(*)
                FROM revision_entries re
                JOIN manuscript_revisions mr ON mr.id = re.revision_id
                JOIN manuscripts m ON m.id = mr.manuscript_id
                JOIN reviews r ON r.manuscript_id = m.id AND r.reviewer_id = re.reviewer_id
                WHERE re.reviewer_id = ?
                  AND re.addressed = 0
                  AND r.accepted_at IS NOT NULL
                  AND r.completed_at IS NULL
                  AND m.deleted_at IS NULL
            ");
            $stmt->execute([$reviewerId]);
            $revisions = (int)$stmt->fetchColumn();

            // Nearest upcoming review deadline (for the dashboard countdown)
            $stmt = $pdo->prepare("
                SELECT MIN(r.due_date) AS next_due
                FROM reviews r
                JOIN manuscripts m ON m.id = r.manuscript_id
                WHERE r.reviewer_id = ? AND r.completed_at IS NULL AND r.declined_at IS NULL
                  AND r.due_date IS NOT NULL
                  AND m.deleted_at IS NULL
            ");
            $stmt->execute([$reviewerId]);
            $nextDue = $stmt->fetchColumn() ?: null;

            jsonResponse([
                "invitations" => $invitations,
                "active"      => $active,
                "revisions"   => $revisions,
                "completed"   => $completed,
                "overdue"     => $overdue,
                "nextDueDate" => $nextDue
            ]);
            break;

        case "getPendingActions":
            $stmt = $pdo->prepare("
                SELECT COUNT(*) FROM reviews r
                JOIN manuscripts m ON m.id = r.manuscript_id
                WHERE r.reviewer_id = ? AND r.accepted_at IS NULL AND r.declined_at IS NULL AND r.completed_at IS NULL
                  AND m.deleted_at IS NULL
            ");
            $stmt->execute([$reviewerId]);
            $invitations = (int)$stmt->fetchColumn();

            $stmt = $pdo->prepare("
                SELECT COUNT(*)
                FROM revision_entries re
                JOIN manuscript_revisions mr ON mr.id = re.revision_id
                JOIN manuscripts m ON m.id = mr.manuscript_id
                JOIN reviews r ON r.manuscript_id = m.id AND r.reviewer_id = re.reviewer_id
                WHERE re.reviewer_id = ?
                  AND re.addressed = 0
                  AND r.accepted_at IS NOT NULL
                  AND r.completed_at IS NULL
                  AND m.deleted_at IS NULL
            ");
            $stmt->execute([$reviewerId]);
            $revisions = (int)$stmt->fetchColumn();

            $stmt = $pdo->prepare("SELECT COUNT(*) FROM reviews WHERE reviewer_id = ? AND due_date < CURDATE() AND completed_at IS NULL");
            $stmt->execute([$reviewerId]);
            $overdue = (int)$stmt->fetchColumn();

            jsonResponse([
                "invitations" => $invitations,
                "overdue"     => $overdue,
                "revisions"   => $revisions
            ]);
            break;

        case "listInvitations":
            $stmt = $pdo->prepare("
                SELECT
                    r.id,
                    m.id AS manuscript_id,
                    m.slug AS manuscriptId,
                    m.title,
                    r.due_date
                FROM reviews r
                JOIN manuscripts m ON m.id = r.manuscript_id
                WHERE r.reviewer_id = ? AND r.accepted_at IS NULL AND r.declined_at IS NULL AND r.completed_at IS NULL
                  AND m.deleted_at IS NULL
                ORDER BY r.assigned_at DESC
            ");
            $stmt->execute([$reviewerId]);
            $invitations = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
            $out = array_map(function($row) {
                return [
                    'id' => (int)$row['id'],
                    'manuscript_id' => (int)$row['manuscript_id'],
                    'manuscriptId' => $row['manuscriptId'],
                    'title' => $row['title'],
                    'dueDate' => $row['due_date']
                ];
            }, $invitations);
            jsonResponse($out);
            break;

        case "listActive":
            $stmt = $pdo->prepare("
                SELECT 
                    r.id,
                    m.id AS manuscript_id,
                    m.slug AS manuscriptId,
                    m.title,
                    r.due_date
                FROM reviews r
                JOIN manuscripts m ON m.id = r.manuscript_id
                WHERE r.reviewer_id = ? AND r.accepted_at IS NOT NULL AND r.completed_at IS NULL
                  AND m.deleted_at IS NULL
                ORDER BY r.due_date ASC
            ");
            $stmt->execute([$reviewerId]);
            $active = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $out = array_map(function($row) {
                return [
                    'id' => (int)$row['id'],
                    'manuscript_id' => (int)$row['manuscript_id'],
                    'manuscriptId' => $row['manuscriptId'],
                    'title' => $row['title'],
                    'dueDate' => $row['due_date']
                ];
            }, $active);
            jsonResponse($out);
            break;

        case "listRevisions":
            $stmt = $pdo->prepare("
                SELECT
                    re.id AS entry_id,
                    m.id AS manuscript_id,
                    m.slug AS manuscriptId,
                    m.title,
                    mr.revision_number,
                    re.reviewer_comment AS original_comment,
                    re.author_response,
                    mr.submitted_at,
                    mr.revised_file,
                    mr.response_file,
                    m.abstract,
                    m.background,
                    m.objective,
                    m.methods,
                    m.results,
                    m.conclusion,
                    m.study_type,
                    u.name AS author_name
                FROM revision_entries re
                JOIN manuscript_revisions mr ON mr.id = re.revision_id
                JOIN manuscripts m ON m.id = mr.manuscript_id
                JOIN users u ON u.id = m.author_id
                JOIN reviews r ON r.manuscript_id = m.id AND r.reviewer_id = re.reviewer_id
                WHERE re.reviewer_id = ?
                  AND re.addressed = 0
                  AND r.accepted_at IS NOT NULL
                  AND r.completed_at IS NULL
                  AND m.deleted_at IS NULL
                ORDER BY mr.submitted_at DESC
            ");
            $stmt->execute([$reviewerId]);
            $revisions = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $out = array_map(function($row) {
                return [
                    'entryId' => (int)$row['entry_id'],
                    'manuscriptId' => $row['manuscriptId'],
                    'manuscript_id' => (int)$row['manuscript_id'],
                    'title' => $row['title'],
                    'revisionNumber' => (int)$row['revision_number'],
                    'originalComment' => $row['original_comment'],
                    'authorResponse' => $row['author_response'],
                    'submittedAt' => $row['submitted_at'],
                    'revisedFile' => $row['revised_file'],
                    'responseFile' => $row['response_file'],
                    'abstract' => $row['abstract'],
                    'background' => $row['background'],
                    'objective' => $row['objective'],
                    'methods' => $row['methods'],
                    'results' => $row['results'],
                    'conclusion' => $row['conclusion'],
                    'studyType' => $row['study_type'],
                    'authorName' => $row['author_name']
                ];
            }, $revisions);
            jsonResponse($out);
            break;

        case "listOverdue":
            $stmt = $pdo->prepare("
                SELECT
                    r.id,
                    m.slug AS manuscriptId,
                    m.title,
                    r.due_date,
                    r.accepted_at
                FROM reviews r
                JOIN manuscripts m ON m.id = r.manuscript_id
                WHERE r.reviewer_id = ? AND r.due_date < CURDATE() AND r.completed_at IS NULL
                  AND m.deleted_at IS NULL
                ORDER BY r.due_date ASC
            ");
            $stmt->execute([$reviewerId]);
            $overdue = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $out = array_map(function($row) {
                return [
                    'id' => (int)$row['id'],
                    'manuscriptId' => $row['manuscriptId'],
                    'title' => $row['title'],
                    'dueDate' => $row['due_date'],
                    'accepted_at' => $row['accepted_at']
                ];
            }, $overdue);
            jsonResponse($out);
            break;

        case "listCompleted":
            $stmt = $pdo->prepare("
                SELECT
                    r.id,
                    m.id AS manuscript_id_numeric,
                    m.slug AS manuscriptId,
                    m.title,
                    r.completed_at,
                    r.review_attachment,
                    rs.recommendation
                FROM reviews r
                JOIN manuscripts m ON m.id = r.manuscript_id
                LEFT JOIN review_scores rs ON rs.review_id = r.id
                WHERE r.reviewer_id = ? AND r.completed_at IS NOT NULL
                  AND m.deleted_at IS NULL
                ORDER BY r.completed_at DESC
            ");
            $stmt->execute([$reviewerId]);
            $completed = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $out = array_map(function($row) {
                return [
                    'id' => (int)$row['id'],
                    'manuscriptId' => $row['manuscriptId'],
                    'manuscript_id_numeric' => (int)$row['manuscript_id_numeric'],
                    'title' => $row['title'],
                    'completedAt' => $row['completed_at'],
                    'recommendation' => $row['recommendation'],
                    'attachment' => $row['review_attachment']
                ];
            }, $completed);
            jsonResponse($out);
            break;

        case "getAnalytics":
            $stmt = $pdo->prepare("
                SELECT COUNT(*) FROM reviews r
                JOIN manuscripts m ON m.id = r.manuscript_id
                WHERE r.reviewer_id = ? AND r.completed_at IS NOT NULL
                  AND m.deleted_at IS NULL
            ");
            $stmt->execute([$reviewerId]);
            $totalReviews = (int)$stmt->fetchColumn();

            $stmt = $pdo->prepare("
                SELECT AVG(DATEDIFF(completed_at, assigned_at)) 
                FROM reviews 
                WHERE reviewer_id = ? AND completed_at IS NOT NULL AND assigned_at IS NOT NULL
            ");
            $stmt->execute([$reviewerId]);
            $avgDays = round($stmt->fetchColumn() ?: 0, 1);

            $stmt = $pdo->prepare("
                SELECT 
                    SUM(CASE WHEN completed_at <= due_date THEN 1 ELSE 0 END) / COUNT(*) * 100
                FROM reviews 
                WHERE reviewer_id = ? AND completed_at IS NOT NULL AND due_date IS NOT NULL
            ");
            $stmt->execute([$reviewerId]);
            $onTimeRate = round($stmt->fetchColumn() ?: 0, 1);

            $stmt = $pdo->prepare("
                SELECT 
                    SUM(CASE WHEN accepted_at IS NOT NULL THEN 1 ELSE 0 END) / COUNT(*) * 100
                FROM reviews 
                WHERE reviewer_id = ? AND declined_at IS NULL
            ");
            $stmt->execute([$reviewerId]);
            $acceptRate = round($stmt->fetchColumn() ?: 0, 1);

            jsonResponse([
                'totalReviews' => $totalReviews,
                'avgCompletionDays' => $avgDays,
                'onTimeRate' => $onTimeRate,
                'acceptanceRate' => $acceptRate
            ]);
            break;

        case "getCurrentUser":
            $stmt = $pdo->prepare("SELECT id, name, email, role FROM users WHERE id = ?");
            $stmt->execute([$reviewerId]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$user) errorResponse("User not found", 404);
            jsonResponse($user);
            break;

        case "getManuscriptPreview":
            $reviewId = (int)($_GET['review_id'] ?? 0);
            if (!$reviewId) errorResponse("review_id required");

            $check = $pdo->prepare("
                SELECT r.manuscript_id, r.due_date 
                FROM reviews r
                WHERE r.id = ? AND r.reviewer_id = ? AND r.completed_at IS NULL AND r.declined_at IS NULL
            ");
            $check->execute([$reviewId, $reviewerId]);
            $row = $check->fetch();
            if (!$row) errorResponse("Review not found, already completed, or declined", 404);

            $manId = $row['manuscript_id'];
            $reviewDueDate = $row['due_date'];

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
                    m.file_path,
                    m.circulating_file_path,
                    m.additional_reviewer_files,
                    u.name AS author_name,
                    (SELECT revised_file 
                     FROM manuscript_revisions 
                     WHERE manuscript_id = m.id 
                     ORDER BY revision_number DESC 
                     LIMIT 1) AS revisedFilePath
                FROM manuscripts m
                JOIN users u ON u.id = m.author_id
                WHERE m.id = ? AND m.deleted_at IS NULL
            ");
            $stmt->execute([$manId]);
            $man = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$man) errorResponse("Manuscript not found", 404);

            $effectiveFilePath = getEffectiveManuscriptFilePath($man, $pdo);
            $additionalFiles = parseAdditionalReviewerFiles($man['additional_reviewer_files'] ?? null);

            jsonResponse([
                'id' => (int)$man['id'],
                'slug' => $man['slug'],
                'title' => $man['title'],
                'abstract' => $man['abstract'],
                'background' => $man['background'],
                'objective' => $man['objective'],
                'methods' => $man['methods'],
                'results' => $man['results'],
                'conclusion' => $man['conclusion'],
                'study_type' => $man['study_type'],
                'author_name' => $man['author_name'],
                'file_path' => $effectiveFilePath,
                'additional_reviewer_files' => $additionalFiles,
                'due_date' => $reviewDueDate
            ]);
            break;

        case "getManuscriptPreviewByManuscriptId":
            $manId = (int)($_GET['manuscript_id'] ?? 0);
            if (!$manId) errorResponse("manuscript_id required");

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
                    m.file_path,
                    m.circulating_file_path,
                    m.additional_reviewer_files,
                    u.name AS author_name,
                    (SELECT revised_file
                     FROM manuscript_revisions
                     WHERE manuscript_id = m.id
                     ORDER BY revision_number DESC
                     LIMIT 1) AS revisedFilePath
                FROM manuscripts m
                JOIN users u ON u.id = m.author_id
                WHERE m.id = ? AND m.deleted_at IS NULL
            ");
            $stmt->execute([$manId]);
            $man = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$man) errorResponse("Manuscript not found", 404);

            $effectiveFilePath = getEffectiveManuscriptFilePath($man, $pdo);
            $additionalFiles = parseAdditionalReviewerFiles($man['additional_reviewer_files'] ?? null);

            jsonResponse([
                'id' => (int)$man['id'],
                'slug' => $man['slug'],
                'title' => $man['title'],
                'abstract' => $man['abstract'],
                'background' => $man['background'],
                'objective' => $man['objective'],
                'methods' => $man['methods'],
                'results' => $man['results'],
                'conclusion' => $man['conclusion'],
                'study_type' => $man['study_type'],
                'author_name' => $man['author_name'],
                'file_path' => $effectiveFilePath,
                'additional_reviewer_files' => $additionalFiles
            ]);
            break;

        case "getActiveReviewByManuscript":
            $manId = (int)($_GET['manuscript_id'] ?? 0);
            if (!$manId) errorResponse("manuscript_id required");

            $stmt = $pdo->prepare("
                SELECT id FROM reviews
                WHERE manuscript_id = ? AND reviewer_id = ? AND accepted_at IS NOT NULL AND completed_at IS NULL
                LIMIT 1
            ");
            $stmt->execute([$manId, $reviewerId]);
            $row = $stmt->fetch();
            if (!$row) errorResponse("No active review found for this manuscript", 404);
            jsonResponse(["review_id" => (int)$row['id']]);
            break;

        case "createReviewForManuscript":
            $data = jsonInput();
            $manuscriptId = (int)($data['manuscript_id'] ?? 0);
            if (!$manuscriptId) errorResponse("manuscript_id required");

            $checkMan = $pdo->prepare("SELECT id FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
            $checkMan->execute([$manuscriptId]);
            if (!$checkMan->fetch()) errorResponse("Manuscript not found", 404);

            $ongoing = $pdo->prepare("
                SELECT id FROM reviews
                WHERE manuscript_id = ? AND reviewer_id = ? AND accepted_at IS NOT NULL AND completed_at IS NULL
            ");
            $ongoing->execute([$manuscriptId, $reviewerId]);
            $existing = $ongoing->fetch();
            if ($existing) {
                $reviewId = (int)$existing['id'];
                jsonResponse([
                    "success" => true,
                    "review_id" => $reviewId,
                    "message" => "Existing ongoing review found"
                ]);
            }

            $stmt = $pdo->prepare("
                INSERT INTO reviews (manuscript_id, reviewer_id, status, assigned_at, accepted_at)
                VALUES (?, ?, 'pending', NOW(), NOW())
            ");
            $stmt->execute([$manuscriptId, $reviewerId]);
            $newReviewId = (int)$pdo->lastInsertId();

            jsonResponse([
                "success" => true,
                "review_id" => $newReviewId,
                "message" => "New review created and accepted"
            ]);
            break;

        case "acceptInvitation":
            $data = jsonInput();
            $reviewId = (int)($data['review_id'] ?? 0);
            if (!$reviewId) errorResponse("review_id required");

            $check = $pdo->prepare("
                SELECT r.id FROM reviews r
                JOIN manuscripts m ON m.id = r.manuscript_id
                WHERE r.id = ? AND r.reviewer_id = ? AND r.accepted_at IS NULL AND r.declined_at IS NULL AND r.completed_at IS NULL AND m.deleted_at IS NULL
            ");
            $check->execute([$reviewId, $reviewerId]);
            if (!$check->fetch()) errorResponse("Invitation not found or already processed", 404);

            $stmt = $pdo->prepare("UPDATE reviews SET accepted_at = NOW() WHERE id = ?");
            $stmt->execute([$reviewId]);

            createNotification(
                $reviewerId,
                'invitation-accepted',
                'Invitation Accepted',
                "You have accepted the review invitation."
            );

            jsonResponse(["success" => true, "message" => "Invitation accepted"]);
            break;

        case "declineInvitation":
            $data = jsonInput();
            $reviewId = (int)($data['review_id'] ?? 0);
            if (!$reviewId) errorResponse("review_id required");

            $check = $pdo->prepare("
                SELECT r.id FROM reviews r
                JOIN manuscripts m ON m.id = r.manuscript_id
                WHERE r.id = ? AND r.reviewer_id = ? AND r.accepted_at IS NULL AND r.declined_at IS NULL AND r.completed_at IS NULL AND m.deleted_at IS NULL
            ");
            $check->execute([$reviewId, $reviewerId]);
            if (!$check->fetch()) errorResponse("Invitation not found or already processed", 404);

            $stmt = $pdo->prepare("UPDATE reviews SET declined_at = NOW() WHERE id = ?");
            $stmt->execute([$reviewId]);

            createNotification(
                $reviewerId,
                'invitation-declined',
                'Invitation Declined',
                "You have declined the review invitation."
            );

            jsonResponse(["success" => true, "message" => "Invitation declined"]);
            break;

        case "submitReview":
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                errorResponse("Method not allowed", 405);
            }

            if (isset($_FILES['attachment']) || !empty($_POST)) {
                $reviewId = (int)($_POST['review_id'] ?? 0);
                $originality = (int)($_POST['originality'] ?? 0);
                $methodology = (int)($_POST['methodology'] ?? 0);
                $clarity = (int)($_POST['clarity'] ?? 0);
                $relevance = (int)($_POST['relevance'] ?? 0);
                $commentsToAuthor = $_POST['commentsToAuthor'] ?? '';
                $confidentialComments = $_POST['confidentialComments'] ?? '';
                $recommendation = $_POST['recommendation'] ?? '';
                $attachmentPath = null;

                if (isset($_FILES['attachment']) && $_FILES['attachment']['error'] === UPLOAD_ERR_OK) {
                    $uploadDir = __DIR__ . '/uploads/review_attachments/';
                    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);
                    $ext = strtolower(pathinfo($_FILES['attachment']['name'], PATHINFO_EXTENSION));
                    $allowed = ['pdf', 'doc', 'docx', 'txt'];
                    if (!in_array($ext, $allowed)) errorResponse("File type not allowed. Allowed: " . implode(', ', $allowed), 400);
                    $filename = 'review_' . $reviewId . '_' . time() . '.' . $ext;
                    $destination = $uploadDir . $filename;
                    if (move_uploaded_file($_FILES['attachment']['tmp_name'], $destination)) {
                        $attachmentPath = 'uploads/review_attachments/' . $filename;
                    } else {
                        errorResponse("Failed to upload file", 500);
                    }
                }
            } else {
                $data = jsonInput();
                if (!$data) errorResponse("Invalid input", 400);
                $reviewId = (int)($data['review_id'] ?? 0);
                $originality = (int)($data['originality'] ?? 0);
                $methodology = (int)($data['methodology'] ?? 0);
                $clarity = (int)($data['clarity'] ?? 0);
                $relevance = (int)($data['relevance'] ?? 0);
                $commentsToAuthor = $data['commentsToAuthor'] ?? '';
                $confidentialComments = $data['confidentialComments'] ?? '';
                $recommendation = $data['recommendation'] ?? '';
                $attachmentPath = $data['attachment_path'] ?? null;
            }

            if (!$reviewId) errorResponse("review_id required", 400);
            if (!$recommendation) errorResponse("recommendation required", 400);

            $check = $pdo->prepare("
                SELECT r.id, r.manuscript_id FROM reviews r
                JOIN manuscripts m ON m.id = r.manuscript_id
                WHERE r.id = ? AND r.reviewer_id = ? AND r.accepted_at IS NOT NULL AND r.completed_at IS NULL AND m.deleted_at IS NULL
            ");
            $check->execute([$reviewId, $reviewerId]);
            $review = $check->fetch();
            if (!$review) errorResponse("Review not found or not in progress", 404);
            $manuscriptId = $review['manuscript_id'];

            $pdo->beginTransaction();
            try {
                $scoreStmt = $pdo->prepare("
                    INSERT INTO review_scores 
                    (review_id, originality, methodology, clarity, relevance, comments_to_author, confidential_comments, recommendation)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $scoreStmt->execute([$reviewId, $originality, $methodology, $clarity, $relevance, $commentsToAuthor, $confidentialComments, $recommendation]);

                $updateSql = "UPDATE reviews SET completed_at = NOW(), status = 'completed'";
                $params = [];
                if ($attachmentPath) {
                    $updateSql .= ", review_attachment = ?";
                    $params[] = $attachmentPath;
                }
                $updateSql .= " WHERE id = ?";
                $params[] = $reviewId;
                $updateStmt = $pdo->prepare($updateSql);
                $updateStmt->execute($params);

                // NOTE: A reviewer's revision recommendation no longer creates a revision or notifies the author.
                // The manuscript only enters 'Revision Requested' after the admin/editor makes the revision decision.
                createNotification(
                    $reviewerId,
                    'review-submitted',
                    'Review Submitted',
                    "Your review has been successfully submitted.",
                    $manuscriptId
                );

                $editorId = getAssignedEditorId($manuscriptId);
                if ($editorId) {
                    createNotification(
                        $editorId,
                        'review-submitted',
                        'Review Submitted',
                        "A reviewer has submitted a review for manuscript ID $manuscriptId.",
                        $manuscriptId
                    );
                }

                // ========== NOTIFY ADMINS (EIC) ==========
                notifyAdmins(
                    'review-submitted',
                    'Review Submitted',
                    "A review has been submitted for manuscript ID: " . formatManuscriptId($manuscriptId) . " by reviewer #$reviewerId.",
                    $manuscriptId
                );

                $pdo->commit();
                jsonResponse(["success" => true, "message" => "Review submitted"]);
            } catch (Exception $e) {
                $pdo->rollBack();
                errorResponse("Failed to submit review: " . $e->getMessage(), 500);
            }
            break;

        case "markRevisionAddressed":
            $data = jsonInput();
            $entryId = (int)($data['entry_id'] ?? 0);
            if (!$entryId) errorResponse("entry_id required");

            $check = $pdo->prepare("
                SELECT re.id 
                FROM revision_entries re
                JOIN manuscript_revisions mr ON mr.id = re.revision_id
                JOIN manuscripts m ON m.id = mr.manuscript_id
                JOIN reviews r ON r.manuscript_id = m.id AND r.reviewer_id = re.reviewer_id
                WHERE re.id = ? 
                  AND re.reviewer_id = ? 
                  AND re.addressed = 0
                  AND r.accepted_at IS NOT NULL 
                  AND r.completed_at IS NULL
                  AND m.deleted_at IS NULL
            ");
            $check->execute([$entryId, $reviewerId]);
            if (!$check->fetch()) errorResponse("Revision entry not found, already addressed, or no active review", 404);

            $stmt = $pdo->prepare("UPDATE revision_entries SET addressed = 1 WHERE id = ?");
            $stmt->execute([$entryId]);

            createNotification(
                $reviewerId,
                'revision-addressed',
                'Revision Addressed',
                "You have marked a revision comment as addressed.",
                null
            );

            jsonResponse(["success" => true, "message" => "Revision marked as addressed"]);
            break;

        case "getReviewDetails":
            $reviewId = (int)($_GET['review_id'] ?? 0);
            if (!$reviewId) errorResponse("review_id required");

            $check = $pdo->prepare("
                SELECT r.id FROM reviews r
                JOIN manuscripts m ON m.id = r.manuscript_id
                WHERE r.id = ? AND r.reviewer_id = ? AND m.deleted_at IS NULL
            ");
            $check->execute([$reviewId, $reviewerId]);
            if (!$check->fetch()) errorResponse("Review not found or not owned by you", 404);

            $scoreStmt = $pdo->prepare("
                SELECT 
                    originality, methodology, clarity, relevance, 
                    comments_to_author, confidential_comments, recommendation
                FROM review_scores 
                WHERE review_id = ?
            ");
            $scoreStmt->execute([$reviewId]);
            $scores = $scoreStmt->fetch(PDO::FETCH_ASSOC);
            if (!$scores) errorResponse("Review scores not found", 404);

            $attStmt = $pdo->prepare("SELECT review_attachment FROM reviews WHERE id = ?");
            $attStmt->execute([$reviewId]);
            $attachment = $attStmt->fetchColumn();

            jsonResponse([
                'originality' => (int)($scores['originality'] ?? 0),
                'methodology' => (int)($scores['methodology'] ?? 0),
                'clarity' => (int)($scores['clarity'] ?? 0),
                'relevance' => (int)($scores['relevance'] ?? 0),
                'commentsToAuthor' => $scores['comments_to_author'] ?? '',
                'confidentialComments' => $scores['confidential_comments'] ?? '',
                'recommendation' => $scores['recommendation'] ?? '',
                'attachment' => $attachment
            ]);
            break;

        default:
            errorResponse("Invalid action. Available: getDashboardStats, getPendingActions, listInvitations, listActive, listRevisions, listOverdue, listCompleted, getAnalytics, getCurrentUser, getManuscriptPreview, getManuscriptPreviewByManuscriptId, getActiveReviewByManuscript, createReviewForManuscript, acceptInvitation, declineInvitation, submitReview, markRevisionAddressed, getReviewDetails", 400);
    }
} catch (PDOException $e) {
    error_log("DB Error: " . $e->getMessage());
    errorResponse("Database error", 500);
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    errorResponse($e->getMessage(), 500);
}
?>