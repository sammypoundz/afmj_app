<?php
/**
 * Cross‑server migration: afmjonli_afmjdb (afmjonline.com) → accnuych_jmsdb (vinosschool.com)
 * 
 * This script will:
 *   1. Clear all manuscripts, reviews, revisions, and scores from the new DB
 *   2. Migrate all manuscripts, reviews, and revisions from the old DB
 * 
 * USAGE:
 *   php migrate_cross_server.php
 * 
 * Set DRY_RUN = true to preview without making changes.
 */

define('DRY_RUN', false); // Set to false to actually run
define('CLEAR_NEW_DB', true); // Set to true to clear manuscript data before migration

// ========================================================================
// DATABASE CONNECTIONS
// ========================================================================

// Old database (afmjonline.com)
$oldHost = 'afmjonline.com';      // or the IP address / remote MySQL host
$oldDbname = 'afmjonli_jmsDb';
$oldUser = 'afmjonli_jmsUser';
$oldPass = 'Precious1035';



// New database (vinosschool.com – local)
$newHost = 'localhost';
$newDbname = 'accnuych_jmsdb';
$newUser = 'accnuych_jmsUser';
$newPass = 'Precious1035';



try {
    $oldDb = new PDO("mysql:host=$oldHost;dbname=$oldDbname;charset=utf8mb4", $oldUser, $oldPass);
    $oldDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $newDb = new PDO("mysql:host=$newHost;dbname=$newDbname;charset=utf8mb4", $newUser, $newPass);
    $newDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Connection error: " . $e->getMessage());
}

// ========================================================================
// CLEAR NEW DATABASE (remove test manuscripts)
// ========================================================================
if (CLEAR_NEW_DB && !DRY_RUN) {
    echo "Clearing existing manuscript data from new DB...\n";
    $newDb->exec("SET FOREIGN_KEY_CHECKS = 0");
    $newDb->exec("TRUNCATE TABLE revision_entries");
    $newDb->exec("TRUNCATE TABLE manuscript_revisions");
    $newDb->exec("TRUNCATE TABLE review_scores");
    $newDb->exec("TRUNCATE TABLE reviews");
    $newDb->exec("TRUNCATE TABLE manuscripts");
    $newDb->exec("SET FOREIGN_KEY_CHECKS = 1");
    echo "Cleared.\n";
} elseif (CLEAR_NEW_DB && DRY_RUN) {
    echo "DRY-RUN: Would clear manuscript data from new DB.\n";
}

// We also need to map old user IDs to new user IDs.
// We'll create new users if they don't exist, but we'll map by email.

// ========================================================================
// STEP 1: FETCH USERS FROM OLD DB, MIGRATE OR UPDATE TO NEW DB
// ========================================================================
echo "\nMigrating users...\n";

$oldUsers = $oldDb->query("SELECT * FROM users_auth")->fetchAll(PDO::FETCH_ASSOC);

$roleMap = [
    'admin'     => 'admin',
    'editior'   => 'editor',
    'editor'    => 'editor',
    'publisher' => 'publisher',
    'reviewer'  => 'reviewer',
    'author'    => 'author',
];

$idMap = [];

