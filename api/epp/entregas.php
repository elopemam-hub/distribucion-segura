<?php
// ============================================================
// API EPP: entrega de EPP a trabajador (núcleo legal Fase 2)
// Archivo: api/epp/entregas.php
// Base legal: R.M. 050-2013-TR (registro obligatorio de entrega de EPP).
// Acciones (?action=):
//   list       → historial de entregas (filtros)
//   get        → una entrega con su detalle de items + firma
//   registrar  → crea entrega + items + descuenta stock (salida) en transacción
//   anular     → anula la entrega y restituye el stock
//   dashboard  → KPIs de cobertura y próximas renovaciones
// ============================================================

require_once __DIR__ . '/../../includes/auth.php';

requireLogin();
setupEpp();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

// Motivos válidos (deben coincidir con el ENUM). Se define ANTES del despacho:
// los const de nivel superior no se hoistean, y las acciones lo usan.
const EPP_MOTIVOS = ['nuevo', 'renovacion', 'reposicion', 'perdida'];

$mutaciones = ['registrar', 'anular', 'editar'];
if (in_array($action, $mutaciones, true)) {
    requireCsrf();
    $user = getCurrentUser();
    if (!in_array($user['rol'], ['administrador', 'supervisor'])) {
        jsonResponse(false, 'No tienes permisos.', null, 403);
    }
}

