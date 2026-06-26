<?php
// ============================================================
// API: Servir documento de amonestación
// Verifica existencia antes de servir; error amigable si no existe
// ============================================================

require_once __DIR__ . '/../includes/auth.php';
requireLogin();

$f = $_GET['f'] ?? '';

// Validar: solo rutas dentro de uploads/ sin traversal
$f = str_replace('\\', '/', $f);
if (preg_match('/\.\./', $f) || !preg_match('#^amonestaciones/[\w\-]+\.(pdf|doc|docx|odt)$#i', $f)) {
    http_response_code(400); exit('Solicitud inválida.');
}

$local = UPLOAD_DIR . $f;

if (file_exists($local)) {
    $ext  = strtolower(pathinfo($local, PATHINFO_EXTENSION));
    $mime = match($ext) {
        'pdf'  => 'application/pdf',
        'doc'  => 'application/msword',
        'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'odt'  => 'application/vnd.oasis.opendocument.text',
        default => 'application/octet-stream',
    };
    header('Content-Type: ' . $mime);
    header('Content-Disposition: inline; filename="' . basename($local) . '"');
    header('Content-Length: ' . filesize($local));
    header('Cache-Control: public, max-age=86400');
    readfile($local);
    exit;
}

// Archivo no encontrado — página amigable
http_response_code(404);
?><!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Documento no disponible</title>
<style>
  body{font-family:'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center;
       min-height:100vh;margin:0;background:#f5f5f5}
  .box{background:#fff;padding:40px 48px;border-radius:8px;max-width:480px;text-align:center;
       box-shadow:0 2px 16px rgba(0,0,0,.10)}
  .icon{font-size:48px;margin-bottom:16px}
  h2{color:#1a1a1a;margin:0 0 10px;font-size:20px}
  p{color:#666;line-height:1.6;margin:0 0 24px}
  a{display:inline-block;padding:10px 22px;background:#F5C800;color:#1a1a1a;border-radius:4px;
    text-decoration:none;font-weight:700;font-size:14px}
</style>
</head>
<body>
<div class="box">
  <div class="icon">📄</div>
  <h2>Documento no disponible</h2>
  <p>El archivo <strong><?= htmlspecialchars(basename($f)) ?></strong> no se encuentra en el servidor.<br>
     Es posible que haya sido eliminado. Puedes volver a subirlo editando la amonestación.</p>
  <a href="javascript:history.back()">← Volver</a>
</div>
</body>
</html>
