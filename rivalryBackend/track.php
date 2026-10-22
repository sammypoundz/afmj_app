<?php
// ==================== CORS ====================
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Session-Id");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ==================== SESSION ====================
$customSessionPath = __DIR__ . '/sessions';
if (!is_dir($customSessionPath)) mkdir($customSessionPath, 0755, true);
session_save_path($customSessionPath);
ini_set('session.use_cookies', 0);
$sessionId = $_SERVER['HTTP_X_SESSION_ID'] ?? null;
if ($sessionId) session_id($sessionId);
session_start();

$userId = $_SESSION['user_id'] ?? null;

// ==================== GET INPUT ====================
$input = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents("php://input");
    if ($raw) {
        $input = json_decode($raw, true) ?? [];
    }
    if (empty($input)) {
        $input = $_POST;
    }
} else {
    $input = $_GET;
}

$page = $input['page'] ?? $_SERVER['HTTP_REFERER'] ?? '/';
// Limit page length
$page = substr($page, 0, 255);

// ==================== REQUIRE DB ====================
require_once __DIR__ . "/config.php";

// ==================== INSERT ====================
$stmt = $pdo->prepare("
    INSERT INTO page_views 
    (user_id, session_id, page, ip_address, user_agent, referer, created_at)
    VALUES (?, ?, ?, ?, ?, ?, NOW())
");
$stmt->execute([
    $userId,
    $sessionId,
    $page,
    $_SERVER['REMOTE_ADDR'] ?? null,
    $_SERVER['HTTP_USER_AGENT'] ?? null,
    $_SERVER['HTTP_REFERER'] ?? null
]);

http_response_code(200);
echo json_encode(['success' => true]);

?>