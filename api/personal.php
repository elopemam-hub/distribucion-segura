<?php
// ============================================================
// API: CRUD DE PERSONAL
// Archivo: api/personal.php
// Acciones soportadas (por ?action=):
//   list, get, save, delete, buscar (autocompletar), importar_excel
// ============================================================

require_once __DIR__ . '/../includes/auth.php';

requireLogin();
header('Content-Type: application/json; charset=utf-8');

// Columnas de documentos adjuntos del personal (una fuente de verdad).
const PERSONAL_DOC_COLS = ['doc_dni', 'doc_licencia', 'doc_certijoven', 'doc_sctr', 'doc_verif_ref'];

// Auto-provisión de columnas de documentos.
setupPersonalDocs();
// Auto-provisión multi-empresa (crea empresas + personal.empresa_id y migra textos).
setupEmpresas();
setupUsuarioEmpresas();   // restricción de empresas por usuario (Fase 3)

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

// Acciones que modifican datos requieren CSRF
$mutaciones = ['save', 'delete', 'importar_excel', 'eliminar_doc'];
if (in_array($action, $mutaciones, true)) {
    requireCsrf();
    // Solo admin/supervisor pueden mutar
    $user = getCurrentUser();
    if (!in_array($user['rol'], ['administrador', 'supervisor'])) {
        jsonResponse(false, 'No tienes permisos.', null, 403);
    }
}

