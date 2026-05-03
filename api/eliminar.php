<?php
// ============================================================
// API: ELIMINAR INSPECCIÓN
// Archivo: api/eliminar.php
// ============================================================

require_once __DIR__ . '/../includes/auth.php';

requireLogin();
requireRole(['administrador']);
requireCsrf();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Método no permitido.', null, 405);
}

$id = (int)($_POST['id'] ?? 0);
if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);

// Obtener evidencias para eliminar archivos
$evidencias = db()->fetchAll("SELECT ruta_imagen FROM evidencias WHERE inspeccion_id = ?", [$id]);

try {
    db()->beginTransaction();

    // Eliminar registro (CASCADE borra tripulacion, checklist, evidencias, hallazgos)
    $affected = db()->query("DELETE FROM inspecciones WHERE id = ?", [$id])->rowCount();

    if ($affected === 0) {
        db()->rollback();
        jsonResponse(false, 'Inspección no encontrada.', null, 404);
    }

    db()->commit();

    // Eliminar archivos físicos de evidencias
    $uploadDir = __DIR__ . '/../uploads/';
    foreach ($evidencias as $ev) {
        $file = $uploadDir . $ev['ruta_imagen'];
        if (file_exists($file)) @unlink($file);
    }

    jsonResponse(true, 'Inspección eliminada correctamente.');

} catch (Exception $e) {
    db()->rollback();
    error_log('[eliminar] ' . $e->getMessage());
    jsonResponse(false, 'Error al eliminar la inspección.', null, 500);
}
