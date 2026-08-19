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
      <button class="tab-btn cap-tab-btn" id="cap-btn-resumen" onclick="switchCapTab('resumen')"><i class="fas fa-table-list"></i> Resumen</button>
    </div>

    <!-- KPIs (comunes, se recalculan por sub-pestaña) -->
    <div class="kpi-grid" id="capKpis" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:16px"></div>

    <!-- Filtros -->
    <div class="card" style="margin-bottom:16px">
      <div class="card-body" style="padding:14px 20px">
        <div class="filter-bar">
          <div class="form-group"><label class="form-label">Año</label>
            <select class="form-control" id="capFiltroAnio" onchange="cargarCapacitaciones()"><option value="">Todos</option></select></div>
          <div class="form-group" id="capEstadoWrap"><label class="form-label">Estado</label>
            <select class="form-control" id="capFiltroEstado" onchange="cargarCapacitaciones()">
              <option value="">Todos</option>
              <option value="programado">Programado</option>
              <option value="en_curso">En curso</option>
              <option value="ejecutado">Ejecutado</option>
              <option value="reprogramado">Reprogramado</option>
              <option value="cancelado">Cancelado</option>
            </select></div>
          <div class="form-group" id="capCargoWrap" style="display:none"><label class="form-label">Tipo</label>
            <select class="form-control" id="capFiltroTipo" onchange="_capResumenPag=1;renderResumen()">
              <option value="">Todos</option><option value="cronograma">Cronograma</option><option value="semana">Semana de seguridad</option>
              <option value="alerta">Safety Alert</option><option value="campana">Campañas</option>
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
          <button class="btn btn-primary" id="capBtnNuevo" onclick="nuevaCapacitacion()"><i class="fas fa-plus"></i> <span id="capNuevoLabel">Nuevo</span></button>
        </div>
      </div>
    </div>

    <!-- Tabla (una por sub-pestaña; el JS rellena la que corresponde) -->
    <div class="card"><div class="card-body" style="padding:0">
      <div class="tbl-scroll" id="capTablaWrap">
        <p class="muted" style="text-align:center;padding:28px">Cargando…</p>
      </div>
      <div id="capPagWrap"></div>
    </div></div>
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
              <option value="">—</option>
              <optgroup label="Clasificación SIF (pirámide)">
                <option>FAT (Fatalidad)</option>
                <option>LTI (Días Perdidos)</option>
                <option>MDI (Modificación de la Tarea)</option>
                <option>MTI (Tratamiento Médico)</option>
                <option>FAI (Primeros Auxilios)</option>
                <option>SIO (Incidente Sin Lesión)</option>
                <option>SHO (Actos y Condiciones)</option>
              </optgroup>
              <optgroup label="Otros">
                <option>Incidente</option><option>Casi accidente</option>
                <option>Condición insegura</option><option>Acto inseguro</option><option>Lección aprendida</option>
              </optgroup>
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

  <!-- ===== MODAL: EVIDENCIA / DESPLIEGUE ===== -->
  <div class="modal-overlay" id="modalEvidencia">
    <div class="modal-box" style="max-width:820px;width:97%">
      <div class="modal-header">
        <h3><i class="fas fa-paperclip" style="color:var(--primary)"></i> Evidencia · <span id="capEvTitulo"></span></h3>
        <button class="modal-close" onclick="cerrarModal('modalEvidencia')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="capEvId">

        <!-- 1. Material de despliegue -->
        <div class="card" style="margin-bottom:14px"><div class="card-body" style="padding:14px 16px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">
            <strong style="font-size:13px;color:var(--gris-100)"><i class="fas fa-file-arrow-up" style="color:var(--primary)"></i> Material de despliegue</strong>
            <div style="display:flex;gap:6px;align-items:center">
              <input type="file" id="capFileMaterial" accept=".pdf,.doc,.docx,.ppt,.pptx,image/*" style="max-width:230px;font-size:12px">
              <button class="btn btn-primary btn-sm" onclick="capSubirAdjunto('material')"><i class="fas fa-upload"></i> Subir</button>
            </div>
          </div>
          <div id="capEvMaterial" class="muted" style="font-size:12px">—</div>
        </div></div>

        <!-- 2. Evidencia fotográfica -->
        <div class="card" style="margin-bottom:14px"><div class="card-body" style="padding:14px 16px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px">
            <strong style="font-size:13px;color:var(--gris-100)"><i class="fas fa-camera" style="color:var(--primary)"></i> Evidencia fotográfica</strong>
            <div style="display:flex;gap:6px;align-items:center">
              <input type="file" id="capFileFoto" accept="image/*" multiple style="max-width:230px;font-size:12px">
              <button class="btn btn-primary btn-sm" onclick="capSubirAdjunto('foto')"><i class="fas fa-upload"></i> Subir</button>
            </div>
          </div>
          <div id="capEvFotos" style="display:flex;flex-wrap:wrap;gap:8px"><span class="muted" style="font-size:12px">—</span></div>
        </div></div>

        <!-- 3. Lista de asistencia -->
        <div class="card"><div class="card-body" style="padding:14px 16px">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px">
            <strong style="font-size:13px;color:var(--gris-100)"><i class="fas fa-signature" style="color:var(--primary)"></i> Lista de asistencia <span class="muted" style="font-weight:400">(R.M. 050-2013-TR)</span></strong>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button class="btn btn-outline btn-sm" onclick="abrirMasivo()"><i class="fas fa-users"></i> Agregar masivo</button>
              <button class="btn btn-outline btn-sm" onclick="capToggleManual()"><i class="fas fa-user-plus"></i> Manual</button>
              <label class="btn btn-outline btn-sm" style="margin:0" title="Subir hoja de asistencia firmada (escaneada)">
                <i class="fas fa-file-import"></i> Subir hoja firmada
                <input type="file" id="capFileAsistencia" accept=".pdf,image/*" style="display:none" onchange="capSubirAdjunto('asistencia')">
              </label>
              <button class="btn btn-primary btn-sm" onclick="abrirRegistroPdf()"><i class="fas fa-print"></i> Registro PDF</button>
            </div>
          </div>

          <!-- Hojas de asistencia firmadas (escaneadas), separadas del material -->
          <div id="capEvAsistencia" style="margin-bottom:8px"></div>

          <!-- Autocompletar desde Personal -->
          <div style="position:relative;margin-bottom:8px">
            <input type="text" class="form-control" id="capAsisBuscar" placeholder="Buscar trabajador por nombre o DNI para agregarlo…" oninput="capBuscarTrab(this.value)" autocomplete="off">
            <div id="capAsisResultados" style="display:none;position:absolute;z-index:20;left:0;right:0;background:var(--gris-800);border:1px solid var(--gris-600);border-radius:6px;max-height:220px;overflow:auto;box-shadow:0 8px 24px rgba(0,0,0,.35)"></div>
          </div>

          <!-- Alta manual (oculta) -->
          <div id="capManualBox" style="display:none;gap:8px;margin-bottom:10px;flex-wrap:wrap" >
            <input type="text" class="form-control" id="capManualNombre" placeholder="Apellidos y nombres" style="flex:2;min-width:180px">
            <input type="text" class="form-control" id="capManualDni" placeholder="DNI" style="flex:1;min-width:100px" maxlength="20">
            <input type="text" class="form-control" id="capManualCargo" placeholder="Cargo" style="flex:1;min-width:120px" maxlength="60">
            <button class="btn btn-primary btn-sm" onclick="capAgregarManual()"><i class="fas fa-plus"></i> Agregar</button>
          </div>

          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th style="width:6%">N°</th><th>Apellidos y nombres</th><th>DNI</th><th>Cargo</th><th style="text-align:center">Firma</th><th style="text-align:right">Acciones</th></tr></thead>
              <tbody id="capAsisBody"><tr><td colspan="6" class="muted" style="text-align:center;padding:18px">Sin asistentes.</td></tr></tbody>
            </table>
          </div>
        </div></div>
      </div>
      <div class="modal-footer" style="display:flex;justify-content:flex-end;padding:14px 20px;border-top:1px solid var(--gris-700)">
        <button class="btn btn-secondary" onclick="cerrarModal('modalEvidencia')">Cerrar</button>
      </div>
    </div>
  </div>

  <!-- ===== MODAL: FIRMA DEL ASISTENTE ===== -->
  <div class="modal-overlay" id="modalFirmaCap">
    <div class="modal-box" style="max-width:460px;width:94%">
      <div class="modal-header">
        <h3><i class="fas fa-pen-nib" style="color:var(--primary)"></i> Firma · <span id="capFirmaNombre"></span></h3>
        <button class="modal-close" onclick="cerrarModal('modalFirmaCap')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" style="text-align:center">
        <p class="muted" style="font-size:12px;margin-bottom:8px">Firme dentro del recuadro (dedo o mouse).</p>
        <canvas id="capFirmaCanvas" width="400" height="180" style="border:1px dashed var(--gris-500);border-radius:6px;background:#fff;touch-action:none;max-width:100%"></canvas>
      </div>
      <div class="modal-footer" style="display:flex;justify-content:space-between;gap:10px;padding:14px 20px;border-top:1px solid var(--gris-700)">
        <button class="btn btn-outline btn-sm" onclick="capFirmaLimpiar()"><i class="fas fa-eraser"></i> Limpiar</button>
        <div style="display:flex;gap:8px">
          <button class="btn btn-secondary" onclick="cerrarModal('modalFirmaCap')">Cancelar</button>
          <button class="btn btn-primary" onclick="capFirmaGuardar()"><i class="fas fa-check"></i> Guardar firma</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ===== MODAL: VISOR DEL REGISTRO PDF (en la misma pantalla) ===== -->
  <div class="modal-overlay" id="modalCapPdf" style="z-index:1200">
    <div class="modal-box" style="max-width:1000px;width:97%">
      <div class="modal-header">
        <h3><i class="fas fa-file-lines" style="color:var(--primary)"></i> Registro de asistencia</h3>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn btn-primary btn-sm" onclick="capImprimirRegistro()"><i class="fas fa-print"></i> Imprimir / PDF</button>
          <a class="btn btn-secondary btn-sm" id="capPdfAbrir" href="#" target="_blank" rel="noopener" title="Abrir en pestaña nueva"><i class="fas fa-up-right-from-square"></i></a>
          <button class="modal-close" onclick="cerrarModal('modalCapPdf')"><i class="fas fa-times"></i></button>
        </div>
      </div>
      <div class="modal-body" style="padding:0;background:#525659;min-height:74vh">
        <iframe id="capPdfFrame" title="Registro" style="width:100%;height:74vh;border:0;background:#fff"></iframe>
      </div>
    </div>
  </div>

  <!-- ===== MODAL: AGREGAR ASISTENTES MASIVO ===== -->
  <div class="modal-overlay" id="modalCapMasivo" style="z-index:1200">
    <div class="modal-box" style="max-width:640px;width:96%">
      <div class="modal-header">
        <h3><i class="fas fa-users" style="color:var(--primary)"></i> Agregar asistentes</h3>
        <button class="modal-close" onclick="cerrarModal('modalCapMasivo')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="filter-bar" style="margin-bottom:10px">
          <div class="form-group"><label class="form-label">Buscar</label>
            <input type="text" class="form-control" id="capMasBuscar" placeholder="Nombre o DNI" oninput="renderMasivo()"></div>
          <div class="form-group"><label class="form-label">Cargo</label>
            <select class="form-control" id="capMasCargo" onchange="renderMasivo()">
              <option value="">Todos</option><option value="conductor">Conductor</option><option value="reparto">Reparto</option>
              <option value="auxiliar">Auxiliar</option><option value="supervisor">Supervisor</option><option value="otro">Otro</option>
            </select></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <label class="modulo-check" style="margin:0"><input type="checkbox" id="capMasTodos" onclick="capMasSelTodos(this.checked)"> <span>Seleccionar todos (visibles)</span></label>
          <span class="muted" style="font-size:12px"><span id="capMasCount">0</span> seleccionados</span>
        </div>
        <div class="tbl-scroll" id="capMasLista" style="max-height:46vh;border:1px solid var(--gris-700);border-radius:6px">
          <p class="muted" style="text-align:center;padding:20px">Cargando…</p>
        </div>
      </div>
      <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:1px solid var(--gris-700)">
        <button class="btn btn-secondary" onclick="cerrarModal('modalCapMasivo')">Cancelar</button>
        <button class="btn btn-primary" id="capMasBtn" onclick="capAgregarMasivo()"><i class="fas fa-user-check"></i> Agregar seleccionados</button>
      </div>
    </div>
  </div>
