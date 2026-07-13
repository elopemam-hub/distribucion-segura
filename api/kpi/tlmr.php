<?php
// ============================================================
// API: KPI Analytics — TLMR / TLMC / TLMD Dashboard
// ============================================================

require_once __DIR__ . '/../../includes/auth.php';

requireLogin();
if (!tieneAccesoModulo('kpi_analytics')) {
    jsonResponse(false, 'Acceso no autorizado.', null, 403);
}

$user   = getCurrentUser();
$action = $_GET['action'] ?? 'multi_dashboard';

try {
    switch ($action) {
        case 'meta':            tlmrMeta();           break;
        case 'dashboard':       tlmrDashboard();      break;
        case 'multi_dashboard': tlmrMultiDashboard(); break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Exception $e) {
    error_log('[kpi/tlmr] ' . $e->getMessage());
    jsonResponse(false, $e->getMessage(), null, 500);
}

// ── Acceso al dataset ─────────────────────────────────────────
function tlmrDataset(int $id): array {
    global $user;
    $ds = db()->fetchOne(
        "SELECT id, nombre, columnas, total_filas, mapeo, creado_por
         FROM kpi_datasets WHERE id = ?", [$id]
    );
    if (!$ds) jsonResponse(false, 'Dataset no encontrado.', null, 404);
    $ds['columnas'] = json_decode($ds['columnas'], true) ?? [];
    return $ds;
}

// ── Clasificar columnas ───────────────────────────────────────
function tlmrClasificar(array $columnas): array {
    $fechaCols = $dimCols = $metCols = [];
    foreach ($columnas as $col) {
        match ($col['tipo']) {
            'fecha'     => $fechaCols[] = $col['nombre'],
            'dimension' => $dimCols[]   = $col['nombre'],
            'metrica'   => $metCols[]   = $col['nombre'],
            default     => null,
        };
    }

    $placaP = ['placa','vehic','unidad','unit','plate','auto','camion'];
    $reglaP = ['regla','rule','evento','tipo','alerta','infrac','event'];
    $reglaCol = $placaCol = '';

    foreach ($dimCols as $c) {
        $low = strtolower($c);
        if (!$placaCol) foreach ($placaP as $p) if (stripos($low, $p) !== false) { $placaCol = $c; break; }
        if (!$reglaCol) foreach ($reglaP as $p) if (stripos($low, $p) !== false) { $reglaCol = $c; break; }
    }
    foreach ($dimCols as $c) {
        if (!$reglaCol && $c !== $placaCol) $reglaCol = $c;
        if (!$placaCol && $c !== $reglaCol) $placaCol = $c;
    }

    return [
        'fecha_cols' => $fechaCols,
        'dim_cols'   => $dimCols,
        'met_cols'   => $metCols,
        'regla_col'  => $reglaCol,
        'placa_col'  => $placaCol,
        'fecha_col'  => $fechaCols[0] ?? '',
        'met_col'    => $metCols[0]   ?? '',
    ];
}

// ── META ──────────────────────────────────────────────────────
function tlmrMeta(): void {
    $datasetId = (int)($_GET['dataset_id'] ?? 0);
    if ($datasetId <= 0) jsonResponse(false, 'dataset_id requerido.', null, 400);
    $ds   = tlmrDataset($datasetId);
    $cols = tlmrClasificar($ds['columnas']);
    $cnt  = db()->fetchOne("SELECT COUNT(*) AS n FROM kpi_data WHERE dataset_id = ?", [$datasetId]);
    jsonResponse(true, '', [
        'nombre'     => $ds['nombre'],
        'fecha_col'  => $cols['fecha_col'],
        'regla_col'  => $cols['regla_col'],
        'placa_col'  => $cols['placa_col'],
        'total_rows' => (int)($cnt['n'] ?? 0),
    ]);
}

// ── DASHBOARD (single dataset) ────────────────────────────────
function tlmrDashboard(): void {
    $body      = json_decode(file_get_contents('php://input'), true) ?? [];
    $datasetId = (int)($body['dataset_id'] ?? 0);
    if ($datasetId <= 0) jsonResponse(false, 'dataset_id requerido.', null, 400);
    $ds   = tlmrDataset($datasetId);
    $cols = tlmrClasificar($ds['columnas']);
    // Delegate to shared processor
    $result = tlmrProcesar([$datasetId], $cols, $body);
    jsonResponse(true, '', $result);
}

// ── MULTI DASHBOARD (TLMR + TLMC + TLMD) ─────────────────────
function tlmrMultiDashboard(): void {
    $body       = json_decode(file_get_contents('php://input'), true) ?? [];
    $tiposList  = $body['tipos']      ?? ['TLMR', 'TLMC', 'TLMD'];
    $resultados = [];

    foreach ($tiposList as $tipo) {
        $tipo = strtoupper(trim($tipo));

        // Buscar todos los datasets con este tipo_codigo
        $datasets = db()->fetchAll(
            "SELECT id, columnas FROM kpi_datasets
             WHERE JSON_UNQUOTE(JSON_EXTRACT(mapeo, '$.tipo_codigo')) = ?
             ORDER BY creado_en DESC",
            [$tipo]
        );

        if (!$datasets) {
            $resultados[$tipo] = ['found' => false, 'total' => 0];
            continue;
        }

        $cols = tlmrClasificar(json_decode($datasets[0]['columnas'], true) ?? []);
        $ids  = array_column($datasets, 'id');
        $data = tlmrProcesar($ids, $cols, $body);
        $resultados[$tipo] = array_merge(['found' => true, 'datasets_count' => count($ids)], $data);
    }

    jsonResponse(true, '', ['tipos' => $resultados]);
}

// ── Procesador central ────────────────────────────────────────
function tlmrProcesar(array $datasetIds, array $cols, array $params): array {
    $fechaCol   = trim($params['fecha_col']   ?? $cols['fecha_col']);
    $reglaCol   = trim($params['regla_col']   ?? $cols['regla_col']);
    $placaCol   = trim($params['placa_col']   ?? $cols['placa_col']);
    $fechaDesde = trim($params['fecha_desde'] ?? '');
    $fechaHasta = trim($params['fecha_hasta'] ?? '');
    $groupBy    = $params['group_by']         ?? 'dia';
    $maxRows    = min((int)($params['max_rows'] ?? 30000), 100000);
    $metCol     = $cols['met_col'];

    // Fetch filas
    $placeholders = implode(',', array_fill(0, count($datasetIds), '?'));
    $raw = db()->fetchAll(
        "SELECT fila FROM kpi_data WHERE dataset_id IN ($placeholders) ORDER BY num_fila LIMIT ?",
        [...$datasetIds, $maxRows]
    );
    $rows = array_map(fn($r) => json_decode($r['fila'], true) ?? [], $raw);

    // Filtro fecha
    if ($fechaCol && ($fechaDesde || $fechaHasta)) {
        $rows = array_values(array_filter($rows, function ($row) use ($fechaCol, $fechaDesde, $fechaHasta) {
            $iso = tlmrToIso((string)($row[$fechaCol] ?? ''));
            if ($fechaDesde && $iso < $fechaDesde) return false;
            if ($fechaHasta && $iso > $fechaHasta) return false;
            return true;
        }));
    }

    // KPI total — siempre contar filas (nº de eventos/alertas)
    $total = count($rows);

    // ── Mensual: 12 meses fijos — contar filas ──
    $MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    $mensualData = array_fill(0, 12, 0);
    if ($fechaCol) {
        foreach ($rows as $row) {
            $iso = tlmrToIso((string)($row[$fechaCol] ?? ''));
            if (preg_match('/^\d{4}-(\d{1,2})-/', $iso, $m)) {
                $mi = (int)$m[1] - 1;
                if ($mi >= 0 && $mi < 12) $mensualData[$mi]++;
            }
        }
    }
    $mensual = ['labels' => $MESES, 'data' => $mensualData];

    // ── Por Regla — contar filas ──
    $porRegla = ['col' => $reglaCol, 'labels' => [], 'data' => []];
    if ($reglaCol) {
        $grp = [];
        foreach ($rows as $row) {
            $k = (string)($row[$reglaCol] ?? '(Sin datos)');
            $grp[$k] = ($grp[$k] ?? 0) + 1;
        }
        arsort($grp);
        $porRegla['labels'] = array_keys($grp);
        $porRegla['data']   = array_values($grp);
    }

    // ── Por Placa top 5 — contar filas ──
    $porPlaca = ['col' => $placaCol, 'labels' => [], 'data' => []];
    if ($placaCol && $placaCol !== $reglaCol) {
        $grp = [];
        foreach ($rows as $row) {
            $k = (string)($row[$placaCol] ?? '(Sin datos)');
            $grp[$k] = ($grp[$k] ?? 0) + 1;
        }
        arsort($grp);
        $top = array_slice($grp, 0, 5, true);
        $porPlaca['labels'] = array_keys($top);
        $porPlaca['data']   = array_values($top);
    }

    // ── Matriz: Regla × Período — contar filas ──
    $matriz = ['reglas' => [], 'periods' => [], 'data' => []];
    if ($reglaCol && $fechaCol) {
        $grpData = [];
        foreach ($rows as $row) {
            $regla  = (string)($row[$reglaCol] ?? '');
            if ($regla === '') continue;
            $period = tlmrMatrizPeriod((string)($row[$fechaCol] ?? ''), $groupBy);
            if ($period === null) continue;
            $grpData[$regla][$period] = ($grpData[$regla][$period] ?? 0) + 1;
        }

        // Períodos: rellenar todos según agrupación
        switch ($groupBy) {
            case 'dia':
                $allPeriods = array_map('strval', range(1, 31));
                break;
            case 'mes':
                $allPeriods = array_map('strval', range(1, 12));
                break;
            default: // semana — usar solo los encontrados
                $found = [];
                foreach ($grpData as $r => $pd) { foreach ($pd as $p => $_) $found[(int)$p] = $p; }
                ksort($found);
                $allPeriods = array_values($found);
        }

        $reglaTotals = [];
        foreach ($grpData as $r => $pd) $reglaTotals[$r] = array_sum($pd);
        arsort($reglaTotals);

        $matriz['reglas']  = array_keys($reglaTotals);
        $matriz['periods'] = $allPeriods;
        $matriz['data']    = $grpData;
    }

    // ── Detalle por Mes: {mes → {reglas, data:{regla→{dia→count}}}} ──
    $porMesDetalle = [];
    if ($reglaCol && $fechaCol) {
        foreach ($rows as $row) {
            $regla = (string)($row[$reglaCol] ?? '');
            if ($regla === '') continue;
            $iso = tlmrToIso((string)($row[$fechaCol] ?? ''));
            if (!preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $iso, $m)) continue;
            $mes = (int)$m[2]; // 1-12
            $dia = (int)$m[3]; // 1-31
            $porMesDetalle[$mes][$regla][$dia] = ($porMesDetalle[$mes][$regla][$dia] ?? 0) + 1;
        }
        ksort($porMesDetalle);
        foreach ($porMesDetalle as $mes => &$mesBlock) {
            $totals = [];
            foreach ($mesBlock as $r => $dias) $totals[$r] = array_sum($dias);
            arsort($totals);
            $mesBlock = ['reglas' => array_keys($totals), 'data' => $mesBlock];
        }
        unset($mesBlock);
    }

    return [
        'total'          => $total,
        'rows'           => count($rows),
        'fecha_col'      => $fechaCol,
        'regla_col'      => $reglaCol,
        'placa_col'      => $placaCol,
        'met_col'        => $metCol,
        'mensual'        => $mensual,
        'por_regla'      => $porRegla,
        'por_placa'      => $porPlaca,
        'matriz'         => $matriz,
        'por_mes_detalle'=> $porMesDetalle,
    ];
}

