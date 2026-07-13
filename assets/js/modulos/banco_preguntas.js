// ============================================================
// DISTRIBUCIÓN SEGURA — MÓDULO: BANCO DE PREGUNTAS (admin)
// ============================================================

let bpTabActual = '';
let bpOpcionesCount = 0;
let bpFormulariosCache = [];   // [{formulario_id, titulo, icono, color, orden}]

// Almacén de datos de secciones y preguntas para evitar JSON inline en onclick
const bpSecMap  = {};   // key: db_id  → objeto sección
const bpItemMap = {};   // key: db_id  → objeto { formulario, sec_db_id, tipo_seccion, item, texto }
const bpFormMap = {};   // key: formulario_id → objeto formulario

// ── Cargar y renderizar formularios (tabs + paneles) ──────────
async function bpCargarFormularios() {
  try {
    const resp = await fetch('api/banco_preguntas/formularios.php');
    const data = await resp.json();
    if (!data.success) throw new Error(data.message);
    bpFormulariosCache = data.data;
    bpFormulariosCache.forEach(f => { bpFormMap[f.formulario_id] = f; });
    bpRenderTabs();
  } catch (e) {
    document.getElementById('bp-tabs-bar').innerHTML =
      `<span style="color:var(--rojo)"><i class="fas fa-triangle-exclamation"></i> Error al cargar: ${e.message}</span>`;
  }
}

function bpRenderTabs() {
  const tabsBar = document.getElementById('bp-tabs-bar');
  const panelsCon = document.getElementById('bp-panels-container');
  if (!tabsBar || !panelsCon) return;

  // Renderizar botones de tab
  tabsBar.innerHTML = bpFormulariosCache.map((f, i) => `
    <button class="bp-tab-btn${i === 0 ? ' active' : ''}" id="bp-tab-${f.formulario_id}"
            onclick="bpSwitchTab('${f.formulario_id}')">
      <i class="fas ${f.icono}" style="color:${f.color}"></i> ${bpEsc(f.titulo)}
    </button>`).join('');

  // Renderizar paneles
  panelsCon.innerHTML = bpFormulariosCache.map((f, i) => `
    <div class="bp-panel" id="bp-panel-${f.formulario_id}" style="display:${i === 0 ? 'block' : 'none'}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" onclick="bpNuevaPregunta('${f.formulario_id}')">
          <i class="fas fa-plus"></i> Nueva pregunta
        </button>
        <button class="btn btn-outline btn-sm" onclick="bpNuevaSeccion('${f.formulario_id}')">
          <i class="fas fa-layer-group"></i> Nueva sección
        </button>
        <div style="flex:1"></div>
        <button class="btn btn-outline btn-sm" onclick="bpEditarFormulario('${f.formulario_id}')" title="Editar este formulario">
          <i class="fas fa-pen"></i>
        </button>
        <button class="btn btn-outline btn-sm" onclick="bpExportar('${f.formulario_id}')" title="Exportar como Excel">
          <i class="fas fa-file-excel"></i> Exportar
        </button>
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('bp-import-file-${f.formulario_id}').click()" title="Importar Excel">
          <i class="fas fa-file-import"></i> Importar
        </button>
        <input type="file" id="bp-import-file-${f.formulario_id}" accept=".xlsx,.xls" style="display:none"
               onchange="bpImportar('${f.formulario_id}', this)">
      </div>
      <div id="bp-content-${f.formulario_id}">
        <div style="text-align:center;padding:48px;color:var(--gris-500)">
          <div class="spinner" style="margin:0 auto 12px"></div>Cargando preguntas...
        </div>
      </div>
    </div>`).join('');

  // Cargar el primer tab
  if (bpFormulariosCache.length > 0) {
    bpTabActual = bpFormulariosCache[0].formulario_id;
    bpCargarPanel(bpTabActual);
  }
}

function bpSwitchTab(tab) {
  document.querySelectorAll('.bp-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.bp-panel').forEach(p => p.style.display = 'none');
  const tabBtn = document.getElementById('bp-tab-' + tab);
  const tabPanel = document.getElementById('bp-panel-' + tab);
  if (tabBtn) tabBtn.classList.add('active');
  if (tabPanel) tabPanel.style.display = 'block';
  bpTabActual = tab;
  bpCargarPanel(tab);
}

