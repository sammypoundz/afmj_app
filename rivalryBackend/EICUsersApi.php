<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . "/config.php";
require_once __DIR__ . "/notification_helper.php";

$action = $_GET['action'] ?? '';
$action = trim($action);
error_log("EICUsersAPI action received: " . $action);

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

function successResponse(array $data = []): void {
    jsonResponse(array_merge(["success" => true], $data));
}

try {

switch ($action) {

    // ==================== REVIEWERS ====================
    case "listReviewers":
        $search = $_GET['search'] ?? '';
        $expertise = $_GET['expertise'] ?? '';
        $status = $_GET['status'] ?? ''; // 'active' or 'inactive'
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(50, max(1, (int)($_GET['limit'] ?? 20)));
        $offset = ($page - 1) * $limit;

        // Build WHERE clause
        $where = "WHERE u.role = 'reviewer'";
        $params = [];

        if ($search) {
            $where .= " AND (u.name LIKE ? OR u.email LIKE ?)";
            $searchTerm = "%$search%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        if ($status === 'active') {
            $where .= " AND u.active = 1 AND u.suspended = 0";
        } elseif ($status === 'inactive') {
            $where .= " AND (u.active = 0 OR u.suspended = 1)";
        }

        if ($expertise) {
            $where .= " AND EXISTS (SELECT 1 FROM reviewer_expertise re WHERE re.reviewer_id = u.id AND re.expertise = ?)";
            $params[] = $expertise;
        }

        // Count total
        $countSql = "SELECT COUNT(*) FROM users u $where";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        // Main query
        $sql = "
            SELECT 
                u.id,
                u.name,
                u.email,
                u.institution AS affiliation,
                u.active,
                u.suspended,
                (SELECT GROUP_CONCAT(expertise SEPARATOR ', ') FROM reviewer_expertise WHERE reviewer_id = u.id) AS expertise_list,
                (SELECT COUNT(*) FROM reviews WHERE reviewer_id = u.id AND status = 'pending') AS active_assignments,
                (SELECT COUNT(*) FROM reviews WHERE reviewer_id = u.id AND status = 'completed') AS completed_reviews
            FROM users u
            $where
            ORDER BY u.name
            LIMIT ? OFFSET ?
        ";

        $stmt = $pdo->prepare($sql);
        $paramIndex = 1;
        foreach ($params as $param) {
            $stmt->bindValue($paramIndex++, $param);
        }
        $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
        $stmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);
        $stmt->execute();

        $reviewers = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $expertise = $row['expertise_list'] ? explode(', ', $row['expertise_list']) : [];
            $reviewers[] = [
                'id' => (int)$row['id'],
                'name' => $row['name'],
                'email' => $row['email'],
                'affiliation' => $row['affiliation'] ?? '',
                'expertise' => $expertise,
                'activeAssignments' => (int)$row['active_assignments'],
                'completedReviews' => (int)$row['completed_reviews'],
                'status' => ($row['active'] && !$row['suspended']) ? 'active' : 'inactive',
                'suspended' => (bool)$row['suspended'],
                'bio' => '' // Placeholder
            ];
        }

        jsonResponse([
            'data' => $reviewers,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => (int)ceil($total / $limit)
            ]
        ]);
        break;

    case "getReviewer":
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) errorResponse("Reviewer ID required", 400);

        $stmt = $pdo->prepare("
            SELECT 
                u.id,
                u.name,
                u.email,
                u.institution AS affiliation,
                u.active,
                u.suspended,
                u.bio,
                (SELECT GROUP_CONCAT(expertise SEPARATOR ', ') FROM reviewer_expertise WHERE reviewer_id = u.id) AS expertise_list,
                (SELECT COUNT(*) FROM reviews WHERE reviewer_id = u.id AND status = 'pending') AS active_assignments,
                (SELECT COUNT(*) FROM reviews WHERE reviewer_id = u.id AND status = 'completed') AS completed_reviews
            FROM users u
            WHERE u.id = ? AND u.role = 'reviewer'
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) errorResponse("Reviewer not found", 404);

        $pastStmt = $pdo->prepare("
            SELECT 
                m.title AS manuscriptTitle,
                rs.recommendation AS decision,
                DATE(r.completed_at) AS date
            FROM reviews r
            JOIN manuscripts m ON m.id = r.manuscript_id
            LEFT JOIN review_scores rs ON rs.review_id = r.id
            WHERE r.reviewer_id = ? AND r.status = 'completed'
            ORDER BY r.completed_at DESC
            LIMIT 20
        ");
        $pastStmt->execute([$id]);
        $pastReviews = $pastStmt->fetchAll(PDO::FETCH_ASSOC);

        $expertise = $row['expertise_list'] ? explode(', ', $row['expertise_list']) : [];

        jsonResponse([
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'affiliation' => $row['affiliation'] ?? '',
            'expertise' => $expertise,
            'activeAssignments' => (int)$row['active_assignments'],
            'completedReviews' => (int)$row['completed_reviews'],
            'status' => ($row['active'] && !$row['suspended']) ? 'active' : 'inactive',
            'suspended' => (bool)$row['suspended'],
            'bio' => $row['bio'] ?? '',
            'pastReviews' => $pastReviews
        ]);
        break;

    case "addReviewer":
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            errorResponse("Method not allowed", 405);
        }
        $data = jsonInput();
        if (!$data) errorResponse("Invalid JSON", 400);

        $name = $data['name'] ?? '';
        $email = $data['email'] ?? '';
        $affiliation = $data['affiliation'] ?? '';
        $expertise = $data['expertise'] ?? '';
        $bio = $data['bio'] ?? '';

        if (!$name || !$email) {
            errorResponse("Name and email are required", 400);
        }

        $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $check->execute([$email]);
        if ($check->fetch()) {
            errorResponse("Email already registered", 409);
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("
                INSERT INTO users (name, email, role, institution, active, suspended, created_at)
                VALUES (?, ?, 'reviewer', ?, 1, 0, NOW())
            ");
            $stmt->execute([$name, $email, $affiliation]);
            $reviewerId = (int)$pdo->lastInsertId();

            if ($expertise) {
                $expList = array_map('trim', explode(',', $expertise));
                $insExp = $pdo->prepare("INSERT INTO reviewer_expertise (reviewer_id, expertise) VALUES (?, ?)");
                foreach ($expList as $exp) {
                    if (!empty($exp)) {
                        $insExp->execute([$reviewerId, $exp]);
                    }
                }
            }

            if ($bio) {
                $update = $pdo->prepare("UPDATE users SET bio = ? WHERE id = ?");
                $update->execute([$bio, $reviewerId]);
            }

            $pdo->commit();

            // Send welcome notification to the new reviewer
            createNotification(
                $reviewerId,
                'welcome',
                'Welcome to AFMJ',
                "Dear $name,<br><br>You have been registered as a reviewer for AFMJ. You can now log in and accept review invitations.<br><br>Regards,<br>AFMJ Team"
            );

            successResponse(['id' => $reviewerId, 'message' => 'Reviewer added successfully']);
        } catch (Exception $e) {
            $pdo->rollBack();
            errorResponse("Failed to add reviewer: " . $e->getMessage(), 500);
        }
        break;

    case "updateReviewer":
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            errorResponse("Method not allowed", 405);
        }
        $data = jsonInput();
        if (!$data) errorResponse("Invalid JSON", 400);

        $id = (int)($data['id'] ?? 0);
        if (!$id) errorResponse("Reviewer ID required", 400);

        // Fetch current user state to detect changes
        $currentStmt = $pdo->prepare("SELECT active, suspended FROM users WHERE id = ?");
        $currentStmt->execute([$id]);
        $current = $currentStmt->fetch();
        if (!$current) errorResponse("Reviewer not found", 404);

        $fields = [];
        $params = [];

        if (isset($data['active'])) {
            $fields[] = "active = ?";
            $params[] = $data['active'] ? 1 : 0;
        }
        if (isset($data['suspended'])) {
            $fields[] = "suspended = ?";
            $params[] = $data['suspended'] ? 1 : 0;
        }
        if (isset($data['name'])) {
            $fields[] = "name = ?";
            $params[] = $data['name'];
        }
        if (isset($data['email'])) {
            $check = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
            $check->execute([$data['email'], $id]);
            if ($check->fetch()) {
                errorResponse("Email already in use", 409);
            }
            $fields[] = "email = ?";
            $params[] = $data['email'];
        }
        if (isset($data['affiliation'])) {
            $fields[] = "institution = ?";
            $params[] = $data['affiliation'];
        }
        if (isset($data['bio'])) {
            $fields[] = "bio = ?";
            $params[] = $data['bio'];
        }

        if (empty($fields) && !isset($data['expertise'])) {
            errorResponse("No fields to update", 400);
        }

        $pdo->beginTransaction();
        try {
            if (!empty($fields)) {
                $params[] = $id;
                $sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute($params);
            }

            if (isset($data['expertise'])) {
                $del = $pdo->prepare("DELETE FROM reviewer_expertise WHERE reviewer_id = ?");
                $del->execute([$id]);

                $expList = array_map('trim', explode(',', $data['expertise']));
                $ins = $pdo->prepare("INSERT INTO reviewer_expertise (reviewer_id, expertise) VALUES (?, ?)");
                foreach ($expList as $exp) {
                    if (!empty($exp)) {
                        $ins->execute([$id, $exp]);
                    }
                }
            }

            $pdo->commit();

            // Notify if status changed
            if (isset($data['active']) && $data['active'] != $current['active']) {
                $message = $data['active'] ? "Your account has been activated." : "Your account has been deactivated.";
                createNotification($id, 'status-change', 'Account Status Updated', $message);
            }
            if (isset($data['suspended']) && $data['suspended'] != $current['suspended']) {
                $message = $data['suspended'] ? "Your account has been suspended." : "Your suspension has been lifted.";
                createNotification($id, 'status-change', 'Account Status Updated', $message);
            }

            successResponse(['message' => 'Reviewer updated successfully']);
        } catch (Exception $e) {
            $pdo->rollBack();
            errorResponse("Update failed: " . $e->getMessage(), 500);
        }
        break;

    case "updateReviewerProfile":
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            errorResponse("Method not allowed", 405);
        }
        $data = jsonInput();
        if (!$data) errorResponse("Invalid JSON", 400);

        $id = (int)($data['id'] ?? 0);
        $name = $data['name'] ?? '';
        $affiliation = $data['affiliation'] ?? '';
        $bio = $data['bio'] ?? '';
        $expertiseArray = $data['expertise'] ?? [];

        if (!$id || !$name) {
            errorResponse("Reviewer ID and name are required", 400);
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("
                UPDATE users 
                SET name = ?, institution = ?, bio = ?
                WHERE id = ? AND role = 'reviewer'
            ");
            $stmt->execute([$name, $affiliation, $bio, $id]);

            $del = $pdo->prepare("DELETE FROM reviewer_expertise WHERE reviewer_id = ?");
            $del->execute([$id]);

            if (!empty($expertiseArray)) {
                $ins = $pdo->prepare("INSERT INTO reviewer_expertise (reviewer_id, expertise) VALUES (?, ?)");
                foreach ($expertiseArray as $exp) {
                    $exp = trim($exp);
                    if (!empty($exp)) {
                        $ins->execute([$id, $exp]);
                    }
                }
            }

            $pdo->commit();

            // Notify reviewer that profile was updated
            createNotification(
                $id,
                'profile-updated',
                'Profile Updated',
                "Your profile information has been updated."
            );

            successResponse(['message' => 'Profile updated successfully']);
        } catch (Exception $e) {
            $pdo->rollBack();
            errorResponse("Update failed: " . $e->getMessage(), 500);
        }
        break;

    // ✅ NEW: Delete Reviewer
    case "deleteReviewer":
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            errorResponse("Method not allowed", 405);
        }
        $data = jsonInput();
        if (!$data) errorResponse("Invalid JSON", 400);

        $id = (int)($data['id'] ?? 0);
        if (!$id) errorResponse("Reviewer ID required", 400);

        // Verify the user exists and is a reviewer
        $check = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role = 'reviewer'");
        $check->execute([$id]);
        if (!$check->fetch()) {
            errorResponse("Reviewer not found", 404);
        }

        // Delete the user (cascading deletes should handle related records)
        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            errorResponse("Failed to delete reviewer", 500);
        }

        successResponse(['message' => 'Reviewer deleted successfully']);
        break;

    // ==================== EDITORS ====================
    case "listEditors":
        $search = $_GET['search'] ?? '';
        $specialization = $_GET['specialization'] ?? '';
        $status = $_GET['status'] ?? ''; // 'active' or 'inactive'
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(50, max(1, (int)($_GET['limit'] ?? 10)));
        $offset = ($page - 1) * $limit;

        $where = "WHERE u.role IN ('editor','publisher')";
        $params = [];

        if ($search) {
            $where .= " AND (u.name LIKE ? OR u.email LIKE ?)";
            $searchTerm = "%$search%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        if ($status === 'active') {
            $where .= " AND u.active = 1 AND u.suspended = 0";
        } elseif ($status === 'inactive') {
            $where .= " AND (u.active = 0 OR u.suspended = 1)";
        }

        if ($specialization) {
            $where .= " AND u.specializations LIKE ?";
            $params[] = "%$specialization%";
        }

        $countSql = "SELECT COUNT(*) FROM users u $where";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $sql = "
            SELECT 
                u.id,
                u.name,
                u.email,
                u.institution AS affiliation,
                u.active,
                u.suspended,
                u.bio,
                u.specializations,
                (SELECT COUNT(*) FROM manuscripts WHERE editor_id = u.id AND status = 'under_review') AS active_assignments,
                (SELECT COUNT(*) FROM manuscripts WHERE editor_id = u.id AND status IN ('accepted','rejected')) AS completed_actions
            FROM users u
            $where
            ORDER BY u.name
            LIMIT ? OFFSET ?
        ";

        $stmt = $pdo->prepare($sql);
        $paramIndex = 1;
        foreach ($params as $param) {
            $stmt->bindValue($paramIndex++, $param);
        }
        $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
        $stmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);
        $stmt->execute();

        $editors = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $specializations = $row['specializations'] ? explode(',', $row['specializations']) : [];
            $editors[] = [
                'id' => (int)$row['id'],
                'name' => $row['name'],
                'email' => $row['email'],
                'affiliation' => $row['affiliation'] ?? '',
                'specialization' => array_map('trim', $specializations),
                'activeAssignments' => (int)$row['active_assignments'],
                'completedActions' => (int)$row['completed_actions'],
                'status' => ($row['active'] && !$row['suspended']) ? 'active' : 'inactive',
                'suspended' => (bool)$row['suspended'],
                'bio' => $row['bio'] ?? ''
            ];
        }

        jsonResponse([
            'data' => $editors,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => (int)ceil($total / $limit)
            ]
        ]);
        break;

    case "getEditor":
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) errorResponse("Editor ID required", 400);

        $stmt = $pdo->prepare("
            SELECT 
                u.id,
                u.name,
                u.email,
                u.institution AS affiliation,
                u.active,
                u.suspended,
                u.bio,
                u.specializations,
                (SELECT COUNT(*) FROM manuscripts WHERE editor_id = u.id AND status = 'under_review') AS active_assignments,
                (SELECT COUNT(*) FROM manuscripts WHERE editor_id = u.id AND status IN ('accepted','rejected')) AS completed_actions
            FROM users u
            WHERE u.id = ? AND u.role IN ('editor','publisher')
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) errorResponse("Editor not found", 404);

        $actionsStmt = $pdo->prepare("
            SELECT 
                m.title AS manuscriptTitle,
                CASE 
                    WHEN m.status = 'accepted' THEN 'Accepted'
                    WHEN m.status = 'rejected' THEN 'Rejected'
                    WHEN m.status = 'published' THEN 'Published'
                    ELSE 'Handled'
                END AS action,
                DATE(m.created_at) AS date
            FROM manuscripts m
            WHERE m.editor_id = ? AND m.status IN ('accepted','rejected','published')
            ORDER BY m.created_at DESC
            LIMIT 20
        ");
        $actionsStmt->execute([$id]);
        $pastActions = $actionsStmt->fetchAll(PDO::FETCH_ASSOC);

        $specializations = $row['specializations'] ? explode(',', $row['specializations']) : [];

        jsonResponse([
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'affiliation' => $row['affiliation'] ?? '',
            'specialization' => array_map('trim', $specializations),
            'activeAssignments' => (int)$row['active_assignments'],
            'completedActions' => (int)$row['completed_actions'],
            'status' => ($row['active'] && !$row['suspended']) ? 'active' : 'inactive',
            'suspended' => (bool)$row['suspended'],
            'bio' => $row['bio'] ?? '',
            'pastActions' => $pastActions
        ]);
        break;

    case "addEditor":
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            errorResponse("Method not allowed", 405);
        }
        $data = jsonInput();
        if (!$data) errorResponse("Invalid JSON", 400);

        $name = $data['name'] ?? '';
        $email = $data['email'] ?? '';
        $affiliation = $data['affiliation'] ?? '';
        $specialization = $data['specialization'] ?? '';
        $bio = $data['bio'] ?? '';

        if (!$name || !$email) {
            errorResponse("Name and email are required", 400);
        }

        $check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $check->execute([$email]);
        if ($check->fetch()) {
            errorResponse("Email already registered", 409);
        }

        $stmt = $pdo->prepare("
            INSERT INTO users (name, email, role, institution, active, suspended, bio, specializations, created_at)
            VALUES (?, ?, 'editor', ?, 1, 0, ?, ?, NOW())
        ");
        $stmt->execute([$name, $email, $affiliation, $bio, $specialization]);
        $editorId = (int)$pdo->lastInsertId();

        // Send welcome notification
        createNotification(
            $editorId,
            'welcome',
            'Welcome to AFMJ',
            "Dear $name,<br><br>You have been registered as an editor for AFMJ. You can now log in and manage manuscripts.<br><br>Regards,<br>AFMJ Team"
        );

        successResponse(['id' => $editorId, 'message' => 'Editor added successfully']);
        break;

    case "updateEditor":
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            errorResponse("Method not allowed", 405);
        }
        $data = jsonInput();
        if (!$data) errorResponse("Invalid JSON", 400);

        $id = (int)($data['id'] ?? 0);
        if (!$id) errorResponse("Editor ID required", 400);

        $currentStmt = $pdo->prepare("SELECT active, suspended FROM users WHERE id = ?");
        $currentStmt->execute([$id]);
        $current = $currentStmt->fetch();
        if (!$current) errorResponse("Editor not found", 404);

        $fields = [];
        $params = [];

        if (isset($data['active'])) {
            $fields[] = "active = ?";
            $params[] = $data['active'] ? 1 : 0;
        }
        if (isset($data['suspended'])) {
            $fields[] = "suspended = ?";
            $params[] = $data['suspended'] ? 1 : 0;
        }
        if (isset($data['name'])) {
            $fields[] = "name = ?";
            $params[] = $data['name'];
        }
        if (isset($data['email'])) {
            $check = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
            $check->execute([$data['email'], $id]);
            if ($check->fetch()) {
                errorResponse("Email already in use", 409);
            }
            $fields[] = "email = ?";
            $params[] = $data['email'];
        }
        if (isset($data['affiliation'])) {
            $fields[] = "institution = ?";
            $params[] = $data['affiliation'];
        }
        if (isset($data['bio'])) {
            $fields[] = "bio = ?";
            $params[] = $data['bio'];
        }
        if (isset($data['specialization'])) {
            $fields[] = "specializations = ?";
            $params[] = $data['specialization'];
        }

        if (empty($fields)) {
            errorResponse("No fields to update", 400);
        }

        $params[] = $id;
        $sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // Notify if status changed
        if (isset($data['active']) && $data['active'] != $current['active']) {
            $message = $data['active'] ? "Your account has been activated." : "Your account has been deactivated.";
            createNotification($id, 'status-change', 'Account Status Updated', $message);
        }
        if (isset($data['suspended']) && $data['suspended'] != $current['suspended']) {
            $message = $data['suspended'] ? "Your account has been suspended." : "Your suspension has been lifted.";
            createNotification($id, 'status-change', 'Account Status Updated', $message);
        }

        successResponse(['message' => 'Editor updated successfully']);
        break;

    case "updateEditorProfile":
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            errorResponse("Method not allowed", 405);
        }
        $data = jsonInput();
        if (!$data) errorResponse("Invalid JSON", 400);

        $id = (int)($data['id'] ?? 0);
        $name = $data['name'] ?? '';
        $affiliation = $data['affiliation'] ?? '';
        $bio = $data['bio'] ?? '';
        $specialization = $data['specialization'] ?? [];

        if (!$id || !$name) {
            errorResponse("Editor ID and name are required", 400);
        }

        $specStr = implode(', ', array_filter($specialization));

        $stmt = $pdo->prepare("
            UPDATE users 
            SET name = ?, institution = ?, bio = ?, specializations = ?
            WHERE id = ? AND role IN ('editor','publisher')
        ");
        $stmt->execute([$name, $affiliation, $bio, $specStr, $id]);

        // Notify editor that profile was updated
        createNotification(
            $id,
            'profile-updated',
            'Profile Updated',
            "Your profile information has been updated."
        );

        successResponse(['message' => 'Profile updated successfully']);
        break;

    case "assignManuscriptToEditor":
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            errorResponse("Method not allowed", 405);
        }
        $data = jsonInput();
        if (!$data) errorResponse("Invalid JSON", 400);

        $editorId = (int)($data['editor_id'] ?? 0);
        $manuscriptId = (int)($data['manuscript_id'] ?? 0);

        if (!$editorId || !$manuscriptId) {
            errorResponse("editor_id and manuscript_id required", 400);
        }

        $check = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role IN ('editor','publisher') AND active = 1 AND suspended = 0");
        $check->execute([$editorId]);
        if (!$check->fetch()) {
            errorResponse("Editor not found or inactive", 404);
        }

        $manCheck = $pdo->prepare("SELECT id FROM manuscripts WHERE id = ?");
        $manCheck->execute([$manuscriptId]);
        if (!$manCheck->fetch()) {
            errorResponse("Manuscript not found", 404);
        }

        $stmt = $pdo->prepare("UPDATE manuscripts SET editor_id = ? WHERE id = ?");
        $stmt->execute([$editorId, $manuscriptId]);

        successResponse(['message' => 'Manuscript assigned to editor successfully']);
        break;

    // ✅ NEW: Delete Editor
    case "deleteEditor":
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            errorResponse("Method not allowed", 405);
        }
        $data = jsonInput();
        if (!$data) errorResponse("Invalid JSON", 400);

        $id = (int)($data['id'] ?? 0);
        if (!$id) errorResponse("Editor ID required", 400);

        // Verify the user exists and is an editor/publisher
        $check = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role IN ('editor','publisher')");
        $check->execute([$id]);
        if (!$check->fetch()) {
            errorResponse("Editor not found", 404);
        }

        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            errorResponse("Failed to delete editor", 500);
        }

        successResponse(['message' => 'Editor deleted successfully']);
        break;

    // ==================== AUTHORS ====================
    case "listAuthors":
        $search = $_GET['search'] ?? '';
        $status = $_GET['status'] ?? ''; // 'active' or 'inactive'
        $page = max(1, (int)($_GET['page'] ?? 1));
        $limit = min(50, max(1, (int)($_GET['limit'] ?? 10)));
        $offset = ($page - 1) * $limit;

        $where = "WHERE u.role = 'author'";
        $params = [];

        if ($search) {
            $where .= " AND (u.name LIKE ? OR u.email LIKE ?)";
            $searchTerm = "%$search%";
            $params[] = $searchTerm;
            $params[] = $searchTerm;
        }

        if ($status === 'active') {
            $where .= " AND u.active = 1 AND u.suspended = 0";
        } elseif ($status === 'inactive') {
            $where .= " AND (u.active = 0 OR u.suspended = 1)";
        }

        $countSql = "SELECT COUNT(*) FROM users u $where";
        $countStmt = $pdo->prepare($countSql);
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $sql = "
            SELECT 
                u.id,
                u.name,
                u.email,
                u.institution AS affiliation,
                u.active,
                u.suspended,
                u.bio,
                (SELECT COUNT(*) FROM manuscripts WHERE author_id = u.id) AS total_submissions,
                (SELECT COUNT(*) FROM manuscripts WHERE author_id = u.id AND status = 'accepted') AS accepted_count
            FROM users u
            $where
            ORDER BY u.name
            LIMIT ? OFFSET ?
        ";

        $stmt = $pdo->prepare($sql);
        $paramIndex = 1;
        foreach ($params as $param) {
            $stmt->bindValue($paramIndex++, $param);
        }
        $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
        $stmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);
        $stmt->execute();

        $authors = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $authors[] = [
                'id' => (int)$row['id'],
                'name' => $row['name'],
                'email' => $row['email'],
                'affiliation' => $row['affiliation'] ?? '',
                'totalSubmissions' => (int)$row['total_submissions'],
                'accepted' => (int)$row['accepted_count'],
                'status' => ($row['active'] && !$row['suspended']) ? 'active' : 'inactive',
                'suspended' => (bool)$row['suspended'],
                'bio' => $row['bio'] ?? '',
            ];
        }

        jsonResponse([
            'data' => $authors,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
                'pages' => (int)ceil($total / $limit)
            ]
        ]);
        break;

    case "getAuthor":
        $id = (int)($_GET['id'] ?? 0);
        if (!$id) errorResponse("Author ID required", 400);

        $stmt = $pdo->prepare("
            SELECT 
                u.id,
                u.name,
                u.email,
                u.institution AS affiliation,
                u.active,
                u.suspended,
                u.bio,
                (SELECT COUNT(*) FROM manuscripts WHERE author_id = u.id) AS total_submissions,
                (SELECT COUNT(*) FROM manuscripts WHERE author_id = u.id AND status = 'accepted') AS accepted_count
            FROM users u
            WHERE u.id = ? AND u.role = 'author'
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) errorResponse("Author not found", 404);

        $subsStmt = $pdo->prepare("
            SELECT 
                title AS manuscriptTitle,
                status,
                DATE(created_at) AS dateSubmitted,
                DATE(created_at) AS lastUpdated
            FROM manuscripts
            WHERE author_id = ?
            ORDER BY created_at DESC
            LIMIT 50
        ");
        $subsStmt->execute([$id]);
        $submissions = $subsStmt->fetchAll(PDO::FETCH_ASSOC);

        jsonResponse([
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'email' => $row['email'],
            'affiliation' => $row['affiliation'] ?? '',
            'totalSubmissions' => (int)$row['total_submissions'],
            'accepted' => (int)$row['accepted_count'],
            'status' => ($row['active'] && !$row['suspended']) ? 'active' : 'inactive',
            'suspended' => (bool)$row['suspended'],
            'bio' => $row['bio'] ?? '',
            'submissions' => $submissions
        ]);
        break;

    case "updateAuthor":
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            errorResponse("Method not allowed", 405);
        }
        $data = jsonInput();
        if (!$data) errorResponse("Invalid JSON", 400);

        $id = (int)($data['id'] ?? 0);
        if (!$id) errorResponse("Author ID required", 400);

        $currentStmt = $pdo->prepare("SELECT active, suspended FROM users WHERE id = ?");
        $currentStmt->execute([$id]);
        $current = $currentStmt->fetch();
        if (!$current) errorResponse("Author not found", 404);

        $fields = [];
        $params = [];

        if (isset($data['active'])) {
            $fields[] = "active = ?";
            $params[] = $data['active'] ? 1 : 0;
        }
        if (isset($data['suspended'])) {
            $fields[] = "suspended = ?";
            $params[] = $data['suspended'] ? 1 : 0;
        }
        if (isset($data['name'])) {
            $fields[] = "name = ?";
            $params[] = $data['name'];
        }
        if (isset($data['email'])) {
            $check = $pdo->prepare("SELECT id FROM users WHERE email = ? AND id != ?");
            $check->execute([$data['email'], $id]);
            if ($check->fetch()) {
                errorResponse("Email already in use", 409);
            }
            $fields[] = "email = ?";
            $params[] = $data['email'];
        }
        if (isset($data['affiliation'])) {
            $fields[] = "institution = ?";
            $params[] = $data['affiliation'];
        }
        if (isset($data['bio'])) {
            $fields[] = "bio = ?";
            $params[] = $data['bio'];
        }

        if (empty($fields)) {
            errorResponse("No fields to update", 400);
        }

        $params[] = $id;
        $sql = "UPDATE users SET " . implode(", ", $fields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // Notify if status changed
        if (isset($data['active']) && $data['active'] != $current['active']) {
            $message = $data['active'] ? "Your account has been activated." : "Your account has been deactivated.";
            createNotification($id, 'status-change', 'Account Status Updated', $message);
        }
        if (isset($data['suspended']) && $data['suspended'] != $current['suspended']) {
            $message = $data['suspended'] ? "Your account has been suspended." : "Your suspension has been lifted.";
            createNotification($id, 'status-change', 'Account Status Updated', $message);
        }

        successResponse(['message' => 'Author updated successfully']);
        break;

    // ✅ NEW: Delete Author
    case "deleteAuthor":
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            errorResponse("Method not allowed", 405);
        }
        $data = jsonInput();
        if (!$data) errorResponse("Invalid JSON", 400);

        $id = (int)($data['id'] ?? 0);
        if (!$id) errorResponse("Author ID required", 400);

        // Verify the user exists and is an author
        $check = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role = 'author'");
        $check->execute([$id]);
        if (!$check->fetch()) {
            errorResponse("Author not found", 404);
        }

        $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            errorResponse("Failed to delete author", 500);
        }

        successResponse(['message' => 'Author deleted successfully']);
        break;

    // ==================== SHARED ====================
    case "listManuscripts":
        $for = $_GET['for'] ?? '';
        if ($for === 'editor') {
            $stmt = $pdo->prepare("
                SELECT id, title
                FROM manuscripts
                WHERE status = 'submitted' AND editor_id IS NULL
                ORDER BY created_at DESC
                LIMIT 50
            ");
        } else {
            $stmt = $pdo->prepare("
                SELECT id, title
                FROM manuscripts
                WHERE status = 'under_review'
                ORDER BY created_at DESC
                LIMIT 50
            ");
        }
        $stmt->execute();
        $manuscripts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        jsonResponse($manuscripts);
        break;

    default:
        errorResponse("Invalid action '$action'. Available actions: listReviewers, getReviewer, addReviewer, updateReviewer, updateReviewerProfile, deleteReviewer, listEditors, getEditor, addEditor, updateEditor, updateEditorProfile, assignManuscriptToEditor, deleteEditor, listAuthors, getAuthor, updateAuthor, deleteAuthor, listManuscripts.", 400);
}

} catch (PDOException $e) {
    error_log("EICUsersAPI PDO Error: " . $e->getMessage());
    errorResponse("Database error", 500);
} catch (Exception $e) {
    error_log("EICUsersAPI Error: " . $e->getMessage());
    errorResponse($e->getMessage(), 500);
}
?> 