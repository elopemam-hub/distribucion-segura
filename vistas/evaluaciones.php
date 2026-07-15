  <!-- ===== PAGE: EVALUACIONES ===== -->
  <div class="page-content" id="page-evaluaciones" style="display:none">

    <!-- Cabecera -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--gris-100)">
          <i class="fas fa-clipboard-check" style="color:var(--amarillo)"></i> Evaluaciones
        </h2>
        <p style="color:var(--gris-400);font-size:13px;margin-top:2px">Registro y revisión de evaluaciones de capacitación</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs" style="margin-bottom:22px">
      <button class="tab-btn eval-tab-btn active" id="eval-btn-listado" onclick="switchEvalTab('listado')">
        <i class="fas fa-list-check"></i> Listado
      </button>
      <button class="tab-btn eval-tab-btn" id="eval-btn-nueva" onclick="switchEvalTab('nueva')">
        <i class="fas fa-plus-circle"></i> Nueva Evaluación
      </button>
      <?php if ($user['rol'] === 'administrador'): ?>
      <button class="tab-btn eval-tab-btn" id="eval-btn-banco" onclick="switchEvalTab('banco')">
        <i class="fas fa-database"></i> Banco de Preguntas
      </button>
      <?php endif; ?>
    </div>

    <!-- ══════════════════════════════════════
         PANEL: LISTADO
    ══════════════════════════════════════ -->
    <div class="tab-panel eval-tab-panel active" id="eval-panel-listado">

      <!-- Filtros -->
      <div class="card" style="margin-bottom:18px">
        <div class="card-body" style="padding:16px 22px">
          <div class="filter-bar">
            <div class="form-group">
              <label class="form-label">Tipo</label>
              <select class="form-control" id="filtroEvalTipo">
                <option value="">Todos</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Estado</label>
              <select class="form-control" id="filtroEvalEstado">
                <option value="">Todos</option>
                <option value="pendiente_revision">Pendiente revisión</option>
                <option value="aprobado">Aprobado</option>
                <option value="desaprobado">Desaprobado</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Desde</label>
              <input type="date" class="form-control" id="filtroEvalDesde">
            </div>
            <div class="form-group">
              <label class="form-label">Hasta</label>
              <input type="date" class="form-control" id="filtroEvalHasta">
            </div>
            <div class="form-group">
              <label class="form-label">Buscar</label>
              <input type="text" class="form-control" id="filtroEvalQ" placeholder="Nombre, DNI, empresa...">
            </div>
            <button class="btn btn-primary" onclick="cargarListadoEval()"><i class="fas fa-search"></i> Buscar</button>
          </div>
        </div>
      </div>

      <!-- Tabla -->
      <div class="card">
        <div class="card-body" style="padding:0;overflow-x:auto">
          <table class="table" style="min-width:820px">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Nombre</th>
                <th>DNI</th>
                <th>Empresa</th>
                <th style="text-align:center">Puntaje</th>
                <th style="text-align:center">Estado</th>
                <th style="text-align:center">Acciones</th>
              </tr>
            </thead>
            <tbody id="evalTablaBody">
              <tr><td colspan="8" style="text-align:center;padding:32px;color:var(--gris-400)">Cargando...</td></tr>
            </tbody>
          </table>
        </div>
        <div id="evalPaginacion" class="amon-pag-bar"></div>
      </div>
    </div><!-- /eval-panel-listado -->

    <!-- ══════════════════════════════════════
         PANEL: NUEVA EVALUACIÓN
    ══════════════════════════════════════ -->
    <div class="tab-panel eval-tab-panel" id="eval-panel-nueva">

      <!-- Paso 1: Selector de tipo -->
      <div id="eval-tipo-selector">
        <p style="color:var(--gris-400);font-size:13px;margin-bottom:20px">Selecciona el tipo de evaluación a registrar</p>
        <div id="eval-tipos-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px">
          <div style="color:var(--gris-500);padding:40px;text-align:center;grid-column:1/-1">
            <div class="spinner" style="margin:0 auto 12px"></div>Cargando tipos...
          </div>
        </div>
      </div><!-- /eval-tipo-selector -->

      <!-- Paso 2: Formulario dinámico -->
      <div id="eval-form-container" style="display:none">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
          <button class="btn btn-outline btn-sm" onclick="volverTipoSelector()">
            <i class="fas fa-arrow-left"></i> Cambiar tipo
          </button>
          <div id="eval-form-titulo" style="font-family:var(--font-display);font-size:18px;font-weight:800;color:var(--gris-100)"></div>
        </div>

        <!-- Campos de identificación -->
        <div class="card" style="margin-bottom:18px">
          <div class="card-header"><h3><i class="fas fa-id-card"></i> Datos de Identificación</h3></div>
          <div class="card-body">
            <div class="form-grid" id="eval-campos-identificacion"></div>
          </div>
        </div>

        <!-- Secciones del formulario (renderizadas dinámicamente) -->
        <div id="eval-secciones"></div>

        <!-- Observaciones -->
        <div class="card" style="margin-bottom:18px">
          <div class="card-header"><h3><i class="fas fa-comment-dots"></i> Observaciones o Recomendaciones</h3></div>
          <div class="card-body">
            <textarea class="form-control" id="eval-observaciones" rows="3" placeholder="Ingresa observaciones o recomendaciones del evaluador..."></textarea>
          </div>
        </div>

        <!-- Botones -->
        <div style="display:flex;justify-content:flex-end;gap:12px;padding-bottom:40px">
          <button type="button" class="btn btn-secondary" onclick="cancelarEvaluacion()">
            <i class="fas fa-times"></i> Cancelar
          </button>
          <button type="button" class="btn btn-primary" id="btnGuardarEval" onclick="guardarEvaluacion()">
            <i class="fas fa-save"></i> Guardar Evaluación
          </button>
        </div>
      </div><!-- /eval-form-container -->

    </div><!-- /eval-panel-nueva -->

    <?php if ($user['rol'] === 'administrador'): ?>
    <!-- ══════════════════════════════════════
         PANEL: BANCO DE PREGUNTAS (admin)
    ══════════════════════════════════════ -->
    <div class="tab-panel eval-tab-panel" id="eval-panel-banco">
      <?php require_once __DIR__ . '/banco_preguntas.php'; ?>
    </div><!-- /eval-panel-banco -->
    <?php endif; ?>

  </div><!-- /page-evaluaciones -->

  <!-- ══════════════════════════════════════
       MODAL: VER / REVISAR EVALUACIÓN
  ══════════════════════════════════════ -->
  <div class="modal-overlay" id="modalEvaluacion">
    <div class="modal-box" style="max-width:860px;max-height:90vh;display:flex;flex-direction:column">
      <div class="modal-header" style="flex-shrink:0">
        <h3 id="modalEvalTitulo"><i class="fas fa-clipboard-check" style="color:var(--amarillo)"></i> Detalle de Evaluación</h3>
        <button class="modal-close" onclick="cerrarModal('modalEvaluacion')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" id="modalEvalBody" style="overflow-y:auto;flex:1;padding:24px">
        <div style="text-align:center;padding:40px"><div class="spinner"></div></div>
      </div>

      <!-- Sección de aprobación (visible solo para pendiente + supervisor/admin) -->
      <div id="modalEvalAprobacion" style="display:none;border-top:1px solid var(--gris-600);padding:20px 24px;flex-shrink:0;background:var(--gris-800)">
        <h4 style="font-size:14px;font-weight:700;color:var(--gris-200);margin-bottom:14px">
          <i class="fas fa-pen-nib" style="color:var(--primary)"></i> Revisión y Aprobación
        </h4>
        <div class="form-group" style="margin-bottom:14px">
          <label class="form-label">Comentario del revisor (opcional)</label>
          <textarea class="form-control" id="evalComentarioAprobacion" rows="2" placeholder="Observaciones sobre la revisión..."></textarea>
        </div>
        <div style="margin-bottom:14px">
          <label class="form-label">Firma del Revisor / Aprobador *</label>
          <p style="font-size:11px;color:var(--gris-400);margin-bottom:8px">Dibuja tu firma para validar la revisión</p>
          <div class="firma-canvas-wrap" style="height:120px">
            <canvas id="evalFirmaAprobadorCanvas" width="760" height="120" style="max-width:100%;height:100%"></canvas>
          </div>
          <div class="firma-actions" style="margin-top:6px">
            <button type="button" class="btn btn-secondary btn-sm" onclick="limpiarFirmaAprobador()">
              <i class="fas fa-eraser"></i> Limpiar
            </button>
          </div>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn btn-danger" id="btnRechazarEval" onclick="procesarAprobacion('rechazar')">
            <i class="fas fa-times-circle"></i> Rechazar
          </button>
          <button class="btn btn-success" id="btnAprobarEval" onclick="procesarAprobacion('aprobar')">
            <i class="fas fa-check-circle"></i> Aprobar
          </button>
        </div>
      </div>
    </div>
  </div>