// ── Cargar secciones + preguntas ─────────────────────────────
async function bpCargarPanel(formulario) {
  const container = document.getElementById('bp-content-' + formulario);
  container.innerHTML = '<div style="text-align:center;padding:48px;color:var(--gris-500)"><div class="spinner" style="margin:0 auto 12px"></div>Cargando...</div>';

  try {
    const resp = await fetch(`api/banco_preguntas/secciones.php?formulario=${formulario}`);
    const data = await resp.json();
    if (!data.success) throw new Error(data.message);
    bpRenderPanel(formulario, data.data);
  } catch (e) {
    container.innerHTML = `<p style="color:var(--rojo);padding:20px;text-align:center"><i class="fas fa-triangle-exclamation"></i> ${e.message}</p>`;
  }
}

function bpRenderPanel(formulario, secciones) {
  const container = document.getElementById('bp-content-' + formulario);
  if (!secciones.length) {
    container.innerHTML = '<div style="text-align:center;padding:48px;color:var(--gris-500)"><i class="fas fa-inbox" style="font-size:32px;display:block;margin-bottom:12px"></i>Sin secciones. Usa "Nueva sección" para comenzar.</div>';
    return;
  }

  let html = '';
  for (const sec of secciones) {
    const tipoLabel = sec.tipo === 'aplica_grid' ? 'Aplica / No Aplica' : 'Opción Múltiple';
    const items     = sec.tipo === 'aplica_grid' ? (sec.items || []) : (sec.preguntas || []);
    const puntosStr = sec.puntos > 0 ? `${sec.puntos} pts` : '';

    // Guardar sección en mapa para onclick seguro
    bpSecMap[sec.db_id] = { formulario, sec };

    html += `
    <div class="card" style="margin-bottom:16px">
      <div class="card-header" style="cursor:default">
        <div style="display:flex;align-items:center;gap:10px;flex:1;flex-wrap:wrap">
          <h3 style="margin:0;font-size:14px">${bpEsc(sec.titulo)}</h3>
          <span class="badge" style="background:rgba(21,101,192,0.15);color:var(--primary);font-size:10px">${tipoLabel}</span>
          ${puntosStr ? `<span class="badge badge-yellow">${puntosStr}</span>` : ''}
          <span style="font-size:12px;color:var(--gris-400)">${items.length} pregunta${items.length !== 1 ? 's' : ''}</span>
        </div>
        <div style="display:flex;gap:6px">
          <button class="btn btn-outline btn-sm" onclick="bpEditarSeccionById(${sec.db_id})" title="Editar sección">
            <i class="fas fa-pen"></i>
          </button>
          <button class="btn btn-outline btn-sm" style="color:var(--rojo);border-color:var(--rojo)" onclick="bpEliminarSeccion(${sec.db_id}, '${formulario}')" title="Eliminar sección">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="card-body" style="padding:0">`;

    if (!items.length) {
      html += `<p style="color:var(--gris-400);font-size:13px;padding:16px 20px">Sin preguntas. Usa "Nueva pregunta" y selecciona esta sección.</p>`;
    } else {
      html += `<table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="border-bottom:1px solid var(--gris-700)">
            <th style="text-align:left;padding:8px 16px;font-size:11px;color:var(--gris-400);font-weight:600;width:40px">#</th>
            <th style="text-align:left;padding:8px 16px;font-size:11px;color:var(--gris-400);font-weight:600">Texto</th>
            ${sec.tipo === 'multiple_choice' ? '<th style="text-align:center;padding:8px 12px;font-size:11px;color:var(--gris-400);font-weight:600;width:60px">Pts</th><th style="text-align:left;padding:8px 16px;font-size:11px;color:var(--gris-400);font-weight:600">Respuesta correcta</th>' : ''}
            <th style="width:88px"></th>
          </tr>
        </thead>
        <tbody>`;

      items.forEach((item, i) => {
        const texto = sec.tipo === 'aplica_grid' ? item.label : item.texto;

        // Guardar datos del item en mapa para onclick seguro
        if (item.db_id) {
          bpItemMap[item.db_id] = { formulario, sec_db_id: sec.db_id, tipo_seccion: sec.tipo, item };
        }

        let correctaCell = '';
        if (sec.tipo === 'multiple_choice') {
          const correctaId  = item.respuesta_correcta ?? '';
          const opCorrecta  = (item.opciones || []).find(o => o.id === correctaId);
          correctaCell = `
            <td style="text-align:center;padding:10px 12px;font-size:13px;color:var(--amarillo)">${item.puntos}</td>
            <td style="padding:10px 16px">
              <span style="font-weight:700;color:var(--verde);font-size:13px">${bpEsc(correctaId) || '—'}</span>
              ${opCorrecta ? `<span style="display:block;font-size:11px;color:var(--gris-300);margin-top:2px">${bpEsc(opCorrecta.texto)}</span>` : ''}
            </td>`;
        }

        html += `<tr style="border-bottom:1px solid var(--gris-600)">
          <td style="padding:10px 16px;font-size:12px;color:var(--gris-400);font-weight:600">${i + 1}</td>
          <td style="padding:10px 16px;font-size:13px;color:var(--gris-100)">${bpEsc(texto)}</td>
          ${correctaCell}
          <td style="padding:8px 12px;text-align:right">
            <button class="btn btn-outline btn-sm" style="margin-right:4px"
              onclick="bpEditarPreguntaById(${item.db_id})"
              title="Editar">
              <i class="fas fa-pen"></i>
            </button>
            <button class="btn btn-outline btn-sm" style="color:var(--rojo);border-color:var(--rojo)"
              onclick="bpEliminarPregunta(${item.db_id}, '${formulario}')"
              title="Eliminar">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        </tr>`;
      });

      html += `</tbody></table>`;
    }

    html += `</div></div>`;
  }

  container.innerHTML = html;
}

