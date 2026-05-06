// ============================================================
// DISTRIBUCIÓN SEGURA — MÓDULO: AMONESTACIONES
// Bancarización, N3, Telemetría
// ============================================================

let amonTabActivo = 'bancarizacion';
let amonDatos   = { bancarizacion:[], n3:[], telemetria:[] };
let amonPaginas = { bancarizacion:1,  n3:1,  telemetria:1  };
const AMON_PAGE_SIZE = 8;

async function cargarAmonestaciones() {
  await Promise.all([cargarStatsAmon(), cargarTabAmon('bancarizacion')]);
  switchAmonTab('bancarizacion');
}

async function cargarStatsAmon() {
  try {
    const r=await fetch('api/amonestaciones.php?action=stats'), d=await r.json();
    if (!d.success) return;
    const s=d.data;
    document.getElementById('kpiAmonTotal').textContent=s.total||0;
    document.getElementById('kpiAmonBanc').textContent=s.bancarizacion||0;
    document.getElementById('kpiAmonN3').textContent=s.n3||0;
    document.getElementById('kpiAmonTele').textContent=s.telemetria||0;
    document.getElementById('kpiAmonPend').textContent=s.pendientes||0;
  } catch {}
}

function limpiarFiltrosAmon() {
  const desde = document.getElementById('filtroAmonDesde');
  const hasta = document.getElementById('filtroAmonHasta');
  const q     = document.getElementById('filtroAmonQ');
  const est   = document.getElementById('filtroAmonEstado');
  if (desde) desde.value = '';
  if (hasta) hasta.value = new Date().toISOString().slice(0,10);
  if (q)     q.value     = '';
  if (est)   est.value   = '';
  cargarTabAmon(amonTabActivo);
}

async function cargarTabAmon(tipo) {
  const q     = document.getElementById('filtroAmonQ')?.value.trim()    || '';
  const estado= document.getElementById('filtroAmonEstado')?.value       || '';
  const desde = document.getElementById('filtroAmonDesde')?.value        || '';
  const hasta = document.getElementById('filtroAmonHasta')?.value        || '';
  const params=new URLSearchParams({action:'list',tipo,q,estado,desde,hasta,limit:200});
  try {
    const r=await fetch('api/amonestaciones.php?'+params), d=await r.json();
    if (!d.success) { toast(d.message,'error'); return; }
    amonDatos[tipo]=d.data.amonestaciones||[]; amonPaginas[tipo]=1; renderTablaAmon(tipo);
  } catch { toast('Error al cargar amonestaciones','error'); }
}

function switchAmonTab(tipo) {
  amonTabActivo=tipo;
  document.querySelectorAll('.amon-tab-panel').forEach(p=>p.style.display='none');
  document.querySelectorAll('[id^="amon-btn-"]').forEach(b=>b.classList.remove('active'));
  const panel=document.getElementById('amon-panel-'+tipo), btn=document.getElementById('amon-btn-'+tipo);
  if(panel) panel.style.display='block'; if(btn) btn.classList.add('active');
  cargarTabAmon(tipo);
}

const AMON_ESTADO_BADGE = { pendiente:'<span class="badge badge-warning">Pendiente</span>', notificado:'<span class="badge badge-info">Notificado</span>', cerrado:'<span class="badge badge-success">Cerrado</span>' };

function planAccionesBadges(plan) {
  if (!plan) return'<span style="color:var(--gris-400);font-size:11px">—</span>';
  return plan.split(',').map(p=>p.trim()).filter(Boolean).map(p=>`<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:600;background:#14532d;color:#86efac;border:1px solid #22c55e;white-space:nowrap;margin:1px">${escapeHtml(p)}</span>`).join('');
}

