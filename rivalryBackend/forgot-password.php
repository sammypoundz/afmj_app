<?php
// forgot-password.php
// Sends a 6-digit OTP to the user's email.

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Session-Id");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . "/config.php";
require_once __DIR__ . "/notification_helper.php";

$data = json_decode(file_get_contents("php://input"), true);
$email = trim($data['email'] ?? '');

if (!$email) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Email address is required']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid email address']);
    exit;
}

try {
    // Find user
    $stmt = $pdo->prepare("SELECT id, name, email FROM users WHERE email = ? AND active = 1 AND suspended = 0");
    $stmt->execute([$email]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        // Always return success to prevent user enumeration
        echo json_encode(['success' => true, 'message' => 'If the email exists, an OTP has been sent.']);
        exit;
    }

    // Generate 6-digit OTP
    $otp = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));

    // Store OTP and expiry in the user record
    $update = $pdo->prepare("UPDATE users SET reset_otp = ?, reset_otp_expires_at = ? WHERE id = ?");
    $update->execute([$otp, $expiresAt, $user['id']]);

    // Send email with OTP
    $subject = "Password Reset OTP, African Medical Journal";
    $body = "
        <p>Dear " . htmlspecialchars($user['name']) . ",</p>
        <p>You requested to reset your password. Your OTP is:</p>
        <h2 style='font-size: 2rem; letter-spacing: 4px;'><strong>{$otp}</strong></h2>
        <p>This OTP is valid for 15 minutes. If you did not request this, please ignore this email.</p>
        <p>Enter this OTP on the password reset page to set a new password.</p>
        " . SIGNATURE_EDITOR_IN_CHIEF . "
    ";

    $mailSent = sendEmail($user['email'], $subject, $body);
    if (!$mailSent) {
        error_log("Failed to send OTP email to {$user['email']}");
    }

    echo json_encode(['success' => true, 'message' => 'If the email exists, an OTP has been sent.']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}

?>