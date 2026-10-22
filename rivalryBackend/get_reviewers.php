<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require_once "config.php";

$stmt = $pdo->prepare("
    SELECT id, name 
    FROM users 
    WHERE role = 'reviewer'
    ORDER BY name ASC
");
$stmt->execute();

$reviewers = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    "status" => "success",
    "data" => $reviewers
]);

?>