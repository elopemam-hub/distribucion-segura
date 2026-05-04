<?php
// ============================================================
// API: OBTENER DETALLE DE INSPECCIÓN
// Archivo: api/obtener_detalle.php
// ============================================================

require_once __DIR__ . '/../includes/auth.php';

requireLogin();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);

$inspeccion = db()->fetchOne(
    "SELECT i.*, u.nombre as inspector_nombre, u.usuario as inspector_usuario
     FROM inspecciones i
     LEFT JOIN usuarios u ON u.id = i.inspector_id
     WHERE i.id = ?",
    [$id]
);

if (!$inspeccion) jsonResponse(false, 'Inspección no encontrada.', null, 404);

// Restricción por rol
$user = getCurrentUser();
if ($user['rol'] === 'inspector' && $inspeccion['inspector_id'] != $user['id']) {
    jsonResponse(false, 'Acceso no autorizado.', null, 403);
}

$tripulacion = db()->fetchAll(
    "SELECT * FROM tripulacion WHERE inspeccion_id = ? ORDER BY id ASC",
    [$id]
);

$checklist = db()->fetchAll(
    "SELECT * FROM checklist WHERE inspeccion_id = ? ORDER BY id",
    [$id]
);

$evidencias = db()->fetchAll(
    "SELECT * FROM evidencias WHERE inspeccion_id = ? ORDER BY id",
    [$id]
);

$hallazgos = db()->fetchAll(
    "SELECT * FROM hallazgos WHERE inspeccion_id = ? ORDER BY criticidad DESC, id",
    [$id]
);

// Parsear EPP detalle JSON de tripulación
foreach ($tripulacion as &$m) {
    if (!empty($m['epp_detalle'])) {
        $m['epp_detalle'] = json_decode($m['epp_detalle'], true);
    }
}
unset($m); // CRÍTICO: liberar la referencia para que los siguientes foreach no sobrescriban el último elemento

// Calcular desglose de cumplimiento (recalculado en tiempo real)
$totalCheck   = count($checklist);
$cumplenCheck = array_sum(array_column($checklist, 'estado'));
$pctChecklist = $totalCheck > 0 ? round(($cumplenCheck / $totalCheck) * 100, 2) : 0;

$totalEppItems = 5;
$sumaEppPct    = 0;
$miembros      = 0;
foreach ($tripulacion as $miembro) {
    if (empty(trim($miembro['nombre'] ?? ''))) continue;
    $miembros++;
    $tiene = is_array($miembro['epp_detalle']) ? count($miembro['epp_detalle']) : 0;
    $sumaEppPct += ($tiene / $totalEppItems) * 100;
}
$pctEpp = $miembros > 0 ? round($sumaEppPct / $miembros, 2) : 100;

// Resultado ponderado recalculado: 70% checklist + 30% EPP
$resultadoRecalc = round(($pctChecklist * 0.70) + ($pctEpp * 0.30), 2);

$inspeccion['pct_checklist'] = $pctChecklist;
$inspeccion['pct_epp']       = $pctEpp;
$inspeccion['resultado']     = $resultadoRecalc; // sobreescribir con valor recalculado

jsonResponse(true, '', [
    'inspeccion' => $inspeccion,
    'tripulacion'=> $tripulacion,
    'checklist'  => $checklist,
    'evidencias' => $evidencias,
    'hallazgos'  => $hallazgos,
]);