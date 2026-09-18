// ============================================================
// DISTRIBUCIÓN SEGURA — MÓDULO: PERSONAL
// CRUD, KPIs, importar/exportar Excel
// ============================================================

let personalData = [];
let personalPagina = 1;
const PERSONAL_PAGE_SIZE = 15;
// Documentos adjuntos (misma lista que el backend PERSONAL_DOC_COLS).
const PERSONAL_DOCS = ['doc_dni','doc_dni_reverso','doc_licencia','doc_licencia_reverso','doc_certijoven','doc_sctr','doc_verif_ref'];

// Barra de paginación reutilizable (mismas clases que el listado). Devuelve HTML;
// los botones llaman a la función global fnName(nroPagina).
function _pagBar(total, pagina, porPag, fnName) {
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
  const btns =
    `<button onclick="${fnName}(${pagina - 1})" ${pagina === 1 ? 'disabled' : ''}>&#8249;</button>` +
    pags.map(p => p === '…'
      ? '<button disabled style="border:none;background:none;cursor:default">…</button>'
      : `<button class="${p === pagina ? 'active' : ''}" onclick="${fnName}(${p})">${p}</button>`).join('') +
    `<button onclick="${fnName}(${pagina + 1})" ${pagina === totalPags ? 'disabled' : ''}>&#8250;</button>`;
  return '<div class="amon-pag-bar"><span class="amon-pag-info">' +
    (total ? `Mostrando ${desde}–${hasta} de ${total}` : '') +
    '</span><div class="amon-pag-btns">' + (totalPags > 1 ? btns : '') + '</div></div>';
}
const RESUMEN_PAGE_SIZE = 15;   // Cumplimiento y Cumpleaños
let _cumpPag = 1, _cumplePag = 1;
function irCumpPagina(n) { _cumpPag = n; renderCumplimiento(); }
function irCumplePagina(n) { _cumplePag = n; renderCumpleanos(); }

// La Licencia (sección + archivo) solo aplica al cargo conductor.
function togglePersonalLicencia() {
  const esConductor = document.getElementById('personal_cargo')?.value === 'conductor';
  const sec = document.getElementById('personalLicenciaSec');
  const doc = document.getElementById('personalDocLicenciaWrap');
  const docRev = document.getElementById('personalDocLicenciaRevWrap');
  if (sec) sec.style.display = esConductor ? '' : 'none';
  if (doc) doc.style.display = esConductor ? '' : 'none';
  if (docRev) docRev.style.display = esConductor ? '' : 'none';
}

function actualizarResumenPersonal(todos) {
  const activos=todos.filter(p=>p.activo==1);
  const dniAlerta=activos.filter(p=>p.dias_vencer_dni!==null&&parseInt(p.dias_vencer_dni)<=30);
  const brevAlerta=activos.filter(p=>p.dias_vencer_brevete!==null&&parseInt(p.dias_vencer_brevete)<=30);
  const sinLicencia=activos.filter(p=>p.cargo==='conductor'&&!p.num_licencia);
  document.getElementById('kpiPersonalTotal').textContent=activos.length;
  document.getElementById('kpiPersonalTotalSub').textContent=`de ${todos.length} registros`;
  document.getElementById('kpiPersonalDniVenc').textContent=dniAlerta.length;
  document.getElementById('kpiPersonalDniSub').textContent=dniAlerta.filter(p=>parseInt(p.dias_vencer_dni)<0).length?`${dniAlerta.filter(p=>parseInt(p.dias_vencer_dni)<0).length} ya vencido(s)`:'en los próximos 30 días';
  document.getElementById('kpiPersonalBreveteVenc').textContent=brevAlerta.length;
  document.getElementById('kpiPersonalBreteSub').textContent=brevAlerta.filter(p=>parseInt(p.dias_vencer_brevete)<0).length?`${brevAlerta.filter(p=>parseInt(p.dias_vencer_brevete)<0).length} ya vencido(s)`:'en los próximos 30 días';
  document.getElementById('kpiPersonalSinLic').textContent=sinLicencia.length;
}

async function cargarPersonal() {
  const q=document.getElementById('filtroPersonalQ')?.value.trim()||'', cargo=document.getElementById('filtroPersonalCargo')?.value||'', activo=document.getElementById('filtroPersonalActivo')?.value??'1';
  const empG = (typeof getEmpresaGlobal === 'function') ? getEmpresaGlobal() : '';
  const params=new URLSearchParams({action:'list',q,cargo,activo,limit:200});
  if (empG) params.set('empresa_id', empG);
  try {
    const r=await fetch('api/personal.php?'+params);
    const data=await r.json();
    if (!data.success) { toast(data.message,'error'); return; }
    personalData=data.data.personal||[];
    personalPagina=1;
    actualizarResumenPersonal(personalData);
    renderPersonalTabla();
  } catch { toast('Error al cargar personal','error'); }
  if (!window._persBadgeDocsCargado) { window._persBadgeDocsCargado = true; _persActualizarBadgeDocs(); }
}

// Carga el conteo de DNI/licencias por vencer o vencidas para el badge de la pestaña.
function _persActualizarBadgeDocs() {
  cargarResumenPersonal(() => {
    const activos = (_resumenData || []).filter(p => +p.activo === 1);
    let n = 0;
    activos.forEach(p => {
      if (p.dni_vencimiento && p.dias_vencer_dni !== null && parseInt(p.dias_vencer_dni) <= 30) n++;
      if (p.cargo === 'conductor' && p.vencimiento_brevete && p.dias_vencer_brevete !== null && parseInt(p.dias_vencer_brevete) <= 30) n++;
    });
    _persDocsBadge(n);
  });
}

function diasParaVencer(fechaStr) { if(!fechaStr)return null; const hoy=new Date();hoy.setHours(0,0,0,0);return Math.round((new Date(fechaStr+'T00:00:00')-hoy)/86400000); }
function badgeDias(dias) {
  if(dias===null||dias===undefined)return'<span style="color:var(--gris-500)">—</span>';
  if(dias<0)return`<span class="badge badge-danger" title="Vencido hace ${Math.abs(dias)} día(s)">${Math.abs(dias)}d VENC.</span>`;
  if(dias<=30)return`<span class="badge badge-warning">${dias}d</span>`;
  return`<span class="badge badge-success">${dias}d</span>`;
}

function irPaginaPersonal(pag) {
  const maxPag = Math.max(1, Math.ceil(personalData.length / PERSONAL_PAGE_SIZE));
  personalPagina = Math.min(Math.max(1, pag), maxPag);
  renderPersonalTabla();
}

function renderPaginacionPersonal() {
  const total    = personalData.length;
  const pagAct   = personalPagina;
  const totalPags= Math.max(1, Math.ceil(total / PERSONAL_PAGE_SIZE));
  const desde    = (pagAct - 1) * PERSONAL_PAGE_SIZE + 1;
  const hasta    = Math.min(pagAct * PERSONAL_PAGE_SIZE, total);

  const infoEl = document.getElementById('pagInfoPersonal');
  const btnsEl = document.getElementById('pagBtnsPersonal');
  if (!infoEl || !btnsEl) return;

  infoEl.textContent = total > 0 ? `Mostrando ${desde}–${hasta} de ${total}` : '';

  let pags = [];
  if (totalPags <= 7) {
    pags = Array.from({length: totalPags}, (_,i) => i+1);
  } else {
    pags = [1];
    if (pagAct > 3) pags.push('…');
    for (let p = Math.max(2, pagAct-1); p <= Math.min(totalPags-1, pagAct+1); p++) pags.push(p);
    if (pagAct < totalPags - 2) pags.push('…');
    pags.push(totalPags);
  }

  btnsEl.innerHTML =
    `<button onclick="irPaginaPersonal(${pagAct-1})" ${pagAct===1?'disabled':''}>&#8249;</button>` +
    pags.map(p => p === '…'
      ? `<button disabled style="border:none;background:none;cursor:default">…</button>`
      : `<button class="${p===pagAct?'active':''}" onclick="irPaginaPersonal(${p})">${p}</button>`
    ).join('') +
    `<button onclick="irPaginaPersonal(${pagAct+1})" ${pagAct===totalPags?'disabled':''}>&#8250;</button>`;
}

function renderPersonalTabla() {
  const tb=document.getElementById('tablaPersonalBody');
  if (!personalData.length) { tb.innerHTML='<tr><td colspan="15" style="text-align:center;padding:32px;color:var(--gris-400)">Sin resultados</td></tr>'; renderPaginacionPersonal(); return; }
  const filas = personalData.slice((personalPagina-1)*PERSONAL_PAGE_SIZE, personalPagina*PERSONAL_PAGE_SIZE);
  renderPaginacionPersonal();
  tb.innerHTML=filas.map(p=>{
    const diasDni=p.dias_vencer_dni!==null?parseInt(p.dias_vencer_dni):null;
    const diasBrevete=p.dias_vencer_brevete!==null?parseInt(p.dias_vencer_brevete):null;
    return`<tr>
      <td>${p.foto?`<img src="${UPLOAD_URL}${p.foto}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;cursor:pointer" onclick="verFotoLightbox('${UPLOAD_URL}${p.foto}')">`:`<div style="width:40px;height:40px;border-radius:50%;background:var(--gris-700);display:flex;align-items:center;justify-content:center;color:var(--gris-400)"><i class="fas fa-user"></i></div>`}</td>
      <td>${escapeHtml(p.dni)}</td>
      <td style="font-size:12px">${escapeHtml(p.fecha_nacimiento)||'—'}</td>
      <td><strong>${escapeHtml(p.nombre)}</strong></td>
      <td><span class="badge">${escapeHtml(p.cargo)}</span></td>
      <td>${escapeHtml(p.telefono)||'—'}</td>
      <td style="font-size:12px">${escapeHtml(p.fecha_ingreso)||'—'}</td>
      <td style="font-size:12px">${escapeHtml(p.dni_vencimiento)||'—'}</td>
      <td style="font-size:12px">${escapeHtml(p.num_licencia)||'—'}</td>
      <td style="font-size:12px">${p.categoria_licencia?`<span class="badge badge-info">${escapeHtml(p.categoria_licencia)}</span>`:'—'}</td>
      <td style="font-size:12px">${escapeHtml(p.vencimiento_brevete)||'—'}</td>
      <td>${badgeDias(diasDni)}</td><td>${badgeDias(diasBrevete)}</td>
      <td style="font-size:12px">${p.tipo_contrato?`<span class="badge badge-secondary">${escapeHtml(p.tipo_contrato)}</span>`:'—'}</td>
      <td>${p.activo==1?'<span class="badge badge-success">Activo</span>':'<span class="badge badge-danger">Inactivo</span>'}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="editarPersonal(${p.id})" title="Editar"><i class="fas fa-edit"></i></button>
        ${p.activo==1?`<button class="btn btn-danger btn-sm" onclick="desactivarPersonal(${p.id})" title="Desactivar"><i class="fas fa-user-slash"></i></button>`:''}
      </td>
    </tr>`;
  }).join('');
}

// Elimina un documento adjunto (columna a NULL + borra el archivo).
// Actualiza el estado visual de una tarjeta de documento (Cargado/Falta + Ver/Quitar).
function _persSetDocEstado(campo, tiene, url) {
  const link = document.getElementById('personal_' + campo + '_link');
  const del  = document.getElementById('personal_' + campo + '_del');
  const est  = document.getElementById('personal_' + campo + '_estado');
  const esAdmin = typeof USER_ROL !== 'undefined' && USER_ROL === 'administrador';
  if (link) {
    if (tiene && url) { link.href = url; link.style.display = ''; }
    else { link.style.display = 'none'; link.removeAttribute('href'); }
  }
  if (del) del.style.display = (tiene && esAdmin) ? '' : 'none';
  if (est) { est.textContent = tiene ? 'Cargado' : 'Falta'; est.className = 'pers-doc-estado ' + (tiene ? 'ok' : 'no'); }
}

