<?php
require_once __DIR__ . '/../includes/auth.php';
requireLogin();
header('Content-Type: application/json; charset=utf-8');

// Auto-crear tabla y sembrar defaults si no existe
try {
    db()->query("CREATE TABLE IF NOT EXISTS eval_empresas (
        id      INT           AUTO_INCREMENT PRIMARY KEY,
        nombre  VARCHAR(200)  NOT NULL,
        activo  TINYINT(1)    NOT NULL DEFAULT 1,
        orden   INT           NOT NULL DEFAULT 0,
        created_at TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_eval_empresa_nombre (nombre)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    db()->query("INSERT IGNORE INTO eval_empresas (nombre, orden) VALUES
        ('Amanecer',1),('Dicorjes',2),('Pajcha',3),('T77',4),('S.I.Venturo SAC',5)");
} catch (Exception $e) {
    error_log('[eval_empresas setup] ' . $e->getMessage());
}

$action = $_GET['action'] ?? $_POST['action'] ?? 'list';

// ── Listar ────────────────────────────────────────────────────
if ($action === 'list') {
    $rows = db()->fetchAll(
        "SELECT id, nombre FROM eval_empresas WHERE activo = 1 ORDER BY orden, nombre"
    );
    jsonResponse(true, '', $rows);
}

// ── Agregar ───────────────────────────────────────────────────
if ($action === 'add') {
    requireRole(['administrador']);
    requireCsrf();
    $nombre = trim($_POST['nombre'] ?? '');
    if ($nombre === '') jsonResponse(false, 'El nombre es requerido.', null, 400);
    try {
        db()->query("INSERT INTO eval_empresas (nombre) VALUES (?)", [$nombre]);
        $id = db()->lastInsertId();
        jsonResponse(true, 'Empresa agregada.', ['id' => (int)$id, 'nombre' => $nombre]);
    } catch (Exception $e) {
        jsonResponse(false, 'Ya existe una empresa con ese nombre.', null, 409);
    }
}

// ── Eliminar (soft delete) ────────────────────────────────────
if ($action === 'delete') {
    requireRole(['administrador']);
    requireCsrf();
    $id = (int)($_POST['id'] ?? 0);
    if ($id <= 0) jsonResponse(false, 'ID inválido.', null, 400);
    db()->query("UPDATE eval_empresas SET activo = 0 WHERE id = ?", [$id]);
    jsonResponse(true, 'Empresa eliminada.');
}

jsonResponse(false, 'Acción no reconocida.', null, 400);
