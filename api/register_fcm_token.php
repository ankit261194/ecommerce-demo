<?php
// Central FCM Device Token Registration API
// Shri Balaji Kripa Dham - Hostinger MySQL
require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $pdo = getDB();

    // Auto-create FCM tokens table
    $pdo->exec("CREATE TABLE IF NOT EXISTS fcm_device_tokens (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        phone_number VARCHAR(50) NOT NULL,
        fcm_token TEXT NOT NULL,
        device_id VARCHAR(100) DEFAULT '',
        device_name VARCHAR(100) DEFAULT '',
        created_at BIGINT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_phone (phone_number),
        UNIQUE KEY uq_phone_token (phone_number(30), fcm_token(100))
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?: $_POST;

    $phoneNumber = trim($input['phone_number'] ?? '');
    $fcmToken = trim($input['fcm_token'] ?? '');
    $deviceId = trim($input['device_id'] ?? '');
    $deviceName = trim($input['device_name'] ?? '');

    if (empty($phoneNumber) || empty($fcmToken)) {
        echo json_encode(["success" => false, "error" => "Phone number and FCM token are required."]);
        exit;
    }

    $cleanPhone = preg_replace('/[^0-9]/', '', $phoneNumber);
    if (strlen($cleanPhone) > 10) {
        $cleanPhone = substr($cleanPhone, -10);
    }

    $now = round(microtime(true) * 1000);

    $stmt = $pdo->prepare("
        INSERT INTO fcm_device_tokens (phone_number, fcm_token, device_id, device_name, created_at)
        VALUES (:phone, :token, :device_id, :device_name, :now)
        ON DUPLICATE KEY UPDATE
            device_id = VALUES(device_id),
            device_name = VALUES(device_name),
            updated_at = CURRENT_TIMESTAMP;
    ");

    $stmt->execute([
        ':phone' => $cleanPhone,
        ':token' => $fcmToken,
        ':device_id' => $deviceId,
        ':device_name' => $deviceName,
        ':now' => $now
    ]);

    echo json_encode([
        "success" => true,
        "message" => "FCM Token registered successfully for devotee.",
        "phone_number" => $cleanPhone
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
