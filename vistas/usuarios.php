  <!-- ===== PAGE: USUARIOS ===== -->
  <div class="page-content" id="page-usuarios" style="display:none">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px">
      <div>
        <h2 style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--gris-100)">
          <i class="fas fa-users" style="color:var(--amarillo)"></i> Usuarios
        </h2>
        <p style="color:var(--gris-400);font-size:13px;margin-top:2px">Administración de accesos al sistema</p>
      </div>
      <button class="btn btn-primary btn-sm" onclick="abrirModalUsuario()">
        <i class="fas fa-user-plus"></i> Nuevo Usuario
      </button>
    </div>
    <div class="card">
      <div class="card-body" style="padding:0">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nombre</th><th>Usuario</th><th>Rol</th>
                <th>Estado</th><th>Creado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody id="tablaUsuariosBody">
              <tr><td colspan="6" style="text-align:center;padding:32px;color:var(--gris-400)"><div class="spinner"></div></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
