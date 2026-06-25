// ============================================================
// DISTRIBUCIÓN SEGURA — MÓDULO: INSPECCIONES
// Listado, detalle, guardar, eliminar, PDF, Excel
// ============================================================

// ── Submit formulario inspección ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const formInsp = document.getElementById('formInspeccion');
  if (!formInsp) return;
  formInsp.addEventListener('submit', async e => {
    e.preventDefault();
    const btn=document.getElementById('btnGuardar');
    btn.disabled=true; btn.innerHTML='<div class="spinner"></div> Guardando...';
    const archivos=filesSeleccionados.filter(Boolean);
    if (archivos.length<2) {
      toast('Se requieren mínimo 2 imágenes de evidencia','error');
      btn.disabled=false; btn.innerHTML='<i class="fas fa-save"></i> Guardar Inspección'; return;
    }
    // Validar duplicados de nombres en la tripulación
    const tripData = obtenerTripulacion();
    const nombresNorm = tripData.map(t => t.nombre.trim().toUpperCase().replace(/\s+/g,' '));
    const duplicado = nombresNorm.find((n,i) => n && nombresNorm.indexOf(n) !== i);
    if (duplicado) {
      toast(`No se puede guardar: "${duplicado}" está repetido en la tripulación. Cada miembro debe ser una persona distinta.`,'error',6000);
      btn.disabled=false; btn.innerHTML='<i class="fas fa-save"></i> Guardar Inspección'; return;
    }
    const fd=new FormData();
    fd.append('csrf_token', CSRF_TOKEN);
    fd.append('unidad',       document.getElementById('f_unidad').value.toUpperCase());
    fd.append('fecha',        document.getElementById('f_fecha').value);
    fd.append('hora',         document.getElementById('f_hora').value);
    fd.append('provincia',    document.getElementById('f_provincia').value);
    fd.append('distrito',     document.getElementById('f_distrito').value);
    fd.append('direccion',    document.getElementById('f_direccion').value);
    fd.append('conductor',    document.getElementById('trip_conductor_nombre')?.value||'');
    fd.append('reparto',      document.getElementById('trip_reparto_nombre')?.value||'');
    fd.append('observaciones',document.getElementById('f_observaciones').value);
    fd.append('latitud',      document.getElementById('f_latitud').value);
    fd.append('longitud',     document.getElementById('f_longitud').value);
    fd.append('tripulacion',  JSON.stringify(tripData));
    fd.append('checklist',    JSON.stringify(obtenerChecklist()));
    fd.append('hallazgos',    JSON.stringify(hallazgosData.filter(h=>h.descripcion.trim())));
    if (firmaHasContent) fd.append('firma_digital', document.getElementById('firmaCanvas').toDataURL());
    archivos.forEach(f=>fd.append('evidencias[]',f));
    try {
      const resp=await fetch('api/guardar_inspeccion.php',{method:'POST',body:fd});
      const data=await resp.json();
      if (data.success) { toast(`✔ Inspección guardada · ${data.data.resultado}% cumplimiento`,'success',5000); resetForm(); switchInspeccionTab('listado'); }
      else toast(data.message||'Error al guardar','error');
    } catch { toast('Error de conexión con el servidor','error'); }
    btn.disabled=false; btn.innerHTML='<i class="fas fa-save"></i> Guardar Inspección';
  });
});

// ── Listado ──────────────────────────────────────────────────
async function cargarListado(page=1) {
  pageActual=page;
  const params=new URLSearchParams({ fecha_desde:document.getElementById('filtroDesde')?.value||'', fecha_hasta:document.getElementById('filtroHasta')?.value||'', unidad:document.getElementById('filtroUnidad')?.value||'', conductor:document.getElementById('filtroConductor')?.value||'', page, limit:20 });
  document.getElementById('tablaBody').innerHTML='<tr><td colspan="9" style="text-align:center;padding:32px"><div class="spinner"></div></td></tr>';
  try {
    const resp=await fetch('api/listar_inspecciones.php?'+params);
    const data=await resp.json();
    if (!data.success) return;
    inspeccionesData=data.data.inspecciones;
    renderTabla(inspeccionesData); renderPaginacion(data.data);
  } catch(e) { console.error(e); }
}

