  <!-- ===== PAGE: EPP (Equipos de Protección Personal) ===== -->
  <div class="page-content" id="page-epp" style="display:none">

    <!-- Cabecera -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--gris-100)">
          <i class="fas fa-helmet-safety" style="color:var(--amarillo)"></i> Equipos de Protección Personal
        </h2>
        <p style="color:var(--gris-400);font-size:13px;margin-top:2px">
          Control de inventario y entrega de EPP · Ley N° 29783 · R.M. 050-2013-TR
        </p>
      </div>
    </div>

    <!-- Sub-tabs -->
    <div class="tabs" style="margin-bottom:22px">
      <button class="tab-btn epp-tab-btn active" id="epp-btn-inventario" onclick="switchEppTab('inventario')">
        <i class="fas fa-boxes-stacked"></i> Inventario
      </button>
      <button class="tab-btn epp-tab-btn" id="epp-btn-ingreso" onclick="switchEppTab('ingreso')">
        <i class="fas fa-dolly"></i> Ingreso
      </button>
      <button class="tab-btn epp-tab-btn" id="epp-btn-entregas" onclick="switchEppTab('entregas')">
        <i class="fas fa-hand-holding-hand"></i> Entregas
      </button>
      <button class="tab-btn epp-tab-btn" id="epp-btn-inicial" onclick="switchEppTab('inicial')">
        <i class="fas fa-file-import"></i> Inventario inicial
      </button>
      <button class="tab-btn epp-tab-btn" id="epp-btn-tallas" onclick="switchEppTab('tallas')">
        <i class="fas fa-ruler"></i> Tallas
      </button>
      <button class="tab-btn epp-tab-btn" id="epp-btn-proveedores" onclick="switchEppTab('proveedores')">
        <i class="fas fa-truck-field"></i> Proveedores
      </button>
      <button class="tab-btn epp-tab-btn" id="epp-btn-reportes" onclick="switchEppTab('reportes')">
        <i class="fas fa-file-arrow-down"></i> Reportes
      </button>
      <button class="tab-btn epp-tab-btn" id="epp-btn-config" onclick="switchEppTab('config')">
        <i class="fas fa-sliders"></i> Configuración
      </button>
    </div>

    <!-- ══════════════ PANEL: INVENTARIO ══════════════ -->
    <div class="tab-panel epp-tab-panel active" id="epp-panel-inventario">
      <!-- Resumen de stock -->
      <div class="kpi-grid" id="eppStockResumen" style="margin-bottom:18px"></div>

      <div class="card" style="margin-bottom:18px">
        <div class="card-header">
          <h3><i class="fas fa-warehouse"></i> Stock actual</h3>
          <button class="btn btn-secondary btn-sm" onclick="abrirModalMovimiento()" title="Corrección de stock (+/−)">
            <i class="fas fa-sliders"></i> Ajuste de stock
          </button>
        </div>
        <div class="card-body" style="overflow-x:auto">
          <table class="data-table" id="tablaEppStock">
            <thead>
              <tr>
                <th>Imagen</th><th>Código</th><th>Nombre</th><th>Categoría</th><th>Talla</th>
                <th style="text-align:right">Consumo anual</th>
                <th style="text-align:right">Stock mín.</th><th style="text-align:right">Stock máx.</th>
                <th style="text-align:right">Stock disp.</th><th>Estado</th>
              </tr>
            </thead>
            <tbody id="eppStockBody">
              <tr><td colspan="10" class="muted" style="text-align:center;padding:26px">Cargando…</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Kardex de movimientos -->
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-right-left"></i> Movimientos recientes</h3>
          <select class="form-control" id="eppMovFiltroTipo" style="max-width:180px" onchange="cargarEppMovimientos()">
            <option value="">Todos los tipos</option>
          </select>
        </div>
        <div class="card-body" style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr>
                <th>Fecha</th><th>EPP</th><th>Movimiento</th>
                <th style="text-align:right">Cantidad</th><th>Proveedor</th><th>Documento</th><th>Obs.</th>
              </tr>
            </thead>
            <tbody id="eppMovBody">
              <tr><td colspan="7" class="muted" style="text-align:center;padding:26px">Cargando…</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ══════════════ PANEL: ENTREGAS ══════════════ -->
    <div class="tab-panel epp-tab-panel" id="epp-panel-entregas">
      <!-- KPIs de cobertura y renovaciones -->
      <div class="kpi-grid" id="eppEntKpis" style="margin-bottom:18px"></div>

      <!-- Próximas renovaciones -->
      <div class="card" style="margin-bottom:18px">
        <div class="card-header">
          <h3><i class="fas fa-rotate"></i> Renovaciones vencidas o próximas (30 días)</h3>
        </div>
        <div class="card-body" style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr><th>Trabajador</th><th>DNI</th><th>EPP</th><th style="text-align:right">Cant.</th><th>Renovación</th><th>Estado</th></tr>
            </thead>
            <tbody id="eppRenovBody">
              <tr><td colspan="6" class="muted" style="text-align:center;padding:26px">Cargando…</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Historial de entregas -->
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-hand-holding-hand"></i> Historial de entregas</h3>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <input type="text" class="form-control" id="eppEntBuscar" placeholder="Buscar trabajador / DNI"
                   style="max-width:220px" oninput="eppEntBuscarDebounced()">
            <select class="form-control" id="eppEntFiltroMotivo" style="max-width:160px" onchange="cargarEppEntregas()">
              <option value="">Todos los motivos</option>
              <option value="nuevo">Entrega nueva</option>
              <option value="renovacion">Renovación</option>
              <option value="reposicion">Reposición</option>
              <option value="perdida">Pérdida</option>
            </select>
            <button class="btn btn-primary btn-sm" onclick="abrirModalEntrega()">
              <i class="fas fa-plus"></i> Nueva entrega
            </button>
          </div>
        </div>
        <div class="card-body" style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr><th>Fecha</th><th>Trabajador</th><th>DNI</th><th>Cargo</th><th>Motivo</th>
                  <th style="text-align:right">EPP</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody id="eppEntBody">
              <tr><td colspan="8" class="muted" style="text-align:center;padding:26px">Cargando…</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ══════════════ PANEL: INGRESO (recepción/compra) ══════════════ -->
    <div class="tab-panel epp-tab-panel" id="epp-panel-ingreso">
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-dolly"></i> Ingresos de EPP</h3>
          <button class="btn btn-primary btn-sm" onclick="abrirModalIngreso()">
            <i class="fas fa-plus"></i> Nuevo ingreso
          </button>
        </div>
        <div class="card-body" style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr><th>Fecha</th><th>Documento</th><th>Proveedor</th>
                  <th style="text-align:right">Líneas</th><th style="text-align:right">Unidades</th>
                  <th style="text-align:right">Costo total (S/)</th><th></th></tr>
            </thead>
            <tbody id="eppIngBody">
              <tr><td colspan="7" class="muted" style="text-align:center;padding:26px">Sin ingresos registrados.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ══════════════ PANEL: TALLAS ══════════════ -->
    <div class="tab-panel epp-tab-panel" id="epp-panel-tallas">
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-ruler"></i> Catálogo de tallas</h3>
          <button class="btn btn-primary btn-sm" onclick="abrirModalTalla()">
            <i class="fas fa-plus"></i> Nueva talla
          </button>
        </div>
        <div class="card-body" style="overflow-x:auto">
          <p class="muted" style="font-size:12px;margin-bottom:12px">
            Estas tallas aparecen en el selector al crear o editar un EPP. El orden controla cómo se listan.
          </p>
          <table class="data-table" style="max-width:520px">
            <thead>
              <tr><th>Talla</th><th style="text-align:right">Orden</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody id="eppTallaBody">
              <tr><td colspan="4" class="muted" style="text-align:center;padding:26px">Cargando…</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ══════════════ PANEL: INVENTARIO INICIAL ══════════════ -->
    <div class="tab-panel epp-tab-panel" id="epp-panel-inicial">
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-file-import"></i> Carga de inventario inicial</h3>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary btn-sm" onclick="eppPlantillaInicial()">
              <i class="fas fa-download"></i> Plantilla Excel
            </button>
            <input type="file" id="eppInicialFile" accept=".xlsx,.xls,.csv" style="display:none" onchange="eppImportarInicial(this)">
            <button class="btn btn-outline btn-sm" onclick="document.getElementById('eppInicialFile').click()">
              <i class="fas fa-file-excel"></i> Importar Excel
            </button>
          </div>
        </div>
        <div class="card-body">
          <p style="color:var(--gris-400);font-size:12.5px;margin-bottom:16px;line-height:1.6">
            Registra el <strong style="color:var(--gris-200)">saldo de apertura</strong> de cada EPP.
            Cada fila genera un movimiento de tipo <em>inicial</em>. Ajusta las cantidades y guarda,
            o importa desde Excel con las columnas <code>nombre</code> y <code>cantidad</code>.
          </p>
          <div style="overflow-x:auto">
            <table class="data-table">
              <thead>
                <tr><th>EPP</th><th>Unidad</th><th style="width:160px;text-align:right">Cantidad inicial</th><th style="width:150px;text-align:right">Costo unit. (S/)</th></tr>
              </thead>
              <tbody id="eppInicialBody">
                <tr><td colspan="4" class="muted" style="text-align:center;padding:26px">Cargando catálogo…</td></tr>
              </tbody>
            </table>
          </div>
          <div style="display:flex;justify-content:flex-end;margin-top:18px">
            <button class="btn btn-primary" onclick="eppGuardarInicial()">
              <i class="fas fa-floppy-disk"></i> Guardar inventario inicial
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══════════════ PANEL: PROVEEDORES ══════════════ -->
    <div class="tab-panel epp-tab-panel" id="epp-panel-proveedores">
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-truck-field"></i> Proveedores de EPP</h3>
          <button class="btn btn-primary btn-sm" onclick="abrirModalProveedor()">
            <i class="fas fa-plus"></i> Nuevo proveedor
          </button>
        </div>
        <div class="card-body" style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr><th>Razón social</th><th>RUC</th><th>Contacto</th><th>Teléfono</th><th>Certificaciones</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody id="eppProvBody">
              <tr><td colspan="7" class="muted" style="text-align:center;padding:26px">Cargando…</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ══════════════ PANEL: REPORTES ══════════════ -->
    <div class="tab-panel epp-tab-panel" id="epp-panel-reportes">
      <p style="color:var(--gris-400);font-size:12.5px;margin-bottom:16px;line-height:1.6">
        Genera y exporta a Excel los registros del módulo. Los reportes de entregas y
        vencimientos respaldan la trazabilidad exigida por la <strong style="color:var(--gris-200)">R.M. 050-2013-TR</strong>.
      </p>

      <!-- Reporte: Entregas por trabajador (detalle) -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-header">
          <h3><i class="fas fa-hand-holding-hand"></i> Entregas de EPP (detalle por ítem)</h3>
          <button class="btn btn-primary btn-sm" onclick="eppRepExport('entregas')">
            <i class="fas fa-file-excel"></i> Exportar Excel
          </button>
        </div>
        <div class="card-body">
          <div class="form-grid" style="margin-bottom:12px">
            <div class="form-group">
              <label class="form-label">Trabajador / DNI</label>
              <input type="text" class="form-control" id="eppRepEntQ" placeholder="Todos">
            </div>
            <div class="form-group">
              <label class="form-label">Desde</label>
              <input type="date" class="form-control" id="eppRepEntDesde">
            </div>
            <div class="form-group">
              <label class="form-label">Hasta</label>
              <input type="date" class="form-control" id="eppRepEntHasta">
            </div>
            <div class="form-group" style="align-self:end">
              <button class="btn btn-secondary" onclick="eppRepEntregas()"><i class="fas fa-magnifying-glass"></i> Consultar</button>
            </div>
          </div>
          <div style="overflow-x:auto">
            <table class="data-table">
              <thead><tr><th>Fecha</th><th>Trabajador</th><th>DNI</th><th>Cargo</th><th>EPP</th>
                  <th>Norma</th><th style="text-align:right">Cant.</th><th>Renovación</th></tr></thead>
              <tbody id="eppRepEntBody"><tr><td colspan="8" class="muted" style="text-align:center;padding:22px">Pulsa «Consultar».</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Reporte: Vencimientos / renovaciones -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-header">
          <h3><i class="fas fa-rotate"></i> Vencimientos y renovaciones</h3>
          <button class="btn btn-primary btn-sm" onclick="eppRepExport('vencimientos')">
            <i class="fas fa-file-excel"></i> Exportar Excel
          </button>
        </div>
        <div class="card-body">
          <div class="form-grid" style="margin-bottom:12px">
            <div class="form-group">
              <label class="form-label">Horizonte (días)</label>
              <input type="number" class="form-control" id="eppRepVenDias" min="0" value="30">
            </div>
            <div class="form-group" style="align-self:end">
              <button class="btn btn-secondary" onclick="eppRepVencimientos()"><i class="fas fa-magnifying-glass"></i> Consultar</button>
            </div>
          </div>
          <div style="overflow-x:auto">
            <table class="data-table">
              <thead><tr><th>Trabajador</th><th>DNI</th><th>EPP</th><th style="text-align:right">Cant.</th>
                  <th>Renovación</th><th style="text-align:right">Días</th><th>Estado</th></tr></thead>
              <tbody id="eppRepVenBody"><tr><td colspan="7" class="muted" style="text-align:center;padding:22px">Pulsa «Consultar».</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Reportes de inventario -->
      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-boxes-stacked"></i> Inventario</h3>
        </div>
        <div class="card-body">
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button class="btn btn-outline" onclick="eppRepExport('stock')">
              <i class="fas fa-file-excel"></i> Stock actual
            </button>
            <button class="btn btn-outline" onclick="eppRepExport('movimientos')">
              <i class="fas fa-file-excel"></i> Kardex de movimientos
            </button>
          </div>
          <p class="muted" style="font-size:12px;margin-top:10px">
            Stock actual = existencias por tipo de EPP. Kardex = todos los movimientos (inicial/entrada/salida/ajuste).
          </p>
        </div>
      </div>
    </div>

    <!-- ══════════════ PANEL: CONFIGURACIÓN (catálogo) ══════════════ -->
    <div class="tab-panel epp-tab-panel" id="epp-panel-config">

      <!-- Datos del empleador (cabecera del registro oficial) -->
      <div class="card" style="margin-bottom:18px">
        <div class="card-header">
          <h3><i class="fas fa-building"></i> Datos del empleador</h3>
          <span class="muted" style="font-size:12px">Cabecera del registro R.M. 050-2013-TR</span>
        </div>
        <div class="card-body">
          <form id="formEppEmpresa" onsubmit="return false">
            <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gris-400);letter-spacing:.06em;margin-bottom:10px">Datos del empleador principal</p>
            <div class="form-grid" style="margin-bottom:8px">
              <div class="form-group" style="grid-column:1/-1">
                <label class="form-label">Razón social o denominación social</label>
                <input type="text" class="form-control" id="epp_emp_razon_social">
              </div>
              <div class="form-group">
                <label class="form-label">RUC</label>
                <input type="text" class="form-control" id="epp_emp_ruc" maxlength="11" placeholder="11 dígitos">
              </div>
              <div class="form-group">
                <label class="form-label">Actividad económica</label>
                <input type="text" class="form-control" id="epp_emp_actividad">
              </div>
              <div class="form-group">
                <label class="form-label">N° de trabajadores</label>
                <input type="text" class="form-control" id="epp_emp_num_trab">
              </div>
              <div class="form-group" style="grid-column:1/-1">
                <label class="form-label">Domicilio</label>
                <input type="text" class="form-control" id="epp_emp_domicilio">
              </div>
            </div>

            <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gris-400);letter-spacing:.06em;margin:14px 0 10px">Datos del centro de trabajo</p>
            <div class="form-grid" style="margin-bottom:8px">
              <div class="form-group">
                <label class="form-label">Centro de trabajo</label>
                <input type="text" class="form-control" id="epp_ct_nombre" placeholder="Ej: CD JULIACA">
              </div>
              <div class="form-group">
                <label class="form-label">Domicilio</label>
                <input type="text" class="form-control" id="epp_ct_domicilio">
              </div>
              <div class="form-group">
                <label class="form-label">Responsable del centro de trabajo</label>
                <input type="text" class="form-control" id="epp_ct_responsable">
              </div>
              <div class="form-group">
                <label class="form-label">N° de trabajadores</label>
                <input type="text" class="form-control" id="epp_ct_num_trab">
              </div>
            </div>

            <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gris-400);letter-spacing:.06em;margin:14px 0 10px">Control del documento y responsable de registro</p>
            <div class="form-grid">
              <div class="form-group">
                <label class="form-label">Código</label>
                <input type="text" class="form-control" id="epp_doc_codigo">
              </div>
              <div class="form-group">
                <label class="form-label">Versión</label>
                <input type="text" class="form-control" id="epp_doc_version" placeholder="Ej: V2">
              </div>
              <div class="form-group">
                <label class="form-label">Fecha del formato</label>
                <input type="text" class="form-control" id="epp_doc_fecha" placeholder="Ej: 30/09/20">
              </div>
              <div class="form-group" style="grid-column:1/-1">
                <label class="form-label">Responsable del registro (nombre y cargo)</label>
                <input type="text" class="form-control" id="epp_emp_responsable" placeholder="Ej: Edwin López — Jefe SST">
              </div>
            </div>
            <div style="display:flex;justify-content:flex-end;margin-top:16px">
              <button type="button" class="btn btn-primary" onclick="eppGuardarEmpresa()">
                <i class="fas fa-floppy-disk"></i> Guardar datos
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Política de stock: porcentajes que derivan mín/máx del consumo anual -->
      <div class="card" style="margin-bottom:18px">
        <div class="card-header">
          <h3><i class="fas fa-percent"></i> Política de stock</h3>
          <span class="muted" style="font-size:12px">Stock mín/máx = consumo anual × %</span>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Stock mínimo (% del consumo anual)</label>
              <input type="number" class="form-control" id="epp_pct_min" min="0" max="100" value="10">
            </div>
            <div class="form-group">
              <label class="form-label">Stock máximo (% del consumo anual)</label>
              <input type="number" class="form-control" id="epp_pct_max" min="0" max="100" value="20">
            </div>
          </div>
          <p class="muted" style="font-size:12px;margin-top:8px">
            Al guardar se recalculan mín/máx de todos los EPP del catálogo.
          </p>
          <div style="display:flex;justify-content:flex-end;margin-top:8px">
            <button class="btn btn-primary" onclick="eppGuardarPolitica()"><i class="fas fa-floppy-disk"></i> Guardar política</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3><i class="fas fa-sliders"></i> Catálogo de EPP</h3>
          <button class="btn btn-primary btn-sm" onclick="abrirModalTipo()">
            <i class="fas fa-plus"></i> Nuevo EPP
          </button>
        </div>
        <div class="card-body" style="overflow-x:auto">
          <table class="data-table">
            <thead>
              <tr><th>Código</th><th>Nombre</th><th>Categoría</th><th>Talla</th>
                  <th style="text-align:right">Consumo</th><th style="text-align:right">Vida útil</th>
                  <th>Norma</th><th>Estado</th><th></th></tr>
            </thead>
            <tbody id="eppTipoBody">
              <tr><td colspan="9" class="muted" style="text-align:center;padding:26px">Cargando…</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Matriz de EPP por puesto (grilla puestos × EPP) -->
      <div class="card" style="margin-top:18px">
        <div class="card-header">
          <h3><i class="fas fa-table-cells"></i> Matriz de EPP por puesto</h3>
          <button class="btn btn-primary btn-sm" onclick="eppGuardarMatriz()">
            <i class="fas fa-floppy-disk"></i> Guardar matriz
          </button>
        </div>
        <div class="card-body">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
            <p class="muted" style="font-size:12px;margin:0">
              Clic en cada casilla para alternar: vacío → <strong style="color:var(--verde)">obligatorio</strong> → <strong style="color:var(--naranja)">opcional</strong>. El kit se sugiere solo al registrar la entrega según el cargo del trabajador.
            </p>
            <div style="display:flex;gap:14px;font-size:12px;white-space:nowrap">
              <span><i class="fas fa-check" style="color:var(--verde)"></i> Obligatorio</span>
              <span><span style="color:var(--naranja);font-weight:800">✱</span> Opcional</span>
            </div>
          </div>
          <div style="overflow-x:auto" id="eppMatrizGrid">
            <p class="muted" style="padding:16px">Cargando…</p>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ══════════════ MODAL: TIPO DE EPP ══════════════ -->
  <div class="modal-overlay" id="modalEppTipo">
    <div class="modal-box" style="max-width:560px">
      <div class="modal-header">
        <h3><i class="fas fa-helmet-safety" style="color:var(--primary)"></i> <span id="modalEppTipoTitulo">Nuevo tipo de EPP</span></h3>
        <button class="modal-close" onclick="cerrarModal('modalEppTipo')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="formEppTipo" onsubmit="return false">
          <input type="hidden" id="epp_tipo_id">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Código</label>
              <input type="text" class="form-control" id="epp_tipo_codigo" placeholder="Ej: CSB-01">
            </div>
            <div class="form-group">
              <label class="form-label">Talla</label>
              <select class="form-control" id="epp_tipo_talla"></select>
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">Nombre del EPP *</label>
              <input type="text" class="form-control" id="epp_tipo_nombre" required placeholder="Ej: Casco de seguridad blanco">
            </div>
            <div class="form-group">
              <label class="form-label">Marca / Modelo</label>
              <input type="text" class="form-control" id="epp_tipo_marca" placeholder="Ej: 3M, Steelpro">
            </div>
            <div class="form-group">
              <label class="form-label">Categoría</label>
              <input type="text" class="form-control" id="epp_tipo_categoria" placeholder="Ej: Cabeza" list="eppCategorias">
              <datalist id="eppCategorias">
                <option>Cabeza</option><option>Ojos</option><option>Manos</option><option>Pies</option>
                <option>Auditiva</option><option>Respiratoria</option><option>Alta visibilidad</option>
                <option>Anticaídas</option><option>General</option>
              </datalist>
            </div>
            <div class="form-group">
              <label class="form-label">Consumo anual</label>
              <input type="number" class="form-control" id="epp_tipo_consumo" min="0" value="0" oninput="eppTipoStockPreview()">
            </div>
            <div class="form-group">
              <label class="form-label">Unidad</label>
              <input type="text" class="form-control" id="epp_tipo_unidad" value="unidad" placeholder="unidad / par">
            </div>
            <div class="form-group">
              <label class="form-label">Norma técnica</label>
              <input type="text" class="form-control" id="epp_tipo_norma" placeholder="Ej: ANSI Z89.1">
            </div>
            <div class="form-group">
              <label class="form-label">Vida útil (días)</label>
              <input type="number" class="form-control" id="epp_tipo_vida" min="1" value="180">
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">Imagen del EPP</label>
              <div style="display:flex;gap:12px;align-items:center">
                <img id="epp_tipo_img_prev" src="" alt=""
                     style="width:52px;height:52px;object-fit:contain;border:1px solid var(--gris-600);border-radius:8px;background:#fff;display:none">
                <input type="file" class="form-control" id="epp_tipo_imagen" accept="image/png,image/jpeg,image/webp"
                       onchange="eppTipoImgPreview(this)" style="padding:7px">
              </div>
            </div>
          </div>
          <div style="margin-top:6px;padding:10px 12px;background:var(--gris-700);border-radius:8px;font-size:12.5px;color:var(--gris-300)">
            <i class="fas fa-calculator" style="color:var(--primary)"></i>
            Stock mínimo y máximo se calculan del consumo anual:
            <strong id="epp_tipo_stock_hint" style="color:var(--gris-100)">mín 0 · máx 0</strong>
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
            <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalEppTipo')">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="eppGuardarTipo()"><i class="fas fa-floppy-disk"></i> Guardar</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- ══════════════ MODAL: PROVEEDOR ══════════════ -->
  <div class="modal-overlay" id="modalEppProv">
    <div class="modal-box" style="max-width:620px">
      <div class="modal-header">
        <h3><i class="fas fa-truck-field" style="color:var(--primary)"></i> <span id="modalEppProvTitulo">Nuevo proveedor</span></h3>
        <button class="modal-close" onclick="cerrarModal('modalEppProv')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="formEppProv" onsubmit="return false">
          <input type="hidden" id="epp_prov_id">
          <div class="form-grid">
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">Razón social *</label>
              <input type="text" class="form-control" id="epp_prov_razon" required>
            </div>
            <div class="form-group">
              <label class="form-label">RUC</label>
              <input type="text" class="form-control" id="epp_prov_ruc" maxlength="11" placeholder="11 dígitos">
            </div>
            <div class="form-group">
              <label class="form-label">Contacto</label>
              <input type="text" class="form-control" id="epp_prov_contacto">
            </div>
            <div class="form-group">
              <label class="form-label">Teléfono</label>
              <input type="text" class="form-control" id="epp_prov_telefono">
            </div>
            <div class="form-group">
              <label class="form-label">Correo</label>
              <input type="email" class="form-control" id="epp_prov_email">
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">Dirección</label>
              <input type="text" class="form-control" id="epp_prov_direccion">
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">Certificaciones</label>
              <input type="text" class="form-control" id="epp_prov_certif" placeholder="Ej: ISO 9001, certificados de fábrica">
            </div>
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
            <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalEppProv')">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="eppGuardarProveedor()"><i class="fas fa-floppy-disk"></i> Guardar</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- ══════════════ MODAL: MOVIMIENTO (entrada/ajuste) ══════════════ -->
  <div class="modal-overlay" id="modalEppMov">
    <div class="modal-box" style="max-width:560px">
      <div class="modal-header">
        <h3><i class="fas fa-sliders" style="color:var(--primary)"></i> Ajuste de stock</h3>
        <button class="modal-close" onclick="cerrarModal('modalEppMov')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="formEppMov" onsubmit="return false">
          <p class="muted" style="font-size:12px;margin-bottom:12px">
            Para corregir stock (mermas, conteos). Las compras/recepciones se registran en la pestaña <strong>Ingreso</strong>.
          </p>
          <div class="form-grid">
            <input type="hidden" id="epp_mov_tipo" value="ajuste">
            <div class="form-group">
              <label class="form-label">EPP *</label>
              <select class="form-control" id="epp_mov_tipo_epp"></select>
            </div>
            <div class="form-group">
              <label class="form-label">Cantidad *</label>
              <input type="number" class="form-control" id="epp_mov_cantidad" value="1">
              <small class="muted" id="epp_mov_hint" style="font-size:11px">En ajuste usa negativo para restar.</small>
            </div>
            <div class="form-group">
              <label class="form-label">Costo unitario (S/)</label>
              <input type="number" class="form-control" id="epp_mov_costo" min="0" step="0.01" placeholder="Opcional">
            </div>
            <div class="form-group">
              <label class="form-label">Proveedor</label>
              <select class="form-control" id="epp_mov_prov"><option value="">— Ninguno —</option></select>
            </div>
            <div class="form-group">
              <label class="form-label">Fecha *</label>
              <input type="date" class="form-control" id="epp_mov_fecha" value="<?= date('Y-m-d') ?>">
            </div>
            <div class="form-group">
              <label class="form-label">N° documento</label>
              <input type="text" class="form-control" id="epp_mov_doc" placeholder="Guía / factura">
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">Observación</label>
              <input type="text" class="form-control" id="epp_mov_obs">
            </div>
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
            <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalEppMov')">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="eppGuardarMovimiento()"><i class="fas fa-floppy-disk"></i> Registrar</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- ══════════════ MODAL: NUEVO INGRESO (recepción) ══════════════ -->
  <div class="modal-overlay" id="modalEppIngreso">
    <div class="modal-box" style="max-width:720px">
      <div class="modal-header">
        <h3><i class="fas fa-dolly" style="color:var(--primary)"></i> Nuevo ingreso de EPP</h3>
        <button class="modal-close" onclick="cerrarModal('modalEppIngreso')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="formEppIngreso" onsubmit="return false">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Proveedor</label>
              <select class="form-control" id="epp_ing_prov"><option value="">— Ninguno —</option></select>
            </div>
            <div class="form-group">
              <label class="form-label">N° documento (guía/factura)</label>
              <input type="text" class="form-control" id="epp_ing_doc">
            </div>
            <div class="form-group">
              <label class="form-label">Fecha *</label>
              <input type="date" class="form-control" id="epp_ing_fecha" value="<?= date('Y-m-d') ?>">
            </div>
          </div>

          <div style="margin-top:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <label class="form-label" style="margin:0">EPP recibidos *</label>
              <button type="button" class="btn btn-outline btn-sm" onclick="eppIngAgregarFila()">
                <i class="fas fa-plus"></i> Agregar EPP
              </button>
            </div>
            <div style="overflow-x:auto">
              <table class="data-table" style="margin:0">
                <thead>
                  <tr><th>EPP</th><th style="width:120px;text-align:right">Cantidad</th>
                      <th style="width:140px;text-align:right">Costo unit. (S/)</th><th style="width:44px"></th></tr>
                </thead>
                <tbody id="eppIngItemsBody"></tbody>
              </table>
            </div>
          </div>

          <div class="form-group" style="margin-top:14px">
            <label class="form-label">Observación</label>
            <input type="text" class="form-control" id="epp_ing_obs" placeholder="Opcional">
          </div>

          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
            <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalEppIngreso')">Cancelar</button>
            <button type="button" class="btn btn-primary" id="btnEppIngGuardar" onclick="eppGuardarIngreso()">
              <i class="fas fa-floppy-disk"></i> Registrar ingreso
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- ══════════════ MODAL: TALLA ══════════════ -->
  <div class="modal-overlay" id="modalEppTalla">
    <div class="modal-box" style="max-width:420px">
      <div class="modal-header">
        <h3><i class="fas fa-ruler" style="color:var(--primary)"></i> <span id="modalEppTallaTitulo">Nueva talla</span></h3>
        <button class="modal-close" onclick="cerrarModal('modalEppTalla')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="formEppTalla" onsubmit="return false">
          <input type="hidden" id="epp_talla_id">
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Nombre de la talla *</label>
              <input type="text" class="form-control" id="epp_talla_nombre" placeholder="Ej: L, XL, Única">
            </div>
            <div class="form-group">
              <label class="form-label">Orden</label>
              <input type="number" class="form-control" id="epp_talla_orden" value="0">
            </div>
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
            <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalEppTalla')">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="eppGuardarTalla()"><i class="fas fa-floppy-disk"></i> Guardar</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- ══════════════ MODAL: NUEVA ENTREGA DE EPP ══════════════ -->
  <div class="modal-overlay" id="modalEppEntrega">
    <div class="modal-box" style="max-width:720px">
      <div class="modal-header">
        <h3><i class="fas fa-hand-holding-hand" style="color:var(--primary)"></i> Nueva entrega de EPP</h3>
        <button class="modal-close" onclick="cerrarModal('modalEppEntrega')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="formEppEntrega" onsubmit="return false">
          <div class="form-grid">
            <!-- Trabajador con autocompletar -->
            <div class="form-group" style="grid-column:1/-1;position:relative">
              <label class="form-label">Trabajador *</label>
              <input type="hidden" id="epp_ent_personal_id">
              <input type="text" class="form-control" id="epp_ent_trab_buscar" autocomplete="off"
                     placeholder="Escribe nombre o DNI…" oninput="eppEntBuscarTrabajador(this.value)">
              <div id="eppEntTrabResultados"
                   style="display:none;position:absolute;z-index:20;left:0;right:0;top:100%;background:var(--gris-800);border:1px solid var(--gris-600);border-radius:8px;max-height:210px;overflow-y:auto;box-shadow:0 8px 24px rgba(0,0,0,.35)"></div>
              <div id="eppEntTrabSel" style="display:none;margin-top:8px;font-size:12.5px;color:var(--gris-200)"></div>
            </div>
            <div class="form-group">
              <label class="form-label">Motivo *</label>
              <select class="form-control" id="epp_ent_motivo">
                <option value="nuevo">Entrega nueva</option>
                <option value="renovacion">Renovación</option>
                <option value="reposicion">Reposición</option>
                <option value="perdida">Reposición por pérdida</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Fecha *</label>
              <input type="date" class="form-control" id="epp_ent_fecha" value="<?= date('Y-m-d') ?>" onchange="eppEntRefreshRenov()">
            </div>
          </div>

          <!-- Ítems de EPP a entregar -->
          <div style="margin-top:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <label class="form-label" style="margin:0">EPP a entregar *</label>
              <button type="button" class="btn btn-outline btn-sm" onclick="eppEntAgregarFila()">
                <i class="fas fa-plus"></i> Agregar EPP
              </button>
            </div>
            <div style="overflow-x:auto">
              <table class="data-table" style="margin:0">
                <thead>
                  <tr><th>EPP</th><th style="width:80px;text-align:right">Stock</th>
                      <th style="width:100px;text-align:right">Cantidad</th>
                      <th style="width:150px">Renovación</th><th style="width:44px"></th></tr>
                </thead>
                <tbody id="eppEntItemsBody"></tbody>
              </table>
            </div>
          </div>

          <div class="form-group" style="margin-top:14px">
            <label class="form-label">Observación</label>
            <input type="text" class="form-control" id="epp_ent_obs" placeholder="Opcional">
          </div>

          <!-- Firma del trabajador -->
          <div class="form-group" style="margin-top:6px">
            <label class="form-label"><i class="fas fa-signature"></i> Firma del trabajador que recibe *</label>
            <div style="border:1px solid var(--gris-600);border-radius:8px;padding:8px;background:#fff;display:inline-block">
              <canvas id="eppEntFirmaCanvas" width="440" height="150"
                      style="touch-action:none;display:block;cursor:crosshair;max-width:100%"></canvas>
            </div>
            <div style="margin-top:6px">
              <button type="button" class="btn btn-secondary btn-sm" onclick="eppEntLimpiarFirma()">
                <i class="fas fa-eraser"></i> Limpiar firma
              </button>
            </div>
          </div>

          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
            <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalEppEntrega')">Cancelar</button>
            <button type="button" class="btn btn-primary" id="btnEppEntGuardar" onclick="eppGuardarEntrega()">
              <i class="fas fa-floppy-disk"></i> Registrar entrega
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- ══════════════ MODAL: EDITAR ENTREGA (datos generales) ══════════════ -->
  <div class="modal-overlay" id="modalEppEntEdit">
    <div class="modal-box" style="max-width:480px">
      <div class="modal-header">
        <h3><i class="fas fa-pen" style="color:var(--primary)"></i> Editar entrega</h3>
        <button class="modal-close" onclick="cerrarModal('modalEppEntEdit')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">
        <form id="formEppEntEdit" onsubmit="return false">
          <input type="hidden" id="epp_edit_id">
          <p class="muted" style="font-size:12px;margin-bottom:14px">
            Solo datos generales. No cambia los EPP entregados, el stock ni la firma.
          </p>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Motivo</label>
              <select class="form-control" id="epp_edit_motivo">
                <option value="nuevo">Entrega nueva</option>
                <option value="renovacion">Renovación</option>
                <option value="reposicion">Reposición</option>
                <option value="perdida">Reposición por pérdida</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Fecha</label>
              <input type="date" class="form-control" id="epp_edit_fecha">
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">Observación</label>
              <input type="text" class="form-control" id="epp_edit_obs">
            </div>
          </div>
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
            <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalEppEntEdit')">Cancelar</button>
            <button type="button" class="btn btn-primary" onclick="eppGuardarEditEntrega()"><i class="fas fa-floppy-disk"></i> Guardar cambios</button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- ══════════════ MODAL: DETALLE DE ENTREGA ══════════════ -->
  <div class="modal-overlay" id="modalEppEntregaVer">
    <div class="modal-box" style="max-width:640px">
      <div class="modal-header">
        <h3><i class="fas fa-file-shield" style="color:var(--primary)"></i> Detalle de entrega</h3>
        <button class="modal-close" onclick="cerrarModal('modalEppEntregaVer')"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body" id="eppEntVerBody">
        <div class="muted" style="text-align:center;padding:26px">Cargando…</div>
      </div>
    </div>
  </div>
