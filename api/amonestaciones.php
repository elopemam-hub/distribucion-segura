<?php
// ============================================================
// API: MÓDULO AMONESTACIONES
// Archivo: api/amonestaciones.php
// Acciones: list, get, save, delete, stats
// ============================================================

require_once __DIR__ . '/../includes/auth.php';

requireLogin();
if (!tieneAccesoModulo('amonestaciones')) {
    jsonResponse(false, 'Acceso no autorizado.', null, 403);
}
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

if (in_array($action, ['save', 'delete'], true)) {
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
        case 'list':   listar();  break;
        case 'get':    obtener(); break;
        case 'save':   guardar(); break;
        case 'delete': eliminar(); break;
        case 'stats':  stats();   break;
        case 'kpi':    kpi();     break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Exception $e) {
    error_log('[amonestaciones] ' . $e->getMessage());
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ============================================================
function listar() {
    $tipo   = trim($_GET['tipo']   ?? '');
    $estado = trim($_GET['estado'] ?? '');
    $q      = trim($_GET['q']      ?? '');
    $desde  = trim($_GET['desde']  ?? '');
    $hasta  = trim($_GET['hasta']  ?? '');
    $page   = max(1, (int)($_GET['page']  ?? 1));
    $limit  = min(100, max(10, (int)($_GET['limit'] ?? 50)));
    $offset = ($page - 1) * $limit;

    $where  = ['1=1'];
    $params = [];

    if ($tipo   !== '') { $where[] = 'a.tipo = ?';          $params[] = $tipo; }
    if ($estado !== '') { $where[] = 'a.estado = ?';        $params[] = $estado; }
    if ($q      !== '') { $where[] = '(p.nombre LIKE ? OR p.dni LIKE ?)'; $params[] = "%$q%"; $params[] = "%$q%"; }
    if ($desde  !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $desde)) { $where[] = 'a.fecha >= ?'; $params[] = $desde; }
    if ($hasta  !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $hasta)) { $where[] = 'a.fecha <= ?'; $params[] = $hasta; }

    $whereSQL = implode(' AND ', $where);

    $total = db()->fetchOne(
        "SELECT COUNT(*) t
         FROM amonestaciones a
         LEFT JOIN personal p ON p.id = a.personal_id
         WHERE $whereSQL",
        $params
    )['t'];

    $rows = db()->fetchAll(
        "SELECT a.*,
                p.nombre AS personal_nombre,
                p.cargo  AS personal_cargo,
                p.dni    AS personal_dni,
                u.nombre AS creado_por_nombre
         FROM amonestaciones a
         LEFT JOIN personal  p ON p.id = a.personal_id
         LEFT JOIN usuarios  u ON u.id = a.creado_por
         WHERE $whereSQL
         ORDER BY a.fecha DESC, a.creado_en DESC
         LIMIT $limit OFFSET $offset",
        $params
    );

    jsonResponse(true, '', [
        'amonestaciones' => $rows,
        'total'  => (int)$total,
        'page'   => $page,
        'limit'  => $limit,
        'pages'  => (int)ceil($total / $limit),
    ]);
}

// ------------------------------------------------------------
function obtener() {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);

    $row = db()->fetchOne(
        "SELECT a.*, p.nombre AS personal_nombre
         FROM amonestaciones a
         LEFT JOIN personal p ON p.id = a.personal_id
         WHERE a.id = ?",
        [$id]
    );
    if (!$row) jsonResponse(false, 'No encontrado.', null, 404);
    jsonResponse(true, '', $row);
}

