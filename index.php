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
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#1ABB9C">
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
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500;600&display=swap" rel="stylesheet">
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
.geo-share-opt { display:flex;align-items:center;gap:10px;width:100%;padding:9px 14px;background:none;border:none;cursor:pointer;font-size:13px;color:#2A3F54;font-family:'Barlow',sans-serif;transition:background .15s;text-align:left; }
.geo-share-opt:hover { background:#F5F7FA; }
.geo-share-opt i { width:16px;font-size:13px;color:var(--primary);flex-shrink:0; }
@media print { body > *:not(#printMapWrap) { display:none!important; } #printMapWrap { display:block!important; } }
</style>
</head>
<body>

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


    <?php if (tieneAccesoModulo('inspecciones') || tieneAccesoModulo('personal') || tieneAccesoModulo('geocercas')): ?>
    <div class="nav-section-title" style="margin-top:12px">Operaciones</div>
    <?php endif; ?>
    <?php if (tieneAccesoModulo('inspecciones')): ?>
    <a class="nav-item" data-page="inspecciones" onclick="showPage('inspecciones')">
      <i class="fas fa-clipboard-check"></i> Inspecciones
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


    <?php if (tieneAccesoModulo('amonestaciones') || tieneAccesoModulo('matriz')): ?>
    <div class="nav-section-title" style="margin-top:12px">Seguridad</div>
    <?php endif; ?>
    <?php if (tieneAccesoModulo('amonestaciones')): ?>
    <a class="nav-item" data-page="amonestaciones" onclick="showPage('amonestaciones')">
      <i class="fas fa-triangle-exclamation"></i> Matriz Amonestaciones
    </a>
    <?php endif; ?>
    <?php if (tieneAccesoModulo('matriz')): ?>
    <a class="nav-item" data-page="matriz" onclick="showPage('matriz')">
      <i class="fas fa-scale-balanced"></i> Matriz Consecuencias
    </a>
    <?php endif; ?>


    <?php if (tieneAccesoModulo('reportes')): ?>
    <div class="nav-section-title" style="margin-top:12px">Análisis</div>
    <a class="nav-item" data-page="reportes" onclick="showPage('reportes')">
      <i class="fas fa-chart-column"></i> Reportes
    </a>
    <?php endif; ?>


    <?php if ($user['rol'] === 'administrador'): ?>
    <div class="nav-section-title" style="margin-top:12px">Administración</div>
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
      <div style="font-size:12px;color:#666" id="clock"></div>
      <button class="btn btn-primary btn-sm" onclick="switchInspeccionTab('nueva')">
        <i class="fas fa-plus"></i> Nueva
      </button>
    </div>
  </div>

  <!-- ===== PAGE: DASHBOARD ===== -->
  <div class="page-content" id="page-dashboard">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--gris-100)">
          <i class="fas fa-gauge-high" style="color:var(--amarillo)"></i> Dashboard SST
        </h2>
        <p style="color:var(--gris-400);font-size:13px;margin-top:2px">Indicadores de seguridad en ruta · Juliaca</p>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <label style="font-size:12px;color:var(--gris-400)">Mes:</label>
        <input type="month" id="filtroMes" class="form-control" style="width:160px"
               value="<?= date('Y-m') ?>" onchange="cargarDashboard()">
      </div>
    </div>

    <!-- KPIs -->
    <div class="kpi-grid" id="kpiGrid">
      <?php for($i=0;$i<5;$i++): ?>
      <div class="kpi-card" style="height:100px;background:var(--gris-700);animation:pulse 1.5s infinite"></div>
      <?php endfor; ?>
    </div>

    <!-- Charts row -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px" class="charts-row">
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-chart-line"></i> Tendencia (7 días)</h3>
        </div>
        <div class="card-body">
          <canvas id="chartTendencia" height="220"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-list-check"></i> Cumplimiento por Ítem</h3>
        </div>
        <div class="card-body" style="max-height:260px;overflow-y:auto">
          <div id="itemsChecklist"></div>
        </div>
      </div>
    </div>

    <!-- Ranking + Hallazgos -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px" class="charts-row">
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-trophy"></i> Ranking Conductores</h3>
        </div>
        <div class="card-body" id="rankingConductores" style="padding:12px 22px"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-triangle-exclamation"></i> Principales Hallazgos</h3>
        </div>
        <div class="card-body" id="principalesHallazgos" style="max-height:280px;overflow-y:auto"></div>
      </div>
    </div>
  </div>

  <?php if (tieneAccesoModulo('inspecciones')): ?>
  <!-- ===== PAGE: INSPECCIONES (listado + nueva) ===== -->
  <div class="page-content" id="page-inspecciones" style="display:none">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--gris-100)">
          <i class="fas fa-clipboard-list" style="color:var(--amarillo)"></i> Inspecciones
        </h2>
        <p style="color:var(--gris-400);font-size:13px;margin-top:2px">Listado y registro de inspecciones en ruta</p>
      </div>
    </div>

    <!-- Sub-navegación por tabs -->
    <div class="tabs" style="margin-bottom:22px">
      <button class="tab-btn insp-tab-btn active" id="insp-btn-listado" onclick="switchInspeccionTab('listado')">
        <i class="fas fa-clipboard-list"></i> Listado
      </button>
      <button class="tab-btn insp-tab-btn" id="insp-btn-nueva" onclick="switchInspeccionTab('nueva')">
        <i class="fas fa-plus-circle"></i> Nueva Inspección
      </button>
    </div>

    <!-- ── PANEL: NUEVA INSPECCIÓN ── -->
    <div class="tab-panel insp-tab-panel" id="insp-panel-nueva">
      <p style="color:var(--gris-400);font-size:13px;margin-bottom:20px">Registro de inspección en ruta</p>

    <form id="formInspeccion">
      <!-- PASO 1: Datos generales -->
      <div class="card" style="margin-bottom:18px">
        <div class="card-header">
          <h3><i class="fas fa-info-circle"></i> 1. Datos Generales</h3>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Placa / Unidad *</label>
              <input type="text" class="form-control" id="f_unidad" placeholder="Ej: ABC-123" required style="text-transform:uppercase">
            </div>
            <div class="form-group">
              <label class="form-label">Fecha *</label>
              <input type="date" class="form-control" id="f_fecha" required value="<?= date('Y-m-d') ?>">
            </div>
            <div class="form-group">
              <label class="form-label">Hora *</label>
              <input type="time" class="form-control" id="f_hora" required value="<?= date('H:i') ?>">
            </div>
            <div class="form-group">
              <label class="form-label">Provincia</label>
              <input type="text" class="form-control" id="f_provincia" value="San Román">
            </div>
            <div class="form-group">
              <label class="form-label">Distrito</label>
              <input type="text" class="form-control" id="f_distrito" value="Juliaca">
            </div>
            <div class="form-group">
              <label class="form-label">Dirección (calle/avenida) *</label>
              <input type="text" class="form-control" id="f_direccion" placeholder="Ej: Av. Circunvalación 850" required>
            </div>
          </div>

          <!-- GPS PROMINENTE -->
          <div style="margin-top:16px;border:2px dashed rgba(21,101,192,0.35);border-radius:12px;
                      padding:16px;background:rgba(21,101,192,0.04)">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px">
              <div>
                <div style="font-weight:700;color:var(--blanco);font-size:14px;margin-bottom:2px">
                  <i class="fas fa-satellite-dish" style="color:var(--amarillo)"></i>
                  Geolocalización GPS
                </div>
                <div style="font-size:12px;color:var(--gris-400)">Registra las coordenadas exactas del punto de inspección</div>
              </div>
              <button type="button" id="btnGeolocalizacion" class="btn btn-primary"
                      onclick="capturarGeolocalizacion()"
                      style="min-width:160px">
                <i class="fas fa-location-crosshairs"></i> Capturar Ubicación
              </button>
            </div>

            <!-- Estado GPS -->
            <div id="geoEstado" style="display:flex;align-items:center;gap:10px;
                  background:var(--gris-700);border-radius:8px;padding:10px 14px;font-size:13px">
              <span id="geoIcono" style="font-size:18px">📍</span>
              <div style="flex:1">
                <div id="geoTexto" style="color:var(--gris-400)">Sin coordenadas — presiona "Capturar Ubicación"</div>
                <div id="geoCoordenadas" style="color:var(--amarillo);font-size:12px;font-family:monospace;margin-top:2px"></div>
              </div>
              <div id="geoBadge"></div>
            </div>

            <!-- Mini mapa (aparece al capturar) -->
            <div id="geoMapa" style="display:none;margin-top:12px;border-radius:8px;overflow:hidden;height:160px;border:1px solid rgba(21,101,192,0.2)">
              <iframe id="geoMapaIframe" src="" style="width:100%;height:100%;border:0" loading="lazy"></iframe>
            </div>

            <input type="hidden" id="f_latitud">
            <input type="hidden" id="f_longitud">
          </div>
        </div>
      </div>

      <!-- PASO 2: Tripulación y EPP -->
      <div class="card" style="margin-bottom:18px">
        <div class="card-header">
          <h3><i class="fas fa-users"></i> 2. Tripulación y EPP</h3>
          <button type="button" class="btn btn-outline btn-sm" onclick="agregarAuxiliar()">
            <i class="fas fa-plus"></i> Auxiliar
          </button>
        </div>
        <div class="card-body">
          <div id="tripulacionContainer"></div>
        </div>
      </div>

      <!-- PASO 3: Checklist Vehículo -->
      <div class="card" style="margin-bottom:18px">
        <div class="card-header">
          <h3><i class="fas fa-truck"></i> 3. Checklist de Vehículo</h3>
          <div style="display:flex;align-items:center;gap:12px">
            <div class="badge badge-yellow" id="pctBadge">0% cumplimiento</div>
            <button type="button" class="btn btn-secondary btn-sm" onclick="marcarTodos(true)">✔ Todo</button>
            <button type="button" class="btn btn-danger btn-sm" onclick="marcarTodos(false)">✖ Nada</button>
          </div>
        </div>
        <div class="card-body">
          <div class="progress-wrap" style="margin-bottom:18px">
            <div class="progress-label">
              <span>Cumplimiento</span>
              <span id="pctLabel">0%</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill rojo" id="progressFill" style="width:0%"></div>
            </div>
          </div>
          <div class="checklist-grid" id="checklistContainer"></div>
        </div>
      </div>

      <!-- PASO 4: Evidencias Fotográficas -->
      <div class="card" style="margin-bottom:18px">
        <div class="card-header">
          <h3><i class="fas fa-camera"></i> 4. Evidencias Fotográficas</h3>
          <span style="font-size:12px;color:var(--gris-400)" id="contadorFotos">0 fotos seleccionadas</span>
        </div>
        <div class="card-body">
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
            <button type="button" class="btn btn-outline" onclick="document.getElementById('evidenciasInput').click()">
              <i class="fas fa-images"></i> Elegir de galería
            </button>
            <button type="button" class="btn btn-outline" onclick="document.getElementById('camaraInput').click()">
              <i class="fas fa-camera"></i> Tomar foto
            </button>
            <span style="font-size:12px;color:var(--gris-400);align-self:center">
              <i class="fas fa-info-circle"></i> Mínimo 3 imágenes · JPG, PNG, WEBP · Máx 5MB c/u
            </span>
          </div>
          <div class="upload-area" id="uploadArea"
               onclick="document.getElementById('evidenciasInput').click()"
               ondragover="event.preventDefault();this.classList.add('dragover')"
               ondragleave="this.classList.remove('dragover')"
               ondrop="handleDrop(event)">
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Haz clic o arrastra imágenes aquí</p>
            <small>Puedes seleccionar varias a la vez</small>
          </div>
          <input type="file" id="evidenciasInput" multiple accept="image/jpeg,image/png,image/webp"
                 style="display:none" onchange="handleFileSelect(this)">
          <input type="file" id="camaraInput" accept="image/*" capture="environment"
                 style="display:none" onchange="handleFileSelect(this)">
          <div class="preview-grid" id="previewGrid"></div>
        </div>
      </div>

      <!-- PASO 5: Hallazgos y Observaciones -->
      <div class="card" style="margin-bottom:18px">
        <div class="card-header">
          <h3><i class="fas fa-triangle-exclamation"></i> 5. Hallazgos y Observaciones</h3>
          <button type="button" class="btn btn-outline btn-sm" onclick="agregarHallazgo()">
            <i class="fas fa-plus"></i> Hallazgo
          </button>
        </div>
        <div class="card-body">
          <div id="hallazgosContainer" style="margin-bottom:16px"></div>
          <div class="form-group">
            <label class="form-label">Observaciones generales</label>
            <textarea class="form-control" id="f_observaciones" rows="3" placeholder="Descripción general de la inspección..."></textarea>
          </div>
        </div>
      </div>

      <!-- PASO 6: Firma Digital -->
      <div class="card" style="margin-bottom:24px">
        <div class="card-header">
          <h3><i class="fas fa-signature"></i> 6. Firma Digital del Inspector</h3>
        </div>
        <div class="card-body">
          <div class="firma-canvas-wrap">
            <canvas id="firmaCanvas" width="760" height="160" style="max-width:100%"></canvas>
          </div>
          <div class="firma-actions">
            <button type="button" class="btn btn-secondary btn-sm" onclick="limpiarFirma()">
              <i class="fas fa-eraser"></i> Limpiar
            </button>
          </div>
        </div>
      </div>

      <!-- BOTÓN GUARDAR -->
      <div style="display:flex;justify-content:flex-end;gap:12px">
        <button type="button" class="btn btn-secondary" onclick="resetForm();switchInspeccionTab('listado')">
          <i class="fas fa-times"></i> Cancelar
        </button>
        <button type="submit" class="btn btn-primary" id="btnGuardar">
          <i class="fas fa-save"></i> Guardar Inspección
        </button>
      </div>
    </form>
    </div><!-- /insp-panel-nueva -->

    <!-- ── PANEL: LISTADO ── -->
    <div class="tab-panel insp-tab-panel active" id="insp-panel-listado">
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px;gap:8px">
        <button class="btn btn-outline btn-sm" onclick="exportarExcel()"><i class="fas fa-file-excel"></i> Excel</button>
        <button class="btn btn-primary btn-sm" onclick="switchInspeccionTab('nueva')"><i class="fas fa-plus"></i> Nueva</button>
      </div>

    <!-- Filtros -->
    <div class="card" style="margin-bottom:18px">
      <div class="card-body" style="padding:16px 22px">
        <div class="filter-bar">
          <div class="form-group">
            <label class="form-label">Desde</label>
            <input type="date" class="form-control" id="filtroDesde">
          </div>
          <div class="form-group">
            <label class="form-label">Hasta</label>
            <input type="date" class="form-control" id="filtroHasta" value="<?= date('Y-m-d') ?>">
          </div>
          <div class="form-group">
            <label class="form-label">Unidad/Placa</label>
            <input type="text" class="form-control" id="filtroUnidad" placeholder="Ej: ABC-123">
          </div>
          <div class="form-group">
            <label class="form-label">Conductor</label>
            <input type="text" class="form-control" id="filtroConductor" placeholder="Nombre...">
          </div>
          <button class="btn btn-primary" onclick="cargarListado()">
            <i class="fas fa-search"></i> Buscar
          </button>
          <button class="btn btn-secondary" onclick="limpiarFiltros()">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body" style="padding:0">
        <div class="table-wrap">
          <table class="data-table" id="tablaInspecciones">
            <thead>
              <tr>
                <th>#</th>
                <th>Unidad</th>
                <th>Fecha/Hora</th>
                <th>Conductor</th>
                <th>Dirección</th>
                <th>Cumplimiento</th>
                <th>Inspector</th>
                <th>Evidencias</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="tablaBody">
              <tr><td colspan="9" style="text-align:center;padding:32px;color:var(--gris-400)">
                <div class="spinner"></div> Cargando...
              </td></tr>
            </tbody>
          </table>
        </div>
        <!-- Paginación -->
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 22px;border-top:1px solid rgba(255,255,255,0.06)">
          <div style="font-size:12px;color:var(--gris-400)" id="paginacionInfo">—</div>
          <div style="display:flex;gap:6px" id="paginacionBtns"></div>
        </div>
      </div>
    </div>
    </div><!-- /insp-panel-listado -->
  </div><!-- /page-inspecciones -->
  <?php endif; // inspecciones ?>

  <?php if (tieneAccesoModulo('personal')): ?>
  <!-- ===== PAGE: PERSONAL ===== -->
  <div class="page-content" id="page-personal" style="display:none">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--gris-100)">
          <i class="fas fa-id-card" style="color:var(--amarillo)"></i> Personal
        </h2>
        <p style="color:var(--gris-400);font-size:13px;margin-top:2px">Gestión del personal operativo</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="descargarPlantillaPersonal()">
          <i class="fas fa-download"></i> Plantilla
        </button>
        <label class="btn btn-outline btn-sm" style="cursor:pointer;margin:0">
          <i class="fas fa-file-import"></i> Importar Excel
          <input type="file" id="inputImportarPersonal" accept=".xlsx,.xls" style="display:none" onchange="importarExcelPersonal(this)">
        </label>
        <button class="btn btn-outline btn-sm" onclick="exportarExcelPersonal()">
          <i class="fas fa-file-excel"></i> Exportar
        </button>
        <button class="btn btn-primary btn-sm" onclick="abrirModalPersonal()">
          <i class="fas fa-plus"></i> Nuevo
        </button>
      </div>
    </div>

    <!-- Tarjetas resumen personal -->
    <div class="kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:20px">
      <div class="kpi-card verde">
        <i class="fas fa-users kpi-icon"></i>
        <div class="kpi-label">Total activos</div>
        <div class="kpi-value verde" id="kpiPersonalTotal">—</div>
        <div class="kpi-sub" id="kpiPersonalTotalSub">de 0 registros</div>
      </div>
      <div class="kpi-card rojo">
        <i class="fas fa-id-card kpi-icon"></i>
        <div class="kpi-label">DNI vencido / por vencer</div>
        <div class="kpi-value rojo" id="kpiPersonalDniVenc">—</div>
        <div class="kpi-sub" id="kpiPersonalDniSub">en los próximos 30 días</div>
      </div>
      <div class="kpi-card amarillo">
        <i class="fas fa-car kpi-icon"></i>
        <div class="kpi-label">Brevete vencido / por vencer</div>
        <div class="kpi-value amarillo" id="kpiPersonalBreveteVenc">—</div>
        <div class="kpi-sub" id="kpiPersonalBreteSub">en los próximos 30 días</div>
      </div>
      <div class="kpi-card azul">
        <i class="fas fa-file-alt kpi-icon"></i>
        <div class="kpi-label">Sin licencia registrada</div>
        <div class="kpi-value" id="kpiPersonalSinLic">—</div>
        <div class="kpi-sub">conductores sin N° licencia</div>
      </div>
    </div>

    <div class="card" style="margin-bottom:18px">
      <div class="card-body" style="padding:16px 22px">
        <div class="filter-bar">
          <div class="form-group">
            <label class="form-label">Buscar</label>
            <input type="text" class="form-control" id="filtroPersonalQ" placeholder="Nombre o DNI...">
          </div>
          <div class="form-group">
            <label class="form-label">Cargo</label>
            <select class="form-control" id="filtroPersonalCargo">
              <option value="">Todos</option>
              <option value="conductor">Conductor</option>
              <option value="reparto">Reparto</option>
              <option value="auxiliar">Auxiliar</option>
              <option value="supervisor">Supervisor</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Estado</label>
            <select class="form-control" id="filtroPersonalActivo">
              <option value="1">Activos</option>
              <option value="0">Inactivos</option>
              <option value="">Todos</option>
            </select>
          </div>
          <button class="btn btn-primary" onclick="cargarPersonal()"><i class="fas fa-search"></i> Buscar</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body" style="padding:0">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Foto</th>
                <th>DNI</th>
                <th>F. Nacimiento</th>
                <th>Nombre</th>
                <th>Cargo</th>
                <th>Empresa</th>
                <th>Teléfono</th>
                <th>Ingreso</th>
                <th>Venc. DNI</th>
                <th>N° Licencia</th>
                <th>Categoría</th>
                <th>Venc. Brevete</th>
                <th>Días DNI</th>
                <th>Días Brevete</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="tablaPersonalBody">
              <tr><td colspan="16" style="text-align:center;padding:32px;color:var(--gris-400)"><div class="spinner"></div> Cargando...</td></tr>
            </tbody>
          </table>
        </div>
        <div class="amon-pag-bar">
          <span class="amon-pag-info" id="pagInfoPersonal"></span>
          <div class="amon-pag-btns" id="pagBtnsPersonal"></div>
        </div>
      </div>
    </div>
  </div>
  <?php endif; // personal ?>


  <!-- ===== PAGE: USUARIOS ===== -->
  <?php if ($user['rol'] === 'administrador'): ?>
  <div class="page-content" id="page-usuarios" style="display:none">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--gris-100)">
          <i class="fas fa-users" style="color:var(--amarillo)"></i> Usuarios
        </h2>
        <p style="color:var(--gris-400);font-size:13px;margin-top:2px">Administración de accesos al sistema</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="abrirModalUsuario()">
        <i class="fas fa-user-plus"></i> Nuevo Usuario
      </button>
    </div>

    <div class="card">
      <div class="card-body" style="padding:0">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Estado</th>
                <th>Creado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody id="tablaUsuariosBody">
              <tr><td colspan="6" style="text-align:center;padding:32px;color:var(--gris-400)"><div class="spinner"></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  <?php endif; ?>

  <?php if (tieneAccesoModulo('amonestaciones')): ?>
  <!-- ===== PAGE: AMONESTACIONES ===== -->
  <div class="page-content" id="page-amonestaciones" style="display:none">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--gris-100)">
          <i class="fas fa-file-signature" style="color:var(--primary)"></i> Matriz de Amonestaciones
        </h2>
        <p style="color:var(--gris-400);font-size:13px;margin-top:2px">Registro de amonestaciones por tipo de infracción</p>
      </div>
      <button class="btn btn-primary" onclick="showPage('kpi-amonestaciones')">
        <i class="fas fa-chart-pie"></i> KPI
      </button>
    </div>

    <!-- KPI cards -->
    <div class="kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:20px">
      <div class="kpi-card azul">
        <i class="fas fa-list kpi-icon"></i>
        <div class="kpi-label">Total</div>
        <div class="kpi-value" id="kpiAmonTotal">—</div>
        <div class="kpi-sub">registros</div>
      </div>
      <div class="kpi-card" style="border-top:4px solid #5EA8E6">
        <i class="fas fa-wallet kpi-icon"></i>
        <div class="kpi-label">Bancarización</div>
        <div class="kpi-value" style="color:#0d5c9a" id="kpiAmonBanc">—</div>
        <div class="kpi-sub">amonestaciones</div>
      </div>
      <div class="kpi-card rojo">
        <i class="fas fa-store kpi-icon"></i>
        <div class="kpi-label">N3</div>
        <div class="kpi-value rojo" id="kpiAmonN3">—</div>
        <div class="kpi-sub">amonestaciones</div>
      </div>
      <div class="kpi-card" style="border-top:4px solid #C387C2">
        <i class="fas fa-satellite-dish kpi-icon"></i>
        <div class="kpi-label">Telemetría</div>
        <div class="kpi-value" style="color:#7B52A0" id="kpiAmonTele">—</div>
        <div class="kpi-sub">amonestaciones</div>
      </div>
      <div class="kpi-card amarillo">
        <i class="fas fa-clock kpi-icon"></i>
        <div class="kpi-label">Pendientes</div>
        <div class="kpi-value amarillo" id="kpiAmonPend">—</div>
        <div class="kpi-sub">por notificar</div>
      </div>
    </div>

    <!-- Tabs sub-módulos -->
    <div class="tabs" style="margin-bottom:0;border-bottom:2px solid var(--gris-600);padding-bottom:0;gap:2px">
      <button class="tab-btn insp-tab-btn active" id="amon-btn-bancarizacion" onclick="switchAmonTab('bancarizacion')" style="border-radius:8px 8px 0 0">
        <i class="fas fa-wallet"></i> Bancarización
      </button>
      <button class="tab-btn insp-tab-btn" id="amon-btn-n3" onclick="switchAmonTab('n3')" style="border-radius:8px 8px 0 0">
        <i class="fas fa-store"></i> N3
      </button>
      <button class="tab-btn insp-tab-btn" id="amon-btn-telemetria" onclick="switchAmonTab('telemetria')" style="border-radius:8px 8px 0 0">
        <i class="fas fa-satellite-dish"></i> Telemetría
      </button>
    </div>

    <!-- Panel compartido (filtros + tabla) -->
    <div class="card" style="border-radius:0 8px 8px 8px;margin-top:0">
      <div class="card-body" style="padding:16px 22px">
        <div class="filter-bar">
          <div class="form-group">
            <label class="form-label">Desde</label>
            <input type="date" class="form-control" id="filtroAmonDesde">
          </div>
          <div class="form-group">
            <label class="form-label">Hasta</label>
            <input type="date" class="form-control" id="filtroAmonHasta" value="<?= date('Y-m-d') ?>">
          </div>
          <div class="form-group">
            <label class="form-label">Buscar personal</label>
            <input type="text" class="form-control" id="filtroAmonQ" placeholder="Nombre o DNI...">
          </div>
          <div class="form-group">
            <label class="form-label">Estado</label>
            <select class="form-control" id="filtroAmonEstado">
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="notificado">Notificado</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>
          <button class="btn btn-primary" onclick="cargarAmonestaciones()"><i class="fas fa-search"></i> Buscar</button>
          <button class="btn btn-secondary" onclick="limpiarFiltrosAmon()" title="Limpiar filtros"><i class="fas fa-times"></i></button>
          <button class="btn btn-outline" onclick="exportarExcelAmon()" title="Exportar pestaña actual a Excel" style="border-color:#27AE60;color:#27AE60"><i class="fas fa-file-excel"></i> Excel</button>
          <?php if (in_array($user['rol'], ['administrador','supervisor'])): ?>
          <button class="btn btn-outline" onclick="abrirModalAmon()" style="margin-left:auto">
            <i class="fas fa-plus"></i> Nueva
          </button>
          <?php endif; ?>
        </div>
      </div>

      <!-- Tabla Bancarización -->
      <div class="amon-tab-panel active" id="amon-panel-bancarizacion">
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>Fecha</th><th>DNI</th><th>Nombre y Apellidos</th>
              <th>Nombre cliente</th><th>Cód. Cliente</th><th>Motivo</th><th>Importe</th>
              <th>Reincidente</th><th>Plan de acciones</th><th>Estado</th><th>Fecha Cierre</th><th>Observaciones</th><th>Docs</th><th>Opciones</th>
            </tr></thead>
            <tbody id="tbodyBancarizacion">
              <tr><td colspan="14" style="text-align:center;padding:32px;color:var(--gris-400)"><div class="spinner"></div></td></tr>
            </tbody>
          </table>
        </div>
        <div class="amon-pag-bar">
          <span class="amon-pag-info" id="pagInfoBancarizacion"></span>
          <div class="amon-pag-btns" id="pagBtnsBancarizacion"></div>
        </div>
      </div>

      <!-- Tabla N3 -->
      <div class="amon-tab-panel" id="amon-panel-n3" style="display:none">
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>Fecha</th><th>DNI</th><th>Nombre y Apellidos</th>
              <th>Cliente N3</th><th>Cód. Cliente</th><th>Motivo</th>
              <th>Reincidente</th><th>Plan de acciones</th><th>Estado</th><th>Fecha Cierre</th><th>Observaciones</th><th>Docs</th><th>Opciones</th>
            </tr></thead>
            <tbody id="tbodyN3">
              <tr><td colspan="13" style="text-align:center;padding:32px;color:var(--gris-400)"><div class="spinner"></div></td></tr>
            </tbody>
          </table>
        </div>
        <div class="amon-pag-bar">
          <span class="amon-pag-info" id="pagInfoN3"></span>
          <div class="amon-pag-btns" id="pagBtnsN3"></div>
        </div>
      </div>

      <!-- Tabla Telemetría -->
      <div class="amon-tab-panel" id="amon-panel-telemetria" style="display:none">
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr>
              <th>Fecha</th><th>Placa</th><th>Nombres y apellidos</th>
              <th>Regla</th><th>Tipo sanción</th><th>Nivel</th>
              <th>Reincidente</th><th>Evento alerta</th><th>Estado</th>
              <th>Plan de acciones</th><th>Fecha cierre</th><th>Comentarios</th>
              <th>Docs</th><th>Acciones</th>
            </tr></thead>
            <tbody id="tbodyTelemetria">
              <tr><td colspan="14" style="text-align:center;padding:32px;color:var(--gris-400)"><div class="spinner"></div></td></tr>
            </tbody>
          </table>
        </div>
        <div class="amon-pag-bar">
          <span class="amon-pag-info" id="pagInfoTelemetria"></span>
          <div class="amon-pag-btns" id="pagBtnsTelemetria"></div>
        </div>
      </div>
    </div>
  </div>
  <?php endif; // amonestaciones ?>

  <?php if (tieneAccesoModulo('amonestaciones')): ?>
  <!-- ===== PAGE: KPI AMONESTACIONES ===== -->
  <div class="page-content" id="page-kpi-amonestaciones" style="display:none">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--gris-100)">
          <i class="fas fa-chart-pie" style="color:var(--primary)"></i> KPI Amonestaciones
        </h2>
        <p style="color:var(--gris-400);font-size:13px;margin-top:2px">Indicadores de desempeño por tipo de infracción</p>
      </div>
      <button class="btn btn-outline btn-sm" onclick="showPage('amonestaciones')">
        <i class="fas fa-arrow-left"></i> Volver a Registros
      </button>
    </div>
    <!-- Filtros -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:14px 20px">
        <div class="filter-bar">
          <div class="form-group">
            <label class="form-label">Desde</label>
            <input type="date" class="form-control" id="kpiAmonDesde">
          </div>
          <div class="form-group">
            <label class="form-label">Hasta</label>
            <input type="date" class="form-control" id="kpiAmonHasta" value="<?= date('Y-m-d') ?>">
          </div>
          <button class="btn btn-primary" onclick="cargarKpiAmon()"><i class="fas fa-search"></i> Buscar</button>
          <button class="btn btn-outline" onclick="limpiarFiltrosKpiAmon()" title="Limpiar filtros"><i class="fas fa-times"></i></button>
        </div>
      </div>
    </div>
    <!-- Tabs -->
    <div class="tabs" style="margin-bottom:0;border-bottom:2px solid var(--gris-600);padding-bottom:0;gap:2px">
      <button class="tab-btn insp-tab-btn active" id="kpi-btn-bancarizacion" onclick="switchKpiTab('bancarizacion')" style="border-radius:8px 8px 0 0"><i class="fas fa-wallet"></i> Bancarización</button>
      <button class="tab-btn insp-tab-btn" id="kpi-btn-n3" onclick="switchKpiTab('n3')" style="border-radius:8px 8px 0 0"><i class="fas fa-store"></i> N3</button>
      <button class="tab-btn insp-tab-btn" id="kpi-btn-telemetria" onclick="switchKpiTab('telemetria')" style="border-radius:8px 8px 0 0"><i class="fas fa-satellite-dish"></i> Telemetría</button>
    </div>
    <!-- Panel Bancarización -->
    <div class="card kpi-amon-panel" id="kpi-panel-bancarizacion" style="border-radius:0 8px 8px 8px;margin-top:0">
      <div class="card-body" style="padding:20px 22px">
        <div id="kpiContentBancarizacion"><div style="text-align:center;padding:40px;color:var(--gris-400)"><div class="spinner"></div></div></div>
      </div>
    </div>
    <!-- Panel N3 -->
    <div class="card kpi-amon-panel" id="kpi-panel-n3" style="border-radius:0 8px 8px 8px;margin-top:0;display:none">
      <div class="card-body" style="padding:20px 22px">
        <div id="kpiContentN3"><div style="text-align:center;padding:40px;color:var(--gris-400)"><div class="spinner"></div></div></div>
      </div>
    </div>
    <!-- Panel Telemetría -->
    <div class="card kpi-amon-panel" id="kpi-panel-telemetria" style="border-radius:0 8px 8px 8px;margin-top:0;display:none">
      <div class="card-body" style="padding:20px 22px">
        <div id="kpiContentTelemetria"><div style="text-align:center;padding:40px;color:var(--gris-400)"><div class="spinner"></div></div></div>
      </div>
    </div>
  </div>
  <?php endif; // kpi-amonestaciones ?>

  <?php if (tieneAccesoModulo('reportes')): ?>
  <div class="page-content" id="page-reportes" style="display:none">
    <h2 style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--gris-100);margin-bottom:24px">
      <i class="fas fa-chart-bar" style="color:var(--amarillo)"></i> Reportes
    </h2>
    <div class="card">
      <div class="card-body" style="text-align:center;padding:48px">
        <i class="fas fa-file-pdf" style="font-size:48px;color:var(--amarillo);margin-bottom:16px;display:block"></i>
        <h3 style="font-family:var(--font-display);font-size:20px;color:var(--gris-100);margin-bottom:8px">Generación de Reportes</h3>
        <p style="color:var(--gris-400);margin-bottom:24px">Selecciona el tipo de reporte que deseas generar</p>
        <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="generarReporteMes()">
            <i class="fas fa-calendar-alt"></i> Reporte Mensual
          </button>
          <button class="btn btn-outline" onclick="exportarExcel()">
            <i class="fas fa-file-excel"></i> Exportar Excel
          </button>
        </div>
      </div>
    </div>
  </div>
  <?php endif; // reportes ?>

  <?php if (tieneAccesoModulo('matriz')): ?>
  <div class="page-content" id="page-matriz" style="display:none"></div>
  <?php endif; ?>

  <?php if (tieneAccesoModulo('geocercas')): ?>
  <div class="page-content" id="page-geocercas" style="display:none">

    <!-- Cabecera -->
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px">
      <div>
        <h2 style="font-family:var(--font-display);font-size:22px;font-weight:800;color:var(--gris-100);margin:0">
          <i class="fas fa-draw-polygon" style="color:var(--primary)"></i> Geocercas
        </h2>
        <p style="font-size:12px;color:var(--gris-400);margin:3px 0 0">Rutas críticas, zonas N3 y zonas rojas</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <!-- Botón compartir/exportar -->
        <div style="position:relative" id="geoShareWrap">
          <button class="btn btn-outline" onclick="toggleGeoShareMenu()" id="btnGeoShare">
            <i class="fas fa-share-nodes"></i> Compartir
          </button>
          <div id="geoShareMenu" style="display:none;position:absolute;right:0;top:calc(100% + 6px);background:#fff;border:1px solid #E6E9ED;border-radius:6px;box-shadow:0 6px 24px rgba(0,0,0,.12);min-width:210px;z-index:9999;overflow:hidden">
            <div style="padding:8px 12px;font-size:10px;font-weight:700;color:#98A6AD;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #E6E9ED">Exportar mapa</div>
            <button class="geo-share-opt" onclick="exportarMapaPNG();cerrarGeoShareMenu()"><i class="fas fa-image"></i> Descargar imagen PNG</button>
            <button class="geo-share-opt" onclick="imprimirMapaGeo();cerrarGeoShareMenu()"><i class="fas fa-print"></i> Imprimir mapa</button>
            <div style="padding:8px 12px;font-size:10px;font-weight:700;color:#98A6AD;text-transform:uppercase;letter-spacing:.08em;border-top:1px solid #E6E9ED;border-bottom:1px solid #E6E9ED">Compartir enlace</div>
            <button class="geo-share-opt" onclick="copiarEnlaceGeo()"><i class="fas fa-link"></i> Copiar enlace del mapa</button>
            <button class="geo-share-opt" onclick="compartirWhatsApp()"><i class="fab fa-whatsapp" style="color:#25D366"></i> Compartir por WhatsApp</button>
            <div style="padding:8px 12px;font-size:10px;font-weight:700;color:#98A6AD;text-transform:uppercase;letter-spacing:.08em;border-top:1px solid #E6E9ED;border-bottom:1px solid #E6E9ED">Exportar datos</div>
            <button class="geo-share-opt" onclick="exportarGeoJSON();cerrarGeoShareMenu()"><i class="fas fa-code"></i> Exportar GeoJSON</button>
          </div>
        </div>
        <?php if (in_array($user['rol'], ['administrador','supervisor'])): ?>
        <button class="btn btn-primary" onclick="abrirModalGeo()">
          <i class="fas fa-plus"></i> Nueva Geocerca
        </button>
        <?php endif; ?>
      </div>
    </div>

    <!-- KPI cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:16px">
      <div class="card" style="padding:14px 16px;border-top:3px solid var(--primary)">
        <div style="font-size:24px;font-weight:800;color:var(--gris-100)" id="geoStatTotal">—</div>
        <div style="font-size:11px;color:var(--gris-400);font-weight:600;margin-top:2px">Total</div>
      </div>
      <div class="card" style="padding:14px 16px;border-top:3px solid #F39C12">
        <div style="font-size:24px;font-weight:800;color:#F39C12" id="geoStatRutas">—</div>
        <div style="font-size:11px;color:var(--gris-400);font-weight:600;margin-top:2px"><i class="fas fa-road" style="margin-right:4px"></i>Rutas Críticas</div>
      </div>
      <div class="card" style="padding:14px 16px;border-top:3px solid #3498DB">
        <div style="font-size:24px;font-weight:800;color:#3498DB" id="geoStatN3">—</div>
        <div style="font-size:11px;color:var(--gris-400);font-weight:600;margin-top:2px"><i class="fas fa-map-location-dot" style="margin-right:4px"></i>Zonas N3</div>
      </div>
      <div class="card" style="padding:14px 16px;border-top:3px solid #E74C3C">
        <div style="font-size:24px;font-weight:800;color:#E74C3C" id="geoStatRojas">—</div>
        <div style="font-size:11px;color:var(--gris-400);font-weight:600;margin-top:2px"><i class="fas fa-circle-exclamation" style="margin-right:4px"></i>Zonas Rojas</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tab-bar" style="margin-bottom:14px;border-bottom:none;padding-bottom:0;gap:6px">
      <button class="tab-btn geo-tab-btn active" data-tipo="ruta_critica" onclick="switchGeoTab('ruta_critica')">
        <i class="fas fa-road" style="color:#F39C12;margin-right:5px"></i> Rutas Críticas Carretera
      </button>
      <button class="tab-btn geo-tab-btn" data-tipo="zona_n3" onclick="switchGeoTab('zona_n3')">
        <i class="fas fa-map-location-dot" style="color:#3498DB;margin-right:5px"></i> Zonas N3
      </button>
      <button class="tab-btn geo-tab-btn" data-tipo="zona_roja" onclick="switchGeoTab('zona_roja')">
        <i class="fas fa-circle-exclamation" style="color:#E74C3C;margin-right:5px"></i> Zonas Rojas
      </button>
    </div>

    <!-- Toolbar Zonas N3 (import/export) -->
    <div id="geoN3Toolbar" style="display:none;margin-bottom:12px">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-outline btn-sm" onclick="descargarPlantillaGeoN3()">
          <i class="fas fa-download"></i> Plantilla
        </button>
        <label class="btn btn-outline btn-sm" style="cursor:pointer;margin:0">
          <i class="fas fa-file-import"></i> Importar Excel
          <input type="file" id="inputImportGeoN3" accept=".xlsx,.xls,.csv" style="display:none" onchange="handleGeoN3Import(this)">
        </label>
        <button class="btn btn-outline btn-sm" onclick="exportarGeoN3()" style="color:#1ABB9C;border-color:rgba(26,187,156,.4)">
          <i class="fas fa-file-excel"></i> Exportar Excel
        </button>
        <span id="geoN3Count" style="font-size:11px;color:var(--gris-400);margin-left:4px"></span>
      </div>
    </div>

    <!-- Mapa principal -->
    <div class="card" style="margin-bottom:16px;padding:0;overflow:hidden">
      <div id="geoMainMap" style="height:600px;width:100%"></div>
    </div>

    <!-- Tabla -->
    <div class="card">
      <div style="overflow-x:auto">
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Puntos</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="geoTablaBody">
            <tr><td colspan="5" style="text-align:center;padding:32px;color:var(--gris-400)">Cargando...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

  </div><!-- /page-geocercas -->
  <?php endif; ?>
