-- ============================================================
-- MÓDULO EMPRESAS (multi-empresa, Fase 1) — respaldo/documentación
-- La app crea esto automáticamente vía setupEmpresas() (includes/auth.php);
-- este archivo es solo referencia. NO es necesario ejecutarlo en el deploy.
-- ============================================================

CREATE TABLE IF NOT EXISTS empresas (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    razon_social  VARCHAR(200) NOT NULL,
    ruc           VARCHAR(20)  NULL,
    tipo          VARCHAR(40)  NOT NULL DEFAULT 'tercerizacion',
    domicilio     VARCHAR(255) NULL,
    actividad     VARCHAR(200) NULL,
    responsable   VARCHAR(150) NULL,
    telefono      VARCHAR(30)  NULL,
    email         VARCHAR(150) NULL,
    logo          VARCHAR(255) NULL,
    color         VARCHAR(20)  NULL,
    activo        TINYINT(1)   NOT NULL DEFAULT 1,
    creado_en     DATETIME     DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_empresa_ruc (ruc)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Enlace del trabajador a su empresa.
ALTER TABLE personal ADD COLUMN empresa_id INT NULL AFTER empresa;

-- Migración (idempotente en setupEmpresas): convierte los textos distintos de
-- personal.empresa en filas de empresas y enlaza empresa_id.
