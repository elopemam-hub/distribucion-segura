// ============================================================
// KPI Analytics — Dashboard RSIF (Ruta SIF)  — Referencia ABInBev
// assets/js/modulos/kpi_rsif.js
// ============================================================

const RSIF_GOLD    = '#F5C800';
const RSIF_RED     = '#E55353';
const RSIF_GREEN   = '#2EB85C';
const RSIF_DARK    = '#1a1e2e';

const RSIF_MESES_ES   = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const RSIF_MESES_FULL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

let _rsifData     = null;
let _rsifCharts   = {};
let _rsifLoading  = false;
let _rsifMesSel   = null; // null=todos, '0'=blank, '1'-'12'=mes
let _rsifAñoSel   = null; // null=todos, número=año seleccionado

// ── Selector de agrupación ─────────────────────────────────────
function rsifSetGroupBy(btn) {
    document.querySelectorAll('.rsif-grp-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('rsifGroupBy').value = btn.dataset.val;
}

// ── Inicialización ─────────────────────────────────────────────
function rsifInit() {
    if (!document.getElementById('rsifContent')) return;
    rsifCargarColumnas().then(() => rsifRefresh());
}

async function rsifCargarColumnas() {
    try {
        const r    = await fetch(`${KPI_RSIF_API}?action=columns`);
        const resp = await r.json();
        if (!resp.success) return;
        const cols = resp.data || [];
        const opHtml = '<option value="">(auto)</option>' +
            cols.map(c => {
                const badge = c.tipo === 'fecha' ? ' 📅' : c.tipo === 'metrica' ? ' 🔢' : ' 📊';
                return `<option value="${rsifEsc(c.nombre)}">${rsifEsc(c.nombre)}${badge}</option>`;
            }).join('');
        ['rsifColFecha','rsifColPlaca','rsifColDistrito'].forEach(id => {
            const sel = document.getElementById(id);
            if (!sel) return;
            const prev = sel.value;
            sel.innerHTML = opHtml;
            if (prev) sel.value = prev;
        });
    } catch (e) { console.warn('[rsif] columnas:', e.message); }
}

// ── Refresh ────────────────────────────────────────────────────
async function rsifRefresh() {
    if (_rsifLoading) return;
    _rsifLoading = true;
    const btn = document.getElementById('rsifRefreshBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...'; }
    _rsifShowLoading();

    const payload = {
        fecha_desde:  document.getElementById('rsifDesde')?.value    || '',
        fecha_hasta:  document.getElementById('rsifHasta')?.value    || '',
        max_rows:     100000,
        col_fecha:    document.getElementById('rsifColFecha')?.value    || '',
        col_placa:    document.getElementById('rsifColPlaca')?.value    || '',
        col_distrito: document.getElementById('rsifColDistrito')?.value || '',
    };

    try {
        const r    = await fetch(`${KPI_RSIF_API}?action=dashboard`, {
            method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload),
        });
        const resp = await r.json();
        if (!resp.success) { toast(resp.message || 'Error RSIF', 'error'); _rsifShowEmpty(); return; }
        _rsifData = resp.data;
        _rsifMesSel = null;
        _rsifRenderAll(resp.data);
    } catch (e) {
        console.error('[rsif]', e);
        toast('Error de conexión RSIF', 'error');
        _rsifShowEmpty();
    } finally {
        _rsifLoading = false;
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-rotate-right"></i> Actualizar'; }
    }
}

