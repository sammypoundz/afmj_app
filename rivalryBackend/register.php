<?php
// ==================== CORS HEADERS ====================
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Session-Id");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ==================== SESSION (if needed) ====================
$customSessionPath = __DIR__ . '/sessions';
if (!is_dir($customSessionPath)) {
    mkdir($customSessionPath, 0755, true);
}
session_save_path($customSessionPath);
ini_set('session.use_cookies', 0);
$sessionId = $_SERVER['HTTP_X_SESSION_ID'] ?? null;
if ($sessionId) session_id($sessionId);
session_start();

// ==================== REQUIREMENTS ====================
require_once __DIR__ . "/config.php";
require_once __DIR__ . "/notification_helper.php"; // loads PHPMailer & sendEmail()

// ==================== LOGGING HELPER ====================
function logEmailDebug($message, $data = []) {
    $logFile = __DIR__ . '/email_debug.log';
    $timestamp = date('Y-m-d H:i:s');
    $logEntry = "[$timestamp] $message";
    if (!empty($data)) {
        $logEntry .= " | " . json_encode($data);
    }
    $logEntry .= "\n";
    file_put_contents($logFile, $logEntry, FILE_APPEND);
}

// ==================== TABLE CHECK & ADD COLUMN ====================
function ensurePendingTableExists($pdo) {
    $table = 'pending_registrations';
    $check = $pdo->query("SHOW TABLES LIKE '$table'");
    if ($check->rowCount() == 0) {
        $sql = "
            CREATE TABLE pending_registrations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                name VARCHAR(255) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('author', 'reviewer', 'editor') NOT NULL DEFAULT 'author',
                specializations TEXT DEFAULT NULL,
                otp VARCHAR(10) NOT NULL,
                otp_expires_at DATETIME NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        ";
        $pdo->exec($sql);
        logEmailDebug("Created pending_registrations table");
    } else {
        // Check if specializations column exists
        $colCheck = $pdo->query("SHOW COLUMNS FROM pending_registrations LIKE 'specializations'");
        if ($colCheck->rowCount() == 0) {
            $pdo->exec("ALTER TABLE pending_registrations ADD specializations TEXT DEFAULT NULL AFTER role");
            logEmailDebug("Added specializations column to pending_registrations");
        }
    }
}

// Ensure users table has specializations column (it should already, but just in case)
function ensureUsersTableHasSpecializations($pdo) {
    $colCheck = $pdo->query("SHOW COLUMNS FROM users LIKE 'specializations'");
    if ($colCheck->rowCount() == 0) {
        $pdo->exec("ALTER TABLE users ADD specializations TEXT DEFAULT NULL");
        logEmailDebug("Added specializations column to users table");
    }
}

ensurePendingTableExists($pdo);
ensureUsersTableHasSpecializations($pdo);

