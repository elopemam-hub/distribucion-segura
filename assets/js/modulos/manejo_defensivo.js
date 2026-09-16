// ============================================================
// SUB-MÓDULO: MANEJO A LA DEFENSIVA (dentro de Capacitaciones)
// Programa de manejo defensivo para toda la flota de conductores.
// Padrón dinámico + vigencia configurable + registro individual + nota
// enlazada al examen_defensiva de Evaluaciones.
// Reutiliza helpers globales de capacitaciones.js: _kpi, _capPagBar, _capFecha,
// _UP, escapeHtml, toast, abrirModal, cerrarModal, verDocumento, CSRF_TOKEN, USER_ROL.
// ============================================================

let _defData = [];
let _defPag = 1;
let _defPeriodicidad = 12;
let _defConExamen = false;
const DEF_PAGE_SIZE = 20;
function irDefPagina(n) { _defPag = n; renderDefensivo(); }

// Registrar es admin+supervisor; configurar/temario solo admin (el server lo valida).
function _defEditable() {
  return typeof USER_ROL !== 'undefined' && (USER_ROL === 'administrador' || USER_ROL === 'supervisor');
}
function _defAdmin() {
  return typeof USER_ROL !== 'undefined' && USER_ROL === 'administrador';
}

async function cargarDefensivo() {
  _defPag = 1;
  const wrap = document.getElementById('capTablaWrap');
  if (wrap) wrap.innerHTML = '<p class="muted" style="text-align:center;padding:28px">Cargando conductores…</p>';
  try {
    const r = await fetch('api/manejo_defensivo.php?action=list');
    const d = await r.json();
    _defData = (d && d.success && d.data && d.data.items) ? d.data.items : [];
    _defPeriodicidad = (d && d.success) ? (d.data.periodicidad ?? 12) : 12;
    _defConExamen = (d && d.success) ? !!d.data.con_examen : false;
  } catch (e) { _defData = []; }
  renderDefensivo();
}

// Estado de vigencia del manejo defensivo: considera lo MÁS RECIENTE entre
//  (a) la capacitación de manejo defensivo (def_registros) y
//  (b) el Examen Defensiva APROBADO (Evaluaciones).
// El vencimiento del examen = fecha del examen + periodicidad configurada.
function _diasDesde(fechaISO) {
  if (!fechaISO) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(fechaISO + 'T00:00:00') - hoy) / 86400000);
}
function _defVence(fechaISO) {
  const per = _defPeriodicidad || 0;
  if (!fechaISO || per <= 0) return null;
  const d = new Date(fechaISO + 'T00:00:00');
  d.setMonth(d.getMonth() + per);
  return d.toISOString().slice(0, 10);
}
function _defEstado(x) {
  const cands = [];
  // (a) Capacitación de manejo defensivo.
  if (x.n_reg && x.ult_fecha) cands.push({ origen: 'capacitación', fecha: x.ult_fecha, venc: x.ult_venc || null });
  // (b) Examen Defensiva aprobado → su fecha cuenta como última capacitación.
  if (x.examen_fecha && x.examen_estado === 'aprobado') {
    cands.push({ origen: 'examen defensiva', fecha: x.examen_fecha, venc: _defVence(x.examen_fecha) });
  }
  if (!cands.length) return { k: 'sin', label: 'Sin registro', badge: 'badge-secondary', origen: '', fecha: null, venc: null };

  // Elige el candidato con mejor vigencia (mayor días para vencer). Sin venc = al día.
  let best = null;
  for (const c of cands) {
    const dias = c.venc ? _diasDesde(c.venc) : Infinity;
    if (best === null || dias > best.dias) best = { dias: dias, origen: c.origen, fecha: c.fecha, venc: c.venc };
  }
  const base = { origen: best.origen, fecha: best.fecha, venc: best.venc };
  const d = best.dias;
  if (d === Infinity) return { k: 'ok', label: 'Al día', badge: 'badge-success', ...base };
  if (d < 0)   return { k: 'venc', label: 'Vencido', badge: 'badge-danger', ...base };
  if (d <= 30) return { k: 'porv', label: 'Por vencer (' + d + 'd)', badge: 'badge-warning', ...base };
  return { k: 'ok', label: 'Al día', badge: 'badge-success', ...base };
}

