<?php
// ============================================================
// API: KPI Analytics — JORLAB (Jornada Laboral)
// Calcula horas trabajadas a partir de columnas ENTRADA/SALIDA
// ============================================================

require_once __DIR__ . '/../../includes/auth.php';

requireLogin();
if (!tieneAccesoModulo('kpi_analytics')) {
    jsonResponse(false, 'Acceso no autorizado.', null, 403);
}

$action = $_GET['action'] ?? 'dashboard';

try {
    switch ($action) {
        case 'columns':   jorlabColumns();   break;
        case 'dashboard': jorlabDashboard(); break;
        case 'debug':     jorlabDebug();     break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Exception $e) {
    error_log('[kpi/jorlab] ' . $e->getMessage());
    jsonResponse(false, $e->getMessage(), null, 500);
}

// ── Columnas disponibles ──────────────────────────────────────
function jorlabColumns(): void {
    $datasets = db()->fetchAll(
        "SELECT columnas FROM kpi_datasets
         WHERE JSON_UNQUOTE(JSON_EXTRACT(mapeo, '$.tipo_codigo')) = 'JORLAB'
         ORDER BY creado_en DESC LIMIT 1"
    );
    if (!$datasets) { jsonResponse(true, '', []); return; }
    $cols = json_decode($datasets[0]['columnas'], true) ?? [];
    jsonResponse(true, '', array_values(array_filter(
        array_map(fn($c) => ['nombre' => $c['nombre'], 'tipo' => $c['tipo']], $cols),
        fn($c) => ($c['tipo'] ?? '') !== 'ignorar'
    )));
}

// ── Detectar columnas ENTRADA / SALIDA ───────────────────────
// Scoring: exact match=3, standalone word=2, substring=1
function jorlabClasificar(array $columnas): array {
    $entradaKw  = ['entrada', 'ingreso', 'inicio', 'checkin', 'check_in', 'start', 'llegada'];
    $salidaKw   = ['salida', 'egreso', 'fin', 'checkout', 'check_out', 'end', 'partida'];
    $empleadoKw = ['empleado', 'trabajador', 'operador', 'conductor', 'nombre', 'worker', 'personal'];
    $areaKw     = ['area', 'área', 'zona', 'sede', 'turno', 'cargo', 'puesto', 'unidad'];

    $best = ['entradaCol' => ['col' => '', 'score' => 0],
             'salidaCol'  => ['col' => '', 'score' => 0],
             'empleadoCol'=> ['col' => '', 'score' => 0],
             'areaCol'    => ['col' => '', 'score' => 0]];

    $score = function (string $colLow, array $keywords): int {
        foreach ($keywords as $k) {
            if ($colLow === $k)                         return 3; // exact
            if (preg_match('/\b' . preg_quote($k, '/') . '\b/', $colLow)) return 2; // word boundary
            if (str_contains($colLow, $k))              return 1; // substring
        }
        return 0;
    };

    $groups = [
        'entradaCol'  => $entradaKw,
        'salidaCol'   => $salidaKw,
        'empleadoCol' => $empleadoKw,
        'areaCol'     => $areaKw,
    ];

    foreach ($columnas as $col) {
        $low = strtolower($col['nombre']);
        foreach ($groups as $key => $kws) {
            $s = $score($low, $kws);
            if ($s > $best[$key]['score']) {
                $best[$key] = ['col' => $col['nombre'], 'score' => $s];
            }
        }
    }

    return [
        'entradaCol'  => $best['entradaCol']['col'],
        'salidaCol'   => $best['salidaCol']['col'],
        'empleadoCol' => $best['empleadoCol']['col'],
        'areaCol'     => $best['areaCol']['col'],
    ];
}

// ── Bucket de duración ───────────────────────────────────────
function jorlabGetBucket(float $h): string {
    if      ($h <  8.0) return '<08h';
    elseif  ($h <  9.0) return '08-09h';
    elseif  ($h < 10.0) return '09-10h';
    elseif  ($h < 10.5) return '10-10:30h';
    elseif  ($h < 11.0) return '10:30-11:00h';
    elseif  ($h < 11.5) return '11:00-11:30h';
    elseif  ($h < 12.0) return '11:30-12:00h';
    else                 return '>12h';
}

// ── Parser de fecha+hora → Unix timestamp ────────────────────
function jorlabToTimestamp(string $val): ?int {
    $val = trim($val);
    if ($val === '') return null;

    // DD/MM/YYYY HH:MM:SS  o  DD/MM/YYYY HH:MM
    if (preg_match('/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}:\d{2}(?::\d{2})?)$/', $val)) {
        $fmt = strlen($val) >= 19 ? 'd/m/Y H:i:s' : 'd/m/Y H:i';
        $dt  = DateTime::createFromFormat($fmt, $val, new DateTimeZone('America/Lima'));
        if ($dt) return $dt->getTimestamp();
    }
    // YYYY-MM-DD HH:MM:SS  o  YYYY-MM-DD HH:MM
    if (preg_match('/^(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}:\d{2}(?::\d{2})?)$/', $val)) {
        $fmt = strlen($val) >= 19 ? 'Y-m-d H:i:s' : 'Y-m-d H:i';
        $dt  = DateTime::createFromFormat($fmt, $val, new DateTimeZone('America/Lima'));
        if ($dt) return $dt->getTimestamp();
    }
    // Excel datetime serial (fracción de día, ej. 46062.2985...)
    if (is_numeric($val)) {
        $n = (float)$val;
        if ($n > 40000 && $n < 60000) {
            return (int)round(($n - 25569) * 86400);
        }
    }
    return null;
}

// ── Dashboard principal ───────────────────────────────────────
function jorlabDashboard(): void {
    $body       = json_decode(file_get_contents('php://input'), true) ?? [];
    $fechaDesde = trim($body['fecha_desde'] ?? '');
    $fechaHasta = trim($body['fecha_hasta'] ?? '');
    $maxRows    = min((int)($body['max_rows'] ?? 100000), 500000);

    $datasets = db()->fetchAll(
        "SELECT id, columnas FROM kpi_datasets
         WHERE JSON_UNQUOTE(JSON_EXTRACT(mapeo, '$.tipo_codigo')) = 'JORLAB'
         ORDER BY creado_en DESC"
    );
    if (!$datasets) {
        jsonResponse(true, '', ['found' => false, 'total' => 0]);
        return;
    }

    $cols       = jorlabClasificar(json_decode($datasets[0]['columnas'], true) ?? []);
    $ids        = array_column($datasets, 'id');
    $ph         = implode(',', array_fill(0, count($ids), '?'));
    $raw        = db()->fetchAll(
        "SELECT fila FROM kpi_data WHERE dataset_id IN ($ph) ORDER BY num_fila LIMIT ?",
        [...$ids, $maxRows]
    );
    $rows = array_map(fn($r) => json_decode($r['fila'], true) ?? [], $raw);

    // ── Mapa de cargos desde tabla personal ──
    $personalRows = db()->fetchAll("SELECT nombre, cargo FROM personal WHERE activo = 1");
    $cargoMap = [];
    foreach ($personalRows as $p) $cargoMap[strtoupper(trim($p['nombre']))] = $p['cargo'];

    $entradaCol = $cols['entradaCol'];
    $salidaCol  = $cols['salidaCol'];

    // ── Años disponibles + rango real (antes del filtro) ──
    $añosDisp = []; $tsMin = PHP_INT_MAX; $tsMax = 0;
    $tz = new DateTimeZone('America/Lima');
    if ($entradaCol) {
        foreach ($rows as $row) {
            $ts = jorlabToTimestamp((string)($row[$entradaCol] ?? ''));
            if ($ts) {
                $yr = (int)(new DateTime('@'.$ts))->setTimezone($tz)->format('Y');
                if ($yr >= 2000 && $yr <= 2100) $añosDisp[$yr] = true;
                if ($ts < $tsMin) $tsMin = $ts;
                if ($ts > $tsMax) $tsMax = $ts;
            }
        }
        ksort($añosDisp);
        $añosDisp = array_keys($añosDisp);
    }
    $rangoReal = [
        'desde' => $tsMin < PHP_INT_MAX ? (new DateTime('@'.$tsMin))->setTimezone($tz)->format('d/m/Y') : null,
        'hasta' => $tsMax > 0           ? (new DateTime('@'.$tsMax))->setTimezone($tz)->format('d/m/Y') : null,
    ];

    // ── Filtro fecha (por ENTRADA) ──
    if ($entradaCol && ($fechaDesde || $fechaHasta)) {
        $rows = array_values(array_filter($rows, function ($row) use ($entradaCol, $fechaDesde, $fechaHasta, $tz) {
            $ts = jorlabToTimestamp((string)($row[$entradaCol] ?? ''));
            if (!$ts) return false; // sin timestamp válido → excluir
            $iso = (new DateTime('@' . $ts))->setTimezone($tz)->format('Y-m-d');
            if ($fechaDesde && $iso < $fechaDesde) return false;
            if ($fechaHasta && $iso > $fechaHasta) return false;
            return true;
        }));
    }

    $MESES_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    $DIAS_ES  = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
    $tz       = new DateTimeZone('America/Lima');

    // ── Procesar filas ──
    $turnos      = [];
    $totalMin    = 0;
    $turnosExtra = 0; // > 8h
    $turnosNoche = 0; // entrada entre 20:00-05:59

    foreach ($rows as $row) {
        if (!$entradaCol || !$salidaCol) break;
        $tsE = jorlabToTimestamp((string)($row[$entradaCol] ?? ''));
        $tsS = jorlabToTimestamp((string)($row[$salidaCol]  ?? ''));
        if (!$tsE || !$tsS) continue;
        $dur = ($tsS - $tsE) / 60; // minutos
        if ($dur < 180 || $dur > 780) continue; // excluye <3h y >13h

        $dtE    = (new DateTime('@' . $tsE))->setTimezone($tz);
        $mes    = (int)$dtE->format('n');
        $dia    = (int)$dtE->format('j');
        $semana = (int)$dtE->format('W');
        $diaSem = (int)$dtE->format('N'); // 1=Lun 7=Dom
        $horaE  = (int)$dtE->format('G'); // 0-23

        $emp = trim((string)($row[$cols['empleadoCol']] ?? '')) ?: 'Sin nombre';

        $totalMin    += $dur;
        if ($dur > 480)                       $turnosExtra++;
        if ($horaE >= 20 || $horaE < 6)       $turnosNoche++;

        $turnos[] = compact('dur', 'mes', 'dia', 'semana', 'diaSem', 'horaE', 'emp', 'tsE', 'tsS');
    }

    $totalTurnos = count($turnos);
    $promMin     = $totalTurnos > 0 ? $totalMin / $totalTurnos : 0;

    // ── Por Mes ──
    $mesMins   = array_fill(1, 12, 0.0);
    $mesTornos = array_fill(1, 12, 0);
    foreach ($turnos as $t) { $mesMins[$t['mes']] += $t['dur']; $mesTornos[$t['mes']]++; }
    $mesProm = [];
    for ($m = 1; $m <= 12; $m++) {
        $mesProm[] = $mesTornos[$m] > 0 ? round($mesMins[$m] / $mesTornos[$m] / 60, 2) : 0;
    }
    $porMes = [
        'labels' => $MESES_ES,
        'horas'  => array_values(array_map(fn($m) => round($m / 60, 1), $mesMins)),
        'turnos' => array_values($mesTornos),
        'prom'   => $mesProm,
    ];

    // ── Por Día de Semana ──
    $diaSemMin   = array_fill(1, 7, 0.0);
    $diaSemCount = array_fill(1, 7, 0);
    foreach ($turnos as $t) { $diaSemMin[$t['diaSem']] += $t['dur']; $diaSemCount[$t['diaSem']]++; }
    $diaSemProm = [];
    for ($d = 1; $d <= 7; $d++) {
        $diaSemProm[] = $diaSemCount[$d] > 0 ? round($diaSemMin[$d] / $diaSemCount[$d] / 60, 2) : 0;
    }
    $porDiaSemana = [
        'labels' => $DIAS_ES,
        'horas'  => array_values(array_map(fn($m) => round($m / 60, 1), $diaSemMin)),
        'prom'   => $diaSemProm,
    ];

    // ── Por Semana ──
    $semMin = []; $semCnt = [];
    foreach ($turnos as $t) {
        $semMin[$t['semana']] = ($semMin[$t['semana']] ?? 0.0) + $t['dur'];
        $semCnt[$t['semana']] = ($semCnt[$t['semana']] ?? 0) + 1;
    }
    ksort($semMin);
    $semProm = [];
    foreach ($semMin as $s => $min) $semProm[] = $semCnt[$s] > 0 ? round($min / $semCnt[$s] / 60, 2) : 0;
    $porSemana = [
        'labels' => array_map(fn($s) => "S$s", array_keys($semMin)),
        'horas'  => array_values(array_map(fn($m) => round($m / 60, 1), $semMin)),
        'prom'   => $semProm,
    ];

    // ── Por Hora de Entrada ──
    $horaCount = array_fill(0, 24, 0);
    foreach ($turnos as $t) $horaCount[$t['horaE']]++;
    $porHoraEntrada = [
        'labels' => array_map(fn($h) => str_pad((string)$h, 2, '0', STR_PAD_LEFT) . 'h', range(0, 23)),
        'data'   => $horaCount,
    ];

    // ── Distribución de duración ──
    $bucketKeys = ['<08h','08-09h','09-10h','10-10:30h','10:30-11:00h','11:00-11:30h','11:30-12:00h','>12h'];
    $durBuckets        = array_fill_keys($bucketKeys, 0);
    $distPorTrabajador = [];
    $distTrabMes       = [];
    foreach ($turnos as $t) {
        $bk    = jorlabGetBucket($t['dur'] / 60);
        $emp   = $t['emp'];
        $mk    = (string)$t['mes'];
        $cargo = $cargoMap[strtoupper(trim($emp))] ?? '';
        $durBuckets[$bk]++;
        // global
        if (!isset($distPorTrabajador[$emp])) $distPorTrabajador[$emp] = array_fill_keys($bucketKeys, 0) + ['total' => 0, 'cargo' => $cargo];
        $distPorTrabajador[$emp][$bk]++;
        $distPorTrabajador[$emp]['total']++;
        // por mes
        if (!isset($distTrabMes[$mk][$emp])) $distTrabMes[$mk][$emp] = array_fill_keys($bucketKeys, 0) + ['total' => 0, 'cargo' => $cargo];
        $distTrabMes[$mk][$emp][$bk]++;
        $distTrabMes[$mk][$emp]['total']++;
    }
    uasort($distPorTrabajador, fn($a, $b) => $b['total'] - $a['total']);
    foreach ($distTrabMes as $mk => &$trabMes) uasort($trabMes, fn($a, $b) => $b['total'] - $a['total']);
    unset($trabMes);

    // ── Vistas filtradas por cargo ──
    $filterByCargo = fn(array $dist, string $c) => array_filter($dist, fn($d) => ($d['cargo'] ?? '') === $c);
    $distConductores = $filterByCargo($distPorTrabajador, 'conductor');
    $distCondMes     = array_map(fn($mes) => $filterByCargo($mes, 'conductor'), $distTrabMes);

    // ── Descanso entre turnos (solo conductores) ──
    $condShifts = [];
    foreach ($turnos as $t) {
        if (($cargoMap[strtoupper(trim($t['emp']))] ?? '') === 'conductor')
            $condShifts[$t['emp']][] = ['tsE' => $t['tsE'], 'tsS' => $t['tsS'], 'mes' => $t['mes']];
    }
    $descBuckets  = ['<8h' => 0, '8-9h' => 0, '9-10h' => 0, '>10h' => 0];
    $descansoCond = [];
    $descMes      = [];
    foreach ($condShifts as $emp => $shifts) {
        usort($shifts, fn($a, $b) => $a['tsE'] - $b['tsE']);
        $d = array_merge($descBuckets, ['total_turnos' => count($shifts)]);
        for ($i = 1; $i < count($shifts); $i++) {
            $gap = ($shifts[$i]['tsE'] - $shifts[$i-1]['tsS']) / 60;
            if ($gap <= 0 || $gap > 4320) continue;
            $bk = $gap < 480 ? '<8h' : ($gap < 540 ? '8-9h' : ($gap < 600 ? '9-10h' : '>10h'));
            $mk = (string)$shifts[$i]['mes']; // mes del turno de regreso
            $d[$bk]++;
            if (!isset($descMes[$mk][$emp])) $descMes[$mk][$emp] = array_merge($descBuckets, ['total_turnos' => 0]);
            $descMes[$mk][$emp][$bk]++;
            $descMes[$mk][$emp]['total_turnos']++;
        }
        $descansoCond[$emp] = $d;
    }
    uasort($descansoCond, fn($a, $b) => $b['<8h'] !== $a['<8h'] ? $b['<8h'] - $a['<8h'] : $b['>10h'] - $a['>10h']);
    foreach ($descMes as $mk => &$mesCond) uasort($mesCond, fn($a, $b) => $b['<8h'] !== $a['<8h'] ? $b['<8h'] - $a['<8h'] : $b['>10h'] - $a['>10h']);
    unset($mesCond);
    $distDuracion = ['labels' => array_keys($durBuckets), 'data' => array_values($durBuckets)];

    // ── Detalle por Mes + global prom/día ──
    $detalle       = [];
    $globalDiaMin  = []; // dia => sum minutos (todos los meses)
    $globalDiaCnt  = []; // dia => count turnos
    foreach ($turnos as $t) {
        $mk = (string)$t['mes'];
        $detalle[$mk]['total_turnos']            = ($detalle[$mk]['total_turnos']            ?? 0)   + 1;
        $detalle[$mk]['total_min']               = ($detalle[$mk]['total_min']               ?? 0.0) + $t['dur'];
        $detalle[$mk]['extra']                   = ($detalle[$mk]['extra']                   ?? 0)   + ($t['dur'] > 480 ? 1 : 0);
        $detalle[$mk]['por_dia'][$t['dia']]      = ($detalle[$mk]['por_dia'][$t['dia']]      ?? 0.0) + $t['dur'];
        $detalle[$mk]['por_dia_cnt'][$t['dia']]  = ($detalle[$mk]['por_dia_cnt'][$t['dia']]  ?? 0)   + 1;
        $globalDiaMin[$t['dia']]                 = ($globalDiaMin[$t['dia']]                 ?? 0.0) + $t['dur'];
        $globalDiaCnt[$t['dia']]                 = ($globalDiaCnt[$t['dia']]                 ?? 0)   + 1;
    }
    ksort($detalle);
    foreach ($detalle as &$d) {
        $d['total_horas'] = round($d['total_min'] / 60, 1);
        $d['prom_min']    = $d['total_turnos'] > 0 ? round($d['total_min'] / $d['total_turnos'], 1) : 0;
        $porDia = []; $promPorDia = [];
        $cntPorDia = $d['por_dia_cnt'] ?? [];
        foreach ($d['por_dia'] ?? [] as $dia => $min) {
            $cnt            = $cntPorDia[$dia] ?? 1;
            $porDia[$dia]     = round($min / 60, 1);
            $promPorDia[$dia] = round($min / $cnt / 60, 2);
        }
        ksort($porDia); ksort($promPorDia);
        $d['por_dia']      = $porDia;
        $d['prom_por_dia'] = $promPorDia;
        unset($d['total_min'], $d['por_dia_cnt']);
    }
    unset($d);
    $promDiaGlobal = [];
    foreach ($globalDiaMin as $dia => $min) $promDiaGlobal[$dia] = round($min / ($globalDiaCnt[$dia] ?? 1) / 60, 2);
    ksort($promDiaGlobal);

    jsonResponse(true, '', [
        'found'          => true,
        'años'           => $añosDisp,
        'rango_real'     => $rangoReal,
        'datasets_count' => count($ids),
        'total_turnos'   => $totalTurnos,
        'total_horas'    => round($totalMin / 60, 1),
        'prom_min'       => round($promMin, 1),
        'turnos_extra'   => $turnosExtra,
        'turnos_noche'   => $turnosNoche,
        'cols'           => $cols,
        'por_mes'        => $porMes,
        'por_dia_semana' => $porDiaSemana,
        'por_semana'     => $porSemana,
        'por_hora_entrada' => $porHoraEntrada,
        'dist_duracion'   => $distDuracion,
        'detalle_por_mes'     => $detalle,
        'prom_dia_global'     => $promDiaGlobal,
        'dist_por_trabajador' => $distPorTrabajador,
        'dist_trab_mes'       => $distTrabMes,
        'dist_conductores'    => $distConductores,
        'dist_cond_mes'       => $distCondMes,
        'descanso_conductores'=> $descansoCond,
        'descanso_mes'        => $descMes,
    ]);
}

// ── Debug: ver valores crudos de ENTRADA/SALIDA ──────────────
function jorlabDebug(): void {
    $datasets = db()->fetchAll(
        "SELECT id, columnas FROM kpi_datasets
         WHERE JSON_UNQUOTE(JSON_EXTRACT(mapeo, '$.tipo_codigo')) = 'JORLAB'
         ORDER BY creado_en DESC"
    );
    if (!$datasets) { jsonResponse(true, '', ['msg' => 'Sin datasets']); return; }

    $cols = jorlabClasificar(json_decode($datasets[0]['columnas'], true) ?? []);
    $ids  = array_column($datasets, 'id');
    $ph   = implode(',', array_fill(0, count($ids), '?'));
    $raw  = db()->fetchAll(
        "SELECT fila FROM kpi_data WHERE dataset_id IN ($ph) ORDER BY num_fila LIMIT 10",
        [...$ids, 10]
    );
    $rows = array_map(fn($r) => json_decode($r['fila'], true) ?? [], $raw);

    $entCol = $cols['entradaCol'];
    $salCol = $cols['salidaCol'];
    $samples = array_map(function ($row) use ($entCol, $salCol) {
        $eRaw = $row[$entCol] ?? null;
        $sRaw = $row[$salCol] ?? null;
        $eStr = (string)($eRaw ?? '');
        $sStr = (string)($sRaw ?? '');
        return [
            'entrada_raw'  => $eRaw,
            'salida_raw'   => $sRaw,
            'entrada_type' => gettype($eRaw),
            'salida_type'  => gettype($sRaw),
            'entrada_str'  => $eStr,
            'salida_str'   => $sStr,
            'entrada_ts'   => jorlabToTimestamp($eStr),
            'salida_ts'    => jorlabToTimestamp($sStr),
        ];
    }, $rows);

    jsonResponse(true, '', ['cols' => $cols, 'samples' => $samples]);
}
