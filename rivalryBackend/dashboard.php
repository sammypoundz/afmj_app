<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once "config.php"; // or wherever $pdo is defined

try {

    /* ================= KPI - MATCH EIC API ================= */

    // Total submissions (excluding soft-deleted)
    $totalSubmissions = $pdo->query("SELECT COUNT(*) FROM manuscripts WHERE deleted_at IS NULL")->fetchColumn();
    
    // Under Review: manuscripts with status 'under_review' (not soft-deleted)
    $underReview = $pdo->query("SELECT COUNT(*) FROM manuscripts WHERE status = 'under_review' AND deleted_at IS NULL")->fetchColumn();
    
    // Accepted: ONLY manuscripts with status 'accepted' AND NOT in production (matches list view)
    $accepted = $pdo->query("SELECT COUNT(*) FROM manuscripts WHERE status = 'accepted' AND in_production = 0 AND deleted_at IS NULL")->fetchColumn();
    
    // Rejected: manuscripts with status 'rejected' (not soft-deleted)
    $rejected = $pdo->query("SELECT COUNT(*) FROM manuscripts WHERE status = 'rejected' AND deleted_at IS NULL")->fetchColumn();
    
    // Published: manuscripts with status 'published' (not soft-deleted)
    $published = $pdo->query("SELECT COUNT(*) FROM manuscripts WHERE status = 'published' AND deleted_at IS NULL")->fetchColumn();

    // Revisions count: manuscripts with pending revision entries (addressed = 0) - not soft-deleted
    $revisionsStmt = $pdo->query("
        SELECT COUNT(DISTINCT m.id)
        FROM manuscripts m
        JOIN manuscript_revisions mr ON mr.manuscript_id = m.id
        JOIN revision_entries re ON re.revision_id = mr.id
        WHERE m.deleted_at IS NULL AND re.addressed = 0
    ");
    $revisions = $revisionsStmt->fetchColumn();

    // Gallery proof count: matches the galley list view (EICpublicationApi type=galley)
    $galleryProofStmt = $pdo->query("
        SELECT COUNT(*)
        FROM manuscripts
        WHERE payment_assigned = TRUE
          AND payment_status = 'paid'
          AND galley_proof_status IS NOT NULL
          AND galley_proof_status != ''
          AND galley_proof_status != 'approved'
          AND deleted_at IS NULL
    ");
    $galleryProof = $galleryProofStmt->fetchColumn();

    /* ================= USERS ================= */

    $authors = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'author' AND active = 1")->fetchColumn();
    $reviewers = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'reviewer' AND active = 1")->fetchColumn();
    $editors = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'editor' AND active = 1")->fetchColumn();
    $publishers = $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'publisher' AND active = 1")->fetchColumn();

    /* ================= PENDING ================= */

    // Overdue reviews: pending reviews past due date
    $overdueReviews = $pdo->query("
        SELECT COUNT(*)
        FROM reviews r
        JOIN manuscripts m ON m.id = r.manuscript_id
        WHERE r.status = 'pending'
          AND r.due_date < CURDATE()
          AND m.deleted_at IS NULL
    ")->fetchColumn();

    // Awaiting assignment: manuscripts with status 'submitted' (new submissions)
    $awaitingAssignment = $pdo->query("
        SELECT COUNT(*)
        FROM manuscripts
        WHERE status = 'submitted' AND deleted_at IS NULL
    ")->fetchColumn();

    // Ready to publish: accepted manuscripts NOT in production (matches accepted filter)
    $readyToPublish = $pdo->query("
        SELECT COUNT(*)
        FROM manuscripts
        WHERE status = 'accepted' AND in_production = 0 AND deleted_at IS NULL
    ")->fetchColumn();

    /* ================= REVIEWER PERFORMANCE ================= */

    // Average review time (in days) for completed reviews
    $avgReviewTime = $pdo->query("
        SELECT AVG(DATEDIFF(completed_at, accepted_at))
        FROM reviews r
        JOIN manuscripts m ON m.id = r.manuscript_id
        WHERE r.status = 'completed'
          AND r.accepted_at IS NOT NULL
          AND r.completed_at IS NOT NULL
          AND m.deleted_at IS NULL
    ")->fetchColumn();

    // Active reviewers: reviewers who have completed at least one review in the last 30 days
    $activeReviewers = $pdo->query("
        SELECT COUNT(DISTINCT reviewer_id)
        FROM reviews r
        JOIN manuscripts m ON m.id = r.manuscript_id
        WHERE r.status = 'completed'
          AND r.completed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND m.deleted_at IS NULL
    ")->fetchColumn();

    echo json_encode([
        "status" => "success",
        "kpi" => [
            "total_submissions" => (int)$totalSubmissions,
            "under_review" => (int)$underReview,
            "revisions" => (int)$revisions,
            "accepted" => (int)$accepted,
            "rejected" => (int)$rejected,
            "gallery_proof" => (int)$galleryProof,
            "published" => (int)$published,
        ],
        "users" => [
            "authors" => (int)$authors,
            "reviewers" => (int)$reviewers,
            "editors" => (int)$editors,
            "publishers" => (int)$publishers,
        ],
        "pending" => [
            "overdue_reviews" => (int)$overdueReviews,
            "awaiting_assignment" => (int)$awaitingAssignment,
            "ready_to_publish" => (int)$readyToPublish,
        ],
        "reviewer_performance" => [
            "average_review_days" => round($avgReviewTime ?? 0, 1),
            "active_reviewers" => (int)$activeReviewers,
        ]
    ]);

} catch (Exception $e) {
    error_log("Dashboard API Error: " . $e->getMessage());
    echo json_encode([
        "status" => "error",
        "message" => "Server error: " . $e->getMessage()
    ]);
}
?>