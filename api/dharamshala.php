<?php
// ==============================================================================
// श्री बालाजी कृपा धाम (ग्राम डूँगरा जाट) - धर्मशाला व कमरा आरक्षण प्रणाली
// Ashram Dharamshala & Room Management REST API
// ==============================================================================

if (file_exists(__DIR__ . '/../config/db.php')) {
    require_once __DIR__ . '/../config/db.php';
} else {
    require_once __DIR__ . '/config/db.php';
}

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-SBKD-API-KEY, x-sbkd-api-key");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$pdo = getDB();

try {
    // 1. Ensure Dharamshala tables exist
    $pdo->exec("CREATE TABLE IF NOT EXISTS dharamshala_rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_number VARCHAR(20) NOT NULL UNIQUE,
        room_type VARCHAR(50) NOT NULL DEFAULT 'NON_AC', -- AC, NON_AC, HALL_BED
        title_hindi VARCHAR(100) NOT NULL,
        floor VARCHAR(20) DEFAULT 'Ground',
        capacity INT DEFAULT 4,
        daily_seva_rate DECIMAL(10,2) DEFAULT 250.00,
        status VARCHAR(30) DEFAULT 'AVAILABLE', -- AVAILABLE, OCCUPIED, MAINTENANCE
        notes TEXT,
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    $pdo->exec("CREATE TABLE IF NOT EXISTS dharamshala_bookings (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        booking_ref VARCHAR(50) NOT NULL UNIQUE,
        devotee_name VARCHAR(150) NOT NULL,
        phone_number VARCHAR(30) NOT NULL,
        room_id INT NOT NULL,
        room_number VARCHAR(20) NOT NULL,
        devotee_count INT DEFAULT 1,
        checkin_date VARCHAR(20) NOT NULL,
        checkout_date VARCHAR(20) NOT NULL,
        total_days INT DEFAULT 1,
        daily_rate DECIMAL(10,2) DEFAULT 0.00,
        total_amount DECIMAL(10,2) DEFAULT 0.00,
        is_paid TINYINT DEFAULT 0,
        payment_mode VARCHAR(30) DEFAULT 'CASH', -- CASH, UPI_QR
        utr_ref VARCHAR(100) DEFAULT '',
        status VARCHAR(30) DEFAULT 'CONFIRMED', -- CONFIRMED, CHECKED_IN, CHECKED_OUT, CANCELLED
        allocated_by VARCHAR(100) DEFAULT 'SEVADAR',
        created_at BIGINT NOT NULL,
        INDEX idx_phone (phone_number),
        INDEX idx_status (status),
        INDEX idx_dates (checkin_date, checkout_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    // Strict Zero-Dummy Policy: Absolutely no auto-seeding of rooms.
    // Rooms are strictly managed by SuperAdmin.

    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true) ?: $_POST;
    $action = strtolower(trim($_GET['action'] ?? $input['action'] ?? 'list_rooms'));

    switch ($action) {
        case 'list_rooms':
            $stmt = $pdo->query("SELECT * FROM dharamshala_rooms ORDER BY id ASC");
            $rooms = $stmt ? $stmt->fetchAll(PDO::FETCH_ASSOC) : [];
            echo json_encode([
                "success" => true,
                "rooms" => $rooms,
                "total" => count($rooms)
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'list_bookings':
            $stmt = $pdo->query("SELECT * FROM dharamshala_bookings ORDER BY id DESC LIMIT 200");
            $bookings = $stmt->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode([
                "success" => true,
                "bookings" => $bookings,
                "total" => count($bookings)
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'book_room':
            // Check if Dharamshala service is enabled in settings
            $isDhLive = 0;
            try {
                $stLive = $pdo->query("SELECT is_dharamshala_live FROM ashram_settings WHERE id = 1 LIMIT 1");
                if ($stLive) $isDhLive = intval($stLive->fetchColumn());
            } catch (Throwable $e) {}

            if ($isDhLive !== 1) {
                http_response_code(403);
                echo json_encode(["success" => false, "error" => "आश्रम व्यवस्था अनुसार धर्मशाला व कमरा आरक्षण सेवा अभी बंद है।"], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $devoteeName = trim($input['devotee_name'] ?? '');
            $phone = trim($input['phone_number'] ?? '');
            $roomId = intval($input['room_id'] ?? 0);
            $devoteeCount = max(1, intval($input['devotee_count'] ?? 1));
            $checkinDate = trim($input['checkin_date'] ?? date('Y-m-d'));
            $checkoutDate = trim($input['checkout_date'] ?? date('Y-m-d', strtotime('+1 day')));
            $totalDays = max(1, intval($input['total_days'] ?? 1));
            $isPaid = intval($input['is_paid'] ?? 0);
            $paymentMode = trim($input['payment_mode'] ?? 'CASH');
            $utrRef = trim($input['utr_ref'] ?? '');
            $allocatedBy = trim($input['allocated_by'] ?? 'SEVADAR');

            if (empty($devoteeName) || empty($phone)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "भक्त का नाम और फोन नंबर अनिवार्य हैं।"], JSON_UNESCAPED_UNICODE);
                exit;
            }

            // Fetch room
            $rStmt = $pdo->prepare("SELECT * FROM dharamshala_rooms WHERE id = :id LIMIT 1");
            $rStmt->execute([':id' => $roomId]);
            $room = $rStmt->fetch(PDO::FETCH_ASSOC);
            if (!$room) {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "चयनित कमरा नहीं मिला।"], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $dailyRate = floatval($room['daily_seva_rate']);
            $totalAmount = $dailyRate * $totalDays;
            $bookingRef = 'SBKD-DH-' . date('ymd') . '-' . rand(100, 999);
            $now = round(microtime(true) * 1000);

            $insB = $pdo->prepare("INSERT INTO dharamshala_bookings (
                booking_ref, devotee_name, phone_number, room_id, room_number, devotee_count,
                checkin_date, checkout_date, total_days, daily_rate, total_amount, is_paid,
                payment_mode, utr_ref, status, allocated_by, created_at
            ) VALUES (
                :ref, :name, :phone, :rid, :rnum, :count,
                :cin, :cout, :days, :rate, :total, :is_paid,
                :pmode, :utr, 'CONFIRMED', :alloc, :created
            )");

            $insB->execute([
                ':ref' => $bookingRef,
                ':name' => $devoteeName,
                ':phone' => $phone,
                ':rid' => $room['id'],
                ':rnum' => $room['room_number'],
                ':count' => $devoteeCount,
                ':cin' => $checkinDate,
                ':cout' => $checkoutDate,
                ':days' => $totalDays,
                ':rate' => $dailyRate,
                ':total' => $totalAmount,
                ':is_paid' => $isPaid,
                ':pmode' => $paymentMode,
                ':utr' => $utrRef,
                ':alloc' => $allocatedBy,
                ':created' => $now
            ]);

            // Update room status to OCCUPIED
            $pdo->prepare("UPDATE dharamshala_rooms SET status = 'OCCUPIED' WHERE id = :id")->execute([':id' => $room['id']]);

            // Also mirror into payment_records if paid
            if ($isPaid == 1 && $totalAmount > 0) {
                try {
                    $pStmt = $pdo->prepare("INSERT INTO payment_records (payer_name, phone_number, amount, purpose, payment_mode, transaction_id, status, timestamp)
                        VALUES (:name, :phone, :amount, 'DHARAMSHALA', :pmode, :utr, 'PAID', :ts)");
                    $pStmt->execute([
                        ':name' => $devoteeName,
                        ':phone' => $phone,
                        ':amount' => $totalAmount,
                        ':pmode' => $paymentMode,
                        ':utr' => $utrRef ?: $bookingRef,
                        ':ts' => $now
                    ]);
                } catch (Exception $pe) {}
            }

            echo json_encode([
                "success" => true,
                "booking_ref" => $bookingRef,
                "room_number" => $room['room_number'],
                "total_amount" => $totalAmount,
                "message" => "कमरा #{$room['room_number']} सफलतापूर्वक आरक्षित हुआ!"
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'check_out':
            $bookingId = intval($input['booking_id'] ?? 0);
            $bStmt = $pdo->prepare("SELECT * FROM dharamshala_bookings WHERE id = :id LIMIT 1");
            $bStmt->execute([':id' => $bookingId]);
            $b = $bStmt->fetch(PDO::FETCH_ASSOC);
            if ($b) {
                $pdo->prepare("UPDATE dharamshala_bookings SET status = 'CHECKED_OUT' WHERE id = :id")->execute([':id' => $bookingId]);
                $pdo->prepare("UPDATE dharamshala_rooms SET status = 'AVAILABLE' WHERE id = :id")->execute([':id' => $b['room_id']]);
                echo json_encode(["success" => true, "message" => "चेक-आउट सफल हुआ। कमरा पुनः उपलब्ध है।"], JSON_UNESCAPED_UNICODE);
            } else {
                http_response_code(404);
                echo json_encode(["success" => false, "error" => "बुकिंग नहीं मिली।"], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'update_room_status':
            if (function_exists('verifyApiAuth')) verifyApiAuth();
            $roomId = intval($input['room_id'] ?? 0);
            $status = strtoupper(trim($input['status'] ?? 'AVAILABLE'));
            $pdo->prepare("UPDATE dharamshala_rooms SET status = :st WHERE id = :id")->execute([':st' => $status, ':id' => $roomId]);
            echo json_encode(["success" => true, "message" => "कमरे की स्थिति अपडेट हुई!"], JSON_UNESCAPED_UNICODE);
            break;

        case 'add_room':
            if (function_exists('verifyApiAuth')) verifyApiAuth();
            $roomNum = trim($input['room_number'] ?? '');
            $roomType = trim($input['room_type'] ?? 'NON_AC');
            $titleHindi = trim($input['title_hindi'] ?? "कमरा $roomNum");
            $floor = trim($input['floor'] ?? 'Ground');
            $capacity = max(1, intval($input['capacity'] ?? 4));
            $dailyRate = floatval($input['daily_seva_rate'] ?? 250.0);
            $status = strtoupper(trim($input['status'] ?? 'AVAILABLE'));
            $notes = trim($input['notes'] ?? '');

            if (empty($roomNum)) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "कमरा नंबर अनिवार्य है।"], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $stmt = $pdo->prepare("INSERT INTO dharamshala_rooms (room_number, room_type, title_hindi, floor, capacity, daily_seva_rate, status, notes)
                VALUES (:rnum, :rtype, :title, :floor, :cap, :rate, :st, :notes)
                ON DUPLICATE KEY UPDATE room_type = VALUES(room_type), title_hindi = VALUES(title_hindi), floor = VALUES(floor), capacity = VALUES(capacity), daily_seva_rate = VALUES(daily_seva_rate), status = VALUES(status), notes = VALUES(notes)");
            $stmt->execute([
                ':rnum' => $roomNum,
                ':rtype' => $roomType,
                ':title' => $titleHindi,
                ':floor' => $floor,
                ':cap' => $capacity,
                ':rate' => $dailyRate,
                ':st' => $status,
                ':notes' => $notes
            ]);
            echo json_encode(["success" => true, "message" => "कमरा #$roomNum सफलतापूर्वक जोड़ा/अपडेट किया गया!"], JSON_UNESCAPED_UNICODE);
            break;

        case 'edit_room':
            if (function_exists('verifyApiAuth')) verifyApiAuth();
            $roomId = intval($input['id'] ?? 0);
            $roomNum = trim($input['room_number'] ?? '');
            $roomType = trim($input['room_type'] ?? 'NON_AC');
            $titleHindi = trim($input['title_hindi'] ?? "कमरा $roomNum");
            $floor = trim($input['floor'] ?? 'Ground');
            $capacity = max(1, intval($input['capacity'] ?? 4));
            $dailyRate = floatval($input['daily_seva_rate'] ?? 250.0);
            $status = strtoupper(trim($input['status'] ?? 'AVAILABLE'));
            $notes = trim($input['notes'] ?? '');

            if ($roomId <= 0) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "मान्य कमरा ID अनिवार्य है।"], JSON_UNESCAPED_UNICODE);
                exit;
            }

            $stmt = $pdo->prepare("UPDATE dharamshala_rooms SET room_number = :rnum, room_type = :rtype, title_hindi = :title, floor = :floor, capacity = :cap, daily_seva_rate = :rate, status = :st, notes = :notes WHERE id = :id");
            $stmt->execute([
                ':rnum' => $roomNum,
                ':rtype' => $roomType,
                ':title' => $titleHindi,
                ':floor' => $floor,
                ':cap' => $capacity,
                ':rate' => $dailyRate,
                ':st' => $status,
                ':notes' => $notes,
                ':id' => $roomId
            ]);
            echo json_encode(["success" => true, "message" => "कमरा विवरण सफलतापूर्वक अपडेट हुआ!"], JSON_UNESCAPED_UNICODE);
            break;

        case 'delete_room':
            if (function_exists('verifyApiAuth')) verifyApiAuth();
            $roomId = intval($input['id'] ?? 0);
            if ($roomId <= 0) {
                http_response_code(400);
                echo json_encode(["success" => false, "error" => "मान्य कमरा ID अनिवार्य है।"], JSON_UNESCAPED_UNICODE);
                exit;
            }
            $pdo->prepare("DELETE FROM dharamshala_rooms WHERE id = :id")->execute([':id' => $roomId]);
            echo json_encode(["success" => true, "message" => "कमरा हटा दिया गया!"], JSON_UNESCAPED_UNICODE);
            break;

        case 'clear_all_rooms':
            if (function_exists('verifyApiAuth')) verifyApiAuth();
            $pdo->exec("TRUNCATE TABLE dharamshala_rooms");
            $pdo->exec("TRUNCATE TABLE dharamshala_bookings");
            echo json_encode(["success" => true, "message" => "सभी कमरे व बुकिंग रिकॉर्ड पूरी तरह से साफ कर दिए गए हैं (0 Rooms)!"], JSON_UNESCAPED_UNICODE);
            break;

        default:
            http_response_code(400);
            echo json_encode(["success" => false, "error" => "अमान्य क्रिया (Invalid Action)"], JSON_UNESCAPED_UNICODE);
            break;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
