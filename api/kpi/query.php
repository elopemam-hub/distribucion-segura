<?php
// ============================================================
// API: KPI Analytics — Query Engine
// Archivo: api/kpi/query.php
// POST body: {dataset_id, x_col, y_cols:[{col,agg}], filters:[{col,op,val}], max_rows, sort_asc}
// ============================================================

require_once __DIR__ . '/../../includes/auth.php';

requireLogin();
if (!tieneAccesoModulo('kpi_analytics')) {
    jsonResponse(false, 'Acceso no autorizado.', null, 403);
}

$body = json_decode(file_get_contents('php://input'), true);
if (!$body) { jsonResponse(false, 'Payload inválido.', null, 400); }

$user      = getCurrentUser();
$datasetId = (int)($body['dataset_id'] ?? 0);
$xCol      = trim($body['x_col']  ?? '');
$yCols     = $body['y_cols']  ?? [];
$filters   = $body['filters'] ?? [];
$sortAsc   = ($body['sort_asc'] ?? true) !== false;
$maxRows   = min(max((int)($body['max_rows'] ?? 2000), 1), 10000);

if ($datasetId <= 0) jsonResponse(false, 'dataset_id requerido.', null, 400);
if ($xCol === '')    jsonResponse(false, 'x_col requerido.',       null, 400);
if (empty($yCols))  jsonResponse(false, 'y_cols requerido.',       null, 400);

// Verificar acceso al dataset
$dataset = db()->fetchOne("SELECT id, creado_por FROM kpi_datasets WHERE id = ?", [$datasetId]);
if (!$dataset) jsonResponse(false, 'Dataset no encontrado.', null, 404);
if ($user['rol'] !== 'administrador' && (int)$dataset['creado_por'] !== (int)$user['id']) {
    jsonResponse(false, 'Sin permisos.', null, 403);
}

// Fetch rows
$rawRows = db()->fetchAll(
    "SELECT fila FROM kpi_data WHERE dataset_id = ? ORDER BY num_fila LIMIT ?",
    [$datasetId, $maxRows]
);
$rows = array_map(fn($r) => json_decode($r['fila'], true) ?? [], $rawRows);

// Apply filters
$validOps = ['eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'contains'];
foreach ($filters as $f) {
    $col = $f['col'] ?? '';
    $op  = $f['op']  ?? 'eq';
    $val = $f['val'] ?? '';
    if ($col === '' || !in_array($op, $validOps, true)) continue;

    $rows = array_values(array_filter($rows, function ($row) use ($col, $op, $val) {
        $v = (string)($row[$col] ?? '');
        switch ($op) {
            case 'eq':       return strcasecmp($v, (string)$val) === 0
                                 || (is_numeric($val) && is_numeric($v) && (float)$v === (float)$val);
            case 'neq':      return strcasecmp($v, (string)$val) !== 0;
            case 'gt':       return is_numeric($v) && (float)$v >  (float)$val;
            case 'lt':       return is_numeric($v) && (float)$v <  (float)$val;
            case 'gte':      return is_numeric($v) && (float)$v >= (float)$val;
            case 'lte':      return is_numeric($v) && (float)$v <= (float)$val;
            case 'contains': return stripos($v, (string)$val) !== false;
            default:         return true;
        }
    }));
}

// Group by x_col
$groups = [];
foreach ($rows as $row) {
    $key = (string)($row[$xCol] ?? '(vacío)');
    $groups[$key][] = $row;
}

if ($sortAsc) ksort($groups);
$labels = array_keys($groups);

// Aggregate y_cols
$validAggs = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'];
$series    = [];

foreach ($yCols as $yDef) {
    $col = $yDef['col'] ?? '';
    $agg = strtoupper($yDef['agg'] ?? 'SUM');
    if ($col === '' || !in_array($agg, $validAggs, true)) continue;

    $data = [];
    foreach ($groups as $groupRows) {
        if ($agg === 'COUNT') {
            $data[] = count($groupRows);
            continue;
        }
        $vals = array_filter(
            array_map(fn($r) => isset($r[$col]) && is_numeric($r[$col]) ? (float)$r[$col] : null, $groupRows),
            fn($v) => $v !== null
        );
        if (!count($vals)) { $data[] = 0; continue; }
        switch ($agg) {
            case 'SUM': $data[] = round(array_sum($vals), 4); break;
            case 'AVG': $data[] = round(array_sum($vals) / count($vals), 4); break;
            case 'MIN': $data[] = round(min($vals), 4); break;
            case 'MAX': $data[] = round(max($vals), 4); break;
        }
    }

    $name     = $agg === 'COUNT' ? "COUNT({$col})" : "{$col} ({$agg})";
    $series[] = ['name' => $name, 'data' => $data];
}

jsonResponse(true, '', [
    'labels'     => $labels,
    'series'     => $series,
    'total_rows' => count($rawRows),
    'groups'     => count($groups),
    'filtered'   => count($rows),
]);
