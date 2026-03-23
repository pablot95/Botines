<?php
// create-preference.php — Crea preferencia de pago en MercadoPago
// Reemplaza /api/create-preference.js (Vercel)

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
if (!$body) {
    http_response_code(400);
    echo json_encode(['error' => 'JSON inválido']);
    exit;
}

$items        = $body['items']        ?? [];
$payer        = $body['payer']        ?? [];
$shipmentCost = $body['shipment_cost'] ?? 0;
$orderId      = $body['order_id']      ?? '';
$backUrl      = $body['back_url']      ?? SITE_URL;

if (empty($items)) {
    http_response_code(400);
    echo json_encode(['error' => 'No hay items en el pedido']);
    exit;
}

// Validar precios reales desde Firestore para evitar manipulación desde el cliente
$productIds = array_filter(array_unique(array_map(function($i) {
    return $i['id'] ?? '';
}, $items)));

$realPrices = [];
if (!empty($productIds)) {
    $docPaths = array_map(function($id) {
        $safeId = preg_replace('/[^a-zA-Z0-9_-]/', '', $id);
        return 'projects/botinesfv-79c52/databases/(default)/documents/products/' . $safeId;
    }, array_values($productIds));

    $batchUrl = 'https://firestore.googleapis.com/v1/projects/botinesfv-79c52/databases/(default)/documents:batchGet';
    $batchBody = json_encode(['documents' => $docPaths]);

    $bch = curl_init($batchUrl);
    curl_setopt_array($bch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $batchBody,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT        => 10,
    ]);
    $batchResp = curl_exec($bch);
    $batchCode = curl_getinfo($bch, CURLINFO_HTTP_CODE);
    curl_close($bch);

    if ($batchCode === 200 && $batchResp) {
        $batchData = json_decode($batchResp, true);
        if (is_array($batchData)) {
            foreach ($batchData as $entry) {
                if (isset($entry['found']['fields']['price'])) {
                    $docName = $entry['found']['name'] ?? '';
                    $docId = basename($docName);
                    $priceField = $entry['found']['fields']['price'];
                    $price = $priceField['integerValue'] ?? $priceField['doubleValue'] ?? null;
                    if ($price !== null) {
                        $realPrices[$docId] = (float)$price;
                    }
                }
            }
        }
    }
}

// Construir items para MP usando precios validados del servidor
$mpItems = [];
foreach ($items as $item) {
    $itemId = $item['id'] ?? '';
    $price = (float)($item['price'] ?? 0);
    // Usar precio real de Firestore si está disponible
    if (isset($realPrices[$itemId])) {
        $price = $realPrices[$itemId];
    }
    $mpItems[] = [
        'title'      => substr((string)($item['name'] ?? 'Producto'), 0, 256),
        'quantity'   => (int)($item['qty'] ?? 1),
        'unit_price' => $price,
        'currency_id' => 'ARS'
    ];
}

// Envío como ítem extra
if ($shipmentCost > 0) {
    $mpItems[] = [
        'title'      => 'Envío',
        'quantity'   => 1,
        'unit_price' => (float)$shipmentCost,
        'currency_id' => 'ARS'
    ];
}

$preference = [
    'items' => $mpItems,
    'back_urls' => [
        'success' => $backUrl . '/checkout.html?payment=success&order=' . urlencode($orderId),
        'failure' => $backUrl . '/checkout.html?payment=failure&order=' . urlencode($orderId),
        'pending' => $backUrl . '/checkout.html?payment=pending&order=' . urlencode($orderId),
    ],
    'auto_return' => 'approved',
    'external_reference' => (string)$orderId,
];

// Agregar payer sólo si tiene email válido
if (!empty($payer['email']) && strpos($payer['email'], '@') !== false) {
    $preference['payer'] = ['email' => $payer['email']];
}

// Llamar a la API de MercadoPago
$ch = curl_init('https://api.mercadopago.com/checkout/preferences');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($preference),
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . MP_ACCESS_TOKEN,
    ],
    CURLOPT_TIMEOUT        => 15,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(500);
    echo json_encode(['error' => 'Error de red: ' . $curlError]);
    exit;
}

$result = json_decode($response, true);

if ($httpCode < 200 || $httpCode >= 300) {
    http_response_code(500);
    echo json_encode(['error' => 'Error MP API ' . $httpCode, 'detail' => $result]);
    exit;
}

echo json_encode([
    'id'                 => $result['id']                  ?? null,
    'init_point'         => $result['init_point']          ?? null,
    'sandbox_init_point' => $result['sandbox_init_point']  ?? null,
]);
