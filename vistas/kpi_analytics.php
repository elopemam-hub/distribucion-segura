<?php if (tieneAccesoModulo('kpi_analytics')): ?>

<script>
const KPI_DATASETS_API   = '<?= BASE_URL ?>/api/kpi/datasets.php';
const KPI_QUERY_API      = '<?= BASE_URL ?>/api/kpi/query.php';
const KPI_WIDGETS_API    = '<?= BASE_URL ?>/api/kpi/widgets.php';
const KPI_FILE_TYPES_API = '<?= BASE_URL ?>/api/kpi/file_types.php';
const KPI_TLMR_API       = '<?= BASE_URL ?>/api/kpi/tlmr.php';
</script>

<!-- ===== PAGE: KPI ANALYTICS ===== -->
<div class="page-content" id="page-kpi-analytics" style="display:none">

  <!-- Cabecera -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
    <div>
      <h2 style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--gris-100)">
        <i class="fas fa-chart-line" style="color:var(--amarillo)"></i> KPI Analytics
      </h2>
      <p style="color:var(--gris-400);font-size:13px;margin-top:2px">Análisis de datos con dashboards interactivos — ApexCharts</p>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-outline btn-sm" onclick="kpiCargarListado()" title="Actualizar lista">
        <i class="fas fa-rotate-right"></i>
      </button>
    </div>
  </div>

  <!-- Tabs -->
  <div class="tabs" style="margin-bottom:0;border-bottom:2px solid var(--gris-600);padding-bottom:0;gap:2px">
    <button class="tab-btn insp-tab-btn active" id="kpi-btn-datasets"
            onclick="kpiSwitchTab('datasets')" style="border-radius:8px 8px 0 0">
      <i class="fas fa-database"></i> Datasets
    </button>
    <button class="tab-btn insp-tab-btn" id="kpi-btn-graficos"
            style="border-radius:8px 8px 0 0"
            onclick="kpiSwitchTab('graficos');tlmrInit()">
      <i class="fas fa-satellite-dish"></i> Telemetría
    </button>
    <button class="tab-btn insp-tab-btn" id="kpi-btn-dashboard"
            style="border-radius:8px 8px 0 0;opacity:.4;cursor:not-allowed" disabled
            title="Disponible en Fase 3 — Compone dashboards con múltiples charts">
      <i class="fas fa-gauge-high"></i> Dashboard
    </button>
  </div>

  <!-- ── PANEL: DATASETS ── -->
  <div class="card kpi-tab-panel" id="kpi-panel-datasets" style="border-radius:0 8px 8px 8px;margin-top:0">
    <div class="card-body" style="padding:22px">

      <!-- ── Upload: Configuración + Archivo ── -->
      <div style="display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--gris-600);border-radius:10px;overflow:hidden;margin-bottom:20px">

        <!-- Panel izquierdo: Configuración -->
        <div style="padding:20px;border-right:1px solid var(--gris-600)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:18px;font-size:13px;font-weight:700;color:var(--gris-300)">
            <i class="fas fa-gear" style="color:var(--amarillo)"></i> Configuración
          </div>

          <!-- Tipo de Archivo -->
          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label" style="font-size:12px">Tipo de Archivo *</label>
            <select class="form-control" id="kpiTipoSel" style="font-size:13px" onchange="kpiOnTipoChange()">
              <option value="">— Selecciona el tipo —</option>
            </select>
          </div>

          <!-- Tarjeta descripción tipo -->
          <div id="kpiTipoCard" style="display:none;background:rgba(61,153,245,.08);border:1px solid rgba(61,153,245,.25);border-radius:8px;padding:10px 13px;margin-bottom:12px">
            <div style="display:flex;align-items:flex-start;gap:8px">
              <i class="fas fa-circle-info" style="color:var(--azul);margin-top:2px;flex-shrink:0"></i>
              <div>
                <div id="kpiTipoCardTitle" style="font-weight:700;color:var(--azul);font-size:13px"></div>
                <div id="kpiTipoCardMeta" style="font-size:11px;color:var(--gris-400);margin-top:3px"></div>
              </div>
            </div>
          </div>

          <!-- Fecha Planificación -->
          <div class="form-group" style="margin-bottom:12px">
            <label class="form-label" style="font-size:12px">Fecha de Planificación *</label>
            <input type="date" class="form-control" id="kpiFechaPlan"
                   value="<?= date('Y-m-d') ?>" style="font-size:13px">
            <div style="font-size:11px;color:var(--gris-500);margin-top:4px">Fecha para la cual aplican estos datos</div>
          </div>

          <!-- Subir en partes -->
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:var(--gris-300);user-select:none">
            <input type="checkbox" id="kpiSubirPartes" checked
                   style="accent-color:var(--amarillo);width:14px;height:14px;flex-shrink:0">
            <i class="fas fa-bolt" style="color:var(--amarillo);font-size:11px"></i>
            Subir en partes <span style="color:var(--gris-500);font-size:11px">(evita timeout)</span>
          </label>
        </div>

        <!-- Panel derecho: Archivo -->
        <div style="padding:20px;display:flex;flex-direction:column;gap:14px">
          <div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--gris-300)">
            <i class="fas fa-cloud-arrow-up" style="color:var(--amarillo)"></i> Archivo
          </div>

          <!-- Drop zone -->
          <div id="kpiDropZone"
               class="upload-area"
               style="flex:1;min-height:130px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer"
               onclick="document.getElementById('kpiFileInput').click()"
               ondragover="event.preventDefault();document.getElementById('kpiDropZone').classList.add('dragover')"
               ondragleave="document.getElementById('kpiDropZone').classList.remove('dragover')"
               ondrop="kpiHandleDrop(event)">
            <i class="fas fa-cloud-arrow-up" style="font-size:32px;color:var(--gris-500);opacity:.5"></i>
            <div style="font-size:14px;font-weight:600;color:var(--gris-300)">Arrastra tu archivo aquí o haz clic para seleccionar</div>
            <div id="kpiDropZoneHint" style="font-size:11px;color:var(--gris-500)">Solo archivos .xlsx (máx. 5 MB)</div>
          </div>

          <input type="file" id="kpiFileInput" accept=".xlsx,.xls,.csv" style="display:none"
                 onchange="kpiHandleFileSelect(this)">

          <!-- Botón Subir -->
          <button id="kpiSubirBtn" onclick="kpiSubirArchivo()" disabled
                  class="btn btn-primary"
                  style="width:100%;padding:12px;font-size:14px;font-weight:600;opacity:.45;letter-spacing:.02em">
            <i class="fas fa-cloud-arrow-up"></i>&nbsp; Subir Archivo
          </button>
        </div>

      </div><!-- /upload grid -->

      <!-- ── Referencia de Tipos de Archivo ── -->
      <div style="border:1px solid var(--gris-600);border-radius:10px;overflow:hidden;margin-bottom:26px">
        <div style="padding:11px 18px;border-bottom:1px solid var(--gris-600);display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--gris-300)">
            <i class="fas fa-circle-info" style="color:var(--azul)"></i> Referencia de Tipos de Archivo
          </div>
          <button class="btn btn-outline btn-sm" id="kpiAgregarTipoBtn"
                  onclick="kpiAbrirModalTipo()" style="font-size:11px;padding:4px 10px;display:none">
            <i class="fas fa-plus"></i> Agregar tipo
          </button>
        </div>
        <div class="table-wrap">
          <table class="data-table" style="font-size:12px">
            <thead>
              <tr>
                <th style="width:80px">Código</th>
                <th>Descripción</th>
                <th style="width:90px">Formato</th>
                <th style="width:110px">Tamaño Máx.</th>
                <th>Tabla Destino</th>
                <th style="width:60px"></th>
              </tr>
            </thead>
            <tbody id="kpiTiposRefBody">
              <tr><td colspan="6" style="text-align:center;padding:20px;color:var(--gris-400)">
                <div class="spinner" style="width:18px;height:18px;border-width:2px;margin:0 auto"></div>
              </td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Cabecera de la lista -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:10px">
        <h4 style="font-family:var(--font-display);font-size:17px;font-weight:700;color:var(--gris-100);margin:0">
          <i class="fas fa-database" style="color:var(--amarillo)"></i> Datasets importados
        </h4>
        <!-- Búsqueda + por-página -->
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <div style="position:relative">
            <i class="fas fa-search" style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--gris-400);font-size:11px;pointer-events:none"></i>
            <input type="text" id="kpiBuscar"
                   placeholder="Buscar nombre, tipo…"
                   oninput="kpiFiltrarDatasets(this.value)"
                   style="padding:6px 10px 6px 28px;font-size:12px;border:1px solid var(--gris-600);background:var(--gris-700);color:var(--gris-100);border-radius:7px;width:200px;outline:none">
          </div>
          <select id="kpiPageSize" onchange="kpiSetPagina(1)"
                  style="padding:6px 8px;font-size:12px;border:1px solid var(--gris-600);background:var(--gris-700);color:var(--gris-300);border-radius:7px;cursor:pointer">
            <option value="10" selected>10 por pág.</option>
            <option value="20">20 por pág.</option>
            <option value="50">50 por pág.</option>
            <option value="0">Todos</option>
          </select>
          <span id="kpiDatasetsCount" style="font-size:12px;color:var(--gris-400);white-space:nowrap"></span>
        </div>
      </div>

      <!-- Tabla de datasets -->
      <div class="table-wrap">
        <table class="data-table" id="kpiDatasetsTable">
          <thead>
            <tr>
              <th>Nombre</th>
              <th style="width:70px">Tipo</th>
              <th style="width:110px">Fecha Plan.</th>
              <th>Columnas</th>
              <th style="text-align:right;width:70px">Filas</th>
              <th style="width:130px">Importado</th>
              <th style="width:110px">Subido por</th>
              <th style="width:50px"></th>
            </tr>
          </thead>
          <tbody id="kpiDatasetsBody">
            <tr><td colspan="8" style="text-align:center;padding:40px;color:var(--gris-400)">
              <div class="spinner"></div>
            </td></tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div id="kpiPaginacion"
           style="display:none;align-items:center;justify-content:space-between;margin-top:12px;flex-wrap:wrap;gap:8px">
        <span id="kpiPagInfo" style="font-size:12px;color:var(--gris-400)"></span>
        <div id="kpiPagBtns" style="display:flex;gap:4px;flex-wrap:wrap"></div>
      </div>

    </div>
  </div>

