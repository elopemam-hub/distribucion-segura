<?php
require_once __DIR__ . '/includes/auth.php';
echo '<pre>';
echo "UPLOAD_DIR: " . UPLOAD_DIR . "\n\n";

$dir = UPLOAD_DIR . 'amonestaciones/';
echo "Contenido de amonestaciones/ (" . $dir . "):\n";
$files = scandir($dir) ?: [];
foreach ($files as $f) {
    if ($f === '.' || $f === '..') continue;
    $full = $dir . $f;
    echo "  $f  (" . (is_file($full) ? filesize($full).' bytes' : 'directorio') . ")\n";
}
if (count($files) <= 2) echo "  (vacía)\n";

echo "\nContenido de uploads/ (raíz):\n";
$root = scandir(UPLOAD_DIR) ?: [];
foreach ($root as $f) {
    if ($f === '.' || $f === '..') continue;
    echo "  $f\n";
}
echo '</pre>';
