<?php
require_once __DIR__ . '/includes/auth.php';
requireLogin();
$user = getCurrentUser();
$csrf = csrfToken();
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<script>
/* Aplica el tema guardado ANTES de pintar, para evitar parpadeo.
   'auto' sigue la preferencia del sistema operativo. */
(function () {
  try {
    var pref = localStorage.getItem('dist-segura-tema') || 'dark';
    var dark = pref === 'dark' ||
      (pref === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();
</script>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#1D222B">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Dist. Segura">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="/distribucion-segura/manifest.json">
<link rel="apple-touch-icon" href="/distribucion-segura/assets/img/logo-camion.png">
<meta name="csrf-token" content="<?= htmlspecialchars($csrf, ENT_QUOTES) ?>">
<meta name="user-rol" content="<?= htmlspecialchars($user['rol'], ENT_QUOTES) ?>">
<meta name="user-nombre" content="<?= htmlspecialchars($user['nombre'], ENT_QUOTES) ?>">
<title>Distribución Segura</title>
<link rel="icon" type="image/png" href="assets/img/logo-camion.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Inter+Tight:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link rel="stylesheet" href="assets/css/main.css?v=<?= filemtime(__DIR__.'/assets/css/main.css') ?>">
<?php if (tieneAccesoModulo('geocercas')): ?>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css">
<?php endif; ?>
<style>
.modulo-check {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-radius: 8px;
  border: 1px solid var(--gris-600);
  background: var(--gris-700);
  cursor: pointer; font-size: 13px;
  color: var(--gris-300); font-weight: 500;
  transition: all .15s;
}
.modulo-check:hover { border-color: var(--primary); color: var(--primary); background: var(--primary-light); }
.modulo-check input[type=checkbox] { accent-color: var(--primary); width:15px; height:15px; cursor:pointer; }
.modulo-check input[type=checkbox]:disabled { cursor: not-allowed; opacity:.5; }
.modulo-check i { color: var(--primary); font-size:13px; }
/* ── Geocercas sub-módulo tabs ── */
.geo-tab-btn {
  background: #fff !important;
  border: 2px solid #CDD3D8 !important;
  border-radius: 50px !important;
  color: #73879C !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  padding: 8px 20px !important;
  margin: 0 4px 0 0 !important;
  margin-bottom: 0 !important;
  letter-spacing: 0.3px !important;
  text-transform: none !important;
  transition: all .2s !important;
  box-shadow: none !important;
}
.geo-tab-btn:hover {
  border-color: #98A6AD !important;
  color: #2A3F54 !important;
  background: #F5F7FA !important;
  transform: translateY(-1px);
}
.geo-tab-btn.active[data-tipo="ruta_critica"] {
  background: #F39C12 !important;
  border-color: #F39C12 !important;
  color: #fff !important;
  box-shadow: 0 3px 10px rgba(243,156,18,.35) !important;
}
.geo-tab-btn.active[data-tipo="zona_n3"] {
  background: #3498DB !important;
  border-color: #3498DB !important;
  color: #fff !important;
  box-shadow: 0 3px 10px rgba(52,152,219,.35) !important;
}
.geo-tab-btn.active[data-tipo="zona_roja"] {
  background: #E74C3C !important;
  border-color: #E74C3C !important;
  color: #fff !important;
  box-shadow: 0 3px 10px rgba(231,76,60,.35) !important;
}
.geo-tab-btn.active i { color: #fff !important; }
/* ── */
.bp-tab-btn { padding:8px 18px;border-radius:50px;border:2px solid var(--gris-600);background:transparent;color:var(--gris-400);font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;font-family:var(--font-body);display:inline-flex;align-items:center;gap:6px; }
.bp-tab-btn:hover { border-color:var(--primary);color:var(--primary); }
.bp-tab-btn.active { background:var(--primary);border-color:var(--primary);color:#fff;box-shadow:0 3px 10px rgba(21,101,192,.3); }
.amon-pag-bar { display:flex;align-items:center;justify-content:space-between;padding:10px 4px 4px;flex-wrap:wrap;gap:8px; }
.amon-pag-info { font-size:12px;color:var(--gris-400); }
.amon-pag-btns { display:flex;gap:4px;flex-wrap:wrap; }
.amon-pag-btns button { min-width:32px;height:32px;padding:0 8px;border-radius:4px;border:1px solid var(--gris-600);background:#fff;color:var(--gris-300);font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;font-family:var(--font-body); }
.amon-pag-btns button:hover { border-color:var(--primary);color:var(--primary); }
.amon-pag-btns button.active { background:var(--primary);border-color:var(--primary);color:#fff; }
.amon-pag-btns button:disabled { opacity:.4;cursor:not-allowed; }
.geo-icon-btn { width:34px;height:34px;border-radius:50%;border:2px solid transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all .15s;color:#fff; }
.geo-icon-btn:hover { transform:scale(1.15); }
.geo-icon-btn.selected { outline:3px solid currentColor; outline-offset:2px; }
.geo-share-opt { display:flex;align-items:center;gap:10px;width:100%;padding:9px 14px;background:none;border:none;cursor:pointer;font-size:13px;color:#2A3F54;font-family:'Inter',sans-serif;transition:background .15s;text-align:left; }
.geo-share-opt:hover { background:#F5F7FA; }
.geo-share-opt i { width:16px;font-size:13px;color:var(--primary);flex-shrink:0; }
@media print { body > *:not(#printMapWrap) { display:none!important; } #printMapWrap { display:block!important; } }
</style>
</head>
<body data-rol="<?= htmlspecialchars($user['rol'] ?? '', ENT_QUOTES) ?>">

<!-- SIDEBAR OVERLAY (mobile) -->
<div class="sidebar-overlay" id="sidebarOverlay" onclick="closeSidebar()"></div>

<!-- ===== SIDEBAR ===== -->
<aside class="sidebar" id="sidebar">
  <div class="sidebar-header">
    <div class="sidebar-logo">
      <div class="logo-badge" style="background:none;box-shadow:none;padding:0;overflow:hidden">
        <img src="assets/img/logo-camion.png" alt="Logo" style="width:54px;height:44px;object-fit:contain;display:block">
      </div>
      <div class="logo-text">
        Distribución Segura
        <span>SST · Juliaca</span>
      </div>
    </div>
  </div>

  <nav class="sidebar-nav">


    <div class="nav-section-title">Inicio</div>
    <a class="nav-item active" data-page="dashboard" onclick="showPage('dashboard')">
      <i class="fas fa-gauge-high"></i> Dashboard
    </a>


    <?php if (tieneAccesoModulo('inspecciones') || tieneAccesoModulo('personal') || tieneAccesoModulo('geocercas') || tieneAccesoModulo('vehiculos') || tieneAccesoModulo('empresas') || tieneAccesoModulo('checklist')): ?>
    <div class="nav-section-title" style="margin-top:12px">Operaciones</div>
    <?php endif; ?>
    <?php if (tieneAccesoModulo('inspecciones')): ?>
    <a class="nav-item" data-page="inspecciones" onclick="showPage('inspecciones')">
      <i class="fas fa-clipboard-check"></i> Abordajes
    </a>
    <?php endif; ?>
    <?php if (tieneAccesoModulo('personal')): ?>
    <a class="nav-item" data-page="personal" onclick="showPage('personal')">
      <i class="fas fa-users-gear"></i> Personal
    </a>
    <?php endif; ?>
    <?php if (tieneAccesoModulo('geocercas')): ?>
    <a class="nav-item" data-page="geocercas" onclick="showPage('geocercas');setTimeout(initGeoMap,80)">
      <i class="fas fa-map-location-dot"></i> Geocercas
    </a>
    <?php endif; ?>
    <?php if (tieneAccesoModulo('vehiculos')): ?>
    <a class="nav-item" data-page="vehiculos" onclick="showPage('vehiculos')">
      <i class="fas fa-truck"></i> Vehículos
    </a>
    <?php endif; ?>
    <?php if (tieneAccesoModulo('checklist')): ?>
    <a class="nav-item" data-page="checklist" onclick="showPage('checklist')">
      <i class="fas fa-clipboard-check"></i> Checklist
    </a>
    <?php endif; ?>


    <?php if (tieneAccesoModulo('evaluaciones') || tieneAccesoModulo('capacitaciones')): ?>
    <div class="nav-section-title" style="margin-top:12px">Capacitación</div>
    <?php endif; ?>
    <?php if (tieneAccesoModulo('evaluaciones')): ?>
    <a class="nav-item" data-page="evaluaciones" onclick="showPage('evaluaciones')">
      <i class="fas fa-clipboard-check"></i> Evaluaciones
    </a>
    <?php endif; ?>
    <?php if (tieneAccesoModulo('capacitaciones')): ?>
    <a class="nav-item" data-page="capacitaciones" onclick="showPage('capacitaciones')">
      <i class="fas fa-chalkboard-user"></i> Capacitaciones
    </a>
    <?php endif; ?>

    <?php if (tieneAccesoModulo('amonestaciones') || tieneAccesoModulo('matriz') || tieneAccesoModulo('epp')): ?>
    <div class="nav-section-title" style="margin-top:12px">Seguridad</div>
    <?php endif; ?>
    <?php if (tieneAccesoModulo('epp')): ?>
    <a class="nav-item" data-page="epp" onclick="showPage('epp')">
      <i class="fas fa-helmet-safety"></i> EPP
    </a>
    <?php endif; ?>
    <?php if (tieneAccesoModulo('amonestaciones')): ?>
    <a class="nav-item" data-page="amonestaciones" onclick="showPage('amonestaciones')">
      <i class="fas fa-triangle-exclamation"></i> Matriz Amonestaciones
    </a>
    <?php endif; ?>
    <?php if (tieneAccesoModulo('documentos')): ?>
    <a class="nav-item" data-page="documentos" onclick="showPage('documentos')">
      <i class="fas fa-folder-open"></i> Documentos
    </a>
    <?php endif; ?>
    <?php /* Matriz Consecuencias ahora se abre desde un botón dentro de Matriz Amonestaciones */ ?>




    <?php if (tieneAccesoModulo('kpi_analytics')): ?>
    <div class="nav-section-title" style="margin-top:12px">Analítica</div>
    <a class="nav-item" data-page="kpi-analytics" onclick="showPage('kpi-analytics');<?= $user['rol'] === 'administrador' ? 'kpiDatasetsInit()' : 'tlmrInit()' ?>">
      <i class="fas fa-chart-line"></i> KPI Analytics
    </a>
    <?php endif; ?>

    <?php if ($user['rol'] === 'administrador'): ?>
    <div class="nav-section-title" style="margin-top:12px">Administración</div>
    <a class="nav-item" data-page="empresas" onclick="showPage('empresas')">
      <i class="fas fa-building"></i> Empresas
    </a>
    <a class="nav-item" data-page="usuarios" onclick="showPage('usuarios')">
      <i class="fas fa-user-shield"></i> Usuarios
    </a>
    <?php endif; ?>
  </nav>

  <div class="sidebar-footer">
    <div class="user-pill">
      <div class="user-avatar"><i class="fas fa-user"></i></div>
      <div class="user-info">
        <div class="user-name"><?= htmlspecialchars($user['nombre']) ?></div>
        <div class="user-role"><?= htmlspecialchars($user['rol']) ?></div>
      </div>
      <button class="btn-logout" onclick="logout()" title="Cerrar sesión">
        <i class="fas fa-sign-out-alt"></i>
      </button>
    </div>
  </div>
</aside>

<!-- ===== MAIN ===== -->
<main class="main-content">
  <!-- TOPBAR -->
  <div class="topbar">
    <div style="display:flex;align-items:center;gap:14px">
      <button class="hamburger" onclick="toggleSidebar()"><i class="fas fa-bars"></i></button>
      <div class="topbar-title"><span>DISTRIBUCIÓN SEGURA</span> — JULIACA</div>
    </div>
    <div class="topbar-actions">
      <div class="theme-switch" role="group" aria-label="Tema de la interfaz">
        <button type="button" class="theme-opt" data-theme-choice="light" onclick="setTheme('light')" title="Tema claro" aria-label="Tema claro"><i class="fas fa-sun"></i></button>
        <button type="button" class="theme-opt" data-theme-choice="dark" onclick="setTheme('dark')" title="Tema oscuro" aria-label="Tema oscuro"><i class="fas fa-moon"></i></button>
        <button type="button" class="theme-opt" data-theme-choice="auto" onclick="setTheme('auto')" title="Automático (según tu sistema)" aria-label="Tema automático"><i class="fas fa-circle-half-stroke"></i></button>
      </div>
      <div style="font-size:12px;color:var(--gris-400)" id="clock"></div>
    </div>
  </div>

  <!-- ===== PAGE: DASHBOARD ===== -->
  <?php require_once __DIR__ . '/vistas/dashboard.php'; ?>

  <?php if (tieneAccesoModulo('inspecciones')): ?>
  <!-- ===== PAGE: INSPECCIONES (listado + nueva) ===== -->
  <?php require_once __DIR__ . '/vistas/inspecciones.php'; ?>
  <?php endif; // inspecciones ?>

  <?php if (tieneAccesoModulo('personal')): ?>
  <!-- ===== PAGE: PERSONAL ===== -->
  <?php require_once __DIR__ . '/vistas/personal.php'; ?>
  <?php endif; // personal ?>


  <!-- ===== PAGE: USUARIOS ===== -->
  <?php if ($user['rol'] === 'administrador'): ?>
  <?php require_once __DIR__ . '/vistas/usuarios.php'; ?>
  <?php endif; ?>

  <?php if (tieneAccesoModulo('amonestaciones')): ?>
  <!-- ===== PAGE: AMONESTACIONES ===== -->
  <?php require_once __DIR__ . '/vistas/amonestaciones.php'; ?>
  <?php endif; // amonestaciones ?>

  <?php if (tieneAccesoModulo('amonestaciones')): ?>
  <!-- ===== PAGE: KPI AMONESTACIONES ===== -->
  <?php require_once __DIR__ . '/vistas/kpi_amonestaciones.php'; ?>
  <?php endif; // kpi-amonestaciones ?>


  <?php if (tieneAccesoModulo('matriz')): ?>
  <div class="page-content" id="page-matriz" style="display:none">
    <button class="btn btn-outline btn-sm" onclick="showPage('amonestaciones')" style="margin-bottom:12px">
      <i class="fas fa-arrow-left"></i> Volver a Amonestaciones
    </button>
    <div id="matriz-root"></div>
  </div>
  <?php endif; ?>

  <?php if (tieneAccesoModulo('geocercas')): ?>
  <?php require_once __DIR__ . '/vistas/geocercas.php'; ?>
  <?php endif; ?>

  <?php if (tieneAccesoModulo('capacitaciones')): ?>
  <?php require_once __DIR__ . '/vistas/capacitaciones.php'; ?>
  <?php endif; ?>

  <?php if (tieneAccesoModulo('evaluaciones')): ?>
  <?php require_once __DIR__ . '/vistas/evaluaciones.php'; ?>
  <?php endif; ?>

  <?php if (tieneAccesoModulo('epp')): ?>
  <?php require_once __DIR__ . '/vistas/epp.php'; ?>
  <?php endif; ?>

  <?php if (tieneAccesoModulo('empresas')): ?>
  <?php require_once __DIR__ . '/vistas/empresas.php'; ?>
  <?php endif; ?>

  <?php if (tieneAccesoModulo('documentos')): ?>
  <?php require_once __DIR__ . '/vistas/documentos.php'; ?>
  <?php endif; ?>

  <?php if (tieneAccesoModulo('checklist')): ?>
  <?php require_once __DIR__ . '/vistas/checklist.php'; ?>
  <?php endif; ?>

  <?php if (tieneAccesoModulo('vehiculos')): ?>
  <?php require_once __DIR__ . '/vistas/vehiculos.php'; ?>
  <?php endif; ?>

  <?php require_once __DIR__ . '/vistas/kpi_analytics.php'; ?>
</main>

<?php require_once __DIR__ . '/vistas/modales.php'; ?>

<!-- TOAST CONTAINER -->
<div class="toast-container" id="toastContainer"></div>

<!-- ===== SCRIPTS ===== -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<script src="assets/js/vendor/xlsx.full.min.js"></script>
<?php if (tieneAccesoModulo('kpi_analytics')): ?>
<script src="assets/js/vendor/apexcharts.min.js"></script>
<?php endif; ?>
<!-- Leaflet (para módulo Geocercas) -->
<?php if (tieneAccesoModulo('geocercas')): ?>
<script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js"></script>
<?php endif; ?>
<!-- Captura a imagen — compartido por Geocercas (mapa) y Matriz (tabla PNG) -->
<?php if (tieneAccesoModulo('geocercas') || tieneAccesoModulo('matriz')): ?>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<?php endif; ?>
<!-- React (para módulo Matriz) — JSX pre-compilado, sin Babel en el navegador -->
<?php if (tieneAccesoModulo('matriz')): ?>
<script src="https://cdn.jsdelivr.net/npm/react@18/umd/react.production.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>
<?php endif; ?>
<!-- JS separado por módulo -->
<script src="assets/js/core.js?v=<?= filemtime(__DIR__.'/assets/js/core.js') ?>&r=3"></script>
<script src="assets/js/modulos/dashboard.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/dashboard.js') ?>&r=3"></script>
<script src="assets/js/modulos/inspecciones.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/inspecciones.js') ?>&r=3"></script>
<script src="assets/js/modulos/personal.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/personal.js') ?>"></script>
<script src="assets/js/modulos/amonestaciones.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/amonestaciones.js') ?>"></script>
<script src="assets/js/modulos/usuarios.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/usuarios.js') ?>"></script>
<?php if (tieneAccesoModulo('evaluaciones')): ?>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script src="assets/js/modulos/evaluaciones.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/evaluaciones.js') ?>"></script>
<?php if ($user['rol'] === 'administrador'): ?>
<script src="assets/js/modulos/banco_preguntas.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/banco_preguntas.js') ?>"></script>
<?php endif; ?>
<?php endif; ?>
<?php if (tieneAccesoModulo('capacitaciones')): ?>
<script src="assets/js/modulos/capacitaciones.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/capacitaciones.js') ?>"></script>
<?php endif; ?>
<?php if (tieneAccesoModulo('geocercas')): ?>
<script src="assets/js/modulos/geocercas.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/geocercas.js') ?>"></script>
<?php endif; ?>
<?php if (tieneAccesoModulo('matriz')): ?>
<script src="assets/js/modulos/matriz.compiled.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/matriz.compiled.js') ?>"></script>
<?php endif; ?>
<?php if (tieneAccesoModulo('epp')): ?>
<script src="assets/js/modulos/epp.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/epp.js') ?>"></script>
<?php endif; ?>
<?php if (tieneAccesoModulo('vehiculos')): ?>
<script src="assets/js/modulos/vehiculos.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/vehiculos.js') ?>"></script>
<?php endif; ?>
<?php if (tieneAccesoModulo('checklist')): ?>
<script src="assets/js/modulos/checklist.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/checklist.js') ?>"></script>
<?php endif; ?>
<?php if (tieneAccesoModulo('empresas')): ?>
<script src="assets/js/modulos/empresas.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/empresas.js') ?>"></script>
<?php endif; ?>
<?php if (tieneAccesoModulo('documentos')): ?>
<script src="assets/js/modulos/documentos.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/documentos.js') ?>"></script>
<?php endif; ?>
<?php if (tieneAccesoModulo('kpi_analytics')): ?>
<script src="assets/js/modulos/kpi_datasets.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/kpi_datasets.js') ?>"></script>
<script src="assets/js/modulos/kpi_widget_builder.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/kpi_widget_builder.js') ?>"></script>
<script src="assets/js/modulos/kpi_tlmr.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/kpi_tlmr.js') ?>"></script>
<script src="assets/js/modulos/kpi_rsif.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/kpi_rsif.js') ?>"></script>
<script src="assets/js/modulos/kpi_jorlab.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/kpi_jorlab.js') ?>"></script>
<?php endif; ?>
<script>
  const UPLOAD_URL = '<?= defined("UPLOAD_URL") ? rtrim(UPLOAD_URL,"/")."/" : BASE_URL."/uploads/" ?>';
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/distribucion-segura/sw.js', { scope: '/distribucion-segura/' })
      .catch(() => {});
  }
</script>
</body>
</html>
