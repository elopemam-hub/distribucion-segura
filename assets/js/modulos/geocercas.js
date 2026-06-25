// ============================================================
// MÓDULO GEOCERCAS — Rutas Críticas, Zonas N3, Zonas Rojas
// ============================================================

let geoTabActivo  = 'ruta_critica';
let geoMap        = null;   // mapa principal
let geoDrawMap    = null;   // mapa del modal
let geoMapLayers  = {};     // {id: leafletLayer}
let geoDrawControl = null;
let geoDrawnItems  = null;  // FeatureGroup del modal

const GEO_TIPOS = {
  ruta_critica: { label: 'Rutas Críticas Carretera', labelSingle: 'Ruta Crítica', color: '#F39C12', geom: 'polyline', icon: 'fa-road',                badgeBg: '#FFF3CD', badgeColor: '#856404' },
  zona_n3:      { label: 'Zonas N3',                 labelSingle: 'Zona N3',       color: '#3498DB', geom: 'marker',   icon: 'fa-map-location-dot',     badgeBg: '#D1ECF1', badgeColor: '#0C5460' },
  zona_roja:    { label: 'Zonas Rojas',              labelSingle: 'Zona Roja',     color: '#E74C3C', geom: 'polygon',  icon: 'fa-circle-exclamation',   badgeBg: '#F8D7DA', badgeColor: '#721C24' },
};

const GEO_CENTER = [-15.4942, -70.1369]; // Juliaca, Perú
const GEO_ZOOM   = 13;

const GEO_ICONOS_N3 = [
  { icon: 'fa-circle',        label: 'Círculo'    },
  { icon: 'fa-location-dot',  label: 'Pin'        },
  { icon: 'fa-store',         label: 'Tienda'     },
  { icon: 'fa-building',      label: 'Edificio'   },
  { icon: 'fa-house',         label: 'Casa'       },
  { icon: 'fa-warehouse',     label: 'Almacén'    },
  { icon: 'fa-star',          label: 'Estrella'   },
  { icon: 'fa-flag',          label: 'Bandera'    },
  { icon: 'fa-truck',         label: 'Camión'     },
  { icon: 'fa-box',           label: 'Caja'       },
  { icon: 'fa-cart-shopping', label: 'Carrito'    },
  { icon: 'fa-tag',           label: 'Etiqueta'   },
  { icon: 'fa-user',          label: 'Persona'    },
  { icon: 'fa-briefcase',     label: 'Empresa'    },
  { icon: 'fa-map-pin',       label: 'Map Pin'    },
  { icon: 'fa-shop',          label: 'Shop'       },
];

// Crea un DivIcon de Leaflet con FA icon + color para marcadores N3
function crearN3Icon(color, iconClass) {
  const bg = color || '#3498DB';
  const ic = iconClass || 'fa-circle';
  return L.divIcon({
    html: `<div style="width:30px;height:30px;border-radius:50%;background:${bg};border:2px solid rgba(255,255,255,.9);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.35);color:#fff;font-size:13px"><i class="fas ${ic}"></i></div>`,
    className: '',
    iconSize:    [30, 30],
    iconAnchor:  [15, 15],
    popupAnchor: [0, -18],
  });
}

// Renderiza el selector de iconos en el modal
function renderGeoIconPicker(selectedIcon, color) {
  const container = document.getElementById('geoIconPicker');
  if (!container) return;
  const bg = color || '#3498DB';
  container.innerHTML = GEO_ICONOS_N3.map(({ icon, label }) => {
    const active = icon === selectedIcon;
    return `<button type="button"
      class="geo-icon-btn${active ? ' selected' : ''}"
      onclick="seleccionarGeoIcono('${icon}')"
      title="${label}"
      style="background:${active ? bg : '#CDD3D8'};border-color:${active ? bg : 'transparent'}">
      <i class="fas ${icon}"></i>
    </button>`;
  }).join('');
}

function seleccionarGeoIcono(icon) {
  document.getElementById('geo_icono').value = icon;
  const color = document.getElementById('geo_color')?.value || '#3498DB';
  renderGeoIconPicker(icon, color);
  actualizarIconoMarkerDraw();
}

function geoColorCambiado() {
  const color = document.getElementById('geo_color')?.value || '#3498DB';
  const icon  = document.getElementById('geo_icono')?.value  || 'fa-circle';
  renderGeoIconPicker(icon, color);
  actualizarIconoMarkerDraw();
}

function actualizarIconoMarkerDraw() {
  if (!geoDrawnItems) return;
  const color = document.getElementById('geo_color')?.value || '#3498DB';
  const icono = document.getElementById('geo_icono')?.value  || 'fa-circle';
  geoDrawnItems.eachLayer(layer => {
    if (typeof layer.setIcon === 'function') {
      layer.setIcon(crearN3Icon(color, icono));
    }
  });
}

