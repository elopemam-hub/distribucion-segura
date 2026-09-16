<?php
require_once __DIR__ . '/../includes/auth.php';
requireLogin();
// Asegura columnas nuevas (p. ej. registro_pdf) antes de consultarlas.
if (function_exists('setupEvalFormularios')) setupEvalFormularios();
header('Content-Type: application/json; charset=utf-8');

$tipo   = trim($_GET['tipo']   ?? '');
$estado = trim($_GET['estado'] ?? '');
$desde  = trim($_GET['desde']  ?? '');
$hasta  = trim($_GET['hasta']  ?? '');
$q      = trim($_GET['q']      ?? '');
$page   = max(1, (int)($_GET['page']  ?? 1));
$limit  = min(50, max(5, (int)($_GET['limit'] ?? 20)));
$offset = ($page - 1) * $limit;

try {

// WHERE SIN el tipo (para contar por tipo con los demás filtros vigentes).
$whereNT = ['1=1'];
$paramsNT = [];
if ($estado !== '') { $whereNT[] = 'e.estado = ?'; $paramsNT[] = $estado; }
if ($desde  !== '') { $whereNT[] = 'e.fecha >= ?'; $paramsNT[] = $desde; }
if ($hasta  !== '') { $whereNT[] = 'e.fecha <= ?'; $paramsNT[] = $hasta; }
if ($q      !== '') {
    $whereNT[] = '(e.nombre LIKE ? OR e.dni LIKE ? OR e.empresa LIKE ?)';
    $like = '%' . $q . '%';
    $paramsNT[] = $like; $paramsNT[] = $like; $paramsNT[] = $like;
}
$whereNTStr = implode(' AND ', $whereNT);

// WHERE completo (incluye el tipo) para el listado y los KPIs del tipo elegido.
$where  = $whereNT;
$params = $paramsNT;
if ($tipo !== '') { $where[] = 'e.tipo = ?'; $params[] = $tipo; }
$whereStr = implode(' AND ', $where);

$total = (int)db()->fetchOne(
    "SELECT COUNT(*) as n FROM evaluaciones e WHERE $whereStr",
    $params
)['n'];

$rows = db()->fetchAll(
    "SELECT e.id, e.tipo, e.fecha, e.empresa, e.nombre, e.dni, e.puesto,
            e.tipo_unidad, e.conductor_tipo,
            e.puntaje, e.puntaje_maximo, e.porcentaje, e.estado,
            e.origen, e.created_at, e.registro_pdf,
            u.nombre AS evaluador_nombre,
            a.nombre AS aprobador_nombre,
            e.aprobado_en
     FROM evaluaciones e
     LEFT JOIN usuarios u ON u.id = e.evaluador_id
     LEFT JOIN usuarios a ON a.id = e.aprobado_por
     WHERE $whereStr
     ORDER BY e.created_at DESC
     LIMIT ? OFFSET ?",
    array_merge($params, [$limit, $offset])
);

$tipoLabels = [
    'manejo_practica'  => 'Manejo Práctica',
    'examen_defensiva' => 'Examen Defensiva',
    'induccion_t2'     => 'Inducción T2',
];

foreach ($rows as &$r) {
    $r['tipo_label'] = $tipoLabels[$r['tipo']] ?? $r['tipo'];
}
unset($r);

// Conteo por tipo (respeta estado/fecha/búsqueda, ignora el tipo) → para las píldoras.
$porTipo = [];
foreach (db()->fetchAll("SELECT e.tipo, COUNT(*) c FROM evaluaciones e WHERE $whereNTStr GROUP BY e.tipo", $paramsNT) as $t) {
    $porTipo[$t['tipo']] = (int)$t['c'];
}
$totalTodos = array_sum($porTipo);

// KPIs del filtro actual (incluye el tipo si está elegido).
$st = db()->fetchOne(
    "SELECT COUNT(*) total,
            SUM(e.estado='aprobado') aprobados,
            SUM(e.estado='desaprobado') desaprobados,
            SUM(e.estado='pendiente_revision') pendientes
       FROM evaluaciones e WHERE $whereStr", $params);
$stats = [
    'total'        => (int)($st['total'] ?? 0),
    'aprobados'    => (int)($st['aprobados'] ?? 0),
    'desaprobados' => (int)($st['desaprobados'] ?? 0),
    'pendientes'   => (int)($st['pendientes'] ?? 0),
];
$stats['pct_aprob'] = $stats['total'] ? round($stats['aprobados'] / $stats['total'] * 100) : 0;

jsonResponse(true, '', [
    'rows'        => $rows,
    'total'       => $total,
    'page'        => $page,
    'limit'       => $limit,
    'totalPages'  => (int)ceil($total / $limit),
    'por_tipo'    => $porTipo,
    'total_todos' => $totalTodos,
    'stats'       => $stats,
]);

} catch (Exception $e) {
    $msg = str_contains($e->getMessage(), "doesn't exist") || str_contains($e->getMessage(), "no existe")
        ? 'La tabla evaluaciones no existe. Ejecuta el SQL de creación en tu BD.'
        : 'Error al consultar evaluaciones.';
    error_log('[listar_evaluaciones] ' . $e->getMessage());
    jsonResponse(false, $msg, null, 500);
}
