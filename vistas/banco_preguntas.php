<!-- Banco de Preguntas — contenido embebido en el tab eval-panel-banco -->
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
  <div>
    <h2 style="font-family:var(--font-display);font-size:22px;font-weight:800;color:var(--gris-100)">
      <i class="fas fa-database" style="color:var(--primary)"></i> Banco de Preguntas
    </h2>
    <p style="color:var(--gris-400);font-size:13px;margin-top:2px">Gestión de preguntas y criterios de evaluación</p>
  </div>
</div>

<!-- Tabs de formularios + botón agregar -->
<div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;flex-wrap:wrap">
  <div id="bp-tabs-bar" style="display:flex;gap:8px;flex-wrap:wrap;flex:1">
    <span style="color:var(--gris-500);font-size:13px">Cargando...</span>
  </div>
  <button class="btn btn-primary btn-sm" onclick="bpNuevaEvaluacion()" title="Agregar nuevo tipo de evaluación">
    <i class="fas fa-plus"></i> Nueva evaluación
  </button>
</div>

<!-- Paneles dinámicos (JS los genera) -->
<div id="bp-panels-container"></div>


<!-- ===== MODAL: PREGUNTA ===== -->
<div class="modal-overlay" id="modalBpPregunta">
  <div class="modal-box" style="max-width:680px">
    <div class="modal-header">
      <h3><i class="fas fa-pencil" style="color:var(--primary)"></i> <span id="bpPreguntaModalTitulo">Pregunta</span></h3>
      <button class="modal-close" onclick="cerrarModal('modalBpPregunta')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="bpPregId">
      <input type="hidden" id="bpPregSeccionDbId">
      <input type="hidden" id="bpPregTipoSeccion">
      <input type="hidden" id="bpPregFormulario">

      <div class="form-grid">
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">ID de pregunta <span style="color:var(--gris-500);font-size:11px">(sin espacios, ej: q1, tres_puntos)</span></label>
          <input type="text" class="form-control" id="bpPregPreguntaId" placeholder="q1">
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Texto / Criterio *</label>
          <textarea class="form-control" id="bpPregTexto" rows="3" placeholder="Escribe la pregunta o criterio..."></textarea>
        </div>
        <div class="form-group" id="bpPregPuntosGroup">
          <label class="form-label">Puntos</label>
          <input type="number" class="form-control" id="bpPregPuntos" value="1" min="0" step="0.5">
        </div>
        <div class="form-group" id="bpPregOrdenGroup">
          <label class="form-label">Orden</label>
          <input type="number" class="form-control" id="bpPregOrden" value="0" min="0">
        </div>
      </div>

      <!-- Opciones (solo multiple_choice) -->
      <div id="bpOpcionesSection" style="display:none;margin-top:12px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <label class="form-label" style="margin:0">Opciones de respuesta *</label>
          <button class="btn btn-outline btn-sm" onclick="bpAgregarOpcion()"><i class="fas fa-plus"></i> Agregar opción</button>
        </div>
        <div id="bpOpcionesList" style="display:flex;flex-direction:column;gap:8px"></div>

        <div class="form-group" style="margin-top:14px">
          <label class="form-label">Respuesta correcta *</label>
          <select class="form-control" id="bpRespuestaCorrecta">
            <option value="">— Selecciona —</option>
          </select>
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px">
        <button class="btn btn-secondary" onclick="cerrarModal('modalBpPregunta')">Cancelar</button>
        <button class="btn btn-primary" id="btnGuardarBpPregunta" onclick="bpGuardarPregunta()">
          <i class="fas fa-save"></i> Guardar
        </button>
      </div>
    </div>
  </div>
</div>

