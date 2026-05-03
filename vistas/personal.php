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
        <button class="btn btn-outline btn-sm" onclick="descargarPlantillaPersonal()"><i class="fas fa-download"></i> Plantilla</button>
        <label class="btn btn-outline btn-sm" style="cursor:pointer;margin:0">
          <i class="fas fa-file-import"></i> Importar Excel
          <input type="file" id="inputImportarPersonal" accept=".xlsx,.xls" style="display:none" onchange="importarExcelPersonal(this)">
        </label>
        <button class="btn btn-outline btn-sm" onclick="exportarExcelPersonal()"><i class="fas fa-file-excel"></i> Exportar</button>
        <button class="btn btn-primary btn-sm" onclick="abrirModalPersonal()"><i class="fas fa-plus"></i> Nuevo</button>
      </div>
    </div>

    <!-- KPI cards -->
    <div class="kpi-grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:20px">
      <div class="kpi-card verde"><i class="fas fa-users kpi-icon"></i><div class="kpi-label">Total activos</div><div class="kpi-value verde" id="kpiPersonalTotal">—</div><div class="kpi-sub" id="kpiPersonalTotalSub">de 0 registros</div></div>
      <div class="kpi-card rojo"><i class="fas fa-id-card kpi-icon"></i><div class="kpi-label">DNI vencido / por vencer</div><div class="kpi-value rojo" id="kpiPersonalDniVenc">—</div><div class="kpi-sub" id="kpiPersonalDniSub">en los próximos 30 días</div></div>
      <div class="kpi-card amarillo"><i class="fas fa-car kpi-icon"></i><div class="kpi-label">Brevete vencido / por vencer</div><div class="kpi-value amarillo" id="kpiPersonalBreveteVenc">—</div><div class="kpi-sub" id="kpiPersonalBreteSub">en los próximos 30 días</div></div>
      <div class="kpi-card azul"><i class="fas fa-file-alt kpi-icon"></i><div class="kpi-label">Sin licencia registrada</div><div class="kpi-value" id="kpiPersonalSinLic">—</div><div class="kpi-sub">conductores sin N° licencia</div></div>
    </div>

    <!-- Filtros -->
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

    <!-- Tabla -->
    <div class="card">
      <div class="card-body" style="padding:0">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Foto</th><th>DNI</th><th>Nombre</th><th>Cargo</th><th>Empresa</th>
                <th>Teléfono</th><th>Ingreso</th><th>Venc. DNI</th><th>N° Licencia</th>
                <th>Categoría</th><th>Venc. Brevete</th><th>Días DNI</th><th>Días Brevete</th>
                <th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody id="tablaPersonalBody">
              <tr><td colspan="15" style="text-align:center;padding:32px;color:var(--gris-400)"><div class="spinner"></div> Cargando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
