// ============================================================
// DISTRIBUCIÓN SEGURA — FORMULARIO PÚBLICO DE EVALUACIÓN
// Autocontenido: se carga solo en eval_publico.php (sin login).
// No depende de evaluaciones.js ni del DOM del panel.
// ============================================================

// ── Definición de campos de identificación por formulario ─────
// (copia estática de EVAL_CONFIG.campos; el banco de preguntas
//  vive en BD, pero los campos de cabecera son estáticos)
const EVP_CAMPOS = {
  manejo_practica: [
    { id: 'fecha',         label: 'Fecha',                            tipo: 'fecha' },
    { id: 'hora',          label: 'Hora',                             tipo: 'hora' },
    { id: 'empresa',       label: 'Empresa Evaluador',                tipo: 'select', opciones: ['Dicorjes'], required: true },
    { id: 'dni',           label: 'D.N.I.',                           tipo: 'text', required: true },
    { id: 'nombre',        label: 'Nombre y Apellido del Postulante', tipo: 'text', required: true },
    { id: 'tipo_unidad',   label: 'Tipo de Unidad',                   tipo: 'select', opciones: ['Camion 360','Camion 600','Camion 672','Camion 1008'], required: true },
    { id: 'estado_unidad', label: 'Estado de la Unidad',              tipo: 'select', opciones: ['CARGADO','VACÍO'], required: true },
  ],
  examen_defensiva: [
    { id: 'fecha',          label: 'Fecha',              tipo: 'fecha' },
    { id: 'hora',           label: 'Hora',               tipo: 'hora' },
    { id: 'empresa',        label: 'Empresa',            tipo: 'select', opciones: ['Dicorjes'], required: true },
    { id: 'conductor_tipo', label: 'Conductor',          tipo: 'radio',  opciones: ['Nuevo Inducción','Antiguo'], required: true },
    { id: 'dni',            label: 'D.N.I.',             tipo: 'text', required: true },
    { id: 'nombre',         label: 'Nombre y Apellidos', tipo: 'text', required: true, mayus: true },
  ],
  induccion_t2: [
    { id: 'fecha',   label: 'Fecha',              tipo: 'fecha' },
    { id: 'hora',    label: 'Hora',               tipo: 'hora' },
    { id: 'dni',     label: 'D.N.I.',             tipo: 'text', required: true },
    { id: 'nombre',  label: 'Nombre y Apellidos', tipo: 'text', required: true, mayus: true },
    { id: 'empresa', label: 'Empresa',            tipo: 'select', opciones: ['Amanecer','Dicorjes','Pajcha','T77','S.I.Venturo SAC'], required: true },
    { id: 'puesto',  label: 'Puesto',             tipo: 'select', opciones: ['Chofer','Auxiliar','Reparto','Asistente T2','Supervisor T2','Empresario'], required: true },
  ],
};

// Fallback genérico para formularios dinámicos sin campos definidos
const EVP_CAMPOS_DEFAULT = [
  { id: 'fecha',   label: 'Fecha',             tipo: 'fecha' },
  { id: 'hora',    label: 'Hora',              tipo: 'hora' },
  { id: 'empresa', label: 'Empresa',           tipo: 'select', opciones: ['Dicorjes'], required: true },
  { id: 'dni',     label: 'D.N.I.',            tipo: 'text', required: true },
  { id: 'nombre',  label: 'Nombre y Apellido', tipo: 'text', required: true },
];

const PUB = {
  id: window.EVAL_PUBLICO_ID || '',
  meta: null,
  empresas: [],
  secciones: [],
};

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── Toast minimalista ─────────────────────────────────────────
function evpToast(msg, tipo = 'info') {
  const c = tipo === 'error' ? '#dc3545' : tipo === 'success' ? '#28a745' : '#1565C0';
  let t = document.getElementById('evp-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'evp-toast';
    t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:999;' +
      'padding:12px 20px;border-radius:10px;color:#fff;font-size:14px;font-weight:600;' +
      'box-shadow:0 6px 20px rgba(0,0,0,.25);max-width:90%;text-align:center;transition:opacity .2s';
    document.body.appendChild(t);
  }
  t.style.background = c;
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._h);
  t._h = setTimeout(() => { t.style.opacity = '0'; }, 3500);
}

