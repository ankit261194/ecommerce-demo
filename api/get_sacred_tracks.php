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
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-SBKD-API-KEY");
header("Cache-Control: no-cache, no-store, must-revalidate");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
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

    $isAdminReq = isset($_GET['admin']) && $_GET['admin'] == '1';
    
    if ($isAdminReq) {
        $stmt = $pdo->query("SELECT id, track_key, title_hindi, title_english, subtitle_hindi, duration_text, audio_url, lyrics_hindi, is_published, display_order, youtube_search_query, created_at, updated_at FROM ashram_tracks ORDER BY display_order ASC, id ASC");
    } else {
        $stmt = $pdo->query("SELECT id, track_key, title_hindi, title_english, subtitle_hindi, duration_text, audio_url, lyrics_hindi, is_published, display_order, youtube_search_query, created_at, updated_at FROM ashram_tracks WHERE is_published = 1 ORDER BY display_order ASC, id ASC");
    }

    $tracks = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];

    echo json_encode([
        "success" => true,
        "count" => count($tracks),
        "tracks" => $tracks,
        "timestamp" => time()
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => $e->getMessage(),
        "tracks" => []
    ], JSON_UNESCAPED_UNICODE);
}
