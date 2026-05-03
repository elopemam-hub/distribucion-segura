<?php
// ============================================================
// CONFIGURACIÓN DE BASE DE DATOS
// Archivo: includes/config.php
//
// >>> EDITA ESTAS 4 LÍNEAS con los datos que te dio tu hosting <<<
// ============================================================

define('DB_HOST', 'localhost');              // Normalmente "localhost"
define('DB_USER', 'root');                   // En XAMPP/Laragon local es 'root'
define('DB_PASS', '');                       // En XAMPP local va vacío; en producción cambiar
define('DB_NAME', 'distribucion_segura');    // Nombre de la BD

// ============================================================
// NO MODIFIQUES NADA DE AQUÍ HACIA ABAJO
// (a menos que sepas lo que haces)
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
