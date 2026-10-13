<?php
if (file_exists(__DIR__ . '/../config/db.php')) {
    require_once __DIR__ . '/../config/db.php';
} else {
    require_once __DIR__ . '/config/db.php';
}

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;

$action = trim($input['action'] ?? 'book');
$yatraDate = trim($input['yatra_date'] ?? date('Y-m-d'));
$deviceId = trim($input['device_id'] ?? ($input['held_by'] ?? ($input['passenger_phone'] ?? 'DEVOTEE')));
$seatNumber = intval($input['seat_number'] ?? 0);
$seatNumbers = $input['seat_numbers'] ?? ($seatNumber > 0 ? [$seatNumber] : []);

$pdo = getDB();
$nowMs = time() * 1000;

// Ensure hold columns exist in bus_seats table
try {
    $pdo->exec("ALTER TABLE bus_seats ADD COLUMN IF NOT EXISTS hold_expires_at BIGINT DEFAULT 0");
    $pdo->exec("ALTER TABLE bus_seats ADD COLUMN IF NOT EXISTS held_by VARCHAR(150) DEFAULT ''");
} catch (Exception $e) {}

// ACTION 1: HOLD SEAT (BookMyShow 5-Minute Atomic Lock)
if ($action === 'hold') {
    if (empty($seatNumbers)) {
        http_response_code(400);
        echo json_encode(["success" => false, "error" => "सीट नंबर प्रदान करें।"], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $holdDurationMs = 300000; // 5 minutes
    $expiresAtMs = $nowMs + $holdDurationMs;

    try {
        $pdo->beginTransaction();

        foreach ($seatNumbers as $sNum) {
            $checkStmt = $pdo->prepare("SELECT seat_status, hold_expires_at, held_by FROM bus_seats WHERE yatra_date = :yDate AND seat_number = :sNum FOR UPDATE");
            $checkStmt->execute([':yDate' => $yatraDate, ':sNum' => $sNum]);
            $existing = $checkStmt->fetch();

            if ($existing) {
                if ($existing['seat_status'] === 'BOOKED') {
                    $pdo->rollBack();
                    http_response_code(409);
                    echo json_encode(["success" => false, "error" => "सीट संख्या #$sNum पहले से आरक्षित हो चुकी है।"], JSON_UNESCAPED_UNICODE);
                    exit;
                }
                $exp = intval($existing['hold_expires_at'] ?? 0);
                $holder = trim($existing['held_by'] ?? '');
                if ($exp > $nowMs && !empty($holder) && $holder !== $deviceId) {
                    $pdo->rollBack();
                    $remSec = max(1, intval(($exp - $nowMs) / 1000));
                    http_response_code(409);
                    echo json_encode(["success" => false, "error" => "सीट संख्या #$sNum वर्तमान में अन्य भक्त द्वारा चुनी गई है (होल्ड पर - $remSec सेकंड शेष)। कृपया प्रतीक्षा करें या अन्य सीट चुनें।"], JSON_UNESCAPED_UNICODE);
                    exit;
                }
            }
        }

        // Apply hold to all seats
        $holdStmt = $pdo->prepare("INSERT INTO bus_seats (
            seat_number, yatra_date, passenger_name, passenger_phone, seat_status, payment_status, hold_expires_at, held_by, created_at
        ) VALUES (
            :seat, :yDate, 'HOLD', '', 'HELD', 'UNPAID', :holdExp, :heldBy, :nowMs
        ) ON DUPLICATE KEY UPDATE
            seat_status = 'HELD',
            hold_expires_at = VALUES(hold_expires_at),
            held_by = VALUES(held_by)");

        foreach ($seatNumbers as $sNum) {
            $holdStmt->execute([
                ':seat' => $sNum,
                ':yDate' => $yatraDate,
                ':holdExp' => $expiresAtMs,
                ':heldBy' => $deviceId,
                ':nowMs' => $nowMs
            ]);
        }

        $pdo->commit();

        echo json_encode([
            "success" => true,
            "action" => "hold",
            "yatra_date" => $yatraDate,
            "seat_numbers" => $seatNumbers,
            "held_by" => $deviceId,
            "hold_expires_at" => $expiresAtMs,
            "expires_in_seconds" => 300,
            "message" => "सीटें 5 मिनट के लिए सफलतापूर्वक आपके लिए होल्ड (लॉक) कर दी गई हैं।"
        ], JSON_UNESCAPED_UNICODE);
        exit;

    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        http_response_code(500);
        echo json_encode(["success" => false, "error" => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ACTION 2: RELEASE HOLD
if ($action === 'release_hold') {
    try {
        if (!empty($seatNumbers)) {
            $inClause = implode(',', array_map('intval', $seatNumbers));
            $pdo->exec("UPDATE bus_seats SET seat_status = 'AVAILABLE', hold_expires_at = 0, held_by = '' WHERE yatra_date = '$yatraDate' AND seat_status = 'HELD' AND (held_by = '$deviceId' OR '$deviceId' = '') AND seat_number IN ($inClause)");
        } else {
            $pdo->exec("UPDATE bus_seats SET seat_status = 'AVAILABLE', hold_expires_at = 0, held_by = '' WHERE yatra_date = '$yatraDate' AND seat_status = 'HELD' AND held_by = '$deviceId'");
        }
        echo json_encode(["success" => true, "action" => "release_hold", "message" => "होल्ड निरस्त कर सीटें पुनः उपलब्ध कर दी गईं।"], JSON_UNESCAPED_UNICODE);
        exit;
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["success" => false, "error" => $e->getMessage()], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ACTION 3: CONFIRM BOOKING (Default)
$passengerName = trim($input['passenger_name'] ?? '');
$passengerPhone = trim($input['passenger_phone'] ?? '');
$passengerGender = trim($input['passenger_gender'] ?? 'पुरुष');
$passengerAge = intval($input['passenger_age'] ?? 30);
$seatStatus = 'BOOKED';
$paymentStatus = trim($input['payment_status'] ?? 'PAID');
$fareAmount = floatval($input['fare_amount'] ?? 0.0);
$bookedBy = trim($input['booked_by'] ?? 'APP');
$createdAt = intval($input['created_at'] ?? $nowMs);

if ($seatNumber <= 0 || empty($passengerName) || empty($passengerPhone)) {
    http_response_code(400);
    echo json_encode(["success" => false, "error" => "सीट नंबर, यात्री का नाम और मोबाइल नंबर अनिवार्य हैं।"], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $pdo->beginTransaction();

    // Verify seat is not booked or held by someone else
    $checkStmt = $pdo->prepare("SELECT seat_status, hold_expires_at, held_by, passenger_name FROM bus_seats WHERE yatra_date = :yDate AND seat_number = :sNum FOR UPDATE");
    $checkStmt->execute([':yDate' => $yatraDate, ':sNum' => $seatNumber]);
    $existing = $checkStmt->fetch();

    if ($existing) {
        if ($existing['seat_status'] === 'BOOKED') {
            $pdo->rollBack();
            http_response_code(409);
            echo json_encode(["success" => false, "error" => "सीट संख्या #$seatNumber पहले से आरक्षित हो चुकी है (" . $existing['passenger_name'] . ")।"], JSON_UNESCAPED_UNICODE);
            exit;
        }
        $exp = intval($existing['hold_expires_at'] ?? 0);
        $holder = trim($existing['held_by'] ?? '');
        if ($exp > $nowMs && !empty($holder) && $holder !== $deviceId && $holder !== $passengerPhone) {
            $pdo->rollBack();
            http_response_code(409);
            echo json_encode(["success" => false, "error" => "सीट संख्या #$seatNumber वर्तमान में अन्य भक्त द्वारा होल्ड पर है। कृपया 5 मिनट प्रतीक्षा करें।"], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    $stmt = $pdo->prepare("INSERT INTO bus_seats (
        seat_number, yatra_date, passenger_name, passenger_phone, passenger_gender, passenger_age, seat_status, payment_status, fare_amount, booked_by, hold_expires_at, held_by, created_at
    ) VALUES (
        :seat, :yatra_date, :name, :phone, :gender, :age, :status, :pay_status, :fare, :booked_by, 0, '', :created_at
    ) ON DUPLICATE KEY UPDATE
        passenger_name = VALUES(passenger_name),
        passenger_phone = VALUES(passenger_phone),
        passenger_gender = VALUES(passenger_gender),
        passenger_age = VALUES(passenger_age),
        seat_status = VALUES(seat_status),
        payment_status = VALUES(payment_status),
        fare_amount = VALUES(fare_amount),
        booked_by = VALUES(booked_by),
        hold_expires_at = 0,
        held_by = ''");

    $stmt->execute([
        ':seat' => $seatNumber,
        ':yatra_date' => $yatraDate,
        ':name' => $passengerName,
        ':phone' => $passengerPhone,
        ':gender' => $passengerGender,
        ':age' => $passengerAge,
        ':status' => $seatStatus,
        ':pay_status' => $paymentStatus,
        ':fare' => $fareAmount,
        ':booked_by' => $bookedBy,
        ':created_at' => $createdAt
    ]);

    $pdo->commit();

    echo json_encode([
        "success" => true,
        "seat_number" => $seatNumber,
        "yatra_date" => $yatraDate,
        "passenger_name" => $passengerName,
        "message" => "सीट नंबर $seatNumber ($passengerName) सफलतापूर्वक बुक हो गई!"
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
