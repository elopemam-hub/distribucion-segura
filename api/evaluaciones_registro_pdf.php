<?php
// ============================================================
// REGISTRO DE INDUCCIÓN, CAPACITACIÓN, ENTRENAMIENTO Y SIMULACROS (evaluaciones)
// Archivo: api/evaluaciones_registro_pdf.php?ids=1,2,3   (o filtros tipo/estado/desde/hasta/q)
// Formato oficial R.M. 050-2013-TR (A4 vertical). Cabecera del empleador desde
// EPP → Configuración (epp_config). Página imprimible (Ctrl+P / Guardar como PDF).
// ============================================================

require_once __DIR__ . '/../includes/auth.php';
requireLogin();
setupEpp();
if (function_exists('setupEvalFormularios')) setupEvalFormularios();

// ── Selección por IDs (checkboxes del listado) o, en su defecto, filtros ──
$ids = array_values(array_filter(array_map('intval', explode(',', (string)($_GET['ids'] ?? ''))), fn($v) => $v > 0));

$rows = [];
try {
    if ($ids) {
        $in = implode(',', $ids);
        $rows = db()->fetchAll(
            "SELECT tipo, fecha, empresa, nombre, dni, puesto, firma_evaluado
               FROM evaluaciones WHERE id IN ($in) ORDER BY nombre ASC");
    } else {
        $where = ['1=1']; $params = [];
        $tipo = trim($_GET['tipo'] ?? ''); $estado = trim($_GET['estado'] ?? '');
        $desde = trim($_GET['desde'] ?? ''); $hasta = trim($_GET['hasta'] ?? ''); $q = trim($_GET['q'] ?? '');
        if ($tipo !== '')   { $where[] = 'tipo = ?';   $params[] = $tipo; }
        if ($estado !== '') { $where[] = 'estado = ?'; $params[] = $estado; }
        if ($desde !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $desde)) { $where[] = 'fecha >= ?'; $params[] = $desde; }
        if ($hasta !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $hasta)) { $where[] = 'fecha <= ?'; $params[] = $hasta; }
        if ($q !== '') { $where[] = '(nombre LIKE ? OR dni LIKE ? OR empresa LIKE ?)'; $lk = "%$q%"; $params[] = $lk; $params[] = $lk; $params[] = $lk; }
        $rows = db()->fetchAll("SELECT tipo, fecha, empresa, nombre, dni, puesto, firma_evaluado FROM evaluaciones WHERE " . implode(' AND ', $where) . " ORDER BY nombre ASC LIMIT 500", $params);
    }
} catch (Throwable $e) { $rows = []; }

// Etiquetas de tipo desde eval_formularios (+ respaldo).
$tipoLabels = [];
try { foreach (db()->fetchAll("SELECT formulario_id, titulo FROM eval_formularios") as $f) $tipoLabels[$f['formulario_id']] = $f['titulo']; }
catch (Throwable $e) {}
$tipoLabels += ['manejo_practica' => 'Manejo Práctica', 'examen_defensiva' => 'Examen Defensiva', 'induccion_t2' => 'Inducción T2'];
$tipoLbl = fn($t) => $tipoLabels[$t] ?? ucwords(str_replace('_', ' ', (string)$t));

