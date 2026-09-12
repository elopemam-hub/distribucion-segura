  <!-- ===== PAGE: DOCUMENTOS (Biblioteca SST) ===== -->
  <div class="page-content" id="page-documentos" style="display:none">

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--gris-100)">
          <i class="fas fa-folder-open" style="color:var(--amarillo)"></i> Documentos
        </h2>
        <p style="color:var(--gris-400);font-size:13px;margin-top:2px">Biblioteca SST · procedimientos, formatos, políticas y más</p>
      </div>
      <?php if (in_array($user['rol'], ['administrador', 'supervisor'], true)): ?>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-outline btn-sm" onclick="docAbrirCategorias()"><i class="fas fa-tags"></i> Categorías</button>
        <button class="btn btn-primary" onclick="docAbrirSubir()"><i class="fas fa-upload"></i> Subir documento</button>
      </div>
      <?php endif; ?>
    </div>

    <div class="kpi-grid" id="docKpis" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:14px;margin-bottom:16px"></div>

    <div class="card" style="margin-bottom:16px"><div class="card-body" style="padding:14px 20px">
      <div class="filter-bar">
        <div class="form-group"><label class="form-label">Categoría</label>
          <select class="form-control" id="docFiltroCat" onchange="cargarDocumentos()"><option value="">Todas</option></select></div>
        <div class="form-group"><label class="form-label">Buscar</label>
          <input type="text" class="form-control" id="docBuscar" placeholder="Título, descripción o archivo…" oninput="docBuscarDebounced()"></div>
      </div>
    </div></div>

    <div id="docLista"><p class="muted" style="text-align:center;padding:28px">Cargando…</p></div>
  </div>

  <!-- ===== MODAL: SUBIR DOCUMENTO ===== -->
  <div class="modal-overlay" id="modalDocSubir">
    <div class="modal-box" style="max-width:560px;width:96%">
      <div class="modal-header">
        <h3><i class="fas fa-upload" style="color:var(--primary)"></i> Subir documento</h3>
        <button class="modal-close" onclick="cerrarModal('modalDocSubir')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Título <span style="color:var(--rojo)">*</span></label>
          <input type="text" class="form-control" id="doc_titulo" maxlength="200" placeholder="Ej: Procedimiento de trabajo seguro en altura">
        </div>
        <div class="form-group">
          <label class="form-label">Categoría</label>
          <select class="form-control" id="doc_categoria"><option value="">— Sin categoría —</option></select>
        </div>
        <div class="form-group">
          <label class="form-label">Descripción</label>
          <textarea class="form-control" id="doc_descripcion" rows="2" maxlength="400" style="resize:vertical"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Archivo <span style="color:var(--rojo)">*</span></label>
          <input type="file" class="form-control" id="doc_archivo" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp">
          <small class="muted" style="font-size:11px">PDF, imagen, Word, Excel o PowerPoint · máx 25 MB</small>
        </div>
      </div>
      <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:1px solid var(--gris-700)">
        <button class="btn btn-secondary" onclick="cerrarModal('modalDocSubir')">Cancelar</button>
        <button class="btn btn-primary" id="docSubirBtn" onclick="docSubir()"><i class="fas fa-save"></i> Subir</button>
      </div>
    </div>
  </div>

  <!-- ===== MODAL: CATEGORÍAS ===== -->
  <div class="modal-overlay" id="modalDocCategorias">
    <div class="modal-box" style="max-width:520px;width:96%">
      <div class="modal-header">
        <h3><i class="fas fa-tags" style="color:var(--primary)"></i> Categorías</h3>
        <button class="modal-close" onclick="cerrarModal('modalDocCategorias')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <div style="display:flex;gap:8px;margin-bottom:12px">
          <input type="text" class="form-control" id="doc_cat_nueva" maxlength="120" placeholder="Nueva categoría…">
          <button class="btn btn-primary" onclick="docCatGuardar(0)"><i class="fas fa-plus"></i></button>
        </div>
        <div id="docCatLista"></div>
      </div>
    </div>
  </div>
