<?php
// ============================================================
// PÁGINA PÚBLICA: Formulario de evaluación (Link / QR, SIN login)
// Cualquier persona puede abrir ?eval=<formulario_id>, llenarlo
// y enviarlo. No carga el panel de administración.
// ============================================================

require_once __DIR__ . '/includes/auth.php';   // solo db()/formularioEsValido(); NO requireLogin()

$evalId  = trim($_GET['eval'] ?? '');
$valido  = formularioEsValido($evalId);

// Meta para mostrar título antes de que cargue el JS
$titulo = 'Evaluación';
$color  = '#1565C0';
if ($valido) {
    try {
        $m = db()->fetchOne(
            "SELECT titulo, color FROM eval_formularios WHERE formulario_id = ? AND activo = 1",
            [$evalId]
        );
        if ($m) { $titulo = $m['titulo']; $color = $m['color']; }
    } catch (Exception $e) { /* usar defaults */ }
}
?>
<!DOCTYPE html>
<html lang="es" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="<?= htmlspecialchars($color, ENT_QUOTES) ?>">
<meta name="robots" content="noindex,nofollow">
<title><?= htmlspecialchars($titulo, ENT_QUOTES) ?> · Distribución Segura</title>
<link rel="icon" type="image/png" href="assets/img/logo-camion.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link rel="stylesheet" href="assets/css/main.css?v=<?= @filemtime(__DIR__.'/assets/css/main.css') ?>">
<style>
  body { background: var(--gris-900, #eef1f5); min-height: 100vh; }
  .evp-wrap { max-width: 820px; margin: 0 auto; padding: 0 14px 60px; }
  .evp-topbar {
    background: <?= htmlspecialchars($color, ENT_QUOTES) ?>;
    color: #fff; padding: 16px 18px; display: flex; align-items: center; gap: 12px;
    box-shadow: 0 2px 10px rgba(0,0,0,.15); position: sticky; top: 0; z-index: 50;
  }
  .evp-topbar img { width: 42px; height: 34px; object-fit: contain; }
  .evp-topbar .t { font-family: var(--font-display, 'Barlow Condensed'); font-weight: 800; font-size: 18px; line-height: 1.1; }
  .evp-topbar .s { font-size: 11px; opacity: .85; letter-spacing: .5px; }
  .evp-intro { text-align: center; padding: 22px 6px 10px; }
  .evp-intro h1 { font-family: var(--font-display, 'Barlow Condensed'); font-weight: 800; font-size: 22px; color: var(--gris-100, #223); }
  .evp-intro p { color: var(--gris-400, #667); font-size: 13px; margin-top: 4px; }
  .evp-loading, .evp-error { text-align: center; padding: 60px 20px; color: var(--gris-400, #667); }
  .evp-error i { font-size: 40px; color: var(--rojo, #dc3545); margin-bottom: 14px; display: block; }
  .evp-submit-bar { display: flex; justify-content: flex-end; gap: 12px; padding-top: 4px; }
  /* Pantalla de resultado */
  .evp-result { text-align: center; padding: 36px 20px; }
  .evp-result .ring {
    width: 150px; height: 150px; border-radius: 50%; margin: 0 auto 18px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    border: 8px solid var(--gris-600, #ccc);
  }
  .evp-result .pct { font-family: var(--font-display, 'Barlow Condensed'); font-weight: 900; font-size: 38px; line-height: 1; }
  .evp-result .pts { font-size: 12px; color: var(--gris-400, #667); margin-top: 2px; }
  .evp-result h2 { font-family: var(--font-display, 'Barlow Condensed'); font-weight: 800; font-size: 22px; margin-bottom: 6px; }
  .evp-result p  { color: var(--gris-400, #667); font-size: 13px; }

  /* ── Optimización para celular ── */
  @media (max-width: 600px) {
    .evp-wrap { padding: 0 8px 48px; }
    .evp-topbar { padding: 12px 14px; }
    .evp-topbar .t { font-size: 16px; }
    .evp-intro { padding: 16px 4px 6px; }
    .evp-intro h1 { font-size: 19px; }
    .evp-wrap .card-body { padding: 14px 12px; }
    .evp-wrap .card-header { padding: 12px 14px; }
    .evp-wrap .card-header h3 { font-size: 14px; }
    /* Tabla APLICA / NO APLICA más compacta y legible */
    .evp-wrap table th { padding: 6px 6px !important; font-size: 11px !important; }
    .evp-wrap table td { padding: 8px 6px !important; font-size: 12px !important; }
    /* Opciones de respuesta con mayor área táctil */
    .evp-opcion-label { padding: 12px !important; font-size: 14px !important; }
    /* Botón enviar a todo el ancho para pulsar cómodo */
    .evp-submit-bar { padding: 4px 0 0; }
    .evp-submit-bar .btn { width: 100%; justify-content: center; padding: 14px; font-size: 15px; }
  }
</style>
</head>
<body>

<div class="evp-topbar">
  <img src="assets/img/logo-camion.png" alt="Logo">
  <div>
    <div class="t">DISTRIBUCIÓN SEGURA</div>
    <div class="s">SST · Juliaca</div>
  </div>
</div>

<div class="evp-wrap">
<?php if (!$valido): ?>
  <div class="evp-error">
    <i class="fas fa-triangle-exclamation"></i>
    <div style="font-size:16px;font-weight:700;color:var(--gris-100,#223);margin-bottom:6px">Formulario no disponible</div>
    <div>El enlace no es válido o la evaluación ya no está activa.</div>
  </div>
<?php else: ?>
  <div id="evp-root">
    <div class="evp-loading"><div class="spinner" style="margin:0 auto 12px"></div>Cargando formulario…</div>
  </div>
<?php endif; ?>
</div>

<?php if ($valido): ?>
<script>
  window.EVAL_PUBLICO_ID = <?= json_encode($evalId) ?>;
</script>
<script src="assets/js/modulos/eval_publico.js?v=<?= @filemtime(__DIR__.'/assets/js/modulos/eval_publico.js') ?>"></script>
<?php endif; ?>
</body>
</html>
