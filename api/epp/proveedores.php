<?php
// ============================================================
// API EPP: CRUD de proveedores de EPP
// Archivo: api/epp/proveedores.php
// Acciones (?action=): list, save, toggle
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
} catch (Exception $e) {
    error_log('[epp/proveedores] ' . $e->getMessage());
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ============================================================
function listar() {
    $incluirInactivos = ($_GET['todos'] ?? '') === '1';
    $where = $incluirInactivos ? '1=1' : 'activo = 1';
    $rows = db()->fetchAll(
        "SELECT id, razon_social, ruc, contacto, telefono, email, direccion, certificaciones, activo
           FROM epp_proveedores WHERE $where ORDER BY razon_social ASC"
    );
    jsonResponse(true, '', $rows);
}

function guardar() {
    $id      = (int)($_POST['id'] ?? 0);
    $razon   = trim($_POST['razon_social'] ?? '');
    $ruc     = trim($_POST['ruc'] ?? '');
    $contacto= trim($_POST['contacto'] ?? '');
    $telefono= trim($_POST['telefono'] ?? '');
    $email   = trim($_POST['email'] ?? '');
    $direccion = trim($_POST['direccion'] ?? '');
    $certif  = trim($_POST['certificaciones'] ?? '');

    if ($razon === '') jsonResponse(false, 'La razón social es requerida.', null, 422);
    // RUC peruano: 11 dígitos (opcional, pero si se ingresa se valida)
    if ($ruc !== '' && !preg_match('/^\d{11}$/', $ruc)) {
        jsonResponse(false, 'El RUC debe tener 11 dígitos.', null, 422);
    }
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(false, 'El correo no es válido.', null, 422);
    }

    $params = [$razon, $ruc ?: null, $contacto ?: null, $telefono ?: null,
               $email ?: null, $direccion ?: null, $certif ?: null];

    if ($id > 0) {
        db()->query(
            "UPDATE epp_proveedores SET razon_social=?, ruc=?, contacto=?, telefono=?, email=?, direccion=?, certificaciones=?
              WHERE id=?",
            [...$params, $id]
        );
        jsonResponse(true, 'Proveedor actualizado.', ['id' => $id]);
    } else {
        db()->query(
            "INSERT INTO epp_proveedores (razon_social, ruc, contacto, telefono, email, direccion, certificaciones)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            $params
        );
        jsonResponse(true, 'Proveedor creado.', ['id' => db()->lastInsertId()]);
    }
}

function toggle() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 422);
    db()->query("UPDATE epp_proveedores SET activo = 1 - activo WHERE id = ?", [$id]);
    $row = db()->fetchOne("SELECT activo FROM epp_proveedores WHERE id = ?", [$id]);
    jsonResponse(true, 'Estado actualizado.', ['activo' => (int)($row['activo'] ?? 0)]);
}
