<?php
if (file_exists(__DIR__ . '/../config/db.php')) {
    require_once __DIR__ . '/../config/db.php';
} else {
    require_once __DIR__ . '/config/db.php';
}

header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");

$yatraDate = trim($_GET['yatra_date'] ?? date('Y-m-d'));
$pdo = getDB();
$nowMs = time() * 1000;

try {
    // Automatically release expired holds
    try {
        $pdo->exec("UPDATE bus_seats SET seat_status = 'AVAILABLE', hold_expires_at = 0, held_by = '' WHERE yatra_date = '$yatraDate' AND seat_status = 'HELD' AND hold_expires_at < $nowMs AND hold_expires_at > 0");
    } catch (Exception $e) {}

    $stmt = $pdo->prepare("SELECT * FROM bus_seats WHERE yatra_date = :yatra_date ORDER BY seat_number ASC");
    $stmt->execute([':yatra_date' => $yatraDate]);
    $rawSeats = $stmt->fetchAll();

    $seats = [];
    $totalBooked = 0;
    foreach ($rawSeats as $s) {
        $status = $s['seat_status'];
        $holdExp = intval($s['hold_expires_at'] ?? 0);
        $isHeld = ($status === 'HELD' && $holdExp > $nowMs);
        $remSec = $isHeld ? max(1, intval(($holdExp - $nowMs) / 1000)) : 0;
        $isBooked = ($status === 'BOOKED');

        if ($isBooked) $totalBooked++;

        $s['is_booked'] = $isBooked;
        $s['is_held'] = $isHeld;
        $s['remaining_hold_seconds'] = $remSec;
        $seats[] = $s;
    }

    echo json_encode([
        "success" => true,
        "yatra_date" => $yatraDate,
        "total_booked" => $totalBooked,
        "seats" => $seats
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