// Escapa texto para uso seguro en innerHTML
function bpEsc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Puentes por ID (evitan JSON inline en onclick) ────────────
function bpEditarSeccionById(dbId) {
  const entry = bpSecMap[dbId];
  if (!entry) return;
  bpEditarSeccion(entry.formulario, dbId, entry.sec);
}

function bpEditarPreguntaById(dbId) {
  const d = bpItemMap[dbId];
  if (!d) return;
  const texto = d.tipo_seccion === 'aplica_grid' ? d.item.label : d.item.texto;
  bpEditarPregunta({ formulario: d.formulario, sec_db_id: d.sec_db_id, tipo_seccion: d.tipo_seccion, item: d.item, texto });
}

// ── Nueva sección ─────────────────────────────────────────────
function bpNuevaSeccion(formulario) {
  document.getElementById('bpSecId').value         = '';
  document.getElementById('bpSecFormulario').value  = formulario;
  document.getElementById('bpSecSeccionId').value   = '';
  document.getElementById('bpSecSeccionId').disabled = false;
  document.getElementById('bpSecTipo').value        = 'aplica_grid';
  document.getElementById('bpSecTipo').disabled     = false;
  document.getElementById('bpSecTitulo').value      = '';
  document.getElementById('bpSecDescripcion').value = '';
  document.getElementById('bpSecPuntos').value      = '0';
  document.getElementById('bpSecOrden').value       = '1';
  document.getElementById('bpSeccionModalTitulo').textContent = 'Nueva Sección';
  abrirModal('modalBpSeccion');
}

function bpEditarSeccion(formulario, dbId, sec) {
  const s = typeof sec === 'string' ? JSON.parse(sec) : sec;
  document.getElementById('bpSecId').value          = dbId;
  document.getElementById('bpSecFormulario').value   = formulario;
  document.getElementById('bpSecSeccionId').value    = s.id;
  document.getElementById('bpSecSeccionId').disabled = true;
  document.getElementById('bpSecTipo').value         = s.tipo;
  document.getElementById('bpSecTipo').disabled      = true;
  document.getElementById('bpSecTitulo').value       = s.titulo;
  document.getElementById('bpSecDescripcion').value  = s.descripcion || '';
  document.getElementById('bpSecPuntos').value       = s.puntos;
  document.getElementById('bpSecOrden').value        = s.orden ?? 1;
  document.getElementById('bpSeccionModalTitulo').textContent = 'Editar Sección';
  abrirModal('modalBpSeccion');
}

async function bpGuardarSeccion() {
  const btn = document.getElementById('btnGuardarBpSeccion');
  btn.disabled = true;

  const fd = new FormData();
  fd.append('csrf_token',   CSRF_TOKEN);
  fd.append('id',           document.getElementById('bpSecId').value);
  fd.append('formulario',   document.getElementById('bpSecFormulario').value);
  fd.append('seccion_id',   document.getElementById('bpSecSeccionId').value);
  fd.append('titulo',       document.getElementById('bpSecTitulo').value);
  fd.append('descripcion',  document.getElementById('bpSecDescripcion').value);
  fd.append('tipo',         document.getElementById('bpSecTipo').value);
  fd.append('puntos',       document.getElementById('bpSecPuntos').value);
  fd.append('orden',        document.getElementById('bpSecOrden').value);

  try {
    const resp = await fetch('api/banco_preguntas/guardar_seccion.php', { method: 'POST', body: fd });
    const data = await resp.json();
    if (data.success) {
      toast(data.message, 'success');
      cerrarModal('modalBpSeccion');
      bpCargarPanel(document.getElementById('bpSecFormulario').value);
    } else {
      toast(data.message || 'Error al guardar.', 'error');
    }
  } catch {
    toast('Error de conexión.', 'error');
  }
  btn.disabled = false;
}

