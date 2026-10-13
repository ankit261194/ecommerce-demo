<?php
// Central Devotee Face Profile Synchronization API
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

    verifyApiAuth();

    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?: $_POST;

    $phoneNumber = trim($input['phone_number'] ?? '');
    $patientName = trim($input['patient_name'] ?? '');
    $city = trim($input['city'] ?? 'डूँगरा जाट (स्थानीय)');
    $faceVectorB64 = trim($input['face_vector_b64'] ?? '');
    $photoUrl = trim($input['photo_url'] ?? '');
    $registeredBy = trim($input['registered_by'] ?? 'APP');
    $deviceId = trim($input['device_id'] ?? '');

    if (empty($phoneNumber) || empty($patientName)) {
        echo json_encode(["success" => false, "error" => "Phone number and Name are required."]);
        exit;
    }

    $cleanPhone = preg_replace('/[^0-9]/', '', $phoneNumber);
    if (strlen($cleanPhone) > 10) {
        $cleanPhone = substr($cleanPhone, -10);
    }

    $now = round(microtime(true) * 1000);

    // Upsert into MySQL
    $stmt = $pdo->prepare("
        INSERT INTO devotee_face_profiles 
        (patient_name, phone_number, city, face_vector_b64, photo_url, visit_count, registered_by, device_id, last_verified_at, created_at)
        VALUES (:name, :phone, :city, :vector, :photo, 1, :registered_by, :device_id, :now, :now)
        ON DUPLICATE KEY UPDATE
            patient_name = VALUES(patient_name),
            city = IF(VALUES(city) != '', VALUES(city), city),
            face_vector_b64 = IF(VALUES(face_vector_b64) != '', VALUES(face_vector_b64), face_vector_b64),
            photo_url = IF(VALUES(photo_url) != '', VALUES(photo_url), photo_url),
            visit_count = visit_count + 1,
            last_verified_at = VALUES(last_verified_at),
            device_id = VALUES(device_id);
    ");

    $stmt->execute([
        ':name' => $patientName,
        ':phone' => $cleanPhone,
        ':city' => $city,
        ':vector' => $faceVectorB64,
        ':photo' => $photoUrl,
        ':registered_by' => $registeredBy,
        ':device_id' => $deviceId,
        ':now' => $now
    ]);

    echo json_encode([
        "success" => true,
        "message" => "Devotee face profile synced to central server successfully.",
        "phone_number" => $cleanPhone
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
