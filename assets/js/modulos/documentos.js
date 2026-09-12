// ============================================================
// MÓDULO: DOCUMENTOS (Biblioteca SST)
// Subir/organizar documentos (PDF, imagen, Word, Excel, PPT) por categorías.
// Subir/eliminar: admin/supervisor. Ver/descargar: cualquiera con acceso.
// ============================================================

let _docData = [];
let _docCats = [];
let _docBuscarTimer = null;

function _docPuedeGestionar() { return typeof USER_ROL !== 'undefined' && (USER_ROL === 'administrador' || USER_ROL === 'supervisor'); }
function _docEsAdmin() { return typeof USER_ROL !== 'undefined' && USER_ROL === 'administrador'; }

function initDocumentos() { cargarDocumentos(); }

function docBuscarDebounced() { clearTimeout(_docBuscarTimer); _docBuscarTimer = setTimeout(cargarDocumentos, 300); }

async function cargarDocumentos() {
  const cont = document.getElementById('docLista');
  const cat = document.getElementById('docFiltroCat')?.value || '';
  const q = document.getElementById('docBuscar')?.value.trim() || '';
  if (cont) cont.innerHTML = '<p class="muted" style="text-align:center;padding:28px">Cargando…</p>';
  const params = new URLSearchParams({ action: 'list' });
  if (cat) params.set('categoria_id', cat);
  if (q) params.set('q', q);
  let d = null;
  try { const r = await fetch('api/documentos.php?' + params); d = await r.json(); } catch (e) {}
  if (!d || !d.success) { if (cont) cont.innerHTML = '<p class="muted" style="text-align:center;padding:28px">No se pudieron cargar los documentos.</p>'; return; }
  _docData = d.data.documentos || [];
  _docCats = d.data.categorias || [];
  _docLlenarFiltroCat();
  renderDocumentos();
}

function _docLlenarFiltroCat() {
  const sel = document.getElementById('docFiltroCat');
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">Todas</option>' + _docCats.map(c => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join('');
  sel.value = prev;
}

