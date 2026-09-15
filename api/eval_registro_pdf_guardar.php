<?php
// ============================================================
// API: GUARDAR EL REGISTRO DE ASISTENCIA (PDF) ADJUNTO A UNA EVALUACIÓN
// Recibe el PDF generado en el navegador (jsPDF, base64) y lo almacena en
// uploads/evaluaciones/, guardando la ruta en evaluaciones.registro_pdf.
// Archivo: api/eval_registro_pdf_guardar.php  (POST: id, pdf=base64|dataURL)
// ============================================================

require_once __DIR__ . '/../includes/auth.php';
requireLogin();
requireCsrf();
if (function_exists('setupEvalFormularios')) setupEvalFormularios();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Método no permitido.', null, 405);
}

$id  = (int)($_POST['id'] ?? 0);
$pdf = (string)($_POST['pdf'] ?? '');
if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);

// Verifica que la evaluación exista.
$eval = db()->fetchOne("SELECT id, registro_pdf FROM evaluaciones WHERE id = ?", [$id]);
if (!$eval) jsonResponse(false, 'Evaluación no encontrada.', null, 404);

// Acepta data URL (data:application/pdf;base64,....) o base64 puro.
if (strpos($pdf, 'base64,') !== false) $pdf = substr($pdf, strpos($pdf, 'base64,') + 7);
$bin = base64_decode($pdf, true);
if ($bin === false || strlen($bin) < 200) jsonResponse(false, 'PDF inválido.', null, 422);
if (strncmp($bin, '%PDF', 4) !== 0)       jsonResponse(false, 'El archivo no es un PDF válido.', null, 422);
if (strlen($bin) > 15 * 1024 * 1024)      jsonResponse(false, 'El PDF es demasiado grande.', null, 413);

$dir = __DIR__ . '/../uploads/evaluaciones/';
if (!is_dir($dir)) mkdir($dir, 0755, true);

$filename = 'registro_eval_' . $id . '_' . date('Ymd_His') . '.pdf';
if (file_put_contents($dir . $filename, $bin) === false) {
    jsonResponse(false, 'No se pudo guardar el archivo.', null, 500);
}
@chmod($dir . $filename, 0644);

// Borra el anterior si lo hubiera (evita basura al regenerar).
if (!empty($eval['registro_pdf']) && is_file(__DIR__ . '/../uploads/' . $eval['registro_pdf'])) {
    @unlink(__DIR__ . '/../uploads/' . $eval['registro_pdf']);
}

$ruta = 'evaluaciones/' . $filename;
db()->query("UPDATE evaluaciones SET registro_pdf = ? WHERE id = ?", [$ruta, $id]);

jsonResponse(true, 'Registro PDF guardado.', ['registro_pdf' => $ruta]);
