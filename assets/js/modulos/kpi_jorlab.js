// ============================================================
// KPI Analytics — JORLAB (Jornada Laboral)
// Calcula horas trabajadas a partir de ENTRADA / SALIDA
// ============================================================

const JL_TEAL  = '#14B8A6';
const JL_GOLD  = '#F5C800';
const JL_RED   = '#E55353';
const JL_BLUE  = '#3D99F5';

const JL_MESES_ES   = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const JL_MESES_FULL = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

let _jlData    = null;
let _jlCharts  = {};
let _jlLoading = false;
let _jlMesSel  = null;
let _jlAñoSel  = null;

// ── Inicialización ─────────────────────────────────────────────
function jlInit() {
    if (!document.getElementById('jlContent')) return;
    jlRefresh();
}

// ── Refresh ────────────────────────────────────────────────────
async function jlRefresh() {
    if (_jlLoading) return;
    _jlLoading = true;
    const btn = document.getElementById('jlRefreshBtn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando...'; }
    _jlShowLoading();

    const payload = {
        fecha_desde: document.getElementById('jlDesde')?.value || '',
        fecha_hasta: document.getElementById('jlHasta')?.value || '',
        max_rows: 100000,
    };

    try {
        const r    = await fetch(`${KPI_JORLAB_API}?action=dashboard`, {
            method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload),
        });
        const resp = await r.json();
        if (!resp.success) { toast(resp.message || 'Error JORLAB', 'error'); _jlShowEmpty(); return; }
        _jlData   = resp.data;
        _jlMesSel = null;
        _jlRenderAll(resp.data);
    } catch (e) {
        console.error('[jorlab]', e);
        toast('Error de conexión JORLAB', 'error');
        _jlShowEmpty();
    } finally {
        _jlLoading = false;
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-rotate-right"></i> Actualizar'; }
    }
}

// ── Render principal ───────────────────────────────────────────
function _jlRenderAll(data) {
    if (!data.found) { _jlShowEmpty(); return; }
    if (data.total_turnos === 0) {
        const desde = document.getElementById('jlDesde')?.value;
        const hasta = document.getElementById('jlHasta')?.value;
        const rango = (desde || hasta) ? ` para el rango ${desde || '…'} → ${hasta || '…'}` : '';
        _jlShowEmpty(`<i class="fas fa-calendar-xmark" style="font-size:28px;color:var(--gris-600);margin-bottom:10px"></i><br>No hay registros${rango}.<br><span style="font-size:12px;color:var(--gris-500)">Tus datos disponibles van desde ${data.rango_real?.desde || '—'} hasta ${data.rango_real?.hasta || '—'}.</span>`);
        return;
    }

    document.getElementById('jlEmpty').style.display   = 'none';
    document.getElementById('jlLoading').style.display = 'none';
    const wrap = document.getElementById('jlContent');
    wrap.style.display = '';
    wrap.innerHTML     = '';
    _jlDestroyAll();

    wrap.style.cssText = 'display:flex;flex-direction:column;gap:12px';

    // Top section: filtros + KPIs
    wrap.appendChild(_jlBuildTopSection(data));

    // Grid 3 columnas
    const main = document.createElement('div');
    main.id = 'jlMain';
    main.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:12px;align-items:start';
    wrap.appendChild(main);

    // Fila 1: Por Mes | Por Día Semana | Dist. Duración
    main.appendChild(_jlCard('jlChartMes',     '<i class="fas fa-calendar-alt"    style="color:'+JL_TEAL+'"></i> Horas por Mes').wrap);
    main.appendChild(_jlCard('jlChartDiaSem',  '<i class="fas fa-calendar-days"   style="color:'+JL_TEAL+'"></i> Horas por Día de Semana').wrap);
    main.appendChild(_jlCard('jlChartDistDur', '<i class="fas fa-chart-bar"       style="color:'+JL_TEAL+'"></i> Distribución de Turno').wrap);

    // Fila 2: Por Semana (span 2) | Por Hora Entrada
    const semCard = _jlCard('jlChartSemana', '<i class="fas fa-calendar-week" style="color:'+JL_TEAL+'"></i> Horas por Semana');
    semCard.wrap.style.gridColumn = 'span 2';
    main.appendChild(semCard.wrap);
    main.appendChild(_jlCard('jlChartHoraE', '<i class="fas fa-clock" style="color:'+JL_TEAL+'"></i> Hora de Entrada').wrap);

    // Fila 3: Diario Promedio Jornada (span 3)
    const dpjCard = _jlCard('jlChartDiarioProm', '<i class="fas fa-clock-rotate-left" style="color:'+JL_GOLD+'"></i> Diario Promedio Jornada', 220);
    dpjCard.wrap.style.gridColumn = 'span 3';
    main.appendChild(dpjCard.wrap);

    // Fila 4: Tabla Diaria (span 3)
    const tablaDiaCard = _jlCard('jlTablaDia', '<i class="fas fa-table-cells" style="color:'+JL_TEAL+'"></i> Promedio Horas por Día del Mes', 0);
    tablaDiaCard.body.style.padding  = '0';
    tablaDiaCard.wrap.style.gridColumn = 'span 3';
    main.appendChild(tablaDiaCard.wrap);

    // Fila 5: Distribución por Trabajador (span 3)
    const trabCard = _jlCard('jlTablaTrabajador', '<i class="fas fa-users" style="color:'+JL_GOLD+'"></i> Distribución de Turno por Trabajador', 0);
    trabCard.body.style.padding = '0';
    trabCard.wrap.style.gridColumn = 'span 3';
    main.appendChild(trabCard.wrap);

    // Fila 6: Descanso Conductores (span 3)
    const descCard = _jlCard('jlDescansoCond', '<i class="fas fa-moon" style="color:'+JL_GOLD+'"></i> Descanso entre Turnos — Conductores', 0);
    descCard.body.style.padding = '0';
    descCard.wrap.style.gridColumn = 'span 3';
    descCard.wrap.style.borderTopColor = JL_GOLD;
    main.appendChild(descCard.wrap);

    // Fila 7: Conductores (span 3)
    const condCard = _jlCard('jlTablaConductores', '<i class="fas fa-truck" style="color:'+JL_TEAL+'"></i> Jornada Conductores', 0);
    condCard.body.style.padding = '0';
    condCard.wrap.style.gridColumn = 'span 3';
    condCard.wrap.style.borderTopColor = JL_TEAL;
    main.appendChild(condCard.wrap);

    // Renderizar todos los gráficos
    _jlRenderMes(data);
    _jlRenderDiaSemana(data);
    _jlRenderDistDur(data);
    _jlRenderSemana(data);
    _jlRenderHoraEntrada(data);
    _jlRenderDiarioProm(data, null);
    _jlRenderTablaDia(data, null);
    _jlRenderDistTrabajador(data, null);
    _jlRenderDescansoConductores(data, null);
    _jlRenderConductores(data, null);
}