try {
    switch ($action) {
        case 'list':      listar();     break;
        case 'get':       obtener();    break;
        case 'registrar': registrar();  break;
        case 'anular':    anular();     break;
        case 'editar':    editar();     break;
        case 'dashboard': dashboard();  break;
        case 'reporte':   reporte();    break;
        case 'vencimientos': vencimientos(); break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Throwable $e) {
    // Throwable (no solo Exception) para que un Error de PHP no deje la
    // respuesta vacía (500 sin cuerpo), sino un JSON legible para el cliente.
    error_log('[epp/entregas] ' . $e->getMessage());
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ============================================================
// Historial de entregas + resumen de items por entrega.
function listar() {
    $q      = trim($_GET['q'] ?? '');
    $motivo = trim($_GET['motivo'] ?? '');
    $estado = trim($_GET['estado'] ?? '');
    $desde  = trim($_GET['desde'] ?? '');
    $hasta  = trim($_GET['hasta'] ?? '');
    $empresaId = trim($_GET['empresa_id'] ?? '');
    $limit  = min(500, max(10, (int)($_GET['limit'] ?? 100)));

    $where = ['1=1']; $params = [];
    if ($empresaId !== '') { $where[] = 'e.empresa_id = ?'; $params[] = (int)$empresaId; }
    if ($q !== '') {
        $where[] = '(e.trabajador_nombre LIKE ? OR e.trabajador_dni LIKE ?)';
        $params[] = "%$q%"; $params[] = "%$q%";
    }
    if (in_array($motivo, EPP_MOTIVOS, true)) { $where[] = 'e.motivo = ?';  $params[] = $motivo; }
    if (in_array($estado, ['vigente', 'anulada'], true)) { $where[] = 'e.estado = ?'; $params[] = $estado; }
    if ($desde !== '') { $where[] = 'e.fecha >= ?'; $params[] = $desde; }
    if ($hasta !== '') { $where[] = 'e.fecha <= ?'; $params[] = $hasta; }
    $whereSql = implode(' AND ', $where);

    $rows = db()->fetchAll(
        "SELECT e.id, e.personal_id, e.trabajador_nombre, e.trabajador_dni, e.trabajador_cargo,
                e.motivo, e.fecha, e.observacion, e.entregado_por_nombre, e.estado, e.creado_en,
                COUNT(i.id)                     AS lineas,
                COALESCE(SUM(i.cantidad), 0)    AS total_unidades,
                MIN(i.fecha_renovacion)         AS proxima_renovacion
           FROM epp_entregas e
           LEFT JOIN epp_entrega_items i ON i.entrega_id = e.id
          WHERE $whereSql
          GROUP BY e.id
          ORDER BY e.fecha DESC, e.id DESC
          LIMIT $limit",
        $params
    );
    foreach ($rows as &$r) {
        $r['lineas']         = (int)$r['lineas'];
        $r['total_unidades'] = (int)$r['total_unidades'];
    }
    unset($r);
    jsonResponse(true, '', $rows);
}

// Una entrega completa con su detalle (para ver/imprimir).
function obtener() {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 422);

    $ent = db()->fetchOne("SELECT * FROM epp_entregas WHERE id = ?", [$id]);
    if (!$ent) jsonResponse(false, 'Entrega no encontrada.', null, 404);

    $ent['items'] = db()->fetchAll(
        "SELECT id, tipo_epp_id, tipo_nombre, norma_tecnica, cantidad, vida_util_dias, fecha_renovacion
           FROM epp_entrega_items WHERE entrega_id = ? ORDER BY id ASC",
        [$id]
    );
    jsonResponse(true, '', $ent);
}

// ============================================================
// Registra una entrega: cabecera + detalle + salidas de stock, en una
// transacción. Descuenta stock vía movimiento 'salida' (cantidad negativa)
// enlazado a la entrega. Calcula fecha_renovacion = fecha + vida_util_dias.
function registrar() {
    $personalId = (int)($_POST['personal_id'] ?? 0);
    $motivo     = trim($_POST['motivo'] ?? 'nuevo');
    $fecha      = trim($_POST['fecha'] ?? date('Y-m-d'));
    $firma      = trim($_POST['firma_trabajador'] ?? '');
    $firmaEnt   = trim($_POST['firma_entrega'] ?? '');   // firma de quien entrega (opcional)
    $obs        = trim($_POST['observacion'] ?? '');
    $items      = json_decode($_POST['items'] ?? '[]', true);

    if (!in_array($motivo, EPP_MOTIVOS, true)) {
        jsonResponse(false, 'Motivo inválido.', null, 422);
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) {
        jsonResponse(false, 'Fecha inválida.', null, 422);
    }
    // La firma del trabajador ya no se captura digital (firma cada fila a mano).
    if (!is_array($items) || !count($items)) {
        jsonResponse(false, 'Agrega al menos un EPP a entregar.', null, 422);
    }

    // Trabajador: snapshot desde la tabla personal (incluye su empresa).
    $p = db()->fetchOne("SELECT id, dni, nombre, cargo, empresa_id FROM personal WHERE id = ?", [$personalId]);
    if (!$p) jsonResponse(false, 'Trabajador no encontrado.', null, 422);

    // Consolida cantidades por tipo (evita duplicar renglones del mismo EPP).
    // Captura además la fecha de renovación manual opcional (yyyy-mm-dd) por tipo.
    $pedido = [];
    $renovPorTipo = [];
    foreach ($items as $it) {
        $tid  = (int)($it['tipo_epp_id'] ?? 0);
        $cant = (int)($it['cantidad'] ?? 0);
        if ($tid <= 0 || $cant <= 0) continue;
        $pedido[$tid] = ($pedido[$tid] ?? 0) + $cant;
        $rv = trim($it['fecha_renovacion'] ?? '');
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $rv)) $renovPorTipo[$tid] = $rv;
    }
    if (!count($pedido)) jsonResponse(false, 'No hay cantidades válidas.', null, 422);

    // Carga los tipos solicitados y valida stock disponible.
    $ids = implode(',', array_map('intval', array_keys($pedido)));
    $tipos = db()->fetchAll(
        "SELECT t.id, t.nombre, t.norma_tecnica, t.vida_util_dias, t.activo,
                COALESCE((SELECT SUM(m.cantidad) FROM epp_movimientos m WHERE m.tipo_epp_id = t.id), 0) AS stock
           FROM epp_tipos t WHERE t.id IN ($ids)"
    );
    $mapTipo = [];
    foreach ($tipos as $t) $mapTipo[(int)$t['id']] = $t;

    foreach ($pedido as $tid => $cant) {
        $t = $mapTipo[$tid] ?? null;
        if (!$t || (int)$t['activo'] !== 1) {
            jsonResponse(false, "Tipo de EPP inválido en la lista.", null, 422);
        }
        if ((int)$t['stock'] < $cant) {
            jsonResponse(false, "Stock insuficiente de {$t['nombre']} (disponible: {$t['stock']}, solicitado: $cant).", null, 422);
        }
    }

    $user = getCurrentUser();
    try {
        db()->beginTransaction();

        db()->query(
            "INSERT INTO epp_entregas
               (personal_id, empresa_id, trabajador_nombre, trabajador_dni, trabajador_cargo, motivo,
                fecha, firma_trabajador, firma_entrega, observacion, entregado_por, entregado_por_nombre)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [$p['id'], $p['empresa_id'] ?: null, mb_strtoupper($p['nombre'], 'UTF-8'), $p['dni'], $p['cargo'], $motivo,
             $fecha, $firma ?: null, ($firmaEnt !== '' && strpos($firmaEnt, 'data:image/') === 0) ? $firmaEnt : null,
             $obs ?: null, $user['id'], $user['nombre'] ?? null]
        );
        $entregaId = db()->lastInsertId();

        foreach ($pedido as $tid => $cant) {
            $t = $mapTipo[$tid];
            $vida = (int)$t['vida_util_dias'];
            // Fecha manual si se envió; si no, calculada (fecha + vida útil).
            $fechaRenov = $renovPorTipo[$tid]
                ?? ($vida > 0 ? date('Y-m-d', strtotime("$fecha +$vida days")) : null);

            db()->query(
                "INSERT INTO epp_entrega_items
                   (entrega_id, tipo_epp_id, tipo_nombre, norma_tecnica, cantidad, vida_util_dias, fecha_renovacion)
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                [$entregaId, $tid, $t['nombre'], $t['norma_tecnica'] ?: null, $cant, $vida ?: null, $fechaRenov]
            );

            // Salida de stock (cantidad negativa) enlazada a la entrega.
            db()->query(
                "INSERT INTO epp_movimientos
                   (tipo_epp_id, tipo_mov, cantidad, entrega_id, fecha, usuario_id, observacion)
                 VALUES (?, 'salida', ?, ?, ?, ?, ?)",
                [$tid, -$cant, $entregaId, $fecha, $user['id'],
                 'Entrega #' . $entregaId . ' — ' . mb_strtoupper($p['nombre'], 'UTF-8')]
            );
        }

        db()->commit();
    } catch (Exception $e) {
        db()->rollback();
        error_log('[epp/entregas:registrar] ' . $e->getMessage());
        jsonResponse(false, 'Error al registrar la entrega.', null, 500);
    }

    jsonResponse(true, 'Entrega registrada.', ['id' => $entregaId]);
}