function renderDefensivo() {
  const wrap = document.getElementById('capTablaWrap');
  const pag = document.getElementById('capPagWrap');
  const al = document.getElementById('capAlertas'); if (al) al.innerHTML = '';
  if (!wrap) return;

  const q = (document.getElementById('capFiltroQ')?.value || '').trim().toLowerCase();
  let items = _defData;
  if (q) items = items.filter(x => (x.nombre || '').toLowerCase().includes(q) || String(x.dni || '').includes(q));

  const total = items.length;
  const est = items.map(_defEstado);
  const nOk = est.filter(e => e.k === 'ok').length;
  const nPorV = est.filter(e => e.k === 'porv').length;
  const nVenc = est.filter(e => e.k === 'venc').length;
  const nSin = est.filter(e => e.k === 'sin').length;
  const cobertura = total ? Math.round(((nOk + nPorV) / total) * 100) : 0;

  const kpis = document.getElementById('capKpis');
  if (kpis) kpis.innerHTML =
    _kpi('azul', 'fa-users', 'Conductores', total, 'padrón activo') +
    _kpi(cobertura >= 80 ? 'verde' : 'amarillo', 'fa-shield-halved', 'Cobertura vigente', cobertura + '%', nOk + nPorV + ' con vigencia') +
    _kpi('amarillo', 'fa-clock', 'Por vencer', nPorV, 'en 30 días o menos') +
    _kpi('naranja', 'fa-triangle-exclamation', 'Vencidos', nVenc, 'recertificar') +
    _kpi('rojo', 'fa-user-xmark', 'Sin registro', nSin, 'nunca capacitados');

  // Alerta si hay pendientes.
  if (al && (nVenc + nSin) > 0) {
    al.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;margin-bottom:10px;border-radius:8px;border-left:4px solid #e74c3c;background:rgba(231,76,60,.12);color:var(--gris-100);font-size:13px">' +
      '<i class="fas fa-triangle-exclamation" style="color:#e74c3c;font-size:16px"></i><span><strong>' + (nVenc + nSin) + '</strong> conductor(es) sin manejo defensivo vigente (' + nVenc + ' vencidos · ' + nSin + ' sin registro). Programa su capacitación.</span></div>';
  }

  if (!total) {
    wrap.innerHTML = '<p class="muted" style="text-align:center;padding:28px">' +
      (q ? 'Sin conductores que coincidan.' : 'No hay conductores activos. Regístralos en Personal.') + '</p>';
    if (pag) pag.innerHTML = '';
    return;
  }

  const totalPags = Math.max(1, Math.ceil(total / DEF_PAGE_SIZE));
  if (_defPag > totalPags) _defPag = totalPags;
  if (_defPag < 1) _defPag = 1;
  const rows = items.slice((_defPag - 1) * DEF_PAGE_SIZE, _defPag * DEF_PAGE_SIZE);

  const head = '<th style="width:5%">N°</th><th>Conductor</th><th>DNI</th><th>Empresa</th>' +
    '<th>Última capacit.</th><th>Vence</th><th style="text-align:center">Estado</th>' +
    (_defConExamen ? '<th style="text-align:center" title="Última nota del Examen Defensiva (Evaluaciones)">Examen defensivo</th>' : '') +
    '<th style="text-align:right">Acciones</th>';

  const editable = _defEditable();
  const body = rows.map((x, i) => {
    const n = (_defPag - 1) * DEF_PAGE_SIZE + i + 1;
    const e = _defEstado(x);
    const nombreEsc = escapeHtml(x.nombre || '').replace(/'/g, "\\'");
    let examCell = '';
    if (_defConExamen) {
      if (x.examen_fecha) {
        const pct = x.examen_pct != null ? Math.round(x.examen_pct) : null;
        const col = (pct != null && pct >= 70) ? 'var(--verde)' : (pct != null ? 'var(--rojo)' : 'var(--gris-300)');
        examCell = '<td style="text-align:center"><span style="font-weight:700;color:' + col + '">' +
          (x.examen_pts != null ? x.examen_pts : '—') + (pct != null ? ' (' + pct + '%)' : '') + '</span>' +
          '<div class="muted" style="font-size:10px">' + _capFecha(x.examen_fecha) + '</div></td>';
      } else {
        examCell = '<td style="text-align:center"><span class="muted">Sin examen</span></td>';
      }
    }
    let acciones = '<button class="btn btn-outline btn-sm" onclick="abrirDefHistorial(' + x.id + ",'" + nombreEsc + "')\" title=\"Historial\"><i class=\"fas fa-clock-rotate-left\"></i></button>";
    if (editable) {
      acciones = '<button class="btn btn-outline btn-sm" onclick="abrirDefRegistro(' + x.id + ",'" + nombreEsc + "')\" title=\"Registrar capacitación\"><i class=\"fas fa-plus\"></i></button> " + acciones;
    }
    return '<tr>' +
      '<td class="muted" style="text-align:center">' + n + '</td>' +
      '<td style="font-weight:600;color:var(--gris-100)">' + escapeHtml(x.nombre || '') + '</td>' +
      '<td class="muted">' + escapeHtml(x.dni || '—') + '</td>' +
      '<td class="muted">' + escapeHtml(x.empresa_nombre || x.empresa || '—') + '</td>' +
      '<td class="muted">' + (e.fecha ? _capFecha(e.fecha) : '—') + '</td>' +
      '<td class="muted">' + (e.venc ? _capFecha(e.venc) : '—') + '</td>' +
      '<td style="text-align:center"><span class="badge ' + e.badge + '"' + (e.origen ? ' title="Según ' + e.origen + '"' : '') + '>' + e.label + '</span>' +
        (e.origen === 'examen defensiva' ? '<div class="muted" style="font-size:9px">vía examen</div>' : '') +
        (x.examen_registro_pdf ? '<div style="margin-top:3px"><button class="btn btn-outline btn-sm" style="padding:2px 8px" onclick="verDocumento(\'' + _UP() + x.examen_registro_pdf + '\')" title="Registro de asistencia (PDF)"><i class="fas fa-file-pdf" style="color:var(--rojo)"></i></button></div>' : '') +
      '</td>' +
      examCell +
      '<td style="text-align:right;white-space:nowrap">' + acciones + '</td>' +
    '</tr>';
  }).join('');

  wrap.innerHTML = '<table class="data-table" style="min-width:' + (_defConExamen ? 1040 : 900) + 'px"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table>';
  if (pag) pag.innerHTML = _capPagBar(total, _defPag, DEF_PAGE_SIZE, 'irDefPagina');
}

// ── Registro individual ──
function _defCalcVence() {
  const f = document.getElementById('defRegFecha')?.value;
  const out = document.getElementById('defRegVence');
  if (!out) return;
  if (!f || !_defPeriodicidad || _defPeriodicidad <= 0) { out.value = _defPeriodicidad <= 0 ? 'Sin vencimiento' : '—'; return; }
  const d = new Date(f + 'T00:00:00');
  d.setMonth(d.getMonth() + _defPeriodicidad);
  out.value = ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
}

async function abrirDefRegistro(personalId, nombre) {
  document.getElementById('defRegPersonalId').value = personalId;
  document.getElementById('defRegNombre').textContent = nombre || '';
  document.getElementById('defRegFecha').value = new Date().toISOString().slice(0, 10);
  document.getElementById('defRegFacilitador').value = '';
  document.getElementById('defRegObs').value = '';
  document.getElementById('defRegCert').value = '';
  document.getElementById('defRegFecha').onchange = _defCalcVence;
  _defCalcVence();
  // Temas (checkboxes) desde el catálogo activo.
  const cont = document.getElementById('defRegTemas');
  cont.innerHTML = '<span class="muted" style="font-size:12px">Cargando temas…</span>';
  abrirModal('modalDefRegistro');
  try {
    const r = await fetch('api/manejo_defensivo.php?action=tema_list');
    const d = await r.json();
    const temas = (d && d.success) ? (d.data.temas || []).filter(t => +t.activo === 1) : [];
    cont.innerHTML = temas.length ? temas.map(t =>
      '<label class="modulo-check" style="margin:0;display:flex;gap:8px;align-items:center">' +
        '<input type="checkbox" class="def-tema-chk" value="' + t.id + '" style="width:15px;height:15px;accent-color:var(--primary)"> ' +
        '<span>' + escapeHtml(t.nombre) + '</span></label>').join('')
      : '<span class="muted" style="font-size:12px">Sin temas configurados. Agrégalos en “Configurar”.</span>';
  } catch (e) { cont.innerHTML = '<span class="muted" style="font-size:12px">No se pudieron cargar los temas.</span>'; }
}

async function guardarDefRegistro() {
  const pid = document.getElementById('defRegPersonalId').value;
  const fecha = document.getElementById('defRegFecha').value;
  if (!fecha) { toast('Indica la fecha de capacitación', 'warning'); return; }
  const temas = Array.from(document.querySelectorAll('.def-tema-chk:checked')).map(c => +c.value);

  const fd = new FormData();
  fd.append('action', 'save');
  fd.append('csrf_token', CSRF_TOKEN);
  fd.append('personal_id', pid);
  fd.append('fecha', fecha);
  fd.append('facilitador', document.getElementById('defRegFacilitador').value.trim());
  fd.append('observaciones', document.getElementById('defRegObs').value.trim());
  fd.append('temas', JSON.stringify(temas));
  const cert = document.getElementById('defRegCert').files[0];
  if (cert) fd.append('certificado', cert);

  const btn = document.getElementById('defRegBtn');
  if (btn) btn.disabled = true;
  try {
    const r = await fetch('api/manejo_defensivo.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (!d.success) { toast(d.message || 'No se pudo guardar', 'error'); return; }
    toast('Registro guardado', 'success');
    cerrarModal('modalDefRegistro');
    cargarDefensivo();
  } catch (e) { toast('Error de conexión', 'error'); }
  finally { if (btn) btn.disabled = false; }
}

// ── Historial ──
async function abrirDefHistorial(personalId, nombre) {
  document.getElementById('defHistNombre').textContent = nombre || '';
  const wrap = document.getElementById('defHistWrap');
  wrap.innerHTML = '<p class="muted" style="text-align:center;padding:24px">Cargando…</p>';
  abrirModal('modalDefHistorial');
  try {
    const r = await fetch('api/manejo_defensivo.php?action=historial&personal_id=' + personalId);
    const d = await r.json();
    const regs = (d && d.success) ? (d.data.registros || []) : [];
    if (!regs.length) { wrap.innerHTML = '<p class="muted" style="text-align:center;padding:24px">Sin registros de manejo defensivo.</p>'; return; }
    const admin = _defAdmin();
    const body = regs.map(x => {
      const cert = x.certificado
        ? '<a href="#" onclick="verDocumento(\'' + encodeURI(_UP() + x.certificado) + '\');return false;" title="Ver certificado"><i class="fas fa-file-lines" style="color:var(--primary)"></i></a>'
        : '<span class="muted">—</span>';
      const del = admin
        ? '<button class="btn btn-outline btn-sm" onclick="eliminarDefRegistro(' + x.id + ')" title="Eliminar"><i class="fas fa-trash" style="color:var(--rojo)"></i></button>'
        : '';
      return '<tr>' +
        '<td class="muted">' + _capFecha(x.fecha) + '</td>' +
        '<td class="muted">' + (x.vencimiento ? _capFecha(x.vencimiento) : '—') + '</td>' +
        '<td class="muted">' + escapeHtml(x.facilitador || '—') + '</td>' +
        '<td class="muted" style="max-width:260px">' + escapeHtml(x.temas || '—') + '</td>' +
        '<td style="text-align:center">' + cert + '</td>' +
        '<td style="text-align:right">' + del + '</td>' +
      '</tr>';
    }).join('');
    wrap.innerHTML = '<table class="data-table" style="min-width:640px"><thead><tr>' +
      '<th>Fecha</th><th>Vence</th><th>Facilitador</th><th>Temas</th><th style="text-align:center">Cert.</th><th></th>' +
      '</tr></thead><tbody>' + body + '</tbody></table>';
  } catch (e) { wrap.innerHTML = '<p class="muted" style="text-align:center;padding:24px">Error al cargar.</p>'; }
}

async function eliminarDefRegistro(id) {
  if (!confirm('¿Eliminar este registro? No se puede deshacer.')) return;
  const fd = new FormData();
  fd.append('action', 'delete_reg'); fd.append('csrf_token', CSRF_TOKEN); fd.append('id', id);
  try {
    const r = await fetch('api/manejo_defensivo.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (!d.success) { toast(d.message || 'Error', 'error'); return; }
    toast('Eliminado', 'success');
    // Recarga historial (queda abierto) y la matriz.
    const nombre = document.getElementById('defHistNombre').textContent;
    // Buscar personal_id por el nombre visible no es fiable; recargamos matriz y cerramos.
    cerrarModal('modalDefHistorial');
    cargarDefensivo();
  } catch (e) { toast('Error de conexión', 'error'); }
}

// ── Configuración + temario (admin) ──
async function abrirDefConfig() {
  abrirModal('modalDefConfig');
  try {
    const r = await fetch('api/manejo_defensivo.php?action=config_get');
    const d = await r.json();
    document.getElementById('defCfgPeriodo').value = (d && d.success) ? (d.data.periodicidad ?? 12) : 12;
  } catch (e) { document.getElementById('defCfgPeriodo').value = 12; }
  cargarDefTemas();
}

async function guardarDefConfig() {
  const m = document.getElementById('defCfgPeriodo').value;
  const fd = new FormData();
  fd.append('action', 'config_save'); fd.append('csrf_token', CSRF_TOKEN); fd.append('periodicidad', m);
  try {
    const r = await fetch('api/manejo_defensivo.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (!d.success) { toast(d.message || 'Error', 'error'); return; }
    _defPeriodicidad = parseInt(m, 10) || 0;
    toast('Configuración guardada', 'success');
  } catch (e) { toast('Error de conexión', 'error'); }
}

async function cargarDefTemas() {
  const cont = document.getElementById('defTemaLista');
  cont.innerHTML = '<p class="muted" style="text-align:center;padding:14px">Cargando…</p>';
  try {
    const r = await fetch('api/manejo_defensivo.php?action=tema_list');
    const d = await r.json();
    const temas = (d && d.success) ? (d.data.temas || []) : [];
    if (!temas.length) { cont.innerHTML = '<p class="muted" style="text-align:center;padding:14px">Sin temas. Agrega el primero.</p>'; return; }
    cont.innerHTML = temas.map(t =>
      '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--gris-700)">' +
        '<label class="modulo-check" style="margin:0" title="Activo"><input type="checkbox" ' + (+t.activo === 1 ? 'checked' : '') +
          ' onchange="toggleDefTema(' + t.id + ',\'' + escapeHtml(t.nombre).replace(/'/g, "\\'") + '\',this.checked)"></label>' +
        '<span style="flex:1;color:var(--gris-100)' + (+t.activo === 1 ? '' : ';opacity:.5;text-decoration:line-through') + '">' + escapeHtml(t.nombre) + '</span>' +
        '<button class="btn btn-outline btn-sm" onclick="eliminarDefTema(' + t.id + ')" title="Eliminar"><i class="fas fa-trash" style="color:var(--rojo)"></i></button>' +
      '</div>').join('');
  } catch (e) { cont.innerHTML = '<p class="muted" style="text-align:center;padding:14px">Error al cargar.</p>'; }
}

async function _defTemaPost(campos) {
  const fd = new FormData();
  fd.append('csrf_token', CSRF_TOKEN);
  Object.entries(campos).forEach(([k, v]) => fd.append(k, v));
  const r = await fetch('api/manejo_defensivo.php', { method: 'POST', body: fd });
  return r.json();
}

async function agregarDefTema() {
  const inp = document.getElementById('defTemaNuevo');
  const nombre = inp.value.trim();
  if (!nombre) { toast('Escribe el nombre del tema', 'warning'); return; }
  const d = await _defTemaPost({ action: 'tema_save', nombre: nombre, activo: 1, orden: 99 });
  if (d && d.success) { inp.value = ''; toast('Tema agregado', 'success'); cargarDefTemas(); }
  else toast((d && d.message) || 'Error', 'error');
}

async function toggleDefTema(id, nombre, on) {
  const d = await _defTemaPost({ action: 'tema_save', id: id, nombre: nombre, activo: on ? 1 : 0 });
  if (d && d.success) cargarDefTemas();
  else { toast((d && d.message) || 'Error', 'error'); cargarDefTemas(); }
}

async function eliminarDefTema(id) {
  if (!confirm('¿Eliminar este tema del catálogo?')) return;
  const d = await _defTemaPost({ action: 'tema_del', id: id });
  if (d && d.success) { toast('Tema eliminado', 'success'); cargarDefTemas(); }
  else toast((d && d.message) || 'Error', 'error');
}

// ── Registro / programación masiva ──
let _defMasSel = new Set();

function _defMasVence() {
  const f = document.getElementById('defMasFecha')?.value;
  const out = document.getElementById('defMasVence');
  if (!out) return;
  if (!f || !_defPeriodicidad || _defPeriodicidad <= 0) { out.value = _defPeriodicidad <= 0 ? 'Sin vencimiento' : '—'; return; }
  const d = new Date(f + 'T00:00:00');
  d.setMonth(d.getMonth() + _defPeriodicidad);
  out.value = ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear();
}

async function abrirDefMasivo() {
  _defMasSel = new Set();
  document.getElementById('defMasFecha').value = new Date().toISOString().slice(0, 10);
  document.getElementById('defMasFacilitador').value = '';
  document.getElementById('defMasObs').value = '';
  document.getElementById('defMasBuscar').value = '';
  document.getElementById('defMasTodos').checked = false;
  document.getElementById('defMasFecha').onchange = _defMasVence;
  _defMasVence();
  // Si no hay padrón cargado, lo trae.
  if (!_defData.length) { try { await cargarDefensivo(); } catch (e) {} }
  // Temas (checkboxes).
  const cont = document.getElementById('defMasTemas');
  cont.innerHTML = '<span class="muted" style="font-size:12px">Cargando temas…</span>';
  abrirModal('modalDefMasivo');
  renderDefMasLista();
  try {
    const r = await fetch('api/manejo_defensivo.php?action=tema_list');
    const d = await r.json();
    const temas = (d && d.success) ? (d.data.temas || []).filter(t => +t.activo === 1) : [];
    cont.innerHTML = temas.length ? temas.map(t =>
      '<label class="modulo-check" style="margin:0;display:flex;gap:8px;align-items:center">' +
        '<input type="checkbox" class="def-mas-tema" value="' + t.id + '" style="width:15px;height:15px;accent-color:var(--primary)"> ' +
        '<span>' + escapeHtml(t.nombre) + '</span></label>').join('')
      : '<span class="muted" style="font-size:12px">Sin temas configurados.</span>';
  } catch (e) { cont.innerHTML = '<span class="muted" style="font-size:12px">No se pudieron cargar los temas.</span>'; }
}

function _defMasVisibles() {
  const q = (document.getElementById('defMasBuscar')?.value || '').trim().toLowerCase();
  return _defData.filter(p => !q || (p.nombre || '').toLowerCase().includes(q) || String(p.dni || '').includes(q));
}

function renderDefMasLista() {
  const cont = document.getElementById('defMasLista');
  if (!cont) return;
  const vis = _defMasVisibles();
  if (!vis.length) { cont.innerHTML = '<p class="muted" style="text-align:center;padding:18px">Sin conductores.</p>'; _defMasCount(); return; }
  cont.innerHTML = vis.map(p => {
    const e = _defEstado(p);
    return '<label style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid var(--gris-700);cursor:pointer">' +
      '<input type="checkbox" class="def-mas-chk" value="' + p.id + '" ' + (_defMasSel.has(+p.id) ? 'checked' : '') + ' onchange="defMasToggle(' + p.id + ',this.checked)" style="width:16px;height:16px;accent-color:var(--primary)">' +
      '<span style="flex:1"><span style="font-weight:600;color:var(--gris-100)">' + escapeHtml(p.nombre) + '</span>' +
      '<span class="muted" style="font-size:11px;margin-left:6px">' + escapeHtml(p.dni || '') + '</span></span>' +
      '<span class="badge ' + e.badge + '" style="font-size:10px">' + e.label + '</span>' +
    '</label>';
  }).join('');
  _defMasCount();
}

function defMasToggle(id, on) { if (on) _defMasSel.add(+id); else _defMasSel.delete(+id); _defMasCount(); }
function defMasSelTodos(on) {
  _defMasVisibles().forEach(p => { if (on) _defMasSel.add(+p.id); else _defMasSel.delete(+p.id); });
  document.querySelectorAll('.def-mas-chk').forEach(c => { c.checked = on; });
  _defMasCount();
}
function _defMasCount() { const el = document.getElementById('defMasCount'); if (el) el.textContent = _defMasSel.size; }

async function guardarDefMasivo() {
  const fecha = document.getElementById('defMasFecha').value;
  if (!fecha) { toast('Indica la fecha de capacitación', 'warning'); return; }
  if (!_defMasSel.size) { toast('Selecciona al menos un conductor', 'warning'); return; }
  const temas = Array.from(document.querySelectorAll('.def-mas-tema:checked')).map(c => +c.value);

  const fd = new FormData();
  fd.append('action', 'save_masivo');
  fd.append('csrf_token', CSRF_TOKEN);
  fd.append('fecha', fecha);
  fd.append('facilitador', document.getElementById('defMasFacilitador').value.trim());
  fd.append('observaciones', document.getElementById('defMasObs').value.trim());
  fd.append('temas', JSON.stringify(temas));
  fd.append('personal_ids', JSON.stringify(Array.from(_defMasSel)));

  const btn = document.getElementById('defMasBtn');
  if (btn) btn.disabled = true;
  try {
    const r = await fetch('api/manejo_defensivo.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (!d.success) { toast(d.message || 'No se pudo registrar', 'error'); return; }
    toast(d.message || 'Registrado', 'success');
    cerrarModal('modalDefMasivo');
    cargarDefensivo();
  } catch (e) { toast('Error de conexión', 'error'); }
  finally { if (btn) btn.disabled = false; }
}