// ── Top Section ────────────────────────────────────────────────
function _jlBuildTopSection(data) {
    const sec = document.createElement('div');
    sec.style.cssText = [
        'background:var(--gris-700);border:1px solid var(--gris-600)',
        'border-radius:10px;padding:14px 16px;display:flex;flex-direction:column;gap:12px',
    ].join(';');

    // Fila año
    if (data.años?.length >= 1) {
        const añoRow = document.createElement('div');
        añoRow.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap';
        const añoLabel = document.createElement('span');
        añoLabel.style.cssText = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--gris-400);white-space:nowrap';
        añoLabel.textContent = 'Año:';
        añoRow.appendChild(añoLabel);
        const añoList = document.createElement('div');
        añoList.id = 'jlAñoBtns';
        añoList.style.cssText = 'display:flex;gap:5px;flex-wrap:wrap';
        añoList.appendChild(_jlPill('Todos', null, _jlAñoSel === null, _jlSelectAño));
        data.años.forEach(a => añoList.appendChild(_jlPill(String(a), a, _jlAñoSel === a, _jlSelectAño)));
        añoRow.appendChild(añoList);
        sec.appendChild(añoRow);
    }

    // Fila mes
    const mesRow = document.createElement('div');
    mesRow.style.cssText = 'display:flex;align-items:center;gap:6px;flex-wrap:wrap';
    const mesLabel = document.createElement('span');
    mesLabel.style.cssText = 'font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.12em;color:var(--gris-400);white-space:nowrap';
    mesLabel.textContent = 'Mes:';
    mesRow.appendChild(mesLabel);
    const mesList = document.createElement('div');
    mesList.id = 'jlMesBtns';
    mesList.style.cssText = 'display:flex;gap:5px;flex-wrap:wrap';
    mesList.appendChild(_jlPill('Todos', null, _jlMesSel === null, _jlSelectMes));
    const det = data.detalle_por_mes || {};
    for (let m = 1; m <= 12; m++) {
        const key = String(m);
        if (det[key]?.total_turnos > 0)
            mesList.appendChild(_jlPill(JL_MESES_ES[m-1], key, _jlMesSel === key, _jlSelectMes));
    }
    mesRow.appendChild(mesList);
    sec.appendChild(mesRow);

    // KPI cards
    const kpiRow = document.createElement('div');
    kpiRow.id = 'jlKpiCards';
    kpiRow.style.cssText = 'display:flex;gap:10px;flex-wrap:wrap';
    kpiRow.innerHTML = _jlKpiHtml(data, null);
    sec.appendChild(kpiRow);

    // Columnas detectadas
    if (data.cols) {
        const c = data.cols;
        const items = [
            ['⏰', 'Entrada', c.entradaCol],
            ['🏁', 'Salida',  c.salidaCol],
            ['👷', 'Empleado', c.empleadoCol],
            ['📍', 'Área',    c.areaCol],
        ].filter(([,,v]) => v);
        if (items.length) {
            const colInfo = document.createElement('div');
            colInfo.style.cssText = 'font-size:10px;color:var(--gris-500);display:flex;gap:14px;flex-wrap:wrap';
            colInfo.innerHTML = items.map(([icon, label, val]) =>
                `<span>${icon} <span style="color:var(--gris-400)">${label}:</span> <code style="font-size:10px;color:var(--gris-300)">${jlEsc(val)}</code></span>`
            ).join('');
            sec.appendChild(colInfo);
        }
    }

    return sec;
}

