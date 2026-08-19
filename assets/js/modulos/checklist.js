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
  // Carga el catálogo de componentes una vez.
  _chkCargarComponentes().then(() => { _chkLlenarSelects(); switchChkTab('formularios'); });
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
  show('chkFiltros', tab === 'inspecciones' || tab === 'resumen');
  show('chkKpis', tab === 'resumen');
  show('chkBtnNueva', tab === 'inspecciones');
  show('chkFiltroEstadoWrap', tab === 'inspecciones');
  show('chkFiltroEquipoWrap', tab === 'inspecciones');
  if (tab === 'formularios') renderFormularios();
  else if (tab === 'inspecciones') cargarChecklist();
  else if (tab === 'resumen') cargarChkResumen();
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
        <div style="margin-top:12px"><span class="btn btn-primary btn-sm" style="pointer-events:none"><i class="fas fa-plus"></i> Nueva inspección</span></div>
      </div>`;
    }).join('') + '</div>';
}

function chkRecargar() { if (_chkTab === 'resumen') cargarChkResumen(); else cargarChecklist(); }
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

// ── Resumen mensual ──
async function cargarChkResumen() {
  const per = document.getElementById('chkFiltroPeriodo')?.value || '';
  const wrap = document.getElementById('chkTablaWrap');
  if (wrap) wrap.innerHTML = '<p class="muted" style="text-align:center;padding:28px">Cargando…</p>';
  let data = { items: [], periodo: per };
  try {
    const r = await fetch('api/checklist.php?action=resumen' + (per ? '&periodo=' + per : ''));
    const d = await r.json();
    if (d && d.success) data = d.data;
  } catch (e) {}
  renderChkResumen(data);
}
function renderChkResumen(data) {
  const wrap = document.getElementById('chkTablaWrap'), pag = document.getElementById('chkPagWrap');
  const kpis = document.getElementById('chkKpis');
  const items = data.items || [];
  const total = items.length;
  const aptas = items.filter(x => x.estado === 'apto').length;
  const conNC = items.filter(x => +x.no_conformes > 0).length;
  if (kpis) kpis.innerHTML =
    _chkKpi('azul', 'fa-truck', 'Unidades inspeccionadas', total, 'en ' + (data.periodo || '')) +
    _chkKpi(total && aptas === total ? 'verde' : 'amarillo', 'fa-circle-check', 'Aptas', aptas, total ? Math.round(aptas / total * 100) + '%' : '0%') +
    _chkKpi(conNC ? 'rojo' : 'verde', 'fa-triangle-exclamation', 'Con no conformidad', conNC, 'requieren acción');
  if (pag) pag.innerHTML = '';
  if (!total) { wrap.innerHTML = '<p class="muted" style="text-align:center;padding:28px">Sin inspecciones en ' + (data.periodo || 'el mes') + '.</p>'; return; }
  const body = items.map(x => {
    const est = CHK_EST[x.estado] || ['badge-secondary', x.estado];
    const evaluados = (+x.total) - (+x.na);
    const pct = evaluados > 0 ? Math.round(+x.conformes / evaluados * 100) : (+x.total ? 100 : 0);
    const col = pct === 100 ? 'var(--verde)' : pct >= 80 ? 'var(--naranja)' : 'var(--rojo)';
    return `<tr>
      <td style="font-weight:700;color:var(--gris-100)">${_chkEsc(x.placa)}</td>
      <td><span class="badge badge-info">${_chkEsc(x.equipo || '—')}</span></td>
      <td class="muted">${_chkFecha(x.fecha)}</td>
      <td class="muted">${_chkEsc(x.inspector_nombre || '—')}</td>
      <td style="text-align:right;font-variant-numeric:tabular-nums;color:${col};font-weight:700">${pct}%</td>
      <td style="text-align:center">${+x.no_conformes > 0 ? '<span class="badge badge-danger">' + x.no_conformes + '</span>' : '—'}</td>
      <td><span class="badge ${est[0]}">${est[1]}</span></td>
      <td style="text-align:right"><button class="btn btn-outline btn-sm" onclick="chkVerPdf(${x.id})" title="Registro PDF"><i class="fas fa-print"></i></button></td>
      </tr>`;
  }).join('');
  wrap.innerHTML = `<table class="data-table" style="min-width:760px"><thead><tr>
    <th>Unidad</th><th>Equipo</th><th>Fecha</th><th>Inspector</th><th style="text-align:right">Conformidad</th><th style="text-align:center">No conf.</th><th>Estado</th><th></th>
    </tr></thead><tbody>${body}</tbody></table>`;
}
function _chkKpi(color, icon, label, value, sub) {
  return `<div class="kpi-card ${color}"><div class="kpi-label">${label}</div><div class="kpi-value ${color}">${value}</div><div class="kpi-sub">${sub}</div><i class="fas ${icon} kpi-icon"></i></div>`;
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
