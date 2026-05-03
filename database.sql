-- ============================================================
-- DISTRIBUCIÓN SEGURA - JULIACA
-- Script SQL - Base de Datos Completa
-- Versión 1.1 (con parches de seguridad aplicados)
-- ============================================================

CREATE DATABASE IF NOT EXISTS distribucion_segura
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE distribucion_segura;

-- ------------------------------------------------------------
-- TABLA: usuarios
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  usuario VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol ENUM('administrador','supervisor','inspector') NOT NULL DEFAULT 'inspector',
  activo TINYINT(1) DEFAULT 1,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Usuarios iniciales con contraseñas aleatorias (ver CREDENCIALES.txt)
-- IMPORTANTE: cámbialas en cuanto entres por primera vez
INSERT INTO usuarios (nombre, usuario, password, rol) VALUES
  ('Administrador Sistema', 'admin',      '$2y$10$Qqd.hFF8QcPq8Yqz7L9oAulhaMfr5MShossJwtcQmA8R5dXTUCxk2', 'administrador'),
  ('Supervisor Juliaca',    'supervisor', '$2y$10$HeFmEE3Vc37znypQxG7GluOutr8qwfVwjfkhP2iLia87GABQOhgkG', 'supervisor'),
  ('Inspector Campo',       'inspector',  '$2y$10$njEzsD7X5FYJwTjVaHwLmO3gZhbZRnEqLAM64E4i.Fu8eP8O0VriG',  'inspector');

