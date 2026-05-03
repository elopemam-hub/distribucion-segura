// ============================================================
// DISTRIBUCIÓN SEGURA — CORE
// Constantes, navegación, UI compartida, formulario inspección
// ============================================================

// ============ CONSTANTES ============
const CHECKLIST_ITEMS = [
  'Zona de riesgo señalizada','Conos instalados','Puertas aseguradas',
  'Ventanas cerradas','Cortinas cerradas','Cubre estribos',
  'Cámaras de seguridad','Mecabero','Política manejo de dinero',
  'Cuenta con checklist pre operacional','Llaves no en contacto',
  'Caja fuerte','Contactos de emergencia',
];
const EPP_ITEMS = ['Casco', 'Chaleco reflectivo', 'Zapatos de seguridad', 'Lentes', 'Guantes'];

const CSRF_TOKEN = document.querySelector('meta[name="csrf-token"]')?.content || '';
const USER_ROL   = document.querySelector('meta[name="user-rol"]')?.content || '';

let checklistEstados = {};
let filesSeleccionados = [];
let hallazgosData = [];
let pageActual = 1;
let chartTendencia = null;
let inspeccionesData = [];

// ============ UTILIDADES ============
function escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function logout() { window.location.href = 'api/logout.php'; }

// ============ RELOJ ============
setInterval(() => {
  const d = new Date();
  document.getElementById('clock').textContent =
    d.toLocaleDateString('es-PE') + ' ' + d.toLocaleTimeString('es-PE', {hour:'2-digit',minute:'2-digit'});
}, 1000);