</main>

<!-- ===== MODAL AMONESTACIÓN ===== -->
<div class="modal-overlay" id="modalAmon">
  <div class="modal-box" style="max-width:700px">
    <div class="modal-header">
      <h3><i class="fas fa-file-signature" style="color:var(--primary)"></i> <span id="modalAmonTitulo">Nueva Amonestación</span></h3>
      <button class="modal-close" onclick="cerrarModal('modalAmon')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <form id="formAmon">
        <input type="hidden" id="amon_id">
        <input type="hidden" id="amon_tipo">

        <!-- Datos comunes -->
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gris-400);letter-spacing:.08em;margin-bottom:10px">Datos generales</p>
        <div class="form-grid">
          <div class="form-group" style="grid-column:1/-1;position:relative">
            <label class="form-label">Personal *</label>
            <input type="hidden" id="amon_personal_id">
            <input type="text" class="form-control" id="amon_personal_nombre" placeholder="Buscar por nombre o DNI..." autocomplete="off"
                   oninput="buscarPersonalAmon(this.value)" required>
            <div class="autocomplete-box" id="amonPersonalAC"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Fecha *</label>
            <input type="date" class="form-control" id="amon_fecha" required value="<?= date('Y-m-d') ?>">
          </div>
          <div class="form-group">
            <label class="form-label">Estado</label>
            <select class="form-control" id="amon_estado">
              <option value="pendiente">Pendiente</option>
              <option value="notificado">Notificado</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Descripción / Motivo *</label>
            <textarea class="form-control" id="amon_descripcion" rows="3" required placeholder="Detalle de la infracción..."></textarea>
          </div>
        </div>

        <!-- Campos Bancarización -->
        <div id="secAmonBanc" style="display:none">
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gris-400);letter-spacing:.08em;margin:16px 0 10px">Datos de bancarización</p>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Importe (S/.)</label>
              <input type="number" class="form-control" id="amon_monto" step="0.01" min="0" placeholder="0.00">
            </div>
            <div class="form-group">
              <label class="form-label">N° Operación</label>
              <input type="text" class="form-control" id="amon_nro_operacion" maxlength="50" placeholder="Ej: OP-20240412">
            </div>
            <div class="form-group">
              <label class="form-label">Motivo</label>
              <select class="form-control" id="amon_motivo_codigo_banc">
                <option value="">— Selecciona —</option>
                <option value="Cobros efectivo >3500">Cobros efectivo &gt;3500</option>
                <option value="Cobros efectivo >2000">Cobros efectivo &gt;2000</option>
                <option value="N3">Cobro a cliente N3</option>
                <option value="Multiparada">Multiparada sin depósito</option>
                <option value="Protocolo">Incumplimiento protocolo 360°</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Nombre cliente</label>
              <input type="text" class="form-control" id="amon_cliente_banc" maxlength="150" placeholder="Nombre del cliente">
            </div>
            <div class="form-group">
              <label class="form-label">Código cliente</label>
              <input type="text" class="form-control" id="amon_codigo_cliente_banc" maxlength="50" placeholder="Ej: CLI-00123">
            </div>
            <div class="form-group" style="display:flex;align-items:center;gap:10px;padding-top:22px">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;color:var(--gris-200)">
                <input type="checkbox" id="amon_reincidente_banc" style="width:16px;height:16px;accent-color:var(--rojo)">
                <strong>Reincidente</strong>
              </label>
            </div>
          </div>

          <div class="form-group" style="margin-top:10px">
            <label class="form-label">Plan de acciones</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">
              <?php foreach(['Generar amonestación','Refuerzo bancarización','Carta de compromiso','Suspensión','Seguimiento'] as $pa): ?>
              <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;padding:5px 10px;border:1px solid var(--gris-500);border-radius:6px;background:var(--gris-700);color:var(--gris-200)">
                <input type="checkbox" class="plan-banc-check" value="<?= $pa ?>" style="accent-color:var(--primary)"> <?= $pa ?>
              </label>
              <?php endforeach; ?>
            </div>
          </div>

          <div class="form-grid" style="margin-top:8px">
            <div class="form-group">
              <label class="form-label">Fecha cierre</label>
              <input type="date" class="form-control" id="amon_fecha_cierre_banc">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-image" style="color:var(--primary)"></i> Imagen evidencia</label>
              <input type="file" class="form-control" id="amon_imagen_banc" accept="image/*">
              <small style="color:var(--gris-400)">JPG, PNG · Máx 10MB</small>
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label"><i class="fas fa-paperclip" style="color:var(--primary)"></i> Documento de amonestación</label>
              <input type="file" class="form-control" id="amon_archivo_banc" accept=".pdf,.doc,.docx,.odt">
              <small style="color:var(--gris-400)">PDF, Word · Máx 20MB</small>
              <div id="amon_archivo_actual_banc" style="display:none;margin-top:6px">
                <a id="amon_archivo_link_banc" href="#" target="_blank" style="font-size:12px;color:var(--primary);display:inline-flex;align-items:center;gap:5px">
                  <i class="fas fa-file-alt"></i> <span id="amon_archivo_nom_banc">Ver documento</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Campos N3 -->
        <div id="secAmonN3" style="display:none">
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gris-400);letter-spacing:.08em;margin:16px 0 10px">Datos cliente N3</p>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Cliente N3</label>
              <input type="text" class="form-control" id="amon_cliente" maxlength="150" placeholder="Nombre del cliente">
            </div>
            <div class="form-group">
              <label class="form-label">Código cliente</label>
              <input type="text" class="form-control" id="amon_codigo_cliente_n3" maxlength="50" placeholder="Ej: CLI-00123">
            </div>
            <div class="form-group">
              <label class="form-label">Ruta</label>
              <input type="text" class="form-control" id="amon_ruta" maxlength="100" placeholder="Ej: Ruta 05 - Mercado Central">
            </div>
            <div class="form-group">
              <label class="form-label">Motivo</label>
              <select class="form-control" id="amon_motivo_codigo_n3">
                <option value="">— Selecciona —</option>
                <option value="N3">Atención POC N3</option>
                <option value="Cobro N3">Cobro en efectivo N3</option>
                <option value="Sin autorización">Sin autorización</option>
                <option value="Reincidencia N3">Reincidencia N3</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div class="form-group" style="display:flex;align-items:center;gap:10px;padding-top:22px">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;color:var(--gris-200)">
                <input type="checkbox" id="amon_reincidente_n3" style="width:16px;height:16px;accent-color:var(--rojo)">
                <strong>Reincidente</strong>
              </label>
            </div>
          </div>

          <div class="form-group" style="margin-top:10px">
            <label class="form-label">Plan de acciones</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">
              <?php foreach(['Generar amonestación','Refuerzo N3','Carta de compromiso','Suspensión','Seguimiento'] as $pa): ?>
              <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;padding:5px 10px;border:1px solid var(--gris-500);border-radius:6px;background:var(--gris-700);color:var(--gris-200)">
                <input type="checkbox" class="plan-n3-check" value="<?= $pa ?>" style="accent-color:var(--primary)"> <?= $pa ?>
              </label>
              <?php endforeach; ?>
            </div>
          </div>

          <div class="form-grid" style="margin-top:8px">
            <div class="form-group">
              <label class="form-label">Fecha cierre</label>
              <input type="date" class="form-control" id="amon_fecha_cierre_n3">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-image" style="color:var(--primary)"></i> Imagen evidencia</label>
              <input type="file" class="form-control" id="amon_imagen_n3" accept="image/*">
              <small style="color:var(--gris-400)">JPG, PNG · Máx 10MB</small>
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label"><i class="fas fa-paperclip" style="color:var(--primary)"></i> Documento de amonestación</label>
              <input type="file" class="form-control" id="amon_archivo_n3" accept=".pdf,.doc,.docx,.odt">
              <small style="color:var(--gris-400)">PDF, Word · Máx 20MB</small>
              <div id="amon_archivo_actual_n3" style="display:none;margin-top:6px">
                <a id="amon_archivo_link_n3" href="#" target="_blank" style="font-size:12px;color:var(--primary);display:inline-flex;align-items:center;gap:5px">
                  <i class="fas fa-file-alt"></i> <span id="amon_archivo_nom_n3">Ver documento</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Campos Telemetría -->
        <div id="secAmonTele" style="display:none">
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gris-400);letter-spacing:.08em;margin:16px 0 10px">Datos de telemetría</p>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Placa / Unidad</label>
              <input type="text" class="form-control" id="amon_unidad" maxlength="20" placeholder="Ej: BTT-893" style="text-transform:uppercase">
            </div>
            <div class="form-group">
              <label class="form-label">Regla infringida</label>
              <select class="form-control" id="amon_evento_tele">
                <option value="">— Selecciona regla —</option>
                <option>Cinturón de Seguridad</option>
                <option>Ruta Crítica &gt;30 km/h</option>
                <option>Ruta Crítica &gt;40 km/h</option>
                <option>Exceso de Velocidad &gt;70 km/h</option>
                <option>Exceso de Velocidad &gt;15 km/h (CD)</option>
                <option>Uso de Celular</option>
                <option>Frenada Brusca</option>
                <option>Aceleración Brusca</option>
                <option>Conducción Distraída</option>
                <option>Obstrucción de Cámara</option>
                <option>Sin Cinturón de Seguridad</option>
                <option>Retroceso sin Guía</option>
                <option>Otro</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Valor registrado</label>
              <input type="text" class="form-control" id="amon_valor_registrado" maxlength="50" placeholder="Ej: 92 km/h">
            </div>
            <div class="form-group">
              <label class="form-label">Tipo sanción</label>
              <select class="form-control" id="amon_tipo_sancion">
                <option value="">— Selecciona —</option>
                <option>Amonestación escrita</option>
                <option>Suspensión 1 día</option>
                <option>Suspensión 2 días</option>
                <option>Suspensión 3 días</option>
                <option>Suspensión 1 semana</option>
                <option>Desvinculación</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Tipo de sanción (nivel)</label>
              <select class="form-control" id="amon_tipo_sancion_nivel">
                <option value="">— Selecciona —</option>
                <option>1ERA VEZ</option>
                <option>2DA VEZ</option>
                <option>3ERA VEZ</option>
                <option>4TA VEZ</option>
                <option>5TA VEZ</option>
              </select>
            </div>
            <div class="form-group" style="display:flex;align-items:center;gap:10px;padding-top:22px">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;color:var(--gris-200)">
                <input type="checkbox" id="amon_reincidente" style="width:16px;height:16px;accent-color:var(--rojo)">
                <span><strong>Reincidente</strong></span>
              </label>
            </div>
          </div>

          <div class="form-group" style="margin-top:12px">
            <label class="form-label">Plan de acciones</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">
              <?php foreach(['Generar amonestación','Refuerzo telemetría','Carta de compromiso','Capacitación','Suspensión','Seguimiento'] as $pa): ?>
              <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;padding:5px 10px;border:1px solid var(--gris-500);border-radius:6px;background:var(--gris-700);color:var(--gris-200)">
                <input type="checkbox" class="plan-accion-check" value="<?= $pa ?>" style="accent-color:var(--primary)"> <?= $pa ?>
              </label>
              <?php endforeach; ?>
            </div>
            <input type="hidden" id="amon_plan_acciones">
          </div>

          <div class="form-grid" style="margin-top:4px">
            <div class="form-group">
              <label class="form-label">Fecha cierre</label>
              <input type="date" class="form-control" id="amon_fecha_cierre">
            </div>
            <div class="form-group">
              <label class="form-label">Evento alerta (imagen)</label>
              <input type="file" class="form-control" id="amon_imagen_evento" accept="image/*">
              <small style="color:var(--gris-400)">JPG, PNG · Máx 10MB</small>
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label"><i class="fas fa-paperclip" style="color:var(--primary)"></i> Documento de amonestación</label>
              <input type="file" class="form-control" id="amon_archivo_doc" accept=".pdf,.doc,.docx,.odt">
              <small style="color:var(--gris-400)">PDF, Word, ODT · Máx 20MB</small>
              <!-- Enlace al archivo actual al editar -->
              <div id="amon_archivo_actual" style="display:none;margin-top:6px">
                <a id="amon_archivo_link" href="#" target="_blank"
                   style="font-size:12px;color:var(--primary);display:inline-flex;align-items:center;gap:5px">
                  <i class="fas fa-file-alt"></i> <span id="amon_archivo_nombre">Ver documento actual</span>
                </a>
              </div>
            </div>
          </div>
          <div id="amon_imagen_preview" style="margin-top:8px;display:none">
            <img id="amon_img_thumb" src="" style="max-height:120px;border-radius:8px;border:1px solid var(--gris-500)">
          </div>
        </div>

        <div class="form-group" style="margin-top:16px">
          <label class="form-label">Observaciones adicionales</label>
          <textarea class="form-control" id="amon_observaciones" rows="2"></textarea>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px">
          <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalAmon')">Cancelar</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- ===== MODAL PERSONAL ===== -->