// ── Render principal ───────────────────────────────────────────
function _rsifRenderAll(data) {
    if (!data.found) { _rsifShowEmpty(); return; }

    document.getElementById('rsifEmpty').style.display   = 'none';
    document.getElementById('rsifLoading').style.display = 'none';
    const wrap = document.getElementById('rsifContent');
    wrap.style.display = '';
    wrap.innerHTML     = '';
    _rsifDestroyAll();

    // Layout raíz
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px';

    // ── Top: filtro mes + KPIs ──
    wrap.appendChild(_rsifBuildTopSection(data));

    // ── Grid 3 columnas ──
    const main = document.createElement('div');
    main.id = 'rsifMain';
    main.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:12px;align-items:start';
    wrap.appendChild(main);

    // Fila 1: Diario | Mes | Trimestre
    main.appendChild(_rsifCard('rsifChartDiario',   '<i class="fas fa-calendar-day"  style="color:'+RSIF_GOLD+'"></i> Ruta SIF por Diario').wrap);
    main.appendChild(_rsifCard('rsifChartMes',      '<i class="fas fa-calendar-alt"  style="color:'+RSIF_GOLD+'"></i> Ruta SIF por Mes').wrap);
    main.appendChild(_rsifCard('rsifChartTrimestre','<i class="fas fa-chart-bar"     style="color:'+RSIF_GOLD+'"></i> Ruta SIF por Trimestre').wrap);

    // Fila 2: Días de la Semana (1 col) | Semana (2 cols)
    main.appendChild(_rsifCard('rsifChartDiaSem', '<i class="fas fa-calendar-days" style="color:'+RSIF_GOLD+'"></i> Ruta SIF por Días de la Semana').wrap);
    const semanaCard = _rsifCard('rsifChartSemana', '<i class="fas fa-calendar-week" style="color:'+RSIF_GOLD+'"></i> Ruta SIF por Semana');
    semanaCard.wrap.style.gridColumn = 'span 2';
    main.appendChild(semanaCard.wrap);

    // Fila 3: Distrito (span 2) + Placa tabla (span 1)
    if (data.por_distrito?.col) {
        const distCard = _rsifCard('rsifChartDistrito', '<i class="fas fa-map-marker-alt" style="color:'+RSIF_GOLD+'"></i> Ruta SIF por Distrito');
        distCard.wrap.style.gridColumn = 'span 2';
        const distTablaDiv = document.createElement('div');
        distTablaDiv.id = 'rsifTablaDistrito';
        distCard.body.appendChild(distTablaDiv);
        main.appendChild(distCard.wrap);
    }

    // Col 3: Placa + TablaDia apiladas en el mismo wrapper
    const placaWrap = document.createElement('div');
    placaWrap.id = 'rsifPlacaWrap';
    placaWrap.style.cssText = 'display:flex;flex-direction:column;gap:10px;align-self:start';
    main.appendChild(placaWrap);

    // Sub-div para Placa — _rsifRenderPlacaWrap limpia solo este nodo, no borra TablaDia
    const placaInner = document.createElement('div');
    placaInner.id = 'rsifPlacaInner';
    placaWrap.appendChild(placaInner);
    _rsifRenderPlacaWrap(data, placaInner);

    // TablaDia — hermano de rsifPlacaInner, sobrevive al re-render de Placa
    const tablaDiaCard = _rsifCard('rsifTablaDia', '<i class="fas fa-table-cells" style="color:'+RSIF_GOLD+'"></i> Ruta SIF por Día del Mes', 0);
    tablaDiaCard.body.style.padding = '0';
    placaWrap.appendChild(tablaDiaCard.wrap);

    // ── Renderizar gráficos ──
    _rsifRenderDiario(data);
    _rsifRenderMes(data);
    _rsifRenderSemana(data);
    _rsifRenderDiaSemana(data);
    _rsifRenderTrimestre(data);
    if (data.por_distrito?.col) {
        _rsifRenderDistrito(data);
        _rsifRenderTablaDistrito(data);
    }
    _rsifRenderTablaDia(data, null);
}

// ── Top Section: filtro mes + tarjetas KPI ─────────────────────
function _rsifBuildTopSection(data) {
    const sec = document.createElement('div');
    sec.style.cssText = [
        'background:var(--gris-700);border:1px solid var(--gris-600)',
        'border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:12px',
    ].join(';');

    // Fila año (si hay datos de año)
    if (data.años?.length >= 1) {
        const añoRow = document.createElement('div');
        añoRow.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap';

        const añoLabel = document.createElement('span');
        añoLabel.style.cssText = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--gris-400);white-space:nowrap';
        añoLabel.textContent = 'Año:';
        añoRow.appendChild(añoLabel);

        const añoList = document.createElement('div');
        añoList.id = 'rsifAñoBtns';
        añoList.style.cssText = 'display:flex;gap:5px;flex-wrap:wrap;align-items:center';
        añoList.appendChild(_rsifAñoBtn('Todos', null, _rsifAñoSel === null));
        data.años.forEach(a => añoList.appendChild(_rsifAñoBtn(String(a), a, _rsifAñoSel === a)));
        añoRow.appendChild(añoList);
        sec.appendChild(añoRow);
    }

    // Fila mes + KPIs en la misma línea horizontal
    const topRow = document.createElement('div');
    topRow.style.cssText = 'display:flex;align-items:center;gap:12px;flex-wrap:wrap';

    // Label + botones mes
    const mesWrap = document.createElement('div');
    mesWrap.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;flex:1 1 auto';

    const mesLabel = document.createElement('span');
    mesLabel.style.cssText = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--gris-400);white-space:nowrap';
    mesLabel.textContent = 'Mes:';
    mesWrap.appendChild(mesLabel);

    const mesList = document.createElement('div');
    mesList.id = 'rsifMesBtns';
    mesList.style.cssText = 'display:flex;gap:5px;flex-wrap:wrap;align-items:center';
    mesList.appendChild(_rsifMesBtn('Todos', null, true));

    const detalle = data.detalle_por_mes || {};
    if (detalle['0']?.total > 0) mesList.appendChild(_rsifMesBtn('(En blanco)', '0'));
    for (let m = 1; m <= 12; m++) {
        const key = String(m);
        if (detalle[key]?.total > 0)
            mesList.appendChild(_rsifMesBtn(RSIF_MESES_ES[m - 1], key));
    }

    mesWrap.appendChild(mesList);
    topRow.appendChild(mesWrap);
    sec.appendChild(topRow);

    // Tarjetas KPI — flex, ancho máximo por tarjeta
    const kpiRow = document.createElement('div');
    kpiRow.id = 'rsifKpiCards';
    kpiRow.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap';
    kpiRow.innerHTML = _rsifKpiHtml(data, null);
    sec.appendChild(kpiRow);

    // Indicador de columnas detectadas
    if (data.cols) {
        const cols = data.cols;
        const items = [
            ['📅', 'Fecha',    cols.fecha_col],
            ['🚗', 'Placa',    cols.placa_col],
            ['📍', 'Distrito', cols.distrito_col],
        ].filter(([,,v]) => v);
        if (items.length) {
            const colInfo = document.createElement('div');
            colInfo.style.cssText = 'font-size:10px;color:var(--gris-500);display:flex;gap:14px;flex-wrap:wrap;margin-top:2px';
            colInfo.innerHTML = items.map(([icon, label, val]) =>
                `<span>${icon} <span style="color:var(--gris-400)">${label}:</span> <code style="font-size:10px;color:var(--gris-300)">${rsifEsc(val)}</code></span>`
            ).join('');
            sec.appendChild(colInfo);
        }
    }

    return sec;
}