// Estado de la tarjeta de Foto de perfil (miniatura + Cargada/Falta + Ver).
function _persSetFotoEstado(url) {
  const link = document.getElementById('personal_foto_link');
  const est  = document.getElementById('personal_foto_estado');
  const thumb= document.getElementById('personal_foto_thumb');
  const ph   = document.getElementById('personal_foto_thumb_ph');
  const tiene = !!url;
  if (link) { if (tiene) { link.href = url; link.style.display = ''; } else { link.style.display = 'none'; link.removeAttribute('href'); } }
  if (est)  { est.textContent = tiene ? 'Cargada' : 'Falta'; est.className = 'pers-doc-estado ' + (tiene ? 'ok' : 'no'); }
  if (thumb){ if (tiene) { thumb.src = url; thumb.style.display = ''; } else { thumb.style.display = 'none'; thumb.removeAttribute('src'); } }
  if (ph)   ph.style.display = tiene ? 'none' : '';
}
// Vista previa al seleccionar una nueva foto.
function _persPreviewFoto(input) {
  const f = input && input.files && input.files[0];
  if (!f) return;
  const url = URL.createObjectURL(f);
  const thumb = document.getElementById('personal_foto_thumb');
  const ph = document.getElementById('personal_foto_thumb_ph');
  const est = document.getElementById('personal_foto_estado');
  if (thumb) { thumb.src = url; thumb.style.display = ''; }
  if (ph) ph.style.display = 'none';
  if (est) { est.textContent = 'Nueva'; est.className = 'pers-doc-estado ok'; }
}

async function eliminarDocPersonal(campo) {
  const id = document.getElementById('personal_id').value;
  if (!id) return;
  if (!confirm('¿Eliminar este documento? Esta acción no se puede deshacer.')) return;
  const fd = new FormData();
  fd.append('action', 'eliminar_doc'); fd.append('csrf_token', CSRF_TOKEN);
  fd.append('id', id); fd.append('campo', campo);
  try {
    const r = await fetch('api/personal.php', { method: 'POST', body: fd });
    const j = await r.json();
    if (!j.success) { toast(j.message || 'Error', 'error'); return; }
    toast('Documento eliminado', 'success');
    _persSetDocEstado(campo, false);
    if (_personalActual) { _personalActual[campo] = null; _actualizarBtnExpediente(_personalActual); }
    cargarPersonal();
  } catch { toast('Error de conexión', 'error'); }
}

