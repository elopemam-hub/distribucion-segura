<?php
// ============================================================
// REGISTRO DE EVALUACIONES DE CAPACITACIÓN (formato de asistencia)
// Archivo: api/evaluaciones_registro_pdf.php?tipo=&estado=&desde=&hasta=&q=
// Cabecera del empleador (epp_config). Página imprimible (Ctrl+P / PDF).
// ============================================================

require_once __DIR__ . '/../includes/auth.php';
requireLogin();
setupEpp();               // datos del empleador / centro de trabajo
if (function_exists('setupEvalFormularios')) setupEvalFormularios();

$tipo   = trim($_GET['tipo']   ?? '');
$estado = trim($_GET['estado'] ?? '');
$desde  = trim($_GET['desde']  ?? '');
$hasta  = trim($_GET['hasta']  ?? '');
$q      = trim($_GET['q']      ?? '');

$where  = ['1=1']; $params = [];
if ($tipo   !== '') { $where[] = 'e.tipo = ?';   $params[] = $tipo; }
if ($estado !== '') { $where[] = 'e.estado = ?'; $params[] = $estado; }
if ($desde  !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $desde)) { $where[] = 'e.fecha >= ?'; $params[] = $desde; }
if ($hasta  !== '' && preg_match('/^\d{4}-\d{2}-\d{2}$/', $hasta)) { $where[] = 'e.fecha <= ?'; $params[] = $hasta; }
if ($q      !== '') { $where[] = '(e.nombre LIKE ? OR e.dni LIKE ? OR e.empresa LIKE ?)'; $lk = "%$q%"; $params[] = $lk; $params[] = $lk; $params[] = $lk; }
$whereStr = implode(' AND ', $where);

$rows = [];
try {
    $rows = db()->fetchAll(
        "SELECT e.tipo, e.fecha, e.empresa, e.nombre, e.dni, e.puesto,
                e.puntaje, e.puntaje_maximo, e.porcentaje, e.estado
           FROM evaluaciones e
          WHERE $whereStr
          ORDER BY e.fecha ASC, e.nombre ASC
          LIMIT 1000",
        $params
    );
} catch (Throwable $e) { $rows = []; }

// Etiquetas de tipo desde eval_formularios (+ respaldo).
$tipoLabels = [];
try {
    foreach (db()->fetchAll("SELECT formulario_id, titulo FROM eval_formularios") as $f) {
        $tipoLabels[$f['formulario_id']] = $f['titulo'];
    }
} catch (Throwable $e) { /* usa respaldo */ }
$tipoLabels += ['manejo_practica' => 'Manejo Práctica', 'examen_defensiva' => 'Examen Defensiva', 'induccion_t2' => 'Inducción T2'];
$tipoLbl = fn($t) => $tipoLabels[$t] ?? ucwords(str_replace('_', ' ', (string)$t));

$estadoLbl = ['aprobado' => 'APROBADO', 'desaprobado' => 'DESAPROBADO', 'pendiente_revision' => 'PENDIENTE'];

// Datos del empleador desde epp_config.
$cfg = [];
foreach (db()->fetchAll("SELECT clave, valor FROM epp_config") as $r) $cfg[$r['clave']] = $r['valor'] ?? '';
$g = fn($k) => $cfg[$k] ?? '';

$logo = '';
if (!empty($cfg['emp_logo']) && is_file(__DIR__ . '/../uploads/' . $cfg['emp_logo'])) {
    $p = __DIR__ . '/../uploads/' . $cfg['emp_logo'];
    $ext = strtolower(pathinfo($p, PATHINFO_EXTENSION));
    $mime = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][$ext] ?? 'image/png';
    $logo = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($p));
}

$h   = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
$fmt = function ($f) { if (!$f) return ''; $ts = strtotime($f); return $ts ? date('d/m/Y', $ts) : $f; };

