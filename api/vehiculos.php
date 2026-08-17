<?php
// ============================================================
// API: catálogo de vehículos (lectura cross-database)
// Archivo: api/vehiculos.php
// Lee la tabla `vehiculos` de la BD de vigilancia (mismo servidor MySQL).
// Requiere que el usuario MySQL de esta app tenga SELECT sobre esa BD.
// Si no lo tiene, degrada a vacío y la Inspección sigue con texto libre.
// Acciones (?action=): ping (diagnóstico), buscar (autocompletar), get
// ============================================================

require_once __DIR__ . '/../includes/auth.php';
requireLogin();
header('Content-Type: application/json; charset=utf-8');

// Nombre de la BD de vigilancia. Se puede sobreescribir en config.php con
// define('VIGILANCIA_DB', '...'); por defecto usa la de producción.
$vigDb = defined('VIGILANCIA_DB') ? VIGILANCIA_DB : 'u248634042_bdvigilancia';
if (!preg_match('/^[A-Za-z0-9_]+$/', $vigDb)) {
    jsonResponse(false, 'Nombre de BD de vigilancia inválido.', null, 500);
}

$action = $_GET['action'] ?? 'buscar';

// Diagnóstico: confirma si esta app puede leer la BD de vigilancia.
if ($action === 'ping') {
    try {
        $c = db()->fetchOne("SELECT COUNT(*) c FROM `$vigDb`.`vehiculos`");
        jsonResponse(true, 'Acceso correcto.', ['db' => $vigDb, 'total_vehiculos' => (int)($c['c'] ?? 0)]);
    } catch (Throwable $e) {
        jsonResponse(false, "Sin acceso a `$vigDb`.vehiculos: " . $e->getMessage(), ['db' => $vigDb], 200);
    }
}

try {
    if ($action === 'buscar') {
        $q = trim($_GET['q'] ?? '');
        if ($q === '') { jsonResponse(true, '', []); }
        $rows = db()->fetchAll(
            "SELECT id, placa, tipo, marca, modelo, anio, estado
               FROM `$vigDb`.`vehiculos`
              WHERE placa LIKE ?
              ORDER BY placa ASC LIMIT 15",
            ["%$q%"]
        );
        jsonResponse(true, '', $rows);

    } elseif ($action === 'get') {
        $placa = trim($_GET['placa'] ?? '');
        if ($placa === '') { jsonResponse(true, '', null); }
        $row = db()->fetchOne(
            "SELECT id, placa, tipo, marca, modelo, anio, estado
               FROM `$vigDb`.`vehiculos` WHERE placa = ? LIMIT 1",
            [$placa]
        );
        jsonResponse(true, '', $row);

    } else {
        jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Throwable $e) {
    // Sin acceso / BD inexistente → vacío. Inspecciones sigue con texto libre.
    error_log('[vehiculos] ' . $e->getMessage());
    jsonResponse(true, '', []);
}
