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

const CAP_TIPOS    = ['cronograma', 'semana', 'alerta', 'campana'];
const CAP_ESTADOS  = ['programado', 'en_curso', 'ejecutado', 'reprogramado', 'cancelado'];
// Debe declararse ANTES del switch (los const de nivel superior no se hoistean
// y adjuntoAdd() la usa desde el dispatch).
const CAP_ADJ_TIPOS = ['material', 'foto', 'asistencia'];

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

$mutaciones = ['save', 'delete', 'estado', 'adjunto_add', 'adjunto_del', 'asistente_add', 'asistente_masivo', 'asistente_firma', 'asistente_del'];
if (in_array($action, $mutaciones, true)) {
    requireCsrf();
    $user = getCurrentUser();
    if (!in_array($user['rol'], ['administrador', 'supervisor'])) {
        jsonResponse(false, 'No tienes permisos.', null, 403);
    }
    // Eliminar (registros, adjuntos, asistentes) es exclusivo del administrador.
    if (in_array($action, ['delete', 'adjunto_del', 'asistente_del'], true) && $user['rol'] !== 'administrador') {
        jsonResponse(false, 'Solo un administrador puede eliminar.', null, 403);
    }
}

// Ya validamos auth/CSRF: libera el lock de sesión para no serializar las
// peticiones (subidas en paralelo, navegación fluida mientras se sube).
liberarSesion();

