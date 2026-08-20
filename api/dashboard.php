<?php
// ============================================================
// API: DASHBOARD - ESTADÍSTICAS E INDICADORES
// ============================================================

require_once __DIR__ . '/../includes/auth.php';

requireLogin();
header('Content-Type: application/json; charset=utf-8');

$mes  = $_GET['mes'] ?? date('Y-m');
$anio = (int)substr($mes, 0, 4);
$mesN = (int)substr($mes, 5, 2);

// Mes anterior para deltas
$mesAntD = (new DateTime("$anio-$mesN-01"))->modify('-1 month');
$anioAnt = (int)$mesAntD->format('Y');
$mesAnt  = (int)$mesAntD->format('m');

// ── KPIs del mes actual ─────────────────────────────────────
$kpis = db()->fetchOne(
    "SELECT
        COUNT(*)                                          AS total_inspecciones,
        COALESCE(ROUND(AVG(resultado),1),0)               AS promedio_cumplimiento,
        SUM(CASE WHEN resultado >= 80 THEN 1 ELSE 0 END)  AS aprobadas,
        SUM(CASE WHEN resultado < 80  THEN 1 ELSE 0 END)  AS observadas,
        COUNT(DISTINCT unidad)                             AS unidades_inspeccionadas,
        COUNT(DISTINCT conductor)                          AS conductores
     FROM inspecciones
     WHERE YEAR(fecha)=? AND MONTH(fecha)=?",
    [$anio, $mesN]
);

// ── KPIs mes anterior (para deltas) ────────────────────────
$kpisAnt = db()->fetchOne(
    "SELECT
        COUNT(*)                                          AS total_inspecciones,
        COALESCE(ROUND(AVG(resultado),1),0)               AS promedio_cumplimiento,
        SUM(CASE WHEN resultado >= 80 THEN 1 ELSE 0 END)  AS aprobadas,
        COUNT(DISTINCT conductor)                          AS conductores
     FROM inspecciones
     WHERE YEAR(fecha)=? AND MONTH(fecha)=?",
    [$anioAnt, $mesAnt]
);

// ── EPP global del mes ──────────────────────────────────────
// pct = promedio de ítems marcados / 5 ítems totales × 100 (cumplimiento parcial)
$eppGlobal = db()->fetchOne(
    "SELECT
        COUNT(*)            AS total,
        SUM(t.epp_completo) AS completos,
        COALESCE(ROUND(
            SUM(COALESCE(JSON_LENGTH(t.epp_detalle),0)) / (NULLIF(COUNT(*),0) * 5) * 100
        ,1),0) AS pct
     FROM tripulacion t
     JOIN inspecciones i ON i.id=t.inspeccion_id
     WHERE YEAR(i.fecha)=? AND MONTH(i.fecha)=?
       AND TRIM(t.nombre) != ''",
    [$anio, $mesN]
);

$eppGlobalAnt = db()->fetchOne(
    "SELECT COALESCE(ROUND(
        SUM(COALESCE(JSON_LENGTH(t.epp_detalle),0)) / (NULLIF(COUNT(*),0) * 5) * 100
    ,1),0) AS pct
     FROM tripulacion t
     JOIN inspecciones i ON i.id=t.inspeccion_id
     WHERE YEAR(i.fecha)=? AND MONTH(i.fecha)=?
       AND TRIM(t.nombre) != ''",
    [$anioAnt, $mesAnt]
);

// ── Hallazgos por criticidad ────────────────────────────────
$hallazgosCrit = db()->fetchAll(
    "SELECT criticidad, COUNT(*) AS n
     FROM hallazgos h
     JOIN inspecciones i ON i.id=h.inspeccion_id
     WHERE YEAR(i.fecha)=? AND MONTH(i.fecha)=?
     GROUP BY criticidad",
    [$anio, $mesN]
);
$critMap = ['alta'=>0,'media'=>0,'baja'=>0];
foreach ($hallazgosCrit as $r) $critMap[$r['criticidad']] = (int)$r['n'];
$totalHallazgos = array_sum($critMap);

// ── Tendencia del mes (día a día) ───────────────────────────
$tendencia = db()->fetchAll(
    "SELECT DATE(fecha) AS dia, COUNT(*) AS total,
            ROUND(AVG(resultado),1) AS promedio,
            SUM(CASE WHEN resultado>=80 THEN 1 ELSE 0 END) AS aprobadas
     FROM inspecciones
     WHERE YEAR(fecha)=? AND MONTH(fecha)=?
     GROUP BY DATE(fecha)
     ORDER BY dia ASC",
    [$anio, $mesN]
);

