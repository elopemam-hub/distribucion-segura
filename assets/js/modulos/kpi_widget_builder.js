// ============================================================
// KPI ANALYTICS — Widget Builder (Phase 2)
// assets/js/modulos/kpi_widget_builder.js
// Depende de: ApexCharts, toast() / kpiEsc() de core.js y kpi_datasets.js
// ============================================================

'use strict';

// ── State ─────────────────────────────────────────────────────
let _wbDatasets    = [];
let _wbCols        = [];       // [{nombre, tipo}] del dataset seleccionado
let _wbChart       = null;
let _wbChartType   = 'bar';
let _wbYColIdx     = 0;
let _wbYCols       = [];       // [{id, col, agg}]
let _wbFilterIdx   = 0;
let _wbFilters     = [];       // [{id, col, op, val}]
let _wbFiltersOpen = false;
let _wbPreviewTimer = null;
let _wbEditingId   = null;
let _wbInited      = false;

const WB_CHART_TYPES = [
    { type: 'bar',   icon: 'fa-chart-bar',         label: 'Barras'  },
    { type: 'line',  icon: 'fa-chart-line',         label: 'Líneas'  },
    { type: 'area',  icon: 'fa-chart-area',         label: 'Área'    },
    { type: 'pie',   icon: 'fa-chart-pie',          label: 'Pastel'  },
    { type: 'donut', icon: 'fa-circle-half-stroke', label: 'Donut'   },
    { type: 'radar', icon: 'fa-asterisk',           label: 'Radar'   },
];

const WB_AGG_OPS = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'];

const WB_FILTER_OPS = [
    { op: 'eq',       label: '='        },
    { op: 'neq',      label: '≠'        },
    { op: 'gt',       label: '>'        },
    { op: 'lt',       label: '<'        },
    { op: 'gte',      label: '≥'        },
    { op: 'lte',      label: '≤'        },
    { op: 'contains', label: 'contiene' },
];

const WB_COLORS = ['#F5C800','#2EB85C','#3D99F5','#E55353','#9561E2','#F97316','#14B8A6','#EC4899'];

const _wbCsrf = () => document.querySelector('meta[name="csrf-token"]')?.content ?? '';

// ── Init ──────────────────────────────────────────────────────
function wbInit() {
    _wbBuildChartTypePicker();
    if (!_wbYCols.length) {
        _wbYCols.push({ id: ++_wbYColIdx, col: '', agg: 'SUM' });
        _wbRenderYCols();
    }
    _wbLoadDatasets();
    wbCargarWidgets();
    _wbInited = true;
}

// ── Chart type picker ─────────────────────────────────────────
function _wbBuildChartTypePicker() {
    const el = document.getElementById('wbChartTypePicker');
    if (!el || el.children.length) return;
    el.innerHTML = WB_CHART_TYPES.map(ct => `
        <button class="wb-ctype-btn" data-type="${ct.type}"
                onclick="wbSelectChartType('${ct.type}', this)"
                title="${ct.label}"
                style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:8px 4px;border-radius:7px;cursor:pointer;font-size:11px;font-weight:600;transition:all .15s;
                       border:1px solid ${ct.type === _wbChartType ? 'var(--amarillo)' : 'var(--gris-600)'};
                       background:${ct.type === _wbChartType ? 'rgba(245,200,0,.12)' : 'transparent'};
                       color:${ct.type === _wbChartType ? 'var(--amarillo)' : 'var(--gris-300)'}">
            <i class="fas ${ct.icon}" style="font-size:18px;color:${ct.type === _wbChartType ? 'var(--amarillo)' : 'var(--gris-400)'}"></i>
            ${ct.label}
        </button>
    `).join('');
}

function wbSelectChartType(type, btn) {
    _wbChartType = type;
    document.querySelectorAll('.wb-ctype-btn').forEach(b => {
        const active = b.dataset.type === type;
        b.style.background  = active ? 'rgba(245,200,0,.12)' : 'transparent';
        b.style.borderColor = active ? 'var(--amarillo)' : 'var(--gris-600)';
        b.style.color       = active ? 'var(--amarillo)' : 'var(--gris-300)';
        const ico = b.querySelector('i');
        if (ico) ico.style.color = active ? 'var(--amarillo)' : 'var(--gris-400)';
    });
    wbTriggerPreview();
}