try {
    switch ($action) {
        case 'list':      listar(); break;
        case 'get':       obtener(); break;
        case 'save':      guardar(); break;
        case 'delete':    eliminar(); break;
        case 'buscar':    buscar(); break;
        case 'importar_excel': importarExcel(); break;
        case 'eliminar_doc':   eliminarDoc(); break;
        default:
            jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Exception $e) {
    error_log('[personal] ' . $e->getMessage());
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ============================================================
function listar() {
    $q         = trim($_GET['q'] ?? '');
    $cargo     = trim($_GET['cargo'] ?? '');
    $activo    = $_GET['activo'] ?? '';
    $empresaId = $_GET['empresa_id'] ?? '';
    $page      = max(1, (int)($_GET['page'] ?? 1));
    $limit     = min(500, max(10, (int)($_GET['limit'] ?? 50)));
    $offset    = ($page - 1) * $limit;

    $where = ['1=1'];
    $params = [];
    if ($q !== '') {
        $where[] = '(p.nombre LIKE ? OR p.dni LIKE ?)';
        $params[] = "%$q%";
        $params[] = "%$q%";
    }
    if ($cargo !== '') { $where[] = 'p.cargo = ?'; $params[] = $cargo; }
    if ($activo !== '') { $where[] = 'p.activo = ?'; $params[] = (int)$activo; }
    if ($empresaId !== '') { $where[] = 'p.empresa_id = ?'; $params[] = (int)$empresaId; }
    $whereSQL = implode(' AND ', $where);

    // Restricción por empresa del usuario (Fase 3).
    [$empRestr, $empRestrP] = empresaWhere('p.empresa_id');
    $whereSQL .= $empRestr;
    $params = array_merge($params, $empRestrP);

    $total = db()->fetchOne("SELECT COUNT(*) t FROM personal p WHERE $whereSQL", $params)['t'];
    $rows  = db()->fetchAll(
        "SELECT p.*, e.razon_social AS empresa_nombre,
                DATEDIFF(p.dni_vencimiento, CURDATE())     AS dias_vencer_dni,
                DATEDIFF(p.vencimiento_brevete, CURDATE()) AS dias_vencer_brevete
         FROM personal p
         LEFT JOIN empresas e ON e.id = p.empresa_id
         WHERE $whereSQL ORDER BY p.nombre ASC LIMIT $limit OFFSET $offset",
        $params
    );

    jsonResponse(true, '', [
        'personal' => $rows,
        'total'    => (int)$total,
        'page'     => $page,
        'limit'    => $limit,
        'pages'    => (int)ceil($total / $limit),
    ]);
}

// ------------------------------------------------------------
function obtener() {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    $p = db()->fetchOne(
        "SELECT *,
                DATEDIFF(dni_vencimiento, CURDATE())     AS dias_vencer_dni,
                DATEDIFF(vencimiento_brevete, CURDATE()) AS dias_vencer_brevete
         FROM personal WHERE id = ?",
        [$id]
    );
    if (!$p) jsonResponse(false, 'No encontrado.', null, 404);
    // Restricción por empresa del usuario (Fase 3).
    if (!empresaEsPermitida($p['empresa_id'] ?? 0)) jsonResponse(false, 'Sin acceso a este trabajador.', null, 403);
    jsonResponse(true, '', $p);
}

// ------------------------------------------------------------
function buscar() {
    // Autocompletar desde el formulario de inspección
    $q = trim($_GET['q'] ?? '');
    $cargo = trim($_GET['cargo'] ?? ''); // filtrar por cargo si se pide
    if (mb_strlen($q) < 2) jsonResponse(true, '', []);

    $where = ['activo = 1', '(nombre LIKE ? OR dni LIKE ?)'];
    $params = ["%$q%", "%$q%"];
    if ($cargo !== '') { $where[] = 'cargo = ?'; $params[] = $cargo; }
    // Filtro por empresa activa (p.ej. entrega de EPP en modo silo).
    $empSel = (int)($_GET['empresa_id'] ?? 0);
    if ($empSel > 0) { $where[] = 'empresa_id = ?'; $params[] = $empSel; }
    $whereSQL = implode(' AND ', $where);
    // Restricción por empresa del usuario (Fase 3).
    [$empRestr, $empRestrP] = empresaWhere('empresa_id');
    $whereSQL .= $empRestr;
    $params = array_merge($params, $empRestrP);

    $rows = db()->fetchAll(
        "SELECT id, dni, nombre, cargo, telefono FROM personal
         WHERE $whereSQL
         ORDER BY nombre ASC LIMIT 15",
        $params
    );
    jsonResponse(true, '', $rows);
}

// ------------------------------------------------------------
function guardar() {
    $id             = (int)($_POST['id'] ?? 0);
    $dni            = trim($_POST['dni'] ?? '');
    $nombre         = trim($_POST['nombre'] ?? '');
    $cargo          = $_POST['cargo'] ?? 'reparto';
    $empresaId      = (int)($_POST['empresa_id'] ?? 0);
    $empresa        = trim($_POST['empresa'] ?? '');
    $tel            = trim($_POST['telefono'] ?? '');

    // Si se eligió una empresa registrada, el texto se sincroniza con su razón social.
    if ($empresaId > 0) {
        $emp = db()->fetchOne("SELECT razon_social FROM empresas WHERE id = ?", [$empresaId]);
        if ($emp) $empresa = $emp['razon_social']; else $empresaId = 0;
    }
    $fechaNac       = $_POST['fecha_nacimiento'] ?? null;
    $fechaIng       = $_POST['fecha_ingreso'] ?? null;
    $dniVenc        = $_POST['dni_vencimiento'] ?? null;
    $numLicencia    = trim($_POST['num_licencia'] ?? '');
    $catLicencia    = trim($_POST['categoria_licencia'] ?? '');
    $vencBrevete    = $_POST['vencimiento_brevete'] ?? null;
    $obs            = trim($_POST['observaciones'] ?? '');
    $activo         = isset($_POST['activo']) ? (int)$_POST['activo'] : 1;
    $tipoContrato   = trim($_POST['tipo_contrato'] ?? '');

    if ($dni === '' || mb_strlen($dni) < 6) jsonResponse(false, 'DNI inválido.', null, 422);
    if ($nombre === '')                     jsonResponse(false, 'El nombre es requerido.', null, 422);
    if (!in_array($cargo, ['conductor','reparto','auxiliar','supervisor','otro'], true)) {
        jsonResponse(false, 'Cargo inválido.', null, 422);
    }

    // DNI único (excepto si es el mismo registro)
    $existe = db()->fetchOne("SELECT id FROM personal WHERE dni = ? AND id <> ?", [$dni, $id]);
    if ($existe) jsonResponse(false, 'Ya existe otra persona con ese DNI.', null, 409);

    // Restricción por empresa del usuario (Fase 3): solo puede crear/editar
    // trabajadores dentro de sus empresas, y asignarlos a una de ellas.
    $permAll = empresasPermitidas();
    if ($permAll !== null) {
        if (!in_array((int)$empresaId, $permAll, true)) {
            jsonResponse(false, 'Debes asignar el trabajador a una de tus empresas.', null, 403);
        }
        if ($id > 0) {
            $actual = db()->fetchOne("SELECT empresa_id FROM personal WHERE id = ?", [$id]);
            if ($actual && !in_array((int)$actual['empresa_id'], $permAll, true)) {
                jsonResponse(false, 'No puedes editar trabajadores de otra empresa.', null, 403);
            }
        }
    }

    // Subir foto si viene
    $fotoNombre = null;
    if (!empty($_FILES['foto']['tmp_name'])) {
        $fotoNombre = guardarFoto($_FILES['foto'], $dni);
    }

    // Subir documentos si vienen (imagen o PDF): DNI, Licencia, Certijoven, SCTR, Verif. referencias.
    $docs = [];
    foreach (PERSONAL_DOC_COLS as $campo) {
        if (!empty($_FILES[$campo]['tmp_name'])) {
            $ruta = guardarArchivo($_FILES[$campo], $dni, $campo);
            if ($ruta) $docs[$campo] = $ruta;
        }
    }

    if ($id > 0) {
        // UPDATE — foto y documentos solo se tocan si se subió uno nuevo.
        $sqlDocs = ''; $paramDocs = [];
        foreach (PERSONAL_DOC_COLS as $campo) {
            if (isset($docs[$campo])) { $sqlDocs .= ", `$campo`=?"; $paramDocs[] = $docs[$campo]; }
        }
        $sql = "UPDATE personal SET
                    dni=?, nombre=?, cargo=?, empresa=?, empresa_id=?, telefono=?,
                    fecha_nacimiento=?, fecha_ingreso=?, dni_vencimiento=?,
                    num_licencia=?, categoria_licencia=?, vencimiento_brevete=?,
                    observaciones=?, activo=?, tipo_contrato=?"
             . ($fotoNombre ? ", foto=?" : "") . $sqlDocs . " WHERE id=?";
        $params = [
            $dni, $nombre, $cargo, $empresa ?: null, $empresaId ?: null, $tel ?: null,
            $fechaNac ?: null, $fechaIng ?: null, $dniVenc ?: null,
            $numLicencia ?: null, $catLicencia ?: null, $vencBrevete ?: null,
            $obs ?: null, $activo, $tipoContrato ?: null
        ];
        if ($fotoNombre) $params[] = $fotoNombre;
        $params = array_merge($params, $paramDocs);
        $params[] = $id;
        db()->query($sql, $params);
        jsonResponse(true, 'Personal actualizado.', ['id' => $id]);
    } else {
        // INSERT
        db()->query(
            "INSERT INTO personal
                (dni, nombre, cargo, empresa, empresa_id, telefono, fecha_nacimiento,
                 fecha_ingreso, dni_vencimiento, num_licencia, categoria_licencia,
                 vencimiento_brevete, foto, observaciones, activo, tipo_contrato,
                 doc_dni, doc_licencia, doc_certijoven, doc_sctr, doc_verif_ref)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $dni, $nombre, $cargo, $empresa ?: null, $empresaId ?: null, $tel ?: null,
                $fechaNac ?: null, $fechaIng ?: null, $dniVenc ?: null,
                $numLicencia ?: null, $catLicencia ?: null, $vencBrevete ?: null,
                $fotoNombre, $obs ?: null, $activo, $tipoContrato ?: null,
                $docs['doc_dni'] ?? null, $docs['doc_licencia'] ?? null, $docs['doc_certijoven'] ?? null,
                $docs['doc_sctr'] ?? null, $docs['doc_verif_ref'] ?? null
            ]
        );
        jsonResponse(true, 'Personal creado.', ['id' => db()->lastInsertId()]);
    }
}

// ------------------------------------------------------------
// Elimina un documento adjunto: pone la columna en NULL y borra el archivo.
function eliminarDoc() {
    $id    = (int)($_POST['id'] ?? 0);
    $campo = $_POST['campo'] ?? '';
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 422);
    if (!in_array($campo, PERSONAL_DOC_COLS, true)) jsonResponse(false, 'Documento inválido.', null, 422);

    $row = db()->fetchOne("SELECT `$campo` AS ruta, empresa_id FROM personal WHERE id = ?", [$id]);
    if (!$row) jsonResponse(false, 'No encontrado.', null, 404);
    if (!empresaEsPermitida($row['empresa_id'] ?? 0)) jsonResponse(false, 'Sin acceso a este trabajador.', null, 403);

    if (!empty($row['ruta'])) {
        $file = __DIR__ . '/../uploads/' . $row['ruta'];
        if (is_file($file)) @unlink($file);
    }
    db()->query("UPDATE personal SET `$campo` = NULL WHERE id = ?", [$id]);
    jsonResponse(true, 'Documento eliminado.');
}

