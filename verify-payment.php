<?php
// verify-payment.php — Verifica el estado de un pago con MercadoPago
// El frontend llama aquí al volver de MP, en vez de confiar en los query params de la URL

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
$orderId = $body['order_id'] ?? '';

if (empty($orderId) || !preg_match('/^[a-zA-Z0-9]{10,30}$/', $orderId)) {
    http_response_code(400);
    echo json_encode(['error' => 'order_id inválido']);
    exit;
}

// Buscar pagos por external_reference (el order_id de Firestore)
$searchUrl = 'https://api.mercadopago.com/v1/payments/search?external_reference=' . urlencode($orderId) . '&sort=date_created&criteria=desc&limit=1';

$ch = curl_init($searchUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => ['Authorization: Bearer ' . MP_ACCESS_TOKEN],
    CURLOPT_TIMEOUT        => 10,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200 || !$response) {
    http_response_code(502);
    echo json_encode(['error' => 'No se pudo consultar MercadoPago', 'status' => 'unknown']);
    exit;
}

$data = json_decode($response, true);
$results = $data['results'] ?? [];

if (empty($results)) {
    echo json_encode(['status' => 'not_found', 'order_id' => $orderId]);
    exit;
}

$payment = $results[0];
$status = $payment['status'] ?? 'unknown';

// Loguear verificación
$logLine = date('Y-m-d H:i:s') . " | VERIFY order={$orderId} payment_id={$payment['id']} status={$status}\n";
file_put_contents(__DIR__ . '/mp-webhook.log', $logLine, FILE_APPEND | LOCK_EX);

echo json_encode([
    'status'     => $status,
    'order_id'   => $orderId,
    'payment_id' => $payment['id'] ?? null,
    'amount'     => $payment['transaction_amount'] ?? null,
]);
