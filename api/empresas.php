<?php
// ============================================================
// API EMPRESAS (multi-empresa, Fase 1)
// CRUD de las empresas tercerizadoras (Ley 29245). Cada una con su identidad
// legal (razón social, RUC, domicilio, actividad, responsable) y su logo, que
// luego alimentan la cabecera de los documentos oficiales por empresa.
// Acciones (?action=): list, get, save, toggle, delete_logo
// ============================================================

require_once __DIR__ . '/../includes/auth.php';

requireLogin();
setupEmpresas();
setupUsuarioEmpresas();   // restricción de empresas por usuario (Fase 3)
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

$mutaciones = ['save', 'toggle', 'delete_logo'];
if (in_array($action, $mutaciones, true)) {
    requireCsrf();
    $user = getCurrentUser();
    if (!in_array($user['rol'], ['administrador', 'supervisor'])) {
        jsonResponse(false, 'No tienes permisos.', null, 403);
    }
}

try {
    switch ($action) {
        case 'list':        listar();      break;
        case 'get':         obtener();     break;
        case 'save':        guardar();     break;
        case 'toggle':      alternar();    break;
        case 'delete_logo': eliminarLogo(); break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Throwable $e) {
    error_log('[empresas] ' . $e->getMessage());
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ============================================================
function listar() {
    $soloActivas = ($_GET['activas'] ?? '') === '1';
    $conds = []; $params = [];
    if ($soloActivas) $conds[] = 'e.activo = 1';
    // Restricción por empresa del usuario (Fase 3): solo ve sus empresas.
    [$empRestr, $empRestrP] = empresaWhere('e.id');
    $whereSql = $conds ? ('WHERE ' . implode(' AND ', $conds)) : 'WHERE 1=1';
    $whereSql .= $empRestr;
    $params = array_merge($params, $empRestrP);
    $rows = db()->fetchAll(
        "SELECT e.*,
                (SELECT COUNT(*) FROM personal p WHERE p.empresa_id = e.id AND p.activo = 1) AS num_trab
           FROM empresas e $whereSql
          ORDER BY e.activo DESC, e.razon_social ASC",
        $params
    );
    jsonResponse(true, '', ['empresas' => $rows]);
}

function obtener() {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    if (!empresaEsPermitida($id)) jsonResponse(false, 'Sin acceso a esta empresa.', null, 403);
    $e = db()->fetchOne("SELECT * FROM empresas WHERE id = ?", [$id]);
    if (!$e) jsonResponse(false, 'No encontrada.', null, 404);
    jsonResponse(true, '', $e);
}

function guardar() {
    $id           = (int)($_POST['id'] ?? 0);
    $razon        = trim($_POST['razon_social'] ?? '');
    $ruc          = trim($_POST['ruc'] ?? '');
    $tipo         = trim($_POST['tipo'] ?? 'tercerizacion');
    $domicilio    = trim($_POST['domicilio'] ?? '');
    $actividad    = trim($_POST['actividad'] ?? '');
    $responsable  = trim($_POST['responsable'] ?? '');
    $telefono     = trim($_POST['telefono'] ?? '');
    $email        = trim($_POST['email'] ?? '');
    $color        = trim($_POST['color'] ?? '');

    if ($razon === '') jsonResponse(false, 'La razón social es obligatoria.', null, 422);
    if ($id > 0 && !empresaEsPermitida($id)) jsonResponse(false, 'Sin acceso a esta empresa.', null, 403);
    if ($ruc !== '' && !preg_match('/^\d{11}$/', $ruc)) {
        jsonResponse(false, 'El RUC debe tener 11 dígitos.', null, 422);
    }
    // RUC único (si se indicó).
    if ($ruc !== '') {
        $dup = db()->fetchOne("SELECT id FROM empresas WHERE ruc = ? AND id <> ?", [$ruc, $id]);
        if ($dup) jsonResponse(false, 'Ya existe una empresa con ese RUC.', null, 422);
    }

    $campos = [$razon, $ruc ?: null, $tipo ?: 'tercerizacion', $domicilio ?: null,
               $actividad ?: null, $responsable ?: null, $telefono ?: null, $email ?: null, $color ?: null];

    if ($id > 0) {
        db()->query(
            "UPDATE empresas SET razon_social=?, ruc=?, tipo=?, domicilio=?, actividad=?,
                    responsable=?, telefono=?, email=?, color=? WHERE id=?",
            array_merge($campos, [$id])
        );
    } else {
        db()->query(
            "INSERT INTO empresas (razon_social, ruc, tipo, domicilio, actividad,
                    responsable, telefono, email, color) VALUES (?,?,?,?,?,?,?,?,?)",
            $campos
        );
        $id = (int)db()->lastInsertId();
    }

    // Logo (opcional): imagen a uploads/empresas/. Reemplaza el anterior.
    if (!empty($_FILES['logo']['tmp_name'])) {
        $ruta = guardarLogoEmpresa($_FILES['logo']);
        if (!$ruta) jsonResponse(false, 'El logo debe ser una imagen (JPG/PNG/WEBP) de máx 5MB.', null, 422);
        $ant = db()->fetchOne("SELECT logo FROM empresas WHERE id = ?", [$id])['logo'] ?? '';
        if ($ant && is_file(__DIR__ . '/../uploads/' . $ant)) @unlink(__DIR__ . '/../uploads/' . $ant);
        db()->query("UPDATE empresas SET logo = ? WHERE id = ?", [$ruta, $id]);
    }

    jsonResponse(true, 'Empresa guardada.', ['id' => $id]);
}

function alternar() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    if (!empresaEsPermitida($id)) jsonResponse(false, 'Sin acceso a esta empresa.', null, 403);
    db()->query("UPDATE empresas SET activo = 1 - activo WHERE id = ?", [$id]);
    jsonResponse(true, 'Estado actualizado.');
}

function eliminarLogo() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    if (!empresaEsPermitida($id)) jsonResponse(false, 'Sin acceso a esta empresa.', null, 403);
    $ant = db()->fetchOne("SELECT logo FROM empresas WHERE id = ?", [$id])['logo'] ?? '';
    if ($ant && is_file(__DIR__ . '/../uploads/' . $ant)) @unlink(__DIR__ . '/../uploads/' . $ant);
    db()->query("UPDATE empresas SET logo = NULL WHERE id = ?", [$id]);
    jsonResponse(true, 'Logo eliminado.');
}

// Sube el logo (solo imagen) a uploads/empresas/. Devuelve ruta relativa o null.
function guardarLogoEmpresa(array $file): ?string {
    if ($file['error'] !== UPLOAD_ERR_OK) return null;
    if ($file['size'] <= 0 || $file['size'] > MAX_FILE_SIZE) return null;
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime  = $finfo->file($file['tmp_name']);
    $map   = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($map[$mime])) return null;
    if (@getimagesize($file['tmp_name']) === false) return null;
    $dir = __DIR__ . '/../uploads/empresas/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $filename = 'emp_' . bin2hex(random_bytes(6)) . '.' . $map[$mime];
    if (move_uploaded_file($file['tmp_name'], $dir . $filename)) {
        @chmod($dir . $filename, 0644);
        return 'empresas/' . $filename;
    }
    return null;
}