// ── Ranking conductores (top 10) ────────────────────────────
$ranking = db()->fetchAll(
    "SELECT conductor,
            COUNT(*) AS inspecciones,
            ROUND(AVG(resultado),1) AS promedio,
            SUM(CASE WHEN resultado>=80 THEN 1 ELSE 0 END) AS aprobadas,
            SUM(CASE WHEN resultado<80  THEN 1 ELSE 0 END) AS observadas
     FROM inspecciones
     WHERE YEAR(fecha)=? AND MONTH(fecha)=?
     GROUP BY conductor
     ORDER BY promedio DESC, inspecciones DESC
     LIMIT 10",
    [$anio, $mesN]
);

// ── Hallazgos más frecuentes ────────────────────────────────
$hallazgos = db()->fetchAll(
    "SELECT descripcion, criticidad, COUNT(*) AS frecuencia
     FROM hallazgos h
     JOIN inspecciones i ON i.id=h.inspeccion_id
     WHERE YEAR(i.fecha)=? AND MONTH(i.fecha)=?
     GROUP BY descripcion, criticidad
     ORDER BY frecuencia DESC
     LIMIT 8",
    [$anio, $mesN]
);

// ── Cumplimiento por ítem de checklist (peores primero) ─────
$porItem = db()->fetchAll(
    "SELECT item,
            COUNT(*) AS total,
            SUM(estado) AS cumple,
            ROUND(SUM(estado)/COUNT(*)*100,1) AS pct
     FROM checklist c
     JOIN inspecciones i ON i.id=c.inspeccion_id
     WHERE YEAR(i.fecha)=? AND MONTH(i.fecha)=?
     GROUP BY item
     ORDER BY pct ASC",
    [$anio, $mesN]
);

// ── EPP por rol ─────────────────────────────────────────────
// pct_cumplimiento = promedio de ítems EPP marcados / 5 por rol
$epp = db()->fetchAll(
    "SELECT t.rol,
            COUNT(*) AS total,
            SUM(t.epp_completo) AS completos,
            COALESCE(ROUND(
                SUM(COALESCE(JSON_LENGTH(t.epp_detalle),0)) / (NULLIF(COUNT(*),0) * 5) * 100
            ,1),0) AS pct_cumplimiento
     FROM tripulacion t
     JOIN inspecciones i ON i.id=t.inspeccion_id
     WHERE YEAR(i.fecha)=? AND MONTH(i.fecha)=?
       AND TRIM(t.nombre) != ''
     GROUP BY t.rol
     ORDER BY FIELD(t.rol,'conductor','reparto','auxiliar')",
    [$anio, $mesN]
);

// ── Distribución horaria ────────────────────────────────────
$distribucionHora = db()->fetchAll(
    "SELECT
        CASE
          WHEN HOUR(hora) BETWEEN 6 AND 11  THEN 'Mañana (6-12h)'
          WHEN HOUR(hora) BETWEEN 12 AND 17 THEN 'Tarde (12-18h)'
          WHEN HOUR(hora) BETWEEN 18 AND 23 THEN 'Noche (18-24h)'
          ELSE 'Madrugada (0-6h)'
        END AS turno,
        COUNT(*) AS total
     FROM inspecciones
     WHERE YEAR(fecha)=? AND MONTH(fecha)=? AND hora IS NOT NULL
     GROUP BY turno
     ORDER BY MIN(HOUR(hora))",
    [$anio, $mesN]
);

// Último mes con inspecciones registradas (para no mostrar un mes vacío al abrir).
$ultimoMes = db()->fetchOne("SELECT DATE_FORMAT(MAX(fecha), '%Y-%m') AS m FROM inspecciones")['m'] ?? null;

// ── Resumen por módulo (indicadores transversales) ──────────
$one = function (string $sql, array $p = []) { try { return db()->fetchOne($sql, $p) ?: []; } catch (Throwable $e) { return []; } };
$modulos = [];