function motivoCodBadge(cod) {
  if (!cod) return'—';
  const map={
    'Cobros efectivo >3500':{bg:'#FFACA8',c:'#a02020'},
    'Cobros efectivo >2000':{bg:'#FFDBBA',c:'#a05018'},
    'N3':                   {bg:'#A1E0DD',c:'#0d6b68'},
    'Multiparada':          {bg:'#FFDBBA',c:'#a05018'},
    'Cobro N3':             {bg:'#A1E0DD',c:'#0d6b68'},
    'Sin autorización':     {bg:'#F7DFF6',c:'#7B52A0'},
    'Reincidencia N3':      {bg:'#FFACA8',c:'#a02020'},
    'Protocolo':            {bg:'#F7DFF6',c:'#7B52A0'},
  };
  const s=map[cod]||{bg:'#E2E8F0',c:'#475569'};
  return`<span class="badge" style="background:${s.bg};color:${s.c};font-weight:700;font-size:11px">${escapeHtml(cod)}</span>`;
}

function amonDocs(a) {
  let html='';
  if(a.imagen_evento) html+=`<a class="btn btn-outline btn-sm btn-icon" href="uploads/${a.imagen_evento}" target="_blank" title="Ver imagen"><i class="fas fa-image"></i></a>`;
  if(a.archivo_amonestacion) html+=`<a class="btn btn-secondary btn-sm btn-icon" href="uploads/${a.archivo_amonestacion}" target="_blank" title="Descargar doc"><i class="fas fa-file-alt"></i></a>`;
  return html||'<span style="color:var(--gris-400);font-size:11px">—</span>';
}

function nivelSancionBadge(nivel) {
  if (!nivel) return '<span style="color:var(--gris-400)">—</span>';
  const map = {
    '1ERA VEZ': { bg:'#D1FAE5', color:'#065F46' },
    '2DA VEZ':  { bg:'#DBEAFE', color:'#1E40AF' },
    '3ERA VEZ': { bg:'#FEF3C7', color:'#92400E' },
    '4TA VEZ':  { bg:'#FED7AA', color:'#9A3412' },
    '5TA VEZ':  { bg:'#FECACA', color:'#991B1B' },
  };
  const cfg = map[nivel.toUpperCase()] || { bg:'#E2E8F0', color:'#475569' };
  return `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:700;background:${cfg.bg};color:${cfg.color};white-space:nowrap">${escapeHtml(nivel)}</span>`;
}

function amonReglaBadge(regla) {
  if(!regla)return'<span style="color:var(--gris-400)">—</span>';
  const r=regla.toLowerCase(); let bg='#E2E8F0',color='#475569';
  if(r.includes('velocidad')||r.includes('crítica')||r.includes('critica')){bg='#FFDBBA';color='#a05018';}
  else if(r.includes('celular')||r.includes('distrac')){bg='#FFACA8';color='#a02020';}
  else if(r.includes('cinturón')||r.includes('cinturon')){bg='#A1E0DD';color='#0d6b68';}
  else if(r.includes('frenada')||r.includes('aceleración')||r.includes('aceleracion')){bg='#FFDBBA';color='#a05018';}
  else if(r.includes('cámara')||r.includes('camara')||r.includes('obstrucción')){bg='#F7DFF6';color='#7B52A0';}
  else if(r.includes('retroceso')){bg='#FFACA8';color='#a02020';}
  const label=regla.length>22?regla.slice(0,20)+'…':regla;
  return`<span class="badge" style="background:${bg};color:${color};font-size:11px;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(regla)}">${escapeHtml(label)}</span>`;
}

function irPaginaAmon(tipo, pag) {
  const total = amonDatos[tipo]?.length || 0;
  const maxPag = Math.max(1, Math.ceil(total / AMON_PAGE_SIZE));
  amonPaginas[tipo] = Math.min(Math.max(1, pag), maxPag);
  renderTablaAmon(tipo);
}

