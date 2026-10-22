<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
require_once "config.php";

$data = json_decode(file_get_contents("php://input"), true);

$manuscript_id = $data['manuscript_id'];
$reviewers = $data['reviewers'];

$pdo->prepare("DELETE FROM reviews WHERE manuscript_id = ?")
    ->execute([$manuscript_id]);

foreach ($reviewers as $reviewer_id) {
    $stmt = $pdo->prepare("
        INSERT INTO reviews (manuscript_id, reviewer_id, status)
        VALUES (?, ?, 'not_opened')
    ");
    $stmt->execute([$manuscript_id, $reviewer_id]);
}

echo json_encode(["status" => "success"]);
?>