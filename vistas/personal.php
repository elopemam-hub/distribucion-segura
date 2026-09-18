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

    <!-- Sub-pestañas de Personal -->
    <div class="tabs" style="margin-bottom:20px">
      <button class="tab-btn personal-tab-btn active" id="personal-btn-listado" onclick="switchPersonalTab('listado')"><i class="fas fa-list"></i> Listado</button>
      <button class="tab-btn personal-tab-btn" id="personal-btn-docs" onclick="switchPersonalTab('docs')"><i class="fas fa-id-card"></i> DNI y Licencia <span id="personalDocsBadge" class="badge badge-danger" style="display:none;margin-left:4px"></span></button>
      <button class="tab-btn personal-tab-btn" id="personal-btn-cumplimiento" onclick="switchPersonalTab('cumplimiento')"><i class="fas fa-clipboard-check"></i> Cumplimiento</button>
      <button class="tab-btn personal-tab-btn" id="personal-btn-cumpleanos" onclick="switchPersonalTab('cumpleanos')"><i class="fas fa-cake-candles"></i> Cumpleaños</button>
    </div>

    <div class="tab-panel personal-tab-panel active" id="personal-panel-listado">
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
        <div class="kpi-value azul" id="kpiPersonalSinLic">—</div>
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
        <div class="table-wrap tbl-scroll">
          <table class="data-table">
            <thead>
              <tr>
                <th>Foto</th>
                <th>DNI</th>
                <th>F. Nacimiento</th>
                <th>Nombre</th>
                <th>Cargo</th>
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
              <tr><td colspan="15" style="text-align:center;padding:32px;color:var(--gris-400)"><div class="spinner"></div> Cargando...</td></tr>
            </tbody>
          </table>
        </div>
        <div class="amon-pag-bar">
          <span class="amon-pag-info" id="pagInfoPersonal"></span>
          <div class="amon-pag-btns" id="pagBtnsPersonal"></div>
        </div>
      </div>
    </div>
    </div><!-- /panel listado -->

    <!-- ══════════ PANEL: CUMPLIMIENTO DOCUMENTARIO ══════════ -->
    <div class="tab-panel personal-tab-panel" id="personal-panel-cumplimiento">
      <div class="kpi-grid" id="cumpKpis" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:18px"></div>
      <div class="card" style="margin-bottom:18px">
        <div class="card-body" style="padding:14px 20px">
          <div class="filter-bar">
            <div class="form-group"><label class="form-label">Buscar</label>
              <input type="text" class="form-control" id="cumpBuscar" placeholder="Nombre o DNI" oninput="_cumpPag=1;renderCumplimiento()"></div>
            <div class="form-group"><label class="form-label">Cargo</label>
              <select class="form-control" id="cumpCargo" onchange="_cumpPag=1;renderCumplimiento()">
                <option value="">Todos</option><option value="conductor">Conductor</option><option value="reparto">Reparto</option>
                <option value="auxiliar">Auxiliar</option><option value="supervisor">Supervisor</option><option value="otro">Otro</option>
              </select></div>
            <div class="form-group"><label class="form-label">Estado</label>
              <select class="form-control" id="cumpEstado" onchange="_cumpPag=1;renderCumplimiento()">
                <option value="">Todos</option><option value="incompleto">Incompletos</option><option value="completo">Completos</option>
              </select></div>
            <button class="btn btn-outline btn-sm" onclick="exportarCumplimiento()"><i class="fas fa-file-excel"></i> Exportar</button>
          </div>
          <p class="muted" style="font-size:11.5px;margin:8px 0 0"><i class="fas fa-check" style="color:var(--verde)"></i> completo · <i class="fas fa-xmark" style="color:var(--rojo)"></i> falta · — no aplica</p>
        </div>
      </div>
      <div class="card"><div class="card-body" style="padding:0"><div class="table-wrap" id="cumpTablaWrap">
        <p class="muted" style="text-align:center;padding:28px">Cargando…</p>
      </div></div></div>
    </div>

    <!-- ══════════ PANEL: CUMPLEAÑOS ══════════ -->
    <!-- ===== SUB-MÓDULO: DNI Y LICENCIA ===== -->
    <div class="tab-panel personal-tab-panel" id="personal-panel-docs">
      <div class="card" style="margin-bottom:16px"><div class="card-body" style="padding:14px 20px">
        <div class="filter-bar">
          <div class="form-group"><label class="form-label">Buscar</label>
            <input type="text" class="form-control" id="personalDocsBuscar" placeholder="Nombre o DNI…" oninput="renderPersonalDocs()"></div>
          <div class="form-group"><label class="form-label">Mostrar</label>
            <select class="form-control" id="personalDocsFiltro" onchange="renderPersonalDocs()">
              <option value="todos">Todos</option>
              <option value="conductor">Solo conductores</option>
              <option value="alertas">Solo por vencer / vencidos</option>
            </select></div>
        </div>
      </div></div>
      <div id="personalDocsAlertas" style="margin-bottom:16px"></div>
      <div id="personalDocsLista"><p class="muted" style="text-align:center;padding:28px">Cargando…</p></div>
    </div>

    <div class="tab-panel personal-tab-panel" id="personal-panel-cumpleanos">
      <div class="kpi-grid" id="cumpleKpis" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:16px"></div>
      <div class="card" style="margin-bottom:16px">
        <div class="card-body" style="padding:14px 20px">
          <div class="filter-bar" style="align-items:flex-end">
            <div class="form-group"><label class="form-label">Mes</label>
              <select class="form-control" id="cumpleMes" onchange="cumpleCambioMes()"></select></div>
            <div class="form-group"><label class="form-label">Año</label>
              <select class="form-control" id="cumpleAnio" onchange="cumpleCambioMes()"></select></div>
            <div class="form-group" style="flex:1;min-width:240px"><label class="form-label">Saludo del mes <span class="muted" style="font-weight:400;font-size:11px">(aparece en el mural)</span></label>
              <input type="text" class="form-control" id="cumpleSaludo" maxlength="200" placeholder="¡Feliz cumpleaños a nuestro equipo! 🎉" oninput="renderMuralCumple()"></div>
            <button class="btn btn-outline btn-sm" id="cumpleGuardarSaludoBtn" onclick="guardarSaludoCumple()"><i class="fas fa-save"></i> Guardar saludo</button>
            <label class="btn btn-outline btn-sm" style="margin:0" title="Imagen de fondo del mural (JPG/PNG/WEBP)">
              <i class="fas fa-panorama"></i> Fondo
              <input type="file" id="cumpleFondo" accept="image/*" style="display:none" onchange="subirFondoCumple(this)">
            </label>
            <button class="btn btn-outline btn-sm" id="cumpleQuitarFondoBtn" style="display:none" onclick="quitarFondoCumple()" title="Quitar imagen de fondo"><i class="fas fa-eraser"></i></button>
            <button class="btn btn-primary btn-sm" onclick="descargarMuralCumple('png')"><i class="fas fa-image"></i> Descargar PNG</button>
            <button class="btn btn-outline btn-sm" onclick="descargarMuralCumple('pdf')"><i class="fas fa-file-pdf"></i> PDF</button>
          </div>
        </div>
      </div>
      <div id="cumpleMuralWrap" style="overflow:auto"></div>
    </div>
  </div>
