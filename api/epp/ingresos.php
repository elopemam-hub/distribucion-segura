<?php
// ============================================================
// API EPP: ingresos (recepción / compra de EPP a inventario)
// Archivo: api/epp/ingresos.php
// Acciones (?action=):
//   list      → historial de ingresos (con totales)
//   get       → un ingreso con su detalle de líneas
//   registrar → cabecera + N movimientos 'entrada' (transacción, suma stock)
// ============================================================

require_once __DIR__ . '/../../includes/auth.php';

requireLogin();
setupEpp();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

$mutaciones = ['registrar'];
if (in_array($action, $mutaciones, true)) {
    requireCsrf();
    $user = getCurrentUser();
    if (!in_array($user['rol'], ['administrador', 'supervisor'])) {
        jsonResponse(false, 'No tienes permisos.', null, 403);
    }
}

try {
    switch ($action) {
        case 'list':      listar();    break;
        case 'get':       obtener();   break;
        case 'registrar': registrar(); break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Throwable $e) {
    error_log('[epp/ingresos] ' . $e->getMessage());
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ============================================================
function listar() {
    $q     = trim($_GET['q'] ?? '');
    $desde = trim($_GET['desde'] ?? '');
    $hasta = trim($_GET['hasta'] ?? '');
    $limit = min(500, max(10, (int)($_GET['limit'] ?? 100)));

    $where = ['1=1']; $params = [];
    if ($q !== '') { $where[] = '(g.documento_ref LIKE ? OR p.razon_social LIKE ?)'; $params[] = "%$q%"; $params[] = "%$q%"; }
    if ($desde !== '') { $where[] = 'g.fecha >= ?'; $params[] = $desde; }
    if ($hasta !== '') { $where[] = 'g.fecha <= ?'; $params[] = $hasta; }
    $whereSql = implode(' AND ', $where);

    $rows = db()->fetchAll(
        "SELECT g.id, g.fecha, g.documento_ref, g.observacion, g.estado, g.usuario_nombre,
                p.razon_social AS proveedor,
                COUNT(m.id)                  AS lineas,
                COALESCE(SUM(m.cantidad), 0) AS total_unidades,
                COALESCE(SUM(m.cantidad * COALESCE(m.costo_unitario,0)), 0) AS total_costo
           FROM epp_ingresos g
           LEFT JOIN epp_proveedores p ON p.id = g.proveedor_id
           LEFT JOIN epp_movimientos m ON m.ingreso_id = g.id
          WHERE $whereSql
          GROUP BY g.id
          ORDER BY g.fecha DESC, g.id DESC
          LIMIT $limit",
        $params
    );
    foreach ($rows as &$r) {
        $r['lineas']         = (int)$r['lineas'];
        $r['total_unidades'] = (int)$r['total_unidades'];
        $r['total_costo']    = (float)$r['total_costo'];
    }
    unset($r);
    jsonResponse(true, '', $rows);
}

function obtener() {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 422);
    $g = db()->fetchOne(
        "SELECT g.*, p.razon_social AS proveedor
           FROM epp_ingresos g LEFT JOIN epp_proveedores p ON p.id = g.proveedor_id
          WHERE g.id = ?", [$id]);
    if (!$g) jsonResponse(false, 'Ingreso no encontrado.', null, 404);
    $g['items'] = db()->fetchAll(
        "SELECT m.tipo_epp_id, t.nombre AS tipo_nombre, t.talla, m.cantidad, m.costo_unitario
           FROM epp_movimientos m JOIN epp_tipos t ON t.id = m.tipo_epp_id
          WHERE m.ingreso_id = ? ORDER BY m.id ASC", [$id]);
    jsonResponse(true, '', $g);
}

// Registra un ingreso: cabecera + una entrada de stock por línea.
function registrar() {
    $provId = (int)($_POST['proveedor_id'] ?? 0);
    $docRef = trim($_POST['documento_ref'] ?? '');
    $fecha  = trim($_POST['fecha'] ?? date('Y-m-d'));
    $obs    = trim($_POST['observacion'] ?? '');
    $items  = json_decode($_POST['items'] ?? '[]', true);

    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) jsonResponse(false, 'Fecha inválida.', null, 422);
    if (!is_array($items) || !count($items)) jsonResponse(false, 'Agrega al menos una línea de EPP.', null, 422);

    // Consolida por tipo y valida cantidades. Guarda el costo (último gana).
    $pedido = []; $costo = [];
    foreach ($items as $it) {
        $tid  = (int)($it['tipo_epp_id'] ?? 0);
        $cant = (int)($it['cantidad'] ?? 0);
        if ($tid <= 0 || $cant <= 0) continue;
        $pedido[$tid] = ($pedido[$tid] ?? 0) + $cant;
        if (isset($it['costo_unitario']) && $it['costo_unitario'] !== '')
            $costo[$tid] = round((float)$it['costo_unitario'], 2);
    }
    if (!count($pedido)) jsonResponse(false, 'No hay cantidades válidas.', null, 422);

    // Verifica que los tipos existan y estén activos.
    $ids = implode(',', array_map('intval', array_keys($pedido)));
    $validos = array_column(db()->fetchAll("SELECT id FROM epp_tipos WHERE id IN ($ids) AND activo = 1"), 'id');
    foreach (array_keys($pedido) as $tid) {
        if (!in_array($tid, $validos)) jsonResponse(false, 'La lista incluye un EPP inexistente o inactivo.', null, 422);
    }

    $user = getCurrentUser();
    try {
        db()->beginTransaction();
        db()->query(
            "INSERT INTO epp_ingresos (proveedor_id, documento_ref, fecha, observacion, usuario_id, usuario_nombre)
             VALUES (?, ?, ?, ?, ?, ?)",
            [$provId > 0 ? $provId : null, $docRef ?: null, $fecha, $obs ?: null, $user['id'], $user['nombre'] ?? null]
        );
        $ingresoId = db()->lastInsertId();

        foreach ($pedido as $tid => $cant) {
            db()->query(
                "INSERT INTO epp_movimientos
                   (tipo_epp_id, tipo_mov, cantidad, costo_unitario, proveedor_id, ingreso_id, fecha, documento_ref, usuario_id, observacion)
                 VALUES (?, 'entrada', ?, ?, ?, ?, ?, ?, ?, ?)",
                [$tid, $cant, $costo[$tid] ?? null, $provId > 0 ? $provId : null, $ingresoId,
                 $fecha, $docRef ?: null, $user['id'], 'Ingreso #' . $ingresoId]
            );
        }
        db()->commit();
    } catch (Throwable $e) {
        db()->rollback();
        error_log('[epp/ingresos:registrar] ' . $e->getMessage());
        jsonResponse(false, 'Error al registrar el ingreso.', null, 500);
    }
    jsonResponse(true, 'Ingreso registrado.', ['id' => $ingresoId]);
}
