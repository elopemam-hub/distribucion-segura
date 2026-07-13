<?php
// Crea o actualiza una sección del banco de preguntas.
require_once __DIR__ . '/../../includes/auth.php';
requireLogin();
requireRole(['administrador']);
requireCsrf();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Método no permitido.', null, 405);
}

$id          = (int)($_POST['id'] ?? 0);
$formulario  = trim($_POST['formulario'] ?? '');
$seccionId   = trim($_POST['seccion_id'] ?? '');
$titulo      = trim($_POST['titulo'] ?? '');
$descripcion = trim($_POST['descripcion'] ?? '') ?: null;
$tipo        = trim($_POST['tipo'] ?? '');
$puntos      = (float)($_POST['puntos'] ?? 0);
$orden       = (int)($_POST['orden'] ?? 0);

$tiposSeccion = ['aplica_grid', 'multiple_choice'];

$errores = [];
if (!formularioEsValido($formulario)) $errores[] = 'Formulario inválido.';
if (!$seccionId)                                     $errores[] = 'El ID de sección es requerido.';
if (!$titulo)                                        $errores[] = 'El título es requerido.';
if (!in_array($tipo, $tiposSeccion, true))           $errores[] = 'Tipo de sección inválido.';

if ($errores) jsonResponse(false, implode(' | ', $errores), null, 422);

try {
    if ($id > 0) {
        db()->query(
            "UPDATE eval_secciones
             SET titulo=?, descripcion=?, puntos=?, orden=?
             WHERE id=? AND formulario=?",
            [$titulo, $descripcion, $puntos, $orden, $id, $formulario]
        );
        jsonResponse(true, 'Sección actualizada.', ['id' => $id]);
    } else {
        // Verificar duplicado
        $existe = db()->fetchOne(
            "SELECT id FROM eval_secciones WHERE formulario=? AND seccion_id=?",
            [$formulario, $seccionId]
        );
        if ($existe) jsonResponse(false, 'Ya existe una sección con ese ID en este formulario.', null, 409);

        db()->query(
            "INSERT INTO eval_secciones (formulario, seccion_id, titulo, descripcion, tipo, puntos, orden)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            [$formulario, $seccionId, $titulo, $descripcion, $tipo, $puntos, $orden]
        );
        $newId = (int)db()->lastInsertId();
        jsonResponse(true, 'Sección creada.', ['id' => $newId]);
    }
} catch (Exception $e) {
    error_log('[banco_preguntas/guardar_seccion] ' . $e->getMessage());
    jsonResponse(false, 'Error al guardar la sección.', null, 500);
}
