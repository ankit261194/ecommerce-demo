<?php
// Shri Balaji Kripa Dham - Central Database Connection
// Hostinger MySQL Configuration

date_default_timezone_set('Asia/Kolkata');

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-SBKD-API-KEY, x-sbkd-api-key");

// Set Zero-Cache Headers ONLY for API endpoints, NOT for the main website HTML
if (isset($_SERVER['SCRIPT_NAME']) && strpos($_SERVER['SCRIPT_NAME'], '/api/') !== false) {
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
    header("Cache-Control: post-check=0, pre-check=0", false);
    header("Pragma: no-cache");
    header("Expires: Mon, 26 Jul 1997 05:00:00 GMT");
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if (!defined('SBKD_API_SECRET')) {
    define('SBKD_API_SECRET', 'SBKD_SECURE_TOKEN_9100100251233433_V243');
}

/**
 * Validates request authentication to secure all mutation APIs from unauthorized access.
 */
function verifyApiAuth($allowPublicRead = false) {
    if ($allowPublicRead && $_SERVER['REQUEST_METHOD'] === 'GET') {
        return true;
    }
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $lowerHeaders = [];
    foreach ($headers as $k => $v) {
        $lowerHeaders[strtolower($k)] = $v;
    }

    $apiKey = $lowerHeaders['x-sbkd-api-key'] ?? 
              $lowerHeaders['authorization'] ??
              $_SERVER['HTTP_X_SBKD_API_KEY'] ?? 
              $_SERVER['REDIRECT_HTTP_X_SBKD_API_KEY'] ?? 
              $_SERVER['HTTP_AUTHORIZATION'] ??
              $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ??
              $_GET['api_key'] ?? 
              $_POST['api_key'] ?? '';

    // If still empty and request has a JSON body, peek into JSON body
    if (empty($apiKey)) {
        $raw = file_get_contents('php://input');
        if (!empty($raw)) {
            $json = json_decode($raw, true);
            if (is_array($json) && !empty($json['api_key'])) {
                $apiKey = $json['api_key'];
            }
        }
    }
              
    if (empty($apiKey) || $apiKey !== SBKD_API_SECRET) {
        http_response_code(401);
        echo json_encode([
            "success" => false, 
            "error" => "अनधिकृत अनुरोध: मान्य X-SBKD-API-KEY अनिवार्य है (Unauthorized API request)."
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    return true;
}

if (!defined('DB_HOST')) define('DB_HOST', 'localhost');
if (!defined('DB_NAME')) define('DB_NAME', 'u237101617_balaji');
if (!defined('DB_USER')) define('DB_USER', 'u237101617_ankitantim0');
if (!defined('DB_PASS')) define('DB_PASS', 'Aa@8006518960');

function getDB($exitOnError = false) {
    static $pdo = null;
    static $connectAttempted = false;
    if ($pdo === null && !$connectAttempted) {
        $connectAttempted = true;
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_TIMEOUT => 3, // 3-second connect timeout to prevent website freezing
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            error_log("ShriBalaji DB Connection Notice: " . $e->getMessage());
            if ($exitOnError) {
                http_response_code(500);
                echo json_encode(["success" => false, "error" => "Database connection unavailable"]);
                exit;
            }
            return null;
        }
    }
    return $pdo;
}
