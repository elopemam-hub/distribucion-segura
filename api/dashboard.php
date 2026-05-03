<?php
// ============================================================
// API: DASHBOARD - ESTADÍSTICAS E INDICADORES
// Archivo: api/dashboard.php
// ============================================================

require_once __DIR__ . '/../includes/auth.php';

requireLogin();
header('Content-Type: application/json; charset=utf-8');

$mes   = $_GET['mes'] ?? date('Y-m');
$anio  = substr($mes, 0, 4);
$mesN  = substr($mes, 5, 2);

// KPIs generales del mes
$kpis = db()->fetchOne(
    "SELECT
        COUNT(*) as total_inspecciones,
        COALESCE(ROUND(AVG(resultado), 1), 0) as promedio_cumplimiento,
        SUM(CASE WHEN resultado >= 80 THEN 1 ELSE 0 END) as aprobadas,
        SUM(CASE WHEN resultado < 80 THEN 1 ELSE 0 END) as observadas,
        COUNT(DISTINCT unidad) as unidades_inspeccionadas,
        COUNT(DISTINCT conductor) as conductores
     FROM inspecciones
     WHERE YEAR(fecha) = ? AND MONTH(fecha) = ?",
    [$anio, $mesN]
);

// Tendencia últimos 7 días
$tendencia = db()->fetchAll(
    "SELECT DATE(fecha) as dia, COUNT(*) as total, ROUND(AVG(resultado),1) as promedio
     FROM inspecciones
     WHERE fecha >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
     GROUP BY DATE(fecha)
     ORDER BY dia ASC"
);

// Ranking conductores (top 10)
$ranking = db()->fetchAll(
    "SELECT conductor,
            COUNT(*) as inspecciones,
            ROUND(AVG(resultado), 1) as promedio,
            SUM(CASE WHEN resultado >= 80 THEN 1 ELSE 0 END) as aprobadas
     FROM inspecciones
     WHERE YEAR(fecha) = ? AND MONTH(fecha) = ?
     GROUP BY conductor
     ORDER BY promedio DESC
     LIMIT 10",
    [$anio, $mesN]
);

// Hallazgos más frecuentes
$hallazgos = db()->fetchAll(
    "SELECT descripcion, criticidad, COUNT(*) as frecuencia
     FROM hallazgos h
     JOIN inspecciones i ON i.id = h.inspeccion_id
     WHERE YEAR(i.fecha) = ? AND MONTH(i.fecha) = ?
     GROUP BY descripcion, criticidad
     ORDER BY frecuencia DESC
     LIMIT 10",
    [$anio, $mesN]
);

// Cumplimiento por ítem de checklist
$porItem = db()->fetchAll(
    "SELECT item,
            COUNT(*) as total,
            SUM(estado) as cumple,
            ROUND(SUM(estado)/COUNT(*)*100, 1) as pct
     FROM checklist c
     JOIN inspecciones i ON i.id = c.inspeccion_id
     WHERE YEAR(i.fecha) = ? AND MONTH(i.fecha) = ?
     GROUP BY item
     ORDER BY pct ASC",
    [$anio, $mesN]
);

// EPP por unidad/rol
$epp = db()->fetchAll(
    "SELECT t.rol, 
            COUNT(*) as total,
            SUM(t.epp_completo) as completos,
            ROUND(SUM(t.epp_completo)/COUNT(*)*100,1) as pct_cumplimiento
     FROM tripulacion t
     JOIN inspecciones i ON i.id = t.inspeccion_id
     WHERE YEAR(i.fecha) = ? AND MONTH(i.fecha) = ?
     GROUP BY t.rol",
    [$anio, $mesN]
);

jsonResponse(true, '', [
    'kpis'      => $kpis,
    'tendencia' => $tendencia,
    'ranking'   => $ranking,
    'hallazgos' => $hallazgos,
    'porItem'   => $porItem,
    'epp'       => $epp,
    'mes'       => $mes,
]);
