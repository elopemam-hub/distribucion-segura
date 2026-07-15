<?php
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

try {
    $affected = db()->query("DELETE FROM evaluaciones WHERE id = ?", [$id])->rowCount();
    if ($affected === 0) jsonResponse(false, 'Evaluación no encontrada.', null, 404);
    jsonResponse(true, 'Evaluación eliminada correctamente.');
} catch (Exception $e) {
    error_log('[eliminar_evaluacion] ' . $e->getMessage());
    jsonResponse(false, 'Error al eliminar la evaluación.', null, 500);
}