function renderPaginacionAmon(tipo, total) {
  const pagActual = amonPaginas[tipo] || 1;
  const totalPags = Math.max(1, Math.ceil(total / AMON_PAGE_SIZE));
  const desde = (pagActual - 1) * AMON_PAGE_SIZE + 1;
  const hasta  = Math.min(pagActual * AMON_PAGE_SIZE, total);

  const sufijo = { bancarizacion:'Bancarizacion', n3:'N3', telemetria:'Telemetria' }[tipo];
  const infoEl = document.getElementById('pagInfo'+sufijo);
  const btnsEl = document.getElementById('pagBtns'+sufijo);
  if (!infoEl || !btnsEl) return;

  infoEl.textContent = total > 0 ? `Mostrando ${desde}–${hasta} de ${total}` : '';

  // Rango de páginas a mostrar (máx 7 botones)
  let pags = [];
  if (totalPags <= 7) {
    pags = Array.from({length: totalPags}, (_,i) => i+1);
  } else {
    pags = [1];
    if (pagActual > 3) pags.push('…');
    for (let p = Math.max(2, pagActual-1); p <= Math.min(totalPags-1, pagActual+1); p++) pags.push(p);
    if (pagActual < totalPags - 2) pags.push('…');
    pags.push(totalPags);
  }

  btnsEl.innerHTML =
    `<button onclick="irPaginaAmon('${tipo}',${pagActual-1})" ${pagActual===1?'disabled':''}>&#8249;</button>` +
    pags.map(p => p === '…'
      ? `<button disabled style="border:none;background:none;cursor:default">…</button>`
      : `<button class="${p===pagActual?'active':''}" onclick="irPaginaAmon('${tipo}',${p})">${p}</button>`
    ).join('') +
    `<button onclick="irPaginaAmon('${tipo}',${pagActual+1})" ${pagActual===totalPags?'disabled':''}>&#8250;</button>`;
}