// ============================================================
// Anula una entrega: marca estado='anulada' y restituye el stock con
// movimientos de ajuste positivos (conserva el rastro de auditoría).
function anular() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 422);

    $ent = db()->fetchOne("SELECT id, estado, trabajador_nombre FROM epp_entregas WHERE id = ?", [$id]);
    if (!$ent) jsonResponse(false, 'Entrega no encontrada.', null, 404);
    if ($ent['estado'] === 'anulada') jsonResponse(false, 'La entrega ya estaba anulada.', null, 422);

    $items = db()->fetchAll("SELECT tipo_epp_id, cantidad FROM epp_entrega_items WHERE entrega_id = ?", [$id]);
    $user = getCurrentUser();

    try {
        db()->beginTransaction();
        db()->query("UPDATE epp_entregas SET estado = 'anulada' WHERE id = ?", [$id]);
        foreach ($items as $it) {
            db()->query(
                "INSERT INTO epp_movimientos
                   (tipo_epp_id, tipo_mov, cantidad, entrega_id, fecha, usuario_id, observacion)
                 VALUES (?, 'ajuste', ?, ?, ?, ?, ?)",
                [(int)$it['tipo_epp_id'], abs((int)$it['cantidad']), $id, date('Y-m-d'),
                 $user['id'], 'Reverso por anulación de entrega #' . $id]
            );
        }
        db()->commit();
    } catch (Exception $e) {
        db()->rollback();
        error_log('[epp/entregas:anular] ' . $e->getMessage());
        jsonResponse(false, 'Error al anular la entrega.', null, 500);
    }
    jsonResponse(true, 'Entrega anulada y stock restituido.');
}

