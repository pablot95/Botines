<?php
// admin-login.php — Autenticación server-side para el panel de administración
// Establece una sesión PHP para autorizar operaciones como upload de imágenes

session_start();
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

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
$user = $body['user'] ?? '';
$pass = $body['password'] ?? '';

if (empty($user) || empty($pass)) {
    http_response_code(400);
    echo json_encode(['error' => 'Faltan credenciales']);
    exit;
}

// Rate limiting: máx 10 intentos por IP por minuto
$rateLimitFile = sys_get_temp_dir() . '/botinesfv_login_' . md5($_SERVER['REMOTE_ADDR'] ?? 'unknown');
$now = time();
$attempts = [];
if (file_exists($rateLimitFile)) {
    $attempts = json_decode(file_get_contents($rateLimitFile), true) ?: [];
    $attempts = array_filter($attempts, fn($t) => ($now - $t) < 60);
}
if (count($attempts) >= 10) {
    http_response_code(429);
    echo json_encode(['error' => 'Demasiados intentos. Esperá un minuto.']);
    exit;
}
$attempts[] = $now;
file_put_contents($rateLimitFile, json_encode(array_values($attempts)));

if ($user === ADMIN_USER && hash_equals(ADMIN_PASS, $pass)) {
    $_SESSION['admin'] = true;
    $_SESSION['admin_ts'] = $now;
    echo json_encode(['ok' => true]);
} else {
    http_response_code(401);
    echo json_encode(['error' => 'Credenciales incorrectas']);
}
