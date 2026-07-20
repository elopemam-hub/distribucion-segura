-- ============================================================
-- MIGRACIÓN: Formulario público de Evaluaciones (Link + QR sin login)
-- Ejecutar DESPUÉS de evaluaciones_schema.sql
-- ============================================================

-- El respondiente público no tiene usuario → evaluador_id puede ser NULL
ALTER TABLE `evaluaciones` MODIFY `evaluador_id` INT NULL;

-- Distingue el origen del registro: 'interno' (panel logueado) o 'publico' (link/QR)
-- Nota: si la columna ya existe, MySQL dará error 1060 (ignorable en re-ejecución).
ALTER TABLE `evaluaciones`
    ADD COLUMN `origen` VARCHAR(20) NOT NULL DEFAULT 'interno' AFTER `evaluador_id`;
