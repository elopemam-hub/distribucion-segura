<?php
// Crea o actualiza un formulario de evaluación.
require_once __DIR__ . '/../../includes/auth.php';
requireLogin();
requireRole(['administrador']);
requireCsrf();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Método no permitido.', null, 405);
}

setupEvalFormularios();

$formularioId = trim(strtolower(preg_replace('/[^a-z0-9_]/i', '_', $_POST['formulario_id'] ?? '')));
$titulo       = trim($_POST['titulo'] ?? '');
$icono        = trim($_POST['icono']  ?? 'fa-clipboard-list');
$color        = trim($_POST['color']  ?? '#1565C0');
$orden        = (int)($_POST['orden'] ?? 0);
$esEdicion    = !empty($_POST['es_edicion']);

if (!$formularioId || strlen($formularioId) < 2) {
    jsonResponse(false, 'El ID del formulario es requerido (mín. 2 caracteres).', null, 422);
}
if (!$titulo) {
    jsonResponse(false, 'El título es requerido.', null, 422);
}
if (!preg_match('/^#[a-f0-9]{6}$/i', $color) && !preg_match('/^#[a-f0-9]{3}$/i', $color)) {
    $color = '#1565C0';
}

try {
    if ($esEdicion) {
        $existe = db()->fetchOne("SELECT id FROM eval_formularios WHERE formulario_id = ?", [$formularioId]);
        if (!$existe) jsonResponse(false, 'Formulario no encontrado.', null, 404);

        db()->query(
            "UPDATE eval_formularios SET titulo=?, icono=?, color=?, orden=? WHERE formulario_id=?",
            [$titulo, $icono, $color, $orden, $formularioId]
        );
        jsonResponse(true, 'Formulario actualizado.', ['formulario_id' => $formularioId]);
    } else {
        $existe = db()->fetchOne("SELECT id FROM eval_formularios WHERE formulario_id = ?", [$formularioId]);
        if ($existe) jsonResponse(false, 'Ya existe un formulario con ese ID.', null, 409);

        db()->query(
            "INSERT INTO eval_formularios (formulario_id, titulo, icono, color, orden) VALUES (?,?,?,?,?)",
            [$formularioId, $titulo, $icono, $color, $orden]
        );
        jsonResponse(true, 'Formulario creado.', ['formulario_id' => $formularioId]);
    }
} catch (Exception $e) {
    error_log('[guardar_formulario] ' . $e->getMessage());
    jsonResponse(false, 'Error al guardar el formulario.', null, 500);
}