<div class="modal-overlay" id="modalPersonal">
  <div class="modal-box" style="max-width:780px">
    <div class="modal-header">
      <h3><i class="fas fa-id-card" style="color:var(--amarillo)"></i> <span id="modalPersonalTitulo">Nuevo Personal</span></h3>
      <button class="modal-close" onclick="cerrarModal('modalPersonal')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <form id="formPersonal">
        <input type="hidden" id="personal_id">

        <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gris-400);letter-spacing:.08em;margin-bottom:10px">Datos personales</p>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">DNI *</label>
            <input type="text" class="form-control" id="personal_dni" maxlength="15" required>
          </div>
          <div class="form-group">
            <label class="form-label">Nombre completo *</label>
            <input type="text" class="form-control" id="personal_nombre" required>
          </div>
          <div class="form-group">
            <label class="form-label">Cargo *</label>
            <select class="form-control" id="personal_cargo" required>
              <option value="conductor">Conductor</option>
              <option value="reparto">Reparto</option>
              <option value="auxiliar">Auxiliar</option>
              <option value="supervisor">Supervisor</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Empresa</label>
            <input type="text" class="form-control" id="personal_empresa" maxlength="100" placeholder="DICORJES E.I.R.L.">
          </div>
          <div class="form-group">
            <label class="form-label">Teléfono</label>
            <input type="text" class="form-control" id="personal_telefono" maxlength="20">
          </div>
          <div class="form-group">
            <label class="form-label">Fecha de Nacimiento</label>
            <input type="date" class="form-control" id="personal_fecha_nacimiento">
          </div>
          <div class="form-group">
            <label class="form-label">Fecha de ingreso</label>
            <input type="date" class="form-control" id="personal_fecha_ingreso">
          </div>
          <div class="form-group">
            <label class="form-label">Vencimiento DNI</label>
            <input type="date" class="form-control" id="personal_dni_vencimiento">
          </div>
          <div class="form-group">
            <label class="form-label">Estado</label>
            <select class="form-control" id="personal_activo">
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </div>
        </div>

        <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gris-400);letter-spacing:.08em;margin:18px 0 10px">Licencia / Brevete</p>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">N° Licencia</label>
            <input type="text" class="form-control" id="personal_num_licencia" maxlength="30">
          </div>
          <div class="form-group">
            <label class="form-label">Categoría</label>
            <select class="form-control" id="personal_categoria_licencia">
              <option value="">— Sin licencia —</option>
              <option value="A-I">A-I</option>
              <option value="A-IIa">A-IIa</option>
              <option value="A-IIb">A-IIb</option>
              <option value="A-IIIa">A-IIIa</option>
              <option value="A-IIIb">A-IIIb</option>
              <option value="A-IIIc">A-IIIc</option>
              <option value="B-I">B-I</option>
              <option value="B-IIa">B-IIa</option>
              <option value="B-IIb">B-IIb</option>
              <option value="B-IIc">B-IIc</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Vencimiento Brevete</label>
            <input type="date" class="form-control" id="personal_vencimiento_brevete">
          </div>
        </div>

        <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gris-400);letter-spacing:.08em;margin:18px 0 10px">Otros</p>
        <div class="form-grid">
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Foto</label>
            <input type="file" class="form-control" id="personal_foto" accept="image/*">
            <small style="color:var(--gris-400)">JPG, PNG, WEBP · Máx 5MB</small>
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Observaciones</label>
            <textarea class="form-control" id="personal_observaciones" rows="2"></textarea>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px">
          <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalPersonal')">Cancelar</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- ===== MODAL CAMBIAR ROL ===== -->