function _rsifMesBtn(label, mesKey, active = false) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.mes = mesKey ?? 'null';
    btn.textContent = label;
    btn.style.cssText = [
        'padding:5px 14px;border-radius:20px;cursor:pointer',
        'font-size:12px;font-weight:600;transition:all .15s;white-space:nowrap;border:1.5px solid',
        active
            ? `background:${RSIF_GOLD};color:#000;border-color:${RSIF_GOLD}`
            : `background:transparent;color:var(--gris-200);border-color:rgba(245,200,0,.35)`,
    ].join(';');
    btn.onclick = () => _rsifSelectMes(mesKey);
    return btn;
}

function _rsifKpiHtml(data, mesKey) {
    const d = mesKey !== null
        ? (data.detalle_por_mes?.[mesKey] ?? {total: 0, placas_unicas: 0})
        : data;

    const total  = d.total ?? 0;
    const placas = d.placas_unicas ?? (mesKey === null ? data.placas_unicas : 0);

    const tprom = mesKey !== null
        ? (data.tiempo_por_mes?.[mesKey] ?? null)
        : data.tiempo_promedio;

    const cardBase = 'flex:0 1 220px;min-width:160px;border-radius:8px;padding:10px 14px;';
    let html = `
        <div style="${cardBase}background:rgba(229,83,83,.1);border:1px solid rgba(229,83,83,.25);border-left:3px solid ${RSIF_RED}">
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${RSIF_RED};margin-bottom:5px">
                <i class="fas fa-truck-moving"></i> TOTAL RUTAS
            </div>
            <div style="font-size:28px;font-weight:900;color:${RSIF_RED};line-height:1">${total.toLocaleString('es-PE')}</div>
            <div style="font-size:10px;color:rgba(229,83,83,.55);margin-top:3px">rutas ejecutadas</div>
        </div>`;

    html += `
        <div style="${cardBase}background:rgba(245,200,0,.08);border:1px solid rgba(245,200,0,.2);border-left:3px solid ${RSIF_GOLD}">
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${RSIF_GOLD};margin-bottom:5px">
                <i class="fas fa-clock"></i> PROM. HORA EN RUTA
            </div>
            <div style="font-size:24px;font-weight:900;color:${RSIF_GOLD};line-height:1">${tprom ? rsifEsc(tprom) : '<span style="font-size:13px;opacity:.5">sin datos</span>'}</div>
            <div style="font-size:10px;color:rgba(245,200,0,.55);margin-top:3px">tiempo promedio por ruta</div>
        </div>`;

    html += `
        <div style="${cardBase}background:rgba(46,184,92,.08);border:1px solid rgba(46,184,92,.2);border-left:3px solid ${RSIF_GREEN}">
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:${RSIF_GREEN};margin-bottom:5px">
                <i class="fas fa-car"></i> PLACAS ÚNICAS
            </div>
            <div style="font-size:28px;font-weight:900;color:${RSIF_GREEN};line-height:1">${placas.toLocaleString('es-PE')}</div>
            <div style="font-size:10px;color:rgba(46,184,92,.55);margin-top:3px">vehículos activos</div>
        </div>`;
    return html;
}

