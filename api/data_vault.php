<?php
// ==============================================================================
// श्री बालाजी कृपा धाम (ग्राम डूँगरा जाट) - अखंड रियल-टाइम डेटा वॉल्ट इंजन
// Real-Time Autonomous Data Vault & Cloud Disaster Recovery Engine
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

// 1. Vault Storage Directory & Security Lock (.htaccess)
$vaultDir = __DIR__ . '/../vault';
if (!is_dir($vaultDir)) {
    @mkdir($vaultDir, 0755, true);
}
$htaccessFile = $vaultDir . '/.htaccess';
if (!file_exists($htaccessFile)) {
    @file_put_contents($htaccessFile, "Order deny,allow\nDeny from all\n");
}
$snapshotsDir = $vaultDir . '/snapshots';
if (!is_dir($snapshotsDir)) {
    @mkdir($snapshotsDir, 0755, true);
}

// Ensure caller is authorized
if (function_exists('verifyApiAuth')) {
    verifyApiAuth(true); // Allows public status if needed, but exports are guarded
}

$action = strtolower(trim($_GET['action'] ?? $_POST['action'] ?? 'status'));

// Function to safely dump all tables into associative array
function fetchCompleteDatabaseSnapshot($pdo) {
    $tables = [
        'tokens' => 'SELECT * FROM tokens ORDER BY id ASC',
        'ashram_settings' => 'SELECT * FROM ashram_settings WHERE id = 1 LIMIT 1',
        'sevadars' => 'SELECT * FROM sevadars ORDER BY id ASC',
        'donors' => 'SELECT * FROM donors ORDER BY id ASC',
        'expenses' => 'SELECT * FROM expenses ORDER BY id ASC',
        'bus_seats' => 'SELECT * FROM bus_seats ORDER BY id ASC',
        'daily_darshan' => 'SELECT * FROM daily_darshan ORDER BY id DESC LIMIT 100'
    ];

    $dump = [
        "app" => "Shri Balaji Kripa Dham (ग्राम डूँगरा जाट)",
        "vault_signature" => "SBKD_IMMUTABLE_VAULT_V1",
        "created_at" => date('Y-m-d H:i:s'),
        "timestamp" => time(),
        "tables" => []
    ];

    foreach ($tables as $tbl => $query) {
        try {
            $stmt = $pdo->query($query);
            $dump['tables'][$tbl] = $stmt->fetchAll(PDO::FETCH_ASSOC) ?: [];
        } catch (Exception $e) {
            $dump['tables'][$tbl] = [];
        }
    }
    return $dump;
}

