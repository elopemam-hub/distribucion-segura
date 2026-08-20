<?php
// ============================================================
// API PÚBLICA: Mapa del Conductor (ruta crítica + señalización)
// SIN login. Devuelve la ruta y sus puntos por token público.
// Se llama mapa.php (NO config.php) porque .htaccess bloquea config.php.
// ============================================================

require_once __DIR__ . '/../../includes/auth.php';   // solo para db()/jsonResponse()
header('Content-Type: application/json; charset=utf-8');

$token = trim($_GET['t'] ?? '');
if (!preg_match('/^[a-f0-9]{8,32}$/', $token)) {
    jsonResponse(false, 'Enlace no válido.', null, 404);
}

try {
    $ruta = db()->fetchOne(
        "SELECT id, nombre, descripcion, color, coordenadas
           FROM geocercas
          WHERE token_publico = ? AND publico = 1 AND tipo = 'ruta_critica' AND activo = 1",
        [$token]
    );
    if (!$ruta) jsonResponse(false, 'Este mapa no está disponible.', null, 404);

    $puntos = db()->fetchAll(
        "SELECT tipo, lat, lng, velocidad, descripcion, severidad
           FROM geo_puntos WHERE geocerca_id = ? AND activo = 1 ORDER BY orden ASC, id ASC",
        [$ruta['id']]
    );

    jsonResponse(true, '', [
        'nombre'      => $ruta['nombre'],
        'descripcion' => $ruta['descripcion'],
        'color'       => $ruta['color'],
        'coordenadas' => json_decode($ruta['coordenadas'], true) ?: [],
        'puntos'      => $puntos,
    ]);
} catch (Throwable $e) {
    error_log('[geo_publico] ' . $e->getMessage());
    jsonResponse(false, 'No se pudo cargar el mapa.', null, 500);
}
