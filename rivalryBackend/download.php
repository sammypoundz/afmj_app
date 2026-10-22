<?php
// download.php – Serve files with proper headers
// Public access allowed with ?public=1

// ===== TURN OFF OUTPUT BUFFERING =====
if (ob_get_level()) ob_end_clean();

// CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Session-Id");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ===== CUSTOM SESSION SAVE PATH =====
$customSessionPath = __DIR__ . '/sessions';
if (!is_dir($customSessionPath)) {
    mkdir($customSessionPath, 0755, true);
}
session_save_path($customSessionPath);

// Session (no cookies)
ini_set('session.use_cookies', 0);
$sessionId = $_SERVER['HTTP_X_SESSION_ID'] ?? null;
if ($sessionId) session_id($sessionId);
session_start();

// ============================================================
// AUTHENTICATION: allow public access if ?public=1 is set
// ============================================================
$public = isset($_GET['public']) && $_GET['public'] == '1';
if (!$public) {
    if (!isset($_SESSION['user_id'])) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Not authenticated']);
        exit;
    }
}

// ============================================================
// GET FILE PARAMETER
// ============================================================
$file = $_GET['file'] ?? '';
if (empty($file)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'No file specified']);
    exit;
}

// Remove leading 'uploads/' if present (DB stores paths like 'uploads/manuscripts/...')
$originalFile = $file;
$relativePath = $file;
if (strpos($relativePath, 'uploads/') === 0) {
    $relativePath = substr($relativePath, strlen('uploads/'));
}

// ============================================================
// RESOLVE FILE PATH – search multiple directories
// ============================================================
$baseDirs = [
    realpath(__DIR__ . '/uploads/'),              // api/uploads/
    realpath(__DIR__ . '/uploads/articles/'),     // api/uploads/articles/
    realpath(__DIR__ . '/../uploads/'),           // root/uploads/
    realpath(__DIR__ . '/../uploads/articles/'),  // root/uploads/articles/
    realpath(__DIR__ . '/../'),                   // root (for files like "HF FINAL.pdf")
    realpath(__DIR__ . '/../../'),                // one level above
];

$foundPath = null;
foreach ($baseDirs as $baseDir) {
    if (!$baseDir) continue;
    $candidate = realpath($baseDir . '/' . $relativePath);
    if ($candidate && strpos($candidate, $baseDir) === 0) {
        $foundPath = $candidate;
        break;
    }
}

// If not found, try searching for just the basename in uploads/articles/
if (!$foundPath) {
    $basename = basename($relativePath);
    $articleDirs = [
        realpath(__DIR__ . '/uploads/articles/'),
        realpath(__DIR__ . '/../uploads/articles/'),
    ];
    foreach ($articleDirs as $articleDir) {
        if (!$articleDir) continue;
        $candidate = realpath($articleDir . '/' . $basename);
        if ($candidate && strpos($candidate, $articleDir) === 0) {
            $foundPath = $candidate;
            break;
        }
    }
}

// If still not found, try the original path (maybe it's absolute or relative to script)
if (!$foundPath) {
    if (file_exists($file)) {
        $foundPath = realpath($file);
    }
}

if (!$foundPath || !file_exists($foundPath)) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'File not found', 'requested' => $originalFile, 'searched' => $relativePath]);
    exit;
}

// ============================================================
// MIME TYPE & DISPOSITION
// ============================================================
$ext = strtolower(pathinfo($foundPath, PATHINFO_EXTENSION));
$mimeMap = [
    'pdf'  => 'application/pdf',
    'doc'  => 'application/msword',
    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt'  => 'text/plain',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png'  => 'image/png',
    'gif'  => 'image/gif',
    'webp' => 'image/webp',
];
$mime = $mimeMap[$ext] ?? 'application/octet-stream';

$isImage = in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp']);
$disposition = $isImage ? 'inline' : 'attachment';

// ============================================================
// OUTPUT FILE
// ============================================================
if (ob_get_level()) ob_end_clean();

header('Content-Type: ' . $mime);
header('Content-Disposition: ' . $disposition . '; filename="' . basename($originalFile) . '"');
header('Content-Length: ' . filesize($foundPath));
header('Cache-Control: no-cache, must-revalidate');
header('Pragma: no-cache');

readfile($foundPath);
exit;
?>