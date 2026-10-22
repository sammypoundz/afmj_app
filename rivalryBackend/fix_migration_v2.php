<?php
/**
 * Migrate views/downloads for ALL published manuscripts from old journal_published
 * to new manuscripts table, matching by title.
 */

$newHost = 'localhost';
$newDbname = 'accnuych_jmsdb';
$newUser = 'accnuych_jmsUser';
$newPass = 'Precious1035@';

$oldHost = 'localhost';
$oldDbname = 'accnuych_afmj_old_import';
$oldUser = 'accnuych_afmj_old_importUser';
$oldPass = 'Precious1035';

try {
    $newDb = new PDO("mysql:host=$newHost;dbname=$newDbname;charset=utf8mb4", $newUser, $newPass);
    $newDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $oldDb = new PDO("mysql:host=$oldHost;dbname=$oldDbname;charset=utf8mb4", $oldUser, $oldPass);
    $oldDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    die("Connection error: " . $e->getMessage());
}

echo "Migrating views/downloads for ALL published manuscripts...\n";

// Fetch all records from old journal_published
$oldStmt = $oldDb->query("SELECT journal_title, no_read, no_downloads FROM journal_published");
$oldRows = $oldStmt->fetchAll(PDO::FETCH_ASSOC);

$updated = 0;
$notFound = 0;

foreach ($oldRows as $old) {
    $title = $old['journal_title'];
    $views = (int)$old['no_read'];
    $downloads = (int)$old['no_downloads'];

    // Find matching manuscript in new DB by title (case-insensitive)
    $find = $newDb->prepare("SELECT id FROM manuscripts WHERE title LIKE :title");
    $find->execute([':title' => $title]);
    $manuscript = $find->fetch(PDO::FETCH_ASSOC);

    if ($manuscript) {
        $update = $newDb->prepare("UPDATE manuscripts SET views = :views, downloads = :downloads WHERE id = :id");
        $update->execute([
            ':views' => $views,
            ':downloads' => $downloads,
            ':id' => $manuscript['id']
        ]);
        echo "  Updated manuscript ID {$manuscript['id']}: views=$views, downloads=$downloads\n";
        $updated++;
    } else {
        // Try to match by slug or journal_id if you have a mapping
        echo "  Warning: No matching manuscript found for title: " . substr($title, 0, 50) . "...\n";
        $notFound++;
    }
}

echo "\nDone. Updated $updated manuscripts, $notFound not found.\n";

?>