<?php
// ==============================================================================
// श्री बालाजी कृपा धाम (ग्राम डूँगरा जाट) - हाई-स्पीड लाइव कॉन्फ़िग व स्टेट API
// Ultra-Fast Central Live Configuration & State API with Zero-Crash Architecture
// ==============================================================================

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-SBKD-API-KEY, x-sbkd-api-key");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");

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
    function getDB($exitOnError = false) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        try {
            return new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_TIMEOUT => 3
            ]);
        } catch (Throwable $e) {
            return null;
        }
    }
}

// 1. Safe Fallback Default Config (Guarantees 200 OK Even Under Database Outages)
function getFallbackConfig() {
    $now = time();
    $data = [
        "ashram_name" => "श्री बालाजी कृपा धाम",
        "latitude" => 28.3972915,
        "longitude" => 78.1460410,
        "allowed_radius_meters" => 200.0,
        "is_geofence_enforced" => true,
        "is_outstation_advance_allowed" => true,
        "outstation_min_distance_km" => 30.0,
        "running_token_number" => 0,
        "current_serving_token" => 0,
        "daily_token_limit" => 1000,
        "is_token_service_enabled" => true,
        "token_service_mode" => "AUTO_SUNDAY",
        "is_tuesday_darbar_enabled" => false,
        "tuesday_darbar_name" => "श्री बालाजी कृपा धाम (मंगलवार दरबार, बुलन्दशहर)",
        "tuesday_darbar_address" => "बुलन्दशहर, उत्तर प्रदेश",
        "tuesday_latitude" => 28.4069,
        "tuesday_longitude" => 77.8498,
        "tuesday_allowed_radius_meters" => 200.0,
        "tuesday_outstation_min_distance_km" => 30.0,
        "tuesday_darbar_timings" => "प्रत्येक मंगलवार प्रातः 8:00 बजे से सायं 5:00 बजे तक",
        "tuesday_token_service_mode" => "AUTO_TUESDAY",
        "tuesday_scheduled_open_timestamp" => 0,
        "tuesday_darbar_date" => date('Y-m-d'),
        "tuesday_current_serving_token" => 0,
        "tuesday_running_token_number" => 0,
        "tuesday_token_notice" => "",
        "app_download_url" => "https://shribalajikripadham.online/downloads/ShriBalajiKripaDham-release.apk",
        "app_share_url" => "https://shribalajikripadham.online/download.php",
        "is_bus_booking_live" => false,
        "is_dharamshala_live" => false,
        "is_live_counter_visible" => true,
        "is_payment_feature_live" => false,
        "is_arzi_ledger_live" => true,
        "badi_arzi_rate" => 0.0,
        "chhoti_arzi_rate" => 0.0,
        "is_darbar_active" => true,
        "darbar_date" => date('Y-m-d'),
        "darbar_timings" => "प्रत्येक रविवार प्रातःकाल 8:00 बजे से",
        "emergency_notice" => "",
        "is_emergency_notice_visible" => false,
        "banner_title" => "🚩 श्री बालाजी कृपा धाम, ग्राम डूँगरा जाट",
        "banner_subtitle" => "परम पूज्य गुरुजी तेजवीर सिंह जी | निःशुल्क दरबार",
        "is_banner_visible" => true,
        "guruji_photo_url" => "",
        "can_admin_issue_reserved_tokens" => false,
        "allow_admin_reserved_tokens" => false,
        "contact_phone" => "",
        "whatsapp_number" => "",
        "upi_id" => "",
        "upi_name" => "श्री बालाजी कृपा धाम",
        "aarti_timings" => "",
        "is_darbar_live_now" => false,
        "live_stream_title" => "श्री बालाजी कृपा धाम दिव्य दरबार लाइव",
        "live_stream_url" => "",
        "youtube_live_url" => "",
        "facebook_live_url" => "",
        "top_bar_text" => "🚩 ॐ श्री हनुमते नमः | परम पूज्य गुरुजी तेजवीर सिंह जी | श्री बालाजी कृपा धाम, ग्राम डूँगरा जाट, बुलन्दशहर 🚩",
        "guruji_title" => "परम पूज्य गुरुजी तेजवीर सिंह जी",
        "guruji_bio" => "अध्यात्म, मानव सेवा एवं बालाजी महाराज की असीम कृपा के संवाहक",
        "token_rules_notice" => "आश्रम की निष्पक्षता, पारदर्शी कतार, GPS लोकेशन एवं AI बायोमेट्रिक सुरक्षा नियमों के अनुसार टोकन पंजीकरण केवल और केवल आधिकारिक मोबाइल ऐप से ही संभव है। वेबसाइट पर कोई टोकन जनरेशन फॉर्म नहीं है। टोकन प्राप्त करने के लिए कृपया ऊपर दिए गए बटन से मोबाइल ऐप इंस्टॉल करें।",
        "aarti_mangala_time" => "",
        "aarti_balbhog_time" => "",
        "aarti_sandhya_time" => "",
        "aarti_shayan_time" => "",
        "bank_name" => "पंजाब नेशनल बैंक (PNB)",
        "bank_account_holder" => "श्री बालाजी कृपा धाम सेवा ट्रस्ट",
        "bank_account_number" => "",
        "bank_ifsc" => "",
        "bank_branch" => "अनूपशहर, बुलन्दशहर",
        "ashram_address" => "श्री बालाजी कृपा धाम, ग्राम डूँगरा जाट, तहसील अनूपशहर, जिला बुलन्दशहर, उत्तर प्रदेश",
        "ashram_directions" => "निकटतम रेलवे स्टेशन: अनूपशहर / बबराला / बुलन्दशहर",
        "contact_email" => "",
        "instagram_url" => "https://www.instagram.com/shribalajikripadham",
        "whatsapp_channel_url" => "https://chat.whatsapp.com/invite",
        "footer_title" => "श्री बालाजी कृपा धाम",
        "footer_dedication" => "सर्वस्व श्री रामभक्त वीर हनुमान जी महाराज के पावन चरणों में समर्पित।",
        "footer_copyright" => "© 2026 श्री बालाजी कृपा धाम सेवा ट्रस्ट। सर्वाधिकार सुरक्षित।",
        "ashram_parichay_hindi" => "श्री बालाजी कृपा धाम (ग्राम डूंगरा जाट, तहसील अनूपशहर, ज़िला बुलन्दशहर, उ.प्र.) में परम पूज्य गुरुजी तेजवीर सिंह जी के मार्गदर्शन में भूत-प्रेत, ऊपरी बाधा व मानसिक कष्टों का इलाज 100% निःशुल्क किया जाता है। यहाँ किसी भी प्रकार का चढ़ावा या दक्षिणा नहीं ली जाती।",
        "ashram_history_hindi" => "परम पूज्य गुरुजी को श्री बालाजी महाराज व भैरव बाबा का साक्षात आशीर्वाद प्राप्त है। पिछले कई वर्षों से डूंगरा जाट धाम पर लाखों पीड़ित भक्तों को नई जिंदगी और शांति मिली है।",
        "ashram_rules_hindi" => "1. प्रत्येक रविवार प्रातःकाल से दरबार प्रारंभ होता है।\n2. टोकन केवल आधिकारिक ऐप से मान्य है।\n3. एक मोबाइल से 1 ही टोकन बनेगा।\n4. पूर्ण शांति, स्वच्छता व मर्यादा बनाए रखें।",
        "bus_seat_fare_amount" => 0,
        "config_version" => 1,
        "server_time" => $now,
        "sevadars" => [],
        "donors" => []
    ];
    return $data;
}

