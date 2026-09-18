<?php
// ============================================================
// API PÚBLICA: Subir foto de perfil (QR/link, SIN login)
// La foto entra como PENDIENTE (personal.foto_pendiente) para aprobación admin.
// Imagen enviada como base64 (esquiva el WAF). 1 envío por DNI al día.
// ============================================================
require_once __DIR__ . '/../../includes/auth.php';
setupFotoPublica();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonResponse(false, 'Método no permitido.', null, 405);

$t   = (string)($_POST['t'] ?? '');
$dni = trim((string)($_POST['dni'] ?? ''));
$b64 = (string)($_POST['imagen_b64'] ?? '');

$tok = fotoPublicaToken();
if ($tok === '' || !hash_equals($tok, $t)) jsonResponse(false, 'Enlace inválido o vencido.', null, 403);
if ($dni === '' || !preg_match('/^\d{6,15}$/', $dni)) jsonResponse(false, 'DNI inválido.', null, 422);

$p = db()->fetchOne("SELECT id, foto_pendiente, foto_pendiente_en FROM personal WHERE dni = ? AND activo = 1", [$dni]);
if (!$p) jsonResponse(false, 'DNI no encontrado o inactivo.', null, 404);

// Anti-abuso: 1 envío pendiente por día.
if (!empty($p['foto_pendiente_en']) && substr((string)$p['foto_pendiente_en'], 0, 10) === date('Y-m-d')) {
    jsonResponse(false, 'Ya enviaste una foto hoy. Espera la aprobación de tu supervisor.', null, 429);
}

if (strpos($b64, 'base64,') !== false) $b64 = substr($b64, strpos($b64, 'base64,') + 7);
$bin = base64_decode($b64, true);
if ($bin === false || strlen($bin) < 20) jsonResponse(false, 'Imagen inválida.', null, 422);
if (strlen($bin) > 8 * 1024 * 1024)      jsonResponse(false, 'La imagen supera 8MB.', null, 413);
$ext = null;
if (substr($bin, 0, 3) === "\xFF\xD8\xFF") $ext = 'jpg';
elseif (substr($bin, 0, 8) === "\x89PNG\r\n\x1a\n") $ext = 'png';
elseif (strncmp($bin, 'RIFF', 4) === 0 && substr($bin, 8, 4) === 'WEBP') $ext = 'webp';
if (!$ext) jsonResponse(false, 'Usa una imagen JPG/PNG/WEBP.', null, 422);

$dir = __DIR__ . '/../../uploads/personal/';
if (!is_dir($dir)) mkdir($dir, 0755, true);
$filename = 'foto_pend_' . preg_replace('/[^0-9]/', '', $dni) . '_' . bin2hex(random_bytes(5)) . '.' . $ext;
if (file_put_contents($dir . $filename, $bin) === false) jsonResponse(false, 'No se pudo guardar. Reintenta.', null, 500);
@chmod($dir . $filename, 0644);

// Reemplaza la pendiente anterior (si la hubiera).
if (!empty($p['foto_pendiente']) && is_file(__DIR__ . '/../../uploads/' . $p['foto_pendiente'])) @unlink(__DIR__ . '/../../uploads/' . $p['foto_pendiente']);

db()->query("UPDATE personal SET foto_pendiente = ?, foto_pendiente_en = NOW() WHERE id = ?", ['personal/' . $filename, $p['id']]);
jsonResponse(true, '¡Foto enviada! Quedará activa cuando tu supervisor la apruebe.');