<div class="modal-overlay" id="modalCambiarRol">
  <div class="modal-box" style="max-width:420px">
    <div class="modal-header">
      <h3><i class="fas fa-user-tag" style="color:var(--primary)"></i> Cambiar Rol</h3>
      <button class="modal-close" onclick="cerrarModal('modalCambiarRol')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="cr_usuario_id">
      <p id="cr_usuario_nombre" style="font-size:14px;font-weight:600;color:var(--gris-100);margin-bottom:18px;padding:10px 14px;background:var(--gris-700);border-radius:8px;border-left:3px solid var(--primary)"></p>

      <div class="form-group" style="margin-bottom:16px">
        <label class="form-label">Nuevo rol *</label>
        <select class="form-control" id="cr_rol" style="font-size:15px">
          <option value="administrador">🔑 Administrador — acceso completo</option>
          <option value="supervisor">👁 Supervisor — inspecciones, personal, reportes</option>
          <option value="inspector">📋 Inspector — solo inspecciones</option>
        </select>
      </div>

      <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:12px 14px;border:1px solid var(--gris-500);border-radius:8px;background:var(--gris-700)">
        <input type="checkbox" id="cr_reset_permisos" style="margin-top:2px;accent-color:var(--naranja);width:16px;height:16px;flex-shrink:0">
        <span>
          <strong style="font-size:13px;color:var(--gris-100)">Reiniciar permisos de módulos</strong><br>
          <span style="font-size:12px;color:var(--gris-400)">Elimina los permisos personalizados. El usuario usará los módulos por defecto del nuevo rol.</span>
        </span>
      </label>

      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px">
        <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalCambiarRol')">Cancelar</button>
        <button type="button" class="btn btn-primary" onclick="submitCambiarRol()">
          <i class="fas fa-save"></i> Actualizar rol
        </button>
      </div>
    </div>
  </div>