// ============================================================
// Edita SOLO datos generales de la entrega (motivo, fecha, observación).
// No toca los EPP entregados, el stock ni la firma (registro firmado).
function editar() {
    $id     = (int)($_POST['id'] ?? 0);
    $motivo = trim($_POST['motivo'] ?? '');
    $fecha  = trim($_POST['fecha'] ?? '');
    $obs    = trim($_POST['observacion'] ?? '');

    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 422);
    if (!in_array($motivo, EPP_MOTIVOS, true)) jsonResponse(false, 'Motivo inválido.', null, 422);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) jsonResponse(false, 'Fecha inválida.', null, 422);

    $ent = db()->fetchOne("SELECT id FROM epp_entregas WHERE id = ?", [$id]);
    if (!$ent) jsonResponse(false, 'Entrega no encontrada.', null, 404);

    db()->query(
        "UPDATE epp_entregas SET motivo = ?, fecha = ?, observacion = ? WHERE id = ?",
        [$motivo, $fecha, $obs ?: null, $id]
    );
    jsonResponse(true, 'Entrega actualizada.');
}

// ============================================================
// KPIs de cobertura y próximas renovaciones (solo entregas vigentes).
function dashboard() {
    $hoy = date('Y-m-d');
    $mesIni = date('Y-m-01');

    $totEntregas = (int)(db()->fetchOne(
        "SELECT COUNT(*) c FROM epp_entregas WHERE estado='vigente'")['c'] ?? 0);
    $entregasMes = (int)(db()->fetchOne(
        "SELECT COUNT(*) c FROM epp_entregas WHERE estado='vigente' AND fecha >= ?", [$mesIni])['c'] ?? 0);
    $trabajadores = (int)(db()->fetchOne(
        "SELECT COUNT(DISTINCT personal_id) c FROM epp_entregas
          WHERE estado='vigente' AND personal_id IS NOT NULL")['c'] ?? 0);

    // Renovaciones vencidas o por vencer en los próximos 30 días.
    $vencidas = (int)(db()->fetchOne(
        "SELECT COUNT(*) c FROM epp_entrega_items i
           JOIN epp_entregas e ON e.id = i.entrega_id
          WHERE e.estado='vigente' AND i.fecha_renovacion IS NOT NULL AND i.fecha_renovacion < ?",
        [$hoy])['c'] ?? 0);
    $porVencer = (int)(db()->fetchOne(
        "SELECT COUNT(*) c FROM epp_entrega_items i
           JOIN epp_entregas e ON e.id = i.entrega_id
          WHERE e.estado='vigente' AND i.fecha_renovacion BETWEEN ? AND DATE_ADD(?, INTERVAL 30 DAY)",
        [$hoy, $hoy])['c'] ?? 0);

    // Detalle de próximas renovaciones (últimas por trabajador/EPP).
    $renovaciones = db()->fetchAll(
        "SELECT e.id AS entrega_id, e.trabajador_nombre, e.trabajador_dni,
                i.tipo_nombre, i.cantidad, i.fecha_renovacion,
                DATEDIFF(i.fecha_renovacion, ?) AS dias
           FROM epp_entrega_items i
           JOIN epp_entregas e ON e.id = i.entrega_id
          WHERE e.estado='vigente' AND i.fecha_renovacion IS NOT NULL
            AND i.fecha_renovacion <= DATE_ADD(?, INTERVAL 30 DAY)
          ORDER BY i.fecha_renovacion ASC
          LIMIT 100",
        [$hoy, $hoy]
    );

    jsonResponse(true, '', [
        'resumen' => [
            'total_entregas' => $totEntregas,
            'entregas_mes'   => $entregasMes,
            'trabajadores'   => $trabajadores,
            'vencidas'       => $vencidas,
            'por_vencer'     => $porVencer,
        ],
        'renovaciones' => $renovaciones,
    ]);
}

// ============================================================
// Reporte a nivel de ítem (una fila por EPP entregado) para exportar.
// Filtros: q (trabajador/DNI), motivo, desde, hasta. Por defecto solo vigentes.
function reporte() {
    $q       = trim($_GET['q'] ?? '');
    $motivo  = trim($_GET['motivo'] ?? '');
    $desde   = trim($_GET['desde'] ?? '');
    $hasta   = trim($_GET['hasta'] ?? '');
    $incAnul = ($_GET['incluir_anuladas'] ?? '') === '1';

    $where = ['1=1']; $params = [];
    if (!$incAnul) $where[] = "e.estado = 'vigente'";
    if ($q !== '') {
        $where[] = '(e.trabajador_nombre LIKE ? OR e.trabajador_dni LIKE ?)';
        $params[] = "%$q%"; $params[] = "%$q%";
    }
    if (in_array($motivo, EPP_MOTIVOS, true)) { $where[] = 'e.motivo = ?'; $params[] = $motivo; }
    if ($desde !== '') { $where[] = 'e.fecha >= ?'; $params[] = $desde; }
    if ($hasta !== '') { $where[] = 'e.fecha <= ?'; $params[] = $hasta; }
    $whereSql = implode(' AND ', $where);

    $rows = db()->fetchAll(
        "SELECT e.id AS entrega_id, e.fecha, e.trabajador_nombre, e.trabajador_dni, e.trabajador_cargo,
                e.motivo, e.estado, e.entregado_por_nombre,
                i.tipo_nombre, i.norma_tecnica, i.cantidad, i.vida_util_dias, i.fecha_renovacion
           FROM epp_entregas e
           JOIN epp_entrega_items i ON i.entrega_id = e.id
          WHERE $whereSql
          ORDER BY e.fecha DESC, e.id DESC, i.id ASC
          LIMIT 5000",
        $params
    );
    jsonResponse(true, '', $rows);
}

// ============================================================
// Vencimientos: ítems con fecha de renovación vencida o dentro del horizonte
// de N días (solo entregas vigentes). Incluye días restantes (negativo = vencido).
function vencimientos() {
    $dias = (int)($_GET['dias'] ?? 30);
    if ($dias < 0) $dias = 30;
    $hoy = date('Y-m-d');

    $rows = db()->fetchAll(
        "SELECT e.id AS entrega_id, e.trabajador_nombre, e.trabajador_dni, e.trabajador_cargo,
                i.tipo_nombre, i.cantidad, i.fecha_renovacion,
                DATEDIFF(i.fecha_renovacion, ?) AS dias
           FROM epp_entrega_items i
           JOIN epp_entregas e ON e.id = i.entrega_id
          WHERE e.estado = 'vigente' AND i.fecha_renovacion IS NOT NULL
            AND i.fecha_renovacion <= DATE_ADD(?, INTERVAL ? DAY)
          ORDER BY i.fecha_renovacion ASC
          LIMIT 5000",
        [$hoy, $hoy, $dias]
    );
    foreach ($rows as &$r) {
        $d = (int)$r['dias'];
        $r['dias']   = $d;
        $r['estado'] = $d < 0 ? 'vencida' : 'por_vencer';
    }
    unset($r);
    jsonResponse(true, '', $rows);
}