// Cabecera por EMPRESA. Precedencia por fila: (1) empresa de cabecera FIJA del
// formulario (p. ej. inducciones → Backus); (2) empresa del trabajador (por razón
// social). Todas las filas seleccionadas deben resolver a la misma empresa.
$formPin = [];
try { foreach (db()->fetchAll("SELECT formulario_id, empresa_cabecera_id FROM eval_formularios WHERE empresa_cabecera_id IS NOT NULL") as $f) $formPin[$f['formulario_id']] = (int)$f['empresa_cabecera_id']; }
catch (Throwable $e) {}
$razonCache = [];
$resolveRazon = function ($razon) use (&$razonCache) {
    $razon = trim((string)$razon);
    if ($razon === '') return null;
    if (array_key_exists($razon, $razonCache)) return $razonCache[$razon];
    try { $r = db()->fetchOne("SELECT id FROM empresas WHERE razon_social = ? LIMIT 1", [$razon]); } catch (Throwable $e) { $r = null; }
    return $razonCache[$razon] = (!empty($r['id']) ? (int)$r['id'] : null);
};
$empKeys = [];  // clave 'global' o id → valor null|id
foreach ($rows as $r) {
    $eid = $formPin[$r['tipo']] ?? $resolveRazon($r['empresa']);
    $empKeys[$eid ? (int)$eid : 'global'] = $eid ? (int)$eid : null;
}
if (count($empKeys) > 1) {
    http_response_code(409);
    die('<div style="font-family:Arial;padding:40px;text-align:center;color:#333">'
        . '<h2>Los registros no comparten la misma cabecera</h2>'
        . '<p>El registro R.M. 050 lleva una sola cabecera de empleador. Los registros seleccionados corresponden a distintas empresas '
        . '(recuerda que las inducciones usan la cabecera de su empresa fija).</p>'
        . '<p>Vuelve al listado y marca registros de una sola empresa (o del mismo tipo).</p>'
        . '<button onclick="history.back()" style="margin-top:12px;padding:8px 18px;cursor:pointer">← Volver</button></div>');
}
$empId = $empKeys ? reset($empKeys) : null;
$hdr = cabeceraEmpresa($empId ? (int)$empId : null);
$g = fn($k) => $hdr[$k] ?? '';

$logo = '';
if (!empty($hdr['emp_logo']) && is_file(__DIR__ . '/../uploads/' . $hdr['emp_logo'])) {
    $p = __DIR__ . '/../uploads/' . $hdr['emp_logo'];
    $ext = strtolower(pathinfo($p, PATHINFO_EXTENSION));
    $mime = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][$ext] ?? 'image/png';
    $logo = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($p));
}

$h   = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
$fmt = function ($f) { if (!$f) return ''; $ts = strtotime($f); return $ts ? date('d/m/Y', $ts) : $f; };

// Divide "NOMBRES ... AP_PATERNO AP_MATERNO" → [primer apellido, segundo apellido, nombres].
$splitNombre = function ($full) {
    $w = array_values(array_filter(preg_split('/\s+/', trim((string)$full)), fn($x) => $x !== ''));
    $n = count($w);
    if ($n === 0) return ['', '', ''];
    if ($n === 1) return ['', '', $w[0]];
    if ($n === 2) return [$w[1], '', $w[0]];
    return [$w[$n - 2], $w[$n - 1], implode(' ', array_slice($w, 0, $n - 2))];
};

// Tema fijo por formulario (si está definido); respaldo al título del tipo.
$formTema = [];
try { foreach (db()->fetchAll("SELECT formulario_id, tema FROM eval_formularios WHERE tema IS NOT NULL AND tema <> ''") as $f) $formTema[$f['formulario_id']] = $f['tema']; }
catch (Throwable $e) {}
$temasSel = [];
foreach ($rows as $r) { $temasSel[!empty($formTema[$r['tipo']]) ? $formTema[$r['tipo']] : $tipoLbl($r['tipo'])] = 1; }
$temaDefault = $temasSel ? implode("\n", array_keys($temasSel)) : '';

// Cargo de cada asistente: del registro de Personal (por DNI); respaldo a puesto.
$cargoByDni = [];
$dnis = array_values(array_unique(array_filter(array_map(fn($r) => trim((string)$r['dni']), $rows))));
if ($dnis) {
    try {
        $ph = implode(',', array_fill(0, count($dnis), '?'));
        foreach (db()->fetchAll("SELECT dni, cargo FROM personal WHERE dni IN ($ph)", $dnis) as $p) $cargoByDni[$p['dni']] = $p['cargo'];
    } catch (Throwable $e) {}
}

