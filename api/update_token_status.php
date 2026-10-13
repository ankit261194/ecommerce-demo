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

$action = strtoupper(trim($input['action'] ?? ''));
$darbarDate = trim($input['darbar_date'] ?? date('Y-m-d'));
$tokenNumber = intval($input['token_number'] ?? 0);
$tokenId = intval($input['token_id'] ?? 0);
$status = strtoupper(trim($input['status'] ?? ''));

$pdo = getDB();

// Robust deletion handler fallback
if ($action === 'DELETE_ALL_FOR_DATE' || $status === 'DELETE_ALL') {
    if (empty($darbarDate)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "दरबार की तारीख अनिवार्य है।"], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $delStmt = $pdo->prepare("DELETE FROM tokens WHERE darbar_date = :darbar_date");
    $delStmt->execute([':darbar_date' => $darbarDate]);
    $deletedCount = $delStmt->rowCount();

    $cacheFile = __DIR__ . '/../cache/live_config_cache.json';
    if (file_exists($cacheFile)) @unlink($cacheFile);

    echo json_encode([
        "success" => true,
        "message" => "दिनांक $darbarDate के कुल $deletedCount टोकन सफलतापूर्वक हटाए गए।",
        "deleted_count" => $deletedCount,
        "darbar_date" => $darbarDate
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'DELETE' || $action === 'DELETE_SINGLE' || $status === 'DELETED') {
    if ($tokenNumber > 0) {
        $delStmt = $pdo->prepare("DELETE FROM tokens WHERE darbar_date = :darbar_date AND token_number = :token_number");
        $delStmt->execute([':darbar_date' => $darbarDate, ':token_number' => $tokenNumber]);
    } elseif ($tokenId > 0) {
        $delStmt = $pdo->prepare("DELETE FROM tokens WHERE id = :id");
        $delStmt->execute([':id' => $tokenId]);
    }
    $cacheFile = __DIR__ . '/../cache/live_config_cache.json';
    if (file_exists($cacheFile)) @unlink($cacheFile);

    echo json_encode(["success" => true, "message" => "टोकन सफलतापूर्वक हटाया गया।"], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($tokenNumber <= 0 || empty($status)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "टोकन नंबर और स्थिति अनिवार्य हैं।"], JSON_UNESCAPED_UNICODE);
    exit;
}

$validStatuses = ['WAITING', 'SERVING', 'COMPLETED', 'CANCELLED', 'ABSENT'];
if (!in_array($status, $validStatuses)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "अमान्य टोकन स्थिति।"], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $pdo->beginTransaction();

    $isCompleted = ($status === 'COMPLETED') ? 1 : 0;
    $completedAt = ($status === 'COMPLETED') ? (time() * 1000) : null;

    $stmt = $pdo->prepare("UPDATE tokens SET
        status = :status,
        is_darshan_completed = :completed,
        darshan_completed_at = COALESCE(:completed_at, darshan_completed_at)
        WHERE darbar_date = :darbar_date AND token_number = :token_number");
    
    $stmt->execute([
        ':status' => $status,
        ':completed' => $isCompleted,
        ':completed_at' => $completedAt,
        ':darbar_date' => $darbarDate,
        ':token_number' => $tokenNumber
    ]);

    // If setting to SERVING or COMPLETED, update current_serving_token in ashram_settings and invalidate cache
    if ($status === 'SERVING' || $status === 'COMPLETED') {
        $upSettings = $pdo->prepare("UPDATE ashram_settings SET current_serving_token = :tok WHERE id = 1 AND current_serving_token <= :tok");
        $upSettings->execute([':tok' => $tokenNumber]);
    }

    // Invalidate all caches (live_config_cache.json, site_data_cache.json, etc.) immediately
    $allCaches = glob(__DIR__ . '/../cache/*');
    if ($allCaches) {
        @array_map('unlink', $allCaches);
    }

    if ($status === 'SERVING') {
        // Fetch devotee details for push notification
        try {
            $tokInfo = $pdo->prepare("SELECT patient_name, phone_number FROM tokens WHERE darbar_date = :darbar_date AND token_number = :token_number LIMIT 1");
            $tokInfo->execute([':darbar_date' => $darbarDate, ':token_number' => $tokenNumber]);
            $devotee = $tokInfo->fetch(PDO::FETCH_ASSOC);
            if ($devotee && !empty($devotee['phone_number'])) {
                $cleanPhone = preg_replace('/[^0-9]/', '', $devotee['phone_number']);
                if (strlen($cleanPhone) > 10) $cleanPhone = substr($cleanPhone, -10);
                
                $title = "🔔 टोकन बुलावा: टोकन #$tokenNumber";
                $body = "श्री {$devotee['patient_name']} जी, टोकन #$tokenNumber का नंबर आ गया है। कृपया गुरुजी के समीप पधारें।";
                $now = round(microtime(true) * 1000);

                // Insert into devotee_notifications
                $pdo->exec("CREATE TABLE IF NOT EXISTS devotee_notifications (
                    id BIGINT AUTO_INCREMENT PRIMARY KEY,
                    phone_number VARCHAR(50) NOT NULL,
                    token_number INT DEFAULT 0,
                    title VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    type VARCHAR(50) DEFAULT 'TOKEN_CALL',
                    is_read TINYINT DEFAULT 0,
                    created_at BIGINT DEFAULT 0,
                    INDEX idx_phone (phone_number),
                    INDEX idx_created (created_at)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

                $notifStmt = $pdo->prepare("INSERT INTO devotee_notifications (phone_number, token_number, title, message, type, is_read, created_at)
                    VALUES (:phone, :tok, :title, :msg, 'TOKEN_CALL', 0, :now)");
                $notifStmt->execute([
                    ':phone' => $cleanPhone,
                    ':tok' => $tokenNumber,
                    ':title' => $title,
                    ':msg' => $body,
                    ':now' => $now
                ]);

                // Dispatch FCM to device tokens
                $fcmStmt = $pdo->prepare("SELECT fcm_token FROM fcm_device_tokens WHERE phone_number = :phone");
                $fcmStmt->execute([':phone' => $cleanPhone]);
                $fcmTokens = $fcmStmt->fetchAll(PDO::FETCH_COLUMN);

                if (!empty($fcmTokens)) {
                    $apiKey = 'AIzaSyDbJQvMUopfPb0at-_upRMnR6MjL6z9lRo';
                    $fields = [
                        'registration_ids' => $fcmTokens,
                        'priority' => 'high',
                        'notification' => [
                            'title' => $title,
                            'body' => $body,
                            'sound' => 'default',
                            'badge' => '1',
                            'channel_id' => 'ashram_darbar_channel'
                        ],
                        'data' => [
                            'type' => 'TOKEN_CALL',
                            'token_number' => strval($tokenNumber),
                            'patient_name' => $devotee['patient_name'],
                            'status' => 'SERVING'
                        ]
                    ];
                    $ch = curl_init();
                    curl_setopt($ch, CURLOPT_URL, 'https://fcm.googleapis.com/fcm/send');
                    curl_setopt($ch, CURLOPT_POST, true);
                    curl_setopt($ch, CURLOPT_HTTPHEADER, [
                        'Authorization: key=' . $apiKey,
                        'Content-Type: application/json'
                    ]);
                    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($fields));
                    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
                    curl_exec($ch);
                    curl_close($ch);
                }
            }
        } catch (Exception $ex) {
            // Log silently, do not break token update transaction
        }
    }

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "darbar_date" => $darbarDate,
        "token_number" => $tokenNumber,
        "status" => $status,
        "message" => "टोकन $tokenNumber की स्थिति '$status' सफलतापूर्वक अपडेट हुई।"
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
