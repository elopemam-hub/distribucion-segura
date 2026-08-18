// ============================================================
// MÓDULO CAPACITACIONES
// Cronograma anual · Semana de seguridad · Safety Alert · Campañas
// Base legal: Ley 29783 Art. 35 (programa anual de capacitación SST).
// ============================================================

let _capTipo = 'cronograma';
let _capData = [];
let _capBuscarTimer = null;
let _capVista = 'lista';   // solo cronograma: 'lista' | 'matriz'

// Textos y columnas por sub-módulo.
const CAP_META = {
  cronograma: {
    nuevo: 'Nueva capacitación', titulo: 'Tema / Título', fecha: 'Fecha programada',
    desc: 'Contenido / Observaciones', lugar: 'Lugar',
    cols: ['Tema', 'Tipo', 'Dirigido a', 'Fecha', 'Horas', 'Particip.', 'Estado'],
  },
  semana: {
    nuevo: 'Nueva actividad', titulo: 'Actividad', fecha: 'Fecha',
    desc: 'Descripción', lugar: 'Lugar / Área',
    cols: ['Actividad', 'Fecha', 'Hora', 'Lugar', 'Responsable', 'Estado'],
  },
  alerta: {
    nuevo: 'Nueva alerta', titulo: 'Título de la alerta', fecha: 'Fecha',
    desc: 'Descripción / Lección aprendida / Medidas', lugar: 'Área / Proceso',
    cols: ['Título', 'Tipo', 'Área', 'Fecha', 'Imagen'],
  },
  campana: {
    nuevo: 'Nueva campaña', titulo: 'Nombre de la campaña', fecha: 'Fecha inicio',
    desc: 'Objetivo', lugar: 'Lugar',
    cols: ['Campaña', 'Objetivo', 'Periodo', 'Dirigido a', 'Estado'],
  },
};

const CAP_ESTADO_BADGE = {
  programado:  ['badge-info', 'Programado'],
  en_curso:    ['badge-warning', 'En curso'],
  ejecutado:   ['badge-success', 'Ejecutado'],
  reprogramado:['badge-secondary', 'Reprogramado'],
  cancelado:   ['badge-danger', 'Cancelado'],
};

function initCapacitaciones() {
  switchCapTab('cronograma');
}

