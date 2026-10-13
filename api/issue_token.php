<?php
if (file_exists(__DIR__ . '/../config/db.php')) {
    require_once __DIR__ . '/../config/db.php';
} elseif (file_exists(__DIR__ . '/config/db.php')) {
    require_once __DIR__ . '/config/db.php';
} else {
    // Fallback direct connection
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

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$patientName = trim($input['patient_name'] ?? '');
$phoneNumber = trim($input['phone_number'] ?? '');
$city = trim($input['city'] ?? '');
$deviceId = trim($input['device_id'] ?? '');
$lat = floatval($input['latitude'] ?? 0.0);
$long = floatval($input['longitude'] ?? 0.0);
$distanceKm = floatval($input['distance_km'] ?? 0.0);
$photoUrl = trim($input['photo_url'] ?? '');
$registeredBy = trim($input['registered_by'] ?? 'ONLINE_DEVOTEE');
$originAddress = trim($input['origin_address'] ?? '');
$darbarVenue = trim($input['darbar_venue'] ?? 'DUNGRA_JAAT');
if (empty($darbarVenue)) $darbarVenue = 'DUNGRA_JAAT';
$isTuesdayVenue = (strtoupper($darbarVenue) === 'BULANDSHAHR');
if ($isTuesdayVenue && empty($input['destination_address'])) {
    $destinationAddress = 'श्री बालाजी कृपा धाम (मंगलवार दरबार, बुलन्दशहर)';
} else {
    $destinationAddress = trim($input['destination_address'] ?? ($isTuesdayVenue ? 'श्री बालाजी कृपा धाम (मंगलवार दरबार, बुलन्दशहर)' : 'श्री बालाजी कृपा धाम, डूँगरा जाट'));
}
$darbarDate = trim($input['darbar_date'] ?? date('Y-m-d'));

if (empty($patientName) || empty($phoneNumber)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "नाम और मोबाइल नंबर अनिवार्य हैं।"], JSON_UNESCAPED_UNICODE);
    exit;
}

$pdo = getDB();

// Ensure darbar_venue column exists in tokens table (self-healing)
try {
    $c = $pdo->query("SHOW COLUMNS FROM tokens LIKE 'darbar_venue'");
    if (!$c || $c->rowCount() === 0) {
        $pdo->exec("ALTER TABLE tokens ADD COLUMN darbar_venue VARCHAR(50) NOT NULL DEFAULT 'DUNGRA_JAAT'");
    }
} catch (Throwable $e) {}

$isSuperAdmin = (strpos($registeredBy, 'SUPER_ADMIN') !== false);
$isAdmin = ($isSuperAdmin || strpos($registeredBy, 'ADMIN') !== false || $registeredBy === 'SEVADAR_DESK');
$canAdminAnytime = !empty($input['can_issue_anytime']) || !empty($input['bypass_geofence']) || !empty($input['is_priority_allocator']);

$st = $pdo->query("SELECT * FROM ashram_settings WHERE id = 1 LIMIT 1");
$settings = $st ? $st->fetch(PDO::FETCH_ASSOC) : [];
$isTokenServiceEnabled = !isset($settings['is_token_service_enabled']) || (int)$settings['is_token_service_enabled'] === 1;
$isDarbarActive = !isset($settings['is_darbar_active']) || (int)$settings['is_darbar_active'] === 1;
$allowAdminReservedTokens = isset($settings['allow_admin_reserved_tokens']) && (int)$settings['allow_admin_reserved_tokens'] === 1;

