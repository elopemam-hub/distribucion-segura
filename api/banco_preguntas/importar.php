<?php
// Importa un JSON de banco de preguntas, reemplazando las secciones del formulario.
require_once __DIR__ . '/../../includes/auth.php';
requireLogin();
requireRole(['administrador']);
requireCsrf();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Método no permitido.', null, 405);
}

$raw = file_get_contents('php://input');
if (empty($raw)) {
    // Intentar desde $_POST si viene como form-data
    $raw = $_POST['json'] ?? '';
}

$data = json_decode($raw, true);
if (json_last_error() !== JSON_ERROR_NONE || !isset($data['formulario'], $data['secciones'])) {
    jsonResponse(false, 'JSON inválido o estructura incorrecta.', null, 422);
}

$formulario = $data['formulario'];
if (!formularioEsValido($formulario)) {
    jsonResponse(false, 'Formulario inválido en el JSON.', null, 422);
}

if (!is_array($data['secciones']) || empty($data['secciones'])) {
    jsonResponse(false, 'El JSON no contiene secciones.', null, 422);
}

try {
    db()->beginTransaction();

    // Borrar secciones existentes (CASCADE elimina preguntas)
    db()->query(
        "DELETE FROM eval_secciones WHERE formulario = ?",
        [$formulario]
    );

    foreach ($data['secciones'] as $i => $sec) {
        $seccionId  = trim($sec['seccion_id'] ?? '');
        $titulo     = trim($sec['titulo'] ?? '');
        $tipo       = $sec['tipo'] ?? '';
        $tiposSeccion = ['aplica_grid', 'multiple_choice'];

        if (!$seccionId || !$titulo || !in_array($tipo, $tiposSeccion, true)) continue;

        db()->query(
            "INSERT INTO eval_secciones (formulario, seccion_id, titulo, descripcion, tipo, puntos, orden)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                $formulario,
                $seccionId,
                $titulo,
                $sec['descripcion'] ?? null,
                $tipo,
                (float)($sec['puntos'] ?? 0),
                (int)($sec['orden'] ?? $i + 1),
            ]
        );
        $secDbId = (int)db()->lastInsertId();

        foreach (($sec['preguntas'] ?? []) as $j => $p) {
            $preguntaId = trim($p['pregunta_id'] ?? '');
            $texto      = trim($p['texto'] ?? '');
            if (!$preguntaId || !$texto) continue;

            $opciones = null;
            if (!empty($p['opciones']) && is_array($p['opciones'])) {
                $opciones = json_encode($p['opciones'], JSON_UNESCAPED_UNICODE);
            }

            db()->query(
                "INSERT INTO eval_preguntas
                 (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                [
                    $secDbId,
                    $preguntaId,
                    $texto,
                    $opciones,
                    $p['respuesta_correcta'] ?? null,
                    (float)($p['puntos'] ?? 1),
                    (int)($p['orden'] ?? $j + 1),
                ]
            );
        }
    }

    db()->commit();
    jsonResponse(true, 'Banco de preguntas importado correctamente.');

} catch (Exception $e) {
    db()->rollback();
    error_log('[banco_preguntas/importar] ' . $e->getMessage());
    jsonResponse(false, 'Error al importar. Verifica el formato del JSON.', null, 500);
}
