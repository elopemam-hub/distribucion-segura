-- ============================================================
-- PREVIEW — Nombres que NO están en mayúsculas
-- ============================================================
-- Este archivo SOLO LEE. No modifica nada. Ejecútalo primero para ver
-- exactamente qué filas cambiaría deploy/normalizar_nombres.sql
--
--   mysql -u u248634042_dist_user -p u248634042_distribucion_s < deploy/normalizar_nombres_preview.sql
--
-- ── NOTA IMPORTANTE SOBRE LA COLACIÓN ──────────────────────────────────
-- Las tablas usan utf8mb4_unicode_ci, que es CASE-INSENSITIVE: para MySQL
-- 'juan perez' = 'JUAN PEREZ', así que un WHERE nombre <> UPPER(nombre)
-- devolvería CERO filas aunque existan minúsculas. Por eso todas las
-- comparaciones de abajo usan BINARY, que sí distingue mayúsculas.
-- ──────────────────────────────────────────────────────────────────────

-- ── 1. Conteo global de lo que se cambiaría ──
SELECT 'inspecciones.conductor' AS columna,
       COUNT(*) AS filas_a_cambiar
  FROM inspecciones
 WHERE conductor IS NOT NULL AND BINARY conductor <> UPPER(conductor)
UNION ALL
SELECT 'inspecciones.reparto',  COUNT(*)
  FROM inspecciones
 WHERE reparto   IS NOT NULL AND BINARY reparto   <> UPPER(reparto)
UNION ALL
SELECT 'tripulacion.nombre',    COUNT(*)
  FROM tripulacion
 WHERE nombre    IS NOT NULL AND BINARY nombre    <> UPPER(nombre)
UNION ALL
SELECT 'evaluaciones.nombre',   COUNT(*)
  FROM evaluaciones
 WHERE nombre    IS NOT NULL AND BINARY nombre    <> UPPER(nombre);

-- ── 2. Detalle: inspecciones ──
SELECT id, fecha, unidad,
       conductor AS actual,
       UPPER(conductor) AS quedaria
  FROM inspecciones
 WHERE conductor IS NOT NULL AND BINARY conductor <> UPPER(conductor)
 ORDER BY id;

SELECT id, fecha, unidad,
       reparto AS actual,
       UPPER(reparto) AS quedaria
  FROM inspecciones
 WHERE reparto IS NOT NULL AND BINARY reparto <> UPPER(reparto)
 ORDER BY id;

-- ── 3. Detalle: tripulacion ──
SELECT id, inspeccion_id, rol,
       nombre AS actual,
       UPPER(nombre) AS quedaria
  FROM tripulacion
 WHERE nombre IS NOT NULL AND BINARY nombre <> UPPER(nombre)
 ORDER BY inspeccion_id, id;

-- ── 4. Detalle: evaluaciones ──
SELECT id, fecha, tipo, dni,
       nombre AS actual,
       UPPER(nombre) AS quedaria
  FROM evaluaciones
 WHERE nombre IS NOT NULL AND BINARY nombre <> UPPER(nombre)
 ORDER BY id;

-- ── 5. Informativo: tabla personal ──
-- No se toca en la migración. Es la fuente del autocompletado; los módulos
-- ya convierten a mayúsculas al guardar, así que normalizarla es opcional.
-- Revisa el conteo y decide.
SELECT 'personal.nombre (NO se modifica)' AS nota, COUNT(*) AS filas_en_minuscula
  FROM personal
 WHERE nombre IS NOT NULL AND BINARY nombre <> UPPER(nombre);