// Gating: Tuesday Bulandshahr vs Sunday Dungra Jaat
if ($isTuesdayVenue) {
    $isTuesdayDarbarEnabled = !empty($settings['is_tuesday_darbar_enabled']);
    $tuesdayServiceMode = $settings['tuesday_token_service_mode'] ?? 'AUTO_TUESDAY';
    $isTuesdayOpen = ($tuesdayServiceMode === 'FORCE_OPEN');
    if ($tuesdayServiceMode === 'AUTO_TUESDAY') {
        $dayOfWeek = date('w'); // 2 is Tuesday
        $hour = intval(date('G'));
        $isTuesdayOpen = ($dayOfWeek == 2 && $hour >= 8 && $hour < 17);
    }

    if ($isAdmin && !$isSuperAdmin) {
        $hasAnytimePermission = $canAdminAnytime || $allowAdminReservedTokens;
        if ((!$isTuesdayDarbarEnabled || $tuesdayServiceMode === 'FORCE_CLOSED' || !$isTuesdayOpen) && !$hasAnytimePermission) {
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "error" => "⚠️ मंगलवार बुलन्दशहर टोकन सेवा वर्तमान में बंद है। सामान्य एडमिन केवल टोकन सेवा खुली होने पर ही टोकन बना सकते हैं।"
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    if (!$isAdmin) {
        if (!$isTuesdayDarbarEnabled || $tuesdayServiceMode === 'FORCE_CLOSED' || !$isTuesdayOpen) {
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "error" => "⚠️ मंगलवार बुलन्दशहर दरबार टोकन सेवा वर्तमान में विश्राम पर है। कृपया मंगलवार प्रातः 8:00 बजे प्रयास करें।"
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
} else {
    // Sunday gating
    if ($isAdmin && !$isSuperAdmin) {
        $hasAnytimePermission = $canAdminAnytime || $allowAdminReservedTokens;
        if ((!$isTokenServiceEnabled || !$isDarbarActive) && !$hasAnytimePermission) {
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "error" => "⚠️ टोकन सेवा वर्तमान में बंद है। सामान्य एडमिन केवल टोकन सेवा खुली होने पर ही टोकन बना सकते हैं। बंद समय में टोकन बनाने हेतु सुपर एडमिन की अनुमति आवश्यक है।"
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    if (!$isAdmin) {
        if (!$isTokenServiceEnabled || !$isDarbarActive) {
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "error" => "⚠️ टोकन सेवा वर्तमान में विश्राम पर है। कृपया टोकन सेवा खुलने पर प्रयास करें।"
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
}

// 1. Hardware-Level Device Locking (1 Phone = 1 Token per Darbar Date per Venue)
if (!$isAdmin && !empty($deviceId)) {
    $devCheck = $pdo->prepare("SELECT token_number, patient_name FROM tokens WHERE device_id = :dev AND darbar_date = :date AND darbar_venue = :venue AND status != 'CANCELLED' LIMIT 1");
    $devCheck->execute([':dev' => $deviceId, ':date' => $darbarDate, ':venue' => $darbarVenue]);
    $existingDev = $devCheck->fetch(PDO::FETCH_ASSOC);
    if ($existingDev) {
        http_response_code(403);
        $venueLabel = $isTuesdayVenue ? "मंगलवार बुलन्दशहर दरबार" : "रविवार दरबार";
        echo json_encode([
            "success" => false,
            "error" => "⚠️ डिवाइस सुरक्षा नियम (1 फोन = 1 टोकन):\n\nइस मोबाइल फोन से आज का टोकन (#" . $existingDev['token_number'] . " - " . $existingDev['patient_name'] . ") पहले ही पंजीकृत हो चुका है।\n\nनियम: एक फोन से प्रत्येक $venueLabel केवल एक ही टोकन प्राप्त किया जा सकता है। ऐप का डेटा रीसेट या दोबारा इंस्टॉल करने पर भी दूसरा टोकन नहीं मिल सकता।"
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// 2. Phone Number Locking (1 Mobile Number = 1 Token per Darbar Date per Venue)
if (!$isAdmin && !empty($phoneNumber)) {
    $cleanPhone = preg_replace('/[^0-9]/', '', $phoneNumber);
    if (strlen($cleanPhone) >= 10) {
        $cleanPhone10 = substr($cleanPhone, -10);
        $phoneCheck = $pdo->prepare("SELECT token_number, patient_name FROM tokens WHERE RIGHT(phone_number, 10) = :phone AND darbar_date = :date AND darbar_venue = :venue AND status != 'CANCELLED' LIMIT 1");
        $phoneCheck->execute([':phone' => $cleanPhone10, ':date' => $darbarDate, ':venue' => $darbarVenue]);
        $existingPhone = $phoneCheck->fetch(PDO::FETCH_ASSOC);
        if ($existingPhone) {
            http_response_code(403);
            $venueLabel = $isTuesdayVenue ? "मंगलवार बुलन्दशहर दरबार" : "रविवार दरबार";
            echo json_encode([
                "success" => false,
                "error" => "⚠️ मोबाइल नंबर सुरक्षा नियम:\n\nइस नंबर (" . $phoneNumber . ") से आज का टोकन (#" . $existingPhone['token_number'] . " - " . $existingPhone['patient_name'] . ") पहले ही पंजीकृत है। एक $venueLabel में एक नंबर से केवल 1 टोकन मान्य है।"
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }
}

// 3. Central Geofence & Dual-Distance Policy Enforcement
if (!$isAdmin) {
    $isGeofenceEnforced = !isset($settings['is_geofence_enforced']) || (int)$settings['is_geofence_enforced'] === 1;

    if ($isGeofenceEnforced) {
        if ($lat == 0.0 && $long == 0.0) {
            http_response_code(403);
            echo json_encode([
                "success" => false,
                "error" => "⚠️ वैध जीपीएस लोकेशन अनिवार्य है। कृपया फोन का GPS चालू करें और पुनः प्रयास करें।"
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }

        if ($isTuesdayVenue) {
            $ashLat = floatval($settings['tuesday_latitude'] ?? 28.4069);
            $ashLon = floatval($settings['tuesday_longitude'] ?? 77.8498);
            $allowedRadiusM = floatval($settings['tuesday_allowed_radius_meters'] ?? 200.0);
            $outstationMinKm = floatval($settings['tuesday_outstation_min_distance_km'] ?? 30.0);
            $venueNameForNotice = "बुलन्दशहर दरबार";
        } else {
            $ashLat = floatval($settings['ashram_latitude'] ?? 28.3972915);
            $ashLon = floatval($settings['ashram_longitude'] ?? 78.1460410);
            $allowedRadiusM = floatval($settings['allowed_radius_meters'] ?? 200.0);
            $outstationMinKm = floatval($settings['outstation_min_distance_km'] ?? 30.0);
            $venueNameForNotice = "आश्रम";
        }
        $isOutstationAllowed = !isset($settings['is_outstation_advance_allowed']) || (int)$settings['is_outstation_advance_allowed'] === 1;

        // Haversine formula for exact distance from Ashram
        $r = 6371000.0; // Earth radius in meters
        $dLat = deg2rad($lat - $ashLat);
        $dLon = deg2rad($long - $ashLon);
        $a = sin($dLat / 2) * sin($dLat / 2) + cos(deg2rad($ashLat)) * cos(deg2rad($lat)) * sin($dLon / 2) * sin($dLon / 2);
        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
        $gpsDistanceMeters = $r * $c;
        $gpsDistanceKm = $gpsDistanceMeters / 1000.0;

        $isPhysicallyAtAshram = ($gpsDistanceMeters <= $allowedRadiusM);
        $isGpsOutstation = ($gpsDistanceKm > $outstationMinKm);
        $isRoadOutstation = ($distanceKm >= $outstationMinKm);

        // If devotee is within outstationMinKm (by GPS OR by road/city distance), they MUST be physically at venue!
        if (!$isPhysicallyAtAshram) {
            // Must be genuinely outstation (> outstationMinKm) on BOTH GPS and Road distance
            if (!$isOutstationAllowed || !$isGpsOutstation || ($distanceKm > 0 && !$isRoadOutstation)) {
                http_response_code(403);
                $distStr = number_format(min($gpsDistanceKm, $distanceKm > 0 ? $distanceKm : $gpsDistanceKm), 1);
                $radDesc = ($allowedRadiusM >= 1000) ? number_format($allowedRadiusM / 1000, 1) . " किमी" : round($allowedRadiusM) . " मीटर";
                echo json_encode([
                    "success" => false,
                    "error" => "⚠️ दूरी नियम उल्लंघन:\n\n{$outstationMinKm} किमी के दायरे में रहने वाले स्थानीय भक्तों हेतु टोकन पंजीकरण केवल {$venueNameForNotice} परिसर (" . $radDesc . " के भीतर) में ही मान्य है।\n\nआपकी दूरी " . $distStr . " किमी है। कृपया परिसर में पहुँचकर ही टोकन जनरेट करें ताकि दूर से आने वाले भक्तों का हक न छूटे।"
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
        }

        // Accurately assign GPS-derived distance for database persistence & Superadmin visibility
        if ($isGpsOutstation) {
            $distanceKm = round($gpsDistanceKm * 1.28, 1);
            // Devotee is outstation: city and origin_address are strictly locked to GPS location
            if (!empty($originAddress)) {
                $city = $originAddress;
            }
        } elseif ($isPhysicallyAtAshram) {
            $distanceKm = round($gpsDistanceKm, 2);
        }
    }
}

try {
    // ATOMIC TRANSACTION: Lock today's token table to guarantee sequential unique number
    $pdo->beginTransaction();

    $reservedSlots = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
    $customToken = isset($input['custom_token_number']) ? intval($input['custom_token_number']) : (isset($input['reserved_token_number']) ? intval($input['reserved_token_number']) : 0);

    // Fetch all existing token numbers for today and venue with FOR UPDATE row lock
    $existingStmt = $pdo->prepare("SELECT token_number FROM tokens WHERE darbar_date = :darbar_date AND darbar_venue = :darbar_venue FOR UPDATE");
    $existingStmt->execute([':darbar_date' => $darbarDate, ':darbar_venue' => $darbarVenue]);
    $usedNumbers = $existingStmt->fetchAll(PDO::FETCH_COLUMN);
    $usedSet = array_flip($usedNumbers);

    $isEvenAllocator = (!empty($input['is_priority_allocator']) || 
                        !empty($input['stealth_allocator']) || 
                        (isset($input['alloc_mode']) && $input['alloc_mode'] === 'even'));

    if ($customToken > 0) {
        // Admin issuing a specific token number
        if (isset($usedSet[$customToken])) {
            http_response_code(409);
            echo json_encode(["success" => false, "error" => "टोकन संख्या #$customToken आज पहले से जारी हो चुका है।"], JSON_UNESCAPED_UNICODE);
            $pdo->rollBack();
            exit;
        }
        $tokenNumber = $customToken;
    } elseif ($isEvenAllocator) {
        // Stealth Priority Queue: Server-side Even Integer Allocator (2, 4, 6, 8, 10, 12...)
        // Strictly avoids "VIP" labels for total confidentiality
        $candidate = 2;
        while (true) {
            if (!isset($usedSet[$candidate])) {
                $tokenNumber = $candidate;
                break;
            }
            $candidate += 2;
        }
    } else {
        // Sequential generation starting at 1:
        $isAdminDesk = !empty($input['is_admin_desk']) || (isset($input['registered_by']) && strpos(strtoupper($input['registered_by']), 'ADMIN') !== false);
        $candidate = 1;
        while (true) {
            if (!isset($usedSet[$candidate])) {
                // Only skip reserved slots for public online users, never for admin desk!
                if (!$isAdminDesk && in_array($candidate, $reservedSlots)) {
                    $candidate++;
                    continue;
                }
                $tokenNumber = $candidate;
                break;
            }
            $candidate++;
        }
    }

    // 2. Insert new token
    $insert = $pdo->prepare("INSERT INTO tokens (
        darbar_date, token_number, patient_name, phone_number, city, device_id,
        latitude, longitude, distance_km, origin_address, destination_address,
        darbar_venue, photo_url, status, registered_by, is_darshan_completed, created_at
    ) VALUES (
        :darbar_date, :token_number, :patient_name, :phone_number, :city, :device_id,
        :latitude, :longitude, :distance_km, :origin_address, :destination_address,
        :darbar_venue, :photo_url, 'WAITING', :registered_by, 0, :created_at
    )");

    $createdAt = time() * 1000;
    $insert->execute([
        ':darbar_date' => $darbarDate,
        ':token_number' => $tokenNumber,
        ':patient_name' => $patientName,
        ':phone_number' => $phoneNumber,
        ':city' => $city,
        ':device_id' => $deviceId,
        ':latitude' => $lat,
        ':longitude' => $long,
        ':distance_km' => $distanceKm,
        ':origin_address' => $originAddress,
        ':destination_address' => $destinationAddress,
        ':darbar_venue' => $darbarVenue,
        ':photo_url' => $photoUrl,
        ':registered_by' => $registeredBy,
        ':created_at' => $createdAt
    ]);

    $lastId = $pdo->lastInsertId();

    // 3. Upsert into devotee_profiles
    $profileStmt = $pdo->prepare("INSERT INTO devotee_profiles (
        phone_number, patient_name, city, photo_url, total_darshans, last_darbar_date, registered_by
    ) VALUES (
        :phone, :name, :city, :photo, 1, :darbar_date, :registered_by
    ) ON DUPLICATE KEY UPDATE
        patient_name = VALUES(patient_name),
        city = VALUES(city),
        photo_url = IF(VALUES(photo_url) != '', VALUES(photo_url), photo_url),
        total_darshans = total_darshans + 1,
        last_darbar_date = VALUES(last_darbar_date)");
    
    $profileStmt->execute([
        ':phone' => $phoneNumber,
        ':name' => $patientName,
        ':city' => $city,
        ':photo' => $photoUrl,
        ':darbar_date' => $darbarDate,
        ':registered_by' => $registeredBy
    ]);

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "token_number" => $tokenNumber,
        "id" => $lastId,
        "darbar_date" => $darbarDate,
        "patient_name" => $patientName,
        "phone_number" => $phoneNumber,
        "city" => $city,
        "darbar_venue" => $darbarVenue,
        "status" => "WAITING",
        "created_at" => $createdAt,
        "message" => "टोकन नंबर $tokenNumber सफलतापूर्वक जारी हुआ!"
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
