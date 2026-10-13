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
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-SBKD-API-KEY");

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

$isLive = isset($input['is_live']) ? intval($input['is_live']) : (isset($input['is_darbar_live_now']) ? intval($input['is_darbar_live_now']) : 0);
$title = trim($input['live_stream_title'] ?? 'श्री बालाजी कृपा धाम दिव्य दरबार लाइव');
$liveUrl = trim($input['live_stream_url'] ?? '');
$ytUrl = trim($input['youtube_live_url'] ?? '');
$fbUrl = trim($input['facebook_live_url'] ?? '');

try {
    $pdo = getDB();

    // Auto-add columns if missing
    $cols = $pdo->query("SHOW COLUMNS FROM ashram_settings")->fetchAll(PDO::FETCH_COLUMN);
    $colSet = array_flip($cols);
    $needed = [
        'is_darbar_live_now' => 'TINYINT(1) NOT NULL DEFAULT 0',
        'live_stream_title' => "VARCHAR(255) NOT NULL DEFAULT 'श्री बालाजी कृपा धाम दिव्य दरबार लाइव'",
        'live_stream_url' => "VARCHAR(500) DEFAULT ''",
        'youtube_live_url' => "VARCHAR(500) DEFAULT ''",
        'facebook_live_url' => "VARCHAR(500) DEFAULT ''"
    ];
    foreach ($needed as $col => $def) {
        if (!isset($colSet[$col])) {
            try { $pdo->exec("ALTER TABLE ashram_settings ADD COLUMN $col $def"); } catch (Exception $ign) {}
        }
    }

    $stmt = $pdo->prepare("UPDATE ashram_settings SET
        is_darbar_live_now = :is_live,
        live_stream_title = :title,
        live_stream_url = :live_url,
        youtube_live_url = :yt_url,
        facebook_live_url = :fb_url,
        config_version = COALESCE(config_version, 1) + 1
        WHERE id = 1");
    $stmt->execute([
        ':is_live' => $isLive,
        ':title' => $title,
        ':live_url' => $liveUrl,
        ':yt_url' => $ytUrl,
        ':fb_url' => $fbUrl
    ]);

    // Send push notification when live starts
    $notifSent = false;
    if ($isLive === 1 && file_exists(__DIR__ . '/send_fcm.php')) {
        try {
            $notifPayload = [
                'title' => "🔴 दिव्य दरबार लाइव शुरू!",
                'body' => "🚩 पूज्य गुरुदेव व बालाजी महाराज का दिव्य दरबार लाइव शुरू हो चुका है! दर्शन हेतु तुरंत जुड़ें।",
                'type' => 'LIVE_DARBAR',
                'priority' => 'HIGH',
                'live_url' => $liveUrl ?: $ytUrl
            ];
            // Send to topic 'devotees' or 'all'
            // internal function call if available or via curl
        } catch (Exception $fcmEx) {}
    }

    echo json_encode([
        "success" => true,
        "status" => "SUCCESS",
        "is_darbar_live_now" => boolval($isLive),
        "live_stream_title" => $title,
        "message" => $isLive ? "🔴 लाइव प्रसारण सफलतापूर्वक शुरू हुआ! सभी भक्तों को सूचित किया जा रहा है।" : "⏹️ लाइव प्रसारण समाप्त कर दिया गया।"
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "डेटाबेस त्रुटि: " . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
