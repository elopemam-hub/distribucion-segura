// ============================================================
// KPI Analytics — Multi-tipo Dashboard (TLMR / TLMC / TLMD)
// Archivo: assets/js/modulos/kpi_tlmr.js
// ============================================================

// Configuración de tipos de telemetría
const TLMR_TIPOS_CFG = [
  { codigo: 'TLMR', label: 'Regular',    kpiLabel: 'Alerta Regular', kpiIcon: 'fas fa-triangle-exclamation', color: '#F5C800', dbTipo: 'telemetria_regular'  },
  { codigo: 'TLMC', label: 'Telemetría', kpiLabel: 'Telemetría',     kpiIcon: 'fas fa-bolt',                 color: '#3D99F5', dbTipo: 'telemetia_critico'   },
  { codigo: 'TLMD', label: 'Dashcam',    kpiLabel: 'Dashcam',        kpiIcon: 'fas fa-camera',               color: '#2EB85C', dbTipo: 'telemetria_dashcam'  },
];

// Colores para barras de reglas (multi-color)
const TLMR_COLORS_MULTI = [
  '#F5C800','#3D99F5','#2EB85C','#E55353',
  '#9561E2','#F97316','#14B8A6','#EC4899',
];

// Estado
let _tlmrCharts  = {};  // keyed: 'TLMR_mensual', 'TLMR_reglas', etc.
let _tlmrLoading = false;
let _tlmrBuilt   = false;

// ── Selector de agrupación ─────────────────────────────────────

function tlmrSetGroupBy(btn) {
  document.querySelectorAll('.tlmr-grp-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tlmrGroupBy').value = btn.dataset.val;
}

// ── Inicialización ─────────────────────────────────────────────

function tlmrInit() {
  if (!document.getElementById('tlmrContent')) return;
  tlmrRefresh();
}

// ── Refresh principal ──────────────────────────────────────────