$cacheDir = __DIR__ . '/../cache';
$cacheFile = $cacheDir . '/live_config_cache.json';

// Target columns for schema self-healing (only run on demand or during mutations)
$targetCols = [
    "ashram_name" => "VARCHAR(255) NOT NULL DEFAULT 'श्री बालाजी कृपा धाम'",
    "ashram_latitude" => "DECIMAL(11, 8) NOT NULL DEFAULT 28.3972915",
    "ashram_longitude" => "DECIMAL(11, 8) NOT NULL DEFAULT 78.1460410",
    "allowed_radius_meters" => "DECIMAL(8, 2) NOT NULL DEFAULT 200.0",
    "is_geofence_enforced" => "TINYINT(1) NOT NULL DEFAULT 1",
    "is_outstation_advance_allowed" => "TINYINT(1) NOT NULL DEFAULT 1",
    "outstation_min_distance_km" => "DECIMAL(6, 2) NOT NULL DEFAULT 30.0",
    "current_serving_token" => "INT NOT NULL DEFAULT 0",
    "daily_token_limit" => "INT NOT NULL DEFAULT 1000",
    "is_token_service_enabled" => "TINYINT(1) NOT NULL DEFAULT 1",
    "token_service_mode" => "VARCHAR(30) NOT NULL DEFAULT 'AUTO_SUNDAY'",
    "is_tuesday_darbar_enabled" => "TINYINT(1) NOT NULL DEFAULT 0",
    "tuesday_darbar_name" => "VARCHAR(255) NOT NULL DEFAULT 'श्री बालाजी कृपा धाम (मंगलवार दरबार, बुलन्दशहर)'",
    "tuesday_darbar_address" => "TEXT",
    "tuesday_latitude" => "DECIMAL(11, 8) NOT NULL DEFAULT 28.4069000",
    "tuesday_longitude" => "DECIMAL(11, 8) NOT NULL DEFAULT 77.8498000",
    "tuesday_allowed_radius_meters" => "DECIMAL(8, 2) NOT NULL DEFAULT 200.0",
    "tuesday_outstation_min_distance_km" => "DECIMAL(6, 2) NOT NULL DEFAULT 30.0",
    "tuesday_darbar_timings" => "VARCHAR(255) NOT NULL DEFAULT 'प्रत्येक मंगलवार प्रातः 8:00 बजे से सायं 5:00 बजे तक'",
    "tuesday_token_service_mode" => "VARCHAR(30) NOT NULL DEFAULT 'AUTO_TUESDAY'",
    "tuesday_scheduled_open_timestamp" => "BIGINT NOT NULL DEFAULT 0",
    "tuesday_darbar_date" => "VARCHAR(50) NOT NULL DEFAULT ''",
    "tuesday_current_serving_token" => "INT NOT NULL DEFAULT 0",
    "tuesday_running_token_number" => "INT NOT NULL DEFAULT 0",
    "tuesday_token_notice" => "TEXT",
    "app_download_url" => "VARCHAR(500) NOT NULL DEFAULT 'https://shribalajikripadham.online/downloads/ShriBalajiKripaDham-release.apk'",
    "app_share_url" => "VARCHAR(500) NOT NULL DEFAULT 'https://shribalajikripadham.online/download.php'",
    "is_bus_booking_live" => "TINYINT(1) NOT NULL DEFAULT 0",
    "is_dharamshala_live" => "TINYINT(1) NOT NULL DEFAULT 0",
    "is_live_counter_visible" => "TINYINT(1) NOT NULL DEFAULT 1",
    "is_payment_feature_live" => "TINYINT(1) NOT NULL DEFAULT 0",
    "is_arzi_ledger_live" => "TINYINT(1) NOT NULL DEFAULT 1",
    "is_darbar_active" => "TINYINT(1) NOT NULL DEFAULT 1",
    "darbar_date" => "VARCHAR(50) NOT NULL DEFAULT ''",
    "darbar_timings" => "VARCHAR(255) NOT NULL DEFAULT 'प्रत्येक रविवार प्रातःकाल 8:00 बजे से'",
    "emergency_notice" => "TEXT",
    "is_emergency_notice_visible" => "TINYINT(1) NOT NULL DEFAULT 0",
    "banner_title" => "VARCHAR(255) NOT NULL DEFAULT '🚩 श्री बालाजी कृपा धाम, ग्राम डूँगरा जाट'",
    "banner_subtitle" => "VARCHAR(255) NOT NULL DEFAULT 'परम पूज्य गुरुजी तेजवीर सिंह जी | निःशुल्क दरबार'",
    "is_banner_visible" => "TINYINT(1) NOT NULL DEFAULT 1",
    "guruji_photo_url" => "VARCHAR(500) DEFAULT ''",
    "can_admin_issue_reserved_tokens" => "TINYINT(1) NOT NULL DEFAULT 0",
    "allow_admin_reserved_tokens" => "TINYINT(1) NOT NULL DEFAULT 0",
    "badi_arzi_rate" => "DECIMAL(10, 2) NOT NULL DEFAULT 0.0",
    "chhoti_arzi_rate" => "DECIMAL(10, 2) NOT NULL DEFAULT 0.0",
    "contact_phone" => "VARCHAR(50) NOT NULL DEFAULT ''",
    "whatsapp_number" => "VARCHAR(50) NOT NULL DEFAULT ''",
    "upi_id" => "VARCHAR(100) NOT NULL DEFAULT ''",
    "upi_name" => "VARCHAR(150) NOT NULL DEFAULT 'श्री बालाजी कृपा धाम'",
    "aarti_timings" => "TEXT",
    "is_darbar_live_now" => "TINYINT(1) NOT NULL DEFAULT 0",
    "live_stream_title" => "VARCHAR(255) NOT NULL DEFAULT 'श्री बालाजी कृपा धाम दिव्य दरबार लाइव'",
    "live_stream_url" => "VARCHAR(500) DEFAULT ''",
    "youtube_live_url" => "VARCHAR(500) DEFAULT ''",
    "facebook_live_url" => "VARCHAR(500) DEFAULT ''",
    "top_bar_text" => "VARCHAR(255) NOT NULL DEFAULT '🚩 ॐ श्री हनुमते नमः | परम पूज्य गुरुजी तेजवीर सिंह जी | श्री बालाजी कृपा धाम, ग्राम डूँगरा जाट, बुलन्दशहर 🚩'",
    "guruji_title" => "VARCHAR(255) NOT NULL DEFAULT 'परम पूज्य गुरुजी तेजवीर सिंह जी'",
    "guruji_bio" => "TEXT",
    "token_rules_notice" => "TEXT",
    "aarti_mangala_time" => "VARCHAR(100) NOT NULL DEFAULT ''",
    "aarti_balbhog_time" => "VARCHAR(100) NOT NULL DEFAULT ''",
    "aarti_sandhya_time" => "VARCHAR(100) NOT NULL DEFAULT ''",
    "aarti_shayan_time" => "VARCHAR(100) NOT NULL DEFAULT ''",
    "bank_name" => "VARCHAR(150) NOT NULL DEFAULT 'पंजाब नेशनल बैंक (PNB)'",
    "bank_account_holder" => "VARCHAR(150) NOT NULL DEFAULT 'श्री बालाजी कृपा धाम सेवा ट्रस्ट'",
    "bank_account_number" => "VARCHAR(50) NOT NULL DEFAULT ''",
    "bank_ifsc" => "VARCHAR(50) NOT NULL DEFAULT ''",
    "bank_branch" => "VARCHAR(150) NOT NULL DEFAULT 'अनूपशहर, बुलन्दशहर'",
    "ashram_address" => "TEXT",
    "ashram_directions" => "TEXT",
    "contact_email" => "VARCHAR(100) NOT NULL DEFAULT ''",
    "instagram_url" => "VARCHAR(500) DEFAULT ''",
    "whatsapp_channel_url" => "VARCHAR(500) DEFAULT ''",
    "footer_title" => "VARCHAR(255) NOT NULL DEFAULT 'श्री बालाजी कृपा धाम'",
    "footer_dedication" => "VARCHAR(500) NOT NULL DEFAULT 'सर्वस्व श्री रामभक्त वीर हनुमान जी महाराज के पावन चरणों में समर्पित।'",
    "footer_copyright" => "VARCHAR(255) NOT NULL DEFAULT '© 2026 श्री बालाजी कृपा धाम सेवा ट्रस्ट। सर्वाधिकार सुरक्षित।'",
    "ashram_parichay_hindi" => "TEXT",
    "ashram_history_hindi" => "TEXT",
    "ashram_rules_hindi" => "TEXT",
    "bus_seat_fare_amount" => "INT NOT NULL DEFAULT 0",
    "config_version" => "INT NOT NULL DEFAULT 1"
];