</div>

<!-- ===== MODAL USUARIO ===== -->
<div class="modal-overlay" id="modalUsuario">
  <div class="modal-box" style="max-width:520px">
    <div class="modal-header">
      <h3><i class="fas fa-user-plus" style="color:var(--amarillo)"></i> <span id="modalUsuarioTitulo">Nuevo Usuario</span></h3>
      <button class="modal-close" onclick="cerrarModal('modalUsuario')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <form id="formUsuario">
        <input type="hidden" id="usuario_id">
        <div class="form-group">
          <label class="form-label">Nombre completo *</label>
          <input type="text" class="form-control" id="usuario_nombre" required>
        </div>
        <div class="form-group">
          <label class="form-label">Usuario (login) *</label>
          <input type="text" class="form-control" id="usuario_usuario" required>
          <small style="color:var(--gris-400)">Solo letras, números, punto, guion y guion bajo</small>
        </div>
        <div class="form-group">
          <label class="form-label">Contraseña <span id="pwd_label_hint">*</span></label>
          <input type="password" class="form-control" id="usuario_password" minlength="6">
          <small style="color:var(--gris-400)" id="pwd_hint">Mínimo 6 caracteres</small>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Rol *</label>
            <select class="form-control" id="usuario_rol">
              <option value="administrador">Administrador</option>
              <option value="supervisor">Supervisor</option>
              <option value="inspector" selected>Inspector</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Estado</label>
            <select class="form-control" id="usuario_activo">
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </div>
        </div>
        <!-- Módulos permitidos (solo para no-admin) -->
        <div id="seccionModulos" style="margin-top:18px;display:none">
          <div style="font-size:11px;font-weight:700;color:var(--gris-300);text-transform:uppercase;letter-spacing:1.2px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--gris-600)">
            <i class="fas fa-shield-halved" style="color:var(--primary);margin-right:6px"></i>
            Módulos permitidos
            <span style="font-weight:400;color:var(--gris-400);margin-left:6px">(vacío = usa defaults del rol)</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px" id="checkboxModulos">
            <label class="modulo-check"><input type="checkbox" value="dashboard" disabled checked> <i class="fas fa-gauge-high"></i> Dashboard</label>
            <label class="modulo-check"><input type="checkbox" value="inspecciones" id="mod_inspecciones"> <i class="fas fa-clipboard-list"></i> Inspecciones</label>
            <label class="modulo-check"><input type="checkbox" value="personal" id="mod_personal"> <i class="fas fa-id-card"></i> Personal</label>
            <label class="modulo-check"><input type="checkbox" value="reportes" id="mod_reportes"> <i class="fas fa-chart-bar"></i> Reportes</label>
            <label class="modulo-check"><input type="checkbox" value="matriz" id="mod_matriz"> <i class="fas fa-bolt"></i> Matriz Consecuencias</label>
            <label class="modulo-check"><input type="checkbox" value="amonestaciones" id="mod_amonestaciones"> <i class="fas fa-file-signature"></i> Amonestaciones</label>
            <label class="modulo-check"><input type="checkbox" value="geocercas" id="mod_geocercas"> <i class="fas fa-draw-polygon"></i> Geocercas</label>
          </div>
          <p style="font-size:11px;color:var(--gris-400);margin-top:8px"><i class="fas fa-info-circle"></i> Dashboard siempre visible. Desmarca todo para usar defaults del rol.</p>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px">
          <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalUsuario')">Cancelar</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- ===== LIGHTBOX FOTO ===== -->