// ── KPI Cards HTML ─────────────────────────────────────────────
function _jlKpiHtml(data, mesKey) {
    const d = mesKey !== null
        ? (data.detalle_por_mes?.[mesKey] ?? {total_turnos:0, total_horas:0, prom_min:0, extra:0})
        : data;

    const totalTurnos = d.total_turnos ?? 0;
    const totalHoras  = d.total_horas  ?? 0;
    const promMin     = d.prom_min     ?? data.prom_min ?? 0;
    const extra       = d.extra        ?? data.turnos_extra ?? 0;

    function card(icon, label, val, sub, color) {
        return `<div style="flex:0 1 200px;min-width:160px;background:var(--gris-600);border-radius:10px;padding:12px 16px;border-top:2px solid ${color}">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.45);margin-bottom:6px">
                <i class="${icon}" style="color:${color};margin-right:5px"></i>${label}
            </div>
            <div style="font-size:22px;font-weight:800;color:${color};font-family:var(--font-display,sans-serif)">${val}</div>
            <div style="font-size:10px;color:rgba(255,255,255,.35);margin-top:3px">${sub}</div>
        </div>`;
    }

    return card('fas fa-id-card-clip', 'Total Turnos',   totalTurnos.toLocaleString('es-PE'),    'turnos registrados', JL_TEAL)
         + card('fas fa-clock',         'Total Horas',    totalHoras.toLocaleString('es-PE') + ' h', 'horas trabajadas',   JL_GOLD)
         + card('fas fa-gauge',          'Prom. Turno',   _jlFmtMin(promMin),                       'duración promedio',  JL_BLUE)
         + card('fas fa-fire',           'Turnos >8h',    extra.toLocaleString('es-PE'),             'jornada extendida',  JL_RED);
}

// ── Charts ─────────────────────────────────────────────────────
function _jlRenderMes(data) {
    const el = document.getElementById('jlChartMes');
    if (!el || !data.por_mes) return;
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    const opts = _jlBaseOpts(dark);
    const lblColor = dark ? '#b0b8c8' : '#374151';
    _jlCharts['mes'] = new ApexCharts(el, {
        ...opts,
        chart: {...opts.chart, type:'bar'},
        series: [{name:'Prom. Horas', data: data.por_mes.prom}],
        xaxis: {categories: data.por_mes.labels, labels:{style:{colors: opts.theme.foreColor, fontSize:'11px'}}},
        yaxis: {labels:{style:{colors: lblColor, fontSize:'11px'}, formatter: v => v.toFixed(1)+'h'}, min:0},
        colors: [JL_TEAL],
        plotOptions: {bar:{dataLabels:{position:'top'}}},
        dataLabels: {
            enabled: true,
            offsetY: -18,
            formatter: v => v === 0 ? '' : v.toFixed(2),
            style: {fontSize:'10px', fontWeight:700, colors:[lblColor]},
        },
        tooltip: {y:{formatter: v => v.toFixed(2) + ' h prom.'}},
    });
    _jlCharts['mes'].render();
}

function _jlRenderDiaSemana(data) {
    const el = document.getElementById('jlChartDiaSem');
    if (!el || !data.por_dia_semana) return;
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    const opts = _jlBaseOpts(dark);
    const lblColor = dark ? '#b0b8c8' : '#374151';
    _jlCharts['diasem'] = new ApexCharts(el, {
        ...opts,
        chart: {...opts.chart, type:'bar'},
        series: [{name:'Prom. Horas', data: data.por_dia_semana.prom}],
        xaxis: {categories: data.por_dia_semana.labels, labels:{style:{colors: opts.theme.foreColor, fontSize:'11px'}}},
        yaxis: {labels:{style:{colors: lblColor, fontSize:'11px'}, formatter: v => v.toFixed(1)+'h'}, min:0},
        colors: [JL_BLUE],
        plotOptions: {bar:{dataLabels:{position:'top'}}},
        dataLabels: {
            enabled: true,
            offsetY: -18,
            formatter: v => v === 0 ? '' : v.toFixed(2),
            style: {fontSize:'10px', fontWeight:700, colors:[lblColor]},
        },
        tooltip: {y:{formatter: v => v.toFixed(2) + ' h prom.'}},
    });
    _jlCharts['diasem'].render();
}

function _jlRenderDistDur(data) {
    const el = document.getElementById('jlChartDistDur');
    if (!el || !data.dist_duracion) return;
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    const opts = _jlBaseOpts(dark);
    const colors = [JL_BLUE, '#38BDF8', JL_TEAL, '#34D399', JL_GOLD, '#FB923C', JL_RED, '#9561E2'];
    _jlCharts['distdur'] = new ApexCharts(el, {
        ...opts,
        chart: {...opts.chart, type:'bar'},
        series: [{name:'Turnos', data: data.dist_duracion.data}],
        xaxis: {categories: data.dist_duracion.labels, labels:{style:{colors: opts.theme.foreColor, fontSize:'11px'}}},
        colors,
        plotOptions: {bar:{distributed:true, borderRadius:4}},
        legend: {show:false},
        dataLabels: {enabled:true, style:{fontSize:'11px', colors:['#fff']}},
        tooltip: {y:{formatter: v => v + ' turnos'}},
    });
    _jlCharts['distdur'].render();
}

