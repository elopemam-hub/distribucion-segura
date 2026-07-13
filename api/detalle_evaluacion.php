<?php
require_once __DIR__ . '/../includes/auth.php';
requireLogin();
header('Content-Type: application/json; charset=utf-8');

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);

$row = db()->fetchOne(
    "SELECT e.*,
            u.nombre AS evaluador_nombre,
            a.nombre AS aprobador_nombre
     FROM evaluaciones e
     LEFT JOIN usuarios u ON u.id = e.evaluador_id
     LEFT JOIN usuarios a ON a.id = e.aprobado_por
     WHERE e.id = ?",
    [$id]
);
if (!$row) jsonResponse(false, 'Evaluación no encontrada.', null, 404);

$row['respuestas'] = json_decode($row['respuestas'] ?? '{}', true);

// Obtener respuestas correctas desde BD (solo para formularios de opción múltiple)
$correctas = [];
$preguntas = db()->fetchAll(
    "SELECT p.pregunta_id, p.respuesta_correcta
     FROM eval_secciones s
     JOIN eval_preguntas p ON p.seccion_id = s.id AND p.activo = 1
     WHERE s.formulario = ? AND s.tipo = 'multiple_choice' AND s.activo = 1",
    [$row['tipo']]
);
foreach ($preguntas as $p) {
    if ($p['respuesta_correcta'] !== null) {
        $correctas[$p['pregunta_id']] = $p['respuesta_correcta'];
    }
}
$row['respuestas_correctas'] = $correctas;

$user = getCurrentUser();
$row['puede_aprobar'] = in_array($user['rol'], ['supervisor', 'administrador'])
    && $row['estado'] === 'pendiente_revision';

jsonResponse(true, '', $row);