function renderTabla(rows) {
  const tbody=document.getElementById('tablaBody');
  if (!rows.length) { tbody.innerHTML='<tr><td colspan="9" style="text-align:center;padding:32px;color:var(--gris-400)"><i class="fas fa-inbox" style="font-size:32px;display:block;margin-bottom:12px"></i>Sin inspecciones</td></tr>'; return; }
  tbody.innerHTML=rows.map(r => {
    const pct=parseFloat(r.resultado)||0, bClass=pct>=80?'badge-success':pct>=60?'badge-warning':'badge-danger';
    return `<tr>
      <td class="muted">#${r.id}</td>
      <td><strong style="color:var(--amarillo);font-family:var(--font-display);font-size:15px">${r.unidad}</strong></td>
      <td class="muted">${r.fecha}<br><small>${r.hora?.slice(0,5)}</small></td>
      <td>${r.conductor}</td>
      <td class="muted" style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${r.distrito} · ${r.provincia}</td>
      <td><span class="badge ${bClass}">${pct}%</span></td>
      <td class="muted">${r.inspector_nombre||'—'}</td>
      <td><span class="badge ${r.num_evidencias>=2?'badge-success':'badge-warning'}"><i class="fas fa-camera"></i> ${r.num_evidencias}</span></td>
      <td><div style="display:flex;gap:6px">
        <button class="btn btn-outline btn-sm btn-icon" onclick="verDetalle(${r.id})" title="Ver detalle"><i class="fas fa-eye"></i></button>
        <button class="btn btn-secondary btn-sm btn-icon" onclick="generarPDF(${r.id})" title="PDF"><i class="fas fa-file-pdf"></i></button>
        ${USER_ROL==='administrador'?`<button class="btn btn-danger btn-sm btn-icon" onclick="confirmarEliminar(${r.id})" title="Eliminar"><i class="fas fa-trash"></i></button>`:''}
      </div></td>
    </tr>`;
  }).join('');
}

function renderPaginacion(data) {
  document.getElementById('paginacionInfo').textContent=`Mostrando ${data.inspecciones.length} de ${data.total} inspecciones`;
  const c=document.getElementById('paginacionBtns'); c.innerHTML='';
  for (let i=1;i<=data.pages;i++) { const btn=document.createElement('button'); btn.className=`btn btn-sm ${i===data.page?'btn-primary':'btn-secondary'}`; btn.textContent=i; btn.onclick=()=>cargarListado(i); c.appendChild(btn); }
}

function limpiarFiltros() {
  document.getElementById('filtroDesde').value=''; document.getElementById('filtroHasta').value='';
  document.getElementById('filtroUnidad').value=''; document.getElementById('filtroConductor').value='';
  cargarListado();
}

