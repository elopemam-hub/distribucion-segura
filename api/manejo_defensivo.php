<?php
// ============================================================
// API: MANEJO A LA DEFENSIVA (sub-módulo de Capacitaciones)
// Programa de manejo defensivo para toda la flota de conductores.
// - Padrón dinámico: todos los conductores activos (nuevos y antiguos).
// - Vigencia configurable (recertificación); estado calculado por fecha.
// - Registro individual por conductor; temario configurable.
// - Nota enlazada al examen_defensiva de Evaluaciones (por DNI).
// Acciones (?action=): list, historial, save, delete_reg,
//                      config_get, config_save, tema_list, tema_save, tema_del
// ============================================================

require_once __DIR__ . '/../includes/auth.php';

requireLogin();
setupManejoDefensivo();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

// Mutaciones: CSRF + rol. Registrar/eliminar → admin+supervisor;
// configuración y temario → solo administrador.
$mutaciones      = ['save', 'save_masivo', 'delete_reg', 'config_save', 'tema_save', 'tema_del'];
$soloAdminActions = ['config_save', 'tema_save', 'tema_del', 'delete_reg'];
if (in_array($action, $mutaciones, true)) {
    requireCsrf();
    $user = getCurrentUser();
    if (!in_array($user['rol'], ['administrador', 'supervisor'], true)) {
        jsonResponse(false, 'No tienes permisos.', null, 403);
    }
    if (in_array($action, $soloAdminActions, true) && $user['rol'] !== 'administrador') {
        jsonResponse(false, 'Solo un administrador puede realizar esta acción.', null, 403);
    }
}

liberarSesion();

