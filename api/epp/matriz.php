<?php
// ============================================================
// API EPP: matriz de EPP por puesto (sugerencia de kit por cargo)
// Archivo: api/epp/matriz.php
// Acciones (?action=):
//   list        → toda la matriz (o de un cargo con &cargo=)
//   save_cargo  → reemplaza el conjunto de EPP de un cargo (transacción)
// ============================================================

require_once __DIR__ . '/../../includes/auth.php';

requireLogin();
setupEpp();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

// Cargos válidos = valores del ENUM personal.cargo.
const EPP_CARGOS = ['conductor', 'reparto', 'auxiliar', 'supervisor', 'otro'];

if (in_array($action, ['save_cargo', 'save_all'], true)) {
    requireCsrf();
    $user = getCurrentUser();
    if (!in_array($user['rol'], ['administrador', 'supervisor'])) {
        jsonResponse(false, 'No tienes permisos.', null, 403);
    }
}

try {
    switch ($action) {
        case 'list':       listar();      break;
        case 'save_cargo': guardarCargo(); break;
        case 'save_all':   guardarTodo();  break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Throwable $e) {
    error_log('[epp/matriz] ' . $e->getMessage());
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ============================================================
// Lista la matriz. Con &cargo= devuelve solo ese cargo (para el editor);
// sin cargo, toda la matriz unida al catálogo (para sugerencia en entrega).
function listar() {
    $cargo = trim($_GET['cargo'] ?? '');
    $params = [];
    $whereCargo = '';
    if ($cargo !== '') {
        if (!in_array($cargo, EPP_CARGOS, true)) jsonResponse(false, 'Cargo inválido.', null, 422);
        $whereCargo = 'AND m.cargo = ?';
        $params[] = $cargo;
    }
    // Solo EPP activos (un tipo desactivado no debe sugerirse).
    $rows = db()->fetchAll(
        "SELECT m.cargo, m.tipo_epp_id, m.cantidad, m.obligatorio, t.nombre AS tipo_nombre, t.unidad
           FROM epp_puesto_matriz m
           JOIN epp_tipos t ON t.id = m.tipo_epp_id AND t.activo = 1
          WHERE 1=1 $whereCargo
          ORDER BY m.cargo, t.nombre",
        $params
    );
    foreach ($rows as &$r) {
        $r['tipo_epp_id'] = (int)$r['tipo_epp_id'];
        $r['cantidad']    = (int)$r['cantidad'];
        $r['obligatorio'] = (int)$r['obligatorio'];
    }
    unset($r);
    jsonResponse(true, '', $rows);
}

// Reemplaza el conjunto de EPP de un cargo: borra las filas del cargo e inserta
// las nuevas. Todo en una transacción para no dejar el kit a medias.
function guardarCargo() {
    $cargo = trim($_POST['cargo'] ?? '');
    if (!in_array($cargo, EPP_CARGOS, true)) jsonResponse(false, 'Cargo inválido.', null, 422);

    $items = json_decode($_POST['items'] ?? '[]', true);
    if (!is_array($items)) $items = [];

    // Consolida por tipo (evita duplicados) y valida cantidades.
    $limpio = [];
    foreach ($items as $it) {
        $tid  = (int)($it['tipo_epp_id'] ?? 0);
        $cant = max(1, (int)($it['cantidad'] ?? 1));
        $obl  = !empty($it['obligatorio']) ? 1 : 0;
        if ($tid <= 0) continue;
        $limpio[$tid] = ['cantidad' => $cant, 'obligatorio' => $obl];
    }

    // Verifica que los tipos existan y estén activos.
    if (count($limpio)) {
        $ids = implode(',', array_map('intval', array_keys($limpio)));
        $validos = db()->fetchAll("SELECT id FROM epp_tipos WHERE id IN ($ids) AND activo = 1");
        $setValidos = array_column($validos, 'id');
        foreach (array_keys($limpio) as $tid) {
            if (!in_array($tid, $setValidos)) {
                jsonResponse(false, 'La lista incluye un EPP inexistente o inactivo.', null, 422);
            }
        }
    }

    try {
        db()->beginTransaction();
        db()->query("DELETE FROM epp_puesto_matriz WHERE cargo = ?", [$cargo]);
        foreach ($limpio as $tid => $d) {
            db()->query(
                "INSERT INTO epp_puesto_matriz (cargo, tipo_epp_id, cantidad, obligatorio)
                 VALUES (?, ?, ?, ?)",
                [$cargo, $tid, $d['cantidad'], $d['obligatorio']]
            );
        }
        db()->commit();
    } catch (Exception $e) {
        db()->rollback();
        error_log('[epp/matriz:save_cargo] ' . $e->getMessage());
        jsonResponse(false, 'Error al guardar la matriz.', null, 500);
    }
    jsonResponse(true, 'Matriz del puesto guardada.', ['cargo' => $cargo, 'lineas' => count($limpio)]);
}

// Reemplaza TODA la matriz (todos los cargos) en una sola transacción.
// Recibe: matriz = { cargo: [{tipo_epp_id, cantidad, obligatorio}], ... }
function guardarTodo() {
    $matriz = json_decode($_POST['matriz'] ?? '{}', true);
    if (!is_array($matriz)) jsonResponse(false, 'Datos inválidos.', null, 422);

    // Tipos activos válidos (para no insertar EPP inexistentes/inactivos).
    $validos = array_column(db()->fetchAll("SELECT id FROM epp_tipos WHERE activo = 1"), 'id');
    $validos = array_map('intval', $validos);

    $total = 0;
    try {
        db()->beginTransaction();
        foreach (EPP_CARGOS as $cargo) {
            db()->query("DELETE FROM epp_puesto_matriz WHERE cargo = ?", [$cargo]);
            $lineas = $matriz[$cargo] ?? [];
            if (!is_array($lineas)) continue;
            $vistos = [];
            foreach ($lineas as $l) {
                $tid  = (int)($l['tipo_epp_id'] ?? 0);
                $cant = max(1, (int)($l['cantidad'] ?? 1));
                $obl  = !empty($l['obligatorio']) ? 1 : 0;
                if ($tid <= 0 || !in_array($tid, $validos, true) || isset($vistos[$tid])) continue;
                $vistos[$tid] = true;
                db()->query(
                    "INSERT INTO epp_puesto_matriz (cargo, tipo_epp_id, cantidad, obligatorio) VALUES (?, ?, ?, ?)",
                    [$cargo, $tid, $cant, $obl]
                );
                $total++;
            }
        }
        db()->commit();
    } catch (Throwable $e) {
        db()->rollback();
        error_log('[epp/matriz:save_all] ' . $e->getMessage());
        jsonResponse(false, 'Error al guardar la matriz.', null, 500);
    }
    jsonResponse(true, 'Matriz guardada.', ['lineas' => $total]);
}