<div class="modal-overlay" id="modalFoto" onclick="cerrarLightboxSiClick(event)">
  <div style="position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;padding:20px;box-sizing:border-box">

    <!-- Botón cerrar -->
    <button onclick="cerrarModal('modalFoto')"
      style="position:fixed;top:16px;right:20px;background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.2);
             color:#fff;border-radius:50%;width:42px;height:42px;font-size:18px;cursor:pointer;z-index:10;
             display:flex;align-items:center;justify-content:center;transition:background 0.2s"
      onmouseover="this.style.background='rgba(245,200,0,0.8)';this.style.color='#000'"
      onmouseout="this.style.background='rgba(0,0,0,0.7)';this.style.color='#fff'">
      <i class="fas fa-times"></i>
    </button>

    <!-- Flecha izquierda -->
    <button id="lbBtnPrev" onclick="navegarGaleria(-1)"
      style="position:fixed;left:16px;top:50%;transform:translateY(-50%);
             background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.2);
             color:#fff;border-radius:50%;width:48px;height:48px;font-size:20px;
             cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;
             transition:background 0.2s"
      onmouseover="this.style.background='rgba(245,200,0,0.8)';this.style.color='#000'"
      onmouseout="this.style.background='rgba(0,0,0,0.7)';this.style.color='#fff'">
      <i class="fas fa-chevron-left"></i>
    </button>

    <!-- Imagen principal -->
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px;max-width:92vw">
      <img id="modalFotoImg" src="" alt=""
        style="max-width:88vw;max-height:80vh;border-radius:10px;
               box-shadow:0 20px 60px rgba(0,0,0,0.8);object-fit:contain;display:block">
      <!-- Contador y nombre -->
      <div id="lbContador"
        style="color:#fff;font-size:13px;background:rgba(0,0,0,0.6);
               padding:6px 16px;border-radius:20px;letter-spacing:0.5px">
        Foto 1 de 1
      </div>
      <!-- Miniaturas -->
      <div id="lbMiniaturas"
        style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:88vw">
      </div>
    </div>

    <!-- Flecha derecha -->
    <button id="lbBtnNext" onclick="navegarGaleria(1)"
      style="position:fixed;right:16px;top:50%;transform:translateY(-50%);
             background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.2);
             color:#fff;border-radius:50%;width:48px;height:48px;font-size:20px;
             cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;
             transition:background 0.2s"
      onmouseover="this.style.background='rgba(245,200,0,0.8)';this.style.color='#000'"
      onmouseout="this.style.background='rgba(0,0,0,0.7)';this.style.color='#fff'">
      <i class="fas fa-chevron-right"></i>
    </button>
  </div>