async function tlmrRefresh() {
  if (_tlmrLoading) return;
  _tlmrLoading = true;

  const btn = document.getElementById('tlmrRefreshBtn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...'; }
  _tlmrShowLoading();

  const payload = {
    tipos:       TLMR_TIPOS_CFG.map(t => t.codigo),
    fecha_desde: document.getElementById('tlmrDesde')?.value   || '',
    fecha_hasta: document.getElementById('tlmrHasta')?.value   || '',
    group_by:    document.getElementById('tlmrGroupBy')?.value || 'dia',
    max_rows:    30000,
  };

  try {
    const r    = await fetch(`${KPI_TLMR_API}?action=multi_dashboard`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const resp = await r.json();

    if (!resp.success) {
      toast(resp.message || 'Error al cargar datos', 'error');
      _tlmrShowEmpty();
      return;
    }

    _tlmrRenderAll(resp.data.tipos || {});
  } catch (e) {
    console.error('[tlmr] refresh:', e);
    toast('Error de conexión en telemetría', 'error');
    _tlmrShowEmpty();
  } finally {
    _tlmrLoading = false;
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-rotate-right"></i> Actualizar'; }
  }
}

// ── Render principal ───────────────────────────────────────────

function _tlmrRenderAll(tipos) {
  const anyFound = TLMR_TIPOS_CFG.some(t => tipos[t.codigo]?.found);
  if (!anyFound) { _tlmrShowEmpty(); return; }

  // Mostrar contenido
  document.getElementById('tlmrEmpty').style.display   = 'none';
  document.getElementById('tlmrLoading').style.display = 'none';
  const content = document.getElementById('tlmrContent');
  content.style.display = '';

  // Destruir todos los charts previos
  _tlmrDestroyAll();

  // KPI cards (orden: TLMD, TLMC, TLMR para coincidir con referencia)
  _tlmrRenderKpiRow(tipos);

  // Una sección por tipo (TLMR, TLMC, TLMD)
  // Generar HTML de secciones si no están creadas
  let secContainer = document.getElementById('tlmrSecciones');
  if (!secContainer) {
    secContainer = document.createElement('div');
    secContainer.id = 'tlmrSecciones';
    content.appendChild(secContainer);
  }
  secContainer.innerHTML = '';

  TLMR_TIPOS_CFG.forEach(cfg => {
    const tipoData = tipos[cfg.codigo];
    const secEl    = _tlmrBuildSeccion(cfg, tipoData);
    secContainer.appendChild(secEl);
    if (tipoData?.found) {
      _tlmrRenderMensual(cfg.codigo, tipoData, cfg.color);
      _tlmrRenderReglas(cfg.codigo, tipoData, cfg.color);
      _tlmrRenderPlacas(cfg.codigo, tipoData, cfg.color);
      _tlmrRenderMatriz(cfg.codigo, tipoData);
    }
  });

  // Sección detalle mensual (3 tablas × selector de mes)
  _tlmrRenderDetalleMes(tipos);
}

// ── KPI Cards ──────────────────────────────────────────────────

function _tlmrRenderKpiRow(tipos) {
  let kpiRow = document.getElementById('tlmrKpiRow');
  if (!kpiRow) {
    kpiRow = document.createElement('div');
    kpiRow.id = 'tlmrKpiRow';
    kpiRow.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:20px';
    document.getElementById('tlmrContent').insertAdjacentElement('afterbegin', kpiRow);
  }

  // Orden en KPI: TLMD, TLMC, TLMR (según referencia)
  const kpiOrder = ['TLMD', 'TLMC', 'TLMR'];
  let html = '';

  kpiOrder.forEach(codigo => {
    const cfg      = TLMR_TIPOS_CFG.find(t => t.codigo === codigo);
    const tipoData = tipos[codigo];
    const total    = tipoData?.found ? tipoData.total : 0;
    const found    = tipoData?.found;

    html += `
      <div class="tlmr-kpi-card" style="border-left:4px solid ${cfg.color}${found ? '' : ';opacity:.45'}">
        <div class="tlmr-kpi-label" style="color:${cfg.color}">
          <i class="${cfg.kpiIcon}"></i> ${cfg.kpiLabel}
        </div>
        <div class="tlmr-kpi-value" style="color:${cfg.color}">${total.toLocaleString('es-PE')}</div>
        <div class="tlmr-kpi-sub">
          ${found
            ? `${tipoData.datasets_count} dataset${tipoData.datasets_count !== 1 ? 's' : ''} · ${tipoData.rows.toLocaleString('es-PE')} filas`
            : 'Sin datos importados'}
        </div>
      </div>`;
  });

  kpiRow.innerHTML = html;
}

// ── Construcción de sección por tipo ──────────────────────────

function _tlmrBuildSeccion(cfg, tipoData) {
  const el     = document.createElement('div');
  el.id        = `tlmrSec-${cfg.codigo}`;
  el.className = 'tlmr-seccion';

  const found  = tipoData?.found;

  // Título de sección
  const titleHtml = `
    <div class="tlmr-seccion-titulo">
      <span style="background:${cfg.color}1a;color:${cfg.color};border:1px solid ${cfg.color}33;padding:3px 10px;border-radius:5px;font-size:12px;font-weight:700;font-family:monospace">${cfg.codigo}</span>
      <span style="font-size:16px;font-weight:700;color:var(--gris-100)">Telemetría ${cfg.label}</span>
      ${found ? `<span style="font-size:11px;color:var(--gris-400);margin-left:auto;font-variant-numeric:tabular-nums">${tipoData.total.toLocaleString('es-PE')} alertas total</span>` : ''}
    </div>`;

  if (!found) {
    el.innerHTML = titleHtml + `
      <div style="background:var(--gris-700);border:1px solid var(--gris-600);border-radius:10px;padding:32px;text-align:center;color:var(--gris-500);margin-bottom:14px">
        <i class="${cfg.kpiIcon}" style="font-size:28px;opacity:.2;display:block;margin-bottom:10px"></i>
        <div style="font-size:13px">Sin datasets importados con tipo <code style="background:rgba(255,255,255,.06);padding:2px 7px;border-radius:3px">${cfg.codigo}</code></div>
      </div>`;
    return el;
  }

  // Fila 1: Barras por mes | Reglas h-bar
  const gridCharts = document.createElement('div');
  gridCharts.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px';

  gridCharts.innerHTML = `
    <div class="tlmr-dash-card">
      <div class="tlmr-dash-title">
        <i class="fas fa-calendar-days" style="color:${cfg.color}"></i>
        Eventos ${cfg.label}
      </div>
      <div id="tlmrChart-${cfg.codigo}-mensual" style="min-height:220px"></div>
    </div>
    <div class="tlmr-dash-card">
      <div class="tlmr-dash-title">
        <i class="${cfg.kpiIcon}" style="color:${cfg.color}"></i>
        Reglas ${cfg.label}
      </div>
      <div id="tlmrChart-${cfg.codigo}-reglas" style="min-height:220px"></div>
    </div>`;

  // Fila 2: Placas h-bar | Matriz
  const gridBottom = document.createElement('div');
  gridBottom.style.cssText = 'display:grid;grid-template-columns:1fr 1.6fr;gap:14px;margin-bottom:20px';

  const hasPlacas  = tipoData.por_placa?.labels?.length > 0;
  const matGroupBy = document.getElementById('tlmrGroupBy')?.value || 'dia';
  const matLabel   = matGroupBy === 'semana' ? 'Semana' : matGroupBy === 'mes' ? 'Mes' : 'Día';

  gridBottom.innerHTML = `
    <div class="tlmr-dash-card">
      <div class="tlmr-dash-title">
        <i class="fas fa-car" style="color:${cfg.color}"></i>
        Placas ${cfg.label}
      </div>
      <div id="tlmrChart-${cfg.codigo}-placas" style="min-height:220px"></div>
    </div>
    <div class="tlmr-dash-card" style="min-width:0">
      <div class="tlmr-dash-title">
        <i class="fas fa-table" style="color:${cfg.color}"></i>
        Eventos ${cfg.label} — por ${matLabel}
      </div>
      <div id="tlmrMatriz-${cfg.codigo}" style="overflow-x:auto;overflow-y:auto;max-height:260px;font-size:11px;font-variant-numeric:tabular-nums"></div>
    </div>`;

  el.innerHTML = titleHtml;
  el.appendChild(gridCharts);
  el.appendChild(gridBottom);
  return el;
}

// ── Gráfico: Eventos por Mes (barras verticales) ───────────────

function _tlmrRenderMensual(codigo, tipoData, color) {
  const el  = document.getElementById(`tlmrChart-${codigo}-mensual`);
  if (!el) return;
  const key = `${codigo}_mensual`;

  const { labels, data: vals } = tipoData.mensual || {};
  if (!labels?.length) { el.innerHTML = _tlmrChartEmpty('Sin datos de fecha'); return; }

  el.innerHTML = '';
  const th = _tlmrTheme();

  _tlmrCharts[key] = new ApexCharts(el, {
    chart: {
      type:       'bar',
      height:     220,
      background: 'transparent',
      foreColor:  th.foreColor,
      toolbar:    { show: false },
      animations: { enabled: true, speed: 400 },
    },
    series:  [{ name: 'Eventos', data: vals }],
    xaxis: {
      categories: labels,
      labels: { style: { fontSize: '11px', colors: th.foreColor } },
    },
    yaxis: {
      labels: { style: { fontSize: '10px', colors: th.foreColor }, formatter: v => _tlmrFmt(v) },
    },
    colors: [color],
    plotOptions: {
      bar: { columnWidth: '55%', borderRadius: 3, dataLabels: { position: 'top' } },
    },
    dataLabels: {
      enabled:   true,
      formatter: v => _tlmrFmt(v),
      style:     { fontSize: '9px', colors: [th.foreColor] },
      offsetY:   -14,
    },
    grid:    { borderColor: th.gridColor, strokeDashArray: 3 },
    tooltip: { theme: th.dark ? 'dark' : 'light', y: { formatter: v => v.toLocaleString('es-PE') } },
    theme:   { mode: th.dark ? 'dark' : 'light' },
  });
  _tlmrCharts[key].render();
}

// ── Gráfico: Reglas (barras horizontales, multi-color) ─────────

function _tlmrRenderReglas(codigo, tipoData, color) {
  const el  = document.getElementById(`tlmrChart-${codigo}-reglas`);
  if (!el) return;
  const key = `${codigo}_reglas`;

  const { labels, data: vals, col } = tipoData.por_regla || {};
  if (!labels?.length) {
    el.innerHTML = _tlmrChartEmpty(col ? `Sin datos de ${col}` : 'Sin columna de regla detectada');
    return;
  }

  el.innerHTML = '';
  const th        = _tlmrTheme();
  const chartH    = Math.max(220, labels.length * 32 + 50);
  const colorsArr = labels.map((_, i) => TLMR_COLORS_MULTI[i % TLMR_COLORS_MULTI.length]);

  _tlmrCharts[key] = new ApexCharts(el, {
    chart: {
      type:       'bar',
      height:     chartH,
      background: 'transparent',
      foreColor:  th.foreColor,
      toolbar:    { show: false },
      animations: { enabled: true, speed: 400 },
    },
    series:  [{ name: col || 'Regla', data: vals }],
    xaxis: {
      categories: labels,
      labels: {
        style:     { fontSize: '10px', colors: th.foreColor },
        formatter: v => _tlmrFmt(v),
      },
    },
    yaxis: {
      labels: {
        style:    { fontSize: '10px', colors: th.foreColor },
        maxWidth: 160,
        formatter: v => String(v).length > 24 ? String(v).slice(0, 22) + '…' : v,
      },
    },
    plotOptions: {
      bar: {
        horizontal:  true,
        barHeight:   '50%',
        borderRadius: 3,
        distributed: true,
        dataLabels:  { position: 'right' },
      },
    },
    dataLabels: {
      enabled:   true,
      formatter: v => v.toLocaleString('es-PE'),
      style:     { fontSize: '11px', fontWeight: 700 },
      offsetX:   4,
    },
    colors:  colorsArr,
    legend:  { show: false },
    grid: {
      borderColor: th.gridColor,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    tooltip: { theme: th.dark ? 'dark' : 'light', y: { formatter: v => v.toLocaleString('es-PE') } },
    theme:   { mode: th.dark ? 'dark' : 'light' },
  });
  _tlmrCharts[key].render();
}

// ── Gráfico: Placas (barras horizontales, color único) ─────────

function _tlmrRenderPlacas(codigo, tipoData, color) {
  const el  = document.getElementById(`tlmrChart-${codigo}-placas`);
  if (!el) return;
  const key = `${codigo}_placas`;

  const { labels, data: vals, col } = tipoData.por_placa || {};
  if (!labels?.length) {
    el.innerHTML = _tlmrChartEmpty(col ? `Sin datos de ${col}` : 'Sin columna de placa/unidad detectada');
    return;
  }

  el.innerHTML = '';
  const th     = _tlmrTheme();
  const chartH = Math.max(220, labels.length * 36 + 50);

  _tlmrCharts[key] = new ApexCharts(el, {
    chart: {
      type:       'bar',
      height:     chartH,
      background: 'transparent',
      foreColor:  th.foreColor,
      toolbar:    { show: false },
      animations: { enabled: true, speed: 400 },
    },
    series:  [{ name: col || 'Unidad', data: vals }],
    xaxis: {
      categories: labels,
      labels: {
        style:     { fontSize: '10px', colors: th.foreColor, fontFamily: 'monospace' },
        formatter: v => _tlmrFmt(v),
      },
    },
    yaxis: {
      labels: {
        style:     { fontSize: '10px', colors: th.foreColor, fontFamily: 'monospace' },
        maxWidth:  110,
        formatter: v => String(v).length > 14 ? String(v).slice(0, 12) + '…' : v,
      },
    },
    plotOptions: {
      bar: {
        horizontal:  true,
        barHeight:   '55%',
        borderRadius: 3,
        dataLabels:  { position: 'right' },
      },
    },
    dataLabels: {
      enabled:   true,
      formatter: v => v.toLocaleString('es-PE'),
      style:     { fontSize: '11px', fontWeight: 700 },
      offsetX:   4,
    },
    colors:  [color],
    legend:  { show: false },
    grid: {
      borderColor: th.gridColor,
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    tooltip: { theme: th.dark ? 'dark' : 'light', y: { formatter: v => v.toLocaleString('es-PE') } },
    theme:   { mode: th.dark ? 'dark' : 'light' },
  });
  _tlmrCharts[key].render();
}

// ── Tabla Matriz: Regla × Período ─────────────────────────────

function _tlmrRenderMatriz(codigo, tipoData) {
  const el = document.getElementById(`tlmrMatriz-${codigo}`);
  if (!el) return;

  const { reglas, periods, data: grpData } = tipoData.matriz || {};
  if (!reglas?.length || !periods?.length) {
    el.innerHTML = _tlmrChartEmpty('Sin datos de matriz (requiere columna regla + fecha)');
    return;
  }

  const th     = _tlmrTheme();
  const isDark = th.dark;
  const bgCell = isDark ? '#2A303D' : '#ffffff';

  let html = `<table class="tlmr-mat-table">
    <thead>
      <tr>
        <th class="tlmr-mat-th" style="text-align:left;min-width:140px;position:sticky;left:0;z-index:1">Regla</th>`;

  periods.forEach(p => {
    html += `<th class="tlmr-mat-th" style="text-align:right;min-width:34px">${kpiEsc(String(p))}</th>`;
  });
  html += `<th class="tlmr-mat-th" style="text-align:right;min-width:50px;font-weight:800">Total</th>
      </tr>
    </thead><tbody>`;

  const colTotals = {};
  periods.forEach(p => { colTotals[p] = 0; });

  reglas.forEach((regla, ri) => {
    const rowData  = grpData[regla] || {};
    const rowColor = TLMR_COLORS_MULTI[ri % TLMR_COLORS_MULTI.length];
    const rowTotal = periods.reduce((s, p) => s + (rowData[p] || 0), 0);

    html += `<tr class="tlmr-mat-row">
      <td class="tlmr-mat-td" style="text-align:left;font-weight:600;color:${rowColor};position:sticky;left:0;background:${bgCell};max-width:180px;overflow:hidden;text-overflow:ellipsis" title="${kpiEsc(regla)}">${kpiEsc(regla)}</td>`;

    periods.forEach(p => {
      const v = rowData[p] || 0;
      colTotals[p] += v;
      html += `<td class="tlmr-mat-td" style="text-align:right;color:${v > 0 ? 'var(--gris-100)' : 'var(--gris-600)'}">${v > 0 ? v.toLocaleString('es-PE') : '—'}</td>`;
    });

    html += `<td class="tlmr-mat-td" style="text-align:right;font-weight:700;color:var(--amarillo)">${rowTotal.toLocaleString('es-PE')}</td></tr>`;
  });

  // Fila Total
  const grandTotal = Object.values(colTotals).reduce((a, b) => a + b, 0);
  html += `<tr class="tlmr-mat-total">
    <td class="tlmr-mat-td" style="font-weight:800;position:sticky;left:0;background:${bgCell}">Total</td>`;
  periods.forEach(p => {
    const v = colTotals[p] || 0;
    html += `<td class="tlmr-mat-td" style="font-weight:700;text-align:right;color:var(--gris-100)">${v > 0 ? v.toLocaleString('es-PE') : '—'}</td>`;
  });
  html += `<td class="tlmr-mat-td" style="font-weight:800;text-align:right;color:var(--amarillo)">${grandTotal.toLocaleString('es-PE')}</td>
    </tr>`;

  html += '</tbody></table>';
  el.innerHTML = html;
}

// ── Detalle Mensual ───────────────────────────────────────────

const TLMR_MESES_ES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

// Referencia guardada para re-render al cambiar de mes
let _tlmrTiposData = null;

function _tlmrRenderDetalleMes(tipos) {
  _tlmrTiposData = tipos;

  // Recopilar meses con datos en cualquier tipo
  const mesesSet = new Set();
  TLMR_TIPOS_CFG.forEach(cfg => {
    const d = tipos[cfg.codigo];
    if (d?.found && d.por_mes_detalle) {
      Object.keys(d.por_mes_detalle).forEach(m => mesesSet.add(Number(m)));
    }
  });
  if (!mesesSet.size) return;

  const meses = [...mesesSet].sort((a, b) => a - b);

  // Crear o reusar sección
  const content = document.getElementById('tlmrContent');
  let sec = document.getElementById('tlmrSecDetalleMes');
  if (!sec) {
    sec = document.createElement('div');
    sec.id = 'tlmrSecDetalleMes';
    content.appendChild(sec);
  }

  sec.innerHTML = `
    <div class="tlmr-detalle-header">
      <i class="fas fa-table-cells" style="color:var(--amarillo)"></i>
      Detalle Mensual — Eventos por Día
    </div>
    <div class="tlmr-detalle-layout">
      <div class="tlmr-mes-panel">
        <div class="tlmr-mes-panel-title">Mes</div>
        <div id="tlmrMesBtns" class="tlmr-mes-lista"></div>
      </div>
      <div id="tlmrMesTablasGrid" class="tlmr-mes-grid"></div>
    </div>`;

  // Botones de mes
  const btnsEl = document.getElementById('tlmrMesBtns');
  meses.forEach(mes => {
    const btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'tlmr-mes-btn';
    btn.textContent = TLMR_MESES_ES[mes - 1];
    btn.dataset.mes = mes;
    btn.onclick = () => _tlmrSelectMes(mes);
    btnsEl.appendChild(btn);
  });

  // Renderizar primer mes
  _tlmrSelectMes(meses[0]);
}

function _tlmrSelectMes(mes) {
  // Activar botón
  document.querySelectorAll('.tlmr-mes-btn').forEach(b => {
    b.classList.toggle('active', Number(b.dataset.mes) === mes);
  });

  const grid = document.getElementById('tlmrMesTablasGrid');
  if (!grid || !_tlmrTiposData) return;

  const th     = _tlmrTheme();
  const bgCell = th.dark ? '#2A303D' : '#ffffff';
  const bgHead = th.dark ? '#1e2330' : '#f4f4f6';

  let html = '';

  TLMR_TIPOS_CFG.forEach(cfg => {
    const tipoData = _tlmrTiposData[cfg.codigo];
    const mesData  = tipoData?.found ? tipoData.por_mes_detalle?.[mes] : null;

    html += `<div class="tlmr-mes-tabla-wrap">
      <div class="tlmr-mes-tabla-titulo" style="color:${cfg.color}">
        <i class="${cfg.kpiIcon}"></i> Eventos ${cfg.label}
      </div>`;

    if (!mesData?.reglas?.length) {
      html += `<div class="tlmr-mes-sin-datos">Sin datos para ${TLMR_MESES_ES[mes - 1]}</div>`;
    } else {
      const { reglas, data: grpData } = mesData;
      const colTotals = {};
      reglas.forEach(r => { colTotals[r] = 0; });

      // Detectar días con datos
      const daysWithData = new Set();
      reglas.forEach(r => {
        if (grpData[r]) Object.keys(grpData[r]).forEach(d => {
          if (grpData[r][d] > 0) daysWithData.add(Number(d));
        });
      });

      html += `<div class="tlmr-mes-tabla-scroll">
        <table class="tlmr-mat-table">
          <thead><tr>
            <th class="tlmr-mat-th tlmr-mes-th-dia">Día</th>`;

      reglas.forEach((r, ri) => {
        const color = TLMR_COLORS_MULTI[ri % TLMR_COLORS_MULTI.length];
        const label = r.length > 18 ? r.slice(0, 16) + '…' : r;
        html += `<th class="tlmr-mat-th" style="text-align:right;color:${color}" title="${kpiEsc(r)}">${kpiEsc(label)}</th>`;
      });
      html += `<th class="tlmr-mat-th" style="text-align:right;font-weight:800">Total</th>
          </tr></thead><tbody>`;

      for (let dia = 1; dia <= 31; dia++) {
        const hasData = daysWithData.has(dia);
        let rowTotal  = 0;

        html += `<tr class="tlmr-mat-row">
          <td class="tlmr-mat-td tlmr-mes-td-dia${hasData ? ' has-data' : ''}">${dia}</td>`;

        reglas.forEach(r => {
          const v = grpData[r]?.[dia] || 0;
          colTotals[r] += v;
          rowTotal += v;
          html += `<td class="tlmr-mat-td" style="text-align:right;color:${v > 0 ? 'var(--gris-100)' : 'var(--gris-600)'}">${v > 0 ? v : ''}</td>`;
        });

        html += `<td class="tlmr-mat-td" style="text-align:right;font-weight:700;color:${rowTotal > 0 ? 'var(--amarillo)' : 'var(--gris-600)'}">${rowTotal > 0 ? rowTotal : ''}</td>
          </tr>`;
      }

      // Fila Total
      const grandTotal = Object.values(colTotals).reduce((a, b) => a + b, 0);
      html += `<tr class="tlmr-mat-total">
        <td class="tlmr-mat-td" style="font-weight:800">Total</td>`;
      reglas.forEach(r => {
        const v = colTotals[r] || 0;
        html += `<td class="tlmr-mat-td" style="text-align:right;font-weight:700">${v > 0 ? v.toLocaleString('es-PE') : '—'}</td>`;
      });
      html += `<td class="tlmr-mat-td" style="text-align:right;font-weight:800;color:var(--amarillo)">${grandTotal.toLocaleString('es-PE')}</td>
        </tr>`;

      html += `</tbody></table></div>`;
    }

    html += `</div>`;
  });

  grid.innerHTML = html;
}

// ── Utilidades ────────────────────────────────────────────────

function _tlmrTheme() {
  const dark = document.documentElement.getAttribute('data-theme') !== 'light';
  return {
    dark,
    foreColor: dark ? '#b0b8c8' : '#374151',
    gridColor: dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.08)',
  };
}

function _tlmrDestroyAll() {
  Object.keys(_tlmrCharts).forEach(key => {
    if (_tlmrCharts[key]) {
      try { _tlmrCharts[key].destroy(); } catch (_) {}
      _tlmrCharts[key] = null;
    }
  });
  _tlmrCharts = {};
}

function _tlmrChartEmpty(msg) {
  return `<div style="display:flex;align-items:center;justify-content:center;min-height:180px;color:var(--gris-500);font-size:12px;text-align:center;flex-direction:column;gap:8px;padding:20px">
    <i class="fas fa-chart-bar" style="font-size:26px;opacity:.15"></i>
    <span>${kpiEsc(msg)}</span>
  </div>`;
}

function _tlmrShowEmpty() {
  const c = document.getElementById('tlmrContent');
  const e = document.getElementById('tlmrEmpty');
  const l = document.getElementById('tlmrLoading');
  if (c) c.style.display = 'none';
  if (l) l.style.display = 'none';
  if (e) e.style.display = '';
}

function _tlmrShowLoading() {
  const c = document.getElementById('tlmrContent');
  const e = document.getElementById('tlmrEmpty');
  const l = document.getElementById('tlmrLoading');
  if (c) c.style.display = 'none';
  if (e) e.style.display = 'none';
  if (l) l.style.display = '';
}

function _tlmrFmt(n) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n % 1 === 0
    ? Number(n).toLocaleString('es-PE')
    : Number(n).toLocaleString('es-PE', { maximumFractionDigits: 2 });
}
