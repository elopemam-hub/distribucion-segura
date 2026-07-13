<?php
// ============================================================
// API: GUARDAR EVALUACIÓN
// ============================================================

require_once __DIR__ . '/../includes/auth.php';
requireLogin();
requireCsrf();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Método no permitido.', null, 405);
}

// ── Leer input ───────────────────────────────────────────────
$tipo          = trim($_POST['tipo'] ?? '');
$fecha         = $_POST['fecha'] ?? '';
$empresa       = trim($_POST['empresa'] ?? '');
$nombre        = trim($_POST['nombre'] ?? '');
$dni           = trim($_POST['dni'] ?? '');
$puesto        = trim($_POST['puesto'] ?? '');
$tipo_unidad   = trim($_POST['tipo_unidad'] ?? '');
$estado_unidad = trim($_POST['estado_unidad'] ?? '');
$conductor_tipo= trim($_POST['conductor_tipo'] ?? '');
$observaciones = trim($_POST['observaciones'] ?? '');
$firma         = $_POST['firma_evaluado'] ?? null;
$respuestasRaw = $_POST['respuestas'] ?? '{}';
$respuestas    = json_decode($respuestasRaw, true);
$evaluadorId   = getCurrentUser()['id'];

$errores = [];
if (!formularioEsValido($tipo))                          $errores[] = 'Tipo de evaluación inválido.';
if (empty($fecha))                                       $errores[] = 'La fecha es requerida.';
if (empty($nombre))                                      $errores[] = 'El nombre es requerido.';
if (empty($dni))                                         $errores[] = 'El DNI es requerido.';
if (!is_array($respuestas) || empty($respuestas))        $errores[] = 'No se recibieron respuestas.';
if (!empty($errores)) jsonResponse(false, implode(' | ', $errores), null, 422);

// ── Calcular puntaje desde BD ─────────────────────────────────
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

// ── Guardar en BD ────────────────────────────────────────────
try {
    db()->query(
        "INSERT INTO evaluaciones
         (tipo, fecha, empresa, nombre, dni, puesto, tipo_unidad, estado_unidad, conductor_tipo,
          respuestas, puntaje, puntaje_maximo, porcentaje, observaciones, firma_evaluado, evaluador_id)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [
            $tipo, $fecha, $empresa ?: null, $nombre, $dni,
            $puesto ?: null, $tipo_unidad ?: null, $estado_unidad ?: null, $conductor_tipo ?: null,
            json_encode($respuestas, JSON_UNESCAPED_UNICODE),
            $puntaje, $puntajeMax, $porcentaje,
            $observaciones ?: null,
            ($firma && strlen($firma) > 100) ? $firma : null,
            $evaluadorId,
        ]
    );
    $id = db()->lastInsertId();

    jsonResponse(true, 'Evaluación guardada correctamente.', [
        'id'          => (int)$id,
        'puntaje'     => $puntaje,
        'puntaje_max' => $puntajeMax,
        'porcentaje'  => $porcentaje,
    ]);

} catch (Exception $e) {
    error_log('[guardar_evaluacion] ' . $e->getMessage());
    jsonResponse(false, 'Error al guardar la evaluación. Intenta nuevamente.', null, 500);
}
