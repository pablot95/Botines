<?php
// upload.php — Subida de imágenes de productos al servidor Hostinger
// Llamado desde admin/admin.js al guardar/editar un producto

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

// Verificar token de autenticación
$token = $_POST['token'] ?? '';
if ($token !== UPLOAD_TOKEN) {
    http_response_code(403);
    echo json_encode(['error' => 'No autorizado']);
    exit;
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No se recibió el archivo o hubo un error']);
    exit;
}

$file = $_FILES['file'];

// Validar tipo de archivo
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedTypes)) {
    http_response_code(400);
    echo json_encode(['error' => 'Tipo de archivo no permitido: ' . $mimeType]);
    exit;
}

// Tamaño máx: 10MB
if ($file['size'] > 10 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['error' => 'El archivo supera los 10MB']);
    exit;
}

// Crear carpeta de destino si no existe
$uploadDir = __DIR__ . '/uploads/products/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Generar nombre único
$ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
if (empty($ext)) {
    $ext = 'jpg';
}
$fileName = time() . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
$destPath = $uploadDir . $fileName;

if (!move_uploaded_file($file['tmp_name'], $destPath)) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al mover el archivo al servidor']);
    exit;
}

$publicUrl = SITE_URL . '/uploads/products/' . $fileName;

echo json_encode(['url' => $publicUrl, 'file' => $fileName]);