// ── Dataset loading ───────────────────────────────────────────
async function _wbLoadDatasets() {
    const sel = document.getElementById('wbDatasetSel');
    if (!sel) return;
    const prevVal = sel.value;
    sel.disabled = true;
    sel.innerHTML = '<option value="">Cargando datasets...</option>';

    try {
        const res  = await fetch(KPI_DATASETS_API + '?action=list');
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        _wbDatasets = data.data || [];

        sel.innerHTML = '<option value="">— Selecciona un dataset —</option>' +
            _wbDatasets.map(d =>
                `<option value="${d.id}">${kpiEsc(d.nombre)} · ${Number(d.total_filas).toLocaleString('es-PE')} filas</option>`
            ).join('');

        if (prevVal && _wbDatasets.find(d => d.id == prevVal)) {
            sel.value = prevVal;
            wbOnDatasetChange();
        }
    } catch (err) {
        sel.innerHTML = '<option value="">Error cargando datasets</option>';
        toast('Error cargando datasets: ' + err.message, 'error');
    } finally {
        sel.disabled = false;
    }
}

function wbOnDatasetChange() {
    const sel = document.getElementById('wbDatasetSel');
    const ds  = _wbDatasets.find(d => d.id == sel?.value);
    _wbCols   = ds ? (ds.columnas || []) : [];
    _wbRefreshColSelects();
    wbTriggerPreview();
}

function _wbRefreshColSelects() {
    // X-axis: dimensiones + fechas
    const xSel = document.getElementById('wbXCol');
    if (xSel) {
        const prev = xSel.value;
        xSel.innerHTML = '<option value="">— Columna —</option>' +
            _wbCols
                .filter(c => c.tipo !== 'ignorar' && c.tipo !== 'metrica')
                .map(c => `<option value="${kpiEsc(c.nombre)}" ${prev === c.nombre ? 'selected' : ''}>${kpiEsc(c.nombre)} (${c.tipo})</option>`)
                .join('');
    }

    // Y metric selects
    document.querySelectorAll('.wb-y-col-sel').forEach(sel => {
        const prev = sel.value;
        sel.innerHTML = '<option value="">— Columna —</option>' +
            _wbCols
                .filter(c => c.tipo !== 'ignorar')
                .map(c => `<option value="${kpiEsc(c.nombre)}" ${prev === c.nombre ? 'selected' : ''}>${kpiEsc(c.nombre)}</option>`)
                .join('');
    });

    // Filter col selects
    document.querySelectorAll('.wb-filter-col-sel').forEach(sel => {
        const prev = sel.value;
        sel.innerHTML = '<option value="">— Columna —</option>' +
            _wbCols
                .filter(c => c.tipo !== 'ignorar')
                .map(c => `<option value="${kpiEsc(c.nombre)}" ${prev === c.nombre ? 'selected' : ''}>${kpiEsc(c.nombre)}</option>`)
                .join('');
    });
}

// ── Y metrics ─────────────────────────────────────────────────
function wbAddYCol(col = '', agg = 'SUM') {
    _wbYCols.push({ id: ++_wbYColIdx, col, agg });
    _wbRenderYCols();
}

function wbRemoveYCol(id) {
    _wbYCols = _wbYCols.filter(y => y.id !== id);
    if (!_wbYCols.length) _wbYCols.push({ id: ++_wbYColIdx, col: '', agg: 'SUM' });
    _wbRenderYCols();
    wbTriggerPreview();
}

