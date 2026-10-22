<?php
// ==================== CORS HEADERS ====================
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
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

$userId = $_SESSION['user_id'];

// ==================== REQUIREMENTS ====================
require_once __DIR__ . "/config.php";

try {
    $stmt = $pdo->prepare("SELECT email_verified, email FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'email_verified' => (bool)$user['email_verified'],
        'email' => $user['email']
    ]);
} catch (PDOException $e) {
    error_log("Verification API DB Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
?>