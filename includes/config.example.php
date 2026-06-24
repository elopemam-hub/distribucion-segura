<?php
// ============================================================
// CONFIGURACIÓN DE BASE DE DATOS - PLANTILLA PARA PRODUCCIÓN
//
// Copia este archivo como config.php y edita los 4 valores:
//   cp includes/config.example.php includes/config.php
// ============================================================

define('DB_HOST', 'localhost');              // Normalmente "localhost" en Hostinger
define('DB_USER', 'u123456789_usuario');     // Usuario de BD en Hostinger
define('DB_PASS', 'TuPasswordAqui');         // Contraseña de BD en Hostinger
define('DB_NAME', 'u123456789_distribucion');// Nombre de la BD en Hostinger

// ============================================================
// NO MODIFIQUES NADA DE AQUÍ HACIA ABAJO
// ============================================================

define('DB_CHARSET', 'utf8mb4');

define('APP_NAME', 'Distribución Segura');
define('APP_VERSION', '1.1.0');
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('UPLOAD_URL', '../uploads/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5MB
define('ALLOWED_TYPES', ['image/jpeg', 'image/png', 'image/webp']);

// Zona horaria Perú
date_default_timezone_set('America/Lima');

// Modo debug (déjalo en false en producción)
define('DEBUG_MODE', false);

if (DEBUG_MODE) {
    ini_set('display_errors', 1);
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', 0);
    error_reporting(0);
}
