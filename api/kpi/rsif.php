<?php
// ============================================================
// API: KPI Analytics — Dashboard RSIF (Ruta SIF)
// ============================================================

require_once __DIR__ . '/../../includes/auth.php';

requireLogin();
if (!tieneAccesoModulo('kpi_analytics')) {
    jsonResponse(false, 'Acceso no autorizado.', null, 403);
}

$action = $_GET['action'] ?? 'dashboard';

try {
    switch ($action) {
        case 'columns':   rsifColumns();   break;
        case 'dashboard': rsifDashboard(); break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Exception $e) {
    error_log('[kpi/rsif] ' . $e->getMessage());
    jsonResponse(false, $e->getMessage(), null, 500);
}

// ── Listar columnas disponibles ───────────────────────────────
function rsifColumns(): void {
    $datasets = db()->fetchAll(
        "SELECT columnas FROM kpi_datasets
         WHERE JSON_UNQUOTE(JSON_EXTRACT(mapeo, '$.tipo_codigo')) = 'RSIF'
         ORDER BY creado_en DESC LIMIT 1"
    );
    if (!$datasets) { jsonResponse(true, '', []); return; }
    $cols = json_decode($datasets[0]['columnas'], true) ?? [];
    $result = array_values(array_filter(
        array_map(fn($c) => ['nombre' => $c['nombre'], 'tipo' => $c['tipo']], $cols),
        fn($c) => ($c['tipo'] ?? '') !== 'ignorar'
    ));
    jsonResponse(true, '', $result);
}

// ── Clasificar columnas ───────────────────────────────────────
function rsifClasificar(array $columnas, array $overrides = []): array {
    $fechaCols = $dimCols = $metCols = $allCols = [];
    foreach ($columnas as $col) {
        $nombre = $col['nombre'];
        $tipo   = $col['tipo'];
        if ($tipo === 'ignorar') continue;
        $allCols[] = $nombre;
        match ($tipo) {
            'fecha'     => $fechaCols[] = $nombre,
            'metrica'   => $metCols[]   = $nombre,
            default     => $dimCols[]   = $nombre,
        };
    }

    // Si no hay columna tipo 'fecha', buscar en dimensiones por nombre
    $fechaKw = ['fecha', 'date', 'dia', 'día', 'mes', 'año', 'year', 'month', 'semana', 'periodo', 'time', 'fec'];
    if (!$fechaCols) {
        foreach ($dimCols as $c) {
            $low = strtolower($c);
            foreach ($fechaKw as $k) {
                if (str_contains($low, $k)) { $fechaCols[] = $c; break; }
            }
        }
    }

    $placaP    = ['placa', 'vehic', 'unidad', 'unit', 'plate', 'camion', 'auto', 'movil', 'matricula'];
    $distritoP = ['distrito', 'district', 'zona', 'ciudad', 'localidad', 'area', 'region', 'provincia', 'lugar'];
    $tiempoP   = ['tiempo', 'duracion', 'duration', 'hora', 'horas', 'minuto', 'tprom', 't.prom', 'ejecutado', 'transit', 'trayecto'];

    $placaCol = $distritoCol = $tiempoCol = '';

    // Prioridad exacta: columna cuyo nombre sea "Distrito" (cualquier casing)
    foreach ($dimCols as $c) {
        if (!$distritoCol && strtolower(trim($c)) === 'distrito') { $distritoCol = $c; break; }
    }

    foreach ($dimCols as $c) {
        $low = strtolower($c);
        if (!$placaCol)    foreach ($placaP    as $p) if (str_contains($low, $p)) { $placaCol    = $c; break; }
        if (!$distritoCol) foreach ($distritoP as $p) if (str_contains($low, $p)) { $distritoCol = $c; break; }
    }
    foreach ($metCols as $c) {
        $low = strtolower($c);
        if (!$tiempoCol) foreach ($tiempoP as $p) if (str_contains($low, $p)) { $tiempoCol = $c; break; }
    }
    foreach ($dimCols as $c) {
        $low = strtolower($c);
        if (!$tiempoCol) foreach ($tiempoP as $p) if (str_contains($low, $p)) { $tiempoCol = $c; break; }
    }

    $auto = [
        'fecha_col'    => $fechaCols[0] ?? '',
        'placa_col'    => $placaCol,
        'distrito_col' => $distritoCol,
        'tiempo_col'   => $tiempoCol,
        'all_cols'     => $allCols,
    ];

    // Aplicar overrides del usuario
    $map = ['col_fecha' => 'fecha_col', 'col_placa' => 'placa_col',
            'col_distrito' => 'distrito_col', 'col_tiempo' => 'tiempo_col'];
    foreach ($map as $bodyKey => $autoKey) {
        $v = trim($overrides[$bodyKey] ?? '');
        if ($v !== '' && in_array($v, $allCols)) $auto[$autoKey] = $v;
    }

    return $auto;
}

// ── Dashboard principal ───────────────────────────────────────
function rsifDashboard(): void {
    $body       = json_decode(file_get_contents('php://input'), true) ?? [];
    $fechaDesde = trim($body['fecha_desde'] ?? '');
    $fechaHasta = trim($body['fecha_hasta'] ?? '');
    $maxRows    = min((int)($body['max_rows'] ?? 100000), 500000);

    $datasets = db()->fetchAll(
        "SELECT id, columnas FROM kpi_datasets
         WHERE JSON_UNQUOTE(JSON_EXTRACT(mapeo, '$.tipo_codigo')) = 'RSIF'
         ORDER BY creado_en DESC"
    );
    if (!$datasets) {
        jsonResponse(true, '', ['found' => false, 'total' => 0, 'datasets_count' => 0]);
        return;
    }

    $cols = rsifClasificar(json_decode($datasets[0]['columnas'], true) ?? [], $body);
    $ids  = array_column($datasets, 'id');

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $raw = db()->fetchAll(
        "SELECT fila FROM kpi_data WHERE dataset_id IN ($placeholders) ORDER BY num_fila LIMIT ?",
        [...$ids, $maxRows]
    );
    $rows = array_map(fn($r) => json_decode($r['fila'], true) ?? [], $raw);

    $fechaCol    = $cols['fecha_col'];
    $placaCol    = $cols['placa_col'];
    $distritoCol = $cols['distrito_col'];
    $tiempoCol   = $cols['tiempo_col'];

    // ── Años disponibles (antes del filtro para que siempre se listen todos) ──
    $añosDisp = [];
    if ($fechaCol) {
        foreach ($rows as $row) {
            $iso = rsifToIso((string)($row[$fechaCol] ?? ''));
            if (preg_match('/^(\d{4})-/', $iso, $m)) {
                $yr = (int)$m[1];
                if ($yr >= 2000 && $yr <= 2100) $añosDisp[$yr] = true;
            }
        }
        ksort($añosDisp);
        $añosDisp = array_keys($añosDisp);
    }

    // Filtro fecha
    if ($fechaCol && ($fechaDesde || $fechaHasta)) {
        $rows = array_values(array_filter($rows, function ($row) use ($fechaCol, $fechaDesde, $fechaHasta) {
            $iso = rsifToIso((string)($row[$fechaCol] ?? ''));
            if ($iso === '') return true;
            if ($fechaDesde && $iso < $fechaDesde) return false;
            if ($fechaHasta && $iso > $fechaHasta) return false;
            return true;
        }));
    }

    $total = count($rows);

    // ── Placas únicas (global) ──
    $placasSet = [];
    if ($placaCol) {
        foreach ($rows as $row) {
            $p = trim((string)($row[$placaCol] ?? ''));
            if ($p !== '') $placasSet[$p] = true;
        }
    }
    $placasUnicas = count($placasSet);

    // ── Tiempo promedio ──
    $tiempoProm = null;
    if ($tiempoCol) {
        $tiempoVals = [];
        foreach ($rows as $row) {
            $v = rsifParseMinutos((string)($row[$tiempoCol] ?? ''));
            if ($v !== null) $tiempoVals[] = $v;
        }
        if ($tiempoVals) {
            $avg = array_sum($tiempoVals) / count($tiempoVals);
            $tiempoProm = rsifFormatTime($avg);
        }
    }

    // ── Helpers de fecha por fila ──
    $MESES_ES   = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    $DIAS_ES    = ['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];

    // Parsear fecha de cada fila una sola vez
    $rowParsed = [];
    foreach ($rows as $i => $row) {
        $iso   = $fechaCol ? rsifToIso((string)($row[$fechaCol] ?? '')) : '';
        $mes   = null; $dia = null; $semana = null; $diaSem = null; $trimestre = null;
        if ($iso !== '' && preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})$/', $iso, $m)) {
            $mes       = (int)$m[2];
            $dia       = (int)$m[3];
            $trimestre = (int)ceil($mes / 3);
            try {
                $dt     = new DateTime($iso);
                $semana = (int)$dt->format('W');
                $diaSem = (int)$dt->format('N'); // 1=lun, 7=dom
            } catch (Exception $e) {}
        }
        $rowParsed[$i] = compact('iso', 'mes', 'dia', 'semana', 'diaSem', 'trimestre');
    }

    // ── Por Mes (con "(En blanco)") ──
    $mesData = array_fill(0, 13, 0); // 0=blank, 1-12=meses
    foreach ($rowParsed as $p) {
        $key = $p['mes'] ?? 0;
        $mesData[$key] = ($mesData[$key] ?? 0) + 1;
    }
    $porMesLabels = [];
    $porMesData   = [];
    for ($i = 1; $i <= 12; $i++) {
        $porMesLabels[] = $MESES_ES[$i - 1];
        $porMesData[]   = $mesData[$i];
    }
    $porMes = ['labels' => $porMesLabels, 'data' => $porMesData];

    // ── Por Semana ──
    $semData = [];
    foreach ($rowParsed as $p) {
        $key = $p['semana'] ?? null;
        if ($key === null) { $semData[0] = ($semData[0] ?? 0) + 1; }
        else               { $semData[$key] = ($semData[$key] ?? 0) + 1; }
    }
    ksort($semData);
    $semLabels = []; $semVals = [];
    foreach ($semData as $k => $v) {
        $semLabels[] = $k === 0 ? '(En blanco)' : (string)$k;
        $semVals[]   = $v;
    }
    $porSemana = ['labels' => $semLabels, 'data' => $semVals];

    // ── Por Día de la Semana ──
    $diaData = array_fill(1, 7, 0);
    foreach ($rowParsed as $p) {
        if ($p['diaSem']) $diaData[$p['diaSem']] = ($diaData[$p['diaSem']] ?? 0) + 1;
    }
    $porDiaSemana = ['labels' => $DIAS_ES, 'data' => array_values($diaData)];

    // ── Por Trimestre ──
    $trimData = [0 => 0, 1 => 0, 2 => 0, 3 => 0, 4 => 0];
    foreach ($rowParsed as $p) {
        $t = $p['trimestre'] ?? 0;
        $trimData[$t] = ($trimData[$t] ?? 0) + 1;
    }
    $porTrimestre = [
        'labels' => ['T1', 'T2', 'T3', 'T4'],
        'data'   => [$trimData[1], $trimData[2], $trimData[3], $trimData[4]],
    ];

    // ── Por Placa (global, top 20) ──
    $placaGlobal = [];
    if ($placaCol) {
        foreach ($rows as $row) {
            $p = trim((string)($row[$placaCol] ?? ''));
            if ($p === '') continue;
            $placaGlobal[$p] = ($placaGlobal[$p] ?? 0) + 1;
        }
        arsort($placaGlobal);
    }
    $top20     = array_slice($placaGlobal, 0, 10, true);
    $porPlaca  = ['labels' => array_keys($top20), 'data' => array_values($top20)];

    // ── Placa + Distrito global (tabla) ──
    $placaDisGlobal = [];
    if ($placaCol) {
        foreach ($rows as $row) {
            $p = trim((string)($row[$placaCol] ?? ''));
            if ($p === '') continue;
            $dRaw = $distritoCol ? trim((string)($row[$distritoCol] ?? '')) : '';
            $d    = $dRaw !== '' ? mb_convert_case(mb_strtolower($dRaw, 'UTF-8'), MB_CASE_TITLE, 'UTF-8') : '';
            $key = $p . '|||' . $d;
            $placaDisGlobal[$key] = ($placaDisGlobal[$key] ?? 0) + 1;
        }
        arsort($placaDisGlobal);
    }
    $placaDisGlobalArr = [];
    foreach ($placaDisGlobal as $key => $cnt) {
        [$pla, $dis] = explode('|||', $key, 2);
        $placaDisGlobalArr[] = ['placa' => $pla, 'total' => $cnt, 'distrito' => $dis];
    }

    // ── Por Distrito ──
    $porDistrito = ['col' => $distritoCol, 'labels' => [], 'data' => [],
                    'meses' => [], 'matriz' => [], 'totales' => []];
    if ($distritoCol) {
        $distGrp = [];
        $distMes = [];
        foreach ($rows as $i => $row) {
            $d = mb_convert_case(mb_strtolower(trim((string)($row[$distritoCol] ?? '')), 'UTF-8'), MB_CASE_TITLE, 'UTF-8');
            if ($d === '') $d = '(En blanco)';
            $distGrp[$d] = ($distGrp[$d] ?? 0) + 1;
            $mes = $rowParsed[$i]['mes'];
            if ($mes) {
                $mesLabel = $MESES_ES[$mes - 1];
                $distMes[$d][$mesLabel] = ($distMes[$d][$mesLabel] ?? 0) + 1;
            }
        }
        arsort($distGrp);

        // Calcular qué meses tienen datos (orden cronológico)
        $mesesConDatos = [];
        for ($i = 1; $i <= 12; $i++) {
            if ($mesData[$i] > 0) $mesesConDatos[] = $MESES_ES[$i - 1];
        }

        $porDistrito['labels']  = array_keys($distGrp);
        $porDistrito['data']    = array_values($distGrp);
        $porDistrito['meses']   = $mesesConDatos;
        $porDistrito['matriz']  = $distMes;
        $porDistrito['totales'] = $distGrp;
    }

    // ── Detalle por mes ──
    $detallePorMes = [];
    foreach ($rows as $i => $row) {
        $p     = $rowParsed[$i];
        $mesKey = (string)($p['mes'] ?? 0); // '0' = blank
        $dia   = $p['dia'];

        $detallePorMes[$mesKey]['total'] = ($detallePorMes[$mesKey]['total'] ?? 0) + 1;
        if ($dia) {
            $detallePorMes[$mesKey]['por_dia'][$dia] = ($detallePorMes[$mesKey]['por_dia'][$dia] ?? 0) + 1;
        }
        if ($placaCol) {
            $pl   = trim((string)($row[$placaCol] ?? ''));
            $diRaw = $distritoCol ? trim((string)($row[$distritoCol] ?? '')) : '';
            $di   = $diRaw !== '' ? mb_convert_case(mb_strtolower($diRaw, 'UTF-8'), MB_CASE_TITLE, 'UTF-8') : '';
            if ($pl !== '') {
                $detallePorMes[$mesKey]['placas_set'][$pl] = true;
                $pkey = $pl . '|||' . $di;
                $detallePorMes[$mesKey]['pd'][$pkey] = ($detallePorMes[$mesKey]['pd'][$pkey] ?? 0) + 1;
            }
        }
    }
    ksort($detallePorMes);

    // Limpiar y armar detalle final
    $detalleFinal = [];
    foreach ($detallePorMes as $mesKey => $d) {
        $pdArr = [];
        if (!empty($d['pd'])) {
            arsort($d['pd']);
            foreach ($d['pd'] as $k => $cnt) {
                [$pla, $dis] = explode('|||', $k, 2);
                $pdArr[] = ['placa' => $pla, 'total' => $cnt, 'distrito' => $dis];
            }
        }
        $detalleFinal[$mesKey] = [
            'total'         => $d['total']  ?? 0,
            'por_dia'       => $d['por_dia'] ?? [],
            'placas_unicas' => count($d['placas_set'] ?? []),
            'placa_distrito'=> $pdArr,
        ];
    }

    // ── Tiempo promedio por mes ──
    $tiempoPorMes = [];
    if ($tiempoCol) {
        foreach ($rows as $i => $row) {
            $v = rsifParseMinutos((string)($row[$tiempoCol] ?? ''));
            if ($v === null) continue;
            $mesKey = (string)($rowParsed[$i]['mes'] ?? 0);
            $tiempoPorMes[$mesKey][] = $v;
        }
        foreach ($tiempoPorMes as $mk => $vals) {
            $avg = array_sum($vals) / count($vals);
            $tiempoPorMes[$mk] = rsifFormatTime($avg);
        }
    }

    jsonResponse(true, '', [
        'found'                => true,
        'años'                 => $añosDisp,
        'datasets_count'       => count($ids),
        'total'                => $total,
        'placas_unicas'        => $placasUnicas,
        'tiempo_promedio'      => $tiempoProm,
        'cols'                 => $cols,
        'por_placa'            => $porPlaca,
        'placa_dis_global'     => $placaDisGlobalArr,
        'por_mes'              => $porMes,
        'por_semana'           => $porSemana,
        'por_dia_semana'       => $porDiaSemana,
        'por_trimestre'        => $porTrimestre,
        'por_distrito'         => $porDistrito,
        'detalle_por_mes'      => $detalleFinal,
        'tiempo_por_mes'       => $tiempoPorMes,
    ]);
}

