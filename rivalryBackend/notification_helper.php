<?php
// notification_helper.php
require_once __DIR__ . "/config.php";

require_once __DIR__ . '/phpmailer/src/Exception.php';
require_once __DIR__ . '/phpmailer/src/PHPMailer.php';
require_once __DIR__ . '/phpmailer/src/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// ==================== CONSTANTS ====================
define('DASHBOARD_URL', 'https://afmjonline.com/dev/login');

// ==================== EMAIL TEMPLATES (Branding & Signature) ====================
define('EMAIL_HEADER', '
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>African Medical Journal</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { border-bottom: 2px solid #0066cc; padding-bottom: 10px; margin-bottom: 20px; }
        .footer { margin-top: 30px; padding-top: 10px; border-top: 1px solid #ddd; font-size: 12px; color: #777; text-align: center; }
        .signature { margin-top: 20px; font-style: italic; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h2>African Medical Journal</h2>
    </div>
');

define('EMAIL_FOOTER', '
    <div class="footer">
        <p>African Medical Journal &copy; ' . date('Y') . ' | <a href="' . DASHBOARD_URL . '">Author Dashboard</a></p>
    </div>
</div>
</body>
</html>
');

// Updated signature – no qualifications
define('SIGNATURE_EDITOR_IN_CHIEF', '
<div class="signature">
    <p>Yours sincerely,</p>
    <p>
        Ikechukwuka I. Alioke<br/>
        Editor-in-Chief,<br/>
        African Medical Journal<br/>
    </p>
</div>
');

/**
 * Format manuscript slug as a readable ID (e.g., "AFMJ-2025-001").
 */
function formatManuscriptId($slug) {
    return strtoupper($slug);
}

/**
 * Send an email using PHPMailer with optional attachments.
 * Automatically wraps the body in the professional header/footer if not already.
 */
function sendEmail($to, $subject, $body, $attachments = []) {
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = 'www.afmjonline.com';
        $mail->SMTPAuth   = true;
        $mail->Username   = 'afmjmailer@afmjonline.com';
        $mail->Password   = 'Precious1035@';
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port       = 465;

        $mail->setFrom('editorinchief@afmjonline.com', 'African Medical Journal');
        $mail->addAddress($to);

        $mail->isHTML(true);
        $mail->Subject = $subject;

        // Wrap in header/footer if no full HTML structure is present
        if (stripos($body, '<!DOCTYPE') === false && stripos($body, '<html') === false) {
            $fullBody = EMAIL_HEADER . $body . EMAIL_FOOTER;
        } else {
            $fullBody = $body;
        }
        $mail->Body = $fullBody;
        $mail->AltBody = strip_tags(str_replace(['<br>', '<br/>', '<br />', '</p>'], "\n", $body));

        foreach ($attachments as $filePath) {
            $fullPath = __DIR__ . '/../' . ltrim($filePath, '/');
            if (file_exists($fullPath)) {
                $mail->addAttachment($fullPath);
            } else {
                error_log("Attachment not found: $fullPath");
            }
        }

        $mail->send();
        return true;
    } catch (Exception $e) {
        error_log("Email to $to failed: " . $mail->ErrorInfo);
        return false;
    }
}

/**
 * Alias for sendEmail with attachments.
 */
function sendEmailWithAttachments($to, $subject, $body, $attachments = []) {
    return sendEmail($to, $subject, $body, $attachments);
}

/**
 * Create notifications for one or more users and send formatted emails.
 *
 * @param int|array $userIds Single user ID or array of user IDs.
 * @param string $type Notification type (e.g., 'manuscript-submitted', 'review-requested').
 * @param string $title Email subject / notification title.
 * @param string $description Email body (plain text, will be formatted).
 * @param int|null $manuscriptId Optional related manuscript ID.
 * @param string|null $customHtml Optional custom HTML body (overrides built formatting).
 * @return bool True if at least one notification succeeded.
 */
function createNotification($userIds, $type, $title, $description, $manuscriptId = null, $customHtml = null) {
    global $pdo;

    if (!is_array($userIds)) {
        $userIds = [$userIds];
    }

    $success = false;

    foreach ($userIds as $userId) {
        try {
            // Insert into database
            $stmt = $pdo->prepare("
                INSERT INTO notifications (user_id, type, title, description, related_manuscript_id, created_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            ");
            $stmt->execute([$userId, $type, $title, $description, $manuscriptId]);

            // Fetch user details for email (active, not suspended)
            $userStmt = $pdo->prepare("SELECT email, name, role FROM users WHERE id = ? AND active = 1 AND suspended = 0");
            $userStmt->execute([$userId]);
            $user = $userStmt->fetch(PDO::FETCH_ASSOC);

            if ($user) {
                if ($customHtml) {
                    $body = $customHtml;
                } else {
                    // Generic professional format with new signature
                    $greeting = "Dear " . ucfirst($user['role']) . " " . htmlspecialchars($user['name']) . ",";
                    $body = "
                        <p>{$greeting}</p>
                        <p>" . nl2br(htmlspecialchars($description)) . "</p>
                        <p>You can log in to your dashboard at: <a href='" . DASHBOARD_URL . "'>" . DASHBOARD_URL . "</a></p>
                        " . SIGNATURE_EDITOR_IN_CHIEF . "
                    ";
                }
                sendEmail($user['email'], $title, $body);
            }

            $success = true;
        } catch (Exception $e) {
            error_log("Notification creation failed for user $userId: " . $e->getMessage());
        }
    }

    return $success;
}

// ==================== SPECIFIC EMAIL BODY GENERATORS ====================

/**
 * Generate rejection email body (includes dashboard link).
 */
function generateRejectionEmailBody($manuscript, $feedbacks = [], $customReason = null) {
    global $pdo;

    if (empty($manuscript['slug']) && !empty($manuscript['id'])) {
        $stmt = $pdo->prepare("SELECT slug FROM manuscripts WHERE id = ?");
        $stmt->execute([$manuscript['id']]);
        $slug = $stmt->fetchColumn();
        if ($slug) {
            $manuscript['slug'] = $slug;
        }
    }
    $formattedId = isset($manuscript['slug']) ? formatManuscriptId($manuscript['slug']) : 'N/A';

    $body = "
        <p>African Medical Journal</p>
        <p>Ref.: No. {$formattedId}</p>
        <p>Title: " . htmlspecialchars($manuscript['title']) . "</p>
        <p>Dear " . htmlspecialchars($manuscript['author_name']) . ",</p>
        <p>Reviewers' comments on your work have now been received. You will see that they are advising against publication of your work. Therefore, I must reject it.</p>
        <p>For your guidance, I append the reviewers' comments below.</p>
        <p>Thank you for giving us the opportunity to consider your work.</p>
        " . SIGNATURE_EDITOR_IN_CHIEF . "
        <p><strong>Reviewers' comments:</strong></p>
    ";
    if (!empty($feedbacks['e_feedback'])) {
        $body .= "<p>Reviewer #1: " . nl2br(htmlspecialchars($feedbacks['e_feedback'])) . "</p>";
    }
    if (!empty($feedbacks['r_feedback'])) {
        $body .= "<p>Reviewer #2: " . nl2br(htmlspecialchars($feedbacks['r_feedback'])) . "</p>";
    }
    if ($customReason) {
        $body .= "<p><strong>Additional reason:</strong> " . nl2br(htmlspecialchars($customReason)) . "</p>";
    }
    $body .= "<p><a href='" . DASHBOARD_URL . "'>Login to your account</a> for more details.</p>";
    return $body;
}

/**
 * Generate revision request email body (includes dashboard link).
 */
function generateRevisionEmailBody($manuscript, $feedbacks = [], $revisionLink = 'https://afmjonline.com/pages/auth/login.php', $tabName = 'Revision Submission') {
    global $pdo;

    if (empty($manuscript['slug']) && !empty($manuscript['id'])) {
        $stmt = $pdo->prepare("SELECT slug FROM manuscripts WHERE id = ?");
        $stmt->execute([$manuscript['id']]);
        $slug = $stmt->fetchColumn();
        if ($slug) {
            $manuscript['slug'] = $slug;
        }
    }
    $formattedId = isset($manuscript['slug']) ? formatManuscriptId($manuscript['slug']) : 'N/A';

    $body = "
        <p>Dear " . htmlspecialchars($manuscript['author_name']) . ",</p>
        <p>Revision requested for your manuscript {$formattedId}.</p>
        <p>To begin revision, click on the link <a href='{$revisionLink}'>{$revisionLink}</a> and go to <strong>{$tabName}</strong>.</p>
        <p>You can also log in via the dashboard: <a href='" . DASHBOARD_URL . "'>" . DASHBOARD_URL . "</a></p>
        " . SIGNATURE_EDITOR_IN_CHIEF . "
    ";
    if (!empty($feedbacks)) {
        $body .= "<p><strong>Reviewers' comments:</strong></p>";
        if (!empty($feedbacks['e_feedback'])) {
            $body .= "<p>Reviewer #1: " . nl2br(htmlspecialchars($feedbacks['e_feedback'])) . "</p>";
        }
        if (!empty($feedbacks['r_feedback'])) {
            $body .= "<p>Reviewer #2: " . nl2br(htmlspecialchars($feedbacks['r_feedback'])) . "</p>";
        }
    }
    return $body;
}

/**
 * Generate reviewer invitation email body (includes dashboard link).
 */
function generateReviewerInvitationEmailBody($manuscript, $reviewerName, $reviewerEmail, $plainPassword = null) {
    global $pdo;

    if (empty($manuscript['slug']) && !empty($manuscript['id'])) {
        $stmt = $pdo->prepare("SELECT slug FROM manuscripts WHERE id = ?");
        $stmt->execute([$manuscript['id']]);
        $slug = $stmt->fetchColumn();
        if ($slug) {
            $manuscript['slug'] = $slug;
        }
    }
    $formattedId = isset($manuscript['slug']) ? formatManuscriptId($manuscript['slug']) : 'N/A';

    $body = "
        <p>Dear " . htmlspecialchars($reviewerName) . ",</p>
        <p>You have been invited to review the manuscript {$formattedId}. Please log in to accept or decline.</p>
        <p><a href='" . DASHBOARD_URL . "'>Click here to login</a></p>
    ";
    if ($plainPassword) {
        $body .= "<p>Your Email login is {$reviewerEmail} and your password: {$plainPassword}</p>";
    }
    $body .= SIGNATURE_EDITOR_IN_CHIEF;
    return $body;
}

// ==================== PUBLICATION STAGE EMAIL GENERATORS (with dashboard link) ====================

/**
 * Generate email body for "Payment required" – includes dashboard link.
 */
function generatePaymentRequiredBody($manuscript, $authorName) {
    $formattedId = isset($manuscript['slug']) ? formatManuscriptId($manuscript['slug']) : 'N/A';
    return "
        <p>Dear " . htmlspecialchars($authorName) . ",</p>
        <p>Congratulations once again on your accepted manuscript. You are required to pay the article processing fees with the details below in order to progress with the publication:</p>
        <p><strong>Account Name:</strong> MDCAN - FMCA<br/>
        <strong>Account Number:</strong> 1014603854<br/>
        <strong>Amount:</strong> N42,000 OR \$30</p>
        <p>After making payment, you are required to upload the evidence of payment on your portal.</p>
        <p>You can log in to your dashboard at: <a href='" . DASHBOARD_URL . "'>" . DASHBOARD_URL . "</a></p>
        <p>Kind regards.<br/>Editorial Team.</p>
        " . SIGNATURE_EDITOR_IN_CHIEF . "
    ";
}

/**
 * Generate email body for "Galley proof sent" – includes dashboard link.
 */
function generateGalleyProofSentBody($manuscript, $authorName) {
    $formattedId = isset($manuscript['slug']) ? formatManuscriptId($manuscript['slug']) : 'N/A';
    return "
        <p>Dear " . htmlspecialchars($authorName) . ",</p>
        <p>Galley proof for your manuscript {$formattedId} has been sent. Please review and respond.</p>
        <p>Log in to your dashboard to view and respond: <a href='" . DASHBOARD_URL . "'>" . DASHBOARD_URL . "</a></p>
        " . SIGNATURE_EDITOR_IN_CHIEF . "
    ";
}

/**
 * Generate email body for "Galley proof approved" – includes dashboard link.
 */
function generateGalleyProofApprovedBody($manuscript, $authorName) {
    $formattedId = isset($manuscript['slug']) ? formatManuscriptId($manuscript['slug']) : 'N/A';
    return "
        <p>Dear " . htmlspecialchars($authorName) . ",</p>
        <p>Your galley proof for manuscript {$formattedId} has been approved. It will now be prepared for publication.</p>
        <p>You can track the progress in your dashboard: <a href='" . DASHBOARD_URL . "'>" . DASHBOARD_URL . "</a></p>
        " . SIGNATURE_EDITOR_IN_CHIEF . "
    ";
}

/**
 * Generate email body for "Manuscript published" – includes dashboard link.
 */
function generateManuscriptPublishedBody($manuscript, $authorName) {
    $formattedId = isset($manuscript['slug']) ? formatManuscriptId($manuscript['slug']) : 'N/A';
    return "
        <p>Dear " . htmlspecialchars($authorName) . ",</p>
        <p>Congratulations! Your manuscript {$formattedId} has been published.</p>
        <p>View your published manuscript in your dashboard: <a href='" . DASHBOARD_URL . "'>" . DASHBOARD_URL . "</a></p>
        " . SIGNATURE_EDITOR_IN_CHIEF . "
    ";
}

// ==================== HELPER FUNCTIONS FOR USER FETCHING ====================

function getManuscriptAuthorId($manuscriptId) {
    global $pdo;
    $stmt = $pdo->prepare("SELECT author_id FROM manuscripts WHERE id = ?");
    $stmt->execute([$manuscriptId]);
    $row = $stmt->fetch();
    return $row ? (int)$row['author_id'] : null;
}

function getAssignedEditorId($manuscriptId) {
    global $pdo;
    $stmt = $pdo->prepare("SELECT editor_id FROM manuscripts WHERE id = ? AND editor_id IS NOT NULL");
    $stmt->execute([$manuscriptId]);
    $row = $stmt->fetch();
    return $row ? (int)$row['editor_id'] : null;
}

function getReviewerIdsForManuscript($manuscriptId) {
    global $pdo;
    $stmt = $pdo->prepare("SELECT reviewer_id FROM reviews WHERE manuscript_id = ? AND status = 'completed'");
    $stmt->execute([$manuscriptId]);
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

function getAllEditorIds() {
    global $pdo;
    $stmt = $pdo->query("SELECT id FROM users WHERE role IN ('editor','publisher') AND active = 1 AND suspended = 0");
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

function getEditorInChiefId() {
    global $pdo;
    $stmt = $pdo->prepare("SELECT id FROM users WHERE role = 'editor' AND active = 1 AND suspended = 0 ORDER BY id LIMIT 1");
    $stmt->execute();
    $row = $stmt->fetch();
    return $row ? (int)$row['id'] : null;
}

// ==================== ADMIN NOTIFICATIONS (UPDATED) ====================

/**
 * Get user IDs for system administrators (admins and publishers).
 * Editors are excluded to avoid mass emails for new submissions.
 */
function getAdminIds() {
    global $pdo;
    $stmt = $pdo->prepare("SELECT id FROM users WHERE role IN ('admin', 'publisher') AND active = 1 AND suspended = 0");
    $stmt->execute();
    return $stmt->fetchAll(PDO::FETCH_COLUMN);
}

/**
 * Send a notification and email to all admin users.
 * This is used for system-wide alerts (new submissions, payments, etc.)
 */
function notifyAdmins($type, $title, $description, $manuscriptId = null) {
    $adminIds = getAdminIds();
    if (empty($adminIds)) {
        return;
    }
    createNotification($adminIds, $type, $title, $description, $manuscriptId);
}

// ==================== ACTIVITY LOGGING ====================

function logActivity($userId, $action, $details = '') {
    global $pdo;
    $stmt = $pdo->prepare("
        INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
    ");
    $stmt->execute([
        $userId,
        $action,
        $details,
        $_SERVER['REMOTE_ADDR'] ?? null,
        $_SERVER['HTTP_USER_AGENT'] ?? null
    ]);
}
?>