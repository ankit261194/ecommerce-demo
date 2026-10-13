<?php
// ==============================================================================
// श्री बालाजी कृपा धाम (ग्राम डूँगरा जाट) - आधिकारिक हाई-स्पीड APK डाउनलोड सेवा
// High-Speed Direct Ashram Server APK Delivery Engine (v2.56.6 Build 81)
// ==============================================================================

$targetFile = __DIR__ . '/downloads/ShriBalajiKripaDham-release.apk';
if (!file_exists($targetFile) || filesize($targetFile) < 10000000) {
    // Also check version specific APK
    $files = glob(__DIR__ . '/downloads/ShriBalajiKripaDham-*.apk');
    if (!empty($files)) {
        rsort($files);
        $targetFile = $files[0];
    }
}

// 1. Direct High-Speed Download Delivery if file exists on server
if (file_exists($targetFile) && filesize($targetFile) > 10000000) {
    $filesize = filesize($targetFile);
    $filename = "ShriBalajiKripaDham-release.apk";

    // Clean any prior output buffering to avoid memory limits and enable max speed
    while (ob_get_level()) {
        ob_end_clean();
    }

    header("Content-Type: application/vnd.android.package-archive");
    header("Content-Disposition: attachment; filename=\"{$filename}\"");
    header("Accept-Ranges: bytes");
    header("Cache-Control: public, max-age=3600");
    header("Pragma: public");

    if (isset($_SERVER['HTTP_RANGE'])) {
        list($param, $range) = explode('=', $_SERVER['HTTP_RANGE']);
        if (strtolower(trim($param)) === 'bytes') {
            list($from, $to) = explode('-', $range);
            $from = trim($from) === '' ? 0 : intval($from);
            $to = trim($to) === '' ? $filesize - 1 : intval($to);
            if ($to >= $filesize) $to = $filesize - 1;

            header('HTTP/1.1 206 Partial Content');
            header("Content-Range: bytes {$from}-{$to}/{$filesize}");
            header('Content-Length: ' . ($to - $from + 1));

            $fp = fopen($targetFile, 'rb');
            fseek($fp, $from);
            $remaining = $to - $from + 1;
            while (!feof($fp) && $remaining > 0) {
                $read = min(262144, $remaining);
                echo fread($fp, $read);
                $remaining -= $read;
                flush();
            }
            fclose($fp);
            exit;
        }
    }

    header("Content-Length: {$filesize}");
    readfile($targetFile);
    exit;
}

// 2. Fallback to external CDN or GitHub if local file is missing
$cdnUrl = "https://github.com/ankit261194/shri-balaji-kripa-dham/releases/latest/download/ShriBalajiKripaDham-release.apk";
if (file_exists(__DIR__ . '/version.json')) {
    $vj = @json_decode(file_get_contents(__DIR__ . '/version.json'), true);
    if (!empty($vj['apk_url'])) {
        $cdnUrl = $vj['apk_url'];
    }
}
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: Mon, 26 Jul 1997 05:00:00 GMT");
header("Location: " . $cdnUrl, true, 302);
exit;