// ── Nueva / Editar pregunta ───────────────────────────────────
function bpNuevaPregunta(formulario) {
  document.getElementById('bpPregId').value           = '';
  document.getElementById('bpPregFormulario').value    = formulario;
  document.getElementById('bpPregSeccionDbId').value   = '';
  document.getElementById('bpPregTipoSeccion').value   = '';
  document.getElementById('bpPregPreguntaId').value    = '';
  document.getElementById('bpPregPreguntaId').disabled = false;
  document.getElementById('bpPregTexto').value         = '';
  document.getElementById('bpPregPuntos').value        = '1';
  document.getElementById('bpPregOrden').value         = '0';
  document.getElementById('bpOpcionesSection').style.display = 'none';
  document.getElementById('bpOpcionesList').innerHTML  = '';
  document.getElementById('bpRespuestaCorrecta').innerHTML = '<option value="">— Selecciona —</option>';
  bpOpcionesCount = 0;

  // Necesitamos elegir sección: mostrar selector
  bpMostrarSelectorSeccion(formulario, null);
}

function bpMostrarSelectorSeccion(formulario, callback) {
  // Cargar secciones del formulario para que el usuario elija
  fetch(`api/banco_preguntas/secciones.php?formulario=${formulario}`)
    .then(r => r.json())
    .then(data => {
      if (!data.success || !data.data.length) {
        toast('Primero crea una sección.', 'error'); return;
      }
      const secciones = data.data;
      // Si solo hay una sección, seleccionarla directamente
      if (secciones.length === 1) {
        bpAbrirModalPregunta(formulario, secciones[0].db_id, secciones[0].tipo);
        return;
      }
      // Generar select inline con las secciones disponibles
      const opts = secciones.map(s => `<option value="${s.db_id}" data-tipo="${s.tipo}">${s.titulo}</option>`).join('');
      const dlg = `<div style="position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center" id="bpSecSelector">
        <div style="background:var(--gris-800);border-radius:12px;padding:24px;width:380px;max-width:95vw">
          <h4 style="margin-bottom:16px;color:var(--gris-100)"><i class="fas fa-layer-group"></i> Seleccionar sección</h4>
          <select class="form-control" id="bpSecSelectorInput">${opts}</select>
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('bpSecSelector').remove()">Cancelar</button>
            <button class="btn btn-primary btn-sm" onclick="
              const sel = document.getElementById('bpSecSelectorInput');
              const dbId = sel.value;
              const tipo = sel.options[sel.selectedIndex].dataset.tipo;
              document.getElementById('bpSecSelector').remove();
              bpAbrirModalPregunta('${formulario}', dbId, tipo);
            ">Continuar</button>
          </div>
        </div>
      </div>`;
      document.body.insertAdjacentHTML('beforeend', dlg);
    })
    .catch(() => toast('Error al cargar secciones.', 'error'));
}

function bpAbrirModalPregunta(formulario, seccionDbId, tipoSeccion) {
  document.getElementById('bpPregSeccionDbId').value  = seccionDbId;
  document.getElementById('bpPregTipoSeccion').value  = tipoSeccion;
  document.getElementById('bpPregFormulario').value   = formulario;
  document.getElementById('bpPreguntaModalTitulo').textContent = 'Nueva Pregunta';

  const esMultiple = tipoSeccion === 'multiple_choice';
  document.getElementById('bpOpcionesSection').style.display = esMultiple ? 'block' : 'none';
  document.getElementById('bpPregPuntosGroup').style.display = esMultiple ? '' : 'none';

  if (esMultiple && document.getElementById('bpOpcionesList').children.length === 0) {
    // Agregar 2 opciones por defecto
    bpAgregarOpcion(); bpAgregarOpcion();
  }

  abrirModal('modalBpPregunta');
}

