<?php
// Central Devotee Face Profile Retrieval API
// Shri Balaji Kripa Dham - Hostinger MySQL
require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $pdo = getDB();

    // Auto-create table if not exists
    $pdo->exec("CREATE TABLE IF NOT EXISTS devotee_face_profiles (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        patient_name VARCHAR(255) NOT NULL,
        phone_number VARCHAR(50) NOT NULL UNIQUE,
        city VARCHAR(255) DEFAULT 'डूँगरा जाट (स्थानीय)',
        face_vector_b64 LONGTEXT,
        photo_url LONGTEXT,
        visit_count INT DEFAULT 1,
        registered_by VARCHAR(100) DEFAULT 'APP',
        device_id VARCHAR(100) DEFAULT '',
        last_verified_at BIGINT DEFAULT 0,
        created_at BIGINT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_phone (phone_number),
        INDEX idx_name (patient_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $sinceMs = isset($_GET['since']) ? intval($_GET['since']) : (isset($_POST['since']) ? intval($_POST['since']) : 0);
    $limit = isset($_GET['limit']) ? min(intval($_GET['limit']), 1000) : 500;

    if ($sinceMs > 0) {
        $stmt = $pdo->prepare("SELECT patient_name, phone_number, city, face_vector_b64, photo_url, visit_count, last_verified_at, created_at 
            FROM devotee_face_profiles 
            WHERE face_vector_b64 IS NOT NULL AND face_vector_b64 != '' AND last_verified_at >= :since 
            ORDER BY last_verified_at DESC LIMIT :lim");
        $stmt->bindValue(':since', $sinceMs, PDO::PARAM_INT);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
    } else {
        $stmt = $pdo->prepare("SELECT patient_name, phone_number, city, face_vector_b64, photo_url, visit_count, last_verified_at, created_at 
            FROM devotee_face_profiles 
            WHERE face_vector_b64 IS NOT NULL AND face_vector_b64 != '' 
            ORDER BY last_verified_at DESC LIMIT :lim");
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
    }

    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        "success" => true,
        "count" => count($rows),
        "profiles" => $rows
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
