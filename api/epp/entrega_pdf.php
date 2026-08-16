<?php
// ============================================================
// Registro oficial de ENTREGA DE EPP — formato R.M. 050-2013-TR
// Archivo: api/epp/entrega_pdf.php?id=NN
// Página HTML imprimible (Ctrl+P / "Guardar como PDF"). Fiscalizable por SUNAFIL.
// Los campos en blanco son editables (contenteditable) para completarlos a mano
// antes de imprimir; el resaltado amarillo desaparece en la impresión.
// ============================================================

require_once __DIR__ . '/../../includes/auth.php';
requireLogin();
setupEpp();

$id = (int)($_GET['id'] ?? 0);
if ($id <= 0) { http_response_code(400); die('ID inválido'); }

$ent = db()->fetchOne("SELECT * FROM epp_entregas WHERE id = ?", [$id]);
if (!$ent) { http_response_code(404); die('Entrega no encontrada'); }

// Ítems + código del EPP (join al catálogo por si cambió el snapshot).
$items = db()->fetchAll(
    "SELECT i.tipo_nombre, i.cantidad, i.fecha_renovacion, t.codigo
       FROM epp_entrega_items i
       LEFT JOIN epp_tipos t ON t.id = i.tipo_epp_id
      WHERE i.entrega_id = ? ORDER BY i.id ASC",
    [$id]
);

// Configuración (empleador, centro de trabajo, control de documento).
$cfg = [];
foreach (db()->fetchAll("SELECT clave, valor FROM epp_config") as $r) $cfg[$r['clave']] = $r['valor'] ?? '';

$MOTIVOS = [
    'nuevo'      => 'Entrega',
    'renovacion' => 'Renovación',
    'reposicion' => 'Reposición',
    'perdida'    => 'Reposición por pérdida',
];

$h = fn($s) => htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
$fmtFecha = function ($f) {
    if (!$f) return '';
    $ts = strtotime($f);
    return $ts ? date('d/m/Y', $ts) : $f;
};

// Logo de la app (incrustado en base64).
$logoPath = __DIR__ . '/../../assets/img/logo-camion.png';
$logo = is_file($logoPath) ? 'data:image/png;base64,' . base64_encode(file_get_contents($logoPath)) : '';

