// ============================================================
// MÓDULO CHECKLIST DE UNIDADES
// Inspección mensual de componentes de seguridad por unidad (placa).
// Ley 29783 · NTP 350.043 (extintores) · R.M. 050-2013-TR (EPP) · R.M. 1275-2021-SA
// ============================================================

let _chkTab = 'inspecciones';
let _chkData = [];
let _chkComp = [];          // componentes + items (para el form y config)
let _chkPag = 1;
const CHK_PAGE = 20;
let _chkBuscarTimer = null, _chkPlacaTimer = null;
let _chkFirma = '';         // dataURL de la firma en edición

const CHK_EST = {
  apto: ['badge-success', 'Apto'], observado: ['badge-warning', 'Observado'], no_apto: ['badge-danger', 'No apto'],
};
function _chkAdmin() { return typeof USER_ROL !== 'undefined' && USER_ROL === 'administrador'; }
function _chkFecha(f) { if (!f) return '—'; const m = String(f).split('-'); return m.length === 3 ? m[2] + '/' + m[1] + '/' + m[0] : f; }
function _chkEsc(s) { return (typeof escapeHtml === 'function') ? escapeHtml(s) : String(s == null ? '' : s); }

function _chkPagBar(total, pagina, porPag, fn) {
  const totalPags = Math.max(1, Math.ceil(total / porPag));
  const desde = total ? (pagina - 1) * porPag + 1 : 0, hasta = Math.min(pagina * porPag, total);
  let pags = [];
  if (totalPags <= 7) pags = Array.from({ length: totalPags }, (_, i) => i + 1);
  else { pags = [1]; if (pagina > 3) pags.push('…'); for (let p = Math.max(2, pagina - 1); p <= Math.min(totalPags - 1, pagina + 1); p++) pags.push(p); if (pagina < totalPags - 2) pags.push('…'); pags.push(totalPags); }
  const btns = `<button onclick="${fn}(${pagina - 1})" ${pagina === 1 ? 'disabled' : ''}>&#8249;</button>` +
    pags.map(p => p === '…' ? '<button disabled style="border:none;background:none">…</button>' : `<button class="${p === pagina ? 'active' : ''}" onclick="${fn}(${p})">${p}</button>`).join('') +
    `<button onclick="${fn}(${pagina + 1})" ${pagina === totalPags ? 'disabled' : ''}>&#8250;</button>`;
  return '<div class="amon-pag-bar"><span class="amon-pag-info">' + (total ? `Mostrando ${desde}–${hasta} de ${total}` : '') + '</span><div class="amon-pag-btns">' + (totalPags > 1 ? btns : '') + '</div></div>';
}
function irChkPagina(n) { _chkPag = n; renderChecklist(); }

function initChecklist() {
  const p = document.getElementById('chkFiltroPeriodo');
  if (p && !p.value) p.value = new Date().toISOString().slice(0, 7);
  const dm = document.getElementById('chkDashMes');
  if (dm && !dm.value) dm.value = new Date().toISOString().slice(0, 7);
  // Carga el catálogo de componentes una vez.
  _chkCargarComponentes().then(() => { _chkLlenarSelects(); switchChkTab('dashboard'); });
}

async function _chkCargarComponentes(todos) {
  try {
    const r = await fetch('api/checklist.php?action=componentes' + (todos ? '&todos=1' : ''));
    const d = await r.json();
    _chkComp = (d && d.success && d.data && d.data.componentes) ? d.data.componentes : [];
  } catch (e) { _chkComp = []; }
}

function switchChkTab(tab) {
  _chkTab = tab; _chkPag = 1;
  document.querySelectorAll('.chk-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('chk-btn-' + tab)?.classList.add('active');
  const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? '' : 'none'; };
  show('chkFiltros', tab === 'inspecciones' || tab === 'cumplimiento');
  show('chkKpis', tab === 'cumplimiento');
  show('chkBtnNueva', tab === 'inspecciones');
  show('chkFiltroEstadoWrap', tab === 'inspecciones');
  show('chkFiltroEquipoWrap', tab === 'inspecciones');
  show('chkFiltroQWrap', tab === 'inspecciones');
  show('chkFiltroTipoWrap', tab === 'cumplimiento');
  show('chkDashboard', tab === 'dashboard');
  show('chkTablaCard', tab !== 'dashboard');
  if (tab === 'dashboard') cargarChkDashboard();
  else if (tab === 'formularios') renderFormularios();
  else if (tab === 'inspecciones') cargarChecklist();
  else if (tab === 'cumplimiento') cargarChkCumplimiento();
  else renderChkConfig();
}

// Galería de formularios (un equipo por tarjeta) — inicia una inspección al clic.
async function renderFormularios() {
  const wrap = document.getElementById('chkTablaWrap'), pag = document.getElementById('chkPagWrap');
  if (pag) pag.innerHTML = '';
  await _chkCargarComponentes();
  _chkLlenarSelects();
  const activos = _chkComp.filter(c => +c.activo !== 0);
  if (!activos.length) { wrap.innerHTML = '<p class="muted" style="padding:20px">Sin formularios. Crea equipos en Configuración.</p>'; return; }
  wrap.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(258px,1fr));gap:14px;padding:14px">' +
    activos.map(c => {
      const code = 'CHK-' + String(c.id).padStart(3, '0');
      return `<div onclick="nuevaInspeccion(${c.id})" style="cursor:pointer;background:var(--gris-800);border:1px solid var(--gris-600);border-radius:10px;padding:16px;transition:border-color .15s" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--gris-600)'">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <span class="muted" style="font-size:11px;letter-spacing:.5px">${code}</span>
          <span class="badge badge-secondary"><i class="fas fa-rotate"></i> ${+c.n_inspecciones} usos</span>
        </div>
        <div style="font-weight:700;color:var(--gris-100);font-size:15px;margin-bottom:10px"><i class="fas fa-clipboard-check" style="color:var(--primary)"></i> Inspección de ${_chkEsc(c.nombre)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <span class="badge badge-info"><i class="fas fa-list-ol"></i> ${+c.n_items} preguntas</span>
          <span class="badge badge-secondary"><i class="fas fa-calendar-days"></i> Mensual</span>
        </div>
        <div style="margin-top:12px"><span class="btn btn-outline btn-sm" style="pointer-events:none"><i class="fas fa-plus"></i> Nueva inspección</span></div>
      </div>`;
    }).join('') + '</div>';
}

function chkRecargar() { if (_chkTab === 'cumplimiento') cargarChkCumplimiento(); else cargarChecklist(); }
function chkBuscarDebounced() { clearTimeout(_chkBuscarTimer); _chkBuscarTimer = setTimeout(cargarChecklist, 300); }

