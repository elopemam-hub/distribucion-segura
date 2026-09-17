<?php
// ============================================================
// API: CONFIGURACIÓN GLOBAL DE EVALUACIONES
// Archivo: api/eval_config.php  (get | save)
// max_por_persona: máximo de respuestas por trabajador (DNI) por evaluación.
// (No se llama config.php porque .htaccess bloquea ese nombre.)
// ============================================================

require_once __DIR__ . '/../includes/auth.php';
requireLogin();
if (function_exists('setupEvalFormularios')) setupEvalFormularios();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? 'get';

if ($action === 'save') {
    requireCsrf();
    $u = getCurrentUser();
    if (($u['rol'] ?? '') !== 'administrador') jsonResponse(false, 'Solo un administrador puede cambiar la configuración.', null, 403);
    $n = (int)($_POST['max_por_persona'] ?? 2);
    if ($n < 1 || $n > 50) jsonResponse(false, 'Valor inválido (debe ser entre 1 y 50).', null, 422);
    db()->query("INSERT INTO eval_config (id, max_por_persona) VALUES (1, ?)
                 ON DUPLICATE KEY UPDATE max_por_persona = VALUES(max_por_persona)", [$n]);
    jsonResponse(true, 'Configuración guardada.', ['max_por_persona' => $n]);
}

jsonResponse(true, '', ['max_por_persona' => evalMaxRespuestasPorPersona()]);
