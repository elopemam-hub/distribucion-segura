  <div class="page-content" id="page-dashboard">

    <!-- Cabecera -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
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
        <button class="btn btn-outline btn-sm" onclick="cargarDashboard()" title="Actualizar">
          <i class="fas fa-rotate-right"></i>
        </button>
      </div>
    </div>

    <!-- ── Fila 1: 6 KPI cards ── -->
    <div id="kpiGrid" class="dash-kpi-grid" style="margin-bottom:18px">
      <?php for($i=0;$i<6;$i++): ?>
      <div class="dash-kpi-skeleton"></div>
      <?php endfor; ?>
    </div>

    <!-- ── Resumen por módulo ── -->
    <div class="card" style="margin-bottom:18px"><div class="card-header">
        <h3><i class="fas fa-layer-group"></i> Resumen por módulo</h3>
        <span style="font-size:11px;color:var(--gris-400)">clic para abrir el módulo</span></div>
      <div class="card-body" style="padding:14px 18px">
        <div id="dashModulos" class="mod-grid"></div>
      </div></div>

    <!-- ── Fila 2: Tendencia (2/3) + Distribución donut (1/3) ── -->
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:18px;margin-bottom:18px" class="charts-row">
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-chart-line"></i> Tendencia del mes</h3>
          <div id="dashTendLegend" style="display:flex;gap:14px;font-size:11px;color:var(--gris-400)"></div>
        </div>
        <div class="card-body" style="padding-bottom:14px">
          <canvas id="chartTendencia" height="200"></canvas>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-chart-pie"></i> Distribución</h3>
        </div>
        <div class="card-body" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px">
          <div style="position:relative;width:160px;height:160px">
            <canvas id="chartDonut" width="160" height="160"></canvas>
            <div id="donutCenter" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none">
              <div style="font-family:var(--font-display);font-size:26px;font-weight:900;color:var(--gris-100)" id="donutPct">—</div>
              <div style="font-size:10px;color:var(--gris-400);text-transform:uppercase;letter-spacing:.5px">aprobación</div>
            </div>
          </div>
          <div id="donutLeyenda" style="margin-top:16px;width:100%;display:flex;flex-direction:column;gap:6px"></div>
        </div>
      </div>
    </div>

    <!-- ── Fila 3: Ranking + Hallazgos ── -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px" class="charts-row">
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-trophy"></i> Ranking Conductores</h3>
          <span id="rankingTotal" style="font-size:11px;color:var(--gris-400)"></span>
        </div>
        <div class="card-body" id="rankingConductores" style="padding:10px 18px"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-triangle-exclamation"></i> Principales Hallazgos</h3>
          <div id="hallazgosBadges" style="display:flex;gap:6px"></div>
        </div>
        <div class="card-body" id="principalesHallazgos" style="max-height:290px;overflow-y:auto"></div>
      </div>
    </div>

    <!-- ── Fila 4: EPP por rol + Items checklist ── -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px" class="charts-row">
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-hard-hat"></i> EPP por Rol</h3>
          <span id="eppGlobalBadge" style="font-size:12px;font-weight:700"></span>
        </div>
        <div class="card-body" id="dashEpp" style="padding:14px 20px"></div>
      </div>
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-list-check"></i> Cumplimiento por Ítem</h3>
          <span style="font-size:11px;color:var(--gris-400)">peores primero</span>
        </div>
        <div class="card-body" style="max-height:290px;overflow-y:auto">
          <div id="itemsChecklist"></div>
        </div>
      </div>
    </div>

  </div>