// ------------------------------------------------------------
function eliminar() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);

    // Restricción por empresa del usuario (Fase 3).
    $pe = db()->fetchOne("SELECT empresa_id FROM personal WHERE id = ?", [$id]);
    if ($pe && !empresaEsPermitida($pe['empresa_id'] ?? 0)) jsonResponse(false, 'Sin acceso a este trabajador.', null, 403);

    // Soft delete: lo marcamos inactivo (evita romper FK con inspecciones históricas)
    $aff = db()->query("UPDATE personal SET activo = 0 WHERE id = ?", [$id])->rowCount();
    if ($aff === 0) jsonResponse(false, 'No encontrado.', null, 404);
    jsonResponse(true, 'Personal desactivado.');
}

// ------------------------------------------------------------
// Agrega las columnas de documentos si no existen (ALTER idempotente),
// para no depender de correr SQL manual por SSH.
function setupPersonalDocs(): void {
    static $done = false;
    if ($done) return;
    $done = true;
    foreach (PERSONAL_DOC_COLS as $col) {
        try {
            $exists = db()->fetchOne(
                "SELECT 1 FROM information_schema.columns
                  WHERE table_schema = DATABASE() AND table_name = 'personal' AND column_name = ?",
                [$col]
            );
            if (!$exists) db()->query("ALTER TABLE personal ADD COLUMN `$col` VARCHAR(255) NULL", []);
        } catch (Throwable $e) {
            error_log('[setupPersonalDocs] ' . $e->getMessage());
        }
    }
}

