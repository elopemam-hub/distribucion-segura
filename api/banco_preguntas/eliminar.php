<?php
// Elimina (soft-delete) una sección o pregunta del banco.
require_once __DIR__ . '/../../includes/auth.php';
requireLogin();
requireRole(['administrador']);
requireCsrf();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Método no permitido.', null, 405);
}

$tipo = trim($_POST['tipo'] ?? '');  // 'seccion' | 'pregunta'
$id   = (int)($_POST['id'] ?? 0);

if (!in_array($tipo, ['seccion', 'pregunta'], true) || $id <= 0) {
    jsonResponse(false, 'Parámetros inválidos.', null, 422);
}

try {
    if ($tipo === 'seccion') {
        $rows = db()->query(
            "UPDATE eval_secciones SET activo = 0 WHERE id = ?",
            [$id]
        );
        if ($rows === 0) jsonResponse(false, 'Sección no encontrada.', null, 404);
        jsonResponse(true, 'Sección eliminada.');
    } else {
        $rows = db()->query(
            "UPDATE eval_preguntas SET activo = 0 WHERE id = ?",
            [$id]
        );
        if ($rows === 0) jsonResponse(false, 'Pregunta no encontrada.', null, 404);
        jsonResponse(true, 'Pregunta eliminada.');
    }
} catch (Exception $e) {
    error_log('[banco_preguntas/eliminar] ' . $e->getMessage());
    jsonResponse(false, 'Error al eliminar.', null, 500);
}
