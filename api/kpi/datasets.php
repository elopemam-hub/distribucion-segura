<?php
// ============================================================
// API: KPI ANALYTICS — Datasets
// Archivo: api/kpi/datasets.php
// Acciones: list, create, import_batch, finalize, delete
// ============================================================

require_once __DIR__ . '/../../includes/auth.php';

requireLogin();
if (!tieneAccesoModulo('kpi_analytics')) {
    jsonResponse(false, 'Acceso no autorizado.', null, 403);
}
requireRole(['administrador']);
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? 'list';
$user   = getCurrentUser();

if (in_array($action, ['create', 'import_batch', 'finalize', 'delete'], true)) {
    requireCsrf();
}

try {
    switch ($action) {
        case 'list':         listarDatasets();  break;
        case 'create':       crearDataset();    break;
        case 'import_batch': importarBatch();   break;
        case 'finalize':     finalizarImport(); break;
        case 'delete':       eliminarDataset(); break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Exception $e) {
    error_log('[kpi/datasets] ' . $e->getMessage());
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ============================================================

function listarDatasets(): void {
    global $user;

    // Todos los roles ven todos los datasets (visibilidad compartida)
    $rows = db()->fetchAll(
        "SELECT d.id, d.nombre, d.columnas, d.mapeo, d.total_filas, d.creado_por, d.creado_en,
                u.nombre AS creado_por_nombre
         FROM kpi_datasets d
         LEFT JOIN usuarios u ON u.id = d.creado_por
         ORDER BY d.creado_en DESC"
    );

    foreach ($rows as &$row) {
        $row['columnas']    = json_decode($row['columnas'], true) ?? [];
        $row['total_filas'] = (int)$row['total_filas'];
        $mapeo = json_decode($row['mapeo'] ?? '{}', true) ?? [];
        $row['tipo_codigo']          = $mapeo['tipo_codigo']          ?? null;
        $row['fecha_planificacion']  = $mapeo['fecha_planificacion']  ?? null;
        unset($row['mapeo']);
    }
    unset($row);

    jsonResponse(true, '', $rows);
}

// ── CREATE: registra metadatos del dataset, devuelve id ──────
function crearDataset(): void {
    global $user;

    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) { jsonResponse(false, 'Payload inválido.', null, 400); }

    $nombre            = trim($body['nombre'] ?? '');
    $columnas          = $body['columnas']           ?? [];
    $tipoCodigo        = strtoupper(trim($body['tipo_codigo']        ?? ''));
    $fechaPlanificacion = trim($body['fecha_planificacion'] ?? '');

    if ($nombre === '')      { jsonResponse(false, 'El nombre del dataset es requerido.', null, 400); }
    if (strlen($nombre) > 120) { jsonResponse(false, 'Nombre demasiado largo (máx. 120 caracteres).', null, 400); }
    if (empty($columnas) || !is_array($columnas)) {
        jsonResponse(false, 'Las columnas son requeridas.', null, 400);
    }

    // Validar fecha si se proporcionó
    if ($fechaPlanificacion !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaPlanificacion)) {
        $fechaPlanificacion = '';
    }

    $tiposValidos = ['dimension', 'metrica', 'fecha', 'ignorar'];
    foreach ($columnas as $col) {
        if (empty($col['nombre']) || !in_array($col['tipo'] ?? '', $tiposValidos, true)) {
            jsonResponse(false, 'Estructura de columnas inválida.', null, 400);
        }
        if (strlen($col['nombre']) > 200) {
            jsonResponse(false, 'Nombre de columna demasiado largo.', null, 400);
        }
    }

    $mapeo = json_encode([
        'tipo_codigo'         => $tipoCodigo ?: null,
        'fecha_planificacion' => $fechaPlanificacion ?: null,
    ], JSON_UNESCAPED_UNICODE);

    db()->query(
        "INSERT INTO kpi_datasets (nombre, columnas, mapeo, creado_por) VALUES (?, ?, ?, ?)",
        [$nombre, json_encode($columnas, JSON_UNESCAPED_UNICODE), $mapeo, (int)$user['id']]
    );

    jsonResponse(true, 'Dataset creado.', ['id' => (int)db()->lastInsertId()]);
}