// ── Tabla Día del Mes (Día | N° Rutas) ────────────────────────
function _rsifRenderTablaDia(data, mesKey) {
    const el = document.getElementById('rsifTablaDia');
    if (!el) return;

    let dayMap = {};
    if (mesKey !== null && mesKey !== undefined) {
        dayMap = data.detalle_por_mes?.[mesKey]?.por_dia || {};
    } else {
        Object.values(data.detalle_por_mes || {}).forEach(mes => {
            Object.entries(mes.por_dia || {}).forEach(([dia, cnt]) => {
                const d = parseInt(dia);
                dayMap[d] = (dayMap[d] || 0) + cnt;
            });
        });
    }

    const total = Object.values(dayMap).reduce((s, v) => s + v, 0);

    // Construir una sub-tabla de días para un rango dado
    function buildDaySubTable(from, to) {
        const thStyle = `padding:6px 8px;text-align:right;font-size:10px;color:var(--gris-400);font-weight:700;text-transform:uppercase`;
        let rows = '';
        for (let d = from; d <= to; d++) {
            const cnt = dayMap[d] || 0;
            const hasDat = cnt > 0;
            const altBg = d % 2 === 0 ? 'background:rgba(255,255,255,.025)' : '';
            rows += `<tr style="${altBg}">
                <td style="padding:3px 8px;font-size:11px;color:var(--gris-400);text-align:right;width:28px">${d}</td>
                <td style="padding:0 4px;width:4px">
                    <div style="width:2px;height:14px;background:${hasDat ? RSIF_GOLD : 'transparent'};border-radius:1px"></div>
                </td>
                <td style="padding:3px 8px;font-size:11px;font-weight:${hasDat ? 700 : 400};color:${hasDat ? 'var(--gris-100)' : 'var(--gris-600)'};text-align:right">
                    ${hasDat ? cnt : ''}
                </td>
            </tr>`;
        }
        return `<table style="width:100%;border-collapse:collapse">
            <thead><tr style="border-bottom:2px solid var(--gris-600)">
                <th style="${thStyle};width:28px">Día</th>
                <th style="width:4px"></th>
                <th style="${thStyle}">N° Rutas</th>
            </tr></thead>
            <tbody>${rows}</tbody>
        </table>`;
    }

    el.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-bottom:2px solid var(--gris-500)">
            <div style="border-right:1px solid var(--gris-600);padding:0">${buildDaySubTable(1,10)}</div>
            <div style="border-right:1px solid var(--gris-600);padding:0">${buildDaySubTable(11,20)}</div>
            <div style="padding:0">${buildDaySubTable(21,31)}</div>
        </div>
        <table style="width:100%;border-collapse:collapse">
            <tr style="background:rgba(245,200,0,.08)">
                <td style="padding:5px 12px;font-size:11px;font-weight:800;color:var(--gris-200)">Total</td>
                <td style="padding:5px 12px;font-size:11px;font-weight:800;color:${RSIF_GOLD};text-align:right">${total}</td>
            </tr>
        </table>`;
}

// ── Selección de mes ───────────────────────────────────────────
function _rsifSelectMes(mesKey) {
    _rsifMesSel = mesKey;
    // Actualizar botones
    document.querySelectorAll('#rsifMesBtns button').forEach(b => {
        const active = b.dataset.mes === (mesKey ?? 'null');
        b.style.background  = active ? RSIF_GOLD : 'transparent';
        b.style.color       = active ? '#000' : 'var(--gris-200)';
        b.style.borderColor = active ? RSIF_GOLD : 'rgba(245,200,0,.35)';
    });
    // Actualizar KPIs
    const kpiDiv = document.getElementById('rsifKpiCards');
    if (kpiDiv && _rsifData) kpiDiv.innerHTML = _rsifKpiHtml(_rsifData, mesKey);

    // Re-renderizar gráficos sensibles al mes
    _rsifRenderDiario(_rsifData, mesKey);
    _rsifRenderPlacaWrap(_rsifData, document.getElementById('rsifPlacaInner'), mesKey);
    _rsifRenderTablaDia(_rsifData, mesKey);
}

// ── Selección de año ───────────────────────────────────────────
function _rsifSelectAño(añoKey) {
    _rsifAñoSel = añoKey;
    _rsifMesSel = null;
    // Ajustar filtro de fecha a ese año
    const desde = document.getElementById('rsifDesde');
    const hasta = document.getElementById('rsifHasta');
    if (desde) desde.value = añoKey ? `${añoKey}-01-01` : '';
    if (hasta) hasta.value = añoKey ? `${añoKey}-12-31` : '';
    rsifRefresh();
}

function _rsifAñoBtn(label, añoKey, active = false) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.año = añoKey ?? 'null';
    btn.textContent = label;
    btn.style.cssText = [
        'padding:4px 12px;border-radius:20px;cursor:pointer',
        'font-size:11px;font-weight:600;transition:all .15s;white-space:nowrap;border:1.5px solid',
        active
            ? `background:${RSIF_GOLD};color:#000;border-color:${RSIF_GOLD}`
            : `background:transparent;color:var(--gris-200);border-color:rgba(245,200,0,.35)`,
    ].join(';');
    btn.onclick = () => _rsifSelectAño(añoKey);
    return btn;
}

// ── Helper: card ───────────────────────────────────────────────
function _rsifCard(chartId, titleHtml, minHeight = 230) {
    const wrap = document.createElement('div');
    wrap.style.cssText = [
        'background:var(--gris-700);border:1px solid var(--gris-600)',
        'border-radius:10px;overflow:hidden;border-top:2px solid rgba(245,200,0,.25)',
    ].join(';');

    const header = document.createElement('div');
    header.style.cssText = 'padding:9px 14px;border-bottom:1px solid var(--gris-600);font-size:12px;font-weight:700;color:var(--gris-200);display:flex;align-items:center;gap:6px';
    header.innerHTML = titleHtml;
    wrap.appendChild(header);

    const body = document.createElement('div');
    body.style.cssText = 'padding:10px';
    const chart = document.createElement('div');
    chart.id = chartId;
    chart.style.minHeight = minHeight + 'px';
    body.appendChild(chart);
    wrap.appendChild(body);
    return { wrap, body, chart };
}