// ── Inspecciones ──
async function cargarChecklist() {
  const per = document.getElementById('chkFiltroPeriodo')?.value || '';
  const estado = document.getElementById('chkFiltroEstado')?.value || '';
  const q = document.getElementById('chkFiltroQ')?.value.trim() || '';
  const equipo = document.getElementById('chkFiltroEquipo')?.value || '';
  const params = new URLSearchParams({ action: 'list' });
  if (per) params.set('periodo', per);
  if (equipo) params.set('componente_id', equipo);
  if (estado) params.set('estado', estado);
  if (q) params.set('q', q);
  try {
    const r = await fetch('api/checklist.php?' + params);
    const d = await r.json();
    _chkData = (d && d.success && d.data && d.data.items) ? d.data.items : [];
  } catch (e) { _chkData = []; }
  _chkPag = 1;
  renderChecklist();
}

function renderChecklist() {
  const wrap = document.getElementById('chkTablaWrap'), pag = document.getElementById('chkPagWrap');
  if (!wrap) return;
  if (!_chkData.length) { wrap.innerHTML = '<p class="muted" style="text-align:center;padding:28px">Sin inspecciones. Crea una con “Nueva inspección”.</p>'; if (pag) pag.innerHTML = ''; return; }
  const total = _chkData.length, totalPags = Math.max(1, Math.ceil(total / CHK_PAGE));
  if (_chkPag > totalPags) _chkPag = totalPags;
  const rows = _chkData.slice((_chkPag - 1) * CHK_PAGE, _chkPag * CHK_PAGE);
  const body = rows.map(x => {
    const est = CHK_EST[x.estado] || ['badge-secondary', x.estado];
    const nc = +x.no_conformes;
    const evaluados = (+x.total_items) - (+x.na);
    const pct = evaluados > 0 ? Math.round(+x.conformes / evaluados * 100) : (+x.total_items ? 100 : 0);
    const pcol = pct === 100 ? 'var(--verde)' : pct >= 80 ? 'var(--naranja)' : 'var(--rojo)';
    const del = _chkAdmin() ? `<button class="btn btn-outline btn-sm" onclick="eliminarInspeccion(${x.id})" title="Eliminar"><i class="fas fa-trash" style="color:var(--rojo)"></i></button>` : '';
    return `<tr>
      <td class="muted" style="white-space:nowrap">${_chkFecha(x.fecha)}</td>
      <td style="font-weight:600;color:var(--gris-100)">${_chkEsc(x.inspector_nombre || '—')}</td>
      <td><span class="badge badge-info">${_chkEsc(x.equipo || '—')}</span></td>
      <td style="font-weight:700;color:var(--gris-100)">${_chkEsc(x.placa)}</td>
      <td class="muted">${_chkEsc(x.periodo)}</td>
      <td><span class="badge ${est[0]}">${est[1]}</span></td>
      <td style="text-align:right;font-weight:700;color:${pcol};font-variant-numeric:tabular-nums">${pct}%</td>
      <td style="text-align:center">${nc > 0 ? '<span class="badge badge-danger">' + nc + '</span>' : '—'}</td>
      <td style="text-align:right;white-space:nowrap">
        <button class="btn btn-outline btn-sm" onclick="editarInspeccion(${x.id})" title="Editar"><i class="fas fa-pen"></i></button>
        <button class="btn btn-outline btn-sm" onclick="chkVerPdf(${x.id})" title="Registro PDF"><i class="fas fa-print"></i></button>
        ${del}
      </td></tr>`;
  }).join('');
  wrap.innerHTML = `<table class="data-table" style="min-width:860px"><thead><tr>
    <th>Fecha</th><th>Inspector</th><th>Equipo</th><th>Unidad</th><th>Mes</th><th>Estado</th><th style="text-align:right">%</th><th style="text-align:center">No conf.</th><th style="text-align:right">Acciones</th>
    </tr></thead><tbody>${body}</tbody></table>`;
  if (pag) pag.innerHTML = _chkPagBar(total, _chkPag, CHK_PAGE, 'irChkPagina');
}

// ── Cumplimiento: matriz placas × equipos ──
let _chkCumpTipoInit = false;   // preselecciona "camión" una sola vez
async function cargarChkCumplimiento() {
  const per = document.getElementById('chkFiltroPeriodo')?.value || '';
  const tipo = document.getElementById('chkFiltroTipo')?.value || '';
  const wrap = document.getElementById('chkTablaWrap');
  if (wrap) wrap.innerHTML = '<p class="muted" style="text-align:center;padding:28px">Cargando…</p>';
  let data = { componentes: [], placas: [], inspecciones: {}, tipos: [], periodo: per };
  try {
    const qs = 'action=cumplimiento' + (per ? '&periodo=' + per : '') + (tipo ? '&tipo=' + encodeURIComponent(tipo) : '');
    const r = await fetch('api/checklist.php?' + qs);
    const d = await r.json();
    if (d && d.success) data = d.data;
  } catch (e) {}
  if (_chkLlenarTipos(data.tipos || [], data.tipo || '')) return;   // se disparó una recarga con el tipo por defecto
  renderChkCumplimiento(data);
}

// Rellena el filtro "Tipo de unidad" y, la primera vez, preselecciona camión.
// Devuelve true si preseleccionó un tipo y disparó una nueva carga (evita render doble).
function _chkLlenarTipos(tipos, actual) {
  const sel = document.getElementById('chkFiltroTipo');
  if (!sel) return false;
  if (sel.options.length <= 1 && tipos.length) {
    sel.innerHTML = '<option value="">Todos</option>' + tipos.map(t => `<option value="${_chkEsc(t)}">${_chkEsc(t)}</option>`).join('');
    if (!_chkCumpTipoInit && !actual) {
      const cam = tipos.find(t => /cami[oó]n(?!eta)/i.test(t));
      if (cam) { sel.value = cam; _chkCumpTipoInit = true; cargarChkCumplimiento(); return true; }
    }
  }
  if (actual) sel.value = actual;
  _chkCumpTipoInit = true;
  return false;
}