foreach ($oldUsers as $oldUser) {
    $oldId = $oldUser['id'];
    $email = trim($oldUser['email_address']);
    if (empty($email)) continue;

    // Check if user already exists in new DB by email
    $stmt = $newDb->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $newId = $stmt->fetchColumn();

    if ($newId) {
        // Update existing user
        $update = $newDb->prepare("
            UPDATE users SET
                name = :name,
                role = :role,
                password = :password,
                institution = :institution,
                specializations = :specializations
            WHERE id = :id
        ");
        $update->execute([
            ':name'          => $oldUser['userName'] ?? '',
            ':role'          => $roleMap[strtolower($oldUser['userRole'])] ?? 'author',
            ':password'      => $oldUser['userpass'] ?? '',
            ':institution'   => $oldUser['editor_field'] ?? null,
            ':specializations' => $oldUser['reviewer_field'] ?? null,
            ':id'            => $newId,
        ]);
        echo "  Updated user $newId: $email\n";
    } else {
        // Insert new user
        if (!DRY_RUN) {
            $insert = $newDb->prepare("
                INSERT INTO users (id, name, email, role, password, institution, specializations, active, created_at)
                VALUES (:id, :name, :email, :role, :password, :institution, :specializations, 1, NOW())
            ");
            $insert->execute([
                ':id'            => $oldId,
                ':name'          => $oldUser['userName'] ?? '',
                ':email'         => $email,
                ':role'          => $roleMap[strtolower($oldUser['userRole'])] ?? 'author',
                ':password'      => $oldUser['userpass'] ?? '',
                ':institution'   => $oldUser['editor_field'] ?? null,
                ':specializations' => $oldUser['reviewer_field'] ?? null,
            ]);
            $newId = $oldId;
            echo "  Inserted user $newId: $email\n";
        } else {
            $newId = $oldId;
            echo "  DRY-RUN: Would insert user $newId: $email\n";
        }
    }
    $idMap[$oldId] = $newId;
}

// ========================================================================
// STEP 2: MIGRATE MANUSCRIPTS FROM new_manuscripts
// ========================================================================
echo "\nMigrating manuscripts from new_manuscripts...\n";

$oldManuscripts = $oldDb->query("SELECT * FROM new_manuscripts")->fetchAll(PDO::FETCH_ASSOC);

$statusMap = [
    'UNATTENDED'    => 'submitted',
    'ASSIGNED'      => 'under_review',
    'UNDER REVIEW'  => 'under_review',
    'REVISION'      => 'under_review',
    'APPROVED'      => 'accepted',
    'PUBLISHED'     => 'published',
    'REJECTED'      => 'rejected',
];

foreach ($oldManuscripts as $oldMan) {
    $oldId = $oldMan['id'];
    $authorId = (int)$oldMan['author_id'];
    $newAuthorId = $idMap[$authorId] ?? null;
    if (!$newAuthorId) {
        echo "  Warning: No user mapping for author_id $authorId, skipping manuscript $oldId\n";
        continue;
    }

    // Generate slug
    $title = $oldMan['manuscript_title'] ?? 'untitled';
    $slugBase = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $title)));
    $slugBase = substr($slugBase, 0, 40);
    $slug = $slugBase . '-' . $oldId;

    $status = $statusMap[strtoupper($oldMan['status_'])] ?? 'submitted';

    $data = [
        'id'             => $oldId,
        'title'          => $title,
        'slug'           => $slug,
        'status'         => $status,
        'author_id'      => $newAuthorId,
        'created_at'     => $oldMan['uploade_date'] ?? date('Y-m-d H:i:s'),
        'abstract'       => $oldMan['abstract_'] ?? null,
        'objective'      => $oldMan['objectives'] ?? null,
        'methods'        => $oldMan['methods'] ?? null,
        'results'        => $oldMan['results'] ?? null,
        'conclusion'     => $oldMan['conclusion'] ?? null,
        'file_path'      => $oldMan['file_path'] ?? null,
        'cover_letter_path' => $oldMan['publish_reason'] ?? null,
        'authors'        => $oldMan['co_author'] ?? null,
        'study_type'     => null,
        'keywords'       => null,
    ];

    if (!DRY_RUN) {
        $insert = $newDb->prepare("
            INSERT INTO manuscripts (
                id, title, slug, status, author_id, created_at,
                abstract, objective, methods, results, conclusion,
                file_path, cover_letter_path, authors
            ) VALUES (
                :id, :title, :slug, :status, :author_id, :created_at,
                :abstract, :objective, :methods, :results, :conclusion,
                :file_path, :cover_letter_path, :authors
            )
        ");
        $insert->execute($data);
        echo "  Inserted manuscript $oldId: $title\n";
    } else {
        echo "  DRY-RUN: Would insert manuscript $oldId: $title\n";
    }
}

// ========================================================================
// STEP 3: UPDATE PAYMENT INFO FROM approved_manuscripts
// ========================================================================
echo "\nMigrating payment info from approved_manuscripts...\n";