// ==================== HELPER FUNCTIONS ====================
function jsonResponse($data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

function errorResponse(string $message, int $code = 400): void {
    jsonResponse(["error" => $message], $code);
}

function generateOTP($length = 6): string {
    return str_pad(random_int(0, 999999), $length, '0', STR_PAD_LEFT);
}

// ==================== BEAUTIFUL EMAIL TEMPLATES ====================
function getOtpEmailBody($name, $otp, $isResend = false) {
    $greeting = $isResend ? "You requested a new OTP for your registration." : "Thank you for registering with the African Medical Journal.";
    
    $logoUrl = "https://www.afmjonline.com/pages/user/images/logo.png";
    $loginUrl = "https://afmjonline.com/pages/auth/login.php";

    return "
    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; border-radius: 12px;'>
        <div style='text-align: center; margin-bottom: 20px;'>
            <img src='{$logoUrl}' alt='African Medical Journal' style='max-width: 160px; height: auto;' />
        </div>
        <div style='background: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);'>
            <h2 style='color: #16a34a; font-size: 24px; margin-top: 0;'>Verify Your Email</h2>
            <p style='color: #374151; font-size: 16px; line-height: 1.6;'>Dear <strong>" . htmlspecialchars($name) . "</strong>,</p>
            <p style='color: #374151; font-size: 16px; line-height: 1.6;'>{$greeting}</p>
            <p style='color: #374151; font-size: 16px; line-height: 1.6;'>To complete your registration, please use the One‑Time Password (OTP) below:</p>
            <div style='background: #f0fdf4; border: 2px solid #16a34a; border-radius: 10px; padding: 16px; text-align: center; margin: 24px 0;'>
                <span style='font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #16a34a;'>{$otp}</span>
            </div>
            <p style='color: #6b7280; font-size: 14px;'>This OTP is valid for <strong>15 minutes</strong>.</p>
            <p style='color: #6b7280; font-size: 14px;'>If you did not request this, please ignore this email.</p>
            <hr style='border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;' />
            <p style='color: #6b7280; font-size: 14px; text-align: center;'>
                Need help? <a href='mailto:support@afmjonline.com' style='color: #16a34a;'>Contact Support</a>
            </p>
            <p style='color: #6b7280; font-size: 14px; text-align: center;'>
                <a href='{$loginUrl}' style='color: #16a34a;'>Login to your account</a>
            </p>
        </div>
        <div style='text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;'>
            &copy; " . date('Y') . " African Medical Journal. All rights reserved.
        </div>
    </div>
    ";
}

// ==================== ACTIONS ====================
$action = $_GET['action'] ?? '';

try {
    switch ($action) {

        // --------------------------------------------------------
        // 1. INITIATE – store pending data & send OTP
        // --------------------------------------------------------
        case 'initiate':
            $data = json_decode(file_get_contents("php://input"), true);
            $name = trim($data['name'] ?? '');
            $email = trim($data['email'] ?? '');
            $password = $data['password'] ?? '';
            $role = trim($data['role'] ?? 'author');
            $specialty = trim($data['specialty'] ?? ''); // from frontend

            // Validation
            if (empty($name)) errorResponse("Full name is required");
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) errorResponse("Invalid email");
            if (strlen($password) < 6) errorResponse("Password must be at least 6 characters");
            if (!in_array($role, ['author', 'reviewer', 'editor'])) errorResponse("Invalid role");
            if (empty($specialty)) errorResponse("Specialty is required");

            // Check if email already exists in USERS (any status)
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                errorResponse("Email is already registered. Please log in or use a different email.", 409);
            }

            // Check for existing pending registration
            $stmt = $pdo->prepare("SELECT id, name, otp, otp_expires_at FROM pending_registrations WHERE email = ?");
            $stmt->execute([$email]);
            $pending = $stmt->fetch(PDO::FETCH_ASSOC);

            $hashed = password_hash($password, PASSWORD_DEFAULT);
            $otp = generateOTP(6);
            $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));

            if ($pending) {
                $stmt = $pdo->prepare("
                    UPDATE pending_registrations 
                    SET name = ?, password_hash = ?, role = ?, specializations = ?, otp = ?, otp_expires_at = ?
                    WHERE email = ?
                ");
                $stmt->execute([$name, $hashed, $role, $specialty, $otp, $expiresAt, $email]);
                logEmailDebug("Updated pending registration for $email");
            } else {
                $stmt = $pdo->prepare("
                    INSERT INTO pending_registrations (email, name, password_hash, role, specializations, otp, otp_expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([$email, $name, $hashed, $role, $specialty, $otp, $expiresAt]);
                logEmailDebug("Created pending registration for $email");
            }

            // Send OTP email
            $subject = "Verify your email – African Medical Journal";
            $body = getOtpEmailBody($name, $otp, false);

            logEmailDebug("Attempting to send OTP to $email", ['subject' => $subject]);

            try {
                $emailSent = sendEmail($email, $subject, $body);
                logEmailDebug("sendEmail result: " . ($emailSent ? 'true' : 'false'));
            } catch (Exception $e) {
                logEmailDebug("sendEmail threw exception: " . $e->getMessage());
                $emailSent = false;
            }

            if (!$emailSent) {
                logEmailDebug("FAILED to send OTP to $email");
            } else {
                logEmailDebug("OTP sent successfully to $email");
            }

            jsonResponse([
                'success' => true,
                'message' => $emailSent ? 'Verification code sent to your email.' : 'Unable to send email. Please try again later or contact support.',
                'email'   => $email,
                'email_sent' => $emailSent
            ], 200);
            break;

        // --------------------------------------------------------
        // 2. COMPLETE – verify OTP and create the actual user
        // --------------------------------------------------------
        case 'complete':
            $data = json_decode(file_get_contents("php://input"), true);
            $email = trim($data['email'] ?? '');
            $otp = trim($data['otp'] ?? '');

            if (empty($email) || empty($otp)) {
                errorResponse("Email and OTP are required");
            }

            $stmt = $pdo->prepare("
                SELECT id, name, password_hash, role, specializations, otp_expires_at
                FROM pending_registrations
                WHERE email = ? AND otp = ?
            ");
            $stmt->execute([$email, $otp]);
            $pending = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$pending) {
                errorResponse("Invalid OTP", 400);
            }

            if (strtotime($pending['otp_expires_at']) < time()) {
                errorResponse("OTP has expired. Please request a new one.", 400);
            }

            // Double-check user doesn't already exist
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$email]);
            if ($stmt->fetch()) {
                $stmt = $pdo->prepare("DELETE FROM pending_registrations WHERE email = ?");
                $stmt->execute([$email]);
                errorResponse("This email is already registered. Please log in.", 409);
            }

            // Create user
            $stmt = $pdo->prepare("
                INSERT INTO users (name, email, password, role, active, email_verified, specializations, created_at)
                VALUES (?, ?, ?, ?, 1, 1, ?, NOW())
            ");
            $stmt->execute([
                $pending['name'],
                $email,
                $pending['password_hash'],
                $pending['role'],
                $pending['specializations']
            ]);
            $userId = $pdo->lastInsertId();

            // If role is reviewer, also insert specialties into reviewer_expertise
            if ($pending['role'] === 'reviewer' && !empty($pending['specializations'])) {
                $specialtyArray = array_map('trim', explode(',', $pending['specializations']));
                $insExp = $pdo->prepare("INSERT INTO reviewer_expertise (reviewer_id, expertise) VALUES (?, ?)");
                foreach ($specialtyArray as $exp) {
                    if (!empty($exp)) {
                        $insExp->execute([$userId, $exp]);
                    }
                }
            }

            $stmt = $pdo->prepare("DELETE FROM pending_registrations WHERE email = ?");
            $stmt->execute([$email]);

            // Send welcome notification with login link
            if (function_exists('createNotification')) {
                $loginLink = 'https://www.afmjonline.com/dev/login';
                $userName = htmlspecialchars($pending['name']);
                $welcomeHtml = "
                    <p>Dear {$userName},</p>
                    <p>Your email has been successfully verified. You can now access all features.</p>
                    <p><a href='{$loginLink}'>Click here to login to your dashboard</a></p>
                    " . SIGNATURE_EDITOR_IN_CHIEF . "
                ";
                createNotification(
                    $userId,
                    'welcome',
                    'Welcome to AFMJ',
                    '', // description is ignored when customHtml is provided
                    null,
                    $welcomeHtml
                );
            }

            jsonResponse([
                'success' => true,
                'message' => 'Account created successfully. <a href="https://www.afmjonline.com/dev/login">Click here to login</a>',
                'login_url' => 'https://www.afmjonline.com/dev/login'
            ]);
            break;

        // --------------------------------------------------------
        // 3. RESEND – resend OTP for pending registration
        // --------------------------------------------------------
        case 'resend':
            $data = json_decode(file_get_contents("php://input"), true);
            $email = trim($data['email'] ?? '');

            if (empty($email)) errorResponse("Email is required");

            $stmt = $pdo->prepare("SELECT id, name FROM pending_registrations WHERE email = ?");
            $stmt->execute([$email]);
            $pending = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$pending) {
                errorResponse("No pending registration found for this email", 404);
            }

            $otp = generateOTP(6);
            $expiresAt = date('Y-m-d H:i:s', strtotime('+15 minutes'));

            $stmt = $pdo->prepare("
                UPDATE pending_registrations
                SET otp = ?, otp_expires_at = ?
                WHERE id = ?
            ");
            $stmt->execute([$otp, $expiresAt, $pending['id']]);

            $subject = "Resend OTP – African Medical Journal";
            $body = getOtpEmailBody($pending['name'], $otp, true);

            logEmailDebug("Resending OTP to $email");
            try {
                $emailSent = sendEmail($email, $subject, $body);
            } catch (Exception $e) {
                logEmailDebug("sendEmail exception on resend: " . $e->getMessage());
                $emailSent = false;
            }

            if (!$emailSent) {
                logEmailDebug("FAILED to resend OTP to $email");
            }

            jsonResponse([
                'success' => true,
                'message' => $emailSent ? 'A new OTP has been sent to your email.' : 'Unable to send email. Please try again later.',
                'email_sent' => $emailSent
            ]);
            break;

        default:
            errorResponse("Invalid action '$action'. Allowed: initiate, complete, resend", 400);
    }
} catch (PDOException $e) {
    logEmailDebug("DB Error: " . $e->getMessage());
    error_log("Register API DB Error: " . $e->getMessage());
    errorResponse("Database error", 500);
} catch (Exception $e) {
    logEmailDebug("General Error: " . $e->getMessage());
    error_log("Register API Error: " . $e->getMessage());
    errorResponse($e->getMessage(), 500);
}
?>