// ── Inicialización del mapa principal ─────────────────────────────────────
function initGeoMap() {
  if (geoMap) {
    geoMap.invalidateSize();
    return;
  }
  const container = document.getElementById('geoMainMap');
  if (!container || !window.L) return;

  geoMap = L.map('geoMainMap', { zoomControl: true }).setView(GEO_CENTER, GEO_ZOOM);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(geoMap);

  // Cerrar menú compartir al hacer clic fuera
  document.addEventListener('click', e => {
    const wrap = document.getElementById('geoShareWrap');
    if (wrap && !wrap.contains(e.target)) cerrarGeoShareMenu();
  });

  // Restaurar vista desde URL compartida (?geo_tipo=...&lat=...&lng=...&zoom=...)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('lat') && urlParams.has('lng')) {
    const lat  = parseFloat(urlParams.get('lat'));
    const lng  = parseFloat(urlParams.get('lng'));
    const zoom = parseInt(urlParams.get('zoom')) || GEO_ZOOM;
    if (!isNaN(lat) && !isNaN(lng)) geoMap.setView([lat, lng], zoom);
  }
  const tipoURL = urlParams.get('geo_tipo');
  if (tipoURL && GEO_TIPOS[tipoURL]) {
    geoTabActivo = tipoURL;
  }

  aplicarEstiloTabs(geoTabActivo);
  cargarGeocercas();
}

// ── Tabs ───────────────────────────────────────────────────────────────────
const GEO_TAB_COLORS = {
  ruta_critica: { bg: '#F39C12', shadow: 'rgba(243,156,18,.35)' },
  zona_n3:      { bg: '#3498DB', shadow: 'rgba(52,152,219,.35)'  },
  zona_roja:    { bg: '#E74C3C', shadow: 'rgba(231,76,60,.35)'   },
};

function aplicarEstiloTabs(tipoActivo) {
  document.querySelectorAll('.geo-tab-btn').forEach(btn => {
    const cfg    = GEO_TAB_COLORS[btn.dataset.tipo] || {};
    const activo = btn.dataset.tipo === tipoActivo;
    btn.style.background  = activo ? cfg.bg  : '#fff';
    btn.style.borderColor = activo ? cfg.bg  : '#CDD3D8';
    btn.style.color       = activo ? '#fff'  : '#73879C';
    btn.style.boxShadow   = activo ? `0 3px 12px ${cfg.shadow}` : 'none';
    btn.style.transform   = activo ? 'translateY(-1px)' : '';
    btn.style.fontWeight  = activo ? '700' : '600';
    const icon = btn.querySelector('i');
    if (icon) icon.style.color = activo ? '#fff' : '';
    btn.classList.toggle('active', activo);
  });
}

function switchGeoTab(tipo) {
  geoTabActivo = tipo;
  aplicarEstiloTabs(tipo);
  const toolbar = document.getElementById('geoN3Toolbar');
  if (toolbar) toolbar.style.display = tipo === 'zona_n3' ? '' : 'none';
  cargarGeocercas();
}

