<?php
// ============================================================
// API: catálogo de vehículos (proyecto de vigilancia)
// Archivo: api/vehiculos.php
// Se conecta a la BD de vigilancia con SU PROPIO usuario (VIGILANCIA_DB_* en
// config.php) — no depende de permisos cross-database. Si no está configurada
// o no conecta, degrada a vacío y la Inspección sigue con texto libre.
// Acciones (?action=): ping (diagnóstico), buscar (autocompletar), list, estados, get
// ============================================================

require_once __DIR__ . '/../includes/auth.php';
requireLogin();
header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? 'buscar';
$vig = dbVigilancia();

// Helper local: consulta sobre la conexión de vigilancia.
$vigAll = function (string $sql, array $params = []) use ($vig): array {
    $st = $vig->prepare($sql);
    $st->execute($params);
    return $st->fetchAll();
};

// Diagnóstico: confirma si esta app puede leer la BD de vigilancia.
if ($action === 'ping') {
    if (!$vig) {
        jsonResponse(false, 'No configurado: falta definir VIGILANCIA_DB_NAME / VIGILANCIA_DB_USER / VIGILANCIA_DB_PASS en includes/config.php.', null, 200);
    }
    try {
        $c = $vigAll("SELECT COUNT(*) c FROM vehiculos");
        jsonResponse(true, 'Acceso correcto.', ['db' => VIGILANCIA_DB_NAME, 'total_vehiculos' => (int)($c[0]['c'] ?? 0)]);
    } catch (Throwable $e) {
        jsonResponse(false, 'Conecta pero falla la consulta: ' . $e->getMessage(), null, 200);
    }
}

// Sin conexión configurada → vacío (degradación segura).
if (!$vig) { jsonResponse(true, '', []); }

try {
    if ($action === 'buscar') {
        $q = trim($_GET['q'] ?? '');
        if ($q === '') { jsonResponse(true, '', []); }
        $rows = $vigAll(
            "SELECT id, placa, tipo, marca, modelo, anio, estado
               FROM vehiculos WHERE placa LIKE ? ORDER BY placa ASC LIMIT 15",
            ["%$q%"]
        );
        jsonResponse(true, '', $rows);

    } elseif ($action === 'get') {
        $placa = trim($_GET['placa'] ?? '');
        if ($placa === '') { jsonResponse(true, '', null); }
        $rows = $vigAll(
            "SELECT id, placa, tipo, marca, modelo, anio, estado FROM vehiculos WHERE placa = ? LIMIT 1",
            [$placa]
        );
        jsonResponse(true, '', $rows[0] ?? null);

    } elseif ($action === 'list') {
        $q      = trim($_GET['q'] ?? '');
        $estado = trim($_GET['estado'] ?? '');
        $where = ['1=1']; $params = [];
        if ($q !== '') {
            $where[] = '(placa LIKE ? OR marca LIKE ? OR n_serie LIKE ?)';
            $params[] = "%$q%"; $params[] = "%$q%"; $params[] = "%$q%";
        }
        if ($estado !== '') { $where[] = 'estado = ?'; $params[] = $estado; }
        $rows = $vigAll(
            "SELECT id, placa, tipo, marca, modelo, anio, n_serie, estado
               FROM vehiculos WHERE " . implode(' AND ', $where) . " ORDER BY placa ASC LIMIT 500",
            $params
        );
        jsonResponse(true, '', $rows);

    } elseif ($action === 'estados') {
        $rows = $vigAll("SELECT DISTINCT estado FROM vehiculos WHERE estado IS NOT NULL AND estado <> '' ORDER BY estado");
        jsonResponse(true, '', array_column($rows, 'estado'));

    } else {
        jsonResponse(false, 'Acción no válida.', null, 400);
    }
} catch (Throwable $e) {
    error_log('[vehiculos] ' . $e->getMessage());
    jsonResponse(true, '', []);
}