function bpEditarPregunta(dataObj) {
  const d = typeof dataObj === 'string' ? JSON.parse(dataObj) : dataObj;
  const item = d.item;
  const esMultiple = d.tipo_seccion === 'multiple_choice';

  document.getElementById('bpPregId').value            = item.db_id ?? '';
  document.getElementById('bpPregSeccionDbId').value   = d.sec_db_id;
  document.getElementById('bpPregTipoSeccion').value   = d.tipo_seccion;
  document.getElementById('bpPregFormulario').value    = d.formulario;
  document.getElementById('bpPregPreguntaId').value    = item.id;
  document.getElementById('bpPregPreguntaId').disabled = true;
  document.getElementById('bpPregTexto').value         = d.texto || item.label || '';
  document.getElementById('bpPregPuntos').value        = item.puntos ?? 1;
  document.getElementById('bpPregOrden').value         = item.orden ?? 0;
  document.getElementById('bpPreguntaModalTitulo').textContent = 'Editar Pregunta';

  document.getElementById('bpOpcionesSection').style.display = esMultiple ? 'block' : 'none';
  document.getElementById('bpPregPuntosGroup').style.display = esMultiple ? '' : 'none';

  // Limpiar y recargar opciones
  document.getElementById('bpOpcionesList').innerHTML = '';
  document.getElementById('bpRespuestaCorrecta').innerHTML = '<option value="">— Selecciona —</option>';
  bpOpcionesCount = 0;

  if (esMultiple && item.opciones) {
    for (const op of item.opciones) bpAgregarOpcion(op.id, op.texto);
    // Seleccionar respuesta correcta
    const sel = document.getElementById('bpRespuestaCorrecta');
    if (item.respuesta_correcta) {
      for (const opt of sel.options) {
        if (opt.value === item.respuesta_correcta) { opt.selected = true; break; }
      }
    }
  }

  abrirModal('modalBpPregunta');
}

// ── Opciones dinámicas ────────────────────────────────────────
function bpAgregarOpcion(id = '', texto = '') {
  bpOpcionesCount++;
  const defaultId = id || String.fromCharCode(64 + bpOpcionesCount); // A, B, C...
  const list = document.getElementById('bpOpcionesList');
  const row  = document.createElement('div');
  row.style.cssText = 'display:flex;gap:8px;align-items:center';
  row.innerHTML = `
    <input type="text" class="form-control bp-opcion-id" value="${defaultId}"
           placeholder="A" style="width:56px;flex-shrink:0;font-weight:700;text-align:center"
           oninput="bpSyncRespuestaSelect()">
    <input type="text" class="form-control bp-opcion-texto" value="${texto}"
           placeholder="Texto de la opción..." style="flex:1">
    <button type="button" class="btn btn-outline btn-sm" style="color:var(--rojo);border-color:var(--rojo);flex-shrink:0"
            onclick="this.closest('div').remove();bpSyncRespuestaSelect()">
      <i class="fas fa-times"></i>
    </button>`;
  list.appendChild(row);
  bpSyncRespuestaSelect();
}

function bpSyncRespuestaSelect() {
  const sel  = document.getElementById('bpRespuestaCorrecta');
  const prev = sel.value;
  sel.innerHTML = '<option value="">— Selecciona —</option>';
  document.querySelectorAll('.bp-opcion-id').forEach(input => {
    const v = input.value.trim();
    if (v) {
      const opt    = document.createElement('option');
      opt.value    = v;
      opt.textContent = v;
      if (v === prev) opt.selected = true;
      sel.appendChild(opt);
    }
  });
}

async function bpGuardarPregunta() {
  const btn = document.getElementById('btnGuardarBpPregunta');
  btn.disabled = true;

  const tipoSeccion = document.getElementById('bpPregTipoSeccion').value;
  const esMultiple  = tipoSeccion === 'multiple_choice';

  // Recolectar opciones si aplica
  let opcionesJson = '';
  if (esMultiple) {
    const opciones = [];
    document.querySelectorAll('#bpOpcionesList > div').forEach(row => {
      const id    = row.querySelector('.bp-opcion-id').value.trim();
      const texto = row.querySelector('.bp-opcion-texto').value.trim();
      if (id && texto) opciones.push({ id, texto });
    });
    if (opciones.length < 2) {
      toast('Agrega al menos 2 opciones válidas.', 'error');
      btn.disabled = false;
      return;
    }
    opcionesJson = JSON.stringify(opciones);
  }

  const fd = new FormData();
  fd.append('csrf_token',          CSRF_TOKEN);
  fd.append('id',                  document.getElementById('bpPregId').value);
  fd.append('seccion_db_id',       document.getElementById('bpPregSeccionDbId').value);
  fd.append('pregunta_id',         document.getElementById('bpPregPreguntaId').value);
  fd.append('texto',               document.getElementById('bpPregTexto').value);
  fd.append('puntos',              document.getElementById('bpPregPuntos').value);
  fd.append('orden',               document.getElementById('bpPregOrden').value);
  fd.append('opciones',            opcionesJson);
  fd.append('respuesta_correcta',  esMultiple ? document.getElementById('bpRespuestaCorrecta').value : '');

  try {
    const resp = await fetch('api/banco_preguntas/guardar_pregunta.php', { method: 'POST', body: fd });
    const data = await resp.json();
    if (data.success) {
      toast(data.message, 'success');
      cerrarModal('modalBpPregunta');
      bpCargarPanel(document.getElementById('bpPregFormulario').value);
    } else {
      toast(data.message || 'Error al guardar.', 'error');
    }
  } catch {
    toast('Error de conexión.', 'error');
  }
  btn.disabled = false;
}