function renderChkCumplimiento(data) {
  const wrap = document.getElementById('chkTablaWrap'), pag = document.getElementById('chkPagWrap');
  const kpis = document.getElementById('chkKpis');
  if (pag) pag.innerHTML = '';
  const comps = data.componentes || [], placas = data.placas || [], mapa = data.inspecciones || {};
  const totalUnid = placas.length, totalEquipos = comps.length;

  let completas = 0, hechas = 0;
  placas.forEach(p => {
    const m = mapa[(p.placa || '').toUpperCase()] || {};
    const n = comps.filter(c => m[c.id] !== undefined).length;
    hechas += n;
    if (totalEquipos && n === totalEquipos) completas++;
  });
  const totalCeldas = totalUnid * totalEquipos;
  const cobertura = totalCeldas ? Math.round(hechas / totalCeldas * 100) : 0;

  if (kpis) kpis.innerHTML =
    _chkKpi('azul', 'fa-truck', 'Unidades', totalUnid, 'en ' + (data.periodo || '')) +
    _chkKpi(completas === totalUnid && totalUnid ? 'verde' : 'amarillo', 'fa-circle-check', 'Completas', completas, 'con todos los equipos') +
    _chkKpi(cobertura === 100 ? 'verde' : cobertura >= 60 ? 'amarillo' : 'rojo', 'fa-list-check', 'Cobertura', cobertura + '%', hechas + ' de ' + totalCeldas + ' inspecciones');

  if (!totalEquipos) { wrap.innerHTML = '<p class="muted" style="text-align:center;padding:28px">No hay equipos activos. Créalos en Configuración.</p>'; return; }
  if (!totalUnid) { wrap.innerHTML = '<p class="muted" style="text-align:center;padding:28px">No hay unidades para mostrar.</p>'; return; }

  const th = comps.map(c => `<th style="text-align:center;min-width:64px"><span style="writing-mode:horizontal-tb;font-size:11px;font-weight:700;color:var(--gris-200)">${_chkEsc(c.nombre)}</span></th>`).join('');
  const body = placas.map(p => {
    const placa = (p.placa || '').toString();
    const m = mapa[placa.toUpperCase()] || {};
    const cells = comps.map(c => {
      const est = m[c.id];
      if (est === undefined)
        return '<td style="text-align:center"><i class="fas fa-xmark" style="color:var(--rojo);opacity:.55" title="Falta inspeccionar"></i></td>';
      const col = est === 'no_apto' ? 'var(--rojo)' : est === 'observado' ? 'var(--naranja)' : 'var(--verde)';
      const lbl = (CHK_EST[est] || ['', est])[1];
      return `<td style="text-align:center"><i class="fas fa-circle-check" style="color:${col}" title="Inspeccionado · ${lbl}"></i></td>`;
    }).join('');
    const n = comps.filter(c => m[c.id] !== undefined).length;
    const avCol = n === totalEquipos ? 'var(--verde)' : n === 0 ? 'var(--rojo)' : 'var(--naranja)';
    const extra = [p.marca, p.modelo].filter(Boolean).join(' ');
    return `<tr>
      <td style="position:sticky;left:0;background:var(--surface);z-index:1">
        <div style="font-weight:700;color:var(--gris-100)">${_chkEsc(placa)}</div>
        ${extra ? '<div class="muted" style="font-size:11px">' + _chkEsc(extra) + '</div>' : ''}
      </td>
      ${cells}
      <td style="text-align:center;font-weight:700;font-variant-numeric:tabular-nums;color:${avCol}">${n}/${totalEquipos}</td>
    </tr>`;
  }).join('');

  wrap.innerHTML = `<table class="data-table" style="min-width:${260 + totalEquipos * 64}px">
    <thead><tr><th style="position:sticky;left:0;background:var(--surface);z-index:2">Unidad</th>${th}<th style="text-align:center">Avance</th></tr></thead>
    <tbody>${body}</tbody></table>`;
}
function _chkKpi(color, icon, label, value, sub) {
  return `<div class="kpi-card ${color}"><div class="kpi-label">${label}</div><div class="kpi-value ${color}">${value}</div><div class="kpi-sub">${sub}</div><i class="fas ${icon} kpi-icon"></i></div>`;
}

// ── Dashboard de inspección de equipos ──
const CHK_COL = { verde: '#2EB85C', rojo: '#E55353', amarillo: '#F9B115', naranja: '#F9B115', azul: '#1565C0', gris: 'rgba(150,150,150,.5)' };
let _chkChartTend = null, _chkChartEstado = null, _chkChartEquipo = null;
let _chkDashSelInit = false;

async function cargarChkDashboard() {
  const mes = document.getElementById('chkDashMes')?.value || new Date().toISOString().slice(0, 7);
  const tipo = document.getElementById('chkDashTipo')?.value || '';
  const comp = document.getElementById('chkDashEquipo')?.value || '';
  const kpiG = document.getElementById('chkDashKpis');
  if (kpiG) kpiG.innerHTML = Array(6).fill('<div class="dash-kpi-skeleton"></div>').join('');
  let d = null;
  try {
    const qs = 'action=dashboard&periodo=' + mes + (tipo ? '&tipo=' + encodeURIComponent(tipo) : '') + (comp ? '&componente_id=' + comp : '') + '&_t=' + Date.now();
    const r = await fetch('api/checklist.php?' + qs);
    const j = await r.json();
    if (j && j.success) d = j.data;
  } catch (e) { console.error(e); }
  if (!d) { if (kpiG) kpiG.innerHTML = '<p class="muted" style="padding:20px">No se pudo cargar el dashboard.</p>'; return; }
  if (_chkDashLlenarSelects(d)) return;   // se autoseleccionó camión y disparó recarga
  renderChkDashKpis(d);
  renderChkDashTend(d.tendencia || []);
  renderChkDashEstado(d.estado || {});
  renderChkDashEquipo(d.por_equipo || []);
  renderChkDashTopNc(d.top_nc || []);
  renderChkDashNoAptas(d.no_aptas_list || []);
  renderChkDashNc(d.nc_list || []);
  renderChkDashSinInsp(d.sin_inspeccion || []);
}

// Llena los filtros y, la primera vez, preselecciona camión.
// Devuelve true si preseleccionó camión y disparó una nueva carga (evita render doble).
function _chkDashLlenarSelects(d) {
  const st = document.getElementById('chkDashTipo');
  const se = document.getElementById('chkDashEquipo');
  if (!_chkDashSelInit) {
    if (st && (d.tipos || []).length) st.innerHTML = '<option value="">Todos</option>' + d.tipos.map(t => `<option value="${_chkEsc(t)}">${_chkEsc(t)}</option>`).join('');
    if (se && (d.componentes || []).length) se.innerHTML = '<option value="">Todos</option>' + d.componentes.map(c => `<option value="${c.id}">${_chkEsc(c.nombre)}</option>`).join('');
    if (st && !d.tipo) {
      const cam = (d.tipos || []).find(t => /cami[oó]n(?!eta)/i.test(t));
      if (cam) { st.value = cam; _chkDashSelInit = true; cargarChkDashboard(); return true; }
    }
    _chkDashSelInit = true;
  }
  if (d.tipo && st) st.value = d.tipo;
  return false;
}

// Tarjeta KPI (estilo dashboard general). worseUp: true si subir es malo.
function _chkDashKpi(icon, color, label, value, sub, delta, suf, worseUp) {
  let dh = '';
  if (delta !== null && delta !== undefined && !isNaN(delta)) {
    const up = delta > 0, down = delta < 0;
    const bueno = worseUp ? down : up;
    const cls = delta === 0 ? 'neutro' : (bueno ? 'positivo' : 'negativo');
    dh = `<span class="dash-kpi-delta ${cls}"><i class="fas fa-caret-${up ? 'up' : down ? 'down' : 'right'}"></i> ${up ? '+' : ''}${delta}${suf || ''} vs mes ant.</span>`;
  }
  return `<div class="dash-kpi-card">
    <div class="dash-kpi-top"><span class="dash-kpi-label">${label}</span><i class="${icon} dash-kpi-icon ${color}"></i></div>
    <div class="dash-kpi-value ${color}">${value}</div>
    <div class="dash-kpi-sub">${sub}</div>${dh}</div>`;
}

