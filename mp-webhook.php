<?php
// mp-webhook.php — Recibe notificaciones de MercadoPago
// Reemplaza /api/mp-webhook.js (Vercel)
// En MercadoPago Dashboard configurar: https://botinesfv.com/mp-webhook.php

require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(200);
    echo json_encode(['ok' => true]);
    exit;
}

$body = json_decode(file_get_contents('php://input'), true);
$type   = $body['type']   ?? '';
$dataId = $body['data']['id'] ?? '';

if ($type !== 'payment' || empty($dataId)) {
    http_response_code(200);
    echo json_encode(['ok' => true]);
    exit;
}

// Consultar el pago a MP
$ch = curl_init('https://api.mercadopago.com/v1/payments/' . urlencode($dataId));
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . MP_ACCESS_TOKEN],
    CURLOPT_TIMEOUT        => 10,
]);
$resp     = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200) {
    http_response_code(200); // Siempre 200 a MP para evitar reintentos
    echo json_encode(['ok' => false, 'error' => 'No pudo consultar pago']);
    exit;
}

$payment  = json_decode($resp, true);
$status   = $payment['status']             ?? '';
$extRef   = $payment['external_reference'] ?? '';

// Loguear (opcional — el log queda en el servidor de Hostinger)
$logLine = date('Y-m-d H:i:s') . " | payment_id={$dataId} status={$status} order={$extRef}\n";
file_put_contents(__DIR__ . '/mp-webhook.log', $logLine, FILE_APPEND | LOCK_EX);

// Aquí podrías actualizar Firebase Firestore via su REST API si lo necesitás
// Por ahora solo logueamos; el frontend ya maneja el estado al volver de MP.

http_response_code(200);
echo json_encode(['ok' => true, 'status' => $status]);
