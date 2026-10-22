<?php
// Enable error reporting (remove in production)
ini_set('display_errors', 1);
ini_set('log_errors', 0);
error_reporting(E_ALL);

// CORS configuration
$allowed_origin = '*'; // Change to your production domain
header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Session-Id");
header("Content-Type: application/json");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ===== FIX: Use a custom session save path inside your account =====
$customSessionPath = __DIR__ . '/sessions';  // Creates "sessions" folder next to login.php
if (!is_dir($customSessionPath)) {
    mkdir($customSessionPath, 0755, true);   // Create recursively with proper permissions
}
session_save_path($customSessionPath);       // Tell PHP to use this folder
// ===== END FIX =====

// Include database config
require_once __DIR__ . "/config.php";

// Verify database connection
if (!$pdo) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database connection failed']);
    exit;
}

// Get input
$data = json_decode(file_get_contents("php://input"), true);
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Email and password required']);
    exit;
}

try {
    // Check password column exists (debug)
    $checkColumn = $pdo->query("SHOW COLUMNS FROM users LIKE 'password'");
    if ($checkColumn->rowCount() == 0) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: password column missing. Please run the database update.']);
        exit;
    }

    // Fetch user
    $stmt = $pdo->prepare("
        SELECT id, name, email, role, password, active, suspended 
        FROM users 
        WHERE email = ?
    ");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    // Validate credentials and account status
    if (!$user || !password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'error' => 'Invalid credentials']);
        exit;
    }

    if ($user['active'] != 1 || $user['suspended'] == 1) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Account is inactive or suspended']);
        exit;
    }

    // ===== SESSION CONFIGURATION (no cookies) =====
    // Disable session cookies entirely – we'll pass the session ID manually
    ini_set('session.use_cookies', 0);
    
    // Start the session (now using the custom path we set above)
    session_start();
    
    // Store user data in session
    $_SESSION['user_id']    = $user['id'];
    $_SESSION['user_name']  = $user['name'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_role']  = $user['role'];
    
    // Regenerate session ID to prevent fixation
    session_regenerate_id(true);
    
    // ===== RESPONSE =====
    echo json_encode([
        'success'    => true,
        'user'       => [
            'id'    => $user['id'],
            'name'  => $user['name'],
            'email' => $user['email'],
            'role'  => $user['role']
        ],
        'session_id' => session_id()
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}
?>