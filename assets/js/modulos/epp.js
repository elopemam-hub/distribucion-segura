// ============================================================
// MÓDULO EPP (Equipos de Protección Personal) — Fase 1
// Inventario · Inventario inicial · Proveedores · Configuración
// Base legal: Ley 29783, D.S. 005-2012-TR, R.M. 050-2013-TR
// ============================================================

// Cachés de catálogo (se refrescan al abrir el módulo)
let eppTiposCache  = [];
let eppProvCache   = [];
let eppTallasCache = [];
let _eppInit = false;

// ── Helpers ──────────────────────────────────────────────────
function eppEsc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
// Empresa activa (selector global). Todas las llamadas EPP la propagan, así el
// backend segmenta cada empresa como un silo independiente.
function _eppEmp() { return (typeof getEmpresaGlobal === 'function') ? getEmpresaGlobal() : ''; }
async function eppGet(url) {
  const e = _eppEmp();
  if (e) url += (url.includes('?') ? '&' : '?') + 'empresa_id=' + encodeURIComponent(e);
  return eppFetchJson(url, {});
}
async function eppPost(url, campos) {
  const fd = new FormData();
  fd.append('csrf_token', CSRF_TOKEN);
  const e = _eppEmp();
  if (e && !('empresa_id' in campos)) fd.append('empresa_id', e);
  for (const [k, v] of Object.entries(campos)) fd.append(k, v);
  return eppFetchJson(url, { method: 'POST', body: fd });
}

// fetch + parseo tolerante: si el servidor devuelve algo que no es JSON
// (p.ej. un warning de PHP antepuesto), no lanza excepción — registra la
// respuesta cruda en consola y devuelve un error legible para el usuario.
async function eppFetchJson(url, opts) {
  let text = '';
  try {
    const r = await fetch(url, opts);
    text = await r.text();
    return JSON.parse(text);
  } catch (err) {
    console.error('[EPP] Respuesta no válida de ' + url + ':\n', text || err);
    const extra = text ? (' Detalle: ' + text.slice(0, 180)) : '';
    return { success: false, message: 'Respuesta inválida del servidor.' + extra };
  }
}

// ── Init + navegación de sub-tabs ────────────────────────────
function initEpp() {
  // Recarga catálogo y proveedores (alimentan selects), luego la pestaña activa.
  Promise.all([recargarEppTipos(), recargarEppProv(), recargarEppTallas()]).then(() => {
    cargarEppStock();
    cargarEppMovimientos();
  });
  _eppInit = true;
}

function switchEppTab(tab) {
  document.querySelectorAll('.epp-tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.epp-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('epp-panel-' + tab)?.classList.add('active');
  document.getElementById('epp-btn-' + tab)?.classList.add('active');

  if (tab === 'inventario')  { cargarEppStock(); cargarEppMovimientos(); }
  if (tab === 'ingreso')     cargarEppIngresos();
  if (tab === 'entregas')    { cargarEppDashboard(); cargarEppEntregas(); }
  if (tab === 'inicial')     renderEppInicial();
  if (tab === 'tallas')      renderEppTallas();
  if (tab === 'proveedores') renderEppProveedores();
  if (tab === 'reportes')    { /* bajo demanda al pulsar Consultar/Exportar */ }
  if (tab === 'config')      { renderEppTipos(); cargarEppEmpresa(); cargarEppMatriz(); }
}

// ── Carga de catálogo (tipos) — refresca caché y selects ─────
async function recargarEppTipos() {
  const j = await eppGet('api/epp/tipos.php?action=list&todos=1');
  eppTiposCache = j.success ? (j.data || []) : [];

  // Select del modal de movimiento (solo activos)
  const activos = eppTiposCache.filter(t => Number(t.activo) === 1);
  const optEpp = activos.map(t => `<option value="${t.id}">${eppEsc(t.nombre)}</option>`).join('');
  const selMov = document.getElementById('epp_mov_tipo_epp');
  if (selMov) selMov.innerHTML = optEpp;

  // Filtro del kardex
  const selFil = document.getElementById('eppMovFiltroTipo');
  if (selFil) selFil.innerHTML = '<option value="">Todos los tipos</option>' + optEpp;
}

async function recargarEppProv() {
  const j = await eppGet('api/epp/proveedores.php?action=list&todos=1');
  eppProvCache = j.success ? (j.data || []) : [];
  const activos = eppProvCache.filter(p => Number(p.activo) === 1);
  const sel = document.getElementById('epp_mov_prov');
  if (sel) sel.innerHTML = '<option value="">— Ninguno —</option>' +
    activos.map(p => `<option value="${p.id}">${eppEsc(p.razon_social)}</option>`).join('');
}

// Siembra el catálogo estándar (5 EPP + tallas) en la empresa activa.
async function eppSembrarEstandar() {
  if (!_eppEmp()) { toast('Selecciona una empresa en la barra superior primero.', 'warning'); return; }
  if (!confirm('¿Agregar el catálogo estándar (Casco, Chaleco, Zapatos, Lentes, Guantes + tallas) a esta empresa?')) return;
  const j = await eppPost('api/epp/tipos.php?action=seed', {});
  if (!j.success) { toast(j.message || 'Error', 'error'); return; }
  toast(j.message, 'success');
  await Promise.all([recargarEppTipos(), recargarEppTallas()]);
  cargarEppStock();
}

// ══════════════ INVENTARIO: stock + kardex ══════════════
async function cargarEppStock() {
  const cont = document.getElementById('eppStockResumen');
  const body = document.getElementById('eppStockBody');
  const j = await eppGet('api/epp/movimientos.php?action=stock');
  if (!j.success) { toast('No se pudo cargar el stock', 'error'); return; }

  const { items, resumen } = j.data;

  // Tarjetas resumen
  if (cont) cont.innerHTML = `
    <div class="kpi-card azul">
      <div class="kpi-label">Tipos de EPP</div>
      <div class="kpi-value azul">${resumen.tipos}</div>
      <div class="kpi-sub">en catálogo activo</div>
      <i class="fas fa-helmet-safety kpi-icon"></i>
    </div>
    <div class="kpi-card verde">
      <div class="kpi-label">Unidades en stock</div>
      <div class="kpi-value verde">${resumen.total_unidades}</div>
      <div class="kpi-sub">total existencias</div>
      <i class="fas fa-boxes-stacked kpi-icon"></i>
    </div>
    <div class="kpi-card ${resumen.bajo_minimo > 0 ? 'rojo' : 'verde'}">
      <div class="kpi-label">Bajo stock mínimo</div>
      <div class="kpi-value ${resumen.bajo_minimo > 0 ? 'rojo' : 'verde'}">${resumen.bajo_minimo}</div>
      <div class="kpi-sub">requieren reposición</div>
      <i class="fas fa-triangle-exclamation kpi-icon"></i>
    </div>`;

  // Tabla de stock (reproduce las columnas de la referencia).
  if (!items.length) {
    body.innerHTML = '<tr><td colspan="10" class="muted" style="text-align:center;padding:26px">Sin EPP en el catálogo. Crea uno en Configuración.</td></tr>';
    return;
  }
  const cap = (v, txt, color) =>
    `<div style="font-weight:700;font-variant-numeric:tabular-nums;color:${color}">${v}</div>` +
    `<div class="muted" style="font-size:10.5px">${txt}</div>`;

  body.innerHTML = items.map(it => {
    const bajo = Number(it.bajo_minimo) === 1;
    const img = it.imagen
      ? `<img src="uploads/${eppEsc(it.imagen)}" alt="" style="width:44px;height:44px;object-fit:contain;border:1px solid var(--gris-600);border-radius:8px;background:#fff">`
      : `<div style="width:44px;height:44px;border:1px solid var(--gris-600);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--gris-400)"><i class="fas fa-helmet-safety"></i></div>`;
    const estado = bajo
      ? '<span class="badge badge-danger"><i class="fas fa-triangle-exclamation"></i> Bajo</span>'
      : '<span class="badge badge-success"><i class="fas fa-check"></i> OK</span>';
    return `<tr>
      <td>${img}</td>
      <td style="font-variant-numeric:tabular-nums;font-weight:600;color:var(--gris-200)">${eppEsc(it.codigo || '—')}</td>
      <td>
        <div style="font-weight:600;color:var(--gris-100)">${eppEsc(it.nombre)}</div>
        ${it.marca ? `<div class="muted" style="font-size:11.5px">${eppEsc(it.marca)}</div>` : ''}
      </td>
      <td class="muted">${eppEsc(it.categoria)}</td>
      <td style="font-weight:600;color:var(--gris-200)">${eppEsc(it.talla || '—')}</td>
      <td style="text-align:right">${cap(it.consumo_anual, `${eppEsc(it.unidad)}/año`, 'var(--kpi-purpura)')}</td>
      <td style="text-align:right">${cap(it.stock_minimo, 'mínimo', 'var(--naranja)')}</td>
      <td style="text-align:right">${cap(it.stock_maximo, 'máximo', 'var(--azul)')}</td>
      <td style="text-align:right">${cap(it.stock, 'disponible', bajo ? 'var(--rojo)' : 'var(--verde)')}</td>
      <td>${estado}</td>
    </tr>`;
  }).join('');
}

async function cargarEppMovimientos() {
  const body = document.getElementById('eppMovBody');
  const tipo = document.getElementById('eppMovFiltroTipo')?.value || '';
  const j = await eppGet('api/epp/movimientos.php?action=list' + (tipo ? '&tipo_epp_id=' + tipo : ''));
  if (!j.success) { toast('No se pudieron cargar los movimientos', 'error'); return; }
  const rows = j.data || [];
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="7" class="muted" style="text-align:center;padding:26px">Sin movimientos registrados.</td></tr>';
    return;
  }
  const badgeMov = {
    inicial: 'badge-info', entrada: 'badge-success', salida: 'badge-warning', ajuste: 'badge',
  };
  body.innerHTML = rows.map(m => {
    const cant = Number(m.cantidad);
    const signo = cant > 0 ? '+' : '';
    return `<tr>
      <td class="muted" style="white-space:nowrap">${eppEsc(m.fecha)}</td>
      <td style="font-weight:600;color:var(--gris-100)">${eppEsc(m.tipo_nombre)}</td>
      <td><span class="badge ${badgeMov[m.tipo_mov] || 'badge'}">${eppEsc(m.tipo_mov)}</span></td>
      <td style="text-align:right;font-weight:700;font-variant-numeric:tabular-nums;color:${cant < 0 ? 'var(--rojo)' : 'var(--verde)'}">${signo}${cant}</td>
      <td class="muted">${eppEsc(m.proveedor || '—')}</td>
      <td class="muted">${eppEsc(m.documento_ref || '—')}</td>
      <td class="muted">${eppEsc(m.observacion || '—')}</td>
    </tr>`;
  }).join('');
}