function _wbRenderYCols() {
    const container = document.getElementById('wbYColsList');
    if (!container) return;
    container.innerHTML = _wbYCols.map(y => `
        <div style="display:flex;gap:6px;align-items:center">
            <select class="form-control wb-y-col-sel" style="flex:2;font-size:12px;padding:5px 8px"
                    onchange="_wbUpdateYCol(${y.id}, 'col', this.value)">
                <option value="">— Columna —</option>
                ${_wbCols.filter(c => c.tipo !== 'ignorar').map(c =>
                    `<option value="${kpiEsc(c.nombre)}" ${y.col === c.nombre ? 'selected' : ''}>${kpiEsc(c.nombre)}</option>`
                ).join('')}
            </select>
            <select class="form-control" style="flex:0 0 70px;font-size:12px;padding:5px 6px"
                    onchange="_wbUpdateYCol(${y.id}, 'agg', this.value)">
                ${WB_AGG_OPS.map(op =>
                    `<option value="${op}" ${y.agg === op ? 'selected' : ''}>${op}</option>`
                ).join('')}
            </select>
            <button onclick="wbRemoveYCol(${y.id})" title="Quitar métrica"
                    style="flex-shrink:0;padding:5px 8px;border:1px solid var(--rojo);background:transparent;border-radius:6px;cursor:pointer;color:var(--rojo);font-size:11px">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
}

function _wbUpdateYCol(id, field, value) {
    const y = _wbYCols.find(y => y.id === id);
    if (y) { y[field] = value; wbTriggerPreview(); }
}

// ── Filters ───────────────────────────────────────────────────
function wbToggleFilters() {
    _wbFiltersOpen = !_wbFiltersOpen;
    const panel   = document.getElementById('wbFiltersPanel');
    const chevron = document.getElementById('wbFiltersChevron');
    if (panel)   panel.style.display     = _wbFiltersOpen ? 'flex' : 'none';
    if (chevron) chevron.style.transform = _wbFiltersOpen ? 'rotate(180deg)' : '';
}

function wbAddFilter(col = '', op = 'eq', val = '') {
    _wbFilters.push({ id: ++_wbFilterIdx, col, op, val });
    _wbRenderFilters();
    if (!_wbFiltersOpen) wbToggleFilters();
}

function wbRemoveFilter(id) {
    _wbFilters = _wbFilters.filter(f => f.id !== id);
    _wbRenderFilters();
    wbTriggerPreview();
}

function _wbRenderFilters() {
    const container = document.getElementById('wbFiltersList');
    if (!container) return;
    container.innerHTML = _wbFilters.map(f => `
        <div style="display:flex;gap:5px;align-items:center;margin-bottom:5px">
            <select class="form-control wb-filter-col-sel" style="flex:2;font-size:11px;padding:5px 6px"
                    onchange="_wbUpdateFilter(${f.id}, 'col', this.value)">
                <option value="">— Columna —</option>
                ${_wbCols.filter(c => c.tipo !== 'ignorar').map(c =>
                    `<option value="${kpiEsc(c.nombre)}" ${f.col === c.nombre ? 'selected' : ''}>${kpiEsc(c.nombre)}</option>`
                ).join('')}
            </select>
            <select class="form-control" style="width:82px;flex-shrink:0;font-size:11px;padding:5px 4px"
                    onchange="_wbUpdateFilter(${f.id}, 'op', this.value)">
                ${WB_FILTER_OPS.map(o =>
                    `<option value="${o.op}" ${f.op === o.op ? 'selected' : ''}>${o.label}</option>`
                ).join('')}
            </select>
            <input type="text" class="form-control" style="flex:2;font-size:11px;padding:5px 6px"
                   value="${kpiEsc(f.val)}" placeholder="Valor"
                   oninput="_wbUpdateFilter(${f.id}, 'val', this.value)">
            <button onclick="wbRemoveFilter(${f.id})"
                    style="flex-shrink:0;padding:4px 7px;border:1px solid var(--rojo);background:transparent;border-radius:6px;cursor:pointer;color:var(--rojo);font-size:11px">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    _wbUpdateFiltersCount();
}

function _wbUpdateFilter(id, field, value) {
    const f = _wbFilters.find(f => f.id === id);
    if (f) { f[field] = value; _wbUpdateFiltersCount(); wbTriggerPreview(); }
}

function _wbUpdateFiltersCount() {
    const active = _wbFilters.filter(f => f.col && f.val !== '').length;
    const el = document.getElementById('wbFiltersCount');
    if (!el) return;
    el.style.display = active ? 'inline-block' : 'none';
    el.textContent   = active;
}

// ── Preview ───────────────────────────────────────────────────
function wbTriggerPreview() {
    clearTimeout(_wbPreviewTimer);
    _wbPreviewTimer = setTimeout(wbFetchPreview, 600);
}

async function wbFetchPreview() {
    const datasetId = parseInt(document.getElementById('wbDatasetSel')?.value || '0');
    const xCol      = document.getElementById('wbXCol')?.value?.trim() || '';
    const maxRows   = parseInt(document.getElementById('wbMaxRows')?.value || '1000');
    const yCols     = _wbYCols.filter(y => y.col).map(y => ({ col: y.col, agg: y.agg }));
    const filters   = _wbFilters.filter(f => f.col && f.val !== '').map(f => ({ col: f.col, op: f.op, val: f.val }));

    if (!datasetId || !xCol || !yCols.length) return;

    _wbSetChartState('loading');

    try {
        const res  = await fetch(KPI_QUERY_API, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ dataset_id: datasetId, x_col: xCol, y_cols: yCols, filters, max_rows: maxRows }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        const info = document.getElementById('wbPreviewInfo');
        if (info) {
            const filtered = data.data.filtered !== data.data.total_rows
                ? ` · ${data.data.filtered.toLocaleString('es-PE')} filtradas`
                : '';
            info.textContent = `${data.data.groups} grupos · ${data.data.total_rows.toLocaleString('es-PE')} filas${filtered}`;
        }

        wbRenderChart(data.data.labels, data.data.series,
            document.getElementById('wbTitulo')?.value.trim() || '');

    } catch (err) {
        _wbSetChartState('error', kpiEsc(err.message));
    }
}

function _wbSetChartState(state, msg = '') {
    const empty   = document.getElementById('wbChartEmpty');
    const chartEl = document.getElementById('wbChartDiv');
    const spinner = document.getElementById('wbChartLoading');

    [empty, chartEl, spinner].forEach(el => { if (el) el.style.display = 'none'; });

    if (state === 'loading') {
        if (spinner) spinner.style.display = 'block';
    } else if (state === 'error') {
        if (empty) {
            empty.style.display = 'block';
            empty.innerHTML = `<i class="fas fa-circle-exclamation" style="color:var(--rojo);font-size:32px;display:block;margin-bottom:10px"></i>${msg}`;
        }
    } else if (state === 'empty') {
        if (empty) {
            empty.style.display = 'block';
            empty.innerHTML = `<i class="fas fa-inbox" style="font-size:36px;opacity:.2;display:block;margin-bottom:10px"></i>Sin datos para los filtros seleccionados`;
        }
    } else if (state === 'idle') {
        if (empty) {
            empty.style.display = 'block';
            empty.innerHTML = `<i class="fas fa-chart-bar" style="font-size:42px;opacity:.18;display:block;margin-bottom:14px"></i>
                Configura un dataset, eje X y al menos una métrica,<br>
                luego haz clic en <strong style="color:var(--gris-400)">Vista previa</strong>`;
        }
    }
}

function wbRenderChart(labels, series, title) {
    if (!labels.length || !series.length || !series.some(s => s.data?.length)) {
        _wbSetChartState('empty');
        return;
    }

    const empty   = document.getElementById('wbChartEmpty');
    const chartEl = document.getElementById('wbChartDiv');
    const spinner = document.getElementById('wbChartLoading');
    if (empty)   empty.style.display   = 'none';
    if (spinner) spinner.style.display = 'none';
    if (chartEl) chartEl.style.display = 'block';

    // Destroy existing instance
    if (_wbChart) { try { _wbChart.destroy(); } catch (_) {} _wbChart = null; }

    const isDark    = document.documentElement.getAttribute('data-theme') !== 'light';
    const textColor = isDark ? '#b0b8c8' : '#444';
    const gridColor = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.07)';

    let opts;

    if (_wbChartType === 'pie' || _wbChartType === 'donut') {
        opts = {
            chart: {
                type: _wbChartType,
                background: 'transparent',
                height: 400,
                fontFamily: 'inherit',
                animations: { speed: 350 },
            },
            series: series[0]?.data ?? [],
            labels: labels.map(String),
            colors: WB_COLORS,
            legend: { labels: { colors: textColor }, fontSize: '12px', position: 'bottom' },
            plotOptions: {
                pie: { donut: { size: _wbChartType === 'donut' ? '58%' : undefined } },
            },
            dataLabels: { style: { colors: ['#fff'], fontSize: '11px' }, dropShadow: { enabled: false } },
            title:  title ? { text: title, style: { color: textColor, fontSize: '14px', fontWeight: '700' } } : undefined,
            tooltip: { theme: isDark ? 'dark' : 'light' },
        };
    } else {
        const isRadar = _wbChartType === 'radar';
        opts = {
            chart: {
                type: _wbChartType,
                background: 'transparent',
                height: 400,
                fontFamily: 'inherit',
                toolbar: { show: false },
                animations: { speed: 350 },
            },
            series: series,
            colors: WB_COLORS,
            xaxis: {
                categories: labels.map(String),
                labels: {
                    style: { colors: textColor },
                    rotate: labels.length > 12 ? -30 : 0,
                    maxHeight: 80,
                    formatter: v => String(v ?? '').slice(0, 18),
                },
                tickAmount: isRadar ? undefined : Math.min(labels.length, 14),
            },
            yaxis: isRadar ? undefined : {
                labels: {
                    style: { colors: textColor },
                    formatter: v => typeof v === 'number' ? v.toLocaleString('es-PE') : v,
                },
            },
            grid: { borderColor: gridColor, strokeDashArray: 3 },
            legend: { labels: { colors: textColor }, fontSize: '12px' },
            stroke: {
                curve: 'smooth',
                width: _wbChartType === 'line' ? 2.5
                     : _wbChartType === 'area' ? 2
                     : _wbChartType === 'radar' ? 2
                     : 0,
            },
            fill: _wbChartType === 'area' ? {
                type: 'gradient',
                gradient: { shadeIntensity: .6, opacityFrom: .35, opacityTo: .04 },
            } : {},
            dataLabels: { enabled: false },
            title: title ? {
                text: title,
                style: { color: textColor, fontSize: '14px', fontWeight: '700' },
            } : undefined,
            tooltip: {
                theme: isDark ? 'dark' : 'light',
                y: { formatter: v => typeof v === 'number' ? v.toLocaleString('es-PE') : v },
            },
            plotOptions: {
                bar: { borderRadius: 4, columnWidth: labels.length > 20 ? '95%' : '60%' },
            },
        };
    }

    _wbChart = new ApexCharts(chartEl, opts);
    _wbChart.render();
}

