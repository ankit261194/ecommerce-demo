<?php
// Direct APK Sync Engine for Shri Balaji Kripa Dham
ini_set('display_errors', 1);
error_reporting(E_ALL);
ini_set('max_execution_time', 300);
set_time_limit(300);

header('Content-Type: application/json; charset=utf-8');

$apkUrl = "https://github.com/ankit261194/shri-balaji-kripa-dham/releases/latest/download/ShriBalajiKripaDham-release.apk";
$dlDir = __DIR__ . '/downloads';
if (!is_dir($dlDir)) {
    @mkdir($dlDir, 0755, true);
}
$targetFile = $dlDir . '/ShriBalajiKripaDham-release.apk';
$tmpFile = $targetFile . '.tmp';

$fp = @fopen($tmpFile, 'wb');
if (!$fp) {
    echo json_encode(["success" => false, "error" => "Cannot open $tmpFile for writing"]);
    exit;
}

$ch = curl_init($apkUrl);
curl_setopt($ch, CURLOPT_FILE, $fp);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_MAXREDIRS, 5);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 240);
curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
$exec = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr = curl_error($ch);
curl_close($ch);
fclose($fp);

if ($exec && $httpCode === 200 && file_exists($tmpFile) && filesize($tmpFile) > 10000000) {
    @rename($tmpFile, $targetFile);
    echo json_encode([
        "success" => true,
        "message" => "APK successfully synced to Hostinger downloads directory",
        "file_path" => $targetFile,
        "size" => filesize($targetFile),
        "size_mb" => round(filesize($targetFile) / (1024 * 1024), 2) . " MB",
        "timestamp" => time()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
} else {
    $sz = file_exists($tmpFile) ? filesize($tmpFile) : 0;
    @unlink($tmpFile);
    echo json_encode([
        "success" => false,
        "http_code" => $httpCode,
        "curl_error" => $curlErr,
        "size_downloaded" => $sz
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
