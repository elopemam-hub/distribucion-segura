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