// ── Eliminar sección ──────────────────────────────────────────
async function bpEliminarSeccion(dbId, formulario) {
  if (!confirm('¿Eliminar esta sección y TODAS sus preguntas?')) return;
  const fd = new FormData();
  fd.append('csrf_token', CSRF_TOKEN);
  fd.append('tipo', 'seccion');
  fd.append('id', dbId);
  try {
    const resp = await fetch('api/banco_preguntas/eliminar.php', { method: 'POST', body: fd });
    const data = await resp.json();
    toast(data.message, data.success ? 'success' : 'error');
    if (data.success) bpCargarPanel(formulario);
  } catch { toast('Error de conexión.', 'error'); }
}

// ── Eliminar pregunta ─────────────────────────────────────────
async function bpEliminarPregunta(pregDbId, formulario) {
  if (!confirm('¿Eliminar esta pregunta?')) return;

  const fd = new FormData();
  fd.append('csrf_token', CSRF_TOKEN);
  fd.append('tipo', 'pregunta');
  fd.append('id', pregDbId);

  try {
    const resp = await fetch('api/banco_preguntas/eliminar.php', { method: 'POST', body: fd });
    const data = await resp.json();
    toast(data.message, data.success ? 'success' : 'error');
    if (data.success) bpCargarPanel(formulario);
  } catch { toast('Error de conexión.', 'error'); }
}

// ── Export / Import Excel ─────────────────────────────────────
const BP_XLS_HEADERS = [
  'tipo_seccion','seccion_id','seccion_titulo','seccion_descripcion','seccion_puntos','seccion_orden',
  'pregunta_id','pregunta_texto',
  'op_A','op_B','op_C','op_D','op_E',
  'respuesta_correcta','pregunta_puntos','pregunta_orden'
];

async function bpExportar(formulario) {
  if (typeof XLSX === 'undefined') { toast('Librería Excel no cargada. Recarga la página.', 'error'); return; }

  let secciones;
  try {
    const resp = await fetch(`api/banco_preguntas/secciones.php?formulario=${formulario}`);
    const data = await resp.json();
    if (!data.success) throw new Error(data.message);
    secciones = data.data;
  } catch (e) {
    toast('Error al cargar datos: ' + e.message, 'error');
    return;
  }

  const rows = [BP_XLS_HEADERS];
  for (const sec of secciones) {
    const items = sec.tipo === 'aplica_grid' ? (sec.items || []) : (sec.preguntas || []);
    const secBase = [sec.tipo, sec.id, sec.titulo, sec.descripcion || '', sec.puntos, sec.orden ?? ''];

    if (!items.length) {
      rows.push([...secBase, '', '', '', '', '', '', '', '', '', '']);
      continue;
    }
    for (const item of items) {
      const texto   = sec.tipo === 'aplica_grid' ? item.label : item.texto;
      const opMap   = {};
      for (const op of (item.opciones || [])) opMap[op.id] = op.texto;
      rows.push([
        ...secBase,
        item.id, texto,
        opMap['A'] || '', opMap['B'] || '', opMap['C'] || '', opMap['D'] || '', opMap['E'] || '',
        item.respuesta_correcta || '',
        item.puntos ?? '',
        item.orden  ?? ''
      ]);
    }
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  // Ancho de columna legible
  ws['!cols'] = [
    {wch:14},{wch:16},{wch:32},{wch:32},{wch:10},{wch:8},
    {wch:14},{wch:52},
    {wch:28},{wch:28},{wch:28},{wch:28},{wch:28},
    {wch:14},{wch:12},{wch:12}
  ];
  XLSX.utils.book_append_sheet(wb, ws, formulario.substring(0, 31));
  const fecha = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `banco_${formulario}_${fecha}.xlsx`);
}

