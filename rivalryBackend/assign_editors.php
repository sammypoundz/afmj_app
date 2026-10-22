<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once "config.php";

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$data = json_decode(file_get_contents("php://input"), true);

$manuscript_id = $data['manuscript_id'] ?? null;
$editors = $data['editors'] ?? [];

if (!$manuscript_id) {
    echo json_encode(["status" => "error", "message" => "Manuscript ID required"]);
    exit;
}

/* Remove old assignments */
$pdo->prepare("DELETE FROM manuscript_editors WHERE manuscript_id = ?")
    ->execute([$manuscript_id]);

/* Insert new editors */
foreach ($editors as $editor_id) {
    $stmt = $pdo->prepare("
        INSERT INTO manuscript_editors (manuscript_id, editor_id)
        VALUES (?, ?)
    ");
    $stmt->execute([$manuscript_id, $editor_id]);
}

echo json_encode(["status" => "success"]);
?>