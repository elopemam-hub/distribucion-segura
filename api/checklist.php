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

$mutaciones = ['save', 'delete', 'foto_add', 'foto_del', 'comp_save', 'comp_toggle', 'item_save', 'item_toggle', 'item_del'];
if (in_array($action, $mutaciones, true)) {
    requireCsrf();
    $user = getCurrentUser();
    if (!in_array($user['rol'], ['administrador', 'supervisor'])) {
        jsonResponse(false, 'No tienes permisos.', null, 403);
    }
    if ($action === 'delete' && $user['rol'] !== 'administrador') {
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
        "SELECT i.id, i.placa, i.componente_id, c.nombre AS equipo, i.periodo, i.fecha, i.inspector_nombre, i.estado, i.observacion,
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
        "SELECT item_id, componente_id, resultado, observacion FROM chk_resultados WHERE inspeccion_id = ?", [$id]);
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
    $placa   = strtoupper(trim($_POST['placa'] ?? ''));
    $periodo = trim($_POST['periodo'] ?? '');
    $fecha   = trim($_POST['fecha'] ?? date('Y-m-d'));
    $estado  = trim($_POST['estado'] ?? 'apto');
    $obs     = trim($_POST['observacion'] ?? '');
    $firma   = trim($_POST['firma'] ?? '');
    $items   = json_decode($_POST['resultados'] ?? '[]', true);

    if ($compId <= 0) jsonResponse(false, 'Selecciona el equipo a inspeccionar.', null, 422);
    if ($placa === '') jsonResponse(false, 'La placa (unidad) es obligatoria.', null, 422);
    if (!preg_match('/^\d{4}-\d{2}$/', $periodo)) jsonResponse(false, 'Periodo inválido (YYYY-MM).', null, 422);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) $fecha = date('Y-m-d');
    if (!in_array($estado, CHK_ESTADOS, true)) $estado = 'apto';
    if (!is_array($items) || !count($items)) jsonResponse(false, 'No hay ítems evaluados.', null, 422);

    $firmaVal = (strpos($firma, 'data:image/') === 0) ? $firma : null;
    $user = getCurrentUser();

    try {
        db()->beginTransaction();
        if ($id > 0) {
            db()->query(
                "UPDATE chk_inspecciones SET componente_id=?, placa=?, periodo=?, fecha=?, estado=?, observacion=?"
                . ($firmaVal ? ", firma=?" : "") . " WHERE id=?",
                $firmaVal ? [$compId, $placa, $periodo, $fecha, $estado, $obs ?: null, $firmaVal, $id]
                          : [$compId, $placa, $periodo, $fecha, $estado, $obs ?: null, $id]);
            db()->query("DELETE FROM chk_resultados WHERE inspeccion_id = ?", [$id]);
            $inspId = $id;
        } else {
            db()->query(
                "INSERT INTO chk_inspecciones (componente_id, placa, periodo, fecha, inspector_id, inspector_nombre, estado, observacion, firma)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [$compId, $placa, $periodo, $fecha, $user['id'], $user['nombre'] ?? null, $estado, $obs ?: null, $firmaVal]);
            $inspId = (int)db()->lastInsertId();
        }
        foreach ($items as $it) {
            $itemId = (int)($it['item_id'] ?? 0);
            $compId = (int)($it['componente_id'] ?? 0);
            $res    = trim($it['resultado'] ?? 'conforme');
            if ($itemId <= 0 || !in_array($res, CHK_RESULTADOS, true)) continue;
            db()->query(
                "INSERT INTO chk_resultados (inspeccion_id, item_id, componente_id, resultado, observacion) VALUES (?, ?, ?, ?, ?)",
                [$inspId, $itemId, $compId, $res, trim($it['observacion'] ?? '') ?: null]);
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
    db()->query("DELETE FROM chk_items WHERE id = ?", [$id]);
    jsonResponse(true, 'Ítem eliminado.');
}