function renderChkDashKpis(d) {
  const k = d.kpis || {}, a = d.kpisAnt || {};
  const cob = +k.cobertura || 0, cobA = +a.cobertura || 0;
  const na = +k.no_aptas || 0, naA = +a.no_aptas || 0;
  const nc = +k.no_conformidades || 0, ncA = +a.no_conformidades || 0;
  const unid = +k.unidades || 0, aptas = +k.aptas || 0;
  const aptaPct = unid ? Math.round(aptas / unid * 100) : 0;
  const cards =
    _chkDashKpi('fas fa-list-check', cob >= 95 ? 'verde' : cob >= 60 ? 'naranja' : 'rojo', 'Cobertura mensual', cob + '%',
      `${k.inspecciones || 0} de ${k.celdas_total || 0} inspecciones`, cobA ? cob - cobA : null, 'pp', false) +
    _chkDashKpi('fas fa-circle-check', aptaPct >= 80 ? 'verde' : aptaPct >= 60 ? 'naranja' : 'rojo', 'Flota apta', aptaPct + '%',
      `${aptas} de ${unid} unidades`, null, '', false) +
    _chkDashKpi('fas fa-ban', na > 0 ? 'rojo' : 'verde', 'Unidades no aptas', na,
      'requieren acción', naA !== undefined ? na - naA : null, '', true) +
    _chkDashKpi('fas fa-triangle-exclamation', nc > 0 ? 'naranja' : 'verde', 'No conformidades', nc,
      'ítems no conformes', ncA !== undefined ? nc - ncA : null, '', true) +
    _chkDashKpi('fas fa-circle-question', (+k.sin_inspeccion || 0) > 0 ? 'rojo' : 'verde', 'Sin inspeccionar', +k.sin_inspeccion || 0,
      'unidades este mes', null, '', true) +
    _chkDashKpi('fas fa-truck', 'azul', 'Unidades', unid, `${k.equipos || 0} equipos activos`, null, '', false);
  document.getElementById('chkDashKpis').innerHTML = cards;
}

function _chkDashTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  return { grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', tick: isDark ? '#888' : '#999', txt: isDark ? '#e8e8e8' : '#333' };
}
function _chkPerLabel(p) { const m = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic']; const s = String(p).split('-'); return s.length === 2 ? m[+s[1] - 1] + ' ' + s[0].slice(2) : p; }

function renderChkDashTend(tend) {
  const ctx = document.getElementById('chkChartTend')?.getContext('2d'); if (!ctx) return;
  if (_chkChartTend) { _chkChartTend.destroy(); _chkChartTend = null; }
  const t = _chkDashTheme();
  const pluginTend = {
    id: 'chkTendLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save();
      ctx.font = '700 11px sans-serif'; ctx.textAlign = 'center';
      // Cobertura % sobre la línea
      chart.getDatasetMeta(1).data.forEach((pt, i) => {
        const v = chart.data.datasets[1].data[i]; if (v == null) return;
        ctx.fillStyle = CHK_COL.verde; ctx.textBaseline = 'bottom';
        ctx.fillText(v + '%', pt.x, pt.y - 6);
      });
      // Inspecciones sobre las barras
      chart.getDatasetMeta(0).data.forEach((bar, i) => {
        const v = chart.data.datasets[0].data[i]; if (!v) return;
        ctx.fillStyle = t.txt; ctx.textBaseline = 'bottom';
        ctx.fillText(v, bar.x, bar.y - 3);
      });
      ctx.restore();
    }
  };
  _chkChartTend = new Chart(ctx, {
    plugins: [pluginTend],
    data: {
      labels: tend.map(x => _chkPerLabel(x.periodo)),
      datasets: [
        { type: 'bar', label: 'Inspecciones', data: tend.map(x => +x.inspecciones || 0), backgroundColor: 'rgba(21,101,192,0.5)', borderColor: CHK_COL.azul, borderWidth: 1, borderRadius: 4, yAxisID: 'y' },
        { type: 'line', label: 'Cobertura %', data: tend.map(x => +x.cobertura || 0), borderColor: CHK_COL.verde, backgroundColor: 'rgba(46,184,92,0.08)', tension: 0.4, fill: true, pointBackgroundColor: CHK_COL.verde, pointRadius: 3, yAxisID: 'y1' },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.dataset.yAxisID === 'y1' ? ` ${c.raw}% cobertura` : ` ${c.raw} inspección${c.raw !== 1 ? 'es' : ''}` } } },
      scales: {
        x: { ticks: { color: t.tick, font: { size: 11 } }, grid: { color: t.grid } },
        y: { min: 0, ticks: { color: t.tick, stepSize: 1, font: { size: 11 } }, grid: { color: t.grid } },
        y1: { position: 'right', min: 0, max: 100, ticks: { color: CHK_COL.verde, callback: v => v + '%', font: { size: 11 } }, grid: { display: false } },
      }
    }
  });
  const leg = document.getElementById('chkDashTendLeg');
  if (leg) leg.innerHTML = `<span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:12px;background:${CHK_COL.azul};border-radius:2px"></span>Inspecciones</span>
    <span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:3px;background:${CHK_COL.verde};border-radius:2px"></span>Cobertura</span>`;
}

function renderChkDashEstado(est) {
  const ctx = document.getElementById('chkChartEstado')?.getContext('2d'); if (!ctx) return;
  if (_chkChartEstado) { _chkChartEstado.destroy(); _chkChartEstado = null; }
  const apto = +est.apto || 0, obs = +est.observado || 0, noApto = +est.no_apto || 0;
  const tot = apto + obs + noApto;
  document.getElementById('chkEstadoPct').textContent = (tot ? Math.round(apto / tot * 100) : 0) + '%';
  const pluginEstado = {
    id: 'chkEstadoLabels',
    afterDatasetsDraw(chart) {
      if (!tot) return;
      const { ctx } = chart;
      ctx.save(); ctx.font = '700 12px sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      chart.getDatasetMeta(0).data.forEach((arc, i) => {
        const v = chart.data.datasets[0].data[i]; if (!v) return;
        const p = arc.getCenterPoint();
        ctx.fillText(v, p.x, p.y);
      });
      ctx.restore();
    }
  };
  _chkChartEstado = new Chart(ctx, {
    type: 'doughnut',
    plugins: [pluginEstado],
    data: { labels: ['Apto', 'Observado', 'No apto'], datasets: [{ data: tot ? [apto, obs, noApto] : [1], backgroundColor: tot ? [CHK_COL.verde, CHK_COL.naranja, CHK_COL.rojo] : ['rgba(150,150,150,.15)'], borderWidth: 0, hoverOffset: 6 }] },
    options: { cutout: '72%', plugins: { legend: { display: false }, tooltip: { enabled: tot > 0, callbacks: { label: c => ` ${c.label}: ${c.raw}` } } }, animation: { animateRotate: true, duration: 600 } }
  });
  const leg = document.getElementById('chkEstadoLeg');
  if (leg) leg.innerHTML = [
    { c: CHK_COL.verde, l: 'Apto', n: apto }, { c: CHK_COL.naranja, l: 'Observado', n: obs }, { c: CHK_COL.rojo, l: 'No apto', n: noApto },
  ].map(r => `<div style="display:flex;align-items:center;justify-content:space-between;font-size:12px">
    <span style="display:flex;align-items:center;gap:7px"><span style="width:10px;height:10px;border-radius:50%;background:${r.c}"></span><span style="color:var(--gris-300)">${r.l}</span></span>
    <strong style="color:var(--gris-100)">${r.n}</strong></div>`).join('');
}