// ------------------------------------------------------------
function guardar() {
    $id          = (int)($_POST['id'] ?? 0);
    $tipo        = trim($_POST['tipo']        ?? '');
    $personalId  = (int)($_POST['personal_id'] ?? 0);
    $fecha       = trim($_POST['fecha']        ?? '');
    $descripcion = trim($_POST['descripcion']  ?? '');
    $estado      = trim($_POST['estado']       ?? 'pendiente');
    $obs         = trim($_POST['observaciones'] ?? '');

    // Campos Bancarización
    $monto       = $_POST['monto']          ?? null;
    $nroOp       = trim($_POST['nro_operacion'] ?? '');
    $motivoCodigo  = trim($_POST['motivo_codigo']  ?? '');
    $codigoCliente = trim($_POST['codigo_cliente'] ?? '');

    // Campos N3
    $cliente = trim($_POST['cliente'] ?? '');
    $ruta    = trim($_POST['ruta']    ?? '');

    // Campos Telemetría base
    $unidad    = strtoupper(trim($_POST['unidad']     ?? ''));
    $regla     = trim($_POST['evento_tele']            ?? ''); // Regla usa evento_tele como campo DB
    $valorReg  = trim($_POST['valor_registrado']       ?? '');

    // Campos comunes extendidos (Bancarización, N3 y Telemetría)
    $tipoSancion      = trim($_POST['tipo_sancion']       ?? '');
    $tipoSancionNivel = trim($_POST['tipo_sancion_nivel'] ?? '');
    $reincidente      = isset($_POST['reincidente']) ? 1 : 0;
    $planAcciones     = trim($_POST['plan_acciones']      ?? '');
    $fechaCierre      = $_POST['fecha_cierre'] ?? null;

    if (!in_array($tipo, ['bancarizacion','n3','telemetria'], true))
        jsonResponse(false, 'Tipo inválido.', null, 422);
    if ($personalId <= 0)
        jsonResponse(false, 'Selecciona un personal.', null, 422);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha))
        jsonResponse(false, 'Fecha inválida.', null, 422);
    if ($descripcion === '' && $tipo === 'telemetria') $descripcion = '—';
    if ($descripcion === '' && in_array($tipo, ['bancarizacion','n3'], true))
        jsonResponse(false, 'Descripción requerida.', null, 422);
    if (!in_array($estado, ['pendiente','notificado','cerrado'], true))
        $estado = 'pendiente';

    // Subir imagen de evento (todos los tipos)
    $imagenEvento = null;
    if (!empty($_FILES['imagen_evento']['tmp_name'])) {
        $imagenEvento = subirImagenEvento($_FILES['imagen_evento']);
    }

    $creador = getCurrentUser();

    $data = [
        'tipo'               => $tipo,
        'personal_id'        => $personalId,
        'fecha'              => $fecha,
        'descripcion'        => $descripcion ?: '',
        'monto'              => ($monto !== null && $monto !== '') ? (float)$monto : null,
        'nro_operacion'      => $nroOp       ?: null,
        'motivo_codigo'      => $motivoCodigo  ?: null,
        'codigo_cliente'     => $codigoCliente ?: null,
        'cliente'            => $cliente       ?: null,
        'ruta'               => $ruta         ?: null,
        'unidad'             => $unidad   ?: null,
        'evento_tele'        => $regla    ?: null,
        'valor_registrado'   => $valorReg ?: null,
        'tipo_sancion'       => $tipoSancion      ?: null,
        'tipo_sancion_nivel' => $tipoSancionNivel ?: null,
        'reincidente'        => $reincidente,
        'plan_acciones'      => $planAcciones ?: null,
        'fecha_cierre'       => ($fechaCierre && preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaCierre)) ? $fechaCierre : null,
        'estado'             => $estado,
        'observaciones'      => $obs ?: null,
    ];

    if ($imagenEvento) $data['imagen_evento'] = $imagenEvento;

    // Subir documento de amonestación (PDF/Word)
    if (!empty($_FILES['archivo_amonestacion']['tmp_name'])) {
        $docPath = subirDocumentoAmon($_FILES['archivo_amonestacion']);
        if ($docPath) $data['archivo_amonestacion'] = $docPath;
    }

    if ($id > 0) {
        // En update, solo sobreescribir imagen si se sube una nueva
        $sets   = implode(', ', array_map(fn($k) => "$k = ?", array_keys($data)));
        $params = array_values($data);
        $params[] = $id;
        db()->query("UPDATE amonestaciones SET $sets WHERE id = ?", $params);
        jsonResponse(true, 'Amonestación actualizada.', ['id' => $id]);
    } else {
        $data['creado_por'] = $creador['id'] ?? null;
        $cols = implode(', ', array_keys($data));
        $phs  = implode(', ', array_fill(0, count($data), '?'));
        db()->query("INSERT INTO amonestaciones ($cols) VALUES ($phs)", array_values($data));
        jsonResponse(true, 'Amonestación registrada.', ['id' => db()->lastInsertId()]);
    }
}

// ------------------------------------------------------------
function subirDocumentoAmon(array $file): ?string {
    if ($file['error'] !== UPLOAD_ERR_OK) return null;
    if ($file['size'] > 20 * 1024 * 1024) return null; // 20 MB máx

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    $permitidos = ['pdf', 'doc', 'docx', 'odt'];
    if (!in_array($ext, $permitidos)) return null;

    $dir = __DIR__ . '/../uploads/amonestaciones/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    $filename = 'amon_' . date('Ymd') . '_' . bin2hex(random_bytes(5)) . '.' . $ext;
    $destino  = $dir . $filename;
    if (move_uploaded_file($file['tmp_name'], $destino)) {
        @chmod($destino, 0644);
        return 'amonestaciones/' . $filename;
    }
    return null;
}

function subirImagenEvento(array $file): ?string {
    if ($file['error'] !== UPLOAD_ERR_OK) return null;
    if ($file['size'] > 10 * 1024 * 1024) return null; // 10 MB máx

    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime  = $finfo->file($file['tmp_name']);
    $map   = ['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'];
    if (!isset($map[$mime])) return null;
    if (@getimagesize($file['tmp_name']) === false) return null;

    $dir = __DIR__ . '/../uploads/telemetria/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);

    $filename = 'tele_' . date('Ymd') . '_' . bin2hex(random_bytes(5)) . '.' . $map[$mime];
    $destino  = $dir . $filename;
    if (move_uploaded_file($file['tmp_name'], $destino)) {
        @chmod($destino, 0644);
        return 'telemetria/' . $filename;
    }
    return null;
}

