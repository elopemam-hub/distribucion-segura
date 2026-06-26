<?php
echo '<pre>';
echo 'PHP: ' . PHP_VERSION . "\n";
echo '__DIR__: ' . __DIR__ . "\n\n";

$paths = [
    __DIR__ . '/includes/config.php',
    dirname(dirname(dirname(__DIR__))) . '/dist-segura.config.php',
    dirname(dirname(__DIR__)) . '/dist-segura.config.php',
];

foreach ($paths as $p) {
    echo ($p . ' → ' . (file_exists($p) ? '✓ EXISTE' : '✗ no existe') . "\n");
}
echo '</pre>';