function renderTablaAmon(tipo) {
  const todasFilas = amonDatos[tipo] || [];
  const total = todasFilas.length;
  const pag   = amonPaginas[tipo] || 1;
  const filas = todasFilas.slice((pag - 1) * AMON_PAGE_SIZE, pag * AMON_PAGE_SIZE);
  renderPaginacionAmon(tipo, total);
  if (tipo==='bancarizacion') {
    // Orden: Fecha | DNI | Nombre y Apellidos | Nombre cliente | Cód.Cliente | Motivo | Importe | Reincidente | Plan | Estado | F.Cierre | Obs | Docs | Opciones
    document.getElementById('tbodyBancarizacion').innerHTML=filas.length?filas.map(a=>`<tr>
      <td style="font-size:12px">${a.fecha}</td>
      <td style="font-size:12px;color:var(--primary);font-weight:600">${escapeHtml(a.personal_dni||'—')}</td>
      <td><strong>${escapeHtml(a.personal_nombre)}</strong><br><span style="font-size:11px;color:var(--gris-400)">${escapeHtml(a.personal_cargo||'')}</span></td>
      <td style="font-size:12px">${escapeHtml(a.cliente||'—')}</td>
      <td style="font-size:12px;font-weight:600">${escapeHtml(a.codigo_cliente||'—')}</td>
      <td>${motivoCodBadge(a.motivo_codigo)}</td>
      <td style="font-weight:700;color:var(--gris-100)">${a.monto?'S/'+parseFloat(a.monto).toLocaleString('es-PE',{minimumFractionDigits:2}):'—'}</td>
      <td style="text-align:center">${a.reincidente==1?'<span class="badge badge-danger">SÍ</span>':'<span class="badge badge-success">NO</span>'}</td>
      <td style="min-width:170px">${planAccionesBadges(a.plan_acciones)}</td>
      <td>${AMON_ESTADO_BADGE[a.estado]||'<span style="color:var(--gris-400)">—</span>'}</td>
      <td style="font-size:12px">${a.fecha_cierre||'—'}</td>
      <td style="font-size:12px;color:var(--gris-300);max-width:130px">${escapeHtml(a.observaciones||'—')}</td>
      <td>${amonDocs(a)}</td>
      <td><div style="display:flex;gap:4px"><button class="btn btn-outline btn-sm btn-icon" onclick="editarAmon(${a.id})" title="Editar"><i class="fas fa-edit"></i></button>${USER_ROL==='administrador'?`<button class="btn btn-danger btn-sm btn-icon" onclick="eliminarAmon(${a.id})" title="Eliminar"><i class="fas fa-trash"></i></button>`:''}</div></td>
    </tr>`).join(''):`<tr><td colspan="14" style="text-align:center;padding:32px;color:var(--gris-400)">Sin registros</td></tr>`;
  } else if (tipo==='n3') {
    // Orden: Fecha | DNI | Nombre y Apellidos | Cliente N3 | Cód.Cliente | Motivo | Reincidente | Plan | Estado | F.Cierre | Obs | Docs | Opciones
    document.getElementById('tbodyN3').innerHTML=filas.length?filas.map(a=>`<tr>
      <td style="font-size:12px">${a.fecha}</td>
      <td style="font-size:12px;color:var(--primary);font-weight:600">${escapeHtml(a.personal_dni||'—')}</td>
      <td><strong>${escapeHtml(a.personal_nombre)}</strong><br><span style="font-size:11px;color:var(--gris-400)">${escapeHtml(a.personal_cargo||'')}</span></td>
      <td style="font-size:12px">${escapeHtml(a.cliente||'—')}</td>
      <td style="font-size:12px;font-weight:600">${escapeHtml(a.codigo_cliente||'—')}</td>
      <td>${motivoCodBadge(a.motivo_codigo)}</td>
      <td style="text-align:center">${a.reincidente==1?'<span class="badge badge-danger">SÍ</span>':'<span class="badge badge-success">NO</span>'}</td>
      <td style="min-width:170px">${planAccionesBadges(a.plan_acciones)}</td>
      <td>${AMON_ESTADO_BADGE[a.estado]||'<span style="color:var(--gris-400)">—</span>'}</td>
      <td style="font-size:12px">${a.fecha_cierre||'—'}</td>
      <td style="font-size:12px;color:var(--gris-300);max-width:130px">${escapeHtml(a.observaciones||'—')}</td>
      <td>${amonDocs(a)}</td>
      <td><div style="display:flex;gap:4px"><button class="btn btn-outline btn-sm btn-icon" onclick="editarAmon(${a.id})" title="Editar"><i class="fas fa-edit"></i></button>${USER_ROL==='administrador'?`<button class="btn btn-danger btn-sm btn-icon" onclick="eliminarAmon(${a.id})" title="Eliminar"><i class="fas fa-trash"></i></button>`:''}</div></td>
    </tr>`).join(''):`<tr><td colspan="13" style="text-align:center;padding:32px;color:var(--gris-400)">Sin registros</td></tr>`;
  } else if (tipo==='telemetria') {
    // Orden: Fecha | Placa | Nombre | Regla | T.Sanción | Nivel | Reincidente | Imagen | Estado | Plan | F.Cierre | Obs | Docs | Acciones
    document.getElementById('tbodyTelemetria').innerHTML=filas.length?filas.map(a=>`<tr style="${a.reincidente==1?'background:rgba(220,38,38,0.04);border-left:3px solid #EF4444;':''}">
      <td style="font-size:12px">${a.fecha}</td>
      <td><span class="badge" style="font-weight:800;background:var(--primary-light);color:var(--primary)">${escapeHtml(a.unidad||'—')}</span></td>
      <td><strong style="font-size:13px">${escapeHtml(a.personal_nombre)}</strong><br><span style="font-size:11px;color:var(--gris-400)">${escapeHtml(a.personal_cargo||'')}</span></td>
      <td>${amonReglaBadge(a.evento_tele)}</td>
      <td>${a.tipo_sancion?`<span class="badge badge-info" style="font-size:11px">${escapeHtml(a.tipo_sancion)}</span>`:'—'}</td>
      <td>${nivelSancionBadge(a.tipo_sancion_nivel)}</td>
      <td style="text-align:center">${a.reincidente==1?'<span class="badge badge-danger" style="font-weight:700">&#9888; SÍ</span>':'<span class="badge badge-success">NO</span>'}</td>
      <td>${a.imagen_evento?`<img src="uploads/${a.imagen_evento}" style="width:72px;height:48px;object-fit:cover;border-radius:6px;cursor:pointer;border:1px solid var(--gris-500)" onclick="verFotoLightbox('uploads/${a.imagen_evento}')">`:'<span style="color:var(--gris-400);font-size:11px">—</span>'}</td>
      <td>${AMON_ESTADO_BADGE[a.estado]||'<span style="color:var(--gris-400)">—</span>'}</td>
      <td style="font-size:11px;color:var(--gris-300);max-width:160px;line-height:1.6">${escapeHtml(a.plan_acciones||'—')}</td>
      <td style="font-size:12px">${a.fecha_cierre||'—'}</td>
      <td style="font-size:12px;color:var(--gris-300);max-width:130px">${escapeHtml(a.observaciones||'—')}</td>
      <td>${amonDocs(a)}</td>
      <td><div style="display:flex;gap:4px"><button class="btn btn-outline btn-sm btn-icon" onclick="editarAmon(${a.id})" title="Editar"><i class="fas fa-edit"></i></button>${USER_ROL==='administrador'?`<button class="btn btn-danger btn-sm btn-icon" onclick="eliminarAmon(${a.id})" title="Eliminar"><i class="fas fa-trash"></i></button>`:''}</div></td>
    </tr>`).join(''):`<tr><td colspan="14" style="text-align:center;padding:32px;color:var(--gris-400)">Sin registros</td></tr>`;
  }
}