// ── Placa Bar + Tabla ──────────────────────────────────────────
function _rsifRenderPlacaWrap(data, container, mesKey = null) {
    if (!container) return;
    container.innerHTML = '';

    const detalle   = mesKey !== null ? data.detalle_por_mes?.[mesKey] : null;
    const tablaData = detalle ? (detalle.placa_distrito || []) : (data.placa_dis_global || []);

    // Card: tabla Placa / Barra+Total / Distrito
    const tablaCard = document.createElement('div');
    tablaCard.style.cssText = 'background:var(--gris-700);border:1px solid var(--gris-600);border-radius:10px;overflow:hidden;border-top:2px solid rgba(245,200,0,.25)';
    const totalTabla = tablaData.reduce((s, r) => s + r.total, 0);
    const maxVal     = tablaData.length ? Math.max(...tablaData.slice(0, 50).map(r => r.total)) : 1;
    const rowsHtml   = tablaData.slice(0, 50).map(r => {
        const pct = maxVal > 0 ? (r.total / maxVal * 100).toFixed(1) : 0;
        return `
        <tr style="border-bottom:1px solid var(--gris-600)">
            <td style="padding:4px 8px;font-family:monospace;font-size:11px;font-weight:700;color:var(--gris-100);white-space:nowrap;width:1%">${rsifEsc(r.placa)}</td>
            <td style="padding:4px 8px 4px 0">
                <div style="display:flex;align-items:center;gap:6px">
                    <div style="flex:1;height:16px;background:rgba(245,200,0,.12);border-radius:3px;overflow:hidden">
                        <div style="height:100%;width:${pct}%;background:${RSIF_GOLD};border-radius:3px"></div>
                    </div>
                    <span style="min-width:22px;text-align:right;font-size:11px;font-weight:700;color:${RSIF_GOLD}">${r.total}</span>
                </div>
            </td>
            <td style="padding:4px 8px;font-size:11px;color:var(--gris-300);white-space:nowrap;width:1%">${rsifEsc(r.distrito || '—')}</td>
        </tr>`;
    }).join('');
    tablaCard.innerHTML = `
        <div style="padding:9px 14px;border-bottom:1px solid var(--gris-600);font-size:12px;font-weight:700;color:var(--gris-200);display:flex;align-items:center;gap:6px">
            <i class="fas fa-id-card" style="color:${RSIF_GOLD}"></i> Ruta SIF por Placa
        </div>
        <div style="max-height:340px;overflow-y:auto">
            <table style="width:100%;border-collapse:collapse">
                <thead>
                    <tr style="position:sticky;top:0;background:var(--gris-700);z-index:1;border-bottom:2px solid var(--gris-500)">
                        <th style="padding:5px 8px;text-align:left;font-size:10px;color:var(--gris-400);font-weight:700;text-transform:uppercase;white-space:nowrap">Placa</th>
                        <th style="padding:5px 8px;font-size:10px;color:var(--gris-400);font-weight:700;text-transform:uppercase">Rutas</th>
                        <th style="padding:5px 8px;text-align:left;font-size:10px;color:var(--gris-400);font-weight:700;text-transform:uppercase;white-space:nowrap">Distrito</th>
                    </tr>
                </thead>
                <tbody>${rowsHtml}</tbody>
            </table>
        </div>
        <table style="width:100%;border-collapse:collapse;border-top:2px solid var(--gris-500)">
            <tr style="background:rgba(245,200,0,.08)">
                <td style="padding:6px 8px;font-size:11px;font-weight:800;color:var(--gris-100)">Total</td>
                <td style="padding:6px 8px;text-align:right;font-size:11px;font-weight:800;color:${RSIF_GOLD}">${totalTabla.toLocaleString('es-PE')}</td>
                <td style="padding:6px 8px"></td>
            </tr>
        </table>
    `;
    container.appendChild(tablaCard);
}

function _rsifRenderPlacaBar(porPlaca) {
    const el = document.getElementById('rsifChartPlaca');
    if (!el) return;
    if (_rsifCharts['placa']) { try { _rsifCharts['placa'].destroy(); } catch (_) {} }

    const { labels = [], data: vals = [] } = porPlaca || {};
    if (!labels.length) { el.innerHTML = _rsifEmpty('Sin datos de placa'); return; }

    el.innerHTML = '';
    const th = _rsifTheme();
    const h  = Math.max(200, labels.length * 28 + 50);
    _rsifCharts['placa'] = new ApexCharts(el, {
        chart: { type:'bar', height: h, background:'transparent', foreColor: th.fg, toolbar:{show:false}, animations:{enabled:true,speed:300} },
        series: [{ name:'Rutas', data: vals }],
        xaxis:  { categories: labels, labels:{style:{fontSize:'10px',colors:th.fg,fontFamily:'monospace'}, formatter: v => _rsifFmt(v)} },
        yaxis:  { labels:{style:{fontSize:'10px',colors:th.fg,fontFamily:'monospace'}, maxWidth:110, formatter: v => String(v).length>12?String(v).slice(0,10)+'…':v} },
        plotOptions: { bar:{horizontal:true, barHeight:'60%', borderRadius:3, dataLabels:{position:'right'}} },
        dataLabels: { enabled:true, formatter: v=>v.toLocaleString('es-PE'), style:{fontSize:'11px',fontWeight:700,colors:[th.fg]}, offsetX:4 },
        colors:  [RSIF_GOLD],
        legend:  { show:false },
        grid:    { borderColor:th.grid, xaxis:{lines:{show:true}}, yaxis:{lines:{show:false}} },
        tooltip: { theme: th.dark?'dark':'light', y:{formatter:v=>v.toLocaleString('es-PE')} },
        theme:   { mode: th.dark?'dark':'light' },
    });
    _rsifCharts['placa'].render();
}

