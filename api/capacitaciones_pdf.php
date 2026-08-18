<?php
// ============================================================
// REGISTRO DE INDUCCIÓN, CAPACITACIÓN, ENTRENAMIENTO Y SIMULACROS DE EMERGENCIA
// Archivo: api/capacitaciones_pdf.php?id=NN
// Formato oficial (referencia Backus / R.M. 050-2013-TR). La cabecera
// (empleador + centro de trabajo) se toma de EPP → Configuración → Datos del
// empleador (tabla epp_config). Página imprimible (Ctrl+P / Guardar como PDF).
// ============================================================

require_once __DIR__ . '/../includes/auth.php';
requireLogin();
setupCapacitaciones();
setupEpp();   // asegura epp_config (datos del empleador / centro de trabajo)

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) { http_response_code(400); die('ID inválido'); }

$cap = db()->fetchOne("SELECT * FROM capacitaciones WHERE id = ?", [$id]);
if (!$cap) { http_response_code(404); die('Capacitación no encontrada'); }

$asis = db()->fetchAll(
    "SELECT nombre, dni, cargo, firma FROM cap_asistentes WHERE capacitacion_id = ? ORDER BY nombre ASC", [$id]);

// Datos del empleador / centro de trabajo desde epp_config.
$cfg = [];
foreach (db()->fetchAll("SELECT clave, valor FROM epp_config") as $r) $cfg[$r['clave']] = $r['valor'] ?? '';
$g = fn($k) => $cfg[$k] ?? '';

// Logo (empleador) desde epp_config.emp_logo → uploads/.
$logo = '';
if (!empty($cfg['emp_logo']) && is_file(__DIR__ . '/../uploads/' . $cfg['emp_logo'])) {
    $p = __DIR__ . '/../uploads/' . $cfg['emp_logo'];
    $ext = strtolower(pathinfo($p, PATHINFO_EXTENSION));
    $mime = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][$ext] ?? 'image/png';
    $logo = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($p));
}

$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
$fmt = function ($f) { if (!$f) return ''; $ts = strtotime($f); return $ts ? date('d/m/Y', $ts) : $f; };

// MARCAR (X): deriva el tipo de actividad del subtipo/tipo.
$sub = mb_strtolower(trim($cap['subtipo'] ?? ''), 'UTF-8');
$marca = 'capacitacion';
if (strpos($sub, 'inducci') !== false)        $marca = 'induccion';
elseif (strpos($sub, 'reentrena') !== false || strpos($sub, 'entrena') !== false) $marca = 'entrenamiento';
elseif (strpos($sub, 'simulacro') !== false)  $marca = 'simulacro';
$mk = fn($k) => $marca === $k ? 'X' : '';

// Hora inicio / término desde el campo hora ("09:00 - 10:00" o libre).
$horaIni = ''; $horaFin = '';
if (!empty($cap['hora'])) {
    $parts = preg_split('/\s*[-–]\s*/', $cap['hora']);
    $horaIni = trim($parts[0] ?? '');
    $horaFin = trim($parts[1] ?? '');
}