// ============ NAVEGACIÓN ============
function showPage(page) {
  document.querySelectorAll('[id^="page-"]').forEach(el => el.style.display = 'none');
  const el = document.getElementById('page-' + page);
  if (el) el.style.display = 'block';
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.querySelector(`[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');
  closeSidebar();
  if (page === 'dashboard')      cargarDashboard();
  if (page === 'inspecciones')   switchInspeccionTab('listado');
  if (page === 'personal')       cargarPersonal();
  if (page === 'amonestaciones') cargarAmonestaciones();
  if (page === 'usuarios')       cargarUsuarios();
}

function switchInspeccionTab(tab) {
  const pageEl = document.getElementById('page-inspecciones');
  if (pageEl && pageEl.style.display !== 'block') {
    document.querySelectorAll('[id^="page-"]').forEach(el => el.style.display = 'none');
    pageEl.style.display = 'block';
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navEl = document.querySelector('[data-page="inspecciones"]');
    if (navEl) navEl.classList.add('active');
    closeSidebar();
  }
  document.querySelectorAll('.insp-tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.insp-tab-btn').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('insp-panel-' + tab);
  const btn   = document.getElementById('insp-btn-' + tab);
  if (panel) panel.classList.add('active');
  if (btn)   btn.classList.add('active');
  if (tab === 'listado') cargarListado();
  if (tab === 'nueva')   inicializarFormulario();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

// ============ TOAST ============
function toast(msg, tipo = 'info', duracion = 3500) {
  const tc = document.getElementById('toastContainer');
  const div = document.createElement('div');
  div.className = `toast ${tipo}`;
  const iconos = { success:'fa-check-circle', error:'fa-times-circle', info:'fa-info-circle', warning:'fa-exclamation-triangle' };
  div.innerHTML = `<i class="fas ${iconos[tipo]||'fa-info-circle'}" style="color:var(--${tipo==='success'?'verde':tipo==='error'?'rojo':tipo==='warning'?'naranja':'azul'})"></i> ${msg}`;
  tc.appendChild(div);
  setTimeout(() => div.remove(), duracion);
}

// ============ MODAL ============
function abrirModal(id) { document.getElementById(id).classList.add('open'); document.body.style.overflow='hidden'; }
function cerrarModal(id) { document.getElementById(id).classList.remove('open'); document.body.style.overflow=''; }

// ============ GEOLOCALIZACIÓN ============
function capturarGeolocalizacion() {
  const btn=document.getElementById('btnGeolocalizacion'), icono=document.getElementById('geoIcono'),
        texto=document.getElementById('geoTexto'), coords=document.getElementById('geoCoordenadas'),
        badge=document.getElementById('geoBadge'), mapa=document.getElementById('geoMapa'),
        iframe=document.getElementById('geoMapaIframe');
  if (!navigator.geolocation) { toast('Este navegador no soporta geolocalización','error'); return; }
  if (btn)   { btn.disabled=true; btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Buscando...'; }
  if (icono) icono.textContent='🔍';
  if (texto) { texto.textContent='Obteniendo señal GPS...'; texto.style.color='var(--gris-300)'; }
  if (coords) coords.textContent='';
  if (badge)  badge.innerHTML='';
  if (mapa)   mapa.style.display='none';
  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat=pos.coords.latitude.toFixed(6), lng=pos.coords.longitude.toFixed(6), acc=Math.round(pos.coords.accuracy);
      document.getElementById('f_latitud').value=lat;
      document.getElementById('f_longitud').value=lng;
      if (btn)   { btn.disabled=false; btn.innerHTML='<i class="fas fa-check"></i> Actualizar'; btn.style.background='var(--verde)'; }
      if (icono) icono.textContent='✅';
      if (texto) { texto.textContent='Ubicación capturada correctamente'; texto.style.color='var(--verde)'; }
      if (coords) coords.textContent=`Lat: ${lat}  ·  Lng: ${lng}  ·  Precisión: ±${acc}m`;
      if (badge)  badge.innerHTML=`<span style="font-size:11px;padding:3px 8px;border-radius:12px;background:rgba(46,204,113,0.15);color:var(--verde);border:1px solid rgba(46,204,113,0.3);font-weight:700">±${acc}m</span>`;
      if (mapa && iframe) { iframe.src=`https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed&hl=es`; mapa.style.display='block'; }
      toast(`✅ GPS capturado (±${acc}m)`,'success');
    },
    err => {
      if (btn)   { btn.disabled=false; btn.innerHTML='<i class="fas fa-location-crosshairs"></i> Reintentar'; }
      if (icono) icono.textContent='❌';
      if (texto) { texto.textContent='No se pudo obtener la ubicación'; texto.style.color='var(--rojo)'; }
      if (coords) coords.textContent=err.code===1?'Permiso denegado — activa el GPS en tu navegador':'Señal débil — intenta en un lugar con mejor cobertura';
      const msgs={1:'Permiso denegado. Activa la ubicación.',2:'Posición no disponible.',3:'Tiempo agotado. Intenta de nuevo.'};
      toast(msgs[err.code]||'Error de geolocalización','error');
    },
    { enableHighAccuracy:true, timeout:15000, maximumAge:0 }
  );
}

// ============ FORMULARIO INSPECCIÓN ============
function inicializarFormulario() {
  inicializarTripulacion(); inicializarChecklist(); inicializarFirma();
  hallazgosData=[]; filesSeleccionados=[];
  renderHallazgos();
  document.getElementById('previewGrid').innerHTML='';
}

function inicializarTripulacion() {
  const c=document.getElementById('tripulacionContainer');
  c.innerHTML=`${renderMiembro('conductor','Conductor',true)}${renderMiembro('reparto','Reparto',false)}<div id="auxiliaresContainer"></div>`;
  setupAutocomplete('trip_conductor_nombre','conductor');
  setupAutocomplete('trip_reparto_nombre','reparto');
}

function renderMiembro(id, rol, requerido) {
  return `<div class="trip-miembro">
    <div class="trip-rol-label">
      <i class="fas fa-hard-hat" style="color:var(--amarillo)"></i> ${rol}
    </div>
    <div class="trip-fields">
      <div class="trip-nombre-wrap">
        <input type="text" class="form-control trip-input" id="trip_${id}_nombre"
          placeholder="Buscar o ingresar nombre" ${requerido?'required':''} autocomplete="off">
        <div class="autocomplete-box" id="auto_trip_${id}_nombre"></div>
      </div>
      <div class="trip-epp-wrap">
        <div class="trip-epp-title">EPP</div>
        <div class="trip-epp-items" id="epp_${id}">
          ${EPP_ITEMS.map(e=>`<label class="epp-label"><input type="checkbox" class="epp-check" data-rol="${id}" value="${e}"> ${e}</label>`).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

let auxCount = 0;
function agregarAuxiliar() {
  auxCount++;
  const c=document.getElementById('auxiliaresContainer'), div=document.createElement('div'), rolKey=`aux${auxCount}`;
  div.id=`aux_${auxCount}`; div.style.marginBottom='14px';
  div.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <div class="trip-rol-label" style="margin:0"><i class="fas fa-hard-hat" style="color:var(--amarillo)"></i> Auxiliar ${auxCount}</div>
    <button type="button" class="btn btn-danger btn-sm" onclick="document.getElementById('aux_${auxCount}').remove()"><i class="fas fa-times"></i></button>
  </div>
  <div class="trip-fields">
    <div class="trip-nombre-wrap">
      <input type="text" class="form-control trip-input" id="trip_${rolKey}_nombre" placeholder="Buscar o ingresar nombre" autocomplete="off">
      <div class="autocomplete-box" id="auto_trip_${rolKey}_nombre"></div>
    </div>
    <div class="trip-epp-wrap">
      <div class="trip-epp-title">EPP</div>
      <div class="trip-epp-items" id="epp_${rolKey}">
        ${EPP_ITEMS.map(e=>`<label class="epp-label"><input type="checkbox" class="epp-check" data-rol="${rolKey}" value="${e}"> ${e}</label>`).join('')}
      </div>
    </div>
  </div>`;
  c.appendChild(div);
  setupAutocomplete(`trip_${rolKey}_nombre`,'auxiliar');
}

let autoTimer = null;
function setupAutocomplete(inputId, cargoFiltro) {
  const input=document.getElementById(inputId), box=document.getElementById('auto_'+inputId);
  if (!input||!box) return;
  input.addEventListener('input', () => {
    const q=input.value.trim(); clearTimeout(autoTimer);
    if (q.length<2) { box.innerHTML=''; box.style.display='none'; return; }
    autoTimer=setTimeout(async () => {
      try {
        const r=await fetch(`api/personal.php?action=buscar&q=${encodeURIComponent(q)}&cargo=${encodeURIComponent(cargoFiltro)}`);
        const data=await r.json();
        if (!data.success||!data.data.length) { box.innerHTML='<div class="auto-item auto-empty">Sin resultados · se guardará como texto libre</div>'; box.style.display='block'; return; }
        box.innerHTML=data.data.map(p=>`<div class="auto-item" onclick="seleccionarPersonal('${inputId}','${p.nombre.replace(/'/g,"\\'")}')"><div style="font-weight:600">${p.nombre}</div><div style="font-size:11px;color:var(--gris-400)">DNI ${p.dni} · ${p.cargo}${p.telefono?' · '+p.telefono:''}</div></div>`).join('');
        box.style.display='block';
      } catch { box.style.display='none'; }
    }, 250);
  });
  input.addEventListener('blur', () => setTimeout(() => { box.style.display='none'; }, 200));
}
function seleccionarPersonal(inputId, nombre) { document.getElementById(inputId).value=nombre; document.getElementById('auto_'+inputId).style.display='none'; }
function obtenerTripulacion() {
  const result=[], roles=['conductor','reparto'];
  document.querySelectorAll('[id^="trip_aux"]').forEach(input => { const m=input.id.match(/trip_(aux\d+)_nombre/); if(m) roles.push(m[1]); });
  roles.forEach(rol => {
    const nombreEl=document.getElementById(`trip_${rol}_nombre`);
    if (!nombreEl||!nombreEl.value.trim()) return;
    const epps=[]; document.querySelectorAll(`.epp-check[data-rol="${rol}"]:checked`).forEach(ch=>epps.push(ch.value));
    result.push({ nombre:nombreEl.value.trim(), rol:rol.startsWith('aux')?'auxiliar':rol, epp_completo:epps.length===EPP_ITEMS.length?1:0, epp_detalle:epps });
  });
  return result;
}