const AMON_TITULOS = { bancarizacion:'Amonestación Bancarización', n3:'Amonestación N3', telemetria:'Amonestación Telemetría' };

function abrirModalAmon(tipo) {
  tipo=tipo||amonTabActivo;
  document.getElementById('formAmon').reset();
  document.getElementById('amon_id').value=''; document.getElementById('amon_tipo').value=tipo;
  document.getElementById('amon_personal_id').value='';
  document.getElementById('amon_fecha').value=new Date().toISOString().slice(0,10);
  document.getElementById('modalAmonTitulo').textContent='Nueva — '+AMON_TITULOS[tipo];
  const prev=document.getElementById('amon_imagen_preview'); if(prev) prev.style.display='none';
  const archDiv=document.getElementById('amon_archivo_actual'); if(archDiv) archDiv.style.display='none';
  mostrarSeccionAmon(tipo); cerrarAmonAC(); abrirModal('modalAmon');
}

function mostrarSeccionAmon(tipo) {
  document.getElementById('secAmonBanc').style.display=tipo==='bancarizacion'?'':'none';
  document.getElementById('secAmonN3').style.display=tipo==='n3'?'':'none';
  document.getElementById('secAmonTele').style.display=tipo==='telemetria'?'':'none';
}

async function editarAmon(id) {
  const r=await fetch(`api/amonestaciones.php?action=get&id=${id}`), d=await r.json();
  if (!d.success) { toast(d.message,'error'); return; }
  const a=d.data;
  document.getElementById('amon_id').value=a.id; document.getElementById('amon_tipo').value=a.tipo;
  document.getElementById('amon_personal_id').value=a.personal_id;
  document.getElementById('amon_personal_nombre').value=a.personal_nombre||'';
  document.getElementById('amon_fecha').value=a.fecha||'';
  document.getElementById('amon_descripcion').value=a.descripcion||'';
  document.getElementById('amon_estado').value=a.estado||'pendiente';
  document.getElementById('amon_observaciones').value=a.observaciones||'';
  if (a.tipo==='bancarizacion') {
    document.getElementById('amon_monto').value=a.monto||'';
    document.getElementById('amon_nro_operacion').value=a.nro_operacion||'';
    document.getElementById('amon_motivo_codigo_banc').value=a.motivo_codigo||'';
    document.getElementById('amon_cliente_banc').value=a.cliente||'';
    document.getElementById('amon_codigo_cliente_banc').value=a.codigo_cliente||'';
    document.getElementById('amon_reincidente_banc').checked=a.reincidente==1;
    document.getElementById('amon_fecha_cierre_banc').value=a.fecha_cierre||'';
    const planB=(a.plan_acciones||'').split(',').map(s=>s.trim());
    document.querySelectorAll('.plan-banc-check').forEach(cb=>cb.checked=planB.includes(cb.value));
    const abDiv=document.getElementById('amon_archivo_actual_banc');
    if(a.archivo_amonestacion&&abDiv){document.getElementById('amon_archivo_link_banc').href='uploads/'+a.archivo_amonestacion;document.getElementById('amon_archivo_nom_banc').textContent=a.archivo_amonestacion.split('/').pop();abDiv.style.display='block';}else if(abDiv)abDiv.style.display='none';
  } else if (a.tipo==='n3') {
    document.getElementById('amon_cliente').value=a.cliente||'';
    document.getElementById('amon_codigo_cliente_n3').value=a.codigo_cliente||'';
    document.getElementById('amon_ruta').value=a.ruta||'';
    document.getElementById('amon_motivo_codigo_n3').value=a.motivo_codigo||'';
    document.getElementById('amon_reincidente_n3').checked=a.reincidente==1;
    document.getElementById('amon_fecha_cierre_n3').value=a.fecha_cierre||'';
    const planN=(a.plan_acciones||'').split(',').map(s=>s.trim());
    document.querySelectorAll('.plan-n3-check').forEach(cb=>cb.checked=planN.includes(cb.value));
    const anDiv=document.getElementById('amon_archivo_actual_n3');
    if(a.archivo_amonestacion&&anDiv){document.getElementById('amon_archivo_link_n3').href='uploads/'+a.archivo_amonestacion;document.getElementById('amon_archivo_nom_n3').textContent=a.archivo_amonestacion.split('/').pop();anDiv.style.display='block';}else if(anDiv)anDiv.style.display='none';
  } else if (a.tipo==='telemetria') {
    document.getElementById('amon_unidad').value=a.unidad||''; document.getElementById('amon_evento_tele').value=a.evento_tele||'';
    document.getElementById('amon_valor_registrado').value=a.valor_registrado||'';
    document.getElementById('amon_tipo_sancion').value=a.tipo_sancion||'';
    document.getElementById('amon_tipo_sancion_nivel').value=a.tipo_sancion_nivel||'';
    document.getElementById('amon_reincidente').checked=a.reincidente==1;
    document.getElementById('amon_fecha_cierre').value=a.fecha_cierre||'';
    document.getElementById('amon_plan_acciones').value=a.plan_acciones||'';
    const planActual=(a.plan_acciones||'').split(',').map(s=>s.trim());
    document.querySelectorAll('.plan-accion-check').forEach(cb=>cb.checked=planActual.includes(cb.value));
    if(a.imagen_evento){const prev=document.getElementById('amon_imagen_preview'),img=document.getElementById('amon_img_thumb');if(prev&&img){img.src='uploads/'+a.imagen_evento;prev.style.display='block';}}
    const archDiv=document.getElementById('amon_archivo_actual'),archLink=document.getElementById('amon_archivo_link'),archNom=document.getElementById('amon_archivo_nombre');
    if(a.archivo_amonestacion&&archDiv&&archLink&&archNom){archLink.href='uploads/'+a.archivo_amonestacion;archNom.textContent=a.archivo_amonestacion.split('/').pop();archDiv.style.display='block';}else if(archDiv)archDiv.style.display='none';
  }
  document.getElementById('modalAmonTitulo').textContent='Editar — '+AMON_TITULOS[a.tipo];
  mostrarSeccionAmon(a.tipo); abrirModal('modalAmon');
}

