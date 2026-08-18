  <!-- ===== PAGE: CAPACITACIONES ===== -->
  <div class="page-content" id="page-capacitaciones" style="display:none">

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--gris-100)">
          <i class="fas fa-chalkboard-user" style="color:var(--amarillo)"></i> Capacitaciones
        </h2>
        <p style="color:var(--gris-400);font-size:13px;margin-top:2px">
          Programa anual de capacitación SST · Ley N° 29783, Art. 35
        </p>
      </div>
    </div>

    <!-- Sub-pestañas -->
    <div class="tabs" style="margin-bottom:18px">
      <button class="tab-btn cap-tab-btn active" id="cap-btn-cronograma" onclick="switchCapTab('cronograma')"><i class="fas fa-calendar-days"></i> Cronograma anual</button>
      <button class="tab-btn cap-tab-btn" id="cap-btn-semana" onclick="switchCapTab('semana')"><i class="fas fa-helmet-safety"></i> Semana de seguridad</button>
      <button class="tab-btn cap-tab-btn" id="cap-btn-alerta" onclick="switchCapTab('alerta')"><i class="fas fa-triangle-exclamation"></i> Safety Alert</button>
      <button class="tab-btn cap-tab-btn" id="cap-btn-campana" onclick="switchCapTab('campana')"><i class="fas fa-bullhorn"></i> Campañas</button>
    </div>

    <!-- KPIs (comunes, se recalculan por sub-pestaña) -->
    <div class="kpi-grid" id="capKpis" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:16px"></div>

    <!-- Filtros -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:14px 20px">
        <div class="filter-bar">
          <div class="form-group"><label class="form-label">Año</label>
            <select class="form-control" id="capFiltroAnio" onchange="cargarCapacitaciones()"><option value="">Todos</option></select></div>
          <div class="form-group"><label class="form-label">Estado</label>
            <select class="form-control" id="capFiltroEstado" onchange="cargarCapacitaciones()">
              <option value="">Todos</option>
              <option value="programado">Programado</option>
              <option value="en_curso">En curso</option>
              <option value="ejecutado">Ejecutado</option>
              <option value="reprogramado">Reprogramado</option>
              <option value="cancelado">Cancelado</option>
            </select></div>
          <div class="form-group"><label class="form-label">Buscar</label>
            <input type="text" class="form-control" id="capFiltroQ" placeholder="Título, responsable…" oninput="capBuscarDebounced()"></div>
          <div class="form-group" id="capVistaToggle" style="display:none;flex:0 0 auto">
            <label class="form-label">Vista</label>
            <div style="display:flex;gap:0">
              <button type="button" class="btn btn-sm btn-primary" id="capVistaLista" onclick="capSetVista('lista')" style="border-top-right-radius:0;border-bottom-right-radius:0"><i class="fas fa-list"></i> Lista</button>
              <button type="button" class="btn btn-sm btn-outline" id="capVistaMatriz" onclick="capSetVista('matriz')" style="border-top-left-radius:0;border-bottom-left-radius:0"><i class="fas fa-table-cells-large"></i> Matriz</button>
            </div>
          </div>
          <button class="btn btn-primary" onclick="nuevaCapacitacion()"><i class="fas fa-plus"></i> <span id="capNuevoLabel">Nuevo</span></button>
        </div>
      </div>
    </div>

    <!-- Tabla (una por sub-pestaña; el JS rellena la que corresponde) -->
    <div class="card"><div class="card-body" style="padding:0"><div class="tbl-scroll" id="capTablaWrap">
      <p class="muted" style="text-align:center;padding:28px">Cargando…</p>
    </div></div></div>
  </div>

  <!-- ===== MODAL: CAPACITACIÓN ===== -->
  <div class="modal-overlay" id="modalCapacitacion">
    <div class="modal-box" style="max-width:660px;width:96%">
      <div class="modal-header">
        <h3><i class="fas fa-chalkboard-user" style="color:var(--primary)"></i> <span id="capModalTitulo">Nuevo</span></h3>
        <button class="modal-close" onclick="cerrarModal('modalCapacitacion')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="cap_id">
        <input type="hidden" id="cap_tipo">

        <div class="form-group">
          <label class="form-label" id="cap_lbl_titulo">Título <span style="color:var(--rojo)">*</span></label>
          <input type="text" class="form-control" id="cap_titulo" maxlength="200">
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div class="form-group"><label class="form-label">Año</label>
            <input type="number" class="form-control" id="cap_anio" min="2000" max="2100"></div>
          <!-- Subtipo: capacitación (cronograma) -->
          <div class="form-group cap-for-cronograma"><label class="form-label">Tipo de capacitación</label>
            <select class="form-control" id="cap_subtipo_cap">
              <option value="">—</option><option>Inducción</option><option>Capacitación específica</option>
              <option>Reentrenamiento</option><option>Charla de 5 minutos</option><option>Simulacro</option><option>Otra</option>
            </select></div>
          <!-- Subtipo: alerta -->
          <div class="form-group cap-for-alerta"><label class="form-label">Tipo de alerta</label>
            <select class="form-control" id="cap_subtipo_alerta">
              <option value="">—</option><option>Incidente</option><option>Casi accidente</option>
              <option>Condición insegura</option><option>Acto inseguro</option><option>Lección aprendida</option>
            </select></div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div class="form-group cap-for-cronograma cap-for-semana cap-for-alerta cap-for-campana">
            <label class="form-label" id="cap_lbl_fecha">Fecha</label>
            <input type="date" class="form-control" id="cap_fecha"></div>
          <div class="form-group cap-for-semana cap-for-campana">
            <label class="form-label" id="cap_lbl_fechafin">Fecha fin</label>
            <input type="date" class="form-control" id="cap_fecha_fin"></div>
          <div class="form-group cap-for-semana"><label class="form-label">Hora</label>
            <input type="text" class="form-control" id="cap_hora" placeholder="09:00 - 10:00"></div>
          <div class="form-group cap-for-semana cap-for-alerta"><label class="form-label" id="cap_lbl_lugar">Lugar / Área</label>
            <input type="text" class="form-control" id="cap_lugar" maxlength="150"></div>
          <div class="form-group cap-for-cronograma cap-for-campana"><label class="form-label">Dirigido a</label>
            <select class="form-control" id="cap_dirigido_a">
              <option value="">Todos</option><option value="conductor">Conductores</option><option value="reparto">Reparto</option>
              <option value="auxiliar">Auxiliares</option><option value="supervisor">Supervisores</option>
            </select></div>
          <div class="form-group cap-for-cronograma"><label class="form-label">Horas</label>
            <input type="number" class="form-control" id="cap_horas" step="0.5" min="0"></div>
          <div class="form-group cap-for-cronograma"><label class="form-label">N° participantes</label>
            <input type="number" class="form-control" id="cap_participantes" min="0"></div>
          <div class="form-group"><label class="form-label">Responsable / Facilitador</label>
            <input type="text" class="form-control" id="cap_responsable" maxlength="150"></div>
          <div class="form-group cap-for-cronograma cap-for-semana cap-for-campana"><label class="form-label">Estado</label>
            <select class="form-control" id="cap_estado">
              <option value="programado">Programado</option><option value="en_curso">En curso</option>
              <option value="ejecutado">Ejecutado</option><option value="reprogramado">Reprogramado</option>
              <option value="cancelado">Cancelado</option>
            </select></div>
        </div>

        <div class="form-group">
          <label class="form-label" id="cap_lbl_desc">Descripción</label>
          <textarea class="form-control" id="cap_descripcion" rows="3" style="resize:vertical"></textarea>
        </div>

        <div class="form-group cap-for-alerta cap-for-campana">
          <label class="form-label">Imagen
            <a id="cap_img_ver" href="#" onclick="verDocumento(this.href);return false;" style="display:none;font-weight:400;font-size:11px;color:var(--primary);margin-left:6px"><i class="fas fa-eye"></i> ver actual</a>
          </label>
          <input type="file" class="form-control" id="cap_imagen" accept="image/*">
          <small class="muted" style="font-size:11px">Imagen JPG/PNG/WEBP · máx 5MB.</small>
        </div>
      </div>
      <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:1px solid var(--gris-700)">
        <button class="btn btn-secondary" onclick="cerrarModal('modalCapacitacion')">Cancelar</button>
        <button class="btn btn-primary" id="capGuardarBtn" onclick="guardarCapacitacion()"><i class="fas fa-save"></i> Guardar</button>
      </div>
    </div>
  </div>