// ── Carga de datos ─────────────────────────────────────────────────────────
async function cargarGeocercas() {
  const cfg = GEO_TIPOS[geoTabActivo];
  try {
    const res  = await fetch(`api/geocercas.php?action=list&tipo=${geoTabActivo}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    renderGeoTabla(json.data);
    renderGeoEnMapa(json.data);
    cargarGeoStats();
  } catch (e) {
    toast('Error al cargar geocercas: ' + e.message, 'error');
  }
}

async function cargarGeoStats() {
  try {
    const res  = await fetch('api/geocercas.php?action=stats');
    const json = await res.json();
    if (!json.success) return;
    const d = json.data;
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v ?? 0; };
    set('geoStatTotal', d.total);
    set('geoStatRutas', d.rutas_criticas);
    set('geoStatN3',    d.zonas_n3);
    set('geoStatRojas', d.zonas_rojas);
  } catch {}
}

// ── Tabla ─────────────────────────────────────────────────────────────────
function renderGeoTabla(rows) {
  const tbody = document.getElementById('geoTablaBody');
  if (!tbody) return;

  const countEl = document.getElementById('geoN3Count');
  if (countEl && geoTabActivo === 'zona_n3') countEl.textContent = `${rows.length} cliente${rows.length !== 1 ? 's' : ''} N3`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--gris-400)">No hay registros para este tipo</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const cfg = GEO_TIPOS[r.tipo] || {};
    const puntosLabel = (() => {
      try {
        const pts = JSON.parse(r.coordenadas);
        return `${pts.length} punto${pts.length !== 1 ? 's' : ''}`;
      } catch { return '—'; }
    })();

    const canEdit   = USER_ROL === 'administrador' || USER_ROL === 'supervisor';
    const canDelete = USER_ROL === 'administrador';

    return `<tr>
      <td>
        <span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:${escapeHtml(r.color)};margin-right:7px;vertical-align:middle;border:1px solid rgba(0,0,0,.1)"></span>
        <strong>${escapeHtml(r.nombre)}</strong>
        ${r.codigo ? `<br><span style="font-size:11px;color:var(--gris-400)">Cód: ${escapeHtml(r.codigo)}</span>` : ''}
      </td>
      <td style="color:var(--gris-300);font-size:12px">
        ${r.direccion_cliente ? `<span>${escapeHtml(r.direccion_cliente)}</span><br>` : ''}
        ${r.supervisor ? `<span style="font-size:11px">Sup: ${escapeHtml(r.supervisor)}</span>` : (r.descripcion ? escapeHtml(r.descripcion) : '—')}
      </td>
      <td><span style="font-size:11px;color:var(--gris-300)">${puntosLabel}</span></td>
      <td>
        <span style="display:inline-block;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:600;
          background:${r.activo ? 'rgba(212,165,0,.12)' : 'var(--gris-600)'};
          color:${r.activo ? 'var(--primary)' : 'var(--gris-400)'}">
          ${r.activo ? 'Activa' : 'Inactiva'}
        </span>
      </td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="centrarGeoEnMapa(${r.id})" title="Ver en mapa">
          <i class="fas fa-map-marker-alt"></i>
        </button>
        ${canEdit ? `<button class="btn btn-sm btn-outline" onclick="editarGeo(${r.id})" title="Editar"><i class="fas fa-pen"></i></button>` : ''}
        ${canEdit ? `<button class="btn btn-sm btn-outline" onclick="toggleGeo(${r.id})" title="${r.activo ? 'Desactivar' : 'Activar'}">
          <i class="fas fa-${r.activo ? 'eye-slash' : 'eye'}"></i>
        </button>` : ''}
        ${canDelete ? `<button class="btn btn-sm btn-danger" onclick="eliminarGeo(${r.id})" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
      </td>
    </tr>`;
  }).join('');
}

// ── Mapa principal ─────────────────────────────────────────────────────────
function renderGeoEnMapa(rows) {
  if (!geoMap) return;

  Object.values(geoMapLayers).forEach(l => geoMap.removeLayer(l));
  geoMapLayers = {};

  rows.forEach(r => {
    try {
      const coords  = JSON.parse(r.coordenadas);
      const color   = r.color || GEO_TIPOS[r.tipo]?.color || '#999';
      const opacity = r.activo ? 1 : 0.35;
      const cfg     = GEO_TIPOS[r.tipo] || {};

      const fila = (label, val) => val
        ? `<tr><td style="font-weight:700;color:#2A3F54;padding:2px 8px 2px 0;font-size:12px;white-space:nowrap">${label}</td><td style="color:#555;font-size:12px;padding:2px 0">${val}</td></tr>`
        : '';

      let layer, popupCoords = '';

      if (cfg.geom === 'marker') {
        // Zona N3 → marcador de punto con icono personalizado
        const pt = coords[0]; // [lat, lng]
        const markerColor = r.activo ? color : '#98A6AD';
        const markerIcon  = crearN3Icon(markerColor, r.icono || 'fa-circle');
        layer = L.marker(pt, { icon: markerIcon });
        popupCoords = `<p style="margin:6px 0 0;font-size:11px;color:#98A6AD">
          <i class="fas fa-location-dot" style="margin-right:4px"></i>${parseFloat(pt[0]).toFixed(7)}, ${parseFloat(pt[1]).toFixed(7)}
        </p>`;
      } else if (cfg.geom === 'polyline') {
        layer = L.polyline(coords, { color, weight: 4, opacity, dashArray: r.activo ? null : '6,4' });
      } else {
        layer = L.polygon(coords, { color, fillColor: color, fillOpacity: r.activo ? 0.18 : 0.05, weight: 2, opacity });
        const lat = coords.reduce((s, p) => s + p[0], 0) / coords.length;
        const lng = coords.reduce((s, p) => s + p[1], 0) / coords.length;
        popupCoords = `<p style="margin:6px 0 0;font-size:11px;color:#98A6AD"><i class="fas fa-location-dot" style="margin-right:4px"></i>${lat.toFixed(6)}, ${lng.toFixed(6)}</p>`;
      }

      const popup = `<div style="font-family:'Barlow',sans-serif;min-width:200px;max-width:280px">
        <strong style="color:#2A3F54;font-size:13px;display:block;margin-bottom:6px;border-bottom:1px solid #E6E9ED;padding-bottom:5px">${r.nombre}</strong>
        <table style="border-collapse:collapse;width:100%">
          ${fila('Código',              r.codigo)}
          ${fila('Dirección de Cliente',r.direccion_cliente)}
          ${cfg.geom==='marker' && coords[0] ? fila('latitude', parseFloat(coords[0][0]).toFixed(7)) : ''}
          ${cfg.geom==='marker' && coords[0] ? fila('longitude',parseFloat(coords[0][1]).toFixed(7)) : ''}
          ${fila('Supervisor',          r.supervisor)}
          ${fila('Clientes N3',         r.clientes_n3)}
          ${fila('Descripción',         r.descripcion)}
        </table>
        ${popupCoords}
      </div>`;
      layer.bindPopup(popup, { maxWidth: 300 });
      layer.addTo(geoMap);
      geoMapLayers[r.id] = layer;
    } catch {}
  });

  const allLayers = Object.values(geoMapLayers);
  if (allLayers.length > 0) {
    try {
      geoMap.fitBounds(L.featureGroup(allLayers).getBounds().pad(0.15));
    } catch {}
  }
}

function centrarGeoEnMapa(id) {
  const layer = geoMapLayers[id];
  if (!layer) return;
  try {
    if (layer.getLatLng) {
      geoMap.setView(layer.getLatLng(), 16);
    } else {
      geoMap.fitBounds(layer.getBounds().pad(0.25));
    }
    layer.openPopup();
  } catch {}
  document.getElementById('geoMainMap').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ── Modal Nueva Geocerca ───────────────────────────────────────────────────
function geoToggleCamposCliente(tipo) {
  const elCliente = document.getElementById('geoClienteFields');
  const elLatLng  = document.getElementById('geoLatLngFields');
  if (elCliente) elCliente.style.display = tipo === 'zona_n3' ? ''     : 'none';
  if (elLatLng)  elLatLng.style.display  = tipo === 'zona_n3' ? ''     : 'none';
}

function geoSetLatLngInputs(lat, lng) {
  const latEl = document.getElementById('geo_lat');
  const lngEl = document.getElementById('geo_lng');
  if (latEl) latEl.value = lat !== null ? parseFloat(lat).toFixed(7) : '';
  if (lngEl) lngEl.value = lng !== null ? parseFloat(lng).toFixed(7) : '';
}

function abrirModalGeo() {
  const cfg = GEO_TIPOS[geoTabActivo];
  document.getElementById('geo_id').value                  = '';
  document.getElementById('geo_tipo').value                = geoTabActivo;
  document.getElementById('geo_nombre').value              = '';
  document.getElementById('geo_codigo').value              = '';
  document.getElementById('geo_direccion_cliente').value   = '';
  document.getElementById('geo_supervisor').value          = '';
  document.getElementById('geo_clientes_n3').value         = '';
  document.getElementById('geo_descripcion').value         = '';
  document.getElementById('geo_color').value               = cfg.color;
  document.getElementById('geoCoordenadasHidden').value    = '';
  document.getElementById('modalGeoTitulo').textContent    = `Nueva ${cfg.labelSingle}`;
  document.getElementById('geoDrawHint').textContent       =
    cfg.geom === 'polyline' ? 'Usa la herramienta de línea para trazar la ruta. Haz clic en cada punto y doble clic para finalizar.'
    : cfg.geom === 'marker' ? 'Haz clic en el mapa para colocar el pin del cliente. Puedes arrastrarlo para ajustar la posición.'
    : 'Usa la herramienta de polígono para dibujar la zona. Haz clic en cada vértice y cierra haciendo clic en el primer punto.';
  document.getElementById('geo_icono').value = 'fa-circle';
  geoSetLatLngInputs(null, null);
  geoToggleCamposCliente(geoTabActivo);
  renderGeoIconPicker('fa-circle', cfg.color);
  abrirModal('modalGeo');
  setTimeout(() => initDrawMap(geoTabActivo, null), 220);
}

async function editarGeo(id) {
  try {
    const res  = await fetch(`api/geocercas.php?action=get&id=${id}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    const r = json.data;
    const cfg = GEO_TIPOS[r.tipo] || {};

    document.getElementById('geo_id').value                = r.id;
    document.getElementById('geo_tipo').value              = r.tipo;
    document.getElementById('geo_nombre').value            = r.nombre;
    document.getElementById('geo_codigo').value            = r.codigo || '';
    document.getElementById('geo_direccion_cliente').value = r.direccion_cliente || '';
    document.getElementById('geo_supervisor').value        = r.supervisor || '';
    document.getElementById('geo_clientes_n3').value       = r.clientes_n3 || '';
    document.getElementById('geo_descripcion').value       = r.descripcion || '';
    document.getElementById('geo_color').value             = r.color;
    document.getElementById('geoCoordenadasHidden').value  = r.coordenadas;
    document.getElementById('modalGeoTitulo').textContent = 'Editar Geocerca';
    document.getElementById('geoDrawHint').textContent    =
      cfg.geom === 'polyline' ? 'Edita los puntos de la ruta o dibuja una nueva.'
      : cfg.geom === 'marker' ? 'Haz clic en el mapa para mover el pin, o arrástralo.'
      : 'Edita los vértices de la zona o dibuja una nueva.';

    document.getElementById('geo_icono').value = r.icono || 'fa-circle';
    renderGeoIconPicker(r.icono || 'fa-circle', r.color);

    // Pre-poblar lat/lng si es N3
    if (cfg.geom === 'marker') {
      try {
        const pts = JSON.parse(r.coordenadas);
        if (pts[0]) geoSetLatLngInputs(pts[0][0], pts[0][1]);
      } catch {}
    }
    geoToggleCamposCliente(r.tipo);

    abrirModal('modalGeo');
    setTimeout(() => {
      try { initDrawMap(r.tipo, JSON.parse(r.coordenadas)); } catch {}
    }, 220);
  } catch (e) {
    toast('Error al cargar geocerca: ' + e.message, 'error');
  }
}

// ── Mapa de dibujo (modal) ─────────────────────────────────────────────────
function initDrawMap(tipo, existingCoords) {
  const container = document.getElementById('geoDrawMap');
  if (!container || !window.L) return;

  if (geoDrawMap) { geoDrawMap.remove(); geoDrawMap = null; geoDrawControl = null; geoDrawnItems = null; }

  const cfg   = GEO_TIPOS[tipo] || GEO_TIPOS.zona_roja;
  const color = document.getElementById('geo_color')?.value || cfg.color;

  geoDrawMap    = L.map('geoDrawMap').setView(GEO_CENTER, GEO_ZOOM);
  geoDrawnItems = new L.FeatureGroup();

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap', maxZoom: 19,
  }).addTo(geoDrawMap);

  geoDrawMap.addLayer(geoDrawnItems);

  if (cfg.geom === 'marker') {
    // ── Zona N3: clic para colocar marcador arrastrable ───────────────────
    const placeMarker = (latlng) => {
      geoDrawnItems.clearLayers();
      const markerColor = document.getElementById('geo_color')?.value || color;
      const markerIcono = document.getElementById('geo_icono')?.value  || 'fa-circle';
      const m = L.marker(latlng, { draggable: true, icon: crearN3Icon(markerColor, markerIcono) });
      m.on('dragend', () => {
        const ll = m.getLatLng();
        coordsDesdeLayer(m, 'marker');
        geoSetLatLngInputs(ll.lat, ll.lng);
      });
      geoDrawnItems.addLayer(m);
      coordsDesdeLayer(m, 'marker');
      geoSetLatLngInputs(latlng.lat, latlng.lng);
    };

    // Clic en mapa → colocar/mover marcador
    geoDrawMap.on('click', e => placeMarker(e.latlng));

    // Escuchar cambios en inputs lat/lng → mover marcador
    const latEl = document.getElementById('geo_lat');
    const lngEl = document.getElementById('geo_lng');
    const syncFromInputs = () => {
      const lat = parseFloat(latEl?.value);
      const lng = parseFloat(lngEl?.value);
      if (!isNaN(lat) && !isNaN(lng)) {
        placeMarker(L.latLng(lat, lng));
        geoDrawMap.setView([lat, lng], geoDrawMap.getZoom());
      }
    };
    if (latEl) latEl.addEventListener('change', syncFromInputs);
    if (lngEl) lngEl.addEventListener('change', syncFromInputs);

    // Si viene coordenada existente, colocar el marcador
    if (existingCoords && existingCoords.length >= 1) {
      const pt = existingCoords[0];
      placeMarker(L.latLng(pt[0], pt[1]));
      geoDrawMap.setView([pt[0], pt[1]], 16);
    }

  } else {
    // ── Ruta / Zona: Leaflet.draw ─────────────────────────────────────────
    if (existingCoords && existingCoords.length >= 2) {
      let layer;
      if (cfg.geom === 'polyline') {
        layer = L.polyline(existingCoords, { color, weight: 4 });
      } else {
        layer = L.polygon(existingCoords, { color, fillColor: color, fillOpacity: 0.2, weight: 2 });
      }
      geoDrawnItems.addLayer(layer);
      try { geoDrawMap.fitBounds(layer.getBounds().pad(0.2)); } catch {}
      coordsDesdeLayer(layer, cfg.geom);
    }

    geoDrawControl = new L.Control.Draw({
      position: 'topleft',
      draw: {
        polyline:     cfg.geom === 'polyline' ? { shapeOptions: { color, weight: 4 } } : false,
        polygon:      cfg.geom === 'polygon'  ? { shapeOptions: { color, fillColor: color, fillOpacity: 0.2, weight: 2 }, showArea: false } : false,
        circle: false, rectangle: false, marker: false, circlemarker: false,
      },
      edit: { featureGroup: geoDrawnItems, remove: true },
    });
    geoDrawMap.addControl(geoDrawControl);

    geoDrawMap.on(L.Draw.Event.CREATED, e => {
      geoDrawnItems.clearLayers();
      geoDrawnItems.addLayer(e.layer);
      coordsDesdeLayer(e.layer, cfg.geom);
    });
    geoDrawMap.on(L.Draw.Event.EDITED, e => {
      e.layers.eachLayer(l => coordsDesdeLayer(l, cfg.geom));
    });
    geoDrawMap.on(L.Draw.Event.DELETED, () => {
      document.getElementById('geoCoordenadasHidden').value = '';
    });
  }

  geoDrawMap.invalidateSize();
}

function coordsDesdeLayer(layer, geomType) {
  let pts;
  if (geomType === 'marker') {
    const ll = layer.getLatLng();
    pts = [[ll.lat, ll.lng]];
  } else if (geomType === 'polyline') {
    pts = layer.getLatLngs().map(ll => [ll.lat, ll.lng]);
  } else {
    const rings = layer.getLatLngs();
    const ring  = Array.isArray(rings[0]) ? rings[0] : rings;
    pts = ring.map(ll => [ll.lat, ll.lng]);
  }
  document.getElementById('geoCoordenadasHidden').value = JSON.stringify(pts);
}

// ── Toggle activo ──────────────────────────────────────────────────────────
function toggleGeo(id) {
  const fd = new FormData();
  fd.append('id', id);
  fd.append('csrf_token', CSRF_TOKEN);
  fetch('api/geocercas.php?action=toggle', { method: 'POST', body: fd })
    .then(r => r.json())
    .then(json => {
      if (!json.success) throw new Error(json.message);
      toast(json.message);
      cargarGeocercas();
    })
    .catch(e => toast(e.message, 'error'));
}

// ── Eliminar ───────────────────────────────────────────────────────────────
function eliminarGeo(id) {
  if (!confirm('¿Eliminar esta geocerca? La acción no se puede deshacer.')) return;
  const fd = new FormData();
  fd.append('id', id);
  fd.append('csrf_token', CSRF_TOKEN);
  fetch('api/geocercas.php?action=delete', { method: 'POST', body: fd })
    .then(r => r.json())
    .then(json => {
      if (!json.success) throw new Error(json.message);
      toast(json.message);
      cargarGeocercas();
    })
    .catch(e => toast(e.message, 'error'));
}

// ── Exportar Zonas N3 ─────────────────────────────────────────────────────
function exportarGeoN3() {
  if (!geoData || !geoData.length) { toast('No hay datos para exportar.', 'warn'); return; }
  const cols = ['nombre','codigo','direccion_cliente','latitude','longitude','supervisor','clientes_n3','descripcion'];
  const wsData = [
    ['nombre','codigo','direccion_cliente','latitude','longitude','supervisor','clientes_n3','descripcion'],
    ...geoData.map(r => {
      let lat = '', lng = '';
      try { const pts = JSON.parse(r.coordenadas); lat = pts[0]?.[0] ?? ''; lng = pts[0]?.[1] ?? ''; } catch {}
      return [r.nombre, r.codigo||'', r.direccion_cliente||'', lat, lng, r.supervisor||'', r.clientes_n3||'', r.descripcion||''];
    })
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [28,12,28,14,14,22,18,28].map(w => ({wch:w}));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Zonas N3');
  XLSX.writeFile(wb, `zonas_n3_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('Excel exportado');
}

// ── Descargar Plantilla N3 ────────────────────────────────────────────────
function descargarPlantillaGeoN3() {
  const wsData = [
    ['nombre','codigo','direccion_cliente','latitude','longitude','supervisor','clientes_n3','descripcion'],
    ['Corporacion Minotauro C Y M S.A.C.','12870884','Jiron Ayacucho 527','-15.4948788','-70.1345618','Christian Toscano Gonzales','CLIENTE N3 2022','Ejemplo descripción'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [28,12,28,14,14,22,18,28].map(w => ({wch:w}));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla');
  XLSX.writeFile(wb, 'plantilla_zonas_n3.xlsx');
  toast('Plantilla descargada');
}

// ── Importar Zonas N3 ─────────────────────────────────────────────────────
let geoImportRows = [];

function handleGeoN3Import(input) {
  const file = input.files[0]; if (!file) return; input.value = '';
  const ext = file.name.split('.').pop().toLowerCase();
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      let rows = [];
      if (ext === 'csv') {
        const lines = ev.target.result.trim().split('\n');
        const hdrs  = lines[0].split(',').map(h => h.trim().replace(/"/g,'').toLowerCase());
        rows = lines.slice(1).filter(l => l.trim()).map(line => {
          const vals = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g,''));
          const obj = {}; hdrs.forEach((h,i) => { obj[h] = vals[i] || ''; });
          return obj;
        });
      } else {
        const wb   = XLSX.read(ev.target.result, {type:'array'});
        rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:''});
      }

      const alias = k => rows[0] ? (rows[0][k] !== undefined ? k :
        k === 'direccion_cliente' ? 'Dirección de Cliente' :
        k === 'clientes_n3'      ? 'Clientes N3' :
        k === 'latitude'         ? 'lat' :
        k === 'longitude'        ? 'lng' : k) : k;

      geoImportRows = rows.map(r => ({
        nombre:            r.nombre            || r.NOMBRE            || '',
        codigo:            r.codigo            || r.CODIGO            || '',
        direccion_cliente: r.direccion_cliente || r['Dirección de Cliente'] || r.direccion || '',
        latitude:          r.latitude          || r.LATITUDE          || r.lat || '',
        longitude:         r.longitude         || r.LONGITUDE         || r.lng || '',
        supervisor:        r.supervisor        || r.SUPERVISOR         || '',
        clientes_n3:       r.clientes_n3       || r['Clientes N3']    || '',
        descripcion:       r.descripcion       || r.DESCRIPCION        || '',
      })).filter(r => r.nombre && r.latitude && r.longitude);

      if (!geoImportRows.length) { toast('No se encontraron filas válidas (se requiere nombre, latitude, longitude).', 'error'); return; }
      mostrarPreviewImportN3(geoImportRows);
    } catch(err) { toast('Error al leer archivo: ' + err.message, 'error'); }
  };
  if (ext === 'csv') reader.readAsText(file, 'UTF-8'); else reader.readAsArrayBuffer(file);
}

function mostrarPreviewImportN3(rows) {
  const body = document.getElementById('geoImportPreviewBody');
  if (!body) return;

  body.innerHTML = `
    <p style="font-size:13px;color:var(--gris-300);margin-bottom:12px">
      Se encontraron <strong style="color:var(--gris-100)">${rows.length} zona${rows.length!==1?'s':''} N3</strong> listas para importar.
    </p>
    <div style="max-height:300px;overflow:auto;border:1px solid var(--gris-600);border-radius:4px">
      <table class="table" style="font-size:12px;margin:0">
        <thead>
          <tr>
            <th>Nombre</th><th>Código</th><th>Dirección</th>
            <th>Latitud</th><th>Longitud</th><th>Supervisor</th><th>Clientes N3</th>
          </tr>
        </thead>
        <tbody>
          ${rows.slice(0,50).map(r => `<tr>
            <td>${escapeHtml(r.nombre)}</td>
            <td>${escapeHtml(r.codigo)}</td>
            <td>${escapeHtml(r.direccion_cliente)}</td>
            <td style="font-family:monospace">${r.latitude}</td>
            <td style="font-family:monospace">${r.longitude}</td>
            <td>${escapeHtml(r.supervisor)}</td>
            <td>${escapeHtml(r.clientes_n3)}</td>
          </tr>`).join('')}
          ${rows.length > 50 ? `<tr><td colspan="7" style="text-align:center;color:var(--gris-400)">...y ${rows.length-50} filas más</td></tr>` : ''}
        </tbody>
      </table>
    </div>`;

  abrirModal('modalGeoImport');
}

async function confirmarImportN3() {
  if (!geoImportRows.length) return;
  const btn = document.getElementById('btnConfirmarImportN3');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Importando...'; }

  const fd = new FormData();
  fd.append('rows', JSON.stringify(geoImportRows));
  fd.append('csrf_token', CSRF_TOKEN);

  try {
    const res  = await fetch('api/geocercas.php?action=batch_save', {method:'POST', body:fd});
    const json = await res.json();
    if (!json.success) throw new Error(json.message);
    toast(json.message);
    cerrarModal('modalGeoImport');
    geoImportRows = [];
    cargarGeocercas();
  } catch (e) {
    toast(e.message, 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Confirmar importación'; }
  }
}

// ── Form submit ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formGeo');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!document.getElementById('geoCoordenadasHidden').value) {
      toast('Dibuja la geocerca en el mapa antes de guardar.', 'error');
      return;
    }
    const fd = new FormData(form);
    fd.append('csrf_token', CSRF_TOKEN);
    try {
      const res  = await fetch('api/geocercas.php?action=save', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);
      toast(json.message);
      cerrarModal('modalGeo');
      if (geoDrawMap) { geoDrawMap.remove(); geoDrawMap = null; }
      cargarGeocercas();
    } catch (e) {
      toast(e.message, 'error');
    }
  });
});

