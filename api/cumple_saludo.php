<?php
// ============================================================
// API: SALUDO MENSUAL DE CUMPLEAÑOS (para el mural publicable)
// Archivo: api/cumple_saludo.php  (get | save)  — uno por año/mes.
// ============================================================

require_once __DIR__ . '/../includes/auth.php';
requireLogin();
setupCumpleSaludos();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? 'get';

if ($action === 'save') {
    requireCsrf();
    $u = getCurrentUser();
    if (!in_array($u['rol'] ?? '', ['administrador', 'supervisor'], true)) {
        jsonResponse(false, 'Solo admin/supervisor puede editar el saludo.', null, 403);
    }
    $anio = (int)($_POST['anio'] ?? 0);
    $mes  = (int)($_POST['mes'] ?? 0);
    if ($anio < 2000 || $anio > 2100 || $mes < 1 || $mes > 12) jsonResponse(false, 'Año/mes inválido.', null, 422);
    $msg = mb_substr(trim($_POST['mensaje'] ?? ''), 0, 255);
    db()->query("INSERT INTO cumple_saludos (anio, mes, mensaje) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE mensaje = VALUES(mensaje)", [$anio, $mes, $msg]);
    jsonResponse(true, 'Saludo guardado.', ['mensaje' => $msg]);
}

$anio = (int)($_GET['anio'] ?? 0);
$mes  = (int)($_GET['mes'] ?? 0);
$r = db()->fetchOne("SELECT mensaje FROM cumple_saludos WHERE anio = ? AND mes = ?", [$anio, $mes]);
jsonResponse(true, '', ['mensaje' => $r['mensaje'] ?? '']);
