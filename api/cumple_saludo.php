<?php
// ============================================================
// API: SALUDO MENSUAL DE CUMPLEAÑOS (para el mural publicable)
// Archivo: api/cumple_saludo.php  (get | save)  — uno por año/mes.
// ============================================================

require_once __DIR__ . '/../includes/auth.php';
requireLogin();
setupCumpleSaludos();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? 'get';

// Ruta actual del fondo del mural.
function _cumpleFondo(): ?string {
    try { $r = db()->fetchOne("SELECT fondo FROM cumple_config WHERE id = 1"); return $r['fondo'] ?? null; }
    catch (Throwable $e) { return null; }
}

if ($action === 'fondo_set') {
    requireCsrf();
    $u = getCurrentUser();
    if (!in_array($u['rol'] ?? '', ['administrador', 'supervisor'], true)) jsonResponse(false, 'Sin permisos.', null, 403);
    $b64 = $_POST['imagen_b64'] ?? '';
    if (strpos($b64, 'base64,') !== false) $b64 = substr($b64, strpos($b64, 'base64,') + 7);
    $bin = base64_decode($b64, true);
    if ($bin === false || strlen($bin) < 20) jsonResponse(false, 'Imagen inválida.', null, 422);
    if (strlen($bin) > 8 * 1024 * 1024)      jsonResponse(false, 'La imagen supera 8MB.', null, 413);
    $ext = null;
    if (substr($bin, 0, 3) === "\xFF\xD8\xFF") $ext = 'jpg';
    elseif (substr($bin, 0, 8) === "\x89PNG\r\n\x1a\n") $ext = 'png';
    elseif (strncmp($bin, 'RIFF', 4) === 0 && substr($bin, 8, 4) === 'WEBP') $ext = 'webp';
    if (!$ext) jsonResponse(false, 'Usa una imagen JPG/PNG/WEBP.', null, 422);
    $dir = __DIR__ . '/../uploads/cumple/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $filename = 'fondo_' . bin2hex(random_bytes(6)) . '.' . $ext;
    if (file_put_contents($dir . $filename, $bin) === false) jsonResponse(false, 'No se pudo guardar.', null, 500);
    @chmod($dir . $filename, 0644);
    $prev = _cumpleFondo();
    if ($prev && is_file(__DIR__ . '/../uploads/' . $prev)) @unlink(__DIR__ . '/../uploads/' . $prev);
    db()->query("INSERT INTO cumple_config (id, fondo) VALUES (1, ?) ON DUPLICATE KEY UPDATE fondo = VALUES(fondo)", ['cumple/' . $filename]);
    jsonResponse(true, 'Fondo actualizado.', ['fondo' => 'cumple/' . $filename]);
}

if ($action === 'fondo_del') {
    requireCsrf();
    $u = getCurrentUser();
    if (!in_array($u['rol'] ?? '', ['administrador', 'supervisor'], true)) jsonResponse(false, 'Sin permisos.', null, 403);
    $prev = _cumpleFondo();
    if ($prev && is_file(__DIR__ . '/../uploads/' . $prev)) @unlink(__DIR__ . '/../uploads/' . $prev);
    db()->query("UPDATE cumple_config SET fondo = NULL WHERE id = 1", []);
    jsonResponse(true, 'Fondo quitado.', ['fondo' => null]);
}

if ($action === 'save') {
    requireCsrf();
    $u = getCurrentUser();
    if (!in_array($u['rol'] ?? '', ['administrador', 'supervisor'], true)) {
        jsonResponse(false, 'Solo admin/supervisor puede editar el saludo.', null, 403);
    }
    $anio = (int)($_POST['anio'] ?? 0);
    $mes  = (int)($_POST['mes'] ?? 0);
    if ($anio < 2000 || $anio > 2100 || $mes < 1 || $mes > 12) jsonResponse(false, 'Año/mes inválido.', null, 422);
    $msg = mb_substr(trim($_POST['mensaje'] ?? ''), 0, 255);
    db()->query("INSERT INTO cumple_saludos (anio, mes, mensaje) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE mensaje = VALUES(mensaje)", [$anio, $mes, $msg]);
    jsonResponse(true, 'Saludo guardado.', ['mensaje' => $msg]);
}

$anio = (int)($_GET['anio'] ?? 0);
$mes  = (int)($_GET['mes'] ?? 0);
$r = db()->fetchOne("SELECT mensaje FROM cumple_saludos WHERE anio = ? AND mes = ?", [$anio, $mes]);
jsonResponse(true, '', ['mensaje' => $r['mensaje'] ?? '', 'fondo' => _cumpleFondo()]);