function switchCapTab(tipo) {
  _capTipo = tipo;
  _capVista = 'lista';
  document.querySelectorAll('.cap-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('cap-btn-' + tipo)?.classList.add('active');
  const lbl = document.getElementById('capNuevoLabel');
  if (lbl) lbl.textContent = CAP_META[tipo].nuevo;
  // El toggle Lista/Matriz solo aplica al cronograma anual.
  const tog = document.getElementById('capVistaToggle');
  if (tog) tog.style.display = tipo === 'cronograma' ? '' : 'none';
  _capActualizarToggle();
  cargarCapacitaciones();
}

function capSetVista(v) {
  _capVista = v;
  // La matriz es por año: si no hay año elegido, usa el actual.
  if (v === 'matriz') {
    const sel = document.getElementById('capFiltroAnio');
    if (sel && !sel.value) { sel.value = String(new Date().getFullYear()); }
  }
  _capActualizarToggle();
  cargarCapacitaciones();
}

function _capActualizarToggle() {
  const set = (el, on) => { if (el) { el.classList.toggle('btn-primary', on); el.classList.toggle('btn-outline', !on); } };
  set(document.getElementById('capVistaLista'),  _capVista === 'lista');
  set(document.getElementById('capVistaMatriz'), _capVista === 'matriz');
}

function capBuscarDebounced() {
  clearTimeout(_capBuscarTimer);
  _capBuscarTimer = setTimeout(cargarCapacitaciones, 350);
}

async function cargarCapacitaciones() {
  const wrap = document.getElementById('capTablaWrap');
  const anio   = document.getElementById('capFiltroAnio')?.value || '';
  const estado = document.getElementById('capFiltroEstado')?.value || '';
  const q      = document.getElementById('capFiltroQ')?.value.trim() || '';
  const params = new URLSearchParams({ action: 'list', tipo: _capTipo });
  if (anio)   params.set('anio', anio);
  if (estado) params.set('estado', estado);
  if (q)      params.set('q', q);

  try {
    const r = await fetch('api/capacitaciones.php?' + params);
    const d = await r.json();
    _capData = (d && d.success && d.data && d.data.items) ? d.data.items : [];
    _capLlenarAnios(d && d.success ? (d.data.anios || []) : []);
  } catch (e) { _capData = []; }
  renderCapKpis();
  renderCapTabla();
}

function _capLlenarAnios(anios) {
  const sel = document.getElementById('capFiltroAnio');
  if (!sel) return;
  const actual = String(new Date().getFullYear());
  const set = new Set(anios.map(String));
  set.add(actual);
  const prev = sel.value;
  sel.innerHTML = '<option value="">Todos</option>' +
    Array.from(set).sort((a, b) => b - a).map(a => `<option value="${a}">${a}</option>`).join('');
  sel.value = prev;
}

function renderCapKpis() {
  const cont = document.getElementById('capKpis');
  if (!cont) return;
  const total = _capData.length;
  const ejec  = _capData.filter(x => x.estado === 'ejecutado').length;
  const prog  = _capData.filter(x => x.estado === 'programado').length;
  const pct   = total ? Math.round(ejec / total * 100) : 0;
  const horas = _capData.reduce((a, x) => a + (parseFloat(x.horas) || 0), 0);

  if (_capTipo === 'alerta') {
    cont.innerHTML =
      _kpi('azul', 'fa-triangle-exclamation', 'Alertas', total, 'emitidas') +
      _kpi('naranja', 'fa-calendar-day', 'Este año', _capData.filter(x => +x.anio === new Date().getFullYear()).length, 'en el año actual');
    return;
  }
  cont.innerHTML =
    _kpi('azul', 'fa-list-check', 'Registros', total, _capTituloPlural()) +
    _kpi('verde', 'fa-circle-check', 'Ejecutados', ejec, pct + '% de cumplimiento') +
    _kpi('amarillo', 'fa-clock', 'Programados', prog, 'pendientes') +
    (_capTipo === 'cronograma' ? _kpi('naranja', 'fa-hourglass-half', 'Horas', horas.toFixed(1), 'horas-hombre plan') : '');
}
function _kpi(color, icon, label, value, sub) {
  return `<div class="kpi-card ${color}"><div class="kpi-label">${label}</div>` +
    `<div class="kpi-value ${color}">${value}</div><div class="kpi-sub">${sub}</div>` +
    `<i class="fas ${icon} kpi-icon"></i></div>`;
}
function _capTituloPlural() {
  return { cronograma: 'capacitaciones', semana: 'actividades', alerta: 'alertas', campana: 'campañas' }[_capTipo];
}

function _capBadge(estado) {
  const b = CAP_ESTADO_BADGE[estado] || ['badge-secondary', estado || '—'];
  return `<span class="badge ${b[0]}">${b[1]}</span>`;
}
function _capFecha(f) { if (!f) return '—'; const m = String(f).split('-'); return m.length === 3 ? `${m[2]}/${m[1]}/${m[0]}` : f; }

// Color de fondo del marcador según estado.
const CAP_ESTADO_COLOR = {
  programado: 'var(--azul)', en_curso: 'var(--naranja)', ejecutado: 'var(--verde)',
  reprogramado: 'var(--amarillo)', cancelado: 'var(--gris-500)',
};

function renderCapTabla() {
  if (_capTipo === 'cronograma' && _capVista === 'matriz') { renderCapMatriz(); return; }
  const wrap = document.getElementById('capTablaWrap');
  if (!wrap) return;
  const meta = CAP_META[_capTipo];
  if (!_capData.length) {
    wrap.innerHTML = '<p class="muted" style="text-align:center;padding:28px">Sin registros. Crea el primero con “' + meta.nuevo + '”.</p>';
    return;
  }
  const head = meta.cols.map(c => `<th>${c}</th>`).join('') + '<th style="text-align:right">Acciones</th>';
  const body = _capData.map(x => `<tr>${_capFila(x)}<td style="text-align:right;white-space:nowrap">${_capAcciones(x)}</td></tr>`).join('');
  wrap.innerHTML = `<table class="data-table" style="min-width:760px"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

// Matriz mensual del cronograma anual: temas (filas) × 12 meses (columnas).
function renderCapMatriz() {
  const wrap = document.getElementById('capTablaWrap');
  if (!wrap) return;
  const anio = parseInt(document.getElementById('capFiltroAnio')?.value, 10) || new Date().getFullYear();
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const regs = _capData.filter(x => +x.anio === anio);

  if (!regs.length) {
    wrap.innerHTML = `<p class="muted" style="text-align:center;padding:28px">Sin capacitaciones programadas en ${anio}. Crea una con “${CAP_META.cronograma.nuevo}”.</p>`;
    return;
  }

  // Agrupa por tema; cada tema marca los meses donde tiene sesiones.
  const grupos = new Map();
  regs.forEach(x => {
    if (!grupos.has(x.titulo)) grupos.set(x.titulo, { titulo: x.titulo, dirigido_a: x.dirigido_a, meses: Array.from({ length: 12 }, () => []) });
    const m = x.fecha ? (parseInt(String(x.fecha).split('-')[1], 10) - 1) : -1;
    if (m >= 0 && m <= 11) grupos.get(x.titulo).meses[m].push(x);
  });

  const head = '<th style="position:sticky;left:0;background:var(--gris-800);z-index:6;min-width:190px">Tema</th>' +
    '<th style="min-width:90px">Dirigido a</th>' +
    meses.map(m => `<th style="text-align:center;font-size:10px;width:40px">${m}</th>`).join('');

  const body = Array.from(grupos.values()).map(g => {
    const celdas = g.meses.map(arr => {
      if (!arr.length) return '<td style="text-align:center;color:var(--gris-600)">·</td>';
      const r = arr[0];
      const col = CAP_ESTADO_COLOR[r.estado] || 'var(--gris-500)';
      const tip = arr.map(a => _capFecha(a.fecha) + ' — ' + (CAP_ESTADO_BADGE[a.estado] ? CAP_ESTADO_BADGE[a.estado][1] : a.estado)).join(' · ');
      const lbl = arr.length > 1 ? arr.length : '<i class="fas fa-check" style="font-size:9px"></i>';
      return `<td style="text-align:center"><button onclick="editarCapacitacion(${r.id})" title="${escapeHtml(tip)}" ` +
        `style="border:0;background:${col};color:#fff;border-radius:4px;min-width:24px;height:22px;padding:0 5px;font-size:11px;font-weight:700;cursor:pointer">${lbl}</button></td>`;
    }).join('');
    return '<tr>' +
      `<td style="position:sticky;left:0;background:var(--gris-800);z-index:1;font-weight:600;color:var(--gris-100)">${escapeHtml(g.titulo)}</td>` +
      `<td class="muted">${g.dirigido_a ? escapeHtml(g.dirigido_a) : 'Todos'}</td>` +
      celdas + '</tr>';
  }).join('');

  const leyenda = '<div style="display:flex;gap:14px;flex-wrap:wrap;padding:10px 14px;font-size:11px;color:var(--gris-400)">' +
    Object.entries(CAP_ESTADO_BADGE).map(([k, v]) =>
      `<span><span style="display:inline-block;width:11px;height:11px;border-radius:3px;background:${CAP_ESTADO_COLOR[k]};vertical-align:middle;margin-right:4px"></span>${v[1]}</span>`).join('') +
    '<span style="margin-left:auto;font-weight:600;color:var(--gris-300)">Programa anual ' + anio + '</span></div>';

  wrap.innerHTML = leyenda +
    `<table class="data-table" style="min-width:820px"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function _capFila(x) {
  const t = e => escapeHtml(x[e] || '') || '<span class="muted">—</span>';
  const nombre = `<td><div style="font-weight:600;color:var(--gris-100)">${escapeHtml(x.titulo)}</div></td>`;
  if (_capTipo === 'cronograma') {
    return nombre +
      `<td class="muted">${t('subtipo')}</td>` +
      `<td class="muted">${x.dirigido_a ? escapeHtml(x.dirigido_a) : 'Todos'}</td>` +
      `<td class="muted">${_capFecha(x.fecha)}</td>` +
      `<td style="text-align:right;font-variant-numeric:tabular-nums">${x.horas ? (+x.horas) : '—'}</td>` +
      `<td style="text-align:right;font-variant-numeric:tabular-nums">${x.participantes != null ? x.participantes : '—'}</td>` +
      `<td>${_capBadge(x.estado)}</td>`;
  } else if (_capTipo === 'semana') {
    return nombre +
      `<td class="muted">${_capFecha(x.fecha)}</td>` +
      `<td class="muted">${t('hora')}</td>` +
      `<td class="muted">${t('lugar')}</td>` +
      `<td class="muted">${t('responsable')}</td>` +
      `<td>${_capBadge(x.estado)}</td>`;
  } else if (_capTipo === 'alerta') {
    const img = x.imagen
      ? `<a href="#" onclick="verDocumento('${(typeof UPLOAD_URL !== 'undefined' ? UPLOAD_URL : 'uploads/')}${x.imagen}');return false;" title="Ver imagen"><i class="fas fa-image" style="color:var(--primary)"></i></a>`
      : '<span class="muted">—</span>';
    return nombre +
      `<td><span class="badge badge-warning">${t('subtipo')}</span></td>` +
      `<td class="muted">${t('lugar')}</td>` +
      `<td class="muted">${_capFecha(x.fecha)}</td>` +
      `<td style="text-align:center">${img}</td>`;
  } else { // campana
    const per = _capFecha(x.fecha) + (x.fecha_fin ? ' – ' + _capFecha(x.fecha_fin) : '');
    return nombre +
      `<td class="muted" style="max-width:260px">${x.descripcion ? escapeHtml(x.descripcion) : '—'}</td>` +
      `<td class="muted">${per}</td>` +
      `<td class="muted">${x.dirigido_a ? escapeHtml(x.dirigido_a) : 'Todos'}</td>` +
      `<td>${_capBadge(x.estado)}</td>`;
  }
}

function _capAcciones(x) {
  let btns = `<button class="btn btn-outline btn-sm" onclick="editarCapacitacion(${x.id})" title="Editar"><i class="fas fa-pen"></i></button> `;
  if (_capTipo !== 'alerta' && x.estado !== 'ejecutado') {
    btns += `<button class="btn btn-outline btn-sm" onclick="capMarcarEjecutado(${x.id})" title="Marcar ejecutado"><i class="fas fa-check"></i></button> `;
  }
  btns += `<button class="btn btn-outline btn-sm" onclick="eliminarCapacitacion(${x.id})" title="Eliminar"><i class="fas fa-trash" style="color:var(--rojo)"></i></button>`;
  return btns;
}

// ── Modal ──
function _capMostrarCampos(tipo) {
  document.querySelectorAll('#modalCapacitacion [class*="cap-for-"]').forEach(el => {
    el.style.display = el.classList.contains('cap-for-' + tipo) ? '' : 'none';
  });
  const meta = CAP_META[tipo];
  document.getElementById('cap_lbl_titulo').innerHTML = meta.titulo + ' <span style="color:var(--rojo)">*</span>';
  document.getElementById('cap_lbl_fecha').textContent = meta.fecha;
  document.getElementById('cap_lbl_desc').textContent = meta.desc;
  const lf = document.getElementById('cap_lbl_fechafin'); if (lf) lf.textContent = tipo === 'campana' ? 'Fecha fin' : 'Fecha fin';
  const ll = document.getElementById('cap_lbl_lugar'); if (ll) ll.textContent = meta.lugar;
}

function nuevaCapacitacion() {
  document.getElementById('capModalTitulo').textContent = CAP_META[_capTipo].nuevo;
  document.getElementById('cap_id').value = '';
  document.getElementById('cap_tipo').value = _capTipo;
  ['cap_titulo','cap_fecha','cap_fecha_fin','cap_hora','cap_lugar','cap_horas','cap_participantes','cap_responsable','cap_descripcion','cap_imagen'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('cap_anio').value = new Date().getFullYear();
  document.getElementById('cap_estado').value = 'programado';
  document.getElementById('cap_subtipo_cap').value = '';
  document.getElementById('cap_subtipo_alerta').value = '';
  document.getElementById('cap_dirigido_a').value = '';
  document.getElementById('cap_img_ver').style.display = 'none';
  _capMostrarCampos(_capTipo);
  abrirModal('modalCapacitacion');
}

async function editarCapacitacion(id) {
  try {
    const r = await fetch('api/capacitaciones.php?action=get&id=' + id);
    const d = await r.json();
    if (!d.success) { toast(d.message || 'No encontrado', 'error'); return; }
    const x = d.data;
    _capTipo = x.tipo;
    document.getElementById('capModalTitulo').textContent = 'Editar · ' + CAP_META[x.tipo].nuevo.replace(/^Nuev[ao] /, '');
    document.getElementById('cap_id').value = x.id;
    document.getElementById('cap_tipo').value = x.tipo;
    document.getElementById('cap_titulo').value = x.titulo || '';
    document.getElementById('cap_anio').value = x.anio || new Date().getFullYear();
    document.getElementById('cap_fecha').value = x.fecha || '';
    document.getElementById('cap_fecha_fin').value = x.fecha_fin || '';
    document.getElementById('cap_hora').value = x.hora || '';
    document.getElementById('cap_lugar').value = x.lugar || '';
    document.getElementById('cap_horas').value = x.horas || '';
    document.getElementById('cap_participantes').value = x.participantes != null ? x.participantes : '';
    document.getElementById('cap_responsable').value = x.responsable || '';
    document.getElementById('cap_descripcion').value = x.descripcion || '';
    document.getElementById('cap_estado').value = x.estado || 'programado';
    document.getElementById('cap_dirigido_a').value = x.dirigido_a || '';
    document.getElementById('cap_subtipo_cap').value = x.tipo === 'cronograma' ? (x.subtipo || '') : '';
    document.getElementById('cap_subtipo_alerta').value = x.tipo === 'alerta' ? (x.subtipo || '') : '';
    document.getElementById('cap_imagen').value = '';
    const ver = document.getElementById('cap_img_ver');
    if (x.imagen) { ver.href = (typeof UPLOAD_URL !== 'undefined' ? UPLOAD_URL : 'uploads/') + x.imagen; ver.style.display = 'inline'; }
    else ver.style.display = 'none';
    _capMostrarCampos(x.tipo);
    abrirModal('modalCapacitacion');
  } catch (e) { toast('Error al cargar', 'error'); }
}

async function guardarCapacitacion() {
  const tipo = document.getElementById('cap_tipo').value;
  const titulo = document.getElementById('cap_titulo').value.trim();
  if (!titulo) { toast('El título es obligatorio', 'warning'); return; }

  const fd = new FormData();
  fd.append('action', 'save');
  fd.append('csrf_token', CSRF_TOKEN);
  fd.append('id', document.getElementById('cap_id').value || '0');
  fd.append('tipo', tipo);
  fd.append('titulo', titulo);
  fd.append('anio', document.getElementById('cap_anio').value || new Date().getFullYear());
  fd.append('fecha', document.getElementById('cap_fecha').value);
  fd.append('fecha_fin', document.getElementById('cap_fecha_fin').value);
  fd.append('hora', document.getElementById('cap_hora').value.trim());
  fd.append('lugar', document.getElementById('cap_lugar').value.trim());
  fd.append('horas', document.getElementById('cap_horas').value);
  fd.append('participantes', document.getElementById('cap_participantes').value);
  fd.append('responsable', document.getElementById('cap_responsable').value.trim());
  fd.append('descripcion', document.getElementById('cap_descripcion').value.trim());
  fd.append('estado', document.getElementById('cap_estado').value);
  fd.append('dirigido_a', document.getElementById('cap_dirigido_a').value);
  fd.append('subtipo', tipo === 'alerta'
    ? document.getElementById('cap_subtipo_alerta').value
    : (tipo === 'cronograma' ? document.getElementById('cap_subtipo_cap').value : ''));
  const img = document.getElementById('cap_imagen').files[0];
  if (img) fd.append('imagen', img);

  const btn = document.getElementById('capGuardarBtn');
  if (btn) btn.disabled = true;
  try {
    const r = await fetch('api/capacitaciones.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (!d.success) { toast(d.message || 'No se pudo guardar', 'error'); return; }
    toast('Guardado', 'success');
    cerrarModal('modalCapacitacion');
    cargarCapacitaciones();   // conserva la sub-pestaña y la vista (lista/matriz)
  } catch (e) { toast('Error al guardar', 'error'); }
  finally { if (btn) btn.disabled = false; }
}

async function capMarcarEjecutado(id) {
  await _capEstado(id, 'ejecutado');
}
async function _capEstado(id, estado) {
  const fd = new FormData();
  fd.append('action', 'estado'); fd.append('csrf_token', CSRF_TOKEN); fd.append('id', id); fd.append('estado', estado);
  try {
    const r = await fetch('api/capacitaciones.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (!d.success) { toast(d.message || 'Error', 'error'); return; }
    cargarCapacitaciones();
  } catch (e) { toast('Error', 'error'); }
}

async function eliminarCapacitacion(id) {
  if (!confirm('¿Eliminar este registro? No se puede deshacer.')) return;
  const fd = new FormData();
  fd.append('action', 'delete'); fd.append('csrf_token', CSRF_TOKEN); fd.append('id', id);
  try {
    const r = await fetch('api/capacitaciones.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (!d.success) { toast(d.message || 'Error', 'error'); return; }
    toast('Eliminado', 'success');
    cargarCapacitaciones();
  } catch (e) { toast('Error', 'error'); }
}