function inicializarChecklist() { checklistEstados={}; CHECKLIST_ITEMS.forEach(item=>checklistEstados[item]=null); renderChecklist(); }
function renderChecklist() {
  document.getElementById('checklistContainer').innerHTML=CHECKLIST_ITEMS.map(item => {
    const estado=checklistEstados[item], cls=estado===true?'checked':estado===false?'unchecked':'', icon=estado===true?'✔':estado===false?'✖':'?';
    return `<div class="checklist-item ${cls}" onclick="toggleChecklist('${item.replace(/'/g,"\\'")}')"><div class="check-toggle">${icon}</div><div class="check-label">${item}</div></div>`;
  }).join('');
  actualizarPorcentaje();
}
function toggleChecklist(item) { const e=checklistEstados[item]; checklistEstados[item]=e===null?true:e===true?false:null; renderChecklist(); }
function marcarTodos(val) { CHECKLIST_ITEMS.forEach(item=>checklistEstados[item]=val); renderChecklist(); }
function actualizarPorcentaje() {
  const total=CHECKLIST_ITEMS.length, cumplen=CHECKLIST_ITEMS.filter(i=>checklistEstados[i]===true).length, pct=Math.round((cumplen/total)*100);
  document.getElementById('pctLabel').textContent=pct+'%'; document.getElementById('pctBadge').textContent=pct+'% cumplimiento';
  const fill=document.getElementById('progressFill'); fill.style.width=pct+'%';
  fill.className='progress-bar-fill '+(pct>=80?'verde':pct>=60?'naranja':'rojo');
}
function obtenerChecklist() { return CHECKLIST_ITEMS.map(item=>({ item, estado:checklistEstados[item]===true })); }

