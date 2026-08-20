-- ============================================================
-- Migración: Inventario de equipos físicos (unidades) para el Checklist
-- Dashboard por tipo de equipo (equipos individuales con código, ubicación,
-- área y vencimiento) + vínculo de la inspección a la unidad.
-- Idempotente: seguro de re-ejecutar.
-- Uso Hostinger:
--   mysql -u u248634042_dist_user -p u248634042_distribucion_s < deploy/chk_unidades.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS chk_unidades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    componente_id INT NOT NULL,
    codigo VARCHAR(40) NOT NULL,
    nombre VARCHAR(160) NOT NULL,
    ubicacion VARCHAR(120) NULL,
    area VARCHAR(80) NULL,
    vencimiento DATE NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_chkuni_codigo (codigo),
    KEY idx_chkuni_comp (componente_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Vincular la inspección a una unidad de inventario (si la columna no existe).
SET @col := (SELECT COUNT(*) FROM information_schema.columns
             WHERE table_schema = DATABASE()
               AND table_name = 'chk_inspecciones'
               AND column_name = 'unidad_id');
SET @sql := IF(@col = 0,
    'ALTER TABLE chk_inspecciones ADD COLUMN unidad_id INT NULL AFTER componente_id',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Área de la inspección (cumplimiento por área también para inspecciones por placa).
SET @colA := (SELECT COUNT(*) FROM information_schema.columns
              WHERE table_schema = DATABASE()
                AND table_name = 'chk_inspecciones'
                AND column_name = 'area');
SET @sqlA := IF(@colA = 0,
    'ALTER TABLE chk_inspecciones ADD COLUMN area VARCHAR(80) NULL AFTER placa',
    'SELECT 1');
PREPARE stmtA FROM @sqlA; EXECUTE stmtA; DEALLOCATE PREPARE stmtA;
