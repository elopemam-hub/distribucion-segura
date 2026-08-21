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
let _chkPreUnidad = null;   // unidad a preseleccionar en el modal (al editar)

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
  _chkCargarComponentes().then(() => {
    _chkLlenarSelects();
    const uniId = window._chkPendingUni; window._chkPendingUni = null;
    if (uniId) { switchChkTab('equipos'); _chkAbrirInspDesdeUnidad(uniId); }
    else switchChkTab('dashboard');
  });
}

// Abre la inspección de una unidad concreta (llegada por el QR ?chkuni=ID).
async function _chkAbrirInspDesdeUnidad(uniId) {
  try {
    const r = await fetch('api/checklist.php?action=uni_list');
    const d = await r.json();
    const u = (d && d.success ? (d.data.unidades || []) : []).find(x => +x.id === +uniId);
    if (!u) { toast('Extintor no encontrado', 'error'); return; }
    _chkPreUnidad = String(u.id);
    await nuevaInspeccion(+u.componente_id);
  } catch (e) { toast('No se pudo abrir la inspección', 'error'); }
}

async function _chkCargarComponentes(todos) {
  try {
    const r = await fetch('api/checklist.php?action=componentes' + (todos ? '&todos=1' : ''));
    const d = await r.json();
    _chkComp = (d && d.success && d.data && d.data.componentes) ? d.data.componentes : [];
  } catch (e) { _chkComp = []; }
}

