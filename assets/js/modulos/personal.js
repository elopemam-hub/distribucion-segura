// ============================================================
// DISTRIBUCIÓN SEGURA — MÓDULO: PERSONAL
// CRUD, KPIs, importar/exportar Excel
// ============================================================

let personalData = [];
let personalPagina = 1;
const PERSONAL_PAGE_SIZE = 15;
// Documentos adjuntos (misma lista que el backend PERSONAL_DOC_COLS).
const PERSONAL_DOCS = ['doc_dni','doc_licencia','doc_certijoven','doc_sctr','doc_verif_ref'];

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
  if (sec) sec.style.display = esConductor ? '' : 'none';
  if (doc) doc.style.display = esConductor ? '' : 'none';
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
  if (!personalData.length) { tb.innerHTML='<tr><td colspan="17" style="text-align:center;padding:32px;color:var(--gris-400)">Sin resultados</td></tr>'; renderPaginacionPersonal(); return; }
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
      <td style="font-size:12px">${escapeHtml(p.empresa||'—')}</td>
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
    const link = document.getElementById('personal_' + campo + '_link');
    const del  = document.getElementById('personal_' + campo + '_del');
    if (link) { link.style.display = 'none'; link.removeAttribute('href'); }
    if (del)  del.style.display = 'none';
    if (_personalActual) { _personalActual[campo] = null; _actualizarBtnExpediente(_personalActual); }
    cargarPersonal();
  } catch { toast('Error de conexión', 'error'); }
}

// Visor de documento en la misma pantalla (imagen o PDF), sin abrir otra página.
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
    ['doc_dni','DNI'], ['doc_licencia','Licencia'], ['doc_certijoven','Certijoven'],
    ['doc_sctr','SCTR'], ['doc_verif_ref','Verificación de referencias']
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
  PERSONAL_DOCS.forEach(c=>{
    const link=document.getElementById('personal_'+c+'_link');
    if (link) { link.style.display='none'; link.removeAttribute('href'); }
    const del=document.getElementById('personal_'+c+'_del');
    if (del) del.style.display='none';
  });
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
  // Enlaces "ver actual" de los documentos ya cargados
  PERSONAL_DOCS.forEach(c=>{
    const link=document.getElementById('personal_'+c+'_link');
    const del=document.getElementById('personal_'+c+'_del');
    const tiene=!!p[c];
    if (link) {
      if (tiene) { link.href=UPLOAD_URL+p[c]; link.style.display='inline'; }
      else { link.style.display='none'; link.removeAttribute('href'); }
    }
    if (del) del.style.display = tiene ? 'inline' : 'none';
  });
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
    const foto=document.getElementById('personal_foto').files[0];
    if (foto) fd.append('foto',foto);
    PERSONAL_DOCS.forEach(c=>{
      const f=document.getElementById('personal_'+c).files[0];
      if (f) fd.append(c,f);
    });
    try {
      const r=await fetch('api/personal.php',{method:'POST',body:fd});
      const data=await r.json();
      if (data.success) { toast(data.message,'success'); cerrarModal('modalPersonal'); cargarPersonal(); }
      else toast(data.message,'error');
    } catch { toast('Error de conexión','error'); }
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
  if (tab === 'cumplimiento') cargarResumenPersonal(() => { _llenarSelectEmpresasResumen(); renderCumplimiento(); });
  if (tab === 'cumpleanos')   cargarResumenPersonal(() => { _llenarSelectEmpresasResumen(); renderCumpleanos(); });
}

// Llena los <select> de empresa de Cumplimiento y Cumpleaños con las empresas
// presentes en el resumen (deriva del propio _resumenData, sin otra llamada).
function _llenarSelectEmpresasResumen() {
  const mapa = new Map();
  _resumenData.forEach(p => { if (p.empresa_id && p.empresa_nombre) mapa.set(String(p.empresa_id), p.empresa_nombre); });
  const opts = '<option value="">Todas</option>' +
    Array.from(mapa.entries()).sort((a, b) => a[1].localeCompare(b[1]))
      .map(([id, nom]) => '<option value="' + id + '">' + escapeHtml(nom) + '</option>').join('');
  ['cumpEmpresa', 'cumpleEmpresa'].forEach(sid => {
    const sel = document.getElementById(sid);
    if (sel) { const prev = sel.value; sel.innerHTML = opts; sel.value = prev; }
  });
}