// ── Modal de movimiento ──
function abrirModalMovimiento() {
  if (!eppTiposCache.filter(t => Number(t.activo) === 1).length) {
    toast('Primero crea al menos un tipo de EPP en Configuración', 'warning'); return;
  }
  document.getElementById('formEppMov').reset();
  document.getElementById('epp_mov_fecha').value = new Date().toISOString().slice(0, 10);
  document.getElementById('epp_mov_tipo').value = 'ajuste';   // este modal solo ajusta
  eppMovHint();
  abrirModal('modalEppMov');
}
function eppMovHint() {
  const tipo = document.getElementById('epp_mov_tipo').value;
  const hint = document.getElementById('epp_mov_hint');
  const cant = document.getElementById('epp_mov_cantidad');
  if (tipo === 'ajuste') { hint.style.display = 'block'; cant.removeAttribute('min'); }
  else { hint.style.display = 'none'; cant.setAttribute('min', '1'); if (Number(cant.value) < 1) cant.value = 1; }
}
async function eppGuardarMovimiento() {
  const cantidad = parseInt(document.getElementById('epp_mov_cantidad').value, 10);
  if (isNaN(cantidad) || cantidad === 0) { toast('Cantidad inválida', 'error'); return; }
  const j = await eppPost('api/epp/movimientos.php?action=registrar', {
    tipo_epp_id:    document.getElementById('epp_mov_tipo_epp').value,
    tipo_mov:       document.getElementById('epp_mov_tipo').value,
    cantidad:       cantidad,
    costo_unitario: document.getElementById('epp_mov_costo').value,
    proveedor_id:   document.getElementById('epp_mov_prov').value,
    fecha:          document.getElementById('epp_mov_fecha').value,
    documento_ref:  document.getElementById('epp_mov_doc').value,
    observacion:    document.getElementById('epp_mov_obs').value,
  });
  if (!j.success) { toast(j.message || 'Error', 'error'); return; }
  cerrarModal('modalEppMov');
  toast('Movimiento registrado', 'success');
  cargarEppStock(); cargarEppMovimientos();
}

// ══════════════ INVENTARIO INICIAL ══════════════
function renderEppInicial() {
  const body = document.getElementById('eppInicialBody');
  const activos = eppTiposCache.filter(t => Number(t.activo) === 1);
  if (!activos.length) {
    body.innerHTML = '<tr><td colspan="4" class="muted" style="text-align:center;padding:26px">Sin tipos de EPP. Crea uno en Configuración.</td></tr>';
    return;
  }
  body.innerHTML = activos.map(t => `<tr data-tipo="${t.id}">
    <td style="font-weight:600;color:var(--gris-100)">${eppEsc(t.nombre)}</td>
    <td class="muted">${eppEsc(t.unidad)}</td>
    <td style="text-align:right"><input type="number" min="0" value="0" class="form-control epp-ini-cant" style="text-align:right;max-width:130px;margin-left:auto"></td>
    <td style="text-align:right"><input type="number" min="0" step="0.01" placeholder="—" class="form-control epp-ini-costo" style="text-align:right;max-width:120px;margin-left:auto"></td>
  </tr>`).join('');
}

async function eppGuardarInicial() {
  const filas = [];
  document.querySelectorAll('#eppInicialBody tr[data-tipo]').forEach(tr => {
    const cant = parseInt(tr.querySelector('.epp-ini-cant').value, 10);
    if (!isNaN(cant) && cant > 0) {
      filas.push({
        tipo_epp_id: tr.dataset.tipo,
        cantidad: cant,
        costo_unitario: tr.querySelector('.epp-ini-costo').value,
      });
    }
  });
  if (!filas.length) { toast('Ingresa al menos una cantidad', 'warning'); return; }
  const j = await eppPost('api/epp/movimientos.php?action=importar_inicial', {
    filas: JSON.stringify(filas),
    fecha: new Date().toISOString().slice(0, 10),
  });
  if (!j.success) { toast(j.message || 'Error', 'error'); return; }
  toast(j.message, 'success');
  renderEppInicial();
  cargarEppStock(); cargarEppMovimientos();
}

function eppPlantillaInicial() {
  if (typeof XLSX === 'undefined') { toast('Módulo Excel no disponible', 'error'); return; }
  const activos = eppTiposCache.filter(t => Number(t.activo) === 1);
  const data = [['nombre', 'cantidad', 'costo_unitario'],
    ...activos.map(t => [t.nombre, 0, ''])];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 15 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'InventarioInicial');
  XLSX.writeFile(wb, 'plantilla_inventario_inicial_epp.xlsx');
}

function eppImportarInicial(input) {
  const file = input.files[0]; if (!file) return; input.value = '';
  if (typeof XLSX === 'undefined') { toast('Módulo Excel no disponible', 'error'); return; }
  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      const wb = XLSX.read(ev.target.result, { type: 'array' });
      const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
      const filas = json.map(r => ({
        nombre: r.nombre ?? r.Nombre ?? r.NOMBRE ?? '',
        cantidad: parseInt(r.cantidad ?? r.Cantidad ?? r.CANTIDAD ?? 0, 10) || 0,
        costo_unitario: r.costo_unitario ?? r.costo ?? '',
      })).filter(f => f.nombre && f.cantidad > 0);
      if (!filas.length) { toast('No se encontraron filas válidas (nombre + cantidad)', 'warning'); return; }
      const j = await eppPost('api/epp/movimientos.php?action=importar_inicial', {
        filas: JSON.stringify(filas),
        fecha: new Date().toISOString().slice(0, 10),
      });
      if (!j.success) { toast(j.message || 'Error', 'error'); return; }
      let msg = j.message;
      if (j.data?.errores?.length) msg += ' · ' + j.data.errores.length + ' con aviso';
      toast(msg, j.data?.errores?.length ? 'warning' : 'success');
      cargarEppStock(); cargarEppMovimientos();
    } catch (err) {
      toast('Error al leer el archivo: ' + err.message, 'error');
    }
  };
  reader.readAsArrayBuffer(file);
}