const TIPOS_IMG_VALIDOS = ['image/jpeg','image/jpg','image/png','image/webp'];
function handleFileSelect(input) { Array.from(input.files).forEach(f=>addFile(f)); input.value=''; }
function handleDrop(e) { e.preventDefault(); document.getElementById('uploadArea').classList.remove('dragover'); Array.from(e.dataTransfer.files).forEach(f=>addFile(f)); }
function addFile(file) {
  if (!TIPOS_IMG_VALIDOS.includes(file.type.toLowerCase())) { toast(`"${file.name}" no es una imagen válida (solo JPG, PNG o WEBP)`,'error'); return; }
  if (file.size>5*1024*1024) { toast(`"${file.name}" supera 5MB`,'error'); return; }
  filesSeleccionados.push(file);
  const idx=filesSeleccionados.length-1, reader=new FileReader();
  reader.onload=e => {
    const grid=document.getElementById('previewGrid'), div=document.createElement('div');
    div.className='preview-item'; div.id=`prev_${idx}`;
    div.innerHTML=`<img src="${e.target.result}" alt=""><button type="button" class="remove-btn" onclick="removeFile(${idx})" title="Quitar"><i class="fas fa-times"></i></button>`;
    grid.appendChild(div); actualizarContadorFotos();
  };
  reader.onerror=()=>{ toast(`No se pudo leer "${file.name}"`,'error'); filesSeleccionados[idx]=null; };
  reader.readAsDataURL(file);
}
function removeFile(idx) { filesSeleccionados[idx]=null; const el=document.getElementById(`prev_${idx}`); if(el) el.remove(); actualizarContadorFotos(); }
function actualizarContadorFotos() {
  const validos=filesSeleccionados.filter(Boolean).length, contador=document.getElementById('contadorFotos');
  if (contador) { contador.textContent=`${validos} foto${validos!==1?'s':''} seleccionada${validos!==1?'s':''}`; contador.style.color=validos>=2?'var(--verde)':'var(--naranja)'; }
}

function agregarHallazgo() { hallazgosData.push({descripcion:'',criticidad:'media'}); renderHallazgos(); }
function renderHallazgos() {
  const c=document.getElementById('hallazgosContainer');
  if (!hallazgosData.length) { c.innerHTML=''; return; }
  c.innerHTML=hallazgosData.map((h,i)=>`<div class="hallazgo-item" style="margin-bottom:8px">
    <select class="form-control" style="width:120px" onchange="hallazgosData[${i}].criticidad=this.value">
      <option value="baja" ${h.criticidad==='baja'?'selected':''}>🔵 Baja</option>
      <option value="media" ${h.criticidad==='media'?'selected':''}>🟡 Media</option>
      <option value="alta" ${h.criticidad==='alta'?'selected':''}>🔴 Alta</option>
    </select>
    <input type="text" class="form-control" placeholder="Descripción del hallazgo..." value="${h.descripcion}" oninput="hallazgosData[${i}].descripcion=this.value" style="flex:1">
    <button type="button" class="btn btn-danger btn-sm" onclick="hallazgosData.splice(${i},1);renderHallazgos()"><i class="fas fa-times"></i></button>
  </div>`).join('');
}

let firmaCtx, firmaDrawing=false, firmaHasContent=false;
function inicializarFirma() {
  const canvas=document.getElementById('firmaCanvas'); if(!canvas) return;
  firmaCtx=canvas.getContext('2d'); firmaCtx.fillStyle='#FFFFFF'; firmaCtx.fillRect(0,0,canvas.width,canvas.height);
  firmaCtx.strokeStyle='#1565C0'; firmaCtx.lineWidth=2.5; firmaCtx.lineCap='round'; firmaHasContent=false;
  const pos=(e,rect)=>{ const t=e.touches?.[0]; return { x:((t||e).clientX-rect.left)*(canvas.width/rect.width), y:((t||e).clientY-rect.top)*(canvas.height/rect.height) }; };
  canvas.addEventListener('mousedown', e=>{ firmaDrawing=true; firmaCtx.beginPath(); const r=canvas.getBoundingClientRect(),p=pos(e,r); firmaCtx.moveTo(p.x,p.y); });
  canvas.addEventListener('mousemove', e=>{ if(!firmaDrawing)return; const r=canvas.getBoundingClientRect(),p=pos(e,r); firmaCtx.lineTo(p.x,p.y); firmaCtx.stroke(); firmaHasContent=true; });
  canvas.addEventListener('mouseup', ()=>firmaDrawing=false);
  canvas.addEventListener('touchstart', e=>{ e.preventDefault(); firmaDrawing=true; firmaCtx.beginPath(); const r=canvas.getBoundingClientRect(),p=pos(e,r); firmaCtx.moveTo(p.x,p.y); },{passive:false});
  canvas.addEventListener('touchmove', e=>{ e.preventDefault(); if(!firmaDrawing)return; const r=canvas.getBoundingClientRect(),p=pos(e,r); firmaCtx.lineTo(p.x,p.y); firmaCtx.stroke(); firmaHasContent=true; },{passive:false});
  canvas.addEventListener('touchend', ()=>firmaDrawing=false);
}
function limpiarFirma() { const canvas=document.getElementById('firmaCanvas'); firmaCtx.fillStyle='#FFFFFF'; firmaCtx.fillRect(0,0,canvas.width,canvas.height); firmaHasContent=false; }

