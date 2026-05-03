<?php
require_once __DIR__ . '/../includes/auth.php';
requireLogin();

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) die('ID inválido');

$inspeccion = db()->fetchOne("SELECT i.*, u.nombre as inspector_nombre FROM inspecciones i LEFT JOIN usuarios u ON u.id = i.inspector_id WHERE i.id = ?", [$id]);
if (!$inspeccion) die('No encontrada');

$tripulacion = db()->fetchAll("SELECT * FROM tripulacion WHERE inspeccion_id = ?", [$id]);
$checklist   = db()->fetchAll("SELECT * FROM checklist WHERE inspeccion_id = ?", [$id]);
$evidencias  = db()->fetchAll("SELECT * FROM evidencias WHERE inspeccion_id = ?", [$id]);
$hallazgos   = db()->fetchAll("SELECT * FROM hallazgos WHERE inspeccion_id = ?", [$id]);

foreach ($tripulacion as &$t) {
    $t['epp_detalle'] = !empty($t['epp_detalle']) ? json_decode($t['epp_detalle'], true) : [];
}

$totalCheck   = count($checklist);
$cumplen      = array_sum(array_column($checklist, 'estado'));
$pctChecklist = $totalCheck > 0 ? ($cumplen / $totalCheck) * 100 : 0;
$totalEppItems = 5;
$sumaEpp = 0; $miembros = 0;
foreach ($tripulacion as $t) {
    if (empty(trim($t['nombre'] ?? ''))) continue;
    $miembros++;
    $sumaEpp += (is_array($t['epp_detalle']) ? count($t['epp_detalle']) : 0) / $totalEppItems * 100;
}
$pctEpp = $miembros > 0 ? $sumaEpp / $miembros : 100;
$pct = round(($pctChecklist * 0.70) + ($pctEpp * 0.30), 2);
$colorPct  = $pct >= 80 ? '#16a34a' : ($pct >= 60 ? '#d97706' : '#dc2626');
$bgPct     = $pct >= 80 ? '#dcfce7' : ($pct >= 60 ? '#fef9c3' : '#fee2e2');
$estadoLabel = $pct >= 80 ? 'APROBADO' : ($pct >= 60 ? 'EN OBSERVACIÓN' : 'DESAPROBADO');
$todosEpp = ['Casco','Chaleco reflectivo','Zapatos de seguridad','Lentes','Guantes'];
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Inspección #<?= $id ?> · <?= htmlspecialchars($inspeccion['unidad']) ?></title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=Barlow:wght@400;600;700&display=swap');
@page { size: A4 landscape; margin: 6mm; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  width: 100%; height: auto;
  font-family: 'Barlow', Arial, sans-serif;
  font-size: 11px; color: #111; background: #fff;
}

/* — tabla raíz al 100% — */
.root-table { width: 100%; border-collapse: collapse; }

