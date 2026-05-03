// ============================================================
// DISTRIBUCIÓN SEGURA — MÓDULO: USUARIOS
// CRUD, roles, permisos de módulos
// ============================================================

async function cargarUsuarios() {
  try {
    const r=await fetch('api/usuarios.php?action=list'), data=await r.json();
    if (!data.success) { toast(data.message,'error'); return; }
    renderUsuariosTabla(data.data);
  } catch { toast('Error al cargar usuarios','error'); }
}

function renderUsuariosTabla(usuarios) {
  const tb=document.getElementById('tablaUsuariosBody');
  if (!usuarios.length) { tb.innerHTML='<tr><td colspan="6" style="text-align:center;padding:32px">Sin usuarios</td></tr>'; return; }
  const rolColor={administrador:'badge-danger',supervisor:'badge-yellow',inspector:'badge'};
  tb.innerHTML=usuarios.map(u=>`<tr>
    <td><strong>${escapeHtml(u.nombre)}</strong></td>
    <td><code>${escapeHtml(u.usuario)}</code></td>
    <td><span class="badge ${rolColor[u.rol]||''}">${u.rol}</span></td>
    <td>${u.activo==1?'<span class="badge badge-success">Activo</span>':'<span class="badge badge-danger">Inactivo</span>'}</td>
    <td style="font-size:12px;color:var(--gris-400)">${u.creado_en?.slice(0,10)||''}</td>
    <td>
      <button class="btn btn-outline btn-sm" onclick="editarUsuario(${u.id})" title="Editar usuario"><i class="fas fa-edit"></i></button>
      <button class="btn btn-primary btn-sm" onclick="abrirCambiarRol(${u.id},'${escapeHtml(u.nombre)}','${u.rol}')" title="Cambiar rol"><i class="fas fa-user-tag"></i></button>
      <button class="btn btn-secondary btn-sm" onclick="cambiarPasswordUsuario(${u.id},'${escapeHtml(u.usuario)}')" title="Cambiar contraseña"><i class="fas fa-key"></i></button>
      ${u.activo==1?`<button class="btn btn-danger btn-sm" onclick="desactivarUsuario(${u.id})" title="Desactivar"><i class="fas fa-user-slash"></i></button>`:''}
    </td>
  </tr>`).join('');
}

function actualizarSeccionModulos() {
  const rol=document.getElementById('usuario_rol').value, sec=document.getElementById('seccionModulos');
  if(sec) sec.style.display=rol==='administrador'?'none':'block';
}
function setModulosChecked(modulos) {
  ['inspecciones','personal','reportes','matriz','amonestaciones'].forEach(m=>{const el=document.getElementById('mod_'+m);if(el)el.checked=modulos.includes(m);});
}
function getModulosSeleccionados() {
  const checked=['dashboard'];
  ['inspecciones','personal','reportes','matriz','amonestaciones'].forEach(m=>{const el=document.getElementById('mod_'+m);if(el&&el.checked)checked.push(m);});
  return checked;
}

function abrirModalUsuario() {
  document.getElementById('formUsuario').reset();
  document.getElementById('usuario_id').value='';
  document.getElementById('modalUsuarioTitulo').textContent='Nuevo Usuario';
  document.getElementById('pwd_label_hint').textContent='*';
  document.getElementById('pwd_hint').textContent='Mínimo 6 caracteres';
  document.getElementById('usuario_password').required=true;
  setModulosChecked([]); actualizarSeccionModulos(); abrirModal('modalUsuario');
}

async function editarUsuario(id) {
  const [rUser,rPermisos]=await Promise.all([fetch(`api/usuarios.php?action=get&id=${id}`),fetch(`api/usuarios.php?action=permisos_get&id=${id}`)]);
  const dUser=await rUser.json(), dPerm=await rPermisos.json();
  if (!dUser.success) { toast(dUser.message,'error'); return; }
  const u=dUser.data;
  document.getElementById('usuario_id').value=u.id;
  document.getElementById('usuario_nombre').value=u.nombre;
  document.getElementById('usuario_usuario').value=u.usuario;
  document.getElementById('usuario_rol').value=u.rol;
  document.getElementById('usuario_activo').value=u.activo;
  document.getElementById('usuario_password').value='';
  document.getElementById('modalUsuarioTitulo').textContent='Editar Usuario';
  document.getElementById('pwd_label_hint').textContent='(dejar en blanco para no cambiar)';
  document.getElementById('pwd_hint').textContent='Solo escribe si quieres cambiarla';
  document.getElementById('usuario_password').required=false;
  setModulosChecked(dPerm.success?dPerm.data.modulos:[]); actualizarSeccionModulos(); abrirModal('modalUsuario');
}

