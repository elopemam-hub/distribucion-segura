<?php
echo '<pre>';

// Simular exactamente las rutas que usa db.php (desde includes/)
$includesDir = __DIR__ . '/includes';
$paths = [
    $includesDir . '/config.php',
    dirname(dirname(dirname($includesDir))) . '/dist-segura.config.php',
    dirname(dirname($includesDir))          . '/dist-segura.config.php',
];

echo "Rutas que usa db.php:\n";
foreach ($paths as $i => $p) {
    echo ($i+1) . ". $p → " . (file_exists($p) ? '✓ EXISTE' : '✗ no existe') . "\n";
}

// Intentar cargar el config que se encuentre
$configLoaded = null;
foreach ($paths as $p) {
    if (file_exists($p)) { $configLoaded = $p; break; }
}

echo "\n";
if (!$configLoaded) {
    echo "ERROR: Ningún config encontrado.\n";
} else {
    echo "Config encontrado: $configLoaded\n";
    require_once $configLoaded;
    echo "DB_HOST: " . (defined('DB_HOST') ? DB_HOST : '?') . "\n";
    echo "DB_USER: " . (defined('DB_USER') ? DB_USER : '?') . "\n";
    echo "DB_NAME: " . (defined('DB_NAME') ? DB_NAME : '?') . "\n";
    echo "BASE_URL: " . (defined('BASE_URL') ? BASE_URL : '?') . "\n\n";

    // Probar conexión real a BD
    try {
        $pdo = new PDO(
            "mysql:host=".DB_HOST.";dbname=".DB_NAME.";charset=utf8mb4",
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        echo "Conexión BD: ✓ OK\n";
    } catch (Exception $e) {
        echo "Conexión BD: ✗ FALLO → " . $e->getMessage() . "\n";
    }
}
echo '</pre>';
