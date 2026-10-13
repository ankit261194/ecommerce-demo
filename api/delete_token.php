<?php
// Shri Balaji Kripa Dham - Token Deletion API (SuperAdmin Access)
if (file_exists(__DIR__ . '/../config/db.php')) {
    require_once __DIR__ . '/../config/db.php';
} else {
    require_once __DIR__ . '/config/db.php';
}

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-SBKD-API-KEY, x-sbkd-api-key");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["success" => false, "error" => "Method Not Allowed"], JSON_UNESCAPED_UNICODE);
    exit;
}

verifyApiAuth();

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$action = trim($input['action'] ?? 'DELETE_SINGLE');
$darbarDate = trim($input['darbar_date'] ?? date('Y-m-d'));
$tokenNumber = intval($input['token_number'] ?? 0);
$tokenId = intval($input['token_id'] ?? 0);

$pdo = getDB();

try {
    if ($action === 'DELETE_ALL_FOR_DATE') {
        if (empty($darbarDate)) {
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "दरबार की तारीख अनिवार्य है।"], JSON_UNESCAPED_UNICODE);
            exit;
        }

        $stmt = $pdo->prepare("DELETE FROM tokens WHERE darbar_date = :darbar_date");
        $stmt->execute([':darbar_date' => $darbarDate]);
        $deletedCount = $stmt->rowCount();

        try {
            $pdo->exec("UPDATE ashram_settings SET current_serving_token = 1 WHERE id = 1");
        } catch (Exception $ex) {}

        echo json_encode([
            "success" => true,
            "message" => "दिनांक $darbarDate के कुल $deletedCount टोकन सफलतापूर्वक हटाए गए।",
            "deleted_count" => $deletedCount,
            "darbar_date" => $darbarDate
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Default: Single Token Deletion
    if ($tokenNumber > 0) {
        $stmt = $pdo->prepare("DELETE FROM tokens WHERE darbar_date = :darbar_date AND token_number = :token_number");
        $stmt->execute([
            ':darbar_date' => $darbarDate,
            ':token_number' => $tokenNumber
        ]);
        $deletedCount = $stmt->rowCount();
    } elseif ($tokenId > 0) {
        $stmt = $pdo->prepare("DELETE FROM tokens WHERE id = :id");
        $stmt->execute([':id' => $tokenId]);
        $deletedCount = $stmt->rowCount();
    } else {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "टोकन नंबर अथवा टोकन ID अनिवार्य है।"], JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode([
        "success" => true,
        "message" => "टोकन #$tokenNumber ($darbarDate) सफलतापूर्वक हटाया गया।",
        "deleted_count" => $deletedCount,
        "token_number" => $tokenNumber,
        "darbar_date" => $darbarDate
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
