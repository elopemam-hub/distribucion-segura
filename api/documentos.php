<?php
// ============================================================
// API BIBLIOTECA DE DOCUMENTOS SST
// Archivo: api/documentos.php
// Acciones: list, cat_list, save (subir), delete, cat_save, cat_del
// Subir/eliminar: admin y supervisor. Ver/descargar: cualquiera con acceso.
// ============================================================

require_once __DIR__ . '/../includes/auth.php';
requireLogin();
if (!tieneAccesoModulo('documentos')) jsonResponse(false, 'Acceso no autorizado.', null, 403);
setupDocumentos();
header('Content-Type: application/json; charset=utf-8');

const DOC_EXT = ['png', 'jpg', 'jpeg', 'webp', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'];
const DOC_MAX = 25 * 1024 * 1024;   // 25 MB

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

$mutaciones = ['save', 'delete', 'cat_save', 'cat_del'];
if (in_array($action, $mutaciones, true)) {
    requireCsrf();
    $user = getCurrentUser();
    if (!in_array($user['rol'], ['administrador', 'supervisor'], true)) {
        jsonResponse(false, 'Solo administrador o supervisor pueden gestionar documentos.', null, 403);
    }
}

try {
    switch ($action) {
        case 'list':     listar();   break;
        case 'cat_list': catList();  break;
        case 'save':     guardar();  break;
        case 'delete':   eliminar(); break;
        case 'cat_save': catSave();  break;
        case 'cat_del':  catDel();   break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Throwable $e) {
    error_log('[documentos] ' . $e->getMessage());
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ------------------------------------------------------------
function catList() {
    $rows = db()->fetchAll("SELECT id, nombre, orden, activo FROM doc_categorias ORDER BY orden ASC, nombre ASC");
    jsonResponse(true, '', ['categorias' => $rows]);
}

function listar() {
    $cat = (int)($_GET['categoria_id'] ?? 0);
    $q   = trim($_GET['q'] ?? '');
    $where = ['d.activo = 1']; $params = [];
    if ($cat > 0) { $where[] = 'd.categoria_id = ?'; $params[] = $cat; }
    if ($q !== '') { $where[] = '(d.titulo LIKE ? OR d.descripcion LIKE ? OR d.nombre_original LIKE ?)'; $lk = "%$q%"; $params[] = $lk; $params[] = $lk; $params[] = $lk; }
    $whereSql = implode(' AND ', $where);
    $rows = db()->fetchAll(
        "SELECT d.id, d.categoria_id, c.nombre AS categoria, d.titulo, d.descripcion,
                d.archivo, d.nombre_original, d.ext, d.tamano, d.subido_nombre, d.creado_en
           FROM documentos d
           LEFT JOIN doc_categorias c ON c.id = d.categoria_id
          WHERE $whereSql
          ORDER BY d.creado_en DESC, d.id DESC LIMIT 1000",
        $params
    );
    $cats = db()->fetchAll("SELECT id, nombre FROM doc_categorias WHERE activo = 1 ORDER BY orden ASC, nombre ASC");
    jsonResponse(true, '', ['documentos' => $rows, 'categorias' => $cats, 'total' => count($rows)]);
}

function guardar() {
    $titulo = trim($_POST['titulo'] ?? '');
    $desc   = trim($_POST['descripcion'] ?? '');
    $cat    = (int)($_POST['categoria_id'] ?? 0);
    if ($titulo === '') jsonResponse(false, 'El título es obligatorio.', null, 422);
    if (empty($_FILES['archivo']['tmp_name'])) jsonResponse(false, 'Selecciona un archivo.', null, 422);

    $f = $_FILES['archivo'];
    if (($f['error'] ?? 1) !== UPLOAD_ERR_OK) {
        jsonResponse(false, ($f['error'] ?? 0) === UPLOAD_ERR_INI_SIZE ? 'El archivo es muy grande.' : 'No se recibió el archivo.', null, 422);
    }
    if ($f['size'] > DOC_MAX) jsonResponse(false, 'El archivo supera el máximo (25 MB).', null, 422);
    $ext = strtolower(pathinfo($f['name'] ?? '', PATHINFO_EXTENSION));
    if (!in_array($ext, DOC_EXT, true)) {
        jsonResponse(false, 'Tipo no permitido. Usa PDF, imagen, Word, Excel o PowerPoint.', null, 422);
    }
    $dir = __DIR__ . '/../uploads/documentos/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $name = 'doc_' . date('Ymd') . '_' . bin2hex(random_bytes(5)) . '.' . $ext;
    if (!move_uploaded_file($f['tmp_name'], $dir . $name)) jsonResponse(false, 'No se pudo guardar el archivo.', null, 500);
    @chmod($dir . $name, 0644);

    $user = getCurrentUser();
    db()->query(
        "INSERT INTO documentos (categoria_id, titulo, descripcion, archivo, nombre_original, ext, tamano, subido_por, subido_nombre)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [$cat ?: null, $titulo, $desc ?: null, 'documentos/' . $name, $f['name'], $ext, (int)$f['size'], $user['id'] ?? null, $user['nombre'] ?? null]
    );
    jsonResponse(true, 'Documento subido.', ['id' => db()->lastInsertId()]);
}

function eliminar() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    $user = getCurrentUser();
    if ($user['rol'] !== 'administrador') jsonResponse(false, 'Solo el administrador puede eliminar documentos.', null, 403);
    $d = db()->fetchOne("SELECT archivo FROM documentos WHERE id = ?", [$id]);
    if ($d && !empty($d['archivo']) && is_file(__DIR__ . '/../uploads/' . $d['archivo'])) @unlink(__DIR__ . '/../uploads/' . $d['archivo']);
    db()->query("DELETE FROM documentos WHERE id = ?", [$id]);
    jsonResponse(true, 'Documento eliminado.');
}

function catSave() {
    $id     = (int)($_POST['id'] ?? 0);
    $nombre = trim($_POST['nombre'] ?? '');
    $orden  = (int)($_POST['orden'] ?? 0);
    if ($nombre === '') jsonResponse(false, 'El nombre es obligatorio.', null, 422);
    if ($id > 0) db()->query("UPDATE doc_categorias SET nombre=?, orden=? WHERE id=?", [$nombre, $orden, $id]);
    else         db()->query("INSERT INTO doc_categorias (nombre, orden) VALUES (?, ?)", [$nombre, $orden]);
    jsonResponse(true, 'Categoría guardada.');
}

function catDel() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    $user = getCurrentUser();
    if ($user['rol'] !== 'administrador') jsonResponse(false, 'Solo el administrador puede eliminar categorías.', null, 403);
    $n = (int)(db()->fetchOne("SELECT COUNT(*) c FROM documentos WHERE categoria_id = ? AND activo = 1", [$id])['c'] ?? 0);
    if ($n > 0) jsonResponse(false, "La categoría tiene $n documento(s). Muévelos o elimínalos primero.", null, 409);
    db()->query("DELETE FROM doc_categorias WHERE id = ?", [$id]);
    jsonResponse(true, 'Categoría eliminada.');
}