// ── Detalle ───────────────────────────────────────────────────
async function verDetalle(id) {
  document.getElementById('modalDetalleBody').innerHTML='<div style="text-align:center;padding:48px"><div class="spinner"></div></div>';
  abrirModal('modalDetalle');
  const resp=await fetch(`api/obtener_detalle.php?id=${id}&_t=${Date.now()}`);
  const data=await resp.json();
  if (!data.success) { document.getElementById('modalDetalleBody').innerHTML='<p>Error</p>'; return; }
  const d=data.data, i=d.inspeccion, pct=parseFloat(i.resultado)||0, colorPct=pct>=80?'var(--verde)':pct>=60?'var(--naranja)':'var(--rojo)';
  galeriaFotos=(d.evidencias||[]).map(ev=>UPLOAD_URL+ev.ruta_imagen);
  document.getElementById('modalDetalleBody').innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;align-items:flex-start;margin-bottom:14px;padding-bottom:14px;border-bottom:2px solid rgba(21,101,192,0.2)">
      <div>
        <div style="font-family:var(--font-display);font-size:30px;font-weight:900;color:var(--amarillo);letter-spacing:2px;line-height:1">${i.unidad}</div>
        <div style="color:var(--gris-300);margin-top:6px;font-size:12px;display:flex;flex-wrap:wrap;gap:10px">
          <span><i class="fas fa-calendar-alt" style="color:var(--amarillo);margin-right:4px"></i>${i.fecha}</span>
          <span><i class="fas fa-clock" style="color:var(--amarillo);margin-right:4px"></i>${i.hora?.slice(0,5)}</span>
          <span><i class="fas fa-map-marker-alt" style="color:var(--amarillo);margin-right:4px"></i>${i.distrito}, ${i.provincia}</span>
        </div>
        <div style="color:var(--gris-400);font-size:11px;margin-top:3px"><i class="fas fa-road" style="margin-right:4px;color:var(--amarillo)"></i>${i.direccion}</div>
        <div style="margin-top:10px;background:#F5F7FA;border-radius:8px;padding:12px 16px;border:1px solid #E6E9ED;display:flex;align-items:center;gap:16px">
          <div style="text-align:center;flex-shrink:0">
            <div style="font-family:var(--font-display);font-size:36px;font-weight:900;color:${colorPct};line-height:1">${pct}%</div>
            <div style="font-size:9px;color:#98A6AD;text-transform:uppercase;letter-spacing:1px;margin-top:2px">Cumplimiento</div>
            <div style="margin-top:6px"><span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:${pct>=80?'rgba(38,185,154,0.12)':pct>=60?'rgba(243,156,18,0.12)':'rgba(231,76,60,0.12)'};color:${colorPct};border:1px solid ${colorPct}">${pct>=80?'✔ APROBADO':pct>=60?'⚠ EN OBSERVACIÓN':'✖ DESAPROBADO'}</span></div>
          </div>
          <div style="flex:1;min-width:0">${(()=>{
            const pctCh=Math.min(100,Math.round(parseFloat(i.pct_checklist)||0)), cCh=pctCh>=80?'var(--verde)':pctCh>=60?'var(--naranja)':'var(--rojo)';
            const pctEp=Math.min(100,Math.round(parseFloat(i.pct_epp)||0)), cEp=pctEp>=80?'var(--verde)':pctEp>=60?'var(--naranja)':'var(--rojo)';
            return `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:11px;color:#73879C;font-weight:600"><i class="fas fa-list-check" style="color:var(--primary);margin-right:4px"></i>Checklist <span style="color:#98A6AD;font-size:10px">(70%)</span></span><span style="font-size:11px;font-weight:700;color:${cCh}">${pctCh}%</span></div><div style="height:6px;background:#E6E9ED;border-radius:3px;overflow:hidden"><div style="height:100%;width:${pctCh}%;background:${cCh};border-radius:3px;transition:width .5s"></div></div></div>
            <div><div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:11px;color:#73879C;font-weight:600"><i class="fas fa-hard-hat" style="color:var(--primary);margin-right:4px"></i>EPP <span style="color:#98A6AD;font-size:10px">(30%)</span></span><span style="font-size:11px;font-weight:700;color:${cEp}">${pctEp}%</span></div><div style="height:6px;background:#E6E9ED;border-radius:3px;overflow:hidden"><div style="height:100%;width:${pctEp}%;background:${cEp};border-radius:3px;transition:width .5s"></div></div></div>`;
          })()}</div>
        </div>
      </div>
      <div style="min-height:220px">${i.latitud&&i.longitud?`<div style="border-radius:12px;overflow:hidden;border:2px solid rgba(21,101,192,0.2);height:100%;min-height:220px;position:relative"><iframe src="https://maps.google.com/maps?q=${i.latitud},${i.longitud}&z=16&output=embed&hl=es" style="width:100%;height:100%;border:0;display:block;min-height:220px" loading="lazy"></iframe><a href="https://maps.google.com/?q=${i.latitud},${i.longitud}" target="_blank" style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.75);color:#fff;font-size:11px;padding:4px 10px;border-radius:20px;text-decoration:none;border:1px solid rgba(255,255,255,0.2)"><i class="fas fa-external-link-alt"></i> Ver en Google Maps</a></div>`:`<div style="border-radius:12px;background:var(--gris-700);height:100%;min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px dashed rgba(255,255,255,0.15);color:var(--gris-400);gap:10px"><i class="fas fa-map-marker-slash" style="font-size:32px"></i><span style="font-size:13px">Sin coordenadas GPS</span></div>`}</div>
    </div>
    <div style="margin-bottom:14px">
      <div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--amarillo);text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;display:flex;align-items:center;gap:8px"><i class="fas fa-users"></i> Tripulación y EPP</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px">
        ${(()=>{
          // Reasignar rol por POSICIÓN para mostrar siempre lo registrado correctamente,
          // independientemente de cómo esté guardado el campo `rol` en la BD (datos legacy).
          // Posición 1 → conductor, 2 → reparto, 3+ → auxiliar
          let auxN=0;
          return d.tripulacion.map((t,idx)=>{
            const rolReal = idx===0?'conductor':idx===1?'reparto':'auxiliar';
            if(rolReal==='auxiliar') auxN++;
            const totalAux = d.tripulacion.length - 2;
            return {...t, _rolReal:rolReal, _auxNum:auxN, _totalAux:totalAux};
          });
        })().map(t=>{
          const epps=Array.isArray(t.epp_detalle)?t.epp_detalle:[],
                todosEpp=['Casco','Chaleco reflectivo','Zapatos de seguridad','Lentes','Guantes'],
                rolLabelBase={'conductor':'Conductor','reparto':'Reparto','auxiliar':'Auxiliar'}[t._rolReal],
                rolLabel=t._rolReal==='auxiliar'&&t._totalAux>1?`${rolLabelBase} ${t._auxNum}`:rolLabelBase,
                rolColor={'conductor':'var(--azul)','reparto':'var(--verde)','auxiliar':'var(--naranja)'}[t._rolReal];
          return`<div style="background:var(--gris-700);border-radius:8px;padding:8px 10px;border-left:3px solid ${t.epp_completo?'var(--verde)':'var(--rojo)'}">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <div>
                <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${rolColor}">${rolLabel}</div>
                <div style="font-weight:700;color:var(--gris-100);font-size:15px;margin-top:1px">${t.nombre}</div>
              </div>
              <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;white-space:nowrap;background:${t.epp_completo?'rgba(46,204,113,0.15)':'rgba(231,76,60,0.15)'};color:${t.epp_completo?'var(--verde)':'var(--rojo)'};border:1px solid ${t.epp_completo?'rgba(46,204,113,0.4)':'rgba(231,76,60,0.4)'}">
                <i class="fas fa-hard-hat"></i> ${t.epp_completo?'Completo':'Incompleto'}
              </span>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:5px">
              ${todosEpp.map(e=>{const tiene=epps.includes(e);return`<span style="font-size:10px;padding:2px 8px;border-radius:12px;background:${tiene?'rgba(46,204,113,0.12)':'rgba(231,76,60,0.08)'};color:${tiene?'var(--verde)':'rgba(231,76,60,0.7)'};border:1px solid ${tiene?'rgba(46,204,113,0.3)':'rgba(231,76,60,0.2)'};font-weight:600">${tiene?'✔':'✖'} ${e}</span>`;}).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08)">
      <div>
        <div style="margin-bottom:14px"><div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--amarillo);text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;display:flex;align-items:center;gap:8px"><i class="fas fa-list-check"></i> Checklist Vehículo</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">${d.checklist.map(c=>`<div style="display:flex;align-items:center;gap:8px;background:${c.estado?'rgba(46,204,113,0.07)':'rgba(231,76,60,0.07)'};border:1px solid ${c.estado?'rgba(46,204,113,0.25)':'rgba(231,76,60,0.2)'};border-radius:6px;padding:5px 8px"><span style="font-size:14px;flex-shrink:0;color:${c.estado?'var(--verde)':'var(--rojo)'}">${c.estado?'✔':'✖'}</span><span style="font-size:12px;color:var(--gris-100);line-height:1.3">${c.item}</span></div>`).join('')}</div></div>
        ${d.hallazgos.length?`<div style="margin-bottom:14px"><div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--amarillo);text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;display:flex;align-items:center;gap:8px"><i class="fas fa-triangle-exclamation"></i> Hallazgos (${d.hallazgos.length})</div><div style="display:flex;flex-direction:column;gap:6px">${d.hallazgos.map(h=>`<div style="display:flex;align-items:flex-start;gap:10px;background:var(--gris-700);border-radius:8px;padding:10px 12px;border-left:3px solid ${h.criticidad==='alta'?'var(--rojo)':h.criticidad==='media'?'var(--naranja)':'var(--azul)'}"><span style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:1px;padding:2px 8px;border-radius:12px;white-space:nowrap;margin-top:1px;background:${h.criticidad==='alta'?'rgba(231,76,60,0.2)':h.criticidad==='media'?'rgba(243,156,18,0.2)':'rgba(52,152,219,0.2)'};color:${h.criticidad==='alta'?'var(--rojo)':h.criticidad==='media'?'var(--naranja)':'var(--azul)'}">${h.criticidad}</span><span style="font-size:13px;color:var(--gris-100)">${h.descripcion}</span></div>`).join('')}</div></div>`:''}
        ${i.observaciones?`<div style="margin-bottom:14px"><div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--amarillo);text-transform:uppercase;letter-spacing:2px;margin-bottom:10px"><i class="fas fa-comment-alt"></i> Observaciones</div><div style="background:var(--gris-700);border-radius:10px;padding:10px 12px;font-size:14px;color:var(--gris-100);line-height:1.6;border-left:3px solid rgba(21,101,192,0.4)">${i.observaciones}</div></div>`:''}
        <div style="background:var(--gris-700);border-radius:12px;padding:16px;border:1px solid var(--gris-500)">
          <div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--amarillo);text-transform:uppercase;letter-spacing:2px;margin-bottom:12px"><i class="fas fa-signature"></i> Inspector Responsable</div>
          <div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap">
            <div style="flex:1;min-width:140px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px"><div style="width:42px;height:42px;border-radius:50%;background:rgba(245,200,0,0.15);border:2px solid rgba(245,200,0,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0"><i class="fas fa-user-shield" style="color:var(--amarillo);font-size:18px"></i></div><div><div style="font-weight:700;color:var(--gris-100);font-size:15px">${i.inspector_nombre||'—'}</div><div style="font-size:11px;color:var(--gris-400);text-transform:uppercase;letter-spacing:1px">${i.inspector_usuario?'@'+i.inspector_usuario:'Inspector'}</div></div></div>
              <div style="font-size:11px;color:var(--gris-400)"><i class="fas fa-clock" style="margin-right:4px"></i>Registrado: ${i.creado_en?i.creado_en.slice(0,16).replace('T',' '):i.fecha+' '+(i.hora?.slice(0,5)||'')}</div></div>
            ${i.firma_digital?`<div style="flex-shrink:0"><div style="font-size:10px;color:var(--gris-400);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Firma digital</div><div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:8px;border:1px solid var(--gris-500)"><img src="${i.firma_digital}" style="max-width:200px;max-height:90px;display:block"></div></div>`:`<div style="flex-shrink:0;color:var(--gris-400);font-size:12px;padding:10px 0"><i class="fas fa-pen-slash"></i> Sin firma digital</div>`}
          </div>
        </div>
      </div>
      <div>
        <div style="font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--amarillo);text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;display:flex;align-items:center;gap:8px"><i class="fas fa-camera"></i> Evidencias Fotográficas <span style="font-size:11px;color:var(--gris-400);font-family:var(--font-body);text-transform:none;letter-spacing:0;font-weight:400">(${d.evidencias.length} foto${d.evidencias.length!==1?'s':''})</span></div>
        ${d.evidencias.length?`<div style="display:grid;grid-template-columns:${d.evidencias.length===1?'1fr':'1fr 1fr'};gap:10px">${d.evidencias.map((ev,idx)=>`<div onclick="abrirGaleria(${idx})" style="border-radius:12px;overflow:hidden;cursor:pointer;position:relative;background:#111;border:2px solid rgba(255,255,255,0.08);transition:border-color 0.2s,transform 0.15s;aspect-ratio:${d.evidencias.length===1?'16/9':'4/3'}" onmouseover="this.style.borderColor='var(--amarillo)';this.style.transform='scale(1.02)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)';this.style.transform='scale(1)'"><img src="${UPLOAD_URL}${ev.ruta_imagen}" style="width:100%;height:100%;object-fit:cover;display:block" onerror="onEvidenciaError(this)"><div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.8));padding:10px;display:flex;align-items:center;justify-content:space-between"><span style="font-size:11px;color:#fff;font-weight:600"><i class="fas fa-search-plus"></i> Foto ${idx+1}/${d.evidencias.length}</span><span style="font-size:10px;color:rgba(255,255,255,0.6)">Clic para ampliar</span></div></div>`).join('')}</div>`:`<div style="background:var(--gris-700);border-radius:10px;padding:40px;text-align:center;color:var(--gris-400)"><i class="fas fa-camera-slash" style="font-size:32px;margin-bottom:10px;display:block"></i>Sin evidencias fotográficas</div>`}
      </div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:24px;padding-top:18px;border-top:1px solid rgba(255,255,255,0.08)">
      <button class="btn btn-secondary" onclick="cerrarModal('modalDetalle')"><i class="fas fa-times"></i> Cerrar</button>
      <button class="btn btn-primary" onclick="generarPDF(${i.id})"><i class="fas fa-file-pdf"></i> Descargar PDF</button>
    </div>`;
}

// ── Eliminar ──────────────────────────────────────────────────
function confirmarEliminar(id) { if(!confirm('¿Seguro que deseas eliminar esta inspección? Esta acción no se puede deshacer.')) return; eliminarInspeccion(id); }
async function eliminarInspeccion(id) {
  const fd=new FormData(); fd.append('id',id); fd.append('csrf_token',CSRF_TOKEN);
  const resp=await fetch('api/eliminar.php',{method:'POST',body:fd});
  const data=await resp.json();
  if (data.success) { toast('Inspección eliminada','success'); cargarListado(pageActual); }
  else toast(data.message||'Error al eliminar','error');
}

// ── Excel / PDF / Reportes ────────────────────────────────────
function exportarExcel() {
  if (!inspeccionesData.length) { toast('No hay datos para exportar','warning'); return; }
  const ws=XLSX.utils.json_to_sheet(inspeccionesData.map(r=>({ID:r.id,Unidad:r.unidad,Fecha:r.fecha,Hora:r.hora,Conductor:r.conductor,Reparto:r.reparto,'Cumplimiento %':r.resultado,Inspector:r.inspector_nombre,Evidencias:r.num_evidencias,Hallazgos:r.num_hallazgos})));
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Inspecciones');
  XLSX.writeFile(wb,`inspecciones_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('Excel generado correctamente','success');
}
async function generarPDF(id) { toast('Generando PDF...','info'); window.open(`api/generar_pdf.php?id=${id}`,'_blank'); }
function generarReporteMes() { const mes=document.getElementById('filtroMes')?.value||new Date().toISOString().slice(0,7); window.open(`api/reporte_mensual.php?mes=${mes}`,'_blank'); }