// ── Cargar config ─────────────────────────────────────────────
async function evpInit() {
  const root = document.getElementById('evp-root');
  try {
    const r = await fetch('api/eval_publico/formulario.php?eval=' + encodeURIComponent(PUB.id));
    const d = await r.json();
    if (!d.success) throw new Error(d.message || 'Error');
    PUB.meta = d.data.meta;
    PUB.empresas = d.data.empresas || [];
    PUB.secciones = d.data.secciones || [];
    evpRenderForm();
  } catch (e) {
    root.innerHTML = `<div class="evp-error"><i class="fas fa-triangle-exclamation"></i>
      <div style="font-size:16px;font-weight:700;color:var(--gris-100,#223);margin-bottom:6px">No se pudo cargar</div>
      <div>${esc(e.message || 'Intenta nuevamente más tarde.')}</div></div>`;
  }
}

// ── Render del formulario completo ────────────────────────────
function evpRenderForm() {
  const campos = EVP_CAMPOS[PUB.id] || EVP_CAMPOS_DEFAULT;
  const root = document.getElementById('evp-root');

  let html = `
    <div class="evp-intro">
      <h1><i class="fas ${esc(PUB.meta.icono || 'fa-clipboard-check')}" style="color:${esc(PUB.meta.color || '#1565C0')}"></i> ${esc(PUB.meta.titulo)}</h1>
      <p>Completa todos los campos. Al enviar verás tu resultado.</p>
    </div>

    <div class="card" style="margin-bottom:18px">
      <div class="card-header"><h3><i class="fas fa-id-card"></i> Datos de Identificación</h3></div>
      <div class="card-body"><div class="form-grid">${evpRenderCampos(campos)}</div></div>
    </div>

    <div id="evp-secciones">${PUB.secciones.map(evpRenderSeccion).join('')}</div>

    <div class="evp-submit-bar">
      <button type="button" class="btn btn-primary" id="evp-btn-enviar" onclick="evpEnviar()">
        <i class="fas fa-paper-plane"></i> Enviar Evaluación
      </button>
    </div>`;

  root.innerHTML = html;
}

