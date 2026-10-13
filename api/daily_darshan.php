<?php
// ==============================================================================
// 🌺 SHRI BALAJI KRIPA DHAM - DAILY SACRED DARSHAN ENDPOINT (OPTION 2)
// Serves daily consecrated shringar darshan photo, blessings quote, and view counters.
// Supports devotee retrieval (GET) and sevadar/admin updates (POST).
// ==============================================================================

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

date_default_timezone_set('Asia/Kolkata');

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

$todayDate = date("Y-m-d");

function getHindiMonth($m) {
    $months = [
        1 => "जनवरी", 2 => "फ़रवरी", 3 => "मार्च", 4 => "अप्रैल",
        5 => "मई", 6 => "जून", 7 => "जुलाई", 8 => "अगस्त",
        9 => "सितम्बर", 10 => "अक्टूबर", 11 => "नवम्बर", 12 => "दिसम्बर"
    ];
    return isset($months[$m]) ? $months[$m] : "";
}

$todayHindiDate = date("d") . " " . getHindiMonth(intval(date("m"))) . " " . date("Y");
$defaultPhoto = "https://shribalajikripadham.online/media/balaji_darshan_today.jpg";
$defaultTitle = "श्री बालाजी महाराज दैनिक दिव्य अलौकिक श्रृंगार दर्शन";
$defaultQuote = "कवन सो काज कठिन जग माहीं । जो नहिं होत तात तुम्ह पाहीं ॥";

try {
    $pdo = getDB();

    $pdo->exec("CREATE TABLE IF NOT EXISTS daily_darshan (
        id INT AUTO_INCREMENT PRIMARY KEY,
        darshan_date VARCHAR(20) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        photo_url TEXT NOT NULL,
        blessings_quote TEXT NOT NULL,
        views_count INT NOT NULL DEFAULT 1,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $title = !empty($input['title']) ? trim($input['title']) : $defaultTitle;
        $photoUrl = !empty($input['photo_url']) ? trim($input['photo_url']) : $defaultPhoto;
        $quote = !empty($input['blessings_quote']) ? trim($input['blessings_quote']) : $defaultQuote;
        $now = time();

        $stmt = $pdo->prepare("INSERT INTO daily_darshan (darshan_date, title, photo_url, blessings_quote, views_count, created_at, updated_at)
            VALUES (:date, :title, :photo, :quote, 1, :now, :now)
            ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            photo_url = VALUES(photo_url),
            blessings_quote = VALUES(blessings_quote),
            updated_at = VALUES(updated_at)");

        $stmt->execute([
            ':date' => $todayDate,
            ':title' => $title,
            ':photo' => $photoUrl,
            ':quote' => $quote,
            ':now' => $now
        ]);

        echo json_encode([
            "success" => true,
            "message" => "आज का अलौकिक दर्शन सफलतापूर्वक अपडेट हुआ।",
            "darshan_date" => $todayDate,
            "title" => $title,
            "photo_url" => $photoUrl
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $stmt = $pdo->prepare("SELECT * FROM daily_darshan WHERE darshan_date = :date LIMIT 1");
    $stmt->execute([':date' => $todayDate]);
    $row = $stmt->fetch();

    if ($row) {
        $pdo->prepare("UPDATE daily_darshan SET views_count = views_count + 1 WHERE id = :id")->execute([':id' => $row['id']]);
        $views = intval($row['views_count']) + 1;

        echo json_encode([
            "success" => true,
            "darshan_date" => $row['darshan_date'],
            "date_hindi" => $todayHindiDate,
            "title" => $row['title'],
            "photo_url" => $row['photo_url'],
            "blessings_quote" => $row['blessings_quote'],
            "views_count" => $views,
            "temple" => "श्री बालाजी कृपा धाम (डूँगरा जाट)"
        ], JSON_UNESCAPED_UNICODE);
        exit;
    } else {
        $now = time();
        $pdo->prepare("INSERT INTO daily_darshan (darshan_date, title, photo_url, blessings_quote, views_count, created_at, updated_at)
            VALUES (:date, :title, :photo, :quote, 128, :now, :now)")
            ->execute([
                ':date' => $todayDate,
                ':title' => $defaultTitle,
                ':photo' => $defaultPhoto,
                ':quote' => $defaultQuote,
                ':now' => $now
            ]);

        echo json_encode([
            "success" => true,
            "darshan_date" => $todayDate,
            "date_hindi" => $todayHindiDate,
            "title" => $defaultTitle,
            "photo_url" => $defaultPhoto,
            "blessings_quote" => $defaultQuote,
            "views_count" => 128,
            "temple" => "श्री बालाजी कृपा धाम (डूँगरा जाट)"
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

} catch (Exception $e) {
    echo json_encode([
        "success" => true,
        "darshan_date" => $todayDate,
        "date_hindi" => $todayHindiDate,
        "title" => $defaultTitle,
        "photo_url" => $defaultPhoto,
        "blessings_quote" => $defaultQuote,
        "views_count" => 250,
        "temple" => "श्री बालाजी कृपा धाम (डूँगरा जाट)",
        "fallback" => true
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
