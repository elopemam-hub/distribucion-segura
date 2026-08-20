  <!-- ===== PAGE: CHECKLIST DE UNIDADES ===== -->
  <div class="page-content" id="page-checklist" style="display:none">

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--gris-100)">
          <i class="fas fa-clipboard-check" style="color:var(--amarillo)"></i> Checklist de Unidades
        </h2>
        <p style="color:var(--gris-400);font-size:13px;margin-top:2px">
          Inspección mensual de componentes de seguridad por unidad · Ley N° 29783 · NTP 350.043
        </p>
      </div>
    </div>

    <div class="tabs" style="margin-bottom:18px">
      <button class="tab-btn chk-tab-btn active" id="chk-btn-dashboard" onclick="switchChkTab('dashboard')"><i class="fas fa-gauge-high"></i> Dashboard</button>
      <button class="tab-btn chk-tab-btn" id="chk-btn-formularios" onclick="switchChkTab('formularios')"><i class="fas fa-table-cells-large"></i> Formularios</button>
      <button class="tab-btn chk-tab-btn" id="chk-btn-inspecciones" onclick="switchChkTab('inspecciones')"><i class="fas fa-list-check"></i> Inspecciones</button>
      <button class="tab-btn chk-tab-btn" id="chk-btn-cumplimiento" onclick="switchChkTab('cumplimiento')"><i class="fas fa-table-cells"></i> Cumplimiento</button>
      <button class="tab-btn chk-tab-btn" id="chk-btn-equipos" onclick="switchChkTab('equipos')"><i class="fas fa-chart-column"></i> Equipos</button>
      <button class="tab-btn chk-tab-btn" id="chk-btn-config" onclick="switchChkTab('config')"><i class="fas fa-sliders"></i> Configuración</button>
    </div>

    <div class="kpi-grid" id="chkKpis" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:16px"></div>

    <!-- Filtros -->
    <div class="card" id="chkFiltros" style="margin-bottom:16px"><div class="card-body" style="padding:14px 20px">
      <div class="filter-bar">
        <div class="form-group"><label class="form-label">Mes</label>
          <input type="month" class="form-control" id="chkFiltroPeriodo" onchange="chkRecargar()"></div>
        <div class="form-group" id="chkFiltroEquipoWrap"><label class="form-label">Equipo</label>
          <select class="form-control" id="chkFiltroEquipo" onchange="cargarChecklist()"><option value="">Todos</option></select></div>
        <div class="form-group" id="chkFiltroTipoWrap" style="display:none"><label class="form-label">Tipo de unidad</label>
          <select class="form-control" id="chkFiltroTipo" onchange="cargarChkCumplimiento()"><option value="">Todos</option></select></div>
        <div class="form-group" id="chkFiltroEstadoWrap"><label class="form-label">Estado</label>
          <select class="form-control" id="chkFiltroEstado" onchange="cargarChecklist()">
            <option value="">Todos</option><option value="apto">Apto</option>
            <option value="observado">Observado</option><option value="no_apto">No apto</option>
          </select></div>
        <div class="form-group" id="chkFiltroQWrap"><label class="form-label">Buscar</label>
          <input type="text" class="form-control" id="chkFiltroQ" placeholder="Placa o inspector…" oninput="chkBuscarDebounced()"></div>
        <button class="btn btn-primary" id="chkBtnNueva" onclick="nuevaInspeccion()"><i class="fas fa-plus"></i> Nueva inspección</button>
      </div>
    </div></div>

    <div class="card" id="chkTablaCard"><div class="card-body" style="padding:0">
      <div class="tbl-scroll" id="chkTablaWrap"><p class="muted" style="text-align:center;padding:28px">Cargando…</p></div>
      <div id="chkPagWrap"></div>
    </div></div>

    <!-- ===== DASHBOARD DE INSPECCIÓN DE EQUIPOS ===== -->
    <div id="chkDashboard" style="display:none">
      <div class="card" style="margin-bottom:16px"><div class="card-body" style="padding:12px 18px">
        <div class="filter-bar">
          <div class="form-group"><label class="form-label">Mes</label>
            <input type="month" class="form-control" id="chkDashMes" onchange="cargarChkDashboard()"></div>
          <div class="form-group"><label class="form-label">Tipo de unidad</label>
            <select class="form-control" id="chkDashTipo" onchange="cargarChkDashboard()"><option value="">Todos</option></select></div>
          <div class="form-group"><label class="form-label">Equipo</label>
            <select class="form-control" id="chkDashEquipo" onchange="cargarChkDashboard()"><option value="">Todos</option></select></div>
        </div>
      </div></div>

      <!-- KPIs -->
      <div id="chkDashKpis" class="dash-kpi-grid" style="margin-bottom:18px"></div>

      <!-- Tendencia + Estado de flota -->
      <div style="display:grid;grid-template-columns:2fr 1fr;gap:18px;margin-bottom:18px" class="charts-row">
        <div class="card"><div class="card-header">
          <h3><i class="fas fa-chart-line"></i> Tendencia de cobertura (6 meses)</h3>
          <div id="chkDashTendLeg" style="display:flex;gap:14px;font-size:11px;color:var(--gris-400)"></div>
        </div><div class="card-body" style="padding-bottom:14px"><canvas id="chkChartTend" height="200"></canvas></div></div>
        <div class="card"><div class="card-header"><h3><i class="fas fa-chart-pie"></i> Estado de la flota</h3></div>
          <div class="card-body" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:14px">
            <div style="position:relative;width:160px;height:160px">
              <canvas id="chkChartEstado" width="160" height="160"></canvas>
              <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none">
                <div style="font-family:var(--font-display);font-size:26px;font-weight:900;color:var(--gris-100)" id="chkEstadoPct">—</div>
                <div style="font-size:10px;color:var(--gris-400);text-transform:uppercase;letter-spacing:.5px">aptas</div>
              </div>
            </div>
            <div id="chkEstadoLeg" style="margin-top:16px;width:100%;display:flex;flex-direction:column;gap:6px"></div>
          </div></div>
      </div>

      <!-- Cumplimiento por equipo + Top no conformidades -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px" class="charts-row">
        <div class="card"><div class="card-header"><h3><i class="fas fa-list-check"></i> Cumplimiento por equipo</h3>
          <span style="font-size:11px;color:var(--gris-400)">% unidades inspeccionadas</span></div>
          <div class="card-body" style="padding:14px 18px"><canvas id="chkChartEquipo" height="240"></canvas></div></div>
        <div class="card"><div class="card-header"><h3><i class="fas fa-triangle-exclamation"></i> Top no conformidades</h3>
          <span style="font-size:11px;color:var(--gris-400)">fallas recurrentes</span></div>
          <div class="card-body" id="chkTopNc" style="max-height:300px;overflow-y:auto;padding:12px 18px"></div></div>
      </div>

      <!-- Unidades no aptas + No conformidades -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px" class="charts-row">
        <div class="card"><div class="card-header"><h3 style="color:var(--rojo)"><i class="fas fa-ban"></i> Unidades NO aptas</h3>
          <span id="chkNoAptasBadge" style="font-size:11px;color:var(--gris-400)"></span></div>
          <div class="card-body" id="chkNoAptasList" style="max-height:300px;overflow-y:auto;padding:6px 18px"></div></div>
        <div class="card"><div class="card-header"><h3><i class="fas fa-clipboard-list"></i> No conformidades del mes</h3>
          <span id="chkNcBadge" style="font-size:11px;color:var(--gris-400)"></span></div>
          <div class="card-body" id="chkNcList" style="max-height:300px;overflow-y:auto;padding:6px 18px"></div></div>
      </div>

      <!-- Unidades sin inspeccionar -->
      <div class="card"><div class="card-header"><h3><i class="fas fa-circle-question"></i> Unidades sin inspeccionar este mes</h3>
        <span id="chkSinInspBadge" style="font-size:11px;color:var(--gris-400)"></span></div>
        <div class="card-body" id="chkSinInspList" style="padding:14px 18px"></div></div>
    </div>

    <!-- ===== EQUIPOS: galería de tipos + dashboard por tipo ===== -->
    <div id="chkEquipos" style="display:none">
      <div id="chkEqGaleria"></div>
      <div id="chkEqDash" style="display:none"></div>
    </div>
  </div>

  <!-- ===== MODAL: UNIDAD DE INVENTARIO ===== -->
  <div class="modal-overlay" id="modalChkUni" style="z-index:1200">
    <div class="modal-box" style="max-width:480px;width:95%">
      <div class="modal-header">
        <h3><i class="fas fa-box" style="color:var(--primary)"></i> <span id="chkUniTitulo">Unidad</span></h3>
        <button class="modal-close" onclick="cerrarModal('modalChkUni')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="chk_uni_id"><input type="hidden" id="chk_uni_comp">
        <div class="filter-bar">
          <div class="form-group"><label class="form-label">Código <span style="color:var(--rojo)">*</span></label>
            <input type="text" class="form-control" id="chk_uni_codigo" maxlength="40" placeholder="Ej: CAR-DIA-ALM-01"></div>
          <div class="form-group"><label class="form-label">Nombre / descripción <span style="color:var(--rojo)">*</span></label>
            <input type="text" class="form-control" id="chk_uni_nombre" maxlength="160" placeholder="Ej: Carretilla diaria 01 – Almacén Central"></div>
          <div class="form-group"><label class="form-label">Ubicación</label>
            <input type="text" class="form-control" id="chk_uni_ubic" maxlength="120" placeholder="Ej: Almacén Central"></div>
          <div class="form-group"><label class="form-label">Área</label>
            <input type="text" class="form-control" id="chk_uni_area" maxlength="80" placeholder="Ej: Almacén"></div>
          <div class="form-group"><label class="form-label">Vencimiento</label>
            <input type="date" class="form-control" id="chk_uni_venc"></div>
        </div>
      </div>
      <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:1px solid var(--gris-700)">
        <button class="btn btn-secondary" onclick="cerrarModal('modalChkUni')">Cancelar</button>
        <button class="btn btn-primary" onclick="chkGuardarUni()"><i class="fas fa-save"></i> Guardar</button>
      </div>
    </div>
  </div>

  <!-- ===== MODAL: INSPECCIÓN ===== -->
  <div class="modal-overlay" id="modalChkInsp">
    <div class="modal-box" style="max-width:840px;width:97%">
      <div class="modal-header">
        <h3><i class="fas fa-clipboard-check" style="color:var(--primary)"></i> <span id="chkModalTitulo">Nueva inspección</span></h3>
        <button class="modal-close" onclick="cerrarModal('modalChkInsp')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="chk_id">
        <div class="filter-bar" style="margin-bottom:12px">
          <div class="form-group"><label class="form-label">Equipo / Formulario <span style="color:var(--rojo)">*</span></label>
            <select class="form-control" id="chk_componente" onchange="chkRenderItemsSel()"></select></div>
          <input type="hidden" id="chk_unidad_id">
          <div class="form-group" id="chk_unidad_wrap" style="display:none"><label class="form-label">Unidad (inventario) <span style="color:var(--rojo)">*</span></label>
            <select class="form-control" id="chk_unidad" onchange="chkSelUnidad()"></select></div>
          <div class="form-group" id="chk_placa_wrap" style="position:relative"><label class="form-label">Unidad (placa) <span style="color:var(--rojo)">*</span></label>
            <input type="text" class="form-control" id="chk_placa" placeholder="Buscar placa…" autocomplete="off" oninput="chkBuscarPlaca(this.value)">
            <div id="chkPlacaResultados" style="display:none;position:absolute;z-index:20;left:0;right:0;background:var(--gris-800);border:1px solid var(--gris-600);border-radius:6px;max-height:200px;overflow:auto;box-shadow:0 8px 24px rgba(0,0,0,.35)"></div>
          </div>
          <div class="form-group"><label class="form-label">Área</label>
            <input type="text" class="form-control" id="chk_area" list="chkAreasList" maxlength="80" placeholder="Ej: Almacén, Flota…">
            <datalist id="chkAreasList"></datalist></div>
          <div class="form-group"><label class="form-label">Mes</label>
            <input type="month" class="form-control" id="chk_periodo"></div>
          <div class="form-group"><label class="form-label">Fecha</label>
            <input type="date" class="form-control" id="chk_fecha"></div>
          <div class="form-group" id="chk_vencimiento_wrap" style="display:none"><label class="form-label" id="chk_vencimiento_lbl">Vencimiento del equipo</label>
            <input type="date" class="form-control" id="chk_vencimiento" title="Fecha de vencimiento (recarga del extintor / caducidad del botiquín)"></div>
          <div class="form-group"><label class="form-label">Resultado</label>
            <select class="form-control" id="chk_estado">
              <option value="apto">Apto</option><option value="observado">Observado</option><option value="no_apto">No apto</option>
            </select></div>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:8px">
          <button class="btn btn-outline btn-sm" onclick="chkMarcarTodo('conforme')"><i class="fas fa-check-double"></i> Todo conforme</button>
          <button class="btn btn-outline btn-sm" onclick="chkMarcarTodo('na')">Todo N/A</button>
          <span class="muted" style="font-size:11px;align-self:center">C = Conforme · NC = No Conforme · N/A = No aplica</span>
        </div>

        <div id="chkItemsCont"><p class="muted" style="padding:12px">Cargando componentes…</p></div>

        <div class="form-group" style="margin-top:10px">
          <label class="form-label">Evidencia fotográfica</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
            <label class="btn btn-outline btn-sm" style="margin:0" title="Usa la cámara (en móvil)">
              <i class="fas fa-camera"></i> Tomar foto
              <input type="file" id="chk_foto_cam" accept="image/*" capture="environment" style="display:none" onchange="chkFotoElegir(this.files);this.value=''"></label>
            <label class="btn btn-outline btn-sm" style="margin:0">
              <i class="fas fa-image"></i> Agregar imagen
              <input type="file" id="chk_foto_img" accept="image/*" multiple style="display:none" onchange="chkFotoElegir(this.files);this.value=''"></label>
          </div>
          <div id="chkFotosGal" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        </div>

        <div class="form-group" style="margin-top:10px">
          <label class="form-label">Observaciones generales</label>
          <textarea class="form-control" id="chk_observacion" rows="2" style="resize:vertical"></textarea>
        </div>

        <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
          <button class="btn btn-outline btn-sm" onclick="chkAbrirFirma()"><i class="fas fa-pen-nib"></i> Firmar inspección</button>
          <span id="chkFirmaEstado" class="muted" style="font-size:12px">Sin firma</span>
        </div>
      </div>
      <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:1px solid var(--gris-700)">
        <button class="btn btn-secondary" onclick="cerrarModal('modalChkInsp')">Cancelar</button>
        <button class="btn btn-primary" id="chkGuardarBtn" onclick="guardarInspeccion()"><i class="fas fa-save"></i> Guardar</button>
      </div>
    </div>
  </div>

  <!-- ===== MODAL: FIRMA ===== -->
  <div class="modal-overlay" id="modalChkFirma" style="z-index:1200">
    <div class="modal-box" style="max-width:460px;width:94%">
      <div class="modal-header">
        <h3><i class="fas fa-pen-nib" style="color:var(--primary)"></i> Firma del inspector</h3>
        <button class="modal-close" onclick="cerrarModal('modalChkFirma')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" style="text-align:center">
        <canvas id="chkFirmaCanvas" width="400" height="180" style="border:1px dashed var(--gris-500);border-radius:6px;background:#fff;touch-action:none;max-width:100%"></canvas>
      </div>
      <div class="modal-footer" style="display:flex;justify-content:space-between;gap:10px;padding:14px 20px;border-top:1px solid var(--gris-700)">
        <button class="btn btn-outline btn-sm" onclick="chkFirmaLimpiar()"><i class="fas fa-eraser"></i> Limpiar</button>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="cerrarModal('modalChkFirma')">Cancelar</button>
          <button class="btn btn-primary" onclick="chkFirmaGuardar()"><i class="fas fa-check"></i> Guardar firma</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ===== MODAL: VISOR PDF ===== -->
  <div class="modal-overlay" id="modalChkPdf" style="z-index:1200">
    <div class="modal-box" style="max-width:1000px;width:97%">
      <div class="modal-header">
        <h3><i class="fas fa-file-lines" style="color:var(--primary)"></i> Registro de inspección</h3>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-primary btn-sm" onclick="chkImprimir()"><i class="fas fa-print"></i> Imprimir / PDF</button>
          <button class="modal-close" onclick="cerrarModal('modalChkPdf')"><i class="fas fa-times"></i></button>
        </div>
      </div>
      <div class="modal-body" style="padding:0;background:#525659;min-height:74vh">
        <iframe id="chkPdfFrame" title="Registro" style="width:100%;height:74vh;border:0;background:#fff"></iframe>
      </div>
    </div>
  </div>

  <!-- ===== MODAL: EQUIPO / FORMULARIO (config) ===== -->
  <div class="modal-overlay" id="modalChkComp" style="z-index:1200">
    <div class="modal-box" style="max-width:460px;width:94%">
      <div class="modal-header">
        <h3><i class="fas fa-cube" style="color:var(--primary)"></i> <span id="chkCompTitulo">Equipo</span></h3>
        <button class="modal-close" onclick="cerrarModal('modalChkComp')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="chk_comp_id">
        <div class="form-group"><label class="form-label">Nombre del equipo / formulario</label>
          <input type="text" class="form-control" id="chk_comp_nombre" maxlength="120" placeholder="Ej: Cinturón de seguridad"></div>
        <p class="muted" style="font-size:11px;margin-top:6px">Luego agrégale sus preguntas con el botón “Pregunta”.</p>
      </div>
      <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:1px solid var(--gris-700)">
        <button class="btn btn-secondary" onclick="cerrarModal('modalChkComp')">Cancelar</button>
        <button class="btn btn-primary" onclick="chkGuardarComp()"><i class="fas fa-save"></i> Guardar</button>
      </div>
    </div>
  </div>

  <!-- ===== MODAL: ÍTEM (config) ===== -->
  <div class="modal-overlay" id="modalChkItem" style="z-index:1200">
    <div class="modal-box" style="max-width:460px;width:94%">
      <div class="modal-header">
        <h3><i class="fas fa-list-check" style="color:var(--primary)"></i> <span id="chkItemTitulo">Ítem</span></h3>
        <button class="modal-close" onclick="cerrarModal('modalChkItem')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="chk_item_id"><input type="hidden" id="chk_item_comp">
        <div class="form-group"><label class="form-label">Texto del ítem de verificación</label>
          <input type="text" class="form-control" id="chk_item_texto" maxlength="255"></div>
      </div>
      <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:1px solid var(--gris-700)">
        <button class="btn btn-secondary" onclick="cerrarModal('modalChkItem')">Cancelar</button>
        <button class="btn btn-primary" onclick="chkGuardarItem()"><i class="fas fa-save"></i> Guardar</button>
      </div>
    </div>
  </div>
