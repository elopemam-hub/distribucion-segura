<?php
// ============================================================
// API: CRUD DE USUARIOS
// Archivo: api/usuarios.php
// Acciones: list, get, save, desactivar, cambiar_password
// Solo ADMINISTRADOR puede acceder
// ============================================================

require_once __DIR__ . '/../includes/auth.php';

requireLogin();
requireRole(['administrador']);
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

if (in_array($action, ['save', 'desactivar', 'cambiar_password', 'permisos_save', 'cambiar_rol'], true)) {
    requireCsrf();
}

try {
    switch ($action) {
        case 'list':             listar(); break;
        case 'get':              obtener(); break;
        case 'save':             guardar(); break;
        case 'desactivar':       desactivar(); break;
        case 'cambiar_password': cambiarPassword(); break;
        case 'permisos_get':     permisosGet(); break;
        case 'permisos_save':    permisosSave(); break;
        case 'cambiar_rol':      cambiarRol(); break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Exception $e) {
    error_log('[usuarios] ' . $e->getMessage());
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ------------------------------------------------------------
function listar() {
    $rows = db()->fetchAll(
        "SELECT id, nombre, usuario, rol, activo, creado_en
         FROM usuarios ORDER BY activo DESC, nombre ASC"
    );
    jsonResponse(true, '', $rows);
}

function obtener() {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    $u = db()->fetchOne("SELECT id, nombre, usuario, rol, activo FROM usuarios WHERE id = ?", [$id]);
    if (!$u) jsonResponse(false, 'No encontrado.', null, 404);
    jsonResponse(true, '', $u);
}

function guardar() {
    $id       = (int)($_POST['id'] ?? 0);
    $nombre   = trim($_POST['nombre'] ?? '');
    $usuario  = trim($_POST['usuario'] ?? '');
    $rol      = $_POST['rol'] ?? 'inspector';
    $password = $_POST['password'] ?? '';
    $activo   = isset($_POST['activo']) ? (int)$_POST['activo'] : 1;

    if ($nombre === '')  jsonResponse(false, 'El nombre es requerido.', null, 422);
    if ($usuario === '' || mb_strlen($usuario) < 3) {
        jsonResponse(false, 'Usuario debe tener al menos 3 caracteres.', null, 422);
    }
    if (!preg_match('/^[a-zA-Z0-9_\.\-]+$/', $usuario)) {
        jsonResponse(false, 'Usuario solo puede tener letras, números, punto, guion y guion bajo.', null, 422);
    }
    if (!in_array($rol, ['administrador','supervisor','inspector'], true)) {
        jsonResponse(false, 'Rol inválido.', null, 422);
    }

    // Usuario único
    $existe = db()->fetchOne("SELECT id FROM usuarios WHERE usuario = ? AND id <> ?", [$usuario, $id]);
    if ($existe) jsonResponse(false, 'Ese nombre de usuario ya está en uso.', null, 409);

    if ($id > 0) {
        // Editar: password solo si se envía nuevo
        if ($password !== '') {
            if (mb_strlen($password) < 6) jsonResponse(false, 'La contraseña debe tener mínimo 6 caracteres.', null, 422);
            $hash = password_hash($password, PASSWORD_BCRYPT);
            db()->query(
                "UPDATE usuarios SET nombre=?, usuario=?, rol=?, activo=?, password=? WHERE id=?",
                [$nombre, $usuario, $rol, $activo, $hash, $id]
            );
        } else {
            db()->query(
                "UPDATE usuarios SET nombre=?, usuario=?, rol=?, activo=? WHERE id=?",
                [$nombre, $usuario, $rol, $activo, $id]
            );
        }
        jsonResponse(true, 'Usuario actualizado.', ['id' => $id]);
    } else {
        // Crear nuevo: password obligatoria
        if (mb_strlen($password) < 6) jsonResponse(false, 'La contraseña debe tener mínimo 6 caracteres.', null, 422);
        $hash = password_hash($password, PASSWORD_BCRYPT);
        db()->query(
            "INSERT INTO usuarios (nombre, usuario, password, rol, activo) VALUES (?, ?, ?, ?, ?)",
            [$nombre, $usuario, $hash, $rol, $activo]
        );
        jsonResponse(true, 'Usuario creado.', ['id' => db()->lastInsertId()]);
    }
}

function desactivar() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);

    // No permitir que el admin se desactive a sí mismo
    $me = getCurrentUser();
    if ($id == $me['id']) jsonResponse(false, 'No puedes desactivar tu propio usuario.', null, 400);

    // Evitar dejar el sistema sin ningún admin activo
    $u = db()->fetchOne("SELECT rol FROM usuarios WHERE id = ?", [$id]);
    if ($u && $u['rol'] === 'administrador') {
        $otrosAdmins = db()->fetchOne(
            "SELECT COUNT(*) c FROM usuarios WHERE rol='administrador' AND activo=1 AND id <> ?", [$id]
        )['c'];
        if ($otrosAdmins == 0) {
            jsonResponse(false, 'No puedes desactivar al único administrador activo.', null, 400);
        }
    }

    db()->query("UPDATE usuarios SET activo = 0 WHERE id = ?", [$id]);
    jsonResponse(true, 'Usuario desactivado.');
}

