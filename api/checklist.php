<?php
// ============================================================
// API: CHECKLIST DE UNIDADES (inspección mensual de componentes)
// Archivo: api/checklist.php
// Normas SST: Ley 29783, NTP 350.043 (extintores), R.M. 050-2013-TR (EPP),
// R.M. 1275-2021-SA (botiquín).
// Acciones: componentes, list, get, save, delete, cumplimiento,
//           comp_save, comp_toggle, item_save, item_toggle, item_del
// ============================================================

require_once __DIR__ . '/../includes/auth.php';

requireLogin();
setupChecklist();
header('Content-Type: application/json; charset=utf-8');

const CHK_RESULTADOS = ['conforme', 'no_conforme', 'na'];
const CHK_ESTADOS    = ['apto', 'observado', 'no_apto'];

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

$mutaciones = ['save', 'delete', 'foto_add', 'foto_del', 'comp_save', 'comp_toggle', 'item_save', 'item_toggle', 'item_del', 'uni_save', 'uni_toggle', 'uni_del'];
if (in_array($action, $mutaciones, true)) {
    requireCsrf();
    $user = getCurrentUser();
    if (!in_array($user['rol'], ['administrador', 'supervisor'])) {
        jsonResponse(false, 'No tienes permisos.', null, 403);
    }
    if (in_array($action, ['delete', 'uni_del', 'item_del'], true) && $user['rol'] !== 'administrador') {
        jsonResponse(false, 'Solo un administrador puede eliminar.', null, 403);
    }
}
liberarSesion();   // libera el lock de sesión (rendimiento)

