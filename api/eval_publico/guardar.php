<?php
// ============================================================
// API PÚBLICA: Guardar evaluación (link / QR, SIN login)
// El puntaje se calcula SIEMPRE en el servidor. La evaluación
// entra como 'pendiente_revision' con origen 'publico' y
// evaluador_id NULL, para que un supervisor la revise/apruebe.
// ============================================================

require_once __DIR__ . '/../../includes/auth.php';   // solo para db()/jsonResponse()/formularioEsValido()
require_once __DIR__ . '/../../includes/eval_scoring.php';
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Método no permitido.', null, 405);
}

// Recorta a un máximo defensivo (endpoint abierto)
$cut = fn($v, $max) => mb_substr(trim((string)$v), 0, $max);

// ── Leer input ───────────────────────────────────────────────
$tipo          = $cut($_POST['tipo'] ?? '', 50);
$fecha         = $cut($_POST['fecha'] ?? '', 10);
$empresa       = $cut($_POST['empresa'] ?? '', 200);
$nombre        = $cut($_POST['nombre'] ?? '', 200);
$dni           = $cut($_POST['dni'] ?? '', 20);
$puesto        = $cut($_POST['puesto'] ?? '', 100);
$tipo_unidad   = $cut($_POST['tipo_unidad'] ?? '', 100);
$estado_unidad = $cut($_POST['estado_unidad'] ?? '', 100);
$conductor_tipo= $cut($_POST['conductor_tipo'] ?? '', 100);
$observaciones = $cut($_POST['observaciones'] ?? '', 2000);
$respuestasRaw = $_POST['respuestas'] ?? '{}';
$respuestas    = json_decode($respuestasRaw, true);

// ── Validaciones ─────────────────────────────────────────────
$errores = [];
if (!formularioEsValido($tipo))                   $errores[] = 'Formulario no disponible.';
if ($fecha === '')                                $errores[] = 'La fecha es requerida.';
if ($nombre === '')                               $errores[] = 'El nombre es requerido.';
if ($dni === '')                                  $errores[] = 'El DNI es requerido.';
if (!is_array($respuestas) || empty($respuestas)) $errores[] = 'No se recibieron respuestas.';
if (!empty($errores)) jsonResponse(false, implode(' | ', $errores), null, 422);

// Fecha inválida → usar hoy (evita fallo de INSERT por formato)
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
    $fecha = date('Y-m-d');
}

// ── Puntaje en servidor ──────────────────────────────────────
$score = calcularPuntajeEvaluacion($tipo, $respuestas);

// ── Guardar ──────────────────────────────────────────────────
try {
    db()->query(
        "INSERT INTO evaluaciones
         (tipo, fecha, empresa, nombre, dni, puesto, tipo_unidad, estado_unidad, conductor_tipo,
          respuestas, puntaje, puntaje_maximo, porcentaje, observaciones, firma_evaluado, evaluador_id, origen)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        [
            $tipo, $fecha, $empresa ?: null, $nombre, $dni,
            $puesto ?: null, $tipo_unidad ?: null, $estado_unidad ?: null, $conductor_tipo ?: null,
            json_encode($respuestas, JSON_UNESCAPED_UNICODE),
            $score['puntaje'], $score['puntaje_maximo'], $score['porcentaje'],
            $observaciones ?: null,
            null,        // sin firma en el flujo público
            null,        // evaluador_id: respondiente sin cuenta
            'publico',
        ]
    );
    $id = db()->lastInsertId();

    jsonResponse(true, 'Evaluación registrada correctamente.', [
        'id'          => (int)$id,
        'puntaje'     => $score['puntaje'],
        'puntaje_max' => $score['puntaje_maximo'],
        'porcentaje'  => $score['porcentaje'],
        'aprobado'    => $score['porcentaje'] >= 80,
    ]);

} catch (Exception $e) {
    error_log('[eval_publico/guardar] ' . $e->getMessage());
    jsonResponse(false, 'Error al registrar la evaluación. Intenta nuevamente.', null, 500);
}