function switchChkTab(tab) {
  // La Configuración es exclusiva del administrador.
  if (tab === 'config' && !_chkAdmin()) tab = 'dashboard';
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
  show('chkEquipos', tab === 'equipos');
  show('chkTablaCard', tab !== 'dashboard' && tab !== 'equipos');
  if (tab === 'dashboard') cargarChkDashboard();
  else if (tab === 'equipos') renderEquiposGaleria();
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
    const venc = x.vencimiento ? (() => {
      const vencido = x.vencimiento < new Date().toISOString().slice(0, 10);
      return `<br><span class="badge ${vencido ? 'badge-danger' : 'badge-warning'}" style="font-size:10px;margin-top:2px" title="Vencimiento del equipo"><i class="fas fa-hourglass-half"></i> Vence ${_chkFecha(x.vencimiento)}</span>`;
    })() : '';
    return `<tr>
      <td class="muted" style="white-space:nowrap">${_chkFecha(x.fecha)}</td>
      <td style="font-weight:600;color:var(--gris-100)">${_chkEsc(x.inspector_nombre || '—')}</td>
      <td><span class="badge badge-info">${_chkEsc(x.equipo || '—')}</span>${venc}</td>
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
  renderChkDashAlertas();
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

// ── Alerta de vencimientos (extintores por unidad + insumos de botiquín por ítem) ──
async function renderChkDashAlertas() {
  const cont = document.getElementById('chkDashAlertas');
  if (!cont) return;
  const pedir = async (accion) => {
    try { const r = await fetch('api/checklist.php?action=' + accion + '&dias=90&_t=' + Date.now()); const j = await r.json(); return (j && j.success) ? j.data : null; }
    catch (e) { return null; }
  };
  const [ext, bot] = await Promise.all([pedir('vencimientos'), pedir('vencimientos_botiquin')]);
  const eV = (ext && ext.vencidos) || [], eP = (ext && ext.por_vencer) || [];
  const bV = (bot && bot.vencidos) || [], bP = (bot && bot.por_vencer) || [];
  if (!eV.length && !eP.length && !bV.length && !bP.length) { cont.innerHTML = ''; return; }

  const cuando = d => { const n = Math.abs(+d); return (+d < 0 ? 'venció hace ' : 'en ') + n + ' día' + (n !== 1 ? 's' : ''); };
  const camion = p => p ? `<span class="badge badge-info" style="font-size:10px"><i class="fas fa-truck"></i> ${_chkEsc(p)}</span>` : '';
  const irBtn = id => +id > 0 ? `<button class="btn btn-outline btn-sm" onclick="_chkAbrirInspDesdeUnidad(${id})" title="Inspeccionar"><i class="fas fa-clipboard-check"></i></button>` : '';

  // Fila de extintor (una fecha por unidad).
  const filaExt = (u, vencido) => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--gris-700);flex-wrap:wrap">
      <span style="font-weight:700;color:var(--gris-100);min-width:64px">${_chkEsc(u.codigo)}</span>
      <span class="muted" style="flex:1;min-width:120px">${_chkEsc(u.tipo || 'Extintor')}${u.nombre ? ' · ' + _chkEsc(u.nombre) : ''}</span>
      ${camion(u.placa)}
      <span class="badge ${vencido ? 'badge-danger' : 'badge-warning'}" style="font-size:11px">${_chkFecha(u.vencimiento)} · ${cuando(u.dias)}</span>
      ${irBtn(u.id)}
    </div>`;
  // Fila de insumo de botiquín (fecha por producto).
  const filaBot = (r, vencido) => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--gris-700);flex-wrap:wrap">
      <span style="font-weight:700;color:var(--gris-100);min-width:64px">${_chkEsc(r.codigo)}</span>
      <span class="muted" style="flex:1;min-width:140px">${_chkEsc(r.item || '')}</span>
      ${camion(r.placa)}
      <span class="badge ${vencido ? 'badge-danger' : 'badge-warning'}" style="font-size:11px">${_chkFecha(r.vencimiento)} · ${cuando(r.dias)}</span>
      ${irBtn(r.id)}
    </div>`;

  const bloque = (titulo, icono, color, vencido, filasHtml, n) => filasHtml ? `
    <div class="card" style="margin-bottom:12px;border-left:4px solid ${color}">
      <div class="card-body" style="padding:10px 16px">
        <div style="font-weight:700;color:var(--gris-100);margin-bottom:4px">
          <i class="fas ${icono}" style="color:${color}"></i> ${titulo} <span class="badge ${vencido ? 'badge-danger' : 'badge-warning'}">${n}</span>
        </div>${filasHtml}
      </div>
    </div>` : '';

  cont.innerHTML =
    bloque('Extintores VENCIDOS — recarga inmediata', 'fa-triangle-exclamation', 'var(--rojo)', true, eV.map(u => filaExt(u, true)).join(''), eV.length) +
    bloque('Botiquín · insumos VENCIDOS — reponer', 'fa-briefcase-medical', 'var(--rojo)', true, bV.map(r => filaBot(r, true)).join(''), bV.length) +
    bloque('Extintores por vencer (próx. 90 días)', 'fa-clock', 'var(--naranja)', false, eP.map(u => filaExt(u, false)).join(''), eP.length) +
    bloque('Botiquín · insumos por vencer (próx. 90 días)', 'fa-clock', 'var(--naranja)', false, bP.map(r => filaBot(r, false)).join(''), bP.length);
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

// ============================================================
// EQUIPOS: galería de tipos + dashboard por tipo + inventario
// ============================================================
const CHK_MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];
let _chkEqComp = null, _chkEqAnio = null;
let _chkEqChartArea = null, _chkEqChartEvo = null;
let _chkEqData = null, _chkEqUnidadesAll = [];

function _chkPuedeEditarEq() { return _chkAdmin() || (typeof USER_ROL !== 'undefined' && USER_ROL === 'supervisor'); }
function _chkVencInfo(f) {
  if (!f) return { txt: 'Sin fecha', cls: 'badge-secondary' };
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const v = new Date(f + 'T00:00:00');
  const dias = Math.round((v - hoy) / 86400000);
  const cls = dias < 0 ? 'badge-danger' : dias <= 90 ? 'badge-warning' : 'badge-success';
  return { txt: _chkFecha(f), cls };
}
function _chkPctTxt(v) {
  if (v === null || v === undefined) return '<span class="muted">—</span>';
  const col = v >= 90 ? 'var(--verde)' : v >= 70 ? 'var(--naranja)' : 'var(--rojo)';
  return `<span style="color:${col};font-weight:700;font-variant-numeric:tabular-nums">${v}%</span>`;
}

// Galería "Tipos de equipo": una tarjeta por tipo con # unidades y vencimientos.
async function renderEquiposGaleria() {
  const gal = document.getElementById('chkEqGaleria'), dash = document.getElementById('chkEqDash');
  if (dash) dash.style.display = 'none';
  if (gal) { gal.style.display = ''; gal.innerHTML = '<p class="muted" style="padding:20px">Cargando…</p>'; }
  await _chkCargarComponentes();
  let unidades = [];
  try { const r = await fetch('api/checklist.php?action=uni_list'); const d = await r.json(); unidades = (d && d.success) ? (d.data.unidades || []) : []; }
  catch (e) {}
  const porComp = {};
  unidades.forEach(u => { (porComp[+u.componente_id] = porComp[+u.componente_id] || []).push(u); });
  const activos = _chkComp.filter(c => +c.activo !== 0);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const cards = activos.map(c => {
    const us = (porComp[+c.id] || []).filter(u => +u.activo !== 0);
    let venc = 0, porV = 0;
    us.forEach(u => { if (u.vencimiento) { const dias = Math.round((new Date(u.vencimiento + 'T00:00:00') - hoy) / 86400000); if (dias < 0) venc++; else if (dias <= 90) porV++; } });
    const code = 'CHK-' + String(c.id).padStart(3, '0');
    return `<div onclick="abrirEquipoDash(${c.id})" style="cursor:pointer;background:var(--gris-800);border:1px solid var(--gris-600);border-radius:10px;padding:16px;transition:border-color .15s" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--gris-600)'">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span class="muted" style="font-size:11px;letter-spacing:.5px">${code}</span>
        <span class="badge badge-info"><i class="fas fa-box"></i> ${us.length} unidad${us.length !== 1 ? 'es' : ''}</span>
      </div>
      <div style="font-weight:700;color:var(--gris-100);font-size:15px;margin-bottom:10px"><i class="fas fa-clipboard-check" style="color:var(--primary)"></i> ${_chkEsc(c.nombre)}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;min-height:22px">
        ${venc ? `<span class="badge badge-danger"><i class="fas fa-triangle-exclamation"></i> ${venc} vencido${venc !== 1 ? 's' : ''}</span>` : ''}
        ${porV ? `<span class="badge badge-warning"><i class="fas fa-clock"></i> ${porV} por vencer</span>` : ''}
        ${!venc && !porV ? '<span class="badge badge-success"><i class="fas fa-check"></i> Vencimientos al día</span>' : ''}
      </div>
      <div style="margin-top:12px"><span class="btn btn-outline btn-sm" style="pointer-events:none"><i class="fas fa-gauge-high"></i> Ver dashboard</span></div>
    </div>`;
  }).join('');
  gal.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:8px">
      <h3 style="color:var(--gris-100);font-size:16px"><i class="fas fa-boxes-stacked" style="color:var(--primary)"></i> Tipos de equipo</h3>
      <span class="muted" style="font-size:12px">Elige un tipo para ver su dashboard e inventario</span></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(258px,1fr));gap:14px">${cards || '<p class="muted">Sin tipos de equipo activos.</p>'}</div>`;
}

function abrirEquipoDash(compId) { _chkEqComp = compId; _chkEqAnio = null; cargarEquipoDash(); }
function volverEquipos() { renderEquiposGaleria(); }
function chkEqCambiarAnio(a) { _chkEqAnio = a; cargarEquipoDash(); }

async function cargarEquipoDash() {
  const gal = document.getElementById('chkEqGaleria'), dash = document.getElementById('chkEqDash');
  if (gal) gal.style.display = 'none';
  if (dash) { dash.style.display = ''; dash.innerHTML = '<p class="muted" style="padding:24px">Cargando dashboard…</p>'; }
  const anio = _chkEqAnio || new Date().getFullYear();
  try {
    const [rd, ru] = await Promise.all([
      fetch(`api/checklist.php?action=equipo_dash&componente_id=${_chkEqComp}&anio=${anio}`).then(r => r.json()),
      fetch(`api/checklist.php?action=uni_list&componente_id=${_chkEqComp}`).then(r => r.json()),
    ]);
    if (!rd || !rd.success) { dash.innerHTML = '<p class="muted" style="padding:24px">No se pudo cargar.</p>'; return; }
    _chkEqData = rd.data;
    _chkEqUnidadesAll = (ru && ru.success) ? (ru.data.unidades || []) : [];
    _chkEqAnio = _chkEqData.anio;
    renderEquipoDash(_chkEqData);
  } catch (e) { dash.innerHTML = '<p class="muted" style="padding:24px">Error al cargar el dashboard.</p>'; }
}

