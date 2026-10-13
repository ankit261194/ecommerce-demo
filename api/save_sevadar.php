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
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

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
$name = trim($input['name'] ?? '');
$role = trim($input['role'] ?? 'आश्रम सेवादार');
$phone = trim($input['phone'] ?? '');
$photoUrl = trim($input['photo_url'] ?? '');
$bio = trim($input['bio'] ?? '');
$displayOrder = intval($input['display_order'] ?? 0);
$isActive = isset($input['is_active']) ? intval($input['is_active']) : 1;
$createdAt = intval($input['created_at'] ?? (time() * 1000));

if (empty($name)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "सेवादार का नाम अनिवार्य है।"], JSON_UNESCAPED_UNICODE);
    exit;
}

$pdo = getDB();

try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS sevadars (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        role VARCHAR(150) NOT NULL DEFAULT 'आश्रम सेवादार',
        phone VARCHAR(20) DEFAULT '',
        photo_url VARCHAR(500) DEFAULT '',
        bio TEXT,
        display_order INT DEFAULT 0,
        is_active TINYINT(1) DEFAULT 1,
        created_at BIGINT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_order (display_order),
        INDEX idx_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    if ($id > 0) {
        $stmt = $pdo->prepare("INSERT INTO sevadars (
            id, name, role, phone, photo_url, bio, display_order, is_active, created_at
        ) VALUES (
            :id, :name, :role, :phone, :photo_url, :bio, :display_order, :is_active, :created_at
        ) ON DUPLICATE KEY UPDATE
            name = VALUES(name), role = VALUES(role), phone = VALUES(phone), photo_url = VALUES(photo_url),
            bio = VALUES(bio), display_order = VALUES(display_order), is_active = VALUES(is_active)");
        $stmt->execute([
            ':id' => $id,
            ':name' => $name,
            ':role' => $role,
            ':phone' => $phone,
            ':photo_url' => $photoUrl,
            ':bio' => $bio,
            ':display_order' => $displayOrder,
            ':is_active' => $isActive,
            ':created_at' => $createdAt
        ]);
        $savedId = $id;
        $msg = "सेवादार विवरण सफलतापूर्वक अपडेट हुआ!";
    } else {
        $stmt = $pdo->prepare("INSERT INTO sevadars (
            name, role, phone, photo_url, bio, display_order, is_active, created_at
        ) VALUES (
            :name, :role, :phone, :photo_url, :bio, :display_order, :is_active, :created_at
        )");
        $stmt->execute([
            ':name' => $name,
            ':role' => $role,
            ':phone' => $phone,
            ':photo_url' => $photoUrl,
            ':bio' => $bio,
            ':display_order' => $displayOrder,
            ':is_active' => $isActive,
            ':created_at' => $createdAt
        ]);
        $savedId = $pdo->lastInsertId();
        $msg = "नया सेवादार सफलतापूर्वक जोड़ा गया!";
    }

    echo json_encode([
        "success" => true,
        "id" => $savedId,
        "name" => $name,
        "role" => $role,
        "message" => $msg
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
