<?php
// track_visit.php – Store visitor data in the page_views table

// CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include database config (provides $pdo)
require_once __DIR__ . "/config.php";

// Get input (JSON or form data)
$input = file_get_contents("php://input");
$data = json_decode($input, true);
if (!$data) {
    $data = $_POST;
}

// Generate a session ID based on IP + user agent if not provided
$session_id = $data['session_id'] ?? null;
if (!$session_id) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
    $session_id = md5($ip . $ua);
}

$page = $data['page'] ?? '/';
$referer = $data['referrer'] ?? '';
$user_agent = $data['user_agent'] ?? $_SERVER['HTTP_USER_AGENT'] ?? '';
$ip_address = $_SERVER['REMOTE_ADDR'] ?? '';

try {
    // Insert into page_views table
    $stmt = $pdo->prepare("
        INSERT INTO page_views 
            (user_id, session_id, page, ip_address, user_agent, referer, created_at) 
        VALUES 
            (NULL, ?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([$session_id, $page, $ip_address, $user_agent, $referer]);

    // Get total count for response
    $countStmt = $pdo->query("SELECT COUNT(*) FROM page_views");
    $total = $countStmt->fetchColumn();

    http_response_code(200);
    echo json_encode(['success' => true, 'total' => (int)$total]);

} catch (PDOException $e) {
    error_log("Visitor tracking error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error']);
}

?>