try {
    switch ($action) {
        case 'componentes': componentes();  break;
        case 'list':        listar();       break;
        case 'get':         obtener();      break;
        case 'save':        guardar();      break;
        case 'delete':      eliminar();     break;
        case 'foto_add':    fotoAdd();      break;
        case 'foto_del':    fotoDel();      break;
        case 'cumplimiento': cumplimiento(); break;
        case 'dashboard':    dashboard();    break;
        case 'areas':        areas();        break;
        case 'vencimientos': vencimientos(); break;
        case 'vencimientos_botiquin': vencimientosBotiquin(); break;
        case 'uni_list':     uniList();      break;
        case 'uni_items':    uniItems();     break;
        case 'uni_save':     uniSave();      break;
        case 'uni_toggle':   uniToggle();    break;
        case 'uni_del':      uniDel();       break;
        case 'equipo_dash':  equipoDash();   break;
        case 'comp_save':   compSave();     break;
        case 'comp_toggle': compToggle();   break;
        case 'item_save':   itemSave();     break;
        case 'item_toggle': itemToggle();   break;
        case 'item_del':    itemDel();      break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Throwable $e) {
    error_log('[checklist] ' . $e->getMessage());
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ============================================================
// Componentes con sus ítems (para armar el formulario y la config).
function componentes() {
    $todos = ($_GET['todos'] ?? '') === '1';   // incluir inactivos (config)
    $wc = $todos ? '' : 'WHERE c.activo = 1';
    $comps = db()->fetchAll(
        "SELECT c.id, c.nombre, c.orden, c.activo,
                (SELECT COUNT(*) FROM chk_items t WHERE t.componente_id = c.id AND t.activo = 1) AS n_items,
                (SELECT COUNT(*) FROM chk_inspecciones i WHERE i.componente_id = c.id) AS n_inspecciones
           FROM chk_componentes c $wc ORDER BY c.orden ASC, c.id ASC");
    $wi = $todos ? '' : 'AND activo = 1';
    foreach ($comps as &$c) {
        $c['items'] = db()->fetchAll(
            "SELECT id, texto, orden, activo FROM chk_items WHERE componente_id = ? $wi ORDER BY orden ASC, id ASC", [$c['id']]);
    }
    unset($c);
    jsonResponse(true, '', ['componentes' => $comps]);
}

function listar() {
    $periodo = trim($_GET['periodo'] ?? '');
    $placa   = trim($_GET['placa'] ?? '');
    $estado  = trim($_GET['estado'] ?? '');
    $q       = trim($_GET['q'] ?? '');

    $comp = (int)($_GET['componente_id'] ?? 0);
    $where = ['1=1']; $params = [];
    if (preg_match('/^\d{4}-\d{2}$/', $periodo)) { $where[] = 'i.periodo = ?'; $params[] = $periodo; }
    if ($placa !== '')  { $where[] = 'i.placa LIKE ?'; $params[] = "%$placa%"; }
    if ($comp > 0)      { $where[] = 'i.componente_id = ?'; $params[] = $comp; }
    if (in_array($estado, CHK_ESTADOS, true)) { $where[] = 'i.estado = ?'; $params[] = $estado; }
    if ($q !== '')      { $where[] = '(i.placa LIKE ? OR i.inspector_nombre LIKE ?)'; $params[] = "%$q%"; $params[] = "%$q%"; }
    $whereSql = implode(' AND ', $where);

    $rows = db()->fetchAll(
        "SELECT i.id, i.placa, i.componente_id, c.nombre AS equipo, i.periodo, i.fecha, i.vencimiento, i.inspector_nombre, i.estado, i.observacion,
                (SELECT COUNT(*) FROM chk_resultados r WHERE r.inspeccion_id = i.id AND r.resultado = 'no_conforme') AS no_conformes,
                (SELECT COUNT(*) FROM chk_resultados r WHERE r.inspeccion_id = i.id AND r.resultado = 'conforme')    AS conformes,
                (SELECT COUNT(*) FROM chk_resultados r WHERE r.inspeccion_id = i.id AND r.resultado = 'na')          AS na,
                (SELECT COUNT(*) FROM chk_resultados r WHERE r.inspeccion_id = i.id) AS total_items
           FROM chk_inspecciones i
           LEFT JOIN chk_componentes c ON c.id = i.componente_id
          WHERE $whereSql ORDER BY i.fecha DESC, i.id DESC LIMIT 1000", $params);

    $periodos = array_column(db()->fetchAll("SELECT DISTINCT periodo FROM chk_inspecciones ORDER BY periodo DESC"), 'periodo');
    jsonResponse(true, '', ['items' => $rows, 'periodos' => $periodos]);
}

function obtener() {
    $id = (int)($_GET['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    $insp = db()->fetchOne("SELECT * FROM chk_inspecciones WHERE id = ?", [$id]);
    if (!$insp) jsonResponse(false, 'No encontrada.', null, 404);
    $insp['resultados'] = db()->fetchAll(
        "SELECT item_id, componente_id, resultado, observacion, vencimiento FROM chk_resultados WHERE inspeccion_id = ?", [$id]);
    $insp['fotos'] = db()->fetchAll("SELECT id, archivo FROM chk_fotos WHERE inspeccion_id = ? ORDER BY id ASC", [$id]);
    jsonResponse(true, '', $insp);
}

// Sube una foto de evidencia a la inspección.
function fotoAdd() {
    $inspId = (int)($_POST['inspeccion_id'] ?? 0);
    if ($inspId <= 0) jsonResponse(false, 'Inspección inválida.', null, 422);
    if (!db()->fetchOne("SELECT id FROM chk_inspecciones WHERE id = ?", [$inspId])) jsonResponse(false, 'Inspección no encontrada.', null, 404);
    if (empty($_FILES['archivo']) || ($_FILES['archivo']['error'] ?? 1) !== UPLOAD_ERR_OK) {
        jsonResponse(false, ($_FILES['archivo']['error'] ?? 0) === UPLOAD_ERR_INI_SIZE ? 'La imagen es muy grande.' : 'No se recibió la imagen.', null, 422);
    }
    $f = $_FILES['archivo'];
    if ($f['size'] > 20 * 1024 * 1024) jsonResponse(false, 'La imagen es muy grande (máx 20 MB).', null, 422);
    $ext = strtolower(pathinfo($f['name'] ?? '', PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true) || @getimagesize($f['tmp_name']) === false) {
        jsonResponse(false, 'Solo imágenes JPG/PNG/WEBP.', null, 422);
    }
    $dir = __DIR__ . '/../uploads/checklist/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $name = 'chk_' . bin2hex(random_bytes(6)) . '.' . ($ext === 'jpeg' ? 'jpg' : $ext);
    if (!move_uploaded_file($f['tmp_name'], $dir . $name)) jsonResponse(false, 'No se pudo guardar la imagen.', null, 500);
    @chmod($dir . $name, 0644);
    db()->query("INSERT INTO chk_fotos (inspeccion_id, archivo) VALUES (?, ?)", [$inspId, 'checklist/' . $name]);
    jsonResponse(true, 'Foto agregada.', ['id' => db()->lastInsertId(), 'archivo' => 'checklist/' . $name]);
}

function fotoDel() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    $r = db()->fetchOne("SELECT archivo FROM chk_fotos WHERE id = ?", [$id]);
    if (!$r) jsonResponse(false, 'No encontrada.', null, 404);
    if (!empty($r['archivo']) && is_file(__DIR__ . '/../uploads/' . $r['archivo'])) @unlink(__DIR__ . '/../uploads/' . $r['archivo']);
    db()->query("DELETE FROM chk_fotos WHERE id = ?", [$id]);
    jsonResponse(true, 'Foto eliminada.');
}

function guardar() {
    $id      = (int)($_POST['id'] ?? 0);
    $compId  = (int)($_POST['componente_id'] ?? 0);
    $unidadId = ((int)($_POST['unidad_id'] ?? 0)) ?: null;
    $placa   = strtoupper(trim($_POST['placa'] ?? ''));
    $area    = trim($_POST['area'] ?? '');
    $periodo = trim($_POST['periodo'] ?? '');
    $fecha   = trim($_POST['fecha'] ?? date('Y-m-d'));
    $venc    = trim($_POST['vencimiento'] ?? '');
    $estado  = trim($_POST['estado'] ?? 'apto');
    $obs     = trim($_POST['observacion'] ?? '');
    $firma   = trim($_POST['firma'] ?? '');
    $items   = json_decode($_POST['resultados'] ?? '[]', true);

    if ($compId <= 0) jsonResponse(false, 'Selecciona el equipo a inspeccionar.', null, 422);
    if ($placa === '') jsonResponse(false, 'La placa (unidad) es obligatoria.', null, 422);
    if (!preg_match('/^\d{4}-\d{2}$/', $periodo)) jsonResponse(false, 'Periodo inválido (YYYY-MM).', null, 422);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) $fecha = date('Y-m-d');
    // Vencimiento del equipo (extintor/botiquín): opcional; null si no viene o es inválido.
    $vencVal = preg_match('/^\d{4}-\d{2}-\d{2}$/', $venc) ? $venc : null;
    if (!in_array($estado, CHK_ESTADOS, true)) $estado = 'apto';
    if (!is_array($items) || !count($items)) jsonResponse(false, 'No hay ítems evaluados.', null, 422);

    $firmaVal = (strpos($firma, 'data:image/') === 0) ? $firma : null;
    $user = getCurrentUser();

    try {
        db()->beginTransaction();
        if ($id > 0) {
            db()->query(
                "UPDATE chk_inspecciones SET componente_id=?, unidad_id=?, placa=?, area=?, periodo=?, fecha=?, vencimiento=?, estado=?, observacion=?"
                . ($firmaVal ? ", firma=?" : "") . " WHERE id=?",
                $firmaVal ? [$compId, $unidadId, $placa, $area ?: null, $periodo, $fecha, $vencVal, $estado, $obs ?: null, $firmaVal, $id]
                          : [$compId, $unidadId, $placa, $area ?: null, $periodo, $fecha, $vencVal, $estado, $obs ?: null, $id]);
            db()->query("DELETE FROM chk_resultados WHERE inspeccion_id = ?", [$id]);
            $inspId = $id;
        } else {
            db()->query(
                "INSERT INTO chk_inspecciones (componente_id, unidad_id, placa, area, periodo, fecha, vencimiento, inspector_id, inspector_nombre, estado, observacion, firma)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [$compId, $unidadId, $placa, $area ?: null, $periodo, $fecha, $vencVal, $user['id'], $user['nombre'] ?? null, $estado, $obs ?: null, $firmaVal]);
            $inspId = (int)db()->lastInsertId();
        }
        foreach ($items as $it) {
            $itemId = (int)($it['item_id'] ?? 0);
            $compId = (int)($it['componente_id'] ?? 0);
            $res    = trim($it['resultado'] ?? 'conforme');
            if ($itemId <= 0 || !in_array($res, CHK_RESULTADOS, true)) continue;
            // Vencimiento por ítem (botiquín): opcional; null si vacío o inválido.
            $itVenc = trim($it['vencimiento'] ?? '');
            $itVencVal = preg_match('/^\d{4}-\d{2}-\d{2}$/', $itVenc) ? $itVenc : null;
            db()->query(
                "INSERT INTO chk_resultados (inspeccion_id, item_id, componente_id, resultado, observacion, vencimiento) VALUES (?, ?, ?, ?, ?, ?)",
                [$inspId, $itemId, $compId, $res, trim($it['observacion'] ?? '') ?: null, $itVencVal]);
        }
        db()->commit();
    } catch (Throwable $e) {
        db()->rollback();
        error_log('[checklist:guardar] ' . $e->getMessage());
        jsonResponse(false, 'Error al guardar la inspección.', null, 500);
    }
    jsonResponse(true, 'Inspección guardada.', ['id' => $inspId]);
}

function eliminar() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    db()->query("DELETE FROM chk_resultados WHERE inspeccion_id = ?", [$id]);
    db()->query("DELETE FROM chk_inspecciones WHERE id = ?", [$id]);
    jsonResponse(true, 'Inspección eliminada.');
}

// Flota (filas): placas desde la BD de vigilancia, con degradación segura a las
// placas ya inspeccionadas si el catálogo de vehículos no está disponible.
// Devuelve ['placas' => [...], 'tipos' => [...]].
function _chkFlota(string $tipo = '', bool $soloActivos = false): array {
    $placas = []; $tipos = [];
    $vig = dbVigilancia();
    if ($vig) {
        try {
            $sql = "SELECT placa, tipo, marca, modelo, estado FROM vehiculos WHERE placa <> ''";
            $params = [];
            if ($tipo !== '') { $sql .= " AND tipo = ?"; $params[] = $tipo; }
            if ($soloActivos) { $sql .= " AND (estado IS NULL OR LOWER(estado) NOT LIKE 'inactiv%')"; }
            $sql .= " ORDER BY placa ASC LIMIT 500";
            $st = $vig->prepare($sql); $st->execute($params);
            $placas = $st->fetchAll();
            $st2 = $vig->query("SELECT DISTINCT tipo FROM vehiculos WHERE tipo IS NOT NULL AND tipo <> '' ORDER BY tipo");
            $tipos = array_column($st2->fetchAll(), 'tipo');
        } catch (Throwable $e) { error_log('[checklist:_chkFlota] ' . $e->getMessage()); }
    }
    if (!$placas) {
        foreach (db()->fetchAll("SELECT DISTINCT placa FROM chk_inspecciones WHERE placa <> '' ORDER BY placa ASC") as $r) {
            $placas[] = ['placa' => $r['placa'], 'tipo' => '', 'marca' => '', 'modelo' => ''];
        }
    }
    return ['placas' => $placas, 'tipos' => $tipos];
}

// Mapa placa (mayúsculas) => [componente_id => estado] para un periodo.
function _chkMapaMes(string $periodo): array {
    $mapa = [];
    foreach (db()->fetchAll("SELECT placa, componente_id, estado FROM chk_inspecciones WHERE periodo = ?", [$periodo]) as $x) {
        $mapa[strtoupper($x['placa'])][(int)$x['componente_id']] = $x['estado'];
    }
    return $mapa;
}

// Matriz de cumplimiento: filas = placas de unidades, columnas = equipos.
// Marca qué equipos ya se inspeccionaron en el mes por cada unidad y cuáles faltan.
function cumplimiento() {
    $periodo = trim($_GET['periodo'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}$/', $periodo)) $periodo = date('Y-m');
    $tipo = trim($_GET['tipo'] ?? '');

    $componentes = db()->fetchAll(
        "SELECT id, nombre FROM chk_componentes WHERE activo = 1 ORDER BY orden ASC, id ASC");
    $flota = _chkFlota($tipo, true);   // excluye unidades inactivas
    $mapa  = _chkMapaMes($periodo);

    $periodos = array_column(db()->fetchAll("SELECT DISTINCT periodo FROM chk_inspecciones ORDER BY periodo DESC"), 'periodo');
    jsonResponse(true, '', [
        'periodo'      => $periodo,
        'tipo'         => $tipo,
        'tipos'        => $flota['tipos'],
        'componentes'  => $componentes,
        'placas'       => $flota['placas'],
        'inspecciones' => $mapa,
        'periodos'     => $periodos,
    ]);
}

// Dashboard de inspección de equipos: KPIs, tendencia, estado de flota,
// cumplimiento por equipo, top de no conformidades y listas accionables.
function dashboard() {
    $periodo = trim($_GET['periodo'] ?? '');
    if (!preg_match('/^\d{4}-\d{2}$/', $periodo)) $periodo = date('Y-m');
    $tipo = trim($_GET['tipo'] ?? '');
    $comp = (int)($_GET['componente_id'] ?? 0);
    $prev = date('Y-m', strtotime($periodo . '-01 -1 month'));

    // Catálogo de equipos (para columnas / filtro).
    $componentes = db()->fetchAll(
        "SELECT id, nombre FROM chk_componentes WHERE activo = 1 ORDER BY orden ASC, id ASC");
    $compActivos = $comp > 0 ? array_values(array_filter($componentes, fn($c) => (int)$c['id'] === $comp)) : $componentes;
    $equiposTotal = count($compActivos);
    $compIds = array_map(fn($c) => (int)$c['id'], $compActivos);

    // Flota (denominador de cobertura). Excluye unidades inactivas.
    $flota   = _chkFlota($tipo, true);
    $placas  = $flota['placas'];
    $unidTotal = count($placas);
    $placasUp  = array_map(fn($p) => strtoupper($p['placa']), $placas);
    $placasSet = array_flip($placasUp);

    // Filtro de equipo para las consultas basadas en inspecciones.
    $compSql = $comp > 0 ? ' AND i.componente_id = ?' : '';

    // ── KPIs por unidad a partir del mapa del mes ──
    $mapa = _chkMapaMes($periodo);
    $celdasHechas = 0; $aptas = 0; $noAptas = 0; $sinInsp = [];
    foreach ($placas as $p) {
        $m = $mapa[strtoupper($p['placa'])] ?? [];
        $hechos = 0; $tieneNoApto = false; $todoApto = true;
        foreach ($compIds as $cid) {
            if (isset($m[$cid])) {
                $hechos++;
                if ($m[$cid] === 'no_apto') $tieneNoApto = true;
                if ($m[$cid] !== 'apto')    $todoApto = false;
            } else { $todoApto = false; }
        }
        $celdasHechas += $hechos;
        if ($tieneNoApto) $noAptas++;
        if ($hechos === 0) $sinInsp[] = $p['placa'];
        elseif ($equiposTotal && $hechos === $equiposTotal && $todoApto) $aptas++;
    }
    $celdasTotal = $unidTotal * $equiposTotal;
    $cobertura   = $celdasTotal ? round($celdasHechas / $celdasTotal * 100) : 0;

    // No conformidades del mes.
    $ncMes = (int)(db()->fetchOne(
        "SELECT COUNT(*) n FROM chk_resultados r JOIN chk_inspecciones i ON i.id = r.inspeccion_id
          WHERE i.periodo = ? AND r.resultado = 'no_conforme'" . $compSql,
        $comp > 0 ? [$periodo, $comp] : [$periodo])['n'] ?? 0);

    // ── KPIs mes anterior (para deltas) ──
    $mapaAnt = _chkMapaMes($prev);
    $celdasAnt = 0; $noAptasAnt = 0;
    foreach ($placas as $p) {
        $m = $mapaAnt[strtoupper($p['placa'])] ?? [];
        $na = false;
        foreach ($compIds as $cid) { if (isset($m[$cid])) { $celdasAnt++; if ($m[$cid] === 'no_apto') $na = true; } }
        if ($na) $noAptasAnt++;
    }
    $coberturaAnt = $celdasTotal ? round($celdasAnt / $celdasTotal * 100) : 0;
    $ncAnt = (int)(db()->fetchOne(
        "SELECT COUNT(*) n FROM chk_resultados r JOIN chk_inspecciones i ON i.id = r.inspeccion_id
          WHERE i.periodo = ? AND r.resultado = 'no_conforme'" . $compSql,
        $comp > 0 ? [$prev, $comp] : [$prev])['n'] ?? 0);

    // ── Estado de la flota (dona): inspecciones del mes por estado ──
    $estRows = db()->fetchAll(
        "SELECT i.estado, COUNT(*) n FROM chk_inspecciones i WHERE i.periodo = ?" . $compSql . " GROUP BY i.estado",
        $comp > 0 ? [$periodo, $comp] : [$periodo]);
    $estado = ['apto' => 0, 'observado' => 0, 'no_apto' => 0];
    foreach ($estRows as $r) { $estado[$r['estado']] = (int)$r['n']; }

    // ── Cumplimiento por equipo (barras) ──
    $porEqRaw = [];
    foreach (db()->fetchAll(
        "SELECT i.componente_id, COUNT(DISTINCT i.placa) hechas,
                SUM(i.estado = 'no_apto') no_apto
           FROM chk_inspecciones i WHERE i.periodo = ? GROUP BY i.componente_id", [$periodo]) as $r) {
        $porEqRaw[(int)$r['componente_id']] = $r;
    }
    $porEquipo = [];
    foreach ($compActivos as $c) {
        $r = $porEqRaw[(int)$c['id']] ?? null;
        $hechas = $r ? (int)$r['hechas'] : 0;
        $porEquipo[] = [
            'nombre'  => $c['nombre'],
            'hechas'  => $hechas,
            'total'   => $unidTotal,
            'pct'     => $unidTotal ? round($hechas / $unidTotal * 100) : 0,
            'no_apto' => $r ? (int)$r['no_apto'] : 0,
        ];
    }

    // ── Top no conformidades (ítems con más "no conforme") ──
    $topNc = db()->fetchAll(
        "SELECT it.texto AS item, c.nombre AS equipo, COUNT(*) n
           FROM chk_resultados r
           JOIN chk_inspecciones i ON i.id = r.inspeccion_id AND i.periodo = ?
           LEFT JOIN chk_items it ON it.id = r.item_id
           LEFT JOIN chk_componentes c ON c.id = r.componente_id
          WHERE r.resultado = 'no_conforme'" . $compSql . "
          GROUP BY r.item_id, it.texto, c.nombre ORDER BY n DESC LIMIT 10",
        $comp > 0 ? [$periodo, $comp] : [$periodo]);

    // ── Tendencia de cobertura (últimos 6 meses) ──
    $labels = [];
    for ($i = 5; $i >= 0; $i--) $labels[] = date('Y-m', strtotime($periodo . '-01 -' . $i . ' month'));
    $desde = $labels[0];
    $tendRaw = [];
    foreach (db()->fetchAll(
        "SELECT periodo, COUNT(DISTINCT CONCAT(placa,'|',componente_id)) celdas, COUNT(*) inspecciones
           FROM chk_inspecciones WHERE periodo >= ?" . ($comp > 0 ? ' AND componente_id = ?' : '') . "
          GROUP BY periodo",
        $comp > 0 ? [$desde, $comp] : [$desde]) as $r) {
        $tendRaw[$r['periodo']] = $r;
    }
    $tendencia = array_map(function ($p) use ($tendRaw, $celdasTotal) {
        $celdas = isset($tendRaw[$p]) ? (int)$tendRaw[$p]['celdas'] : 0;
        return [
            'periodo'      => $p,
            'cobertura'    => $celdasTotal ? round($celdas / $celdasTotal * 100) : 0,
            'inspecciones' => isset($tendRaw[$p]) ? (int)$tendRaw[$p]['inspecciones'] : 0,
        ];
    }, $labels);

    // ── Listas accionables ──
    $noAptasList = db()->fetchAll(
        "SELECT i.id, i.placa, c.nombre AS equipo, i.fecha, i.inspector_nombre
           FROM chk_inspecciones i LEFT JOIN chk_componentes c ON c.id = i.componente_id
          WHERE i.periodo = ? AND i.estado = 'no_apto'" . $compSql . "
          ORDER BY i.fecha DESC LIMIT 50",
        $comp > 0 ? [$periodo, $comp] : [$periodo]);

    $ncList = db()->fetchAll(
        "SELECT i.id, i.placa, c.nombre AS equipo, it.texto AS item, r.observacion AS obs
           FROM chk_resultados r
           JOIN chk_inspecciones i ON i.id = r.inspeccion_id AND i.periodo = ?
           LEFT JOIN chk_items it ON it.id = r.item_id
           LEFT JOIN chk_componentes c ON c.id = r.componente_id
          WHERE r.resultado = 'no_conforme'" . $compSql . "
          ORDER BY i.fecha DESC LIMIT 50",
        $comp > 0 ? [$periodo, $comp] : [$periodo]);

    $periodos = array_column(db()->fetchAll("SELECT DISTINCT periodo FROM chk_inspecciones ORDER BY periodo DESC"), 'periodo');

    jsonResponse(true, '', [
        'periodo' => $periodo,
        'tipo'    => $tipo,
        'tipos'   => $flota['tipos'],
        'componentes'  => $componentes,
        'componente_id' => $comp,
        'kpis' => [
            'unidades'         => $unidTotal,
            'equipos'          => $equiposTotal,
            'celdas_total'     => $celdasTotal,
            'inspecciones'     => $celdasHechas,
            'cobertura'        => $cobertura,
            'aptas'            => $aptas,
            'no_aptas'         => $noAptas,
            'no_conformidades' => $ncMes,
            'sin_inspeccion'   => count($sinInsp),
        ],
        'kpisAnt' => [
            'cobertura'        => $coberturaAnt,
            'no_aptas'         => $noAptasAnt,
            'no_conformidades' => $ncAnt,
        ],
        'estado'        => $estado,
        'por_equipo'    => $porEquipo,
        'top_nc'        => $topNc,
        'tendencia'     => $tendencia,
        'no_aptas_list' => $noAptasList,
        'nc_list'       => $ncList,
        'sin_inspeccion'=> $sinInsp,
        'periodos'      => $periodos,
    ]);
}

// Áreas para el formulario: del empleador (centro de trabajo, epp_config.ct_area)
// + las ya usadas en inventario e inspecciones. 'default' = área del empleador.
function areas() {
    $set = [];
    $default = '';
    try {
        $row = db()->fetchOne("SELECT valor FROM epp_config WHERE clave = 'ct_area'");
        $val = trim($row['valor'] ?? '');
        if ($val !== '') {
            $default = $val;
            foreach (preg_split('/[,;\n]+/', $val) as $a) { $a = trim($a); if ($a !== '') $set[$a] = 1; }
        }
    } catch (Throwable $e) { /* EPP no configurado: se omite */ }
    foreach (db()->fetchAll("SELECT DISTINCT area FROM chk_unidades WHERE area IS NOT NULL AND area <> ''") as $r) $set[$r['area']] = 1;
    foreach (db()->fetchAll("SELECT DISTINCT area FROM chk_inspecciones WHERE area IS NOT NULL AND area <> ''") as $r) $set[$r['area']] = 1;
    $areas = array_keys($set);
    sort($areas, SORT_NATURAL | SORT_FLAG_CASE);
    jsonResponse(true, '', ['areas' => $areas, 'default' => $default]);
}

// ============================================================
// Inventario de equipos físicos (unidades individuales por tipo)
// ============================================================
// Alerta de vencimientos: unidades de inventario (extintores) cuya fecha de
// vencimiento ya pasó (vencido) o está próxima (por vencer, ≤ N días).
function vencimientos() {
    $dias = (int)($_GET['dias'] ?? 90);
    if ($dias < 1 || $dias > 365) $dias = 90;
    $rows = db()->fetchAll(
        "SELECT u.id, u.componente_id, c.nombre AS tipo, u.codigo, u.nombre, u.placa, u.ruta,
                u.vencimiento, DATEDIFF(u.vencimiento, CURDATE()) AS dias
           FROM chk_unidades u
           LEFT JOIN chk_componentes c ON c.id = u.componente_id
          WHERE u.activo = 1 AND u.vencimiento IS NOT NULL
            AND DATEDIFF(u.vencimiento, CURDATE()) <= ?
          ORDER BY u.vencimiento ASC", [$dias]);
    $vencidos = []; $porVencer = [];
    foreach ($rows as $r) {
        if ((int)$r['dias'] < 0) $vencidos[] = $r; else $porVencer[] = $r;
    }
    jsonResponse(true, '', ['vencidos' => $vencidos, 'por_vencer' => $porVencer, 'dias' => $dias]);
}

// Alerta de vencimientos de BOTIQUÍN: los insumos vencen POR PRODUCTO, guardados
// por unidad en chk_unidad_items (editable en el modal del botiquín). Lista los
// insumos vencidos o próximos a caducar (≤ N días).
function vencimientosBotiquin() {
    $dias = (int)($_GET['dias'] ?? 90);
    if ($dias < 1 || $dias > 365) $dias = 90;
    $comps = array_map('intval', array_column(
        db()->fetchAll("SELECT id FROM chk_componentes WHERE nombre LIKE '%otiqu%'"), 'id'));
    if (!$comps) { jsonResponse(true, '', ['vencidos' => [], 'por_vencer' => [], 'dias' => $dias]); }
    $in = implode(',', $comps);

    $rows = db()->fetchAll(
        "SELECT u.id, u.codigo, u.nombre, u.placa, it.texto AS item,
                cui.vencimiento, DATEDIFF(cui.vencimiento, CURDATE()) AS dias
           FROM chk_unidad_items cui
           JOIN chk_unidades u ON u.id = cui.unidad_id AND u.activo = 1
           JOIN chk_items it ON it.id = cui.item_id
          WHERE u.componente_id IN ($in) AND cui.vencimiento IS NOT NULL
            AND DATEDIFF(cui.vencimiento, CURDATE()) <= ?
          ORDER BY cui.vencimiento ASC", [$dias]);

    $vencidos = []; $porVencer = [];
    foreach ($rows as $r) {
        if ((int)$r['dias'] < 0) $vencidos[] = $r; else $porVencer[] = $r;
    }
    jsonResponse(true, '', ['vencidos' => $vencidos, 'por_vencer' => $porVencer, 'dias' => $dias]);
}

// Ítems de contenido de una unidad (botiquín): preguntas activas del componente
// + la fecha de vencimiento guardada por insumo para ESTA unidad.
function uniItems() {
    $uniId = (int)($_GET['id'] ?? 0);
    $comp  = (int)($_GET['componente_id'] ?? 0);
    if ($comp <= 0 && $uniId > 0) {
        $u = db()->fetchOne("SELECT componente_id FROM chk_unidades WHERE id = ?", [$uniId]);
        $comp = (int)($u['componente_id'] ?? 0);
    }
    if ($comp <= 0) { jsonResponse(true, '', ['items' => []]); }
    $saved = [];
    if ($uniId > 0) {
        foreach (db()->fetchAll("SELECT item_id, vencimiento FROM chk_unidad_items WHERE unidad_id = ?", [$uniId]) as $r) {
            $saved[(int)$r['item_id']] = $r['vencimiento'];
        }
    }
    $items = db()->fetchAll("SELECT id, texto FROM chk_items WHERE componente_id = ? AND activo = 1 ORDER BY orden ASC, id ASC", [$comp]);
    foreach ($items as &$it) { $it['vencimiento'] = $saved[(int)$it['id']] ?? null; }
    unset($it);
    jsonResponse(true, '', ['items' => $items]);
}

function uniList() {
    $comp = (int)($_GET['componente_id'] ?? 0);
    $where = $comp > 0 ? 'WHERE u.componente_id = ?' : '';
    $params = $comp > 0 ? [$comp] : [];
    $rows = db()->fetchAll(
        "SELECT u.id, u.componente_id, u.codigo, u.nombre, u.placa, u.ruta, u.ubicacion, u.area,
                u.tipo_agente, u.capacidad, u.vencimiento, u.ultimo_mantenimiento, u.estado_operativo, u.activo,
                DATEDIFF(u.vencimiento, CURDATE()) AS dias_vencer,
                (SELECT COUNT(*) FROM chk_inspecciones i WHERE i.unidad_id = u.id) AS n_inspecciones
           FROM chk_unidades u $where ORDER BY u.codigo ASC", $params);
    jsonResponse(true, '', ['unidades' => $rows]);
}

function uniSave() {
    $id     = (int)($_POST['id'] ?? 0);
    $comp   = (int)($_POST['componente_id'] ?? 0);
    $codigo = strtoupper(trim($_POST['codigo'] ?? ''));
    $nombre = trim($_POST['nombre'] ?? '');
    $placa  = strtoupper(trim($_POST['placa'] ?? ''));
    $ruta   = trim($_POST['ruta'] ?? '');
    $tipoAg = trim($_POST['tipo_agente'] ?? '');
    $capac  = trim($_POST['capacidad'] ?? '');
    $ubic   = trim($_POST['ubicacion'] ?? '');
    $area   = trim($_POST['area'] ?? '');
    $venc   = trim($_POST['vencimiento'] ?? '');
    $ultMto = trim($_POST['ultimo_mantenimiento'] ?? '');
    $estOp  = trim($_POST['estado_operativo'] ?? 'operativo');
    if ($comp <= 0)      jsonResponse(false, 'Tipo de equipo inválido.', null, 422);
    if ($codigo === '')  jsonResponse(false, 'El código es obligatorio.', null, 422);
    if ($nombre === '')  jsonResponse(false, 'El nombre es obligatorio.', null, 422);
    $vencVal   = preg_match('/^\d{4}-\d{2}-\d{2}$/', $venc) ? $venc : null;
    $ultMtoVal = preg_match('/^\d{4}-\d{2}-\d{2}$/', $ultMto) ? $ultMto : null;
    $estOp     = in_array($estOp, ['operativo', 'fuera_servicio'], true) ? $estOp : 'operativo';
    if (db()->fetchOne("SELECT id FROM chk_unidades WHERE codigo = ? AND id <> ?", [$codigo, $id])) {
        jsonResponse(false, 'Ya existe una unidad con ese código.', null, 422);
    }
    // Asignación 1:1 — una misma placa (camión) no puede estar en dos equipos del mismo tipo.
    if ($placa !== '' && db()->fetchOne("SELECT id FROM chk_unidades WHERE placa = ? AND componente_id = ? AND id <> ?", [$placa, $comp, $id])) {
        jsonResponse(false, 'Ese camión (placa) ya está asignado a otro equipo de este tipo.', null, 422);
    }
    if ($id > 0) {
        db()->query("UPDATE chk_unidades SET componente_id=?, codigo=?, nombre=?, placa=?, ruta=?, tipo_agente=?, capacidad=?, ubicacion=?, area=?, vencimiento=?, ultimo_mantenimiento=?, estado_operativo=? WHERE id=?",
            [$comp, $codigo, $nombre, $placa ?: null, $ruta ?: null, $tipoAg ?: null, $capac ?: null, $ubic ?: null, $area ?: null, $vencVal, $ultMtoVal, $estOp, $id]);
    } else {
        db()->query("INSERT INTO chk_unidades (componente_id, codigo, nombre, placa, ruta, tipo_agente, capacidad, ubicacion, area, vencimiento, ultimo_mantenimiento, estado_operativo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [$comp, $codigo, $nombre, $placa ?: null, $ruta ?: null, $tipoAg ?: null, $capac ?: null, $ubic ?: null, $area ?: null, $vencVal, $ultMtoVal, $estOp]);
        $id = (int)db()->lastInsertId();
    }
    // Vencimiento por insumo (botiquín): upsert en chk_unidad_items.
    $itemsVenc = json_decode($_POST['items_venc'] ?? '[]', true);
    if (is_array($itemsVenc)) {
        foreach ($itemsVenc as $iv) {
            $itemId = (int)($iv['item_id'] ?? 0);
            if ($itemId <= 0) continue;
            $v  = trim($iv['vencimiento'] ?? '');
            $vv = preg_match('/^\d{4}-\d{2}-\d{2}$/', $v) ? $v : null;
            db()->query(
                "INSERT INTO chk_unidad_items (unidad_id, item_id, vencimiento) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE vencimiento = VALUES(vencimiento)",
                [$id, $itemId, $vv]);
        }
    }
    jsonResponse(true, 'Unidad guardada.', ['id' => $id]);
}

function uniToggle() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    db()->query("UPDATE chk_unidades SET activo = 1 - activo WHERE id = ?", [$id]);
    jsonResponse(true, 'Estado actualizado.');
}

function uniDel() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    db()->query("UPDATE chk_inspecciones SET unidad_id = NULL WHERE unidad_id = ?", [$id]);  // conserva el historial
    db()->query("DELETE FROM chk_unidad_items WHERE unidad_id = ?", [$id]);                  // vencimientos por insumo
    db()->query("DELETE FROM chk_unidades WHERE id = ?", [$id]);
    jsonResponse(true, 'Unidad eliminada.');
}

// Dashboard por tipo de equipo: KPIs, cumplimiento por área, evolución mensual,
// matriz de verificación (ítems × meses) y estado por unidad (× meses).
function equipoDash() {
    $comp = (int)($_GET['componente_id'] ?? 0);
    if ($comp <= 0) jsonResponse(false, 'Tipo de equipo inválido.', null, 422);
    $anio = (int)($_GET['anio'] ?? date('Y'));
    if ($anio < 2000 || $anio > 2100) $anio = (int)date('Y');
    $like = $anio . '-%';

    $comprow = db()->fetchOne("SELECT id, nombre FROM chk_componentes WHERE id = ?", [$comp]);
    if (!$comprow) jsonResponse(false, 'Tipo de equipo no encontrado.', null, 404);

    $pct = fn($c, $nc) => ($c + $nc) > 0 ? (int)round($c / ($c + $nc) * 100) : null;

    // Inventario del tipo (metadata: nombre, camión, ruta, capacidad, vencimiento…).
    $inv = db()->fetchAll(
        "SELECT id, codigo, nombre, placa, ruta, tipo_agente, capacidad, ubicacion, area, vencimiento, estado_operativo
           FROM chk_unidades
          WHERE componente_id = ? AND activo = 1 ORDER BY codigo ASC", [$comp]);
    $invByCode = [];
    foreach ($inv as $u) { $invByCode[strtoupper($u['codigo'])] = $u; }

    // Ítems (preguntas) activos del tipo.
    $items = db()->fetchAll(
        "SELECT id, texto FROM chk_items WHERE componente_id = ? AND activo = 1 ORDER BY orden ASC, id ASC", [$comp]);

    // Base: TODAS las inspecciones del tipo en el año. La "unidad" es la placa/código
    // (al inspeccionar por inventario, placa = código; por camión, placa = placa).
    $baseFrom = "FROM chk_resultados r JOIN chk_inspecciones i ON i.id = r.inspeccion_id
                 WHERE i.componente_id = ? AND i.periodo LIKE ?";
    $bp = [$comp, $like];

    // Evolución mensual (todos los ítems).
    $evoRaw = [];
    foreach (db()->fetchAll("SELECT SUBSTRING(i.periodo,6,2) mes,
            SUM(r.resultado='conforme') c, SUM(r.resultado='no_conforme') nc $baseFrom GROUP BY mes", $bp) as $r) {
        $evoRaw[(int)$r['mes']] = ['c' => (int)$r['c'], 'nc' => (int)$r['nc']];
    }
    $evolucion = [];
    for ($m = 1; $m <= 12; $m++) {
        $e = $evoRaw[$m] ?? ['c' => 0, 'nc' => 0];
        $evolucion[] = ['mes' => $m, 'pct' => $pct($e['c'], $e['nc'])];
    }

    // Matriz ítem × mes.
    $matRaw = [];
    foreach (db()->fetchAll("SELECT r.item_id, SUBSTRING(i.periodo,6,2) mes,
            SUM(r.resultado='conforme') c, SUM(r.resultado='no_conforme') nc $baseFrom GROUP BY r.item_id, mes", $bp) as $r) {
        $matRaw[(int)$r['item_id']][(int)$r['mes']] = ['c' => (int)$r['c'], 'nc' => (int)$r['nc']];
    }
    $itemsOut = array_map(function ($it) use ($matRaw, $pct) {
        $meses = []; $cT = 0; $ncT = 0;
        for ($m = 1; $m <= 12; $m++) {
            $x = $matRaw[(int)$it['id']][$m] ?? ['c' => 0, 'nc' => 0];
            $cT += $x['c']; $ncT += $x['nc'];
            $meses[] = $pct($x['c'], $x['nc']);
        }
        return ['id' => (int)$it['id'], 'texto' => $it['texto'], 'meses' => $meses, 'prom' => $pct($cT, $ncT)];
    }, $items);

    // Resultados por unidad (placa/código) × mes.
    $uniRaw = [];
    foreach (db()->fetchAll("SELECT UPPER(i.placa) placa, SUBSTRING(i.periodo,6,2) mes,
            SUM(r.resultado='conforme') c, SUM(r.resultado='no_conforme') nc $baseFrom GROUP BY UPPER(i.placa), mes", $bp) as $r) {
        $uniRaw[$r['placa']][(int)$r['mes']] = ['c' => (int)$r['c'], 'nc' => (int)$r['nc']];
    }

    // Área por placa (desde la inspección) para las unidades sin inventario.
    $placaArea = [];
    foreach (db()->fetchAll("SELECT UPPER(placa) placa, area FROM chk_inspecciones
            WHERE componente_id = ? AND periodo LIKE ? AND area IS NOT NULL AND area <> ''
            ORDER BY fecha ASC", $bp) as $r) {
        $placaArea[$r['placa']] = $r['area'];
    }

    // Universo de unidades = inventario ∪ placas inspeccionadas (sin duplicar).
    // Cada unidad se identifica por su código Y su placa (camión): una inspección
    // pudo registrarse con cualquiera de las dos, y ambas deben caer en la misma fila.
    $invKeys = [];
    $universe = [];
    foreach ($inv as $u) {
        $keys = [strtoupper($u['codigo'])];
        if (!empty($u['placa'])) $keys[] = strtoupper($u['placa']);
        foreach ($keys as $k) $invKeys[$k] = true;
        $universe[] = ['id' => (int)$u['id'], 'codigo' => $u['codigo'], 'nombre' => $u['nombre'],
                       'placa' => $u['placa'], 'ruta' => $u['ruta'], 'capacidad' => $u['capacidad'],
                       'tipo_agente' => $u['tipo_agente'], 'estado_operativo' => $u['estado_operativo'],
                       'ubicacion' => $u['ubicacion'], 'area' => $u['area'], 'vencimiento' => $u['vencimiento'],
                       'keys' => $keys];
    }
    // Solo se listan como "sin inventario" las placas que no cruzan con ninguna unidad.
    foreach (array_keys($uniRaw) as $pk) {
        if (!isset($invKeys[$pk])) {
            $universe[] = ['id' => 0, 'codigo' => $pk, 'nombre' => '', 'placa' => null, 'ruta' => null,
                           'capacidad' => null, 'tipo_agente' => null, 'estado_operativo' => null, 'ubicacion' => null,
                           'area' => $placaArea[$pk] ?? null, 'vencimiento' => null, 'keys' => [$pk]];
        }
    }

    $hoy = new DateTime('today');
    $unidadesOut = array_map(function ($u) use ($uniRaw, $pct, $hoy) {
        $meses = []; $cT = 0; $ncT = 0;
        for ($m = 1; $m <= 12; $m++) {
            $c = 0; $nc = 0;
            foreach ($u['keys'] as $k) { $x = $uniRaw[$k][$m] ?? null; if ($x) { $c += $x['c']; $nc += $x['nc']; } }
            $cT += $c; $ncT += $nc;
            $meses[] = $pct($c, $nc);
        }
        $estVenc = 'ok';
        if (!empty($u['vencimiento'])) {
            $v = DateTime::createFromFormat('Y-m-d', $u['vencimiento']);
            if ($v) { $dias = (int)$hoy->diff($v)->format('%r%a'); $estVenc = $dias < 0 ? 'vencido' : ($dias <= 90 ? 'por_vencer' : 'ok'); }
        }
        return ['id' => $u['id'], 'codigo' => $u['codigo'], 'nombre' => $u['nombre'],
                'placa' => $u['placa'] ?? null, 'ruta' => $u['ruta'] ?? null, 'capacidad' => $u['capacidad'] ?? null,
                'tipo_agente' => $u['tipo_agente'] ?? null, 'estado_operativo' => $u['estado_operativo'] ?? null,
                'area' => $u['area'], 'ubicacion' => $u['ubicacion'], 'vencimiento' => $u['vencimiento'],
                'est_venc' => $estVenc, 'meses' => $meses, 'prom' => $pct($cT, $ncT)];
    }, $universe);
    $totalUnid = count($universe);

    // Cumplimiento por área (año). Prioriza el área de la inspección, luego la del
    // inventario; si no hay, "Sin área".
    $porArea = [];
    foreach (db()->fetchAll("SELECT COALESCE(NULLIF(i.area,''), NULLIF(u.area,''), 'Sin área') area,
            SUM(r.resultado='conforme') c, SUM(r.resultado='no_conforme') nc
            FROM chk_resultados r JOIN chk_inspecciones i ON i.id = r.inspeccion_id
            LEFT JOIN chk_unidades u ON UPPER(u.codigo) = UPPER(i.placa) AND u.componente_id = i.componente_id
            WHERE i.componente_id = ? AND i.periodo LIKE ?
            GROUP BY COALESCE(NULLIF(i.area,''), NULLIF(u.area,''), 'Sin área') ORDER BY area ASC", $bp) as $r) {
        $porArea[] = ['area' => $r['area'], 'pct' => $pct((int)$r['c'], (int)$r['nc'])];
    }

    // KPIs.
    $tot = db()->fetchOne("SELECT SUM(r.resultado='conforme') c, SUM(r.resultado='no_conforme') nc $baseFrom", $bp);
    $cumpl = $pct((int)($tot['c'] ?? 0), (int)($tot['nc'] ?? 0));
    $nInsp = (int)(db()->fetchOne(
        "SELECT COUNT(*) n FROM chk_inspecciones WHERE componente_id = ? AND periodo LIKE ?", $bp)['n'] ?? 0);
    $vencidos = 0; $porVencer = 0; $areasSet = [];
    foreach ($inv as $u) {
        if (!empty($u['area'])) $areasSet[$u['area']] = 1;
        if (!empty($u['vencimiento'])) {
            $v = DateTime::createFromFormat('Y-m-d', $u['vencimiento']);
            if ($v) { $dias = (int)$hoy->diff($v)->format('%r%a'); if ($dias < 0) $vencidos++; elseif ($dias <= 90) $porVencer++; }
        }
    }

    $anios = array_column(db()->fetchAll(
        "SELECT DISTINCT LEFT(periodo,4) anio FROM chk_inspecciones WHERE componente_id = ? ORDER BY anio DESC", [$comp]), 'anio');

    jsonResponse(true, '', [
        'componente' => $comprow,
        'anio'       => $anio,
        'anios'      => $anios,
        'kpis'       => [
            'total_unidades' => $totalUnid,
            'inspecciones'   => $nInsp,
            'por_vencer'     => $porVencer,
            'vencidos'       => $vencidos,
            'cumplimiento'   => $cumpl,
            'areas'          => count($areasSet),
        ],
        'por_area'   => $porArea,
        'evolucion'  => $evolucion,
        'items'      => $itemsOut,
        'unidades'   => $unidadesOut,
    ]);
}

// ── Configuración: componentes e ítems ──
function compSave() {
    $id = (int)($_POST['id'] ?? 0);
    $nombre = trim($_POST['nombre'] ?? '');
    if ($nombre === '') jsonResponse(false, 'El nombre es obligatorio.', null, 422);
    if ($id > 0) {
        db()->query("UPDATE chk_componentes SET nombre = ? WHERE id = ?", [$nombre, $id]);
    } else {
        $orden = (int)(db()->fetchOne("SELECT COALESCE(MAX(orden),0)+1 o FROM chk_componentes")['o'] ?? 1);
        db()->query("INSERT INTO chk_componentes (nombre, orden) VALUES (?, ?)", [$nombre, $orden]);
        $id = (int)db()->lastInsertId();
    }
    jsonResponse(true, 'Componente guardado.', ['id' => $id]);
}
function compToggle() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    db()->query("UPDATE chk_componentes SET activo = 1 - activo WHERE id = ?", [$id]);
    jsonResponse(true, 'Estado actualizado.');
}
function itemSave() {
    $id = (int)($_POST['id'] ?? 0);
    $compId = (int)($_POST['componente_id'] ?? 0);
    $texto = trim($_POST['texto'] ?? '');
    if ($texto === '') jsonResponse(false, 'El texto del ítem es obligatorio.', null, 422);
    if ($id > 0) {
        db()->query("UPDATE chk_items SET texto = ? WHERE id = ?", [$texto, $id]);
    } else {
        if ($compId <= 0) jsonResponse(false, 'Componente inválido.', null, 422);
        $orden = (int)(db()->fetchOne("SELECT COALESCE(MAX(orden),0)+1 o FROM chk_items WHERE componente_id=?", [$compId])['o'] ?? 1);
        db()->query("INSERT INTO chk_items (componente_id, texto, orden) VALUES (?, ?, ?)", [$compId, $texto, $orden]);
        $id = (int)db()->lastInsertId();
    }
    jsonResponse(true, 'Ítem guardado.', ['id' => $id]);
}
function itemToggle() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    db()->query("UPDATE chk_items SET activo = 1 - activo WHERE id = ?", [$id]);
    jsonResponse(true, 'Estado actualizado.');
}
function itemDel() {
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    // Si el ítem ya tiene inspecciones registradas, no se borra (rompería el
    // historial): se pide desactivarlo en su lugar.
    $usos = (int)(db()->fetchOne("SELECT COUNT(*) n FROM chk_resultados WHERE item_id = ?", [$id])['n'] ?? 0);
    if ($usos > 0) {
        jsonResponse(false, 'Este ítem ya tiene inspecciones registradas. Desactívalo (toggle) en vez de eliminarlo para conservar el historial.', null, 409);
    }
    db()->query("DELETE FROM chk_items WHERE id = ?", [$id]);
    jsonResponse(true, 'Ítem eliminado.');
}