async function bpImportar(formulario, input) {
  if (typeof XLSX === 'undefined') { toast('Librería Excel no cargada. Recarga la página.', 'error'); return; }

  const file = input.files[0];
  if (!file) return;
  if (!file.name.match(/\.(xlsx|xls)$/i)) { toast('Selecciona un archivo .xlsx', 'error'); input.value = ''; return; }

  if (!confirm(`¿Importar banco de preguntas para "${formulario}"?\nEsto REEMPLAZARÁ todas las secciones y preguntas actuales.`)) {
    input.value = '';
    return;
  }

  try {
    const buffer = await file.arrayBuffer();
    const wb     = XLSX.read(buffer, { type: 'array' });
    const ws     = wb.Sheets[wb.SheetNames[0]];
    const raw    = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (raw.length < 2) { toast('El archivo no contiene datos.', 'error'); input.value = ''; return; }

    const hdrs  = raw[0].map(h => String(h).trim());
    const col   = name => hdrs.indexOf(name);
    const get   = (row, name) => { const i = col(name); return i >= 0 ? String(row[i] ?? '').trim() : ''; };

    const secMap = {};
    const secOrd = [];

    for (let i = 1; i < raw.length; i++) {
      const row = raw[i];
      const seccionId = get(row, 'seccion_id');
      if (!seccionId) continue;

      if (!secMap[seccionId]) {
        secMap[seccionId] = {
          seccion_id:   seccionId,
          titulo:       get(row, 'seccion_titulo'),
          descripcion:  get(row, 'seccion_descripcion') || null,
          tipo:         get(row, 'tipo_seccion'),
          puntos:       parseFloat(get(row, 'seccion_puntos')) || 0,
          orden:        parseInt(get(row, 'seccion_orden'))    || secOrd.length + 1,
          preguntas:    []
        };
        secOrd.push(seccionId);
      }

      const preguntaId = get(row, 'pregunta_id');
      if (!preguntaId) continue;

      const sec  = secMap[seccionId];
      const pEntry = {
        pregunta_id: preguntaId,
        texto:       get(row, 'pregunta_texto'),
        puntos:      parseFloat(get(row, 'pregunta_puntos')) || 1,
        orden:       parseInt(get(row, 'pregunta_orden'))    || sec.preguntas.length + 1
      };

      if (sec.tipo === 'multiple_choice') {
        const opciones = [];
        for (const letra of ['A','B','C','D','E']) {
          const txt = get(row, `op_${letra}`);
          if (txt) opciones.push({ id: letra, texto: txt });
        }
        pEntry.opciones            = opciones;
        pEntry.respuesta_correcta  = get(row, 'respuesta_correcta');
      }

      sec.preguntas.push(pEntry);
    }

    const jsonObj = { formulario, secciones: secOrd.map(id => secMap[id]) };
    if (!jsonObj.secciones.length) { toast('No se encontraron secciones válidas en el archivo.', 'error'); input.value = ''; return; }

    const fd = new FormData();
    fd.append('csrf_token', CSRF_TOKEN);
    fd.append('json', JSON.stringify(jsonObj));

    const resp   = await fetch('api/banco_preguntas/importar.php', { method: 'POST', body: fd });
    const result = await resp.json();
    toast(result.message, result.success ? 'success' : 'error', 5000);
    if (result.success) bpCargarPanel(formulario);
  } catch (e) {
    toast('Error al leer el archivo: ' + e.message, 'error');
  }
  input.value = '';
}

// ── CRUD Formularios ──────────────────────────────────────────
function bpNuevaEvaluacion() {
  document.getElementById('bpFrmEsEdicion').value  = '0';
  document.getElementById('bpFrmId').value          = '';
  document.getElementById('bpFrmId').disabled       = false;
  document.getElementById('bpFrmTitulo').value      = '';
  document.getElementById('bpFrmIcono').value       = 'fa-clipboard-list';
  document.getElementById('bpFrmColor').value       = '#1565C0';
  document.getElementById('bpFrmOrden').value       = String((bpFormulariosCache.length + 1) * 10);
  document.getElementById('bpFrmBtnEliminar').style.display = 'none';
  document.getElementById('bpFormularioModalTitulo').textContent = 'Nueva Evaluación';
  bpPreviewIcono();
  abrirModal('modalBpFormulario');
}

