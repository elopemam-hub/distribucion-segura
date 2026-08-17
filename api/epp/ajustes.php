<?php
// ============================================================
// API EPP: configuración clave/valor — datos del empleador y política de stock
// Archivo: api/epp/ajustes.php
// (NO puede llamarse config.php: el .htaccess bloquea ese nombre con
//  <Files "config.php"> Require all denied → Apache devuelve 403.)
// Alimenta la cabecera del registro oficial R.M. 050-2013-TR.
// Acciones (?action=): get, save
// ============================================================

require_once __DIR__ . '/../../includes/auth.php';

requireLogin();
setupEpp();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? 'get';

// Claves permitidas (whitelist). emp_logo se gestiona por archivo (no texto).
const EPP_CONFIG_KEYS = [
    'emp_razon_social', 'emp_ruc', 'emp_domicilio', 'emp_actividad', 'emp_num_trab', 'emp_responsable',
    'ct_nombre', 'ct_domicilio', 'ct_responsable', 'ct_num_trab',
    'doc_codigo', 'doc_version', 'doc_fecha', 'emp_logo',
    'stock_min_pct', 'stock_max_pct',
];

if (in_array($action, ['save', 'delete_logo'], true)) {
    requireCsrf();
    $user = getCurrentUser();
    if (!in_array($user['rol'], ['administrador', 'supervisor'])) {
        jsonResponse(false, 'No tienes permisos.', null, 403);
    }
}

try {
    switch ($action) {
        case 'get':         obtener();     break;
        case 'save':        guardar();     break;
        case 'delete_logo': eliminarLogo(); break;
        default: jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Throwable $e) {
    error_log('[epp/config] ' . $e->getMessage());
    jsonResponse(false, 'Error en la operación.', null, 500);
}

// ============================================================
function obtener() {
    $rows = db()->fetchAll("SELECT clave, valor FROM epp_config");
    $cfg = [];
    foreach (EPP_CONFIG_KEYS as $k) $cfg[$k] = '';
    foreach ($rows as $r) {
        if (in_array($r['clave'], EPP_CONFIG_KEYS, true)) $cfg[$r['clave']] = $r['valor'] ?? '';
    }
    jsonResponse(true, '', $cfg);
}

function guardar() {
    $tocaPct = false;
    foreach (EPP_CONFIG_KEYS as $k) {
        if ($k === 'emp_logo') continue;          // se gestiona por archivo
        if (!isset($_POST[$k])) continue;
        $valor = trim($_POST[$k]);
        if ($k === 'emp_ruc' && $valor !== '' && !preg_match('/^\d{11}$/', $valor)) {
            jsonResponse(false, 'El RUC debe tener 11 dígitos.', null, 422);
        }
        if (in_array($k, ['stock_min_pct', 'stock_max_pct'], true)) {
            if ($valor === '' || !is_numeric($valor) || $valor < 0 || $valor > 100) {
                jsonResponse(false, 'Los porcentajes deben estar entre 0 y 100.', null, 422);
            }
            $valor = (string)(0 + $valor);
            $tocaPct = true;
        }
        db()->query(
            "INSERT INTO epp_config (clave, valor) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
            [$k, $valor]
        );
    }

    // Si cambiaron los porcentajes, recalcula mín/máx de TODO el catálogo.
    if ($tocaPct) {
        $get = fn($k, $def) => (float)(db()->fetchOne("SELECT valor FROM epp_config WHERE clave=?", [$k])['valor'] ?? $def);
        $minPct = $get('stock_min_pct', 10);
        $maxPct = $get('stock_max_pct', 20);
        db()->query(
            "UPDATE epp_tipos
                SET stock_minimo = ROUND(consumo_anual * ? / 100),
                    stock_maximo = ROUND(consumo_anual * ? / 100)",
            [$minPct, $maxPct]
        );
    }

    // Logo de la empresa (opcional): imagen a uploads/epp/. Reemplaza el anterior.
    if (!empty($_FILES['emp_logo']['tmp_name'])) {
        $ruta = guardarLogoEpp($_FILES['emp_logo']);
        if (!$ruta) jsonResponse(false, 'El logo debe ser una imagen (JPG/PNG/WEBP) de máx 5MB.', null, 422);
        $ant = db()->fetchOne("SELECT valor FROM epp_config WHERE clave='emp_logo'")['valor'] ?? '';
        if ($ant && is_file(__DIR__ . '/../../uploads/' . $ant)) @unlink(__DIR__ . '/../../uploads/' . $ant);
        db()->query("INSERT INTO epp_config (clave, valor) VALUES ('emp_logo', ?)
                     ON DUPLICATE KEY UPDATE valor = VALUES(valor)", [$ruta]);
    }

    jsonResponse(true, 'Configuración guardada.');
}

// Elimina el logo de la empresa (config a '' y borra el archivo).
function eliminarLogo() {
    $ant = db()->fetchOne("SELECT valor FROM epp_config WHERE clave='emp_logo'")['valor'] ?? '';
    if ($ant && is_file(__DIR__ . '/../../uploads/' . $ant)) @unlink(__DIR__ . '/../../uploads/' . $ant);
    db()->query("INSERT INTO epp_config (clave, valor) VALUES ('emp_logo', '')
                 ON DUPLICATE KEY UPDATE valor = ''");
    jsonResponse(true, 'Logo eliminado.');
}

// Sube el logo (solo imagen) a uploads/epp/. Devuelve ruta relativa o null.
function guardarLogoEpp(array $file): ?string {
    if ($file['error'] !== UPLOAD_ERR_OK) return null;
    if ($file['size'] <= 0 || $file['size'] > MAX_FILE_SIZE) return null;
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime  = $finfo->file($file['tmp_name']);
    $map   = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($map[$mime])) return null;
    if (@getimagesize($file['tmp_name']) === false) return null;
    $dir = __DIR__ . '/../../uploads/epp/';
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $filename = 'logo_' . bin2hex(random_bytes(6)) . '.' . $map[$mime];
    if (move_uploaded_file($file['tmp_name'], $dir . $filename)) {
        @chmod($dir . $filename, 0644);
        return 'epp/' . $filename;
    }
    return null;
}
