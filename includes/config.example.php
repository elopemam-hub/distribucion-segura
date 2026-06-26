<?php
// ============================================================
// CONFIGURACIÓN — PLANTILLA
//
// INSTRUCCIONES:
//   1. Copia este archivo: cp config.example.php config.php
//   2. Edita config.php con tus credenciales reales
//   3. NUNCA subas config.php a git (está en .gitignore)
//
// EN HOSTINGER: sube config.php via Administrador de Archivos
//   Ruta: public_html/distribucion-segura/includes/config.php
// ============================================================

// ── Elige tu entorno y descomenta el bloque correspondiente ──

// ============================================================
// ENTORNO LOCAL (XAMPP)
// ============================================================
// define('DB_HOST', 'localhost');
// define('DB_USER', 'root');
// define('DB_PASS', '');
// define('DB_NAME', 'distribucion_segura');
// define('DEBUG_MODE', true);

// ============================================================
// ENTORNO PRODUCCIÓN (HOSTINGER)
// ============================================================
define('DB_HOST', 'localhost');
define('DB_USER', 'u123456789_usuario');   // ← tu usuario de BD en Hostinger
define('DB_PASS', 'TuPasswordAqui');        // ← tu contraseña
define('DB_NAME', 'u123456789_bd');         // ← nombre de tu BD
define('DEBUG_MODE', false);

// ============================================================
// NO MODIFIQUES NADA DE AQUÍ HACIA ABAJO
// ============================================================

define('DB_CHARSET', 'utf8mb4');

// BASE_URL: ruta desde la raíz del dominio hasta la app
//   Hostinger en subcarpeta:  '/distribucion-segura'
//   Hostinger en raíz:        ''
define('BASE_URL', '/distribucion-segura');

define('APP_NAME',    'Distribución Segura');
define('APP_VERSION', '1.1.0');
define('UPLOAD_DIR',  __DIR__ . '/../uploads/');
define('UPLOAD_URL',  '../uploads/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024);  // 5 MB
define('ALLOWED_TYPES', ['image/jpeg', 'image/png', 'image/webp']);

date_default_timezone_set('America/Lima');

if (DEBUG_MODE) {
    ini_set('display_errors', 1);
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', 0);
    error_reporting(0);
}