function renderEquipoDash(d) {
  const dash = document.getElementById('chkEqDash');
  const k = d.kpis || {}, anios = (d.anios || []).slice();
  const curY = new Date().getFullYear();
  if (!anios.includes(String(curY)) && !anios.includes(curY)) anios.unshift(curY);
  const yearBtns = anios.map(a => `<button class="btn btn-sm ${+a === +d.anio ? 'btn-primary' : 'btn-outline'}" onclick="chkEqCambiarAnio(${a})">${a}</button>`).join('');
  const puede = _chkPuedeEditarEq();

  const kpis =
    _chkDashKpi('fas fa-box', 'azul', 'Total unidades', k.total_unidades || 0, 'inventariadas', null, '', false) +
    _chkDashKpi('fas fa-clipboard-check', 'azul', 'Inspecciones', k.inspecciones || 0, 'en ' + d.anio, null, '', false) +
    _chkDashKpi('fas fa-clock', (k.por_vencer || 0) > 0 ? 'naranja' : 'verde', 'Por vencer', k.por_vencer || 0, 'próx. 90 días', null, '', true) +
    _chkDashKpi('fas fa-triangle-exclamation', (k.vencidos || 0) > 0 ? 'rojo' : 'verde', 'Vencidos', k.vencidos || 0, 'requieren acción', null, '', true) +
    _chkDashKpi('fas fa-circle-check', (k.cumplimiento === null ? 'azul' : k.cumplimiento >= 90 ? 'verde' : k.cumplimiento >= 70 ? 'naranja' : 'rojo'), 'Cumplimiento', (k.cumplimiento === null ? '—' : k.cumplimiento + '%'), 'promedio ' + d.anio, null, '', false) +
    _chkDashKpi('fas fa-location-dot', 'azul', 'Áreas', k.areas || 0, 'ubicaciones', null, '', false);

  dash.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:16px">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="btn btn-outline btn-sm" onclick="volverEquipos()"><i class="fas fa-arrow-left"></i> Tipos de equipo</button>
        <h3 style="color:var(--gris-100);font-size:18px;margin:0">Dashboard — ${_chkEsc(d.componente.nombre)}</h3>
      </div>
      <div style="display:flex;gap:6px">${yearBtns}</div>
    </div>
    <div class="dash-kpi-grid" style="margin-bottom:18px">${kpis}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px" class="charts-row">
      <div class="card"><div class="card-header"><h3><i class="fas fa-chart-bar"></i> Cumplimiento por Área</h3></div>
        <div class="card-body" style="padding:14px 18px"><canvas id="chkEqChartArea" height="200"></canvas>
          <p class="muted" id="chkEqAreaEmpty" style="display:none;font-size:13px">Sin datos de inspección en ${d.anio}.</p></div></div>
      <div class="card"><div class="card-header"><h3><i class="fas fa-chart-column"></i> Evolución mensual ${d.anio}</h3></div>
        <div class="card-body" style="padding:14px 18px"><canvas id="chkEqChartEvo" height="200"></canvas></div></div>
    </div>
    <div class="card" style="margin-bottom:18px"><div class="card-header"><h3><i class="fas fa-table-list"></i> Matriz de Verificación (${(d.unidades || []).length} unidades)</h3></div>
      <div class="card-body" style="padding:0"><div class="tbl-scroll">${_chkEqMatriz(d)}</div></div></div>
    <div class="card"><div class="card-header"><h3><i class="fas fa-boxes-stacked"></i> Estado por Unidad — ${d.anio}</h3>
      ${puede ? `<button class="btn btn-primary btn-sm" onclick="chkNuevaUni()"><i class="fas fa-plus"></i> Unidad</button>` : ''}</div>
      <div class="card-body" style="padding:0"><div class="tbl-scroll">${_chkEqEstadoUnidad(d, puede)}</div></div></div>`;

  _chkEqRenderArea(d.por_area || []);
  _chkEqRenderEvo(d.evolucion || []);
}

function _chkEqMatriz(d) {
  const items = d.items || [];
  const th = CHK_MESES.map(m => `<th style="text-align:center;min-width:52px">${m}</th>`).join('');
  if (!items.length) return '<p class="muted" style="padding:20px">Sin preguntas para este equipo.</p>';
  const rows = items.map(it => {
    const cells = (it.meses || []).map(v => `<td style="text-align:center">${_chkPctTxt(v)}</td>`).join('');
    return `<tr><td style="min-width:240px;color:var(--gris-200)" title="${_chkEsc(it.texto)}">${_chkEsc(it.texto.length > 46 ? it.texto.slice(0, 46) + '…' : it.texto)}</td>${cells}<td style="text-align:center;background:var(--gris-800)">${_chkPctTxt(it.prom)}</td></tr>`;
  }).join('');
  const promMes = (d.evolucion || []).map(e => `<td style="text-align:center">${_chkPctTxt(e.pct)}</td>`).join('');
  return `<table class="data-table" style="min-width:${300 + 12 * 52}px">
    <thead><tr><th>Ítem de verificación</th>${th}<th style="text-align:center">Prom.</th></tr></thead>
    <tbody>${rows}
      <tr style="background:var(--gris-800);font-weight:700"><td style="color:var(--gris-100)">Promedio</td>${promMes}<td style="text-align:center">${_chkPctTxt((d.kpis || {}).cumplimiento)}</td></tr>
    </tbody></table>`;
}

function _chkEqEstadoUnidad(d, puede) {
  const us = d.unidades || [];
  const th = CHK_MESES.map(m => `<th style="text-align:center;min-width:48px">${m}</th>`).join('');
  if (!us.length) return '<p class="muted" style="padding:20px">Sin unidades activas. Agrega la primera con “＋ Unidad”.</p>';
  const rows = us.map(u => {
    const cells = (u.meses || []).map(v => `<td style="text-align:center">${_chkPctTxt(v)}</td>`).join('');
    const vi = _chkVencInfo(u.vencimiento);
    const esInv = +u.id > 0;   // unidad de inventario (no una placa suelta)
    const qrBtn = esInv ? `<button class="btn btn-outline btn-sm" onclick="chkEtiquetaUni(${u.id})" title="Etiqueta QR"><i class="fas fa-qrcode"></i></button> ` : '';
    const acc = puede ? `<td style="text-align:right;white-space:nowrap">${esInv ? `${qrBtn}
        <button class="btn btn-outline btn-sm" onclick="chkEditarUni(${u.id})" title="Editar"><i class="fas fa-pen"></i></button>
        ${_chkAdmin() ? `<button class="btn btn-outline btn-sm" onclick="chkEliminarUni(${u.id})" title="Eliminar"><i class="fas fa-trash" style="color:var(--rojo)"></i></button>` : ''}` : ''}</td>` : '';
    // Nombre + metadatos de gestión (camión/capacidad/estado) si existen.
    const meta = [
      u.placa ? '<span class="badge badge-info" style="font-size:10px"><i class="fas fa-truck"></i> ' + _chkEsc(u.placa) + '</span>' : '',
      u.capacidad ? '<span class="muted" style="font-size:11px">' + _chkEsc(u.capacidad) + '</span>' : '',
      u.estado_operativo === 'fuera_servicio' ? '<span class="badge badge-danger" style="font-size:10px">Fuera de servicio</span>' : '',
    ].filter(Boolean).join(' ');
    const nombreTxt = u.nombre ? _chkEsc(u.nombre) : (esInv ? '' : '<span class="muted" style="font-size:11px">placa sin inventario</span>');
    const nombre = nombreTxt + (meta ? '<div style="margin-top:2px;display:flex;gap:5px;align-items:center;flex-wrap:wrap">' + meta + '</div>' : '');
    return `<tr>
      <td style="font-weight:700;color:var(--gris-100);white-space:nowrap">${_chkEsc(u.codigo)}</td>
      <td class="muted" style="min-width:180px">${nombre}</td>
      <td>${u.ruta ? '<span class="badge badge-secondary">' + _chkEsc(u.ruta) + '</span>' : (u.area ? '<span class="badge badge-secondary">' + _chkEsc(u.area) + '</span>' : '—')}</td>
      <td><span class="badge ${vi.cls}">${vi.txt}</span></td>
      ${cells}
      <td style="text-align:center;background:var(--gris-800)">${_chkPctTxt(u.prom)}</td>
      ${acc}
    </tr>`;
  }).join('');
  return `<table class="data-table" style="min-width:${560 + 12 * 48}px">
    <thead><tr><th>Cód.</th><th>Nombre</th><th>Ruta / Área</th><th>Vencimiento</th>${th}<th style="text-align:center">Prom.</th>${puede ? '<th></th>' : ''}</tr></thead>
    <tbody>${rows}</tbody></table>`;
}

function _chkEqRenderArea(rows) {
  const el = document.getElementById('chkEqChartArea'); if (!el) return;
  if (_chkEqChartArea) { _chkEqChartArea.destroy(); _chkEqChartArea = null; }
  const empty = document.getElementById('chkEqAreaEmpty');
  const valid = rows.filter(r => r.pct !== null);
  if (!valid.length) { el.style.display = 'none'; if (empty) empty.style.display = ''; return; }
  el.style.display = ''; if (empty) empty.style.display = 'none';
  const t = _chkDashTheme();
  const cols = valid.map(r => r.pct >= 90 ? CHK_COL.verde : r.pct >= 70 ? CHK_COL.naranja : CHK_COL.rojo);
  const plugin = { id: 'eqAreaLbl', afterDatasetsDraw(ch) { const { ctx } = ch; ctx.save(); ctx.font = '700 11px sans-serif'; ctx.textBaseline = 'middle'; ch.getDatasetMeta(0).data.forEach((b, i) => { const v = valid[i].pct; if (v >= 55) { ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(v + '%', b.x - 8, b.y); } else { ctx.fillStyle = t.txt; ctx.textAlign = 'left'; ctx.fillText(v + '%', b.x + 6, b.y); } }); ctx.restore(); } };
  _chkEqChartArea = new Chart(el.getContext('2d'), {
    type: 'bar', plugins: [plugin],
    data: { labels: valid.map(r => r.area), datasets: [{ data: valid.map(r => r.pct), backgroundColor: cols, borderRadius: 4, maxBarThickness: 26 }] },
    options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.raw}%` } } }, scales: { x: { min: 0, max: 100, ticks: { color: t.tick, callback: v => v + '%', font: { size: 11 } }, grid: { color: t.grid } }, y: { ticks: { color: t.tick, font: { size: 11 } }, grid: { display: false } } } }
  });
}

