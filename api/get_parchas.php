<?php
if (file_exists(__DIR__ . '/../config/db.php')) {
    require_once __DIR__ . '/../config/db.php';
} else {
    require_once __DIR__ . '/config/db.php';
}

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");

$pdo = getDB();

try {
    $stmt = $pdo->query("SELECT * FROM sacred_parchas ORDER BY id DESC LIMIT 500");
    $parchas = $stmt->fetchAll();

    echo json_encode([
        "success" => true,
        "total_count" => count($parchas),
        "parchas" => $parchas
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
