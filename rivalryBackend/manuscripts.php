<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

// ==================== CORS ====================
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Session-Id");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once "config.php";

/* ============================= */
/* STATUS LABEL MAPPING */
/* ============================= */

function formatStatus($status) {
    return match($status) {
        'submitted' => 'New Submissions',
        'under_review' => 'Under Review',
        'accepted' => 'Accepted',
        'rejected' => 'Rejected',
        'published' => 'Published',
        default => ucfirst($status)
    };
}

function mapUiStatusToDb(string $status): ?string {
    $map = [
        "New Submissions" => "submitted",
        "Under Review"    => "under_review",
        "Revisions"       => "under_review",
        "Accepted"        => "accepted",
        "Rejected"        => "rejected",
        "Published"       => "published",
    ];
    return $map[$status] ?? null;
}

/* ============================= */
/* FETCH SINGLE MANUSCRIPT */
/* ============================= */

if (isset($_GET['id'])) {

    $id = (int) $_GET['id'];

    $stmt = $pdo->prepare("
        SELECT 
            m.id,
            m.title,
            m.slug,
            m.status,
            m.created_at,
            m.deleted_at,
            m.study_type,
            m.abstract,
            m.background,
            m.objective,
            m.methods,
            m.results,
            m.conclusion,
            m.file_path,
            m.circulating_file_path,
            m.cover_letter_path,
            m.publication_file,
            m.in_production,
            m.galley_proof_status,
            m.views,
            m.downloads,
            a.name AS author_name,
            a.id AS author_id,
            e.name AS editor_name,
            e.id AS editor_id
        FROM manuscripts m
        JOIN users a ON m.author_id = a.id
        LEFT JOIN users e ON m.editor_id = e.id
        WHERE m.id = ? AND m.deleted_at IS NULL
    ");

    $stmt->execute([$id]);
    $manuscript = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$manuscript) {
        echo json_encode(["status" => "error", "message" => "Not found"]);
        exit;
    }

    // Get reviewers with progress
    $reviewStmt = $pdo->prepare("
        SELECT
            u.id,
            u.name,
            r.status,
            r.assigned_at,
            r.accepted_at,
            r.due_date,
            r.completed_at,
            r.review_order,
            r.review_attachment,
            rs.originality,
            rs.methodology,
            rs.clarity,
            rs.relevance,
            rs.comments_to_author,
            rs.confidential_comments,
            rs.recommendation
        FROM reviews r
        JOIN users u ON u.id = r.reviewer_id
        LEFT JOIN review_scores rs ON rs.review_id = r.id
        WHERE r.manuscript_id = ?
        ORDER BY r.review_order ASC
    ");
    $reviewStmt->execute([$id]);
    $reviewers = $reviewStmt->fetchAll(PDO::FETCH_ASSOC);

    // Get revisions
    $revStmt = $pdo->prepare("
        SELECT *
        FROM manuscript_revisions
        WHERE manuscript_id = ?
        ORDER BY revision_number ASC
    ");
    $revStmt->execute([$id]);
    $revisions = $revStmt->fetchAll(PDO::FETCH_ASSOC);

    // Get revision entries
    $revisionEntries = [];
    foreach ($revisions as &$rev) {
        $entStmt = $pdo->prepare("
            SELECT 
                re.*,
                u.name AS reviewer_name
            FROM revision_entries re
            JOIN users u ON u.id = re.reviewer_id
            WHERE re.revision_id = ?
            ORDER BY re.id
        ");
        $entStmt->execute([$rev['id']]);
        $rev['entries'] = $entStmt->fetchAll(PDO::FETCH_ASSOC);
    }

    // Format reviewers
    $reviewerNames = [];
    $reviewerProgress = [];
    $completedCount = 0;

    foreach ($reviewers as $row) {
        if ($row['status'] === 'completed') $completedCount++;
        
        $reviewerNames[] = $row['name'];

        $scores = null;
        if ($row['status'] === 'completed') {
            $scores = [
                "originality"          => $row['originality'] !== null ? (int)$row['originality'] : null,
                "methodology"          => $row['methodology'] !== null ? (int)$row['methodology'] : null,
                "clarity"              => $row['clarity'] !== null ? (int)$row['clarity'] : null,
                "relevance"            => $row['relevance'] !== null ? (int)$row['relevance'] : null,
                "commentsToAuthor"     => $row['comments_to_author'],
                "confidentialComments" => $row['confidential_comments'],
                "recommendation"       => $row['recommendation']
            ];
        }

        $frontendStatus = $row['status'] === 'completed' ? 'reviewed' : 
                          ($row['status'] === 'expired' ? 'expired' : 
                          ($row['accepted_at'] ? 'reviewing' : 'not_opened'));

        $reviewerProgress[] = [
            "reviewer"     => $row['name'],
            "reviewerId"   => (int)$row['id'],
            "status"       => $frontendStatus,
            "assignedAt"   => $row['assigned_at'],
            "acceptedAt"   => $row['accepted_at'],
            "dueDate"      => $row['due_date'],
            "completedAt"  => $row['completed_at'],
            "reviewOrder"  => $row['review_order'],
            "attachment"   => $row['review_attachment'],
            "scores"       => $scores
        ];
    }

    // Format revisions
    $formattedRevisions = [];
    $latestRevisedFile = null;
    foreach ($revisions as $rev) {
        $latestRevisedFile = $rev['revised_file'];
        
        $entries = [];
        $addressed = 0;
        $total = 0;
        
        foreach ($rev['entries'] as $e) {
            $total++;
            if ($e['addressed']) $addressed++;
            
            $entries[] = [
                "id"               => (int)$e['id'],
                "reviewer"         => $e['reviewer_name'],
                "reviewerId"       => (int)$e['reviewer_id'],
                "reviewerComment"  => $e['reviewer_comment'],
                "authorResponse"   => $e['author_response'],
                "addressed"        => (bool)$e['addressed']
            ];
        }
        
        $formattedRevisions[] = [
            "id"            => (int)$rev['id'],
            "revisionNumber" => (int)$rev['revision_number'],
            "submittedAt"   => $rev['submitted_at'],
            "revisedFile"   => $rev['revised_file'],
            "responseFile"  => $rev['response_file'],
            "entries"       => $entries,
            "entryStats"    => [
                "total"     => $total,
                "addressed" => $addressed,
                "pending"   => $total - $addressed
            ]
        ];
    }

    echo json_encode([
        "id"                => (int)$manuscript['id'],
        "title"             => $manuscript['title'],
        "slug"              => $manuscript['slug'],
        "authors"           => $manuscript['author_name'],
        "status"            => formatStatus($manuscript['status']),
        "studyType"         => $manuscript['study_type'] ?? 'Original Research',
        "date"              => date("Y-m-d", strtotime($manuscript['created_at'])),
        "abstract"          => $manuscript['abstract'],
        "background"        => $manuscript['background'],
        "objective"         => $manuscript['objective'],
        "methods"           => $manuscript['methods'] ?? null,
        "results"           => $manuscript['results'] ?? null,
        "conclusion"        => $manuscript['conclusion'],
        "reviewers"         => $reviewerNames,
        "editor"            => $manuscript['editor_name'],
        "editorId"          => $manuscript['editor_id'] ? (int)$manuscript['editor_id'] : null,
        "reviewerProgress"  => $reviewerProgress,
        "reviewStats"       => [
            "total"     => count($reviewers),
            "completed" => $completedCount,
            "pending"   => count($reviewers) - $completedCount
        ],
        "revisions"         => $formattedRevisions,
        "revisionCount"     => count($formattedRevisions),
        "filePath"          => $manuscript['file_path'],
        "circulatingFilePath" => $manuscript['circulating_file_path'],
        "revisedFilePath"   => $latestRevisedFile,
        "coverLetterPath"   => $manuscript['cover_letter_path'] ?? null,
        "publicationFile"   => $manuscript['publication_file'] ?? null,
        "inProduction"      => (bool)$manuscript['in_production'],
        "galleyProofStatus" => $manuscript['galley_proof_status'],
        "views"             => (int)($manuscript['views'] ?? 0),
        "downloads"         => (int)($manuscript['downloads'] ?? 0)
    ]);

    exit;
}

/* ============================= */
/* FETCH BY STATUS (LIST) - MATCHES EIC API */
/* ============================= */

if (isset($_GET['status'])) {

    $uiStatus = $_GET['status'];
    $page = max(1, (int)($_GET['page'] ?? 1));
    $limit = min(50, max(1, (int)($_GET['limit'] ?? 20)));
    $offset = ($page - 1) * $limit;

    $whereClause = "WHERE m.deleted_at IS NULL";
    $params = [];

    if ($uiStatus) {
        // ========== MATCH EIC API FILTERING LOGIC ==========
        if ($uiStatus === "Under Review") {
            // Show ALL manuscripts with status 'under_review' regardless of revision status
            $whereClause .= " AND m.status = 'under_review'";
        } elseif ($uiStatus === "Revisions") {
            // Manuscripts with pending revision entries (addressed = 0)
            $whereClause .= "
                AND m.id IN (
                    SELECT DISTINCT m.id
                    FROM manuscripts m
                    JOIN manuscript_revisions mr ON mr.manuscript_id = m.id
                    JOIN revision_entries re ON re.revision_id = mr.id
                    WHERE re.addressed = 0
                )
            ";
        } elseif ($uiStatus === "Revised") {
            // Manuscripts with revisions but no pending
            $whereClause .= "
                AND m.status = 'under_review'
                AND EXISTS (
                    SELECT 1 FROM manuscript_revisions mr
                    WHERE mr.manuscript_id = m.id
                )
                AND NOT EXISTS (
                    SELECT 1 FROM manuscript_revisions mr
                    JOIN revision_entries re ON re.revision_id = mr.id
                    WHERE mr.manuscript_id = m.id AND re.addressed = 0
                )
            ";
        } elseif ($uiStatus === "Published") {
            $whereClause .= " AND m.status = 'published'";
        } elseif ($uiStatus === "Accepted") {
            // FIX: Match EIC API - Only show accepted manuscripts NOT in production
            $whereClause .= " AND m.status = 'accepted' AND m.in_production = 0";
        } elseif ($uiStatus === "Rejected") {
            $whereClause .= " AND m.status = 'rejected'";
        } elseif ($uiStatus === "New Submissions") {
            $whereClause .= " AND m.status = 'submitted'";
        } else {
            // Fallback: try to map to database status
            $dbStatus = mapUiStatusToDb($uiStatus);
            if ($dbStatus) {
                $whereClause .= " AND m.status = ?";
                $params[] = $dbStatus;
            }
        }
    }

    // Count query
    $countSql = "SELECT COUNT(*) FROM manuscripts m $whereClause";
    $countStmt = $pdo->prepare($countSql);
    if (!$countStmt->execute($params)) {
        throw new Exception("Count query failed");
    }
    $total = (int)$countStmt->fetchColumn();

    // Main query with all fields
    $sql = "
        SELECT 
            m.id,
            m.title,
            m.slug,
            m.status,
            m.study_type,
            m.created_at,
            m.editor_id,
            m.in_production,
            m.galley_proof_status,
            m.cover_letter_path,
            m.views,
            m.downloads,
            m.file_path,
            m.circulating_file_path,
            m.publication_file,
            u.name AS author_name,
            u.id AS author_id,
            e.name AS editor_name,
            (SELECT COUNT(*) FROM reviews r WHERE r.manuscript_id = m.id AND r.status = 'pending') AS pending_reviews,
            (SELECT COUNT(*) FROM reviews r WHERE r.manuscript_id = m.id AND r.status = 'completed') AS completed_reviews,
            (SELECT COUNT(*) FROM manuscript_revisions mr WHERE mr.manuscript_id = m.id) AS revision_count,
            (SELECT 
                CASE 
                    WHEN EXISTS (
                        SELECT 1 FROM manuscript_revisions mr 
                        WHERE mr.manuscript_id = m.id 
                        AND mr.revision_number = (
                            SELECT MAX(revision_number) FROM manuscript_revisions WHERE manuscript_id = m.id
                        )
                        AND mr.revised_file IS NOT NULL
                    ) THEN 1 ELSE 0 
                END
            ) AS has_uploaded_revision,
            (SELECT revised_file 
             FROM manuscript_revisions 
             WHERE manuscript_id = m.id 
             ORDER BY revision_number DESC 
             LIMIT 1
            ) AS revised_file_path
        FROM manuscripts m
        JOIN users u ON u.id = m.author_id
        LEFT JOIN users e ON e.id = m.editor_id
        $whereClause
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
    ";
    
    $stmt = $pdo->prepare($sql);
    $paramIndex = 1;
    foreach ($params as $param) {
        $stmt->bindValue($paramIndex++, $param);
    }
    $stmt->bindValue($paramIndex++, $limit, PDO::PARAM_INT);
    $stmt->bindValue($paramIndex++, $offset, PDO::PARAM_INT);
    if (!$stmt->execute()) {
        throw new Exception("List query failed");
    }

    $out = array_map(function($r) {
        return [
            "id"                 => (int)$r['id'],
            "title"              => $r['title'],
            "slug"               => $r['slug'],
            "studyType"          => $r['study_type'] ?? 'Original Research',
            "authors"            => $r['author_name'],
            "authorId"           => (int)$r['author_id'],
            "editor"             => $r['editor_name'] ?? null,
            "status"             => formatStatus($r['status']),
            "date"               => date("Y-m-d", strtotime($r['created_at'])),
            "editorId"           => $r['editor_id'] ? (int)$r['editor_id'] : null,
            "pendingReviews"     => (int)$r['pending_reviews'],
            "completedReviews"   => (int)$r['completed_reviews'],
            "hasRevisions"       => (int)$r['revision_count'] > 0,
            "hasUploadedRevision"=> (bool)$r['has_uploaded_revision'],
            "inProduction"       => (bool)$r['in_production'],
            "galleyProofStatus"  => $r['galley_proof_status'],
            "revisedFilePath"    => $r['revised_file_path'] ?? null,
            "coverLetterPath"    => $r['cover_letter_path'] ?? null,
            "filePath"           => $r['file_path'] ?? null,
            "circulatingFilePath"=> $r['circulating_file_path'] ?? null,
            "publicationFile"    => $r['publication_file'] ?? null,
            "views"              => (int)($r['views'] ?? 0),
            "downloads"          => (int)($r['downloads'] ?? 0),
        ];
    }, $stmt->fetchAll(PDO::FETCH_ASSOC));

    echo json_encode([
        "data" => $out,
        "pagination" => [
            "page" => $page,
            "limit" => $limit,
            "total" => $total,
            "pages" => (int)ceil($total / $limit)
        ]
    ]);
    exit;
}

/* ============================= */
/* FETCH ALL GROUPED (DASHBOARD) */
/* ============================= */

// If no specific action is requested, return grouped data for dashboard
$stmt = $pdo->query("
    SELECT 
        m.id,
        m.title,
        m.slug,
        m.status,
        m.study_type,
        m.created_at,
        m.views,
        m.downloads,
        m.in_production,
        u.name AS author_name,
        u.id AS author_id,
        e.name AS editor_name,
        (SELECT COUNT(*) FROM manuscript_revisions mr WHERE mr.manuscript_id = m.id) AS revision_count,
        (SELECT 
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM manuscript_revisions mr 
                    WHERE mr.manuscript_id = m.id 
                    AND mr.revision_number = (
                        SELECT MAX(revision_number) FROM manuscript_revisions WHERE manuscript_id = m.id
                    )
                    AND mr.revised_file IS NOT NULL 
                    AND mr.response_file IS NOT NULL
                ) THEN 1 ELSE 0 
            END
        ) AS has_uploaded_revision
    FROM manuscripts m
    JOIN users u ON u.id = m.author_id
    LEFT JOIN users e ON e.id = m.editor_id
    WHERE m.deleted_at IS NULL
    ORDER BY m.created_at DESC
");

$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

$formatted = array_map(function ($row) {
    return [
        "id"                 => (int)$row['id'],
        "title"              => $row['title'],
        "authors"            => $row['author_name'],
        "studyType"          => $row['study_type'] ?? "Research Article",
        "status"             => formatStatus($row['status']),
        "date"               => date("Y-m-d", strtotime($row['created_at'])),
        "editor"             => $row['editor_name'] ?? null,
        "hasRevisions"       => (int)$row['revision_count'] > 0,
        "hasUploadedRevision"=> (bool)$row['has_uploaded_revision'],
        "views"              => (int)($row['views'] ?? 0),
        "downloads"          => (int)($row['downloads'] ?? 0),
        "inProduction"       => (bool)$row['in_production'],
    ];
}, $results);

echo json_encode([
    "status" => "success",
    "data" => $formatted
]);
?>