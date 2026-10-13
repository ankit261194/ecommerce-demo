<?php
if (file_exists(__DIR__ . '/../config/db.php')) {
    require_once __DIR__ . '/../config/db.php';
} else {
    require_once __DIR__ . '/config/db.php';
}

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method Not Allowed"]);
    exit;
}

verifyApiAuth();

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$id = intval($input['id'] ?? 0);
$title = trim($input['title'] ?? '');
$amount = floatval($input['amount'] ?? 0.0);
$category = trim($input['category'] ?? 'सामान्य आश्रम खर्च');
$expenseDate = trim($input['expense_date'] ?? date('Y-m-d'));
$spentBy = trim($input['spent_by'] ?? 'आश्रम व्यवस्थापक');
$receiptPhotoUrl = trim($input['receipt_photo_url'] ?? '');
$paymentMode = trim($input['payment_mode'] ?? 'CASH');
$notes = trim($input['notes'] ?? '');
$createdAt = intval($input['created_at'] ?? (time() * 1000));

if (empty($title) || $amount <= 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "शीर्षक और वैध राशि अनिवार्य हैं।"], JSON_UNESCAPED_UNICODE);
    exit;
}

$pdo = getDB();

try {
    if ($id > 0) {
        $stmt = $pdo->prepare("UPDATE yatra_expenses SET
            title = :title,
            amount = :amount,
            category = :category,
            expense_date = :expense_date,
            spent_by = :spent_by,
            receipt_photo_url = :photo_url,
            payment_mode = :payment_mode,
            notes = :notes
            WHERE id = :id");
        $stmt->execute([
            ':title' => $title,
            ':amount' => $amount,
            ':category' => $category,
            ':expense_date' => $expenseDate,
            ':spent_by' => $spentBy,
            ':photo_url' => $receiptPhotoUrl,
            ':payment_mode' => $paymentMode,
            ':notes' => $notes,
            ':id' => $id
        ]);
        $savedId = $id;
        $msg = "बिल/खर्च (#$id) सफलतापूर्वक अपडेट हुआ!";
    } else {
        $stmt = $pdo->prepare("INSERT INTO yatra_expenses (
            title, amount, category, expense_date, spent_by, receipt_photo_url, payment_mode, notes, created_at
        ) VALUES (
            :title, :amount, :category, :expense_date, :spent_by, :photo_url, :payment_mode, :notes, :created_at
        )");
        $stmt->execute([
            ':title' => $title,
            ':amount' => $amount,
            ':category' => $category,
            ':expense_date' => $expenseDate,
            ':spent_by' => $spentBy,
            ':photo_url' => $receiptPhotoUrl,
            ':payment_mode' => $paymentMode,
            ':notes' => $notes,
            ':created_at' => $createdAt
        ]);
        $savedId = $pdo->lastInsertId();
        $msg = "नया बिल/खर्च (#$savedId) सफलतापूर्वक दर्ज हुआ!";
    }

    echo json_encode([
        "success" => true,
        "id" => $savedId,
        "title" => $title,
        "amount" => $amount,
        "message" => $msg
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
