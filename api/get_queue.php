<?php
if (file_exists(__DIR__ . '/../config/db.php')) {
    require_once __DIR__ . '/../config/db.php';
} elseif (file_exists(__DIR__ . '/config/db.php')) {
    require_once __DIR__ . '/config/db.php';
} else {
    if (!defined('DB_HOST')) define('DB_HOST', 'localhost');
    if (!defined('DB_NAME')) define('DB_NAME', 'u237101617_balaji');
    if (!defined('DB_USER')) define('DB_USER', 'u237101617_ankitantim0');
    if (!defined('DB_PASS')) define('DB_PASS', 'Aa@8006518960');
    function getDB() {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        return new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]);
    }
}

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");

$darbarDate = trim($_GET['date'] ?? date('Y-m-d'));
$pdo = getDB();

try {
    $settingsStmt = $pdo->query("SELECT * FROM ashram_settings WHERE id = 1 LIMIT 1");
    $settings = $settingsStmt->fetch() ?: [];

    $stmt = $pdo->prepare("SELECT * FROM tokens WHERE darbar_date = :darbar_date ORDER BY token_number ASC");
    $stmt->execute([':darbar_date' => $darbarDate]);
    $rawTokens = $stmt->fetchAll();

    $reservedSlots = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
    $existingMap = [];
    $maxTokenNum = 0;
    foreach ($rawTokens as $t) {
        $num = intval($t['token_number']);
        $existingMap[$num] = $t;
        if ($num > $maxTokenNum) $maxTokenNum = $num;
    }

    $tokens = [];
    // If there are tokens today, display sequence including any unfilled VIP reserved slots up to maxTokenNum
    if ($maxTokenNum > 0) {
        for ($i = 1; $i <= $maxTokenNum; $i++) {
            if (isset($existingMap[$i])) {
                $tokens[] = $existingMap[$i];
            } elseif (in_array($i, $reservedSlots)) {
                // Unfilled reserved VIP slot
                $tokens[] = [
                    "id" => -($i),
                    "darbar_date" => $darbarDate,
                    "token_number" => $i,
                    "patient_name" => "व्यवस्थापक आरक्षित",
                    "phone_number" => "---",
                    "city" => "विशेष आरक्षित",
                    "device_id" => "",
                    "latitude" => 0,
                    "longitude" => 0,
                    "distance_km" => 0,
                    "origin_address" => "व्यवस्थापक आरक्षित स्लॉट",
                    "destination_address" => "श्री बालाजी कृपा धाम",
                    "photo_url" => "",
                    "status" => "WAITING",
                    "status_description" => "प्रतीक्षारत / मरीज अभी उपस्थित नहीं है",
                    "registered_by" => "RESERVED_SLOT",
                    "is_darshan_completed" => 0,
                    "is_reserved_unfilled" => 1,
                    "created_at" => time() * 1000
                ];
            }
        }
    } else {
        $tokens = $rawTokens;
    }

    $waiting = 0;
    $completed = 0;
    $cancelled = 0;
    $absent = 0;
    foreach ($tokens as $t) {
        $st = strtoupper($t['status'] ?? '');
        if ($st === 'COMPLETED' || !empty($t['is_darshan_completed'])) {
            $completed++;
        } elseif ($st === 'ABSENT') {
            $absent++;
        } elseif ($st === 'CANCELLED') {
            $cancelled++;
        } else {
            $waiting++;
        }
    }

    echo json_encode([
        "success" => true,
        "darbar_date" => $darbarDate,
        "current_serving_token" => intval($settings['current_serving_token'] ?? 0),
        "total_tokens" => count($tokens),
        "waiting_count" => $waiting,
        "completed_count" => $completed,
        "cancelled_count" => $cancelled,
        "absent_count" => $absent,
        "tokens" => $tokens
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