function bpEditarFormulario(formularioId) {
  const f = bpFormMap[formularioId];
  if (!f) return;
  document.getElementById('bpFrmEsEdicion').value   = '1';
  document.getElementById('bpFrmId').value           = f.formulario_id;
  document.getElementById('bpFrmId').disabled        = true;
  document.getElementById('bpFrmTitulo').value       = f.titulo;
  document.getElementById('bpFrmIcono').value        = f.icono;
  document.getElementById('bpFrmColor').value        = f.color || '#1565C0';
  document.getElementById('bpFrmOrden').value        = f.orden;
  const reservados = ['manejo_practica','examen_defensiva','induccion_t2'];
  document.getElementById('bpFrmBtnEliminar').style.display = reservados.includes(formularioId) ? 'none' : '';
  document.getElementById('bpFormularioModalTitulo').textContent = 'Editar Evaluación';
  bpPreviewIcono();
  abrirModal('modalBpFormulario');
}

function bpPreviewIcono() {
  const icono = document.getElementById('bpFrmIcono').value;
  const color = document.getElementById('bpFrmColor').value;
  const titulo = document.getElementById('bpFrmTitulo').value || 'Vista previa';
  document.getElementById('bpFrmPreviewIcon').className  = `fas ${icono}`;
  document.getElementById('bpFrmPreviewIcon').style.color = color;
  document.getElementById('bpFrmPreviewLabel').textContent = titulo;
}

async function bpGuardarFormulario() {
  const btn = document.getElementById('btnGuardarBpFormulario');
  btn.disabled = true;

  const fd = new FormData();
  fd.append('csrf_token',    CSRF_TOKEN);
  fd.append('formulario_id', document.getElementById('bpFrmId').value);
  fd.append('titulo',        document.getElementById('bpFrmTitulo').value);
  fd.append('icono',         document.getElementById('bpFrmIcono').value);
  fd.append('color',         document.getElementById('bpFrmColor').value);
  fd.append('orden',         document.getElementById('bpFrmOrden').value);
  fd.append('es_edicion',    document.getElementById('bpFrmEsEdicion').value);

  try {
    const resp = await fetch('api/banco_preguntas/guardar_formulario.php', { method: 'POST', body: fd });
    const data = await resp.json();
    if (data.success) {
      toast(data.message, 'success');
      cerrarModal('modalBpFormulario');
      const bpPanel = document.getElementById('eval-panel-banco');
      if (bpPanel) delete bpPanel.dataset.bpInit;
      await bpCargarFormularios();
      if (data.data?.formulario_id) bpSwitchTab(data.data.formulario_id);
      // Actualizar también el módulo de evaluaciones
      if (typeof cargarFormulariosEval === 'function') cargarFormulariosEval(true);
    } else {
      toast(data.message || 'Error al guardar.', 'error');
    }
  } catch { toast('Error de conexión.', 'error'); }
  btn.disabled = false;
}

async function bpEliminarFormulario() {
  const formularioId = document.getElementById('bpFrmId').value;
  const titulo       = document.getElementById('bpFrmTitulo').value;
  if (!confirm(`¿Eliminar la evaluación "${titulo}"?\nEsto no borrará preguntas ya registradas en evaluaciones pasadas.`)) return;

  const fd = new FormData();
  fd.append('csrf_token',    CSRF_TOKEN);
  fd.append('formulario_id', formularioId);

  try {
    const resp = await fetch('api/banco_preguntas/eliminar_formulario.php', { method: 'POST', body: fd });
    const data = await resp.json();
    toast(data.message, data.success ? 'success' : 'error');
    if (data.success) {
      cerrarModal('modalBpFormulario');
      await bpCargarFormularios();
      if (typeof cargarFormulariosEval === 'function') cargarFormulariosEval(true);
    }
  } catch { toast('Error de conexión.', 'error'); }
}

// ── Init ──────────────────────────────────────────────────────
// Llamado desde switchEvalTab('banco') en evaluaciones.js
function bpInitBancoTab() {
  const panel = document.getElementById('eval-panel-banco');
  if (!panel || panel.dataset.bpInit) return;
  panel.dataset.bpInit = '1';
  bpCargarFormularios();
}

document.addEventListener('DOMContentLoaded', () => {
  if (!document.getElementById('eval-panel-banco')) return;

  // Actualizar preview en tiempo real
  ['bpFrmTitulo','bpFrmColor'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', bpPreviewIcono);
  });
});