function renderChkDashEquipo(rows) {
  const ctx = document.getElementById('chkChartEquipo')?.getContext('2d'); if (!ctx) return;
  if (_chkChartEquipo) { _chkChartEquipo.destroy(); _chkChartEquipo = null; }
  const t = _chkDashTheme();
  const colores = rows.map(r => { const p = +r.pct || 0; return p >= 95 ? CHK_COL.verde : p >= 60 ? CHK_COL.naranja : CHK_COL.rojo; });
  const pluginEq = {
    id: 'chkEquipoLabels',
    afterDatasetsDraw(chart) {
      const { ctx } = chart;
      ctx.save(); ctx.font = '700 11px sans-serif'; ctx.textBaseline = 'middle';
      chart.getDatasetMeta(0).data.forEach((bar, i) => {
        const r = rows[i]; const v = +r.pct || 0;
        const txt = v + '%  ' + (r.hechas || 0) + '/' + (r.total || 0);
        if (v >= 55) { ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(txt, bar.x - 8, bar.y); }
        else { ctx.fillStyle = t.txt; ctx.textAlign = 'left'; ctx.fillText(txt, bar.x + 6, bar.y); }
      });
      ctx.restore();
    }
  };
  _chkChartEquipo = new Chart(ctx, {
    type: 'bar',
    plugins: [pluginEq],
    data: { labels: rows.map(r => r.nombre), datasets: [{ label: '% cobertura', data: rows.map(r => +r.pct || 0), backgroundColor: colores, borderRadius: 4, barThickness: 'flex', maxBarThickness: 22 }] },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => { const r = rows[c.dataIndex]; return ` ${r.pct}% · ${r.hechas}/${r.total} unidades` + (r.no_apto ? ` · ${r.no_apto} no apto` : ''); } } } },
      scales: { x: { min: 0, max: 100, ticks: { color: t.tick, callback: v => v + '%', font: { size: 11 } }, grid: { color: t.grid } }, y: { ticks: { color: t.tick, font: { size: 11 } }, grid: { display: false } } }
    }
  });
}

function renderChkDashTopNc(rows) {
  const c = document.getElementById('chkTopNc');
  if (!rows.length) { c.innerHTML = '<p class="muted" style="font-size:13px;padding:8px 0">Sin no conformidades este mes 🎉</p>'; return; }
  const max = Math.max(...rows.map(r => +r.n || 0), 1);
  c.innerHTML = rows.map(r => {
    const n = +r.n || 0, w = Math.round(n / max * 100);
    return `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:4px">
        <span style="font-size:12px;color:var(--gris-100)">${_chkEsc(r.item || '—')}</span>
        <strong style="color:var(--rojo);font-variant-numeric:tabular-nums">${n}</strong></div>
      <div style="display:flex;align-items:center;gap:8px">
        <span class="badge badge-info" style="font-size:10px">${_chkEsc(r.equipo || '—')}</span>
        <div style="flex:1;height:6px;background:var(--gris-600);border-radius:3px;overflow:hidden"><div style="height:100%;width:${w}%;background:${CHK_COL.rojo};border-radius:3px"></div></div></div>
    </div>`;
  }).join('');
}

function renderChkDashNoAptas(rows) {
  const c = document.getElementById('chkNoAptasList'), b = document.getElementById('chkNoAptasBadge');
  if (b) b.textContent = rows.length ? rows.length + ' registro' + (rows.length !== 1 ? 's' : '') : '';
  if (!rows.length) { c.innerHTML = '<p class="muted" style="font-size:13px;padding:8px 0">Ninguna unidad no apta 👍</p>'; return; }
  c.innerHTML = rows.map(x => `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
    <div style="flex:1;min-width:0">
      <div style="font-weight:700;color:var(--gris-100)">${_chkEsc(x.placa)} <span class="badge badge-danger" style="font-size:10px">${_chkEsc(x.equipo || '—')}</span></div>
      <div class="muted" style="font-size:11px">${_chkFecha(x.fecha)}${x.inspector_nombre ? ' · ' + _chkEsc(x.inspector_nombre) : ''}</div></div>
    <button class="btn btn-outline btn-sm" onclick="chkVerPdf(${x.id})" title="Registro PDF"><i class="fas fa-print"></i></button>
  </div>`).join('');
}

function renderChkDashNc(rows) {
  const c = document.getElementById('chkNcList'), b = document.getElementById('chkNcBadge');
  if (b) b.textContent = rows.length ? rows.length + ' ítem' + (rows.length !== 1 ? 's' : '') : '';
  if (!rows.length) { c.innerHTML = '<p class="muted" style="font-size:13px;padding:8px 0">Sin no conformidades este mes 🎉</p>'; return; }
  c.innerHTML = rows.map(x => `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
    <div style="display:flex;justify-content:space-between;gap:8px"><span style="font-weight:700;color:var(--gris-100)">${_chkEsc(x.placa)}</span>
      <span class="badge badge-info" style="font-size:10px">${_chkEsc(x.equipo || '—')}</span></div>
    <div style="font-size:12px;color:var(--gris-200);margin-top:2px">${_chkEsc(x.item || '—')}</div>
    ${x.obs ? '<div class="muted" style="font-size:11px;margin-top:2px"><i class="fas fa-comment-dots"></i> ' + _chkEsc(x.obs) + '</div>' : ''}
  </div>`).join('');
}

function renderChkDashSinInsp(placas) {
  const c = document.getElementById('chkSinInspList'), b = document.getElementById('chkSinInspBadge');
  if (b) b.textContent = placas.length ? placas.length + ' unidad' + (placas.length !== 1 ? 'es' : '') : '';
  if (!placas.length) { c.innerHTML = '<p class="muted" style="font-size:13px">Todas las unidades tienen al menos una inspección este mes 👍</p>'; return; }
  c.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:6px">' + placas.map(p =>
    `<span class="badge badge-secondary" style="font-size:12px;padding:4px 10px"><i class="fas fa-truck" style="opacity:.6"></i> ${_chkEsc(p)}</span>`).join('') + '</div>';
}

