<?php
// ============================================================
// API EPP: catálogo de tallas reutilizable
// Archivo: api/epp/tallas.php
// Acciones (?action=): list, save, toggle
// Alimenta el selector de talla del catálogo de EPP.
// ============================================================

require_once __DIR__ . '/../../includes/auth.php';

requireLogin();
setupEpp();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

$mutaciones = ['save', 'toggle'];
if (in_array($action, $mutaciones, true)) {
    requireCsrf();
    $user = getCurrentUser();
    if (!in_array($user['rol'], ['administrador', 'supervisor'])) {
        jsonResponse(false, 'No tienes permisos.', null, 403);
    }
}

try {
    switch ($action) {
        case 'list':   listar();  break;
        case 'save':   guardar(); break;
        case 'toggle': toggle();  break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Throwable $e) {
    error_log('[epp/tallas] ' . $e->getMessage());
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ============================================================
function listar() {
    $incluirInactivos = ($_GET['todos'] ?? '') === '1';
    $where = $incluirInactivos ? '1=1' : 'activo = 1';
    $rows = db()->fetchAll("SELECT id, nombre, orden, activo FROM epp_tallas WHERE $where ORDER BY orden ASC, nombre ASC");
    jsonResponse(true, '', $rows);
}

function guardar() {
    $id     = (int)($_POST['id'] ?? 0);
    $nombre = trim($_POST['nombre'] ?? '');
    $orden  = (int)($_POST['orden'] ?? 0);

    if ($nombre === '') jsonResponse(false, 'El nombre de la talla es requerido.', null, 422);

    $dup = db()->fetchOne("SELECT id FROM epp_tallas WHERE nombre = ? AND id <> ?", [$nombre, $id]);
    if ($dup) jsonResponse(false, 'Ya existe una talla con ese nombre.', null, 422);

    if ($id > 0) {
        db()->query("UPDATE epp_tallas SET nombre = ?, orden = ? WHERE id = ?", [$nombre, $orden, $id]);
        jsonResponse(true, 'Talla actualizada.', ['id' => $id]);
    } else {
        db()->query("INSERT INTO epp_tallas (nombre, orden) VALUES (?, ?)", [$nombre, $orden]);
        jsonResponse(true, 'Talla creada.', ['id' => db()->lastInsertId()]);
    }
}

function toggle() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 422);
    db()->query("UPDATE epp_tallas SET activo = 1 - activo WHERE id = ?", [$id]);
    $row = db()->fetchOne("SELECT activo FROM epp_tallas WHERE id = ?", [$id]);
    jsonResponse(true, 'Estado actualizado.', ['activo' => (int)($row['activo'] ?? 0)]);
}