function resetForm() {
  document.getElementById('formInspeccion').reset();
  document.getElementById('f_fecha').value=new Date().toISOString().split('T')[0];
  document.getElementById('f_hora').value=new Date().toTimeString().slice(0,5);
  document.getElementById('f_provincia').value='San Román';
  document.getElementById('f_distrito').value='Juliaca';
  const geoTexto=document.getElementById('geoTexto'), geoCoordenadas=document.getElementById('geoCoordenadas'),
        geoBadge=document.getElementById('geoBadge'), geoIcono=document.getElementById('geoIcono'),
        geoMapa=document.getElementById('geoMapa'), btnGeo=document.getElementById('btnGeolocalizacion');
  if(geoTexto)  { geoTexto.textContent='Sin coordenadas — presiona "Capturar Ubicación"'; geoTexto.style.color='var(--gris-400)'; }
  if(geoCoordenadas) geoCoordenadas.textContent='';
  if(geoBadge)  geoBadge.innerHTML='';
  if(geoIcono)  geoIcono.textContent='📍';
  if(geoMapa)   geoMapa.style.display='none';
  if(btnGeo)    { btnGeo.disabled=false; btnGeo.innerHTML='<i class="fas fa-location-crosshairs"></i> Capturar Ubicación'; btnGeo.style.background=''; }
  auxCount=0; inicializarFormulario();
}

// ============ LIGHTBOX / GALERÍA ============
let galeriaFotos=[], galeriaIdx=0;
function abrirGaleria(idx) { galeriaIdx=idx; renderLightbox(); abrirModal('modalFoto'); document.addEventListener('keydown',onLightboxKey); }
function verFotoLightbox(url) { galeriaFotos=[url]; galeriaIdx=0; renderLightbox(); abrirModal('modalFoto'); document.addEventListener('keydown',onLightboxKey); }
function renderLightbox() {
  const total=galeriaFotos.length, url=galeriaFotos[galeriaIdx];
  document.getElementById('modalFotoImg').src=url;
  document.getElementById('lbContador').textContent=`Foto ${galeriaIdx+1} de ${total}`;
  const btnP=document.getElementById('lbBtnPrev'), btnN=document.getElementById('lbBtnNext');
  if(btnP) btnP.style.display=total>1?'flex':'none';
  if(btnN) btnN.style.display=total>1?'flex':'none';
  const mini=document.getElementById('lbMiniaturas');
  if(mini&&total>1) {
    mini.innerHTML=galeriaFotos.map((u,i)=>`<img src="${u}" onclick="abrirGaleria(${i})" style="width:60px;height:60px;object-fit:cover;border-radius:6px;cursor:pointer;border:2px solid ${i===galeriaIdx?'var(--amarillo)':'rgba(255,255,255,0.2)'};opacity:${i===galeriaIdx?'1':'0.55'};transition:all 0.2s" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='${i===galeriaIdx?'1':'0.55'}'"/>`).join('');
  } else if(mini) mini.innerHTML='';
}
function navegarGaleria(dir) { galeriaIdx=(galeriaIdx+dir+galeriaFotos.length)%galeriaFotos.length; renderLightbox(); }
function cerrarLightboxSiClick(e) { if(e.target===e.currentTarget) cerrarModal('modalFoto'); }
function onLightboxKey(e) {
  const modal=document.getElementById('modalFoto');
  if(!modal.classList.contains('open')) { document.removeEventListener('keydown',onLightboxKey); return; }
  if(e.key==='ArrowRight') navegarGaleria(1);
  if(e.key==='ArrowLeft')  navegarGaleria(-1);
  if(e.key==='Escape')     cerrarModal('modalFoto');
}

// ============ INIT ============
document.addEventListener('DOMContentLoaded', () => { showPage('dashboard'); });
