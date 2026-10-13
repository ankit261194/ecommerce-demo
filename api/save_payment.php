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

$receiptNumber = trim($input['receipt_number'] ?? ('REC-' . time() . '-' . rand(100, 999)));
$devoteeName = trim($input['devotee_name'] ?? '');
$phoneNumber = trim($input['phone_number'] ?? '');
$amount = floatval($input['amount'] ?? 0.0);
$purpose = trim($input['purpose'] ?? 'दान / सहयोग राशि');
$paymentMode = trim($input['payment_mode'] ?? 'UPI');
$transactionId = trim($input['transaction_id'] ?? '');
$status = trim($input['status'] ?? 'SUCCESS');
$collectedBy = trim($input['collected_by'] ?? 'ADMIN');
$notes = trim($input['notes'] ?? '');
$createdAt = intval($input['created_at'] ?? (time() * 1000));

if (empty($devoteeName) || $amount <= 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "भक्त का नाम और वैध राशि अनिवार्य हैं।"], JSON_UNESCAPED_UNICODE);
    exit;
}

$pdo = getDB();

try {
    $stmt = $pdo->prepare("INSERT INTO payment_records (
        receipt_number, devotee_name, phone_number, amount, purpose, payment_mode, transaction_id, status, collected_by, notes, created_at
    ) VALUES (
        :receipt_number, :devotee_name, :phone_number, :amount, :purpose, :payment_mode, :transaction_id, :status, :collected_by, :notes, :created_at
    ) ON DUPLICATE KEY UPDATE
        devotee_name = VALUES(devotee_name),
        phone_number = VALUES(phone_number),
        amount = VALUES(amount),
        purpose = VALUES(purpose),
        payment_mode = VALUES(payment_mode),
        transaction_id = VALUES(transaction_id),
        status = VALUES(status),
        collected_by = VALUES(collected_by),
        notes = VALUES(notes)");

    $stmt->execute([
        ':receipt_number' => $receiptNumber,
        ':devotee_name' => $devoteeName,
        ':phone_number' => $phoneNumber,
        ':amount' => $amount,
        ':purpose' => $purpose,
        ':payment_mode' => $paymentMode,
        ':transaction_id' => $transactionId,
        ':status' => $status,
        ':collected_by' => $collectedBy,
        ':notes' => $notes,
        ':created_at' => $createdAt
    ]);

    $savedId = $pdo->lastInsertId();

    echo json_encode([
        "success" => true,
        "receipt_number" => $receiptNumber,
        "devotee_name" => $devoteeName,
        "amount" => $amount,
        "message" => "दान/भुगतान रसीद ($receiptNumber) सफलतापूर्वक दर्ज हुई!"
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