function _docIcon(ext) {
  ext = (ext || '').toLowerCase();
  if (ext === 'pdf') return ['fa-file-pdf', '#e74c3c'];
  if (['doc', 'docx', 'odt'].includes(ext)) return ['fa-file-word', '#2b579a'];
  if (['xls', 'xlsx', 'ods'].includes(ext)) return ['fa-file-excel', '#217346'];
  if (['ppt', 'pptx', 'odp'].includes(ext)) return ['fa-file-powerpoint', '#d24726'];
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return ['fa-file-image', '#8e44ad'];
  return ['fa-file', '#8a94a6'];
}
function _docTam(b) { b = +b || 0; if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(0) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
function _docFecha(f) { if (!f) return ''; const p = String(f).slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : f; }
function _docEsPreview(ext) { return ['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes((ext || '').toLowerCase()); }

function renderDocumentos() {
  const cont = document.getElementById('docLista');
  const kpis = document.getElementById('docKpis');
  if (kpis) {
    const total = _docData.length;
    const porCat = {};
    _docData.forEach(d => { porCat[d.categoria || 'Sin categoría'] = (porCat[d.categoria || 'Sin categoría'] || 0) + 1; });
    const cats = Object.keys(porCat).length;
    kpis.innerHTML =
      _docKpi('fa-folder-open', 'azul', 'Documentos', total, 'en la biblioteca') +
      _docKpi('fa-tags', 'naranja', 'Categorías', _docCats.length, 'disponibles') +
      _docKpi('fa-layer-group', 'verde', 'Con categoría', cats, 'agrupaciones');
  }
  if (!cont) return;
  if (!_docData.length) {
    cont.innerHTML = '<div class="card"><div class="card-body" style="padding:30px;text-align:center;color:var(--gris-400)"><i class="fas fa-folder-open" style="font-size:26px"></i><p style="margin-top:8px">Sin documentos.' + (_docPuedeGestionar() ? ' Usa “Subir documento”.' : '') + '</p></div></div>';
    return;
  }
  const filas = _docData.map(d => {
    const [ic, col] = _docIcon(d.ext);
    const url = (typeof UPLOAD_URL !== 'undefined' ? UPLOAD_URL : 'uploads/') + d.archivo;
    const nom = (d.nombre_original || d.archivo).replace(/"/g, '');
    const verBtn = `<button class="btn btn-outline btn-sm" onclick="docVer(${d.id})" title="Ver en pantalla"><i class="fas fa-eye"></i></button>`;
    const descBtn = `<a class="btn btn-outline btn-sm" href="${encodeURI(url)}" download="${escapeHtml(nom)}" title="Descargar"><i class="fas fa-download"></i></a>`;
    const delBtn = _docEsAdmin() ? `<button class="btn btn-danger btn-sm" onclick="docEliminar(${d.id},'${escapeHtml(d.titulo).replace(/'/g, "\\'")}')" title="Eliminar"><i class="fas fa-trash"></i></button>` : '';
    return `<tr>
      <td style="min-width:240px"><div style="display:flex;align-items:center;gap:10px">
        <i class="fas ${ic}" style="color:${col};font-size:22px;width:24px;text-align:center"></i>
        <div><div style="font-weight:600;color:var(--gris-100)">${escapeHtml(d.titulo)}</div>
        ${d.descripcion ? '<div class="muted" style="font-size:11px">' + escapeHtml(d.descripcion) + '</div>' : ''}
        <div class="muted" style="font-size:10px">${escapeHtml(d.nombre_original || '')}</div></div></div></td>
      <td>${d.categoria ? '<span class="badge badge-info">' + escapeHtml(d.categoria) + '</span>' : '<span class="muted">—</span>'}</td>
      <td class="muted" style="text-transform:uppercase;font-size:11px">${escapeHtml(d.ext || '')}</td>
      <td class="muted" style="white-space:nowrap">${_docTam(d.tamano)}</td>
      <td class="muted" style="white-space:nowrap">${_docFecha(d.creado_en)}</td>
      <td class="muted">${escapeHtml(d.subido_nombre || '—')}</td>
      <td style="text-align:right;white-space:nowrap">${verBtn} ${descBtn} ${delBtn}</td>
    </tr>`;
  }).join('');
  cont.innerHTML = `<div class="card"><div class="card-body" style="padding:0"><div class="tbl-scroll">
    <table class="data-table" style="min-width:820px"><thead><tr>
      <th>Documento</th><th>Categoría</th><th>Tipo</th><th>Tamaño</th><th>Fecha</th><th>Subido por</th><th style="text-align:right">Acciones</th>
    </tr></thead><tbody>${filas}</tbody></table></div></div></div>`;
}

function _docKpi(icon, color, label, value, sub) {
  return `<div style="background:var(--gris-800);border:1px solid var(--gris-600);border-left:4px solid var(--${color});border-radius:10px;padding:14px 16px">
    <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--gris-400);font-weight:700">${label}</span><i class="fas ${icon}" style="color:var(--${color})"></i></div>
    <div style="font-size:26px;font-weight:800;color:var(--${color})">${value}</div>
    <div class="muted" style="font-size:11px">${sub}</div></div>`;
}

// ── Visor en la misma pantalla ──
// PDF/imagen: se muestran nativos en el iframe. Office (Word/Excel/PPT): se
// embeben con el visor de Microsoft Office Online (requiere que el archivo sea
// público; en producción lo es).
function docVer(id) {
  const d = _docData.find(x => +x.id === +id);
  if (!d) return;
  const rel = (typeof UPLOAD_URL !== 'undefined' ? UPLOAD_URL : 'uploads/') + d.archivo;
  let abs;
  try { abs = new URL(rel, location.href).href; } catch (e) { abs = rel; }
  const ext = (d.ext || '').toLowerCase();
  let src;
  if (['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(ext)) {
    src = abs;   // el navegador lo renderiza directo
  } else {
    src = 'https://view.officeapps.live.com/op/embed.aspx?src=' + encodeURIComponent(abs);
  }
  const fr = document.getElementById('docVisorFrame'); if (fr) fr.src = src;
  const tt = document.getElementById('docVisorTitulo'); if (tt) tt.textContent = d.titulo || 'Documento';
  const ab = document.getElementById('docVisorAbrir'); if (ab) ab.href = abs;
  abrirModal('modalDocVisor');
}
function docCerrarVisor() {
  const fr = document.getElementById('docVisorFrame'); if (fr) fr.src = 'about:blank';   // libera el visor
  cerrarModal('modalDocVisor');
}

// ── Subir ──
function docAbrirSubir() {
  document.getElementById('doc_titulo').value = '';
  document.getElementById('doc_descripcion').value = '';
  document.getElementById('doc_archivo').value = '';
  const sel = document.getElementById('doc_categoria');
  if (sel) sel.innerHTML = '<option value="">— Sin categoría —</option>' + _docCats.map(c => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join('');
  abrirModal('modalDocSubir');
}

async function docSubir() {
  const titulo = document.getElementById('doc_titulo').value.trim();
  const archivo = document.getElementById('doc_archivo').files[0];
  if (!titulo) { toast('Escribe el título', 'warning'); return; }
  if (!archivo) { toast('Selecciona un archivo', 'warning'); return; }
  const btn = document.getElementById('docSubirBtn'); if (btn) btn.disabled = true;
  const fd = new FormData();
  fd.append('action', 'save'); fd.append('csrf_token', CSRF_TOKEN);
  fd.append('titulo', titulo);
  fd.append('descripcion', document.getElementById('doc_descripcion').value.trim());
  fd.append('categoria_id', document.getElementById('doc_categoria').value || '');
  fd.append('archivo', archivo);
  try {
    const r = await fetch('api/documentos.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (d.success) { toast(d.message, 'success'); cerrarModal('modalDocSubir'); cargarDocumentos(); }
    else toast(d.message || 'Error', 'error');
  } catch (e) { toast('Error de conexión', 'error'); }
  if (btn) btn.disabled = false;
}

async function docEliminar(id, titulo) {
  if (!confirm('¿Eliminar el documento "' + (titulo || '') + '"? No se puede deshacer.')) return;
  const fd = new FormData(); fd.append('action', 'delete'); fd.append('csrf_token', CSRF_TOKEN); fd.append('id', id);
  const r = await fetch('api/documentos.php', { method: 'POST', body: fd });
  const d = await r.json();
  if (d.success) { toast('Eliminado', 'success'); cargarDocumentos(); } else toast(d.message || 'Error', 'error');
}

// ── Categorías ──
async function docAbrirCategorias() {
  await cargarDocumentos();   // refresca _docCats
  _docRenderCats();
  document.getElementById('doc_cat_nueva').value = '';
  abrirModal('modalDocCategorias');
}
function _docRenderCats() {
  const cont = document.getElementById('docCatLista');
  if (!cont) return;
  cont.innerHTML = _docCats.length ? _docCats.map(c => `
    <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--gris-700)">
      <input type="text" class="form-control" value="${escapeHtml(c.nombre)}" id="doccat_${c.id}" style="flex:1">
      <button class="btn btn-outline btn-sm" onclick="docCatGuardar(${c.id})" title="Guardar"><i class="fas fa-save"></i></button>
      ${_docEsAdmin() ? `<button class="btn btn-danger btn-sm" onclick="docCatEliminar(${c.id})" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
    </div>`).join('') : '<p class="muted" style="font-size:12px;padding:6px">Sin categorías.</p>';
}
async function docCatGuardar(id) {
  const nombre = id ? document.getElementById('doccat_' + id).value.trim() : document.getElementById('doc_cat_nueva').value.trim();
  if (!nombre) { toast('Escribe el nombre', 'warning'); return; }
  const fd = new FormData(); fd.append('action', 'cat_save'); fd.append('csrf_token', CSRF_TOKEN); fd.append('id', id || '0'); fd.append('nombre', nombre); fd.append('orden', '0');
  const r = await fetch('api/documentos.php', { method: 'POST', body: fd });
  const d = await r.json();
  if (d.success) { toast('Categoría guardada', 'success'); document.getElementById('doc_cat_nueva').value = ''; await cargarDocumentos(); _docRenderCats(); }
  else toast(d.message || 'Error', 'error');
}
async function docCatEliminar(id) {
  if (!confirm('¿Eliminar esta categoría?')) return;
  const fd = new FormData(); fd.append('action', 'cat_del'); fd.append('csrf_token', CSRF_TOKEN); fd.append('id', id);
  const r = await fetch('api/documentos.php', { method: 'POST', body: fd });
  const d = await r.json();
  if (d.success) { toast('Eliminada', 'success'); await cargarDocumentos(); _docRenderCats(); } else toast(d.message || 'Error', 'error', 6000);
}
