<?php
// ============================================================
// API: KPI Analytics — File Types CRUD
// Archivo: api/kpi/file_types.php
// Acciones: list, save, delete
// ============================================================

require_once __DIR__ . '/../../includes/auth.php';

requireLogin();
if (!tieneAccesoModulo('kpi_analytics')) {
    jsonResponse(false, 'Acceso no autorizado.', null, 403);
}

$action = $_GET['action'] ?? 'list';
$user   = getCurrentUser();

if (in_array($action, ['save', 'delete'], true)) {
    requireCsrf();
    // Solo admins y supervisores pueden gestionar tipos
    if ($user['rol'] === 'inspector') {
        jsonResponse(false, 'Sin permisos para gestionar tipos.', null, 403);
    }
}

try {
    switch ($action) {
        case 'list':   listarTipos();   break;
        case 'save':   guardarTipo();   break;
        case 'delete': eliminarTipo();  break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Exception $e) {
    $msg = $e->getMessage();
    if (stripos($msg, "kpi_file_types") !== false
        || stripos($msg, "doesn't exist") !== false
        || stripos($msg, "no existe") !== false
        || stripos($msg, "table") !== false) {
        jsonResponse(false, 'migration_pending', null, 200);
    }
    error_log('[kpi/file_types] ' . $msg);
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ── LIST ─────────────────────────────────────────────────────
function listarTipos(): void {
    $rows = db()->fetchAll(
        "SELECT id, codigo, descripcion, formato, max_mb, tabla_destino, activo
         FROM kpi_file_types
         WHERE activo = 1
         ORDER BY orden ASC, codigo ASC"
    );
    foreach ($rows as &$row) {
        $row['max_mb'] = (int)$row['max_mb'];
        $row['activo'] = (bool)$row['activo'];
    }
    unset($row);
    jsonResponse(true, '', $rows);
}

// ── SAVE (create or update) ───────────────────────────────────
function guardarTipo(): void {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) jsonResponse(false, 'Payload inválido.', null, 400);

    $id          = (int)($body['id']           ?? 0);
    $codigo      = strtoupper(trim($body['codigo']      ?? ''));
    $descripcion = trim($body['descripcion']   ?? '');
    $formato     = strtolower(trim($body['formato']     ?? 'xlsx'));
    $maxMb       = max(1, min((int)($body['max_mb']     ?? 5), 50));
    $tablaDestino = trim($body['tabla_destino'] ?? '') ?: null;
    $orden        = (int)($body['orden']        ?? 0);

    if (!preg_match('/^[A-Z0-9_]{1,20}$/', $codigo)) {
        jsonResponse(false, 'Código inválido (solo letras, números y _ , máx 20 caracteres).', null, 400);
    }
    if ($descripcion === '') jsonResponse(false, 'Descripción requerida.', null, 400);
    if (!in_array($formato, ['xlsx', 'xls', 'csv'], true)) {
        jsonResponse(false, 'Formato inválido.', null, 400);
    }

    if ($id > 0) {
        $existing = db()->fetchOne("SELECT id FROM kpi_file_types WHERE id = ?", [$id]);
        if (!$existing) jsonResponse(false, 'Tipo no encontrado.', null, 404);
        db()->query(
            "UPDATE kpi_file_types SET codigo=?, descripcion=?, formato=?, max_mb=?, tabla_destino=?, orden=? WHERE id=?",
            [$codigo, $descripcion, $formato, $maxMb, $tablaDestino, $orden, $id]
        );
        jsonResponse(true, 'Tipo actualizado.', ['id' => $id]);
    } else {
        $dup = db()->fetchOne("SELECT id FROM kpi_file_types WHERE codigo = ?", [$codigo]);
        if ($dup) jsonResponse(false, "El código '{$codigo}' ya existe.", null, 409);
        db()->query(
            "INSERT INTO kpi_file_types (codigo, descripcion, formato, max_mb, tabla_destino, orden) VALUES (?,?,?,?,?,?)",
            [$codigo, $descripcion, $formato, $maxMb, $tablaDestino, $orden]
        );
        jsonResponse(true, 'Tipo creado.', ['id' => (int)db()->lastInsertId()]);
    }
}

// ── DELETE ────────────────────────────────────────────────────
function eliminarTipo(): void {
    $body = json_decode(file_get_contents('php://input'), true);
    $id   = (int)($body['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID requerido.', null, 400);

    $existing = db()->fetchOne("SELECT id FROM kpi_file_types WHERE id = ?", [$id]);
    if (!$existing) jsonResponse(false, 'Tipo no encontrado.', null, 404);

    db()->query("UPDATE kpi_file_types SET activo = 0 WHERE id = ?", [$id]);
    jsonResponse(true, 'Tipo eliminado.');
}
