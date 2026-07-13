-- ============================================================
-- MIGRACIÓN: Tabla eval_formularios + cambio ENUM → VARCHAR
-- Ejecutar UNA VEZ después de banco_preguntas_seed.sql
-- ============================================================

-- 1. Nueva tabla de formularios
CREATE TABLE IF NOT EXISTS eval_formularios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  formulario_id VARCHAR(50)  NOT NULL,
  titulo        VARCHAR(200) NOT NULL,
  icono         VARCHAR(60)  NOT NULL DEFAULT 'fa-clipboard-list',
  color         VARCHAR(30)  NOT NULL DEFAULT '#1565C0',
  orden         INT          NOT NULL DEFAULT 0,
  activo        TINYINT(1)   NOT NULL DEFAULT 1,
  UNIQUE KEY uk_formulario_id (formulario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Insertar los 3 formularios existentes
INSERT IGNORE INTO eval_formularios (formulario_id, titulo, icono, color, orden) VALUES
('manejo_practica',  'Manejo Práctica',  'fa-truck',          '#FFC107', 1),
('examen_defensiva', 'Examen Defensiva', 'fa-shield-halved',  '#1565C0', 2),
('induccion_t2',     'Inducción T2',     'fa-graduation-cap', '#28A745', 3);

-- 3. Cambiar ENUM a VARCHAR en eval_secciones (permite nuevos formularios)
ALTER TABLE eval_secciones MODIFY formulario VARCHAR(50) NOT NULL;

-- Nota: si evaluaciones.tipo también es ENUM, ejecutar también:
-- ALTER TABLE evaluaciones MODIFY tipo VARCHAR(50) NOT NULL;
