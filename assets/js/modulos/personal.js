// ============================================================
// DISTRIBUCIÓN SEGURA — MÓDULO: PERSONAL
// CRUD, KPIs, importar/exportar Excel
// ============================================================

let personalData = [];
let personalPagina = 1;
const PERSONAL_PAGE_SIZE = 10;
// Documentos adjuntos (misma lista que el backend PERSONAL_DOC_COLS).
const PERSONAL_DOCS = ['doc_dni','doc_licencia','doc_certijoven','doc_sctr','doc_verif_ref'];

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
  const params=new URLSearchParams({action:'list',q,cargo,activo,limit:200});
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

// WEBP → PNG (pdf-lib no incrusta WEBP): se rasteriza vía canvas.
function _webpAPng(bytes) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([bytes], { type: 'image/webp' }));
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      c.toBlob(b => { URL.revokeObjectURL(url); b.arrayBuffer().then(resolve).catch(reject); }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('webp')); };
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
    const { PDFDocument } = PDFLib;
    const merged = await PDFDocument.create();
    let incluidos = 0; const fallos = [];

    for (const d of docs) {
      try {
        const bytes = await (await fetch(d.url)).arrayBuffer();
        if (d.ext === 'pdf') {
          const src = await PDFDocument.load(bytes);
          const pages = await merged.copyPages(src, src.getPageIndices());
          pages.forEach(pg => merged.addPage(pg));
        } else {
          let imgBytes = bytes, tipo = d.ext;
          if (tipo === 'webp') { imgBytes = await _webpAPng(bytes); tipo = 'png'; }
          const img = (tipo === 'png') ? await merged.embedPng(imgBytes) : await merged.embedJpg(imgBytes);
          const page = merged.addPage([img.width, img.height]);
          page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        }
        incluidos++;
      } catch (e) { fallos.push(d.label); }
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
  document.getElementById('personal_empresa').value=p.empresa||'';
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
    fd.append('empresa',              document.getElementById('personal_empresa').value.trim());
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
