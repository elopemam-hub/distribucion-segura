-- ============================================================
-- KPI Analytics — Migración de base de datos
-- Ejecutar una sola vez en phpMyAdmin o MySQL CLI
-- ============================================================

CREATE TABLE IF NOT EXISTS `kpi_datasets` (
    `id`          INT           AUTO_INCREMENT PRIMARY KEY,
    `nombre`      VARCHAR(120)  NOT NULL,
    `columnas`    JSON          NOT NULL COMMENT '[{nombre, tipo: dimension|metrica|fecha|ignorar}]',
    `mapeo`       JSON          DEFAULT NULL,
    `total_filas` INT           NOT NULL DEFAULT 0,
    `creado_por`  INT           NOT NULL,
    `creado_en`   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_kd_creado_por` (`creado_por`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kpi_data` (
    `id`         BIGINT    AUTO_INCREMENT PRIMARY KEY,
    `dataset_id` INT       NOT NULL,
    `fila`       JSON      NOT NULL,
    `num_fila`   INT       NOT NULL DEFAULT 0,
    KEY `idx_kdata_dataset` (`dataset_id`),
    CONSTRAINT `fk_kdata_dataset`
        FOREIGN KEY (`dataset_id`) REFERENCES `kpi_datasets`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kpi_widgets` (
    `id`         INT          AUTO_INCREMENT PRIMARY KEY,
    `dataset_id` INT          NOT NULL,
    `titulo`     VARCHAR(100) NOT NULL,
    `tipo_chart` ENUM('line','bar','area','pie','donut','radar','heatmap','radialBar')
                 NOT NULL DEFAULT 'bar',
    `config`     JSON         NOT NULL,
    `creado_por` INT          NOT NULL,
    `creado_en`  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_kw_dataset` (`dataset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `kpi_dashboards` (
    `id`               INT          AUTO_INCREMENT PRIMARY KEY,
    `nombre`           VARCHAR(100) NOT NULL,
    `layout`           JSON         DEFAULT NULL,
    `filtros_globales` JSON         DEFAULT NULL,
    `creado_por`       INT          NOT NULL,
    `creado_en`        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_kdash_creado_por` (`creado_por`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
