<?php
// ============================================================
// Registro de capacitación / lista de asistencia — R.M. 050-2013-TR
// Archivo: api/capacitaciones_pdf.php?id=NN
// Página imprimible (Ctrl+P / Guardar como PDF). Fiscalizable por SUNAFIL.
// ============================================================

require_once __DIR__ . '/../includes/auth.php';
requireLogin();
setupCapacitaciones();
setupEmpresas();

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) { http_response_code(400); die('ID inválido'); }

$cap = db()->fetchOne("SELECT * FROM capacitaciones WHERE id = ?", [$id]);
if (!$cap) { http_response_code(404); die('Capacitación no encontrada'); }

$asis = db()->fetchAll(
    "SELECT nombre, dni, cargo, firma FROM cap_asistentes WHERE capacitacion_id = ? ORDER BY nombre ASC", [$id]);

// Empleador: empresa principal (DICORJES) desde la tabla empresas.
$emp = db()->fetchOne("SELECT razon_social, ruc, domicilio, actividad, responsable, logo FROM empresas WHERE id = ?", [empresaUnica()]) ?: [];

$logo = '';
if (!empty($emp['logo']) && is_file(__DIR__ . '/../uploads/' . $emp['logo'])) {
    $p = __DIR__ . '/../uploads/' . $emp['logo'];
    $ext = strtolower(pathinfo($p, PATHINFO_EXTENSION));
    $mime = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][$ext] ?? 'image/png';
    $logo = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($p));
}
if ($logo === '') {
    $lp = __DIR__ . '/../assets/img/logo-camion.png';
    if (is_file($lp)) $logo = 'data:image/png;base64,' . base64_encode(file_get_contents($lp));
}

