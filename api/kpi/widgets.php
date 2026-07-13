<?php
// ============================================================
// API: KPI Analytics — Widgets CRUD
// Archivo: api/kpi/widgets.php
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
}

try {
    switch ($action) {
        case 'list':   listarWidgets();  break;
        case 'save':   guardarWidget();  break;
        case 'delete': eliminarWidget(); break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Exception $e) {
    error_log('[kpi/widgets] ' . $e->getMessage());
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ── LIST ─────────────────────────────────────────────────────
function listarWidgets(): void {
    global $user;

    if ($user['rol'] === 'administrador') {
        $rows = db()->fetchAll(
            "SELECT w.id, w.titulo, w.tipo_chart, w.config, w.dataset_id, w.creado_en,
                    d.nombre AS dataset_nombre
             FROM kpi_widgets w
             LEFT JOIN kpi_datasets d ON d.id = w.dataset_id
             ORDER BY w.creado_en DESC"
        );
    } else {
        $rows = db()->fetchAll(
            "SELECT w.id, w.titulo, w.tipo_chart, w.config, w.dataset_id, w.creado_en,
                    d.nombre AS dataset_nombre
             FROM kpi_widgets w
             LEFT JOIN kpi_datasets d ON d.id = w.dataset_id
             WHERE w.creado_por = ?
             ORDER BY w.creado_en DESC",
            [(int)$user['id']]
        );
    }

    foreach ($rows as &$row) {
        $row['config'] = json_decode($row['config'], true) ?? [];
    }
    unset($row);

    jsonResponse(true, '', $rows);
}

// ── SAVE (create or update) ───────────────────────────────────
function guardarWidget(): void {
    global $user;

    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) jsonResponse(false, 'Payload inválido.', null, 400);

    $titulo    = trim($body['titulo']    ?? '');
    $tipoChart = $body['tipo_chart']    ?? '';
    $datasetId = (int)($body['dataset_id'] ?? 0);
    $config    = $body['config']         ?? [];
    $widgetId  = (int)($body['id']       ?? 0);

    if ($titulo === '')  jsonResponse(false, 'Título requerido.', null, 400);
    if ($datasetId <= 0) jsonResponse(false, 'dataset_id requerido.', null, 400);

    $tiposValidos = ['line', 'bar', 'area', 'pie', 'donut', 'radar', 'heatmap', 'radialBar'];
    if (!in_array($tipoChart, $tiposValidos, true)) {
        jsonResponse(false, 'Tipo de gráfico inválido.', null, 400);
    }

    if ($widgetId > 0) {
        $w = db()->fetchOne("SELECT id, creado_por FROM kpi_widgets WHERE id = ?", [$widgetId]);
        if (!$w) jsonResponse(false, 'Widget no encontrado.', null, 404);
        if ($user['rol'] !== 'administrador' && (int)$w['creado_por'] !== (int)$user['id']) {
            jsonResponse(false, 'Sin permisos.', null, 403);
        }
        db()->query(
            "UPDATE kpi_widgets SET titulo=?, tipo_chart=?, dataset_id=?, config=? WHERE id=?",
            [$titulo, $tipoChart, $datasetId,
             json_encode($config, JSON_UNESCAPED_UNICODE), $widgetId]
        );
        jsonResponse(true, 'Widget actualizado.', ['id' => $widgetId]);
    } else {
        db()->query(
            "INSERT INTO kpi_widgets (titulo, tipo_chart, dataset_id, config, creado_por)
             VALUES (?,?,?,?,?)",
            [$titulo, $tipoChart, $datasetId,
             json_encode($config, JSON_UNESCAPED_UNICODE), (int)$user['id']]
        );
        jsonResponse(true, 'Widget guardado.', ['id' => (int)db()->lastInsertId()]);
    }
}

// ── DELETE ────────────────────────────────────────────────────
function eliminarWidget(): void {
    global $user;

    $body = json_decode(file_get_contents('php://input'), true);
    $id   = (int)($body['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID requerido.', null, 400);

    $w = db()->fetchOne("SELECT id, creado_por FROM kpi_widgets WHERE id = ?", [$id]);
    if (!$w) jsonResponse(false, 'Widget no encontrado.', null, 404);
    if ($user['rol'] !== 'administrador' && (int)$w['creado_por'] !== (int)$user['id']) {
        jsonResponse(false, 'Sin permisos.', null, 403);
    }

    db()->query("DELETE FROM kpi_widgets WHERE id = ?", [$id]);
    jsonResponse(true, 'Widget eliminado.');
}
