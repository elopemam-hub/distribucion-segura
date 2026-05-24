  <!-- ===== PAGE: AMONESTACIONES ===== -->
  <div class="page-content" id="page-amonestaciones" style="display:none">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--gris-100)">
          <i class="fas fa-file-signature" style="color:var(--primary)"></i> Amonestaciones
        </h2>
        <p style="color:var(--gris-400);font-size:13px;margin-top:2px">Registro de amonestaciones por tipo de infracción</p>
      </div>
    </div>
    <!-- KPI cards -->
    <div class="kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin-bottom:20px">
      <div class="kpi-card azul"><i class="fas fa-list kpi-icon"></i><div class="kpi-label">Total</div><div class="kpi-value" id="kpiAmonTotal">—</div><div class="kpi-sub">registros</div></div>
      <div class="kpi-card" style="border-top:4px solid #5EA8E6"><i class="fas fa-wallet kpi-icon"></i><div class="kpi-label">Bancarización</div><div class="kpi-value" style="color:#0d5c9a" id="kpiAmonBanc">—</div><div class="kpi-sub">amonestaciones</div></div>
      <div class="kpi-card rojo"><i class="fas fa-store kpi-icon"></i><div class="kpi-label">N3</div><div class="kpi-value rojo" id="kpiAmonN3">—</div><div class="kpi-sub">amonestaciones</div></div>
      <div class="kpi-card" style="border-top:4px solid #C387C2"><i class="fas fa-satellite-dish kpi-icon"></i><div class="kpi-label">Telemetría</div><div class="kpi-value" style="color:#7B52A0" id="kpiAmonTele">—</div><div class="kpi-sub">amonestaciones</div></div>
      <div class="kpi-card amarillo"><i class="fas fa-clock kpi-icon"></i><div class="kpi-label">Pendientes</div><div class="kpi-value amarillo" id="kpiAmonPend">—</div><div class="kpi-sub">por notificar</div></div>
    </div>
    <!-- Tabs -->
    <div class="tabs" style="margin-bottom:0;border-bottom:2px solid var(--gris-600);padding-bottom:0;gap:2px">
      <button class="tab-btn insp-tab-btn active" id="amon-btn-bancarizacion" onclick="switchAmonTab('bancarizacion')" style="border-radius:8px 8px 0 0"><i class="fas fa-wallet"></i> Bancarización</button>
      <button class="tab-btn insp-tab-btn" id="amon-btn-n3" onclick="switchAmonTab('n3')" style="border-radius:8px 8px 0 0"><i class="fas fa-store"></i> N3</button>
      <button class="tab-btn insp-tab-btn" id="amon-btn-telemetria" onclick="switchAmonTab('telemetria')" style="border-radius:8px 8px 0 0"><i class="fas fa-satellite-dish"></i> Telemetría</button>
    </div>
    <div class="card" style="border-radius:0 8px 8px 8px;margin-top:0">
      <div class="card-body" style="padding:16px 22px">
        <div class="filter-bar">
          <div class="form-group"><label class="form-label">Buscar personal</label><input type="text" class="form-control" id="filtroAmonQ" placeholder="Nombre..."></div>
          <div class="form-group"><label class="form-label">Estado</label>
            <select class="form-control" id="filtroAmonEstado"><option value="">Todos</option><option value="pendiente">Pendiente</option><option value="notificado">Notificado</option><option value="cerrado">Cerrado</option></select>
          </div>
          <button class="btn btn-primary" onclick="cargarAmonestaciones()"><i class="fas fa-search"></i> Buscar</button>
          <button class="btn btn-outline" onclick="exportarExcelAmon()" title="Exportar pestaña actual a Excel" style="margin-left:auto;border-color:#27AE60;color:#27AE60"><i class="fas fa-file-excel"></i> Excel</button>
          <?php if (in_array($user['rol'], ['administrador','supervisor'])): ?>
          <button class="btn btn-outline" onclick="abrirModalAmon()"><i class="fas fa-plus"></i> Nueva</button>
          <?php endif; ?>
        </div>
      </div>
      <!-- Tabla Bancarización -->
      <div class="amon-tab-panel active" id="amon-panel-bancarizacion">
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Fecha</th><th>DNI</th><th>Nombre y Apellidos</th><th>Reincidente</th><th>Acciones (Plan)</th><th>Motivo</th><th>Importe</th><th>Docs</th><th>Opciones</th></tr></thead>
          <tbody id="tbodyBancarizacion"><tr><td colspan="9" style="text-align:center;padding:32px;color:var(--gris-400)"><div class="spinner"></div></td></tr></tbody>
        </table></div>
      </div>
      <!-- Tabla N3 -->
      <div class="amon-tab-panel" id="amon-panel-n3" style="display:none">
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>Fecha</th><th>DNI</th><th>Nombre y Apellidos</th><th>Cliente N3</th><th>Reincidente</th><th>Acciones (Plan)</th><th>Motivo</th><th>Docs</th><th>Opciones</th></tr></thead>
          <tbody id="tbodyN3"><tr><td colspan="9" style="text-align:center;padding:32px;color:var(--gris-400)"><div class="spinner"></div></td></tr></tbody>
        </table></div>
      </div>
      <!-- Tabla Telemetría -->
      <div class="amon-tab-panel" id="amon-panel-telemetria" style="display:none">
        <div class="table-wrap"><table class="data-table">
          <thead><tr><th>ID</th><th>Fecha</th><th>Placa</th><th>Regla</th><th>Evento alerta</th><th>Tipo sanción</th><th>Nombres y apellidos</th><th>Tipo de sanción</th><th>Reincidente</th><th>Plan de acciones</th><th>Fecha cierre</th><th>Comentarios</th><th>Acciones</th></tr></thead>
          <tbody id="tbodyTelemetria"><tr><td colspan="13" style="text-align:center;padding:32px;color:var(--gris-400)"><div class="spinner"></div></td></tr></tbody>
        </table></div>
      </div>
    </div>
  </div>
