<?php
// ============================================================
// CONFIGURACIÓN — PLANTILLA
//
// INSTRUCCIONES SEGÚN ENTORNO:
//
// ── LOCAL (XAMPP) ───────────────────────────────────────────
//   Guarda como: includes/config.php
//   El deploy de git nunca toca tu máquina local.
//
// ── HOSTINGER (producción) ──────────────────────────────────
//   El Git Auto-Deploy borra archivos no rastreados dentro
//   de public_html/distribucion-segura/. Para evitarlo,
//   guarda este archivo UNA SOLA VEZ en:
//
//     /home/u248634042/domains/roka50safety.online/dist-segura.config.php
//
//   Es decir: UN NIVEL ARRIBA de public_html/
//   Desde Hostinger File Manager: sube a la carpeta
//   "roka50safety.online" (la que contiene a public_html)
//   con el nombre "dist-segura.config.php"
//
//   Así el deploy NUNCA lo borra porque está fuera del
//   directorio que gestiona git.
//
// ── NUNCA subas este archivo a git con credenciales reales ──
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

// UPLOAD_DIR: ruta absoluta al directorio uploads/.
// Usa DOCUMENT_ROOT para que funcione sin importar dónde esté este config.
// En Hostinger: /home/u.../public_html/distribucion-segura/uploads/
// En XAMPP:     C:/xampp/htdocs/distribucion-segura/uploads/
define('UPLOAD_DIR',  rtrim($_SERVER['DOCUMENT_ROOT'] ?? '', '/\\') . BASE_URL . '/uploads/');
define('UPLOAD_URL',  BASE_URL . '/uploads/');
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
