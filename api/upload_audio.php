<?php
if (file_exists(__DIR__ . '/../config/db.php')) {
    require_once __DIR__ . '/../config/db.php';
} elseif (file_exists(__DIR__ . '/config/db.php')) {
    require_once __DIR__ . '/config/db.php';
} else {
    function verifyApiAuth() {
        $headers = getallheaders();
        $apiKey = $headers['X-SBKD-API-KEY'] ?? $_SERVER['HTTP_X_SBKD_API_KEY'] ?? $_POST['api_key'] ?? '';
        if ($apiKey !== 'SBKD_SECURE_TOKEN_9100100251233433_V243') {
            http_response_code(401);
            echo json_encode(["success" => false, "error" => "अनधिकृत अनुरोध (Unauthorized)"]);
            exit;
        }
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

if (!isset($_FILES['audio']) || $_FILES['audio']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    $errCode = $_FILES['audio']['error'] ?? 'NO_FILE';
    echo json_encode([
        "success" => false,
        "error" => "ऑडियो फाइल प्राप्त नहीं हुई अथवा अपलोड में त्रुटि (Error Code: $errCode)"
    ]);
    exit;
}

$file = $_FILES['audio'];
$origName = $file['name'];
$fileSize = $file['size'];
$tmpPath = $file['tmp_name'];

// Validate file extension
$ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
$allowedExts = ['mp3', 'm4a', 'aac', 'wav', 'ogg'];

if (!in_array($ext, $allowedExts)) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "अमान्य ऑडियो प्रारूप! केवल MP3, M4A, AAC, WAV अथवा OGG ऑडियो ही अनुमत हैं।"
    ]);
    exit;
}

// 50 MB limit
if ($fileSize > 50 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "error" => "फाइल का आकार बहुत बड़ा है! अधिकतम 50 MB की ऑडियो फाइल ही अनुमत है।"
    ]);
    exit;
}

$uploadDir = __DIR__ . '/../uploads/audio/';
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}

// Generate clean, safe unique file name
$cleanBase = preg_replace('/[^a-zA-Z0-9_\-]/', '_', pathinfo($origName, PATHINFO_FILENAME));
$uniqueName = 'sbkd_audio_' . time() . '_' . substr(md5(uniqid()), 0, 6) . '.' . $ext;
$destPath = $uploadDir . $uniqueName;

if (move_uploaded_file($tmpPath, $destPath)) {
    // Generate public access URL
    $host = $_SERVER['HTTP_HOST'] ?? 'shribalajikripadham.online';
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "https://";
    $audioUrl = $protocol . $host . '/uploads/audio/' . $uniqueName;

    echo json_encode([
        "success" => true,
        "status" => "SUCCESS",
        "message" => "ऑडियो फाइल सफलतापूर्वक अपलोड व सुरक्षित हुई!",
        "file_name" => $uniqueName,
        "audio_url" => $audioUrl,
        "size_bytes" => $fileSize,
        "timestamp" => time()
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
} else {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "error" => "सर्वर पर फाइल सेव करने में असमर्थ। कृपया स्टोरेज परमिशन जांचें।"
    ]);
}
