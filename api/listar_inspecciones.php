<?php
// ============================================================
// API: LISTAR INSPECCIONES
// Archivo: api/listar_inspecciones.php
// ============================================================

require_once __DIR__ . '/../includes/auth.php';

requireLogin();
header('Content-Type: application/json; charset=utf-8');

$fechaDesde  = $_GET['fecha_desde'] ?? '';
$fechaHasta  = $_GET['fecha_hasta'] ?? '';
$unidad      = trim($_GET['unidad'] ?? '');
$conductor   = trim($_GET['conductor'] ?? '');
$page        = max(1, (int)($_GET['page'] ?? 1));
$limit       = min(100, max(10, (int)($_GET['limit'] ?? 25)));
$offset      = ($page - 1) * $limit;

$where  = ['1=1'];
$params = [];

if (!empty($fechaDesde)) { $where[] = 'i.fecha >= ?'; $params[] = $fechaDesde; }
if (!empty($fechaHasta)) { $where[] = 'i.fecha <= ?'; $params[] = $fechaHasta; }
if (!empty($unidad))     { $where[] = 'i.unidad LIKE ?'; $params[] = "%$unidad%"; }
if (!empty($conductor))  { $where[] = 'i.conductor LIKE ?'; $params[] = "%$conductor%"; }

// Restricción por rol: inspector solo ve sus propias inspecciones
$user = getCurrentUser();
if ($user['rol'] === 'inspector') {
    $where[] = 'i.inspector_id = ?';
    $params[] = $user['id'];
}

$whereSQL = implode(' AND ', $where);

// Total para paginación
$total = db()->fetchOne(
    "SELECT COUNT(*) as total FROM inspecciones i WHERE $whereSQL",
    $params
)['total'];

// Datos paginados
$rows = db()->fetchAll(
    "SELECT i.id, i.unidad, i.fecha, i.hora, i.provincia, i.distrito,
            i.conductor, i.reparto, i.resultado, i.creado_en,
            u.nombre as inspector_nombre,
            (SELECT COUNT(*) FROM evidencias e WHERE e.inspeccion_id = i.id) as num_evidencias,
            (SELECT COUNT(*) FROM hallazgos h WHERE h.inspeccion_id = i.id) as num_hallazgos
     FROM inspecciones i
     LEFT JOIN usuarios u ON u.id = i.inspector_id
     WHERE $whereSQL
     ORDER BY i.fecha DESC, i.hora DESC
     LIMIT $limit OFFSET $offset",
    $params
);

// Estadísticas generales (para dashboard)
$stats = db()->fetchOne(
    "SELECT 
        COUNT(*) as total_inspecciones,
        COALESCE(AVG(resultado), 0) as promedio_cumplimiento,
        SUM(CASE WHEN resultado >= 80 THEN 1 ELSE 0 END) as aprobadas,
        SUM(CASE WHEN resultado < 80 THEN 1 ELSE 0 END) as observadas
     FROM inspecciones i WHERE $whereSQL",
    $params
);

jsonResponse(true, '', [
    'inspecciones' => $rows,
    'total'        => (int)$total,
    'page'         => $page,
    'limit'        => $limit,
    'pages'        => ceil($total / $limit),
    'stats'        => $stats,
]);
