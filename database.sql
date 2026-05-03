-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 03-05-2026 a las 18:59:27
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `u248634042_distribucion_s`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `amonestaciones`
--

CREATE TABLE `amonestaciones` (
  `id` int(11) NOT NULL,
  `tipo` enum('bancarizacion','n3','telemetria') NOT NULL,
  `personal_id` int(11) NOT NULL,
  `fecha` date NOT NULL,
  `descripcion` text NOT NULL,
  `monto` decimal(10,2) DEFAULT NULL,
  `nro_operacion` varchar(50) DEFAULT NULL,
  `cliente` varchar(150) DEFAULT NULL,
  `ruta` varchar(100) DEFAULT NULL,
  `unidad` varchar(20) DEFAULT NULL,
  `evento_tele` varchar(100) DEFAULT NULL,
  `valor_registrado` varchar(50) DEFAULT NULL,
  `estado` enum('pendiente','notificado','cerrado') NOT NULL DEFAULT 'pendiente',
  `observaciones` text DEFAULT NULL,
  `creado_por` int(11) DEFAULT NULL,
  `creado_en` datetime DEFAULT current_timestamp(),
  `actualizado_en` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `imagen_evento` varchar(255) DEFAULT NULL,
  `tipo_sancion` varchar(100) DEFAULT NULL,
  `tipo_sancion_nivel` varchar(100) DEFAULT NULL,
  `reincidente` tinyint(1) DEFAULT 0,
  `plan_acciones` text DEFAULT NULL,
  `fecha_cierre` date DEFAULT NULL,
  `archivo_amonestacion` varchar(255) DEFAULT NULL COMMENT 'Ruta del documento de amonestación (PDF/Word)',
  `motivo_codigo` varchar(50) DEFAULT NULL,
  `codigo_cliente` varchar(50) DEFAULT NULL COMMENT 'Código del cliente (Bancarización y N3)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `amonestaciones`
--

INSERT INTO `amonestaciones` (`id`, `tipo`, `personal_id`, `fecha`, `descripcion`, `monto`, `nro_operacion`, `cliente`, `ruta`, `unidad`, `evento_tele`, `valor_registrado`, `estado`, `observaciones`, `creado_por`, `creado_en`, `actualizado_en`, `imagen_evento`, `tipo_sancion`, `tipo_sancion_nivel`, `reincidente`, `plan_acciones`, `fecha_cierre`, `archivo_amonestacion`, `motivo_codigo`, `codigo_cliente`) VALUES
(1, 'telemetria', 56, '2026-04-30', 'Conductor genero exceso velocidad >70 km en linea recta', NULL, NULL, NULL, NULL, 'BTT-893', 'Exceso de Velocidad >70 km/h', '78 km', 'cerrado', 'Ninguna', 4, '2026-04-30 19:01:51', '2026-04-30 19:03:17', 'telemetria/tele_20260430_e9c065dc72.png', 'Suspensión 2 días', '1era Vez; Amonestación escrita', 0, 'Generar amonestación, Refuerzo telemetría, Carta de compromiso', '2026-04-30', 'amonestaciones/amon_20260430_580780f59e.pdf', NULL, NULL),
(2, 'n3', 61, '2026-05-01', 'Reparto realizo cobro efectivo en cliente N3', NULL, NULL, 'Mario Quispe Quispe', 'BK04', NULL, NULL, NULL, 'pendiente', 'NINGUNA', 4, '2026-05-01 00:15:32', '2026-05-01 00:15:32', 'telemetria/tele_20260501_bc7119d667.png', NULL, NULL, 1, 'Generar amonestación, Refuerzo N3, Carta de compromiso', '2026-05-01', 'amonestaciones/amon_20260501_6db0b8c01d.pdf', 'Cobro N3', NULL),
(3, 'bancarizacion', 60, '2026-05-01', 'Realizar cobros >3500 sin autorizacion', 3600.00, 'OP-987767', NULL, NULL, NULL, NULL, NULL, 'notificado', 'NINGUNA', 4, '2026-05-01 00:19:39', '2026-05-01 00:19:39', 'telemetria/tele_20260501_31e12ef067.png', NULL, NULL, 1, 'Generar amonestación, Refuerzo bancarización, Carta de compromiso', '2026-04-30', 'amonestaciones/amon_20260501_e4b6c75763.pdf', '>3500', NULL);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `checklist`
--

CREATE TABLE `checklist` (
  `id` int(11) NOT NULL,
  `inspeccion_id` int(11) NOT NULL,
  `item` varchar(100) NOT NULL,
  `estado` tinyint(1) DEFAULT 0 COMMENT '1=Cumple, 0=No cumple'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `checklist`
--

INSERT INTO `checklist` (`id`, `inspeccion_id`, `item`, `estado`) VALUES
(40, 4, 'Zona de riesgo señalizada', 0),
(41, 4, 'Conos instalados', 1),
(42, 4, 'Puertas aseguradas', 1),
(43, 4, 'Ventanas cerradas', 1),
(44, 4, 'Cortinas cerradas', 1),
(45, 4, 'Cubre estribos', 0),
(46, 4, 'Cámaras de seguridad', 0),
(47, 4, 'Mecabero', 0),
(48, 4, 'Política manejo de dinero', 0),
(49, 4, 'Retroalimentación realizada', 0),
(50, 4, 'Llaves no en contacto', 1),
(51, 4, 'Caja fuerte', 1),
(52, 4, 'Contactos de emergencia', 1),
(53, 5, 'Zona de riesgo señalizada', 0),
(54, 5, 'Conos instalados', 0),
(55, 5, 'Puertas aseguradas', 0),
(56, 5, 'Ventanas cerradas', 0),
(57, 5, 'Cortinas cerradas', 0),
(58, 5, 'Cubre estribos', 0),
(59, 5, 'Cámaras de seguridad', 0),
(60, 5, 'Mecabero', 0),
(61, 5, 'Política manejo de dinero', 0),
(62, 5, 'Retroalimentación realizada', 0),
(63, 5, 'Llaves no en contacto', 0),
(64, 5, 'Caja fuerte', 0),
(65, 5, 'Contactos de emergencia', 0),
(66, 6, 'Zona de riesgo señalizada', 1),
(67, 6, 'Conos instalados', 1),
(68, 6, 'Puertas aseguradas', 1),
(69, 6, 'Ventanas cerradas', 1),
(70, 6, 'Cortinas cerradas', 1),
(71, 6, 'Cubre estribos', 1),
(72, 6, 'Cámaras de seguridad', 1),
(73, 6, 'Mecabero', 1),
(74, 6, 'Política manejo de dinero', 1),
(75, 6, 'Retroalimentación realizada', 1),
(76, 6, 'Llaves no en contacto', 1),
(77, 6, 'Caja fuerte', 1),
(78, 6, 'Contactos de emergencia', 1);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `evidencias`
--

CREATE TABLE `evidencias` (
  `id` int(11) NOT NULL,
  `inspeccion_id` int(11) NOT NULL,
  `ruta_imagen` varchar(255) NOT NULL,
  `nombre_original` varchar(255) DEFAULT NULL,
  `tamaño` int(11) DEFAULT NULL,
  `subido_en` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `evidencias`
--

INSERT INTO `evidencias` (`id`, `inspeccion_id`, `ruta_imagen`, `nombre_original`, `tamaño`, `subido_en`) VALUES
(10, 4, 'ev_4_e7c29fd56077.jpg', 'IMG_20260409_103132.jpg', 1025256, '2026-04-23 23:38:23'),
(11, 4, 'ev_4_70739ccc877a.jpg', 'IMG_20260409_100704.jpg', 1010596, '2026-04-23 23:38:23'),
(12, 4, 'ev_4_b1323835a1a4.jpg', 'IMG_20260409_095757.jpg', 901663, '2026-04-23 23:38:23'),
(13, 5, 'ev_5_0a4a002894cd.jpg', 'WhatsApp Image 2026-04-22 at 6.55.38 AM.jpeg', 160646, '2026-04-24 09:21:01'),
(14, 5, 'ev_5_1cd0e94eb0c1.jpg', 'WhatsApp Image 2026-04-22 at 6.55.22 AM.jpeg', 178061, '2026-04-24 09:21:01'),
(15, 5, 'ev_5_54637238ff86.jpg', 'WhatsApp Image 2026-04-22 at 6.55.06 AM.jpeg', 164769, '2026-04-24 09:21:01'),
(16, 6, 'ev_6_84215380784f.jpg', 'WhatsApp Image 2026-04-17 at 10.48.32 AM 1.jpeg', 101460, '2026-04-24 10:02:26'),
(17, 6, 'ev_6_db210207c569.jpg', 'WhatsApp Image 2026-04-17 at 10.51.08 AM.jpeg', 80521, '2026-04-24 10:02:26'),
(18, 6, 'ev_6_5130a6a6c03b.jpg', 'WhatsApp Image 2026-04-17 at 10.48.32 AM.jpeg', 101460, '2026-04-24 10:02:26');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `geocercas`
--

CREATE TABLE `geocercas` (
  `id` int(11) NOT NULL,
  `tipo` enum('ruta_critica','zona_n3','zona_roja') NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `codigo` varchar(50) DEFAULT NULL,
  `direccion_cliente` varchar(200) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `supervisor` varchar(100) DEFAULT NULL,
  `clientes_n3` varchar(100) DEFAULT NULL,
  `icono` varchar(50) NOT NULL DEFAULT 'fa-circle',
  `color` varchar(7) NOT NULL DEFAULT '#E74C3C',
  `coordenadas` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (json_valid(`coordenadas`)),
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `creado_por` int(11) DEFAULT NULL,
  `creado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  `actualizado_en` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `geocercas`
--

INSERT INTO `geocercas` (`id`, `tipo`, `nombre`, `codigo`, `direccion_cliente`, `descripcion`, `supervisor`, `clientes_n3`, `icono`, `color`, `coordenadas`, `activo`, `creado_por`, `creado_en`, `actualizado_en`) VALUES
(3, 'zona_n3', 'Zusid Jade Pana Events E.I.R.L.', '12527266', 'Jr. Ayacucho 527 - 529 JULIACA', '970009808', 'KIMBERLY CAMILA LLERENA PIMENTEL', 'CLIENTE N3 2022', 'fa-location-dot', '#e71d31', '[[-15.494785,-70.134522]]', 1, 4, '2026-05-02 20:59:27', '2026-05-02 21:14:18'),
(4, 'zona_n3', 'Corporacion Minotauro C Y M S.A.C.', '12870884', 'Jiron Ayacucho 527 JULIACA', '923190165', 'KIMBERLY CAMILA LLERENA PIMENTEL', 'CLIENTE N3 2022', 'fa-location-dot', '#e81139', '[[-15.4948788,-70.1345618]]', 1, 4, '2026-05-02 20:59:27', '2026-05-02 21:15:10'),
(5, 'zona_n3', 'Huaman Quehuarucho, Wily', '13200986', 'Jiron Ayacucho 560 JULIACA', '983101006', 'KIMBERLY CAMILA LLERENA PIMENTEL', 'CLIENTE N3 2022', 'fa-location-dot', '#e91640', '[[-15.4951883,-70.1346483]]', 1, 4, '2026-05-02 20:59:27', '2026-05-02 21:15:33'),
(6, 'zona_n3', 'GRUPO MIDA S PERU SACS', '13820482', 'Jr. Ayacucho 529 JULIACA', '994949373', 'KIMBERLY CAMILA LLERENA PIMENTEL', 'CLIENTE N3 2022', 'fa-location-dot', '#e41146', '[[-15.494838,-70.134543]]', 1, 4, '2026-05-02 20:59:27', '2026-05-02 21:15:56'),
(7, 'zona_n3', 'GRUPO TORVIL E.I.R.L.', '14020551', 'JirÃ³n Ayacucho # 527 Juliaca', '994949373', 'KIMBERLY CAMILA LLERENA PIMENTEL', 'CLIENTE N3 2022', 'fa-location-dot', '#e70d2e', '[[-15.494886,-70.134487]]', 1, 4, '2026-05-02 20:59:27', '2026-05-02 21:16:16'),
(8, 'zona_n3', 'Mamani Ticona, Alicia', '14079897', 'JR AYACUCHO 609 URB. SANTA CRUZ JULIACA', '929839714', 'KIMBERLY CAMILA LLERENA PIMENTEL', 'CLIENTE N3 2022', 'fa-location-dot', '#df113a', '[[-15.495135,-70.134633]]', 1, 4, '2026-05-02 20:59:27', '2026-05-02 21:16:36'),
(9, 'zona_n3', 'Choque Mamani, Diego Bryan', '14165339', 'Jr Ayacucho 518 Juliaca', '995282689', 'KIMBERLY CAMILA LLERENA PIMENTEL', 'CLIENTE N3 2022', 'fa-location-dot', '#df1125', '[[-15.494806,-70.134546]]', 1, 4, '2026-05-02 20:59:27', '2026-05-02 21:16:57'),
(10, 'zona_n3', 'Pachacuti Gutierrez, Lojhan Rene', '14201861', 'Jr Ayacucho 532 Juliaca', '914221754', 'KIMBERLY CAMILA LLERENA PIMENTEL', 'CLIENTE N3 2022', 'fa-location-dot', '#df1125', '[[-15.494993,-70.13461]]', 1, 4, '2026-05-02 20:59:27', '2026-05-02 21:17:15'),
(11, 'zona_n3', 'Curro Quispe, Diego', '10978147', 'Av. Ferrocarril 2820 Int B JULIACA', '998900732', 'CARLOS JAVIER RONDON VILCA', 'CLIENTE N3 2026', 'fa-location-dot', '#db0f2e', '[[-15.4844577681,-70.1597401499]]', 1, 4, '2026-05-02 20:59:27', '2026-05-02 21:17:53'),
(12, 'zona_n3', 'Cayllahua Mamani, Pedro', '11455992', 'Av. Ferrocarril 2826 JULIACA', '959400202', 'KIMBERLY CAMILA LLERENA PIMENTEL', 'CLIENTE N3 2026', 'fa-location-dot', '#e41131', '[[-15.4845,-70.159853]]', 1, 4, '2026-05-02 20:59:27', '2026-05-02 21:18:12'),
(13, 'zona_n3', 'Mancha Pacori, Gladis', '12209808', 'Urb. La Capilla Mz E2 Lt JULIACA', '972188498', 'CARLOS JAVIER RONDON VILCA', 'CLIENTE N3 2026', 'fa-location-dot', '#db0f2e', '[[-15.485444,-70.159814]]', 1, 4, '2026-05-02 20:59:27', '2026-05-02 21:18:31'),
(14, 'zona_n3', 'Coaquira Zapana, Luz Mery', '12797028', 'Ferrocarril 2864 B JULIACA', '964624495', 'KIMBERLY CAMILA LLERENA PIMENTEL', 'CLIENTE N3 2026', 'fa-location-dot', '#e41131', '[[-15.484474,-70.160158]]', 1, 4, '2026-05-02 20:59:27', '2026-05-02 21:18:49'),
(15, 'zona_n3', 'Sucia Mamani, Felipe', '13190066', 'Avenida Ferrocarril  MZ A5 LT 6 JULIACA', '957561583', 'KIMBERLY CAMILA LLERENA PIMENTEL', 'CLIENTE N3 2026', 'fa-location-dot', '#e60f2f', '[[-15.4844132,-70.1599882]]', 1, 4, '2026-05-02 20:59:27', '2026-05-02 21:19:05');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `hallazgos`
--

CREATE TABLE `hallazgos` (
  `id` int(11) NOT NULL,
  `inspeccion_id` int(11) NOT NULL,
  `descripcion` text NOT NULL,
  `criticidad` enum('baja','media','alta') DEFAULT 'media',
  `creado_en` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `inspecciones`
--

CREATE TABLE `inspecciones` (
  `id` int(11) NOT NULL,
  `unidad` varchar(20) NOT NULL COMMENT 'Placa del vehículo',
  `fecha` date NOT NULL,
  `hora` time NOT NULL,
  `provincia` varchar(100) NOT NULL DEFAULT 'San Román',
  `distrito` varchar(100) NOT NULL DEFAULT 'Juliaca',
  `direccion` varchar(255) NOT NULL,
  `conductor` varchar(100) NOT NULL,
  `reparto` varchar(100) DEFAULT NULL,
  `resultado` decimal(5,2) DEFAULT 0.00 COMMENT '% cumplimiento',
  `observaciones` text DEFAULT NULL,
  `latitud` decimal(10,8) DEFAULT NULL,
  `longitud` decimal(11,8) DEFAULT NULL,
  `firma_digital` longtext DEFAULT NULL COMMENT 'Base64 canvas firma',
  `inspector_id` int(11) DEFAULT NULL,
  `creado_en` datetime DEFAULT current_timestamp(),
  `actualizado_en` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `inspecciones`
--

INSERT INTO `inspecciones` (`id`, `unidad`, `fecha`, `hora`, `provincia`, `distrito`, `direccion`, `conductor`, `reparto`, `resultado`, `observaciones`, `latitud`, `longitud`, `firma_digital`, `inspector_id`, `creado_en`, `actualizado_en`) VALUES
(4, 'D0M-840', '2026-04-23', '23:33:00', 'San Román', 'Juliaca', 'Jr. Sucre', 'WILVER JAIRO SUCAPUCA CHINO', 'EVER ACDO YANA', 53.85, 'NINGUNA', NULL, NULL, NULL, 4, '2026-04-23 23:38:23', '2026-04-23 23:38:23'),
(5, 'D6M-720', '2026-04-24', '09:19:00', 'San Román', 'Juliaca', 'Puno', 'Mario Quispe', 'Juan Carlos', 0.00, 'ninguna', -15.51862200, -70.12142900, NULL, 4, '2026-04-24 09:21:01', '2026-04-24 09:21:01'),
(6, 'BTT893', '2026-04-24', '09:51:00', 'San Román', 'Juliaca', 'Jr. Atahualpa', 'EDGAR QUISPE JIHUALLANCA', 'EDWIN HANCCO LOPEZ', 100.00, 'SE ENCONTRO PUERTA ABIERTA NO ASEGURARON LAS VENTANAS, LLAVE DE CONTACTO SE LE ENCONTRO EN EL MISMO CONTACTO', -15.51855000, -70.12149300, NULL, 4, '2026-04-24 10:02:26', '2026-04-24 10:02:26');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `permisos`
--

CREATE TABLE `permisos` (
  `usuario_id` int(11) NOT NULL,
  `modulo` varchar(50) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `permisos`
--

INSERT INTO `permisos` (`usuario_id`, `modulo`) VALUES
(3, 'dashboard'),
(3, 'inspecciones'),
(3, 'personal'),
(5, 'dashboard'),
(5, 'inspecciones');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `personal`
--

CREATE TABLE `personal` (
  `id` int(11) NOT NULL,
  `dni` varchar(20) NOT NULL,
  `nombre` varchar(150) NOT NULL,
  `cargo` enum('conductor','reparto','auxiliar','supervisor','otro') NOT NULL DEFAULT 'reparto',
  `empresa` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `fecha_ingreso` date DEFAULT NULL,
  `dni_vencimiento` date DEFAULT NULL,
  `num_licencia` varchar(30) DEFAULT NULL,
  `categoria_licencia` varchar(10) DEFAULT NULL,
  `vencimiento_brevete` date DEFAULT NULL,
  `foto` varchar(255) DEFAULT NULL COMMENT 'Ruta relativa en uploads/personal/',
  `observaciones` text DEFAULT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `creado_en` datetime DEFAULT current_timestamp(),
  `actualizado_en` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `personal`
--

INSERT INTO `personal` (`id`, `dni`, `nombre`, `cargo`, `empresa`, `telefono`, `fecha_ingreso`, `dni_vencimiento`, `num_licencia`, `categoria_licencia`, `vencimiento_brevete`, `foto`, `observaciones`, `activo`, `creado_en`, `actualizado_en`) VALUES
(1, '76195992', 'BEATRIZ ROJAS BENAVENTE', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(2, '77237019', 'NAYELI MIRELLA CONDORI RAMOS', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(3, '74408008', 'ALEXANDER WILSON JILAPA QUISPE', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(4, '73758103', 'BRAYAN RENAN QUISPE CHOQUE', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(5, '75425670', 'BROYAN BRUSS QUISPE ITO', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(6, '41798392', 'CELSO HUACANI ADCO', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(7, '80670769', 'CRISTOBAL MONTEAGUDO QUISCA', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(8, '10730075', 'DAVID CLEMENTE MAMANI HUANCAPAZA', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(9, '71558086', 'DAVID MAMANI BELLIDO', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(10, '61320561', 'EDER JHOEL MAMANI TTILA', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(11, '44784986', 'EDGAR APAZA ADCO', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(12, '74352612', 'EDISON GABRIEL MAMANI MAMANI', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(13, '02296751', 'ELAR FREDY MAMANI VALDIVIA', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(14, '02381546', 'FELIX CCASA COILA', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(15, '76478998', 'JHAN ANTHONY YUCRA CCACCA', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(16, '80933477', 'JHON EDISON MAMANI MAMANI', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(17, '71724483', 'JOSE LUIS DIAZ HUAMAN', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(18, '42160275', 'MARCIAL MIRANDA VELASQUEZ', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(19, '73321906', 'MARK BRIHAM QUISPE OCHOA', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(20, '45994230', 'RILDO CHAYÑA MALDONADO', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(21, '70075502', 'RIVALDO MONTEAGUDO COILA', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(22, '70526333', 'RONY WILLIAM JULLIRI CCAPA', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(23, '02036051', 'ROSENDO GUTIERREZ SUCAPUCA', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(24, '02426584', 'VICTOR HUANCA LUQUE', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(25, '40933286', 'YEFER ISMAEL ARAPA ITO', 'auxiliar', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(26, '44378642', 'ABEL ANGEL ARUQUIPA GUTIERREZ', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(27, '43076015', 'ALFONSO MAMANI MALDONADO', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(28, '10659922', 'ALFONSO PARICAHUA PACORI', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(29, '29582694', 'ANGEL APAZA CASAZUELA', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(30, '42584511', 'ANGEL BELTRAN YUCRA CAYRA', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(31, '45648527', 'BERNARDINO PACOMPIA QUISPE', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(32, '47044712', 'CESAR MAMANI ZAPANA', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(33, '43338035', 'CIRO RONOEL MAMANI QUISPE', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(34, '42875179', 'DANTE JESUS RAMOS  MAMANI', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(35, '46321850', 'DAVID ANIBAL AYAMAMANI FLORES', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(36, '44458223', 'DAVID NARCISO GARCIA YANA', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(37, '44937621', 'DEMETRIO SEBASTIAN QUISPE SONCCO', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(38, '41919726', 'EDGAR ALFONSO  MAMANI  CUTIPA', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(39, '80373257', 'EDGAR QUISPE JIHUALLANCA', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(40, '71847015', 'EDWIN PEDRO MIRANDA LERMA', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(41, '42050623', 'EDWIN SILVESTRE GARNICA HUMPIRI', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(42, '44000931', 'HENRRY AQUINO RAMIREZ', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(43, '44469786', 'HERACLIDES ROQUE ZELA', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(44, '42600195', 'HUGO VIDAL ALANOCA CONDORI', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(45, '40209676', 'ISMAEL QUISPE PANCCA', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(46, '42507306', 'JESUS HUACANI LAURA', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(47, '42071586', 'JOSE ANTONIO LOPEZ JALLURANA', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(48, '41153137', 'JUAN CARLOS VIVANCO PIZARRO', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(49, '44064391', 'NESTOR GROVER MAMANI SUPO', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(50, '01307692', 'PEDRO ANTONIO CALLO SOLIS', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(51, '46559984', 'PERCY MAMANI PERALTA', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(52, '42144988', 'REYNALDO AMBROCIO QUISPE', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(53, '73576752', 'RUBEN ALEX ARAPA  ARAPA', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(54, '46706432', 'SANTOS MARCELINO JAPURA ROJAS', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(55, '01331406', 'VICTOR BRAULIO MAQUERA LUPACA', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(56, '01314486', 'WILBER TEOFILO CHAHUARES ARI', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(57, '46943514', 'WILVER JAIRO SUCAPUCA CHINO', 'conductor', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(58, '70142847', 'ALVARO VALDIVIA VALDIVIA', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(59, '42677811', 'EDWIN HANCCO LOPEZ', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(60, '80450198', 'EVER ACDO YANA', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(61, '80542021', 'FRANCISCO MIRANDA VELASQUEZ', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(62, '47906434', 'FRANK YOEL MAMANI QUISPE', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(63, '43608467', 'FREDY CONDORI LOPEZ', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(64, '70186764', 'GROVER REYNALDO ADCO QUISPE', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(65, '48411537', 'GUIDO LEGARIO MAMANI SANCHEZ', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(66, '80474031', 'HECTOR FERNANDO MAMANI MAMANI', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(67, '70207152', 'HENRY COLQUEHUANCA QUISPE', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:53', '2026-04-25 21:56:33'),
(68, '43672163', 'HOLMER HUANCA VARGAS', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(69, '70557285', 'IVAR FIDEL SAAVEDRA PACCARA', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(70, '46639288', 'JHENRY CHAMBI ROQUE', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(71, '73758102', 'JULIO CESAR QUISPE CHOQUE', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(72, '73526662', 'LUIS ALBERTO SANCHEZ CRUZ', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(73, '76013720', 'MIDWAR FRANKLIN YTUSACA MACHACA', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(74, '42768906', 'NEMECIO CALCINA HANCCO', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(75, '29427685', 'PABLO CONDOR COLQUE', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(76, '41637593', 'RAFAEL VARGAS GONSALES', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(77, '70095094', 'RODRIGO VALLEJO CAHUANA', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(78, '73773912', 'RONALD HALLASI MAMANI', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(79, '02427755', 'WILLIAN ROGER CASTILLO CONDORI', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(80, '77233588', 'ALEXANDER ADAIR APAZA LAURA', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(81, '47167624', 'CONSTANTINO JOAQUIN CAHUAPAZA LUQUE', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(82, '75820617', 'FRANKLIN DAVID LIPA VALENCIA', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(83, '73744546', 'JHORMAN ALFREDO HUACANI QUISPE', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(84, '71432435', 'JOSBANI ALEX PACHACUTE NOA', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(85, '40658841', 'LUIS ANGEL ORE SALAS', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(86, '40581148', 'RENE CHAMBILLA NINA', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(87, '74561114', 'ROYER MAMANI CHAMBI', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(88, '74592546', 'YONATAN MAMANI HUARANCA', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33'),
(89, '40570780', 'YURI DAVID LAURA VALERA', 'reparto', 'DICORJES E.I.R.L.', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, '2026-04-23 23:33:54', '2026-04-25 21:56:33');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `tripulacion`
--

CREATE TABLE `tripulacion` (
  `id` int(11) NOT NULL,
  `inspeccion_id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `rol` enum('conductor','reparto','auxiliar') NOT NULL,
  `epp_completo` tinyint(1) DEFAULT 0,
  `epp_detalle` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL COMMENT 'JSON con detalle de EPP' CHECK (json_valid(`epp_detalle`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `tripulacion`
--

INSERT INTO `tripulacion` (`id`, `inspeccion_id`, `nombre`, `rol`, `epp_completo`, `epp_detalle`) VALUES
(9, 4, 'WILVER JAIRO SUCAPUCA CHINO', 'conductor', 0, '[\"Casco\",\"Chaleco reflectivo\",\"Zapatos de seguridad\",\"Lentes\"]'),
(10, 4, 'EVER ACDO YANA', 'reparto', 0, '[\"Chaleco reflectivo\",\"Zapatos de seguridad\",\"Lentes\"]'),
(11, 4, 'CRISTOBAL MONTEAGUDO QUISCA', 'auxiliar', 0, '[\"Zapatos de seguridad\"]'),
(12, 4, 'JUAN QUISPE QUISPE', 'auxiliar', 0, '[\"Zapatos de seguridad\",\"Lentes\"]'),
(13, 5, 'Mario Quispe', 'conductor', 0, '[\"Casco\",\"Chaleco reflectivo\",\"Zapatos de seguridad\",\"Guantes\"]'),
(14, 5, 'Juan Carlos', 'reparto', 0, '[\"Casco\",\"Chaleco reflectivo\",\"Zapatos de seguridad\",\"Lentes\",\"Guantes\"]'),
(15, 6, 'EDGAR QUISPE JIHUALLANCA', 'conductor', 1, '[\"Casco\",\"Chaleco reflectivo\",\"Zapatos de seguridad\",\"Lentes\",\"Guantes\"]'),
(16, 6, 'EDWIN HANCCO LOPEZ', 'reparto', 0, '[\"Casco\",\"Chaleco reflectivo\",\"Zapatos de seguridad\",\"Lentes\"]'),
(17, 6, 'DAVID CLEMENTE MAMANI HUANCAPAZA', 'auxiliar', 1, '[\"Casco\",\"Chaleco reflectivo\",\"Zapatos de seguridad\",\"Lentes\",\"Guantes\"]');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `usuario` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('administrador','supervisor','inspector') NOT NULL DEFAULT 'inspector',
  `activo` tinyint(1) DEFAULT 1,
  `creado_en` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombre`, `usuario`, `password`, `rol`, `activo`, `creado_en`) VALUES
(1, 'Administrador Sistema', 'admin', '$2y$10$Qqd.hFF8QcPq8Yqz7L9oAulhaMfr5MShossJwtcQmA8R5dXTUCxk2', 'administrador', 1, '2026-04-23 20:35:16'),
(2, 'Supervisor Juliaca', 'supervisor', '$2y$10$HeFmEE3Vc37znypQxG7GluOutr8qwfVwjfkhP2iLia87GABQOhgkG', 'supervisor', 1, '2026-04-23 20:35:16'),
(3, 'BEATRIZ ROJAS BENAVENTE', 'BROJASB', '$2y$10$4nVsLiUolHhd8bIclwsNrepkZ2g7KmQOnXM6GgYEFpKVvt9bnBqO6', 'supervisor', 1, '2026-04-23 20:35:16'),
(4, 'EDWIN LOPEZ MAMANI', 'ELOPEMAM', '$2y$10$sgiVeiKgNbRdV/OUhHZV7.7ocGOHUH4Uy6Ti0fafVbs24NCaRuuGi', 'administrador', 1, '2026-04-23 21:46:17'),
(5, 'RONALD HALLASI MAMANI', 'RHALLASIM', '$2y$10$q3My2Psav540T3gYcESq/eY8oAa15.zJGR3hxtEGsFxJolaRibw6q', 'supervisor', 1, '2026-04-23 21:48:56'),
(6, 'JESUS HUACANI LAURA', 'JHUACANIL', '$2y$10$L5ziM6bJJLLjJblsNqKL7eUMr2U6jkmkAkHrs4AvnRAfOPwK64Hqy', 'inspector', 1, '2026-04-23 21:52:17');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `amonestaciones`
--
ALTER TABLE `amonestaciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `creado_por` (`creado_por`),
  ADD KEY `idx_amon_tipo` (`tipo`),
  ADD KEY `idx_amon_personal` (`personal_id`),
  ADD KEY `idx_amon_fecha` (`fecha`),
  ADD KEY `idx_amon_estado` (`estado`);

--
-- Indices de la tabla `checklist`
--
ALTER TABLE `checklist`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_checklist_inspeccion` (`inspeccion_id`);

--
-- Indices de la tabla `evidencias`
--
ALTER TABLE `evidencias`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_evidencias_inspeccion` (`inspeccion_id`);

--
-- Indices de la tabla `geocercas`
--
ALTER TABLE `geocercas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `creado_por` (`creado_por`);

--
-- Indices de la tabla `hallazgos`
--
ALTER TABLE `hallazgos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_hallazgos_inspeccion` (`inspeccion_id`);

--
-- Indices de la tabla `inspecciones`
--
ALTER TABLE `inspecciones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_inspecciones_fecha` (`fecha`),
  ADD KEY `idx_inspecciones_unidad` (`unidad`),
  ADD KEY `idx_inspecciones_conductor` (`conductor`),
  ADD KEY `idx_inspecciones_inspector` (`inspector_id`);

--
-- Indices de la tabla `permisos`
--
ALTER TABLE `permisos`
  ADD PRIMARY KEY (`usuario_id`,`modulo`);

--
-- Indices de la tabla `personal`
--
ALTER TABLE `personal`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `dni` (`dni`),
  ADD KEY `idx_personal_dni` (`dni`),
  ADD KEY `idx_personal_nombre` (`nombre`),
  ADD KEY `idx_personal_cargo` (`cargo`),
  ADD KEY `idx_personal_activo` (`activo`);

--
-- Indices de la tabla `tripulacion`
--
ALTER TABLE `tripulacion`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_tripulacion_inspeccion` (`inspeccion_id`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `usuario` (`usuario`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `amonestaciones`
--
ALTER TABLE `amonestaciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `checklist`
--
ALTER TABLE `checklist`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=79;

--
-- AUTO_INCREMENT de la tabla `evidencias`
--
ALTER TABLE `evidencias`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT de la tabla `geocercas`
--
ALTER TABLE `geocercas`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT de la tabla `hallazgos`
--
ALTER TABLE `hallazgos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `inspecciones`
--
ALTER TABLE `inspecciones`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT de la tabla `personal`
--
ALTER TABLE `personal`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=90;

--
-- AUTO_INCREMENT de la tabla `tripulacion`
--
ALTER TABLE `tripulacion`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `amonestaciones`
--
ALTER TABLE `amonestaciones`
  ADD CONSTRAINT `amonestaciones_ibfk_1` FOREIGN KEY (`personal_id`) REFERENCES `personal` (`id`),
  ADD CONSTRAINT `amonestaciones_ibfk_2` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `checklist`
--
ALTER TABLE `checklist`
  ADD CONSTRAINT `checklist_ibfk_1` FOREIGN KEY (`inspeccion_id`) REFERENCES `inspecciones` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `evidencias`
--
ALTER TABLE `evidencias`
  ADD CONSTRAINT `evidencias_ibfk_1` FOREIGN KEY (`inspeccion_id`) REFERENCES `inspecciones` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `geocercas`
--
ALTER TABLE `geocercas`
  ADD CONSTRAINT `geocercas_ibfk_1` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `hallazgos`
--
ALTER TABLE `hallazgos`
  ADD CONSTRAINT `hallazgos_ibfk_1` FOREIGN KEY (`inspeccion_id`) REFERENCES `inspecciones` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `inspecciones`
--
ALTER TABLE `inspecciones`
  ADD CONSTRAINT `inspecciones_ibfk_1` FOREIGN KEY (`inspector_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL;

--
-- Filtros para la tabla `permisos`
--
ALTER TABLE `permisos`
  ADD CONSTRAINT `permisos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `tripulacion`
--
ALTER TABLE `tripulacion`
  ADD CONSTRAINT `tripulacion_ibfk_1` FOREIGN KEY (`inspeccion_id`) REFERENCES `inspecciones` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
