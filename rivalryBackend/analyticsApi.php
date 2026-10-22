<?php
// ==================== CORS HEADERS ====================
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Session-Id");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ==================== SESSION (no cookies) ====================
$customSessionPath = __DIR__ . '/sessions';
if (!is_dir($customSessionPath)) {
    mkdir($customSessionPath, 0755, true);
}
session_save_path($customSessionPath);
ini_set('session.use_cookies', 0);

$sessionId = $_SERVER['HTTP_X_SESSION_ID'] ?? null;
if ($sessionId) {
    session_id($sessionId);
}
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}
$userId = $_SESSION['user_id'];

// ==================== REQUIREMENTS ====================
require_once __DIR__ . "/config.php";
require_once __DIR__ . "/notification_helper.php";

function jsonResponse($data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

function errorResponse(string $message, int $code = 400): void {
    jsonResponse(["error" => $message], $code);
}

try {
    // ------- SUMMARY STATS --------
    // Total submissions
    $stmt = $pdo->query("SELECT COUNT(*) FROM manuscripts");
    $totalSubmissions = (int)$stmt->fetchColumn();

    // New users (last 30 days)
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
    $stmt->execute();
    $newUsers = (int)$stmt->fetchColumn();

    // Active authors (authors with at least one submission in last 30 days)
    $stmt = $pdo->prepare("SELECT COUNT(DISTINCT author_id) FROM manuscripts WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
    $stmt->execute();
    $activeAuthors = (int)$stmt->fetchColumn();

    // Total visits = total rows in page_views
    $stmt = $pdo->query("SELECT COUNT(*) FROM page_views");
    $totalVisits = (int)$stmt->fetchColumn();

    // ------- VISITS OVER TIME (last 7 days) from page_views --------
    $visitsData = [];
    for ($i = 6; $i >= 0; $i--) {
        $date = date('Y-m-d', strtotime("-$i days"));
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM page_views WHERE DATE(created_at) = ?");
        $stmt->execute([$date]);
        $visits = (int)$stmt->fetchColumn();
        $visitsData[] = ['date' => $date, 'visits' => $visits];
    }

    // ------- ENGAGEMENT (using existing tables) --------
    $stmt = $pdo->query("SELECT COALESCE(SUM(views), 0) FROM manuscripts");
    $manuscriptsViewed = (int)$stmt->fetchColumn();

    $stmt = $pdo->query("SELECT COUNT(*) FROM reviews WHERE completed_at IS NOT NULL");
    $reviewsSubmitted = (int)$stmt->fetchColumn();

    // Comments – check if table exists
    $commentsPosted = 0;
    $check = $pdo->query("SHOW TABLES LIKE 'comments'");
    if ($check->rowCount() > 0) {
        $stmt = $pdo->query("SELECT COUNT(*) FROM comments");
        $commentsPosted = (int)$stmt->fetchColumn();
    }

    $engagementData = [
        ['type' => 'Manuscripts Viewed', 'value' => $manuscriptsViewed],
        ['type' => 'Reviews Submitted', 'value' => $reviewsSubmitted],
        ['type' => 'Comments Posted', 'value' => $commentsPosted]
    ];

    // ------- TOP ACTIVE AUTHORS --------
    $stmt = $pdo->query("
        SELECT 
            u.name AS author,
            COUNT(m.id) AS submissions,
            COALESCE(SUM(CASE WHEN r.completed_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS reviews_completed
        FROM users u
        JOIN manuscripts m ON m.author_id = u.id
        LEFT JOIN reviews r ON r.manuscript_id = m.id AND r.reviewer_id = u.id
        GROUP BY u.id
        ORDER BY submissions DESC, reviews_completed DESC
        LIMIT 5
    ");
    $topAuthors = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // ------- RESPONSE --------
    jsonResponse([
        'summary' => [
            'totalVisits' => $totalVisits,
            'newUsers' => $newUsers,
            'activeAuthors' => $activeAuthors,
            'submissions' => $totalSubmissions
        ],
        'visitsData' => $visitsData,
        'engagementData' => $engagementData,
        'topAuthors' => $topAuthors
    ]);

} catch (PDOException $e) {
    error_log("Analytics API DB Error: " . $e->getMessage());
    errorResponse("Database error", 500);
} catch (Exception $e) {
    error_log("Analytics API Error: " . $e->getMessage());
    errorResponse($e->getMessage(), 500);
}
?>