$SUB = [
    'cronograma' => 'Capacitación', 'semana' => 'Semana de Seguridad',
    'alerta' => 'Difusión de alerta', 'campana' => 'Campaña',
];
$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
$fmt = function ($f) { if (!$f) return ''; $ts = strtotime($f); return $ts ? date('d/m/Y', $ts) : $f; };
$minRows = 12;
$fill = max(0, $minRows - count($asis));
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Registro asistencia · <?= $h($cap['titulo']) ?></title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; font-size: 11px; background: #f3f4f6; }
  .sheet { background: #fff; width: 186mm; margin: 0 auto; padding: 6mm; }
  .toolbar { max-width: 186mm; margin: 12px auto; display: flex; gap: 8px; justify-content: flex-end; }
  .toolbar .hint { margin-right: auto; font-size: 12px; color: #555; }
  .toolbar button { font: inherit; font-size: 13px; padding: 8px 16px; border: 0; border-radius: 6px; cursor: pointer; }
  .btn-print { background: #1565C0; color: #fff; } .btn-back { background: #e5e7eb; color: #111; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; }
  .head td { border: 1px solid #000; }
  .logo { width: 26%; text-align: center; } .logo img { max-height: 54px; max-width: 100%; }
  .title { text-align: center; font-size: 14px; font-weight: 700; text-transform: uppercase; }
  .lbl { background: #f0f0f0; font-weight: 700; font-size: 10px; }
  .sec { background: #1f2937; color: #fff; font-weight: 700; text-transform: uppercase; font-size: 10px; letter-spacing: .5px; }
  .asis th { background: #f0f0f0; font-size: 10px; text-transform: uppercase; }
  .asis td { height: 26px; }
  .firma img { max-height: 24px; max-width: 96%; }
  .cnum { text-align: center; width: 6%; } .cdni { text-align: center; width: 14%; }
  .ccargo { width: 20%; } .cfirma { width: 24%; text-align: center; }
  @media print { body { background: #fff; } .toolbar { display: none; } .sheet { width: auto; padding: 0; } }
</style>
</head>
<body>
  <div class="toolbar">
    <span class="hint">Revisa y usa “Imprimir → Guardar como PDF”.</span>
    <button class="btn-back" onclick="history.back()">← Volver</button>
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / PDF</button>
  </div>

  <div class="sheet">
    <table class="head">
      <tr>
        <td class="logo" rowspan="2"><?php if ($logo): ?><img src="<?= $logo ?>" alt="Logo"><?php else: ?><strong><?= $h($emp['razon_social'] ?? 'EMPRESA') ?></strong><?php endif; ?></td>
        <td class="title" rowspan="2">Registro de Capacitación y Asistencia<br><span style="font-size:10px;font-weight:400">R.M. 050-2013-TR</span></td>
        <td class="lbl">Código</td><td contenteditable="true">&nbsp;</td>
      </tr>
      <tr><td class="lbl">Versión / Fecha</td><td contenteditable="true">&nbsp;</td></tr>
    </table>

    <table style="margin-top:6px">
      <tr><td class="sec" colspan="4">Datos del Empleador</td></tr>
      <tr>
        <td class="lbl" style="width:16%">Razón Social</td><td><?= $h($emp['razon_social'] ?? '') ?></td>
        <td class="lbl" style="width:10%">RUC</td><td><?= $h($emp['ruc'] ?? '') ?></td>
      </tr>
      <tr>
        <td class="lbl">Domicilio</td><td><?= $h($emp['domicilio'] ?? '') ?></td>
        <td class="lbl">Actividad</td><td><?= $h($emp['actividad'] ?? '') ?></td>
      </tr>
    </table>

    <table style="margin-top:6px">
      <tr><td class="sec" colspan="4">Datos de la Capacitación</td></tr>
      <tr>
        <td class="lbl" style="width:16%">Tema</td><td colspan="3"><?= $h($cap['titulo']) ?></td>
      </tr>
      <tr>
        <td class="lbl">Tipo</td><td><?= $h($cap['subtipo'] ?: ($SUB[$cap['tipo']] ?? '')) ?></td>
        <td class="lbl" style="width:12%">Fecha</td><td><?= $h($fmt($cap['fecha'])) ?> <?= $h($cap['hora']) ?></td>
      </tr>
      <tr>
        <td class="lbl">Facilitador</td><td><?= $h($cap['responsable']) ?></td>
        <td class="lbl">Duración</td><td><?= $cap['horas'] ? $h($cap['horas']) . ' h' : '' ?></td>
      </tr>
      <tr>
        <td class="lbl">Lugar</td><td><?= $h($cap['lugar']) ?></td>
        <td class="lbl">Dirigido a</td><td><?= $h($cap['dirigido_a'] ?: 'Todos') ?></td>
      </tr>
      <?php if (!empty($cap['descripcion'])): ?>
      <tr><td class="lbl">Contenido</td><td colspan="3"><?= nl2br($h($cap['descripcion'])) ?></td></tr>
      <?php endif; ?>
    </table>

    <table style="margin-top:6px" class="asis">
      <tr><td class="sec" colspan="5">Lista de Asistencia</td></tr>
      <tr><th class="cnum">N°</th><th>Apellidos y Nombres</th><th class="cdni">DNI</th><th class="ccargo">Cargo</th><th class="cfirma">Firma</th></tr>
      <?php $n = 0; foreach ($asis as $a): $n++; ?>
      <tr>
        <td class="cnum"><?= $n ?></td>
        <td><?= $h($a['nombre']) ?></td>
        <td class="cdni"><?= $h($a['dni']) ?></td>
        <td class="ccargo"><?= $h($a['cargo']) ?></td>
        <td class="cfirma firma"><?php if (!empty($a['firma']) && strpos($a['firma'], 'data:image/') === 0): ?><img src="<?= $h($a['firma']) ?>" alt="firma"><?php endif; ?></td>
      </tr>
      <?php endforeach; ?>
      <?php for ($i = 0; $i < $fill; $i++): $n++; ?>
      <tr><td class="cnum"><?= $n ?></td><td></td><td class="cdni"></td><td class="ccargo"></td><td class="cfirma"></td></tr>
      <?php endfor; ?>
    </table>

    <table style="margin-top:10px">
      <tr>
        <td class="lbl" style="width:22%">Responsable del Registro</td>
        <td><?= $h($cap['responsable'] ?: ($emp['responsable'] ?? '')) ?></td>
        <td style="width:26%;text-align:center">Firma:</td>
      </tr>
    </table>
    <p style="margin-top:8px;font-size:9px;color:#666">Total asistentes: <?= count($asis) ?> · Generado el <?= date('d/m/Y H:i') ?></p>
  </div>
</body>
</html>
