<?php
// ============================================================
// REPORTE MENSUAL
// Archivo: api/reporte_mensual.php
// ============================================================

require_once __DIR__ . '/../includes/auth.php';
requireLogin();

$mes  = $_GET['mes'] ?? date('Y-m');
$anio = substr($mes, 0, 4);
$mesN = substr($mes, 5, 2);
$nombreMes = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][(int)$mesN];

$kpis = db()->fetchOne(
    "SELECT COUNT(*) as total, COALESCE(ROUND(AVG(resultado),1),0) as promedio,
     SUM(CASE WHEN resultado>=80 THEN 1 ELSE 0 END) as aprobadas,
     SUM(CASE WHEN resultado<80 THEN 1 ELSE 0 END) as observadas,
     COUNT(DISTINCT unidad) as unidades, COUNT(DISTINCT conductor) as conductores
     FROM inspecciones WHERE YEAR(fecha)=? AND MONTH(fecha)=?", [$anio, $mesN]);

$inspecciones = db()->fetchAll(
    "SELECT i.*, u.nombre as inspector_nombre FROM inspecciones i LEFT JOIN usuarios u ON u.id=i.inspector_id
     WHERE YEAR(i.fecha)=? AND MONTH(i.fecha)=? ORDER BY i.fecha, i.hora", [$anio, $mesN]);

$ranking = db()->fetchAll(
    "SELECT conductor, COUNT(*) as total, ROUND(AVG(resultado),1) as promedio FROM inspecciones
     WHERE YEAR(fecha)=? AND MONTH(fecha)=? GROUP BY conductor ORDER BY promedio DESC LIMIT 10", [$anio, $mesN]);

$hallazgos = db()->fetchAll(
    "SELECT h.descripcion, h.criticidad, COUNT(*) as frecuencia FROM hallazgos h
     JOIN inspecciones i ON i.id=h.inspeccion_id WHERE YEAR(i.fecha)=? AND MONTH(i.fecha)=?
     GROUP BY h.descripcion, h.criticidad ORDER BY frecuencia DESC LIMIT 10", [$anio, $mesN]);

$colorPct = floatval($kpis['promedio']) >= 80 ? '#2ECC71' : (floatval($kpis['promedio']) >= 60 ? '#F39C12' : '#E74C3C');
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Reporte Mensual <?= $nombreMes ?> <?= $anio ?> - Juliaca</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Barlow:wght@400;500;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Barlow', sans-serif; background: #fff; color: #111; font-size: 13px; padding: 0; }
  .header { background: #0A0A0A; color: #fff; padding: 24px 32px; display: flex; align-items: center; justify-content: space-between; }
  .header h1 { font-family: 'Barlow Condensed', sans-serif; font-size: 24px; font-weight: 900; color: #F5C800; text-transform: uppercase; }
  .header p { color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px; }
  .header .periodo { font-family: 'Barlow Condensed', sans-serif; font-size: 20px; font-weight: 800; color: #fff; text-align: right; }
  .header .periodo small { display: block; font-family: 'Barlow', sans-serif; font-size: 11px; color: #888; font-weight: 400; }
  .kpi-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0; border-bottom: 2px solid #F5C800; }
  .kpi { padding: 16px; border-right: 1px solid #222; background: #111; text-align: center; }
  .kpi:last-child { border-right: none; }
  .kpi .val { font-family: 'Barlow Condensed', sans-serif; font-size: 32px; font-weight: 900; color: #F5C800; line-height: 1; }
  .kpi .lbl { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
  .content { padding: 24px 32px; }
  .section-title { font-family: 'Barlow Condensed', sans-serif; font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border-left: 4px solid #F5C800; padding-left: 10px; margin: 20px 0 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { background: #f0f0f0; padding: 8px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; border-bottom: 2px solid #ddd; }
  tbody td { padding: 9px 12px; border-bottom: 1px solid #f0f0f0; color: #333; }
  tbody tr:hover { background: #fafafa; }
  .pct { font-family: 'Barlow Condensed', sans-serif; font-size: 15px; font-weight: 800; }
  .ok { color: #16a34a; } .warn { color: #d97706; } .err { color: #dc2626; }
  .print-btn { position: fixed; top: 16px; right: 16px; background: #F5C800; color: #000; border: none; border-radius: 8px; padding: 10px 20px; font-family: 'Barlow Condensed', sans-serif; font-size: 15px; font-weight: 800; text-transform: uppercase; cursor: pointer; z-index: 999; }
  @media print { .print-btn { display: none; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">🖨️ Imprimir / PDF</button>
<div class="header">
  <div>
    <h1>🛡 Reporte Mensual SST</h1>
    <p>Inspección en Ruta · Centro de Distribución Juliaca</p>
  </div>
  <div class="periodo">
    <?= strtoupper($nombreMes) ?> <?= $anio ?>
    <small>Generado el <?= date('d/m/Y H:i') ?></small>
  </div>
</div>

<div class="kpi-row">
  <div class="kpi"><div class="val"><?= $kpis['total'] ?></div><div class="lbl">Inspecciones</div></div>
  <div class="kpi"><div class="val" style="color:<?= $colorPct ?>"><?= $kpis['promedio'] ?>%</div><div class="lbl">% Cumplimiento</div></div>
  <div class="kpi"><div class="val" style="color:#2ECC71"><?= $kpis['aprobadas'] ?></div><div class="lbl">Aprobadas ≥80%</div></div>
  <div class="kpi"><div class="val" style="color:#E74C3C"><?= $kpis['observadas'] ?></div><div class="lbl">Observadas</div></div>
  <div class="kpi"><div class="val"><?= $kpis['unidades'] ?></div><div class="lbl">Unidades</div></div>
  <div class="kpi"><div class="val"><?= $kpis['conductores'] ?></div><div class="lbl">Conductores</div></div>
</div>

<div class="content">

  <!-- LISTADO -->
  <div class="section-title">Detalle de Inspecciones</div>
  <table>
    <thead><tr><th>#</th><th>Unidad</th><th>Fecha</th><th>Conductor</th><th>Dirección</th><th>Cumplimiento</th><th>Inspector</th></tr></thead>
    <tbody>
      <?php foreach ($inspecciones as $r): $p = floatval($r['resultado']); ?>
      <tr>
        <td><?= $r['id'] ?></td>
        <td><strong><?= htmlspecialchars($r['unidad']) ?></strong></td>
        <td><?= $r['fecha'] ?> <?= substr($r['hora'],0,5) ?></td>
        <td><?= htmlspecialchars($r['conductor']) ?></td>
        <td><?= htmlspecialchars($r['distrito']) ?>, <?= htmlspecialchars($r['provincia']) ?></td>
        <td><span class="pct <?= $p>=80?'ok':($p>=60?'warn':'err') ?>"><?= $p ?>%</span></td>
        <td><?= htmlspecialchars($r['inspector_nombre']??'—') ?></td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>

  <!-- RANKING -->
  <div class="section-title">Ranking de Conductores</div>
  <table>
    <thead><tr><th>Pos.</th><th>Conductor</th><th>Inspecciones</th><th>Promedio</th></tr></thead>
    <tbody>
      <?php foreach ($ranking as $k => $r): $p = floatval($r['promedio']); ?>
      <tr>
        <td><strong><?= $k+1 ?></strong></td>
        <td><?= htmlspecialchars($r['conductor']) ?></td>
        <td><?= $r['total'] ?></td>
        <td><span class="pct <?= $p>=80?'ok':($p>=60?'warn':'err') ?>"><?= $p ?>%</span></td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>

  <!-- HALLAZGOS -->
  <?php if ($hallazgos): ?>
  <div class="section-title">Hallazgos más Frecuentes</div>
  <table>
    <thead><tr><th>Hallazgo</th><th>Criticidad</th><th>Frecuencia</th></tr></thead>
    <tbody>
      <?php foreach ($hallazgos as $h): ?>
      <tr>
        <td><?= htmlspecialchars($h['descripcion']) ?></td>
        <td style="text-transform:uppercase;font-size:11px;font-weight:700"><?= $h['criticidad'] ?></td>
        <td><?= $h['frecuencia'] ?>x</td>
      </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
  <?php endif; ?>

  <div style="margin-top:32px;padding-top:16px;border-top:2px solid #F5C800;display:flex;justify-content:space-between;font-size:11px;color:#999">
    <span>Reporte Mensual SST · Juliaca · <?= $nombreMes ?> <?= $anio ?></span>
    <span>Generado: <?= date('d/m/Y H:i') ?></span>
  </div>
</div>
</body>
</html>
