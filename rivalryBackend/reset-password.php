<?php
// reset-password.php
// Verifies OTP and resets password.

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
$otp = trim($data['otp'] ?? '');
$newPassword = $data['password'] ?? '';

if (!$email || !$otp || !$newPassword) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Email, OTP, and new password are required']);
    exit;
}

if (strlen($otp) !== 6 || !ctype_digit($otp)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'OTP must be a 6-digit number']);
    exit;
}

if (strlen($newPassword) < 6) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Password must be at least 6 characters']);
    exit;
}

try {
    // Find user with matching OTP (expiry checked in PHP so the same
    // clock/timezone that created the OTP also validates it -- avoids
    // PHP vs MySQL timezone mismatches that make valid OTPs look expired)
    $stmt = $pdo->prepare("
        SELECT id, name, email, reset_otp_expires_at FROM users 
        WHERE email = ? 
          AND reset_otp = ? 
          AND active = 1 
          AND suspended = 0
    ");
    $stmt->execute([$email, $otp]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user || empty($user['reset_otp_expires_at']) || strtotime($user['reset_otp_expires_at']) <= time()) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Invalid or expired OTP']);
        exit;
    }

    // Clear OTP fields
    $clear = $pdo->prepare("UPDATE users SET reset_otp = NULL, reset_otp_expires_at = NULL WHERE id = ?");
    $clear->execute([$user['id']]);

    // Hash and update password
    $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);
    $update = $pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
    $update->execute([$hashedPassword, $user['id']]);

    // Send confirmation email
    $subject = "Your Password Has Been Reset, African Medical Journal";
    $body = "
        <p>Dear " . htmlspecialchars($user['name']) . ",</p>
        <p>Your password for the African Medical Journal has been successfully reset.</p>
        <p>If you did not request this change, please contact our support team immediately at <a href='mailto:editorial@afmjonline.com'>editorial@afmjonline.com</a>.</p>
        <p>You can now log in with your new password:</p>
        <p><a href='https://afmjonline.com/dev/login' style='background:#16a34a;color:#fff;padding:10px 20px;text-decoration:none;border-radius:40px;'>Login to Your Account</a></p>
        <p>If you have any questions, feel free to reply to this email.</p>
        " . SIGNATURE_EDITOR_IN_CHIEF . "
    ";

    $emailSent = sendEmail($user['email'], $subject, $body);
    if (!$emailSent) {
        error_log("Password reset confirmation email failed to send for user {$user['email']}");
    }

    echo json_encode(['success' => true, 'message' => 'Password has been reset successfully.']);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Server error: ' . $e->getMessage()]);
}

?>