$minRows = 21;
$fill = max(0, $minRows - count($asis));
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Registro de capacitación · <?= $h($cap['titulo']) ?></title>
<style>
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, 'Segoe UI', sans-serif; color: #000; font-size: 10px; background: #eceef1; }
  .sheet { background: #fff; width: 194mm; margin: 0 auto; padding: 4mm; }
  .toolbar { max-width: 194mm; margin: 10px auto; display: flex; gap: 8px; justify-content: flex-end; }
  .toolbar .hint { margin-right: auto; font-size: 12px; color: #555; }
  .toolbar button { font: inherit; font-size: 13px; padding: 8px 16px; border: 0; border-radius: 6px; cursor: pointer; }
  .btn-print { background: #1565C0; color: #fff; } .btn-back { background: #e5e7eb; color: #111; }

  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td, th { border: 1px solid #000; padding: 2px 4px; vertical-align: middle; word-wrap: break-word; }
  .band { background: #d9d9d9; font-weight: 700; text-transform: uppercase; text-align: center; font-size: 10px; }
  .lbl { background: #f2f2f2; text-align: center; font-weight: 700; }
  .val { color: #1f4e79; text-align: center; font-weight: 600; }
  .titulo { text-align: center; font-weight: 700; font-size: 12px; text-transform: uppercase; line-height: 1.15; }
  .logo { text-align: center; } .logo img { max-height: 46px; max-width: 100%; }
  .mk { text-align: center; font-weight: 700; font-size: 13px; height: 22px; }
  .hl { background: #ffff00; }
  .tema { text-align: center; font-weight: 700; font-size: 13px; }
  .asis th { background: #f2f2f2; font-size: 9px; text-transform: uppercase; text-align: center; }
  .asis td { height: 20px; font-size: 9px; }
  .cnum { width: 4%; text-align: center; } .cdni { width: 11%; text-align: center; }
  .cnom { width: 26%; } .ccargo { width: 20%; } .carea { width: 12%; text-align: center; }
  .cfirma { width: 15%; text-align: center; } .cobs { width: 12%; }
  .cfirma img { max-height: 18px; max-width: 96%; }
  .foot { font-size: 9px; }
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
    <!-- Cabecera: logo | título | logo -->
    <table>
      <tr>
        <td class="logo" style="width:22%"><?php if ($logo): ?><img src="<?= $logo ?>" alt="logo"><?php else: ?><span contenteditable="true">&nbsp;</span><?php endif; ?></td>
        <td class="titulo" style="width:56%">Registro de Inducción, Capacitación, Entrenamiento y Simulacros de Emergencia</td>
        <td class="logo" style="width:22%"><span contenteditable="true">&nbsp;</span></td>
      </tr>
    </table>

    <!-- Datos del empleador -->
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

    <!-- Datos del centro de trabajo -->
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

    <!-- Marcar (X) -->
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
        <td class="mk"><?= $mk('induccion') ?></td>
        <td class="mk"><?= $mk('capacitacion') ?></td>
        <td class="mk"><?= $mk('entrenamiento') ?></td>
        <td class="mk"><?= $mk('simulacro') ?></td>
        <td class="mk"><?= $marca === 'otros' ? 'X' : '' ?></td>
      </tr>
    </table>

    <!-- Tema / horarios / capacitador -->
    <table style="margin-top:3px">
      <tr><td class="band" colspan="6">Tema / Horarios / Capacitador</td></tr>
      <tr style="height:34px">
        <td class="lbl" style="width:14%">Tema:</td>
        <td class="tema" colspan="3"><?= $h($cap['titulo']) ?></td>
        <td class="lbl" style="width:10%">Fecha:</td>
        <td class="val" style="width:14%"><?= $h($fmt($cap['fecha'])) ?></td>
      </tr>
      <tr>
        <td class="lbl">Nombre del Capacitador:</td>
        <td class="val" colspan="3"><?= $h($cap['responsable']) ?></td>
        <td class="lbl">Firma:</td>
        <td></td>
      </tr>
      <tr>
        <td class="lbl">Hora de Inicio:</td>
        <td class="val"><?= $h($horaIni) ?: '<span contenteditable="true">&nbsp;</span>' ?></td>
        <td class="lbl" style="width:14%">Hora de Término:</td>
        <td class="val"><?= $h($horaFin) ?: '<span contenteditable="true">&nbsp;</span>' ?></td>
        <td class="lbl">Total H/H Capacitación:</td>
        <td class="val"><?= $cap['horas'] ? $h($cap['horas']) : '<span contenteditable="true">&nbsp;</span>' ?></td>
      </tr>
    </table>

    <!-- Asistentes -->
    <table style="margin-top:3px" class="asis">
      <tr><td class="band" colspan="7">Asistentes</td></tr>
      <tr>
        <th class="cnum">N°</th><th class="cdni">DNI</th><th class="cnom">Apellidos y Nombres</th>
        <th class="ccargo">Cargo</th><th class="carea">Área</th><th class="cfirma">Firma</th><th class="cobs">Observaciones</th>
      </tr>
      <?php $n = 0; foreach ($asis as $a): $n++; ?>
      <tr>
        <td class="cnum"><?= $n ?></td>
        <td class="cdni"><?= $h($a['dni']) ?></td>
        <td class="cnom"><?= $h($a['nombre']) ?></td>
        <td class="ccargo"><?= $h($a['cargo']) ?></td>
        <td class="carea"><span contenteditable="true">&nbsp;</span></td>
        <td class="cfirma"><?php if (!empty($a['firma']) && strpos($a['firma'], 'data:image/') === 0): ?><img src="<?= $h($a['firma']) ?>" alt="firma"><?php endif; ?></td>
        <td class="cobs"><span contenteditable="true">&nbsp;</span></td>
      </tr>
      <?php endforeach; ?>
      <?php for ($i = 0; $i < $fill; $i++): $n++; ?>
      <tr><td class="cnum"><?= $n ?></td><td class="cdni"></td><td class="cnom"></td><td class="ccargo"></td><td class="carea"></td><td class="cfirma"></td><td class="cobs"></td></tr>
      <?php endfor; ?>
    </table>

    <!-- Responsable del registro -->
    <table style="margin-top:3px">
      <tr><td class="band" colspan="4">Responsable del Registro</td></tr>
      <tr style="height:26px">
        <td class="lbl" style="width:22%">Nombres y Apellidos:</td>
        <td class="val"><?= $h($cap['responsable'] ?: $g('emp_responsable')) ?></td>
        <td class="lbl" style="width:14%">Firma</td>
        <td style="width:20%"></td>
      </tr>
      <tr style="height:22px">
        <td class="lbl">Cargo:</td>
        <td class="val"><span contenteditable="true">&nbsp;</span></td>
        <td class="lbl">Fecha:</td>
        <td class="val"><?= $h($fmt($cap['fecha'])) ?></td>
      </tr>
    </table>

    <p class="foot" style="margin-top:6px">
      <?= $h($g('doc_codigo') ?: 'A600-010-04') ?>
      &nbsp;·&nbsp; * La firma de este acta es conformidad y acuerdo; será sancionado el personal que no ejecute lo capacitado.
      &nbsp;·&nbsp; Total asistentes: <?= count($asis) ?>
    </p>
  </div>
  <script>
    // Embebido en el visor del módulo: oculta la barra interna (el modal ya
    // trae sus propios botones Imprimir / Abrir aparte).
    if (window.self !== window.top) { var tb = document.querySelector('.toolbar'); if (tb) tb.style.display = 'none'; }
  </script>
</body>
</html>