function _chkEqRenderEvo(evo) {
  const el = document.getElementById('chkEqChartEvo'); if (!el) return;
  if (_chkEqChartEvo) { _chkEqChartEvo.destroy(); _chkEqChartEvo = null; }
  const t = _chkDashTheme();
  const data = evo.map(e => e.pct);
  const cols = evo.map(e => e.pct === null ? 'rgba(150,150,150,.2)' : e.pct >= 90 ? CHK_COL.verde : e.pct >= 70 ? CHK_COL.naranja : CHK_COL.rojo);
  const plugin = { id: 'eqEvoLbl', afterDatasetsDraw(ch) { const { ctx } = ch; ctx.save(); ctx.font = '700 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ch.getDatasetMeta(0).data.forEach((b, i) => { const v = data[i]; if (v === null) return; ctx.fillStyle = t.txt; ctx.fillText(v + '%', b.x, b.y - 3); }); ctx.restore(); } };
  _chkEqChartEvo = new Chart(el.getContext('2d'), {
    type: 'bar', plugins: [plugin],
    data: { labels: CHK_MESES, datasets: [{ data: data.map(v => v === null ? 0 : v), backgroundColor: cols, borderRadius: 4, maxBarThickness: 34 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => data[c.dataIndex] === null ? ' Sin datos' : ` ${data[c.dataIndex]}%` } } }, scales: { x: { ticks: { color: t.tick, font: { size: 11 } }, grid: { display: false } }, y: { min: 0, max: 100, ticks: { color: t.tick, callback: v => v + '%', font: { size: 11 } }, grid: { color: t.grid } } } }
  });
}

// ── Inventario de unidades (CRUD) ──
function chkNuevaUni() { _chkAbrirUni(null); }
function chkEditarUni(id) { const u = _chkEqUnidadesAll.find(x => +x.id === +id); _chkAbrirUni(u || null); }
// Tipo de equipo actual (por nombre del componente).
function _chkEqEsExtintor() { return /extint/i.test((_chkEqData && _chkEqData.componente && _chkEqData.componente.nombre) || ''); }
function _chkEqEsBotiquin() { return /botiqu/i.test((_chkEqData && _chkEqData.componente && _chkEqData.componente.nombre) || ''); }

function _chkAbrirUni(u) {
  const ext = _chkEqEsExtintor();
  const asignable = ext || _chkEqEsBotiquin();   // equipos con camión asignado (placa/ruta)
  document.getElementById('chkUniTitulo').textContent = u ? 'Editar unidad' : 'Nueva unidad';
  document.getElementById('chk_uni_id').value = u ? u.id : '';
  document.getElementById('chk_uni_comp').value = _chkEqComp;
  document.getElementById('chk_uni_codigo').value = u ? u.codigo : '';
  document.getElementById('chk_uni_nombre').value = u ? (u.nombre || '') : '';
  document.getElementById('chk_uni_placa').value = u ? (u.placa || '') : '';
  document.getElementById('chk_uni_ruta').value = u ? (u.ruta || '') : '';
  document.getElementById('chk_uni_agente').value = u ? (u.tipo_agente || '') : (ext ? 'PQS/NITR - ABC' : '');
  document.getElementById('chk_uni_cap').value = u ? (u.capacidad || '') : '';
  document.getElementById('chk_uni_ubic').value = u ? (u.ubicacion || '') : '';
  document.getElementById('chk_uni_area').value = u ? (u.area || '') : '';
  document.getElementById('chk_uni_venc').value = u ? (u.vencimiento || '') : '';
  document.getElementById('chk_uni_mto').value = u ? (u.ultimo_mantenimiento || '') : '';
  document.getElementById('chk_uni_estop').value = u ? (u.estado_operativo || 'operativo') : 'operativo';
  // Camión/ruta/mantenimiento/estado: extintor y botiquín. Agente/capacidad: solo extintor.
  const esBot = _chkEqEsBotiquin();
  const setDisp = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? '' : 'none'; };
  ['chk_uni_ext_placa', 'chk_uni_ext_ruta', 'chk_uni_ext_mto', 'chk_uni_ext_estop'].forEach(id => setDisp(id, asignable));
  ['chk_uni_ext_agente', 'chk_uni_ext_cap'].forEach(id => setDisp(id, ext));
  // En botiquín el vencimiento es por insumo (no a nivel de unidad): se oculta el campo único.
  setDisp('chk_uni_venc_grp', !esBot);
  setDisp('chk_uni_items_wrap', esBot);
  const vl = document.getElementById('chk_uni_venc_lbl'); if (vl) vl.textContent = ext ? 'Próxima recarga / vencimiento' : 'Vencimiento';
  // Carga los insumos del botiquín (con su vencimiento por unidad) desde Configuración.
  if (esBot) _chkCargarUniItems(u ? u.id : 0); else { const c = document.getElementById('chk_uni_items'); if (c) c.innerHTML = ''; }
  abrirModal('modalChkUni');
}

