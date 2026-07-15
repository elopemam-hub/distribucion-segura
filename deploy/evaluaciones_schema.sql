-- ============================================================
-- MIGRACIÓN: Tabla evaluaciones
-- Ejecutar DESPUÉS de banco_preguntas_seed.sql y agregar_formularios.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS `evaluaciones` (
    `id`                    INT           AUTO_INCREMENT PRIMARY KEY,
    `tipo`                  VARCHAR(50)   NOT NULL,
    `fecha`                 DATE          NOT NULL,
    `empresa`               VARCHAR(200)  NULL,
    `nombre`                VARCHAR(200)  NOT NULL,
    `dni`                   VARCHAR(20)   NOT NULL,
    `puesto`                VARCHAR(100)  NULL,
    `tipo_unidad`           VARCHAR(100)  NULL,
    `estado_unidad`         VARCHAR(100)  NULL,
    `conductor_tipo`        VARCHAR(100)  NULL,
    `respuestas`            JSON          NOT NULL,
    `puntaje`               DECIMAL(6,2)  NOT NULL DEFAULT 0,
    `puntaje_maximo`        DECIMAL(6,2)  NOT NULL DEFAULT 20,
    `porcentaje`            DECIMAL(6,2)  NOT NULL DEFAULT 0,
    `observaciones`         TEXT          NULL,
    `firma_evaluado`        MEDIUMTEXT    NULL,
    `evaluador_id`          INT           NOT NULL,
    `estado`                VARCHAR(30)   NOT NULL DEFAULT 'pendiente_revision',
    `aprobado_por`          INT           NULL,
    `aprobado_en`           TIMESTAMP     NULL,
    `firma_aprobador`       MEDIUMTEXT    NULL,
    `comentario_aprobacion` TEXT          NULL,
    `created_at`            TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_eval_tipo`      (`tipo`),
    KEY `idx_eval_estado`    (`estado`),
    KEY `idx_eval_fecha`     (`fecha`),
    KEY `idx_eval_evaluador` (`evaluador_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
