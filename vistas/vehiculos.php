  <!-- ===== PAGE: VEHÍCULOS (consulta en vivo desde vigilancia) ===== -->
  <div class="page-content" id="page-vehiculos" style="display:none">

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--gris-100)">
          <i class="fas fa-truck" style="color:var(--amarillo)"></i> Vehículos
        </h2>
        <p style="color:var(--gris-400);font-size:13px;margin-top:2px">
          Catálogo de la flota · consulta en vivo desde vigilancia <span id="vehTotal"></span>
        </p>
      </div>
    </div>

    <!-- Filtros -->
    <div class="card" style="margin-bottom:18px">
      <div class="card-body" style="padding:16px 22px">
        <div class="filter-bar">
          <div class="form-group">
            <label class="form-label">Buscar</label>
            <input type="text" class="form-control" id="vehBuscar" placeholder="Placa, marca o N° serie" oninput="vehBuscarDebounced()">
          </div>
          <div class="form-group">
            <label class="form-label">Estado</label>
            <select class="form-control" id="vehFiltroEstado" onchange="cargarVehiculos()">
              <option value="">Todos</option>
            </select>
          </div>
          <div class="form-group" style="align-self:end">
            <button class="btn btn-primary" onclick="cargarVehiculos()"><i class="fas fa-magnifying-glass"></i> Buscar</button>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body" style="overflow-x:auto">
        <table class="data-table">
          <thead>
            <tr><th>Placa</th><th>Tipo</th><th>Marca</th><th>Modelo</th>
                <th style="text-align:right">Año</th><th>N° Serie</th><th>Estado</th></tr>
          </thead>
          <tbody id="vehBody">
            <tr><td colspan="7" class="muted" style="text-align:center;padding:26px">Cargando…</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
