<?php
// migrate.php — Descarga imágenes de Firebase Storage y las guarda en Hostinger
// SOLO para uso durante la migración. Acceso bloqueado por .htaccess en producción.
// Para ejecutar: temporalmente cambiar .htaccess o correr por SSH/CLI.

require_once __DIR__ . '/config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$body  = json_decode(file_get_contents('php://input'), true);
$token = $body['token'] ?? '';

if ($token !== UPLOAD_TOKEN) {
    http_response_code(403);
    echo json_encode(['error' => 'No autorizado']);
    exit;
}

$imageUrl = $body['url'] ?? '';
if (empty($imageUrl)) {
    http_response_code(400);
    echo json_encode(['error' => 'Falta url']);
    exit;
}

// Descargar la imagen remota
$ch = curl_init($imageUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT        => 20,
    CURLOPT_USERAGENT      => 'BotinesFV-Migration/1.0',
]);
$imageData = curl_exec($ch);
$httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$mimeType  = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

if (!$imageData || $httpCode !== 200) {
    http_response_code(500);
    echo json_encode(['error' => "No se pudo descargar: HTTP $httpCode"]);
    exit;
}

// Determinar extensión
$ext = 'jpg';
if (strpos($mimeType, 'png')  !== false) $ext = 'png';
if (strpos($mimeType, 'webp') !== false) $ext = 'webp';
if (strpos($mimeType, 'gif')  !== false) $ext = 'gif';

$uploadDir = __DIR__ . '/uploads/products/';
if (!is_dir($uploadDir)) { mkdir($uploadDir, 0755, true); }

$fileName = 'migrated_' . time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
$destPath = $uploadDir . $fileName;

if (file_put_contents($destPath, $imageData) === false) {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo guardar el archivo']);
    exit;
}

echo json_encode([
    'ok'       => true,
    'newUrl'   => SITE_URL . '/uploads/products/' . $fileName,
    'fileName' => $fileName,
    'original' => $imageUrl,
]);
