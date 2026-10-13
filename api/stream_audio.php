<?php
// ==============================================================================
// श्री बालाजी कृपा धाम (ग्राम डूँगरा जाट) - आधिकारिक ऑडियो स्ट्रीमिंग इंजन
// Sacred Audio Streaming Engine with HTTP 206 Byte Range Support (Dynamic MySQL)
// ==============================================================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, HEAD, OPTIONS");
header("Access-Control-Allow-Headers: Range, Content-Type, Accept");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

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

$trackKey = strtolower(trim($_GET['track'] ?? ''));

if (empty($trackKey)) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(["success" => false, "error" => "No track key specified"]);
    exit;
}

try {
    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT audio_url, title_hindi FROM ashram_tracks WHERE track_key = :k AND is_published = 1 LIMIT 1");
    $stmt->execute([':k' => $trackKey]);
    $track = $stmt->fetch();

    if ($track && !empty($track['audio_url'])) {
        $url = $track['audio_url'];
        // If local file on disk
        $parsed = parse_url($url, PHP_URL_PATH);
        $localPath = __DIR__ . '/..' . $parsed;
        if (file_exists($localPath) && is_file($localPath)) {
            // Stream local file with HTTP 206 range support
            streamLocalFile($localPath);
            exit;
        } else {
            // Redirect to remote audio URL
            header("Location: " . $url, true, 302);
            exit;
        }
    }
} catch (Exception $e) {}

// Check uploads/audio directory as fallback
$cleanKey = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $trackKey);
$localAudio = __DIR__ . '/../uploads/audio/' . $cleanKey . '.mp3';
if (file_exists($localAudio) && is_file($localAudio)) {
    streamLocalFile($localAudio);
    exit;
}

http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
echo json_encode(["success" => false, "error" => "Sacred track not found or unpublished"]);
exit;

function streamLocalFile($filePath) {
    $size = filesize($filePath);
    $time = date('r', filemtime($filePath));
    $fm = @fopen($filePath, 'rb');
    if (!$fm) {
        http_response_code(500);
        exit;
    }

    $begin = 0;
    $end = $size - 1;

    if (isset($_SERVER['HTTP_RANGE'])) {
        if (preg_match('/bytes=\h*(\d+)-(\d*)[\D.*]?/i', $_SERVER['HTTP_RANGE'], $matches)) {
            $begin = intval($matches[1]);
            if (!empty($matches[2])) {
                $end = intval($matches[2]);
            }
        }
    }

    if ($begin > 0 || $end < ($size - 1)) {
        header('HTTP/1.1 206 Partial Content');
    } else {
        header('HTTP/1.1 200 OK');
    }

    header("Content-Type: audio/mpeg");
    header('Cache-Control: public, must-revalidate, max-age=86400');
    header('Pragma: public');
    header('Accept-Ranges: bytes');
    header('Content-Length:' . (($end - $begin) + 1));
    if (isset($_SERVER['HTTP_RANGE'])) {
        header("Content-Range: bytes $begin-$end/$size");
    }
    header("Content-Disposition: inline; filename=\"" . basename($filePath) . "\"");
    header("Last-Modified: $time");

    $cur = $begin;
    fseek($fm, $begin, 0);

    while (!feof($fm) && $cur <= $end && (connection_status() == 0)) {
        $chunk = min(1024 * 64, ($end - $cur) + 1);
        print fread($fm, $chunk);
        flush();
        $cur += $chunk;
    }
    fclose($fm);
}