<!-- ── PANEL: GRÁFICOS — DASHBOARD TELEMETRÍA ── -->
<div class="card kpi-tab-panel" id="kpi-panel-graficos"
     style="border-radius:0 8px 8px 8px;margin-top:0;display:none">
  <div class="card-body" style="padding:22px">

    <!-- ── Cabecera ── -->
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px">
      <div>
        <h3 style="font-family:var(--font-display);font-size:18px;font-weight:800;color:var(--gris-100);margin:0">
          <i class="fas fa-satellite-dish" style="color:var(--amarillo)"></i>
          Dashboard Telemetría
        </h3>
        <p style="color:var(--gris-400);font-size:12px;margin:3px 0 0">TLMR · TLMC · TLMD — Análisis consolidado de todos los datasets importados</p>
      </div>
      <button class="btn btn-primary btn-sm" id="tlmrRefreshBtn" onclick="tlmrRefresh()" style="min-width:110px">
        <i class="fas fa-rotate-right"></i> Actualizar
      </button>
    </div>

    <!-- ── Barra de filtros ── -->
    <div style="background:var(--gris-700);border:1px solid var(--gris-600);border-radius:10px;padding:13px 16px;margin-bottom:16px">
      <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end">

        <div class="form-group" style="margin:0;min-width:140px">
          <label class="form-label" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em">Desde</label>
          <input type="date" class="form-control" id="tlmrDesde" style="font-size:13px">
        </div>

        <div class="form-group" style="margin:0;min-width:140px">
          <label class="form-label" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em">Hasta</label>
          <input type="date" class="form-control" id="tlmrHasta" style="font-size:13px">
        </div>

        <div class="form-group" style="margin:0">
          <label class="form-label" style="font-size:11px;text-transform:uppercase;letter-spacing:.06em">Agrupar matriz por</label>
          <div class="tlmr-grp-wrap">
            <button type="button" class="tlmr-grp-btn active" data-val="dia"    onclick="tlmrSetGroupBy(this)">Día<span class="tlmr-grp-sub">1-31</span></button>
            <button type="button" class="tlmr-grp-btn"        data-val="semana" onclick="tlmrSetGroupBy(this)">Semana</button>
            <button type="button" class="tlmr-grp-btn"        data-val="mes"    onclick="tlmrSetGroupBy(this)">Mes<span class="tlmr-grp-sub">1-12</span></button>
          </div>
          <input type="hidden" id="tlmrGroupBy" value="dia">
        </div>

      </div>
    </div>

    <!-- ── Estado vacío / Cargando ── -->
    <div id="tlmrEmpty" style="text-align:center;padding:60px 20px;color:var(--gris-500)">
      <i class="fas fa-satellite-dish" style="font-size:48px;opacity:.18;display:block;margin-bottom:16px"></i>
      <div style="font-size:15px;font-weight:600;color:var(--gris-400)">Sin datos de telemetría</div>
      <div style="font-size:12px;margin-top:6px">
        Importa archivos desde la pestaña <strong style="color:var(--gris-300)">Datasets</strong> con tipos
        <code style="background:rgba(245,200,0,.12);color:var(--amarillo);padding:1px 5px;border-radius:3px">TLMR</code>
        <code style="background:rgba(61,153,245,.12);color:var(--azul);padding:1px 5px;border-radius:3px">TLMC</code>
        <code style="background:rgba(46,184,92,.12);color:var(--verde);padding:1px 5px;border-radius:3px">TLMD</code>
      </div>
    </div>
    <div id="tlmrLoading" style="display:none;text-align:center;padding:50px 20px">
      <div class="spinner" style="margin:0 auto 14px;width:32px;height:32px;border-width:3px"></div>
      <div style="font-size:13px;color:var(--gris-400)">Cargando datos de telemetría...</div>
    </div>

    <!-- ── Contenido generado por JS ── -->
    <div id="tlmrContent" style="display:none"></div>

  </div>
