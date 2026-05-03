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
    <div class="kpi-grid" id="kpiGrid">
      <?php for($i=0;$i<5;$i++): ?>
      <div class="kpi-card" style="height:100px;background:var(--gris-700);animation:pulse 1.5s infinite"></div>
      <?php endfor; ?>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px" class="charts-row">
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-chart-line"></i> Tendencia (7 días)</h3></div>
        <div class="card-body"><canvas id="chartTendencia" height="220"></canvas></div>
      </div>
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-list-check"></i> Cumplimiento por Ítem</h3></div>
        <div class="card-body" style="max-height:260px;overflow-y:auto"><div id="itemsChecklist"></div></div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px" class="charts-row">
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-trophy"></i> Ranking Conductores</h3></div>
        <div class="card-body" id="rankingConductores" style="padding:12px 22px"></div>
      </div>
      <div class="card">
        <div class="card-header"><h3><i class="fas fa-triangle-exclamation"></i> Principales Hallazgos</h3></div>
        <div class="card-body" id="principalesHallazgos" style="max-height:280px;overflow-y:auto"></div>
      </div>
    </div>
  </div>
