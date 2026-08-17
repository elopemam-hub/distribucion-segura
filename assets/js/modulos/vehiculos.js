// ============================================================
// MÓDULO: VEHÍCULOS — consulta de solo lectura
// Lee en vivo la BD de vigilancia vía api/vehiculos.php (cross-database).
// ============================================================

let _vehInit = false;
let _vehListTimer = null;

function initVehiculos() {
  cargarEstadosVehiculo();
  cargarVehiculos();
  _vehInit = true;
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