</div>

</div><!-- /page-kpi-analytics -->

<!-- ===== MODAL: COLUMN MAPPER ===== -->
<div class="modal-overlay" id="kpiMapperModal"
     onclick="if(event.target===this&&!window._kpiImporting)cerrarModal('kpiMapperModal')">
  <div class="modal-box" style="max-width:860px;width:95vw">

    <div class="modal-header">
      <h3>
        <i class="fas fa-table-columns" style="color:var(--amarillo)"></i>
        Configurar dataset
      </h3>
      <button class="modal-close" id="kpiMapperCloseBtn" onclick="cerrarModal('kpiMapperModal')">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <div class="modal-body" style="padding:22px">

      <!-- Nombre + info -->
      <div style="display:flex;align-items:flex-end;gap:14px;margin-bottom:18px;flex-wrap:wrap">
        <div class="form-group" style="margin:0;flex:1;min-width:220px">
          <label class="form-label">Nombre del dataset *</label>
          <input type="text" class="form-control" id="kpiDatasetNombre"
                 placeholder="Ej: Ventas Julio 2026" maxlength="120">
        </div>
        <div style="font-size:12px;color:var(--gris-400);padding-bottom:8px;white-space:nowrap" id="kpiMapperInfo"></div>
      </div>

      <!-- Leyenda de tipos -->
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--gris-400);margin-right:4px">Tipos:</span>
        <span style="font-size:11px;background:rgba(61,153,245,.18);color:var(--azul);border:1px solid rgba(61,153,245,.35);padding:2px 8px;border-radius:3px;font-weight:600"><i class="fas fa-layer-group" style="font-size:9px"></i> Dimensión</span>
        <span style="font-size:11px;background:rgba(46,184,92,.18);color:var(--verde);border:1px solid rgba(46,184,92,.35);padding:2px 8px;border-radius:3px;font-weight:600"><i class="fas fa-hashtag" style="font-size:9px"></i> Métrica</span>
        <span style="font-size:11px;background:rgba(249,177,21,.18);color:var(--naranja);border:1px solid rgba(249,177,21,.35);padding:2px 8px;border-radius:3px;font-weight:600"><i class="fas fa-calendar" style="font-size:9px"></i> Fecha</span>
        <span style="font-size:11px;background:rgba(138,147,162,.1);color:var(--gris-500);border:1px solid var(--gris-600);padding:2px 8px;border-radius:3px;font-weight:600">— Ignorar</span>
      </div>

      <!-- Tabla de columnas -->
      <div style="border:1px solid var(--gris-600);border-radius:8px;overflow:hidden;margin-bottom:16px">
        <div style="max-height:260px;overflow-y:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="position:sticky;top:0;z-index:1">
                <th style="padding:8px 14px;background:var(--gris-700);text-align:left;font-size:10px;font-weight:700;color:var(--gris-400);text-transform:uppercase;letter-spacing:.07em;width:36%">Columna</th>
                <th style="padding:8px 14px;background:var(--gris-700);text-align:left;font-size:10px;font-weight:700;color:var(--gris-400);text-transform:uppercase;letter-spacing:.07em;width:22%">Tipo</th>
                <th style="padding:8px 14px;background:var(--gris-700);text-align:left;font-size:10px;font-weight:700;color:var(--gris-400);text-transform:uppercase;letter-spacing:.07em">Muestra de datos</th>
              </tr>
            </thead>
            <tbody id="kpiMapperCols"></tbody>
          </table>
        </div>
      </div>

      <!-- Preview primeras 5 filas -->
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--gris-400);margin-bottom:8px">
        Vista previa — primeras 5 filas
      </div>
      <div style="border:1px solid var(--gris-600);border-radius:8px;overflow:hidden;max-height:170px;overflow-y:auto">
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:11px">
            <thead id="kpiPreviewHead"></thead>
            <tbody id="kpiPreviewBody"></tbody>
          </table>
        </div>
      </div>

      <!-- Barra de progreso (oculta hasta importar) -->
      <div id="kpiImportProgress" style="display:none;margin-top:18px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;color:var(--gris-400)">
          <span id="kpiProgressStatus">Preparando...</span>
          <span id="kpiProgressLabel" style="font-variant-numeric:tabular-nums;font-weight:600">0%</span>
        </div>
        <div style="background:var(--gris-600);border-radius:6px;height:7px;overflow:hidden">
          <div id="kpiProgressBar"
               style="background:linear-gradient(90deg,var(--verde),#1abc9c);height:100%;width:0%;transition:width .3s ease-out;border-radius:6px"></div>
        </div>
      </div>

    </div><!-- /modal-body -->

    <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:10px;padding:14px 22px;border-top:1px solid var(--gris-600)">
      <button class="btn btn-secondary" id="kpiCancelBtn" onclick="cerrarModal('kpiMapperModal')">Cancelar</button>
      <button class="btn btn-primary" id="kpiImportBtn" onclick="kpiImportarDataset()">
        <i class="fas fa-upload"></i> Importar dataset
      </button>
    </div>

  </div>
