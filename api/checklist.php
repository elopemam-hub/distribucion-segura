<?php
// ============================================================
// API: CHECKLIST DE UNIDADES (inspección mensual de componentes)
// Archivo: api/checklist.php
// Normas SST: Ley 29783, NTP 350.043 (extintores), R.M. 050-2013-TR (EPP),
// R.M. 1275-2021-SA (botiquín).
// Acciones: componentes, list, get, save, delete, resumen,
//           comp_save, comp_toggle, item_save, item_toggle, item_del
// ============================================================

require_once __DIR__ . '/../includes/auth.php';

requireLogin();
setupChecklist();
header('Content-Type: application/json; charset=utf-8');

const CHK_RESULTADOS = ['conforme', 'no_conforme', 'na'];
const CHK_ESTADOS    = ['apto', 'observado', 'no_apto'];

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

$mutaciones = ['save', 'delete', 'comp_save', 'comp_toggle', 'item_save', 'item_toggle', 'item_del'];
if (in_array($action, $mutaciones, true)) {
    requireCsrf();
    $user = getCurrentUser();
    if (!in_array($user['rol'], ['administrador', 'supervisor'])) {
        jsonResponse(false, 'No tienes permisos.', null, 403);
    }
    if ($action === 'delete' && $user['rol'] !== 'administrador') {
        jsonResponse(false, 'Solo un administrador puede eliminar.', null, 403);
    }
}
liberarSesion();   // libera el lock de sesión (rendimiento)

