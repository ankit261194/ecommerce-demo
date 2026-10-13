<?php
// Central FCM Push Notification Dispatcher
// Shri Balaji Kripa Dham
require_once __DIR__ . '/../config/db.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

const FIREBASE_PROJECT_ID = 'shribalajikripadham-63e96';

/**
 * Generates Google OAuth2 Access Token using Service Account JSON via JWT signing.
 */
function getFirebaseAccessToken() {
    $saFile = __DIR__ . '/../config/firebase_service_account.json';
    if (!file_exists($saFile)) {
        return null;
    }

    $tokenCacheFile = __DIR__ . '/../vault/fcm_oauth_token.json';
    if (file_exists($tokenCacheFile)) {
        $cached = json_decode(file_get_contents($tokenCacheFile), true);
        if ($cached && isset($cached['access_token']) && isset($cached['expires_at'])) {
            if ($cached['expires_at'] > (time() + 120)) {
                return $cached['access_token'];
            }
        }
    }

    $sa = json_decode(file_get_contents($saFile), true);
    if (!$sa || empty($sa['private_key']) || empty($sa['client_email'])) {
        return null;
    }

    $now = time();
    $jwtHeader = base64UrlEncode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
    $jwtClaim = base64UrlEncode(json_encode([
        'iss' => $sa['client_email'],
        'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
        'aud' => 'https://oauth2.googleapis.com/token',
        'exp' => $now + 3600,
        'iat' => $now
    ]));

    $dataToSign = $jwtHeader . '.' . $jwtClaim;
    $signature = '';
    $privateKey = openssl_pkey_get_private($sa['private_key']);
    if (!$privateKey || !openssl_sign($dataToSign, $signature, $privateKey, 'SHA256')) {
        return null;
    }

    $jwt = $dataToSign . '.' . base64UrlEncode($signature);

    // Exchange JWT for Bearer token
    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
        'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        'assertion' => $jwt
    ]));
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = curl_exec($ch);
    curl_close($ch);

    $tokenData = json_decode($res, true);
    if (!empty($tokenData['access_token'])) {
        $cacheDir = dirname($tokenCacheFile);
        if (!is_dir($cacheDir)) @mkdir($cacheDir, 0755, true);
        @file_put_contents($tokenCacheFile, json_encode([
            'access_token' => $tokenData['access_token'],
            'expires_at' => $now + intval($tokenData['expires_in'] ?? 3600)
        ]));
        return $tokenData['access_token'];
    }

    return null;
}

function base64UrlEncode($data) {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

/**
 * Sends push notification to a device token using FCM HTTP v1 API.
 */
function sendFcmV1($deviceToken, $title, $body, $data = [], $accessToken = null) {
    if (!$accessToken) return ['success' => false, 'error' => 'No OAuth2 token'];

    $url = "https://fcm.googleapis.com/v1/projects/" . FIREBASE_PROJECT_ID . "/messages:send";

    $payload = [
        'message' => [
            'token' => $deviceToken,
            'notification' => [
                'title' => $title,
                'body' => $body
            ],
            'data' => array_map('strval', $data),
            'android' => [
                'priority' => 'HIGH',
                'notification' => [
                    'sound' => 'default',
                    'channel_id' => 'ashram_darbar_channel',
                    'default_sound' => true,
                    'default_vibrate_timings' => true
                ]
            ]
        ]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . $accessToken,
        'Content-Type: application/json; UTF-8'
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_TIMEOUT, 8);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $resp = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'http_code' => $httpCode,
        'success' => ($httpCode >= 200 && $httpCode < 300),
        'response' => json_decode($resp, true) ?: $resp
    ];
}

try {
    $pdo = getDB();

    // Auto-create devotee notifications table
    $pdo->exec("CREATE TABLE IF NOT EXISTS devotee_notifications (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        phone_number VARCHAR(50) NOT NULL,
        token_number INT DEFAULT 0,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'TOKEN_CALL',
        is_read TINYINT DEFAULT 0,
        created_at BIGINT DEFAULT 0,
        INDEX idx_phone (phone_number),
        INDEX idx_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?: $_POST;

    $phoneNumber = trim($input['phone_number'] ?? '');
    $tokenNumber = intval($input['token_number'] ?? 0);
    $patientName = trim($input['patient_name'] ?? '');
    $title = trim($input['title'] ?? '');
    $body = trim($input['body'] ?? '');
    $type = trim($input['type'] ?? 'TOKEN_CALL');

    if (empty($title)) {
        if ($tokenNumber > 0) {
            $title = "🔔 टोकन बुलावा: टोकन #$tokenNumber";
        } else {
            $title = "श्री बालाजी कृपा धाम";
        }
    }

    if (empty($body)) {
        if ($tokenNumber > 0) {
            $body = !empty($patientName)
                ? "श्री $patientName जी, टोकन #$tokenNumber का नंबर आ गया है। कृपया गुरुजी के समीप पधारें।"
                : "टोकन #$tokenNumber का नंबर आ गया है। कृपया गुरुजी के समीप पधारें।";
        } else {
            $body = "आश्रम से नया संदेश प्राप्त हुआ है।";
        }
    }

    $cleanPhone = preg_replace('/[^0-9]/', '', $phoneNumber);
    if (strlen($cleanPhone) > 10) {
        $cleanPhone = substr($cleanPhone, -10);
    }

    // 1. Save notification record in database for 100% reliable in-app mirroring
    $now = round(microtime(true) * 1000);
    $stmt = $pdo->prepare("INSERT INTO devotee_notifications (phone_number, token_number, title, message, type, is_read, created_at)
        VALUES (:phone, :tok, :title, :msg, :type, 0, :now)");
    $stmt->execute([
        ':phone' => $cleanPhone,
        ':tok' => $tokenNumber,
        ':title' => $title,
        ':msg' => $body,
        ':type' => $type,
        ':now' => $now
    ]);

    // 2. Query registered FCM tokens for this phone
    $tokens = [];
    if (!empty($cleanPhone)) {
        $tokStmt = $pdo->prepare("SELECT fcm_token FROM fcm_device_tokens WHERE phone_number = :phone ORDER BY id DESC LIMIT 5");
        $tokStmt->execute([':phone' => $cleanPhone]);
        $tokens = $tokStmt->fetchAll(PDO::FETCH_COLUMN);
    }

    $accessToken = getFirebaseAccessToken();
    $fcmDispatchResults = [];
    $sentCount = 0;
    $failCount = 0;

    if (!empty($tokens) && $accessToken) {
        foreach ($tokens as $t) {
            $res = sendFcmV1($t, $title, $body, [
                'type' => $type,
                'token_number' => strval($tokenNumber),
                'patient_name' => $patientName,
                'timestamp' => strval($now)
            ], $accessToken);
            if ($res['success']) {
                $sentCount++;
            } else {
                $failCount++;
            }
            $fcmDispatchResults[] = $res;
        }
    }

    echo json_encode([
        "success" => true,
        "phone_number" => $cleanPhone,
        "token_number" => $tokenNumber,
        "registered_devices_found" => count($tokens),
        "fcm_http_v1_active" => ($accessToken !== null),
        "fcm_sent" => $sentCount,
        "fcm_failed" => $failCount,
        "database_notification_id" => $pdo->lastInsertId(),
        "message" => "Devotee notification saved in database and dispatched via FCM HTTP v1."
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()]);
}