// Renderiza los insumos (ítems activos del componente) con un campo de fecha por unidad.
async function _chkCargarUniItems(uniId) {
  const cont = document.getElementById('chk_uni_items');
  if (!cont) return;
  cont.innerHTML = '<p class="muted" style="font-size:12px;padding:6px">Cargando insumos…</p>';
  let items = [];
  try {
    const r = await fetch('api/checklist.php?action=uni_items&id=' + (uniId || 0) + '&componente_id=' + _chkEqComp);
    const d = await r.json();
    items = (d && d.success) ? (d.data.items || []) : [];
  } catch (e) { items = []; }
  if (!items.length) { cont.innerHTML = '<p class="muted" style="font-size:12px;padding:6px">Sin insumos. Agrégalos en Configuración.</p>'; return; }
  cont.innerHTML = items.map(it =>
    `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--gris-700)">
      <span style="flex:1;font-size:12.5px;color:var(--gris-200)">${_chkEsc(it.texto)}</span>
      <input type="date" class="form-control chk-uni-item-venc" data-item="${it.id}" value="${_chkEsc(it.vencimiento || '')}" style="width:150px;font-size:12px;padding:4px 8px">
    </div>`).join('');
}
async function chkGuardarUni() {
  const codigo = document.getElementById('chk_uni_codigo').value.trim();
  const nombre = document.getElementById('chk_uni_nombre').value.trim();
  if (!codigo) { toast('El código es obligatorio', 'warning'); return; }
  if (!nombre) { toast('El nombre es obligatorio', 'warning'); return; }
  // Vencimiento por insumo (botiquín): recolecta las fechas de cada fila.
  const itemsVenc = Array.from(document.querySelectorAll('#chk_uni_items .chk-uni-item-venc'))
    .map(inp => ({ item_id: +inp.getAttribute('data-item'), vencimiento: inp.value || '' }));
  const r = await _chkPost({
    action: 'uni_save', id: document.getElementById('chk_uni_id').value || '0',
    componente_id: document.getElementById('chk_uni_comp').value,
    codigo, nombre,
    placa: document.getElementById('chk_uni_placa').value.trim(),
    ruta: document.getElementById('chk_uni_ruta').value.trim(),
    tipo_agente: document.getElementById('chk_uni_agente').value.trim(),
    capacidad: document.getElementById('chk_uni_cap').value.trim(),
    ubicacion: document.getElementById('chk_uni_ubic').value.trim(),
    area: document.getElementById('chk_uni_area').value.trim(),
    vencimiento: document.getElementById('chk_uni_venc').value || '',
    ultimo_mantenimiento: document.getElementById('chk_uni_mto').value || '',
    estado_operativo: document.getElementById('chk_uni_estop').value || 'operativo',
    items_venc: JSON.stringify(itemsVenc),
  });
  if (r && r.success) { toast('Unidad guardada', 'success'); cerrarModal('modalChkUni'); delete _chkUnidadesCache[_chkEqComp]; cargarEquipoDash(); }
}

