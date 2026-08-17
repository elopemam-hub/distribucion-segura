  <!-- ===== PAGE: EMPRESAS (multi-empresa, Fase 1) ===== -->
  <div class="page-content" id="page-empresas" style="display:none">

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--gris-100)">
          <i class="fas fa-building" style="color:var(--primary)"></i> Empresas
        </h2>
        <p style="color:var(--gris-400);font-size:13px;margin-top:2px">
          Empresas tercerizadoras (Ley 29245) · cada una con su identidad legal para los registros SST
        </p>
      </div>
      <button class="btn btn-primary" onclick="nuevaEmpresa()"><i class="fas fa-plus"></i> Nueva empresa</button>
    </div>

    <div class="kpi-grid" id="empresasKpis" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:18px"></div>

    <div class="card">
      <div class="card-body" style="padding:0"><div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr><th>Empresa</th><th>RUC</th><th>Tipo</th><th>Responsable</th>
                <th style="text-align:right">Trabajadores</th><th>Estado</th><th style="text-align:right">Acciones</th></tr>
          </thead>
          <tbody id="empresasBody">
            <tr><td colspan="7" class="muted" style="text-align:center;padding:26px">Cargando…</td></tr>
          </tbody>
        </table>
      </div></div>
    </div>
  </div>

  <!-- ===== MODAL: EMPRESA ===== -->
  <div class="modal-overlay" id="modalEmpresa">
    <div class="modal-box" style="max-width:640px;width:96%">
      <div class="modal-header">
        <h3><i class="fas fa-building" style="color:var(--primary)"></i> <span id="empresaModalTitulo">Nueva empresa</span></h3>
        <button class="modal-close" onclick="cerrarModal('modalEmpresa')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <input type="hidden" id="empresa_id">
        <div class="form-group">
          <label class="form-label">Razón social <span style="color:var(--rojo)">*</span></label>
          <input type="text" class="form-control" id="empresa_razon_social" maxlength="200" placeholder="EMPRESA S.A.C.">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div class="form-group">
            <label class="form-label">RUC</label>
            <input type="text" class="form-control" id="empresa_ruc" maxlength="11" inputmode="numeric" placeholder="20xxxxxxxxx">
          </div>
          <div class="form-group">
            <label class="form-label">Tipo</label>
            <select class="form-control" id="empresa_tipo">
              <option value="tercerizacion">Tercerización (Ley 29245)</option>
              <option value="intermediacion">Intermediación / Services (Ley 27626)</option>
              <option value="principal">Planilla propia</option>
              <option value="otro">Otro</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Domicilio fiscal</label>
          <input type="text" class="form-control" id="empresa_domicilio" maxlength="255">
        </div>
        <div class="form-group">
          <label class="form-label">Actividad económica</label>
          <input type="text" class="form-control" id="empresa_actividad" maxlength="200">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
          <div class="form-group">
            <label class="form-label">Responsable SST</label>
            <input type="text" class="form-control" id="empresa_responsable" maxlength="150">
          </div>
          <div class="form-group">
            <label class="form-label">Teléfono</label>
            <input type="text" class="form-control" id="empresa_telefono" maxlength="30">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Email</label>
          <input type="email" class="form-control" id="empresa_email" maxlength="150">
        </div>
        <div class="form-group">
          <label class="form-label">Logo
            <a id="empresa_logo_ver" href="#" onclick="verDocumento(this.href);return false;" style="display:none;font-weight:400;font-size:11px;color:var(--primary);margin-left:6px"><i class="fas fa-eye"></i> ver actual</a>
            <a id="empresa_logo_del" href="#" onclick="quitarLogoEmpresa();return false;" style="display:none;font-weight:400;font-size:11px;color:var(--rojo);margin-left:8px"><i class="fas fa-trash"></i> quitar</a>
          </label>
          <input type="file" class="form-control" id="empresa_logo" accept="image/*">
          <small class="muted" style="font-size:11px">Imagen JPG/PNG/WEBP · máx 5MB. Se usará en los documentos oficiales de esta empresa.</small>
        </div>
      </div>
      <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:10px;padding:14px 20px;border-top:1px solid var(--gris-700)">
        <button class="btn btn-secondary" onclick="cerrarModal('modalEmpresa')">Cancelar</button>
        <button class="btn btn-primary" id="empresaGuardarBtn" onclick="guardarEmpresa()"><i class="fas fa-save"></i> Guardar</button>
      </div>
    </div>
  </div>
