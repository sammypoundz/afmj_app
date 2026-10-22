<?php
/**
 * Fix migration gaps:
 * - Assign missing authors to default admin (ID 27)
 * - Update published status using fuzzy title matching
 * - Update payment info using manuscript_id strings (if we can find them)
 */

// Database connection
$newHost = 'localhost';
$newDbname = 'accnuych_jmsdb';
$newUser = 'accnuych_jmsUser';
$newPass = 'Precious1035@';

try {
    $db = new PDO("mysql:host=$newHost;dbname=$newDbname;charset=utf8mb4", $newUser, $newPass);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Connection error: " . $e->getMessage());
}

echo "Fixing migration gaps...\n";

// ========================================================================
// 1. Fix missing authors (author_id = 0 or NULL)
// ========================================================================
echo "\n1. Assigning missing authors to default admin (ID 27)...\n";
$stmt = $db->prepare("UPDATE manuscripts SET author_id = 27 WHERE author_id = 0 OR author_id IS NULL");
$stmt->execute();
$count = $stmt->rowCount();
echo "  Updated $count manuscripts with author_id = 27.\n";

// ========================================================================
// 2. Fix published status using fuzzy title matching
// ========================================================================
echo "\n2. Matching published manuscripts...\n";

// Fetch published titles from journal_published (old DB)
$oldDb = new PDO("mysql:host=localhost;dbname=accnuych_afmj_old_import;charset=utf8mb4", 'accnuych_afmj_old_importUser', 'Precious1035');
$oldDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$published = $oldDb->query("SELECT journal_title, journal_url, journal_date, no_read, no_downloads FROM journal_published")->fetchAll(PDO::FETCH_ASSOC);

foreach ($published as $pub) {
    $title = trim($pub['journal_title']);
    // Try exact match first
    $stmt = $db->prepare("SELECT id FROM manuscripts WHERE title = ? LIMIT 1");
    $stmt->execute([$title]);
    $id = $stmt->fetchColumn();
    if (!$id) {
        // Try case-insensitive match
        $stmt = $db->prepare("SELECT id FROM manuscripts WHERE LOWER(title) = LOWER(?) LIMIT 1");
        $stmt->execute([$title]);
        $id = $stmt->fetchColumn();
    }
    if (!$id) {
        // Try removing extra punctuation/spaces
        $cleanTitle = preg_replace('/[^a-zA-Z0-9\s]/', '', $title);
        $stmt = $db->prepare("SELECT id FROM manuscripts WHERE REPLACE(REPLACE(REPLACE(title, '.', ''), ',', ''), ':', '') LIKE ? LIMIT 1");
        $stmt->execute(['%' . trim($cleanTitle) . '%']);
        $id = $stmt->fetchColumn();
    }
    if ($id) {
        $update = $db->prepare("
            UPDATE manuscripts SET
                status = 'published',
                published_at = :published_at,
                views = :views,
                downloads = :downloads,
                file_path = :file_path
            WHERE id = :id
        ");
        $update->execute([
            ':published_at' => $pub['journal_date'],
            ':views' => $pub['no_read'] ?? 0,
            ':downloads' => $pub['no_downloads'] ?? 0,
            ':file_path' => $pub['journal_url'] ?? null,
            ':id' => $id,
        ]);
        echo "  Published manuscript $id: $title\n";
    } else {
        echo "  Warning: Could not match '$title'\n";
    }
}

// ========================================================================
// 3. Fix payment info (approved_manuscripts)
// ========================================================================
echo "\n3. Updating payment info...\n";

$approved = $oldDb->query("SELECT manuscript_id, payment, amount FROM approved_manuscripts")->fetchAll(PDO::FETCH_ASSOC);
foreach ($approved as $row) {
    $manIdStr = $row['manuscript_id'];
    // Try to find manuscript by slug (if we stored the manuscript_id in slug)
    $stmt = $db->prepare("SELECT id FROM manuscripts WHERE slug LIKE ? LIMIT 1");
    $stmt->execute(['%' . $manIdStr . '%']);
    $id = $stmt->fetchColumn();
    if ($id) {
        $paymentStatus = ($row['payment'] === 'PAID') ? 'paid' : 'pending';
        $amount = $row['amount'] ?? null;
        $update = $db->prepare("
            UPDATE manuscripts SET
                payment_assigned = 1,
                payment_amount = :amount,
                payment_status = :payment_status
            WHERE id = :id
        ");
        $update->execute([
            ':amount' => $amount,
            ':payment_status' => $paymentStatus,
            ':id' => $id,
        ]);
        echo "  Updated payment for manuscript $id (from $manIdStr)\n";
    } else {
        echo "  Warning: Could not find manuscript for ID string $manIdStr\n";
    }
}

// ========================================================================
// 4. Fix reviews with missing reviewer mapping
// ========================================================================
echo "\n4. Fixing reviews with missing reviewers (assign to default editor 28)...\n";
$stmt = $db->prepare("UPDATE reviews SET reviewer_id = 28 WHERE reviewer_id = 0 OR reviewer_id IS NULL");
$stmt->execute();
$count = $stmt->rowCount();
echo "  Updated $count reviews with reviewer_id = 28.\n";

echo "\nMigration cleanup completed!";
?>