async function eliminarAmon(id) {
  if (!confirm('¿Eliminar esta amonestación? Esta acción no se puede deshacer.')) return;
  const fd=new FormData(); fd.append('action','delete'); fd.append('csrf_token',CSRF_TOKEN); fd.append('id',id);
  const r=await fetch('api/amonestaciones.php',{method:'POST',body:fd}), d=await r.json();
  if(d.success){toast('Eliminada','success');cargarAmonestaciones();}else toast(d.message,'error');
}

async function buscarPersonalAmon(q) {
  const ac=document.getElementById('amonPersonalAC'); document.getElementById('amon_personal_id').value='';
  if(q.length<2){cerrarAmonAC();return;}
  const r=await fetch(`api/personal.php?action=buscar&q=${encodeURIComponent(q)}`), d=await r.json();
  const items=d.data||[];
  if(!items.length){ac.innerHTML='<div class="auto-item auto-empty">Sin resultados</div>';ac.style.display='block';return;}
  ac.innerHTML=items.map(p=>`<div class="auto-item" onclick="seleccionarPersonalAmon(${p.id},'${escapeHtml(p.nombre)}')"><strong>${escapeHtml(p.nombre)}</strong><span style="font-size:11px;color:var(--gris-400);margin-left:8px">${p.cargo} · DNI ${p.dni}</span></div>`).join('');
  ac.style.display='block';
}
function seleccionarPersonalAmon(id,nombre){document.getElementById('amon_personal_id').value=id;document.getElementById('amon_personal_nombre').value=nombre;cerrarAmonAC();}
function cerrarAmonAC(){const ac=document.getElementById('amonPersonalAC');if(ac){ac.innerHTML='';ac.style.display='none';}}