// ── Configuración (componentes + ítems) ──
async function renderChkConfig() {
  const wrap = document.getElementById('chkTablaWrap'), pag = document.getElementById('chkPagWrap');
  if (pag) pag.innerHTML = '';
  await _chkCargarComponentes(true);
  const puedeEditar = _chkAdmin() || (typeof USER_ROL !== 'undefined' && USER_ROL === 'supervisor');
  const topBtn = puedeEditar ? '<div style="margin-bottom:14px"><button class="btn btn-primary" onclick="chkNuevoComp()"><i class="fas fa-plus"></i> Nuevo equipo / formulario</button></div>' : '';
  if (!_chkComp.length) { wrap.innerHTML = '<div style="padding:14px">' + topBtn + '<p class="muted">Sin equipos. Crea el primero.</p></div>'; return; }
  wrap.innerHTML = '<div style="padding:14px">' + topBtn + _chkComp.map(c => {
    const items = (c.items || []).map(it =>
      `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--gris-700);${+it.activo ? '' : 'opacity:.5'}">
        <i class="fas fa-circle" style="font-size:5px;color:var(--gris-500)"></i>
        <span style="flex:1;color:var(--gris-200)">${_chkEsc(it.texto)}</span>
        ${puedeEditar ? `<button class="btn btn-outline btn-sm" onclick="chkEditarItem(${it.id},${c.id})" title="Editar"><i class="fas fa-pen"></i></button>
          <button class="btn btn-outline btn-sm" onclick="chkToggleItem(${it.id})" title="${+it.activo ? 'Desactivar' : 'Activar'}"><i class="fas fa-${+it.activo ? 'toggle-on' : 'toggle-off'}"></i></button>` : ''}
      </div>`).join('');
    return `<div class="card" style="margin-bottom:12px"><div class="card-body" style="padding:12px 16px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <strong style="color:var(--gris-100)"><i class="fas fa-cube" style="color:var(--primary)"></i> ${_chkEsc(c.nombre)}${+c.activo ? '' : ' <span class="badge badge-secondary">inactivo</span>'}</strong>
        ${puedeEditar ? `<div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm" onclick="chkEditarComp(${c.id})" title="Renombrar equipo"><i class="fas fa-pen"></i></button>
          <button class="btn btn-outline btn-sm" onclick="chkToggleComp(${c.id})" title="${+c.activo ? 'Desactivar' : 'Activar'}"><i class="fas fa-${+c.activo ? 'toggle-on' : 'toggle-off'}"></i></button>
          <button class="btn btn-primary btn-sm" onclick="chkNuevoItem(${c.id})"><i class="fas fa-plus"></i> Pregunta</button>
        </div>` : ''}
      </div>${items || '<span class="muted" style="font-size:12px">Sin preguntas.</span>'}
    </div></div>`;
  }).join('') + '</div>';
}
function chkNuevoItem(compId) { _chkAbrirItem(0, compId, ''); }
function chkEditarItem(id, compId) {
  const c = _chkComp.find(k => +k.id === +compId); const it = c && (c.items || []).find(k => +k.id === +id);
  _chkAbrirItem(id, compId, it ? it.texto : '');
}
function _chkAbrirItem(id, compId, texto) {
  document.getElementById('chkItemTitulo').textContent = id ? 'Editar ítem' : 'Nuevo ítem';
  document.getElementById('chk_item_id').value = id || '';
  document.getElementById('chk_item_comp').value = compId;
  document.getElementById('chk_item_texto').value = texto || '';
  abrirModal('modalChkItem');
}
async function chkGuardarItem() {
  const texto = document.getElementById('chk_item_texto').value.trim();
  if (!texto) { toast('Escribe el ítem', 'warning'); return; }
  const r = await _chkPost({ action: 'item_save', id: document.getElementById('chk_item_id').value || '0', componente_id: document.getElementById('chk_item_comp').value, texto });
  if (r && r.success) { toast('Ítem guardado', 'success'); cerrarModal('modalChkItem'); renderChkConfig(); }
}
async function chkToggleItem(id) { const r = await _chkPost({ action: 'item_toggle', id }); if (r && r.success) renderChkConfig(); }

// Equipos (componentes / formularios)
function chkNuevoComp() { _chkAbrirComp(0, ''); }
function chkEditarComp(id) { const c = _chkComp.find(k => +k.id === +id); _chkAbrirComp(id, c ? c.nombre : ''); }
function _chkAbrirComp(id, nombre) {
  document.getElementById('chkCompTitulo').textContent = id ? 'Editar equipo' : 'Nuevo equipo / formulario';
  document.getElementById('chk_comp_id').value = id || '';
  document.getElementById('chk_comp_nombre').value = nombre || '';
  abrirModal('modalChkComp');
}
async function chkGuardarComp() {
  const nombre = document.getElementById('chk_comp_nombre').value.trim();
  if (!nombre) { toast('Escribe el nombre del equipo', 'warning'); return; }
  const r = await _chkPost({ action: 'comp_save', id: document.getElementById('chk_comp_id').value || '0', nombre });
  if (r && r.success) { toast('Equipo guardado', 'success'); cerrarModal('modalChkComp'); renderChkConfig(); }
}
async function chkToggleComp(id) { const r = await _chkPost({ action: 'comp_toggle', id }); if (r && r.success) renderChkConfig(); }

// ── Modal de inspección ──
async function nuevaInspeccion(compId) {
  document.getElementById('chkModalTitulo').textContent = 'Nueva inspección';
  document.getElementById('chk_id').value = '';
  document.getElementById('chk_placa').value = '';
  document.getElementById('chk_periodo').value = document.getElementById('chkFiltroPeriodo')?.value || new Date().toISOString().slice(0, 7);
  document.getElementById('chk_fecha').value = new Date().toISOString().slice(0, 10);
  document.getElementById('chk_estado').value = 'apto';
  document.getElementById('chk_observacion').value = '';
  _chkFirma = ''; _chkFirmaEstado();
  _chkFotosPend = []; _chkFotosExist = []; _chkRenderFotos();
  if (!_chkComp.length) await _chkCargarComponentes();
  _chkPrevRes = {};
  _chkLlenarSelects();
  const pre = compId || document.getElementById('chkFiltroEquipo')?.value;
  if (pre) document.getElementById('chk_componente').value = pre;   // equipo pre-seleccionado
  chkRenderItemsSel();
  abrirModal('modalChkInsp');
}

