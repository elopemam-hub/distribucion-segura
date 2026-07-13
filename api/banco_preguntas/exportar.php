<?php
// Exporta un formulario completo como JSON descargable.
require_once __DIR__ . '/../../includes/auth.php';
requireLogin();
requireRole(['administrador', 'supervisor']);

$formulario = trim($_GET['formulario'] ?? '');
if (!formularioEsValido($formulario)) {
    header('Content-Type: application/json; charset=utf-8');
    jsonResponse(false, 'Formulario inválido.', null, 400);
}

$secciones = db()->fetchAll(
    "SELECT id, seccion_id, titulo, descripcion, tipo, puntos, orden
     FROM eval_secciones
     WHERE formulario = ? AND activo = 1
     ORDER BY orden",
    [$formulario]
);

$export = [
    'formulario'   => $formulario,
    'version'      => '1.0',
    'exported_at'  => date('Y-m-d H:i:s'),
    'secciones'    => [],
];

foreach ($secciones as $sec) {
    $preguntas = db()->fetchAll(
        "SELECT pregunta_id, texto, opciones, respuesta_correcta, puntos, orden
         FROM eval_preguntas
         WHERE seccion_id = ? AND activo = 1
         ORDER BY orden",
        [(int)$sec['id']]
    );

    $secData = [
        'seccion_id'  => $sec['seccion_id'],
        'titulo'      => $sec['titulo'],
        'descripcion' => $sec['descripcion'],
        'tipo'        => $sec['tipo'],
        'puntos'      => (float)$sec['puntos'],
        'orden'       => (int)$sec['orden'],
        'preguntas'   => array_map(function($p) {
            return [
                'pregunta_id'       => $p['pregunta_id'],
                'texto'             => $p['texto'],
                'opciones'          => $p['opciones'] ? json_decode($p['opciones'], true) : null,
                'respuesta_correcta'=> $p['respuesta_correcta'],
                'puntos'            => (float)$p['puntos'],
                'orden'             => (int)$p['orden'],
            ];
        }, $preguntas),
    ];

    $export['secciones'][] = $secData;
}

$filename = 'banco_' . $formulario . '_' . date('Ymd') . '.json';
header('Content-Type: application/json; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
echo json_encode($export, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
