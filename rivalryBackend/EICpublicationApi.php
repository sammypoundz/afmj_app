<?php
// ==================== CORS HEADERS ====================
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-Session-Id");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . "/config.php";
require_once __DIR__ . "/notification_helper.php";

// ===== ADD MISSING COLUMNS =====
$columnsToCheck = [
    'payment_instructions' => "ALTER TABLE manuscripts ADD payment_instructions TEXT DEFAULT NULL AFTER payment_amount",
    'payment_proof' => "ALTER TABLE manuscripts ADD payment_proof VARCHAR(255) DEFAULT NULL",
    'publication_file' => "ALTER TABLE manuscripts ADD publication_file VARCHAR(255) DEFAULT NULL",
    'payment_amount_usd' => "ALTER TABLE manuscripts ADD payment_amount_usd DECIMAL(10,2) DEFAULT NULL AFTER payment_amount",
    'authors' => "ALTER TABLE manuscripts ADD authors TEXT DEFAULT NULL",
    'study_type' => "ALTER TABLE manuscripts ADD study_type VARCHAR(100) DEFAULT NULL",
    'abstract' => "ALTER TABLE manuscripts ADD abstract TEXT DEFAULT NULL",
    'objective' => "ALTER TABLE manuscripts ADD objective TEXT DEFAULT NULL",
    'methods' => "ALTER TABLE manuscripts ADD methods TEXT DEFAULT NULL",
    'results' => "ALTER TABLE manuscripts ADD results TEXT DEFAULT NULL",
    'conclusion' => "ALTER TABLE manuscripts ADD conclusion TEXT DEFAULT NULL",
    'keywords' => "ALTER TABLE manuscripts ADD keywords TEXT DEFAULT NULL",
    'galley_proof_created_at' => "ALTER TABLE manuscripts ADD galley_proof_created_at DATETIME DEFAULT NULL"
];

foreach ($columnsToCheck as $col => $sql) {
    $check = $pdo->query("SHOW COLUMNS FROM manuscripts LIKE '$col'");
    if ($check === false || $check->rowCount() == 0) {
        $pdo->exec($sql);
    }
}

$action = $_GET['action'] ?? '';

function jsonInput(): ?array {
    $input = file_get_contents("php://input");
    return $input ? json_decode($input, true) : null;
}

