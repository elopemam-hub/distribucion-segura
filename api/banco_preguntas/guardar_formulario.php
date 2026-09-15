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
$empCabecera  = (int)($_POST['empresa_cabecera_id'] ?? 0);   // 0 = automático por trabajador
$tema         = trim($_POST['tema'] ?? '');                   // tema fijo del registro (multilínea)
$catRm050     = trim($_POST['categoria_rm050'] ?? '');        // Marcar (X) del registro
if (!in_array($catRm050, ['induccion', 'capacitacion', 'entrenamiento', 'simulacro', 'otros'], true)) $catRm050 = '';
$capacitador  = trim($_POST['capacitador'] ?? '');           // nombre del capacitador (p. ej. Supervisor de Flota)
$capacitador  = mb_substr($capacitador, 0, 150);
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
            "UPDATE eval_formularios SET titulo=?, icono=?, color=?, orden=?, empresa_cabecera_id=?, tema=?, categoria_rm050=?, capacitador=? WHERE formulario_id=?",
            [$titulo, $icono, $color, $orden, $empCabecera ?: null, $tema ?: null, $catRm050 ?: null, $capacitador ?: null, $formularioId]
        );
        jsonResponse(true, 'Formulario actualizado.', ['formulario_id' => $formularioId]);
    } else {
        $existe = db()->fetchOne("SELECT id FROM eval_formularios WHERE formulario_id = ?", [$formularioId]);
        if ($existe) jsonResponse(false, 'Ya existe un formulario con ese ID.', null, 409);

        db()->query(
            "INSERT INTO eval_formularios (formulario_id, titulo, icono, color, orden, empresa_cabecera_id, tema, categoria_rm050, capacitador) VALUES (?,?,?,?,?,?,?,?,?)",
            [$formularioId, $titulo, $icono, $color, $orden, $empCabecera ?: null, $tema ?: null, $catRm050 ?: null, $capacitador ?: null]
        );
        jsonResponse(true, 'Formulario creado.', ['formulario_id' => $formularioId]);
    }
} catch (Exception $e) {
    error_log('[guardar_formulario] ' . $e->getMessage());
    jsonResponse(false, 'Error al guardar el formulario.', null, 500);
}