// ── Etiqueta QR imprimible por unidad (extintor) ──
function chkEtiquetaUni(id) {
  const u = _chkEqUnidadesAll.find(x => +x.id === +id) || (_chkEqData && (_chkEqData.unidades || []).find(x => +x.id === +id));
  if (!u) { toast('Unidad no encontrada', 'error'); return; }
  if (typeof QRCode === 'undefined') { toast('Librería QR no disponible', 'error'); return; }
  const url = location.origin + location.pathname + '?chkuni=' + u.id;
  const tipoNom = (_chkEqData && _chkEqData.componente && _chkEqData.componente.nombre) || 'EQUIPO';
  const icono = /extint/i.test(tipoNom) ? '🧯' : (/botiqu/i.test(tipoNom) ? '⛑️' : '📦');
  const tmp = document.createElement('div');
  new QRCode(tmp, { text: url, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M });
  setTimeout(() => {
    const node = tmp.querySelector('img') || tmp.querySelector('canvas');
    const src = node.tagName === 'IMG' ? node.src : node.toDataURL('image/png');
    const esc = s => _chkEsc(s || '');
    const fila = (lbl, val) => val ? `<tr><td style="color:#555;padding:2px 8px 2px 0;white-space:nowrap">${lbl}</td><td style="font-weight:700;color:#000">${esc(val)}</td></tr>` : '';
    const w = window.open('', '_blank', 'width=440,height=680');
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Etiqueta ${esc(u.codigo)}</title>
      <style>body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:16px;color:#000}
      .lbl{border:2px solid #000;border-radius:10px;padding:16px;max-width:360px;margin:0 auto;text-align:center}
      .hd{background:#000;color:#fff;font-weight:800;letter-spacing:1px;padding:6px;border-radius:6px;font-size:15px}
      .cod{font-size:30px;font-weight:900;margin:10px 0 2px}
      table{margin:8px auto 0;font-size:13px;text-align:left}
      .foot{margin-top:10px;font-size:11px;color:#333}
      @media print{.noprint{display:none}}</style></head><body>
      <div class="lbl">
        <div class="hd">${icono} ${esc(tipoNom.toUpperCase())}</div>
        <div class="cod">${esc(u.codigo)}</div>
        <img src="${src}" style="width:200px;height:200px" alt="QR">
        <table>
          ${fila('Camión', u.placa)}
          ${fila('Ruta', u.ruta)}
          ${fila('Tipo', u.tipo_agente)}
          ${fila('Capacidad', u.capacidad)}
          ${fila('Vence', u.vencimiento ? new Date(u.vencimiento + 'T00:00:00').toLocaleDateString('es-PE') : '')}
        </table>
        <div class="foot">Escanea el QR para registrar la inspección</div>
      </div>
      <div class="noprint" style="text-align:center;margin-top:14px">
        <button onclick="window.print()" style="padding:8px 18px;font-size:14px;cursor:pointer">Imprimir</button>
      </div></body></html>`);
    w.document.close(); w.focus();
  }, 150);
}
async function chkEliminarUni(id) {
  if (!confirm('¿Eliminar esta unidad? Se conservan sus inspecciones (quedan sin unidad).')) return;
  const r = await _chkPost({ action: 'uni_del', id });
  if (r && r.success) { toast('Unidad eliminada', 'success'); delete _chkUnidadesCache[_chkEqComp]; cargarEquipoDash(); }
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
        ${_chkAdmin() ? `<button class="btn btn-outline btn-sm" onclick="chkEliminarItem(${it.id},'${_chkEsc(it.texto).replace(/'/g, "\\'")}')" title="Eliminar fila"><i class="fas fa-trash" style="color:var(--rojo)"></i></button>` : ''}
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
async function chkEliminarItem(id, texto) {
  if (!confirm('¿Eliminar esta fila?\n\n"' + (texto || '') + '"\n\nSi tiene inspecciones registradas no se podrá borrar (usa desactivar).')) return;
  const r = await _chkPost({ action: 'item_del', id });
  if (r && r.success) { toast('Fila eliminada', 'success'); renderChkConfig(); }
  else if (r) toast(r.message || 'No se pudo eliminar', 'error', 6000);
}

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
  document.getElementById('chk_area').value = '';
  document.getElementById('chk_unidad_id').value = ''; _chkPreUnidad = null;
  _chkLlenarAreas(true);
  document.getElementById('chk_periodo').value = document.getElementById('chkFiltroPeriodo')?.value || new Date().toISOString().slice(0, 7);
  document.getElementById('chk_fecha').value = new Date().toISOString().slice(0, 10);
  document.getElementById('chk_vencimiento').value = '';
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
    document.getElementById('chk_area').value = x.area || '';
    document.getElementById('chk_unidad_id').value = x.unidad_id || ''; _chkPreUnidad = x.unidad_id || null;
    _chkLlenarAreas();
    document.getElementById('chk_periodo').value = x.periodo || '';
    document.getElementById('chk_fecha').value = x.fecha || '';
    document.getElementById('chk_vencimiento').value = x.vencimiento || '';
    document.getElementById('chk_estado').value = x.estado || 'apto';
    document.getElementById('chk_observacion').value = x.observacion || '';
    _chkFirma = x.firma || ''; _chkFirmaEstado();
    _chkFotosExist = x.fotos || []; _chkFotosPend = []; _chkRenderFotos();
    if (!_chkComp.length) await _chkCargarComponentes();
    _chkPrevRes = {};
    (x.resultados || []).forEach(r => { _chkPrevRes[+r.item_id] = { resultado: r.resultado, observacion: r.observacion || '', vencimiento: r.vencimiento || '' }; });
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

// Extintor: UNA fecha de vencimiento para todo el equipo (recarga/prueba
// hidrostática) → campo único en la cabecera del modal.
function _chkCompExtintor(nombre) { return /extint/i.test(nombre || ''); }
// Botiquín: cada producto/insumo tiene su propia caducidad → fecha POR FILA
// en la sección de preguntas (no usa el campo único de cabecera).
function _chkCompBotiquin(nombre) { return /botiqu/i.test(nombre || ''); }

// Muestra u oculta el campo de vencimiento de cabecera (solo extintores).
function _chkToggleVencimiento(c) {
  const wrap = document.getElementById('chk_vencimiento_wrap');
  const lbl = document.getElementById('chk_vencimiento_lbl');
  if (!wrap) return;
  const aplica = !!c && _chkCompExtintor(c.nombre);
  wrap.style.display = aplica ? '' : 'none';
  if (aplica && lbl) lbl.textContent = 'Vence (recarga extintor)';
  if (!aplica) { const inp = document.getElementById('chk_vencimiento'); if (inp) inp.value = ''; }
}

// Renderiza los ítems (banco de preguntas) del equipo seleccionado en el modal.
function chkRenderItemsSel() {
  const cont = document.getElementById('chkItemsCont');
  if (!cont) return;
  const compId = +(document.getElementById('chk_componente')?.value || 0);
  const c = _chkComp.find(k => +k.id === compId);
  _chkToggleVencimiento(c);
  if (!c) { cont.innerHTML = '<p class="muted" style="padding:12px">Selecciona un equipo.</p>'; return; }
  const prev = _chkPrevRes || {};
  const esBotiquin = _chkCompBotiquin(c.nombre);
  const items = (c.items || []).filter(it => +it.activo !== 0).map(it => {
    const cur = prev[+it.id] ? prev[+it.id].resultado : 'conforme';
    const obs = prev[+it.id] ? (prev[+it.id].observacion || '') : '';
    const venc = prev[+it.id] ? (prev[+it.id].vencimiento || '') : '';
    const opt = (val, lbl, cls, icon) =>
      `<label class="chk-opt ${cls}${cur === val ? ' sel' : ''}"><input type="radio" name="chkit_${it.id}" value="${val}" ${cur === val ? 'checked' : ''} onchange="chkSegSync(this)"><i class="fas fa-${icon}"></i>${lbl}</label>`;
    // Botiquín: cada producto lleva su fecha de vencimiento en la propia fila.
    const vencInput = esBotiquin
      ? `<input type="date" class="form-control chk-item-venc" title="Fecha de vencimiento de este producto" value="${_chkEsc(venc)}" style="width:150px;font-size:12px;padding:4px 8px">`
      : '';
    return `<div class="chk-item-row" data-item="${it.id}" data-comp="${c.id}" style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--gris-700);flex-wrap:wrap">
      <span style="flex:1;min-width:180px;color:var(--gris-200);font-size:12.5px">${_chkEsc(it.texto)}</span>
      <span class="chk-seg">${opt('conforme', 'C', 'opt-c', 'check')}${opt('no_conforme', 'NC', 'opt-nc', 'xmark')}${opt('na', 'N/A', 'opt-na', 'minus')}</span>
      ${vencInput}
      <input type="text" class="form-control chk-item-obs" placeholder="Observación" value="${_chkEsc(obs)}" style="width:170px;font-size:12px;padding:4px 8px">
    </div>`;
  }).join('');
  cont.innerHTML = `<div class="card"><div class="card-body" style="padding:10px 14px">
    <strong style="color:var(--gris-100);font-size:13px"><i class="fas fa-cube" style="color:var(--primary)"></i> Banco de preguntas · ${_chkEsc(c.nombre)}</strong>
    <div style="margin-top:4px">${items || '<span class="muted" style="font-size:12px">Sin preguntas. Agrégalas en Configuración.</span>'}</div>
  </div></div>`;
  _chkToggleUnidadSel(compId);
}

// Si el equipo tiene inventario de unidades, muestra el selector de unidad
// (en vez del buscador de placa) y lo llena. Preselecciona _chkPreUnidad si aplica.
let _chkUnidadesCache = {};
async function _chkToggleUnidadSel(compId) {
  const wrapU = document.getElementById('chk_unidad_wrap'), wrapP = document.getElementById('chk_placa_wrap');
  const sel = document.getElementById('chk_unidad');
  if (!wrapU || !wrapP || !sel) return;
  let units = _chkUnidadesCache[compId];
  if (units === undefined) {
    try { const r = await fetch('api/checklist.php?action=uni_list&componente_id=' + compId); const d = await r.json(); units = (d && d.success) ? (d.data.unidades || []) : []; }
    catch (e) { units = []; }
    units = units.filter(u => +u.activo !== 0);
    _chkUnidadesCache[compId] = units;
  }
  if (units.length) {
    sel.innerHTML = '<option value="">— Selecciona unidad —</option>' + units.map(u =>
      `<option value="${u.id}" data-codigo="${_chkEsc(u.codigo)}" data-area="${_chkEsc(u.area || '')}" data-venc="${_chkEsc(u.vencimiento || '')}">${_chkEsc(u.codigo)} · ${_chkEsc(u.nombre)}</option>`).join('');
    if (_chkPreUnidad) sel.value = _chkPreUnidad;
    wrapU.style.display = ''; wrapP.style.display = 'none';
    if (sel.value) chkSelUnidad();
  } else {
    wrapU.style.display = 'none'; wrapP.style.display = '';
    document.getElementById('chk_unidad_id').value = '';
  }
}
function chkSelUnidad() {
  const sel = document.getElementById('chk_unidad');
  const opt = sel.options[sel.selectedIndex];
  document.getElementById('chk_unidad_id').value = sel.value || '';
  if (sel.value && opt) {
    document.getElementById('chk_placa').value = opt.getAttribute('data-codigo') || '';
    const ar = opt.getAttribute('data-area') || '';
    // Área: la de la unidad si la tiene; si no, la del empleador (centro de trabajo).
    if (ar) document.getElementById('chk_area').value = ar;
    else if (_chkAreas && _chkAreas.default) document.getElementById('chk_area').value = _chkAreas.default;
    // Autocompleta el vencimiento (recarga) del extintor desde el inventario.
    const venc = opt.getAttribute('data-venc') || '';
    const vencInp = document.getElementById('chk_vencimiento');
    if (vencInp && vencInp.closest('#chk_vencimiento_wrap')?.style.display !== 'none') vencInp.value = venc;
    // Botiquín: autocompleta la fecha de cada insumo desde lo guardado en la unidad.
    if (document.querySelector('#chkItemsCont .chk-item-venc')) _chkAutollenarItemsVenc(sel.value);
  }
}

// Vuelca las fechas de vencimiento por insumo (chk_unidad_items) de una unidad
// (botiquín) a las filas del banco de preguntas de la inspección.
async function _chkAutollenarItemsVenc(uniId) {
  if (!uniId) return;
  let items = [];
  try {
    const r = await fetch('api/checklist.php?action=uni_items&id=' + uniId);
    const d = await r.json();
    items = (d && d.success) ? (d.data.items || []) : [];
  } catch (e) { return; }
  items.forEach(it => {
    const row = document.querySelector('.chk-item-row[data-item="' + it.id + '"]');
    const inp = row && row.querySelector('.chk-item-venc');
    if (inp) inp.value = it.vencimiento || '';   // refleja la unidad elegida (limpia la anterior)
  });
}

// Llena el datalist de áreas desde el empleador (centro de trabajo) + las ya
// usadas. Si prefill=true (inspección nueva) y el campo está vacío, coloca el
// área del empleador por defecto.
let _chkAreas = null;
async function _chkLlenarAreas(prefill) {
  const dl = document.getElementById('chkAreasList'), inp = document.getElementById('chk_area');
  if (!dl) return;
  if (_chkAreas === null) {
    _chkAreas = { areas: [], default: '' };
    try { const r = await fetch('api/checklist.php?action=areas'); const d = await r.json(); if (d && d.success) _chkAreas = d.data; }
    catch (e) {}
  }
  dl.innerHTML = (_chkAreas.areas || []).map(a => `<option value="${_chkEsc(a)}">`).join('');
  if (prefill && inp && !inp.value && _chkAreas.default) inp.value = _chkAreas.default;
}

function chkMarcarTodo(val) {
  document.querySelectorAll('.chk-item-row').forEach(row => {
    const id = row.getAttribute('data-item');
    const rb = row.querySelector('input[name="chkit_' + id + '"][value="' + val + '"]');
    if (rb) { rb.checked = true; chkSegSync(rb); }
  });
}

// Resalta la píldora (C/NC/N/A) seleccionada del ítem.
function chkSegSync(input) {
  const seg = input.closest('.chk-seg'); if (!seg) return;
  seg.querySelectorAll('.chk-opt').forEach(l => l.classList.toggle('sel', l.querySelector('input').checked));
}

async function guardarInspeccion() {
  const compId = document.getElementById('chk_componente').value;
  if (!compId) { toast('Selecciona el equipo a inspeccionar', 'warning'); return; }
  const unidadId = document.getElementById('chk_unidad_id').value || '';
  const usaInventario = document.getElementById('chk_unidad_wrap')?.style.display !== 'none';
  if (usaInventario && !unidadId) { toast('Selecciona la unidad del inventario', 'warning'); return; }
  const placa = document.getElementById('chk_placa').value.trim().toUpperCase();
  if (!placa) { toast('Indica la placa de la unidad', 'warning'); return; }
  const periodo = document.getElementById('chk_periodo').value;
  if (!/^\d{4}-\d{2}$/.test(periodo)) { toast('Selecciona el mes', 'warning'); return; }
  const resultados = [];
  document.querySelectorAll('.chk-item-row').forEach(row => {
    const id = +row.getAttribute('data-item'), comp = +row.getAttribute('data-comp');
    const sel = row.querySelector('input[name="chkit_' + id + '"]:checked');
    resultados.push({ item_id: id, componente_id: comp, resultado: sel ? sel.value : 'conforme', observacion: (row.querySelector('.chk-item-obs')?.value || '').trim(), vencimiento: (row.querySelector('.chk-item-venc')?.value || '') });
  });
  if (!resultados.length) { toast('No hay ítems para evaluar', 'warning'); return; }

  const btn = document.getElementById('chkGuardarBtn'); if (btn) btn.disabled = true;
  const r = await _chkPost({
    action: 'save', id: document.getElementById('chk_id').value || '0',
    componente_id: compId, unidad_id: unidadId || '0', placa, area: document.getElementById('chk_area').value.trim(), periodo, fecha: document.getElementById('chk_fecha').value,
    vencimiento: document.getElementById('chk_vencimiento').value || '',
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
      const r = await fetch('api/vehiculos.php?action=buscar&solo_activos=1&q=' + encodeURIComponent(q.trim()));
      const d = await r.json();
      rows = (d && d.success) ? (Array.isArray(d.data) ? d.data : (d.data.vehiculos || d.data.items || [])) : [];
    } catch (e) { rows = []; }
    if (!rows.length) { cont.innerHTML = '<div class="muted" style="padding:8px 12px;font-size:12px">Sin resultados. Puedes escribir la placa igual.</div>'; cont.style.display = 'block'; return; }
    cont.innerHTML = rows.slice(0, 15).map(v => {
      const placa = (v.placa || v.PLACA || '').toString();
      const extra = [v.marca || v.MARCA, v.modelo || v.MODELO].filter(Boolean).join(' ');
      return `<div onmousedown="event.preventDefault();chkSelPlaca('${placa.replace(/'/g, "")}')" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--gris-700)" onmouseover="this.style.background='var(--gris-700)'" onmouseout="this.style.background=''">
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
