<?php
// ==============================================================================
// श्री बालाजी कृपा धाम - केंद्रीय डिवाइस सत्यापन सेवा (Anti-Clear-Data Enforcement)
// Instant Real-Time Device Verification across Cloud DB
// ==============================================================================

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
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$deviceId = trim($_GET['device_id'] ?? $_POST['device_id'] ?? '');
$phoneNumber = trim($_GET['phone_number'] ?? $_POST['phone_number'] ?? '');
$darbarDate = trim($_GET['darbar_date'] ?? $_POST['darbar_date'] ?? date('Y-m-d'));

if (empty($deviceId) && empty($phoneNumber)) {
    http_response_code(400);
    echo json_encode(["success" => false, "registered" => false, "error" => "Device ID or Phone Number is required."], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $pdo = getDB();
    if (!$pdo) {
        echo json_encode(["success" => true, "registered" => false, "message" => "DB unavailable, fallback allowed"]);
        exit;
    }

    $token = null;

    // 1. Check by Device ID
    if (!empty($deviceId)) {
        $stmt = $pdo->prepare("SELECT * FROM tokens WHERE device_id = :dev AND darbar_date = :date AND status != 'CANCELLED' ORDER BY id DESC LIMIT 1");
        $stmt->execute([':dev' => $deviceId, ':date' => $darbarDate]);
        $token = $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // 2. Check by Phone Number (Last 10 digits) if not found by device
    if (!$token && !empty($phoneNumber)) {
        $cleanPhone = preg_replace('/[^0-9]/', '', $phoneNumber);
        if (strlen($cleanPhone) >= 10) {
            $last10 = substr($cleanPhone, -10);
            $stmt = $pdo->prepare("SELECT * FROM tokens WHERE RIGHT(phone_number, 10) = :phone AND darbar_date = :date AND status != 'CANCELLED' ORDER BY id DESC LIMIT 1");
            $stmt->execute([':phone' => $last10, ':date' => $darbarDate]);
            $token = $stmt->fetch(PDO::FETCH_ASSOC);
        }
    }

    if ($token) {
        echo json_encode([
            "success" => true,
            "registered" => true,
            "token" => [
                "id" => (int)$token['id'],
                "token_number" => (int)$token['token_number'],
                "darbar_date" => $token['darbar_date'],
                "patient_name" => $token['patient_name'],
                "phone_number" => $token['phone_number'],
                "city" => $token['city'] ?? '',
                "device_id" => $token['device_id'] ?? '',
                "latitude" => (float)($token['latitude'] ?? 0.0),
                "longitude" => (float)($token['longitude'] ?? 0.0),
                "distance_km" => (float)($token['distance_km'] ?? 0.0),
                "origin_address" => $token['origin_address'] ?? '',
                "destination_address" => $token['destination_address'] ?? '',
                "photo_url" => $token['photo_url'] ?? '',
                "status" => $token['status'] ?? 'WAITING',
                "registered_by" => $token['registered_by'] ?? 'SELF',
                "is_darshan_completed" => (int)($token['is_darshan_completed'] ?? 0) === 1,
                "created_at" => (int)($token['created_at'] ?? 0)
            ],
            "message" => "इस डिवाइस पर आज का टोकन पहले से मौजूद है।"
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    } else {
        echo json_encode([
            "success" => true,
            "registered" => false,
            "message" => "इस डिवाइस से आज कोई टोकन नहीं लिया गया है।"
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }

} catch (Exception $e) {
    echo json_encode([
        "success" => true,
        "registered" => false,
        "error" => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