function runSchemaMigrations($pdo, $targetCols) {
    if (!$pdo) return;
    try {
        $pdo->exec("CREATE TABLE IF NOT EXISTS ashram_settings (id INT PRIMARY KEY DEFAULT 1) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
        $pdo->exec("INSERT IGNORE INTO ashram_settings (id) VALUES (1)");

        $colStmt = $pdo->query("SHOW COLUMNS FROM ashram_settings");
        $existingCols = $colStmt ? $colStmt->fetchAll(PDO::FETCH_COLUMN) : [];
        if (is_array($existingCols)) {
            $existingColMap = array_flip($existingCols);
            foreach ($targetCols as $col => $definition) {
                if (!isset($existingColMap[$col])) {
                    try {
                        $pdo->exec("ALTER TABLE ashram_settings ADD COLUMN `{$col}` {$definition}");
                    } catch (Throwable $t) {}
                }
            }
        }

        // Ensure secondary tables exist
        $pdo->exec("CREATE TABLE IF NOT EXISTS sevadars (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            role VARCHAR(150) NOT NULL DEFAULT 'सेवादार',
            phone VARCHAR(20) NOT NULL DEFAULT '',
            photo_url VARCHAR(500) DEFAULT '',
            bio TEXT,
            display_order INT NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at BIGINT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_sevadar_order (display_order),
            INDEX idx_sevadar_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $pdo->exec("CREATE TABLE IF NOT EXISTS donors (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(150) NOT NULL,
            city_address VARCHAR(200) NOT NULL DEFAULT 'ग्राम डूँगरा जाट',
            title VARCHAR(200) NOT NULL DEFAULT 'मंदिर निर्माण सहयोगी',
            photo_url VARCHAR(500) DEFAULT '',
            phone VARCHAR(20) DEFAULT '',
            notes TEXT,
            display_order INT NOT NULL DEFAULT 0,
            is_active TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_donor_order (display_order),
            INDEX idx_donor_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        // 0-Tolerance Policy: Purge any placeholder dummy data from production MySQL
        $pdo->exec("UPDATE ashram_settings SET bank_account_number = '' WHERE bank_account_number LIKE '%XXXX%'");
        $pdo->exec("UPDATE ashram_settings SET bank_ifsc = '' WHERE bank_ifsc LIKE '%XXXX%'");
        $pdo->exec("UPDATE ashram_settings SET contact_phone = '' WHERE contact_phone LIKE '%97206%' OR contact_phone LIKE '%98765%'");
        $pdo->exec("UPDATE ashram_settings SET whatsapp_number = '' WHERE whatsapp_number LIKE '%97206%' OR whatsapp_number LIKE '%98765%'");
        $pdo->exec("UPDATE ashram_settings SET contact_email = '' WHERE contact_email LIKE '%shribalajikripadham@gmail.com%'");
        $pdo->exec("UPDATE ashram_settings SET upi_id = '' WHERE upi_id = 'shribalajikripadham@upi'");
        $pdo->exec("UPDATE ashram_settings SET aarti_mangala_time = '', aarti_balbhog_time = '', aarti_sandhya_time = '', aarti_shayan_time = '', aarti_timings = ''");
        $pdo->exec("DELETE FROM sevadars WHERE phone LIKE '%987654321%' OR phone = '' OR name IN ('अंकित शर्मा', 'दीपक कुमार', 'राहुल सिंह', 'सोनू तेवतिया') OR name LIKE '%?%'");
        $pdo->exec("DELETE FROM donors WHERE phone LIKE '%987654321%' OR name IN ('सेठ राधेश्याम जी', 'चौधरी वीरेन्द्र सिंह जी', 'श्री रमेश चंद्र गोयल जी', 'श्री अजय तेवतिया जी', 'श्री Ajay तेवतिया जी') OR name LIKE '%?%'");
    } catch (Throwable $e) {
        error_log("runSchemaMigrations warning: " . $e->getMessage());
    }
}

// -----------------------------------------------------------------------------
// POST REQUEST: Admin Setting Mutation
// -----------------------------------------------------------------------------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (function_exists('verifyApiAuth')) {
        verifyApiAuth();
    }

    $pdo = getDB();
    if (!$pdo) {
        http_response_code(503);
        echo json_encode(["success" => false, "error" => "डेटाबेस कनेक्शन उपलब्ध नहीं है (Database unavailable)"], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Always run schema migration on POST to ensure any new columns exist
    runSchemaMigrations($pdo, $targetCols);

    $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

    // Fetch existing settings
    $current = [];
    try {
        $stmt = $pdo->query("SELECT * FROM ashram_settings WHERE id = 1 LIMIT 1");
        $current = ($stmt) ? ($stmt->fetch() ?: []) : [];
    } catch (Throwable $e) {}

    // Check available columns
    $colStmt = $pdo->query("SHOW COLUMNS FROM ashram_settings");
    $cols = $colStmt ? $colStmt->fetchAll(PDO::FETCH_COLUMN) : [];
    $colSet = is_array($cols) ? array_flip($cols) : [];

    $fields = [
        'ashram_name' => trim($input['ashram_name'] ?? ($current['ashram_name'] ?? 'श्री बालाजी कृपा धाम')),
        'ashram_latitude' => floatval($input['latitude'] ?? ($current['ashram_latitude'] ?? 28.3972915)),
        'ashram_longitude' => floatval($input['longitude'] ?? ($current['ashram_longitude'] ?? 78.1460410)),
        'allowed_radius_meters' => floatval($input['allowed_radius_meters'] ?? ($current['allowed_radius_meters'] ?? 200.0)),
        'is_geofence_enforced' => isset($input['is_geofence_enforced']) ? intval($input['is_geofence_enforced']) : intval($current['is_geofence_enforced'] ?? 1),
        'is_outstation_advance_allowed' => isset($input['is_outstation_advance_allowed']) ? intval($input['is_outstation_advance_allowed']) : intval($current['is_outstation_advance_allowed'] ?? 1),
        'outstation_min_distance_km' => floatval($input['outstation_min_distance_km'] ?? ($current['outstation_min_distance_km'] ?? 30.0)),
        'current_serving_token' => isset($input['current_serving_token']) ? intval($input['current_serving_token']) : intval($current['current_serving_token'] ?? 0),
        'daily_token_limit' => isset($input['daily_token_limit']) ? intval($input['daily_token_limit']) : intval($current['daily_token_limit'] ?? 1000),
        'is_token_service_enabled' => isset($input['is_token_service_enabled']) ? intval($input['is_token_service_enabled']) : intval($current['is_token_service_enabled'] ?? 1),
        'token_service_mode' => trim($input['token_service_mode'] ?? ($current['token_service_mode'] ?? 'AUTO_SUNDAY')),
        'is_tuesday_darbar_enabled' => isset($input['is_tuesday_darbar_enabled']) ? intval($input['is_tuesday_darbar_enabled']) : intval($current['is_tuesday_darbar_enabled'] ?? 0),
        'tuesday_darbar_name' => trim($input['tuesday_darbar_name'] ?? ($current['tuesday_darbar_name'] ?? 'श्री बालाजी कृपा धाम (मंगलवार दरबार, बुलन्दशहर)')),
        'tuesday_darbar_address' => trim($input['tuesday_darbar_address'] ?? ($current['tuesday_darbar_address'] ?? 'बुलन्दशहर, उत्तर प्रदेश')),
        'tuesday_latitude' => floatval($input['tuesday_latitude'] ?? ($current['tuesday_latitude'] ?? 28.4069)),
        'tuesday_longitude' => floatval($input['tuesday_longitude'] ?? ($current['tuesday_longitude'] ?? 77.8498)),
        'tuesday_allowed_radius_meters' => floatval($input['tuesday_allowed_radius_meters'] ?? ($current['tuesday_allowed_radius_meters'] ?? 200.0)),
        'tuesday_outstation_min_distance_km' => floatval($input['tuesday_outstation_min_distance_km'] ?? ($current['tuesday_outstation_min_distance_km'] ?? 30.0)),
        'tuesday_darbar_timings' => trim($input['tuesday_darbar_timings'] ?? ($current['tuesday_darbar_timings'] ?? 'प्रत्येक मंगलवार प्रातः 8:00 बजे से सायं 5:00 बजे तक')),
        'tuesday_token_service_mode' => trim($input['tuesday_token_service_mode'] ?? ($current['tuesday_token_service_mode'] ?? 'AUTO_TUESDAY')),
        'tuesday_scheduled_open_timestamp' => isset($input['tuesday_scheduled_open_timestamp']) ? intval($input['tuesday_scheduled_open_timestamp']) : intval($current['tuesday_scheduled_open_timestamp'] ?? 0),
        'tuesday_darbar_date' => trim($input['tuesday_darbar_date'] ?? ($current['tuesday_darbar_date'] ?? date('Y-m-d'))),
        'tuesday_current_serving_token' => isset($input['tuesday_current_serving_token']) ? intval($input['tuesday_current_serving_token']) : intval($current['tuesday_current_serving_token'] ?? 0),
        'tuesday_running_token_number' => isset($input['tuesday_running_token_number']) ? intval($input['tuesday_running_token_number']) : (isset($input['tuesday_current_serving_token']) ? intval($input['tuesday_current_serving_token']) : intval($current['tuesday_running_token_number'] ?? 0)),
        'tuesday_token_notice' => trim($input['tuesday_token_notice'] ?? ($current['tuesday_token_notice'] ?? '')),
        'app_download_url' => trim($input['app_download_url'] ?? ($current['app_download_url'] ?? 'https://shribalajikripadham.online/downloads/ShriBalajiKripaDham-release.apk')),
        'app_share_url' => trim($input['app_share_url'] ?? ($current['app_share_url'] ?? 'https://shribalajikripadham.online/download.php')),
        'is_bus_booking_live' => isset($input['is_bus_booking_live']) ? intval($input['is_bus_booking_live']) : intval($current['is_bus_booking_live'] ?? 0),
        'is_dharamshala_live' => isset($input['is_dharamshala_live']) ? intval($input['is_dharamshala_live']) : intval($current['is_dharamshala_live'] ?? 0),
        'is_live_counter_visible' => isset($input['is_live_counter_visible']) ? intval($input['is_live_counter_visible']) : intval($current['is_live_counter_visible'] ?? 1),
        'is_payment_feature_live' => isset($input['is_payment_feature_live']) ? intval($input['is_payment_feature_live']) : intval($current['is_payment_feature_live'] ?? 0),
        'is_arzi_ledger_live' => isset($input['is_arzi_ledger_live']) ? intval($input['is_arzi_ledger_live']) : intval($current['is_arzi_ledger_live'] ?? 1),
        'is_darbar_active' => isset($input['is_darbar_active']) ? intval($input['is_darbar_active']) : intval($current['is_darbar_active'] ?? 1),
        'darbar_date' => trim($input['darbar_date'] ?? ($current['darbar_date'] ?? date('Y-m-d'))),
        'darbar_timings' => trim($input['darbar_timings'] ?? ($current['darbar_timings'] ?? 'प्रत्येक रविवार प्रातःकाल 8:00 बजे से')),
        'emergency_notice' => trim($input['emergency_notice'] ?? ($current['emergency_notice'] ?? '')),
        'is_emergency_notice_visible' => isset($input['is_emergency_notice_visible']) ? intval($input['is_emergency_notice_visible']) : intval($current['is_emergency_notice_visible'] ?? 0),
        'banner_title' => trim($input['banner_title'] ?? ($current['banner_title'] ?? '🚩 श्री बालाजी कृपा धाम, ग्राम डूँगरा जाट')),
        'banner_subtitle' => trim($input['banner_subtitle'] ?? ($current['banner_subtitle'] ?? 'परम पूज्य गुरुजी तेजवीर सिंह जी | निःशुल्क दरबार')),
        'is_banner_visible' => isset($input['is_banner_visible']) ? intval($input['is_banner_visible']) : intval($current['is_banner_visible'] ?? 1),
        'guruji_photo_url' => trim($input['guruji_photo_url'] ?? ($current['guruji_photo_url'] ?? '')),
        'can_admin_issue_reserved_tokens' => isset($input['can_admin_issue_reserved_tokens']) ? intval($input['can_admin_issue_reserved_tokens']) : (isset($input['allow_admin_reserved_tokens']) ? intval($input['allow_admin_reserved_tokens']) : intval($current['can_admin_issue_reserved_tokens'] ?? 0)),
        'allow_admin_reserved_tokens' => isset($input['allow_admin_reserved_tokens']) ? intval($input['allow_admin_reserved_tokens']) : (isset($input['can_admin_issue_reserved_tokens']) ? intval($input['can_admin_issue_reserved_tokens']) : intval($current['allow_admin_reserved_tokens'] ?? 0)),
        'badi_arzi_rate' => isset($input['badi_arzi_rate']) ? floatval($input['badi_arzi_rate']) : floatval($current['badi_arzi_rate'] ?? 0.0),
        'chhoti_arzi_rate' => isset($input['chhoti_arzi_rate']) ? floatval($input['chhoti_arzi_rate']) : floatval($current['chhoti_arzi_rate'] ?? 0.0),
        'contact_phone' => isset($input['contact_phone']) ? trim($input['contact_phone']) : (isset($input['phone']) ? trim($input['phone']) : ($current['contact_phone'] ?? '')),
        'whatsapp_number' => isset($input['whatsapp_number']) ? trim($input['whatsapp_number']) : (isset($input['whatsapp']) ? trim($input['whatsapp']) : ($current['whatsapp_number'] ?? '')),
        'upi_id' => isset($input['upi_id']) ? trim($input['upi_id']) : (isset($input['bank_upi_id']) ? trim($input['bank_upi_id']) : ($current['upi_id'] ?? '')),
        'upi_name' => trim($input['upi_name'] ?? ($current['upi_name'] ?? 'श्री बालाजी कृपा धाम')),
        'aarti_timings' => trim($input['aarti_timings'] ?? ($current['aarti_timings'] ?? '')),
        'is_darbar_live_now' => isset($input['is_darbar_live_now']) ? intval($input['is_darbar_live_now']) : intval($current['is_darbar_live_now'] ?? 0),
        'live_stream_title' => trim($input['live_stream_title'] ?? ($current['live_stream_title'] ?? 'श्री बालाजी कृपा धाम दिव्य दरबार लाइव')),
        'live_stream_url' => trim($input['live_stream_url'] ?? ($current['live_stream_url'] ?? '')),
        'youtube_live_url' => trim($input['youtube_live_url'] ?? ($input['youtube_live_video_id'] ?? ($current['youtube_live_url'] ?? ''))),
        'facebook_live_url' => trim($input['facebook_live_url'] ?? ($current['facebook_live_url'] ?? '')),
        'top_bar_text' => trim($input['top_bar_text'] ?? ($current['top_bar_text'] ?? '🚩 ॐ श्री हनुमते नमः | परम पूज्य गुरुजी तेजवीर सिंह जी | श्री बालाजी कृपा धाम, ग्राम डूँगरा जाट, बुलन्दशहर 🚩')),
        'guruji_title' => trim($input['guruji_title'] ?? ($current['guruji_title'] ?? 'परम पूज्य गुरुजी तेजवीर सिंह जी')),
        'guruji_bio' => trim($input['guruji_bio'] ?? ($current['guruji_bio'] ?? 'अध्यात्म, मानव सेवा एवं बालाजी महाराज की असीम कृपा के संवाहक')),
        'token_rules_notice' => trim($input['token_rules_notice'] ?? ($input['token_rules_summary'] ?? ($current['token_rules_notice'] ?? 'आश्रम की निष्पक्षता, पारदर्शी कतार, GPS लोकेशन एवं AI बायोमेट्रिक सुरक्षा नियमों के अनुसार टोकन पंजीकरण केवल और केवल आधिकारिक मोबाइल ऐप से ही संभव है। वेबसाइट पर कोई टोकन जनरेशन फॉर्म नहीं है। टोकन प्राप्त करने के लिए कृपया ऊपर दिए गए बटन से मोबाइल ऐप इंस्टॉल करें।'))),
        'aarti_mangala_time' => trim($input['aarti_mangala_time'] ?? ($current['aarti_mangala_time'] ?? '')),
        'aarti_balbhog_time' => trim($input['aarti_balbhog_time'] ?? ($current['aarti_balbhog_time'] ?? '')),
        'aarti_sandhya_time' => trim($input['aarti_sandhya_time'] ?? ($current['aarti_sandhya_time'] ?? '')),
        'aarti_shayan_time' => trim($input['aarti_shayan_time'] ?? ($input['aarti_maha_time'] ?? ($current['aarti_shayan_time'] ?? ''))),
        'bank_name' => trim($input['bank_name'] ?? ($current['bank_name'] ?? 'पंजाब नेशनल बैंक (PNB)')),
        'bank_account_holder' => trim($input['bank_account_holder'] ?? ($current['bank_account_holder'] ?? 'श्री बालाजी कृपा धाम सेवा ट्रस्ट')),
        'bank_account_number' => trim($input['bank_account_number'] ?? ($current['bank_account_number'] ?? '')),
        'bank_ifsc' => trim($input['bank_ifsc'] ?? ($current['bank_ifsc'] ?? '')),
        'bank_branch' => trim($input['bank_branch'] ?? ($current['bank_branch'] ?? 'अनूपशहर, बुलन्दशहर')),
        'ashram_address' => trim($input['ashram_address'] ?? ($current['ashram_address'] ?? 'श्री बालाजी कृपा धाम, ग्राम डूँगरा जाट, तहसील अनूपशहर, जिला बुलन्दशहर, उत्तर प्रदेश')),
        'ashram_directions' => trim($input['ashram_directions'] ?? ($current['ashram_directions'] ?? 'निकटतम रेलवे स्टेशन: अनूपशहर / बबराला / बुलन्दशहर')),
        'contact_email' => trim($input['contact_email'] ?? ($current['contact_email'] ?? '')),
        'instagram_url' => trim($input['instagram_url'] ?? ($current['instagram_url'] ?? '')),
        'whatsapp_channel_url' => trim($input['whatsapp_channel_url'] ?? ($current['whatsapp_channel_url'] ?? '')),
        'footer_title' => trim($input['footer_title'] ?? ($current['footer_title'] ?? 'श्री बालाजी कृपा धाम')),
        'footer_dedication' => trim($input['footer_dedication'] ?? ($current['footer_dedication'] ?? 'सर्वस्व श्री रामभक्त वीर हनुमान जी महाराज के पावन चरणों में समर्पित।')),
        'footer_copyright' => trim($input['footer_copyright'] ?? ($current['footer_copyright'] ?? '© 2026 श्री बालाजी कृपा धाम सेवा ट्रस्ट। सर्वाधिकार सुरक्षित।')),
        'ashram_parichay_hindi' => trim($input['ashram_parichay_hindi'] ?? ($current['ashram_parichay_hindi'] ?? '')),
        'ashram_history_hindi' => trim($input['ashram_history_hindi'] ?? ($input['ashram_history'] ?? ($current['ashram_history_hindi'] ?? ''))),
        'ashram_rules_hindi' => trim($input['ashram_rules_hindi'] ?? ($current['ashram_rules_hindi'] ?? '')),
        'bus_seat_fare_amount' => isset($input['bus_seat_fare_amount']) ? intval($input['bus_seat_fare_amount']) : intval($current['bus_seat_fare_amount'] ?? 0)
    ];

    if (strpos($fields['contact_phone'], '97206') !== false || strpos($fields['contact_phone'], '98765') !== false) $fields['contact_phone'] = '';
    if (strpos($fields['whatsapp_number'], '97206') !== false || strpos($fields['whatsapp_number'], '98765') !== false) $fields['whatsapp_number'] = '';
    if (strpos($fields['contact_email'], 'shribalajikripadham@gmail.com') !== false) $fields['contact_email'] = '';
    if ($fields['upi_id'] === 'shribalajikripadham@upi') $fields['upi_id'] = '';

    $updatePairs = [];
    $bindings = [];
    foreach ($fields as $colName => $val) {
        if (isset($colSet[$colName])) {
            $paramName = ":p_" . $colName;
            $updatePairs[] = "`$colName` = $paramName";
            $bindings[$paramName] = $val;
        }
    }

    if (isset($colSet['config_version'])) {
        $updatePairs[] = "`config_version` = COALESCE(`config_version`, 1) + 1";
    }

    if (!empty($updatePairs)) {
        try {
            $sql = "UPDATE ashram_settings SET " . implode(", ", $updatePairs) . " WHERE id = 1";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($bindings);
        } catch (Throwable $e) {
            error_log("Update ashram_settings error: " . $e->getMessage());
        }
    }

    // Synchronize full Sevadars list if provided in payload
    if (isset($input['sevadars']) && is_array($input['sevadars'])) {
        try {
            $inSevList = $input['sevadars'];
            $activeIds = [];
            foreach ($inSevList as $s) {
                $sName = trim($s['name'] ?? '');
                if (empty($sName)) continue;
                $sId = intval($s['id'] ?? 0);
                $sRole = trim($s['role'] ?? ($s['roleTitleHindi'] ?? 'आश्रम सेवादार'));
                $sPhone = trim($s['phone'] ?? ($s['phoneNumber'] ?? ''));
                $sPhoto = trim($s['photo_url'] ?? ($s['photoUri'] ?? ''));
                $sOrder = intval($s['display_order'] ?? ($s['displayOrder'] ?? 0));
                $sActive = isset($s['is_active']) ? intval($s['is_active']) : (isset($s['isActive']) ? ($s['isActive'] ? 1 : 0) : 1);
                $sCreated = intval($s['created_at'] ?? (time() * 1000));

                if ($sId > 0) {
                    $uStmt = $pdo->prepare("INSERT INTO sevadars (id, name, role, phone, photo_url, display_order, is_active, created_at)
                        VALUES (:id, :name, :role, :phone, :photo_url, :display_order, :is_active, :created_at)
                        ON DUPLICATE KEY UPDATE name = VALUES(name), role = VALUES(role), phone = VALUES(phone), photo_url = VALUES(photo_url), display_order = VALUES(display_order), is_active = VALUES(is_active)");
                    $uStmt->execute([
                        ':id' => $sId,
                        ':name' => $sName,
                        ':role' => $sRole,
                        ':phone' => $sPhone,
                        ':photo_url' => $sPhoto,
                        ':display_order' => $sOrder,
                        ':is_active' => $sActive,
                        ':created_at' => $sCreated
                    ]);
                    $activeIds[] = $sId;
                } else {
                    $iStmt = $pdo->prepare("INSERT INTO sevadars (name, role, phone, photo_url, display_order, is_active, created_at)
                        VALUES (:name, :role, :phone, :photo_url, :display_order, :is_active, :created_at)");
                    $iStmt->execute([
                        ':name' => $sName,
                        ':role' => $sRole,
                        ':phone' => $sPhone,
                        ':photo_url' => $sPhoto,
                        ':display_order' => $sOrder,
                        ':is_active' => $sActive,
                        ':created_at' => $sCreated
                    ]);
                    $activeIds[] = intval($pdo->lastInsertId());
                }
            }

            if (!empty($activeIds)) {
                $inClause = implode(',', array_map('intval', $activeIds));
                $pdo->exec("UPDATE sevadars SET is_active = 0 WHERE id NOT IN ($inClause)");
            } else {
                $pdo->exec("UPDATE sevadars SET is_active = 0");
            }
        } catch (Throwable $sevEx) {}
    }

    // Invalidate All Caches (live_config_cache.json, site_data_cache.json, etc.) Immediately
    $allCaches = glob(__DIR__ . '/../cache/*');
    if ($allCaches) {
        @array_map('unlink', $allCaches);
    }

    echo json_encode([
        "success" => true,
        "status" => "SUCCESS",
        "message" => "सुपरएडमिन सेटिंग्स सफलतापूर्वक अपडेट व लाइव प्रसारित हुईं!",
        "current_serving_token" => $fields['current_serving_token'],
        "badi_arzi_rate" => $fields['badi_arzi_rate'],
        "chhoti_arzi_rate" => $fields['chhoti_arzi_rate'],
        "guruji_photo_url" => $fields['guruji_photo_url'],
        "is_token_service_enabled" => boolval($fields['is_token_service_enabled']),
        "is_bus_booking_live" => boolval($fields['is_bus_booking_live']),
        "is_dharamshala_live" => boolval($fields['is_dharamshala_live']),
        "timestamp" => time()
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// -----------------------------------------------------------------------------
// GET REQUEST: High-Speed Cached Live Status
// -----------------------------------------------------------------------------

// Optional manual trigger for schema migration: ?run_migration=1
if (isset($_GET['run_migration']) && $_GET['run_migration'] == '1') {
    $pdo = getDB();
    runSchemaMigrations($pdo, $targetCols);
    if (file_exists($cacheFile)) @unlink($cacheFile);
}

// Self-healing deployment hook to write missing files from GitHub
if (isset($_GET['deploy_missing']) && $_GET['deploy_missing'] == '1') {
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
    if (file_exists($cacheFile)) @unlink($cacheFile);
    echo json_encode(['success' => true, 'repaired' => $repaired, 'message' => 'Files synchronized from GitHub successfully'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Step 1: Check File Cache (2s TTL max, bypassed if nocache or t parameter provided)
$now = time();
$bypassCache = isset($_GET['nocache']) || isset($_GET['t']) || isset($_GET['no_cache']);
if (!$bypassCache && file_exists($cacheFile) && ($now - filemtime($cacheFile) < 2)) {
    $cached = @file_get_contents($cacheFile);
    if ($cached && strlen($cached) > 50) {
        $etag = '"sbkd_c_' . filemtime($cacheFile) . '"';
        header("ETag: $etag");
        if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH']) === $etag) {
            http_response_code(304);
            exit;
        }
        echo $cached;
        exit;
    }
}

// Step 2: Query Live Database
$pdo = getDB();
$fb = getFallbackConfig();

if (!$pdo) {
    // Database connection down or busy: return safe fallback immediately
    $response = array_merge(["success" => true, "status" => "OFFLINE_CACHE_ACTIVE"], $fb);
    $response["config"] = $fb;
    echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

try {
    $row = [];
    try {
        $stmt = $pdo->query("SELECT * FROM ashram_settings WHERE id = 1 LIMIT 1");
        $row = $stmt ? ($stmt->fetch() ?: []) : [];
        if (!empty($row['bank_account_number']) && strpos($row['bank_account_number'], 'XXXX') !== false) {
            $row['bank_account_number'] = '';
            try { $pdo->exec("UPDATE ashram_settings SET bank_account_number = '' WHERE id = 1"); } catch (Throwable $e) {}
        }
        if (!empty($row['bank_ifsc']) && strpos($row['bank_ifsc'], 'XXXX') !== false) {
            $row['bank_ifsc'] = '';
            try { $pdo->exec("UPDATE ashram_settings SET bank_ifsc = '' WHERE id = 1"); } catch (Throwable $e) {}
        }
    } catch (Throwable $ex) {
        // Table may be missing; trigger migration once
        runSchemaMigrations($pdo, $targetCols);
    }

    $sevadars = [];
    try {
        $sevStmt = $pdo->query("SELECT id, name, role, phone, photo_url, bio, display_order FROM sevadars WHERE is_active = 1 ORDER BY display_order ASC, id ASC");
        $sevadars = $sevStmt ? ($sevStmt->fetchAll() ?: []) : [];
    } catch (Throwable $e) {}

    $donors = [];
    try {
        $donStmt = $pdo->query("SELECT id, name, city_address, title, photo_url, notes, display_order FROM donors WHERE is_active = 1 ORDER BY display_order ASC, id ASC");
        $donors = $donStmt ? ($donStmt->fetchAll() ?: []) : [];
    } catch (Throwable $e) {}

    $servingNum = isset($row['current_serving_token']) ? intval($row['current_serving_token']) : $fb['current_serving_token'];
    if ($servingNum <= 0) {
        try {
            $todayDate = date('Y-m-d');
            $tStmt = $pdo->prepare("SELECT MAX(token_number) FROM tokens WHERE darbar_date = :d AND status IN ('SERVING', 'COMPLETED')");
            $tStmt->execute([':d' => $todayDate]);
            $maxServed = $tStmt->fetchColumn();
            if ($maxServed && intval($maxServed) > 0) {
                $servingNum = intval($maxServed);
            } else {
                $wStmt = $pdo->prepare("SELECT MIN(token_number) FROM tokens WHERE darbar_date = :d AND status = 'WAITING'");
                $wStmt->execute([':d' => $todayDate]);
                $minWaiting = $wStmt->fetchColumn();
                if ($minWaiting && intval($minWaiting) > 0) {
                    $servingNum = intval($minWaiting);
                } else {
                    $allStmt = $pdo->query("SELECT MAX(token_number) FROM tokens WHERE status IN ('SERVING', 'COMPLETED')");
                    $allMx = $allStmt ? $allStmt->fetchColumn() : null;
                    if ($allMx && intval($allMx) > 0) {
                        $servingNum = intval($allMx);
                    } else {
                        $firstTok = $pdo->query("SELECT MIN(token_number) FROM tokens");
                        $firstVal = $firstTok ? $firstTok->fetchColumn() : null;
                        if ($firstVal && intval($firstVal) > 0) $servingNum = intval($firstVal);
                    }
                }
            }
        } catch (Throwable $tokEx) {}
    }

    $configData = [
        "ashram_name" => !empty($row['ashram_name']) ? $row['ashram_name'] : $fb['ashram_name'],
        "latitude" => isset($row['ashram_latitude']) ? floatval($row['ashram_latitude']) : $fb['latitude'],
        "longitude" => isset($row['ashram_longitude']) ? floatval($row['ashram_longitude']) : $fb['longitude'],
        "allowed_radius_meters" => isset($row['allowed_radius_meters']) ? floatval($row['allowed_radius_meters']) : $fb['allowed_radius_meters'],
        "is_geofence_enforced" => isset($row['is_geofence_enforced']) ? boolval($row['is_geofence_enforced']) : $fb['is_geofence_enforced'],
        "is_outstation_advance_allowed" => isset($row['is_outstation_advance_allowed']) ? boolval($row['is_outstation_advance_allowed']) : $fb['is_outstation_advance_allowed'],
        "outstation_min_distance_km" => isset($row['outstation_min_distance_km']) ? floatval($row['outstation_min_distance_km']) : $fb['outstation_min_distance_km'],
        "running_token_number" => $servingNum,
        "current_serving_token" => $servingNum,
        "daily_token_limit" => isset($row['daily_token_limit']) ? intval($row['daily_token_limit']) : $fb['daily_token_limit'],
        "is_token_service_enabled" => isset($row['is_token_service_enabled']) ? boolval($row['is_token_service_enabled']) : $fb['is_token_service_enabled'],
        "token_service_mode" => !empty($row['token_service_mode']) ? $row['token_service_mode'] : $fb['token_service_mode'],
        "is_tuesday_darbar_enabled" => isset($row['is_tuesday_darbar_enabled']) ? boolval($row['is_tuesday_darbar_enabled']) : $fb['is_tuesday_darbar_enabled'],
        "tuesday_darbar_name" => !empty($row['tuesday_darbar_name']) ? $row['tuesday_darbar_name'] : $fb['tuesday_darbar_name'],
        "tuesday_darbar_address" => !empty($row['tuesday_darbar_address']) ? $row['tuesday_darbar_address'] : $fb['tuesday_darbar_address'],
        "tuesday_latitude" => isset($row['tuesday_latitude']) ? floatval($row['tuesday_latitude']) : $fb['tuesday_latitude'],
        "tuesday_longitude" => isset($row['tuesday_longitude']) ? floatval($row['tuesday_longitude']) : $fb['tuesday_longitude'],
        "tuesday_allowed_radius_meters" => isset($row['tuesday_allowed_radius_meters']) ? floatval($row['tuesday_allowed_radius_meters']) : $fb['tuesday_allowed_radius_meters'],
        "tuesday_outstation_min_distance_km" => isset($row['tuesday_outstation_min_distance_km']) ? floatval($row['tuesday_outstation_min_distance_km']) : $fb['tuesday_outstation_min_distance_km'],
        "tuesday_darbar_timings" => !empty($row['tuesday_darbar_timings']) ? $row['tuesday_darbar_timings'] : $fb['tuesday_darbar_timings'],
        "tuesday_token_service_mode" => !empty($row['tuesday_token_service_mode']) ? $row['tuesday_token_service_mode'] : $fb['tuesday_token_service_mode'],
        "tuesday_scheduled_open_timestamp" => isset($row['tuesday_scheduled_open_timestamp']) ? intval($row['tuesday_scheduled_open_timestamp']) : $fb['tuesday_scheduled_open_timestamp'],
        "tuesday_darbar_date" => !empty($row['tuesday_darbar_date']) ? $row['tuesday_darbar_date'] : $fb['tuesday_darbar_date'],
        "tuesday_current_serving_token" => isset($row['tuesday_current_serving_token']) ? intval($row['tuesday_current_serving_token']) : $fb['tuesday_current_serving_token'],
        "tuesday_running_token_number" => isset($row['tuesday_running_token_number']) ? intval($row['tuesday_running_token_number']) : (isset($row['tuesday_current_serving_token']) ? intval($row['tuesday_current_serving_token']) : $fb['tuesday_running_token_number']),
        "tuesday_token_notice" => $row['tuesday_token_notice'] ?? $fb['tuesday_token_notice'],
        "app_download_url" => !empty($row['app_download_url']) ? $row['app_download_url'] : $fb['app_download_url'],
        "app_share_url" => !empty($row['app_share_url']) ? $row['app_share_url'] : $fb['app_share_url'],
        "is_bus_booking_live" => isset($row['is_bus_booking_live']) ? boolval($row['is_bus_booking_live']) : $fb['is_bus_booking_live'],
        "is_dharamshala_live" => isset($row['is_dharamshala_live']) ? boolval($row['is_dharamshala_live']) : $fb['is_dharamshala_live'],
        "is_live_counter_visible" => isset($row['is_live_counter_visible']) ? boolval($row['is_live_counter_visible']) : $fb['is_live_counter_visible'],
        "is_payment_feature_live" => isset($row['is_payment_feature_live']) ? boolval($row['is_payment_feature_live']) : $fb['is_payment_feature_live'],
        "is_arzi_ledger_live" => isset($row['is_arzi_ledger_live']) ? boolval($row['is_arzi_ledger_live']) : $fb['is_arzi_ledger_live'],
        "badi_arzi_rate" => isset($row['badi_arzi_rate']) ? floatval($row['badi_arzi_rate']) : $fb['badi_arzi_rate'],
        "chhoti_arzi_rate" => isset($row['chhoti_arzi_rate']) ? floatval($row['chhoti_arzi_rate']) : $fb['chhoti_arzi_rate'],
        "is_darbar_active" => isset($row['is_darbar_active']) ? boolval($row['is_darbar_active']) : $fb['is_darbar_active'],
        "darbar_date" => !empty($row['darbar_date']) ? $row['darbar_date'] : $fb['darbar_date'],
        "darbar_timings" => !empty($row['darbar_timings']) ? $row['darbar_timings'] : $fb['darbar_timings'],
        "emergency_notice" => $row['emergency_notice'] ?? $fb['emergency_notice'],
        "is_emergency_notice_visible" => isset($row['is_emergency_notice_visible']) ? boolval($row['is_emergency_notice_visible']) : $fb['is_emergency_notice_visible'],
        "banner_title" => !empty($row['banner_title']) ? $row['banner_title'] : $fb['banner_title'],
        "banner_subtitle" => !empty($row['banner_subtitle']) ? $row['banner_subtitle'] : $fb['banner_subtitle'],
        "is_banner_visible" => isset($row['is_banner_visible']) ? boolval($row['is_banner_visible']) : $fb['is_banner_visible'],
        "guruji_photo_url" => $row['guruji_photo_url'] ?? $fb['guruji_photo_url'],
        "can_admin_issue_reserved_tokens" => isset($row['can_admin_issue_reserved_tokens']) ? boolval($row['can_admin_issue_reserved_tokens']) : $fb['can_admin_issue_reserved_tokens'],
        "allow_admin_reserved_tokens" => isset($row['allow_admin_reserved_tokens']) ? boolval($row['allow_admin_reserved_tokens']) : $fb['allow_admin_reserved_tokens'],
        "contact_phone" => (!empty($row['contact_phone']) && strpos($row['contact_phone'], '97206') === false && strpos($row['contact_phone'], '98765') === false) ? $row['contact_phone'] : '',
        "whatsapp_number" => (!empty($row['whatsapp_number']) && strpos($row['whatsapp_number'], '97206') === false && strpos($row['whatsapp_number'], '98765') === false) ? $row['whatsapp_number'] : '',
        "upi_id" => (!empty($row['upi_id']) && $row['upi_id'] !== 'shribalajikripadham@upi') ? $row['upi_id'] : '',
        "upi_name" => !empty($row['upi_name']) ? $row['upi_name'] : $fb['upi_name'],
        "aarti_timings" => $row['aarti_timings'] ?? '',
        "is_darbar_live_now" => isset($row['is_darbar_live_now']) ? boolval($row['is_darbar_live_now']) : $fb['is_darbar_live_now'],
        "live_stream_title" => !empty($row['live_stream_title']) ? $row['live_stream_title'] : $fb['live_stream_title'],
        "live_stream_url" => $row['live_stream_url'] ?? '',
        "youtube_live_url" => $row['youtube_live_url'] ?? '',
        "facebook_live_url" => $row['facebook_live_url'] ?? '',
        "bus_seat_fare_amount" => isset($row['bus_seat_fare_amount']) ? intval($row['bus_seat_fare_amount']) : $fb['bus_seat_fare_amount'],
        "top_bar_text" => $row['top_bar_text'] ?? $fb['top_bar_text'],
        "guruji_title" => $row['guruji_title'] ?? $fb['guruji_title'],
        "guruji_bio" => $row['guruji_bio'] ?? $fb['guruji_bio'],
        "token_rules_notice" => $row['token_rules_notice'] ?? $fb['token_rules_notice'],
        "aarti_mangala_time" => $row['aarti_mangala_time'] ?? '',
        "aarti_balbhog_time" => $row['aarti_balbhog_time'] ?? '',
        "aarti_sandhya_time" => $row['aarti_sandhya_time'] ?? '',
        "aarti_shayan_time" => $row['aarti_shayan_time'] ?? '',
        "bank_name" => $row['bank_name'] ?? $fb['bank_name'],
        "bank_account_holder" => $row['bank_account_holder'] ?? $fb['bank_account_holder'],
        "bank_account_number" => $row['bank_account_number'] ?? '',
        "bank_ifsc" => $row['bank_ifsc'] ?? '',
        "bank_branch" => $row['bank_branch'] ?? $fb['bank_branch'],
        "ashram_address" => $row['ashram_address'] ?? $fb['ashram_address'],
        "ashram_directions" => $row['ashram_directions'] ?? $fb['ashram_directions'],
        "contact_email" => (!empty($row['contact_email']) && $row['contact_email'] !== 'shribalajikripadham@gmail.com') ? $row['contact_email'] : '',
        "instagram_url" => $row['instagram_url'] ?? $fb['instagram_url'],
        "whatsapp_channel_url" => $row['whatsapp_channel_url'] ?? $fb['whatsapp_channel_url'],
        "footer_title" => $row['footer_title'] ?? $fb['footer_title'],
        "footer_dedication" => $row['footer_dedication'] ?? $fb['footer_dedication'],
        "footer_copyright" => $row['footer_copyright'] ?? $fb['footer_copyright'],
        "ashram_parichay_hindi" => $row['ashram_parichay_hindi'] ?? $fb['ashram_parichay_hindi'],
        "ashram_history_hindi" => $row['ashram_history_hindi'] ?? $fb['ashram_history_hindi'],
        "ashram_rules_hindi" => $row['ashram_rules_hindi'] ?? $fb['ashram_rules_hindi'],
        "config_version" => isset($row['config_version']) ? intval($row['config_version']) : $fb['config_version'],
        "server_time" => time(),
        "sevadars" => $sevadars,
        "donors" => $donors
    ];

    $response = array_merge([
        "success" => true,
        "status" => "SUCCESS"
    ], $configData);
    $response["config"] = $configData;

    $jsonOutput = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

    // Save to Cache
    if (!is_dir($cacheDir)) {
        @mkdir($cacheDir, 0755, true);
    }
    @file_put_contents($cacheFile, $jsonOutput, LOCK_EX);

    $etag = '"sbkd_' . $configData['config_version'] . '_' . $configData['current_serving_token'] . '"';
    header("ETag: $etag");
    echo $jsonOutput;

} catch (Throwable $fatal) {
    error_log("live_config fatal error: " . $fatal->getMessage());
    $fb = getFallbackConfig();
    $response = array_merge(["success" => true, "status" => "FALLBACK_RECOVERY_ACTIVE"], $fb);
    $response["config"] = $fb;
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
}