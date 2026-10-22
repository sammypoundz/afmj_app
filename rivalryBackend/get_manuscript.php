<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

require_once "config.php";

$slug = $_GET['slug'] ?? null;

if (!$slug) {
    echo json_encode(["status" => "error", "message" => "Slug required"]);
    exit;
}

/* ================= MAIN MANUSCRIPT ================= */
$stmt = $pdo->prepare("
    SELECT * FROM manuscripts
    WHERE slug = ?
");
$stmt->execute([$slug]);
$manuscript = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$manuscript) {
    echo json_encode(["status" => "error", "message" => "Not found"]);
    exit;
}

/* ================= AUTHORS (ARRAY FIX) ================= */
$authorStmt = $pdo->prepare("
    SELECT a.id, a.name
    FROM manuscript_authors ma
    JOIN authors a ON ma.author_id = a.id
    WHERE ma.manuscript_id = ?
");
$authorStmt->execute([$manuscript['id']]);
$authors = $authorStmt->fetchAll(PDO::FETCH_ASSOC);

/* ================= REVIEWERS ================= */
$reviewStmt = $pdo->prepare("
    SELECT u.id, u.name, r.status, r.comment, r.attachment
    FROM reviews r
    JOIN users u ON r.reviewer_id = u.id
    WHERE r.manuscript_id = ?
");
$reviewStmt->execute([$manuscript['id']]);
$reviewers = $reviewStmt->fetchAll(PDO::FETCH_ASSOC);

/* ================= EDITORS ================= */
$editorStmt = $pdo->prepare("
    SELECT u.id, u.name
    FROM manuscript_editors me
    JOIN users u ON me.editor_id = u.id
    WHERE me.manuscript_id = ?
");
$editorStmt->execute([$manuscript['id']]);
$editors = $editorStmt->fetchAll(PDO::FETCH_ASSOC);

/* ================= REVISIONS ================= */
$revStmt = $pdo->prepare("
    SELECT *
    FROM revisions
    WHERE manuscript_id = ?
    ORDER BY revision_number ASC
");
$revStmt->execute([$manuscript['id']]);
$revisions = $revStmt->fetchAll(PDO::FETCH_ASSOC);

/* ================= RESPONSE ================= */
echo json_encode([
    "status" => "success",
    "data" => [
        "id" => (int)$manuscript['id'],
        "slug" => $manuscript['slug'],
        "title" => $manuscript['title'],
        "study_type" => $manuscript['study_type'],
        "status" => $manuscript['status'],
        "submitted_at" => $manuscript['submitted_at'],
        "abstract" => $manuscript['abstract'],
        "background" => $manuscript['background'],
        "conclusion" => $manuscript['conclusion'],
        "authors" => $authors,                 // ✅ now array
        "reviewers" => $reviewers,             // ✅ includes id
        "editors" => $editors,                 // ✅ array of objects
        "revisions" => $revisions
    ]
]);

?>