// Visor de documento en la misma pantalla (imagen o PDF), sin abrir otra página.
// Comprime una imagen (jpg/png/webp) redimensionando a maxDim y exportando JPEG.
// Los archivos que no son imagen (p. ej. PDF) se devuelven sin cambios. Si el
// resultado no reduce el tamaño, se conserva el original.
function _esImagenFilePersonal(file) {
  return /^image\/(jpeg|png|webp)$/i.test(file.type) || /\.(jpe?g|png|webp)$/i.test(file.name);
}
// Lee un File como data URL (base64) para enviarlo en un campo de texto.
function _fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function _comprimirImagenPersonal(file, maxDim, calidad) {
  return new Promise((resolve) => {
    if (!file || !_esImagenFilePersonal(file)) { resolve(file); return; }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      if (!w || !h) { resolve(file); return; }
      const escala = Math.min(1, maxDim / Math.max(w, h));
      const nw = Math.round(w * escala), nh = Math.round(h * escala);
      const c = document.createElement('canvas');
      c.width = nw; c.height = nh;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, nw, nh);   // fondo blanco (PNG con transparencia)
      ctx.drawImage(img, 0, 0, nw, nh);
      c.toBlob((blob) => {
        if (!blob || blob.size >= file.size) { resolve(file); return; }   // no empeorar
        const nombre = file.name.replace(/\.(png|webp|jpe?g)$/i, '') + '.jpg';
        resolve(new File([blob], nombre, { type: 'image/jpeg', lastModified: Date.now() }));
      }, 'image/jpeg', calidad);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

function verDocumento(url) {
  const body = document.getElementById('visorDocBody');
  const abrir = document.getElementById('visorDocAbrir');
  if (!body) { window.open(url, '_blank'); return; }
  if (abrir) abrir.href = url;
  const esPdf = /\.pdf(\?|#|$)/i.test(url);
  body.innerHTML = esPdf
    ? `<iframe src="${url}" title="Documento" style="width:100%;height:78vh;border:0;background:#fff"></iframe>`
    : `<img src="${url}" alt="Documento" style="max-width:100%;max-height:78vh;object-fit:contain;display:block">`;
  abrirModal('modalVisorDoc');
}

// Persona actualmente en edición (para armar su expediente).
let _personalActual = null;

// Carga pdf-lib bajo demanda (solo al generar un expediente).
function cargarPdfLib() {
  if (typeof PDFLib !== 'undefined') return Promise.resolve(true);
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

// Cualquier imagen (jpg/png/webp, incluso progresiva/CMYK) → PNG vía canvas.
// pdf-lib solo incrusta JPEG baseline y PNG; el canvas normaliza todo lo que
// el navegador pueda mostrar, así ningún documento-imagen se pierde.
function _imagenAPng(bytes, ext) {
  const mime = { jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp' }[ext] || 'image/jpeg';
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
      c.getContext('2d').drawImage(img, 0, 0);
      c.toBlob(b => { URL.revokeObjectURL(url); b ? b.arrayBuffer().then(resolve).catch(reject) : reject(new Error('canvas')); }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('imagen ilegible')); };
    img.src = url;
  });
}

// Une todos los documentos de la persona en un solo PDF y lo descarga.
async function descargarExpedientePersonal() {
  const p = _personalActual;
  if (!p) return;

  const orden = [
    ['doc_dni','DNI (anverso)'], ['doc_dni_reverso','DNI (reverso)'],
    ['doc_licencia','Licencia (anverso)'], ['doc_licencia_reverso','Licencia (reverso)'],
    ['doc_certijoven','CertiJoven'], ['doc_sctr','SCTR'], ['doc_verif_ref','Verificación de referencias']
  ];
  const docs = orden.filter(([c]) => p[c]).map(([c,label]) => {
    const ruta = p[c];
    return { url: UPLOAD_URL + ruta, label, ext: (ruta.split('.').pop() || '').toLowerCase() };
  });
  if (!docs.length) { toast('Esta persona no tiene documentos', 'warning'); return; }

  const btn = document.getElementById('btnExpedientePersonal');
  const prev = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generando…'; }
  try {
    if (!(await cargarPdfLib())) { toast('No se pudo cargar el módulo PDF (revisa tu conexión).', 'error'); return; }
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const merged = await PDFDocument.create();
    const font     = await merged.embedFont(StandardFonts.Helvetica);
    const fontBold = await merged.embedFont(StandardFonts.HelveticaBold);
    // pdf-lib (fuentes estándar) usa WinAnsi: descarta lo que no sea Latin-1
    // para que un carácter raro en el nombre no rompa el separador.
    const _win = s => String(s || '').replace(/[^\x20-\xFF]/g, '');
    const nom = _win((p.nombre || '').toUpperCase());
    const dni = _win(p.dni || '—');
    let nSec = 0;

    // Página separadora A4 con el nombre del documento y datos de la persona.
    const addSeparador = (rotulo) => {
      const titulo = _win(rotulo);
      nSec++;
      const page = merged.addPage([595.28, 841.89]);
      const { width, height } = page.getSize();
      const centrar = (txt, f, size) => (width - f.widthOfTextAtSize(txt, size)) / 2;
      // Banda superior con datos del expediente.
      page.drawRectangle({ x: 0, y: height - 130, width, height: 130, color: rgb(0.11, 0.13, 0.17) });
      page.drawText('EXPEDIENTE DE PERSONAL', { x: 40, y: height - 58, size: 11, font, color: rgb(0.96, 0.784, 0) });
      page.drawText(nom || '-', { x: 40, y: height - 84, size: 16, font: fontBold, color: rgb(1, 1, 1) });
      page.drawText('DNI ' + dni, { x: 40, y: height - 106, size: 11, font, color: rgb(0.78, 0.8, 0.83) });
      // Título del documento, centrado.
      page.drawText(titulo, { x: centrar(titulo, fontBold, 32), y: height / 2 + 6, size: 32, font: fontBold, color: rgb(0.11, 0.13, 0.17) });
      const cap = 'Documento ' + nSec;
      page.drawText(cap, { x: centrar(cap, font, 12), y: height / 2 - 22, size: 12, font, color: rgb(0.5, 0.53, 0.57) });
      // Línea de acento.
      page.drawRectangle({ x: width / 2 - 40, y: height / 2 - 6, width: 80, height: 3, color: rgb(0.96, 0.784, 0) });
      page.drawText('Generado el ' + new Date().toLocaleDateString('es-PE'), { x: 40, y: 36, size: 9, font, color: rgb(0.6, 0.62, 0.66) });
    };

    // 'YYYY-MM-DD' → 'DD/MM/YYYY' (sin desfase de zona horaria).
    const fmt = f => { if (!f) return '—'; const m = String(f).split('-'); return m.length === 3 ? m[2] + '/' + m[1] + '/' + m[0] : f; };

    // Portada A4 con la identidad de la EMPRESA del trabajador + sus datos.
    const addPortada = async (emp) => {
      const page = merged.addPage([595.28, 841.89]);
      const { width, height } = page.getSize();
      page.drawRectangle({ x: 0, y: height - 150, width, height: 150, color: rgb(0.11, 0.13, 0.17) });
      let textX = 40;
      if (emp && emp.logo) {
        try {
          const rl = await fetch(UPLOAD_URL + emp.logo);
          if (rl.ok) {
            const png = await _imagenAPng(await rl.arrayBuffer(), (emp.logo.split('.').pop() || 'png').toLowerCase());
            const img = await merged.embedPng(png);
            const box = 78, sc = Math.min(box / img.width, box / img.height), w = img.width * sc, hh = img.height * sc;
            page.drawRectangle({ x: 40, y: height - 40 - box, width: box, height: box, color: rgb(1, 1, 1) });
            page.drawImage(img, { x: 40 + (box - w) / 2, y: height - 40 - box + (box - hh) / 2, width: w, height: hh });
            textX = 40 + box + 18;
          }
        } catch (e) {}
      }
      const rs = _win((emp && emp.razon_social) || p.empresa || 'EMPRESA');
      page.drawText('EXPEDIENTE DE PERSONAL', { x: textX, y: height - 52, size: 10, font, color: rgb(0.96, 0.784, 0) });
      page.drawText(rs.slice(0, 42), { x: textX, y: height - 80, size: 18, font: fontBold, color: rgb(1, 1, 1) });
      if (emp && emp.ruc) page.drawText('RUC ' + _win(emp.ruc), { x: textX, y: height - 102, size: 11, font, color: rgb(0.78, 0.8, 0.83) });
      if (emp && emp.domicilio) page.drawText(_win(emp.domicilio).slice(0, 62), { x: textX, y: height - 120, size: 9, font, color: rgb(0.7, 0.72, 0.76) });

      let y = height - 200;
      const seccion = (txt) => { page.drawText(txt, { x: 40, y, size: 12, font: fontBold, color: rgb(0.11, 0.13, 0.17) }); page.drawRectangle({ x: 40, y: y - 8, width: 80, height: 2.5, color: rgb(0.96, 0.784, 0) }); y -= 32; };
      seccion('DATOS DEL TRABAJADOR');
      const filas = [
        ['Nombre y apellidos', nom], ['DNI', dni], ['Cargo', _win(p.cargo || '—')],
        ['Empresa', rs], ['Teléfono', _win(p.telefono || '—')],
        ['Fecha de ingreso', fmt(p.fecha_ingreso)], ['Fecha de nacimiento', fmt(p.fecha_nacimiento)],
        ['Vencimiento DNI', fmt(p.dni_vencimiento)],
      ];
      if (p.cargo === 'conductor') {
        filas.push(['N° Licencia', _win(p.num_licencia || '—')], ['Categoría', _win(p.categoria_licencia || '—')], ['Vencimiento brevete', fmt(p.vencimiento_brevete)]);
      }
      filas.forEach(([k, v]) => {
        page.drawText(k, { x: 40, y, size: 10, font, color: rgb(0.42, 0.45, 0.5) });
        page.drawText(String(v || '—'), { x: 220, y, size: 11, font: fontBold, color: rgb(0.13, 0.15, 0.19) });
        y -= 23;
      });
      y -= 14;
      seccion('DOCUMENTOS INCLUIDOS');
      docs.forEach((d, i) => { page.drawText((i + 1) + '.  ' + _win(d.label), { x: 48, y, size: 11, font, color: rgb(0.2, 0.22, 0.26) }); y -= 20; });
      page.drawText('Generado el ' + new Date().toLocaleDateString('es-PE'), { x: 40, y: 36, size: 9, font, color: rgb(0.6, 0.62, 0.66) });
    };

    // Trae la empresa del trabajador para la portada (si tiene una asignada).
    let _emp = null;
    if (p.empresa_id) {
      try { const re = await fetch('api/empresas.php?action=get&id=' + p.empresa_id); const de = await re.json(); if (de && de.success) _emp = de.data; } catch (e) {}
    }
    await addPortada(_emp);

    let incluidos = 0; const fallos = [];
    for (const d of docs) {
      try {
        const resp = await fetch(d.url);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const bytes = await resp.arrayBuffer();
        if (d.ext === 'pdf') {
          // Procesa el contenido ANTES del separador para no dejar separadores huérfanos si falla.
          // ignoreEncryption: permite PDFs cifrados sin contraseña de apertura (scans típicos).
          const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
          const pages = await merged.copyPages(src, src.getPageIndices());
          addSeparador(d.label.toUpperCase());
          pages.forEach(pg => merged.addPage(pg));
        } else {
          // Todas las imágenes pasan por canvas → PNG (robusto ante jpg progresivo/CMYK/webp).
          const pngBytes = await _imagenAPng(bytes, d.ext);
          const img = await merged.embedPng(pngBytes);
          addSeparador(d.label.toUpperCase());
          const page = merged.addPage([img.width, img.height]);
          page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        }
        incluidos++;
      } catch (e) {
        console.error('[expediente] falló ' + d.label + ' (' + d.url + '):', e);
        fallos.push(d.label);
      }
    }
    if (!incluidos) { toast('No se pudo procesar ningún documento', 'error'); return; }

    const out = await merged.save();
    const nombre = (p.nombre || 'personal').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
    a.download = `expediente_${p.dni || ''}_${nombre}.pdf`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast(fallos.length
      ? `Expediente generado (${incluidos} docs · con error: ${fallos.join(', ')})`
      : `Expediente generado (${incluidos} documentos)`, fallos.length ? 'warning' : 'success', 6000);
  } catch (e) {
    toast('Error al generar el expediente: ' + e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = prev; }
  }
}

// Muestra el botón de expediente si la persona tiene al menos un documento.
function _actualizarBtnExpediente(p) {
  const wrap = document.getElementById('btnExpedienteWrap');
  if (!wrap) return;
  const tiene = ['doc_dni','doc_licencia','doc_certijoven','doc_sctr','doc_verif_ref'].some(c => p && p[c]);
  wrap.style.display = tiene ? 'block' : 'none';
}

function abrirModalPersonal() {
  document.getElementById('formPersonal').reset();
  document.getElementById('personal_id').value='';
  document.getElementById('modalPersonalTitulo').textContent='Nuevo Personal';
  PERSONAL_DOCS.forEach(c => _persSetDocEstado(c, false));
  _persSetFotoEstado(null);
  _personalActual = null;
  _actualizarBtnExpediente(null);
  if (typeof cargarEmpresasSelect === 'function') cargarEmpresasSelect('personal_empresa_id', '');
  togglePersonalLicencia();
  abrirModal('modalPersonal');
}

async function editarPersonal(id) {
  const r=await fetch(`api/personal.php?action=get&id=${id}`);
  const data=await r.json();
  if (!data.success) { toast(data.message,'error'); return; }
  const p=data.data;
  // IMPORTANTE: limpiar los inputs de archivo para no arrastrar un archivo
  // seleccionado (y no guardado) de otra persona editada antes.
  ['personal_foto', ...PERSONAL_DOCS.map(c => 'personal_' + c)].forEach(fid => { const el = document.getElementById(fid); if (el) el.value = ''; });
  document.getElementById('personal_id').value=p.id;
  document.getElementById('personal_dni').value=p.dni;
  document.getElementById('personal_nombre').value=p.nombre;
  document.getElementById('personal_cargo').value=p.cargo;
  if (typeof cargarEmpresasSelect === 'function') cargarEmpresasSelect('personal_empresa_id', p.empresa_id || '');
  document.getElementById('personal_telefono').value=p.telefono||'';
  document.getElementById('personal_fecha_nacimiento').value=p.fecha_nacimiento||'';
  document.getElementById('personal_fecha_ingreso').value=p.fecha_ingreso||'';
  document.getElementById('personal_dni_vencimiento').value=p.dni_vencimiento||'';
  document.getElementById('personal_num_licencia').value=p.num_licencia||'';
  document.getElementById('personal_categoria_licencia').value=p.categoria_licencia||'';
  document.getElementById('personal_vencimiento_brevete').value=p.vencimiento_brevete||'';
  document.getElementById('personal_observaciones').value=p.observaciones||'';
  document.getElementById('personal_activo').value=p.activo;
  document.getElementById('personal_tipo_contrato').value=p.tipo_contrato||'';
  // Estado de los documentos ya cargados (Cargado/Falta + Ver/Quitar).
  PERSONAL_DOCS.forEach(c => _persSetDocEstado(c, !!p[c], p[c] ? UPLOAD_URL + p[c] : null));
  _persSetFotoEstado(p.foto ? UPLOAD_URL + p.foto : null);
  _personalActual = p;
  _actualizarBtnExpediente(p);
  document.getElementById('modalPersonalTitulo').textContent='Editar Personal';
  togglePersonalLicencia();
  abrirModal('modalPersonal');
}

async function desactivarPersonal(id) {
  if (!confirm('¿Desactivar a esta persona? No se borrará de los registros históricos.')) return;
  const fd=new FormData(); fd.append('id',id); fd.append('csrf_token',CSRF_TOKEN);
  const r=await fetch('api/personal.php?action=delete',{method:'POST',body:fd});
  const data=await r.json();
  if (data.success) { toast('Desactivado','success'); cargarPersonal(); }
  else toast(data.message,'error');
}

document.addEventListener('DOMContentLoaded', () => {
  const f=document.getElementById('formPersonal');
  if (f) f.addEventListener('submit', async e => {
    e.preventDefault();
    const fd=new FormData();
    fd.append('action','save'); fd.append('csrf_token',CSRF_TOKEN);
    fd.append('id',                   document.getElementById('personal_id').value);
    fd.append('dni',                  document.getElementById('personal_dni').value.trim());
    fd.append('nombre',               document.getElementById('personal_nombre').value.trim());
    fd.append('cargo',                document.getElementById('personal_cargo').value);
    fd.append('empresa_id',           document.getElementById('personal_empresa_id').value);
    fd.append('telefono',             document.getElementById('personal_telefono').value.trim());
    fd.append('fecha_nacimiento',     document.getElementById('personal_fecha_nacimiento').value);
    fd.append('fecha_ingreso',        document.getElementById('personal_fecha_ingreso').value);
    fd.append('dni_vencimiento',      document.getElementById('personal_dni_vencimiento').value);
    fd.append('num_licencia',         document.getElementById('personal_num_licencia').value.trim());
    fd.append('categoria_licencia',   document.getElementById('personal_categoria_licencia').value);
    fd.append('vencimiento_brevete',  document.getElementById('personal_vencimiento_brevete').value);
    fd.append('observaciones',        document.getElementById('personal_observaciones').value.trim());
    fd.append('activo',               document.getElementById('personal_activo').value);
    fd.append('tipo_contrato',        document.getElementById('personal_tipo_contrato').value);
    // Recolecta archivos y valida tamaños (5MB por archivo). Se comprimen las
    // imágenes; la FOTO va en el guardado y cada DOCUMENTO se sube por separado
    // para no superar el límite del servidor al enviar todo junto.
    const MAX_FOTO = 5 * 1024 * 1024;      // foto de perfil
    const MAX_DOC = 15 * 1024 * 1024;      // documentos (PDF escaneados pesan)
    let foto = document.getElementById('personal_foto').files[0] || null;
    const docs = [];
    PERSONAL_DOCS.forEach(c => { const df = document.getElementById('personal_' + c).files[0]; if (df) docs.push({ campo: c, file: df }); });

    if (foto) foto = await _comprimirImagenPersonal(foto, 1600, 0.8);
    for (const d of docs) { d.file = await _comprimirImagenPersonal(d.file, 1600, 0.85); }

    if (foto && foto.size > MAX_FOTO) { toast('La foto supera 5MB. Usa una más liviana.', 'error', 6000); return; }
    const grandes = docs.filter(d => d.file.size > MAX_DOC).map(d => d.file.name);
    if (grandes.length) { toast('Estos documentos superan 15MB: ' + grandes.join(', ') + '. Reescanéalos más livianos.', 'error', 7000); return; }

    if (foto) fd.append('foto', foto);   // la foto va con el guardado (es pequeña)

    const btnG = document.getElementById('btnGuardarPersonal');
    const btnTxt = btnG ? btnG.innerHTML : '';
    if (btnG) { btnG.disabled = true; btnG.innerHTML = '<div class="spinner"></div> Guardando…'; }
    try {
      // 1) Guarda datos + foto y obtiene el id.
      const r = await fetch('api/personal.php', { method: 'POST', body: fd });
      const txt = await r.text();
      let data = null; try { data = JSON.parse(txt); } catch (e) {}
      if (!data) {
        toast((r.status === 413 || !r.ok) ? 'El servidor rechazó la subida. Reduce el tamaño de la foto.' : 'Respuesta inesperada del servidor.', 'error', 7000);
        return;
      }
      if (!data.success) { toast(data.message || 'No se pudo guardar', 'error'); return; }
      const pid = data.data && data.data.id;

      // 2) Sube cada documento por separado (una petición por archivo).
      let okDocs = 0; const falloDocs = [];
      if (pid && docs.length) {
        if (btnG) btnG.innerHTML = '<div class="spinner"></div> Subiendo documentos…';
        for (const d of docs) {
          const fdd = new FormData();
          fdd.append('action', 'subir_doc'); fdd.append('csrf_token', CSRF_TOKEN);
          fdd.append('id', pid); fdd.append('campo', d.campo);
          // Se envía como base64 (campo normal) para evitar bloqueos del WAF a subidas multipart.
          try { fdd.append('archivo_b64', await _fileToDataURL(d.file)); } catch (e) { fdd.append('archivo', d.file); }
          try {
            const rd = await fetch('api/personal.php', { method: 'POST', body: fdd });
            const tt = await rd.text();
            let jd = null; try { jd = JSON.parse(tt); } catch (e) {}
            if (jd && jd.success) okDocs++;
            else falloDocs.push(d.campo + (jd && jd.message ? ' — ' + jd.message : (rd.status ? ' (HTTP ' + rd.status + ')' : '')));
          } catch (e) { falloDocs.push(d.campo + ' (sin respuesta)'); }
        }
      }

      if (falloDocs.length) toast('Guardado, pero no se subió: ' + falloDocs.join(' · '), 'warning', 10000);
      else toast(data.message + (okDocs ? ' · ' + okDocs + ' documento(s) subido(s)' : ''), 'success');
      cerrarModal('modalPersonal'); cargarPersonal();
    } catch { toast('Error de conexión', 'error'); }
    finally { if (btnG) { btnG.disabled = false; btnG.innerHTML = btnTxt; } }
  });

  const fQ=document.getElementById('filtroPersonalQ');
  if (fQ) fQ.addEventListener('input', () => { clearTimeout(window._filtroPersonalTimer); window._filtroPersonalTimer=setTimeout(cargarPersonal,300); });
});

// ── Import / Export Excel ─────────────────────────────────────
function descargarPlantillaPersonal() {
  const plantilla=[
    {dni:'12345678',nombre:'Juan Pérez García',cargo:'conductor',empresa:'DICORJES E.I.R.L.',telefono:'999888777',fecha_ingreso:'2023-03-15',dni_vencimiento:'2026-08-20',num_licencia:'Q12345678',categoria_licencia:'A-IIb',vencimiento_brevete:'2026-06-15',observaciones:''},
    {dni:'87654321',nombre:'María López Torres',cargo:'auxiliar',empresa:'DICORJES E.I.R.L.',telefono:'988777666',fecha_ingreso:'2024-01-10',dni_vencimiento:'2027-03-10',num_licencia:'',categoria_licencia:'',vencimiento_brevete:'',observaciones:''},
  ];
  const ws=XLSX.utils.json_to_sheet(plantilla), wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Personal'); XLSX.writeFile(wb,'plantilla_personal.xlsx');
}

function exportarExcelPersonal() {
  if (!personalData.length) { toast('No hay personal para exportar','warning'); return; }
  const ws=XLSX.utils.json_to_sheet(personalData.map(p=>{
    const diasDni=p.dias_vencer_dni!==null?parseInt(p.dias_vencer_dni):null;
    const diasBrevete=p.dias_vencer_brevete!==null?parseInt(p.dias_vencer_brevete):null;
    return {DNI:p.dni,Nombre:p.nombre,Cargo:p.cargo,'Tipo Contrato':p.tipo_contrato||'',Empresa:p.empresa||'',Teléfono:p.telefono||'','Fecha Ingreso':p.fecha_ingreso||'','Venc. DNI':p.dni_vencimiento||'','Días DNI':diasDni!==null?diasDni:'',' N° Licencia':p.num_licencia||'','Categoría':p.categoria_licencia||'','Venc. Brevete':p.vencimiento_brevete||'','Días Brevete':diasBrevete!==null?diasBrevete:'',Estado:p.activo==1?'Activo':'Inactivo',Observaciones:p.observaciones||''};
  }));
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Personal');
  XLSX.writeFile(wb,`personal_${new Date().toISOString().slice(0,10)}.xlsx`);
}

async function importarExcelPersonal(input) {
  const file=input.files[0]; if (!file) return;
  try {
    const buffer=await file.arrayBuffer(), wb=XLSX.read(buffer,{type:'array'});
    const ws=wb.Sheets[wb.SheetNames[0]], rawRows=XLSX.utils.sheet_to_json(ws,{defval:''});
    const norm=s=>String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
    const filas=rawRows.map(r=>{
      const obj={};
      for (const k in r) {
        const kn=norm(k);
        if(kn==='dni') obj.dni=String(r[k]).trim();
        else if(kn==='nombre'||kn==='nombres') obj.nombre=String(r[k]).trim();
        else if(kn==='cargo') obj.cargo=String(r[k]).trim();
        else if(kn==='empresa') obj.empresa=String(r[k]).trim();
        else if(kn==='telefono'||kn==='telefonos'||kn==='celular') obj.telefono=String(r[k]).trim();
        else if(kn.includes('ingreso')) obj.fecha_ingreso=String(r[k]).trim();
        else if(kn.includes('venc')&&kn.includes('dni')) obj.dni_vencimiento=String(r[k]).trim();
        else if(kn.includes('licencia')&&(kn.includes('n')||kn.includes('num')||kn.includes('nro'))) obj.num_licencia=String(r[k]).trim();
        else if(kn.includes('categor')) obj.categoria_licencia=String(r[k]).trim();
        else if(kn.includes('brevete')||kn.includes('venc')&&kn.includes('brev')) obj.vencimiento_brevete=String(r[k]).trim();
        else if(kn==='observaciones'||kn==='observacion') obj.observaciones=String(r[k]).trim();
      }
      return obj;
    }).filter(r=>r.dni&&r.nombre);
    if (!filas.length) { toast('No se detectaron filas válidas','error'); input.value=''; return; }
    if (!confirm(`Se importarán ${filas.length} registros. ¿Continuar?`)) { input.value=''; return; }
    const fd=new FormData(); fd.append('action','importar_excel'); fd.append('csrf_token',CSRF_TOKEN); fd.append('filas',JSON.stringify(filas));
    const r=await fetch('api/personal.php',{method:'POST',body:fd});
    const data=await r.json();
    if (data.success) {
      toast(`✔ ${data.data.nuevos} nuevos, ${data.data.actualizados} actualizados`,'success',5000);
      if(data.data.errores.length) alert('Algunas filas tuvieron problemas:\n\n'+data.data.errores.join('\n'));
      cargarPersonal();
    } else toast(data.message,'error');
  } catch(err) { console.error(err); toast('Error al leer el Excel','error'); }
  input.value='';
}

// ============================================================
// SUB-MÓDULOS DE PERSONAL: cumplimiento documentario + cumpleaños
// ============================================================
let _resumenData = [];

// Campos que se evalúan. cond=true → solo aplica al cargo conductor.
// file:true → el valor es un archivo subido; el ✓ enlaza al visor.
const CUMP_CAMPOS = [
  { k:'foto',                label:'Foto',          cond:false, file:true },
  { k:'telefono',            label:'Teléfono',      cond:false },
  { k:'fecha_nacimiento',    label:'F. Nac.',       cond:false },
  { k:'fecha_ingreso',       label:'F. Ingreso',    cond:false },
  { k:'dni_vencimiento',     label:'Venc. DNI',     cond:false },
  { k:'num_licencia',        label:'N° Licencia',   cond:true  },
  { k:'categoria_licencia',  label:'Cat. Lic.',     cond:true  },
  { k:'vencimiento_brevete', label:'Venc. Brevete', cond:true  },
  { k:'doc_dni',             label:'Doc. DNI',      cond:false, file:true },
  { k:'doc_licencia',        label:'Doc. Licencia', cond:true,  file:true },
  { k:'doc_certijoven',      label:'Certijoven',    cond:false, file:true },
  { k:'doc_sctr',            label:'SCTR',          cond:false, file:true },
  { k:'doc_verif_ref',       label:'Verif. Ref.',   cond:false, file:true },
];

// Evalúa una persona: celdas (ok/falta/na) + % de cumplimiento sobre lo aplicable.
function _cumpEval(p) {
  const esCond = p.cargo === 'conductor';
  let aplican = 0, ok = 0;
  const celdas = CUMP_CAMPOS.map(c => {
    if (c.cond && !esCond) return { estado: 'na' };
    aplican++;
    const tiene = !!(p[c.k] && String(p[c.k]).trim() !== '');
    if (tiene) ok++;
    return { estado: tiene ? 'ok' : 'falta' };
  });
  return { celdas, pct: aplican ? Math.round(ok / aplican * 100) : 100 };
}

function switchPersonalTab(tab) {
  document.querySelectorAll('.personal-tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.personal-tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('personal-panel-' + tab)?.classList.add('active');
  document.getElementById('personal-btn-' + tab)?.classList.add('active');
  if (tab === 'cumplimiento') cargarResumenPersonal(renderCumplimiento);
  if (tab === 'cumpleanos')   cargarResumenPersonal(renderCumpleanos);
  if (tab === 'docs')         cargarResumenPersonal(renderPersonalDocs);
}

// ══════════════════════════════════════════════════════════════
// SUB-MÓDULO: DNI Y LICENCIA (documentos + vencimientos)
// ══════════════════════════════════════════════════════════════
function _persFecha(f) { if (!f) return ''; const p = String(f).slice(0, 10).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : f; }

function _persVencBadge(fecha, dias) {
  if (!fecha) return '<span class="badge badge-secondary" style="font-size:10px">Sin fecha</span>';
  const d = parseInt(dias);
  const cls = d < 0 ? 'badge-danger' : d <= 30 ? 'badge-warning' : 'badge-success';
  const txt = d < 0 ? ('venció hace ' + Math.abs(d) + ' d') : ('en ' + d + ' d');
  return `<span class="badge ${cls}" style="font-size:10px">${_persFecha(fecha)} · ${txt}</span>`;
}

// Miniatura de un documento (imagen) o tarjeta PDF; vacío si no hay archivo.
function _persDocThumb(ruta, label) {
  if (!ruta) return `<div style="width:132px;height:84px;border:1px dashed var(--gris-600);border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--gris-500);font-size:11px;text-align:center">Sin ${escapeHtml(label)}</div>`;
  const url = UPLOAD_URL + ruta;
  const ext = (ruta.split('.').pop() || '').toLowerCase();
  const esImg = ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
  const cap = `<div style="font-size:10px;color:var(--gris-400);text-align:center;margin-top:2px">${escapeHtml(label)}</div>`;
  if (esImg) return `<div><img src="${url}" onclick="verDocumento('${encodeURI(url)}')" title="${escapeHtml(label)}" style="width:132px;height:84px;object-fit:cover;border-radius:6px;cursor:pointer;border:1px solid var(--gris-600)">${cap}</div>`;
  return `<div><a href="#" onclick="verDocumento('${encodeURI(url)}');return false;" title="${escapeHtml(label)}" style="width:132px;height:84px;border:1px solid var(--gris-600);border-radius:6px;display:flex;align-items:center;justify-content:center;color:var(--primary);text-decoration:none"><i class="fas fa-file-pdf" style="font-size:26px"></i></a>${cap}</div>`;
}

function _persDocsBadge(n) {
  const b = document.getElementById('personalDocsBadge');
  if (!b) return;
  if (+n > 0) { b.textContent = n; b.style.display = ''; } else b.style.display = 'none';
}

function renderPersonalDocs() {
  const wrap = document.getElementById('personalDocsLista');
  const alertCont = document.getElementById('personalDocsAlertas');
  if (!wrap) return;
  const activos = (_resumenData || []).filter(p => +p.activo === 1);

  // ── Alertas (≤30 días o vencidos): DNI de todos, Licencia solo conductores ──
  const alertas = [];
  activos.forEach(p => {
    if (p.dni_vencimiento && p.dias_vencer_dni !== null && parseInt(p.dias_vencer_dni) <= 30)
      alertas.push({ tipo: 'DNI', nombre: p.nombre, id: p.id, fecha: p.dni_vencimiento, dias: parseInt(p.dias_vencer_dni) });
    if (p.cargo === 'conductor' && p.vencimiento_brevete && p.dias_vencer_brevete !== null && parseInt(p.dias_vencer_brevete) <= 30)
      alertas.push({ tipo: 'Licencia', nombre: p.nombre, id: p.id, fecha: p.vencimiento_brevete, dias: parseInt(p.dias_vencer_brevete) });
  });
  alertas.sort((a, b) => a.dias - b.dias);
  _persDocsBadge(alertas.length);
  if (alertCont) {
    if (!alertas.length) alertCont.innerHTML = '';
    else {
      const filas = alertas.map(a => `<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--gris-700);flex-wrap:wrap">
        <span class="badge ${a.tipo === 'DNI' ? 'badge-info' : 'badge-secondary'}" style="font-size:10px;min-width:58px;text-align:center">${a.tipo}</span>
        <span style="flex:1;min-width:160px;font-weight:600;color:var(--gris-100)">${escapeHtml(a.nombre)}</span>
        ${_persVencBadge(a.fecha, a.dias)}
        <button class="btn btn-outline btn-sm" onclick="editarPersonal(${a.id})" title="Editar"><i class="fas fa-pen"></i></button>
      </div>`).join('');
      alertCont.innerHTML = `<div class="card" style="border-left:4px solid var(--naranja)"><div class="card-body" style="padding:10px 16px">
        <div style="font-weight:700;color:var(--gris-100);margin-bottom:4px"><i class="fas fa-bell" style="color:var(--naranja)"></i> DNI / Licencias por vencer o vencidos <span class="badge badge-warning">${alertas.length}</span></div>${filas}</div></div>`;
    }
  }

  // ── Galería de documentos ──
  const q = (document.getElementById('personalDocsBuscar')?.value || '').trim().toLowerCase();
  const filtro = document.getElementById('personalDocsFiltro')?.value || 'todos';
  const alertaIds = new Set(alertas.map(a => a.id));
  let lista = activos.filter(p => {
    if (q && !((p.nombre || '').toLowerCase().includes(q) || String(p.dni || '').includes(q))) return false;
    if (filtro === 'conductor' && p.cargo !== 'conductor') return false;
    if (filtro === 'alertas' && !alertaIds.has(p.id)) return false;
    return true;
  });
  lista.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

  if (!lista.length) { wrap.innerHTML = '<p class="muted" style="text-align:center;padding:28px">Sin resultados.</p>'; return; }

  wrap.innerHTML = lista.map(p => {
    const esConductor = p.cargo === 'conductor';
    const dniBlock = `<div style="flex:1;min-width:300px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gris-400);letter-spacing:.05em;margin-bottom:6px"><i class="fas fa-id-card" style="color:var(--primary)"></i> DNI ${p.dni ? '· ' + escapeHtml(p.dni) : ''} &nbsp; ${_persVencBadge(p.dni_vencimiento, p.dias_vencer_dni)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${_persDocThumb(p.doc_dni, 'Anverso')}${_persDocThumb(p.doc_dni_reverso, 'Reverso')}</div>
    </div>`;
    const licBlock = esConductor ? `<div style="flex:1;min-width:300px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gris-400);letter-spacing:.05em;margin-bottom:6px"><i class="fas fa-id-badge" style="color:var(--primary)"></i> Licencia ${p.num_licencia ? '· ' + escapeHtml(p.num_licencia) : ''} ${p.categoria_licencia ? '<span class="badge badge-secondary" style="font-size:10px">' + escapeHtml(p.categoria_licencia) + '</span>' : ''} &nbsp; ${_persVencBadge(p.vencimiento_brevete, p.dias_vencer_brevete)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">${_persDocThumb(p.doc_licencia, 'Anverso')}${_persDocThumb(p.doc_licencia_reverso, 'Reverso')}</div>
    </div>` : '';
    return `<div class="card" style="margin-bottom:12px"><div class="card-body" style="padding:14px 18px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:10px;flex-wrap:wrap">
        <div><strong style="color:var(--gris-100);font-size:15px">${escapeHtml(p.nombre)}</strong>
          <span class="badge badge-info" style="font-size:10px;margin-left:6px">${escapeHtml(p.cargo || '')}</span>
          ${p.empresa_nombre ? '<span class="muted" style="font-size:11px;margin-left:6px">' + escapeHtml(p.empresa_nombre) + '</span>' : ''}</div>
        <button class="btn btn-outline btn-sm" onclick="editarPersonal(${p.id})"><i class="fas fa-pen"></i> Editar</button>
      </div>
      <div style="display:flex;gap:22px;flex-wrap:wrap">${dniBlock}${licBlock}</div>
    </div></div>`;
  }).join('');
}

// Carga TODOS los activos.
async function cargarResumenPersonal(cb) {
  const empG = (typeof getEmpresaGlobal === 'function') ? getEmpresaGlobal() : '';
  const params = new URLSearchParams({ action: 'list', activo: '1', limit: '500' });
  if (empG) params.set('empresa_id', empG);
  try {
    const r = await fetch('api/personal.php?' + params);
    const d = await r.json();
    _resumenData = (d && d.success && d.data && d.data.personal) ? d.data.personal : [];
  } catch (e) { _resumenData = []; }
  if (cb) cb();
}

// ── Matriz de cumplimiento ──
function renderCumplimiento() {
  const wrap = document.getElementById('cumpTablaWrap');
  if (!wrap) return;
  const q      = (document.getElementById('cumpBuscar')?.value || '').trim().toLowerCase();
  const cargo  = document.getElementById('cumpCargo')?.value || '';
  const estado = document.getElementById('cumpEstado')?.value || '';

  let filas = _resumenData.map(p => ({ p, ev: _cumpEval(p) }));
  if (cargo) filas = filas.filter(f => f.p.cargo === cargo);
  if (q)     filas = filas.filter(f => (f.p.nombre || '').toLowerCase().includes(q) || String(f.p.dni || '').includes(q));
  if (estado === 'completo')   filas = filas.filter(f => f.ev.pct === 100);
  if (estado === 'incompleto') filas = filas.filter(f => f.ev.pct < 100);

  const total = filas.length;
  const prom = total ? Math.round(filas.reduce((a, f) => a + f.ev.pct, 0) / total) : 0;
  const completos = filas.filter(f => f.ev.pct === 100).length;
  const kpis = document.getElementById('cumpKpis');
  if (kpis) kpis.innerHTML =
    '<div class="kpi-card azul"><div class="kpi-label">Trabajadores</div><div class="kpi-value azul">' + total + '</div><div class="kpi-sub">en el resumen</div><i class="fas fa-users kpi-icon"></i></div>' +
    '<div class="kpi-card ' + (prom >= 80 ? 'verde' : 'amarillo') + '"><div class="kpi-label">Cumplimiento promedio</div><div class="kpi-value ' + (prom >= 80 ? 'verde' : 'amarillo') + '">' + prom + '%</div><div class="kpi-sub">campos aplicables</div><i class="fas fa-chart-pie kpi-icon"></i></div>' +
    '<div class="kpi-card verde"><div class="kpi-label">Completos</div><div class="kpi-value verde">' + completos + '</div><div class="kpi-sub">al 100%</div><i class="fas fa-circle-check kpi-icon"></i></div>' +
    '<div class="kpi-card rojo"><div class="kpi-label">Incompletos</div><div class="kpi-value rojo">' + (total - completos) + '</div><div class="kpi-sub">con faltantes</div><i class="fas fa-triangle-exclamation kpi-icon"></i></div>';

  if (!filas.length) { wrap.innerHTML = '<p class="muted" style="text-align:center;padding:28px">Sin resultados.</p>'; return; }

  // Paginación (15 por página).
  const totalPags = Math.max(1, Math.ceil(filas.length / RESUMEN_PAGE_SIZE));
  if (_cumpPag > totalPags) _cumpPag = totalPags;
  if (_cumpPag < 1) _cumpPag = 1;
  const pageRows = filas.slice((_cumpPag - 1) * RESUMEN_PAGE_SIZE, _cumpPag * RESUMEN_PAGE_SIZE);

  // Celda: si es archivo presente, el ✓ enlaza al visor; si no, ícono simple.
  const celda = (estado, campo, p) => {
    if (estado === 'ok' && campo.file && p[campo.k]) {
      const url = (typeof UPLOAD_URL !== 'undefined' ? UPLOAD_URL : 'uploads/') + p[campo.k];
      return '<a href="#" title="Ver ' + campo.label + '" onclick="verDocumento(\'' + encodeURI(url) + '\');return false;" ' +
             'style="color:var(--verde)"><i class="fas fa-check"></i></a>';
    }
    if (estado === 'ok')    return '<i class="fas fa-check" style="color:var(--verde)"></i>';
    if (estado === 'falta') return '<i class="fas fa-xmark" style="color:var(--rojo)"></i>';
    return '<span style="color:var(--gris-500)">—</span>';
  };
  // Cabecera: la primera columna es esquina (fija arriba + izquierda → z-index alto).
  const head = '<th style="position:sticky;left:0;top:0;background:var(--gris-800);z-index:6">Trabajador</th>' +
    CUMP_CAMPOS.map(c => '<th style="text-align:center;font-size:9.5px;white-space:nowrap">' + c.label + '</th>').join('') +
    '<th style="text-align:right">%</th>';
  const body = pageRows.map(o => {
    const p = o.p, ev = o.ev;
    const col = ev.pct === 100 ? 'var(--verde)' : ev.pct >= 60 ? 'var(--naranja)' : 'var(--rojo)';
    return '<tr>' +
      '<td style="position:sticky;left:0;background:var(--gris-800);z-index:1">' +
        '<div style="font-weight:600;color:var(--gris-100)">' + escapeHtml(p.nombre) + '</div>' +
        '<div class="muted" style="font-size:11px">' + escapeHtml(p.dni) + ' · ' + escapeHtml(p.cargo) + '</div>' +
      '</td>' +
      ev.celdas.map((c, i) => '<td style="text-align:center">' + celda(c.estado, CUMP_CAMPOS[i], p) + '</td>').join('') +
      '<td style="text-align:right;font-weight:700;color:' + col + ';font-variant-numeric:tabular-nums">' + ev.pct + '%</td>' +
    '</tr>';
  }).join('');
  wrap.innerHTML = '<div class="tbl-scroll"><table class="data-table" style="min-width:920px"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>' +
    _pagBar(filas.length, _cumpPag, RESUMEN_PAGE_SIZE, 'irCumpPagina');
}

function exportarCumplimiento() {
  if (typeof XLSX === 'undefined') { toast('Módulo Excel no disponible', 'error'); return; }
  if (!_resumenData.length) { toast('Nada que exportar', 'warning'); return; }
  const head = ['Trabajador', 'DNI', 'Cargo'].concat(CUMP_CAMPOS.map(c => c.label)).concat(['% Cumplimiento']);
  const rows = _resumenData.map(p => {
    const ev = _cumpEval(p);
    return [p.nombre, p.dni, p.cargo].concat(ev.celdas.map(c => c.estado === 'ok' ? 'Sí' : c.estado === 'falta' ? 'No' : 'N/A')).concat([ev.pct + '%']);
  });
  const ws = XLSX.utils.aoa_to_sheet([head].concat(rows));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Cumplimiento');
  XLSX.writeFile(wb, 'cumplimiento_personal_' + new Date().toISOString().slice(0, 10) + '.xlsx');
}

// ── Cumpleaños ──
function _proxCumple(fechaNac) {
  if (!fechaNac) return null;
  const partes = String(fechaNac).split('-'); if (partes.length < 3) return null;
  const anio = +partes[0], mes = +partes[1], dia = +partes[2];
  if (!mes || !dia) return null;
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  let prox = new Date(hoy.getFullYear(), mes - 1, dia);
  if (prox < hoy) prox = new Date(hoy.getFullYear() + 1, mes - 1, dia);
  const dias = Math.round((prox - hoy) / 86400000);
  return { dias: dias, edad: prox.getFullYear() - anio, dia: dia, mes: mes };
}

// ── Cumpleaños: MURAL del mes (publicable como imagen/PDF con saludo) ──
const CUMPLE_MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const _UPcumple = () => (typeof UPLOAD_URL !== 'undefined' ? UPLOAD_URL : 'uploads/');

function _cumpleInitSelects() {
  const mSel = document.getElementById('cumpleMes');
  const aSel = document.getElementById('cumpleAnio');
  if (!mSel || mSel.options.length) return;
  const now = new Date();
  mSel.innerHTML = CUMPLE_MESES.map((m, i) => `<option value="${i + 1}">${m}</option>`).join('');
  mSel.value = String(now.getMonth() + 1);
  const y = now.getFullYear();
  aSel.innerHTML = [y - 1, y, y + 1].map(a => `<option value="${a}">${a}</option>`).join('');
  aSel.value = String(y);
}

// Llamado por la pestaña (tras cargar datos): inicializa, carga saludo y pinta la TABLA.
async function renderCumpleanos() {
  _cumpleInitSelects();
  await cargarSaludoCumple();
  renderTablaCumple();
}
async function cumpleCambioMes() {
  await cargarSaludoCumple();
  renderTablaCumple();
  if (document.getElementById('modalCumpleMural')?.classList.contains('open')) renderMuralCumple();
}

// Abre el mural (poster) en un modal, listo para ver/descargar.
function abrirMuralCumple() {
  abrirModal('modalCumpleMural');
  renderMuralCumple();
}

// Tabla de cumpleaños del mes (vista principal del sub-módulo) + KPIs.
// Banner "Cumpleaños de HOY" (independiente del mes elegido) con envío por WhatsApp.
function _renderCumpleHoyBanner() {
  const cont = document.getElementById('cumpleHoyBanner');
  if (!cont) return;
  const hoy = new Date();
  const hoyList = (_resumenData || []).filter(p => {
    const pr = String(p.fecha_nacimiento || '').split('-');
    return pr.length === 3 && +pr[1] === (hoy.getMonth() + 1) && +pr[2] === hoy.getDate();
  });
  if (!hoyList.length) { cont.innerHTML = ''; return; }
  const filas = hoyList.map(p => {
    const enviado = _cumpleEnviados.has(+p.id);
    const num = _waNumero(p.telefono);
    const foto = p.foto
      ? '<img src="' + _UPcumple() + p.foto + '" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:1px solid var(--gris-600)">'
      : '<span style="width:38px;height:38px;border-radius:50%;background:var(--gris-700);display:inline-flex;align-items:center;justify-content:center;font-size:16px">🎂</span>';
    const btn = enviado
      ? '<span class="badge badge-success"><i class="fas fa-check"></i> Enviado</span>'
      : '<button class="btn btn-success btn-sm" onclick="enviarWhatsappCumple(' + p.id + ')"><i class="fab fa-whatsapp"></i> Enviar saludo</button>';
    return '<div style="display:flex;align-items:center;gap:12px;background:var(--gris-800);border:1px solid var(--gris-700);border-radius:10px;padding:10px 14px">' +
      foto +
      '<div style="flex:1;min-width:140px"><div style="font-weight:700;color:var(--gris-100)">' + escapeHtml(p.nombre || '') + '</div>' +
      '<div class="muted" style="font-size:11px">' + escapeHtml(p.cargo || '') + (num ? ' · 📱 ' + escapeHtml(p.telefono || '') : ' · <span style="color:var(--rojo)">sin celular</span>') + '</div></div>' +
      '<button class="btn btn-outline btn-sm" onclick="descargarTarjetaCumple(' + p.id + ')" title="Descargar tarjeta"><i class="fas fa-download"></i></button> ' + btn +
    '</div>';
  }).join('');
  cont.innerHTML =
    '<div class="card" style="margin-bottom:16px;border-left:4px solid var(--primary)"><div class="card-body" style="padding:14px 18px">' +
      '<div style="font-weight:800;color:var(--gris-100);margin-bottom:10px"><i class="fas fa-cake-candles" style="color:var(--primary)"></i> ¡Hoy cumple ' + hoyList.length + ' persona(s)! Envíales el saludo:</div>' +
      '<div style="display:flex;flex-direction:column;gap:8px">' + filas + '</div>' +
    '</div></div>';
}

// Abre WhatsApp al número del trabajador con el saludo y descarga su tarjeta para adjuntar.
async function enviarWhatsappCumple(pid) {
  const p = (_resumenData || []).find(z => +z.id === +pid);
  if (!p) return;
  const num = _waNumero(p.telefono);
  const saludo = (document.getElementById('cumpleSaludo')?.value || '').trim();
  const texto = '🎉 ¡Feliz cumpleaños ' + (p.nombre || '') + '! ' + saludo;
  toast('Generando tarjeta…', 'info');
  const res = await _tarjetaCumpleCanvas(pid);
  if (res) { const a = document.createElement('a'); a.href = res.canvas.toDataURL('image/png'); a.download = 'cumple_' + (p.dni || p.id) + '.png'; document.body.appendChild(a); a.click(); a.remove(); }
  // Abre el chat de WhatsApp con esa persona (o selector si no hay número).
  window.open('https://wa.me/' + num + '?text=' + encodeURIComponent(texto), '_blank');
  // Marca como enviado (para el estado del banner).
  try {
    const fd = new FormData(); fd.append('action', 'marcar_enviado'); fd.append('csrf_token', CSRF_TOKEN); fd.append('personal_id', pid);
    const r = await fetch('api/cumple_saludo.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (d.success) { _cumpleEnviados.add(+pid); _renderCumpleHoyBanner(); renderTablaCumple(); }
  } catch (e) {}
  toast('Se abrió WhatsApp. Adjunta la tarjeta descargada y envía.', 'info', 8000);
}

function renderTablaCumple() {
  const body = document.getElementById('cumpleBody');
  if (!body) return;
  _renderCumpleHoyBanner();
  const mes  = parseInt(document.getElementById('cumpleMes')?.value, 10)  || (new Date().getMonth() + 1);
  const anio = parseInt(document.getElementById('cumpleAnio')?.value, 10) || new Date().getFullYear();
  const q = (document.getElementById('cumpleBuscar')?.value || '').trim().toLowerCase();
  const hoy = new Date();
  const esHoy = x => x.dia === hoy.getDate() && mes === (hoy.getMonth() + 1) && anio === hoy.getFullYear();
  let items = _cumpleDelMes(mes);
  if (q) items = items.filter(x => (x.p.nombre || '').toLowerCase().includes(q));

  const kpis = document.getElementById('cumpleKpis');
  if (kpis) kpis.innerHTML =
    '<div class="kpi-card azul"><div class="kpi-label">Cumpleañeros de ' + CUMPLE_MESES[mes - 1] + '</div><div class="kpi-value azul">' + items.length + '</div><div class="kpi-sub">🎂</div><i class="fas fa-cake-candles kpi-icon"></i></div>' +
    '<div class="kpi-card verde"><div class="kpi-label">Cumpleaños hoy</div><div class="kpi-value verde">' + items.filter(esHoy).length + '</div><div class="kpi-sub">en el día</div><i class="fas fa-gift kpi-icon"></i></div>';

  if (!items.length) {
    body.innerHTML = '<tr><td colspan="7" class="muted" style="text-align:center;padding:24px">Sin cumpleaños en ' + CUMPLE_MESES[mes - 1] + '. (¿Falta la fecha de nacimiento?)</td></tr>';
    return;
  }
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  body.innerHTML = items.map((x, i) => {
    const p = x.p, hc = esHoy(x);
    const foto = p.foto
      ? '<img src="' + _UPcumple() + p.foto + '" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid var(--gris-600)">'
      : '<span style="width:34px;height:34px;border-radius:50%;background:var(--gris-700);display:inline-flex;align-items:center;justify-content:center;font-size:15px">🎂</span>';
    // Días que faltan (relativo a hoy) para la fecha del mes/año seleccionados.
    const dias = Math.round((new Date(anio, mes - 1, x.dia) - t0) / 86400000);
    const faltan = dias === 0 ? '<span class="badge badge-warning">HOY</span>'
                 : dias > 0 ? '<span style="font-weight:700;color:var(--verde)">En ' + dias + ' d</span>'
                 : '<span class="muted">Pasó</span>';
    const est = hc ? '<span class="badge badge-warning">🎂 HOY</span>' : '<span class="muted">Programado</span>';
    return '<tr' + (hc ? ' style="background:rgba(243,156,18,.08)"' : '') + '>' +
      '<td class="muted" style="text-align:center">' + (i + 1) + '</td>' +
      '<td><div style="display:flex;align-items:center;gap:10px">' + foto + '<span style="font-weight:600;color:var(--gris-100)">' + escapeHtml(p.nombre || '') + '</span></div></td>' +
      '<td class="muted">' + escapeHtml(p.cargo || '—') + '</td>' +
      '<td class="muted">' + String(x.dia).padStart(2, '0') + ' de ' + CUMPLE_MESES[mes - 1] + '</td>' +
      '<td style="text-align:center;font-variant-numeric:tabular-nums">' + faltan + '</td>' +
      '<td style="text-align:center">' + est + '</td>' +
      '<td style="text-align:center;white-space:nowrap">' +
        '<button class="btn btn-outline btn-sm" onclick="descargarTarjetaCumple(' + p.id + ')" title="Descargar tarjeta"><i class="fas fa-download"></i></button> ' +
        '<button class="btn btn-outline btn-sm" onclick="enviarWhatsappCumple(' + p.id + ')" title="Enviar saludo a su WhatsApp"><i class="fab fa-whatsapp" style="color:#25D366"></i></button>' +
      '</td>' +
    '</tr>';
  }).join('');
}

// Comparte una imagen (canvas) por WhatsApp/apps con el compartir nativo; si no está
// disponible (escritorio), descarga la imagen y abre WhatsApp con el texto.
async function _compartirCanvas(canvas, filename, texto) {
  const blob = await new Promise(res => { try { canvas.toBlob(res, 'image/png'); } catch (e) { res(null); } });
  if (!blob) { toast('No se pudo generar la imagen', 'error'); return; }
  const esMovil = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const file = new File([blob], filename, { type: 'image/png' });

  // En MÓVIL: compartir nativo con la imagen adjunta (elige WhatsApp/estado).
  if (esMovil && navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
    try { await navigator.share({ files: [file], text: texto || '' }); toast('Compartido', 'success'); return; }
    catch (e) { if (e && e.name === 'AbortError') return; }   // usuario canceló
    // si falla, continúa al respaldo
  }

  // RESPALDO (PC o sin compartir nativo): descargar la imagen y abrir WhatsApp con el texto.
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  } catch (e) {}
  window.open('https://wa.me/?text=' + encodeURIComponent(texto || ''), '_blank');
  toast('Imagen descargada. Adjúntala en el chat de WhatsApp que se abrió.', 'info', 8000);
}

// Genera el canvas de la tarjeta individual de cumpleaños. Devuelve {canvas, p} o null.
async function _tarjetaCumpleCanvas(pid) {
  const p = (_resumenData || []).find(z => +z.id === +pid);
  if (!p) return null;
  if (typeof html2canvas === 'undefined') { toast('No se pudo cargar el generador de imagen', 'error'); return null; }
  const partes = String(p.fecha_nacimiento || '').split('-');
  const dia = +partes[2], mes = +partes[1];
  const GOLD = '#E0A82E';
  const saludo = (document.getElementById('cumpleSaludo')?.value || '').trim();
  const foto = p.foto
    ? '<img src="' + _UPcumple() + p.foto + '" style="width:164px;height:164px;border-radius:50%;object-fit:cover;border:4px solid ' + GOLD + ';box-shadow:0 0 0 7px rgba(224,168,46,.14),0 0 42px rgba(224,168,46,.35)">'
    : '<div style="width:164px;height:164px;border-radius:50%;background:#2a2010;display:flex;align-items:center;justify-content:center;font-size:68px;border:4px solid ' + GOLD + ';box-shadow:0 0 42px rgba(224,168,46,.35)">🎂</div>';
  const fondo = _cumpleFondo
    ? 'linear-gradient(rgba(16,11,4,.82),rgba(8,5,2,.92)), url(' + _UPcumple() + _cumpleFondo + ') center/cover'
    : 'radial-gradient(circle at 30% 12%, rgba(224,168,46,.24), transparent 34%),radial-gradient(circle at 80% 88%, rgba(224,168,46,.16), transparent 32%),linear-gradient(135deg,#1c1408,#0f0a05)';
  const cont = document.createElement('div');
  cont.style.cssText = 'position:fixed;left:-9999px;top:0';
  cont.innerHTML =
    '<div style="width:600px;height:600px;box-sizing:border-box;background:' + fondo + ';border-radius:22px;font-family:Arial,sans-serif;position:relative;overflow:hidden">' +
      // Marco dorado interior + esquinas decorativas
      '<div style="position:absolute;top:15px;left:15px;right:15px;bottom:15px;border:1.5px solid rgba(224,168,46,.55);border-radius:16px;pointer-events:none"></div>' +
      '<div style="position:absolute;top:22px;left:26px;font-size:20px;opacity:.7">🎉</div>' +
      '<div style="position:absolute;top:22px;right:26px;font-size:20px;opacity:.7">🎈</div>' +
      '<div style="position:relative;z-index:1;height:100%;box-sizing:border-box;padding:40px 46px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#f5ede0">' +
        (_cumpleLogo ? '<img src="' + _UPcumple() + _cumpleLogo + '" style="height:76px;max-width:240px;object-fit:contain;margin-bottom:14px">' : '') +
        '<div style="font-size:14px;letter-spacing:.34em;color:' + GOLD + ';font-weight:700;text-shadow:0 1px 6px rgba(0,0,0,.5)">&#10022;&nbsp; ¡FELIZ CUMPLEAÑOS! &nbsp;&#10022;</div>' +
        '<div style="margin:20px 0 18px">' + foto + '</div>' +
        '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:32px;font-weight:800;color:#fff;line-height:1.12;letter-spacing:.01em;text-shadow:0 2px 10px rgba(0,0,0,.5)">' + escapeHtml((p.nombre || '').toUpperCase()) + '</div>' +
        '<div style="font-size:13px;color:' + GOLD + ';margin-top:8px;text-transform:uppercase;letter-spacing:.14em;font-weight:600">' + escapeHtml(p.cargo || '') + '</div>' +
        (dia && mes ? '<div style="margin-top:20px;display:inline-block;background:linear-gradient(135deg,#f6cd6b,' + GOLD + ');color:#1c1408;font-weight:800;font-size:17px;padding:10px 26px;border-radius:999px;box-shadow:0 4px 14px rgba(224,168,46,.4)">🎂&nbsp; ' + String(dia).padStart(2, '0') + ' de ' + CUMPLE_MESES[mes - 1] + '</div>' : '') +
        (saludo ? '<div style="width:120px;height:2px;background:linear-gradient(90deg,transparent,' + GOLD + ',transparent);margin:22px auto 0"></div>' +
                  '<div style="font-size:15px;font-style:italic;color:#e9ddc6;margin-top:14px;line-height:1.55;max-width:430px">“' + escapeHtml(saludo) + '”</div>' : '') +
      '</div>' +
    '</div>';
  document.body.appendChild(cont);
  try {
    const canvas = await html2canvas(cont.firstChild, { scale: 2, useCORS: true, backgroundColor: '#0d3c78' });
    return { canvas, p };
  } catch (e) { toast('No se pudo generar la tarjeta', 'error'); return null; }
  finally { document.body.removeChild(cont); }
}

// Descargar la tarjeta individual (PNG).
async function descargarTarjetaCumple(pid) {
  toast('Generando tarjeta…', 'info');
  const res = await _tarjetaCumpleCanvas(pid);
  if (!res) return;
  const a = document.createElement('a');
  a.href = res.canvas.toDataURL('image/png');
  a.download = 'cumple_' + (res.p.dni || res.p.id) + '.png';
  a.click();
  toast('Tarjeta generada', 'success');
}

// Compartir la tarjeta individual por WhatsApp (imagen + saludo).
async function compartirTarjetaCumple(pid) {
  toast('Preparando para compartir…', 'info');
  const res = await _tarjetaCumpleCanvas(pid);
  if (!res) return;
  const saludo = (document.getElementById('cumpleSaludo')?.value || '').trim();
  const texto = '🎉 ¡Feliz cumpleaños ' + (res.p.nombre || '') + '! ' + saludo;
  await _compartirCanvas(res.canvas, 'cumple_' + (res.p.dni || res.p.id) + '.png', texto);
}

// Trabajadores cuyo cumpleaños cae en el mes indicado.
function _cumpleDelMes(mes) {
  return (_resumenData || []).map(p => {
    const partes = String(p.fecha_nacimiento || '').split('-');
    if (partes.length < 3) return null;
    const bMes = +partes[1], bDia = +partes[2], bAnio = +partes[0];
    if (bMes !== mes || !bDia) return null;
    return { p, dia: bDia, anioNac: bAnio };
  }).filter(Boolean).sort((a, b) => a.dia - b.dia);
}

function renderMuralCumple() {
  const wrap = document.getElementById('cumpleMuralWrap');
  if (!wrap) return;
  const mes  = parseInt(document.getElementById('cumpleMes')?.value, 10)  || (new Date().getMonth() + 1);
  const anio = parseInt(document.getElementById('cumpleAnio')?.value, 10) || new Date().getFullYear();
  const saludo = (document.getElementById('cumpleSaludo')?.value || '').trim();
  const hoy = new Date();
  const items = _cumpleDelMes(mes);
  const esHoy = x => x.dia === hoy.getDate() && mes === (hoy.getMonth() + 1) && anio === hoy.getFullYear();

  const kpis = document.getElementById('cumpleKpis');
  if (kpis) kpis.innerHTML =
    '<div class="kpi-card azul"><div class="kpi-label">Cumpleañeros de ' + CUMPLE_MESES[mes - 1] + '</div><div class="kpi-value azul">' + items.length + '</div><div class="kpi-sub">🎂</div><i class="fas fa-cake-candles kpi-icon"></i></div>' +
    '<div class="kpi-card verde"><div class="kpi-label">Cumpleaños hoy</div><div class="kpi-value verde">' + items.filter(esHoy).length + '</div><div class="kpi-sub">en el día</div><i class="fas fa-gift kpi-icon"></i></div>';

  if (!items.length) {
    wrap.innerHTML = '<div class="card"><div class="card-body"><p class="muted" style="text-align:center;padding:30px">No hay cumpleaños registrados en ' + CUMPLE_MESES[mes - 1] + '. (¿Falta la fecha de nacimiento en las fichas?)</p></div></div>';
    return;
  }

  const GOLD = '#E0A82E';
  const cards = items.map(x => {
    const p = x.p, edad = anio - x.anioNac, hc = esHoy(x);
    const foto = p.foto
      ? '<img src="' + _UPcumple() + p.foto + '" style="width:92px;height:92px;border-radius:50%;object-fit:cover;border:3px solid ' + GOLD + ';box-shadow:0 0 0 4px rgba(224,168,46,.18),0 6px 16px rgba(0,0,0,.5)">'
      : '<div style="width:92px;height:92px;border-radius:50%;background:#2a2010;display:flex;align-items:center;justify-content:center;font-size:38px;border:3px solid ' + GOLD + ';box-shadow:0 0 0 4px rgba(224,168,46,.18)">🎂</div>';
    return '<div style="width:190px;background:linear-gradient(160deg,rgba(62,46,22,.92),rgba(28,20,10,.94));border:1px solid rgba(224,168,46,.38);border-radius:16px;padding:20px 14px 18px;text-align:center;box-shadow:0 10px 26px rgba(0,0,0,.45);position:relative">' +
      (hc ? '<div style="position:absolute;top:10px;right:10px;background:' + GOLD + ';color:#1c1408;font-size:10px;font-weight:800;padding:3px 9px;border-radius:999px;letter-spacing:.05em">HOY 🎉</div>' : '') +
      foto +
      '<div style="font-weight:800;font-size:14px;color:#fff;margin-top:12px;line-height:1.2;letter-spacing:.02em">' + escapeHtml((p.nombre || '').toUpperCase()) + '</div>' +
      '<div style="font-size:11px;color:' + GOLD + ';margin-top:3px;opacity:.85;text-transform:uppercase;letter-spacing:.05em">' + escapeHtml(p.cargo || '') + '</div>' +
      '<div style="margin-top:11px;display:inline-block;background:linear-gradient(135deg,#f0c05a,' + GOLD + ');color:#1c1408;font-weight:800;font-size:13px;padding:5px 14px;border-radius:999px;box-shadow:0 3px 8px rgba(224,168,46,.3)">' + String(x.dia).padStart(2, '0') + ' de ' + CUMPLE_MESES[mes - 1] + '</div>' +
    '</div>';
  }).join('');

  // Fondo: imagen subida (con capa oscura para legibilidad) o degradado con bokeh dorado.
  const fondo = _cumpleFondo
    ? 'linear-gradient(rgba(18,12,5,.74),rgba(10,7,3,.86)), url(' + _UPcumple() + _cumpleFondo + ') center/cover no-repeat'
    : 'radial-gradient(circle at 12% 18%, rgba(224,168,46,.20), transparent 26%),' +
      'radial-gradient(circle at 88% 12%, rgba(224,168,46,.16), transparent 22%),' +
      'radial-gradient(circle at 78% 82%, rgba(224,168,46,.12), transparent 26%),' +
      'radial-gradient(circle at 25% 88%, rgba(224,168,46,.10), transparent 24%),' +
      'linear-gradient(135deg,#1c1408 0%,#241a0c 45%,#120d06 100%)';

  wrap.innerHTML =
    '<div id="cumpleMural" style="background:' + fondo + ';border:1px solid rgba(224,168,46,.35);border-radius:18px;padding:36px 30px;color:#f5ede0;box-shadow:inset 0 0 120px rgba(0,0,0,.55)">' +
      (_cumpleLogo ? '<div style="text-align:center;margin-bottom:12px"><img src="' + _UPcumple() + _cumpleLogo + '" style="height:78px;max-width:260px;object-fit:contain"></div>' : '') +
      '<div style="text-align:center;margin-bottom:6px">' +
        '<div style="font-size:12px;letter-spacing:.35em;color:' + GOLD + ';font-weight:700">&#10022;&nbsp; CUMPLEAÑOS DEL MES &nbsp;&#10022;</div>' +
        '<div style="font-family:Georgia,\'Times New Roman\',serif;font-size:40px;font-weight:800;color:#fff;letter-spacing:.02em;margin-top:6px;text-shadow:0 2px 12px rgba(0,0,0,.5)">' + CUMPLE_MESES[mes - 1].toUpperCase() + ' <span style="color:' + GOLD + '">' + anio + '</span></div>' +
        '<div style="width:90px;height:3px;background:linear-gradient(90deg,transparent,' + GOLD + ',transparent);margin:12px auto 0"></div>' +
      '</div>' +
      (saludo ? '<div style="text-align:center;font-size:15px;font-style:italic;color:#e8dcc6;max-width:680px;margin:16px auto 24px;line-height:1.5">“' + escapeHtml(saludo) + '”</div>' : '<div style="height:18px"></div>') +
      '<div style="display:flex;flex-wrap:wrap;gap:18px;justify-content:center">' + cards + '</div>' +
      '<div style="text-align:center;font-size:11px;color:#a9987a;margin-top:26px;letter-spacing:.06em">Generado el ' + new Date().toLocaleDateString('es-PE') + '</div>' +
    '</div>';
}

// ── Saludo del mes (persistente por mes/año) ──
let _cumpleFondo = null;   // ruta de la imagen de fondo del mural (uploads/...)
let _cumpleLogo = null;    // ruta del logo de la empresa (uploads/...)
let _cumpleEnviados = new Set();   // personal_id con saludo enviado HOY

// Normaliza un teléfono a formato internacional para wa.me (Perú +51).
function _waNumero(tel) {
  let d = String(tel || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.length === 9 && d[0] === '9') d = '51' + d;   // celular peruano
  return d;
}
async function cargarSaludoCumple() {
  const mes = document.getElementById('cumpleMes')?.value, anio = document.getElementById('cumpleAnio')?.value;
  const inp = document.getElementById('cumpleSaludo');
  if (!inp || !mes || !anio) return;
  try {
    const r = await fetch('api/cumple_saludo.php?anio=' + anio + '&mes=' + mes);
    const d = await r.json();
    inp.value = (d && d.success && d.data.mensaje) ? d.data.mensaje : '';
    _cumpleFondo = (d && d.success) ? (d.data.fondo || null) : null;
    _cumpleLogo  = (d && d.success) ? (d.data.logo || null) : null;
    _cumpleEnviados = new Set((d && d.success ? (d.data.enviados || []) : []).map(Number));
  } catch (e) { inp.value = ''; }
  const qb = document.getElementById('cumpleQuitarFondoBtn'); if (qb) qb.style.display = _cumpleFondo ? '' : 'none';
  const ql = document.getElementById('cumpleQuitarLogoBtn'); if (ql) ql.style.display = _cumpleLogo ? '' : 'none';
}

// Subir/quitar el logo (mismo mecanismo base64 que el fondo).
async function subirLogoCumple(input) {
  let f = input && input.files && input.files[0];
  if (!f) return;
  if (typeof _comprimirImagenPersonal === 'function') f = await _comprimirImagenPersonal(f, 600, 0.9);
  let b64 = '';
  try { b64 = await _fileToDataURL(f); } catch (e) { toast('No se pudo leer la imagen', 'error'); return; }
  const fd = new FormData();
  fd.append('action', 'logo_set'); fd.append('csrf_token', CSRF_TOKEN); fd.append('imagen_b64', b64);
  toast('Subiendo logo…', 'info');
  try {
    const r = await fetch('api/cumple_saludo.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (!d.success) { toast(d.message || 'No se pudo subir', 'error'); return; }
    _cumpleLogo = d.data.logo;
    const ql = document.getElementById('cumpleQuitarLogoBtn'); if (ql) ql.style.display = '';
    input.value = '';
    toast('Logo actualizado', 'success');
    renderMuralCumple();
  } catch (e) { toast('Error de conexión', 'error'); }
}
async function quitarLogoCumple() {
  if (!confirm('¿Quitar el logo?')) return;
  const fd = new FormData(); fd.append('action', 'logo_del'); fd.append('csrf_token', CSRF_TOKEN);
  try {
    const r = await fetch('api/cumple_saludo.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (!d.success) { toast(d.message || 'Error', 'error'); return; }
    _cumpleLogo = null;
    const ql = document.getElementById('cumpleQuitarLogoBtn'); if (ql) ql.style.display = 'none';
    toast('Logo quitado', 'success');
    renderMuralCumple();
  } catch (e) { toast('Error de conexión', 'error'); }
}

// Subir/quitar la imagen de fondo del mural.
async function subirFondoCumple(input) {
  let f = input && input.files && input.files[0];
  if (!f) return;
  if (typeof _comprimirImagenPersonal === 'function') f = await _comprimirImagenPersonal(f, 1920, 0.85);
  let b64 = '';
  try { b64 = await _fileToDataURL(f); } catch (e) { toast('No se pudo leer la imagen', 'error'); return; }
  const fd = new FormData();
  fd.append('action', 'fondo_set'); fd.append('csrf_token', CSRF_TOKEN); fd.append('imagen_b64', b64);
  toast('Subiendo fondo…', 'info');
  try {
    const r = await fetch('api/cumple_saludo.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (!d.success) { toast(d.message || 'No se pudo subir', 'error'); return; }
    _cumpleFondo = d.data.fondo;
    const qb = document.getElementById('cumpleQuitarFondoBtn'); if (qb) qb.style.display = '';
    input.value = '';
    toast('Fondo actualizado', 'success');
    renderMuralCumple();
  } catch (e) { toast('Error de conexión', 'error'); }
}
async function quitarFondoCumple() {
  if (!confirm('¿Quitar la imagen de fondo del mural?')) return;
  const fd = new FormData(); fd.append('action', 'fondo_del'); fd.append('csrf_token', CSRF_TOKEN);
  try {
    const r = await fetch('api/cumple_saludo.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (!d.success) { toast(d.message || 'Error', 'error'); return; }
    _cumpleFondo = null;
    const qb = document.getElementById('cumpleQuitarFondoBtn'); if (qb) qb.style.display = 'none';
    toast('Fondo quitado', 'success');
    renderMuralCumple();
  } catch (e) { toast('Error de conexión', 'error'); }
}
async function guardarSaludoCumple() {
  const mes = document.getElementById('cumpleMes').value, anio = document.getElementById('cumpleAnio').value;
  const fd = new FormData();
  fd.append('action', 'save'); fd.append('csrf_token', CSRF_TOKEN);
  fd.append('anio', anio); fd.append('mes', mes);
  fd.append('mensaje', document.getElementById('cumpleSaludo').value.trim());
  try {
    const r = await fetch('api/cumple_saludo.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (d.success) toast('Saludo guardado', 'success'); else toast(d.message || 'No se pudo guardar', 'error');
  } catch (e) { toast('Error de conexión', 'error'); }
}

// ── Descargar el mural (PNG o PDF) para publicar ──
async function descargarMuralCumple(fmt) {
  const el = document.getElementById('cumpleMural');
  if (!el) { toast('No hay cumpleaños para publicar este mes', 'warning'); return; }
  if (typeof html2canvas === 'undefined') { toast('No se pudo cargar el generador de imagen', 'error'); return; }
  const mes = String(parseInt(document.getElementById('cumpleMes').value, 10)).padStart(2, '0');
  const anio = document.getElementById('cumpleAnio').value;
  toast('Generando mural…', 'info');
  try {
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#0d3c78' });
    if (fmt === 'pdf' && window.jspdf && window.jspdf.jsPDF) {
      const { jsPDF } = window.jspdf;
      const horiz = canvas.width >= canvas.height;
      const pdf = new jsPDF(horiz ? 'l' : 'p', 'mm', 'a4');
      const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pw / canvas.width, ph / canvas.height);
      const w = canvas.width * ratio, h = canvas.height * ratio;
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', (pw - w) / 2, 8, w, h);
      pdf.save('cumpleanos_' + anio + '_' + mes + '.pdf');
    } else {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = 'cumpleanos_' + anio + '_' + mes + '.png';
      a.click();
    }
    toast('Mural generado', 'success');
  } catch (e) { toast('No se pudo generar el mural', 'error'); }
}

// Compartir el mural completo por WhatsApp (imagen + saludo).
async function compartirMuralCumple() {
  const el = document.getElementById('cumpleMural');
  if (!el) { toast('No hay cumpleaños para publicar este mes', 'warning'); return; }
  if (typeof html2canvas === 'undefined') { toast('No se pudo cargar el generador de imagen', 'error'); return; }
  const mes = String(parseInt(document.getElementById('cumpleMes').value, 10)).padStart(2, '0');
  const anio = document.getElementById('cumpleAnio').value;
  toast('Preparando para compartir…', 'info');
  try {
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#0d3c78' });
    const saludo = (document.getElementById('cumpleSaludo')?.value || '').trim();
    await _compartirCanvas(canvas, 'cumpleanos_' + anio + '_' + mes + '.png', '🎂 Cumpleaños del mes' + (saludo ? ' · ' + saludo : ''));
  } catch (e) { toast('No se pudo generar el mural', 'error'); }
}

// ============================================================
// FOTO POR QR/LINK: generar QR y revisar fotos enviadas
// ============================================================
let _qrFotoInstance = null;
let _fotosPend = [];
const _UPfoto = () => (typeof UPLOAD_URL !== 'undefined' ? UPLOAD_URL : 'uploads/');

async function abrirQrFoto() {
  abrirModal('modalQrFoto');
  const box = document.getElementById('qrFotoCanvas'); if (box) box.innerHTML = '';
  document.getElementById('qrFotoLink').value = 'Generando…';
  try {
    const r = await fetch('api/personal.php?action=foto_link');
    const d = await r.json();
    const link = (d && d.success && d.data.link) ? d.data.link : '';
    document.getElementById('qrFotoLink').value = link;
    if (window.QRCode && link && box) { _qrFotoInstance = new QRCode(box, { text: link, width: 200, height: 200, correctLevel: QRCode.CorrectLevel.M }); }
  } catch (e) { if (box) box.innerHTML = '<span class="muted">No se pudo generar</span>'; }
}
function copiarLinkFoto() {
  const i = document.getElementById('qrFotoLink'); if (!i) return;
  i.select(); i.setSelectionRange(0, 99999);
  try { document.execCommand('copy'); toast('Link copiado', 'success'); } catch (e) {}
}
function descargarQrFoto() {
  const c = document.querySelector('#qrFotoCanvas canvas') || document.querySelector('#qrFotoCanvas img');
  if (!c) { toast('QR no generado aún', 'error'); return; }
  const url = c.tagName === 'CANVAS' ? c.toDataURL('image/png') : c.src;
  const a = document.createElement('a'); a.href = url; a.download = 'qr_foto_perfil.png'; a.click();
}

async function abrirFotosPendientes() {
  abrirModal('modalFotosPend');
  const body = document.getElementById('fotosPendBody');
  if (body) body.innerHTML = '<p class="muted" style="text-align:center;padding:24px">Cargando…</p>';
  try {
    const r = await fetch('api/personal.php?action=fotos_pendientes');
    const d = await r.json();
    _fotosPend = (d && d.success) ? (d.data.pendientes || []) : [];
  } catch (e) { _fotosPend = []; }
  renderFotosPendientes();
}
function renderFotosPendientes() {
  const body = document.getElementById('fotosPendBody');
  if (!body) return;
  if (!_fotosPend.length) { body.innerHTML = '<p class="muted" style="text-align:center;padding:24px">No hay fotos pendientes por aprobar.</p>'; return; }
  body.innerHTML = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px">' +
    _fotosPend.map(p =>
      '<div style="border:1px solid var(--gris-700);border-radius:12px;padding:14px;text-align:center;background:var(--gris-800)">' +
        '<img src="' + _UPfoto() + p.foto_pendiente + '" onclick="verDocumento(\'' + _UPfoto() + p.foto_pendiente + '\')" style="width:128px;height:128px;border-radius:50%;object-fit:cover;border:3px solid var(--primary);cursor:pointer">' +
        '<div style="font-weight:700;color:var(--gris-100);margin-top:10px">' + escapeHtml(p.nombre || '') + '</div>' +
        '<div class="muted" style="font-size:11px">DNI ' + escapeHtml(p.dni || '') + '</div>' +
        '<div style="display:flex;gap:8px;justify-content:center;margin-top:12px">' +
          '<button class="btn btn-success btn-sm" onclick="aprobarFotoPersonal(' + p.id + ')"><i class="fas fa-check"></i> Aprobar</button>' +
          '<button class="btn btn-danger btn-sm" onclick="rechazarFotoPersonal(' + p.id + ')" title="Rechazar"><i class="fas fa-times"></i></button>' +
        '</div>' +
      '</div>'
    ).join('') + '</div>';
}
async function _fotoAccionPersonal(action, id, okMsg) {
  const fd = new FormData(); fd.append('action', action); fd.append('csrf_token', CSRF_TOKEN); fd.append('id', id);
  try {
    const r = await fetch('api/personal.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (!d.success) { toast(d.message || 'Error', 'error'); return; }
    toast(okMsg, 'success');
    _fotosPend = _fotosPend.filter(x => +x.id !== +id);
    renderFotosPendientes();
    actualizarBadgeFotoPend();
    if (typeof cargarPersonal === 'function') cargarPersonal();
  } catch (e) { toast('Error de conexión', 'error'); }
}
async function aprobarFotoPersonal(id) { await _fotoAccionPersonal('foto_aprobar', id, 'Foto aprobada'); }
async function rechazarFotoPersonal(id) { if (!confirm('¿Rechazar esta foto?')) return; await _fotoAccionPersonal('foto_rechazar', id, 'Foto rechazada'); }

async function actualizarBadgeFotoPend() {
  const b = document.getElementById('fotoPendBadge'); if (!b) return;
  try {
    const r = await fetch('api/personal.php?action=fotos_pendientes');
    const d = await r.json();
    const n = (d && d.success) ? (d.data.total || 0) : 0;
    b.textContent = n; b.style.display = n ? '' : 'none';
  } catch (e) {}
}
document.addEventListener('DOMContentLoaded', () => { setTimeout(actualizarBadgeFotoPend, 800); });