// Carga TODOS los activos (respeta el selector global de empresa si hay uno).
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
  const emp    = document.getElementById('cumpEmpresa')?.value || '';

  let filas = _resumenData.map(p => ({ p, ev: _cumpEval(p) }));
  if (emp)   filas = filas.filter(f => String(f.p.empresa_id) === emp);
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

function renderCumpleanos() {
  const body = document.getElementById('cumpleBody');
  if (!body) return;
  const rango = document.getElementById('cumpleRango')?.value || '30';
  const q = (document.getElementById('cumpleBuscar')?.value || '').trim().toLowerCase();
  const emp = document.getElementById('cumpleEmpresa')?.value || '';
  const mesActual = new Date().getMonth() + 1;

  let items = _resumenData.map(p => ({ p: p, c: _proxCumple(p.fecha_nacimiento) })).filter(x => x.c);
  if (emp) items = items.filter(x => String(x.p.empresa_id) === emp);
  if (q) items = items.filter(x => (x.p.nombre || '').toLowerCase().includes(q));
  let filtrados = items;
  if (rango === '30')      filtrados = items.filter(x => x.c.dias <= 30);
  else if (rango === 'mes') filtrados = items.filter(x => x.c.mes === mesActual);
  filtrados.sort((a, b) => a.c.dias - b.c.dias);

  const hoyN = items.filter(x => x.c.dias === 0).length;
  const mesN = items.filter(x => x.c.mes === mesActual).length;
  const p30 = items.filter(x => x.c.dias <= 30).length;
  const kpis = document.getElementById('cumpleKpis');
  if (kpis) kpis.innerHTML =
    '<div class="kpi-card ' + (hoyN ? 'amarillo' : 'verde') + '"><div class="kpi-label">Cumpleaños hoy</div><div class="kpi-value ' + (hoyN ? 'amarillo' : 'verde') + '">' + hoyN + '</div><div class="kpi-sub">🎂</div><i class="fas fa-cake-candles kpi-icon"></i></div>' +
    '<div class="kpi-card azul"><div class="kpi-label">Este mes</div><div class="kpi-value azul">' + mesN + '</div><div class="kpi-sub">cumpleañeros</div><i class="fas fa-calendar-day kpi-icon"></i></div>' +
    '<div class="kpi-card verde"><div class="kpi-label">Próximos 30 días</div><div class="kpi-value verde">' + p30 + '</div><div class="kpi-sub">por celebrar</div><i class="fas fa-gift kpi-icon"></i></div>';

  const pagWrap = document.getElementById('cumplePagWrap');
  if (!filtrados.length) {
    body.innerHTML = '<tr><td colspan="6" class="muted" style="text-align:center;padding:28px">Sin cumpleaños en el rango. (¿Falta la fecha de nacimiento?)</td></tr>';
    if (pagWrap) pagWrap.innerHTML = '';
    return;
  }
  // Paginación (15 por página).
  const totalPags = Math.max(1, Math.ceil(filtrados.length / RESUMEN_PAGE_SIZE));
  if (_cumplePag > totalPags) _cumplePag = totalPags;
  if (_cumplePag < 1) _cumplePag = 1;
  const pageRows = filtrados.slice((_cumplePag - 1) * RESUMEN_PAGE_SIZE, _cumplePag * RESUMEN_PAGE_SIZE);
  if (pagWrap) pagWrap.innerHTML = _pagBar(filtrados.length, _cumplePag, RESUMEN_PAGE_SIZE, 'irCumplePagina');

  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  body.innerHTML = pageRows.map(o => {
    const p = o.p, c = o.c;
    const est = c.dias === 0 ? '<span class="badge badge-warning">🎂 HOY</span>'
              : c.dias <= 7 ? '<span class="badge badge-info">En ' + c.dias + ' d</span>'
              : '<span class="muted">En ' + c.dias + ' d</span>';
    return '<tr style="' + (c.dias === 0 ? 'background:rgba(243,156,18,.08)' : '') + '">' +
      '<td style="font-weight:600;color:var(--gris-100)">' + escapeHtml(p.nombre) + '</td>' +
      '<td class="muted">' + escapeHtml(p.cargo) + '</td>' +
      '<td class="muted">' + String(c.dia).padStart(2, '0') + ' ' + meses[c.mes - 1] + '</td>' +
      '<td style="text-align:right;font-variant-numeric:tabular-nums">' + c.edad + ' años</td>' +
      '<td style="text-align:right;font-variant-numeric:tabular-nums">' + (c.dias === 0 ? '—' : c.dias) + '</td>' +
      '<td>' + est + '</td>' +
    '</tr>';
  }).join('');
}