function _jlRenderSemana(data) {
    const el = document.getElementById('jlChartSemana');
    if (!el || !data.por_semana?.labels?.length) return;
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    const opts = _jlBaseOpts(dark);
    const lblColor = dark ? '#b0b8c8' : '#374151';
    _jlCharts['semana'] = new ApexCharts(el, {
        ...opts,
        chart: {...opts.chart, type:'area'},
        series: [{name:'Prom. Horas', data: data.por_semana.prom}],
        xaxis: {categories: data.por_semana.labels, labels:{style:{colors: opts.theme.foreColor, fontSize:'10px'}, rotate:-45}},
        yaxis: {labels:{style:{colors: lblColor, fontSize:'10px'}, formatter: v => v.toFixed(1)+'h'}, min:0},
        colors: [JL_TEAL],
        fill: {type:'gradient', gradient:{shadeIntensity:.4, opacityFrom:.6, opacityTo:.05}},
        stroke: {width:2},
        markers: {size:4, colors:[JL_TEAL], strokeColors: dark ? '#1e293b' : '#fff', strokeWidth:2},
        dataLabels: {
            enabled: true,
            formatter: v => v === 0 ? '' : v.toFixed(2),
            style: {fontSize:'9px', fontWeight:700, colors:[lblColor]},
            background: {enabled:true, foreColor: dark ? '#1e293b' : '#fff', padding:2, borderRadius:3, borderWidth:0, opacity:.7},
        },
        tooltip: {y:{formatter: v => v.toFixed(2) + ' h prom.'}},
    });
    _jlCharts['semana'].render();
}

function _jlRenderHoraEntrada(data) {
    const el = document.getElementById('jlChartHoraE');
    if (!el || !data.por_hora_entrada) return;
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    const opts = _jlBaseOpts(dark);
    _jlCharts['horae'] = new ApexCharts(el, {
        ...opts,
        chart: {...opts.chart, type:'bar'},
        series: [{name:'Turnos', data: data.por_hora_entrada.data}],
        xaxis: {categories: data.por_hora_entrada.labels, labels:{style:{colors: opts.theme.foreColor, fontSize:'9px'}, rotate:-90}, tickAmount:12},
        colors: [JL_GOLD],
        plotOptions: {bar:{dataLabels:{position:'top'}}},
        dataLabels: {
            enabled: true,
            offsetY: -18,
            formatter: v => v === 0 ? '' : String(v),
            style: {fontSize:'9px', fontWeight:700, colors:[dark ? '#b0b8c8' : '#374151']},
        },
        tooltip: {y:{formatter: v => v + ' turnos'}},
    });
    _jlCharts['horae'].render();
}

// ── Diario Promedio Jornada ────────────────────────────────────
function _jlRenderDiarioProm(data, mesKey) {
    const el = document.getElementById('jlChartDiarioProm');
    if (!el) return;

    const dayMap = (mesKey !== null && mesKey !== undefined)
        ? (data.detalle_por_mes?.[mesKey]?.prom_por_dia || {})
        : (data.prom_dia_global || {});

    const entries = Object.entries(dayMap)
        .map(([d, h]) => ({day: parseInt(d), h: parseFloat(h)}))
        .filter(e => e.h > 0)
        .sort((a, b) => a.day - b.day);

    if (_jlCharts['diarioProm']) { try { _jlCharts['diarioProm'].destroy(); } catch(_) {} _jlCharts['diarioProm'] = null; }
    if (!entries.length) { el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--gris-500);font-size:13px">Sin datos</div>'; return; }

    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    const lblColor = dark ? '#b0b8c8' : '#374151';

    _jlCharts['diarioProm'] = new ApexCharts(el, {
        chart: {height: 220, type: 'bar', toolbar: {show: false}, background: 'transparent', animations: {enabled: false}},
        theme: {mode: dark ? 'dark' : 'light'},
        series: [{name: 'Prom. Jornada', data: entries.map(e => e.h)}],
        xaxis: {
            categories: entries.map(e => e.day),
            labels: {style: {colors: lblColor, fontSize: '10px'}},
        },
        yaxis: {
            min: 0,
            labels: {style: {colors: lblColor, fontSize: '10px'}, formatter: v => v.toFixed(1) + 'h'},
        },
        grid: {borderColor: dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.08)', strokeDashArray: 3},
        colors: [JL_GOLD],
        plotOptions: {bar: {borderRadius: 3, columnWidth: '75%', dataLabels: {position: 'top'}}},
        dataLabels: {
            enabled: true,
            offsetY: -16,
            formatter: v => v.toFixed(2),
            style: {fontSize: '9px', fontWeight: 700, colors: [lblColor]},
        },
        tooltip: {
            theme: dark ? 'dark' : 'light',
            y: {formatter: v => v.toFixed(2) + ' h prom.'},
        },
    });
    _jlCharts['diarioProm'].render();
}

