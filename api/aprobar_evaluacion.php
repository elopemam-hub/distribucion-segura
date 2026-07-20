<?php
require_once __DIR__ . '/../includes/auth.php';
requireLogin();
requireCsrf();
requireRole(['supervisor', 'administrador']);
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Método no permitido.', null, 405);
}

$id          = (int)($_POST['id'] ?? 0);
$accion      = trim($_POST['accion'] ?? '');
$comentario  = trim($_POST['comentario'] ?? '');
$firma       = $_POST['firma_aprobador'] ?? null;
$aprobadorId = (int)getCurrentUser()['id'];

if ($id <= 0)                                    jsonResponse(false, 'ID inválido.', null, 400);
if (!in_array($accion, ['aprobar','rechazar']))  jsonResponse(false, 'Acción inválida.', null, 400);

// Firma opcional: el modal la envía dibujada; la aprobación rápida
// desde el listado no la incluye. Se registra igual quién y cuándo aprueba.
$firma = ($firma && strlen($firma) > 100) ? $firma : null;

// Verificar que existe y está pendiente
$eval = db()->fetchOne(
    "SELECT id, estado, evaluador_id FROM evaluaciones WHERE id = ?",
    [$id]
);
if (!$eval)                                    jsonResponse(false, 'Evaluación no encontrada.', null, 404);
if ($eval['estado'] !== 'pendiente_revision')  jsonResponse(false, 'Esta evaluación ya fue procesada.', null, 409);

$nuevoEstado = $accion === 'aprobar' ? 'aprobado' : 'desaprobado';

try {
    db()->query(
        "UPDATE evaluaciones SET
            estado = ?,
            aprobado_por = ?,
            aprobado_en = NOW(),
            firma_aprobador = ?,
            comentario_aprobacion = ?
         WHERE id = ?",
        [$nuevoEstado, $aprobadorId, $firma, $comentario ?: null, $id]
    );
    jsonResponse(true, 'Evaluación ' . ($accion === 'aprobar' ? 'aprobada' : 'rechazada') . ' correctamente.', [
        'estado' => $nuevoEstado,
    ]);
} catch (Exception $e) {
    error_log('[aprobar_evaluacion] ' . $e->getMessage());
    jsonResponse(false, 'Error al procesar. Intenta nuevamente.', null, 500);
}
