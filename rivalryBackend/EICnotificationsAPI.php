<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Session-Id");
header("Access-Control-Max-Age: 86400");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . "/config.php";
require_once __DIR__ . "/notification_helper.php";

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
$userId = $_SESSION['user_id'];

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

try {

switch ($action) {

    case "list":
        $limit = (int)($_GET['limit'] ?? 50);
        $stmt = $pdo->prepare("
            SELECT 
                id, 
                type, 
                title, 
                description, 
                related_manuscript_id AS manuscriptId,
                is_read AS `read`, 
                created_at AS `date`
            FROM notifications
            WHERE user_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        ");
        $stmt->bindValue(1, $userId, PDO::PARAM_INT);
        $stmt->bindValue(2, $limit, PDO::PARAM_INT);
        $stmt->execute();
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $out = array_map(function($n) {
            return [
                'id' => (int)$n['id'],
                'type' => $n['type'],
                'title' => $n['title'],
                'description' => $n['description'],
                'relatedManuscriptId' => isset($n['manuscriptId']) && $n['manuscriptId'] ? (int)$n['manuscriptId'] : null,
                'read' => (bool)$n['read'],
                'date' => date("Y-m-d H:i", strtotime($n['date']))
            ];
        }, $notifications);

        jsonResponse($out);
        break;

    case "markRead":
        $data = jsonInput();
        $notificationId = (int)($data['id'] ?? 0);
        if (!$notificationId) errorResponse("Notification ID required");

        $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?");
        $stmt->execute([$notificationId, $userId]);
        jsonResponse(["success" => true]);
        break;

    case "markAllRead":
        $stmt = $pdo->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?");
        $stmt->execute([$userId]);
        jsonResponse(["success" => true]);
        break;

    default:
        errorResponse("Invalid action", 400);
}

} catch (PDOException $e) {
    error_log("DB Error: " . $e->getMessage());
    errorResponse("Database error", 500);
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    errorResponse($e->getMessage(), 500);
}
?>