// ── Tabla Diaria ───────────────────────────────────────────────
function _jlRenderTablaDia(data, mesKey) {
    const el = document.getElementById('jlTablaDia');
    if (!el) return;

    let dayMap = {};
    if (mesKey !== null && mesKey !== undefined) {
        dayMap = data.detalle_por_mes?.[mesKey]?.prom_por_dia || {};
    } else {
        dayMap = data.prom_dia_global || {};
    }

    const vals  = Object.values(dayMap).filter(v => v > 0);
    const total = vals.length ? (vals.reduce((s, v) => s + v, 0) / vals.length) : 0;

    function buildSub(from, to) {
        const thStyle = 'padding:6px 8px;text-align:right;font-size:10px;color:var(--gris-400);font-weight:700;text-transform:uppercase';
        let rows = '';
        for (let d = from; d <= to; d++) {
            const hrs    = dayMap[d] || 0;
            const hasDat = hrs > 0;
            const altBg  = d % 2 === 0 ? 'background:rgba(255,255,255,.025)' : '';
            rows += `<tr style="${altBg}">
                <td style="padding:3px 8px;font-size:11px;color:var(--gris-400);text-align:right;width:28px">${d}</td>
                <td style="padding:0 4px;width:4px">
                    <div style="width:2px;height:14px;background:${hasDat ? JL_TEAL : 'transparent'};border-radius:1px"></div>
                </td>
                <td style="padding:3px 8px;font-size:11px;font-weight:${hasDat?700:400};color:${hasDat?'var(--gris-100)':'var(--gris-600)'};text-align:right">
                    ${hasDat ? hrs.toFixed(2) + 'h' : ''}
                </td>
            </tr>`;
        }
        return `<table style="width:100%;border-collapse:collapse">
            <thead><tr style="border-bottom:2px solid var(--gris-600)">
                <th style="${thStyle};width:28px">Día</th><th style="width:4px"></th>
                <th style="${thStyle}">Horas</th>
            </tr></thead><tbody>${rows}</tbody></table>`;
    }

    el.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-bottom:2px solid var(--gris-500)">
            <div style="border-right:1px solid var(--gris-600)">${buildSub(1,10)}</div>
            <div style="border-right:1px solid var(--gris-600)">${buildSub(11,20)}</div>
            <div>${buildSub(21,31)}</div>
        </div>
        <table style="width:100%;border-collapse:collapse">
            <tr style="background:rgba(20,184,166,.08)">
                <td style="padding:5px 12px;font-size:11px;font-weight:800;color:var(--gris-200)">Total</td>
                <td style="padding:5px 12px;font-size:11px;font-weight:800;color:${JL_TEAL};text-align:right">${total.toFixed(2)} h prom.</td>
            </tr>
        </table>`;
}

// ── Distribución por Trabajador ────────────────────────────────
function _jlRenderDistTrabajador(data, mesKey) {
    const el = document.getElementById('jlTablaTrabajador');
    if (!el) return;

    const dist = (mesKey !== null && mesKey !== undefined)
        ? (data.dist_trab_mes?.[mesKey] || {})
        : (data.dist_por_trabajador || {});
    const workers = Object.entries(dist);
    if (!workers.length) {
        el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--gris-500);font-size:12px">Sin datos de trabajadores</div>';
        return;
    }

    const BUCKETS = ['<08h','08-09h','09-10h','10-10:30h','10:30-11:00h','11:00-11:30h','11:30-12:00h','>12h'];
    const COLORS  = [JL_BLUE,'#38BDF8',JL_TEAL,'#34D399',JL_GOLD,'#FB923C',JL_RED,'#9561E2'];

    const thS = 'padding:6px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;text-align:center;border-bottom:2px solid var(--gris-600);white-space:nowrap';
    const tdS = 'padding:4px 7px;font-size:11px;text-align:center;border-bottom:1px solid rgba(255,255,255,.04)';

    const headerCols = BUCKETS.map((b, i) =>
        `<th style="${thS};color:${COLORS[i]}">${b}</th>`
    ).join('');

    const rows = workers.map(([name, counts], idx) => {
        const altBg = idx % 2 === 1 ? 'background:rgba(255,255,255,.02)' : '';
        const cells = BUCKETS.map((b, i) => {
            const v = counts[b] || 0;
            return v > 0
                ? `<td style="${tdS};font-weight:700;color:${COLORS[i]};${altBg}">${v}</td>`
                : `<td style="${tdS};color:var(--gris-700);${altBg}">—</td>`;
        }).join('');
        return `<tr style="${altBg}">
            <td style="padding:4px 12px;font-size:11px;color:var(--gris-200);border-bottom:1px solid rgba(255,255,255,.04);white-space:nowrap">${jlEsc(name)}</td>
            ${cells}
            <td style="${tdS};font-weight:800;color:var(--gris-100)">${counts.total || 0}</td>
        </tr>`;
    }).join('');

    el.innerHTML = `<div style="overflow-x:auto;max-height:420px;overflow-y:auto">
        <table style="width:100%;border-collapse:collapse;min-width:720px">
            <thead style="position:sticky;top:0;background:var(--gris-700);z-index:1">
                <tr>
                    <th style="${thS};text-align:left;padding-left:12px">Trabajador</th>
                    ${headerCols}
                    <th style="${thS};color:var(--gris-200)">Total</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    </div>`;
}

// ── Descanso entre Turnos – Conductores ───────────────────────
function _jlRenderDescansoConductores(data, mesKey) {
    const el = document.getElementById('jlDescansoCond');
    if (!el) return;
    const desc = (mesKey && data.descanso_mes?.[mesKey]) ? data.descanso_mes[mesKey] : (data.descanso_conductores || {});
    const workers = Object.entries(desc);
    if (!workers.length) {
        el.innerHTML = '<div style="padding:20px;text-align:center;color:var(--gris-500);font-size:12px">Sin datos de conductores</div>';
        return;
    }

    // Chart: solo conductores con <8h > 0, ordenados desc
    const menorOcho = workers
        .filter(([,d]) => d['<8h'] > 0)
        .sort((a, b) => b[1]['<8h'] - a[1]['<8h']);

    // Tabla: todos los conductores, ya vienen ordenados por >10h desc desde PHP
    const COLS   = ['<8h','8-9h','9-10h','>10h'];
    const HEADS  = ['<8 Hrs','8 a 9 Hrs','9 a 10 Hrs','>10 Hrs'];
    const COLORS = [JL_RED, JL_GOLD, JL_TEAL, JL_BLUE];

    // KPI cards
    const condConDesc  = workers.filter(([,d]) => d['<8h'] > 0).length;
    const totalDesc8   = workers.reduce((s,[,d]) => s + d['<8h'], 0);
    const totalCond    = workers.length;
    const pctAlert     = totalCond > 0 ? Math.round(condConDesc / totalCond * 100) : 0;

    function descCard(icon, label, val, sub, color) {
        return `<div style="flex:1;min-width:160px;background:var(--gris-600);border-radius:10px;padding:12px 16px;border-top:2px solid ${color}">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.45);margin-bottom:6px">
                <i class="${icon}" style="color:${color};margin-right:5px"></i>${label}
            </div>
            <div style="font-size:22px;font-weight:800;color:${color};font-family:var(--font-display,sans-serif)">${val}</div>
            <div style="font-size:10px;color:rgba(255,255,255,.35);margin-top:3px">${sub}</div>
        </div>`;
    }

    const kpiBar = `<div style="display:flex;gap:10px;flex-wrap:wrap;padding:12px 14px;border-bottom:1px solid var(--gris-600);background:rgba(229,83,83,.04)">
        ${descCard('fas fa-triangle-exclamation','Conductores c/ Descanso <8h', condConDesc, `de ${totalCond} conductores (${pctAlert}%)`, JL_RED)}
        ${descCard('fas fa-bolt',                'Ocurrencias <8h',             totalDesc8,  'veces con descanso insuficiente',            JL_RED)}
        ${descCard('fas fa-users',               'Total Conductores',           totalCond,   'con turnos en el período',                   JL_GOLD)}
        ${descCard('fas fa-check-circle',        'Sin Alertas',                 totalCond - condConDesc, 'conductores con descanso adecuado', JL_TEAL)}
    </div>`;

    el.innerHTML = kpiBar + `<div style="display:grid;grid-template-columns:360px 1fr;min-height:320px">
        <div id="jlDescChart" style="border-right:1px solid var(--gris-600);padding:8px 4px"></div>
        <div id="jlDescTable" style="overflow:auto;max-height:480px"></div>
    </div>`;

    // ── Chart horizontal ──
    const chartEl = document.getElementById('jlDescChart');
    if (menorOcho.length && chartEl) {
        const dark = document.documentElement.getAttribute('data-theme') !== 'light';
        const lblColor = dark ? '#b0b8c8' : '#374151';
        // Truncar nombres a 20 chars
        const names  = menorOcho.map(([n]) => n.length > 22 ? n.slice(0,20)+'...' : n);
        const values = menorOcho.map(([,d]) => d['<8h']);
        if (_jlCharts['descChart']) { try{_jlCharts['descChart'].destroy();}catch(_){} }
        _jlCharts['descChart'] = new ApexCharts(chartEl, {
            chart: { type:'bar', height: Math.max(200, menorOcho.length * 40 + 60),
                     toolbar:{show:false}, background:'transparent', animations:{enabled:false}},
            theme: {mode: dark ? 'dark' : 'light'},
            title: {text:'Conductor Descanso <8 Hrs', align:'center',
                    style:{fontSize:'12px', fontWeight:700, color: lblColor}},
            series: [{name:'<8h', data: values}],
            xaxis: {categories: names, labels:{style:{colors:lblColor, fontSize:'10px'}}},
            yaxis: {labels:{style:{colors:lblColor, fontSize:'10px'}}},
            colors: [JL_GOLD],
            plotOptions: {bar:{horizontal:true, borderRadius:3,
                dataLabels:{position:'center'}}},
            dataLabels: {enabled:true, style:{fontSize:'11px', fontWeight:800, colors:['#1e293b']}},
            grid: {borderColor: dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.08)', strokeDashArray:3},
            tooltip: {theme: dark ? 'dark' : 'light', y:{formatter: v => v + ' veces'}},
        });
        _jlCharts['descChart'].render();
    } else if (chartEl) {
        chartEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gris-500);font-size:12px;padding:20px;text-align:center">
            <div><i class="fas fa-check-circle" style="font-size:28px;color:${JL_TEAL};display:block;margin-bottom:8px"></i>Sin conductores con descanso &lt;8h</div></div>`;
    }

    // ── Tabla derecha ──
    const tableEl = document.getElementById('jlDescTable');
    if (!tableEl) return;
    const thS = 'padding:7px 10px;font-size:11px;font-weight:700;text-align:center;border-bottom:2px solid var(--gris-600);border-right:1px solid var(--gris-600);white-space:nowrap';
    const tdS = 'padding:5px 10px;font-size:11px;text-align:center;border-bottom:1px solid rgba(255,255,255,.05);border-right:1px solid rgba(255,255,255,.04)';

    const hds = HEADS.map((h,i) => `<th style="${thS};color:${COLORS[i]}">${h}</th>`).join('');
    const rows = workers.map(([name, d], idx) => {
        const altBg = idx % 2 === 1 ? 'background:rgba(255,255,255,.02)' : '';
        const cells = COLS.map((c,i) => {
            const v = d[c] || 0;
            return v > 0
                ? `<td style="${tdS};font-weight:700;color:${COLORS[i]};${altBg}">${v}</td>`
                : `<td style="${tdS};color:var(--gris-700);${altBg}"></td>`;
        }).join('');
        return `<tr style="${altBg}">
            <td style="padding:5px 12px;font-size:11px;font-weight:600;color:var(--gris-100);border-bottom:1px solid rgba(255,255,255,.05);white-space:nowrap">${jlEsc(name)}</td>
            ${cells}
        </tr>`;
    }).join('');

    tableEl.innerHTML = `<table style="width:100%;border-collapse:collapse;min-width:420px">
        <thead style="position:sticky;top:0;background:var(--gris-700);z-index:1">
            <tr>
                <th style="${thS};text-align:left;padding-left:12px;color:var(--gris-200)">NOMBRE</th>
                ${hds}
            </tr>
        </thead>
        <tbody>${rows}</tbody>
    </table>`;
}

