<?php
// ============================================================
// API EPP: inventario — stock, kardex y registro de movimientos
// Archivo: api/epp/movimientos.php
// Acciones (?action=):
//   stock            → stock actual por tipo (SUM cantidad) + alerta de mínimo
//   list             → kardex de movimientos (con filtros)
//   registrar        → registra inicial / entrada / ajuste
//   importar_inicial → carga masiva de saldos de apertura (Excel)
// ============================================================

require_once __DIR__ . '/../../includes/auth.php';

requireLogin();
setupEpp();
setupEmpresas();
setupUsuarioEmpresas();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? 'stock';

$mutaciones = ['registrar', 'importar_inicial'];
if (in_array($action, $mutaciones, true)) {
    requireCsrf();
    $user = getCurrentUser();
    if (!in_array($user['rol'], ['administrador', 'supervisor'])) {
        jsonResponse(false, 'No tienes permisos.', null, 403);
    }
}

try {
    switch ($action) {
        case 'stock':            stock();           break;
        case 'list':             listar();          break;
        case 'registrar':        registrar();       break;
        case 'importar_inicial': importarInicial(); break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Exception $e) {
    error_log('[epp/movimientos] ' . $e->getMessage());
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ============================================================
// Stock actual = SUM(cantidad) del kardex, por tipo. LEFT JOIN para incluir
// tipos sin movimientos (stock 0). Marca bajo_minimo cuando aplica.
function stock() {
    // Siembra el catálogo estándar la primera vez que se entra a la empresa.
    $emp = eppEmpresaSel();
    if ($emp > 0 && empresaEsPermitida($emp)) eppSeedEmpresa($emp);
    [$eSql, $eP] = eppEmpresaFiltro('t.empresa_id');   // stock por empresa (silo)
    $rows = db()->fetchAll(
        "SELECT t.id, t.codigo, t.nombre, t.marca, t.categoria, t.talla, t.consumo_anual,
                t.norma_tecnica, t.unidad, t.imagen, t.stock_minimo, t.stock_maximo,
                COALESCE(SUM(m.cantidad), 0) AS stock
           FROM epp_tipos t
           LEFT JOIN epp_movimientos m ON m.tipo_epp_id = t.id
          WHERE t.activo = 1" . $eSql . "
          GROUP BY t.id, t.codigo, t.nombre, t.marca, t.categoria, t.talla, t.consumo_anual,
                   t.norma_tecnica, t.unidad, t.imagen, t.stock_minimo, t.stock_maximo
          ORDER BY t.nombre ASC, t.talla ASC",
        $eP
    );
    foreach ($rows as &$r) {
        $r['stock']         = (int)$r['stock'];
        $r['stock_minimo']  = (int)$r['stock_minimo'];
        $r['stock_maximo']  = (int)$r['stock_maximo'];
        $r['consumo_anual'] = (int)$r['consumo_anual'];
        // Estado: por debajo del mínimo = alerta; en/encima = OK (como la referencia).
        $r['bajo_minimo']   = ($r['stock'] < $r['stock_minimo']) ? 1 : 0;
    }
    unset($r);

    $totalUnidades = array_sum(array_column($rows, 'stock'));
    $bajoMinimo    = count(array_filter($rows, fn($r) => $r['bajo_minimo'] === 1));

    jsonResponse(true, '', [
        'items' => $rows,
        'resumen' => [
            'tipos'          => count($rows),
            'total_unidades' => $totalUnidades,
            'bajo_minimo'    => $bajoMinimo,
        ],
    ]);
}

// Kardex de movimientos con filtros opcionales
function listar() {
    $tipoEpp = (int)($_GET['tipo_epp_id'] ?? 0);
    $tipoMov = trim($_GET['tipo_mov'] ?? '');
    $desde   = trim($_GET['desde'] ?? '');
    $hasta   = trim($_GET['hasta'] ?? '');
    $limit   = min(500, max(10, (int)($_GET['limit'] ?? 200)));

    $where = ['1=1']; $params = [];
    if ($tipoEpp > 0)          { $where[] = 'm.tipo_epp_id = ?'; $params[] = $tipoEpp; }
    if ($tipoMov !== '' && in_array($tipoMov, ['inicial','entrada','salida','ajuste'], true)) {
        $where[] = 'm.tipo_mov = ?'; $params[] = $tipoMov;
    }
    if ($desde !== '') { $where[] = 'm.fecha >= ?'; $params[] = $desde; }
    if ($hasta !== '') { $where[] = 'm.fecha <= ?'; $params[] = $hasta; }
    $whereSql = implode(' AND ', $where);
    [$eSql, $eP] = eppEmpresaFiltro('t.empresa_id');   // kardex por empresa
    $whereSql .= $eSql; $params = array_merge($params, $eP);

    $rows = db()->fetchAll(
        "SELECT m.id, m.tipo_epp_id, t.nombre AS tipo_nombre, t.unidad, m.tipo_mov, m.cantidad,
                m.costo_unitario, m.proveedor_id, p.razon_social AS proveedor, m.fecha,
                m.documento_ref, m.observacion, m.creado_en
           FROM epp_movimientos m
           JOIN epp_tipos t       ON t.id = m.tipo_epp_id
           LEFT JOIN epp_proveedores p ON p.id = m.proveedor_id
          WHERE $whereSql
          ORDER BY m.fecha DESC, m.id DESC
          LIMIT $limit",
        $params
    );
    jsonResponse(true, '', $rows);
}

// Registra un movimiento: inicial | entrada | ajuste.
// Las salidas NO se registran aquí — se generan desde la entrega a trabajador (Fase 2).
function registrar() {
    $emp      = eppRequireEmpresa();
    $tipoEpp  = (int)($_POST['tipo_epp_id'] ?? 0);
    $tipoMov  = trim($_POST['tipo_mov'] ?? 'entrada');
    $cantidad = (int)($_POST['cantidad'] ?? 0);
    $costo    = $_POST['costo_unitario'] ?? '';
    $provId   = (int)($_POST['proveedor_id'] ?? 0);
    $fecha    = trim($_POST['fecha'] ?? date('Y-m-d'));
    $docRef   = trim($_POST['documento_ref'] ?? '');
    $obs      = trim($_POST['observacion'] ?? '');

    if (!in_array($tipoMov, ['inicial', 'entrada', 'ajuste'], true)) {
        jsonResponse(false, 'Tipo de movimiento no permitido aquí.', null, 422);
    }
    // Existe el tipo, está activo y pertenece a la empresa activa (silo)
    $tipo = db()->fetchOne("SELECT id FROM epp_tipos WHERE id = ? AND activo = 1 AND empresa_id = ?", [$tipoEpp, $emp]);
    if (!$tipo) jsonResponse(false, 'Tipo de EPP inválido para esta empresa.', null, 422);

    // Sanea la cantidad según el tipo de movimiento
    if ($tipoMov === 'ajuste') {
        if ($cantidad === 0) jsonResponse(false, 'El ajuste no puede ser cero.', null, 422);
        // El signo lo decide el usuario (+ suma, − resta)
    } else {
        if ($cantidad <= 0) jsonResponse(false, 'La cantidad debe ser mayor a cero.', null, 422);
        $cantidad = abs($cantidad); // ingreso siempre positivo
    }

    // Un ajuste negativo no puede dejar el stock por debajo de cero
    if ($cantidad < 0) {
        $actual = (int)(db()->fetchOne(
            "SELECT COALESCE(SUM(cantidad),0) AS s FROM epp_movimientos WHERE tipo_epp_id = ?",
            [$tipoEpp]
        )['s'] ?? 0);
        if ($actual + $cantidad < 0) {
            jsonResponse(false, "El ajuste dejaría el stock negativo (actual: $actual).", null, 422);
        }
    }

    $costoVal = ($costo === '' ? null : round((float)$costo, 2));
    $provVal  = $provId > 0 ? $provId : null;

    db()->query(
        "INSERT INTO epp_movimientos
           (tipo_epp_id, tipo_mov, cantidad, costo_unitario, proveedor_id, fecha, documento_ref, usuario_id, observacion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [$tipoEpp, $tipoMov, $cantidad, $costoVal, $provVal, $fecha,
         $docRef ?: null, getCurrentUser()['id'], $obs ?: null]
    );
    jsonResponse(true, 'Movimiento registrado.', ['id' => db()->lastInsertId()]);
}

// Carga masiva de inventario inicial. Filas: [{nombre|tipo_epp_id, cantidad, costo_unitario?}]
// Resuelve el tipo por nombre (case-insensitive) o por id. Todo en una transacción.
function importarInicial() {
    $emp = eppRequireEmpresa();
    $filas = json_decode($_POST['filas'] ?? '[]', true);
    if (!is_array($filas) || !count($filas)) {
        jsonResponse(false, 'No se recibieron filas.', null, 422);
    }
    $fecha = trim($_POST['fecha'] ?? date('Y-m-d'));

    // Índice nombre → id, SOLO de los tipos de esta empresa (silo).
    $tipos = db()->fetchAll("SELECT id, nombre FROM epp_tipos WHERE activo = 1 AND empresa_id = ?", [$emp]);
    $porNombre = [];
    $idsValidos = [];
    foreach ($tipos as $t) { $porNombre[mb_strtolower(trim($t['nombre']), 'UTF-8')] = (int)$t['id']; $idsValidos[(int)$t['id']] = true; }

    $ok = 0; $errores = [];
    try {
        db()->beginTransaction();
        foreach ($filas as $i => $f) {
            $cantidad = (int)($f['cantidad'] ?? 0);
            $tipoId   = (int)($f['tipo_epp_id'] ?? 0);
            if ($tipoId <= 0) {
                $clave = mb_strtolower(trim($f['nombre'] ?? ''), 'UTF-8');
                $tipoId = $porNombre[$clave] ?? 0;
            }
            $fila = $i + 1;
            if ($tipoId > 0 && !isset($idsValidos[$tipoId])) { $errores[] = "Fila $fila: el EPP no pertenece a esta empresa."; continue; }
            if ($tipoId <= 0)      { $errores[] = "Fila $fila: tipo de EPP no encontrado."; continue; }
            if ($cantidad <= 0)    { $errores[] = "Fila $fila: cantidad inválida.";        continue; }

            $costo = isset($f['costo_unitario']) && $f['costo_unitario'] !== ''
                ? round((float)$f['costo_unitario'], 2) : null;

            db()->query(
                "INSERT INTO epp_movimientos
                   (tipo_epp_id, tipo_mov, cantidad, costo_unitario, fecha, usuario_id, observacion)
                 VALUES (?, 'inicial', ?, ?, ?, ?, 'Inventario inicial (carga masiva)')",
                [$tipoId, abs($cantidad), $costo, $fecha, getCurrentUser()['id']]
            );
            $ok++;
        }
        db()->commit();
    } catch (Exception $e) {
        db()->rollback();
        error_log('[epp/importar_inicial] ' . $e->getMessage());
        jsonResponse(false, 'Error al importar. No se guardó ninguna fila.', null, 500);
    }

    jsonResponse(true, "$ok fila(s) importada(s).", ['ok' => $ok, 'errores' => $errores]);
}