$nData = count($items);
$minRows = 6;                       // filas mínimas (aspecto de formulario)
$fillers = max(0, $minRows - $nData);
$rowsAll = max($nData + $fillers, 1);
$motivoTxt = $MOTIVOS[$ent['motivo']] ?? $ent['motivo'];
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Registro entrega EPP #<?= $id ?> · <?= $h($ent['trabajador_nombre']) ?></title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; font-size: 11px; background: #f3f4f6; }
  .sheet { background: #fff; width: 277mm; margin: 0 auto; padding: 8mm; }

  .toolbar { max-width: 277mm; margin: 12px auto; display: flex; gap: 8px; justify-content: flex-end; align-items: center; }
  .toolbar .hint { margin-right: auto; font-size: 12px; color: #555; }
  .toolbar button { font: inherit; font-size: 13px; padding: 8px 16px; border: 0; border-radius: 6px; cursor: pointer; }
  .btn-print { background: #1565C0; color: #fff; }
  .btn-back  { background: #e5e7eb; color: #111; }

  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #000; padding: 4px 6px; vertical-align: middle; }

  /* Cabecera */
  .head td { padding: 6px; }
  .head .logo { width: 20%; text-align: center; }
  .head .logo img { max-height: 46px; max-width: 100%; }
  .head .title { text-align: center; font-weight: 800; font-size: 15px; text-transform: uppercase; }
  .head .ctrl { width: 24%; padding: 0; }
  .head .ctrl table { height: 100%; }
  .head .ctrl td { font-size: 10px; }
  .head .ctrl .k { background: #f0f0f0; font-weight: 700; width: 42%; }

  .sec td { background: #d9d9d9; font-weight: 700; font-size: 11px; padding: 3px 6px; }
  .lbl { background: #f0f0f0; font-weight: 700; font-size: 9.5px; }
  .val { font-size: 11px; }
  .c { text-align: center; }

  .epp th { background: #f0f0f0; font-weight: 700; font-size: 9.5px; text-align: center; line-height: 1.25; }
  .epp td { height: 30px; font-size: 11px; }
  .epp .nm { text-align: center; font-size: 13px; }
  .firma-cell { text-align: center; vertical-align: middle; }
  .firma-cell img { max-height: 90px; max-width: 95%; }

  .foot td { height: 40px; font-size: 10px; vertical-align: top; }
  .foot .k { font-weight: 700; background: #f0f0f0; }

  /* Campos de llenado editables */
  .fill { cursor: text; }
  .fill-line { display: inline-block; min-width: 130px; cursor: text; }
  @media screen {
    .fill, .fill-line { background: #fffbe6; box-shadow: inset 0 -1px 0 #e0c34a; }
    .fill:focus, .fill-line:focus { background: #fff6bf; outline: 2px solid #f5c800; }
  }
  @media print {
    .fill, .fill-line { background: transparent !important; box-shadow: none !important; outline: 0 !important; }
  }

  .anulada { position: fixed; top: 40%; left: 0; right: 0; text-align: center; font-size: 100px; color: rgba(220,38,38,.18); font-weight: 900; transform: rotate(-16deg); letter-spacing: 8px; pointer-events: none; }

  @media print {
    body { background: #fff; }
    .toolbar { display: none; }
    .sheet { width: auto; margin: 0; padding: 0; }
  }
</style>
</head>
<body>

<div class="toolbar">
  <span class="hint">✏️ Haz clic en los campos resaltados para completarlos; el resaltado no se imprime.</span>
  <button class="btn-back" onclick="window.close(); history.back();">← Volver</button>
  <button class="btn-print" onclick="window.print()">🖨 Imprimir / Guardar PDF</button>
</div>

<div class="sheet">
  <?php if ($ent['estado'] === 'anulada'): ?><div class="anulada">ANULADA</div><?php endif; ?>

  <!-- Cabecera: logo | título | control de documento -->
  <table class="head">
    <tr>
      <td class="logo"><?php if ($logo): ?><img src="<?= $logo ?>" alt="Logo"><?php else: ?><strong><?= $h($cfg['emp_razon_social'] ?: 'EMPRESA') ?></strong><?php endif; ?></td>
      <td class="title">Registro de Entrega de Equipos de Protección Personal</td>
      <td class="ctrl">
        <table>
          <tr><td class="k">Código</td><td class="fill" contenteditable="true"><?= $h($cfg['doc_codigo']) ?></td></tr>
          <tr><td class="k">Versión</td><td class="fill" contenteditable="true"><?= $h($cfg['doc_version']) ?></td></tr>
          <tr><td class="k">Fecha</td><td class="fill" contenteditable="true"><?= $h($cfg['doc_fecha']) ?></td></tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Datos del empleador principal -->
  <table>
    <tr class="sec"><td colspan="5">Datos del Empleador Principal:</td></tr>
    <tr class="lbl">
      <td style="width:26%">Razón Social:</td><td style="width:16%">RUC:</td>
      <td style="width:26%">Domicilio:</td><td style="width:20%">Tipo de Actividad Económica</td>
      <td style="width:12%">N° Trabajadores</td>
    </tr>
    <tr class="val c" style="height:34px">
      <td class="fill" contenteditable="true"><?= $h($cfg['emp_razon_social']) ?></td>
      <td class="fill" contenteditable="true"><?= $h($cfg['emp_ruc']) ?></td>
      <td class="fill" contenteditable="true"><?= $h($cfg['emp_domicilio']) ?></td>
      <td class="fill" contenteditable="true"><?= $h($cfg['emp_actividad']) ?></td>
      <td class="fill" contenteditable="true"><?= $h($cfg['emp_num_trab']) ?></td>
    </tr>
  </table>

  <!-- Datos del centro de trabajo -->
  <table>
    <tr class="sec"><td colspan="4">Datos del Centro de Trabajo:</td></tr>
    <tr class="lbl">
      <td style="width:26%">Centro de Trabajo</td><td style="width:32%">Domicilio:</td>
      <td style="width:30%">Responsable del Centro de Trabajo</td><td style="width:12%">N° Trabajadores</td>
    </tr>
    <tr class="val c" style="height:34px">
      <td class="fill" contenteditable="true"><?= $h($cfg['ct_nombre']) ?></td>
      <td class="fill" contenteditable="true"><?= $h($cfg['ct_domicilio']) ?></td>
      <td class="fill" contenteditable="true"><?= $h($cfg['ct_responsable']) ?></td>
      <td class="fill" contenteditable="true"><?= $h($cfg['ct_num_trab']) ?></td>
    </tr>
  </table>

  <!-- Datos del trabajador (Código / Área / Tiempo son editables) -->
  <table>
    <tr class="sec"><td colspan="6">Datos de trabajador al que se le hace entrega los Equipos de Protección Personal:</td></tr>
    <tr class="lbl">
      <td style="width:24%">Nombres y Apellidos:</td><td style="width:14%">DNI:</td>
      <td style="width:14%">Código:</td><td style="width:18%">Área:</td>
      <td style="width:18%">Tiempo en la empresa</td><td style="width:12%">Foto: (no indispensable)</td>
    </tr>
    <tr class="val c" style="height:44px">
      <td class="fill" contenteditable="true"><?= $h($ent['trabajador_nombre']) ?></td>
      <td class="fill" contenteditable="true"><?= $h($ent['trabajador_dni']) ?></td>
      <td class="fill" contenteditable="true"></td>
      <td class="fill" contenteditable="true"><?= $h(ucfirst($ent['trabajador_cargo'] ?? '')) ?></td>
      <td class="fill" contenteditable="true"></td>
      <td class="fill" contenteditable="true"></td>
    </tr>
  </table>

  <!-- Listado de entrega de EPP (Código EPP y filas vacías editables) -->
  <table class="epp">
    <tr class="sec"><td colspan="7">Listado de entrega de Equipos de Protección Personal (EPP):</td></tr>
    <tr>
      <th style="width:18%">Equipo de Protección Personal (EPP)</th>
      <th style="width:12%">Código EPP</th>
      <th style="width:13%">Fecha de Entrega<br>(DD/MM/AA)</th>
      <th style="width:11%">Motivo</th>
      <th style="width:13%">Fecha de Renovación<br>(DD/MM/AA)</th>
      <th style="width:17%">Nombre de la persona quien entrega el EPP</th>
      <th style="width:16%">Firma</th>
    </tr>
    <?php for ($i = 0; $i < $rowsAll; $i++): $it = $i < $nData ? $items[$i] : null; ?>
    <tr>
      <?php if ($it): ?>
      <td class="nm"><?= $h($it['tipo_nombre']) ?></td>
      <td class="c fill" contenteditable="true"><?= $h($it['codigo']) ?></td>
      <td class="c"><?= $fmtFecha($ent['fecha']) ?></td>
      <td class="c"><?= $h($motivoTxt) ?></td>
      <td class="c"><?= $fmtFecha($it['fecha_renovacion']) ?></td>
      <td class="c"><?= $h($ent['entregado_por_nombre']) ?></td>
      <?php else: ?>
      <td class="nm fill" contenteditable="true"></td>
      <td class="c fill" contenteditable="true"></td>
      <td class="c fill" contenteditable="true"></td>
      <td class="c fill" contenteditable="true"></td>
      <td class="c fill" contenteditable="true"></td>
      <td class="c fill" contenteditable="true"></td>
      <?php endif; ?>
      <!-- Firma por fila en blanco: el trabajador firma cada renglón a mano. -->
      <td>&nbsp;</td>
    </tr>
    <?php endfor; ?>
  </table>

  <!-- Responsable de registro. La firma digital capturada va aquí (Firma:). -->
  <table class="foot">
    <tr class="sec"><td colspan="4">Responsable de Registro:</td></tr>
    <tr>
      <td class="k" style="width:34%">Nombre:&nbsp; <?= $h($cfg['emp_responsable']) ?></td>
      <td class="k" style="width:22%">Cargo:&nbsp; <span class="fill-line" contenteditable="true">&nbsp;</span></td>
      <td class="k" style="width:22%">Fecha:&nbsp; <span class="fill-line" contenteditable="true">&nbsp;</span></td>
      <?php $firmaResp = $ent['firma_entrega'] ?? ''; ?>
      <td class="k" style="width:22%;text-align:center;vertical-align:middle">Firma:
        <?php if (!empty($firmaResp)): ?>
          <div class="firma-cell" style="border:0;padding:0"><img src="<?= $h($firmaResp) ?>" alt="Firma" style="max-height:52px;max-width:90%"></div>
        <?php endif; ?>
      </td>
    </tr>
  </table>

  <p style="font-size:8px;color:#666;margin-top:6px;line-height:1.3">
    Registro obligatorio conforme a la Ley N° 29783 (Art. 60), su Reglamento D.S. 005-2012-TR (Art. 97) y la R.M. 050-2013-TR.
    Generado el <?= date('d/m/Y H:i') ?> · N° <?= str_pad((string)$id, 6, '0', STR_PAD_LEFT) ?>.
  </p>
</div>

</body>
</html>