// Fecha del registro = día de la evaluación (si varían, la más reciente).
$fechasSel = array_values(array_filter(array_map(fn($r) => (string)$r['fecha'], $rows)));
$fechaComun = $fechasSel ? $fmt(max($fechasSel)) : '';

// Marcar (X): categoría del registro. Por formulario (categoria_rm050); si no está
// definida, se auto-detecta inducción por el nombre. Todas las filas deben coincidir.
$formCat = [];
try { foreach (db()->fetchAll("SELECT formulario_id, categoria_rm050 FROM eval_formularios WHERE categoria_rm050 IS NOT NULL AND categoria_rm050 <> ''") as $f) $formCat[$f['formulario_id']] = $f['categoria_rm050']; }
catch (Throwable $e) {}
$catsSel = [];
foreach ($rows as $r) {
    // Prioridad: categoría fija del formulario → inducción por nombre → 'capacitacion' por defecto.
    $c = $formCat[$r['tipo']] ?? (preg_match('/induc/i', $r['tipo'] . ' ' . $tipoLbl($r['tipo'])) ? 'induccion' : 'capacitacion');
    if ($c !== '') $catsSel[$c] = 1;
}
$marcaCat = (count($catsSel) === 1) ? array_key_first($catsSel) : '';
$mk = fn($cat) => ($marcaCat === $cat) ? 'X' : '&nbsp;';