// ── Gráfico Diario ─────────────────────────────────────────────
function _rsifRenderDiario(data, mesKey = null) {
    const el = document.getElementById('rsifChartDiario');
    if (!el) return;
    if (_rsifCharts['diario']) { try { _rsifCharts['diario'].destroy(); } catch (_) {} }

    let labels = [], vals = [];
    if (mesKey !== null && mesKey !== undefined) {
        const porDia = data.detalle_por_mes?.[mesKey]?.por_dia || {};
        if (Object.keys(porDia).length) {
            const maxDia = Math.max(...Object.keys(porDia).map(Number));
            for (let d = 1; d <= Math.max(maxDia, 28); d++) {
                if (porDia[d]) { labels.push(String(d)); vals.push(porDia[d]); }
            }
        }
    } else {
        // Sin mes seleccionado: mostrar totales por día del mes (1-31) sumando todos los meses
        const diaTotal = {};
        Object.values(data.detalle_por_mes || {}).forEach(mesData => {
            Object.entries(mesData.por_dia || {}).forEach(([d, v]) => {
                diaTotal[d] = (diaTotal[d] || 0) + v;
            });
        });
        if (Object.keys(diaTotal).length) {
            const maxDia = Math.max(...Object.keys(diaTotal).map(Number));
            for (let d = 1; d <= maxDia; d++) {
                if (diaTotal[d]) { labels.push(String(d)); vals.push(diaTotal[d]); }
            }
        }
    }

    if (!labels.length) { el.innerHTML = _rsifEmpty('Sin datos diarios' + (mesKey ? '' : ' — selecciona un mes')); return; }

    el.innerHTML = '';
    const th = _rsifTheme();
    _rsifCharts['diario'] = new ApexCharts(el, {
        chart: { type:'bar', height:230, background:'transparent', foreColor:th.fg, toolbar:{show:false}, animations:{enabled:true,speed:300} },
        series: [{ name:'Eventos', data:vals }],
        xaxis:  { categories: labels, labels:{style:{fontSize:'11px',colors:th.fg}} },
        yaxis:  { labels:{style:{fontSize:'10px',colors:th.fg}, formatter:v=>_rsifFmt(v)} },
        plotOptions: { bar:{columnWidth:'60%',borderRadius:3,dataLabels:{position:'top'}} },
        dataLabels:  { enabled:true, formatter:v=>_rsifFmt(v), style:{fontSize:'9px',colors:[th.fg]}, offsetY:-14 },
        colors:  [RSIF_GOLD],
        grid:    { borderColor:th.grid, strokeDashArray:3 },
        tooltip: { theme:th.dark?'dark':'light', y:{formatter:v=>v.toLocaleString('es-PE')} },
        theme:   { mode:th.dark?'dark':'light' },
    });
    _rsifCharts['diario'].render();
}

// ── Gráfico Mes ────────────────────────────────────────────────
function _rsifRenderMes(data) {
    const el = document.getElementById('rsifChartMes');
    if (!el || !data.por_mes?.labels?.length) { if(el) el.innerHTML = _rsifEmpty('Sin datos de mes'); return; }
    el.innerHTML = '';
    const th = _rsifTheme();
    _rsifCharts['mes'] = new ApexCharts(el, {
        chart: { type:'bar', height:230, background:'transparent', foreColor:th.fg, toolbar:{show:false}, animations:{enabled:true,speed:300} },
        series: [{ name:'Eventos', data: data.por_mes.data }],
        xaxis:  { categories: data.por_mes.labels, labels:{style:{fontSize:'10px',colors:th.fg}} },
        yaxis:  { labels:{style:{fontSize:'10px',colors:th.fg}, formatter:v=>_rsifFmt(v)} },
        plotOptions: { bar:{columnWidth:'65%',borderRadius:3,dataLabels:{position:'top'}} },
        dataLabels:  { enabled:true, formatter:v=> v > 0 ? _rsifFmt(v) : '0', style:{fontSize:'9px',colors:[th.fg]}, offsetY:-14 },
        colors:  [RSIF_GOLD],
        grid:    { borderColor:th.grid, strokeDashArray:3 },
        tooltip: { theme:th.dark?'dark':'light', y:{formatter:v=>v.toLocaleString('es-PE')} },
        theme:   { mode:th.dark?'dark':'light' },
    });
    _rsifCharts['mes'].render();
}