try {
    switch ($action) {
        case 'list':           listar();        break;
        case 'resumen':        resumen();       break;
        case 'get':            obtener();       break;
        case 'save':           guardar();       break;
        case 'delete':         eliminar();      break;
        case 'estado':         cambiarEstado(); break;
        case 'evidencia':      evidencia();     break;
        case 'adjunto_add':    adjuntoAdd();    break;
        case 'adjunto_del':    adjuntoDel();    break;
        case 'asistente_add':  asistenteAdd();  break;
        case 'asistente_masivo': asistenteMasivo(); break;
        case 'asistente_firma':asistenteFirma();break;
        case 'asistente_del':  asistenteDel();  break;
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

// Resumen de evidencia por actividad: cada capacitación con el conteo de su
// evidencia (material, fotos, asistentes/firmados, hoja firmada).
function resumen() {
    $anio = (int)($_GET['anio'] ?? 0);
    if ($anio < 2000) $anio = (int)date('Y');

    $rows = db()->fetchAll(
        "SELECT c.id, c.tipo, c.titulo, c.subtipo, c.fecha, c.responsable, c.estado,
                (SELECT COUNT(*) FROM cap_adjuntos a WHERE a.capacitacion_id = c.id AND a.tipo = 'material')    AS n_material,
                (SELECT COUNT(*) FROM cap_adjuntos a WHERE a.capacitacion_id = c.id AND a.tipo = 'foto')        AS n_foto,
                (SELECT COUNT(*) FROM cap_adjuntos a WHERE a.capacitacion_id = c.id AND a.tipo = 'asistencia')  AS n_hoja,
                (SELECT COUNT(*) FROM cap_asistentes s WHERE s.capacitacion_id = c.id)                          AS n_asis,
                (SELECT COUNT(*) FROM cap_asistentes s WHERE s.capacitacion_id = c.id AND s.firma IS NOT NULL AND s.firma <> '') AS n_firmados
           FROM capacitaciones c
          WHERE c.anio = ?
          ORDER BY COALESCE(c.fecha, CONCAT(c.anio,'-01-01')) DESC, c.id DESC", [$anio]);

    $anios = array_map('intval', array_column(
        db()->fetchAll("SELECT DISTINCT anio FROM capacitaciones ORDER BY anio DESC"), 'anio'));

    jsonResponse(true, '', ['anio' => $anio, 'items' => $rows, 'anios' => $anios]);
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

// ============================================================
// EVIDENCIA / DESPLIEGUE: adjuntos (material/foto/asistencia) + asistentes
// ============================================================
function _capExiste(int $id): array {
    $r = db()->fetchOne("SELECT id, titulo, tipo FROM capacitaciones WHERE id = ?", [$id]);
    if (!$r) jsonResponse(false, 'Capacitación no encontrada.', null, 404);
    return $r;
}

// Devuelve adjuntos + asistentes de una capacitación (para poblar el panel).
function evidencia() {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    _capExiste($id);
    $adjuntos = db()->fetchAll(
        "SELECT id, tipo, archivo, nombre_original, creado_en FROM cap_adjuntos WHERE capacitacion_id = ? ORDER BY id ASC", [$id]);
    $asistentes = db()->fetchAll(
        "SELECT id, personal_id, nombre, dni, cargo, presente, (firma IS NOT NULL AND firma <> '') AS firmado
           FROM cap_asistentes WHERE capacitacion_id = ? ORDER BY nombre ASC", [$id]);
    jsonResponse(true, '', ['adjuntos' => $adjuntos, 'asistentes' => $asistentes]);
}

function adjuntoAdd() {
    $id   = (int)($_POST['capacitacion_id'] ?? 0);
    $tipo = trim($_POST['tipo'] ?? 'material');
    if ($id <= 0 || !in_array($tipo, CAP_ADJ_TIPOS, true)) jsonResponse(false, 'Datos inválidos.', null, 422);
    _capExiste($id);
    if (empty($_FILES['archivo']['tmp_name']) && ($_FILES['archivo']['error'] ?? 0) === UPLOAD_ERR_OK) {
        jsonResponse(false, 'No se recibió archivo.', null, 422);
    }
    [$ruta, $orig, $motivo] = _guardarAdjuntoCap($_FILES['archivo'], $tipo);
    if (!$ruta) {
        $msg = $motivo === 'grande' ? 'El archivo es muy grande (máx 20 MB; revisa también el límite del servidor).'
             : ($motivo === 'tipo' ? 'Tipo no permitido. Usa PDF, imagen (JPG/PNG/WEBP) o Office (Word/PowerPoint).'
             : 'No se pudo subir el archivo. Verifica el tamaño y vuelve a intentar.');
        jsonResponse(false, $msg, null, 422);
    }
    db()->query("INSERT INTO cap_adjuntos (capacitacion_id, tipo, archivo, nombre_original) VALUES (?, ?, ?, ?)",
        [$id, $tipo, $ruta, $orig]);
    jsonResponse(true, 'Archivo subido.', ['id' => db()->lastInsertId()]);
}

function adjuntoDel() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    $r = db()->fetchOne("SELECT archivo FROM cap_adjuntos WHERE id = ?", [$id]);
    if (!$r) jsonResponse(false, 'No encontrado.', null, 404);
    if (!empty($r['archivo']) && is_file(__DIR__ . '/../uploads/' . $r['archivo'])) @unlink(__DIR__ . '/../uploads/' . $r['archivo']);
    db()->query("DELETE FROM cap_adjuntos WHERE id = ?", [$id]);
    jsonResponse(true, 'Archivo eliminado.');
}

function asistenteAdd() {
    $id = (int)($_POST['capacitacion_id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 422);
    _capExiste($id);

    $personalId = (int)($_POST['personal_id'] ?? 0);
    $nombre = trim($_POST['nombre'] ?? '');
    $dni    = trim($_POST['dni'] ?? '');
    $cargo  = trim($_POST['cargo'] ?? '');

    // Si viene personal_id, se toma el snapshot desde personal.
    // Solo se considera personal ACTIVO (los inactivos no deben poder añadirse).
    if ($personalId > 0) {
        $p = db()->fetchOne("SELECT nombre, dni, cargo FROM personal WHERE id = ? AND activo = 1", [$personalId]);
        if (!$p) jsonResponse(false, 'El trabajador no existe o está inactivo.', null, 422);
        $nombre = mb_strtoupper($p['nombre'], 'UTF-8'); $dni = $p['dni']; $cargo = $p['cargo'];
        // Evita duplicar el mismo trabajador en la misma actividad.
        $dup = db()->fetchOne("SELECT id FROM cap_asistentes WHERE capacitacion_id = ? AND personal_id = ?", [$id, $personalId]);
        if ($dup) jsonResponse(false, 'Ese trabajador ya está en la lista.', null, 409);
    }
    if ($nombre === '') jsonResponse(false, 'El nombre es obligatorio.', null, 422);

    $firma = trim($_POST['firma'] ?? '');
    $firmaVal = (strpos($firma, 'data:image/') === 0) ? $firma : null;

    db()->query(
        "INSERT INTO cap_asistentes (capacitacion_id, personal_id, nombre, dni, cargo, firma, presente)
         VALUES (?, ?, ?, ?, ?, ?, 1)",
        [$id, $personalId ?: null, $nombre, $dni ?: null, $cargo ?: null, $firmaVal]);
    jsonResponse(true, 'Asistente agregado.', ['id' => db()->lastInsertId()]);
}

// Alta masiva: recibe personal_ids (JSON) y agrega los que falten (sin duplicar).
function asistenteMasivo() {
    $id = (int)($_POST['capacitacion_id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 422);
    _capExiste($id);
    $ids = json_decode($_POST['personal_ids'] ?? '[]', true);
    $ids = is_array($ids) ? array_values(array_unique(array_map('intval', $ids))) : [];
    $ids = array_filter($ids, fn($v) => $v > 0);
    if (!count($ids)) jsonResponse(false, 'Selecciona al menos un trabajador.', null, 422);

    // Ya presentes en la actividad (para no duplicar).
    $ya = array_map('intval', array_column(
        db()->fetchAll("SELECT personal_id FROM cap_asistentes WHERE capacitacion_id = ? AND personal_id IS NOT NULL", [$id]), 'personal_id'));

    $add = 0;
    foreach ($ids as $pid) {
        if (in_array($pid, $ya, true)) continue;
        // Solo personal ACTIVO: se ignoran los inactivos aunque lleguen en la selección.
        $p = db()->fetchOne("SELECT nombre, dni, cargo FROM personal WHERE id = ? AND activo = 1", [$pid]);
        if (!$p) continue;
        db()->query(
            "INSERT INTO cap_asistentes (capacitacion_id, personal_id, nombre, dni, cargo, presente)
             VALUES (?, ?, ?, ?, ?, 1)",
            [$id, $pid, mb_strtoupper($p['nombre'], 'UTF-8'), $p['dni'] ?: null, $p['cargo'] ?: null]);
        $add++;
    }
    jsonResponse(true, $add . ' trabajador(es) agregado(s).', ['agregados' => $add]);
}

function asistenteFirma() {
    $id    = (int)($_POST['id'] ?? 0);
    $firma = trim($_POST['firma'] ?? '');
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 422);
    if (strpos($firma, 'data:image/') !== 0) jsonResponse(false, 'Firma inválida.', null, 422);
    db()->query("UPDATE cap_asistentes SET firma = ? WHERE id = ?", [$firma, $id]);
    jsonResponse(true, 'Firma guardada.');
}

function asistenteDel() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    db()->query("DELETE FROM cap_asistentes WHERE id = ?", [$id]);
    jsonResponse(true, 'Asistente eliminado.');
}

// Sube un adjunto a uploads/capacitaciones/. material/asistencia: imagen/PDF/Office;
// foto: solo imagen. Valida por extensión (robusto para PDF/Office, cuyo MIME a
// veces se detecta mal) + verificación de imagen real para fotos. Límite 20MB.
// Devuelve [ruta|null, nombreOriginal|null, motivo] (motivo: ok|grande|tipo|error).
function _guardarAdjuntoCap(array $file, string $tipo): array {
    $CAP_MAX = 20 * 1024 * 1024;   // 20MB (hojas escaneadas pesan)
    $err = $file['error'] ?? UPLOAD_ERR_NO_FILE;
    if ($err === UPLOAD_ERR_INI_SIZE || $err === UPLOAD_ERR_FORM_SIZE) return [null, null, 'grande'];
    if ($err !== UPLOAD_ERR_OK) return [null, null, 'error'];
    if (($file['size'] ?? 0) <= 0) return [null, null, 'error'];
    if ($file['size'] > $CAP_MAX) return [null, null, 'grande'];

    $ext = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));
    $imgExt = ['jpg', 'jpeg', 'png', 'webp'];
    $docExt = ['pdf', 'doc', 'docx', 'ppt', 'pptx'];
    $permit = ($tipo === 'foto') ? $imgExt : array_merge($imgExt, $docExt);
    if (!in_array($ext, $permit, true)) return [null, null, 'tipo'];
    if (in_array($ext, $imgExt, true) && @getimagesize($file['tmp_name']) === false) return [null, null, 'tipo'];

    $dir = __DIR__ . '/../uploads/capacitaciones/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $extNorm = $ext === 'jpeg' ? 'jpg' : $ext;
    $filename = 'cap_' . $tipo . '_' . bin2hex(random_bytes(6)) . '.' . $extNorm;
    if (move_uploaded_file($file['tmp_name'], $dir . $filename)) {
        @chmod($dir . $filename, 0644);
        return ['capacitaciones/' . $filename, substr(basename($file['name']), 0, 200), 'ok'];
    }
    return [null, null, 'error'];
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
