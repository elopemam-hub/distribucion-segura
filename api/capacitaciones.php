<?php
// ============================================================
// API: CAPACITACIONES
// Archivo: api/capacitaciones.php
// Programa anual de capacitación SST (Ley 29783 Art. 35). Tabla unificada con
// discriminador `tipo`: cronograma | semana | alerta | campana.
// Acciones (?action=): list, get, save, delete, estado
// ============================================================

require_once __DIR__ . '/../includes/auth.php';

requireLogin();
setupCapacitaciones();
header('Content-Type: application/json; charset=utf-8');

const CAP_TIPOS   = ['cronograma', 'semana', 'alerta', 'campana'];
const CAP_ESTADOS = ['programado', 'en_curso', 'ejecutado', 'reprogramado', 'cancelado'];

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

$mutaciones = ['save', 'delete', 'estado'];
if (in_array($action, $mutaciones, true)) {
    requireCsrf();
    $user = getCurrentUser();
    if (!in_array($user['rol'], ['administrador', 'supervisor'])) {
        jsonResponse(false, 'No tienes permisos.', null, 403);
    }
}

try {
    switch ($action) {
        case 'list':   listar();      break;
        case 'get':    obtener();     break;
        case 'save':   guardar();     break;
        case 'delete': eliminar();    break;
        case 'estado': cambiarEstado(); break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Throwable $e) {
    error_log('[capacitaciones] ' . $e->getMessage());
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ============================================================
function listar() {
    $tipo   = trim($_GET['tipo'] ?? '');
    $anio   = (int)($_GET['anio'] ?? 0);
    $estado = trim($_GET['estado'] ?? '');
    $q      = trim($_GET['q'] ?? '');

    $where = ['1=1']; $params = [];
    if (in_array($tipo, CAP_TIPOS, true))     { $where[] = 'tipo = ?';   $params[] = $tipo; }
    if ($anio > 0)                            { $where[] = 'anio = ?';   $params[] = $anio; }
    if (in_array($estado, CAP_ESTADOS, true)) { $where[] = 'estado = ?'; $params[] = $estado; }
    if ($q !== '') {
        $where[] = '(titulo LIKE ? OR descripcion LIKE ? OR responsable LIKE ?)';
        $params[] = "%$q%"; $params[] = "%$q%"; $params[] = "%$q%";
    }
    $whereSql = implode(' AND ', $where);

    $rows = db()->fetchAll(
        "SELECT * FROM capacitaciones WHERE $whereSql
         ORDER BY COALESCE(fecha, CONCAT(anio,'-01-01')) DESC, id DESC LIMIT 1000",
        $params
    );
    // Años disponibles para el filtro.
    $anios = array_map('intval', array_column(
        db()->fetchAll("SELECT DISTINCT anio FROM capacitaciones ORDER BY anio DESC"), 'anio'));
    jsonResponse(true, '', ['items' => $rows, 'anios' => $anios]);
}

function obtener() {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    $r = db()->fetchOne("SELECT * FROM capacitaciones WHERE id = ?", [$id]);
    if (!$r) jsonResponse(false, 'No encontrado.', null, 404);
    jsonResponse(true, '', $r);
}

function guardar() {
    $id    = (int)($_POST['id'] ?? 0);
    $tipo  = trim($_POST['tipo'] ?? '');
    if (!in_array($tipo, CAP_TIPOS, true)) jsonResponse(false, 'Tipo inválido.', null, 422);

    $titulo = trim($_POST['titulo'] ?? '');
    if ($titulo === '') jsonResponse(false, 'El título es obligatorio.', null, 422);

    $anio   = (int)($_POST['anio'] ?? 0);
    if ($anio < 2000 || $anio > 2100) $anio = (int)date('Y');

    $estado = trim($_POST['estado'] ?? 'programado');
    if (!in_array($estado, CAP_ESTADOS, true)) $estado = 'programado';

    $fecha    = _fechaOnull($_POST['fecha'] ?? '');
    $fechaFin = _fechaOnull($_POST['fecha_fin'] ?? '');
    $horas    = ($_POST['horas'] ?? '') === '' ? null : round((float)$_POST['horas'], 1);
    $partic   = ($_POST['participantes'] ?? '') === '' ? null : max(0, (int)$_POST['participantes']);

    $campos = [
        'tipo'          => $tipo,
        'anio'          => $anio,
        'titulo'        => $titulo,
        'subtipo'       => trim($_POST['subtipo'] ?? '') ?: null,
        'descripcion'   => trim($_POST['descripcion'] ?? '') ?: null,
        'dirigido_a'    => trim($_POST['dirigido_a'] ?? '') ?: null,
        'responsable'   => trim($_POST['responsable'] ?? '') ?: null,
        'lugar'         => trim($_POST['lugar'] ?? '') ?: null,
        'fecha'         => $fecha,
        'fecha_fin'     => $fechaFin,
        'hora'          => trim($_POST['hora'] ?? '') ?: null,
        'horas'         => $horas,
        'participantes' => $partic,
        'estado'        => $estado,
    ];

    // Imagen opcional (safety alert / campañas).
    $imagen = _guardarImagenCap();

    if ($id > 0) {
        $set = []; $vals = [];
        foreach ($campos as $k => $v) { $set[] = "`$k` = ?"; $vals[] = $v; }
        if ($imagen) { $set[] = "imagen = ?"; $vals[] = $imagen; }
        $vals[] = $id;
        db()->query("UPDATE capacitaciones SET " . implode(', ', $set) . " WHERE id = ?", $vals);
        jsonResponse(true, 'Registro actualizado.', ['id' => $id]);
    } else {
        $cols = array_keys($campos);
        $vals = array_values($campos);
        if ($imagen) { $cols[] = 'imagen'; $vals[] = $imagen; }
        $ph = implode(', ', array_fill(0, count($cols), '?'));
        db()->query("INSERT INTO capacitaciones (" . implode(', ', array_map(fn($c) => "`$c`", $cols)) . ") VALUES ($ph)", $vals);
        jsonResponse(true, 'Registro creado.', ['id' => db()->lastInsertId()]);
    }
}

function cambiarEstado() {
    $id     = (int)($_POST['id'] ?? 0);
    $estado = trim($_POST['estado'] ?? '');
    if ($id <= 0 || !in_array($estado, CAP_ESTADOS, true)) jsonResponse(false, 'Datos inválidos.', null, 422);
    db()->query("UPDATE capacitaciones SET estado = ? WHERE id = ?", [$estado, $id]);
    jsonResponse(true, 'Estado actualizado.');
}

function eliminar() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    $r = db()->fetchOne("SELECT imagen FROM capacitaciones WHERE id = ?", [$id]);
    if (!$r) jsonResponse(false, 'No encontrado.', null, 404);
    if (!empty($r['imagen']) && is_file(__DIR__ . '/../uploads/' . $r['imagen'])) @unlink(__DIR__ . '/../uploads/' . $r['imagen']);
    db()->query("DELETE FROM capacitaciones WHERE id = ?", [$id]);
    jsonResponse(true, 'Registro eliminado.');
}

// ------------------------------------------------------------
function _fechaOnull(string $f): ?string {
    return preg_match('/^\d{4}-\d{2}-\d{2}$/', $f) ? $f : null;
}

// Sube una imagen (safety alert / campaña) a uploads/capacitaciones/.
function _guardarImagenCap(): ?string {
    if (empty($_FILES['imagen']['tmp_name'])) return null;
    $file = $_FILES['imagen'];
    if ($file['error'] !== UPLOAD_ERR_OK) return null;
    if ($file['size'] <= 0 || $file['size'] > MAX_FILE_SIZE) return null;
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime  = $finfo->file($file['tmp_name']);
    $map   = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($map[$mime])) return null;
    if (@getimagesize($file['tmp_name']) === false) return null;
    $dir = __DIR__ . '/../uploads/capacitaciones/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $filename = 'cap_' . bin2hex(random_bytes(6)) . '.' . $map[$mime];
    if (move_uploaded_file($file['tmp_name'], $dir . $filename)) {
        @chmod($dir . $filename, 0644);
        return 'capacitaciones/' . $filename;
    }
    return null;
}
