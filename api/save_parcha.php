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

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$darbarDate = trim($input['darbar_date'] ?? date('Y-m-d'));
$tokenNumber = intval($input['token_number'] ?? 0);
$devoteeName = trim($input['devotee_name'] ?? '');
$phoneNumber = trim($input['phone_number'] ?? '');
$parchaText = trim($input['parcha_text'] ?? '');
$parchaPhotoUrl = trim($input['parcha_photo_url'] ?? '');
$upayGuidelines = trim($input['upay_guidelines'] ?? '');
$createdBy = trim($input['created_by'] ?? 'परम पूज्य गुरुजी');
$createdAt = intval($input['created_at'] ?? (time() * 1000));

if (empty($devoteeName) || empty($parchaText)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "भक्त का नाम और पर्चा विवरण अनिवार्य हैं।"], JSON_UNESCAPED_UNICODE);
    exit;
}

$pdo = getDB();

try {
    $stmt = $pdo->prepare("INSERT INTO sacred_parchas (
        darbar_date, token_number, devotee_name, phone_number, parcha_text, parcha_photo_url, upay_guidelines, created_by, created_at
    ) VALUES (
        :darbar_date, :token_number, :devotee_name, :phone_number, :parcha_text, :photo_url, :upay_guidelines, :created_by, :created_at
    )");

    $stmt->execute([
        ':darbar_date' => $darbarDate,
        ':token_number' => $tokenNumber,
        ':devotee_name' => $devoteeName,
        ':phone_number' => $phoneNumber,
        ':parcha_text' => $parchaText,
        ':photo_url' => $parchaPhotoUrl,
        ':upay_guidelines' => $upayGuidelines,
        ':created_by' => $createdBy,
        ':created_at' => $createdAt
    ]);

    $savedId = $pdo->lastInsertId();

    echo json_encode([
        "success" => true,
        "id" => $savedId,
        "devotee_name" => $devoteeName,
        "message" => "दिव्य पर्चा (#$savedId) सफलतापूर्वक सुरक्षित हुआ!"
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
