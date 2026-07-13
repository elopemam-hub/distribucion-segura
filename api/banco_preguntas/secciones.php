<?php
// Devuelve secciones + preguntas/items de un formulario desde la BD.
// Utilizado por evaluaciones.js al seleccionar tipo de evaluación.
require_once __DIR__ . '/../../includes/auth.php';
requireLogin();
header('Content-Type: application/json; charset=utf-8');

$formulario = trim($_GET['formulario'] ?? '');
if (!formularioEsValido($formulario)) {
    jsonResponse(false, 'Formulario inválido.', null, 400);
}

try {
    $secciones = db()->fetchAll(
        "SELECT id, seccion_id, titulo, descripcion, tipo, puntos, orden
         FROM eval_secciones
         WHERE formulario = ? AND activo = 1
         ORDER BY orden",
        [$formulario]
    );
} catch (Exception $e) {
    error_log('[banco_preguntas/secciones] ' . $e->getMessage());
    jsonResponse(false, 'Error de BD. Ejecuta deploy/banco_preguntas_seed.sql primero.', null, 500);
}

$result = [];
foreach ($secciones as $sec) {
    try {
        $preguntas = db()->fetchAll(
            "SELECT id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden
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
        'db_id'       => (int)$sec['id'],
        'titulo'      => $sec['titulo'],
        'descripcion' => $sec['descripcion'],
        'tipo'        => $sec['tipo'],
        'puntos'      => (float)$sec['puntos'],
        'orden'       => (int)$sec['orden'],
    ];

    if ($sec['tipo'] === 'aplica_grid') {
        $entry['items'] = array_map(fn($p) => [
            'id'    => $p['pregunta_id'],
            'db_id' => (int)$p['id'],
            'label' => $p['texto'],
            'orden' => (int)$p['orden'],
        ], $preguntas);
    } else {
        $entry['preguntas'] = array_values(array_map(function($p, $i) {
            return [
                'id'                => $p['pregunta_id'],
                'db_id'             => (int)$p['id'],
                'puntos'            => (float)$p['puntos'],
                'numero'            => ($i + 1) . '.',
                'texto'             => $p['texto'],
                'opciones'          => json_decode($p['opciones'] ?? '[]', true),
                'respuesta_correcta'=> $p['respuesta_correcta'],
                'orden'             => (int)$p['orden'],
            ];
        }, $preguntas, array_keys($preguntas)));
    }

    $result[] = $entry;
}

jsonResponse(true, '', $result);