function evpRenderCampos(campos) {
  const now = new Date();
  const hoy = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
  const hora = now.toTimeString().slice(0, 5);
  let html = '';

  for (const c of campos) {
    html += `<div class="form-group"><label class="form-label">${esc(c.label)}${c.required ? ' *' : ''}</label>`;

    if (c.tipo === 'fecha' || c.tipo === 'hora') {
      const val = c.tipo === 'fecha' ? hoy : hora;
      html += `<input type="${c.tipo === 'fecha' ? 'date' : 'time'}" class="form-control evp-campo"
                 data-campo="${c.id}" value="${val}" readonly
                 style="background:var(--gris-700);color:var(--gris-400);cursor:not-allowed">`;

    } else if (c.tipo === 'text') {
      // mayus: visible en mayúsculas al escribir y guardado en mayúsculas.
      const may = c.mayus ? ' data-mayus="1" style="text-transform:uppercase"' : '';
      html += `<input type="text" class="form-control evp-campo" data-campo="${c.id}"${c.required ? ' required' : ''}${may}>`;

    } else if (c.tipo === 'select') {
      // El campo empresa usa la lista gestionada en BD (misma que el form interno);
      // si no hay, cae a las opciones estáticas del formulario.
      const opciones = (c.id === 'empresa' && PUB.empresas.length) ? PUB.empresas : (c.opciones || []);
      html += `<select class="form-control evp-campo" data-campo="${c.id}"${c.required ? ' required' : ''}>
                 <option value="">— Selecciona —</option>`;
      for (const op of opciones) html += `<option value="${esc(op)}">${esc(op)}</option>`;
      html += `</select>`;

    } else if (c.tipo === 'radio') {
      html += `<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:6px">`;
      for (const op of c.opciones) {
        html += `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:var(--gris-200)">
          <input type="radio" name="evp-campo-${c.id}" class="evp-campo-radio" data-campo="${c.id}" value="${esc(op)}" style="accent-color:var(--primary)"> ${esc(op)}
        </label>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
  }
  return html;
}

// ── Render de secciones ───────────────────────────────────────
function evpRenderSeccion(sec) {
  return sec.tipo === 'aplica_grid' ? evpRenderAplicaGrid(sec)
       : sec.tipo === 'multiple_choice' ? evpRenderMultiple(sec)
       : '';
}

function evpRenderAplicaGrid(sec) {
  const ptsLabel = sec.puntos + ' pt' + (sec.puntos !== 1 ? 's' : '');
  let html = `
    <div class="card" style="margin-bottom:18px">
      <div class="card-header">
        <h3><i class="fas fa-table-list"></i> ${esc(sec.titulo)}</h3>
        <span class="badge badge-yellow">${ptsLabel}</span>
      </div>
      <div class="card-body">
        <p style="font-size:12px;color:var(--gris-400);margin-bottom:14px">${esc(sec.descripcion || '')} <strong>Indicar APLICA o NO APLICA según sea el caso.</strong></p>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead><tr>
              <th style="text-align:left;padding:8px 12px;font-size:12px;font-weight:700;color:var(--gris-300);border-bottom:2px solid var(--gris-600);width:55%">CRITERIO</th>
              <th style="text-align:center;padding:8px 12px;font-size:12px;font-weight:700;color:var(--verde);border-bottom:2px solid var(--gris-600);width:22%">APLICA</th>
              <th style="text-align:center;padding:8px 12px;font-size:12px;font-weight:700;color:var(--rojo);border-bottom:2px solid var(--gris-600);width:23%">NO APLICA</th>
            </tr></thead>
            <tbody>`;

  for (const item of sec.items) {
    const n = `evp-${sec.id}-${item.id}`;
    html += `
      <tr style="border-bottom:1px solid var(--gris-700)">
        <td style="padding:10px 12px;font-size:13px;font-weight:600;color:var(--gris-200)">${esc(item.label)}</td>
        <td style="text-align:center;padding:10px">
          <label style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:6px;border:2px solid var(--gris-600);transition:all .15s" class="evp-aplica-btn" data-val="aplica">
            <input type="radio" name="${n}" value="aplica" style="display:none">
            <i class="fas fa-check" style="font-size:14px;color:var(--verde);display:none"></i>
          </label>
        </td>
        <td style="text-align:center;padding:10px">
          <label style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:6px;border:2px solid var(--gris-600);transition:all .15s" class="evp-aplica-btn" data-val="no_aplica">
            <input type="radio" name="${n}" value="no_aplica" style="display:none">
            <i class="fas fa-times" style="font-size:14px;color:var(--rojo);display:none"></i>
          </label>
        </td>
      </tr>`;
  }

  html += `</tbody></table></div></div></div>`;
  return html;
}

function evpRenderMultiple(sec) {
  let html = `
    <div class="card" style="margin-bottom:18px">
      <div class="card-header"><h3><i class="fas fa-list-ol"></i> ${esc(sec.titulo)}</h3></div>
      <div class="card-body">`;

  for (const q of sec.preguntas) {
    html += `
      <div style="margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid var(--gris-700)">
        <p style="font-size:13px;font-weight:600;color:var(--gris-100);margin-bottom:10px">
          <span style="color:var(--primary);font-weight:700">${esc(q.numero)}</span> ${esc(q.texto)}
          <span style="font-size:11px;color:var(--gris-500);margin-left:6px">(${q.puntos} pt${q.puntos !== 1 ? 's' : ''})</span>
        </p>
        <div style="display:flex;flex-direction:column;gap:6px">`;

    for (const op of q.opciones) {
      const radioId = `evp-q-${q.id}-${op.id}`;
      html += `
        <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:10px 12px;border-radius:8px;border:1px solid var(--gris-600);background:var(--gris-700);transition:all .15s;font-size:13px;color:var(--gris-200)" class="evp-opcion-label" id="lbl-${radioId}">
          <input type="radio" name="evp-q-${q.id}" value="${esc(op.id)}" class="evp-opcion-radio" style="margin-top:2px;accent-color:var(--primary);flex-shrink:0">
          <span><strong style="color:var(--primary)">${esc(op.id)}.</strong> ${esc(op.texto)}</span>
        </label>`;
    }
    html += `</div></div>`;
  }
  html += `</div></div>`;
  return html;
}

// ── Interacción: botones APLICA / NO APLICA ───────────────────
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.evp-aplica-btn');
  if (!btn) return;
  const val = btn.dataset.val;
  const radio = btn.querySelector('input[type=radio]');
  if (radio) radio.checked = true;

  const fila = btn.closest('tr');
  fila.querySelectorAll('.evp-aplica-btn').forEach(b => {
    b.style.background = '';
    b.style.borderColor = 'var(--gris-600)';
    b.querySelector('i').style.display = 'none';
  });
  const icon = btn.querySelector('i');
  if (val === 'aplica') { btn.style.background = 'rgba(40,167,69,0.15)'; btn.style.borderColor = 'var(--verde)'; }
  else { btn.style.background = 'rgba(220,53,69,0.15)'; btn.style.borderColor = 'var(--rojo)'; }
  icon.style.display = 'block';
});

// ── Interacción: resalte de opción múltiple ───────────────────
document.addEventListener('change', function (e) {
  if (!e.target.classList.contains('evp-opcion-radio')) return;
  const name = e.target.name;
  document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
    const lbl = r.closest('.evp-opcion-label');
    if (lbl) { lbl.style.borderColor = r.checked ? 'var(--primary)' : 'var(--gris-600)'; lbl.style.background = r.checked ? 'rgba(21,101,192,0.1)' : 'var(--gris-700)'; }
  });
});

// ── Recolección ───────────────────────────────────────────────
function evpCampos() {
  const data = {};
  document.querySelectorAll('.evp-campo').forEach(el => {
    const v = el.value.trim();
    data[el.dataset.campo] = el.dataset.mayus ? v.toUpperCase() : v;
  });
  document.querySelectorAll('.evp-campo-radio:checked').forEach(r => { data[r.dataset.campo] = r.value; });
  return data;
}

function evpRespuestas() {
  const resp = {};
  for (const sec of PUB.secciones) {
    if (sec.tipo === 'aplica_grid') {
      resp[sec.id] = {};
      for (const item of sec.items) {
        const ck = document.querySelector(`input[name="evp-${sec.id}-${item.id}"]:checked`);
        resp[sec.id][item.id] = ck ? ck.value : '';
      }
    } else if (sec.tipo === 'multiple_choice') {
      for (const q of sec.preguntas) {
        const ck = document.querySelector(`input[name="evp-q-${q.id}"]:checked`);
        resp[q.id] = ck ? ck.value : '';
      }
    }
  }
  return resp;
}

// ── Enviar ────────────────────────────────────────────────────
async function evpEnviar() {
  const campos = evpCampos();
  const defCampos = EVP_CAMPOS[PUB.id] || EVP_CAMPOS_DEFAULT;

  for (const c of defCampos) {
    if (c.required && !(campos[c.id] || '')) {
      evpToast(`El campo "${c.label}" es obligatorio.`, 'error');
      return;
    }
  }

  const respuestas = evpRespuestas();
  let incompleto = false;
  for (const sec of PUB.secciones) {
    if (sec.tipo === 'aplica_grid') {
      for (const item of sec.items) if (!respuestas[sec.id]?.[item.id]) { incompleto = true; break; }
    } else if (sec.tipo === 'multiple_choice') {
      for (const q of sec.preguntas) if (!respuestas[q.id]) { incompleto = true; break; }
    }
    if (incompleto) break;
  }
  if (incompleto) { evpToast('Completa todas las preguntas / criterios antes de enviar.', 'error'); return; }

  const btn = document.getElementById('evp-btn-enviar');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Enviando…';

  const fd = new FormData();
  fd.append('tipo',           PUB.id);
  fd.append('fecha',          campos.fecha || '');
  fd.append('empresa',        campos.empresa || '');
  fd.append('nombre',         campos.nombre || '');
  fd.append('dni',            campos.dni || '');
  fd.append('puesto',         campos.puesto || '');
  fd.append('tipo_unidad',    campos.tipo_unidad || '');
  fd.append('estado_unidad',  campos.estado_unidad || '');
  fd.append('conductor_tipo', campos.conductor_tipo || '');
  fd.append('respuestas',     JSON.stringify(respuestas));

  try {
    const r = await fetch('api/eval_publico/guardar.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (d.success) {
      evpResultado(campos.nombre, d.data);
    } else {
      evpToast(d.message || 'No se pudo enviar.', 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Evaluación';
    }
  } catch {
    evpToast('Error de conexión. Revisa tu internet e intenta de nuevo.', 'error');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Enviar Evaluación';
  }
}

// ── Pantalla de resultado ─────────────────────────────────────
function evpResultado(nombre, data) {
  const pct = Number(data.porcentaje);
  const color = pct >= 80 ? 'var(--verde)' : pct >= 60 ? 'var(--amarillo)' : 'var(--rojo)';
  const cara  = pct >= 80 ? 'fa-face-smile' : pct >= 60 ? 'fa-face-meh' : 'fa-face-frown';

  document.getElementById('evp-root').innerHTML = `
    <div class="evp-result">
      <div class="ring" style="border-color:${color}">
        <div class="pct" style="color:${color}">${pct}%</div>
        <div class="pts">${data.puntaje} / ${data.puntaje_max} pts</div>
      </div>
      <h2 style="color:${color}"><i class="fas ${cara}"></i> ¡Registrado!</h2>
      <p style="margin-bottom:4px">Gracias${nombre ? ', ' + esc(nombre) : ''}. Tu evaluación fue enviada correctamente.</p>
      <p>Quedó <strong>pendiente de revisión</strong> por el supervisor.</p>
      <p style="margin-top:18px;font-size:12px;color:var(--gris-500)">Ya puedes cerrar esta ventana.</p>
    </div>`;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Arranque ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', evpInit);
