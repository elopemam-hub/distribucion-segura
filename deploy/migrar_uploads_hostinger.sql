-- ============================================================
-- MIGRACIÓN: Reorganizar rutas de imágenes de inspecciones
-- Ejecutar UNA SOLA VEZ en Hostinger via phpMyAdmin
-- ============================================================

-- 1. Mover fotos de inspecciones al subdirectorio inspecciones/
--    (solo las que aún no tienen el prefijo)
UPDATE evidencias
SET ruta_imagen = CONCAT('inspecciones/', ruta_imagen)
WHERE ruta_imagen NOT LIKE 'inspecciones/%'
  AND ruta_imagen NOT LIKE 'amonestaciones/%'
  AND ruta_imagen NOT LIKE 'telemetria/%'
  AND ruta_imagen NOT LIKE 'personal/%';

-- Verificar resultado:
-- SELECT id, ruta_imagen FROM evidencias ORDER BY id;