// ── Menú compartir ────────────────────────────────────────────────────────
function toggleGeoShareMenu() {
  const menu = document.getElementById('geoShareMenu');
  if (!menu) return;
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}
function cerrarGeoShareMenu() {
  const menu = document.getElementById('geoShareMenu');
  if (menu) menu.style.display = 'none';
}

// ── Exportar imagen PNG ────────────────────────────────────────────────────
function exportarMapaPNG() {
  const mapEl = document.getElementById('geoMainMap');
  if (!mapEl) return;

  const TIPO = { ruta_critica:'Rutas Críticas', zona_n3:'Zonas N3', zona_roja:'Zonas Rojas' };
  const archivo = `geocercas_${TIPO[geoTabActivo]||'mapa'}_${new Date().toISOString().slice(0,10)}`;

  // Forzar re-render del mapa antes de capturar
  if (geoMap) geoMap.invalidateSize();

  toast('Generando imagen PNG...');

  // Esperar a que los tiles carguen
  setTimeout(() => {
    if (!window.html2canvas) { toast('Módulo de captura no disponible.', 'error'); return; }
    html2canvas(mapEl, {
      useCORS: true,
      allowTaint: true,
      scale: 2,
      logging: false,
      backgroundColor: '#e8e0d8',
      imageTimeout: 20000,
      onclone(doc) {
        // Asegurar que el mapa clonad tenga dimensiones correctas
        const clone = doc.getElementById('geoMainMap');
        if (clone) { clone.style.width = mapEl.offsetWidth+'px'; clone.style.height = mapEl.offsetHeight+'px'; }
      }
    }).then(canvas => {
      const a = document.createElement('a');
      a.download = archivo + '.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
      toast('Imagen PNG descargada');
    }).catch(() => toast('No se pudo capturar el mapa. Usa "Imprimir" como alternativa.', 'error'));
  }, 800);
}

