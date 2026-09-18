<?php
// ============================================================
// API PÚBLICA: Verificar DNI para envío de foto de perfil (QR/link, SIN login)
// Devuelve el nombre enmascarado para confirmar identidad.
// ============================================================
require_once __DIR__ . '/../../includes/auth.php';   // db()/jsonResponse()/token
setupFotoPublica();
header('Content-Type: application/json; charset=utf-8');

$t   = (string)($_GET['t'] ?? $_POST['t'] ?? '');
$dni = trim((string)($_GET['dni'] ?? ''));

$tok = fotoPublicaToken();
if ($tok === '' || !hash_equals($tok, $t)) jsonResponse(false, 'Enlace inválido o vencido.', null, 403);
if ($dni === '' || !preg_match('/^\d{6,15}$/', $dni)) jsonResponse(false, 'Ingresa un DNI válido.', null, 422);

$p = db()->fetchOne("SELECT id, nombre, foto_pendiente FROM personal WHERE dni = ? AND activo = 1", [$dni]);
if (!$p) jsonResponse(false, 'DNI no encontrado o inactivo. Consulta con tu supervisor.', null, 404);

jsonResponse(true, '', [
    'nombre'    => fotoPublicaNombreMask($p['nombre'] ?? ''),
    'pendiente' => !empty($p['foto_pendiente']),
]);