try {
    switch ($action) {
        case 'list':        defList();       break;
        case 'historial':   defHistorial();  break;
        case 'save':        defSave();       break;
        case 'save_masivo': defSaveMasivo(); break;
        case 'delete_reg':  defDeleteReg();  break;
        case 'config_get':  defConfigGet();  break;
        case 'config_save': defConfigSave(); break;
        case 'tema_list':   defTemaList();   break;
        case 'tema_save':   defTemaSave();   break;
        case 'tema_del':    defTemaDel();    break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Throwable $e) {
    error_log('[manejo_defensivo] ' . $e->getMessage());
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ============================================================
function defPeriodicidad(): int {
    $r = db()->fetchOne("SELECT periodicidad_meses FROM def_config WHERE id = 1");
    $m = (int)($r['periodicidad_meses'] ?? 12);
    return ($m >= 0 && $m <= 120) ? $m : 12;
}

function _defEvalExiste(): bool {
    static $ex = null;
    if ($ex !== null) return $ex;
    $r = db()->fetchOne("SELECT 1 FROM information_schema.tables
          WHERE table_schema = DATABASE() AND table_name = 'evaluaciones'");
    return $ex = (bool)$r;
}

// Padrón dinámico: conductores activos + su último registro + última nota de
// examen defensivo (si el módulo de evaluaciones existe).
function defList() {
    [$empRestr, $empRestrP] = empresaWhere('p.empresa_id');

    $selExam = '';
    if (_defEvalExiste()) {
        $selExam =
            ", (SELECT ev.porcentaje FROM evaluaciones ev WHERE ev.dni = p.dni AND ev.tipo = 'examen_defensiva' ORDER BY ev.fecha DESC, ev.id DESC LIMIT 1) AS examen_pct
               , (SELECT ev.puntaje   FROM evaluaciones ev WHERE ev.dni = p.dni AND ev.tipo = 'examen_defensiva' ORDER BY ev.fecha DESC, ev.id DESC LIMIT 1) AS examen_pts
               , (SELECT ev.fecha     FROM evaluaciones ev WHERE ev.dni = p.dni AND ev.tipo = 'examen_defensiva' ORDER BY ev.fecha DESC, ev.id DESC LIMIT 1) AS examen_fecha
               , (SELECT ev.estado    FROM evaluaciones ev WHERE ev.dni = p.dni AND ev.tipo = 'examen_defensiva' ORDER BY ev.fecha DESC, ev.id DESC LIMIT 1) AS examen_estado";
    }

    $rows = db()->fetchAll(
        "SELECT p.id, p.nombre, p.dni, p.cargo, p.telefono, p.empresa,
                e.razon_social AS empresa_nombre,
                r.fecha       AS ult_fecha,
                r.vencimiento AS ult_venc,
                r.facilitador AS ult_facilitador,
                DATEDIFF(r.vencimiento, CURDATE()) AS dias_venc,
                (SELECT COUNT(*) FROM def_registros dr WHERE dr.personal_id = p.id) AS n_reg
                $selExam
           FROM personal p
           LEFT JOIN empresas e ON e.id = p.empresa_id
           LEFT JOIN def_registros r
                  ON r.id = (SELECT dr2.id FROM def_registros dr2
                              WHERE dr2.personal_id = p.id
                              ORDER BY dr2.fecha DESC, dr2.id DESC LIMIT 1)
          WHERE p.cargo = 'conductor' AND p.activo = 1 $empRestr
          ORDER BY p.nombre ASC",
        $empRestrP
    );

    jsonResponse(true, '', [
        'items'        => $rows,
        'periodicidad' => defPeriodicidad(),
        'con_examen'   => _defEvalExiste(),
    ]);
}

// Historial de registros de un conductor.
function defHistorial() {
    $pid = (int)($_GET['personal_id'] ?? 0);
    if ($pid <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    $p = db()->fetchOne("SELECT id, nombre, dni, empresa_id FROM personal WHERE id = ?", [$pid]);
    if (!$p) jsonResponse(false, 'Conductor no encontrado.', null, 404);
    if (!empresaEsPermitida($p['empresa_id'] ?? 0)) jsonResponse(false, 'Sin acceso a este conductor.', null, 403);

    $rows = db()->fetchAll(
        "SELECT r.id, r.fecha, r.vencimiento, r.facilitador, r.temas, r.observaciones,
                r.certificado, r.creado_en, u.nombre AS creado_por_nombre
           FROM def_registros r
           LEFT JOIN usuarios u ON u.id = r.creado_por
          WHERE r.personal_id = ?
          ORDER BY r.fecha DESC, r.id DESC", [$pid]);

    jsonResponse(true, '', ['personal' => $p, 'registros' => $rows]);
}

function defSave() {
    $pid   = (int)($_POST['personal_id'] ?? 0);
    $fecha = trim($_POST['fecha'] ?? '');
    if ($pid <= 0) jsonResponse(false, 'Conductor inválido.', null, 422);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) jsonResponse(false, 'Fecha inválida.', null, 422);

    $p = db()->fetchOne("SELECT id, empresa_id FROM personal WHERE id = ? AND activo = 1 AND cargo = 'conductor'", [$pid]);
    if (!$p) jsonResponse(false, 'Conductor no encontrado o inactivo.', null, 404);
    if (!empresaEsPermitida($p['empresa_id'] ?? 0)) jsonResponse(false, 'Sin acceso a este conductor.', null, 403);

    // Vencimiento = fecha + periodicidad (0 = sin vencimiento).
    $meses = defPeriodicidad();
    $venc  = $meses > 0 ? date('Y-m-d', strtotime("$fecha +$meses months")) : null;

    // Temas: se reciben ids (JSON) y se guarda snapshot de nombres.
    $temasTxt = null;
    $ids = json_decode($_POST['temas'] ?? '[]', true);
    if (is_array($ids) && count($ids)) {
        $ids = array_values(array_filter(array_map('intval', $ids), fn($v) => $v > 0));
        if ($ids) {
            $ph = implode(',', array_fill(0, count($ids), '?'));
            $nombres = array_column(db()->fetchAll("SELECT nombre FROM def_temas WHERE id IN ($ph) ORDER BY orden ASC", $ids), 'nombre');
            if ($nombres) $temasTxt = implode(' · ', $nombres);
        }
    }
    // Respaldo: temas libres escritos a mano.
    if ($temasTxt === null) {
        $libre = trim($_POST['temas_libre'] ?? '');
        if ($libre !== '') $temasTxt = mb_substr($libre, 0, 1000);
    }

    $cert = _defGuardarCert();

    $user = getCurrentUser();
    db()->query(
        "INSERT INTO def_registros (personal_id, fecha, vencimiento, facilitador, temas, observaciones, certificado, creado_por)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
            $pid, $fecha, $venc,
            trim($_POST['facilitador'] ?? '') ?: null,
            $temasTxt,
            trim($_POST['observaciones'] ?? '') ?: null,
            $cert,
            $user['id'] ?? null,
        ]
    );
    jsonResponse(true, 'Registro guardado.', ['id' => db()->lastInsertId(), 'vencimiento' => $venc]);
}

// Registro masivo: una misma fecha/temas para varios conductores.
function defSaveMasivo() {
    $fecha = trim($_POST['fecha'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) jsonResponse(false, 'Fecha inválida.', null, 422);

    $ids = json_decode($_POST['personal_ids'] ?? '[]', true);
    $ids = is_array($ids) ? array_values(array_unique(array_filter(array_map('intval', $ids), fn($v) => $v > 0))) : [];
    if (!count($ids)) jsonResponse(false, 'Selecciona al menos un conductor.', null, 422);

    // Vencimiento según periodicidad (igual que el individual).
    $meses = defPeriodicidad();
    $venc  = $meses > 0 ? date('Y-m-d', strtotime("$fecha +$meses months")) : null;

    // Snapshot de temas (nombres) una sola vez.
    $temasTxt = null;
    $tids = json_decode($_POST['temas'] ?? '[]', true);
    if (is_array($tids) && count($tids)) {
        $tids = array_values(array_filter(array_map('intval', $tids), fn($v) => $v > 0));
        if ($tids) {
            $ph = implode(',', array_fill(0, count($tids), '?'));
            $nombres = array_column(db()->fetchAll("SELECT nombre FROM def_temas WHERE id IN ($ph) ORDER BY orden ASC", $tids), 'nombre');
            if ($nombres) $temasTxt = implode(' · ', $nombres);
        }
    }

    $facilitador = trim($_POST['facilitador'] ?? '') ?: null;
    $obs = trim($_POST['observaciones'] ?? '') ?: null;
    $user = getCurrentUser();
    $uid = $user['id'] ?? null;

    $ok = 0;
    foreach ($ids as $pid) {
        // Solo conductores activos y accesibles por empresa.
        $p = db()->fetchOne("SELECT id, empresa_id FROM personal WHERE id = ? AND activo = 1 AND cargo = 'conductor'", [$pid]);
        if (!$p || !empresaEsPermitida($p['empresa_id'] ?? 0)) continue;
        db()->query(
            "INSERT INTO def_registros (personal_id, fecha, vencimiento, facilitador, temas, observaciones, creado_por)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            [$pid, $fecha, $venc, $facilitador, $temasTxt, $obs, $uid]);
        $ok++;
    }
    jsonResponse(true, $ok . ' conductor(es) registrado(s).', ['registrados' => $ok]);
}

function defDeleteReg() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    $r = db()->fetchOne("SELECT certificado FROM def_registros WHERE id = ?", [$id]);
    if (!$r) jsonResponse(false, 'No encontrado.', null, 404);
    if (!empty($r['certificado']) && is_file(__DIR__ . '/../uploads/' . $r['certificado'])) @unlink(__DIR__ . '/../uploads/' . $r['certificado']);
    db()->query("DELETE FROM def_registros WHERE id = ?", [$id]);
    jsonResponse(true, 'Registro eliminado.');
}

// ── Configuración ──
function defConfigGet() {
    jsonResponse(true, '', ['periodicidad' => defPeriodicidad()]);
}
function defConfigSave() {
    $m = (int)($_POST['periodicidad'] ?? 12);
    if ($m < 0 || $m > 120) jsonResponse(false, 'Periodicidad inválida (0–120 meses).', null, 422);
    db()->query("INSERT INTO def_config (id, periodicidad_meses) VALUES (1, ?)
                 ON DUPLICATE KEY UPDATE periodicidad_meses = VALUES(periodicidad_meses)", [$m]);
    jsonResponse(true, 'Configuración guardada.', ['periodicidad' => $m]);
}

// ── Temario ──
function defTemaList() {
    $rows = db()->fetchAll("SELECT id, nombre, orden, activo FROM def_temas ORDER BY orden ASC, id ASC");
    jsonResponse(true, '', ['temas' => $rows]);
}
function defTemaSave() {
    $id     = (int)($_POST['id'] ?? 0);
    $nombre = trim($_POST['nombre'] ?? '');
    if ($nombre === '') jsonResponse(false, 'El nombre del tema es obligatorio.', null, 422);
    $orden  = (int)($_POST['orden'] ?? 0);
    $activo = ((int)($_POST['activo'] ?? 1) === 1) ? 1 : 0;
    if ($id > 0) {
        db()->query("UPDATE def_temas SET nombre = ?, orden = ?, activo = ? WHERE id = ?", [$nombre, $orden, $activo, $id]);
        jsonResponse(true, 'Tema actualizado.', ['id' => $id]);
    } else {
        db()->query("INSERT INTO def_temas (nombre, orden, activo) VALUES (?, ?, ?)", [$nombre, $orden, $activo]);
        jsonResponse(true, 'Tema creado.', ['id' => db()->lastInsertId()]);
    }
}
function defTemaDel() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    db()->query("DELETE FROM def_temas WHERE id = ?", [$id]);
    jsonResponse(true, 'Tema eliminado.');
}

// Sube el certificado (PDF/imagen) a uploads/manejo_defensivo/. Devuelve ruta|null.
function _defGuardarCert(): ?string {
    if (empty($_FILES['certificado']['tmp_name'])) return null;
    $file = $_FILES['certificado'];
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) return null;
    if (($file['size'] ?? 0) <= 0 || $file['size'] > 20 * 1024 * 1024) return null;
    $ext = strtolower(pathinfo($file['name'] ?? '', PATHINFO_EXTENSION));
    $imgExt = ['jpg', 'jpeg', 'png', 'webp'];
    if (!in_array($ext, array_merge($imgExt, ['pdf']), true)) return null;
    if (in_array($ext, $imgExt, true) && @getimagesize($file['tmp_name']) === false) return null;
    $dir = __DIR__ . '/../uploads/manejo_defensivo/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $extNorm = $ext === 'jpeg' ? 'jpg' : $ext;
    $filename = 'def_' . bin2hex(random_bytes(6)) . '.' . $extNorm;
    if (move_uploaded_file($file['tmp_name'], $dir . $filename)) {
        @chmod($dir . $filename, 0644);
        return 'manejo_defensivo/' . $filename;
    }
    return null;
}