// ── Gráfico Semana ─────────────────────────────────────────────
function _rsifRenderSemana(data) {
    const el = document.getElementById('rsifChartSemana');
    if (!el || !data.por_semana?.labels?.length) { if(el) el.innerHTML = _rsifEmpty('Sin datos por semana'); return; }
    el.innerHTML = '';
    const th = _rsifTheme();
    _rsifCharts['semana'] = new ApexCharts(el, {
        chart: { type:'bar', height:230, background:'transparent', foreColor:th.fg, toolbar:{show:false}, animations:{enabled:true,speed:300} },
        series: [{ name:'Eventos', data: data.por_semana.data }],
        xaxis:  { categories: data.por_semana.labels, labels:{style:{fontSize:'10px',colors:th.fg}} },
        yaxis:  { labels:{style:{fontSize:'10px',colors:th.fg}, formatter:v=>_rsifFmt(v)} },
        plotOptions: { bar:{columnWidth:'65%',borderRadius:3,dataLabels:{position:'top'}} },
        dataLabels:  { enabled:true, formatter:v=> v > 0 ? _rsifFmt(v) : '', style:{fontSize:'9px',colors:[th.fg]}, offsetY:-14 },
        colors:  [RSIF_GOLD],
        grid:    { borderColor:th.grid, strokeDashArray:3 },
        tooltip: { theme:th.dark?'dark':'light', y:{formatter:v=>v.toLocaleString('es-PE')} },
        theme:   { mode:th.dark?'dark':'light' },
    });
    _rsifCharts['semana'].render();
}

// ── Gráfico Días de la Semana ──────────────────────────────────
function _rsifRenderDiaSemana(data) {
    const el = document.getElementById('rsifChartDiaSem');
    if (!el || !data.por_dia_semana?.labels?.length) { if(el) el.innerHTML = _rsifEmpty('Sin datos de día de semana'); return; }
    el.innerHTML = '';
    const th = _rsifTheme();
    _rsifCharts['diasem'] = new ApexCharts(el, {
        chart: { type:'bar', height:230, background:'transparent', foreColor:th.fg, toolbar:{show:false}, animations:{enabled:true,speed:300} },
        series: [{ name:'Eventos', data: data.por_dia_semana.data }],
        xaxis:  { categories: data.por_dia_semana.labels, labels:{style:{fontSize:'11px',colors:th.fg}} },
        yaxis:  { labels:{style:{fontSize:'10px',colors:th.fg}, formatter:v=>_rsifFmt(v)} },
        plotOptions: { bar:{columnWidth:'60%',borderRadius:3,dataLabels:{position:'top'}} },
        dataLabels:  { enabled:true, formatter:v=> v > 0 ? _rsifFmt(v) : '', style:{fontSize:'9px',colors:[th.fg]}, offsetY:-14 },
        colors:  [RSIF_GOLD],
        grid:    { borderColor:th.grid, strokeDashArray:3 },
        tooltip: { theme:th.dark?'dark':'light', y:{formatter:v=>v.toLocaleString('es-PE')} },
        theme:   { mode:th.dark?'dark':'light' },
    });
    _rsifCharts['diasem'].render();
}

// ── Gráfico Trimestre ──────────────────────────────────────────
function _rsifRenderTrimestre(data) {
    const el = document.getElementById('rsifChartTrimestre');
    if (!el || !data.por_trimestre?.labels?.length) { if(el) el.innerHTML = _rsifEmpty('Sin datos de trimestre'); return; }
    el.innerHTML = '';
    const th = _rsifTheme();
    _rsifCharts['trimestre'] = new ApexCharts(el, {
        chart: { type:'bar', height:230, background:'transparent', foreColor:th.fg, toolbar:{show:false}, animations:{enabled:true,speed:300} },
        series: [{ name:'Eventos', data: data.por_trimestre.data }],
        xaxis:  { categories: data.por_trimestre.labels, labels:{style:{fontSize:'11px',colors:th.fg}} },
        yaxis:  { labels:{style:{fontSize:'10px',colors:th.fg}, formatter:v=>_rsifFmt(v)} },
        plotOptions: { bar:{columnWidth:'55%',borderRadius:3,dataLabels:{position:'top'}} },
        dataLabels:  { enabled:true, formatter:v=> v > 0 ? _rsifFmt(v) : '0', style:{fontSize:'10px',fontWeight:700,colors:[th.fg]}, offsetY:-16 },
        colors:  [RSIF_GOLD],
        grid:    { borderColor:th.grid, strokeDashArray:3 },
        tooltip: { theme:th.dark?'dark':'light', y:{formatter:v=>v.toLocaleString('es-PE')} },
        theme:   { mode:th.dark?'dark':'light' },
    });
    _rsifCharts['trimestre'].render();
}

// ── Gráfico Distrito ───────────────────────────────────────────
function _rsifRenderDistrito(data) {
    const el = document.getElementById('rsifChartDistrito');
    if (!el) return;
    const { labels = [], data: vals = [] } = data.por_distrito || {};
    if (!labels.length) { el.innerHTML = _rsifEmpty('Sin datos de distrito'); return; }
    el.innerHTML = '';
    const th = _rsifTheme();
    _rsifCharts['distrito'] = new ApexCharts(el, {
        chart: { type:'bar', height:220, background:'transparent', foreColor:th.fg, toolbar:{show:false}, animations:{enabled:true,speed:300} },
        series: [{ name:'Eventos', data: vals }],
        xaxis:  { categories: labels, labels:{style:{fontSize:'10px',colors:th.fg}, rotate:-30} },
        yaxis:  { labels:{style:{fontSize:'10px',colors:th.fg}, formatter:v=>_rsifFmt(v)} },
        plotOptions: { bar:{columnWidth:'60%',borderRadius:3,dataLabels:{position:'top'}} },
        dataLabels:  { enabled:true, formatter:v=> v > 0 ? _rsifFmt(v) : '', style:{fontSize:'9px',colors:[th.fg]}, offsetY:-14 },
        colors:  [RSIF_GOLD],
        grid:    { borderColor:th.grid, strokeDashArray:3 },
        tooltip: { theme:th.dark?'dark':'light', y:{formatter:v=>v.toLocaleString('es-PE')} },
        theme:   { mode:th.dark?'dark':'light' },
    });
    _rsifCharts['distrito'].render();
}