<!-- ===== MODAL: SECCIÓN ===== -->
<div class="modal-overlay" id="modalBpSeccion">
  <div class="modal-box" style="max-width:560px">
    <div class="modal-header">
      <h3><i class="fas fa-layer-group" style="color:var(--primary)"></i> <span id="bpSeccionModalTitulo">Sección</span></h3>
      <button class="modal-close" onclick="cerrarModal('modalBpSeccion')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="bpSecId">
      <input type="hidden" id="bpSecFormulario">

      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">ID de sección *</label>
          <input type="text" class="form-control" id="bpSecSeccionId" placeholder="seguridad">
        </div>
        <div class="form-group">
          <label class="form-label">Tipo *</label>
          <select class="form-control" id="bpSecTipo">
            <option value="aplica_grid">Aplica / No Aplica</option>
            <option value="multiple_choice">Opción Múltiple</option>
          </select>
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Título *</label>
          <input type="text" class="form-control" id="bpSecTitulo" placeholder="I. SEGURIDAD">
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Descripción</label>
          <input type="text" class="form-control" id="bpSecDescripcion" placeholder="Descripción opcional...">
        </div>
        <div class="form-group">
          <label class="form-label">Puntos sección</label>
          <input type="number" class="form-control" id="bpSecPuntos" value="0" min="0" step="0.5">
        </div>
        <div class="form-group">
          <label class="form-label">Orden</label>
          <input type="number" class="form-control" id="bpSecOrden" value="1" min="1">
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px">
        <button class="btn btn-secondary" onclick="cerrarModal('modalBpSeccion')">Cancelar</button>
        <button class="btn btn-primary" id="btnGuardarBpSeccion" onclick="bpGuardarSeccion()">
          <i class="fas fa-save"></i> Guardar
        </button>
      </div>
    </div>
  </div>
</div>

<!-- ===== MODAL: NUEVA / EDITAR EVALUACIÓN ===== -->
<div class="modal-overlay" id="modalBpFormulario">
  <div class="modal-box" style="max-width:520px">
    <div class="modal-header">
      <h3><i class="fas fa-plus-circle" style="color:var(--primary)"></i> <span id="bpFormularioModalTitulo">Nueva Evaluación</span></h3>
      <button class="modal-close" onclick="cerrarModal('modalBpFormulario')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="bpFrmEsEdicion" value="0">

      <div class="form-grid">
        <div class="form-group">
          <label class="form-label">ID único * <span style="color:var(--gris-500);font-size:11px">(solo letras, números y _)</span></label>
          <input type="text" class="form-control" id="bpFrmId" placeholder="ej: induccion_nueva"
                 oninput="this.value=this.value.toLowerCase().replace(/[^a-z0-9_]/g,'_')">
        </div>
        <div class="form-group">
          <label class="form-label">Orden</label>
          <input type="number" class="form-control" id="bpFrmOrden" value="10" min="1">
        </div>
        <div class="form-group" style="grid-column:1/-1">
          <label class="form-label">Título *</label>
          <input type="text" class="form-control" id="bpFrmTitulo" placeholder="ej: Inducción Nueva">
        </div>

        <div class="form-group">
          <label class="form-label">Ícono</label>
          <select class="form-control" id="bpFrmIcono" onchange="bpPreviewIcono()">
            <option value="fa-clipboard-list">📋 Lista de evaluación</option>
            <option value="fa-truck">🚛 Camión / Manejo</option>
            <option value="fa-shield-halved">🛡️ Seguridad</option>
            <option value="fa-graduation-cap">🎓 Inducción / Capacitación</option>
            <option value="fa-hard-hat">⛑️ Casco / Seguridad laboral</option>
            <option value="fa-car">🚗 Vehículo</option>
            <option value="fa-road">🛣️ Ruta / Carretera</option>
            <option value="fa-fire-extinguisher">🧯 Emergencias</option>
            <option value="fa-first-aid">🩹 Primeros auxilios</option>
            <option value="fa-boxes-stacked">📦 Logística / Carga</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Color</label>
          <div style="display:flex;align-items:center;gap:10px">
            <input type="color" class="form-control" id="bpFrmColor" value="#1565C0"
                   style="height:38px;padding:2px;cursor:pointer;width:70px">
            <div id="bpFrmPreview" style="display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:8px;background:var(--gris-700)">
              <i id="bpFrmPreviewIcon" class="fas fa-clipboard-list" style="font-size:18px;color:#1565C0"></i>
              <span id="bpFrmPreviewLabel" style="font-size:13px;font-weight:600;color:var(--gris-100)">Vista previa</span>
            </div>
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px">
        <button class="btn btn-outline btn-sm" style="color:var(--rojo);border-color:var(--rojo)"
                id="bpFrmBtnEliminar" style="display:none" onclick="bpEliminarFormulario()">
          <i class="fas fa-trash"></i> Eliminar
        </button>
        <div style="display:flex;gap:10px;margin-left:auto">
          <button class="btn btn-secondary" onclick="cerrarModal('modalBpFormulario')">Cancelar</button>
          <button class="btn btn-primary" id="btnGuardarBpFormulario" onclick="bpGuardarFormulario()">
            <i class="fas fa-save"></i> Guardar
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
