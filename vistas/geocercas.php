  <div class="page-content" id="page-geocercas" style="display:none">

    <!-- Cabecera -->
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:16px">
      <div>
        <h2 style="font-family:var(--font-display);font-size:22px;font-weight:800;color:var(--gris-100);margin:0">
          <i class="fas fa-draw-polygon" style="color:var(--primary)"></i> Geocercas
        </h2>
        <p style="font-size:12px;color:var(--gris-400);margin:3px 0 0">Rutas críticas, zonas N3 y zonas rojas</p>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <!-- Botón compartir/exportar -->
        <div style="position:relative" id="geoShareWrap">
          <button class="btn btn-outline" onclick="toggleGeoShareMenu()" id="btnGeoShare">
            <i class="fas fa-share-nodes"></i> Compartir
          </button>
          <div id="geoShareMenu" style="display:none;position:absolute;right:0;top:calc(100% + 6px);background:#fff;border:1px solid #E6E9ED;border-radius:6px;box-shadow:0 6px 24px rgba(0,0,0,.12);min-width:210px;z-index:9999;overflow:hidden">
            <div style="padding:8px 12px;font-size:10px;font-weight:700;color:#98A6AD;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #E6E9ED">Exportar mapa</div>
            <button class="geo-share-opt" onclick="exportarMapaPNG();cerrarGeoShareMenu()"><i class="fas fa-image"></i> Descargar imagen PNG</button>
            <button class="geo-share-opt" onclick="imprimirMapaGeo();cerrarGeoShareMenu()"><i class="fas fa-print"></i> Imprimir mapa</button>
            <div style="padding:8px 12px;font-size:10px;font-weight:700;color:#98A6AD;text-transform:uppercase;letter-spacing:.08em;border-top:1px solid #E6E9ED;border-bottom:1px solid #E6E9ED">Compartir enlace</div>
            <button class="geo-share-opt" onclick="copiarEnlaceGeo()"><i class="fas fa-link"></i> Copiar enlace del mapa</button>
            <button class="geo-share-opt" onclick="compartirWhatsApp()"><i class="fab fa-whatsapp" style="color:#25D366"></i> Compartir por WhatsApp</button>
            <div style="padding:8px 12px;font-size:10px;font-weight:700;color:#98A6AD;text-transform:uppercase;letter-spacing:.08em;border-top:1px solid #E6E9ED;border-bottom:1px solid #E6E9ED">Exportar datos</div>
            <button class="geo-share-opt" onclick="exportarGeoJSON();cerrarGeoShareMenu()"><i class="fas fa-code"></i> Exportar GeoJSON</button>
          </div>
        </div>
        <button class="btn btn-outline" onclick="geoPortal()" title="QR único con todas las rutas para conductores">
          <i class="fas fa-qrcode"></i> Portal del Conductor
        </button>
        <?php if (in_array($user['rol'], ['administrador','supervisor'])): ?>
        <button class="btn btn-primary" onclick="abrirModalGeo()">
          <i class="fas fa-plus"></i> Nueva Geocerca
        </button>
        <?php endif; ?>
      </div>
    </div>

    <!-- KPI cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:16px">
      <div class="card" style="padding:14px 16px;border-top:3px solid var(--primary)">
        <div style="font-size:24px;font-weight:800;color:var(--gris-100)" id="geoStatTotal">—</div>
        <div style="font-size:11px;color:var(--gris-400);font-weight:600;margin-top:2px">Total</div>
      </div>
      <div class="card" style="padding:14px 16px;border-top:3px solid #F39C12">
        <div style="font-size:24px;font-weight:800;color:#F39C12" id="geoStatRutas">—</div>
        <div style="font-size:11px;color:var(--gris-400);font-weight:600;margin-top:2px"><i class="fas fa-road" style="margin-right:4px"></i>Rutas Críticas</div>
      </div>
      <div class="card" style="padding:14px 16px;border-top:3px solid #3498DB">
        <div style="font-size:24px;font-weight:800;color:#3498DB" id="geoStatN3">—</div>
        <div style="font-size:11px;color:var(--gris-400);font-weight:600;margin-top:2px"><i class="fas fa-map-location-dot" style="margin-right:4px"></i>Zonas N3</div>
      </div>
      <div class="card" style="padding:14px 16px;border-top:3px solid #E74C3C">
        <div style="font-size:24px;font-weight:800;color:#E74C3C" id="geoStatRojas">—</div>
        <div style="font-size:11px;color:var(--gris-400);font-weight:600;margin-top:2px"><i class="fas fa-circle-exclamation" style="margin-right:4px"></i>Zonas Rojas</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tab-bar" style="margin-bottom:14px;border-bottom:none;padding-bottom:0;gap:6px">
      <button class="tab-btn geo-tab-btn active" data-tipo="ruta_critica" onclick="switchGeoTab('ruta_critica')">
        <i class="fas fa-road" style="color:#F39C12;margin-right:5px"></i> Rutas Críticas Carretera
      </button>
      <button class="tab-btn geo-tab-btn" data-tipo="zona_n3" onclick="switchGeoTab('zona_n3')">
        <i class="fas fa-map-location-dot" style="color:#3498DB;margin-right:5px"></i> Zonas N3
      </button>
      <button class="tab-btn geo-tab-btn" data-tipo="zona_roja" onclick="switchGeoTab('zona_roja')">
        <i class="fas fa-circle-exclamation" style="color:#E74C3C;margin-right:5px"></i> Zonas Rojas
      </button>
    </div>

    <!-- Toolbar Zonas N3 (import/export) -->
    <div id="geoN3Toolbar" style="display:none;margin-bottom:12px">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-outline btn-sm" onclick="descargarPlantillaGeoN3()">
          <i class="fas fa-download"></i> Plantilla
        </button>
        <label class="btn btn-outline btn-sm" style="cursor:pointer;margin:0">
          <i class="fas fa-file-import"></i> Importar Excel
          <input type="file" id="inputImportGeoN3" accept=".xlsx,.xls,.csv" style="display:none" onchange="handleGeoN3Import(this)">
        </label>
        <button class="btn btn-outline btn-sm" onclick="exportarGeoN3()" style="color:#1ABB9C;border-color:rgba(26,187,156,.4)">
          <i class="fas fa-file-excel"></i> Exportar Excel
        </button>
        <span id="geoN3Count" style="font-size:11px;color:var(--gris-400);margin-left:4px"></span>
      </div>
    </div>

    <!-- Mapa principal -->
    <div class="card" style="margin-bottom:16px;padding:0;overflow:hidden">
      <div id="geoMainMap" style="height:600px;width:100%"></div>
    </div>

    <!-- Tabla -->
    <div class="card">
      <div style="overflow-x:auto">
        <table class="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Descripción</th>
              <th>Puntos</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="geoTablaBody">
            <tr><td colspan="5" style="text-align:center;padding:32px;color:var(--gris-400)">Cargando...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

  </div><!-- /page-geocercas -->
