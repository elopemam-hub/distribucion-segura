-- ============================================================
-- MÓDULO EPP (Equipos de Protección Personal) — Esquema Fase 1 + 2
-- ============================================================
-- Base legal: Ley N° 29783 (Art. 60), D.S. 005-2012-TR (Art. 97),
-- R.M. 050-2013-TR (registro obligatorio de entrega de EPP).
--
-- NOTA: la aplicación crea y siembra estas tablas automáticamente vía
-- setupEpp() en includes/auth.php (CREATE IF NOT EXISTS + INSERT IGNORE).
-- Este archivo es respaldo/documentación; no es obligatorio ejecutarlo.
--
--   mysql -u USER -p BASE < deploy/epp_schema.sql
-- ============================================================

-- ── Catálogo de tipos de EPP ──
-- Un renglón por variante (código + talla). Stock mín/máx se derivan del
-- consumo anual (× stock_min_pct / stock_max_pct de epp_config).
CREATE TABLE IF NOT EXISTS `epp_tipos` (
  `id`             INT AUTO_INCREMENT PRIMARY KEY,
  `codigo`         VARCHAR(40)  NULL,
  `nombre`         VARCHAR(120) NOT NULL,
  `marca`          VARCHAR(80)  NULL,
  `categoria`      VARCHAR(80)  NOT NULL DEFAULT 'General',
  `talla`          VARCHAR(20)  NULL,
  `consumo_anual`  INT          NOT NULL DEFAULT 0,
  `norma_tecnica`  VARCHAR(120) NULL,
  `vida_util_dias` INT          NOT NULL DEFAULT 180 COMMENT 'Para calcular fecha de renovación',
  `stock_minimo`   INT          NOT NULL DEFAULT 0 COMMENT 'Derivado: consumo × min%',
  `stock_maximo`   INT          NOT NULL DEFAULT 0 COMMENT 'Derivado: consumo × max%',
  `unidad`         VARCHAR(30)  NOT NULL DEFAULT 'unidad',
  `imagen`         VARCHAR(255) NULL COMMENT 'Ruta relativa en uploads/epp/',
  `activo`         TINYINT(1)   NOT NULL DEFAULT 1,
  `creado_en`      DATETIME     DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_epp_tipo_codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Proveedores ──
CREATE TABLE IF NOT EXISTS `epp_proveedores` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `razon_social`    VARCHAR(200) NOT NULL,
  `ruc`             VARCHAR(20)  NULL,
  `contacto`        VARCHAR(150) NULL,
  `telefono`        VARCHAR(30)  NULL,
  `email`           VARCHAR(150) NULL,
  `direccion`       VARCHAR(255) NULL,
  `certificaciones` VARCHAR(255) NULL,
  `activo`          TINYINT(1)   NOT NULL DEFAULT 1,
  `creado_en`       DATETIME     DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Movimientos de inventario (kardex con signo) ──
-- Stock actual de un tipo = SUM(cantidad). Entradas/inicial positivas,
-- salidas negativas, ajuste con signo.
CREATE TABLE IF NOT EXISTS `epp_movimientos` (
  `id`             INT AUTO_INCREMENT PRIMARY KEY,
  `tipo_epp_id`    INT NOT NULL,
  `tipo_mov`       ENUM('inicial','entrada','salida','ajuste') NOT NULL DEFAULT 'entrada',
  `cantidad`       INT NOT NULL COMMENT 'Con signo: + ingreso, - salida',
  `costo_unitario` DECIMAL(10,2) NULL,
  `proveedor_id`   INT NULL,
  `entrega_id`     INT NULL COMMENT 'Enlace a epp_entregas (Fase 2)',
  `fecha`          DATE NOT NULL,
  `documento_ref`  VARCHAR(100) NULL COMMENT 'N° guía/factura',
  `usuario_id`     INT NULL,
  `observacion`    VARCHAR(255) NULL,
  `creado_en`      DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_epp_mov_tipo`  (`tipo_epp_id`),
  KEY `idx_epp_mov_fecha` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Seed del catálogo: 5 EPP estándar (mismos de EPP_ITEMS en core.js) ──
INSERT IGNORE INTO `epp_tipos`
  (`nombre`, `categoria`, `norma_tecnica`, `vida_util_dias`, `stock_minimo`, `unidad`) VALUES
  ('Casco',                'Cabeza',           'ANSI Z89.1',    365,  5, 'unidad'),
  ('Chaleco reflectivo',   'Alta visibilidad', 'EN ISO 20471',  180,  5, 'unidad'),
  ('Zapatos de seguridad', 'Pies',             'ISO 20345',     365,  5, 'par'),
  ('Lentes',               'Ojos',             'ANSI Z87.1',     90, 10, 'unidad'),
  ('Guantes',              'Manos',            'EN 388',         60, 10, 'par');

-- ============================================================
-- FASE 2 — Entrega de EPP a trabajador (registro obligatorio)
-- ============================================================

-- ── Cabecera de entrega ──
-- Snapshot de los datos del trabajador para conservar el registro histórico.
CREATE TABLE IF NOT EXISTS `epp_entregas` (
  `id`                   INT AUTO_INCREMENT PRIMARY KEY,
  `personal_id`          INT NULL,
  `trabajador_nombre`    VARCHAR(160) NOT NULL,
  `trabajador_dni`       VARCHAR(20)  NULL,
  `trabajador_cargo`     VARCHAR(60)  NULL,
  `motivo`               ENUM('nuevo','renovacion','reposicion','perdida') NOT NULL DEFAULT 'nuevo',
  `fecha`                DATE NOT NULL,
  `firma_trabajador`     MEDIUMTEXT NULL COMMENT 'PNG base64 (data URL)',
  `observacion`          VARCHAR(255) NULL,
  `entregado_por`        INT NULL,
  `entregado_por_nombre` VARCHAR(120) NULL,
  `estado`               ENUM('vigente','anulada') NOT NULL DEFAULT 'vigente',
  `creado_en`            DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_epp_ent_personal` (`personal_id`),
  KEY `idx_epp_ent_fecha` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Detalle de EPP entregados ──
CREATE TABLE IF NOT EXISTS `epp_entrega_items` (
  `id`               INT AUTO_INCREMENT PRIMARY KEY,
  `entrega_id`       INT NOT NULL,
  `tipo_epp_id`      INT NOT NULL,
  `tipo_nombre`      VARCHAR(120) NOT NULL,
  `norma_tecnica`    VARCHAR(120) NULL,
  `cantidad`         INT NOT NULL,
  `vida_util_dias`   INT NULL,
  `fecha_renovacion` DATE NULL,
  KEY `idx_epp_ei_entrega` (`entrega_id`),
  KEY `idx_epp_ei_tipo` (`tipo_epp_id`),
  KEY `idx_epp_ei_renov` (`fecha_renovacion`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Configuración clave/valor: datos del empleador (cabecera del registro) ──
CREATE TABLE IF NOT EXISTS `epp_config` (
  `clave`       VARCHAR(60)  PRIMARY KEY,
  `valor`       VARCHAR(255) NULL,
  `actualizado` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `epp_config` (`clave`, `valor`) VALUES
  ('emp_razon_social', ''),
  ('emp_ruc',          ''),
  ('emp_domicilio',    ''),
  ('emp_actividad',    ''),
  ('emp_num_trab',     ''),
  ('emp_responsable',  ''),
  ('ct_nombre',        ''),
  ('ct_domicilio',     ''),
  ('ct_responsable',   ''),
  ('ct_num_trab',      ''),
  ('doc_codigo',       ''),
  ('doc_version',      ''),
  ('doc_fecha',        ''),
  ('stock_min_pct',    '10'),
  ('stock_max_pct',    '20');

-- ── Matriz de EPP por puesto (sugerencia de kit por cargo) ──
CREATE TABLE IF NOT EXISTS `epp_puesto_matriz` (
  `id`          INT AUTO_INCREMENT PRIMARY KEY,
  `cargo`       VARCHAR(60) NOT NULL,
  `tipo_epp_id` INT NOT NULL,
  `cantidad`    INT NOT NULL DEFAULT 1,
  `obligatorio` TINYINT(1) NOT NULL DEFAULT 1,
  `creado_en`   DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_epp_matriz` (`cargo`, `tipo_epp_id`),
  KEY `idx_epp_matriz_cargo` (`cargo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Catálogo de tallas reutilizable ──
CREATE TABLE IF NOT EXISTS `epp_tallas` (
  `id`        INT AUTO_INCREMENT PRIMARY KEY,
  `nombre`    VARCHAR(30) NOT NULL,
  `orden`     INT NOT NULL DEFAULT 0,
  `activo`    TINYINT(1) NOT NULL DEFAULT 1,
  `creado_en` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_epp_talla` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
INSERT IGNORE INTO `epp_tallas` (`nombre`,`orden`) VALUES
  ('Única',1),('XS',2),('S',3),('M',4),('L',5),('XL',6),('XXL',7);

-- ── Ingresos (recepción/compra de EPP): cabecera del documento ──
CREATE TABLE IF NOT EXISTS `epp_ingresos` (
  `id`             INT AUTO_INCREMENT PRIMARY KEY,
  `proveedor_id`   INT NULL,
  `documento_ref`  VARCHAR(100) NULL,
  `fecha`          DATE NOT NULL,
  `observacion`    VARCHAR(255) NULL,
  `usuario_id`     INT NULL,
  `usuario_nombre` VARCHAR(120) NULL,
  `estado`         ENUM('vigente','anulado') NOT NULL DEFAULT 'vigente',
  `creado_en`      DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_epp_ing_fecha` (`fecha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- epp_movimientos.ingreso_id se agrega vía setupEpp() (ALTER idempotente).
