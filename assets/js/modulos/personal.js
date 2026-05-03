// ============================================================
// DISTRIBUCIÓN SEGURA — MÓDULO: PERSONAL
// CRUD, KPIs, importar/exportar Excel
// ============================================================

let personalData = [];

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

function renderPersonalTabla() {
  const tb=document.getElementById('tablaPersonalBody');
  if (!personalData.length) { tb.innerHTML='<tr><td colspan="15" style="text-align:center;padding:32px;color:var(--gris-400)">Sin resultados</td></tr>'; return; }
  tb.innerHTML=personalData.map(p=>{
    const diasDni=p.dias_vencer_dni!==null?parseInt(p.dias_vencer_dni):null;
    const diasBrevete=p.dias_vencer_brevete!==null?parseInt(p.dias_vencer_brevete):null;
    return`<tr>
      <td>${p.foto?`<img src="uploads/${p.foto}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;cursor:pointer" onclick="verFotoLightbox('uploads/${p.foto}')">`:`<div style="width:40px;height:40px;border-radius:50%;background:var(--gris-700);display:flex;align-items:center;justify-content:center;color:var(--gris-400)"><i class="fas fa-user"></i></div>`}</td>
      <td>${p.dni}</td><td><strong>${escapeHtml(p.nombre)}</strong></td>
      <td><span class="badge">${p.cargo}</span></td>
      <td style="font-size:12px">${escapeHtml(p.empresa||'—')}</td>
      <td>${p.telefono||'—'}</td>
      <td style="font-size:12px">${p.fecha_ingreso||'—'}</td>
      <td style="font-size:12px">${p.dni_vencimiento||'—'}</td>
      <td style="font-size:12px">${p.num_licencia||'—'}</td>
      <td style="font-size:12px">${p.categoria_licencia?`<span class="badge badge-info">${escapeHtml(p.categoria_licencia)}</span>`:'—'}</td>
      <td style="font-size:12px">${p.vencimiento_brevete||'—'}</td>
      <td>${badgeDias(diasDni)}</td><td>${badgeDias(diasBrevete)}</td>
      <td>${p.activo==1?'<span class="badge badge-success">Activo</span>':'<span class="badge badge-danger">Inactivo</span>'}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="editarPersonal(${p.id})" title="Editar"><i class="fas fa-edit"></i></button>
        ${p.activo==1?`<button class="btn btn-danger btn-sm" onclick="desactivarPersonal(${p.id})" title="Desactivar"><i class="fas fa-user-slash"></i></button>`:''}
      </td>
    </tr>`;
  }).join('');
}

function abrirModalPersonal() {
  document.getElementById('formPersonal').reset();
  document.getElementById('personal_id').value='';
  document.getElementById('modalPersonalTitulo').textContent='Nuevo Personal';
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
  document.getElementById('personal_fecha_ingreso').value=p.fecha_ingreso||'';
  document.getElementById('personal_dni_vencimiento').value=p.dni_vencimiento||'';
  document.getElementById('personal_num_licencia').value=p.num_licencia||'';
  document.getElementById('personal_categoria_licencia').value=p.categoria_licencia||'';
  document.getElementById('personal_vencimiento_brevete').value=p.vencimiento_brevete||'';
  document.getElementById('personal_observaciones').value=p.observaciones||'';
  document.getElementById('personal_activo').value=p.activo;
  document.getElementById('modalPersonalTitulo').textContent='Editar Personal';
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
    fd.append('fecha_ingreso',        document.getElementById('personal_fecha_ingreso').value);
    fd.append('dni_vencimiento',      document.getElementById('personal_dni_vencimiento').value);
    fd.append('num_licencia',         document.getElementById('personal_num_licencia').value.trim());
    fd.append('categoria_licencia',   document.getElementById('personal_categoria_licencia').value);
    fd.append('vencimiento_brevete',  document.getElementById('personal_vencimiento_brevete').value);
    fd.append('observaciones',        document.getElementById('personal_observaciones').value.trim());
    fd.append('activo',               document.getElementById('personal_activo').value);
    const foto=document.getElementById('personal_foto').files[0];
    if (foto) fd.append('foto',foto);
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
    return {DNI:p.dni,Nombre:p.nombre,Cargo:p.cargo,Empresa:p.empresa||'',Teléfono:p.telefono||'','Fecha Ingreso':p.fecha_ingreso||'','Venc. DNI':p.dni_vencimiento||'','Días DNI':diasDni!==null?diasDni:'',' N° Licencia':p.num_licencia||'','Categoría':p.categoria_licencia||'','Venc. Brevete':p.vencimiento_brevete||'','Días Brevete':diasBrevete!==null?diasBrevete:'',Estado:p.activo==1?'Activo':'Inactivo',Observaciones:p.observaciones||''};
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