// ── Utilidades ────────────────────────────────────────────────
function rsifToIso(string $val): string {
    $val = trim($val);
    if ($val === '') return '';
    if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})/', $val, $m))
        return sprintf('%04d-%02d-%02d', $m[1], $m[2], $m[3]);
    if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})/', $val, $m))
        return sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]);
    if (preg_match('/^(\d{1,2})-(\d{1,2})-(\d{4})$/', $val, $m))
        return sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]);
    if (preg_match('/^(\d{4})\/(\d{1,2})\/(\d{1,2})/', $val, $m))
        return sprintf('%04d-%02d-%02d', $m[1], $m[2], $m[3]);
    if (preg_match('/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/', $val, $m))
        return sprintf('%04d-%02d-%02d', $m[3], $m[2], $m[1]);
    if (preg_match('/^(\d{4})(\d{2})(\d{2})$/', $val, $m))
        return sprintf('%04d-%02d-%02d', $m[1], $m[2], $m[3]);
    if (preg_match('/^\d{5}$/', $val)) {
        $ts = ((int)$val - 25569) * 86400;
        if ($ts > 0) return gmdate('Y-m-d', $ts);
    }
    return $val;
}

function rsifParseMinutos(string $val): ?float {
    $val = trim($val);
    if ($val === '') return null;
    // HH:MM:SS  (p.ej. "11:32:05")
    if (preg_match('/^(\d{1,3}):(\d{2}):(\d{2})$/', $val, $m))
        return (float)$m[1] * 60 + (float)$m[2] + (float)$m[3] / 60;
    // HH:MM  (p.ej. "11:30")
    if (preg_match('/^(\d{1,3}):(\d{2})$/', $val, $m))
        return (float)$m[1] * 60 + (float)$m[2];
    // "Xh Ym"  (p.ej. "2h 30m")
    if (preg_match('/^(\d+)h\s*(\d+)m?$/i', $val, $m))
        return (float)$m[1] * 60 + (float)$m[2];
    if (is_numeric($val)) {
        $n = (float)$val;
        if ($n <= 0) return null;
        // Serial de Excel: fracción de día (0 < n < 1) → convertir a minutos
        if ($n < 1) return $n * 24 * 60;
        // Número ≥ 1: asumir que ya son minutos
        return $n;
    }
    return null;
}

function rsifFormatTime(float $minutos): string {
    $h = (int)floor($minutos / 60);
    $m = (int)round(fmod($minutos, 60));
    return "{$h}h {$m}m";
}