// Totales.
$tot = count($rows);
$nAprob = 0; $nDes = 0; $nPend = 0;
foreach ($rows as $r) {
    if ($r['estado'] === 'aprobado') $nAprob++;
    elseif ($r['estado'] === 'desaprobado') $nDes++;
    else $nPend++;
}

// Resumen de filtros aplicados.
$filtros = [];
if ($tipo !== '')   $filtros[] = 'Tipo: ' . $tipoLbl($tipo);
if ($estado !== '') $filtros[] = 'Estado: ' . ($estadoLbl[$estado] ?? $estado);
if ($desde !== '')  $filtros[] = 'Desde: ' . $fmt($desde);
if ($hasta !== '')  $filtros[] = 'Hasta: ' . $fmt($hasta);
if ($q !== '')      $filtros[] = 'Búsqueda: ' . $q;
$filtroTxt = $filtros ? implode('  ·  ', $filtros) : 'Todos los registros';

$minRows = 12;
$fill = max(0, $minRows - $tot);
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Registro de Evaluaciones</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, 'Segoe UI', sans-serif; color: #000; font-size: 10px; background: #eceef1; }
  .sheet { background: #fff; width: 281mm; margin: 0 auto; padding: 5mm; }
  .toolbar { max-width: 281mm; margin: 10px auto; display: flex; gap: 8px; justify-content: flex-end; }
  .toolbar .hint { margin-right: auto; font-size: 12px; color: #555; }
  .toolbar button { font: inherit; font-size: 13px; padding: 8px 16px; border: 0; border-radius: 6px; cursor: pointer; }
  .btn-print { background: #1565C0; color: #fff; } .btn-back { background: #e5e7eb; color: #111; }

  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td, th { border: 1px solid #000; padding: 2px 5px; vertical-align: middle; word-wrap: break-word; }
  .band { background: #d9d9d9; font-weight: 700; text-transform: uppercase; text-align: center; font-size: 10px; }
  .lbl { background: #f2f2f2; text-align: center; font-weight: 700; }
  .val { color: #1f4e79; text-align: center; font-weight: 600; }
  .titulo { text-align: center; font-weight: 700; font-size: 13px; text-transform: uppercase; }
  .logo { text-align: center; } .logo img { max-height: 44px; max-width: 100%; }
  .reg th { background: #1f2937; color: #fff; font-size: 9px; text-transform: uppercase; text-align: center; }
  .reg td { height: 26px; font-size: 9.5px; }
  .cn { width: 3.5%; text-align: center; } .cf { width: 8%; text-align: center; }
  .ct { width: 13%; } .cnom { width: 20%; } .cd { width: 8%; text-align: center; }
  .ce { width: 15%; } .cp { width: 7%; text-align: center; } .cpc { width: 6%; text-align: center; }
  .cr { width: 9.5%; text-align: center; font-weight: 700; } .cfi { width: 10%; }
  .ap { color: #157347; } .de { color: #b02a37; } .pe { color: #997404; }
  .foot { font-size: 9px; margin-top: 6px; }
  @media print { body { background: #fff; } .toolbar { display: none; } .sheet { width: auto; padding: 0; } }
</style>
</head>
<body>
  <div class="toolbar">
    <span class="hint">Usa “Imprimir → Guardar como PDF”.</span>
    <button class="btn-back" onclick="history.back()">← Volver</button>
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / PDF</button>
  </div>

  <div class="sheet">
    <table>
      <tr>
        <td class="logo" style="width:20%"><?php if ($logo): ?><img src="<?= $logo ?>" alt="logo"><?php endif; ?></td>
        <td class="titulo" style="width:60%">Registro de Evaluaciones de Capacitación<br><span style="font-size:9px;font-weight:400">Ley N° 29783 · R.M. 050-2013-TR</span></td>
        <td class="lbl" style="width:20%">Fecha de emisión<br><span class="val" style="font-weight:700"><?= $h(date('d/m/Y')) ?></span></td>
      </tr>
    </table>

    <table style="margin-top:3px">
      <tr><td class="band" colspan="4">Datos del Empleador</td></tr>
      <tr>
        <td class="lbl" style="width:30%">Razón Social</td>
        <td class="lbl" style="width:14%">RUC</td>
        <td class="lbl" style="width:36%">Domicilio</td>
        <td class="lbl" style="width:20%">Centro de trabajo</td>
      </tr>
      <tr style="height:24px">
        <td class="val"><?= $h($g('emp_razon_social')) ?></td>
        <td class="val"><?= $h($g('emp_ruc')) ?></td>
        <td class="val"><?= $h($g('emp_domicilio')) ?></td>
        <td class="val"><?= $h($g('ct_nombre')) ?></td>
      </tr>
    </table>

    <table style="margin-top:3px">
      <tr>
        <td class="lbl" style="width:14%">Filtros</td>
        <td class="val" style="text-align:left"><?= $h($filtroTxt) ?></td>
        <td class="lbl" style="width:34%">Total: <?= $tot ?> &nbsp;·&nbsp; <span class="ap">Aprobados: <?= $nAprob ?></span> &nbsp;·&nbsp; <span class="de">Desaprobados: <?= $nDes ?></span> &nbsp;·&nbsp; <span class="pe">Pendientes: <?= $nPend ?></span></td>
      </tr>
    </table>

    <table style="margin-top:3px" class="reg">
      <tr>
        <th class="cn">N°</th><th class="cf">Fecha</th><th class="ct">Tipo de evaluación</th>
        <th class="cnom">Apellidos y Nombres</th><th class="cd">DNI</th><th class="ce">Empresa</th>
        <th class="cp">Puntaje</th><th class="cpc">%</th><th class="cr">Resultado</th><th class="cfi">Firma</th>
      </tr>
      <?php $n = 0; foreach ($rows as $r): $n++;
        $cls = $r['estado'] === 'aprobado' ? 'ap' : ($r['estado'] === 'desaprobado' ? 'de' : 'pe'); ?>
      <tr>
        <td class="cn"><?= $n ?></td>
        <td class="cf"><?= $h($fmt($r['fecha'])) ?></td>
        <td class="ct"><?= $h($tipoLbl($r['tipo'])) ?></td>
        <td class="cnom"><?= $h($r['nombre']) ?></td>
        <td class="cd"><?= $h($r['dni']) ?></td>
        <td class="ce"><?= $h($r['empresa']) ?></td>
        <td class="cp"><?= $r['puntaje'] !== null ? $h($r['puntaje']) . '/' . $h($r['puntaje_maximo']) : '—' ?></td>
        <td class="cpc"><?= $r['porcentaje'] !== null ? $h(round($r['porcentaje'])) . '%' : '—' ?></td>
        <td class="cr <?= $cls ?>"><?= $h($estadoLbl[$r['estado']] ?? $r['estado']) ?></td>
        <td class="cfi"></td>
      </tr>
      <?php endforeach; ?>
      <?php for ($i = 0; $i < $fill; $i++): $n++; ?>
      <tr><td class="cn"><?= $n ?></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
      <?php endfor; ?>
    </table>

    <table style="margin-top:8px">
      <tr>
        <td class="lbl" style="width:22%">Responsable del registro</td>
        <td class="val" style="text-align:left"><?= $h($g('emp_responsable')) ?></td>
        <td class="lbl" style="width:12%">Firma</td>
        <td style="width:22%"></td>
      </tr>
    </table>

    <p class="foot"><?= $h($g('doc_codigo') ?: '') ?> &nbsp; La firma de este registro deja constancia de la evaluación realizada.</p>
  </div>
  <script>
    if (window.self !== window.top) { var tb = document.querySelector('.toolbar'); if (tb) tb.style.display = 'none'; }
  </script>
</body>
</html>
