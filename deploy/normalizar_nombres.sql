-- ============================================================
-- MIGRACIÓN — Normalizar nombres a MAYÚSCULAS
-- ============================================================
-- ESTE ARCHIVO MODIFICA DATOS DE PRODUCCIÓN. No es reversible sin backup.
--
-- ORDEN DE EJECUCIÓN:
--   1. Ejecuta deploy/normalizar_nombres_preview.sql y revisa las filas.
--   2. Haz backup de las 3 tablas (comando abajo).
--   3. Recién entonces ejecuta este archivo.
--
-- BACKUP (desde SSH, antes de correr esto):
--   mysqldump -u u248634042_dist_user -p u248634042_distribucion_s \
--     inspecciones tripulacion evaluaciones \
--     > ~/backup_nombres_$(date +%F).sql
--
-- EJECUCIÓN:
--   mysql -u u248634042_dist_user -p u248634042_distribucion_s < deploy/normalizar_nombres.sql
--
-- Sobre BINARY en el WHERE: las tablas usan utf8mb4_unicode_ci, que es
-- case-insensitive. Sin BINARY el WHERE no filtraría nada y el UPDATE
-- reescribiría todas las filas innecesariamente.
-- ============================================================

START TRANSACTION;

UPDATE inspecciones
   SET conductor = UPPER(conductor)
 WHERE conductor IS NOT NULL AND BINARY conductor <> UPPER(conductor);

UPDATE inspecciones
   SET reparto = UPPER(reparto)
 WHERE reparto IS NOT NULL AND BINARY reparto <> UPPER(reparto);

UPDATE tripulacion
   SET nombre = UPPER(nombre)
 WHERE nombre IS NOT NULL AND BINARY nombre <> UPPER(nombre);

UPDATE evaluaciones
   SET nombre = UPPER(nombre)
 WHERE nombre IS NOT NULL AND BINARY nombre <> UPPER(nombre);

-- Verificación: las 4 cifras deben ser 0 después de los UPDATE.
SELECT 'inspecciones.conductor' AS columna, COUNT(*) AS pendientes
  FROM inspecciones WHERE conductor IS NOT NULL AND BINARY conductor <> UPPER(conductor)
UNION ALL
SELECT 'inspecciones.reparto',  COUNT(*)
  FROM inspecciones WHERE reparto IS NOT NULL AND BINARY reparto <> UPPER(reparto)
UNION ALL
SELECT 'tripulacion.nombre',    COUNT(*)
  FROM tripulacion  WHERE nombre IS NOT NULL AND BINARY nombre <> UPPER(nombre)
UNION ALL
SELECT 'evaluaciones.nombre',   COUNT(*)
  FROM evaluaciones WHERE nombre IS NOT NULL AND BINARY nombre <> UPPER(nombre);

COMMIT;