-- ------------------------------------------------------------
-- TABLA: inspecciones
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspecciones (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unidad VARCHAR(20) NOT NULL COMMENT 'Placa del vehículo',
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  provincia VARCHAR(100) NOT NULL DEFAULT 'San Román',
  distrito VARCHAR(100) NOT NULL DEFAULT 'Juliaca',
  direccion VARCHAR(255) NOT NULL,
  conductor VARCHAR(100) NOT NULL,
  reparto VARCHAR(100),
  resultado DECIMAL(5,2) DEFAULT 0 COMMENT '% cumplimiento',
  observaciones TEXT,
  latitud DECIMAL(10,8) NULL,
  longitud DECIMAL(11,8) NULL,
  firma_digital LONGTEXT NULL COMMENT 'Base64 canvas firma',
  inspector_id INT NULL,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (inspector_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABLA: tripulacion
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tripulacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inspeccion_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  rol ENUM('conductor','reparto','auxiliar') NOT NULL,
  epp_completo TINYINT(1) DEFAULT 0,
  epp_detalle JSON NULL COMMENT 'JSON con detalle de EPP',
  FOREIGN KEY (inspeccion_id) REFERENCES inspecciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABLA: checklist
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checklist (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inspeccion_id INT NOT NULL,
  item VARCHAR(100) NOT NULL,
  estado TINYINT(1) DEFAULT 0 COMMENT '1=Cumple, 0=No cumple',
  FOREIGN KEY (inspeccion_id) REFERENCES inspecciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABLA: evidencias
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS evidencias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inspeccion_id INT NOT NULL,
  ruta_imagen VARCHAR(255) NOT NULL,
  nombre_original VARCHAR(255),
  tamaño INT,
  subido_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inspeccion_id) REFERENCES inspecciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABLA: hallazgos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hallazgos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inspeccion_id INT NOT NULL,
  descripcion TEXT NOT NULL,
  criticidad ENUM('baja','media','alta') DEFAULT 'media',
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inspeccion_id) REFERENCES inspecciones(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- ÍNDICES para performance
-- ------------------------------------------------------------
CREATE INDEX idx_inspecciones_fecha    ON inspecciones(fecha);
CREATE INDEX idx_inspecciones_unidad   ON inspecciones(unidad);
CREATE INDEX idx_inspecciones_conductor ON inspecciones(conductor);
CREATE INDEX idx_inspecciones_inspector ON inspecciones(inspector_id);
CREATE INDEX idx_tripulacion_inspeccion ON tripulacion(inspeccion_id);
CREATE INDEX idx_checklist_inspeccion   ON checklist(inspeccion_id);
CREATE INDEX idx_evidencias_inspeccion  ON evidencias(inspeccion_id);
CREATE INDEX idx_hallazgos_inspeccion   ON hallazgos(inspeccion_id);

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================

-- ============================================================
-- v1.2 - MÓDULO PERSONAL
-- ============================================================

CREATE TABLE IF NOT EXISTS personal (
  id INT AUTO_INCREMENT PRIMARY KEY,
  dni VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(150) NOT NULL,
  cargo ENUM('conductor','reparto','auxiliar','supervisor','otro') NOT NULL DEFAULT 'reparto',
  telefono VARCHAR(20) NULL,
  fecha_ingreso DATE NULL,
  foto VARCHAR(255) NULL COMMENT 'Ruta relativa en uploads/personal/',
  observaciones TEXT NULL,
  activo TINYINT(1) DEFAULT 1,
  creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE INDEX idx_personal_dni    ON personal(dni);
CREATE INDEX idx_personal_nombre ON personal(nombre);
CREATE INDEX idx_personal_cargo  ON personal(cargo);
CREATE INDEX idx_personal_activo ON personal(activo);

-- Crear subcarpeta para fotos de personal (el PHP la crea si no existe)

-- ============================================================
-- v1.4 - PERMISOS POR MÓDULO (Opción B)
-- ============================================================
CREATE TABLE IF NOT EXISTS permisos (
  usuario_id INT NOT NULL,
  modulo     VARCHAR(50) NOT NULL,
  PRIMARY KEY (usuario_id, modulo),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB;
-- Módulos válidos: dashboard, inspecciones, personal, reportes, matriz, amonestaciones
-- Si un usuario (no admin) no tiene filas aquí → se usan los defaults de su rol.
-- Si tiene filas → SOLO puede acceder a esos módulos.

-- ============================================================
-- v1.5 - MÓDULO AMONESTACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS amonestaciones (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  tipo             ENUM('bancarizacion','n3','telemetria') NOT NULL,
  personal_id      INT NOT NULL,
  fecha            DATE NOT NULL,
  descripcion      TEXT NOT NULL,
  -- Campos Bancarización
  monto            DECIMAL(10,2) NULL     COMMENT 'Monto afectado',
  nro_operacion    VARCHAR(50)   NULL     COMMENT 'N° de operación',
  -- Campos N3
  cliente          VARCHAR(150)  NULL     COMMENT 'Nombre del cliente N3',
  ruta             VARCHAR(100)  NULL     COMMENT 'Ruta afectada',
  -- Campos Telemetría
  unidad           VARCHAR(20)   NULL     COMMENT 'Placa de la unidad',
  evento_tele      VARCHAR(100)  NULL     COMMENT 'Tipo de evento (velocidad, frenada…)',
  valor_registrado VARCHAR(50)   NULL     COMMENT 'Valor medido por el sistema',
  -- Estado y auditoría
  estado           ENUM('pendiente','notificado','cerrado') NOT NULL DEFAULT 'pendiente',
  observaciones    TEXT          NULL,
  creado_por       INT           NULL,
  creado_en        DATETIME      DEFAULT CURRENT_TIMESTAMP,
  actualizado_en   DATETIME      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (personal_id) REFERENCES personal(id)  ON DELETE RESTRICT,
  FOREIGN KEY (creado_por)  REFERENCES usuarios(id)  ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_amon_tipo     ON amonestaciones(tipo);
CREATE INDEX idx_amon_personal ON amonestaciones(personal_id);
CREATE INDEX idx_amon_fecha    ON amonestaciones(fecha);
CREATE INDEX idx_amon_estado   ON amonestaciones(estado);

-- v1.5b - Campos extendidos para sub-módulo Telemetría
-- Ejecutar si la tabla ya existe:
ALTER TABLE amonestaciones
  ADD COLUMN imagen_evento      VARCHAR(255) NULL  COMMENT 'Captura/foto del evento telemétrico',
  ADD COLUMN tipo_sancion       VARCHAR(100) NULL  COMMENT 'Ej: Amonestación escrita, Suspensión',
  ADD COLUMN tipo_sancion_nivel VARCHAR(100) NULL  COMMENT 'Ej: 1era Vez; Amonestación',
  ADD COLUMN reincidente        TINYINT(1) DEFAULT 0,
  ADD COLUMN plan_acciones      TEXT NULL          COMMENT 'Acciones aplicadas separadas por coma',
  ADD COLUMN fecha_cierre          DATE NULL          COMMENT 'Fecha de cierre del caso',
  ADD COLUMN archivo_amonestacion  VARCHAR(255) NULL  COMMENT 'Ruta del documento de amonestación (PDF/Word)',
  ADD COLUMN motivo_codigo         VARCHAR(50)  NULL  COMMENT 'Badge del motivo: Cobros efectivo >3500, N3…',
  ADD COLUMN codigo_cliente        VARCHAR(50)  NULL  COMMENT 'Código del cliente (Bancarización y N3)';

-- ============================================================
-- v1.3 - NUEVOS CAMPOS EN MÓDULO PERSONAL
-- Ejecutar si ya tienes la tabla personal creada:
-- ============================================================
ALTER TABLE personal
  ADD COLUMN empresa            VARCHAR(100) NULL AFTER cargo,
  ADD COLUMN dni_vencimiento    DATE NULL    AFTER fecha_ingreso,
  ADD COLUMN num_licencia       VARCHAR(30)  NULL AFTER dni_vencimiento,
  ADD COLUMN categoria_licencia VARCHAR(10)  NULL AFTER num_licencia,
  ADD COLUMN vencimiento_brevete DATE NULL   AFTER categoria_licencia;

-- ============================================================
-- MÓDULO GEOCERCAS
-- ============================================================
CREATE TABLE IF NOT EXISTS geocercas (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  tipo               ENUM('ruta_critica','zona_n3','zona_roja') NOT NULL,
  nombre             VARCHAR(150) NOT NULL,
  codigo             VARCHAR(50)  NULL,
  direccion_cliente  VARCHAR(200) NULL,
  supervisor         VARCHAR(100) NULL,
  clientes_n3        VARCHAR(100) NULL,
  descripcion        TEXT NULL,
  color              VARCHAR(7)   NOT NULL DEFAULT '#E74C3C',
  coordenadas        JSON NOT NULL,
  activo             TINYINT(1)   NOT NULL DEFAULT 1,
  creado_por         INT NULL,
  creado_en          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Si la tabla ya existe, agregar las columnas nuevas:
ALTER TABLE geocercas
  ADD COLUMN IF NOT EXISTS codigo            VARCHAR(50)  NULL AFTER nombre,
  ADD COLUMN IF NOT EXISTS direccion_cliente VARCHAR(200) NULL AFTER codigo,
  ADD COLUMN IF NOT EXISTS supervisor        VARCHAR(100) NULL AFTER descripcion,
  ADD COLUMN IF NOT EXISTS clientes_n3       VARCHAR(100) NULL AFTER supervisor,
  ADD COLUMN IF NOT EXISTS icono             VARCHAR(50)  NOT NULL DEFAULT 'fa-circle' AFTER clientes_n3;
