-- ============================================================
-- KPI File Types — Tipos JORLAB y RSIF
-- Ejecutar una sola vez en phpMyAdmin de Hostinger
-- ============================================================

INSERT IGNORE INTO `kpi_file_types`
    (codigo, descripcion, formato, max_mb, tabla_destino, activo, orden)
VALUES
    ('JORLAB', 'Jornada Laboral — columnas ENTRADA / SALIDA por turno', 'xlsx', 10, NULL, 1, 30),
    ('RSIF',   'Ruta SIF — registros de ruta por placa y distrito',     'xlsx', 10, NULL, 1, 40);
