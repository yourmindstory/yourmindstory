<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: text/plain');

$payload = file_get_contents('php://input');
if (!$payload) { echo 'error: no data'; exit; }

$data = json_decode($payload, true);

// ── 1. EMAIL BACKUP ──────────────────────────────────────────────────────────
$to      = 'yourmindstory.co.uk@gmail.com';
$subject = 'New Quiz Response — ' . ($data['bucket'] ?? 'Unknown') . ' — ' . ($data['name'] ?? 'Anonymous');
$body    = "New quiz submission:\n\n";
foreach ($data as $k => $v) {
    $body .= strtoupper($k) . ": " . $v . "\n";
}
$headers = 'From: quiz@yourmindstory.co.uk' . "\r\n" .
           'Reply-To: ' . ($data['email'] ?? 'noreply@yourmindstory.co.uk') . "\r\n";
@mail($to, $subject, $body, $headers);

// ── 2. GOOGLE APPS SCRIPT ────────────────────────────────────────────────────
$url = 'https://script.google.com/macros/s/AKfycbyhP9iqlmz8nFkI1UvZVQjE4fRaiR8oh7wDd40bQNL6KqOXqfJERRS89j4XA-MkZ-Hj/exec'

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => ['Content-Type: text/plain'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_POSTREDIR      => 7,
        CURLOPT_TIMEOUT        => 15,
    ]);
    curl_exec($ch);
    curl_close($ch);
}

echo 'ok';