</div>

<!-- ===== MODAL: TIPO DE ARCHIVO ===== -->
<div class="modal-overlay" id="kpiTipoModal"
     onclick="if(event.target===this)cerrarModal('kpiTipoModal')">
  <div class="modal-box" style="max-width:500px;width:95vw">
    <div class="modal-header">
      <h3><i class="fas fa-tag" style="color:var(--amarillo)"></i> <span id="kpiTipoModalTitle">Agregar Tipo de Archivo</span></h3>
      <button class="modal-close" onclick="cerrarModal('kpiTipoModal')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body" style="padding:22px;display:flex;flex-direction:column;gap:14px">
      <input type="hidden" id="kpiTipoEditId">
      <div class="form-group" style="margin:0">
        <label class="form-label">Código * <span style="font-weight:400;color:var(--gris-500)">(ej: RPC, SDP, MSJ)</span></label>
        <input type="text" class="form-control" id="kpiTipoCodigo" placeholder="RPC" maxlength="20"
               style="text-transform:uppercase;font-family:monospace;letter-spacing:.06em;font-weight:700">
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">Descripción *</label>
        <input type="text" class="form-control" id="kpiTipoDescripcion" placeholder="Ej: Resumen Planeado CD" maxlength="200">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group" style="margin:0">
          <label class="form-label">Formato</label>
          <select class="form-control" id="kpiTipoFormato">
            <option value="xlsx">.xlsx</option>
            <option value="xls">.xls</option>
            <option value="csv">.csv</option>
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Tamaño Máx. (MB)</label>
          <input type="number" class="form-control" id="kpiTipoMaxMb" value="5" min="1" max="50">
        </div>
      </div>
      <div class="form-group" style="margin:0">
        <label class="form-label">Tabla Destino <span style="font-weight:400;color:var(--gris-500)">(opcional)</span></label>
        <input type="text" class="form-control" id="kpiTipoTabla" placeholder="ej: delivery_message" maxlength="100"
               style="font-family:monospace;font-size:13px">
      </div>
    </div>
    <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:10px;padding:14px 22px;border-top:1px solid var(--gris-600)">
      <button class="btn btn-secondary" onclick="cerrarModal('kpiTipoModal')">Cancelar</button>
      <button class="btn btn-primary" onclick="kpiGuardarTipo()">
        <i class="fas fa-save"></i> Guardar tipo
      </button>
    </div>
  </div>
</div>

<?php endif; // kpi_analytics ?>
