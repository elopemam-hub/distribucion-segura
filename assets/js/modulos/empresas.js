// ============================================================
// MÓDULO EMPRESAS (multi-empresa, Fase 1)
// CRUD de empresas tercerizadoras. Cada trabajador se asigna a una empresa
// desde el formulario de Personal; aquí se administran sus datos legales y logo.
// ============================================================

let _empresasCache = [];
let _empresaLogoActual = '';

const EMP_TIPO_LABEL = {
  tercerizacion: 'Tercerización',
  intermediacion: 'Intermediación',
  principal: 'Planilla propia',
  otro: 'Otro',
};

function initEmpresas() {
  cargarEmpresas();
}

async function cargarEmpresas() {
  const body = document.getElementById('empresasBody');
  try {
    const r = await fetch('api/empresas.php?action=list');
    const d = await r.json();
    _empresasCache = (d && d.success && d.data && d.data.empresas) ? d.data.empresas : [];
  } catch (e) { _empresasCache = []; }
  renderEmpresas();
}

function renderEmpresas() {
  const body = document.getElementById('empresasBody');
  if (!body) return;
  const total = _empresasCache.length;
  const activas = _empresasCache.filter(e => +e.activo === 1).length;
  const trab = _empresasCache.reduce((a, e) => a + (+e.num_trab || 0), 0);
  const sinRuc = _empresasCache.filter(e => !e.ruc).length;

  const kpis = document.getElementById('empresasKpis');
  if (kpis) kpis.innerHTML =
    '<div class="kpi-card azul"><div class="kpi-label">Empresas</div><div class="kpi-value azul">' + total + '</div><div class="kpi-sub">registradas</div><i class="fas fa-building kpi-icon"></i></div>' +
    '<div class="kpi-card verde"><div class="kpi-label">Activas</div><div class="kpi-value verde">' + activas + '</div><div class="kpi-sub">operando</div><i class="fas fa-circle-check kpi-icon"></i></div>' +
    '<div class="kpi-card naranja"><div class="kpi-label">Trabajadores</div><div class="kpi-value naranja">' + trab + '</div><div class="kpi-sub">asignados</div><i class="fas fa-users kpi-icon"></i></div>' +
    '<div class="kpi-card ' + (sinRuc ? 'rojo' : 'verde') + '"><div class="kpi-label">Sin RUC</div><div class="kpi-value ' + (sinRuc ? 'rojo' : 'verde') + '">' + sinRuc + '</div><div class="kpi-sub">por completar</div><i class="fas fa-triangle-exclamation kpi-icon"></i></div>';

  if (!total) {
    body.innerHTML = '<tr><td colspan="7" class="muted" style="text-align:center;padding:26px">Aún no hay empresas. Crea la primera con “Nueva empresa”.</td></tr>';
    return;
  }
  body.innerHTML = _empresasCache.map(e => {
    const activo = +e.activo === 1;
    const logo = e.logo
      ? '<img src="' + (typeof UPLOAD_URL !== 'undefined' ? UPLOAD_URL : 'uploads/') + e.logo + '" style="width:26px;height:26px;border-radius:5px;object-fit:contain;background:#fff;padding:2px;vertical-align:middle;margin-right:8px">'
      : '<i class="fas fa-building" style="color:var(--gris-500);margin-right:8px"></i>';
    return '<tr style="' + (activo ? '' : 'opacity:.55') + '">' +
      '<td style="font-weight:600;color:var(--gris-100)">' + logo + escapeHtml(e.razon_social) + '</td>' +
      '<td class="muted">' + (e.ruc ? escapeHtml(e.ruc) : '—') + '</td>' +
      '<td><span class="badge badge-info">' + (EMP_TIPO_LABEL[e.tipo] || escapeHtml(e.tipo || '—')) + '</span></td>' +
      '<td class="muted">' + (e.responsable ? escapeHtml(e.responsable) : '—') + '</td>' +
      '<td style="text-align:right;font-variant-numeric:tabular-nums">' + (+e.num_trab || 0) + '</td>' +
      '<td>' + (activo ? '<span class="badge badge-success">Activa</span>' : '<span class="badge badge-secondary">Inactiva</span>') + '</td>' +
      '<td style="text-align:right;white-space:nowrap">' +
        '<button class="btn btn-outline btn-sm" onclick="editarEmpresa(' + e.id + ')" title="Editar"><i class="fas fa-pen"></i></button> ' +
        '<button class="btn btn-outline btn-sm" onclick="toggleEmpresa(' + e.id + ')" title="' + (activo ? 'Desactivar' : 'Activar') + '"><i class="fas fa-' + (activo ? 'toggle-on' : 'toggle-off') + '"></i></button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

function nuevaEmpresa() {
  document.getElementById('empresaModalTitulo').textContent = 'Nueva empresa';
  document.getElementById('empresa_id').value = '';
  ['razon_social', 'ruc', 'domicilio', 'actividad', 'responsable', 'telefono', 'email'].forEach(k => {
    const el = document.getElementById('empresa_' + k); if (el) el.value = '';
  });
  document.getElementById('empresa_tipo').value = 'tercerizacion';
  document.getElementById('empresa_logo').value = '';
  _empresaLogoActual = '';
  _pintarLogoEmpresa();
  abrirModal('modalEmpresa');
}

async function editarEmpresa(id) {
  try {
    const r = await fetch('api/empresas.php?action=get&id=' + id);
    const d = await r.json();
    if (!d.success) { toast(d.message || 'No encontrada', 'error'); return; }
    const e = d.data;
    document.getElementById('empresaModalTitulo').textContent = 'Editar empresa';
    document.getElementById('empresa_id').value = e.id;
    document.getElementById('empresa_razon_social').value = e.razon_social || '';
    document.getElementById('empresa_ruc').value = e.ruc || '';
    document.getElementById('empresa_tipo').value = e.tipo || 'tercerizacion';
    document.getElementById('empresa_domicilio').value = e.domicilio || '';
    document.getElementById('empresa_actividad').value = e.actividad || '';
    document.getElementById('empresa_responsable').value = e.responsable || '';
    document.getElementById('empresa_telefono').value = e.telefono || '';
    document.getElementById('empresa_email').value = e.email || '';
    document.getElementById('empresa_logo').value = '';
    _empresaLogoActual = e.logo || '';
    _pintarLogoEmpresa();
    abrirModal('modalEmpresa');
  } catch (err) { toast('Error al cargar la empresa', 'error'); }
}

function _pintarLogoEmpresa() {
  const ver = document.getElementById('empresa_logo_ver');
  const del = document.getElementById('empresa_logo_del');
  if (_empresaLogoActual) {
    const url = (typeof UPLOAD_URL !== 'undefined' ? UPLOAD_URL : 'uploads/') + _empresaLogoActual;
    if (ver) { ver.href = url; ver.style.display = 'inline'; }
    if (del) del.style.display = 'inline';
  } else {
    if (ver) ver.style.display = 'none';
    if (del) del.style.display = 'none';
  }
}

async function guardarEmpresa() {
  const razon = document.getElementById('empresa_razon_social').value.trim();
  if (!razon) { toast('La razón social es obligatoria', 'warning'); return; }
  const ruc = document.getElementById('empresa_ruc').value.trim();
  if (ruc && !/^\d{11}$/.test(ruc)) { toast('El RUC debe tener 11 dígitos', 'warning'); return; }

  const btn = document.getElementById('empresaGuardarBtn');
  if (btn) btn.disabled = true;

  const fd = new FormData();
  fd.append('action', 'save');
  fd.append('csrf_token', CSRF_TOKEN);
  fd.append('id', document.getElementById('empresa_id').value || '0');
  ['razon_social', 'ruc', 'tipo', 'domicilio', 'actividad', 'responsable', 'telefono', 'email'].forEach(k => {
    fd.append(k, document.getElementById('empresa_' + k).value.trim());
  });
  const logo = document.getElementById('empresa_logo').files[0];
  if (logo) fd.append('logo', logo);

  try {
    const r = await fetch('api/empresas.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (!d.success) { toast(d.message || 'No se pudo guardar', 'error'); return; }
    toast('Empresa guardada', 'success');
    cerrarModal('modalEmpresa');
    cargarEmpresas();
  } catch (err) {
    toast('Error al guardar', 'error');
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function toggleEmpresa(id) {
  const fd = new FormData();
  fd.append('action', 'toggle'); fd.append('csrf_token', CSRF_TOKEN); fd.append('id', id);
  try {
    const r = await fetch('api/empresas.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (!d.success) { toast(d.message || 'Error', 'error'); return; }
    cargarEmpresas();
  } catch (err) { toast('Error', 'error'); }
}

async function quitarLogoEmpresa() {
  const id = document.getElementById('empresa_id').value;
  if (!id) { _empresaLogoActual = ''; document.getElementById('empresa_logo').value = ''; _pintarLogoEmpresa(); return; }
  if (!confirm('¿Quitar el logo de esta empresa?')) return;
  const fd = new FormData();
  fd.append('action', 'delete_logo'); fd.append('csrf_token', CSRF_TOKEN); fd.append('id', id);
  try {
    const r = await fetch('api/empresas.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (!d.success) { toast(d.message || 'Error', 'error'); return; }
    _empresaLogoActual = ''; _pintarLogoEmpresa();
    toast('Logo eliminado', 'success');
  } catch (err) { toast('Error', 'error'); }
}

// Utilidad compartida: rellena un <select> con las empresas activas.
// La usa el formulario de Personal (personal_empresa_id).
async function cargarEmpresasSelect(selectId, selectedId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  let empresas = _empresasCache;
  if (!empresas.length) {
    try {
      const r = await fetch('api/empresas.php?action=list&activas=1');
      const d = await r.json();
      empresas = (d && d.success && d.data && d.data.empresas) ? d.data.empresas : [];
    } catch (e) { empresas = []; }
  }
  const activas = empresas.filter(e => +e.activo === 1);
  sel.innerHTML = '<option value="">— Sin asignar —</option>' +
    activas.map(e => '<option value="' + e.id + '">' + escapeHtml(e.razon_social) + '</option>').join('');
  if (selectedId) sel.value = String(selectedId);
}