// ── Save widget ───────────────────────────────────────────────
async function wbGuardarWidget() {
    const titulo    = document.getElementById('wbTitulo')?.value.trim() || '';
    const datasetId = parseInt(document.getElementById('wbDatasetSel')?.value || '0');
    const xCol      = document.getElementById('wbXCol')?.value?.trim() || '';
    const maxRows   = parseInt(document.getElementById('wbMaxRows')?.value || '1000');
    const yCols     = _wbYCols.filter(y => y.col).map(y => ({ col: y.col, agg: y.agg }));

    if (!titulo)    { toast('Ingresa un título para el gráfico.', 'error'); return; }
    if (!datasetId) { toast('Selecciona un dataset.', 'error'); return; }
    if (!xCol)      { toast('Selecciona el eje X.', 'error'); return; }
    if (!yCols.length) { toast('Agrega al menos una métrica.', 'error'); return; }

    const filters = _wbFilters.filter(f => f.col && f.val !== '').map(f => ({ col: f.col, op: f.op, val: f.val }));

    const payload = {
        titulo,
        tipo_chart: _wbChartType,
        dataset_id: datasetId,
        config: { x_col: xCol, y_cols: yCols, filters, max_rows: maxRows },
    };
    if (_wbEditingId) payload.id = _wbEditingId;

    const btn = document.getElementById('wbSaveBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:12px;height:12px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px"></div> Guardando...'; }

    try {
        const res  = await fetch(KPI_WIDGETS_API + '?action=save', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': _wbCsrf() },
            body:    JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        toast(_wbEditingId ? 'Gráfico actualizado.' : `Gráfico "${titulo}" guardado.`, 'success');
        _wbEditingId = null;
        _wbSetEditingBadge(false);
        wbCargarWidgets();
    } catch (err) {
        toast(err.message || 'Error al guardar.', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-save"></i> Guardar'; }
    }
}

function wbCancelarEdicion() {
    _wbEditingId = null;
    _wbSetEditingBadge(false);
}

function _wbSetEditingBadge(show) {
    const el = document.getElementById('wbEditingBadge');
    if (el) el.style.display = show ? 'block' : 'none';
}

// ── Saved widgets list ────────────────────────────────────────
async function wbCargarWidgets() {
    const container = document.getElementById('wbWidgetsList');
    if (!container) return;
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--gris-500)">
        <div class="spinner" style="margin:0 auto"></div>
    </div>`;

    try {
        const res  = await fetch(KPI_WIDGETS_API + '?action=list');
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        const widgets = data.data || [];
        const countEl = document.getElementById('wbWidgetsCount');
        if (countEl) countEl.textContent = widgets.length
            ? `${widgets.length} guardado${widgets.length !== 1 ? 's' : ''}`
            : '';

        if (!widgets.length) {
            container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:36px;color:var(--gris-500)">
                <i class="fas fa-bookmark" style="font-size:30px;opacity:.18;display:block;margin-bottom:12px"></i>
                No hay gráficos guardados todavía.
            </div>`;
            return;
        }

        container.innerHTML = widgets.map(w => _wbWidgetCard(w)).join('');
    } catch (err) {
        container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--rojo)">
            <i class="fas fa-circle-exclamation"></i> ${kpiEsc(err.message)}
        </div>`;
    }
}

function _wbWidgetCard(w) {
    const ct    = WB_CHART_TYPES.find(c => c.type === w.tipo_chart) ?? WB_CHART_TYPES[0];
    const fecha = new Date(w.creado_en).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' });
    const cfg   = w.config || {};
    const metricasStr = (cfg.y_cols || []).map(y => `${y.col} (${y.agg})`).join(', ');

    return `<div style="background:var(--gris-700);border:1px solid var(--gris-600);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;align-items:flex-start;gap:10px">
            <div style="width:38px;height:38px;border-radius:8px;background:rgba(245,200,0,.12);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                <i class="fas ${ct.icon}" style="color:var(--amarillo);font-size:17px"></i>
            </div>
            <div style="min-width:0">
                <div style="font-weight:700;color:var(--gris-100);font-size:14px;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${kpiEsc(w.titulo)}">${kpiEsc(w.titulo)}</div>
                <div style="font-size:11px;color:var(--gris-400);margin-top:2px">${kpiEsc(ct.label)} · ${kpiEsc(w.dataset_nombre || '—')}</div>
            </div>
        </div>
        ${metricasStr ? `<div style="font-size:11px;color:var(--gris-500);background:var(--gris-600);border-radius:5px;padding:4px 8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${kpiEsc(metricasStr)}">
            <i class="fas fa-hashtag" style="font-size:9px"></i> ${kpiEsc(metricasStr.slice(0, 60))}${metricasStr.length > 60 ? '…' : ''}
        </div>` : ''}
        <div style="font-size:11px;color:var(--gris-500)">${kpiEsc(fecha)}</div>
        <div style="display:flex;gap:6px">
            <button class="btn btn-outline btn-sm" onclick="wbVerWidget(${w.id})" style="flex:1;font-size:11px;padding:5px">
                <i class="fas fa-play"></i> Ver
            </button>
            <button class="btn btn-outline btn-sm" onclick="wbEditarWidget(${w.id})" style="flex:1;font-size:11px;padding:5px">
                <i class="fas fa-pencil"></i> Editar
            </button>
            <button class="btn btn-danger btn-sm" onclick="wbEliminarWidget(${w.id}, '${kpiEsc(w.titulo).replace(/'/g,"&#39;")}')"
                    style="padding:5px 9px;font-size:11px">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    </div>`;
}

// ── Ver widget (preview desde la tarjeta) ─────────────────────
async function wbVerWidget(widgetId) {
    try {
        const res  = await fetch(KPI_WIDGETS_API + '?action=list');
        const data = await res.json();
        const w    = (data.data || []).find(x => x.id === widgetId);
        if (!w) { toast('Widget no encontrado.', 'error'); return; }

        document.getElementById('wbChartContainer')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        _wbSetChartState('loading');

        const qRes = await fetch(KPI_QUERY_API, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                dataset_id: w.dataset_id,
                x_col:      w.config?.x_col,
                y_cols:     w.config?.y_cols   || [],
                filters:    w.config?.filters  || [],
                max_rows:   w.config?.max_rows || 1000,
            }),
        });
        const qData = await qRes.json();
        if (!qData.success) throw new Error(qData.message);

        _wbChartType = w.tipo_chart;
        _wbBuildChartTypePicker();
        document.querySelectorAll('.wb-ctype-btn').forEach(b => {
            const active = b.dataset.type === _wbChartType;
            b.style.background  = active ? 'rgba(245,200,0,.12)' : 'transparent';
            b.style.borderColor = active ? 'var(--amarillo)' : 'var(--gris-600)';
            const ico = b.querySelector('i');
            if (ico) ico.style.color = active ? 'var(--amarillo)' : 'var(--gris-400)';
        });

        wbRenderChart(qData.data.labels, qData.data.series, w.titulo);

        const info = document.getElementById('wbPreviewInfo');
        if (info) info.textContent = `${qData.data.groups} grupos · ${qData.data.total_rows.toLocaleString('es-PE')} filas`;

    } catch (err) {
        _wbSetChartState('error', kpiEsc(err.message));
    }
}

// ── Editar widget (cargar config en builder) ──────────────────
async function wbEditarWidget(widgetId) {
    try {
        const res  = await fetch(KPI_WIDGETS_API + '?action=list');
        const data = await res.json();
        const w    = (data.data || []).find(x => x.id === widgetId);
        if (!w) { toast('Widget no encontrado.', 'error'); return; }

        _wbEditingId  = w.id;
        _wbChartType  = w.tipo_chart;

        // Dataset
        const dsSel = document.getElementById('wbDatasetSel');
        if (dsSel) {
            dsSel.value = w.dataset_id;
            wbOnDatasetChange();
        }

        // Necesitamos esperar a que _wbCols se llene
        await new Promise(r => setTimeout(r, 350));

        // X col
        const xSel = document.getElementById('wbXCol');
        if (xSel) xSel.value = w.config?.x_col || '';

        // Y cols
        _wbYCols = [];
        (w.config?.y_cols || []).forEach(y => {
            _wbYCols.push({ id: ++_wbYColIdx, col: y.col, agg: y.agg || 'SUM' });
        });
        if (!_wbYCols.length) _wbYCols.push({ id: ++_wbYColIdx, col: '', agg: 'SUM' });
        _wbRenderYCols();

        // Filters
        _wbFilters = [];
        (w.config?.filters || []).forEach(f => {
            _wbFilters.push({ id: ++_wbFilterIdx, col: f.col, op: f.op, val: f.val });
        });
        _wbRenderFilters();

        // Max rows
        const maxEl = document.getElementById('wbMaxRows');
        if (maxEl) maxEl.value = w.config?.max_rows || 1000;

        // Title
        const titEl = document.getElementById('wbTitulo');
        if (titEl) titEl.value = w.titulo;

        // Chart type picker
        document.querySelectorAll('.wb-ctype-btn').forEach(b => {
            const active = b.dataset.type === _wbChartType;
            b.style.background  = active ? 'rgba(245,200,0,.12)' : 'transparent';
            b.style.borderColor = active ? 'var(--amarillo)' : 'var(--gris-600)';
            b.style.color       = active ? 'var(--amarillo)' : 'var(--gris-300)';
            const ico = b.querySelector('i');
            if (ico) ico.style.color = active ? 'var(--amarillo)' : 'var(--gris-400)';
        });

        _wbSetEditingBadge(true);
        wbFetchPreview();
        toast('Gráfico cargado en el editor.', 'info');

        // Scroll al builder
        document.getElementById('wbDatasetSel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (err) {
        toast('Error cargando el gráfico: ' + err.message, 'error');
    }
}

// ── Eliminar widget ───────────────────────────────────────────
async function wbEliminarWidget(id, titulo) {
    if (!confirm(`¿Eliminar el gráfico "${titulo}"?\n\nEsta acción no se puede deshacer.`)) return;
    try {
        const res  = await fetch(KPI_WIDGETS_API + '?action=delete', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': _wbCsrf() },
            body:    JSON.stringify({ id }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        toast(`Gráfico "${titulo}" eliminado.`, 'success');
        if (_wbEditingId === id) { _wbEditingId = null; _wbSetEditingBadge(false); }
        wbCargarWidgets();
    } catch (err) {
        toast(err.message || 'Error al eliminar.', 'error');
    }
}