// ── Utilidades ────────────────────────────────────────────────
function tlmrVals(array $rows, string $col): array {
    return array_values(array_filter(
        array_map(fn($r) => is_numeric($r[$col] ?? null) ? (float)$r[$col] : null, $rows),
        fn($v) => $v !== null
    ));
}

function tlmrToIso(string $val): string {
    $val = trim($val);
    if ($val === '') return '';

    // YYYY-M-D o YYYY-MM-DD (con o sin ceros, con o sin hora)
    if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})/', $val, $m)) {
        return sprintf('%04d-%02d-%02d', $m[1], $m[2], $m[3]);
    }
    // DD/MM/YYYY o D/M/YYYY  (formato latinoamericano)
    if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})/', $val, $m)) {
        return sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]);
    }
    // DD-MM-YYYY o D-M-YYYY  (guiones)
    if (preg_match('/^(\d{1,2})-(\d{1,2})-(\d{4})$/', $val, $m)) {
        return sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]);
    }
    // YYYY/MM/DD o YYYY/M/D
    if (preg_match('/^(\d{4})\/(\d{1,2})\/(\d{1,2})/', $val, $m)) {
        return sprintf('%04d-%02d-%02d', $m[1], $m[2], $m[3]);
    }
    // DD.MM.YYYY
    if (preg_match('/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/', $val, $m)) {
        return sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]);
    }
    // YYYYMMDD (sin separadores)
    if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $val, $m)) {
        return sprintf('%04d-%02d-%02d', $m[1], $m[2], $m[3]);
    }
    // Número serial de Excel (p. ej. 46107 = 2026-03-15)
    if (preg_match('/^\d{5}$/', $val)) {
        $ts = ((int)$val - 25569) * 86400;
        if ($ts > 0) return gmdate('Y-m-d', $ts);
    }

    return $val;
}

function tlmrGroupKey(string $val, string $by): string {
    $iso = tlmrToIso($val);
    if ($iso === '') return '(Sin fecha)';
    if ($by === 'mes'    && preg_match('/^(\d{4}-\d{2})/', $iso, $m)) return $m[1];
    if ($by === 'semana' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $iso)) {
        try { $dt = new DateTime($iso); return $dt->format('Y') . '-S' . str_pad($dt->format('W'), 2, '0', STR_PAD_LEFT); }
        catch (Exception $e) {}
    }
    return strlen($iso) >= 10 ? substr($iso, 0, 10) : $iso;
}

function tlmrMatrizPeriod(string $dateVal, string $groupBy): ?string {
    if ($dateVal === '') return null;
    $iso = tlmrToIso($dateVal);
    if (!preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $iso, $m)) return null;
    if ($groupBy === 'dia')     return (string)(int)$m[3];   // día del mes 1-31
    if ($groupBy === 'mes')     return (string)(int)$m[2];   // mes 1-12
    if ($groupBy === 'semana') {
        try { $dt = new DateTime($iso); return (string)(int)$dt->format('W'); }
        catch (Exception $e) {}
    }
    return (string)(int)$m[3];
}
