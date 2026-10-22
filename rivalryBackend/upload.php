<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Configuration
$targetDir = __DIR__ . "/uploads/";
$maxFileSize = 10 * 1024 * 1024; // 10MB
$allowedExtensions = ['pdf', 'doc', 'docx', 'txt'];

// Create directory if it doesn't exist
if (!file_exists($targetDir)) {
    mkdir($targetDir, 0755, true);
}

if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded']);
    exit;
}

$file = $_FILES['file'];

// Check for upload errors
if ($file['error'] !== UPLOAD_ERR_OK) {
    $errors = [
        UPLOAD_ERR_INI_SIZE   => 'File exceeds upload_max_filesize',
        UPLOAD_ERR_FORM_SIZE  => 'File exceeds MAX_FILE_SIZE',
        UPLOAD_ERR_PARTIAL    => 'File only partially uploaded',
        UPLOAD_ERR_NO_FILE    => 'No file uploaded',
        UPLOAD_ERR_NO_TMP_DIR => 'Missing temporary folder',
        UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
        UPLOAD_ERR_EXTENSION  => 'File upload stopped by extension',
    ];
    $message = $errors[$file['error']] ?? 'Unknown upload error';
    http_response_code(400);
    echo json_encode(['error' => $message]);
    exit;
}

// Check file size
if ($file['size'] > $maxFileSize) {
    http_response_code(400);
    echo json_encode(['error' => "File exceeds maximum size of 10MB"]);
    exit;
}

// Validate extension
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (!in_array($ext, $allowedExtensions)) {
    http_response_code(400);
    echo json_encode(['error' => "File type not allowed. Allowed: " . implode(', ', $allowedExtensions)]);
    exit;
}

// Generate safe filename
$safeName = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9\.\-]/', '_', $file['name']);
$targetPath = $targetDir . $safeName;

if (move_uploaded_file($file['tmp_name'], $targetPath)) {
    // Return relative path (adjust base URL as needed)
    echo json_encode(['path' => 'uploads/' . $safeName]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to move uploaded file']);
}

?>