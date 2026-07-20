<?php
// ============================================================
// HELPER: Cálculo de puntaje de evaluaciones (compartido)
// Usado por api/guardar_evaluacion.php (interno) y
// api/eval_publico/guardar.php (público). El puntaje SIEMPRE se
// calcula en el servidor desde el banco de preguntas en BD.
// ============================================================

require_once __DIR__ . '/db.php';

/**
 * Calcula el puntaje de una evaluación a partir de las respuestas.
 *
 * @param string $tipo        formulario_id (ej. 'manejo_practica')
 * @param array  $respuestas  Estructura enviada por el formulario:
 *                            - aplica_grid: { seccion_id: { item_id: 'aplica'|'no_aplica' } }
 *                            - multiple_choice: { pregunta_id: 'A'|'B'|... }
 * @return array{puntaje: float, puntaje_maximo: float, porcentaje: float}
 */
function calcularPuntajeEvaluacion(string $tipo, array $respuestas): array
{
    $puntaje    = 0.0;
    $puntajeMax = 20.0;

    $secciones = db()->fetchAll(
        "SELECT s.id, s.seccion_id, s.tipo, s.puntos,
                p.pregunta_id, p.respuesta_correcta, p.puntos AS pts_pregunta
         FROM eval_secciones s
         LEFT JOIN eval_preguntas p ON p.seccion_id = s.id AND p.activo = 1
         WHERE s.formulario = ? AND s.activo = 1
         ORDER BY s.orden, p.orden",
        [$tipo]
    );

    // Agrupar por sección
    $secMap = [];
    foreach ($secciones as $row) {
        $sid = $row['seccion_id'];
        if (!isset($secMap[$sid])) {
            $secMap[$sid] = [
                'tipo'   => $row['tipo'],
                'puntos' => (float)$row['puntos'],
                'items'  => [],
            ];
        }
        if ($row['pregunta_id']) {
            $secMap[$sid]['items'][] = [
                'id'       => $row['pregunta_id'],
                'correcta' => $row['respuesta_correcta'],
                'puntos'   => (float)$row['pts_pregunta'],
            ];
        }
    }

    foreach ($secMap as $sid => $sec) {
        if ($sec['tipo'] === 'aplica_grid') {
            $secResp = $respuestas[$sid] ?? [];
            $total   = count($sec['items']);
            if ($total === 0) continue;
            $aplica  = 0;
            foreach ($sec['items'] as $item) {
                if (($secResp[$item['id']] ?? '') === 'aplica') $aplica++;
            }
            $puntaje += ($aplica / $total) * $sec['puntos'];

        } elseif ($sec['tipo'] === 'multiple_choice') {
            foreach ($sec['items'] as $item) {
                if ($item['correcta'] !== null && ($respuestas[$item['id']] ?? '') === $item['correcta']) {
                    $puntaje += $item['puntos'];
                }
            }
        }
    }

    $puntaje    = round($puntaje, 2);
    $porcentaje = round(($puntaje / $puntajeMax) * 100, 2);

    return [
        'puntaje'        => $puntaje,
        'puntaje_maximo' => $puntajeMax,
        'porcentaje'     => $porcentaje,
    ];
}