$approved = $oldDb->query("SELECT * FROM approved_manuscripts")->fetchAll(PDO::FETCH_ASSOC);
foreach ($approved as $row) {
    $manuscriptIdStr = $row['manuscript_id'];
    // Find the old manuscript ID by manuscript_id string in new_manuscripts
    $stmt = $oldDb->prepare("SELECT id FROM new_manuscripts WHERE manuscript_id = ?");
    $stmt->execute([$manuscriptIdStr]);
    $oldId = $stmt->fetchColumn();
    if ($oldId && isset($idMap[$oldId])) {
        $newId = $idMap[$oldId];
        $paymentStatus = ($row['payment'] === 'PAID') ? 'paid' : 'pending';
        $amount = $row['amount'] ?? null;
        if (!DRY_RUN) {
            $update = $newDb->prepare("
                UPDATE manuscripts SET
                    payment_assigned = 1,
                    payment_amount = :amount,
                    payment_status = :payment_status
                WHERE id = :id
            ");
            $update->execute([
                ':amount' => $amount,
                ':payment_status' => $paymentStatus,
                ':id' => $newId,
            ]);
            echo "  Updated payment for manuscript $newId\n";
        } else {
            echo "  DRY-RUN: Would update payment for manuscript $newId\n";
        }
    } else {
        echo "  Warning: Could not find manuscript for ID string $manuscriptIdStr\n";
    }
}

// ========================================================================
// STEP 4: MIGRATE PUBLISHED MANUSCRIPTS (journal_published)
// ========================================================================
echo "\nMigrating published manuscripts...\n";

$published = $oldDb->query("SELECT * FROM journal_published")->fetchAll(PDO::FETCH_ASSOC);
foreach ($published as $row) {
    $title = $row['journal_title'];
    // Try to find matching manuscript by title in new DB
    $stmt = $newDb->prepare("SELECT id FROM manuscripts WHERE title = ? LIMIT 1");
    $stmt->execute([$title]);
    $manId = $stmt->fetchColumn();
    if ($manId) {
        if (!DRY_RUN) {
            $update = $newDb->prepare("
                UPDATE manuscripts SET
                    status = 'published',
                    published_at = :published_at,
                    views = :views,
                    downloads = :downloads,
                    file_path = :file_path
                WHERE id = :id
            ");
            $update->execute([
                ':published_at' => $row['journal_date'],
                ':views' => $row['no_read'] ?? 0,
                ':downloads' => $row['no_downloads'] ?? 0,
                ':file_path' => $row['journal_url'] ?? null,
                ':id' => $manId,
            ]);
            echo "  Published manuscript $manId: $title\n";
        } else {
            echo "  DRY-RUN: Would publish manuscript $manId: $title\n";
        }
    } else {
        echo "  Warning: Could not find manuscript with title '$title' to publish\n";
    }
}

// ========================================================================
// STEP 5: MIGRATE REVIEWS (review_manuscripts)
// ========================================================================
echo "\nMigrating reviews...\n";

$oldReviews = $oldDb->query("SELECT * FROM review_manuscripts")->fetchAll(PDO::FETCH_ASSOC);
foreach ($oldReviews as $oldRev) {
    $manuscriptIdStr = $oldRev['manuscript_id'];
    // Get old numeric ID
    $stmt = $oldDb->prepare("SELECT id FROM new_manuscripts WHERE manuscript_id = ?");
    $stmt->execute([$manuscriptIdStr]);
    $oldManId = $stmt->fetchColumn();
    if (!$oldManId) {
        echo "  Warning: Could not find manuscript for review: $manuscriptIdStr\n";
        continue;
    }
    $newManId = $idMap[$oldManId] ?? null;
    if (!$newManId) continue;

    $oldReviewerId = (int)$oldRev['reviewer_id'];
    $newReviewerId = $idMap[$oldReviewerId] ?? null;
    if (!$newReviewerId) {
        echo "  Warning: No user mapping for reviewer $oldReviewerId\n";
        continue;
    }

    $completedAt = null;
    if ($oldRev['e_status'] === 'DONE' || $oldRev['r_status'] === 'DONE') {
        $completedAt = $oldRev['uploade_date'] ?? date('Y-m-d H:i:s');
    }

    if (!DRY_RUN) {
        $insertReview = $newDb->prepare("
            INSERT INTO reviews (
                manuscript_id, reviewer_id, status, assigned_at, completed_at, accepted_at
            ) VALUES (
                :manuscript_id, :reviewer_id, 'completed', :assigned_at, :completed_at, :accepted_at
            )
        ");
        $insertReview->execute([
            ':manuscript_id' => $newManId,
            ':reviewer_id' => $newReviewerId,
            ':assigned_at' => $oldRev['uploade_date'] ?? date('Y-m-d H:i:s'),
            ':completed_at' => $completedAt,
            ':accepted_at' => $oldRev['uploade_date'] ?? null,
        ]);
        $reviewId = $newDb->lastInsertId();

        // Insert scores if available
        $scores = [
            'originality' => $oldRev['r_manuscript_rating'] ?? null,
            'methodology' => null,
            'clarity' => null,
            'relevance' => null,
            'comments_to_author' => $oldRev['r_feedback'] ?? null,
            'confidential_comments' => null,
            'recommendation' => $oldRev['r_overall_recommendation'] ?? null,
        ];
        if (array_filter($scores)) {
            $insertScores = $newDb->prepare("
                INSERT INTO review_scores (
                    review_id, originality, methodology, clarity, relevance,
                    comments_to_author, confidential_comments, recommendation
                ) VALUES (
                    :review_id, :originality, :methodology, :clarity, :relevance,
                    :comments_to_author, :confidential_comments, :recommendation
                )
            ");
            $insertScores->execute([
                ':review_id' => $reviewId,
                ':originality' => $scores['originality'],
                ':methodology' => $scores['methodology'],
                ':clarity' => $scores['clarity'],
                ':relevance' => $scores['relevance'],
                ':comments_to_author' => $scores['comments_to_author'],
                ':confidential_comments' => $scores['confidential_comments'],
                ':recommendation' => $scores['recommendation'],
            ]);
        }
        echo "  Inserted review for manuscript $newManId by reviewer $newReviewerId\n";
    } else {
        echo "  DRY-RUN: Would insert review for manuscript $newManId\n";
    }
}

// ========================================================================
// STEP 6: MIGRATE REVISIONS (revision_requests)
// ========================================================================
echo "\nMigrating revisions...\n";

$revisions = $oldDb->query("SELECT * FROM revision_requests")->fetchAll(PDO::FETCH_ASSOC);
foreach ($revisions as $rev) {
    $manuscriptIdStr = $rev['manuscript_id'];
    $stmt = $oldDb->prepare("SELECT id FROM new_manuscripts WHERE manuscript_id = ?");
    $stmt->execute([$manuscriptIdStr]);
    $oldManId = $stmt->fetchColumn();
    if (!$oldManId) {
        echo "  Warning: Could not find manuscript for revision: $manuscriptIdStr\n";
        continue;
    }
    $newManId = $idMap[$oldManId] ?? null;
    if (!$newManId) continue;

    // Determine revision number
    $stmt = $newDb->prepare("SELECT MAX(revision_number) FROM manuscript_revisions WHERE manuscript_id = ?");
    $stmt->execute([$newManId]);
    $max = $stmt->fetchColumn();
    $revisionNumber = $max ? $max + 1 : 1;

    if (!DRY_RUN) {
        $insertRev = $newDb->prepare("
            INSERT INTO manuscript_revisions (
                manuscript_id, revision_number, submitted_at, revised_file
            ) VALUES (
                :manuscript_id, :revision_number, :submitted_at, :revised_file
            )
        ");
        $insertRev->execute([
            ':manuscript_id' => $newManId,
            ':revision_number' => $revisionNumber,
            ':submitted_at' => $rev['upload_date'] ?? date('Y-m-d H:i:s'),
            ':revised_file' => $rev['attachedfile_path'] ?? null,
        ]);
        $revisionId = $newDb->lastInsertId();

        // Insert revision entry (using editor who requested revision)
        $requestor = json_decode($rev['requestor_id'], true);
        $editorId = $requestor['editor'] ?? null;
        $newEditorId = $editorId ? ($idMap[$editorId] ?? null) : null;
        if ($newEditorId) {
            $insertEntry = $newDb->prepare("
                INSERT INTO revision_entries (
                    revision_id, reviewer_id, reviewer_comment, addressed
                ) VALUES (
                    :revision_id, :reviewer_id, :reviewer_comment, 0
                )
            ");
            $insertEntry->execute([
                ':revision_id' => $revisionId,
                ':reviewer_id' => $newEditorId,
                ':reviewer_comment' => $rev['rejection_reason'] ?? '',
            ]);
        }
        echo "  Inserted revision for manuscript $newManId\n";
    } else {
        echo "  DRY-RUN: Would insert revision for manuscript $newManId\n";
    }
}

echo "\nMigration completed!";

?>