/* HEADER */
.hdr { background: #0a0a0a; padding: 9px 16px; }
.hdr h1 { font-family:'Barlow Condensed',sans-serif; font-size:17px; font-weight:900;
           text-transform:uppercase; color:#F5C800; letter-spacing:1px; }
.hdr p  { font-size:8px; color:#999; text-transform:uppercase; letter-spacing:2px; margin-top:1px; }
.hdr-num { font-family:'Barlow Condensed',sans-serif; font-size:26px; font-weight:900;
           color:#F5C800; line-height:1; text-align:right; }
.hdr-num small { display:block; font-size:8px; color:#666; text-transform:uppercase; letter-spacing:1px; }

/* BARRA RESULTADO */
.res-bar { background:#F5C800; padding:6px 16px; width:100%; }
.res-bar table { width:100%; border-collapse:collapse; }
.res-titulo { font-family:'Barlow Condensed',sans-serif; font-size:14px; font-weight:800;
              text-transform:uppercase; letter-spacing:1px; color:#0a0a0a; }
.res-pct { font-family:'Barlow Condensed',sans-serif; font-size:24px; font-weight:900;
           color:<?= $colorPct ?>; line-height:1; }
.res-badge { font-size:9px; font-weight:800; padding:2px 8px; border-radius:12px;
             background:<?= $bgPct ?>; color:<?= $colorPct ?>;
             border:1px solid <?= $colorPct ?>; white-space:nowrap; }
.res-detalle { font-size:9px; color:#444; }

/* CONTENIDO */
.content { padding: 10px 14px; width:100%; }

/* SECCIÓN */
.sec { margin-bottom:12px; }
.sec-title { font-family:'Barlow Condensed',sans-serif; font-size:11px; font-weight:800;
             text-transform:uppercase; letter-spacing:1px; color:#0a0a0a;
             border-left:3px solid #F5C800; padding-left:7px; margin-bottom:7px; }

/* INFO GRID */
.info-tbl { width:100%; border-collapse:collapse; }
.info-tbl td { width:33.33%; padding: 3px 6px 3px 0; vertical-align:top; }
.lbl { font-size:8px; text-transform:uppercase; letter-spacing:1px; color:#999; font-weight:700; display:block; }
.val { font-size:11px; font-weight:600; color:#111; }

/* TRIPULACIÓN */
.trip-tbl { width:100%; border-collapse:collapse; }
.trip-tbl td { vertical-align:top; padding:0 4px 0 0; }
.trip-card { background:#f8f8f8; border:1px solid #e0e0e0; border-radius:4px;
             padding:6px; border-left:3px solid #e0e0e0; }
.trip-card.ok  { border-left-color:#16a34a; }
.trip-card.no  { border-left-color:#dc2626; }
.t-rol  { font-size:8px; text-transform:uppercase; letter-spacing:1px; color:#999; font-weight:700; }
.t-nom  { font-size:11px; font-weight:700; color:#111; margin:2px 0 4px; line-height:1.2; }
.t-epp  { display:inline-block; padding:1px 6px; border-radius:10px; font-size:8px; font-weight:700; text-transform:uppercase; }
.t-epp.ok { background:#dcfce7; color:#16a34a; }
.t-epp.no { background:#fee2e2; color:#dc2626; }
.chips { margin-top:4px; }
.chip { display:inline-block; font-size:7px; padding:1px 4px; border-radius:6px; margin:1px 1px 0 0; font-weight:600; }
.chip.ok { background:#f0fdf4; color:#16a34a; border:1px solid #86efac; }
.chip.no { background:#fef2f2; color:#dc2626; border:1px solid #fca5a5; }

/* CHECKLIST */
.chk-tbl { width:100%; border-collapse:collapse; }
.chk-tbl td { width:33.33%; padding:2px 3px; vertical-align:top; }
.chk-item { display:flex; align-items:center; gap:5px; padding:4px 7px;
            border-radius:4px; border:1px solid; font-size:10px; }
.chk-item.ok { background:#f0fdf4; border-color:#86efac; color:#166534; }
.chk-item.no { background:#fef2f2; border-color:#fca5a5; color:#991b1b; }
.chk-ico { font-size:10px; font-weight:900; flex-shrink:0; }

/* HALLAZGOS */
.hal { display:flex; align-items:flex-start; gap:6px; padding:5px 7px;
       border-radius:4px; margin-bottom:4px; background:#fafafa; border:1px solid #eee; }
.hal-crit { font-size:7px; font-weight:800; text-transform:uppercase;
            padding:1px 6px; border-radius:3px; flex-shrink:0; white-space:nowrap; }
.hal-crit.alta  { background:#fee2e2; color:#c0392b; }
.hal-crit.media { background:#fef9c3; color:#d97706; }
.hal-crit.baja  { background:#dbeafe; color:#2563eb; }

/* OBSERVACIONES */
.obs { background:#f8f8f8; border:1px solid #e5e5e5; border-radius:4px;
       padding:7px 10px; color:#333; line-height:1.5; }

/* EVIDENCIAS */
.ev-tbl { width:100%; border-collapse:collapse; }
.ev-tbl td { padding:3px; vertical-align:top; width:50%; }
.ev-img { width:100%; border-radius:4px; border:1px solid #ddd;
          display:block; aspect-ratio:4/3; object-fit:cover; }

/* FIRMA */
.firma-img { max-width:160px; max-height:60px; border:1px solid #ddd; border-radius:4px;
             filter:invert(1) hue-rotate(180deg); display:block; }

/* FOOTER */
.footer { border-top:2px solid #F5C800; padding-top:6px; margin-top:8px;
          font-size:8px; color:#aaa; }
.footer table { width:100%; border-collapse:collapse; }

/* PRINT */
.print-btn { position:fixed; top:10px; right:14px; background:#F5C800; color:#000;
             border:none; border-radius:7px; padding:7px 16px;
             font-family:'Barlow Condensed',sans-serif; font-size:13px; font-weight:800;
             text-transform:uppercase; cursor:pointer; z-index:999; letter-spacing:1px; }
@media print {
  .print-btn { display:none !important; }
  body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">🖨️ Imprimir / PDF</button>

<!-- ═══ HEADER ═══ -->
<table class="root-table" style="background:#0a0a0a">
  <tr>
    <td class="hdr">
      <h1>🛡 Inspección en Ruta</h1>
      <p>Centro de Distribución Juliaca · Seguridad y Salud en el Trabajo</p>
    </td>
    <td style="text-align:right;padding:9px 16px">
      <div class="hdr-num">
        #<?= str_pad($id,4,'0',STR_PAD_LEFT) ?>
        <small>N° de Inspección</small>
      </div>
    </td>
  </tr>
</table>

<!-- ═══ BARRA RESULTADO ═══ -->
<div class="res-bar">
  <table>
    <tr>
      <td><span class="res-titulo">⚡ Resultado · <?= htmlspecialchars($inspeccion['unidad']) ?></span></td>
      <td style="text-align:right">
        <span class="res-detalle">
          Checklist: <?= $cumplen ?>/<?= $totalCheck ?> (<?= round($pctChecklist) ?>%) &nbsp;·&nbsp; EPP: <?= round($pctEpp) ?>%
        </span>
        &nbsp;&nbsp;
        <span class="res-pct"><?= $pct ?>%</span>
        &nbsp;
        <span class="res-badge"><?= $estadoLabel ?></span>
      </td>
    </tr>
  </table>
</div>

<div class="content">

<!-- ═══ TABLA PRINCIPAL 2 COLUMNAS ═══ -->
<table style="width:100%;border-collapse:collapse">
<tr style="vertical-align:top">

  <!-- ── COLUMNA IZQUIERDA 58% ── -->
  <td style="width:58%;padding-right:14px">

    <!-- 1. DATOS GENERALES -->
    <div class="sec">
      <div class="sec-title">1. Datos Generales</div>
      <table class="info-tbl">
        <tr>
          <td><span class="lbl">Unidad/Placa</span><span class="val"><?= htmlspecialchars($inspeccion['unidad']) ?></span></td>
          <td><span class="lbl">Fecha</span><span class="val"><?= $inspeccion['fecha'] ?></span></td>
          <td><span class="lbl">Hora</span><span class="val"><?= substr($inspeccion['hora'],0,5) ?></span></td>
        </tr>
        <tr>
          <td><span class="lbl">Provincia</span><span class="val"><?= htmlspecialchars($inspeccion['provincia']) ?></span></td>
          <td><span class="lbl">Distrito</span><span class="val"><?= htmlspecialchars($inspeccion['distrito']) ?></span></td>
          <td><span class="lbl">Dirección</span><span class="val"><?= htmlspecialchars($inspeccion['direccion']) ?></span></td>
        </tr>
        <tr>
          <?php if ($inspeccion['latitud']): ?>
          <td><span class="lbl">Coordenadas GPS</span><span class="val" style="font-size:9px"><?= $inspeccion['latitud'] ?>, <?= $inspeccion['longitud'] ?></span></td>
          <?php else: ?><td></td><?php endif; ?>
          <td><span class="lbl">Inspector</span><span class="val"><?= htmlspecialchars($inspeccion['inspector_nombre'] ?? '—') ?></span></td>
          <td><span class="lbl">Registrado el</span><span class="val"><?= substr($inspeccion['creado_en'],0,16) ?></span></td>
        </tr>
      </table>
    </div>

    <!-- 2. TRIPULACIÓN -->
    <?php if ($tripulacion): ?>
    <div class="sec">
      <div class="sec-title">2. Tripulación y EPP</div>
      <table class="trip-tbl">
        <tr>
        <?php foreach ($tripulacion as $idx => $t):
          $eppDet = is_array($t['epp_detalle']) ? $t['epp_detalle'] : [];
          $cls    = $t['epp_completo'] ? 'ok' : 'no';
        ?>
          <td style="width:<?= round(100/count($tripulacion)) ?>%">
            <div class="trip-card <?= $cls ?>">
              <div class="t-rol"><?= htmlspecialchars($t['rol']) ?></div>
              <div class="t-nom"><?= htmlspecialchars($t['nombre']) ?></div>
              <span class="t-epp <?= $cls ?>"><?= $cls==='ok'?'✔ EPP Completo':'✖ EPP Incompleto' ?></span>
              <div class="chips">
                <?php foreach ($todosEpp as $e): $tiene = in_array($e, $eppDet); ?>
                <span class="chip <?= $tiene?'ok':'no' ?>"><?= $tiene?'✔':'✖' ?> <?= htmlspecialchars($e) ?></span>
                <?php endforeach; ?>
              </div>
            </div>
          </td>
        <?php endforeach; ?>
        </tr>
      </table>
    </div>
    <?php endif; ?>

    <!-- 3. CHECKLIST -->
    <?php if ($checklist): ?>
    <div class="sec">
      <div class="sec-title">3. Checklist de Vehículo</div>
      <table class="chk-tbl">
        <?php
        $chunks = array_chunk($checklist, 3);
        foreach ($chunks as $row): ?>
        <tr>
          <?php foreach ($row as $c): ?>
          <td>
            <div class="chk-item <?= $c['estado']?'ok':'no' ?>">
              <span class="chk-ico"><?= $c['estado']?'✔':'✖' ?></span>
              <?= htmlspecialchars($c['item']) ?>
            </div>
          </td>
          <?php endforeach; ?>
          <?php for ($fill = count($row); $fill < 3; $fill++): ?><td></td><?php endfor; ?>
        </tr>
        <?php endforeach; ?>
      </table>
    </div>
    <?php endif; ?>

    <!-- 4. HALLAZGOS -->
    <?php if ($hallazgos): ?>
    <div class="sec">
      <div class="sec-title">4. Hallazgos</div>
      <?php foreach ($hallazgos as $h): ?>
      <div class="hal">
        <span class="hal-crit <?= $h['criticidad'] ?>"><?= strtoupper($h['criticidad']) ?></span>
        <span><?= htmlspecialchars($h['descripcion']) ?></span>
      </div>
      <?php endforeach; ?>
    </div>
    <?php endif; ?>

    <!-- 5. OBSERVACIONES -->
    <?php if ($inspeccion['observaciones']): ?>
    <div class="sec">
      <div class="sec-title">5. Observaciones</div>
      <div class="obs"><?= nl2br(htmlspecialchars($inspeccion['observaciones'])) ?></div>
    </div>
    <?php endif; ?>

    <!-- 7. FIRMA -->
    <?php if ($inspeccion['firma_digital']): ?>
    <div class="sec">
      <div class="sec-title">7. Firma del Inspector</div>
      <table><tr>
        <td><img class="firma-img" src="<?= $inspeccion['firma_digital'] ?>" alt="Firma"></td>
        <td style="padding-left:12px;vertical-align:middle">
          <strong style="font-size:12px;display:block"><?= htmlspecialchars($inspeccion['inspector_nombre'] ?? '') ?></strong>
          <span style="font-size:9px;color:#888">Inspector SST</span>
        </td>
      </tr></table>
    </div>
    <?php endif; ?>

  </td><!-- fin col izq -->

  <!-- ── COLUMNA DERECHA 42% ── -->
  <td style="width:42%;vertical-align:top">
    <?php if ($evidencias): ?>
    <div class="sec">
      <div class="sec-title">6. Evidencias Fotográficas (<?= count($evidencias) ?>)</div>
      <table class="ev-tbl">
        <?php
        $evChunks = array_chunk($evidencias, 2);
        foreach ($evChunks as $row): ?>
        <tr>
          <?php foreach ($row as $ev):
            $ruta = __DIR__ . '/../uploads/' . $ev['ruta_imagen'];
            if (!file_exists($ruta)) { echo '<td></td>'; continue; }
            $mime = mime_content_type($ruta) ?: 'image/jpeg';
            $src  = 'data:'.$mime.';base64,'.base64_encode(file_get_contents($ruta));
          ?>
          <td><img class="ev-img" src="<?= $src ?>" alt="Evidencia"></td>
          <?php endforeach; ?>
          <?php if (count($row) < 2): ?><td></td><?php endif; ?>
        </tr>
        <?php endforeach; ?>
      </table>
    </div>
    <?php endif; ?>
  </td><!-- fin col der -->

</tr>
</table>

<!-- FOOTER -->
<div class="footer">
  <table><tr>
    <td>Distribución Segura · Inspección #<?= str_pad($id,4,'0',STR_PAD_LEFT) ?> · Juliaca SST</td>
    <td style="text-align:right">Generado el <?= date('d/m/Y H:i') ?></td>
  </tr></table>
</div>

</div>
</body>
</html>
