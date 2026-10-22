<?php
// Enable error reporting (remove in production)
ini_set('display_errors', 1);
ini_set('log_errors', 0);
error_reporting(E_ALL);

// CORS configuration
$allowed_origin = '*';
header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Session-Id");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ===== FIX: Use a custom session save path inside your account =====
$customSessionPath = __DIR__ . '/sessions';  // Same folder as login.php and me.php
if (!is_dir($customSessionPath)) {
    mkdir($customSessionPath, 0755, true);
}
session_save_path($customSessionPath);
// ===== END FIX =====

// ===== SESSION CONFIGURATION (no cookies) =====
ini_set('session.use_cookies', 0);

// Get session ID from custom header
$sessionId = $_SERVER['HTTP_X_SESSION_ID'] ?? null;
if ($sessionId) {
    session_id($sessionId);
}

// Start the session
session_start();

// Clear and destroy session
$_SESSION = [];
session_destroy();

echo json_encode(['success' => true, 'message' => 'Logged out']);
?>