// ── Jornada Conductores ────────────────────────────────────────
function _jlRenderConductores(data, mesKey) {
    const el = document.getElementById('jlTablaConductores');
    if (!el) return;

    const dist = (mesKey !== null && mesKey !== undefined)
        ? (data.dist_cond_mes?.[mesKey] || {})
        : (data.dist_conductores || {});

    const workers = Object.entries(dist);
    if (!workers.length) {
        el.innerHTML = '<div style="padding:16px 12px;text-align:center;color:var(--gris-500);font-size:12px">Sin conductores en este período</div>';
        return;
    }

    const BUCKETS = ['<08h','08-09h','09-10h','10-10:30h','10:30-11:00h','11:00-11:30h','11:30-12:00h','>12h'];
    const COLORS  = [JL_BLUE,'#38BDF8',JL_TEAL,'#34D399',JL_GOLD,'#FB923C',JL_RED,'#9561E2'];

    const thS = 'padding:6px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;text-align:center;border-bottom:2px solid var(--gris-600);white-space:nowrap';
    const tdS = 'padding:4px 7px;font-size:11px;text-align:center;border-bottom:1px solid rgba(255,255,255,.04)';

    const headerCols = BUCKETS.map((b, i) =>
        `<th style="${thS};color:${COLORS[i]}">${b}</th>`
    ).join('');

    // KPI resumen conductores
    const totales = BUCKETS.map((b, i) => ({b, i, v: workers.reduce((s,[,c])=> s+(c[b]||0),0)}));
    const grandTotal = workers.reduce((s,[,c]) => s+(c.total||0), 0);
    const kpiHtml = totales.map(({b,i,v}) =>
        `<div style="display:flex;flex-direction:column;align-items:center;padding:6px 10px;border-right:1px solid var(--gris-600)">
            <span style="font-size:9px;font-weight:700;color:${COLORS[i]};letter-spacing:.06em">${b}</span>
            <span style="font-size:16px;font-weight:800;color:${COLORS[i]}">${v}</span>
        </div>`
    ).join('');

    const rows = workers.map(([name, counts], idx) => {
        const altBg = idx % 2 === 1 ? 'background:rgba(255,255,255,.02)' : '';
        const cells = BUCKETS.map((b, i) => {
            const v = counts[b] || 0;
            return v > 0
                ? `<td style="${tdS};font-weight:700;color:${COLORS[i]};${altBg}">${v}</td>`
                : `<td style="${tdS};color:var(--gris-700);${altBg}">—</td>`;
        }).join('');
        return `<tr style="${altBg}">
            <td style="padding:4px 12px;font-size:11px;color:var(--gris-100);border-bottom:1px solid rgba(255,255,255,.04);font-weight:600;white-space:nowrap">
                <i class="fas fa-id-badge" style="color:${JL_TEAL};font-size:9px;margin-right:5px"></i>${jlEsc(name)}
            </td>
            ${cells}
            <td style="${tdS};font-weight:800;color:${JL_TEAL}">${counts.total || 0}</td>
        </tr>`;
    }).join('');

    el.innerHTML = `
        <div style="display:flex;align-items:center;border-bottom:1px solid var(--gris-600);background:rgba(20,184,166,.06)">
            ${kpiHtml}
            <div style="display:flex;flex-direction:column;align-items:center;padding:6px 14px;margin-left:auto">
                <span style="font-size:9px;font-weight:700;color:var(--gris-400);letter-spacing:.06em">CONDUCTORES</span>
                <span style="font-size:16px;font-weight:800;color:${JL_TEAL}">${workers.length}</span>
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;padding:6px 14px;border-left:1px solid var(--gris-600)">
                <span style="font-size:9px;font-weight:700;color:var(--gris-400);letter-spacing:.06em">TOTAL</span>
                <span style="font-size:16px;font-weight:800;color:var(--gris-100)">${grandTotal}</span>
            </div>
        </div>
        <div style="overflow-x:auto;max-height:380px;overflow-y:auto">
            <table style="width:100%;border-collapse:collapse;min-width:720px">
                <thead style="position:sticky;top:0;background:var(--gris-700);z-index:1">
                    <tr>
                        <th style="${thS};text-align:left;padding-left:12px;color:${JL_TEAL}">Conductor</th>
                        ${headerCols}
                        <th style="${thS};color:${JL_TEAL}">Total</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

// ── Selección mes / año ────────────────────────────────────────
function _jlSelectMes(mesKey) {
    _jlMesSel = mesKey;
    document.querySelectorAll('#jlMesBtns button').forEach(b => {
        const act = b.dataset.mes === (mesKey ?? 'null');
        b.style.background  = act ? JL_TEAL : 'transparent';
        b.style.color       = act ? '#000'   : 'var(--gris-200)';
        b.style.borderColor = act ? JL_TEAL  : 'rgba(20,184,166,.35)';
    });
    const kpi = document.getElementById('jlKpiCards');
    if (kpi && _jlData) kpi.innerHTML = _jlKpiHtml(_jlData, mesKey);
    _jlRenderDiarioProm(_jlData, mesKey);
    _jlRenderTablaDia(_jlData, mesKey);
    _jlRenderDistTrabajador(_jlData, mesKey);
    _jlRenderDescansoConductores(_jlData, mesKey);
    _jlRenderConductores(_jlData, mesKey);
}

function _jlSelectAño(añoKey) {
    _jlAñoSel = añoKey;
    _jlMesSel = null;
    const desde = document.getElementById('jlDesde');
    const hasta = document.getElementById('jlHasta');
    if (desde) desde.value = añoKey ? `${añoKey}-01-01` : '';
    if (hasta) hasta.value = añoKey ? `${añoKey}-12-31` : '';
    jlRefresh();
}

// ── Pill button helper ─────────────────────────────────────────
function _jlPill(label, key, active, handler) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.mes = key ?? 'null';
    btn.textContent = label;
    btn.style.cssText = [
        'padding:4px 12px;border-radius:20px;cursor:pointer',
        'font-size:11px;font-weight:600;transition:all .15s;white-space:nowrap;border:1.5px solid',
        active
            ? `background:${JL_TEAL};color:#000;border-color:${JL_TEAL}`
            : `background:transparent;color:var(--gris-200);border-color:rgba(20,184,166,.35)`,
    ].join(';');
    btn.onclick = () => handler(key);
    return btn;
}