// ── Tabla Distrito × Mes ───────────────────────────────────────
function _rsifRenderTablaDistrito(data) {
    const el = document.getElementById('rsifTablaDistrito');
    if (!el) return;
    const { labels: distritos = [], meses = [], matriz = {}, totales = {} } = data.por_distrito || {};
    if (!distritos.length) return;

    const grandTotal = Object.values(totales).reduce((a, b) => a + b, 0);
    const colTotals  = {};
    meses.forEach(m => { colTotals[m] = 0; });

    let html = `<div style="overflow-x:auto;margin-top:10px"><table style="width:100%;border-collapse:collapse;font-size:12px">
        <thead><tr style="border-bottom:2px solid var(--gris-500)">
            <th style="padding:6px 10px;text-align:left;color:var(--gris-300);font-weight:700">Distrito</th>`;
    meses.forEach(m => {
        html += `<th style="padding:6px 8px;text-align:right;color:var(--gris-300);font-weight:700">${rsifEsc(m)}</th>`;
    });
    html += `<th style="padding:6px 10px;text-align:right;color:${RSIF_GOLD};font-weight:800">Total</th></tr></thead><tbody>`;

    distritos.forEach((dist, ri) => {
        const rowData  = matriz[dist] || {};
        const rowTotal = totales[dist] || 0;
        html += `<tr style="border-bottom:1px solid var(--gris-600)">
            <td style="padding:5px 10px;font-weight:600;color:var(--gris-100)">${rsifEsc(dist)}</td>`;
        meses.forEach(m => {
            const v = rowData[m] || 0;
            colTotals[m] = (colTotals[m] || 0) + v;
            html += `<td style="padding:5px 8px;text-align:right;color:${v>0?'var(--gris-100)':'var(--gris-600)'}">${v>0?v.toLocaleString('es-PE'):''}</td>`;
        });
        html += `<td style="padding:5px 10px;text-align:right;font-weight:700;color:${RSIF_GOLD}">${rowTotal.toLocaleString('es-PE')}</td></tr>`;
    });

    html += `<tr style="background:rgba(245,200,0,.06);border-top:2px solid var(--gris-500)">
        <td style="padding:6px 10px;font-weight:800;color:var(--gris-100)">Total</td>`;
    meses.forEach(m => {
        const v = colTotals[m] || 0;
        html += `<td style="padding:6px 8px;text-align:right;font-weight:700;color:var(--gris-100)">${v>0?v.toLocaleString('es-PE'):''}</td>`;
    });
    html += `<td style="padding:6px 10px;text-align:right;font-weight:800;color:${RSIF_GOLD}">${grandTotal.toLocaleString('es-PE')}</td></tr>`;
    html += '</tbody></table></div>';
    el.innerHTML = html;
}

// ── Utilidades ─────────────────────────────────────────────────
function _rsifTheme() {
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    return { dark, fg: dark ? '#b0b8c8' : '#374151', grid: dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.08)' };
}

function _rsifDestroyAll() {
    Object.keys(_rsifCharts).forEach(k => {
        if (_rsifCharts[k]) { try { _rsifCharts[k].destroy(); } catch (_) {} _rsifCharts[k] = null; }
    });
    _rsifCharts = {};
}

function _rsifEmpty(msg) {
    return `<div style="display:flex;align-items:center;justify-content:center;min-height:150px;color:var(--gris-500);font-size:12px;text-align:center;flex-direction:column;gap:8px;padding:16px">
        <i class="fas fa-route" style="font-size:24px;opacity:.15"></i><span>${rsifEsc(msg)}</span></div>`;
}

function _rsifShowEmpty() {
    ['rsifContent','rsifLoading'].forEach(id => { const e=document.getElementById(id); if(e) e.style.display='none'; });
    const e = document.getElementById('rsifEmpty'); if(e) e.style.display='';
}
function _rsifShowLoading() {
    ['rsifContent','rsifEmpty'].forEach(id => { const e=document.getElementById(id); if(e) e.style.display='none'; });
    const e = document.getElementById('rsifLoading'); if(e) e.style.display='';
}

function _rsifFmt(n) {
    if (n===null||n===undefined||isNaN(n)) return '—';
    const a = Math.abs(n);
    if (a>=1e6) return (n/1e6).toFixed(1)+'M';
    if (a>=1e3) return (n/1e3).toFixed(1)+'K';
    return n%1===0 ? Number(n).toLocaleString('es-PE') : Number(n).toLocaleString('es-PE',{maximumFractionDigits:2});
}

function rsifEsc(str) {
    return String(str??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