$minRows = 12;
$fill = max(0, $minRows - count($rows));
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Registro de evaluaciones</title>
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, 'Segoe UI', sans-serif; color: #000; font-size: 10px; background: #eceef1; }
  .sheet { background: #fff; width: 194mm; margin: 0 auto; padding: 4mm; }
  .toolbar { max-width: 194mm; margin: 10px auto; display: flex; gap: 8px; justify-content: flex-end; }
  .toolbar .hint { margin-right: auto; font-size: 12px; color: #555; }
  .toolbar button { font: inherit; font-size: 13px; padding: 8px 16px; border: 0; border-radius: 6px; cursor: pointer; }
  .btn-print { background: #1565C0; color: #fff; } .btn-back { background: #e5e7eb; color: #111; }

  /* Tamaño de letra UNIFORME (10px) en todo el formato. */
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td, th { border: 1px solid #000; padding: 3px 5px; vertical-align: middle; word-wrap: break-word; font-size: 10px; }
  .band { background: #d9d9d9; font-weight: 700; text-transform: uppercase; text-align: center; }
  .lbl { background: #f2f2f2; text-align: center; font-weight: 700; }
  .val { color: #1f4e79; text-align: center; font-weight: 600; }
  .titulo { text-align: center; font-weight: 700; text-transform: uppercase; line-height: 1.2; }
  .logo { text-align: center; } .logo img { max-height: 46px; max-width: 100%; }
  .mk { text-align: center; font-weight: 700; height: 22px; }
  .hl { background: #ffff00; }
  .tema { text-align: left; font-weight: 600; line-height: 1.35; }
  .asis th { background: #f2f2f2; text-transform: uppercase; text-align: center; }
  .asis td { height: 42px; vertical-align: top; padding-top: 4px; }
  .cnum { width: 3%; text-align: center; } .cdni { width: 8%; text-align: center; }
  .cap1 { width: 15%; } .cap2 { width: 15%; } .cnom { width: 16%; }
  .ccargo { width: 11%; text-transform: uppercase; } .carea { width: 7%; text-align: center; }
  .cfirma { width: 18%; text-align: center; } .cobs { width: 7%; }
  .asis td, .asis th { line-height: 1.15; }
  .foot { }
  [contenteditable]:empty { background: #fffef2; }
  @media print { body { background: #fff; } .toolbar { display: none; } .sheet { width: auto; padding: 0; } [contenteditable] { background: transparent !important; } }
</style>
</head>
<body>
  <div class="toolbar">
    <span class="hint">Completa lo que falte (celdas resaltadas) y usa “Imprimir → Guardar como PDF”.</span>
    <button class="btn-back" onclick="history.back()">← Volver</button>
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / PDF</button>
  </div>

  <div class="sheet">
    <table>
      <tr>
        <td class="logo" style="width:22%"><?php if ($logo): ?><img src="<?= $logo ?>" alt="logo"><?php else: ?><span contenteditable="true">&nbsp;</span><?php endif; ?></td>
        <td class="titulo" style="width:56%">Registro de Inducción, Capacitación, Entrenamiento y Simulacros de Emergencia</td>
        <td class="logo" style="width:22%"><span contenteditable="true">&nbsp;</span></td>
      </tr>
    </table>

    <table style="margin-top:3px">
      <tr><td class="band" colspan="5">Datos del Empleador</td></tr>
      <tr>
        <td class="lbl" style="width:30%">Razón Social</td>
        <td class="lbl" style="width:14%">RUC</td>
        <td class="lbl" style="width:26%">Domicilio</td>
        <td class="lbl" style="width:16%">Actividad Económica</td>
        <td class="lbl" style="width:14%">N° Trabajadores</td>
      </tr>
      <tr style="height:30px">
        <td class="val"><?= $h($g('emp_razon_social')) ?></td>
        <td class="val"><?= $h($g('emp_ruc')) ?></td>
        <td class="val"><?= $h($g('emp_domicilio')) ?></td>
        <td class="val"><?= $h($g('emp_actividad')) ?></td>
        <td class="val"><?= $h($g('emp_num_trab')) ?></td>
      </tr>
    </table>

    <table style="margin-top:3px">
      <tr><td class="band" colspan="4">Datos del Centro de Trabajo</td></tr>
      <tr>
        <td class="lbl" style="width:30%">Centro de trabajo</td>
        <td class="lbl" style="width:30%">Domicilio</td>
        <td class="lbl" style="width:26%">Responsable centro de trabajo</td>
        <td class="lbl" style="width:14%">N° Trabajadores</td>
      </tr>
      <tr style="height:26px">
        <td class="val"><?= $h($g('ct_nombre')) ?></td>
        <td class="val"><?= $h($g('ct_domicilio')) ?></td>
        <td class="val"><?= $h($g('ct_responsable')) ?></td>
        <td class="val"><?= $h($g('ct_num_trab')) ?></td>
      </tr>
    </table>

    <table style="margin-top:3px">
      <tr><td class="band" colspan="5">Marcar (X)</td></tr>
      <tr>
        <td class="lbl" style="width:20%">Inducción</td>
        <td class="lbl hl" style="width:20%">Capacitación</td>
        <td class="lbl hl" style="width:20%">Entrenamiento</td>
        <td class="lbl" style="width:20%">Simulacro-Emergencia</td>
        <td class="lbl" style="width:20%">Otros</td>
      </tr>
      <tr>
        <td class="mk" contenteditable="true"><?= $mk('induccion') ?></td>
        <td class="mk" contenteditable="true"><?= $mk('capacitacion') ?></td>
        <td class="mk" contenteditable="true"><?= $mk('entrenamiento') ?></td>
        <td class="mk" contenteditable="true"><?= $mk('simulacro') ?></td>
        <td class="mk" contenteditable="true"><?= $mk('otros') ?></td>
      </tr>
    </table>

    <table style="margin-top:3px">
      <tr><td class="band" colspan="6">Tema / Horarios / Capacitador</td></tr>
      <tr style="height:30px">
        <td class="lbl" style="width:14%">Tema:</td>
        <td class="tema" colspan="3" contenteditable="true" style="text-align:left"><?= $temaDefault ? nl2br($h($temaDefault)) : '&nbsp;' ?></td>
        <td class="lbl" style="width:10%">Fecha:</td>
        <td class="val" style="width:14%" contenteditable="true"><?= $fechaComun ? $h($fechaComun) : '&nbsp;' ?></td>
      </tr>
      <tr>
        <td class="lbl">Nombre del Capacitador:</td>
        <td class="val" colspan="3" contenteditable="true"><?= $h($g('emp_responsable')) ?: '&nbsp;' ?></td>
        <td class="lbl">Firma:</td>
        <td></td>
      </tr>
      <tr>
        <td class="lbl">Hora de Inicio:</td>
        <td class="val" contenteditable="true">&nbsp;</td>
        <td class="lbl" style="width:14%">Hora de Término:</td>
        <td class="val" contenteditable="true">&nbsp;</td>
        <td class="lbl">Total H/H:</td>
        <td class="val" contenteditable="true">&nbsp;</td>
      </tr>
    </table>

    <table style="margin-top:3px" class="asis">
      <tr><td class="band" colspan="9">Asistentes</td></tr>
      <tr>
        <th class="cnum">N°</th><th class="cdni">DNI</th><th class="cap1">Primer Apellido</th>
        <th class="cap2">Segundo Apellido</th><th class="cnom">Nombre</th><th class="ccargo">Cargo</th>
        <th class="carea">Área</th><th class="cfirma">Firma</th><th class="cobs">Obs.</th>
      </tr>
      <?php $n = 0; foreach ($rows as $r): $n++; [$ap1, $ap2, $nom] = $splitNombre($r['nombre']); ?>
      <tr>
        <td class="cnum"><?= $n ?></td>
        <td class="cdni"><?= $h($r['dni']) ?></td>
        <td class="cap1"><?= $h($ap1) ?></td>
        <td class="cap2"><?= $h($ap2) ?></td>
        <td class="cnom"><?= $h($nom) ?></td>
        <td class="ccargo" contenteditable="true"><?= $h($cargoByDni[$r['dni']] ?? $r['puesto']) ?: '&nbsp;' ?></td>
        <td class="carea"><?= $g('ct_area') !== '' ? $h($g('ct_area')) : '' ?></td>
        <td class="cfirma"><?php if (!empty($r['firma_evaluado']) && strpos($r['firma_evaluado'], 'data:image/') === 0): ?><img src="<?= $h($r['firma_evaluado']) ?>" style="max-height:34px;max-width:100%;display:block;margin:0 auto"><?php endif; ?></td>
        <td class="cobs"></td>
      </tr>
      <?php endforeach; ?>
      <?php for ($i = 0; $i < $fill; $i++): $n++; ?>
      <tr><td class="cnum"><?= $n ?></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      <?php endfor; ?>
    </table>

    <table style="margin-top:3px">
      <tr><td class="band" colspan="4">Responsable del Registro</td></tr>
      <tr style="height:26px">
        <td class="lbl" style="width:22%">Nombres y Apellidos:</td>
        <td class="val"><?= $h($g('emp_responsable')) ?></td>
        <td class="lbl" style="width:14%">Firma</td>
        <td style="width:20%"></td>
      </tr>
      <tr style="height:22px">
        <td class="lbl">Cargo:</td>
        <td class="val" contenteditable="true"><?= $g('resp_cargo') !== '' ? $h($g('resp_cargo')) : '&nbsp;' ?></td>
        <td class="lbl">Fecha:</td>
        <td class="val" contenteditable="true"><?= $fechaComun ? $h($fechaComun) : '&nbsp;' ?></td>
      </tr>
    </table>

    <p class="foot" style="margin-top:6px">
      <?= $h($g('doc_codigo') ?: 'A600-010-04') ?>
      &nbsp;·&nbsp; * La firma de este registro es conformidad de la evaluación realizada.
      &nbsp;·&nbsp; Total: <?= count($rows) ?>
    </p>
  </div>
  <script>
    if (window.self !== window.top) { var tb = document.querySelector('.toolbar'); if (tb) tb.style.display = 'none'; }
  </script>
</body>
</html>