// ── Helper: card ───────────────────────────────────────────────
function _jlCard(chartId, titleHtml, minHeight = 230) {
    const wrap = document.createElement('div');
    wrap.style.cssText = [
        'background:var(--gris-700);border:1px solid var(--gris-600)',
        'border-radius:10px;overflow:hidden;border-top:2px solid rgba(20,184,166,.3)',
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
    return {wrap, body, chart};
}

// ── ApexCharts base options ────────────────────────────────────
function _jlBaseOpts(dark) {
    return {
        chart: {height:230, toolbar:{show:false}, background:'transparent', animations:{enabled:false}},
        theme: {mode: dark ? 'dark' : 'light'},
        grid:  {borderColor: dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.08)', strokeDashArray:3},
        yaxis: {labels:{style:{colors: dark ? '#b0b8c8' : '#374151', fontSize:'11px'}, formatter: v => typeof v === 'number' ? v.toFixed(1) : v}},
        tooltip:{theme: dark ? 'dark' : 'light'},
    };
}

// ── Formato minutos → "Xh Ym" ─────────────────────────────────
function _jlFmtMin(min) {
    if (!min || isNaN(min)) return '—';
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Utilidades ─────────────────────────────────────────────────
function _jlDestroyAll() {
    Object.keys(_jlCharts).forEach(k => {
        if (_jlCharts[k]) { try { _jlCharts[k].destroy(); } catch(_){} _jlCharts[k] = null; }
    });
    _jlCharts = {};
    // Limpiar contenedores de charts dinámicos
    ['jlDescChart'].forEach(id => { const e=document.getElementById(id); if(e) e.innerHTML=''; });
}

function _jlShowEmpty(html) {
    ['jlContent','jlLoading'].forEach(id => { const e=document.getElementById(id); if(e) e.style.display='none'; });
    const e = document.getElementById('jlEmpty');
    if (e) {
        if (html) e.innerHTML = `<div style="text-align:center;padding:40px;color:var(--gris-400);line-height:1.8">${html}</div>`;
        e.style.display = '';
    }
}
function _jlShowLoading() {
    ['jlContent','jlEmpty'].forEach(id => { const e=document.getElementById(id); if(e) e.style.display='none'; });
    const e = document.getElementById('jlLoading'); if(e) e.style.display='';
}

function jlEsc(str) {
    return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