async function editarInspeccion(id) {
  try {
    const r = await fetch('api/checklist.php?action=get&id=' + id);
    const d = await r.json();
    if (!d.success) { toast(d.message || 'No encontrada', 'error'); return; }
    const x = d.data;
    document.getElementById('chkModalTitulo').textContent = 'Editar inspección · ' + x.placa;
    document.getElementById('chk_id').value = x.id;
    document.getElementById('chk_placa').value = x.placa || '';
    document.getElementById('chk_periodo').value = x.periodo || '';
    document.getElementById('chk_fecha').value = x.fecha || '';
    document.getElementById('chk_estado').value = x.estado || 'apto';
    document.getElementById('chk_observacion').value = x.observacion || '';
    _chkFirma = x.firma || ''; _chkFirmaEstado();
    _chkFotosExist = x.fotos || []; _chkFotosPend = []; _chkRenderFotos();
    if (!_chkComp.length) await _chkCargarComponentes();
    _chkPrevRes = {};
    (x.resultados || []).forEach(r => { _chkPrevRes[+r.item_id] = { resultado: r.resultado, observacion: r.observacion || '' }; });
    _chkLlenarSelects();
    document.getElementById('chk_componente').value = x.componente_id || '';
    chkRenderItemsSel();
    abrirModal('modalChkInsp');
  } catch (e) { toast('Error al cargar', 'error'); }
}

// Llena los <select> de equipo (modal + filtro) con los componentes activos.
let _chkPrevRes = {};
function _chkLlenarSelects() {
  const activos = _chkComp.filter(c => +c.activo !== 0);
  const opts = activos.map(c => `<option value="${c.id}">${_chkEsc(c.nombre)}</option>`).join('');
  const sm = document.getElementById('chk_componente'); if (sm) sm.innerHTML = opts;
  const sf = document.getElementById('chkFiltroEquipo');
  if (sf) { const prev = sf.value; sf.innerHTML = '<option value="">Todos</option>' + opts; sf.value = prev; }
}

// Renderiza los ítems (banco de preguntas) del equipo seleccionado en el modal.
function chkRenderItemsSel() {
  const cont = document.getElementById('chkItemsCont');
  if (!cont) return;
  const compId = +(document.getElementById('chk_componente')?.value || 0);
  const c = _chkComp.find(k => +k.id === compId);
  if (!c) { cont.innerHTML = '<p class="muted" style="padding:12px">Selecciona un equipo.</p>'; return; }
  const prev = _chkPrevRes || {};
  const items = (c.items || []).filter(it => +it.activo !== 0).map(it => {
    const cur = prev[+it.id] ? prev[+it.id].resultado : 'conforme';
    const obs = prev[+it.id] ? (prev[+it.id].observacion || '') : '';
    const radio = (val, lbl, color) =>
      `<label style="display:inline-flex;align-items:center;gap:3px;cursor:pointer;color:${color}"><input type="radio" name="chkit_${it.id}" value="${val}" ${cur === val ? 'checked' : ''} style="accent-color:${color}"> ${lbl}</label>`;
    return `<div class="chk-item-row" data-item="${it.id}" data-comp="${c.id}" style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--gris-700);flex-wrap:wrap">
      <span style="flex:1;min-width:180px;color:var(--gris-200);font-size:12.5px">${_chkEsc(it.texto)}</span>
      <span style="display:flex;gap:10px;font-size:12px">${radio('conforme', 'C', 'var(--verde)')}${radio('no_conforme', 'NC', 'var(--rojo)')}${radio('na', 'N/A', 'var(--gris-400)')}</span>
      <input type="text" class="form-control chk-item-obs" placeholder="Observación" value="${_chkEsc(obs)}" style="width:180px;font-size:12px;padding:4px 8px">
    </div>`;
  }).join('');
  cont.innerHTML = `<div class="card"><div class="card-body" style="padding:10px 14px">
    <strong style="color:var(--gris-100);font-size:13px"><i class="fas fa-cube" style="color:var(--primary)"></i> Banco de preguntas · ${_chkEsc(c.nombre)}</strong>
    <div style="margin-top:4px">${items || '<span class="muted" style="font-size:12px">Sin preguntas. Agrégalas en Configuración.</span>'}</div>
  </div></div>`;
}

function chkMarcarTodo(val) {
  document.querySelectorAll('.chk-item-row').forEach(row => {
    const id = row.getAttribute('data-item');
    const rb = row.querySelector('input[name="chkit_' + id + '"][value="' + val + '"]');
    if (rb) rb.checked = true;
  });
}

async function guardarInspeccion() {
  const compId = document.getElementById('chk_componente').value;
  if (!compId) { toast('Selecciona el equipo a inspeccionar', 'warning'); return; }
  const placa = document.getElementById('chk_placa').value.trim().toUpperCase();
  if (!placa) { toast('Indica la placa de la unidad', 'warning'); return; }
  const periodo = document.getElementById('chk_periodo').value;
  if (!/^\d{4}-\d{2}$/.test(periodo)) { toast('Selecciona el mes', 'warning'); return; }
  const resultados = [];
  document.querySelectorAll('.chk-item-row').forEach(row => {
    const id = +row.getAttribute('data-item'), comp = +row.getAttribute('data-comp');
    const sel = row.querySelector('input[name="chkit_' + id + '"]:checked');
    resultados.push({ item_id: id, componente_id: comp, resultado: sel ? sel.value : 'conforme', observacion: (row.querySelector('.chk-item-obs')?.value || '').trim() });
  });
  if (!resultados.length) { toast('No hay ítems para evaluar', 'warning'); return; }

  const btn = document.getElementById('chkGuardarBtn'); if (btn) btn.disabled = true;
  const r = await _chkPost({
    action: 'save', id: document.getElementById('chk_id').value || '0',
    componente_id: compId, placa, periodo, fecha: document.getElementById('chk_fecha').value,
    estado: document.getElementById('chk_estado').value,
    observacion: document.getElementById('chk_observacion').value.trim(),
    firma: _chkFirma || '', resultados: JSON.stringify(resultados),
  });
  if (r && r.success) {
    const inspId = (r.data && r.data.id) ? r.data.id : (document.getElementById('chk_id').value || 0);
    if (_chkFotosPend.length && inspId) {
      await Promise.all(_chkFotosPend.map(f => {
        const fd = new FormData(); fd.append('csrf_token', CSRF_TOKEN); fd.append('action', 'foto_add');
        fd.append('inspeccion_id', inspId); fd.append('archivo', f);
        return fetch('api/checklist.php', { method: 'POST', body: fd }).catch(() => {});
      }));
    }
    _chkFotosPend = [];
    toast('Inspección guardada', 'success'); cerrarModal('modalChkInsp'); cargarChecklist();
  }
  if (btn) btn.disabled = false;
}

async function eliminarInspeccion(id) {
  if (!confirm('¿Eliminar esta inspección? No se puede deshacer.')) return;
  const r = await _chkPost({ action: 'delete', id });
  if (r && r.success) { toast('Eliminada', 'success'); cargarChecklist(); }
}