try {
    switch ($action) {
        case 'componentes': componentes();  break;
        case 'list':        listar();       break;
        case 'get':         obtener();      break;
        case 'save':        guardar();      break;
        case 'delete':      eliminar();     break;
        case 'resumen':     resumen();      break;
        case 'comp_save':   compSave();     break;
        case 'comp_toggle': compToggle();   break;
        case 'item_save':   itemSave();     break;
        case 'item_toggle': itemToggle();   break;
        case 'item_del':    itemDel();      break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Throwable $e) {
    error_log('[checklist] ' . $e->getMessage());
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ============================================================
// Componentes con sus ítems (para armar el formulario y la config).
function componentes() {
    $todos = ($_GET['todos'] ?? '') === '1';   // incluir inactivos (config)
    $wc = $todos ? '' : 'WHERE activo = 1';
    $comps = db()->fetchAll("SELECT id, nombre, orden, activo FROM chk_componentes $wc ORDER BY orden ASC, id ASC");
    $wi = $todos ? '' : 'AND activo = 1';
    foreach ($comps as &$c) {
        $c['items'] = db()->fetchAll(
            "SELECT id, texto, orden, activo FROM chk_items WHERE componente_id = ? $wi ORDER BY orden ASC, id ASC", [$c['id']]);
    }
    unset($c);
    jsonResponse(true, '', ['componentes' => $comps]);
}

function listar() {
    $periodo = trim($_GET['periodo'] ?? '');
    $placa   = trim($_GET['placa'] ?? '');
    $estado  = trim($_GET['estado'] ?? '');
    $q       = trim($_GET['q'] ?? '');

    $comp = (int)($_GET['componente_id'] ?? 0);
    $where = ['1=1']; $params = [];
    if (preg_match('/^\d{4}-\d{2}$/', $periodo)) { $where[] = 'i.periodo = ?'; $params[] = $periodo; }
    if ($placa !== '')  { $where[] = 'i.placa LIKE ?'; $params[] = "%$placa%"; }
    if ($comp > 0)      { $where[] = 'i.componente_id = ?'; $params[] = $comp; }
    if (in_array($estado, CHK_ESTADOS, true)) { $where[] = 'i.estado = ?'; $params[] = $estado; }
    if ($q !== '')      { $where[] = '(i.placa LIKE ? OR i.inspector_nombre LIKE ?)'; $params[] = "%$q%"; $params[] = "%$q%"; }
    $whereSql = implode(' AND ', $where);

    $rows = db()->fetchAll(
        "SELECT i.id, i.placa, i.componente_id, c.nombre AS equipo, i.periodo, i.fecha, i.inspector_nombre, i.estado, i.observacion,
                (SELECT COUNT(*) FROM chk_resultados r WHERE r.inspeccion_id = i.id AND r.resultado = 'no_conforme') AS no_conformes,
                (SELECT COUNT(*) FROM chk_resultados r WHERE r.inspeccion_id = i.id AND r.resultado = 'conforme')    AS conformes,
                (SELECT COUNT(*) FROM chk_resultados r WHERE r.inspeccion_id = i.id AND r.resultado = 'na')          AS na,
                (SELECT COUNT(*) FROM chk_resultados r WHERE r.inspeccion_id = i.id) AS total_items
           FROM chk_inspecciones i
           LEFT JOIN chk_componentes c ON c.id = i.componente_id
          WHERE $whereSql ORDER BY i.fecha DESC, i.id DESC LIMIT 1000", $params);

    $periodos = array_column(db()->fetchAll("SELECT DISTINCT periodo FROM chk_inspecciones ORDER BY periodo DESC"), 'periodo');
    jsonResponse(true, '', ['items' => $rows, 'periodos' => $periodos]);
}

function obtener() {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    $insp = db()->fetchOne("SELECT * FROM chk_inspecciones WHERE id = ?", [$id]);
    if (!$insp) jsonResponse(false, 'No encontrada.', null, 404);
    $insp['resultados'] = db()->fetchAll(
        "SELECT item_id, componente_id, resultado, observacion FROM chk_resultados WHERE inspeccion_id = ?", [$id]);
    jsonResponse(true, '', $insp);
}

function guardar() {
    $id      = (int)($_POST['id'] ?? 0);
    $compId  = (int)($_POST['componente_id'] ?? 0);
    $placa   = strtoupper(trim($_POST['placa'] ?? ''));
    $periodo = trim($_POST['periodo'] ?? '');
    $fecha   = trim($_POST['fecha'] ?? date('Y-m-d'));
    $estado  = trim($_POST['estado'] ?? 'apto');
    $obs     = trim($_POST['observacion'] ?? '');
    $firma   = trim($_POST['firma'] ?? '');
    $items   = json_decode($_POST['resultados'] ?? '[]', true);

    if ($compId <= 0) jsonResponse(false, 'Selecciona el equipo a inspeccionar.', null, 422);
    if ($placa === '') jsonResponse(false, 'La placa (unidad) es obligatoria.', null, 422);
    if (!preg_match('/^\d{4}-\d{2}$/', $periodo)) jsonResponse(false, 'Periodo inválido (YYYY-MM).', null, 422);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) $fecha = date('Y-m-d');
    if (!in_array($estado, CHK_ESTADOS, true)) $estado = 'apto';
    if (!is_array($items) || !count($items)) jsonResponse(false, 'No hay ítems evaluados.', null, 422);

    $firmaVal = (strpos($firma, 'data:image/') === 0) ? $firma : null;
    $user = getCurrentUser();

    try {
        db()->beginTransaction();
        if ($id > 0) {
            db()->query(
                "UPDATE chk_inspecciones SET componente_id=?, placa=?, periodo=?, fecha=?, estado=?, observacion=?"
                . ($firmaVal ? ", firma=?" : "") . " WHERE id=?",
                $firmaVal ? [$compId, $placa, $periodo, $fecha, $estado, $obs ?: null, $firmaVal, $id]
                          : [$compId, $placa, $periodo, $fecha, $estado, $obs ?: null, $id]);
            db()->query("DELETE FROM chk_resultados WHERE inspeccion_id = ?", [$id]);
            $inspId = $id;
        } else {
            db()->query(
                "INSERT INTO chk_inspecciones (componente_id, placa, periodo, fecha, inspector_id, inspector_nombre, estado, observacion, firma)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [$compId, $placa, $periodo, $fecha, $user['id'], $user['nombre'] ?? null, $estado, $obs ?: null, $firmaVal]);
            $inspId = (int)db()->lastInsertId();
        }
        foreach ($items as $it) {
            $itemId = (int)($it['item_id'] ?? 0);
            $compId = (int)($it['componente_id'] ?? 0);
            $res    = trim($it['resultado'] ?? 'conforme');
            if ($itemId <= 0 || !in_array($res, CHK_RESULTADOS, true)) continue;
            db()->query(
                "INSERT INTO chk_resultados (inspeccion_id, item_id, componente_id, resultado, observacion) VALUES (?, ?, ?, ?, ?)",
                [$inspId, $itemId, $compId, $res, trim($it['observacion'] ?? '') ?: null]);
        }
        db()->commit();
    } catch (Throwable $e) {
        db()->rollback();
        error_log('[checklist:guardar] ' . $e->getMessage());
        jsonResponse(false, 'Error al guardar la inspección.', null, 500);
    }
    jsonResponse(true, 'Inspección guardada.', ['id' => $inspId]);
}

function eliminar() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    db()->query("DELETE FROM chk_resultados WHERE inspeccion_id = ?", [$id]);
    db()->query("DELETE FROM chk_inspecciones WHERE id = ?", [$id]);
    jsonResponse(true, 'Inspección eliminada.');
}

// Resumen mensual: por unidad inspeccionada, estado y conformidad.
function resumen() {
    $periodo = trim($_GET['periodo'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}$/', $periodo)) $periodo = date('Y-m');
    $rows = db()->fetchAll(
        "SELECT i.id, i.placa, c.nombre AS equipo, i.fecha, i.inspector_nombre, i.estado,
                (SELECT COUNT(*) FROM chk_resultados r WHERE r.inspeccion_id = i.id) AS total,
                (SELECT COUNT(*) FROM chk_resultados r WHERE r.inspeccion_id = i.id AND r.resultado = 'conforme') AS conformes,
                (SELECT COUNT(*) FROM chk_resultados r WHERE r.inspeccion_id = i.id AND r.resultado = 'na') AS na,
                (SELECT COUNT(*) FROM chk_resultados r WHERE r.inspeccion_id = i.id AND r.resultado = 'no_conforme') AS no_conformes
           FROM chk_inspecciones i LEFT JOIN chk_componentes c ON c.id = i.componente_id
          WHERE i.periodo = ? ORDER BY i.placa ASC, c.nombre ASC", [$periodo]);
    $periodos = array_column(db()->fetchAll("SELECT DISTINCT periodo FROM chk_inspecciones ORDER BY periodo DESC"), 'periodo');
    jsonResponse(true, '', ['periodo' => $periodo, 'items' => $rows, 'periodos' => $periodos]);
}

// ── Configuración: componentes e ítems ──
function compSave() {
    $id = (int)($_POST['id'] ?? 0);
    $nombre = trim($_POST['nombre'] ?? '');
    if ($nombre === '') jsonResponse(false, 'El nombre es obligatorio.', null, 422);
    if ($id > 0) {
        db()->query("UPDATE chk_componentes SET nombre = ? WHERE id = ?", [$nombre, $id]);
    } else {
        $orden = (int)(db()->fetchOne("SELECT COALESCE(MAX(orden),0)+1 o FROM chk_componentes")['o'] ?? 1);
        db()->query("INSERT INTO chk_componentes (nombre, orden) VALUES (?, ?)", [$nombre, $orden]);
        $id = (int)db()->lastInsertId();
    }
    jsonResponse(true, 'Componente guardado.', ['id' => $id]);
}
function compToggle() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    db()->query("UPDATE chk_componentes SET activo = 1 - activo WHERE id = ?", [$id]);
    jsonResponse(true, 'Estado actualizado.');
}
function itemSave() {
    $id = (int)($_POST['id'] ?? 0);
    $compId = (int)($_POST['componente_id'] ?? 0);
    $texto = trim($_POST['texto'] ?? '');
    if ($texto === '') jsonResponse(false, 'El texto del ítem es obligatorio.', null, 422);
    if ($id > 0) {
        db()->query("UPDATE chk_items SET texto = ? WHERE id = ?", [$texto, $id]);
    } else {
        if ($compId <= 0) jsonResponse(false, 'Componente inválido.', null, 422);
        $orden = (int)(db()->fetchOne("SELECT COALESCE(MAX(orden),0)+1 o FROM chk_items WHERE componente_id=?", [$compId])['o'] ?? 1);
        db()->query("INSERT INTO chk_items (componente_id, texto, orden) VALUES (?, ?, ?)", [$compId, $texto, $orden]);
        $id = (int)db()->lastInsertId();
    }
    jsonResponse(true, 'Ítem guardado.', ['id' => $id]);
}
function itemToggle() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    db()->query("UPDATE chk_items SET activo = 1 - activo WHERE id = ?", [$id]);
    jsonResponse(true, 'Estado actualizado.');
}
function itemDel() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    db()->query("DELETE FROM chk_items WHERE id = ?", [$id]);
    jsonResponse(true, 'Ítem eliminado.');
}