// ── Imprimir mapa ─────────────────────────────────────────────────────────
function imprimirMapaGeo() {
  const TIPO  = { ruta_critica:'Rutas Críticas Carretera', zona_n3:'Zonas N3', zona_roja:'Zonas Rojas' };
  const fecha = new Date().toLocaleDateString('es-PE', { day:'2-digit', month:'long', year:'numeric' });
  const total = Object.values(geoMapLayers).length;

  const win = window.open('', '_blank', 'width=900,height=700');
  win.document.write(`<!DOCTYPE html><html lang="es"><head>
    <meta charset="UTF-8">
    <title>Geocercas — ${TIPO[geoTabActivo]||''}</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;background:#f5f5f5}
      .cabecera{background:#2A3F54;color:#fff;padding:14px 20px;display:flex;justify-content:space-between;align-items:center}
      .cabecera h1{font-size:18px;font-weight:700}
      .cabecera p{font-size:12px;opacity:.7}
      .info{background:#fff;padding:10px 20px;border-bottom:1px solid #ddd;display:flex;gap:24px;font-size:12px;color:#555}
      .info strong{color:#2A3F54}
      #mapa{height:calc(100vh - 120px)}
      @media print{.cabecera,.info{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style>
  </head><body>
    <div class="cabecera">
      <div><h1>Geocercas — ${TIPO[geoTabActivo]||''}</h1><p>Distribución Segura · SST Juliaca</p></div>
      <div style="text-align:right"><p>${fecha}</p><p>${total} geocerca${total!==1?'s':''} visible${total!==1?'s':''}</p></div>
    </div>
    <div class="info">
      <span>Centro: <strong id="cLat"></strong></span>
      <span>Zoom: <strong id="cZoom"></strong></span>
      <span>Tipo: <strong>${TIPO[geoTabActivo]||''}</strong></span>
    </div>
    <div id="mapa"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const center = ${JSON.stringify(geoMap ? [geoMap.getCenter().lat, geoMap.getCenter().lng] : GEO_CENTER)};
      const zoom   = ${geoMap ? geoMap.getZoom() : GEO_ZOOM};
      document.getElementById('cLat').textContent  = center[0].toFixed(5) + ', ' + center[1].toFixed(5);
      document.getElementById('cZoom').textContent = zoom;
      const map = L.map('mapa').setView(center, zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(map);
      const data = ${JSON.stringify(Object.values(geoMapLayers || {}).map ? [] : [])};
      // Reproducir capas desde los datos cargados
      const rows = ${JSON.stringify((geoData || []).map(r => ({ tipo:r.tipo, nombre:r.nombre, color:r.color, coordenadas:r.coordenadas, icono:r.icono||'fa-circle' })))};
      rows.forEach(r => {
        try {
          const cfg = { ruta_critica:{geom:'polyline'}, zona_n3:{geom:'marker'}, zona_roja:{geom:'polygon'} }[r.tipo] || {};
          const coords = JSON.parse(r.coordenadas);
          const color = r.color || '#3498DB';
          let layer;
          if (cfg.geom === 'marker') {
            layer = L.circleMarker(coords[0], { radius:9, color:'#fff', weight:2, fillColor:color, fillOpacity:0.9 });
          } else if (cfg.geom === 'polyline') {
            layer = L.polyline(coords, { color, weight:4 });
          } else {
            layer = L.polygon(coords, { color, fillColor:color, fillOpacity:0.18, weight:2 });
          }
          layer.bindPopup('<strong>' + r.nombre + '</strong>').addTo(map);
        } catch(e){}
      });
      setTimeout(() => { map.invalidateSize(); window.print(); }, 1500);
    <\/script>
  </body></html>`);
  win.document.close();
}

