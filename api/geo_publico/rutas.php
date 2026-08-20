<?php
// ============================================================
// API PÚBLICA: Portal del Conductor — lista de rutas compartidas
// SIN login. Devuelve las rutas críticas marcadas como públicas.
// ============================================================

require_once __DIR__ . '/../../includes/auth.php';   // solo para db()/jsonResponse()
header('Content-Type: application/json; charset=utf-8');

try {
    $rutas = db()->fetchAll(
        "SELECT g.nombre, g.descripcion, g.token_publico AS token,
                (SELECT COUNT(*) FROM geo_puntos p WHERE p.geocerca_id = g.id AND p.activo = 1) AS n_puntos
           FROM geocercas g
          WHERE g.tipo = 'ruta_critica' AND g.publico = 1 AND g.activo = 1
            AND g.token_publico IS NOT NULL
          ORDER BY g.nombre ASC"
    );
    jsonResponse(true, '', ['rutas' => $rutas]);
} catch (Throwable $e) {
    error_log('[geo_publico:rutas] ' . $e->getMessage());
    jsonResponse(false, 'No se pudieron cargar las rutas.', null, 500);
}
