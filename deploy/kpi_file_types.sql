-- ============================================================
-- KPI File Types — Tipos de archivo para KPI Analytics
-- Ejecutar en phpMyAdmin ANTES de usar "Tipo de Archivo"
-- ============================================================

CREATE TABLE IF NOT EXISTS `kpi_file_types` (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    codigo        VARCHAR(20)  NOT NULL,
    descripcion   VARCHAR(200) NOT NULL,
    formato       VARCHAR(20)  NOT NULL DEFAULT 'xlsx',
    max_mb        INT          NOT NULL DEFAULT 5,
    tabla_destino VARCHAR(100) NULL,
    activo        TINYINT(1)   NOT NULL DEFAULT 1,
    orden         INT          NOT NULL DEFAULT 0,
    creado_en     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