// Function to log any transaction real-time
function recordVaultTransaction($vaultDir, $eventType, $payload) {
    $ledgerFile = $vaultDir . '/live_transaction_ledger.jsonl';
    $entry = [
        "timestamp" => time(),
        "datetime" => date('Y-m-d H:i:s'),
        "ip" => $_SERVER['REMOTE_ADDR'] ?? 'system',
        "event_type" => $eventType,
        "payload" => $payload
    ];
    @file_put_contents($ledgerFile, json_encode($entry, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
}

// --------------------------------------------------------------------------
// ACTION DISPATCHER
// --------------------------------------------------------------------------
try {
    switch ($action) {
        case 'status':
            // Count total records in every table
            $counts = [];
            $allTables = ['tokens', 'sevadars', 'donors', 'expenses', 'bus_seats', 'ashram_settings'];
            foreach ($allTables as $t) {
                try {
                    $cStmt = $pdo->query("SELECT COUNT(*) FROM $t");
                    $counts[$t] = (int)$cStmt->fetchColumn();
                } catch (Exception $ex) {
                    $counts[$t] = 0;
                }
            }

            $ledgerFile = $vaultDir . '/live_transaction_ledger.jsonl';
            $ledgerSize = file_exists($ledgerFile) ? filesize($ledgerFile) : 0;
            $ledgerEntries = file_exists($ledgerFile) ? count(file($ledgerFile)) : 0;

            $latestSnapshotFile = $snapshotsDir . '/db_snapshot_latest.json';
            $snapshotTime = file_exists($latestSnapshotFile) ? filemtime($latestSnapshotFile) : null;

            echo json_encode([
                "success" => true,
                "status" => "VAULT_ACTIVE",
                "message" => "अखंड डेटा वॉल्ट सक्रिय व पूर्ण सुरक्षित है",
                "total_records" => $counts,
                "ledger" => [
                    "active" => true,
                    "total_entries" => $ledgerEntries,
                    "size_bytes" => $ledgerSize,
                    "last_event_at" => file_exists($ledgerFile) ? date('Y-m-d H:i:s', filemtime($ledgerFile)) : 'Never'
                ],
                "latest_snapshot_at" => $snapshotTime ? date('Y-m-d H:i:s', $snapshotTime) : 'Pending'
            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            break;

        case 'log_event':
            // Log an incoming mutation event
            $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
            $eventType = trim($input['event_type'] ?? 'GENERIC_MUTATION');
            $data = $input['data'] ?? [];
            recordVaultTransaction($vaultDir, $eventType, $data);

            echo json_encode([
                "success" => true,
                "status" => "RECORDED",
                "message" => "लेनदेन वॉल्ट लेज़र में सुरक्षित दर्ज हो गया!"
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'export_json':
            // Full complete database export in JSON
            $dump = fetchCompleteDatabaseSnapshot($pdo);

            // Also refresh latest snapshot on server
            $latestFile = $snapshotsDir . '/db_snapshot_latest.json';
            @file_put_contents($latestFile, json_encode($dump, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT), LOCK_EX);

            if (isset($_GET['download']) && $_GET['download'] == '1') {
                $filename = "SBKD_Data_Vault_" . date('Y_m_d_His') . ".json";
                header('Content-Disposition: attachment; filename="' . $filename . '"');
            }

            echo json_encode([
                "success" => true,
                "status" => "EXPORT_READY",
                "data" => $dump
            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            break;

        case 'inspect':
            // View specific table data
            $targetTable = preg_replace('/[^a-zA-Z0-9_]/', '', $_GET['table'] ?? 'tokens');
            $limit = min(500, max(1, (int)($_GET['limit'] ?? 50)));
            $offset = max(0, (int)($_GET['offset'] ?? 0));

            $countStmt = $pdo->query("SELECT COUNT(*) FROM `{$targetTable}`");
            $totalCount = (int)$countStmt->fetchColumn();

            $stmt = $pdo->prepare("SELECT * FROM `{$targetTable}` ORDER BY id DESC LIMIT :limit OFFSET :offset");
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $rows = $stmt->fetchAll();

            echo json_encode([
                "success" => true,
                "table" => $targetTable,
                "total_count" => $totalCount,
                "returned_count" => count($rows),
                "offset" => $offset,
                "rows" => $rows
            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            break;

        case 'restore':
            // 1-Click Disaster Recovery Restore
            $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
            $tablesData = $input['tables'] ?? $input['data']['tables'] ?? null;

            if (!$tablesData || !is_array($tablesData)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "अमान्य बैकअप पेलोड (Invalid tables data)"]);
                exit;
            }

            $restoredCounts = [];
            $pdo->beginTransaction();

            foreach ($tablesData as $tbl => $rows) {
                $safeTable = preg_replace('/[^a-zA-Z0-9_]/', '', $tbl);
                if (empty($rows) || !is_array($rows)) continue;

                $count = 0;
                foreach ($rows as $row) {
                    if (!is_array($row)) continue;
                    $cols = array_keys($row);
                    $colList = implode(', ', array_map(function($c) { return "`" . preg_replace('/[^a-zA-Z0-9_]/', '', $c) . "`"; }, $cols));
                    $placeholders = implode(', ', array_fill(0, count($cols), '?'));
                    $updates = implode(', ', array_map(function($c) { return "`" . preg_replace('/[^a-zA-Z0-9_]/', '', $c) . "` = VALUES(`" . preg_replace('/[^a-zA-Z0-9_]/', '', $c) . "`)"; }, $cols));

                    $sql = "INSERT INTO `{$safeTable}` ({$colList}) VALUES ({$placeholders}) ON DUPLICATE KEY UPDATE {$updates}";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute(array_values($row));
                    $count++;
                }
                $restoredCounts[$safeTable] = $count;
            }

            $pdo->commit();
            recordVaultTransaction($vaultDir, 'FULL_RESTORE_COMPLETED', $restoredCounts);

            echo json_encode([
                "success" => true,
                "status" => "RESTORE_COMPLETE",
                "message" => "डेटा सफलतापूर्वक रीस्टोर व सिंक्रोनाइज़ हो गया!",
                "restored" => $restoredCounts
            ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
            break;

        default:
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "अज्ञात क्रिया (Unknown action: $action)"]);
            break;
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "वॉल्ट त्रुटि: " . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
