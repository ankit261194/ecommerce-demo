<?php
// ==============================================================================
// श्री बालाजी कृपा धाम (ग्राम डूँगरा जाट) - ज़ीरो-टच गूगल ड्राइव ऑटो-सिंक इंजन
// Zero-Touch Headless Google Drive Auto-Sync Pipeline
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
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-SBKD-API-KEY, x-sbkd-api-key");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$pdo = getDB();
$vaultDir = __DIR__ . '/../vault';
if (!is_dir($vaultDir)) {
    @mkdir($vaultDir, 0755, true);
}
$statusFile = $vaultDir . '/drive_sync_status.json';

// Fetch settings
$settings = [];
try {
    $stmt = $pdo->query("SELECT * FROM ashram_settings WHERE id = 1 LIMIT 1");
    $settings = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
} catch (Exception $e) {}

$webhookUrl = $settings['google_drive_webhook_url'] ?? '';
$action = strtolower(trim($_GET['action'] ?? $_POST['action'] ?? 'status'));

switch ($action) {
    case 'status':
        $lastStatus = file_exists($statusFile) ? json_decode(file_get_contents($statusFile), true) : null;
        echo json_encode([
            "success" => true,
            "status" => "CONFIGURED",
            "is_webhook_configured" => !empty($webhookUrl),
            "webhook_target" => !empty($webhookUrl) ? substr($webhookUrl, 0, 30) . "..." : "Default Local Vault Mirror Active",
            "last_sync" => $lastStatus ?: [
                "status" => "READY",
                "timestamp" => time(),
                "datetime" => date('Y-m-d H:i:s'),
                "message" => "डेटा वॉल्ट पूर्ण सक्रिय है"
            ]
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        break;

    case 'sync':
    case 'auto_push':
        // 1. Generate full snapshot
        require_once __DIR__ . '/data_vault.php'; // shares fetchCompleteDatabaseSnapshot
        $snapshot = fetchCompleteDatabaseSnapshot($pdo);

        $payload = json_encode([
            "source" => "ShriBalajiKripaDham_AutoVault",
            "app_version" => "v2.50.0",
            "timestamp" => time(),
            "datetime" => date('Y-m-d H:i:s'),
            "data" => $snapshot
        ], JSON_UNESCAPED_UNICODE);

        // Save local rolling snapshot
        $snapshotFile = $vaultDir . '/snapshots/db_snapshot_latest.json';
        @file_put_contents($snapshotFile, $payload, LOCK_EX);

        $syncSuccess = true;
        $syncMessage = "लोकल डेटा वॉल्ट स्नैपशॉट सफलतापूर्वक अपडेट हुआ!";
        $httpCode = 200;

        // 2. If Google Drive webhook is set, push headlessly
        if (!empty($webhookUrl)) {
            $ch = curl_init($webhookUrl);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            $resp = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlErr = curl_error($ch);
            curl_close($ch);

            if ($httpCode >= 200 && $httpCode < 300) {
                $syncSuccess = true;
                $syncMessage = "Google Drive में डेटा बिना किसी बटन के स्वतः सुरक्षित सेव हो गया!";
            } else {
                $syncSuccess = false;
                $syncMessage = "Google Drive Webhook HTTP {$httpCode}: " . ($curlErr ?: $resp);
            }
        }

        $logData = [
            "timestamp" => time(),
            "datetime" => date('Y-m-d H:i:s'),
            "success" => $syncSuccess,
            "message" => $syncMessage,
            "http_code" => $httpCode,
            "tokens_count" => count($snapshot['tables']['tokens'] ?? [])
        ];
        @file_put_contents($statusFile, json_encode($logData, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

        echo json_encode([
            "success" => $syncSuccess,
            "status" => $syncSuccess ? "SYNCED" : "PARTIAL_SYNC",
            "message" => $syncMessage,
            "details" => $logData
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
        break;

    case 'save_webhook':
        // Superadmin saves their Google Apps Script Webhook URL
        if (function_exists('verifyApiAuth')) {
            verifyApiAuth();
        }
        $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
        $newUrl = trim($input['webhook_url'] ?? '');

        try {
            $pdo->exec("ALTER TABLE ashram_settings ADD COLUMN IF NOT EXISTS google_drive_webhook_url VARCHAR(500) DEFAULT ''");
        } catch (Exception $e) {}

        $upStmt = $pdo->prepare("UPDATE ashram_settings SET google_drive_webhook_url = :url, updated_at = NOW() WHERE id = 1");
        $upStmt->execute([':url' => $newUrl]);

        echo json_encode([
            "success" => true,
            "status" => "WEBHOOK_SAVED",
            "message" => "Google Drive Webhook URL सफलतापूर्वक सुरक्षित हो गया!",
            "url" => $newUrl
        ], JSON_UNESCAPED_UNICODE);
        break;

    default:
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "अज्ञात क्रिया (Unknown action: $action)"]);
        break;
}
