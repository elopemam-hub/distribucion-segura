// ============================================================
// MÓDULO: VEHÍCULOS — consulta de solo lectura
// Lee en vivo la BD de vigilancia vía api/vehiculos.php (cross-database).
// ============================================================

let _vehInit = false;
let _vehListTimer = null;

function initVehiculos() {
  cargarEstadosVehiculo();
  cargarStatsVehiculos();
  cargarVehiculos();
  _vehInit = true;
}

// Tarjetas resumen: total de camiones + conteo por estado (clic = filtrar).
async function cargarStatsVehiculos() {
  const cont = document.getElementById('vehKpis');
  if (!cont) return;
  let d = null;
  try { const r = await fetch('api/vehiculos.php?action=stats'); const j = await r.json(); if (j && j.success) d = j.data; }
  catch { /* sin datos */ }
  if (!d) { cont.innerHTML = ''; return; }
  const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const color = est => { const e = (est || '').toLowerCase(); if (/dispon/.test(e)) return 'var(--verde)'; if (/inact|vend|baja/.test(e)) return 'var(--rojo)'; if (/ruta/.test(e)) return '#1565C0'; return 'var(--primary)'; };
  const icono = est => { const e = (est || '').toLowerCase(); if (/dispon/.test(e)) return 'fa-circle-check'; if (/inact|vend|baja/.test(e)) return 'fa-ban'; if (/ruta/.test(e)) return 'fa-route'; return 'fa-truck'; };
  const card = (label, valor, col, filtro, ic) => `
    <div onclick="filtrarVehPorEstado('${String(filtro || '').replace(/'/g, "\\'")}')" title="Ver ${esc(label)}"
      style="background:var(--gris-800);border:1px solid var(--gris-600);border-left:4px solid ${col};border-radius:10px;padding:14px 16px;cursor:pointer;transition:border-color .15s"
      onmouseover="this.style.borderColor='${col}'" onmouseout="this.style.borderColor='var(--gris-600)';this.style.borderLeftColor='${col}'">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--gris-400);font-weight:700">${esc(label)}</span>
        <i class="fas ${ic}" style="color:${col}"></i>
      </div>
      <div style="font-size:28px;font-weight:800;color:${col};line-height:1.2">${valor}</div>
    </div>`;
  cont.innerHTML =
    card('Total camiones', d.total || 0, 'var(--primary)', '', 'fa-truck') +
    (d.por_estado || []).map(e => card(e.estado, e.n, color(e.estado), e.estado === 'Sin estado' ? '' : e.estado, icono(e.estado))).join('');
}

// Clic en una tarjeta: filtra el listado por ese estado.
function filtrarVehPorEstado(estado) {
  const sel = document.getElementById('vehFiltroEstado');
  if (sel) sel.value = estado || '';
  cargarVehiculos();
}

function vehBuscarDebounced() {
  clearTimeout(_vehListTimer);
  _vehListTimer = setTimeout(cargarVehiculos, 300);
}

async function cargarEstadosVehiculo() {
  const sel = document.getElementById('vehFiltroEstado');
  if (!sel) return;
  try {
    const r = await fetch('api/vehiculos.php?action=estados');
    const j = await r.json();
    const estados = (j && j.success) ? (j.data || []) : [];
    const esc = s => String(s ?? '').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    sel.innerHTML = '<option value="">Todos</option>' +
      estados.map(e => `<option value="${esc(e)}">${esc(e)}</option>`).join('');
  } catch { /* deja "Todos" */ }
}

async function cargarVehiculos() {
  const body = document.getElementById('vehBody');
  if (!body) return;
  const q = document.getElementById('vehBuscar')?.value.trim() || '';
  const estado = document.getElementById('vehFiltroEstado')?.value || '';
  const params = new URLSearchParams({ action: 'list' });
  if (q) params.set('q', q);
  if (estado) params.set('estado', estado);

  body.innerHTML = '<tr><td colspan="7" class="muted" style="text-align:center;padding:26px">Cargando…</td></tr>';
  let rows = [];
  try {
    const r = await fetch('api/vehiculos.php?' + params.toString());
    const j = await r.json();
    rows = (j && j.success) ? (j.data || []) : [];
  } catch { rows = []; }

  const total = document.getElementById('vehTotal');
  if (total) total.textContent = rows.length ? `· ${rows.length}` : '';

  if (!rows.length) {
    body.innerHTML = '<tr><td colspan="7" class="muted" style="text-align:center;padding:26px">'
      + 'Sin vehículos. Si esperabas datos, verifica el acceso a la BD de vigilancia '
      + '(<code>api/vehiculos.php?action=ping</code>).</td></tr>';
    return;
  }

  const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const badge = est => {
    const e = (est || '').toLowerCase();
    if (/dispon/.test(e))  return `<span class="badge badge-success">${esc(est)}</span>`;
    if (/inact|vend|baja/.test(e)) return `<span class="badge badge-danger">${esc(est)}</span>`;
    return est ? `<span class="badge badge-info">${esc(est)}</span>` : '<span class="muted">—</span>';
  };
  body.innerHTML = rows.map(v => `<tr>
    <td style="font-weight:700;color:var(--gris-100)">${esc(v.placa)}</td>
    <td class="muted">${esc(v.tipo || '—')}</td>
    <td>${esc(v.marca || '—')}</td>
    <td class="muted">${esc(v.modelo || '—')}</td>
    <td style="text-align:right;font-variant-numeric:tabular-nums" class="muted">${esc(v.anio || '—')}</td>
    <td class="muted" style="font-size:12px">${esc(v.n_serie || '—')}</td>
    <td>${badge(v.estado)}</td>
  </tr>`).join('');
}
