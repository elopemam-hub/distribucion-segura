<?php
// ============================================================
// API EPP: CRUD catálogo de tipos de EPP (variante = código + talla)
// Archivo: api/epp/tipos.php
// Acciones (?action=): list, save, toggle
// Stock mín/máx se DERIVAN del consumo anual (× stock_min_pct / stock_max_pct
// de epp_config). La imagen se sube a uploads/epp/.
// ============================================================

require_once __DIR__ . '/../../includes/auth.php';

requireLogin();
setupEpp();
setupEmpresas();
setupUsuarioEmpresas();
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
    error_log('[epp/tipos] ' . $e->getMessage());
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ============================================================
// Lee los porcentajes de stock (con defaults 10/20 si faltan o son inválidos).
function eppStockPct(): array {
    $rows = db()->fetchAll("SELECT clave, valor FROM epp_config WHERE clave IN ('stock_min_pct','stock_max_pct')");
    $map = [];
    foreach ($rows as $r) $map[$r['clave']] = $r['valor'];
    $min = is_numeric($map['stock_min_pct'] ?? null) ? (float)$map['stock_min_pct'] : 10;
    $max = is_numeric($map['stock_max_pct'] ?? null) ? (float)$map['stock_max_pct'] : 20;
    return [$min, $max];
}

function listar() {
    // Al entrar a una empresa, siembra su catálogo estándar la primera vez.
    $emp = eppEmpresaSel();
    if ($emp > 0 && empresaEsPermitida($emp)) eppSeedEmpresa($emp);

    $incluirInactivos = ($_GET['todos'] ?? '') === '1';
    $where = $incluirInactivos ? '1=1' : 'activo = 1';
    [$eSql, $eP] = eppEmpresaFiltro('empresa_id');
    $where .= $eSql;
    $rows = db()->fetchAll(
        "SELECT id, codigo, nombre, marca, categoria, talla, consumo_anual,
                norma_tecnica, vida_util_dias, stock_minimo, stock_maximo, unidad, imagen, activo
           FROM epp_tipos WHERE $where
          ORDER BY nombre ASC, talla ASC",
        $eP
    );
    jsonResponse(true, '', $rows);
}

function guardar() {
    $emp           = eppRequireEmpresa();
    $id            = (int)($_POST['id'] ?? 0);
    $codigo        = trim($_POST['codigo'] ?? '');
    $nombre        = trim($_POST['nombre'] ?? '');
    $marca         = trim($_POST['marca'] ?? '');
    $categoria     = trim($_POST['categoria'] ?? 'General') ?: 'General';
    $talla         = trim($_POST['talla'] ?? '');
    $consumo       = max(0, (int)($_POST['consumo_anual'] ?? 0));
    $norma         = trim($_POST['norma_tecnica'] ?? '');
    $vidaUtil      = max(1, (int)($_POST['vida_util_dias'] ?? 180));
    $unidad        = trim($_POST['unidad'] ?? 'unidad') ?: 'unidad';

    if ($nombre === '') jsonResponse(false, 'El nombre es requerido.', null, 422);

    // Dedup por (nombre, talla) case-insensitive: el mismo EPP puede repetirse
    // en distintas tallas, pero no dos veces en la misma talla.
    $dup = db()->fetchOne(
        "SELECT id FROM epp_tipos WHERE empresa_id = ? AND nombre = ? AND IFNULL(talla,'') = ? AND id <> ?",
        [$emp, $nombre, $talla, $id]
    );
    if ($dup) jsonResponse(false, 'Ya existe ese EPP en la misma talla.', null, 422);

    // Deriva stock mín/máx del consumo anual.
    [$minPct, $maxPct] = eppStockPct();
    $stockMin = (int)round($consumo * $minPct / 100);
    $stockMax = (int)round($consumo * $maxPct / 100);

    // Imagen (opcional). Si no se sube, se conserva la existente al editar.
    $imagen = guardarImagenEpp();

    if ($id > 0) {
        // El EPP debe pertenecer a la empresa activa (silo).
        $own = db()->fetchOne("SELECT empresa_id FROM epp_tipos WHERE id = ?", [$id]);
        if (!$own || (int)$own['empresa_id'] !== $emp) jsonResponse(false, 'Sin acceso a este EPP.', null, 403);
        $sql = "UPDATE epp_tipos SET codigo=?, nombre=?, marca=?, categoria=?, talla=?, consumo_anual=?,
                       norma_tecnica=?, vida_util_dias=?, stock_minimo=?, stock_maximo=?, unidad=?"
             . ($imagen ? ", imagen=?" : "") . " WHERE id=?";
        $params = [$codigo ?: null, $nombre, $marca ?: null, $categoria, $talla ?: null, $consumo,
                   $norma ?: null, $vidaUtil, $stockMin, $stockMax, $unidad];
        if ($imagen) $params[] = $imagen;
        $params[] = $id;
        db()->query($sql, $params);
        jsonResponse(true, 'EPP actualizado.', ['id' => $id]);
    } else {
        db()->query(
            "INSERT INTO epp_tipos
               (empresa_id, codigo, nombre, marca, categoria, talla, consumo_anual, norma_tecnica, vida_util_dias,
                stock_minimo, stock_maximo, unidad, imagen)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [$emp, $codigo ?: null, $nombre, $marca ?: null, $categoria, $talla ?: null, $consumo,
             $norma ?: null, $vidaUtil, $stockMin, $stockMax, $unidad, $imagen]
        );
        jsonResponse(true, 'EPP creado.', ['id' => db()->lastInsertId()]);
    }
}

// Sube la imagen del EPP a uploads/epp/. Devuelve la ruta relativa o null.
// Mismo patrón de validación que la foto de personal (MIME real + getimagesize).
function guardarImagenEpp(): ?string {
    if (empty($_FILES['imagen']['tmp_name'])) return null;
    $file = $_FILES['imagen'];
    if ($file['error'] !== UPLOAD_ERR_OK) return null;
    if ($file['size'] <= 0 || $file['size'] > MAX_FILE_SIZE) return null;

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime  = $finfo->file($file['tmp_name']);
    $map   = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($map[$mime])) return null;
    if (@getimagesize($file['tmp_name']) === false) return null;

    $dir = __DIR__ . '/../../uploads/epp/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    $filename = 'epp_' . bin2hex(random_bytes(6)) . '.' . $map[$mime];
    if (move_uploaded_file($file['tmp_name'], $dir . $filename)) {
        @chmod($dir . $filename, 0644);
        return 'epp/' . $filename;
    }
    return null;
}

// Activa/desactiva (baja lógica; conserva historial de movimientos)
function toggle() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 422);
    $own = db()->fetchOne("SELECT empresa_id FROM epp_tipos WHERE id = ?", [$id]);
    if (!$own || !empresaEsPermitida($own['empresa_id'] ?? 0)) jsonResponse(false, 'Sin acceso a este EPP.', null, 403);
    db()->query("UPDATE epp_tipos SET activo = 1 - activo WHERE id = ?", [$id]);
    $row = db()->fetchOne("SELECT activo FROM epp_tipos WHERE id = ?", [$id]);
    jsonResponse(true, 'Estado actualizado.', ['activo' => (int)($row['activo'] ?? 0)]);
}
