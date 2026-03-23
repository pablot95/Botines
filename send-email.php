<?php
// send-email.php — Envía emails de notificación de pedidos vía EmailJS desde el servidor
// Esto evita exponer las credenciales de EmailJS en el frontend

require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body || empty($body['order_number'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Datos de email inválidos']);
    exit;
}

// Rate limiting simple por IP (máx 5 emails por minuto)
$rateLimitFile = sys_get_temp_dir() . '/botinesfv_email_' . md5($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$now = time();
$attempts = [];
if (file_exists($rateLimitFile)) {
    $attempts = json_decode(file_get_contents($rateLimitFile), true) ?: [];
    $attempts = array_filter($attempts, fn($t) => ($now - $t) < 60);
}
if (count($attempts) >= 5) {
    http_response_code(429);
    echo json_encode(['error' => 'Demasiadas solicitudes. Intentá en un minuto.']);
    exit;
}
$attempts[] = $now;
file_put_contents($rateLimitFile, json_encode($attempts));

// Enviar vía EmailJS REST API
$emailData = [
    'service_id'  => EMAILJS_SERVICE,
    'template_id' => EMAILJS_TEMPLATE,
    'user_id'     => EMAILJS_PUBLIC_KEY,
    'template_params' => $body,
];

$ch = curl_init('https://api.emailjs.com/api/v1.0/email/send');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($emailData),
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT        => 10,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode >= 200 && $httpCode < 300) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(502);
    echo json_encode(['error' => 'Error al enviar email', 'detail' => $response]);
}
