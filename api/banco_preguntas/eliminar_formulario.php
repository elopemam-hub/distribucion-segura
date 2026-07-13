<?php
// Soft-delete de un formulario de evaluación (solo si no tiene secciones activas).
require_once __DIR__ . '/../../includes/auth.php';
requireLogin();
requireRole(['administrador']);
requireCsrf();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Método no permitido.', null, 405);
}

setupEvalFormularios();

$formularioId = trim($_POST['formulario_id'] ?? '');
if (!$formularioId) jsonResponse(false, 'ID requerido.', null, 422);

// No permitir eliminar los 3 base
$reservados = ['manejo_practica', 'examen_defensiva', 'induccion_t2'];
if (in_array($formularioId, $reservados, true)) {
    jsonResponse(false, 'No se pueden eliminar los formularios base del sistema.', null, 403);
}

try {
    $secciones = db()->fetchOne(
        "SELECT COUNT(*) AS n FROM eval_secciones WHERE formulario = ? AND activo = 1",
        [$formularioId]
    );
    if ((int)($secciones['n'] ?? 0) > 0) {
        jsonResponse(false, 'El formulario tiene secciones activas. Elimínalas primero desde el banco de preguntas.', null, 409);
    }

    db()->query("UPDATE eval_formularios SET activo=0 WHERE formulario_id=?", [$formularioId]);
    jsonResponse(true, 'Formulario eliminado.');
} catch (Exception $e) {
    error_log('[eliminar_formulario] ' . $e->getMessage());
    jsonResponse(false, 'Error al eliminar.', null, 500);
}
