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

// Loguear
$logLine = date('Y-m-d H:i:s') . " | payment_id={$dataId} status={$status} order={$extRef}\n";
file_put_contents(__DIR__ . '/mp-webhook.log', $logLine, FILE_APPEND | LOCK_EX);

// Actualizar estado de la orden en Firebase Firestore vía REST API
if (!empty($extRef) && preg_match('/^[a-zA-Z0-9]{10,30}$/', $extRef)) {
    $firestoreStatus = 'pending';
    if ($status === 'approved') $firestoreStatus = 'paid';
    elseif ($status === 'pending' || $status === 'in_process') $firestoreStatus = 'payment_pending';
    elseif ($status === 'rejected' || $status === 'cancelled') $firestoreStatus = 'payment_failed';

    $firestoreUrl = 'https://firestore.googleapis.com/v1/projects/botinesfv-79c52/databases/(default)/documents/orders/' . urlencode($extRef) . '?updateMask.fieldPaths=status&updateMask.fieldPaths=paidAt&updateMask.fieldPaths=paymentGateway&updateMask.fieldPaths=paymentId';
    
    $firestoreData = [
        'fields' => [
            'status' => ['stringValue' => $firestoreStatus],
            'paymentGateway' => ['stringValue' => 'mercadopago'],
            'paymentId' => ['stringValue' => (string)$dataId],
            'paidAt' => ['timestampValue' => date('c')],
        ]
    ];

    $fch = curl_init($firestoreUrl);
    curl_setopt_array($fch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => 'PATCH',
        CURLOPT_POSTFIELDS     => json_encode($firestoreData),
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT        => 10,
    ]);
    $fResp = curl_exec($fch);
    $fCode = curl_getinfo($fch, CURLINFO_HTTP_CODE);
    curl_close($fch);

    $logLine2 = date('Y-m-d H:i:s') . " | FIRESTORE_UPDATE order={$extRef} status={$firestoreStatus} http={$fCode}\n";
    file_put_contents(__DIR__ . '/mp-webhook.log', $logLine2, FILE_APPEND | LOCK_EX);
}

http_response_code(200);
echo json_encode(['ok' => true, 'status' => $status]);
