-- ============================================================
-- Migración: Señalización de rutas críticas (puntos) + compartir por token
-- geo_puntos: velocidad máxima, curvas y otros peligros sobre la ruta.
-- geocercas: token_publico + publico para el Mapa del Conductor (QR/link).
-- Idempotente. Uso Hostinger:
--   mysql -u u248634042_dist_user -p u248634042_distribucion_s < deploy/geo_puntos.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS geo_puntos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    geocerca_id INT NOT NULL,
    tipo VARCHAR(30) NOT NULL DEFAULT 'velocidad_max',
    lat DECIMAL(10,7) NOT NULL,
    lng DECIMAL(10,7) NOT NULL,
    velocidad INT NULL,
    descripcion VARCHAR(200) NULL,
    severidad ENUM('info','precaucion','peligro') NOT NULL DEFAULT 'precaucion',
    orden INT NOT NULL DEFAULT 0,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    KEY idx_geopunto_cerca (geocerca_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- token_publico
SET @c1 := (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema=DATABASE() AND table_name='geocercas' AND column_name='token_publico');
SET @s1 := IF(@c1=0, 'ALTER TABLE geocercas ADD COLUMN token_publico VARCHAR(32) NULL', 'SELECT 1');
PREPARE st1 FROM @s1; EXECUTE st1; DEALLOCATE PREPARE st1;

-- publico
SET @c2 := (SELECT COUNT(*) FROM information_schema.columns
            WHERE table_schema=DATABASE() AND table_name='geocercas' AND column_name='publico');
SET @s2 := IF(@c2=0, 'ALTER TABLE geocercas ADD COLUMN publico TINYINT(1) NOT NULL DEFAULT 0', 'SELECT 1');
PREPARE st2 FROM @s2; EXECUTE st2; DEALLOCATE PREPARE st2;
