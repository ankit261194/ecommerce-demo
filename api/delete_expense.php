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

verifyApiAuth();

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$id = intval($input['id'] ?? 0);

if ($id <= 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "वैध बिल ID अनिवार्य है।"], JSON_UNESCAPED_UNICODE);
    exit;
}

$pdo = getDB();

try {
    $stmt = $pdo->prepare("DELETE FROM yatra_expenses WHERE id = :id");
    $stmt->execute([':id' => $id]);

    echo json_encode([
        "success" => true,
        "id" => $id,
        "message" => "बिल (#$id) सफलतापूर्वक हटा दिया गया।"
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