document.addEventListener('DOMContentLoaded', () => {
  const fAmon=document.getElementById('formAmon');
  if (fAmon) fAmon.addEventListener('submit', async e => {
    e.preventDefault();
    const tipo=document.getElementById('amon_tipo').value;
    if (!document.getElementById('amon_personal_id').value){toast('Selecciona un personal del listado','error');return;}
    const fd=new FormData();
    fd.append('action','save'); fd.append('csrf_token',CSRF_TOKEN);
    fd.append('id',document.getElementById('amon_id').value);
    fd.append('tipo',tipo);
    fd.append('personal_id',document.getElementById('amon_personal_id').value);
    fd.append('fecha',document.getElementById('amon_fecha').value);
    fd.append('descripcion',document.getElementById('amon_descripcion').value.trim());
    fd.append('estado',document.getElementById('amon_estado').value);
    fd.append('observaciones',document.getElementById('amon_observaciones').value.trim());
    if(tipo==='bancarizacion'){
      fd.append('monto',document.getElementById('amon_monto').value);
      fd.append('nro_operacion',document.getElementById('amon_nro_operacion').value.trim());
      fd.append('motivo_codigo',document.getElementById('amon_motivo_codigo_banc').value);
      fd.append('cliente',document.getElementById('amon_cliente_banc').value.trim());
      fd.append('codigo_cliente',document.getElementById('amon_codigo_cliente_banc').value.trim());
      fd.append('fecha_cierre',document.getElementById('amon_fecha_cierre_banc').value);
      if(document.getElementById('amon_reincidente_banc').checked)fd.append('reincidente','1');
      fd.append('plan_acciones',[...document.querySelectorAll('.plan-banc-check:checked')].map(c=>c.value).join(', '));
      const imgB=document.getElementById('amon_imagen_banc').files[0]; if(imgB)fd.append('imagen_evento',imgB);
      const docB=document.getElementById('amon_archivo_banc').files[0]; if(docB)fd.append('archivo_amonestacion',docB);
    } else if(tipo==='n3'){
      fd.append('cliente',document.getElementById('amon_cliente').value.trim());
      fd.append('codigo_cliente',document.getElementById('amon_codigo_cliente_n3').value.trim());
      fd.append('ruta',document.getElementById('amon_ruta').value.trim());
      fd.append('motivo_codigo',document.getElementById('amon_motivo_codigo_n3').value);
      fd.append('fecha_cierre',document.getElementById('amon_fecha_cierre_n3').value);
      if(document.getElementById('amon_reincidente_n3').checked)fd.append('reincidente','1');
      fd.append('plan_acciones',[...document.querySelectorAll('.plan-n3-check:checked')].map(c=>c.value).join(', '));
      const imgN=document.getElementById('amon_imagen_n3').files[0]; if(imgN)fd.append('imagen_evento',imgN);
      const docN=document.getElementById('amon_archivo_n3').files[0]; if(docN)fd.append('archivo_amonestacion',docN);
    } else if(tipo==='telemetria'){
      fd.append('unidad',document.getElementById('amon_unidad').value.trim());
      fd.append('evento_tele',document.getElementById('amon_evento_tele').value);
      fd.append('valor_registrado',document.getElementById('amon_valor_registrado').value.trim());
      fd.append('tipo_sancion',document.getElementById('amon_tipo_sancion').value);
      fd.append('tipo_sancion_nivel',document.getElementById('amon_tipo_sancion_nivel').value);
      if(document.getElementById('amon_reincidente').checked)fd.append('reincidente','1');
      fd.append('plan_acciones',[...document.querySelectorAll('.plan-accion-check:checked')].map(c=>c.value).join(', '));
      fd.append('fecha_cierre',document.getElementById('amon_fecha_cierre').value);
      const img=document.getElementById('amon_imagen_evento').files[0]; if(img)fd.append('imagen_evento',img);
      const doc=document.getElementById('amon_archivo_doc').files[0]; if(doc)fd.append('archivo_amonestacion',doc);
    }
    try {
      const r=await fetch('api/amonestaciones.php',{method:'POST',body:fd}), d=await r.json();
      if(d.success){toast(d.message,'success');cerrarModal('modalAmon');cargarAmonestaciones();cargarStatsAmon();}
      else toast(d.message,'error');
    } catch{toast('Error de conexión','error');}
  });

  const imgInput=document.getElementById('amon_imagen_evento');
  if(imgInput)imgInput.addEventListener('change',e=>{const file=e.target.files[0],prev=document.getElementById('amon_imagen_preview'),img=document.getElementById('amon_img_thumb');if(file&&prev&&img){img.src=URL.createObjectURL(file);prev.style.display='block';}});

  document.querySelectorAll('.plan-accion-check').forEach(cb=>{cb.addEventListener('change',()=>{const vals=[...document.querySelectorAll('.plan-accion-check:checked')].map(c=>c.value).join(', ');const h=document.getElementById('amon_plan_acciones');if(h)h.value=vals;});});

  const fQ=document.getElementById('filtroAmonQ');
  if(fQ)fQ.addEventListener('input',()=>{clearTimeout(window._filtroAmonTimer);window._filtroAmonTimer=setTimeout(()=>cargarTabAmon(amonTabActivo),300);});
  const fE=document.getElementById('filtroAmonEstado');
  if(fE)fE.addEventListener('change',()=>cargarTabAmon(amonTabActivo));
  const fD=document.getElementById('filtroAmonDesde');
  if(fD)fD.addEventListener('change',()=>cargarTabAmon(amonTabActivo));
  const fH=document.getElementById('filtroAmonHasta');
  if(fH)fH.addEventListener('change',()=>cargarTabAmon(amonTabActivo));
  document.addEventListener('click',e=>{if(!e.target.closest('#amon_personal_nombre')&&!e.target.closest('#amonPersonalAC'))cerrarAmonAC();});
});