<!-- ===== MODAL: LINK & QR EVALUACIÓN ===== -->
<div class="modal-overlay" id="modalEvalQr">
  <div class="modal-box" style="max-width:400px">
    <div class="modal-header">
      <h3 id="modalEvalQrTitulo"><i class="fas fa-qrcode"></i> Link & QR</h3>
      <button class="modal-close" onclick="cerrarModal('modalEvalQr')">×</button>
    </div>
    <div class="modal-body" style="text-align:center">
      <p style="font-size:13px;color:var(--gris-400);margin-bottom:20px">
        Comparte el link o escanea el QR para abrir directamente este formulario.
      </p>
      <div id="evalQrCanvas" style="display:flex;justify-content:center;margin-bottom:20px;min-height:200px;align-items:center"></div>
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:14px">
        <input type="text" class="form-control" id="evalQrLink" readonly
               style="font-size:11px;font-family:monospace;background:var(--gris-700);color:var(--gris-300)">
        <button class="btn btn-primary btn-sm" onclick="copiarLinkEval()" title="Copiar link">
          <i class="fas fa-copy"></i>
        </button>
      </div>
      <button class="btn btn-outline btn-sm" onclick="descargarQrEval()">
        <i class="fas fa-download"></i> Descargar QR
      </button>
    </div>
  </div>
</div>