// ── Placa: autocompletar desde Vehículos ──
function chkBuscarPlaca(q) {
  clearTimeout(_chkPlacaTimer);
  const cont = document.getElementById('chkPlacaResultados');
  if (q.trim().length < 2) { cont.style.display = 'none'; return; }
  _chkPlacaTimer = setTimeout(async () => {
    let rows = [];
    try {
      const r = await fetch('api/vehiculos.php?action=buscar&q=' + encodeURIComponent(q.trim()));
      const d = await r.json();
      rows = (d && d.success) ? (Array.isArray(d.data) ? d.data : (d.data.vehiculos || d.data.items || [])) : [];
    } catch (e) { rows = []; }
    if (!rows.length) { cont.innerHTML = '<div class="muted" style="padding:8px 12px;font-size:12px">Sin resultados. Puedes escribir la placa igual.</div>'; cont.style.display = 'block'; return; }
    cont.innerHTML = rows.slice(0, 15).map(v => {
      const placa = (v.placa || v.PLACA || '').toString();
      const extra = [v.marca || v.MARCA, v.modelo || v.MODELO].filter(Boolean).join(' ');
      return `<div onclick="chkSelPlaca('${placa.replace(/'/g, "")}')" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--gris-700)" onmouseover="this.style.background='var(--gris-700)'" onmouseout="this.style.background=''">
        <span style="font-weight:700;color:var(--gris-100)">${_chkEsc(placa)}</span>${extra ? '<span class="muted" style="font-size:11px;margin-left:6px">' + _chkEsc(extra) + '</span>' : ''}</div>`;
    }).join('');
    cont.style.display = 'block';
  }, 300);
}
function chkSelPlaca(placa) { document.getElementById('chk_placa').value = placa; document.getElementById('chkPlacaResultados').style.display = 'none'; }

// ── Evidencia fotográfica ──
let _chkFotosPend = [];   // File pendientes (inspección nueva o nuevas al editar)
let _chkFotosExist = [];  // {id, archivo} ya guardadas
function chkFotoElegir(files) {
  Array.from(files || []).forEach(f => { if (f && f.type.startsWith('image/')) _chkFotosPend.push(f); });
  _chkRenderFotos();
}
function chkQuitarPend(idx) { _chkFotosPend.splice(idx, 1); _chkRenderFotos(); }
async function chkEliminarFotoExist(id) {
  if (!confirm('¿Quitar esta foto?')) return;
  const r = await _chkPost({ action: 'foto_del', id });
  if (r && r.success) { _chkFotosExist = _chkFotosExist.filter(f => +f.id !== +id); _chkRenderFotos(); }
}
function _chkRenderFotos() {
  const gal = document.getElementById('chkFotosGal');
  if (!gal) return;
  const up = (typeof UPLOAD_URL !== 'undefined' ? UPLOAD_URL : 'uploads/');
  const exist = _chkFotosExist.map(f =>
    `<div style="position:relative"><img src="${up}${f.archivo}" onclick="verDocumento('${encodeURI(up + f.archivo)}')" style="width:80px;height:80px;object-fit:cover;border-radius:6px;cursor:pointer;border:1px solid var(--gris-600)">
      <button onclick="chkEliminarFotoExist(${f.id})" title="Quitar" style="position:absolute;top:-6px;right:-6px;background:var(--rojo);color:#fff;border:0;border-radius:50%;width:20px;height:20px;font-size:11px;cursor:pointer">&times;</button></div>`).join('');
  const pend = _chkFotosPend.map((f, i) => {
    const url = URL.createObjectURL(f);
    return `<div style="position:relative"><img src="${url}" style="width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px dashed var(--primary)">
      <button onclick="chkQuitarPend(${i})" title="Quitar" style="position:absolute;top:-6px;right:-6px;background:var(--gris-500);color:#fff;border:0;border-radius:50%;width:20px;height:20px;font-size:11px;cursor:pointer">&times;</button>
      <span style="position:absolute;bottom:2px;left:2px;background:rgba(0,0,0,.6);color:#fff;font-size:8px;padding:1px 4px;border-radius:3px">nueva</span></div>`;
  }).join('');
  gal.innerHTML = exist + pend || '<span class="muted" style="font-size:12px">Sin fotos.</span>';
}

// ── Firma (canvas) ──
function _chkFirmaCanvas() { return document.getElementById('chkFirmaCanvas'); }
function _chkFirmaEstado() { const el = document.getElementById('chkFirmaEstado'); if (el) el.innerHTML = _chkFirma ? '<i class="fas fa-check" style="color:var(--verde)"></i> Firmada' : 'Sin firma'; }
function chkAbrirFirma() {
  abrirModal('modalChkFirma');
  setTimeout(() => {
    const c = _chkFirmaCanvas(); if (!c) return;
    const ctx = c.getContext('2d'); c._ctx = ctx; c._draw = false; c._has = false;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.strokeStyle = '#1565C0'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    const pos = e => { const r = c.getBoundingClientRect(), s = e.touches ? e.touches[0] : e; return { x: (s.clientX - r.left) * (c.width / r.width), y: (s.clientY - r.top) * (c.height / r.height) }; };
    c.onmousedown = e => { c._draw = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    c.onmouseup = () => c._draw = false; c.onmouseleave = () => c._draw = false;
    c.onmousemove = e => { if (!c._draw) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); c._has = true; };
    c.ontouchstart = e => { e.preventDefault(); c._draw = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
    c.ontouchend = () => c._draw = false;
    c.ontouchmove = e => { e.preventDefault(); if (!c._draw) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); c._has = true; };
  }, 60);
}
function chkFirmaLimpiar() { const c = _chkFirmaCanvas(); if (c && c._ctx) { c._ctx.fillStyle = '#fff'; c._ctx.fillRect(0, 0, c.width, c.height); c._has = false; } }
function chkFirmaGuardar() {
  const c = _chkFirmaCanvas();
  if (!c || !c._has) { toast('Firma en el recuadro primero', 'warning'); return; }
  _chkFirma = c.toDataURL('image/png'); _chkFirmaEstado(); cerrarModal('modalChkFirma');
}

// ── PDF ──
function chkVerPdf(id) {
  document.getElementById('chkPdfFrame').src = 'api/checklist_pdf.php?id=' + id;
  abrirModal('modalChkPdf');
}
function chkImprimir() { const f = document.getElementById('chkPdfFrame'); try { f.contentWindow.focus(); f.contentWindow.print(); } catch (e) { window.open(f.src, '_blank'); } }

// POST helper (FormData + CSRF).
async function _chkPost(campos) {
  const fd = new FormData(); fd.append('csrf_token', CSRF_TOKEN);
  Object.entries(campos).forEach(([k, v]) => fd.append(k, v));
  try {
    const r = await fetch('api/checklist.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (!d.success) toast(d.message || 'Error', 'error');
    return d;
  } catch (e) { toast('Error de conexión', 'error'); return null; }
}
