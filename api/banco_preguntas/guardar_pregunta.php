<?php
// Crea o actualiza una pregunta/ítem del banco.
require_once __DIR__ . '/../../includes/auth.php';
requireLogin();
requireRole(['administrador']);
requireCsrf();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Método no permitido.', null, 405);
}

$id                = (int)($_POST['id'] ?? 0);
$seccionDbId       = (int)($_POST['seccion_db_id'] ?? 0);
$preguntaId        = trim($_POST['pregunta_id'] ?? '');
$texto             = trim($_POST['texto'] ?? '');
$opcionesRaw       = $_POST['opciones'] ?? '';
$respuestaCorrecta = trim($_POST['respuesta_correcta'] ?? '') ?: null;
$puntos            = (float)($_POST['puntos'] ?? 1);
$orden             = (int)($_POST['orden'] ?? 0);

$errores = [];
if ($seccionDbId <= 0) $errores[] = 'Sección inválida.';
if (!$preguntaId)      $errores[] = 'El ID de pregunta es requerido.';
if (!$texto)           $errores[] = 'El texto de la pregunta es requerido.';
if ($errores) jsonResponse(false, implode(' | ', $errores), null, 422);

// Verificar que la sección existe
$sec = db()->fetchOne("SELECT id, tipo FROM eval_secciones WHERE id = ?", [$seccionDbId]);
if (!$sec) jsonResponse(false, 'Sección no encontrada.', null, 404);

// Validar y limpiar opciones para multiple_choice
$opcionesJson = null;
if ($sec['tipo'] === 'multiple_choice') {
    $opciones = json_decode($opcionesRaw, true);
    if (!is_array($opciones) || count($opciones) < 2) {
        jsonResponse(false, 'Se requieren al menos 2 opciones para preguntas de opción múltiple.', null, 422);
    }
    // Sanitizar: solo permitir id y texto
    $opcionesSanitizadas = [];
    foreach ($opciones as $op) {
        $opId   = trim($op['id'] ?? '');
        $opText = trim($op['texto'] ?? '');
        if ($opId && $opText) {
            $opcionesSanitizadas[] = ['id' => $opId, 'texto' => $opText];
        }
    }
    if (count($opcionesSanitizadas) < 2) {
        jsonResponse(false, 'Opciones inválidas.', null, 422);
    }
    if ($respuestaCorrecta && !in_array($respuestaCorrecta, array_column($opcionesSanitizadas, 'id'), true)) {
        jsonResponse(false, 'La respuesta correcta debe coincidir con el ID de una opción.', null, 422);
    }
    $opcionesJson = json_encode($opcionesSanitizadas, JSON_UNESCAPED_UNICODE);
}

try {
    if ($id > 0) {
        db()->query(
            "UPDATE eval_preguntas
             SET texto=?, opciones=?, respuesta_correcta=?, puntos=?, orden=?
             WHERE id=? AND seccion_id=?",
            [$texto, $opcionesJson, $respuestaCorrecta, $puntos, $orden, $id, $seccionDbId]
        );
        jsonResponse(true, 'Pregunta actualizada.', ['id' => $id]);
    } else {
        $existe = db()->fetchOne(
            "SELECT id FROM eval_preguntas WHERE seccion_id=? AND pregunta_id=?",
            [$seccionDbId, $preguntaId]
        );
        if ($existe) jsonResponse(false, 'Ya existe una pregunta con ese ID en esta sección.', null, 409);

        db()->query(
            "INSERT INTO eval_preguntas
             (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            [$seccionDbId, $preguntaId, $texto, $opcionesJson, $respuestaCorrecta, $puntos, $orden]
        );
        $newId = (int)db()->lastInsertId();
        jsonResponse(true, 'Pregunta creada.', ['id' => $newId]);
    }
} catch (Exception $e) {
    error_log('[banco_preguntas/guardar_pregunta] ' . $e->getMessage());
    jsonResponse(false, 'Error al guardar la pregunta.', null, 500);
}