async function submitUsuario(e) {
  e.preventDefault();
  const id=document.getElementById('usuario_id').value, rol=document.getElementById('usuario_rol').value;
  const fd=new FormData();
  fd.append('action','save'); fd.append('csrf_token',CSRF_TOKEN);
  fd.append('id',id); fd.append('nombre',document.getElementById('usuario_nombre').value.trim());
  fd.append('usuario',document.getElementById('usuario_usuario').value.trim());
  fd.append('password',document.getElementById('usuario_password').value);
  fd.append('rol',rol); fd.append('activo',document.getElementById('usuario_activo').value);
  try {
    const r=await fetch('api/usuarios.php',{method:'POST',body:fd}), data=await r.json();
    if (!data.success) { toast(data.message,'error'); return; }
    const userId=data.data?.id||id;
    if (rol!=='administrador'&&userId) {
      const fp=new FormData(); fp.append('action','permisos_save'); fp.append('csrf_token',CSRF_TOKEN); fp.append('id',userId); fp.append('modulos',JSON.stringify(getModulosSeleccionados()));
      await fetch('api/usuarios.php',{method:'POST',body:fp});
    }
    toast(data.message,'success'); cerrarModal('modalUsuario'); cargarUsuarios();
  } catch { toast('Error de conexión','error'); }
}

function abrirCambiarRol(id,nombre,rolActual) {
  document.getElementById('cr_usuario_id').value=id;
  document.getElementById('cr_usuario_nombre').textContent=`👤 ${nombre}`;
  document.getElementById('cr_rol').value=rolActual;
  document.getElementById('cr_reset_permisos').checked=false;
  abrirModal('modalCambiarRol');
}

async function submitCambiarRol() {
  const id=document.getElementById('cr_usuario_id').value, rol=document.getElementById('cr_rol').value, reset=document.getElementById('cr_reset_permisos').checked;
  const fd=new FormData(); fd.append('action','cambiar_rol'); fd.append('csrf_token',CSRF_TOKEN); fd.append('id',id); fd.append('rol',rol);
  if(reset)fd.append('reset_permisos','1');
  try {
    const r=await fetch('api/usuarios.php',{method:'POST',body:fd}), d=await r.json();
    if(d.success){toast(d.message,'success');cerrarModal('modalCambiarRol');cargarUsuarios();}else toast(d.message,'error');
  } catch{toast('Error de conexión','error');}
}

async function cambiarPasswordUsuario(id,nombreUsuario) {
  const nueva=prompt(`Nueva contraseña para "${nombreUsuario}" (mínimo 6 caracteres):`);
  if (!nueva) return; if(nueva.length<6){toast('Mínimo 6 caracteres','error');return;}
  const fd=new FormData(); fd.append('action','cambiar_password'); fd.append('csrf_token',CSRF_TOKEN); fd.append('id',id); fd.append('password',nueva);
  const r=await fetch('api/usuarios.php',{method:'POST',body:fd}), data=await r.json();
  if(data.success)toast('Contraseña actualizada','success');else toast(data.message,'error');
}

async function desactivarUsuario(id) {
  if (!confirm('¿Desactivar este usuario? No podrá iniciar sesión.')) return;
  const fd=new FormData(); fd.append('action','desactivar'); fd.append('csrf_token',CSRF_TOKEN); fd.append('id',id);
  const r=await fetch('api/usuarios.php',{method:'POST',body:fd}), data=await r.json();
  if(data.success){toast('Desactivado','success');cargarUsuarios();}else toast(data.message,'error');
}

document.addEventListener('DOMContentLoaded', () => {
  const fu=document.getElementById('formUsuario'); if(fu)fu.addEventListener('submit',submitUsuario);
  const selRol=document.getElementById('usuario_rol'); if(selRol)selRol.addEventListener('change',actualizarSeccionModulos);

  // Preview imagen evento telemetría
  const imgInput=document.getElementById('amon_imagen_evento');
  if(imgInput)imgInput.addEventListener('change',e=>{const file=e.target.files[0],prev=document.getElementById('amon_imagen_preview'),img=document.getElementById('amon_img_thumb');if(file&&prev&&img){img.src=URL.createObjectURL(file);prev.style.display='block';}});

  // Sincronizar checkboxes plan_acciones
  document.querySelectorAll('.plan-accion-check').forEach(cb=>{cb.addEventListener('change',()=>{const vals=[...document.querySelectorAll('.plan-accion-check:checked')].map(c=>c.value).join(', ');const h=document.getElementById('amon_plan_acciones');if(h)h.value=vals;});});
});
