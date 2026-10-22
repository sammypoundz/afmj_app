<?php
// Enable error reporting (remove in production)
ini_set('display_errors', 1);
ini_set('log_errors', 0);
error_reporting(E_ALL);

// CORS configuration
$allowed_origin = '*';
header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Session-Id");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ===== FIX: Use a custom session save path inside your account =====
$customSessionPath = __DIR__ . '/sessions';  // Same folder as login.php uses
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

// Include database config
require_once __DIR__ . "/config.php";

// If session user_id is not set, return 401
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['authenticated' => false, 'error' => 'Not logged in']);
    exit;
}

// Fetch fresh user data
try {
    $stmt = $pdo->prepare("SELECT id, name, email, role, active, suspended FROM users WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user && $user['active'] == 1 && $user['suspended'] == 0) {
        echo json_encode([
            'authenticated' => true,
            'user' => [
                'id'    => $user['id'],
                'name'  => $user['name'],
                'email' => $user['email'],
                'role'  => $user['role']
            ]
        ]);
    } else {
        session_destroy();
        http_response_code(401);
        $error = $user ? 'Account inactive or suspended' : 'User not found';
        echo json_encode(['authenticated' => false, 'error' => $error]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['authenticated' => false, 'error' => 'Database error']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['authenticated' => false, 'error' => 'Server error']);
}
?>