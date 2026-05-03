  <!-- ===== PAGE: REPORTES ===== -->
  <div class="page-content" id="page-reportes" style="display:none">
    <h2 style="font-family:var(--font-display);font-size:24px;font-weight:800;color:var(--gris-100);margin-bottom:24px">
      <i class="fas fa-chart-bar" style="color:var(--amarillo)"></i> Reportes
    </h2>
    <div class="card">
      <div class="card-body" style="text-align:center;padding:48px">
        <i class="fas fa-file-pdf" style="font-size:48px;color:var(--amarillo);margin-bottom:16px;display:block"></i>
        <h3 style="font-family:var(--font-display);font-size:20px;color:var(--gris-100);margin-bottom:8px">Generación de Reportes</h3>
        <p style="color:var(--gris-400);margin-bottom:24px">Selecciona el tipo de reporte que deseas generar</p>
        <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="generarReporteMes()">
            <i class="fas fa-calendar-alt"></i> Reporte Mensual
          </button>
          <button class="btn btn-outline" onclick="exportarExcel()">
            <i class="fas fa-file-excel"></i> Exportar Excel
          </button>
        </div>
      </div>
    </div>
  </div>
