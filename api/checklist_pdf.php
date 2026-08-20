<?php
// ============================================================
// Registro de inspección mensual de unidad (checklist de componentes)
// Archivo: api/checklist_pdf.php?id=NN
// Cabecera del empleador desde EPP → Configuración (epp_config).
// ============================================================

require_once __DIR__ . '/../includes/auth.php';
requireLogin();
setupChecklist();
setupEpp();

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) { http_response_code(400); die('ID inválido'); }

$insp = db()->fetchOne("SELECT * FROM chk_inspecciones WHERE id = ?", [$id]);
if (!$insp) { http_response_code(404); die('Inspección no encontrada'); }

// Equipo (componente) de esta inspección + sus ítems.
$comps = !empty($insp['componente_id'])
    ? db()->fetchAll("SELECT id, nombre FROM chk_componentes WHERE id = ?", [(int)$insp['componente_id']])
    : db()->fetchAll("SELECT id, nombre FROM chk_componentes ORDER BY orden ASC, id ASC");
$equipoNombre = $comps[0]['nombre'] ?? '';
$resRows = db()->fetchAll("SELECT item_id, resultado, observacion FROM chk_resultados WHERE inspeccion_id = ?", [$id]);
$res = [];
foreach ($resRows as $r) $res[(int)$r['item_id']] = $r;
foreach ($comps as &$c) {
    $c['items'] = db()->fetchAll("SELECT id, texto FROM chk_items WHERE componente_id = ? ORDER BY orden ASC, id ASC", [$c['id']]);
}
unset($c);

$fotos = db()->fetchAll("SELECT archivo FROM chk_fotos WHERE inspeccion_id = ? ORDER BY id ASC", [$id]);
$fotoData = [];
foreach ($fotos as $ft) {
    $p = __DIR__ . '/../uploads/' . $ft['archivo'];
    if (is_file($p)) {
        $ext = strtolower(pathinfo($p, PATHINFO_EXTENSION));
        $mime = ['jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][$ext] ?? 'image/jpeg';
        $fotoData[] = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($p));
    }
}

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