// ── Copiar enlace del mapa ────────────────────────────────────────────────
function copiarEnlaceGeo() {
  const center = geoMap ? geoMap.getCenter() : { lat: GEO_CENTER[0], lng: GEO_CENTER[1] };
  const zoom   = geoMap ? geoMap.getZoom() : GEO_ZOOM;
  const url = `${window.location.origin}${window.location.pathname}?geo_tipo=${geoTabActivo}&lat=${center.lat.toFixed(6)}&lng=${center.lng.toFixed(6)}&zoom=${zoom}`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => {
      toast('Enlace copiado al portapapeles');
      cerrarGeoShareMenu();
    }).catch(() => _copiarFallback(url));
  } else {
    _copiarFallback(url);
  }
}
function _copiarFallback(texto) {
  const ta = document.createElement('textarea');
  ta.value = texto;
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  toast('Enlace copiado al portapapeles');
  cerrarGeoShareMenu();
}

// ── Compartir por WhatsApp ────────────────────────────────────────────────
function compartirWhatsApp() {
  const TIPO = { ruta_critica:'Rutas Críticas Carretera', zona_n3:'Zonas N3', zona_roja:'Zonas Rojas' };
  const center = geoMap ? geoMap.getCenter() : { lat: GEO_CENTER[0], lng: GEO_CENTER[1] };
  const zoom   = geoMap ? geoMap.getZoom() : GEO_ZOOM;
  const enlace = `${window.location.origin}${window.location.pathname}?geo_tipo=${geoTabActivo}&lat=${center.lat.toFixed(6)}&lng=${center.lng.toFixed(6)}&zoom=${zoom}`;
  const total  = Object.keys(geoMapLayers).length;
  const texto  = `*Geocercas Distribución Segura — ${TIPO[geoTabActivo]||''}*\n${total} geocerca${total!==1?'s':''} | SST Juliaca\n${enlace}`;
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  cerrarGeoShareMenu();
}

