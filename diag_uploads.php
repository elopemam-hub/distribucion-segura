<?php
require_once __DIR__ . '/includes/auth.php';
requireLogin();

header('Content-Type: application/json; charset=utf-8');

// __DIR__ aquí es la raíz del proyecto (donde está index.php)
// guardar_inspeccion.php usa __DIR__.'/../uploads/' desde api/  → raíz/uploads/
// config.php usa         __DIR__.'/../uploads/' desde includes/ → raíz/uploads/

$uploadDirConfig = UPLOAD_DIR;                         // desde includes/
$uploadDirApi    = __DIR__ . '/api/../uploads/';       // simula guardar_inspeccion.php

$realConfig = realpath($uploadDirConfig);
$realApi    = realpath($uploadDirApi);

$info = [
  'upload_dir_config'      => $uploadDirConfig,
  'upload_dir_config_real' => $realConfig,
  'upload_dir_api'         => $uploadDirApi,
  'upload_dir_api_real'    => $realApi,
  'paths_match'            => $realConfig === $realApi,
  'upload_dir_exists'      => is_dir($uploadDirConfig),
  'upload_dir_writable'    => is_writable($uploadDirConfig),
  'php_upload_max'         => ini_get('upload_max_filesize'),
  'php_post_max'           => ini_get('post_max_size'),
  'php_max_files'          => ini_get('max_file_uploads'),
  'document_root'          => $_SERVER['DOCUMENT_ROOT'] ?? 'N/A',
  'script_filename'        => $_SERVER['SCRIPT_FILENAME'] ?? 'N/A',
  'evidencias_en_db'       => 0,
  'archivos_en_disco'      => [],
  'evidencias_rotas'       => [],
];

// Test de escritura usando realpath (igual que move_uploaded_file lo haría)
$scanDir  = $realConfig ?: $uploadDirConfig;
$testFile = rtrim($scanDir, '/') . '/test_write_' . time() . '.txt';
$writeOk  = @file_put_contents($testFile, 'test') !== false;
if ($writeOk) @unlink($testFile);
$info['test_escritura_real'] = $writeOk;

// Listar TODOS los archivos del directorio para ver qué hay
if (is_dir($scanDir)) {
  $all = scandir($scanDir);
  $info['todos_los_archivos'] = array_values(array_filter($all, fn($f) => $f !== '.' && $f !== '..'));
  $ev  = glob($scanDir . '/ev_*.{jpg,jpeg,png,webp}', GLOB_BRACE);
  $info['archivos_en_disco'] = array_map('basename', $ev ?: []);
}

// Comparar con DB
try {
  $rows = db()->fetchAll(
    "SELECT e.id, e.inspeccion_id, e.ruta_imagen FROM evidencias e ORDER BY e.id DESC LIMIT 50"
  );
  $info['evidencias_en_db'] = count($rows);
  foreach ($rows as $r) {
    $path  = rtrim($scanDir, '/') . '/' . $r['ruta_imagen'];
    if (!file_exists($path)) {
      $info['evidencias_rotas'][] = [
        'id'            => $r['id'],
        'inspeccion_id' => $r['inspeccion_id'],
        'ruta_imagen'   => $r['ruta_imagen'],
      ];
    }
  }
} catch (Exception $e) {
  $info['db_error'] = $e->getMessage();
}

echo json_encode($info, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