function jsonResponse($data, int $statusCode = 200): void {
    http_response_code($statusCode);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

function errorResponse(string $message, int $code = 400): void {
    jsonResponse(["error" => $message], $code);
}

function successResponse(array $data = []): void {
    jsonResponse(array_merge(["success" => true], $data));
}

try {

switch ($action) {

    // List manuscripts based on publication stage
    case "list":
        $type = $_GET['type'] ?? '';
        if (!in_array($type, ['pending', 'payment', 'galley', 'awaiting'])) {
            errorResponse("Invalid type. Use: pending, payment, galley, awaiting");
        }

        $sql = "SELECT 
                    m.id,
                    m.slug AS manuscriptId,
                    m.title,
                    COALESCE(m.authors, u.name) AS authors,
                    m.created_at AS acceptedDate,
                    m.payment_assigned,
                    m.payment_amount,
                    m.payment_amount_usd,
                    m.payment_status,
                    m.payment_instructions,
                    m.payment_proof,
                    m.galley_proof_status,
                    m.galley_proof_comment,
                    m.galley_proof_file,
                    m.author_response_file,
                    m.galley_author_response,
                    m.galley_final_file,
                    m.abstract,
                    m.objective,
                    m.methods,
                    m.results,
                    m.conclusion,
                    m.study_type,
                    m.keywords,
                    m.in_production,
                    m.galley_proof_created_at
                FROM manuscripts m
                JOIN users u ON u.id = m.author_id
                WHERE m.status = 'accepted' AND m.deleted_at IS NULL";

        $sql .= " AND m.in_production = TRUE";

        if ($type === 'pending') {
            $sql .= " AND (m.payment_assigned IS NULL OR m.payment_assigned = FALSE)";
        } elseif ($type === 'payment') {
            $sql .= " AND m.payment_assigned = TRUE AND m.payment_status = 'pending'";
        } elseif ($type === 'galley') {
            $sql .= " AND m.payment_assigned = TRUE AND m.payment_status = 'paid' AND m.galley_proof_status IS NOT NULL AND m.galley_proof_status != 'approved'";
        } elseif ($type === 'awaiting') {
            $sql .= " AND m.galley_proof_status = 'approved' AND m.status = 'accepted' AND m.published_at IS NULL";
        }

        $sql .= " ORDER BY m.created_at DESC";

        $stmt = $pdo->query($sql);
        $manuscripts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $out = array_map(function($row) {
            return [
                "id"                => (int)$row['id'],
                "manuscriptId"      => $row['manuscriptId'],
                "title"             => $row['title'],
                "authors"           => $row['authors'],
                "acceptedDate"      => date("Y-m-d", strtotime($row['acceptedDate'])),
                "paymentAssigned"   => (bool)$row['payment_assigned'],
                "paymentAmount"     => $row['payment_amount'] ? (float)$row['payment_amount'] : null,
                "paymentAmountUsd"  => $row['payment_amount_usd'] ? (float)$row['payment_amount_usd'] : null,
                "paymentStatus"     => $row['payment_status'],
                "paymentProof"      => $row['payment_proof'],
                "galleyProofStatus" => $row['galley_proof_status'],
                "galleyProofComment"=> $row['galley_proof_comment'],
                "galleyProofFile"   => $row['galley_proof_file'],
                "authorFile"        => $row['author_response_file'],
                "galleyAuthorResponse" => $row['galley_author_response'],
                "galleyFinalFile"   => $row['galley_final_file'],
                "abstract"          => $row['abstract'],
                "objective"         => $row['objective'],
                "methods"           => $row['methods'],
                "results"           => $row['results'],
                "conclusion"        => $row['conclusion'],
                "studyType"         => $row['study_type'],
                "keywords"          => $row['keywords'],
                "inProduction"      => (bool)$row['in_production'],
                "galleyProofCreatedAt" => $row['galley_proof_created_at']
            ];
        }, $manuscripts);

        jsonResponse($out);
        break;

    // Assign payment (with amount and optional USD) – sends email to author with amounts
    case "assignPayment":
        $data = jsonInput();
        $mid = (int)($data['manuscript_id'] ?? 0);
        $amount = (float)($data['amount'] ?? 0);
        $amountUsd = isset($data['amount_usd']) && $data['amount_usd'] !== '' ? (float)$data['amount_usd'] : null;
        $instructions = $data['instructions'] ?? '';

        if (!$mid) errorResponse("manuscript_id required");
        if ($amount <= 0) errorResponse("Amount must be greater than 0");

        // Fetch manuscript and author details first
        $manStmt = $pdo->prepare("SELECT title, author_id, slug FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
        $manStmt->execute([$mid]);
        $man = $manStmt->fetch();
        if (!$man) errorResponse("Manuscript not found", 404);

        $authorStmt = $pdo->prepare("SELECT email, name FROM users WHERE id = ?");
        $authorStmt->execute([$man['author_id']]);
        $author = $authorStmt->fetch();
        if (!$author) errorResponse("Author not found", 404);

        // Update manuscript with payment details (store both amounts)
        $sql = "UPDATE manuscripts SET
                payment_assigned = 1,
                payment_amount = :amount,
                payment_amount_usd = :amount_usd,
                payment_instructions = :instructions,
                payment_status = 'pending',
                galley_proof_status = NULL,
                in_production = 1
                WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':amount' => $amount,
            ':amount_usd' => $amountUsd,
            ':instructions' => $instructions,
            ':id' => $mid
        ]);

        // Build amount display string
        $amountDisplay = "₦" . number_format($amount, 2);
        if ($amountUsd !== null && $amountUsd > 0) {
            $amountDisplay .= " (approx. $" . number_format($amountUsd, 2) . " USD)";
        }

        // Create in-app notification with both amounts
        $notifMessage = "Please complete the payment of {$amountDisplay} for your manuscript \"{$man['title']}\".";
        if (!empty($instructions)) {
            $notifMessage .= "\n\nInstructions: {$instructions}";
        }
        createNotification(
            $man['author_id'],
            'payment-required',
            'Payment Required',
            $notifMessage,
            $mid
        );

        // Build email body using the supplied instructions
        $paymentBody = "
            <p>Dear " . htmlspecialchars($author['name']) . ",</p>
            <p>Congratulations once again on your accepted manuscript. You are required to pay the article processing fees with the details below in order to progress with the publication:</p>
            <p><strong>Amount:</strong> {$amountDisplay}</p>
            <div style='background:#f8fafc; padding:12px; border-radius:8px; margin:12px 0;'>
                " . nl2br(htmlspecialchars($instructions)) . "
            </div>
            <p>After making payment, you are required to upload the evidence of payment on your portal.</p>
            <p>Kind regards.<br/>Editorial Team.</p>
            " . SIGNATURE_EDITOR_IN_CHIEF . "
        ";

        $sent = sendEmailWithAttachments($author['email'], "Payment Required for Your Manuscript – {$man['slug']}", $paymentBody, []);
        if (!$sent) {
            error_log("Failed to send payment assignment email to author ID {$man['author_id']}");
        }

        successResponse(["message" => "Payment assigned and email sent to author"]);
        break;

    // Mark payment as paid (admin confirms) – NOW sends email to author
    case "markPaid":
        $data = jsonInput();
        $mid = (int)($data['manuscript_id'] ?? 0);
        if (!$mid) errorResponse("manuscript_id required");

        $stmt = $pdo->prepare("UPDATE manuscripts SET payment_status = 'paid', galley_proof_status = 'pending' WHERE id = ?");
        $stmt->execute([$mid]);

        $manStmt = $pdo->prepare("SELECT title, author_id, slug FROM manuscripts WHERE id = ?");
        $manStmt->execute([$mid]);
        $man = $manStmt->fetch();
        if ($man) {
            // In-app notification
            createNotification(
                $man['author_id'],
                'payment-received',
                'Payment Received',
                "Payment for your manuscript \"{$man['title']}\" has been confirmed. Galley proof will be prepared.",
                $mid
            );

            // ✨ NEW: Send email to author confirming payment
            $authorStmt = $pdo->prepare("SELECT name, email FROM users WHERE id = ?");
            $authorStmt->execute([$man['author_id']]);
            $author = $authorStmt->fetch();
            if ($author) {
                $emailSubject = "Payment Confirmed for Your Manuscript – {$man['slug']}";
                $emailBody = "
                    <p>Dear " . htmlspecialchars($author['name']) . ",</p>
                    <p>We are pleased to inform you that the payment for your manuscript <strong>\"" . htmlspecialchars($man['title']) . "\"</strong> has been confirmed.</p>
                    <p>We will now proceed with preparing the galley proof. You will receive a notification when it is ready.</p>
                    <p>Thank you for your cooperation.</p>
                    " . SIGNATURE_EDITOR_IN_CHIEF . "
                ";
                sendEmail($author['email'], $emailSubject, $emailBody);
            }
        }

        successResponse(["message" => "Payment marked as paid"]);
        break;

    // Send galley proof to author (with comment and optional file)
    case "sendToAuthor":
        $data = jsonInput();
        $mid = (int)($data['manuscript_id'] ?? 0);
        $comment = $data['comment'] ?? '';
        $filePath = $data['file_path'] ?? null;

        if (!$mid) errorResponse("manuscript_id required");
        if (empty($comment)) errorResponse("Comment is required");

        // Fetch manuscript and author details
        $manStmt = $pdo->prepare("SELECT title, author_id, slug FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
        $manStmt->execute([$mid]);
        $man = $manStmt->fetch();
        if (!$man) errorResponse("Manuscript not found", 404);

        $authorStmt = $pdo->prepare("SELECT name, email FROM users WHERE id = ?");
        $authorStmt->execute([$man['author_id']]);
        $author = $authorStmt->fetch();

        // Update manuscript: set status, comment, file, and created_at timestamp
        $sql = "UPDATE manuscripts SET 
                galley_proof_status = 'withAuthor',
                galley_proof_comment = :comment,
                galley_proof_file = :file,
                galley_proof_created_at = NOW()
                WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':comment' => $comment,
            ':file' => $filePath,
            ':id' => $mid
        ]);

        // In-app notification
        createNotification(
            $man['author_id'],
            'galley-sent',
            'Galley Proof Sent',
            "Galley proof for your manuscript \"{$man['title']}\" has been sent. Please review and respond.",
            $mid
        );

        // Send email using new galley proof template
        if ($author) {
            $emailSubject = "Galley Proof for Your Manuscript – {$man['slug']}";
            $emailBody = generateGalleyProofSentBody($man, $author['name']);
            $emailBody .= "<p><strong>Editor's comment:</strong> " . nl2br(htmlspecialchars($comment)) . "</p>";
            if ($filePath) {
                $emailBody .= "<p>You can download the galley proof file from your author dashboard.</p>";
            }
            sendEmail($author['email'], $emailSubject, $emailBody);
        }

        successResponse(["message" => "Galley proof sent to author"]);
        break;

    // Author replies with corrected file (called by author interface)
    case "authorReply":
        $data = jsonInput();
        $mid = (int)($data['manuscript_id'] ?? 0);
        $authorFile = $data['author_file'] ?? null;
        $authorResponse = $data['author_response'] ?? null;

        if (!$mid) errorResponse("manuscript_id required");
        if (empty($authorFile)) errorResponse("Author file required");

        $sql = "UPDATE manuscripts SET 
                author_response_file = :file,
                galley_author_response = :response,
                galley_final_file = :file,
                galley_proof_status = 'awaitingReview'
                WHERE id = :id AND deleted_at IS NULL";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':file' => $authorFile,
            ':response' => $authorResponse,
            ':id' => $mid
        ]);

        $manStmt = $pdo->prepare("SELECT title, editor_id FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
        $manStmt->execute([$mid]);
        $man = $manStmt->fetch();
        if ($man && $man['editor_id']) {
            createNotification(
                $man['editor_id'],
                'author-replied',
                'Author Replied',
                "The author has submitted a corrected version for manuscript \"{$man['title']}\". Please review.",
                $mid
            );
        }

        successResponse(["message" => "Author reply recorded"]);
        break;

    // Approve galley proof – now allowed from withAuthor OR awaitingReview
    case "approveGalley":
        $data = jsonInput();
        $mid = (int)($data['manuscript_id'] ?? 0);
        if (!$mid) errorResponse("manuscript_id required");

        $check = $pdo->prepare("SELECT galley_proof_status FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
        $check->execute([$mid]);
        $row = $check->fetch();
        if (!$row) errorResponse("Manuscript not found", 404);

        // Allow approval if status is either 'withAuthor' or 'awaitingReview'
        if (!in_array($row['galley_proof_status'], ['withAuthor', 'awaitingReview'])) {
            errorResponse("Galley proof must be withAuthor or awaitingReview before approval");
        }

        $stmt = $pdo->prepare("UPDATE manuscripts SET galley_proof_status = 'approved' WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$mid]);

        $manStmt = $pdo->prepare("SELECT title, author_id, slug FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
        $manStmt->execute([$mid]);
        $man = $manStmt->fetch();
        if ($man) {
            createNotification(
                $man['author_id'],
                'galley-approved',
                'Galley Proof Approved',
                "Your galley proof for manuscript \"{$man['title']}\" has been approved. It will now be prepared for publication.",
                $mid
            );
            $authorStmt = $pdo->prepare("SELECT name, email FROM users WHERE id = ?");
            $authorStmt->execute([$man['author_id']]);
            $author = $authorStmt->fetch();
            if ($author) {
                $emailBody = generateGalleyProofApprovedBody($man, $author['name']);
                sendEmail($author['email'], "Galley Proof Approved for Your Manuscript", $emailBody);
            }
        }

        $editorId = getAssignedEditorId($mid);
        if ($editorId) {
            createNotification(
                $editorId,
                'galley-approved',
                'Galley Proof Approved',
                "Galley proof for manuscript \"{$man['title']}\" has been approved. Ready for publication.",
                $mid
            );
        }

        $publisherStmt = $pdo->query("SELECT id FROM users WHERE role = 'publisher' AND active = 1");
        $publisherIds = $publisherStmt->fetchAll(PDO::FETCH_COLUMN);
        if (!empty($publisherIds)) {
            createNotification(
                $publisherIds,
                'galley-approved',
                'Galley Proof Approved',
                "Galley proof for manuscript \"{$man['title']}\" has been approved. Ready for publication.",
                $mid
            );
        }

        successResponse(["message" => "Galley proof approved. Manuscript moved to awaiting publication."]);
        break;

    // Publish from awaiting publication tab (upload final file)
    case "publishFromAwaiting":
        $data = jsonInput();
        $mid = (int)($data['manuscript_id'] ?? 0);
        $publicationFile = $data['publication_file'] ?? null;

        if (!$mid) errorResponse("manuscript_id required");
        if (empty($publicationFile)) errorResponse("Publication file is required");

        $check = $pdo->prepare("SELECT galley_proof_status FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
        $check->execute([$mid]);
        $row = $check->fetch();
        if (!$row) errorResponse("Manuscript not found", 404);
        if ($row['galley_proof_status'] !== 'approved') {
            errorResponse("Manuscript must have approved galley proof before publishing");
        }

        $stmt = $pdo->prepare("UPDATE manuscripts SET status = 'published', published_at = NOW(), publication_file = :file WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute([':file' => $publicationFile, ':id' => $mid]);

        $manStmt = $pdo->prepare("SELECT title, author_id, slug FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
        $manStmt->execute([$mid]);
        $man = $manStmt->fetch();
        if ($man) {
            createNotification(
                $man['author_id'],
                'manuscript-published',
                'Manuscript Published',
                "Congratulations! Your manuscript \"{$man['title']}\" has been published.",
                $mid
            );
            $authorStmt = $pdo->prepare("SELECT name, email FROM users WHERE id = ?");
            $authorStmt->execute([$man['author_id']]);
            $author = $authorStmt->fetch();
            if ($author) {
                $emailBody = generateManuscriptPublishedBody($man, $author['name']);
                sendEmail($author['email'], "Your Manuscript Has Been Published", $emailBody);
            }
        }

        $editorId = getAssignedEditorId($mid);
        if ($editorId) {
            createNotification(
                $editorId,
                'manuscript-published',
                'Manuscript Published',
                "Manuscript \"{$man['title']}\" has been published.",
                $mid
            );
        }

        $publisherStmt = $pdo->query("SELECT id FROM users WHERE role = 'publisher' AND active = 1");
        $publisherIds = $publisherStmt->fetchAll(PDO::FETCH_COLUMN);
        if (!empty($publisherIds)) {
            createNotification(
                $publisherIds,
                'manuscript-published',
                'Manuscript Published',
                "Manuscript \"{$man['title']}\" has been published.",
                $mid
            );
        }

        successResponse(["message" => "Manuscript published successfully"]);
        break;

    // Legacy publish (kept for compatibility, but not used in new flow)
    case "publish":
        $data = jsonInput();
        $mid = (int)($data['manuscript_id'] ?? 0);
        if (!$mid) errorResponse("manuscript_id required");

        $check = $pdo->prepare("SELECT galley_proof_status FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
        $check->execute([$mid]);
        $row = $check->fetch();
        if (!$row) errorResponse("Manuscript not found", 404);
        if ($row['galley_proof_status'] !== 'approved') {
            errorResponse("Galley proof must be approved before publishing");
        }

        $stmt = $pdo->prepare("UPDATE manuscripts SET status = 'published', published_at = NOW() WHERE id = ? AND deleted_at IS NULL");
        $stmt->execute([$mid]);

        $manStmt = $pdo->prepare("SELECT title, author_id, slug FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
        $manStmt->execute([$mid]);
        $man = $manStmt->fetch();
        if ($man) {
            createNotification(
                $man['author_id'],
                'manuscript-published',
                'Manuscript Published',
                "Congratulations! Your manuscript \"{$man['title']}\" has been published.",
                $mid
            );
            $authorStmt = $pdo->prepare("SELECT name, email FROM users WHERE id = ?");
            $authorStmt->execute([$man['author_id']]);
            $author = $authorStmt->fetch();
            if ($author) {
                $emailBody = generateManuscriptPublishedBody($man, $author['name']);
                sendEmail($author['email'], "Your Manuscript Has Been Published", $emailBody);
            }
        }

        $editorId = getAssignedEditorId($mid);
        if ($editorId) {
            createNotification(
                $editorId,
                'manuscript-published',
                'Manuscript Published',
                "Manuscript \"{$man['title']}\" has been published.",
                $mid
            );
        }

        $publisherStmt = $pdo->query("SELECT id FROM users WHERE role = 'publisher' AND active = 1");
        $publisherIds = $publisherStmt->fetchAll(PDO::FETCH_COLUMN);
        if (!empty($publisherIds)) {
            createNotification(
                $publisherIds,
                'manuscript-published',
                'Manuscript Published',
                "Manuscript \"{$man['title']}\" has been published.",
                $mid
            );
        }

        successResponse(["message" => "Manuscript published"]);
        break;

    // ==================== OFFLINE PUBLICATION SYNC ====================
    // Admin processed a manuscript offline (paper/review handled outside the
    // system). This records it as published and links the author, editor and
    // (optionally) reviewer so the record is fully synced in the system.
    case "offlinePublish":
        $data = jsonInput();

        $title         = trim($data['title'] ?? '');
        $authorId      = (int)($data['author_id'] ?? 0);
        $editorId      = isset($data['editor_id']) && $data['editor_id'] !== '' ? (int)$data['editor_id'] : null;
        $reviewerId    = isset($data['reviewer_id']) && $data['reviewer_id'] !== '' ? (int)$data['reviewer_id'] : null;
        $publicationFile = $data['publication_file'] ?? null;
        $publishedAt   = !empty($data['published_at']) ? date('Y-m-d H:i:s', strtotime($data['published_at'])) : date('Y-m-d H:i:s');

        if (!$title) errorResponse("Title is required");
        if (!$authorId) errorResponse("Author is required");
        if (empty($publicationFile)) errorResponse("Publication file (final PDF) is required");

        // Validate author exists
        $aStmt = $pdo->prepare("SELECT id, name, email FROM users WHERE id = ? AND active = 1");
        $aStmt->execute([$authorId]);
        $author = $aStmt->fetch();
        if (!$author) errorResponse("Author not found", 404);

        // Validate editor/reviewer if provided
        if ($editorId) {
            $eStmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role = 'editor'");
            $eStmt->execute([$editorId]);
            if (!$eStmt->fetch()) errorResponse("Selected editor not found", 404);
        }
        if ($reviewerId) {
            $rStmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND role = 'reviewer'");
            $rStmt->execute([$reviewerId]);
            if (!$rStmt->fetch()) errorResponse("Selected reviewer not found", 404);
        }

        // Generate a unique slug from the title (same pattern as existing slugs)
        $base = strtolower(preg_replace('/[^A-Za-z0-9]+/', '-', $title));
        $base = trim($base, '-');
        if (strlen($base) > 46) $base = substr($base, 0, 46);
        $base = rtrim($base, '-');
        $slug = $base;
        $suffix = 1;
        $slugCheck = $pdo->prepare("SELECT COUNT(*) FROM manuscripts WHERE slug = ?");
        $slugCheck->execute([$slug]);
        while ($slugCheck->fetchColumn() > 0) {
            $slug = $base . '-' . (++$suffix);
            $slugCheck->execute([$slug]);
        }

        $pdo->beginTransaction();
        try {
            // Insert the manuscript as already published
            $stmt = $pdo->prepare("
                INSERT INTO manuscripts
                    (title, slug, study_type, status, author_id, editor_id,
                     abstract, objective, methods, results, conclusion, background,
                     authors, keywords, publication_file, published_at,
                     payment_assigned, payment_status, galley_proof_status,
                     in_production, file_path)
                VALUES
                    (:title, :slug, :study_type, 'published', :author_id, :editor_id,
                     :abstract, :objective, :methods, :results, :conclusion, :background,
                     :authors, :keywords, :publication_file, :published_at,
                     1, 'paid', 'approved',
                     1, :file_path)
            ");
            $stmt->execute([
                ':title'            => $title,
                ':slug'             => $slug,
                ':study_type'       => $data['study_type'] ?? null,
                ':author_id'        => $authorId,
                ':editor_id'        => $editorId,
                ':abstract'         => $data['abstract'] ?? null,
                ':objective'        => $data['objective'] ?? null,
                ':methods'          => $data['methods'] ?? null,
                ':results'          => $data['results'] ?? null,
                ':conclusion'       => $data['conclusion'] ?? null,
                ':background'       => $data['background'] ?? null,
                ':authors'          => $data['authors'] ?? null,
                ':keywords'         => $data['keywords'] ?? null,
                ':publication_file' => $publicationFile,
                ':published_at'     => $publishedAt,
                ':file_path'        => $data['original_file'] ?? null,
            ]);
            $newId = (int)$pdo->lastInsertId();

            // Optionally create a completed review record so reviewer stats sync
            if ($reviewerId) {
                $revStmt = $pdo->prepare("
                    INSERT INTO reviews
                        (manuscript_id, reviewer_id, status, assigned_at, completed_at, accepted_at)
                    VALUES (?, ?, 'completed', ?, NOW(), ?)
                ");
                $revStmt->execute([$newId, $reviewerId, $publishedAt, $publishedAt]);
            }

            $pdo->commit();
        } catch (Exception $inner) {
            $pdo->rollBack();
            throw $inner;
        }

        // Notify the author
        createNotification(
            $authorId,
            'manuscript-published',
            'Manuscript Published',
            "Congratulations! Your manuscript \"{$title}\" has been published.",
            $newId
        );

        // Email the author
        $emailBody = "
            <p>Dear " . htmlspecialchars($author['name']) . ",</p>
            <p>Congratulations! Your manuscript <strong>\"" . htmlspecialchars($title) . "\"</strong> has been published in the African Medical Journal.</p>
            <p>You can view and download the published article from your author dashboard.</p>
            " . SIGNATURE_EDITOR_IN_CHIEF . "
        ";
        sendEmail($author['email'], "Your Manuscript Has Been Published", $emailBody);

        // Notify assigned editor
        if ($editorId) {
            createNotification(
                $editorId,
                'manuscript-published',
                'Manuscript Published',
                "Manuscript \"{$title}\" has been published (recorded from offline processing).",
                $newId
            );
        }

        // Notify reviewer
        if ($reviewerId) {
            createNotification(
                $reviewerId,
                'manuscript-published',
                'Manuscript Published',
                "The manuscript \"{$title}\" you reviewed has been published.",
                $newId
            );
        }

        successResponse(["message" => "Offline manuscript synced and published", "manuscript_id" => $newId, "slug" => $slug]);
        break;

    // ==================== EDIT PUBLISHED MANUSCRIPTS ====================
    // List all published manuscripts for admin editing
    case "listPublished":
        $stmt = $pdo->query("
            SELECT
                m.id,
                m.slug AS manuscriptId,
                m.title,
                COALESCE(m.authors, u.name) AS authors,
                m.study_type,
                m.keywords,
                m.abstract,
                m.objective,
                m.methods,
                m.results,
                m.conclusion,
                m.publication_file,
                m.published_at,
                m.views,
                m.downloads,
                u.name AS author_name
            FROM manuscripts m
            JOIN users u ON u.id = m.author_id
            WHERE m.status = 'published' AND m.deleted_at IS NULL
            ORDER BY m.published_at DESC
        ");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $out = array_map(function($row) {
            return [
                "id"              => (int)$row['id'],
                "manuscriptId"   => $row['manuscriptId'],
                "title"           => $row['title'],
                "authors"         => $row['authors'],
                "authorName"      => $row['author_name'],
                "studyType"       => $row['study_type'],
                "keywords"        => $row['keywords'],
                "abstract"        => $row['abstract'],
                "objective"       => $row['objective'],
                "methods"         => $row['methods'],
                "results"         => $row['results'],
                "conclusion"      => $row['conclusion'],
                "publicationFile" => $row['publication_file'],
                "publishedAt"     => $row['published_at'],
                "views"           => (int)$row['views'],
                "downloads"       => (int)$row['downloads'],
            ];
        }, $rows);

        jsonResponse($out);
        break;

    // Update an already-published manuscript and optionally replace its PDF
    case "updatePublished":
        $data = jsonInput();
        $mid = (int)($data['manuscript_id'] ?? 0);
        if (!$mid) errorResponse("manuscript_id required");

        $check = $pdo->prepare("SELECT status FROM manuscripts WHERE id = ? AND deleted_at IS NULL");
        $check->execute([$mid]);
        $row = $check->fetch();
        if (!$row) errorResponse("Manuscript not found", 404);
        if ($row['status'] !== 'published') errorResponse("Manuscript is not published");

        $allowedFields = ['title', 'authors', 'keywords', 'study_type', 'abstract', 'objective', 'methods', 'results', 'conclusion'];
        $updates = [];
        $params = [':id' => $mid];

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $updates[] = "$field = :$field";
                $params[":$field"] = $data[$field] ?? null;
            }
        }

        // Optional replacement of the published PDF
        if (!empty($data['publication_file'])) {
            $updates[] = "publication_file = :publication_file";
            $params[':publication_file'] = $data['publication_file'];
        }

        // Optional update of the publication date (republication)
        if (!empty($data['published_at'])) {
            $updates[] = "published_at = :published_at";
            $params[':published_at'] = date('Y-m-d H:i:s', strtotime($data['published_at']));
        }

        if (empty($updates)) errorResponse("No fields to update");

        $sql = "UPDATE manuscripts SET " . implode(", ", $updates) . " WHERE id = :id AND deleted_at IS NULL";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        // Fetch title for notification
        $tStmt = $pdo->prepare("SELECT title, author_id FROM manuscripts WHERE id = ?");
        $tStmt->execute([$mid]);
        $man = $tStmt->fetch();

        // Notify the author that their published article was updated
        if ($man) {
            createNotification(
                $man['author_id'],
                'manuscript-updated',
                'Published Article Updated',
                "Your published article \"{$man['title']}\" has been updated by the editorial team.",
                $mid
            );
        }

        successResponse(["message" => "Published manuscript updated successfully"]);
        break;

    // Update publication metadata
    case "updatePublicationData":
        $data = jsonInput();
        $mid = (int)($data['manuscript_id'] ?? 0);
        if (!$mid) errorResponse("manuscript_id required");

        $allowedFields = ['title', 'authors', 'keywords', 'study_type', 'abstract', 'objective', 'methods', 'results', 'conclusion'];
        $updates = [];
        $params = [':id' => $mid];

        foreach ($allowedFields as $field) {
            if (array_key_exists($field, $data)) {
                $updates[] = "$field = :$field";
                $params[":$field"] = $data[$field] ?? null;
            }
        }

        if (empty($updates)) {
            errorResponse("No fields to update");
        }

        $sql = "UPDATE manuscripts SET " . implode(", ", $updates) . " WHERE id = :id AND deleted_at IS NULL";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        successResponse(["message" => "Publication data updated"]);
        break;

    default:
        errorResponse("Invalid action: $action", 400);
}

} catch (PDOException $e) {
    error_log("Publication API DB Error: " . $e->getMessage());
    errorResponse("Database error", 500);
} catch (Exception $e) {
    error_log("Publication API General Error: " . $e->getMessage());
    errorResponse($e->getMessage(), 500);
}
?>