// ══════════════ PROVEEDORES ══════════════
function renderEppProveedores() {
  const body = document.getElementById('eppProvBody');
  if (!eppProvCache.length) {
    body.innerHTML = '<tr><td colspan="7" class="muted" style="text-align:center;padding:26px">Sin proveedores registrados.</td></tr>';
    return;
  }
  body.innerHTML = eppProvCache.map(p => {
    const activo = Number(p.activo) === 1;
    return `<tr style="${activo ? '' : 'opacity:.55'}">
      <td style="font-weight:600;color:var(--gris-100)">${eppEsc(p.razon_social)}</td>
      <td class="muted">${eppEsc(p.ruc || '—')}</td>
      <td class="muted">${eppEsc(p.contacto || '—')}</td>
      <td class="muted">${eppEsc(p.telefono || '—')}</td>
      <td class="muted">${eppEsc(p.certificaciones || '—')}</td>
      <td>${activo ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-danger">Inactivo</span>'}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-secondary btn-sm" onclick="abrirModalProveedor(${p.id})" title="Editar"><i class="fas fa-pen"></i></button>
        <button class="btn btn-danger btn-sm" onclick="eppToggleProveedor(${p.id})" title="${activo ? 'Desactivar' : 'Activar'}"><i class="fas fa-power-off"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function abrirModalProveedor(id) {
  document.getElementById('formEppProv').reset();
  document.getElementById('epp_prov_id').value = id || '';
  document.getElementById('modalEppProvTitulo').textContent = id ? 'Editar proveedor' : 'Nuevo proveedor';
  if (id) {
    const p = eppProvCache.find(x => Number(x.id) === Number(id));
    if (p) {
      document.getElementById('epp_prov_razon').value     = p.razon_social || '';
      document.getElementById('epp_prov_ruc').value       = p.ruc || '';
      document.getElementById('epp_prov_contacto').value  = p.contacto || '';
      document.getElementById('epp_prov_telefono').value  = p.telefono || '';
      document.getElementById('epp_prov_email').value     = p.email || '';
      document.getElementById('epp_prov_direccion').value = p.direccion || '';
      document.getElementById('epp_prov_certif').value    = p.certificaciones || '';
    }
  }
  abrirModal('modalEppProv');
}

async function eppGuardarProveedor() {
  const razon = document.getElementById('epp_prov_razon').value.trim();
  if (!razon) { toast('La razón social es requerida', 'error'); return; }
  const j = await eppPost('api/epp/proveedores.php?action=save', {
    id:              document.getElementById('epp_prov_id').value,
    razon_social:    razon,
    ruc:             document.getElementById('epp_prov_ruc').value,
    contacto:        document.getElementById('epp_prov_contacto').value,
    telefono:        document.getElementById('epp_prov_telefono').value,
    email:           document.getElementById('epp_prov_email').value,
    direccion:       document.getElementById('epp_prov_direccion').value,
    certificaciones: document.getElementById('epp_prov_certif').value,
  });
  if (!j.success) { toast(j.message || 'Error', 'error'); return; }
  cerrarModal('modalEppProv');
  toast(j.message, 'success');
  await recargarEppProv();
  renderEppProveedores();
}

async function eppToggleProveedor(id) {
  const j = await eppPost('api/epp/proveedores.php?action=toggle', { id });
  if (!j.success) { toast(j.message || 'Error', 'error'); return; }
  toast('Estado actualizado', 'success');
  await recargarEppProv();
  renderEppProveedores();
}

// ══════════════ CONFIGURACIÓN: catálogo de tipos ══════════════
function renderEppTipos() {
  const body = document.getElementById('eppTipoBody');
  if (!eppTiposCache.length) {
    body.innerHTML = '<tr><td colspan="8" class="muted" style="text-align:center;padding:26px">Sin tipos de EPP.</td></tr>';
    return;
  }
  body.innerHTML = eppTiposCache.map(t => {
    const activo = Number(t.activo) === 1;
    return `<tr style="${activo ? '' : 'opacity:.55'}">
      <td style="font-variant-numeric:tabular-nums;font-weight:600;color:var(--gris-200)">${eppEsc(t.codigo || '—')}</td>
      <td>
        <div style="font-weight:600;color:var(--gris-100)">${eppEsc(t.nombre)}</div>
        ${t.marca ? `<div class="muted" style="font-size:11.5px">${eppEsc(t.marca)}</div>` : ''}
      </td>
      <td class="muted">${eppEsc(t.categoria)}</td>
      <td style="font-weight:600;color:var(--gris-200)">${eppEsc(t.talla || '—')}</td>
      <td style="text-align:right;font-variant-numeric:tabular-nums" class="muted">${t.consumo_anual}</td>
      <td style="text-align:right;font-variant-numeric:tabular-nums" class="muted">${t.vida_util_dias} d</td>
      <td class="muted">${eppEsc(t.norma_tecnica || '—')}</td>
      <td>${activo ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-danger">Inactivo</span>'}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-secondary btn-sm" onclick="abrirModalTipo(${t.id})" title="Editar"><i class="fas fa-pen"></i></button>
        <button class="btn btn-danger btn-sm" onclick="eppToggleTipo(${t.id})" title="${activo ? 'Desactivar' : 'Activar'}"><i class="fas fa-power-off"></i></button>
      </td>
    </tr>`;
  }).join('');
}

// Porcentajes de stock cacheados (para el preview del modal).
let eppPctMin = 10, eppPctMax = 20;

function abrirModalTipo(id) {
  document.getElementById('formEppTipo').reset();
  document.getElementById('epp_tipo_id').value = id || '';
  document.getElementById('modalEppTipoTitulo').textContent = id ? 'Editar EPP' : 'Nuevo EPP';
  const prev = document.getElementById('epp_tipo_img_prev');
  prev.style.display = 'none'; prev.src = '';
  if (id) {
    const t = eppTiposCache.find(x => Number(x.id) === Number(id));
    if (t) {
      document.getElementById('epp_tipo_codigo').value    = t.codigo || '';
      document.getElementById('epp_tipo_nombre').value    = t.nombre || '';
      document.getElementById('epp_tipo_marca').value     = t.marca || '';
      document.getElementById('epp_tipo_categoria').value = t.categoria || '';
      eppLlenarTallaSelect(t.talla || '');
      document.getElementById('epp_tipo_consumo').value   = t.consumo_anual ?? 0;
      document.getElementById('epp_tipo_norma').value     = t.norma_tecnica || '';
      document.getElementById('epp_tipo_vida').value      = t.vida_util_dias ?? 180;
      document.getElementById('epp_tipo_unidad').value    = t.unidad || 'unidad';
      if (t.imagen) { prev.src = 'uploads/' + t.imagen; prev.style.display = 'block'; }
    }
  } else {
    document.getElementById('epp_tipo_consumo').value = 0;
    document.getElementById('epp_tipo_vida').value = 180;
    document.getElementById('epp_tipo_unidad').value = 'unidad';
    eppLlenarTallaSelect('');
  }
  eppTipoStockPreview();
  abrirModal('modalEppTipo');
}

// Muestra mín/máx que se derivarán del consumo anual con los % vigentes.
function eppTipoStockPreview() {
  const c = parseInt(document.getElementById('epp_tipo_consumo').value, 10) || 0;
  const mn = Math.round(c * eppPctMin / 100);
  const mx = Math.round(c * eppPctMax / 100);
  document.getElementById('epp_tipo_stock_hint').textContent = `mín ${mn} · máx ${mx}`;
}

// Vista previa de la imagen seleccionada antes de subir.
function eppTipoImgPreview(input) {
  const prev = document.getElementById('epp_tipo_img_prev');
  const file = input.files && input.files[0];
  if (!file) return;
  prev.src = URL.createObjectURL(file);
  prev.style.display = 'block';
}

async function eppGuardarTipo() {
  const nombre = document.getElementById('epp_tipo_nombre').value.trim();
  if (!nombre) { toast('El nombre es requerido', 'error'); return; }
  // FormData propio para incluir el archivo de imagen (eppPost solo maneja texto).
  const fd = new FormData();
  fd.append('csrf_token', CSRF_TOKEN);
  fd.append('id',             document.getElementById('epp_tipo_id').value);
  fd.append('codigo',         document.getElementById('epp_tipo_codigo').value);
  fd.append('nombre',         nombre);
  fd.append('marca',          document.getElementById('epp_tipo_marca').value);
  fd.append('categoria',      document.getElementById('epp_tipo_categoria').value);
  fd.append('talla',          document.getElementById('epp_tipo_talla').value);
  fd.append('consumo_anual',  document.getElementById('epp_tipo_consumo').value);
  fd.append('norma_tecnica',  document.getElementById('epp_tipo_norma').value);
  fd.append('vida_util_dias', document.getElementById('epp_tipo_vida').value);
  fd.append('unidad',         document.getElementById('epp_tipo_unidad').value);
  fd.append('empresa_id',     _eppEmp());   // silo: EPP de la empresa activa
  const img = document.getElementById('epp_tipo_imagen').files[0];
  if (img) fd.append('imagen', img);

  const r = await fetch('api/epp/tipos.php?action=save', { method: 'POST', body: fd });
  const j = await r.json();
  if (!j.success) { toast(j.message || 'Error', 'error'); return; }
  cerrarModal('modalEppTipo');
  toast(j.message, 'success');
  await recargarEppTipos();
  renderEppTipos();
  cargarEppStock();
}

// ── Política de stock (porcentajes mín/máx) ──
async function eppGuardarPolitica() {
  const j = await eppPost('api/epp/ajustes.php?action=save', {
    stock_min_pct: document.getElementById('epp_pct_min').value,
    stock_max_pct: document.getElementById('epp_pct_max').value,
  });
  if (!j.success) { toast(j.message || 'Error', 'error'); return; }
  eppPctMin = parseFloat(document.getElementById('epp_pct_min').value) || 10;
  eppPctMax = parseFloat(document.getElementById('epp_pct_max').value) || 20;
  toast('Política guardada. Stock mín/máx recalculado.', 'success');
  await recargarEppTipos();
  renderEppTipos();
  cargarEppStock();
}

async function eppToggleTipo(id) {
  const j = await eppPost('api/epp/tipos.php?action=toggle', { id });
  if (!j.success) { toast(j.message || 'Error', 'error'); return; }
  toast('Estado actualizado', 'success');
  await recargarEppTipos();
  renderEppTipos();
}

// Actualiza el hint del modal de movimiento al cambiar el tipo
document.addEventListener('change', e => {
  if (e.target && e.target.id === 'epp_mov_tipo') eppMovHint();
});

// ══════════════ FASE 2 · ENTREGAS DE EPP ══════════════
const EPP_MOTIVO_LABEL = {
  nuevo: 'Entrega nueva', renovacion: 'Renovación', reposicion: 'Reposición', perdida: 'Pérdida',
};
let eppStockMap = {};   // tipo_epp_id -> stock actual (se refresca al abrir el modal)

// ── Dashboard: KPIs + próximas renovaciones ──
async function cargarEppDashboard() {
  const kpis  = document.getElementById('eppEntKpis');
  const renov = document.getElementById('eppRenovBody');
  const _egD = (typeof getEmpresaGlobal === 'function') ? getEmpresaGlobal() : '';
  const j = await eppGet('api/epp/entregas.php?action=dashboard' + (_egD ? '&empresa_id=' + _egD : ''));
  if (!j.success) { toast('No se pudo cargar el panel de entregas', 'error'); return; }
  const { resumen, renovaciones } = j.data;

  if (kpis) kpis.innerHTML = `
    <div class="kpi-card azul">
      <div class="kpi-label">Entregas registradas</div>
      <div class="kpi-value azul">${resumen.total_entregas}</div>
      <div class="kpi-sub">${resumen.entregas_mes} este mes</div>
      <i class="fas fa-hand-holding-hand kpi-icon"></i>
    </div>
    <div class="kpi-card verde">
      <div class="kpi-label">Trabajadores con EPP</div>
      <div class="kpi-value verde">${resumen.trabajadores}</div>
      <div class="kpi-sub">con entrega vigente</div>
      <i class="fas fa-users kpi-icon"></i>
    </div>
    <div class="kpi-card ${resumen.por_vencer > 0 ? 'amarillo' : 'verde'}">
      <div class="kpi-label">Por renovar (30 días)</div>
      <div class="kpi-value ${resumen.por_vencer > 0 ? 'amarillo' : 'verde'}">${resumen.por_vencer}</div>
      <div class="kpi-sub">próximas a vencer</div>
      <i class="fas fa-rotate kpi-icon"></i>
    </div>
    <div class="kpi-card ${resumen.vencidas > 0 ? 'rojo' : 'verde'}">
      <div class="kpi-label">Renovaciones vencidas</div>
      <div class="kpi-value ${resumen.vencidas > 0 ? 'rojo' : 'verde'}">${resumen.vencidas}</div>
      <div class="kpi-sub">requieren reposición</div>
      <i class="fas fa-triangle-exclamation kpi-icon"></i>
    </div>`;

  if (!renovaciones.length) {
    renov.innerHTML = '<tr><td colspan="6" class="muted" style="text-align:center;padding:26px">Sin renovaciones próximas.</td></tr>';
  } else {
    renov.innerHTML = renovaciones.map(r => {
      const dias = Number(r.dias);
      const badge = dias < 0
        ? `<span class="badge badge-danger">Vencida (${Math.abs(dias)} d)</span>`
        : `<span class="badge badge-warning">En ${dias} d</span>`;
      return `<tr>
        <td style="font-weight:600;color:var(--gris-100)">${eppEsc(r.trabajador_nombre)}</td>
        <td class="muted">${eppEsc(r.trabajador_dni || '—')}</td>
        <td>${eppEsc(r.tipo_nombre)}</td>
        <td style="text-align:right;font-variant-numeric:tabular-nums">${r.cantidad}</td>
        <td class="muted" style="white-space:nowrap">${eppEsc(r.fecha_renovacion)}</td>
        <td>${badge}</td>
      </tr>`;
    }).join('');
  }
}

// ── Historial de entregas ──
let _eppEntBuscarTimer = null;
function eppEntBuscarDebounced() {
  clearTimeout(_eppEntBuscarTimer);
  _eppEntBuscarTimer = setTimeout(cargarEppEntregas, 350);
}

async function cargarEppEntregas() {
  const body = document.getElementById('eppEntBody');
  const q      = document.getElementById('eppEntBuscar')?.value.trim() || '';
  const motivo = document.getElementById('eppEntFiltroMotivo')?.value || '';
  const params = new URLSearchParams({ action: 'list' });
  if (q) params.set('q', q);
  if (motivo) params.set('motivo', motivo);
  const empG = (typeof getEmpresaGlobal === 'function') ? getEmpresaGlobal() : '';
  if (empG) params.set('empresa_id', empG);

  const j = await eppGet('api/epp/entregas.php?' + params.toString());
  if (!j.success) { toast('No se pudieron cargar las entregas', 'error'); return; }
  const rows = j.data || [];
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="8" class="muted" style="text-align:center;padding:26px">Sin entregas registradas.</td></tr>';
    return;
  }
  body.innerHTML = rows.map(e => {
    const anulada = e.estado === 'anulada';
    return `<tr style="${anulada ? 'opacity:.55' : ''}">
      <td class="muted" style="white-space:nowrap">${eppEsc(e.fecha)}</td>
      <td style="font-weight:600;color:var(--gris-100)">${eppEsc(e.trabajador_nombre)}</td>
      <td class="muted">${eppEsc(e.trabajador_dni || '—')}</td>
      <td class="muted">${eppEsc((e.trabajador_cargo || '—'))}</td>
      <td><span class="badge badge-info">${eppEsc(EPP_MOTIVO_LABEL[e.motivo] || e.motivo)}</span></td>
      <td style="text-align:right;font-variant-numeric:tabular-nums">${e.total_unidades} <span class="muted" style="font-size:11px">(${e.lineas})</span></td>
      <td>${anulada ? '<span class="badge badge-danger">Anulada</span>' : '<span class="badge badge-success">Vigente</span>'}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-secondary btn-sm" onclick="verEppEntrega(${e.id})" title="Ver detalle"><i class="fas fa-eye"></i></button>
        <button class="btn btn-secondary btn-sm" onclick="imprimirEppEntrega(${e.id})" title="Registro PDF"><i class="fas fa-print"></i></button>
        ${anulada ? '' : `<button class="btn btn-secondary btn-sm" onclick="abrirEditarEntrega(${e.id})" title="Editar datos generales"><i class="fas fa-pen"></i></button>`}
        ${anulada ? '' : `<button class="btn btn-danger btn-sm" onclick="anularEppEntrega(${e.id})" title="Anular"><i class="fas fa-ban"></i></button>`}
      </td>
    </tr>`;
  }).join('');
}

// ── Modal nueva entrega ──
async function abrirModalEntrega() {
  const activos = eppTiposCache.filter(t => Number(t.activo) === 1);
  if (!activos.length) { toast('Primero crea tipos de EPP en Configuración', 'warning'); return; }

  document.getElementById('formEppEntrega').reset();
  document.getElementById('epp_ent_personal_id').value = '';
  document.getElementById('epp_ent_fecha').value = new Date().toISOString().slice(0, 10);
  document.getElementById('eppEntTrabSel').style.display = 'none';
  document.getElementById('eppEntTrabResultados').style.display = 'none';
  document.getElementById('eppEntItemsBody').innerHTML = '';

  // Refresca stock para validar disponibilidad en el select.
  const s = await eppGet('api/epp/movimientos.php?action=stock');
  eppStockMap = {};
  if (s.success) (s.data.items || []).forEach(it => { eppStockMap[it.id] = Number(it.stock); });

  eppEntAgregarFila();
  abrirModal('modalEppEntrega');
  setTimeout(() => { eppInitFirma('eppEntFirmaEntregaCanvas'); }, 60);
}

// Opciones de EPP para el select de una fila (solo activos con stock).
function eppEntOpcionesEpp() {
  return eppTiposCache
    .filter(t => Number(t.activo) === 1)
    .map(t => {
      const st = eppStockMap[t.id] ?? 0;
      return `<option value="${t.id}" data-stock="${st}" data-vida="${t.vida_util_dias ?? 0}">${eppEsc(t.nombre)}</option>`;
    }).join('');
}

// Fecha de renovación sugerida = fecha de entrega + días de vida útil.
function eppCalcRenov(vidaDias) {
  const base = document.getElementById('epp_ent_fecha').value;
  if (!base || !vidaDias || vidaDias <= 0) return '';
  const d = new Date(base + 'T00:00:00');
  d.setDate(d.getDate() + Number(vidaDias));
  return d.toISOString().slice(0, 10);
}

// Recalcula la renovación sugerida de todas las filas (al cambiar la fecha de
// entrega). Respeta las filas que el usuario editó a mano (data-touched).
function eppEntRefreshRenov() {
  document.querySelectorAll('#eppEntItemsBody tr.epp-ent-fila').forEach(tr => {
    const renov = tr.querySelector('.epp-ent-renov');
    if (renov && !renov.dataset.touched) {
      const opt = tr.querySelector('.epp-ent-tipo').selectedOptions[0];
      renov.value = eppCalcRenov(Number(opt?.dataset.vida ?? 0));
    }
  });
}

// preset opcional {tipo, cant} para precargar el kit sugerido del puesto.
function eppEntAgregarFila(preset) {
  const body = document.getElementById('eppEntItemsBody');
  const tr = document.createElement('tr');
  tr.className = 'epp-ent-fila';
  tr.innerHTML = `
    <td><select class="form-control epp-ent-tipo" onchange="eppEntFilaStock(this)">${eppEntOpcionesEpp()}</select></td>
    <td style="text-align:right;font-variant-numeric:tabular-nums" class="epp-ent-stock muted">—</td>
    <td><input type="number" class="form-control epp-ent-cant" min="1" value="1" style="text-align:right"></td>
    <td><input type="date" class="form-control epp-ent-renov" title="Editable — por defecto: fecha + vida útil" oninput="this.dataset.touched='1'"></td>
    <td style="text-align:center"><button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove()"><i class="fas fa-trash"></i></button></td>`;
  body.appendChild(tr);
  if (preset && preset.tipo) {
    const sel = tr.querySelector('.epp-ent-tipo');
    // Solo aplica si el EPP está entre las opciones (activo).
    if ([...sel.options].some(o => o.value === String(preset.tipo))) {
      sel.value = String(preset.tipo);
      if (preset.cant) tr.querySelector('.epp-ent-cant').value = preset.cant;
    }
  }
  eppEntFilaStock(tr.querySelector('.epp-ent-tipo'));
}

// Carga el kit sugerido de EPP para el cargo del trabajador (matriz por puesto).
// Reemplaza las filas actuales por las del kit; si el cargo no tiene matriz,
// deja lo que hubiera para que el usuario arme la entrega a mano.
async function eppEntCargarKit(cargo) {
  if (!cargo) return;
  const j = await eppGet('api/epp/matriz.php?action=list&cargo=' + encodeURIComponent(cargo));
  const rows = j.success ? (j.data || []) : [];
  if (!rows.length) return;
  document.getElementById('eppEntItemsBody').innerHTML = '';
  rows.forEach(r => eppEntAgregarFila({ tipo: r.tipo_epp_id, cant: r.cantidad }));
  toast(`Kit sugerido para "${cargo}" cargado (${rows.length} EPP)`, 'info');
}

// Muestra el stock disponible del EPP elegido en la fila y limita la cantidad.
function eppEntFilaStock(sel) {
  const tr = sel.closest('tr');
  const opt = sel.options[sel.selectedIndex];
  const stock = Number(opt?.dataset.stock ?? 0);
  const cell = tr.querySelector('.epp-ent-stock');
  const cant = tr.querySelector('.epp-ent-cant');
  cell.textContent = stock;
  cell.style.color = stock <= 0 ? 'var(--rojo)' : '';
  cant.max = stock > 0 ? stock : 1;
  // Sugiere la renovación según la vida útil del EPP (si el usuario no la editó).
  const renov = tr.querySelector('.epp-ent-renov');
  if (renov && !renov.dataset.touched) {
    renov.value = eppCalcRenov(Number(opt?.dataset.vida ?? 0));
  }
}

// ── Firmas (canvas) — soporta varias por id (trabajador y quien entrega) ──
const eppFirmas = {};   // canvasId -> { ctx, drawing, hasContent }

function eppInitFirma(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const st = { ctx: canvas.getContext('2d'), drawing: false, hasContent: false };
  eppFirmas[canvasId] = st;
  st.ctx.fillStyle = '#FFFFFF';
  st.ctx.fillRect(0, 0, canvas.width, canvas.height);
  st.ctx.strokeStyle = '#1565C0';
  st.ctx.lineWidth = 2;
  st.ctx.lineCap = 'round';

  const pos = (e, r) => {
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * (canvas.width / r.width), y: (src.clientY - r.top) * (canvas.height / r.height) };
  };
  canvas.onmousedown  = e => { st.drawing = true; const r = canvas.getBoundingClientRect(), p = pos(e,r); st.ctx.beginPath(); st.ctx.moveTo(p.x,p.y); };
  canvas.onmouseup    = () => st.drawing = false;
  canvas.onmouseleave = () => st.drawing = false;
  canvas.onmousemove  = e => { if (!st.drawing) return; const r = canvas.getBoundingClientRect(), p = pos(e,r); st.ctx.lineTo(p.x,p.y); st.ctx.stroke(); st.hasContent = true; };
  canvas.ontouchstart = e => { e.preventDefault(); st.drawing = true; const r = canvas.getBoundingClientRect(), p = pos(e,r); st.ctx.beginPath(); st.ctx.moveTo(p.x,p.y); };
  canvas.ontouchend   = () => st.drawing = false;
  canvas.ontouchmove  = e => { e.preventDefault(); if (!st.drawing) return; const r = canvas.getBoundingClientRect(), p = pos(e,r); st.ctx.lineTo(p.x,p.y); st.ctx.stroke(); st.hasContent = true; };
}

function eppLimpiarFirma(canvasId) {
  const canvas = document.getElementById(canvasId);
  const st = eppFirmas[canvasId];
  if (!canvas || !st) return;
  st.ctx.fillStyle = '#FFFFFF';
  st.ctx.fillRect(0, 0, canvas.width, canvas.height);
  st.hasContent = false;
}

// ¿La firma dibujada tiene contenido? (para validar / decidir si se envía)
function eppFirmaTieneContenido(canvasId) { return !!eppFirmas[canvasId]?.hasContent; }
function eppFirmaDataURL(canvasId) {
  const c = document.getElementById(canvasId);
  return (c && eppFirmaTieneContenido(canvasId)) ? c.toDataURL('image/png') : '';
}

// ── Autocompletar trabajador (reusa api/personal.php?action=buscar) ──
let _eppTrabTimer = null;
function eppEntBuscarTrabajador(q) {
  clearTimeout(_eppTrabTimer);
  const cont = document.getElementById('eppEntTrabResultados');
  document.getElementById('epp_ent_personal_id').value = '';
  document.getElementById('eppEntTrabSel').style.display = 'none';
  if (q.trim().length < 2) { cont.style.display = 'none'; return; }
  _eppTrabTimer = setTimeout(async () => {
    const j = await eppGet('api/personal.php?action=buscar&q=' + encodeURIComponent(q.trim()));
    const rows = j.success ? (j.data || []) : [];
    if (!rows.length) {
      cont.innerHTML = '<div style="padding:10px 12px;color:var(--gris-400);font-size:12.5px">Sin coincidencias.</div>';
      cont.style.display = 'block'; return;
    }
    cont.innerHTML = rows.map(p => `
      <div style="padding:9px 12px;cursor:pointer;border-bottom:1px solid var(--gris-700)"
           onmousedown="eppEntSelTrabajador(${p.id}, '${eppEsc(p.nombre).replace(/'/g,"\\'")}', '${eppEsc(p.dni || '')}', '${eppEsc(p.cargo || '')}')">
        <div style="font-weight:600;color:var(--gris-100);font-size:13px">${eppEsc(p.nombre)}</div>
        <div style="font-size:11.5px;color:var(--gris-400)">DNI ${eppEsc(p.dni || '—')} · ${eppEsc(p.cargo || '—')}</div>
      </div>`).join('');
    cont.style.display = 'block';
  }, 300);
}
function eppEntSelTrabajador(id, nombre, dni, cargo) {
  document.getElementById('epp_ent_personal_id').value = id;
  document.getElementById('epp_ent_trab_buscar').value = nombre;
  document.getElementById('eppEntTrabResultados').style.display = 'none';
  const sel = document.getElementById('eppEntTrabSel');
  sel.innerHTML = `<i class="fas fa-user-check" style="color:var(--verde)"></i> ${eppEsc(nombre)} · DNI ${eppEsc(dni || '—')} · ${eppEsc(cargo || '—')}`;
  sel.style.display = 'block';
  // Sugiere el kit de EPP definido para el cargo del trabajador (matriz por puesto).
  eppEntCargarKit(cargo);
}

// ── Guardar entrega ──
async function eppGuardarEntrega() {
  const personalId = document.getElementById('epp_ent_personal_id').value;
  if (!personalId) { toast('Selecciona un trabajador de la lista', 'error'); return; }

  const items = [];
  let excede = false;
  document.querySelectorAll('#eppEntItemsBody tr.epp-ent-fila').forEach(tr => {
    const tipo = tr.querySelector('.epp-ent-tipo').value;
    const cant = parseInt(tr.querySelector('.epp-ent-cant').value, 10);
    const stock = Number(tr.querySelector('.epp-ent-tipo').options[tr.querySelector('.epp-ent-tipo').selectedIndex]?.dataset.stock ?? 0);
    const renov = tr.querySelector('.epp-ent-renov')?.value || '';
    if (tipo && !isNaN(cant) && cant > 0) {
      if (cant > stock) excede = true;
      items.push({ tipo_epp_id: tipo, cantidad: cant, fecha_renovacion: renov });
    }
  });
  if (!items.length) { toast('Agrega al menos un EPP con cantidad', 'error'); return; }
  if (excede) { toast('Una cantidad supera el stock disponible', 'error'); return; }

  const btn = document.getElementById('btnEppEntGuardar');
  btn.disabled = true;
  let j;
  try {
    j = await eppPost('api/epp/entregas.php?action=registrar', {
      personal_id:   personalId,
      motivo:        document.getElementById('epp_ent_motivo').value,
      fecha:         document.getElementById('epp_ent_fecha').value,
      observacion:   document.getElementById('epp_ent_obs').value,
      firma_entrega: eppFirmaDataURL('eppEntFirmaEntregaCanvas'),
      items:         JSON.stringify(items),
    });
  } finally {
    btn.disabled = false;   // el botón nunca queda bloqueado, pase lo que pase
  }
  if (!j || !j.success) { toast((j && j.message) || 'Error al registrar', 'error'); return; }
  cerrarModal('modalEppEntrega');
  toast('Entrega registrada', 'success');
  cargarEppDashboard(); cargarEppEntregas();
  cargarEppStock(); cargarEppMovimientos();
  if (j.data?.id && confirm('Entrega registrada. ¿Imprimir el registro oficial?')) {
    imprimirEppEntrega(j.data.id);
  }
}

// ── Ver detalle ──
async function verEppEntrega(id) {
  abrirModal('modalEppEntregaVer');
  const body = document.getElementById('eppEntVerBody');
  body.innerHTML = '<div class="muted" style="text-align:center;padding:26px">Cargando…</div>';
  const j = await eppGet('api/epp/entregas.php?action=get&id=' + id);
  if (!j.success) { body.innerHTML = '<div class="muted" style="text-align:center;padding:26px">No se pudo cargar.</div>'; return; }
  const e = j.data;
  const itemsHtml = (e.items || []).map(it => `
    <tr>
      <td style="font-weight:600;color:var(--gris-100)">${eppEsc(it.tipo_nombre)}</td>
      <td class="muted">${eppEsc(it.norma_tecnica || '—')}</td>
      <td style="text-align:right;font-variant-numeric:tabular-nums">${it.cantidad}</td>
      <td class="muted" style="white-space:nowrap">${eppEsc(it.fecha_renovacion || '—')}</td>
    </tr>`).join('');
  body.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;font-size:13px">
      <div><span class="muted">Trabajador:</span><br><strong style="color:var(--gris-100)">${eppEsc(e.trabajador_nombre)}</strong></div>
      <div><span class="muted">DNI:</span><br>${eppEsc(e.trabajador_dni || '—')}</div>
      <div><span class="muted">Cargo:</span><br>${eppEsc(e.trabajador_cargo || '—')}</div>
      <div><span class="muted">Fecha:</span><br>${eppEsc(e.fecha)}</div>
      <div><span class="muted">Motivo:</span><br>${eppEsc(EPP_MOTIVO_LABEL[e.motivo] || e.motivo)}</div>
      <div><span class="muted">Estado:</span><br>${e.estado === 'anulada' ? '<span class="badge badge-danger">Anulada</span>' : '<span class="badge badge-success">Vigente</span>'}</div>
    </div>
    ${e.observacion ? `<div style="margin-bottom:12px;font-size:12.5px"><span class="muted">Observación:</span> ${eppEsc(e.observacion)}</div>` : ''}
    <table class="data-table" style="margin-bottom:14px">
      <thead><tr><th>EPP</th><th>Norma</th><th style="text-align:right">Cant.</th><th>Renovación</th></tr></thead>
      <tbody>${itemsHtml || '<tr><td colspan="4" class="muted" style="text-align:center;padding:16px">Sin ítems.</td></tr>'}</tbody>
    </table>
    <div style="display:flex;gap:18px;flex-wrap:wrap">
      ${e.firma_entrega ? `
      <div>
        <div style="font-size:12px;color:var(--gris-400);margin-bottom:6px"><i class="fas fa-signature"></i> Firma de quien entrega</div>
        <div style="border:1px solid var(--gris-600);border-radius:8px;padding:6px;background:#fff;display:inline-block">
          <img src="${e.firma_entrega}" style="max-width:300px;height:auto;display:block">
        </div>
      </div>` : ''}
      ${e.firma_trabajador ? `
      <div>
        <div style="font-size:12px;color:var(--gris-400);margin-bottom:6px"><i class="fas fa-signature"></i> Firma del trabajador</div>
        <div style="border:1px solid var(--gris-600);border-radius:8px;padding:6px;background:#fff;display:inline-block">
          <img src="${e.firma_trabajador}" style="max-width:300px;height:auto;display:block">
        </div>
      </div>` : ''}
    </div>
    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px">
      <button class="btn btn-secondary" onclick="imprimirEppEntrega(${e.id})"><i class="fas fa-print"></i> Registro PDF</button>
    </div>`;
}

function imprimirEppEntrega(id) {
  window.open('api/epp/entrega_pdf.php?id=' + id, '_blank');
}

async function anularEppEntrega(id) {
  if (!confirm('¿Anular esta entrega? El stock entregado se restituirá al inventario.')) return;
  const j = await eppPost('api/epp/entregas.php?action=anular', { id });
  if (!j.success) { toast(j.message || 'Error', 'error'); return; }
  toast(j.message, 'success');
  cargarEppDashboard(); cargarEppEntregas();
  cargarEppStock(); cargarEppMovimientos();
}

// ── Editar datos generales de la entrega (motivo/fecha/observación) ──
async function abrirEditarEntrega(id) {
  const j = await eppGet('api/epp/entregas.php?action=get&id=' + id);
  if (!j.success) { toast('No se pudo cargar la entrega', 'error'); return; }
  const e = j.data;
  document.getElementById('epp_edit_id').value     = id;
  document.getElementById('epp_edit_motivo').value = e.motivo;
  document.getElementById('epp_edit_fecha').value  = e.fecha;
  document.getElementById('epp_edit_obs').value    = e.observacion || '';
  abrirModal('modalEppEntEdit');
}

async function eppGuardarEditEntrega() {
  const j = await eppPost('api/epp/entregas.php?action=editar', {
    id:          document.getElementById('epp_edit_id').value,
    motivo:      document.getElementById('epp_edit_motivo').value,
    fecha:       document.getElementById('epp_edit_fecha').value,
    observacion: document.getElementById('epp_edit_obs').value,
  });
  if (!j.success) { toast(j.message || 'Error', 'error'); return; }
  cerrarModal('modalEppEntEdit');
  toast('Entrega actualizada', 'success');
  cargarEppDashboard(); cargarEppEntregas();
}

// ══════════════ CONFIGURACIÓN: datos del empleador ══════════════
async function cargarEppEmpresa() {
  const j = await eppGet('api/epp/ajustes.php?action=get');
  if (!j.success) return;
  const c = j.data || {};
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  set('epp_emp_razon_social', c.emp_razon_social);
  set('epp_emp_ruc',          c.emp_ruc);
  set('epp_emp_actividad',    c.emp_actividad);
  set('epp_emp_num_trab',     c.emp_num_trab);
  set('epp_emp_domicilio',    c.emp_domicilio);
  set('epp_emp_responsable',  c.emp_responsable);
  set('epp_ct_nombre',        c.ct_nombre);
  set('epp_ct_domicilio',     c.ct_domicilio);
  set('epp_ct_responsable',   c.ct_responsable);
  set('epp_ct_num_trab',      c.ct_num_trab);
  set('epp_doc_codigo',       c.doc_codigo);
  set('epp_doc_version',      c.doc_version);
  set('epp_doc_fecha',        c.doc_fecha);
  // Porcentajes de la política de stock (para los campos y el preview del modal).
  eppPctMin = (c.stock_min_pct !== '' && c.stock_min_pct != null) ? parseFloat(c.stock_min_pct) : 10;
  eppPctMax = (c.stock_max_pct !== '' && c.stock_max_pct != null) ? parseFloat(c.stock_max_pct) : 20;
  const inMin = document.getElementById('epp_pct_min');
  const inMax = document.getElementById('epp_pct_max');
  if (inMin) inMin.value = eppPctMin;
  if (inMax) inMax.value = eppPctMax;
  // Logo de la empresa: preview + botón quitar.
  eppMostrarLogo(c.emp_logo || '');
  const fileLogo = document.getElementById('epp_emp_logo');
  if (fileLogo) fileLogo.value = '';
}

// Muestra el logo actual (o "sin logo") y el botón quitar.
function eppMostrarLogo(ruta) {
  const prev  = document.getElementById('epp_emp_logo_prev');
  const vacio = document.getElementById('epp_emp_logo_vacio');
  const quit  = document.getElementById('epp_emp_logo_quitar');
  if (ruta) {
    if (prev)  { prev.src = 'uploads/' + ruta + '?t=' + Date.now(); prev.style.display = 'block'; }
    if (vacio) vacio.style.display = 'none';
    if (quit)  quit.style.display = 'inline-block';
  } else {
    if (prev)  { prev.src = ''; prev.style.display = 'none'; }
    if (vacio) vacio.style.display = 'inline';
    if (quit)  quit.style.display = 'none';
  }
}

// Preview local del logo al seleccionar archivo (antes de guardar).
function eppLogoPreview(input) {
  const f = input.files && input.files[0];
  if (!f) return;
  const prev = document.getElementById('epp_emp_logo_prev');
  const vacio = document.getElementById('epp_emp_logo_vacio');
  if (prev)  { prev.src = URL.createObjectURL(f); prev.style.display = 'block'; }
  if (vacio) vacio.style.display = 'none';
}

async function eppQuitarLogo() {
  if (!confirm('¿Quitar el logo de la empresa? Se usará el logo por defecto en el PDF.')) return;
  const j = await eppPost('api/epp/ajustes.php?action=delete_logo', {});
  if (!j.success) { toast(j.message || 'Error', 'error'); return; }
  toast('Logo eliminado', 'success');
  const fl = document.getElementById('epp_emp_logo'); if (fl) fl.value = '';
  eppMostrarLogo('');
}

async function eppGuardarEmpresa() {
  const val = id => document.getElementById(id)?.value || '';
  const fd = new FormData();
  fd.append('csrf_token', CSRF_TOKEN);
  [['emp_razon_social','epp_emp_razon_social'],['emp_ruc','epp_emp_ruc'],['emp_actividad','epp_emp_actividad'],
   ['emp_num_trab','epp_emp_num_trab'],['emp_domicilio','epp_emp_domicilio'],['emp_responsable','epp_emp_responsable'],
   ['ct_nombre','epp_ct_nombre'],['ct_domicilio','epp_ct_domicilio'],['ct_responsable','epp_ct_responsable'],
   ['ct_num_trab','epp_ct_num_trab'],['doc_codigo','epp_doc_codigo'],['doc_version','epp_doc_version'],
   ['doc_fecha','epp_doc_fecha']].forEach(([k,id]) => fd.append(k, val(id)));
  const logo = document.getElementById('epp_emp_logo')?.files[0];
  if (logo) fd.append('emp_logo', logo);

  const r = await fetch('api/epp/ajustes.php?action=save', { method: 'POST', body: fd });
  const j = await r.json().catch(() => ({ success: false, message: 'Respuesta inválida del servidor.' }));
  if (!j.success) { toast(j.message || 'Error', 'error'); return; }
  toast(j.message, 'success');
  cargarEppEmpresa();   // refresca el preview con el logo guardado
}

// ══════════════ CONFIGURACIÓN: matriz de EPP por puesto ══════════════
// Editor por cargo: muestra todos los EPP activos con checkbox + cantidad;
// guardar reemplaza el kit completo del cargo (semántica de reemplazo).
// Cargos (= valores de personal.cargo) como filas de la matriz.
const EPP_CARGOS_MATRIZ = [
  { k: 'conductor',  label: 'Conductor / Chofer' },
  { k: 'reparto',    label: 'Reparto' },
  { k: 'auxiliar',   label: 'Auxiliar' },
  { k: 'supervisor', label: 'Supervisor' },
  { k: 'otro',       label: 'Otro' },
];
// Estado de la grilla: `${cargo}|${tipoId}` -> 'obl' | 'opc' (ausente = no aplica)
let eppMatrizState = {};

function eppMatrizIcon(st) {
  if (st === 'obl') return '<i class="fas fa-check" style="color:var(--verde);font-size:19px"></i>';
  if (st === 'opc') return '<span style="color:var(--naranja);font-weight:800;font-size:14px">✱</span>'
                          + '<i class="fas fa-check" style="color:var(--verde);font-size:15px;margin-left:2px"></i>';
  return '<span style="color:var(--gris-500);font-size:16px">·</span>';
}

// Grilla visual: filas = puestos, columnas = EPP (con imagen). Clic en cada
// casilla alterna: no aplica → obligatorio → opcional → no aplica.
async function cargarEppMatriz() {
  const grid = document.getElementById('eppMatrizGrid');
  if (!grid) return;
  const activos = eppTiposCache.filter(t => Number(t.activo) === 1);
  if (!activos.length) {
    grid.innerHTML = '<p class="muted" style="padding:16px">Sin EPP en el catálogo. Crea uno arriba para armar la matriz.</p>';
    return;
  }
  const j = await eppGet('api/epp/matriz.php?action=list');
  eppMatrizState = {};
  if (j.success) (j.data || []).forEach(r => {
    eppMatrizState[`${r.cargo}|${r.tipo_epp_id}`] = Number(r.obligatorio) === 1 ? 'obl' : 'opc';
  });

  let html = '<table class="data-table" style="min-width:640px;text-align:center"><thead><tr>' +
             '<th style="min-width:130px;text-align:left">Puesto</th>';
  activos.forEach(t => {
    const img = t.imagen
      ? `<img src="uploads/${eppEsc(t.imagen)}" alt="" style="width:36px;height:36px;object-fit:contain;background:#fff;border-radius:6px;padding:2px">`
      : `<i class="fas fa-helmet-safety" style="font-size:20px;color:var(--gris-400)"></i>`;
    html += `<th style="text-align:center;font-size:9.5px;min-width:74px"><div>${img}</div>`
          + `<div style="margin-top:3px;line-height:1.15">${eppEsc(t.nombre)}</div></th>`;
  });
  html += '</tr></thead><tbody>';
  EPP_CARGOS_MATRIZ.forEach(c => {
    html += `<tr><td style="text-align:left;font-weight:700;color:var(--gris-100)">${c.label}</td>`;
    activos.forEach(t => {
      const key = `${c.k}|${t.id}`;
      html += `<td class="epp-mtz-cell" data-key="${key}" onclick="eppMatrizToggle('${key}')" `
            + `style="cursor:pointer;user-select:none">${eppMatrizIcon(eppMatrizState[key])}</td>`;
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  grid.innerHTML = html;
}

function eppMatrizToggle(key) {
  const cur = eppMatrizState[key];
  const next = cur === undefined ? 'obl' : (cur === 'obl' ? 'opc' : undefined);
  if (next === undefined) delete eppMatrizState[key]; else eppMatrizState[key] = next;
  const cell = document.querySelector(`.epp-mtz-cell[data-key="${key}"]`);
  if (cell) cell.innerHTML = eppMatrizIcon(eppMatrizState[key]);
}

async function eppGuardarMatriz() {
  const matriz = {};
  EPP_CARGOS_MATRIZ.forEach(c => { matriz[c.k] = []; });
  Object.entries(eppMatrizState).forEach(([key, st]) => {
    const [cargo, tid] = key.split('|');
    (matriz[cargo] = matriz[cargo] || []).push({
      tipo_epp_id: Number(tid), cantidad: 1, obligatorio: st === 'obl' ? 1 : 0,
    });
  });
  const j = await eppPost('api/epp/matriz.php?action=save_all', { matriz: JSON.stringify(matriz) });
  if (!j.success) { toast(j.message || 'Error', 'error'); return; }
  toast('Matriz guardada', 'success');
}

// ══════════════ REPORTES (render + exportación a Excel) ══════════════
let eppRepEntData = [];
let eppRepVenData = [];

function eppXlsx(filename, sheet, header, rows) {
  if (typeof XLSX === 'undefined') { toast('Módulo Excel no disponible', 'error'); return; }
  if (!rows.length) { toast('No hay datos para exportar', 'warning'); return; }
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  XLSX.writeFile(wb, filename);
}

async function eppRepEntregas() {
  const p = new URLSearchParams({ action: 'reporte' });
  const q = document.getElementById('eppRepEntQ').value.trim();
  const d = document.getElementById('eppRepEntDesde').value;
  const h = document.getElementById('eppRepEntHasta').value;
  if (q) p.set('q', q);
  if (d) p.set('desde', d);
  if (h) p.set('hasta', h);
  const _egR = (typeof getEmpresaGlobal === 'function') ? getEmpresaGlobal() : '';
  if (_egR) p.set('empresa_id', _egR);
  const j = await eppGet('api/epp/entregas.php?' + p.toString());
  eppRepEntData = j.success ? (j.data || []) : [];
  const body = document.getElementById('eppRepEntBody');
  if (!eppRepEntData.length) {
    body.innerHTML = '<tr><td colspan="8" class="muted" style="text-align:center;padding:22px">Sin resultados.</td></tr>';
    return;
  }
  body.innerHTML = eppRepEntData.map(r => `<tr>
    <td class="muted" style="white-space:nowrap">${eppEsc(r.fecha)}</td>
    <td style="font-weight:600;color:var(--gris-100)">${eppEsc(r.trabajador_nombre)}</td>
    <td class="muted">${eppEsc(r.trabajador_dni || '—')}</td>
    <td class="muted">${eppEsc(r.trabajador_cargo || '—')}</td>
    <td>${eppEsc(r.tipo_nombre)}</td>
    <td class="muted">${eppEsc(r.norma_tecnica || '—')}</td>
    <td style="text-align:right;font-variant-numeric:tabular-nums">${r.cantidad}</td>
    <td class="muted" style="white-space:nowrap">${eppEsc(r.fecha_renovacion || '—')}</td>
  </tr>`).join('');
}

async function eppRepVencimientos() {
  const dias = parseInt(document.getElementById('eppRepVenDias').value, 10);
  const _egV = (typeof getEmpresaGlobal === 'function') ? getEmpresaGlobal() : '';
  const j = await eppGet('api/epp/entregas.php?action=vencimientos&dias=' + (isNaN(dias) ? 30 : dias) + (_egV ? '&empresa_id=' + _egV : ''));
  eppRepVenData = j.success ? (j.data || []) : [];
  const body = document.getElementById('eppRepVenBody');
  if (!eppRepVenData.length) {
    body.innerHTML = '<tr><td colspan="7" class="muted" style="text-align:center;padding:22px">Sin vencimientos en el rango.</td></tr>';
    return;
  }
  body.innerHTML = eppRepVenData.map(r => {
    const venc = r.estado === 'vencida';
    const badge = venc ? '<span class="badge badge-danger">Vencida</span>' : '<span class="badge badge-warning">Por vencer</span>';
    return `<tr>
      <td style="font-weight:600;color:var(--gris-100)">${eppEsc(r.trabajador_nombre)}</td>
      <td class="muted">${eppEsc(r.trabajador_dni || '—')}</td>
      <td>${eppEsc(r.tipo_nombre)}</td>
      <td style="text-align:right;font-variant-numeric:tabular-nums">${r.cantidad}</td>
      <td class="muted" style="white-space:nowrap">${eppEsc(r.fecha_renovacion)}</td>
      <td style="text-align:right;font-variant-numeric:tabular-nums;color:${venc ? 'var(--rojo)' : ''}">${r.dias}</td>
      <td>${badge}</td>
    </tr>`;
  }).join('');
}

async function eppRepExport(which) {
  const hoy = new Date().toISOString().slice(0, 10);
  if (which === 'stock') {
    const j = await eppGet('api/epp/movimientos.php?action=stock');
    if (!j.success) { toast('No se pudo obtener el stock', 'error'); return; }
    const rows = (j.data.items || []).map(it =>
      [it.nombre, it.categoria, it.norma_tecnica || '', it.unidad, it.stock, it.stock_minimo,
       Number(it.bajo_minimo) === 1 ? 'BAJO MÍNIMO' : 'OK']);
    eppXlsx(`epp_stock_${hoy}.xlsx`, 'Stock',
      ['EPP', 'Categoría', 'Norma técnica', 'Unidad', 'Stock', 'Mínimo', 'Estado'], rows);

  } else if (which === 'movimientos') {
    const j = await eppGet('api/epp/movimientos.php?action=list&limit=500');
    if (!j.success) { toast('No se pudieron obtener los movimientos', 'error'); return; }
    const rows = (j.data || []).map(m =>
      [m.fecha, m.tipo_nombre, m.tipo_mov, Number(m.cantidad), m.proveedor || '', m.documento_ref || '', m.observacion || '']);
    eppXlsx(`epp_movimientos_${hoy}.xlsx`, 'Movimientos',
      ['Fecha', 'EPP', 'Movimiento', 'Cantidad', 'Proveedor', 'Documento', 'Observación'], rows);

  } else if (which === 'entregas') {
    if (!eppRepEntData.length) await eppRepEntregas();
    const rows = eppRepEntData.map(r =>
      [r.fecha, r.trabajador_nombre, r.trabajador_dni || '', r.trabajador_cargo || '', r.tipo_nombre,
       r.norma_tecnica || '', Number(r.cantidad), r.fecha_renovacion || '',
       EPP_MOTIVO_LABEL[r.motivo] || r.motivo, r.estado]);
    eppXlsx(`epp_entregas_${hoy}.xlsx`, 'Entregas',
      ['Fecha', 'Trabajador', 'DNI', 'Cargo', 'EPP', 'Norma', 'Cantidad', 'Renovación', 'Motivo', 'Estado'], rows);

  } else if (which === 'vencimientos') {
    if (!eppRepVenData.length) await eppRepVencimientos();
    const rows = eppRepVenData.map(r =>
      [r.trabajador_nombre, r.trabajador_dni || '', r.tipo_nombre, Number(r.cantidad),
       r.fecha_renovacion, Number(r.dias), r.estado === 'vencida' ? 'VENCIDA' : 'POR VENCER']);
    eppXlsx(`epp_vencimientos_${hoy}.xlsx`, 'Vencimientos',
      ['Trabajador', 'DNI', 'EPP', 'Cantidad', 'Renovación', 'Días', 'Estado'], rows);
  }
}

// ══════════════ TALLAS (catálogo reutilizable) ══════════════
async function recargarEppTallas() {
  const j = await eppGet('api/epp/tallas.php?action=list&todos=1');
  eppTallasCache = j.success ? (j.data || []) : [];
}

// Rellena el <select> de talla del modal de EPP con las tallas activas.
// Conserva un valor previo aunque ya no esté en la lista (talla antigua).
function eppLlenarTallaSelect(valorActual) {
  const sel = document.getElementById('epp_tipo_talla');
  if (!sel) return;
  const activas = eppTallasCache.filter(t => Number(t.activo) === 1);
  let opts = '<option value="">—</option>' +
    activas.map(t => `<option value="${eppEsc(t.nombre)}">${eppEsc(t.nombre)}</option>`).join('');
  if (valorActual && !activas.some(t => t.nombre === valorActual)) {
    opts += `<option value="${eppEsc(valorActual)}">${eppEsc(valorActual)} (actual)</option>`;
  }
  sel.innerHTML = opts;
  sel.value = valorActual || '';
}

function renderEppTallas() {
  const body = document.getElementById('eppTallaBody');
  if (!body) return;
  if (!eppTallasCache.length) {
    body.innerHTML = '<tr><td colspan="4" class="muted" style="text-align:center;padding:22px">Sin tallas.</td></tr>';
    return;
  }
  body.innerHTML = eppTallasCache.map(t => {
    const activo = Number(t.activo) === 1;
    return `<tr style="${activo ? '' : 'opacity:.55'}">
      <td style="font-weight:600;color:var(--gris-100)">${eppEsc(t.nombre)}</td>
      <td style="text-align:right;font-variant-numeric:tabular-nums" class="muted">${t.orden}</td>
      <td>${activo ? '<span class="badge badge-success">Activa</span>' : '<span class="badge badge-danger">Inactiva</span>'}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-secondary btn-sm" onclick="abrirModalTalla(${t.id})" title="Editar"><i class="fas fa-pen"></i></button>
        <button class="btn btn-danger btn-sm" onclick="eppToggleTalla(${t.id})" title="${activo ? 'Desactivar' : 'Activar'}"><i class="fas fa-power-off"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function abrirModalTalla(id) {
  document.getElementById('formEppTalla').reset();
  document.getElementById('epp_talla_id').value = id || '';
  document.getElementById('modalEppTallaTitulo').textContent = id ? 'Editar talla' : 'Nueva talla';
  if (id) {
    const t = eppTallasCache.find(x => Number(x.id) === Number(id));
    if (t) {
      document.getElementById('epp_talla_nombre').value = t.nombre || '';
      document.getElementById('epp_talla_orden').value  = t.orden ?? 0;
    }
  }
  abrirModal('modalEppTalla');
}

async function eppGuardarTalla() {
  const nombre = document.getElementById('epp_talla_nombre').value.trim();
  if (!nombre) { toast('El nombre es requerido', 'error'); return; }
  const j = await eppPost('api/epp/tallas.php?action=save', {
    id:     document.getElementById('epp_talla_id').value,
    nombre: nombre,
    orden:  document.getElementById('epp_talla_orden').value,
  });
  if (!j.success) { toast(j.message || 'Error', 'error'); return; }
  cerrarModal('modalEppTalla');
  toast(j.message, 'success');
  await recargarEppTallas();
  renderEppTallas();
}

async function eppToggleTalla(id) {
  const j = await eppPost('api/epp/tallas.php?action=toggle', { id });
  if (!j.success) { toast(j.message || 'Error', 'error'); return; }
  toast('Estado actualizado', 'success');
  await recargarEppTallas();
  renderEppTallas();
}

// ══════════════ INGRESO (recepción / compra de EPP) ══════════════
async function cargarEppIngresos() {
  const body = document.getElementById('eppIngBody');
  const j = await eppGet('api/epp/ingresos.php?action=list');
  if (!j.success) { toast('No se pudieron cargar los ingresos', 'error'); return; }
  const rows = j.data || [];
  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="7" class="muted" style="text-align:center;padding:26px">Sin ingresos registrados.</td></tr>';
    return;
  }
  body.innerHTML = rows.map(g => `<tr>
    <td class="muted" style="white-space:nowrap">${eppEsc(g.fecha)}</td>
    <td style="font-weight:600;color:var(--gris-100)">${eppEsc(g.documento_ref || '—')}</td>
    <td class="muted">${eppEsc(g.proveedor || '—')}</td>
    <td style="text-align:right;font-variant-numeric:tabular-nums">${g.lineas}</td>
    <td style="text-align:right;font-variant-numeric:tabular-nums;color:var(--verde);font-weight:700">+${g.total_unidades}</td>
    <td style="text-align:right;font-variant-numeric:tabular-nums" class="muted">${Number(g.total_costo).toFixed(2)}</td>
    <td class="muted">${eppEsc(g.usuario_nombre || '')}</td>
  </tr>`).join('');
}

function abrirModalIngreso() {
  if (!eppTiposCache.filter(t => Number(t.activo) === 1).length) {
    toast('Primero crea tipos de EPP en Configuración', 'warning'); return;
  }
  document.getElementById('formEppIngreso').reset();
  document.getElementById('epp_ing_fecha').value = new Date().toISOString().slice(0, 10);
  const activos = eppProvCache.filter(p => Number(p.activo) === 1);
  document.getElementById('epp_ing_prov').innerHTML = '<option value="">— Ninguno —</option>' +
    activos.map(p => `<option value="${p.id}">${eppEsc(p.razon_social)}</option>`).join('');
  document.getElementById('eppIngItemsBody').innerHTML = '';
  eppIngAgregarFila();
  abrirModal('modalEppIngreso');
}

function eppIngOpcionesEpp() {
  return eppTiposCache.filter(t => Number(t.activo) === 1)
    .map(t => `<option value="${t.id}">${eppEsc(t.nombre)}${t.talla ? ' · ' + eppEsc(t.talla) : ''}</option>`).join('');
}

function eppIngAgregarFila() {
  const tr = document.createElement('tr');
  tr.className = 'epp-ing-fila';
  tr.innerHTML = `
    <td><select class="form-control epp-ing-tipo">${eppIngOpcionesEpp()}</select></td>
    <td><input type="number" class="form-control epp-ing-cant" min="1" value="1" style="text-align:right"></td>
    <td><input type="number" class="form-control epp-ing-costo" min="0" step="0.01" placeholder="—" style="text-align:right"></td>
    <td style="text-align:center"><button type="button" class="btn btn-danger btn-sm" onclick="this.closest('tr').remove()"><i class="fas fa-trash"></i></button></td>`;
  document.getElementById('eppIngItemsBody').appendChild(tr);
}

async function eppGuardarIngreso() {
  const items = [];
  document.querySelectorAll('#eppIngItemsBody tr.epp-ing-fila').forEach(tr => {
    const tipo = tr.querySelector('.epp-ing-tipo').value;
    const cant = parseInt(tr.querySelector('.epp-ing-cant').value, 10);
    const costo = tr.querySelector('.epp-ing-costo').value;
    if (tipo && !isNaN(cant) && cant > 0) items.push({ tipo_epp_id: tipo, cantidad: cant, costo_unitario: costo });
  });
  if (!items.length) { toast('Agrega al menos una línea con cantidad', 'error'); return; }

  const btn = document.getElementById('btnEppIngGuardar');
  btn.disabled = true;
  let j;
  try {
    j = await eppPost('api/epp/ingresos.php?action=registrar', {
      proveedor_id:  document.getElementById('epp_ing_prov').value,
      documento_ref: document.getElementById('epp_ing_doc').value,
      fecha:         document.getElementById('epp_ing_fecha').value,
      observacion:   document.getElementById('epp_ing_obs').value,
      items:         JSON.stringify(items),
    });
  } finally { btn.disabled = false; }
  if (!j || !j.success) { toast((j && j.message) || 'Error al registrar', 'error'); return; }
  cerrarModal('modalEppIngreso');
  toast('Ingreso registrado', 'success');
  cargarEppIngresos();
  cargarEppStock(); cargarEppMovimientos();
}