function cambiarPassword() {
    $id  = (int)($_POST['id'] ?? 0);
    $pwd = $_POST['password'] ?? '';
    if ($id <= 0 || mb_strlen($pwd) < 6) {
        jsonResponse(false, 'Datos inválidos (mínimo 6 caracteres).', null, 422);
    }
    $hash = password_hash($pwd, PASSWORD_BCRYPT);
    db()->query("UPDATE usuarios SET password = ? WHERE id = ?", [$hash, $id]);
    jsonResponse(true, 'Contraseña actualizada.');
}

// ------------------------------------------------------------
function cambiarRol() {
    $id            = (int)($_POST['id']            ?? 0);
    $rol           = trim($_POST['rol']            ?? '');
    $resetPermisos = !empty($_POST['reset_permisos']);

    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    if (!in_array($rol, ['administrador','supervisor','inspector'], true))
        jsonResponse(false, 'Rol inválido.', null, 422);

    // Proteger al único administrador activo
    $u = db()->fetchOne("SELECT rol FROM usuarios WHERE id = ?", [$id]);
    if (!$u) jsonResponse(false, 'Usuario no encontrado.', null, 404);

    if ($u['rol'] === 'administrador' && $rol !== 'administrador') {
        $otrosAdmins = db()->fetchOne(
            "SELECT COUNT(*) c FROM usuarios WHERE rol='administrador' AND activo=1 AND id <> ?", [$id]
        )['c'];
        if ($otrosAdmins == 0)
            jsonResponse(false, 'No puedes cambiar el rol del único administrador activo.', null, 400);
    }

    db()->beginTransaction();
    try {
        db()->query("UPDATE usuarios SET rol = ? WHERE id = ?", [$rol, $id]);
        if ($resetPermisos) {
            db()->query("DELETE FROM permisos WHERE usuario_id = ?", [$id]);
        }
        db()->commit();
        $msg = 'Rol actualizado a "' . $rol . '"';
        if ($resetPermisos) $msg .= '. Permisos reiniciados (usará defaults del rol).';
        jsonResponse(true, $msg);
    } catch (Exception $e) {
        db()->rollback();
        error_log('[cambiar_rol] ' . $e->getMessage());
        jsonResponse(false, 'Error al actualizar.', null, 500);
    }
}

// ------------------------------------------------------------
function permisosGet() {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);

    $u = db()->fetchOne("SELECT rol FROM usuarios WHERE id = ?", [$id]);
    if (!$u) jsonResponse(false, 'Usuario no encontrado.', null, 404);

    $rows = db()->fetchAll("SELECT modulo FROM permisos WHERE usuario_id = ?", [$id]);
    jsonResponse(true, '', [
        'rol'     => $u['rol'],
        'modulos' => array_column($rows, 'modulo'),
    ]);
}

// ------------------------------------------------------------
function permisosSave() {
    $id      = (int)($_POST['id'] ?? 0);
    $modulosRaw = $_POST['modulos'] ?? '[]';
    $modulos = json_decode($modulosRaw, true);

    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);

    $u = db()->fetchOne("SELECT rol FROM usuarios WHERE id = ?", [$id]);
    if (!$u) jsonResponse(false, 'Usuario no encontrado.', null, 404);

    // Admins no necesitan permisos (tienen todo)
    if ($u['rol'] === 'administrador') {
        jsonResponse(true, 'Administrador tiene acceso completo, no requiere permisos.');
    }

    // Validar módulos
    $validos = ['dashboard', 'inspecciones', 'personal', 'reportes', 'matriz', 'amonestaciones', 'geocercas', 'evaluaciones', 'kpi_analytics'];
    $modulosLimpios = array_filter(
        is_array($modulos) ? $modulos : [],
        fn($m) => in_array($m, $validos, true)
    );

    db()->beginTransaction();
    try {
        db()->query("DELETE FROM permisos WHERE usuario_id = ?", [$id]);
        foreach ($modulosLimpios as $modulo) {
            db()->query(
                "INSERT INTO permisos (usuario_id, modulo) VALUES (?, ?)",
                [$id, $modulo]
            );
        }
        db()->commit();
        jsonResponse(true, 'Permisos guardados correctamente.', ['modulos' => array_values($modulosLimpios)]);
    } catch (Exception $e) {
        db()->rollback();
        error_log('[permisos_save] ' . $e->getMessage());
        jsonResponse(false, 'Error al guardar permisos.', null, 500);
    }
}