</div>

<!-- ===== MODAL DETALLE ===== -->
<div class="modal-overlay" id="modalDetalle">
  <div class="modal-box" style="max-width:1100px">
    <div class="modal-header">
      <h3 style="font-size:22px;letter-spacing:1px"><i class="fas fa-clipboard-check" style="color:var(--amarillo)"></i> DETALLE DE INSPECCIÓN EN RUTA</h3>
      <button class="modal-close" onclick="cerrarModal('modalDetalle')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body" id="modalDetalleBody">
      <div style="text-align:center;padding:32px"><div class="spinner"></div></div>
    </div>
  </div>
</div>

<!-- ===== MODAL GEOCERCAS ===== -->
<?php if (tieneAccesoModulo('geocercas')): ?>
<div class="modal-overlay" id="modalGeo">
  <div class="modal-box" style="max-width:700px">
    <div class="modal-header">
      <h3><i class="fas fa-draw-polygon" style="color:var(--primary)"></i> <span id="modalGeoTitulo">Nueva Geocerca</span></h3>
      <button class="modal-close" onclick="cerrarModal('modalGeo');if(geoDrawMap){geoDrawMap.remove();geoDrawMap=null;}"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <form id="formGeo">
        <input type="hidden" id="geo_id"              name="id">
        <input type="hidden" id="geo_tipo"            name="tipo">
        <input type="hidden" id="geoCoordenadasHidden" name="coordenadas">

        <!-- Fila: Nombre + Color -->
        <div class="form-grid" style="grid-template-columns:1fr auto;gap:12px;margin-bottom:10px">
          <div class="form-group" style="margin:0">
            <label class="form-label">Nombre *</label>
            <input type="text" class="form-control" id="geo_nombre" name="nombre" placeholder="Ej: Zona Roja Av. Ferrocarril" required>
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Color</label>
            <input type="color" class="form-control" id="geo_color" name="color" style="height:38px;padding:3px 6px;cursor:pointer" oninput="geoColorCambiado()">
          </div>
        </div>

        <!-- Campos solo para Zonas N3 -->
        <div id="geoClienteFields" style="display:none">
          <input type="hidden" id="geo_icono" name="icono" value="fa-circle">

          <!-- Selector de icono -->
          <div class="form-group" style="margin-bottom:10px">
            <label class="form-label">Icono del marcador</label>
            <div id="geoIconPicker" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px"></div>
          </div>

          <!-- Fila: Código + Dirección de Cliente -->
          <div class="form-grid" style="grid-template-columns:1fr 2fr;gap:10px;margin-bottom:10px">
            <div class="form-group" style="margin:0">
              <label class="form-label">Código</label>
              <input type="text" class="form-control" id="geo_codigo" name="codigo" placeholder="Ej: 12527266">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Dirección de Cliente</label>
              <input type="text" class="form-control" id="geo_direccion_cliente" name="direccion_cliente" placeholder="Ej: Jr. Ayacucho 527 - 529">
            </div>
          </div>

          <!-- Fila: Latitud + Longitud (solo Zona N3) -->
          <div id="geoLatLngFields" style="display:none">
            <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
              <div class="form-group" style="margin:0">
                <label class="form-label"><i class="fas fa-location-dot" style="color:var(--primary);margin-right:4px"></i>Latitud</label>
                <input type="number" step="any" class="form-control" id="geo_lat" placeholder="-15.4948788">
              </div>
              <div class="form-group" style="margin:0">
                <label class="form-label"><i class="fas fa-location-dot" style="color:var(--primary);margin-right:4px"></i>Longitud</label>
                <input type="number" step="any" class="form-control" id="geo_lng" placeholder="-70.1345618">
              </div>
            </div>
          </div>

          <!-- Fila: Supervisor + Clientes N3 -->
          <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
            <div class="form-group" style="margin:0">
              <label class="form-label">Supervisor</label>
              <input type="text" class="form-control" id="geo_supervisor" name="supervisor" placeholder="Nombre del supervisor">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Clientes N3</label>
              <input type="text" class="form-control" id="geo_clientes_n3" name="clientes_n3" placeholder="Ej: CLIENTE N3 2022">
            </div>
          </div>
        </div>

        <!-- Descripción -->
        <div class="form-group" style="margin-bottom:10px">
          <label class="form-label">Descripción</label>
          <textarea class="form-control" id="geo_descripcion" name="descripcion" rows="2" placeholder="Descripción opcional"></textarea>
        </div>

        <!-- Instrucciones -->
        <div style="background:rgba(26,187,156,.08);border:1px solid rgba(26,187,156,.25);border-radius:4px;padding:8px 12px;font-size:12px;color:var(--gris-300);margin-bottom:10px;display:flex;align-items:flex-start;gap:8px">
          <i class="fas fa-info-circle" style="color:var(--primary);margin-top:1px;flex-shrink:0"></i>
          <span id="geoDrawHint">Usa las herramientas del mapa para dibujar.</span>
        </div>

        <!-- Mapa de dibujo -->
        <div style="border-radius:4px;overflow:hidden;border:1px solid var(--gris-600)">
          <div id="geoDrawMap" style="height:360px;width:100%"></div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
          <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalGeo');if(geoDrawMap){geoDrawMap.remove();geoDrawMap=null;}">Cancelar</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>
