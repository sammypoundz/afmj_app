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
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}
$userId = $_SESSION['user_id'];

// ==================== REQUIREMENTS ====================
require_once __DIR__ . "/config.php";
require_once __DIR__ . "/notification_helper.php";

function jsonResponse($data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

function errorResponse(string $message, int $code = 400): void {
    jsonResponse(["error" => $message], $code);
}

// ==================== ACTIONS ====================
$action = $_GET['action'] ?? '';

try {
    switch ($action) {

        case "list":
            // Get logs for the current user (EIC). If user is admin, you may want all logs.
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 50;
            $stmt = $pdo->prepare("
                SELECT id, action, details, created_at AS date
                FROM activity_logs
                WHERE user_id = ?
                ORDER BY created_at DESC
                LIMIT ?
            ");
            $stmt->bindValue(1, $userId, PDO::PARAM_INT);
            $stmt->bindValue(2, $limit, PDO::PARAM_INT);
            $stmt->execute();
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Format date
            foreach ($logs as &$log) {
                $log['date'] = date("Y-m-d H:i", strtotime($log['date']));
            }

            jsonResponse($logs);
            break;

        case "log":
            // For internal use: insert a new log entry (optional, but you can call this from other APIs)
            $data = jsonInput();
            if (!$data) {
                errorResponse("Invalid JSON", 400);
            }
            $actionType = $data['action'] ?? '';
            $details = $data['details'] ?? '';
            if (empty($actionType)) {
                errorResponse("Action is required", 400);
            }

            $stmt = $pdo->prepare("
                INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([
                $userId,
                $actionType,
                $details,
                $_SERVER['REMOTE_ADDR'] ?? null,
                $_SERVER['HTTP_USER_AGENT'] ?? null
            ]);

            jsonResponse(['success' => true, 'id' => $pdo->lastInsertId()]);
            break;

        default:
            errorResponse("Invalid action. Use 'list' to get logs.", 400);
    }
} catch (PDOException $e) {
    error_log("Logs API DB Error: " . $e->getMessage());
    errorResponse("Database error", 500);
} catch (Exception $e) {
    error_log("Logs API Error: " . $e->getMessage());
    errorResponse($e->getMessage(), 500);
}
?>