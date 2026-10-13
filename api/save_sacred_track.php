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

$id = intval($input['id'] ?? 0);
$trackKey = trim($input['track_key'] ?? '');
$titleHindi = trim($input['title_hindi'] ?? '');
$titleEnglish = trim($input['title_english'] ?? '');
$subtitleHindi = trim($input['subtitle_hindi'] ?? '');
$durationText = trim($input['duration_text'] ?? '');
$audioUrl = trim($input['audio_url'] ?? '');
$lyricsHindi = trim($input['lyrics_hindi'] ?? '');
$isPublished = isset($input['is_published']) ? intval($input['is_published']) : 1;
$displayOrder = intval($input['display_order'] ?? 0);
$ytSearch = trim($input['youtube_search_query'] ?? '');

if (empty($titleHindi)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "आरती/भजन का शीर्षक (Title) अनिवार्य है!"]);
    exit;
}

if (empty($audioUrl)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "ऑडियो फाइल या लिंक अनिवार्य है!"]);
    exit;
}

// Generate unique track key if empty
if (empty($trackKey)) {
    $trackKey = 'track_' . time() . '_' . substr(md5($titleHindi), 0, 6);
}

try {
    $pdo = getDB();

    // Auto-create table if missing
    $pdo->exec("CREATE TABLE IF NOT EXISTS ashram_tracks (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        track_key VARCHAR(100) NOT NULL UNIQUE,
        title_hindi VARCHAR(255) NOT NULL,
        title_english VARCHAR(255) DEFAULT '',
        subtitle_hindi VARCHAR(255) DEFAULT '',
        duration_text VARCHAR(50) DEFAULT '',
        audio_url VARCHAR(500) NOT NULL,
        lyrics_hindi TEXT,
        is_published TINYINT(1) NOT NULL DEFAULT 1,
        display_order INT NOT NULL DEFAULT 0,
        youtube_search_query VARCHAR(255) DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_track_published (is_published),
        INDEX idx_track_order (display_order)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    if ($id > 0) {
        $stmt = $pdo->prepare("UPDATE ashram_tracks SET
            track_key = :track_key,
            title_hindi = :title_hindi,
            title_english = :title_english,
            subtitle_hindi = :subtitle_hindi,
            duration_text = :duration_text,
            audio_url = :audio_url,
            lyrics_hindi = :lyrics_hindi,
            is_published = :is_published,
            display_order = :display_order,
            youtube_search_query = :youtube_search_query
            WHERE id = :id");
        $stmt->execute([
            ':id' => $id,
            ':track_key' => $trackKey,
            ':title_hindi' => $titleHindi,
            ':title_english' => $titleEnglish,
            ':subtitle_hindi' => $subtitleHindi,
            ':duration_text' => $durationText,
            ':audio_url' => $audioUrl,
            ':lyrics_hindi' => $lyricsHindi,
            ':is_published' => $isPublished,
            ':display_order' => $displayOrder,
            ':youtube_search_query' => $ytSearch
        ]);
        $savedId = $id;
        $msg = "पावन ट्रैक विवरण सफलतापूर्वक अपडेट हुआ!";
    } else {
        $stmt = $pdo->prepare("INSERT INTO ashram_tracks 
            (track_key, title_hindi, title_english, subtitle_hindi, duration_text, audio_url, lyrics_hindi, is_published, display_order, youtube_search_query)
            VALUES (:track_key, :title_hindi, :title_english, :subtitle_hindi, :duration_text, :audio_url, :lyrics_hindi, :is_published, :display_order, :youtube_search_query)
            ON DUPLICATE KEY UPDATE
            title_hindi = VALUES(title_hindi),
            title_english = VALUES(title_english),
            subtitle_hindi = VALUES(subtitle_hindi),
            duration_text = VALUES(duration_text),
            audio_url = VALUES(audio_url),
            lyrics_hindi = VALUES(lyrics_hindi),
            is_published = VALUES(is_published),
            display_order = VALUES(display_order),
            youtube_search_query = VALUES(youtube_search_query)");
        $stmt->execute([
            ':track_key' => $trackKey,
            ':title_hindi' => $titleHindi,
            ':title_english' => $titleEnglish,
            ':subtitle_hindi' => $subtitleHindi,
            ':duration_text' => $durationText,
            ':audio_url' => $audioUrl,
            ':lyrics_hindi' => $lyricsHindi,
            ':is_published' => $isPublished,
            ':display_order' => $displayOrder,
            ':youtube_search_query' => $ytSearch
        ]);
        $savedId = $pdo->lastInsertId();
        $msg = "नया पावन ट्रैक सफलतापूर्वक जोड़ा व प्रकाशित किया गया!";
    }

    echo json_encode([
        "success" => true,
        "status" => "SUCCESS",
        "message" => $msg,
        "track_id" => $savedId,
        "track_key" => $trackKey,
        "is_published" => boolval($isPublished)
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "डेटाबेस त्रुटि: " . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