</div>
<?php endif; ?>

<!-- ===== MODAL IMPORT ZONAS N3 ===== -->
<?php if (tieneAccesoModulo('geocercas')): ?>
<div class="modal-overlay" id="modalGeoImport">
  <div class="modal-box" style="max-width:820px">
    <div class="modal-header">
      <h3><i class="fas fa-file-import" style="color:var(--primary)"></i> Vista Previa — Importar Zonas N3</h3>
      <button class="modal-close" onclick="cerrarModal('modalGeoImport')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div id="geoImportPreviewBody"></div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
        <button class="btn btn-secondary" onclick="cerrarModal('modalGeoImport')">Cancelar</button>
        <button class="btn btn-primary" id="btnConfirmarImportN3" onclick="confirmarImportN3()">
          <i class="fas fa-check"></i> Confirmar importación
        </button>
      </div>
    </div>
  </div>
</div>
<?php endif; ?>

<!-- TOAST CONTAINER -->
<div class="toast-container" id="toastContainer"></div>

<!-- ===== SCRIPTS ===== -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<!-- Leaflet (para módulo Geocercas) -->
<?php if (tieneAccesoModulo('geocercas')): ?>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<?php endif; ?>
<!-- React + Babel (para módulo Matriz) -->
<script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<!-- JS separado por módulo -->
<script src="assets/js/core.js?v=<?= filemtime(__DIR__.'/assets/js/core.js') ?>&r=3"></script>
<script src="assets/js/modulos/dashboard.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/dashboard.js') ?>&r=3"></script>
<script src="assets/js/modulos/inspecciones.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/inspecciones.js') ?>&r=3"></script>
<script src="assets/js/modulos/personal.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/personal.js') ?>"></script>
<script src="assets/js/modulos/amonestaciones.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/amonestaciones.js') ?>"></script>
<script src="assets/js/modulos/usuarios.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/usuarios.js') ?>"></script>
<?php if (tieneAccesoModulo('geocercas')): ?>
<script src="assets/js/modulos/geocercas.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/geocercas.js') ?>"></script>
<?php endif; ?>
<?php if (tieneAccesoModulo('matriz')): ?>
<script type="text/babel" src="assets/js/modulos/matriz.js?v=<?= filemtime(__DIR__.'/assets/js/modulos/matriz.js') ?>"></script>
<?php endif; ?>
<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/distribucion-segura/sw.js', { scope: '/distribucion-segura/' })
      .catch(() => {});
  }
</script>
</body>
</html>