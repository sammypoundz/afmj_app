<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . "/config.php";

$action = $_GET['action'] ?? '';

function jsonResponse($data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

function errorResponse(string $message, int $code = 400): void {
    jsonResponse(["error" => $message], $code);
}

try {

switch ($action) {

    case "dashboardCounts":
        // New Submissions: only those not soft-deleted
        $newSubmissions = $pdo->query("
            SELECT COUNT(*) 
            FROM manuscripts 
            WHERE status = 'submitted' AND deleted_at IS NULL
        ")->fetchColumn();

        // Under Review: status-driven (assigned to reviewers/editor, awaiting reviews)
        $underReview = $pdo->query("
            SELECT COUNT(*)
            FROM manuscripts
            WHERE status = 'under_review'
              AND deleted_at IS NULL
        ")->fetchColumn();

        // Revision Requested: admin requested a revision; waiting for author to resubmit.
        $revisionRequested = $pdo->query("
            SELECT COUNT(*)
            FROM manuscripts
            WHERE status = 'revision_requested'
              AND deleted_at IS NULL
        ")->fetchColumn();

        // Revised: author has resubmitted the revision; waiting for admin to reassign reviewers.
        $revised = $pdo->query("
            SELECT COUNT(*)
            FROM manuscripts
            WHERE status = 'revised'
              AND deleted_at IS NULL
        ")->fetchColumn();

        // Accepted: not in production, not deleted
        $accepted = $pdo->query("
            SELECT COUNT(*) 
            FROM manuscripts 
            WHERE status = 'accepted' 
              AND in_production = FALSE
              AND deleted_at IS NULL
        ")->fetchColumn();

        // Rejected: not deleted
        $rejected = $pdo->query("
            SELECT COUNT(*) 
            FROM manuscripts 
            WHERE status = 'rejected' AND deleted_at IS NULL
        ")->fetchColumn();

        // Published: not deleted
        $published = $pdo->query("
            SELECT COUNT(*) 
            FROM manuscripts 
            WHERE status = 'published' AND deleted_at IS NULL
        ")->fetchColumn();

        // Publication Decision: in production, still accepted, not deleted
        $publicationDecision = $pdo->query("
            SELECT COUNT(*) 
            FROM manuscripts 
            WHERE status = 'accepted' 
              AND in_production = TRUE
              AND deleted_at IS NULL
        ")->fetchColumn();

        // User counts (active only – no soft-delete on users assumed)
        $reviewers = $pdo->query("
            SELECT COUNT(*) 
            FROM users 
            WHERE role = 'reviewer' AND active = 1
        ")->fetchColumn();
        $editors   = $pdo->query("
            SELECT COUNT(*) 
            FROM users 
            WHERE role IN ('editor','publisher') AND active = 1
        ")->fetchColumn();
        $authors   = $pdo->query("
            SELECT COUNT(*) 
            FROM users 
            WHERE role = 'author' AND active = 1
        ")->fetchColumn();

        jsonResponse([
            "newSubmissions"       => (int)$newSubmissions,
            "underReview"          => (int)$underReview,
            "revisionRequested"    => (int)$revisionRequested,
            "revised"              => (int)$revised,
            "accepted"             => (int)$accepted,
            "rejected"             => (int)$rejected,
            "published"            => (int)$published,
            "publicationDecision"  => (int)$publicationDecision,
            "reviewers"            => (int)$reviewers,
            "editors"              => (int)$editors,
            "authors"              => (int)$authors,
        ]);
        break;

    default:
        errorResponse("Invalid action. Use: dashboardCounts", 400);
}

} catch (PDOException $e) {
    error_log("DB Error: " . $e->getMessage());
    errorResponse("Database error", 500);
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    errorResponse($e->getMessage(), 500);
}
?>