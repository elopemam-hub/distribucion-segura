<?php
require_once __DIR__ . '/../includes/auth.php';
requireLogin();
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

$where  = ['1=1'];
$params = [];

if ($tipo   !== '') { $where[] = 'e.tipo = ?';   $params[] = $tipo; }
if ($estado !== '') { $where[] = 'e.estado = ?'; $params[] = $estado; }
if ($desde  !== '') { $where[] = 'e.fecha >= ?'; $params[] = $desde; }
if ($hasta  !== '') { $where[] = 'e.fecha <= ?'; $params[] = $hasta; }
if ($q      !== '') {
    $where[] = '(e.nombre LIKE ? OR e.dni LIKE ? OR e.empresa LIKE ?)';
    $like = '%' . $q . '%';
    $params[] = $like; $params[] = $like; $params[] = $like;
}

$whereStr = implode(' AND ', $where);

$total = (int)db()->fetchOne(
    "SELECT COUNT(*) as n FROM evaluaciones e WHERE $whereStr",
    $params
)['n'];

$rows = db()->fetchAll(
    "SELECT e.id, e.tipo, e.fecha, e.empresa, e.nombre, e.dni, e.puesto,
            e.tipo_unidad, e.conductor_tipo,
            e.puntaje, e.puntaje_maximo, e.porcentaje, e.estado,
            e.origen, e.created_at,
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

jsonResponse(true, '', [
    'rows'       => $rows,
    'total'      => $total,
    'page'       => $page,
    'limit'      => $limit,
    'totalPages' => (int)ceil($total / $limit),
]);

} catch (Exception $e) {
    $msg = str_contains($e->getMessage(), "doesn't exist") || str_contains($e->getMessage(), "no existe")
        ? 'La tabla evaluaciones no existe. Ejecuta el SQL de creación en tu BD.'
        : 'Error al consultar evaluaciones.';
    error_log('[listar_evaluaciones] ' . $e->getMessage());
    jsonResponse(false, $msg, null, 500);
}
