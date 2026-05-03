<?php
// ============================================================
// API: MÓDULO GEOCERCAS
// Archivo: api/geocercas.php
// Acciones: list, get, save, delete, toggle, stats
//
// SQL requerido:
// CREATE TABLE geocercas (
//   id INT AUTO_INCREMENT PRIMARY KEY,
//   tipo ENUM('ruta_critica','zona_n3','zona_roja') NOT NULL,
//   nombre VARCHAR(100) NOT NULL,
//   descripcion TEXT NULL,
//   color VARCHAR(7) NOT NULL DEFAULT '#E74C3C',
//   coordenadas JSON NOT NULL,
//   activo TINYINT(1) NOT NULL DEFAULT 1,
//   creado_por INT NULL,
//   creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//   actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//   FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
// ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
// ============================================================

require_once __DIR__ . '/../includes/auth.php';

requireLogin();
if (!tieneAccesoModulo('geocercas')) {
    jsonResponse(false, 'Acceso no autorizado.', null, 403);
}
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

if (in_array($action, ['save', 'delete', 'toggle', 'batch_save'], true)) {
    requireCsrf();
    $user = getCurrentUser();
    if (!in_array($user['rol'], ['administrador', 'supervisor'])) {
        jsonResponse(false, 'Sin permisos para esta acción.', null, 403);
    }
}
if ($action === 'delete') {
    $user = getCurrentUser();
    if ($user['rol'] !== 'administrador') {
        jsonResponse(false, 'Solo el administrador puede eliminar.', null, 403);
    }
}

try {
    switch ($action) {
        case 'list':   listar();       break;
        case 'get':    obtener();      break;
        case 'save':   guardar();      break;
        case 'delete': eliminar();     break;
        case 'toggle': toggleActivo(); break;
        case 'stats':       stats();      break;
        case 'batch_save':  batchSave();  break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Exception $e) {
    error_log('[geocercas] ' . $e->getMessage());
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ============================================================
function listar() {
    $tipo = trim($_GET['tipo'] ?? '');
    $where  = ['1=1'];
    $params = [];
    if ($tipo !== '') { $where[] = 'g.tipo = ?'; $params[] = $tipo; }

    $whereSQL = implode(' AND ', $where);
    $rows = db()->fetchAll(
        "SELECT g.*, u.nombre AS creado_por_nombre
         FROM geocercas g
         LEFT JOIN usuarios u ON u.id = g.creado_por
         WHERE $whereSQL
         ORDER BY g.creado_en DESC",
        $params
    );
    jsonResponse(true, '', $rows);
}

// ------------------------------------------------------------
function obtener() {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    $row = db()->fetchOne("SELECT * FROM geocercas WHERE id = ?", [$id]);
    if (!$row) jsonResponse(false, 'No encontrado.', null, 404);
    jsonResponse(true, '', $row);
}

// ------------------------------------------------------------
function guardar() {
    $id               = (int)($_POST['id']               ?? 0);
    $tipo             = trim($_POST['tipo']              ?? '');
    $nombre           = trim($_POST['nombre']            ?? '');
    $codigo           = trim($_POST['codigo']            ?? '');
    $direccionCliente = trim($_POST['direccion_cliente'] ?? '');
    $supervisor       = trim($_POST['supervisor']        ?? '');
    $clientesN3       = trim($_POST['clientes_n3']       ?? '');
    $descripcion      = trim($_POST['descripcion']       ?? '');
    $icono            = trim($_POST['icono']             ?? 'fa-circle');
    $color            = trim($_POST['color']             ?? '#E74C3C');
    $coordenadas      = trim($_POST['coordenadas']       ?? '');

    $tiposValidos = ['ruta_critica', 'zona_n3', 'zona_roja'];
    if (!in_array($tipo, $tiposValidos, true))
        jsonResponse(false, 'Tipo inválido.', null, 422);
    if ($nombre === '')
        jsonResponse(false, 'El nombre es requerido.', null, 422);
    if ($coordenadas === '')
        jsonResponse(false, 'Dibuja la geocerca en el mapa.', null, 422);

    $coords = json_decode($coordenadas, true);
    $minPuntos = match($tipo) {
        'zona_n3'      => 1,
        'zona_roja'    => 3,
        'ruta_critica' => 2,
        default        => 1,
    };
    if (!is_array($coords) || count($coords) < $minPuntos)
        jsonResponse(false, "Se requieren al menos $minPuntos punto(s) para este tipo.", null, 422);

    if (!preg_match('/^#[0-9A-Fa-f]{6}$/', $color)) $color = '#E74C3C';

    $creador = getCurrentUser();

    $data = [
        'tipo'              => $tipo,
        'nombre'            => $nombre,
        'codigo'            => $codigo            ?: null,
        'direccion_cliente' => $direccionCliente  ?: null,
        'supervisor'        => $supervisor        ?: null,
        'clientes_n3'       => $clientesN3        ?: null,
        'descripcion'       => $descripcion       ?: null,
        'icono'             => $icono             ?: 'fa-circle',
        'color'             => $color,
        'coordenadas'       => $coordenadas,
        'activo'            => 1,
    ];

    if ($id > 0) {
        $sets   = implode(', ', array_map(fn($k) => "$k = ?", array_keys($data)));
        $params = array_values($data);
        $params[] = $id;
        db()->query("UPDATE geocercas SET $sets WHERE id = ?", $params);
        jsonResponse(true, 'Geocerca actualizada.', ['id' => $id]);
    } else {
        $data['creado_por'] = $creador['id'] ?? null;
        $cols = implode(', ', array_keys($data));
        $phs  = implode(', ', array_fill(0, count($data), '?'));
        db()->query("INSERT INTO geocercas ($cols) VALUES ($phs)", array_values($data));
        jsonResponse(true, 'Geocerca registrada.', ['id' => db()->lastInsertId()]);
    }
}

// ------------------------------------------------------------
function eliminar() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    $aff = db()->query("DELETE FROM geocercas WHERE id = ?", [$id])->rowCount();
    if ($aff === 0) jsonResponse(false, 'No encontrado.', null, 404);
    jsonResponse(true, 'Geocerca eliminada.');
}

// ------------------------------------------------------------
function toggleActivo() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    $row = db()->fetchOne("SELECT activo FROM geocercas WHERE id = ?", [$id]);
    if (!$row) jsonResponse(false, 'No encontrado.', null, 404);
    $nuevo = $row['activo'] ? 0 : 1;
    db()->query("UPDATE geocercas SET activo = ? WHERE id = ?", [$nuevo, $id]);
    jsonResponse(true, $nuevo ? 'Geocerca activada.' : 'Geocerca desactivada.', ['activo' => $nuevo]);
}

