<?php
require_once __DIR__ . '/includes/auth.php';
requireLogin();
if (getCurrentUser()['rol'] !== 'admin') { http_response_code(403); exit('No autorizado'); }

header('Content-Type: application/json; charset=utf-8');

$uploadDir = UPLOAD_DIR; // __DIR__ . '/../uploads/' desde config
$info = [
  'upload_dir_php'       => $uploadDir,
  'upload_dir_exists'    => is_dir($uploadDir),
  'upload_dir_writable'  => is_writable($uploadDir),
  'php_upload_max'       => ini_get('upload_max_filesize'),
  'php_post_max'         => ini_get('post_max_size'),
  'php_max_files'        => ini_get('max_file_uploads'),
  'evidencias_en_db'     => 0,
  'archivos_en_disco'    => [],
  'evidencias_rotas'     => [],
];

// Archivos que hay en disco
if (is_dir($uploadDir)) {
  $files = glob($uploadDir . 'ev_*.{jpg,jpeg,png,webp}', GLOB_BRACE);
  $info['archivos_en_disco'] = array_map('basename', $files ?: []);
}

// Comparar con DB
try {
  $rows = db()->fetchAll("SELECT e.id, e.inspeccion_id, e.ruta_imagen FROM evidencias e ORDER BY e.id DESC LIMIT 50");
  $info['evidencias_en_db'] = count($rows);
  foreach ($rows as $r) {
    $existe = file_exists($uploadDir . $r['ruta_imagen']);
    if (!$existe) {
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