// ── IMPORT_BATCH: inserta un lote de filas ───────────────────
function importarBatch(): void {
    global $user;

    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) { jsonResponse(false, 'Payload inválido.', null, 400); }

    $datasetId = (int)($body['dataset_id'] ?? 0);
    $filas     = $body['filas']  ?? [];
    $offset    = (int)($body['offset'] ?? 0);

    if ($datasetId <= 0)         { jsonResponse(false, 'dataset_id requerido.', null, 400); }
    if (empty($filas) || !is_array($filas)) { jsonResponse(false, 'Filas requeridas.', null, 400); }
    if (count($filas) > 1000)    { jsonResponse(false, 'Máximo 1000 filas por batch.', null, 400); }

    // Verificar propiedad
    $dataset = db()->fetchOne("SELECT id, creado_por FROM kpi_datasets WHERE id = ?", [$datasetId]);
    if (!$dataset) { jsonResponse(false, 'Dataset no encontrado.', null, 404); }
    if ($user['rol'] !== 'administrador' && (int)$dataset['creado_por'] !== (int)$user['id']) {
        jsonResponse(false, 'Sin permisos para este dataset.', null, 403);
    }

    $pdo  = db()->getConnection();
    $stmt = $pdo->prepare(
        "INSERT INTO kpi_data (dataset_id, fila, num_fila) VALUES (?, ?, ?)"
    );

    db()->beginTransaction();
    try {
        foreach ($filas as $i => $fila) {
            $stmt->execute([
                $datasetId,
                json_encode($fila, JSON_UNESCAPED_UNICODE),
                $offset + $i + 1,
            ]);
        }
        db()->commit();
    } catch (Exception $e) {
        db()->rollback();
        throw $e;
    }

    jsonResponse(true, 'Batch insertado.', ['inserted' => count($filas)]);
}

// ── FINALIZE: actualiza total_filas con COUNT real ───────────
function finalizarImport(): void {
    global $user;

    $body      = json_decode(file_get_contents('php://input'), true);
    $datasetId = (int)($body['dataset_id'] ?? 0);

    if ($datasetId <= 0) { jsonResponse(false, 'dataset_id requerido.', null, 400); }

    $dataset = db()->fetchOne("SELECT id, creado_por FROM kpi_datasets WHERE id = ?", [$datasetId]);
    if (!$dataset) { jsonResponse(false, 'Dataset no encontrado.', null, 404); }
    if ($user['rol'] !== 'administrador' && (int)$dataset['creado_por'] !== (int)$user['id']) {
        jsonResponse(false, 'Sin permisos.', null, 403);
    }

    $count = db()->fetchOne(
        "SELECT COUNT(*) AS total FROM kpi_data WHERE dataset_id = ?",
        [$datasetId]
    );
    $total = (int)($count['total'] ?? 0);

    db()->query(
        "UPDATE kpi_datasets SET total_filas = ? WHERE id = ?",
        [$total, $datasetId]
    );

    jsonResponse(true, 'Import finalizado.', ['total_filas' => $total]);
}

// ── DELETE: borra dataset + filas (CASCADE) ──────────────────
function eliminarDataset(): void {
    global $user;

    $body = json_decode(file_get_contents('php://input'), true);
    $id   = (int)($body['id'] ?? 0);

    if ($id <= 0) { jsonResponse(false, 'ID requerido.', null, 400); }

    $dataset = db()->fetchOne("SELECT id, creado_por, nombre FROM kpi_datasets WHERE id = ?", [$id]);
    if (!$dataset) { jsonResponse(false, 'Dataset no encontrado.', null, 404); }
    if ($user['rol'] !== 'administrador' && (int)$dataset['creado_por'] !== (int)$user['id']) {
        jsonResponse(false, 'Sin permisos para eliminar este dataset.', null, 403);
    }

    db()->query("DELETE FROM kpi_datasets WHERE id = ?", [$id]);

    jsonResponse(true, 'Dataset eliminado.');
}