$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
$fmt = function ($f) { if (!$f) return ''; $ts = strtotime($f); return $ts ? date('d/m/Y', $ts) : $f; };
$ESTADO = ['apto' => 'APTO', 'observado' => 'OBSERVADO', 'no_apto' => 'NO APTO'];
$RES = ['conforme' => 'C', 'no_conforme' => 'NC', 'na' => 'N/A'];
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Checklist unidad <?= $h($insp['placa']) ?> · <?= $h($insp['periodo']) ?></title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #000; font-size: 10px; background: #eceef1; }
  .sheet { background: #fff; width: 190mm; margin: 0 auto; padding: 5mm; }
  .toolbar { max-width: 190mm; margin: 10px auto; display: flex; gap: 8px; justify-content: flex-end; }
  .toolbar button { font: inherit; font-size: 13px; padding: 8px 16px; border: 0; border-radius: 6px; cursor: pointer; }
  .btn-print { background: #1565C0; color: #fff; } .btn-back { background: #e5e7eb; color: #111; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #000; padding: 3px 5px; vertical-align: middle; }
  .band { background: #1f2937; color: #fff; font-weight: 700; text-transform: uppercase; font-size: 10px; }
  .comp { background: #d9d9d9; font-weight: 700; }
  .lbl { background: #f2f2f2; font-weight: 700; text-align: center; }
  .val { color: #1f4e79; font-weight: 600; }
  .titulo { text-align: center; font-weight: 700; font-size: 13px; text-transform: uppercase; }
  .logo { text-align: center; width: 22%; } .logo img { max-height: 46px; max-width: 100%; }
  .cres { width: 8%; text-align: center; font-weight: 700; }
  .cobs { width: 26%; }
  .badge { display: inline-block; padding: 2px 10px; border-radius: 4px; font-weight: 700; color: #fff; }
  .apto { background: #27ae60; } .observado { background: #f39c12; } .no_apto { background: #e74c3c; }
  @media print { body { background: #fff; } .toolbar { display: none; } .sheet { width: auto; padding: 0; } }
</style>
</head>
<body>
  <div class="toolbar">
    <button class="btn-back" onclick="history.back()">← Volver</button>
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir / PDF</button>
  </div>
  <div class="sheet">
    <table>
      <tr>
        <td class="logo" rowspan="2"><?php if ($logo): ?><img src="<?= $logo ?>"><?php else: ?><strong><?= $h($g('emp_razon_social') ?: 'EMPRESA') ?></strong><?php endif; ?></td>
        <td class="titulo" rowspan="2">Registro de Inspección Mensual de Unidad<br><span style="font-size:9px;font-weight:400">Componentes de seguridad · Ley N° 29783</span></td>
        <td class="lbl">Periodo</td><td class="val" style="text-align:center"><?= $h($insp['periodo']) ?></td>
      </tr>
      <tr><td class="lbl">Fecha</td><td class="val" style="text-align:center"><?= $h($fmt($insp['fecha'])) ?></td></tr>
    </table>

    <table style="margin-top:4px">
      <tr>
        <td class="lbl" style="width:14%">Empleador</td><td class="val"><?= $h($g('emp_razon_social')) ?></td>
        <td class="lbl" style="width:10%">Unidad</td><td class="val" style="font-size:13px;font-weight:700"><?= $h($insp['placa']) ?></td>
      </tr>
      <tr>
        <td class="lbl">Equipo</td>
        <?php if (!empty($insp['vencimiento'])): ?>
          <td class="val" style="font-weight:700"><?= $h($equipoNombre) ?></td>
          <td class="lbl">Vencimiento</td><td class="val" style="text-align:center;font-weight:700"><?= $h($fmt($insp['vencimiento'])) ?></td>
        <?php else: ?>
          <td class="val" colspan="3" style="font-weight:700"><?= $h($equipoNombre) ?></td>
        <?php endif; ?>
      </tr>
      <tr>
        <td class="lbl">Inspector</td><td class="val"><?= $h($insp['inspector_nombre']) ?></td>
        <td class="lbl">Resultado</td>
        <td style="text-align:center"><span class="badge <?= $h($insp['estado']) ?>"><?= $ESTADO[$insp['estado']] ?? $insp['estado'] ?></span></td>
      </tr>
    </table>

    <table style="margin-top:4px">
      <tr><td class="band" colspan="3">Checklist de componentes &nbsp;(C = Conforme · NC = No Conforme · N/A = No Aplica)</td></tr>
      <?php foreach ($comps as $c): if (!count($c['items'])) continue; ?>
        <tr><td class="comp" colspan="3"><?= $h($c['nombre']) ?></td></tr>
        <?php foreach ($c['items'] as $it): $r = $res[(int)$it['id']] ?? null; $rv = $r['resultado'] ?? ''; ?>
        <tr>
          <td style="width:66%"><?= $h($it['texto']) ?></td>
          <td class="cres"><?= $rv ? ($RES[$rv] ?? '') : '' ?></td>
          <td class="cobs"><?= $h($r['observacion'] ?? '') ?></td>
        </tr>
        <?php endforeach; ?>
      <?php endforeach; ?>
    </table>

    <?php if (!empty($insp['observacion'])): ?>
    <table style="margin-top:4px"><tr><td class="lbl" style="width:18%">Observaciones</td><td><?= nl2br($h($insp['observacion'])) ?></td></tr></table>
    <?php endif; ?>

    <?php if (count($fotoData)): ?>
    <table style="margin-top:4px"><tr><td class="band">Evidencia fotográfica</td></tr></table>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px;border:1px solid #000;padding:5px">
      <?php foreach ($fotoData as $fd): ?>
        <img src="<?= $fd ?>" style="width:31%;height:auto;border:1px solid #999;object-fit:cover">
      <?php endforeach; ?>
    </div>
    <?php endif; ?>

    <table style="margin-top:10px">
      <tr>
        <td class="lbl" style="width:22%">Inspector</td>
        <td class="val"><?= $h($insp['inspector_nombre']) ?></td>
        <td style="width:30%;text-align:center;vertical-align:middle">Firma:
          <?php if (!empty($insp['firma']) && strpos($insp['firma'], 'data:image/') === 0): ?>
            <div style="margin-top:2px"><img src="<?= $h($insp['firma']) ?>" style="max-height:46px;max-width:90%"></div>
          <?php endif; ?>
        </td>
      </tr>
    </table>
    <p style="margin-top:6px;font-size:9px;color:#666">Generado el <?= date('d/m/Y H:i') ?></p>
  </div>
  <script>if (window.self !== window.top) { var tb = document.querySelector('.toolbar'); if (tb) tb.style.display = 'none'; }</script>
</body>
</html>