// ------------------------------------------------------------
function batchSave() {
    $rows = json_decode($_POST['rows'] ?? '[]', true);
    if (!is_array($rows) || empty($rows))
        jsonResponse(false, 'Sin datos para importar.', null, 422);

    $creador = getCurrentUser();
    $saved   = 0;
    $errores = [];

    foreach ($rows as $i => $r) {
        $nombre = trim($r['nombre'] ?? '');
        $lat    = isset($r['latitude'])  && $r['latitude']  !== '' ? (float)$r['latitude']  : null;
        $lng    = isset($r['longitude']) && $r['longitude'] !== '' ? (float)$r['longitude'] : null;

        if ($nombre === '')    { $errores[] = "Fila " . ($i + 1) . ": nombre vacío";       continue; }
        if ($lat === null || $lng === null) { $errores[] = "Fila " . ($i + 1) . ": lat/lng inválidos"; continue; }

        $data = [
            'tipo'              => 'zona_n3',
            'nombre'            => $nombre,
            'codigo'            => trim($r['codigo']            ?? '') ?: null,
            'direccion_cliente' => trim($r['direccion_cliente'] ?? '') ?: null,
            'supervisor'        => trim($r['supervisor']        ?? '') ?: null,
            'clientes_n3'       => trim($r['clientes_n3']       ?? '') ?: null,
            'descripcion'       => trim($r['descripcion']       ?? '') ?: null,
            'icono'             => trim($r['icono'] ?? 'fa-circle') ?: 'fa-circle',
            'color'             => trim($r['color'] ?? '#3498DB') ?: '#3498DB',
            'coordenadas'       => json_encode([[$lat, $lng]]),
            'activo'            => 1,
            'creado_por'        => $creador['id'] ?? null,
        ];
        $cols = implode(', ', array_keys($data));
        $phs  = implode(', ', array_fill(0, count($data), '?'));
        db()->query("INSERT INTO geocercas ($cols) VALUES ($phs)", array_values($data));
        $saved++;
    }

    $msg = "$saved zona(s) N3 importadas correctamente.";
    if ($errores) $msg .= ' Omitidas: ' . implode('; ', $errores);
    jsonResponse(true, $msg, ['saved' => $saved, 'errores' => $errores]);
}

// ------------------------------------------------------------
function stats() {
    $row = db()->fetchOne(
        "SELECT
            COUNT(*)                            AS total,
            SUM(tipo='ruta_critica')            AS rutas_criticas,
            SUM(tipo='zona_n3')                 AS zonas_n3,
            SUM(tipo='zona_roja')               AS zonas_rojas,
            SUM(activo=1)                       AS activas,
            SUM(activo=0)                       AS inactivas
         FROM geocercas"
    );
    jsonResponse(true, '', $row);
}
