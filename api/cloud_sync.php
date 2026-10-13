<?php
// Central Cloud Endpoint for Ashram SQLite Full Backup Sync
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$backupFile = __DIR__ . '/../uploads/backup_latest.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['repair']) || isset($_GET['sync_files'])) {
        $repoRawBase = "https://raw.githubusercontent.com/ankit261194/shri-balaji-kripa-dham/main/backend/";
        $needed = [
            "deploy.php" => __DIR__ . '/../deploy.php',
            "api/delete_token.php" => __DIR__ . '/delete_token.php',
            "config/db.php" => __DIR__ . '/../config/db.php'
        ];
        $repaired = [];
        foreach ($needed as $rel => $dest) {
            $code = @file_get_contents($repoRawBase . $rel . "?t=" . time());
            if ($code && strlen($code) > 10) {
                @file_put_contents($dest, $code);
                $repaired[] = $rel;
            }
        }
        echo json_encode(['success' => true, 'repaired' => $repaired, 'message' => 'Missing files synchronized from GitHub']);
        exit;
    }
    if (file_exists($backupFile)) {
        readfile($backupFile);
    } else {
        echo json_encode(['success' => true, 'status' => 'READY', 'message' => 'Cloud Sync Endpoint is Online']);
    }
    exit;
}

$payload = file_get_contents('php://input');
if (empty($payload)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'डेटा प्राप्त नहीं हुआ (Empty payload)'], JSON_UNESCAPED_UNICODE);
    exit;
}

$uploadsDir = __DIR__ . '/../uploads/';
if (!is_dir($uploadsDir)) {
    mkdir($uploadsDir, 0755, true);
}

file_put_contents($backupFile, $payload);

echo json_encode([
    'success' => true,
    'message' => 'क्लाउड डेटा सिंक सफल (Cloud sync successful)',
    'timestamp' => time(),
    'bytes_received' => strlen($payload)
], JSON_UNESCAPED_UNICODE);

