<?php
// ============================================================
// API PÚBLICA: Config de formulario de evaluación
// SIN login. Devuelve meta + secciones/preguntas del formulario
// para el formulario público (eval_publico.php).
//
// NOTA: se llama formulario.php (NO config.php) porque el .htaccess
// bloquea todo archivo llamado config.php (protege includes/config.php).
//
// IMPORTANTE: NO expone `respuesta_correcta` (a diferencia del
// endpoint interno api/banco_preguntas/secciones.php) para que
// no se pueda "hacer trampa" leyendo la respuesta de la red.
// ============================================================

require_once __DIR__ . '/../../includes/auth.php';   // solo para db()/jsonResponse()/formularioEsValido()
header('Content-Type: application/json; charset=utf-8');

$formulario = trim($_GET['eval'] ?? $_GET['formulario'] ?? '');
if (!formularioEsValido($formulario)) {
    jsonResponse(false, 'Formulario no disponible.', null, 404);
}

// ── Meta del formulario ───────────────────────────────────────
try {
    $meta = db()->fetchOne(
        "SELECT formulario_id, titulo, icono, color
         FROM eval_formularios
         WHERE formulario_id = ? AND activo = 1",
        [$formulario]
    );
} catch (Exception $e) {
    $meta = null;
}
if (!$meta) {
    $meta = ['formulario_id' => $formulario, 'titulo' => 'Evaluación', 'icono' => 'fa-clipboard-check', 'color' => '#1565C0'];
}

// ── Secciones + preguntas (sin respuesta_correcta) ────────────
try {
    $secciones = db()->fetchAll(
        "SELECT id, seccion_id, titulo, descripcion, tipo, puntos, orden
         FROM eval_secciones
         WHERE formulario = ? AND activo = 1
         ORDER BY orden",
        [$formulario]
    );
} catch (Exception $e) {
    error_log('[eval_publico/config] ' . $e->getMessage());
    jsonResponse(false, 'No se pudo cargar el formulario.', null, 500);
}

$result = [];
foreach ($secciones as $sec) {
    try {
        $preguntas = db()->fetchAll(
            "SELECT id, pregunta_id, texto, opciones, puntos, orden
             FROM eval_preguntas
             WHERE seccion_id = ? AND activo = 1
             ORDER BY orden",
            [(int)$sec['id']]
        );
    } catch (Exception $e) {
        $preguntas = [];
    }

    $entry = [
        'id'          => $sec['seccion_id'],
        'titulo'      => $sec['titulo'],
        'descripcion' => $sec['descripcion'],
        'tipo'        => $sec['tipo'],
        'puntos'      => (float)$sec['puntos'],
        'orden'       => (int)$sec['orden'],
    ];

    if ($sec['tipo'] === 'aplica_grid') {
        $entry['items'] = array_map(fn($p) => [
            'id'    => $p['pregunta_id'],
            'label' => $p['texto'],
            'orden' => (int)$p['orden'],
        ], $preguntas);
    } else {
        $entry['preguntas'] = array_values(array_map(function ($p, $i) {
            return [
                'id'       => $p['pregunta_id'],
                'puntos'   => (float)$p['puntos'],
                'numero'   => ($i + 1) . '.',
                'texto'    => $p['texto'],
                'opciones' => json_decode($p['opciones'] ?? '[]', true),
                'orden'    => (int)$p['orden'],
                // respuesta_correcta OMITIDA intencionalmente
            ];
        }, $preguntas, array_keys($preguntas)));
    }

    $result[] = $entry;
}

jsonResponse(true, '', [
    'meta'      => $meta,
    'secciones' => $result,
]);
