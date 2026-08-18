// ============================================================
// MÓDULO CAPACITACIONES
// Cronograma anual · Semana de seguridad · Safety Alert · Campañas
// Base legal: Ley 29783 Art. 35 (programa anual de capacitación SST).
// ============================================================

let _capTipo = 'cronograma';
let _capData = [];
let _capBuscarTimer = null;
let _capVista = 'lista';   // solo cronograma: 'lista' | 'matriz'
let _capPag = 1;
const CAP_PAGE_SIZE = 20;
function irCapPagina(n) { _capPag = n; renderCapTabla(); }

// Barra de paginación (mismas clases que el resto del sistema).
function _capPagBar(total, pagina, porPag, fnName) {
  const totalPags = Math.max(1, Math.ceil(total / porPag));
  const desde = total ? (pagina - 1) * porPag + 1 : 0;
  const hasta = Math.min(pagina * porPag, total);
  let pags = [];
  if (totalPags <= 7) pags = Array.from({ length: totalPags }, (_, i) => i + 1);
  else {
    pags = [1];
    if (pagina > 3) pags.push('…');
    for (let p = Math.max(2, pagina - 1); p <= Math.min(totalPags - 1, pagina + 1); p++) pags.push(p);
    if (pagina < totalPags - 2) pags.push('…');
    pags.push(totalPags);
  }
  const btns = `<button onclick="${fnName}(${pagina - 1})" ${pagina === 1 ? 'disabled' : ''}>&#8249;</button>` +
    pags.map(p => p === '…' ? '<button disabled style="border:none;background:none;cursor:default">…</button>'
      : `<button class="${p === pagina ? 'active' : ''}" onclick="${fnName}(${p})">${p}</button>`).join('') +
    `<button onclick="${fnName}(${pagina + 1})" ${pagina === totalPags ? 'disabled' : ''}>&#8250;</button>`;
  return '<div class="amon-pag-bar"><span class="amon-pag-info">' +
    (total ? `Mostrando ${desde}–${hasta} de ${total}` : '') +
    '</span><div class="amon-pag-btns">' + (totalPags > 1 ? btns : '') + '</div></div>';
}

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
  _capPag = 1;   // vuelve a la primera página al recargar/filtrar
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
  const pag = document.getElementById('capPagWrap');
  if (_capTipo === 'cronograma' && _capVista === 'matriz') { if (pag) pag.innerHTML = ''; renderCapMatriz(); return; }
  const wrap = document.getElementById('capTablaWrap');
  if (!wrap) return;
  const meta = CAP_META[_capTipo];
  if (!_capData.length) {
    wrap.innerHTML = '<p class="muted" style="text-align:center;padding:28px">Sin registros. Crea el primero con “' + meta.nuevo + '”.</p>';
    if (pag) pag.innerHTML = '';
    return;
  }
  // Paginación (20 por página).
  const total = _capData.length;
  const totalPags = Math.max(1, Math.ceil(total / CAP_PAGE_SIZE));
  if (_capPag > totalPags) _capPag = totalPags;
  if (_capPag < 1) _capPag = 1;
  const pageRows = _capData.slice((_capPag - 1) * CAP_PAGE_SIZE, _capPag * CAP_PAGE_SIZE);

  const head = meta.cols.map(c => `<th>${c}</th>`).join('') + '<th style="text-align:right">Acciones</th>';
  const body = pageRows.map(x => `<tr>${_capFila(x)}<td style="text-align:right;white-space:nowrap">${_capAcciones(x)}</td></tr>`).join('');
  wrap.innerHTML = `<table class="data-table" style="min-width:760px"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
  if (pag) pag.innerHTML = _capPagBar(total, _capPag, CAP_PAGE_SIZE, 'irCapPagina');
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
  // Evidencia (material/fotos/asistencia) disponible en todos los sub-módulos.
  btns += `<button class="btn btn-outline btn-sm" onclick="abrirEvidencia(${x.id}, '${escapeHtml(x.titulo).replace(/'/g, "\\'")}')" title="Evidencia: material, fotos y asistencia"><i class="fas fa-paperclip"></i></button> `;
  if (x.estado !== 'ejecutado') {
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

// ============================================================
// EVIDENCIA / DESPLIEGUE: material, fotos y lista de asistencia
// ============================================================
let _capEvId = 0;
let _capEvData = { adjuntos: [], asistentes: [] };
let _capFirmaTarget = null;      // { asistenteId }
let _capBuscarTrabTimer = null;
let _capBuscarTrabResultados = [];

const _UP = () => (typeof UPLOAD_URL !== 'undefined' ? UPLOAD_URL : 'uploads/');

async function abrirEvidencia(id, titulo) {
  _capEvId = id;
  document.getElementById('capEvTitulo').textContent = titulo || '';
  document.getElementById('capEvId').value = id;
  ['capFileMaterial', 'capFileFoto', 'capFileAsistencia', 'capAsisBuscar', 'capManualNombre', 'capManualDni', 'capManualCargo'].forEach(i => { const el = document.getElementById(i); if (el) el.value = ''; });
  document.getElementById('capManualBox').style.display = 'none';
  document.getElementById('capAsisResultados').style.display = 'none';
  await cargarEvidencia();
  abrirModal('modalEvidencia');
}

async function cargarEvidencia() {
  try {
    const r = await fetch('api/capacitaciones.php?action=evidencia&id=' + _capEvId);
    const d = await r.json();
    _capEvData = (d && d.success) ? d.data : { adjuntos: [], asistentes: [] };
  } catch (e) { _capEvData = { adjuntos: [], asistentes: [] }; }
  renderEvAdjuntos();
  renderEvAsistentes();
}

function _capIcono(archivo) {
  const ext = (archivo.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return 'fa-file-pdf';
  if (ext === 'doc' || ext === 'docx') return 'fa-file-word';
  if (ext === 'ppt' || ext === 'pptx') return 'fa-file-powerpoint';
  if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return 'fa-file-image';
  return 'fa-file';
}
function _capEsImagen(archivo) { return ['jpg', 'jpeg', 'png', 'webp'].includes((archivo.split('.').pop() || '').toLowerCase()); }

// HTML de una fila de documento (material o hoja firmada).
function _capDocFila(a) {
  const url = _UP() + a.archivo;
  const ver = (_capEsImagen(a.archivo) || /\.pdf$/i.test(a.archivo))
    ? 'onclick="verDocumento(\'' + encodeURI(url) + '\');return false;" href="#"'
    : 'href="' + url + '" target="_blank" rel="noopener"';
  return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--gris-700)">' +
    '<i class="fas ' + _capIcono(a.archivo) + '" style="color:var(--primary)"></i>' +
    '<a ' + ver + ' style="color:var(--gris-100);flex:1;text-decoration:none">' + escapeHtml(a.nombre_original || a.archivo) + '</a>' +
    '<button class="btn btn-outline btn-sm" onclick="capEliminarAdjunto(' + a.id + ')" title="Quitar"><i class="fas fa-trash" style="color:var(--rojo)"></i></button>' +
  '</div>';
}

function renderEvAdjuntos() {
  // Material de despliegue y hojas de asistencia firmadas van SEPARADOS.
  const material = _capEvData.adjuntos.filter(a => a.tipo === 'material');
  const mat = document.getElementById('capEvMaterial');
  if (mat) mat.innerHTML = material.length ? material.map(_capDocFila).join('') : '<span class="muted" style="font-size:12px">Sin material.</span>';

  const hojas = _capEvData.adjuntos.filter(a => a.tipo === 'asistencia');
  const asisCont = document.getElementById('capEvAsistencia');
  if (asisCont) {
    asisCont.innerHTML = hojas.length
      ? '<div style="font-size:11px;font-weight:700;color:var(--gris-400);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px"><i class="fas fa-file-signature" style="color:var(--primary)"></i> Hojas firmadas</div>' + hojas.map(_capDocFila).join('')
      : '';
  }

  const fotos = _capEvData.adjuntos.filter(a => a.tipo === 'foto');
  const gal = document.getElementById('capEvFotos');
  if (gal) {
    gal.innerHTML = fotos.length ? fotos.map(a => {
      const url = _UP() + a.archivo;
      return '<div style="position:relative">' +
        '<img src="' + url + '" onclick="verDocumento(\'' + encodeURI(url) + '\')" style="width:84px;height:84px;object-fit:cover;border-radius:6px;cursor:pointer;border:1px solid var(--gris-600)">' +
        '<button onclick="capEliminarAdjunto(' + a.id + ')" title="Quitar" style="position:absolute;top:-6px;right:-6px;background:var(--rojo);color:#fff;border:0;border-radius:50%;width:20px;height:20px;font-size:11px;cursor:pointer">&times;</button>' +
      '</div>';
    }).join('') : '<span class="muted" style="font-size:12px">Sin fotos.</span>';
  }
}

function renderEvAsistentes() {
  const body = document.getElementById('capAsisBody');
  if (!body) return;
  const a = _capEvData.asistentes;
  if (!a.length) { body.innerHTML = '<tr><td colspan="6" class="muted" style="text-align:center;padding:18px">Sin asistentes.</td></tr>'; return; }
  body.innerHTML = a.map((x, i) => {
    const firmado = +x.firmado === 1;
    const estadoFirma = firmado
      ? '<span class="badge badge-success"><i class="fas fa-check"></i> Firmado</span>'
      : '<span class="badge badge-warning">Pendiente</span>';
    return '<tr>' +
      '<td class="muted" style="text-align:center">' + (i + 1) + '</td>' +
      '<td style="font-weight:600;color:var(--gris-100)">' + escapeHtml(x.nombre) + '</td>' +
      '<td class="muted">' + (x.dni ? escapeHtml(x.dni) : '—') + '</td>' +
      '<td class="muted">' + (x.cargo ? escapeHtml(x.cargo) : '—') + '</td>' +
      '<td style="text-align:center">' + estadoFirma + '</td>' +
      '<td style="text-align:right;white-space:nowrap">' +
        '<button class="btn btn-outline btn-sm" onclick="capFirmar(' + x.id + ',\'' + escapeHtml(x.nombre).replace(/'/g, "\\'") + '\')" title="Firmar"><i class="fas fa-pen-nib"></i></button> ' +
        '<button class="btn btn-outline btn-sm" onclick="capEliminarAsistente(' + x.id + ')" title="Quitar"><i class="fas fa-user-minus" style="color:var(--rojo)"></i></button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

async function capSubirAdjunto(tipo) {
  const map = { material: 'capFileMaterial', foto: 'capFileFoto', asistencia: 'capFileAsistencia' };
  const input = document.getElementById(map[tipo]);
  const files = input ? Array.from(input.files || []) : [];
  if (!files.length) { if (tipo !== 'asistencia') toast('Elige un archivo primero', 'warning'); return; }
  let ok = 0; const fallos = [];
  for (const file of files) {
    const fd = new FormData();
    fd.append('action', 'adjunto_add'); fd.append('csrf_token', CSRF_TOKEN);
    fd.append('capacitacion_id', _capEvId); fd.append('tipo', tipo); fd.append('archivo', file);
    try {
      const r = await fetch('api/capacitaciones.php', { method: 'POST', body: fd });
      const d = await r.json();
      if (d.success) ok++; else fallos.push((file.name || '') + ': ' + (d.message || 'error'));
    } catch (e) { fallos.push((file.name || '') + ': conexión'); }
  }
  if (input) input.value = '';
  if (ok) toast(ok + (ok === 1 ? ' archivo subido' : ' archivos subidos'), 'success');
  if (fallos.length) toast('No se subieron: ' + fallos.join(' · '), 'error', 6000);
  cargarEvidencia();
}

async function capEliminarAdjunto(id) {
  if (!confirm('¿Quitar este archivo?')) return;
  await _capPost({ action: 'adjunto_del', id: id });
}

// ── Registro PDF en la misma pantalla (visor con iframe) ──
function abrirRegistroPdf() {
  const url = 'api/capacitaciones_pdf.php?id=' + _capEvId;
  document.getElementById('capPdfFrame').src = url;
  const ab = document.getElementById('capPdfAbrir');
  if (ab) ab.href = url;
  abrirModal('modalCapPdf');
}
function capImprimirRegistro() {
  const f = document.getElementById('capPdfFrame');
  try { f.contentWindow.focus(); f.contentWindow.print(); }
  catch (e) { window.open(f.src, '_blank'); }
}

// ── Agregar asistentes masivo (selección múltiple desde Personal) ──
let _capMasData = [];
let _capMasSel = new Set();

async function abrirMasivo() {
  _capMasSel = new Set();
  document.getElementById('capMasBuscar').value = '';
  document.getElementById('capMasCargo').value = '';
  document.getElementById('capMasTodos').checked = false;
  const cont = document.getElementById('capMasLista');
  cont.innerHTML = '<p class="muted" style="text-align:center;padding:20px">Cargando…</p>';
  abrirModal('modalCapMasivo');
  try {
    const r = await fetch('api/personal.php?action=list&activo=1&limit=500');
    const d = await r.json();
    const todos = (d && d.success && d.data && d.data.personal) ? d.data.personal : [];
    // Excluye a los que ya están en la lista de asistencia.
    const yaAgregados = new Set((_capEvData.asistentes || []).filter(a => a.personal_id).map(a => +a.personal_id));
    _capMasData = todos.filter(p => !yaAgregados.has(+p.id));
  } catch (e) { _capMasData = []; }
  renderMasivo();
}

function _capMasVisibles() {
  const q = (document.getElementById('capMasBuscar')?.value || '').trim().toLowerCase();
  const cargo = document.getElementById('capMasCargo')?.value || '';
  return _capMasData.filter(p => {
    if (cargo && p.cargo !== cargo) return false;
    if (q && !((p.nombre || '').toLowerCase().includes(q) || String(p.dni || '').includes(q))) return false;
    return true;
  });
}

function renderMasivo() {
  const cont = document.getElementById('capMasLista');
  if (!cont) return;
  const vis = _capMasVisibles();
  if (!_capMasData.length) { cont.innerHTML = '<p class="muted" style="text-align:center;padding:20px">Todo el personal activo ya está en la lista.</p>'; }
  else if (!vis.length) { cont.innerHTML = '<p class="muted" style="text-align:center;padding:20px">Sin resultados.</p>'; }
  else {
    cont.innerHTML = vis.map(p =>
      '<label style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--gris-700);cursor:pointer">' +
        '<input type="checkbox" class="cap-mas-chk" value="' + p.id + '" ' + (_capMasSel.has(+p.id) ? 'checked' : '') + ' onchange="capMasToggle(' + p.id + ',this.checked)" style="width:16px;height:16px;accent-color:var(--primary)">' +
        '<span style="flex:1"><span style="font-weight:600;color:var(--gris-100)">' + escapeHtml(p.nombre) + '</span>' +
        '<span class="muted" style="font-size:11px;margin-left:6px">' + escapeHtml(p.dni || '') + ' · ' + escapeHtml(p.cargo || '') + '</span></span>' +
      '</label>').join('');
  }
  _capMasActualizarContador();
}

function capMasToggle(id, on) { if (on) _capMasSel.add(+id); else _capMasSel.delete(+id); _capMasActualizarContador(); }

function capMasSelTodos(on) {
  const vis = _capMasVisibles();
  vis.forEach(p => { if (on) _capMasSel.add(+p.id); else _capMasSel.delete(+p.id); });
  document.querySelectorAll('.cap-mas-chk').forEach(c => { c.checked = on; });
  _capMasActualizarContador();
}

function _capMasActualizarContador() {
  const el = document.getElementById('capMasCount');
  if (el) el.textContent = _capMasSel.size;
}

async function capAgregarMasivo() {
  if (!_capMasSel.size) { toast('Selecciona al menos un trabajador', 'warning'); return; }
  const btn = document.getElementById('capMasBtn');
  if (btn) btn.disabled = true;
  const r = await _capPost({ action: 'asistente_masivo', capacitacion_id: _capEvId, personal_ids: JSON.stringify(Array.from(_capMasSel)) }, true);
  if (btn) btn.disabled = false;
  if (r && r.success) { toast(r.message, 'success'); cerrarModal('modalCapMasivo'); cargarEvidencia(); }
  else if (r) toast(r.message || 'Error', 'error');
}

function capBuscarTrab(q) {
  clearTimeout(_capBuscarTrabTimer);
  const cont = document.getElementById('capAsisResultados');
  if (q.trim().length < 2) { cont.style.display = 'none'; return; }
  _capBuscarTrabTimer = setTimeout(async () => {
    try {
      const r = await fetch('api/personal.php?action=buscar&q=' + encodeURIComponent(q.trim()));
      const d = await r.json();
      _capBuscarTrabResultados = d.success ? (d.data || []) : [];
    } catch (e) { _capBuscarTrabResultados = []; }
    if (!_capBuscarTrabResultados.length) { cont.innerHTML = '<div class="muted" style="padding:8px 12px;font-size:12px">Sin resultados.</div>'; cont.style.display = 'block'; return; }
    cont.innerHTML = _capBuscarTrabResultados.map(p =>
      '<div onclick="capSeleccionarTrab(' + p.id + ')" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--gris-700)" onmouseover="this.style.background=\'var(--gris-700)\'" onmouseout="this.style.background=\'\'">' +
        '<span style="font-weight:600;color:var(--gris-100)">' + escapeHtml(p.nombre) + '</span>' +
        '<span class="muted" style="font-size:11px;margin-left:6px">' + escapeHtml(p.dni || '') + ' · ' + escapeHtml(p.cargo || '') + '</span>' +
      '</div>').join('');
    cont.style.display = 'block';
  }, 300);
}

async function capSeleccionarTrab(personalId) {
  document.getElementById('capAsisResultados').style.display = 'none';
  document.getElementById('capAsisBuscar').value = '';
  const r = await _capPost({ action: 'asistente_add', capacitacion_id: _capEvId, personal_id: personalId }, true);
  if (r && r.success) { toast('Asistente agregado', 'success'); cargarEvidencia(); }
  else if (r) toast(r.message || 'Error', 'error');
}

function capToggleManual() {
  const box = document.getElementById('capManualBox');
  box.style.display = box.style.display === 'none' ? 'flex' : 'none';
}

async function capAgregarManual() {
  const nombre = document.getElementById('capManualNombre').value.trim();
  if (!nombre) { toast('Ingresa el nombre', 'warning'); return; }
  const r = await _capPost({
    action: 'asistente_add', capacitacion_id: _capEvId, nombre: nombre,
    dni: document.getElementById('capManualDni').value.trim(),
    cargo: document.getElementById('capManualCargo').value.trim(),
  }, true);
  if (r && r.success) {
    toast('Asistente agregado', 'success');
    ['capManualNombre', 'capManualDni', 'capManualCargo'].forEach(i => document.getElementById(i).value = '');
    cargarEvidencia();
  } else if (r) toast(r.message || 'Error', 'error');
}

async function capEliminarAsistente(id) {
  if (!confirm('¿Quitar a este asistente de la lista?')) return;
  await _capPost({ action: 'asistente_del', id: id });
}

// ── Firma (canvas) ──
function _capFirmaCanvas() { return document.getElementById('capFirmaCanvas'); }
function _capFirmaSetup() {
  const c = _capFirmaCanvas(); if (!c) return;
  const ctx = c.getContext('2d');
  c._ctx = ctx; c._draw = false; c._has = false;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#1565C0'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  const pos = e => { const r = c.getBoundingClientRect(), s = e.touches ? e.touches[0] : e; return { x: (s.clientX - r.left) * (c.width / r.width), y: (s.clientY - r.top) * (c.height / r.height) }; };
  c.onmousedown = e => { c._draw = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  c.onmouseup = () => c._draw = false; c.onmouseleave = () => c._draw = false;
  c.onmousemove = e => { if (!c._draw) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); c._has = true; };
  c.ontouchstart = e => { e.preventDefault(); c._draw = true; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); };
  c.ontouchend = () => c._draw = false;
  c.ontouchmove = e => { e.preventDefault(); if (!c._draw) return; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); c._has = true; };
}
function capFirmaLimpiar() {
  const c = _capFirmaCanvas(); if (!c || !c._ctx) return;
  c._ctx.fillStyle = '#fff'; c._ctx.fillRect(0, 0, c.width, c.height); c._has = false;
}
function capFirmar(asistenteId, nombre) {
  _capFirmaTarget = { asistenteId: asistenteId };
  document.getElementById('capFirmaNombre').textContent = nombre || '';
  abrirModal('modalFirmaCap');
  setTimeout(_capFirmaSetup, 60);
}
async function capFirmaGuardar() {
  const c = _capFirmaCanvas();
  if (!c || !c._has) { toast('Firma en el recuadro primero', 'warning'); return; }
  const firma = c.toDataURL('image/png');
  const r = await _capPost({ action: 'asistente_firma', id: _capFirmaTarget.asistenteId, firma: firma }, true);
  if (r && r.success) { toast('Firma guardada', 'success'); cerrarModal('modalFirmaCap'); cargarEvidencia(); }
  else if (r) toast(r.message || 'Error', 'error');
}

// POST helper con FormData. devolver=true → retorna la respuesta; si no, recarga evidencia.
async function _capPost(campos, devolver) {
  const fd = new FormData();
  fd.append('csrf_token', CSRF_TOKEN);
  Object.entries(campos).forEach(([k, v]) => fd.append(k, v));
  try {
    const r = await fetch('api/capacitaciones.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (devolver) return d;
    if (!d.success) { toast(d.message || 'Error', 'error'); return d; }
    cargarEvidencia();
    return d;
  } catch (e) { toast('Error de conexión', 'error'); return null; }
}