// Sube un documento (imagen o PDF) a uploads/personal/. Devuelve ruta relativa o null.
function guardarArchivo(array $file, string $dni, string $prefijo): ?string {
    if ($file['error'] !== UPLOAD_ERR_OK) return null;
    if ($file['size'] <= 0 || $file['size'] > MAX_FILE_SIZE) return null;

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime  = $finfo->file($file['tmp_name']);
    $map   = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'application/pdf' => 'pdf'];
    if (!isset($map[$mime])) return null;
    // Si es imagen, debe ser decodificable; el PDF se acepta por MIME real.
    if ($mime !== 'application/pdf' && @getimagesize($file['tmp_name']) === false) return null;

    $dir = __DIR__ . '/../uploads/personal/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    $filename = $prefijo . '_' . preg_replace('/[^0-9]/', '', $dni) . '_' . bin2hex(random_bytes(4)) . '.' . $map[$mime];
    if (move_uploaded_file($file['tmp_name'], $dir . $filename)) {
        @chmod($dir . $filename, 0644);
        return 'personal/' . $filename;
    }
    return null;
}

// ------------------------------------------------------------
function guardarFoto(array $file, string $dni): ?string {
    if ($file['error'] !== UPLOAD_ERR_OK) return null;
    if ($file['size'] > MAX_FILE_SIZE) return null;

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime  = $finfo->file($file['tmp_name']);
    $map   = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($map[$mime])) return null;
    if (@getimagesize($file['tmp_name']) === false) return null;

    $dir = __DIR__ . '/../uploads/personal/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    $filename = 'p_' . preg_replace('/[^0-9]/', '', $dni) . '_' . bin2hex(random_bytes(4)) . '.' . $map[$mime];
    $destino  = $dir . $filename;

    if (move_uploaded_file($file['tmp_name'], $destino)) {
        @chmod($destino, 0644);
        return 'personal/' . $filename;
    }
    return null;
}

