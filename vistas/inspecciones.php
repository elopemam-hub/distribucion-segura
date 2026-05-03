  <!-- ===== PAGE: INSPECCIONES (listado + nueva) ===== -->
  <div class="page-content" id="page-inspecciones" style="display:none">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--gris-100)">
          <i class="fas fa-clipboard-list" style="color:var(--amarillo)"></i> Inspecciones
        </h2>
        <p style="color:var(--gris-400);font-size:13px;margin-top:2px">Listado y registro de inspecciones en ruta</p>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs" style="margin-bottom:22px">
      <button class="tab-btn insp-tab-btn active" id="insp-btn-listado" onclick="switchInspeccionTab('listado')">
        <i class="fas fa-clipboard-list"></i> Listado
      </button>
      <button class="tab-btn insp-tab-btn" id="insp-btn-nueva" onclick="switchInspeccionTab('nueva')">
        <i class="fas fa-plus-circle"></i> Nueva Inspección
      </button>
    </div>

    <!-- ── PANEL: NUEVA INSPECCIÓN ── -->
    <div class="tab-panel insp-tab-panel" id="insp-panel-nueva">
      <p style="color:var(--gris-400);font-size:13px;margin-bottom:20px">Registro de inspección en ruta</p>
    <form id="formInspeccion">
      <div class="card" style="margin-bottom:18px">
        <div class="card-header"><h3><i class="fas fa-info-circle"></i> 1. Datos Generales</h3></div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group"><label class="form-label">Placa / Unidad *</label><input type="text" class="form-control" id="f_unidad" placeholder="Ej: ABC-123" required style="text-transform:uppercase"></div>
            <div class="form-group"><label class="form-label">Fecha *</label><input type="date" class="form-control" id="f_fecha" required value="<?= date('Y-m-d') ?>"></div>
            <div class="form-group"><label class="form-label">Hora *</label><input type="time" class="form-control" id="f_hora" required value="<?= date('H:i') ?>"></div>
            <div class="form-group"><label class="form-label">Provincia</label><input type="text" class="form-control" id="f_provincia" value="San Román"></div>
            <div class="form-group"><label class="form-label">Distrito</label><input type="text" class="form-control" id="f_distrito" value="Juliaca"></div>
            <div class="form-group"><label class="form-label">Dirección (calle/avenida) *</label><input type="text" class="form-control" id="f_direccion" placeholder="Ej: Av. Circunvalación 850" required></div>
          </div>
          <!-- GPS -->
          <div style="margin-top:16px;border:2px dashed rgba(21,101,192,0.35);border-radius:12px;padding:16px;background:rgba(21,101,192,0.04)">
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px">
              <div><div style="font-weight:700;color:var(--blanco);font-size:14px;margin-bottom:2px"><i class="fas fa-satellite-dish" style="color:var(--amarillo)"></i> Geolocalización GPS</div><div style="font-size:12px;color:var(--gris-400)">Registra las coordenadas exactas del punto de inspección</div></div>
              <button type="button" id="btnGeolocalizacion" class="btn btn-primary" onclick="capturarGeolocalizacion()" style="min-width:160px"><i class="fas fa-location-crosshairs"></i> Capturar Ubicación</button>
            </div>
            <div id="geoEstado" style="display:flex;align-items:center;gap:10px;background:var(--gris-700);border-radius:8px;padding:10px 14px;font-size:13px">
              <span id="geoIcono" style="font-size:18px">📍</span>
              <div style="flex:1"><div id="geoTexto" style="color:var(--gris-400)">Sin coordenadas — presiona "Capturar Ubicación"</div><div id="geoCoordenadas" style="color:var(--amarillo);font-size:12px;font-family:monospace;margin-top:2px"></div></div>
              <div id="geoBadge"></div>
            </div>
            <div id="geoMapa" style="display:none;margin-top:12px;border-radius:8px;overflow:hidden;height:160px;border:1px solid rgba(21,101,192,0.2)"><iframe id="geoMapaIframe" src="" style="width:100%;height:100%;border:0" loading="lazy"></iframe></div>
            <input type="hidden" id="f_latitud"><input type="hidden" id="f_longitud">
          </div>
        </div>
      </div>

      <div class="card" style="margin-bottom:18px">
        <div class="card-header"><h3><i class="fas fa-users"></i> 2. Tripulación y EPP</h3><button type="button" class="btn btn-outline btn-sm" onclick="agregarAuxiliar()"><i class="fas fa-plus"></i> Auxiliar</button></div>
        <div class="card-body"><div id="tripulacionContainer"></div></div>
      </div>

      <div class="card" style="margin-bottom:18px">
        <div class="card-header">
          <h3><i class="fas fa-truck"></i> 3. Checklist de Vehículo</h3>
          <div style="display:flex;align-items:center;gap:12px"><div class="badge badge-yellow" id="pctBadge">0% cumplimiento</div><button type="button" class="btn btn-secondary btn-sm" onclick="marcarTodos(true)">✔ Todo</button><button type="button" class="btn btn-danger btn-sm" onclick="marcarTodos(false)">✖ Nada</button></div>
        </div>
        <div class="card-body">
          <div class="progress-wrap" style="margin-bottom:18px"><div class="progress-label"><span>Cumplimiento</span><span id="pctLabel">0%</span></div><div class="progress-bar-container"><div class="progress-bar-fill rojo" id="progressFill" style="width:0%"></div></div></div>
          <div class="checklist-grid" id="checklistContainer"></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:18px">
        <div class="card-header"><h3><i class="fas fa-camera"></i> 4. Evidencias Fotográficas</h3><span style="font-size:12px;color:var(--gris-400)" id="contadorFotos">0 fotos seleccionadas</span></div>
        <div class="card-body">
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
            <button type="button" class="btn btn-outline" onclick="document.getElementById('evidenciasInput').click()"><i class="fas fa-images"></i> Elegir de galería</button>
            <button type="button" class="btn btn-outline" onclick="document.getElementById('camaraInput').click()"><i class="fas fa-camera"></i> Tomar foto</button>
            <span style="font-size:12px;color:var(--gris-400);align-self:center"><i class="fas fa-info-circle"></i> Mínimo 3 imágenes · JPG, PNG, WEBP · Máx 5MB c/u</span>
          </div>
          <div class="upload-area" id="uploadArea" onclick="document.getElementById('evidenciasInput').click()" ondragover="event.preventDefault();this.classList.add('dragover')" ondragleave="this.classList.remove('dragover')" ondrop="handleDrop(event)">
            <i class="fas fa-cloud-upload-alt"></i><p>Haz clic o arrastra imágenes aquí</p><small>Puedes seleccionar varias a la vez</small>
          </div>
          <input type="file" id="evidenciasInput" multiple accept="image/jpeg,image/png,image/webp" style="display:none" onchange="handleFileSelect(this)">
          <input type="file" id="camaraInput" accept="image/*" capture="environment" style="display:none" onchange="handleFileSelect(this)">
          <div class="preview-grid" id="previewGrid"></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:18px">
        <div class="card-header"><h3><i class="fas fa-triangle-exclamation"></i> 5. Hallazgos y Observaciones</h3><button type="button" class="btn btn-outline btn-sm" onclick="agregarHallazgo()"><i class="fas fa-plus"></i> Hallazgo</button></div>
        <div class="card-body">
          <div id="hallazgosContainer" style="margin-bottom:16px"></div>
          <div class="form-group"><label class="form-label">Observaciones generales</label><textarea class="form-control" id="f_observaciones" rows="3" placeholder="Descripción general de la inspección..."></textarea></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:24px">
        <div class="card-header"><h3><i class="fas fa-signature"></i> 6. Firma Digital del Inspector</h3></div>
        <div class="card-body">
          <div class="firma-canvas-wrap"><canvas id="firmaCanvas" width="760" height="160" style="max-width:100%"></canvas></div>
          <div class="firma-actions"><button type="button" class="btn btn-secondary btn-sm" onclick="limpiarFirma()"><i class="fas fa-eraser"></i> Limpiar</button></div>
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:12px">
        <button type="button" class="btn btn-secondary" onclick="resetForm();switchInspeccionTab('listado')"><i class="fas fa-times"></i> Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btnGuardar"><i class="fas fa-save"></i> Guardar Inspección</button>
      </div>
    </form>
    </div><!-- /insp-panel-nueva -->

    <!-- ── PANEL: LISTADO ── -->
    <div class="tab-panel insp-tab-panel active" id="insp-panel-listado">
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px;gap:8px">
        <button class="btn btn-outline btn-sm" onclick="exportarExcel()"><i class="fas fa-file-excel"></i> Excel</button>
        <button class="btn btn-primary btn-sm" onclick="switchInspeccionTab('nueva')"><i class="fas fa-plus"></i> Nueva</button>
      </div>
      <div class="card" style="margin-bottom:18px">
        <div class="card-body" style="padding:16px 22px">
          <div class="filter-bar">
            <div class="form-group"><label class="form-label">Desde</label><input type="date" class="form-control" id="filtroDesde"></div>
            <div class="form-group"><label class="form-label">Hasta</label><input type="date" class="form-control" id="filtroHasta" value="<?= date('Y-m-d') ?>"></div>
            <div class="form-group"><label class="form-label">Unidad/Placa</label><input type="text" class="form-control" id="filtroUnidad" placeholder="Ej: ABC-123"></div>
            <div class="form-group"><label class="form-label">Conductor</label><input type="text" class="form-control" id="filtroConductor" placeholder="Nombre..."></div>
            <button class="btn btn-primary" onclick="cargarListado()"><i class="fas fa-search"></i> Buscar</button>
            <button class="btn btn-secondary" onclick="limpiarFiltros()"><i class="fas fa-times"></i></button>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-body" style="padding:0">
          <div class="table-wrap">
            <table class="data-table" id="tablaInspecciones">
              <thead><tr><th>#</th><th>Unidad</th><th>Fecha/Hora</th><th>Conductor</th><th>Dirección</th><th>Cumplimiento</th><th>Inspector</th><th>Evidencias</th><th>Acciones</th></tr></thead>
              <tbody id="tablaBody"><tr><td colspan="9" style="text-align:center;padding:32px;color:var(--gris-400)"><div class="spinner"></div> Cargando...</td></tr></tbody>
            </table>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 22px;border-top:1px solid rgba(255,255,255,0.06)">
            <div style="font-size:12px;color:var(--gris-400)" id="paginacionInfo">—</div>
            <div style="display:flex;gap:6px" id="paginacionBtns"></div>
          </div>
        </div>
      </div>
    </div><!-- /insp-panel-listado -->
  </div><!-- /page-inspecciones -->
