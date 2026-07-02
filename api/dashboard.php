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
$eppGlobal = db()->fetchOne(
    "SELECT
        COUNT(*)                AS total,
        SUM(t.epp_completo)     AS completos,
        COALESCE(ROUND(SUM(t.epp_completo)/NULLIF(COUNT(*),0)*100,1),0) AS pct
     FROM tripulacion t
     JOIN inspecciones i ON i.id=t.inspeccion_id
     WHERE YEAR(i.fecha)=? AND MONTH(i.fecha)=?
       AND TRIM(t.nombre) != ''",
    [$anio, $mesN]
);

$eppGlobalAnt = db()->fetchOne(
    "SELECT COALESCE(ROUND(SUM(t.epp_completo)/NULLIF(COUNT(*),0)*100,1),0) AS pct
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
$epp = db()->fetchAll(
    "SELECT t.rol,
            COUNT(*) AS total,
            SUM(t.epp_completo) AS completos,
            ROUND(SUM(t.epp_completo)/NULLIF(COUNT(*),0)*100,1) AS pct_cumplimiento
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

jsonResponse(true, '', [
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
