<?php
require_once __DIR__ . '/includes/auth.php';
echo '<pre>';

echo "DOCUMENT_ROOT: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'NO DEFINIDO') . "\n";
echo "BASE_URL: "      . (defined('BASE_URL')   ? BASE_URL   : 'NO DEFINIDO') . "\n";
echo "UPLOAD_DIR: "    . (defined('UPLOAD_DIR')  ? UPLOAD_DIR  : 'NO DEFINIDO') . "\n\n";

echo "¿UPLOAD_DIR existe? " . (is_dir(UPLOAD_DIR) ? '✓ SÍ' : '✗ NO') . "\n";
echo "¿UPLOAD_DIR/amonestaciones/ existe? " . (is_dir(UPLOAD_DIR . 'amonestaciones/') ? '✓ SÍ' : '✗ NO') . "\n\n";

// Listar primeros 5 PDFs en amonestaciones/
$pdfs = glob(UPLOAD_DIR . 'amonestaciones/*.pdf') ?: [];
echo "PDFs encontrados en UPLOAD_DIR/amonestaciones/ (" . count($pdfs) . "):\n";
foreach (array_slice($pdfs, 0, 5) as $p) {
    echo "  " . basename($p) . "\n";
}

// Probar el primer PDF
if (!empty($pdfs)) {
    $test = 'amonestaciones/' . basename($pdfs[0]);
    $url  = BASE_URL . '/api/documento.php?f=' . urlencode($test);
    echo "\nTest URL para primer PDF:\n  $url\n";
}

echo '</pre>';