// Personal: activos + brevetes por vencer (30 días).
$r = $one("SELECT SUM(activo=1) activos,
                  SUM(activo=1 AND vencimiento_brevete IS NOT NULL AND vencimiento_brevete BETWEEN CURDATE() AND CURDATE()+INTERVAL 30 DAY) brevete_vence,
                  SUM(activo=1 AND vencimiento_brevete IS NOT NULL AND vencimiento_brevete < CURDATE()) brevete_vencido
             FROM personal");
$modulos['personal'] = ['activos' => (int)($r['activos'] ?? 0), 'brevete_vence' => (int)($r['brevete_vence'] ?? 0), 'brevete_vencido' => (int)($r['brevete_vencido'] ?? 0)];

// Checklist de unidades: inspecciones del mes + cumplimiento.
$ci = $one("SELECT COUNT(*) n FROM chk_inspecciones WHERE periodo = ?", [$mes]);
$cc = $one("SELECT SUM(r.resultado='conforme') c, SUM(r.resultado='no_conforme') nc
              FROM chk_resultados r JOIN chk_inspecciones i ON i.id = r.inspeccion_id WHERE i.periodo = ?", [$mes]);
$cCon = (int)($cc['c'] ?? 0); $cNc = (int)($cc['nc'] ?? 0);
$modulos['checklist'] = ['mes' => (int)($ci['n'] ?? 0), 'cumplimiento' => ($cCon + $cNc) > 0 ? (int)round($cCon / ($cCon + $cNc) * 100) : null];

// Evaluaciones del mes.
$r = $one("SELECT COUNT(*) n, SUM(estado='aprobado') aprob, SUM(estado='pendiente_revision') pend
             FROM evaluaciones WHERE YEAR(fecha)=? AND MONTH(fecha)=?", [$anio, $mesN]);
$modulos['evaluaciones'] = ['mes' => (int)($r['n'] ?? 0), 'aprobadas' => (int)($r['aprob'] ?? 0), 'pendientes' => (int)($r['pend'] ?? 0)];

// Capacitaciones del año.
$r = $one("SELECT COUNT(*) n, SUM(estado='ejecutado') ejec, SUM(COALESCE(participantes,0)) part
             FROM capacitaciones WHERE anio=?", [$anio]);
$modulos['capacitaciones'] = ['anio' => (int)($r['n'] ?? 0), 'ejecutadas' => (int)($r['ejec'] ?? 0), 'participantes' => (int)($r['part'] ?? 0)];

// EPP: entregas del mes + tipos activos + movimientos del mes.
$r = $one("SELECT COUNT(*) n FROM epp_entregas WHERE estado='vigente' AND YEAR(fecha)=? AND MONTH(fecha)=?", [$anio, $mesN]);
$r2 = $one("SELECT COUNT(*) n FROM epp_tipos WHERE activo=1");
$r3 = $one("SELECT COUNT(*) n FROM epp_movimientos WHERE YEAR(fecha)=? AND MONTH(fecha)=?", [$anio, $mesN]);
$modulos['epp'] = ['entregas_mes' => (int)($r['n'] ?? 0), 'tipos' => (int)($r2['n'] ?? 0), 'mov_mes' => (int)($r3['n'] ?? 0)];

// Amonestaciones del mes + abiertas (no cerradas).
$r = $one("SELECT COUNT(*) n, SUM(estado<>'cerrado') abiertas FROM amonestaciones WHERE YEAR(fecha)=? AND MONTH(fecha)=?", [$anio, $mesN]);
$modulos['amonestaciones'] = ['mes' => (int)($r['n'] ?? 0), 'abiertas' => (int)($r['abiertas'] ?? 0)];

// Geocercas activas por tipo.
$r = $one("SELECT COUNT(*) n, SUM(tipo='ruta_critica') rc, SUM(tipo='zona_n3') n3, SUM(tipo='zona_roja') zr
             FROM geocercas WHERE activo=1");
$modulos['geocercas'] = ['activas' => (int)($r['n'] ?? 0), 'ruta_critica' => (int)($r['rc'] ?? 0), 'zona_n3' => (int)($r['n3'] ?? 0), 'zona_roja' => (int)($r['zr'] ?? 0)];

// Vehículos (BD de vigilancia, degrada a null si no está disponible).
$modulos['vehiculos'] = ['total' => null, 'disponibles' => null];
try {
    $vig = dbVigilancia();
    if ($vig) {
        $t = (int)$vig->query("SELECT COUNT(*) c FROM vehiculos")->fetch()['c'];
        $d = (int)$vig->query("SELECT COUNT(*) c FROM vehiculos WHERE estado IS NULL OR LOWER(estado) NOT LIKE 'inactiv%'")->fetch()['c'];
        $modulos['vehiculos'] = ['total' => $t, 'disponibles' => $d];
    }
} catch (Throwable $e) { /* sin acceso a vigilancia */ }

jsonResponse(true, '', [
    'ultimoMes'        => $ultimoMes,
    'modulos'          => $modulos,
    'kpis'             => $kpis,
    'kpisAnt'          => $kpisAnt,
    'eppGlobal'        => $eppGlobal,
    'eppGlobalAnt'     => $eppGlobalAnt,
    'hallazgosCrit'    => $critMap,
    'totalHallazgos'   => $totalHallazgos,
    'tendencia'        => $tendencia,
    'ranking'          => $ranking,
    'hallazgos'        => $hallazgos,
    'porItem'          => $porItem,
    'epp'              => $epp,
    'distribucionHora' => $distribucionHora,
    'mes'              => $mes,
]);
