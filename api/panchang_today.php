<?php
// Central Vedic Panchang & Choghadiya Endpoint
// Shri Balaji Kripa Dham, Dungra Jat
header('Content-Type: application/json; charset=utf-8');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

date_default_timezone_set('Asia/Kolkata');

$dayNames = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"];
$w = intval(date('w'));
$dayName = $dayNames[$w];

$year = intval(date('Y'));
$vikramSamvat = $year + 57;
$shakSamvat = $year - 78;

// Local astronomical sunrise/sunset for Dungra Jat, Alwar (27.82 N, 76.62 E)
$zenith = 90.8333; // Civil twilight / standard refraction
$sunriseTimestamp = date_sunrise(time(), SUNFUNCS_RET_TIMESTAMP, 27.82, 76.62, $zenith, 5.5);
$sunsetTimestamp = date_sunset(time(), SUNFUNCS_RET_TIMESTAMP, 27.82, 76.62, $zenith, 5.5);

$sunriseStr = date("h:i A", $sunriseTimestamp);
$sunsetStr = date("h:i A", $sunsetTimestamp);

// Rahu Kaal calculation (8 parts of daytime)
$dayDuration = $sunsetTimestamp - $sunriseTimestamp;
$part = $dayDuration / 8;
$rahuSlots = [7, 1, 6, 4, 5, 3, 2]; // Sun to Sat
$rahuStart = $sunriseTimestamp + ($rahuSlots[$w] * $part);
$rahuEnd = $rahuStart + $part;
$rahuKaalStr = date("h:i A", $rahuStart) . " से " . date("h:i A", $rahuEnd);

// Abhijit Muhurat (midday +- 24 min)
$noon = $sunriseTimestamp + ($dayDuration / 2);
$abhijitStr = date("h:i A", $noon - 1440) . " से " . date("h:i A", $noon + 1440);

echo json_encode([
    "success" => true,
    "date" => date("d-m-Y"),
    "day_hindi" => $dayName,
    "vikram_samvat" => $vikramSamvat,
    "shak_samvat" => $shakSamvat,
    "sunrise" => $sunriseStr,
    "sunset" => $sunsetStr,
    "rahu_kaal" => $rahuKaalStr,
    "abhijit_muhurat" => $abhijitStr,
    "temple" => "श्री बालाजी कृपा धाम (डूँगरा जाट)",
    "timestamp" => time()
], JSON_UNESCAPED_UNICODE);
