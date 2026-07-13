<?php
// Devuelve la lista de formularios de evaluación activos.
require_once __DIR__ . '/../../includes/auth.php';
requireLogin();
header('Content-Type: application/json; charset=utf-8');

setupEvalFormularios();

$rows = db()->fetchAll(
    "SELECT formulario_id, titulo, icono, color, orden
     FROM eval_formularios
     WHERE activo = 1
     ORDER BY orden, id",
    []
);
jsonResponse(true, '', $rows);