// ── Exportar GeoJSON ──────────────────────────────────────────────────────
function exportarGeoJSON() {
  if (!geoData || !geoData.length) { toast('No hay geocercas para exportar.', 'warn'); return; }
  const TIPO = { ruta_critica:'Rutas Críticas Carretera', zona_n3:'Zonas N3', zona_roja:'Zonas Rojas' };

  const features = geoData.map(r => {
    try {
      const coords  = JSON.parse(r.coordenadas);
      const cfg     = GEO_TIPOS[r.tipo] || {};
      let geometry;
      if (cfg.geom === 'marker') {
        geometry = { type:'Point', coordinates:[coords[0][1], coords[0][0]] };
      } else if (cfg.geom === 'polyline') {
        geometry = { type:'LineString', coordinates: coords.map(p => [p[1], p[0]]) };
      } else {
        const ring = [...coords.map(p => [p[1], p[0]])];
        if (ring[0][0] !== ring[ring.length-1][0] || ring[0][1] !== ring[ring.length-1][1]) ring.push(ring[0]);
        geometry = { type:'Polygon', coordinates:[ring] };
      }
      return {
        type: 'Feature',
        geometry,
        properties: {
          id: r.id, nombre: r.nombre, tipo: r.tipo, tipo_label: TIPO[r.tipo]||r.tipo,
          color: r.color, activo: r.activo==1,
          codigo: r.codigo||null, direccion_cliente: r.direccion_cliente||null,
          supervisor: r.supervisor||null, clientes_n3: r.clientes_n3||null,
          descripcion: r.descripcion||null,
        }
      };
    } catch { return null; }
  }).filter(Boolean);

  const geojson = { type:'FeatureCollection', features,
    metadata: { generado: new Date().toISOString(), tipo: geoTabActivo, total: features.length, sistema:'Distribución Segura SST Juliaca' }
  };

  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type:'application/geo+json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `geocercas_${geoTabActivo}_${new Date().toISOString().slice(0,10)}.geojson`;
  a.click();
  toast(`GeoJSON exportado (${features.length} features)`);
}