// ------------------------------------------------------------
function eliminar() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    $aff = db()->query("DELETE FROM amonestaciones WHERE id = ?", [$id])->rowCount();
    if ($aff === 0) jsonResponse(false, 'No encontrado.', null, 404);
    jsonResponse(true, 'Amonestación eliminada.');
}

// ------------------------------------------------------------
function kpi() {
    $desde = trim($_GET['desde'] ?? '');
    $hasta = trim($_GET['hasta'] ?? '');

    $fechaWhere  = '';
    $fechaParams = [];
    if ($desde !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $desde)) {
        $fechaWhere  .= ' AND a.fecha >= ?';
        $fechaParams[] = $desde;
    }
    if ($hasta !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $hasta)) {
        $fechaWhere  .= ' AND a.fecha <= ?';
        $fechaParams[] = $hasta;
    }

    $tipos     = ['bancarizacion', 'n3', 'telemetria'];
    $resultado = [];

    foreach ($tipos as $tipo) {
        $params = array_merge([$tipo], $fechaParams);
        $where  = "a.tipo = ?" . $fechaWhere;

        $montoCol = $tipo === 'bancarizacion' ? ", SUM(COALESCE(monto,0)) AS monto_total" : '';
        $resumen  = db()->fetchOne(
            "SELECT
                COUNT(*)                    AS total,
                SUM(estado='pendiente')     AS pendientes,
                SUM(estado='notificado')    AS notificados,
                SUM(estado='cerrado')       AS cerrados,
                SUM(reincidente=1)          AS reincidentes,
                SUM(reincidente=0)          AS primera_vez
                $montoCol
             FROM amonestaciones a WHERE $where",
            $params
        );

        $por_motivo = [];
        if (in_array($tipo, ['bancarizacion', 'n3'])) {
            $por_motivo = db()->fetchAll(
                "SELECT motivo_codigo AS motivo, COUNT(*) AS total
                 FROM amonestaciones a
                 WHERE $where AND motivo_codigo IS NOT NULL
                 GROUP BY motivo_codigo ORDER BY total DESC",
                $params
            );
        }

        $extra = [];
        if ($tipo === 'telemetria') {
            $extra['por_regla'] = db()->fetchAll(
                "SELECT evento_tele AS regla, COUNT(*) AS total
                 FROM amonestaciones a
                 WHERE $where AND evento_tele IS NOT NULL
                 GROUP BY evento_tele ORDER BY total DESC LIMIT 10",
                $params
            );
            $extra['por_sancion'] = db()->fetchAll(
                "SELECT tipo_sancion AS sancion, COUNT(*) AS total
                 FROM amonestaciones a
                 WHERE $where AND tipo_sancion IS NOT NULL
                 GROUP BY tipo_sancion ORDER BY total DESC",
                $params
            );
            $extra['por_nivel'] = db()->fetchAll(
                "SELECT tipo_sancion_nivel AS nivel, COUNT(*) AS total
                 FROM amonestaciones a
                 WHERE $where AND tipo_sancion_nivel IS NOT NULL
                 GROUP BY tipo_sancion_nivel
                 ORDER BY FIELD(tipo_sancion_nivel,'1ERA VEZ','2DA VEZ','3ERA VEZ','4TA VEZ','5TA VEZ')",
                $params
            );
        }

        $top_personal = db()->fetchAll(
            "SELECT p.nombre, p.cargo, p.dni, COUNT(*) AS total, SUM(a.reincidente) AS reincidencias
             FROM amonestaciones a
             LEFT JOIN personal p ON p.id = a.personal_id
             WHERE $where
             GROUP BY a.personal_id, p.nombre, p.cargo, p.dni
             ORDER BY total DESC LIMIT 5",
            $params
        );

        $resultado[$tipo] = array_merge([
            'resumen'      => $resumen,
            'por_motivo'   => $por_motivo,
            'top_personal' => $top_personal,
        ], $extra);
    }

    jsonResponse(true, '', $resultado);
}

// ------------------------------------------------------------
function stats() {
    $row = db()->fetchOne(
        "SELECT
            COUNT(*)                          AS total,
            SUM(tipo='bancarizacion')         AS bancarizacion,
            SUM(tipo='n3')                    AS n3,
            SUM(tipo='telemetria')            AS telemetria,
            SUM(estado='pendiente')           AS pendientes,
            SUM(estado='notificado')          AS notificados,
            SUM(estado='cerrado')             AS cerrados
         FROM amonestaciones"
    );
    jsonResponse(true, '', $row);
}
