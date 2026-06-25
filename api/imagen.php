<?php
// ============================================================
// API: Servir imagen de evidencia
// Sirve el archivo local si existe; si no, redirige a producción.
// ============================================================

require_once __DIR__ . '/../includes/auth.php';
requireLogin();

$fname = basename($_GET['f'] ?? '');

// Validar formato: ev_{id}_{hex}.{ext}
if (!preg_match('/^ev_\d+_[a-f0-9]+\.(jpg|jpeg|png|webp)$/i', $fname)) {
    http_response_code(404);
    exit;
}

$local = UPLOAD_DIR . $fname;

if (file_exists($local)) {
    $mime = mime_content_type($local) ?: 'image/jpeg';
    header('Content-Type: ' . $mime);
    header('Cache-Control: public, max-age=86400');
    header('Content-Length: ' . filesize($local));
    readfile($local);
    exit;
}

// Archivo no existe localmente → redirigir a producción
header('Location: https://roka50safety.online/distribucion-segura/uploads/' . rawurlencode($fname), true, 302);
exit;