// ------------------------------------------------------------
// Importar desde Excel (recibe JSON de filas desde el frontend)
// El frontend parsea el XLSX con SheetJS y envía un array JSON.
function importarExcel() {
    $filas = json_decode($_POST['filas'] ?? '[]', true);
    if (!is_array($filas) || empty($filas)) {
        jsonResponse(false, 'No hay filas para importar.', null, 422);
    }

    $ok = 0; $errores = []; $omitidos = 0;
    db()->beginTransaction();

    try {
        foreach ($filas as $i => $f) {
            $dni         = trim((string)($f['dni'] ?? ''));
            $nombre      = trim((string)($f['nombre'] ?? ''));
            $cargo       = strtolower(trim((string)($f['cargo'] ?? 'reparto')));
            $empresa     = trim((string)($f['empresa'] ?? ''));
            $tel         = trim((string)($f['telefono'] ?? ''));
            $fecha       = trim((string)($f['fecha_ingreso'] ?? ''));
            $dniVenc     = trim((string)($f['dni_vencimiento'] ?? ''));
            $numLic      = trim((string)($f['num_licencia'] ?? ''));
            $catLic      = trim((string)($f['categoria_licencia'] ?? ''));
            $vencBrevete = trim((string)($f['vencimiento_brevete'] ?? ''));
            $obs         = trim((string)($f['observaciones'] ?? ''));

            if ($dni === '' || mb_strlen($dni) < 6 || $nombre === '') {
                $errores[] = "Fila " . ($i+2) . ": DNI o nombre inválido";
                continue;
            }
            if (!in_array($cargo, ['conductor','reparto','auxiliar','supervisor','otro'], true)) {
                $cargo = 'reparto';
            }
            // Normalizar fechas (acepta YYYY-MM-DD o DD/MM/YYYY)
            $normFecha = function(string $f): ?string {
                if ($f === '') return null;
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $f)) return $f;
                $ts = strtotime(str_replace('/', '-', $f));
                return $ts ? date('Y-m-d', $ts) : null;
            };
            $fecha       = $normFecha($fecha);
            $dniVenc     = $normFecha($dniVenc);
            $vencBrevete = $normFecha($vencBrevete);

            // Si DNI ya existe, actualizamos (upsert)
            $existe = db()->fetchOne("SELECT id FROM personal WHERE dni = ?", [$dni]);
            if ($existe) {
                db()->query(
                    "UPDATE personal SET nombre=?, cargo=?, empresa=?, telefono=?, fecha_ingreso=?,
                     dni_vencimiento=?, num_licencia=?, categoria_licencia=?, vencimiento_brevete=?,
                     observaciones=?, activo=1 WHERE id=?",
                    [$nombre, $cargo, $empresa ?: null, $tel ?: null, $fecha,
                     $dniVenc, $numLic ?: null, $catLic ?: null, $vencBrevete,
                     $obs ?: null, $existe['id']]
                );
                $omitidos++;
            } else {
                db()->query(
                    "INSERT INTO personal
                         (dni, nombre, cargo, empresa, telefono, fecha_ingreso,
                          dni_vencimiento, num_licencia, categoria_licencia,
                          vencimiento_brevete, observaciones, activo)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)",
                    [$dni, $nombre, $cargo, $empresa ?: null, $tel ?: null, $fecha,
                     $dniVenc, $numLic ?: null, $catLic ?: null, $vencBrevete,
                     $obs ?: null]
                );
                $ok++;
            }
        }
        db()->commit();
        jsonResponse(true, "Importación completada.", [
            'nuevos'      => $ok,
            'actualizados'=> $omitidos,
            'errores'     => $errores,
        ]);
    } catch (Exception $e) {
        db()->rollback();
        error_log('[personal:importar] ' . $e->getMessage());
        jsonResponse(false, 'Error al importar. No se guardó nada.', null, 500);
    }
}
