<?php
// ============================================================
// API: GUARDAR INSPECCIÓN COMPLETA
// Archivo: api/guardar_inspeccion.php
// ============================================================

require_once __DIR__ . '/../includes/auth.php';

requireLogin();
requireCsrf();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(false, 'Método no permitido.', null, 405);
}

// --- Datos principales ---
$unidad       = trim($_POST['unidad'] ?? '');
$fecha        = $_POST['fecha'] ?? '';
$hora         = $_POST['hora'] ?? '';
$provincia    = trim($_POST['provincia'] ?? 'San Román');
$distrito     = trim($_POST['distrito'] ?? 'Juliaca');
$direccion    = trim($_POST['direccion'] ?? '');
$conductor    = trim($_POST['conductor'] ?? '');
$reparto      = trim($_POST['reparto'] ?? '');
$observaciones= trim($_POST['observaciones'] ?? '');
$latitud      = $_POST['latitud'] ?? null;
$longitud     = $_POST['longitud'] ?? null;
$firma        = $_POST['firma_digital'] ?? null;
$inspector_id = getCurrentUser()['id'];

// Validaciones básicas
$errores = [];
if (empty($unidad))    $errores[] = 'La placa/unidad es requerida.';
if (empty($fecha))     $errores[] = 'La fecha es requerida.';
if (empty($hora))      $errores[] = 'La hora es requerida.';
if (empty($conductor)) $errores[] = 'El conductor es requerido.';
if (empty($direccion)) $errores[] = 'La dirección es requerida.';

if (!empty($errores)) {
    jsonResponse(false, implode(' | ', $errores), null, 422);
}

// --- Checklist y cálculo de cumplimiento ---
$checklistItems = json_decode($_POST['checklist'] ?? '[]', true);
$totalItems  = count($checklistItems);
$itemsCumplen = 0;
foreach ($checklistItems as $item) {
    if (!empty($item['estado'])) $itemsCumplen++;
}
$resultado = $totalItems > 0 ? round(($itemsCumplen / $totalItems) * 100, 2) : 0;

// --- Tripulación ---
$tripulacion = json_decode($_POST['tripulacion'] ?? '[]', true);
if (!is_array($tripulacion)) $tripulacion = [];

// Validación: ningún miembro puede repetirse (mismo nombre)
$nombresNorm = [];
foreach ($tripulacion as $m) {
    $n = mb_strtoupper(preg_replace('/\s+/u', ' ', trim($m['nombre'] ?? '')), 'UTF-8');
    if ($n === '') continue;
    if (in_array($n, $nombresNorm, true)) {
        jsonResponse(false, "El miembro \"$n\" está repetido en la tripulación. Cada persona debe registrarse una sola vez.", null, 422);
    }
    $nombresNorm[] = $n;
}

// --- Hallazgos ---
$hallazgos = json_decode($_POST['hallazgos'] ?? '[]', true);

try {
    db()->beginTransaction();

    // 1. Insertar inspección
    db()->query(
        "INSERT INTO inspecciones 
         (unidad, fecha, hora, provincia, distrito, direccion, conductor, reparto, resultado, observaciones, latitud, longitud, firma_digital, inspector_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [$unidad, $fecha, $hora, $provincia, $distrito, $direccion, $conductor, $reparto, $resultado, $observaciones,
         $latitud ?: null, $longitud ?: null, $firma ?: null, $inspector_id]
    );
    $inspeccionId = db()->lastInsertId();

    // 2. Insertar tripulación
    // Rol asignado por POSICIÓN (no por lo que envíe el cliente):
    // Posición 1 → conductor, posición 2 → reparto, posición 3+ → auxiliar
    $posicion = 0;
    foreach ($tripulacion as $miembro) {
        $nombre = trim($miembro['nombre'] ?? '');
        if (empty($nombre)) continue;
        $posicion++;

        $rol = match(true) {
            $posicion === 1 => 'conductor',
            $posicion === 2 => 'reparto',
            default         => 'auxiliar',
        };

        $epp         = !empty($miembro['epp_completo']) ? 1 : 0;
        $epp_detalle = json_encode($miembro['epp_detalle'] ?? []);
        db()->query(
            "INSERT INTO tripulacion (inspeccion_id, nombre, rol, epp_completo, epp_detalle) VALUES (?, ?, ?, ?, ?)",
            [$inspeccionId, $nombre, $rol, $epp, $epp_detalle]
        );
    }

    // 3. Insertar checklist
    foreach ($checklistItems as $item) {
        $itemNombre = trim($item['item'] ?? '');
        $estado     = !empty($item['estado']) ? 1 : 0;
        if (!empty($itemNombre)) {
            db()->query(
                "INSERT INTO checklist (inspeccion_id, item, estado) VALUES (?, ?, ?)",
                [$inspeccionId, $itemNombre, $estado]
            );
        }
    }

    // 4. Subir evidencias
    $uploadedFiles = [];
    if (!empty($_FILES['evidencias']['name'][0])) {
        $uploadDir = __DIR__ . '/../uploads/';
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

        // Mapeo MIME real → extensión segura
        $mapaMime = [
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
        ];
        $finfo = new finfo(FILEINFO_MIME_TYPE);

        foreach ($_FILES['evidencias']['tmp_name'] as $k => $tmpName) {
            if ($_FILES['evidencias']['error'][$k] !== UPLOAD_ERR_OK) continue;

            $tamanio  = $_FILES['evidencias']['size'][$k];
            $original = $_FILES['evidencias']['name'][$k];

            // 1) Tamaño
            if ($tamanio <= 0 || $tamanio > MAX_FILE_SIZE) continue;

            // 2) MIME real leído del contenido del archivo (NO del cliente)
            $mimeReal = $finfo->file($tmpName);
            if (!isset($mapaMime[$mimeReal])) continue;

            // 3) Verificar que efectivamente sea una imagen decodificable
            if (@getimagesize($tmpName) === false) continue;

            // 4) Nombre seguro generado en servidor (ignoramos el original)
            $ext      = $mapaMime[$mimeReal];
            $filename = 'ev_' . $inspeccionId . '_' . bin2hex(random_bytes(6)) . '.' . $ext;
            $destino  = $uploadDir . $filename;

            if (move_uploaded_file($tmpName, $destino)) {
                @chmod($destino, 0644);
                // Guardamos el nombre original solo como referencia, ya sanitizado
                $origSafe = mb_substr(preg_replace('/[^\w\s\.\-]/u', '', $original), 0, 150);
                db()->query(
                    "INSERT INTO evidencias (inspeccion_id, ruta_imagen, nombre_original, tamaño) VALUES (?, ?, ?, ?)",
                    [$inspeccionId, $filename, $origSafe, $tamanio]
                );
                $uploadedFiles[] = $filename;
            }
        }
    }

    // 5. Insertar hallazgos
    foreach ($hallazgos as $h) {
        $desc = trim($h['descripcion'] ?? '');
        $crit = $h['criticidad'] ?? 'media';
        if (!empty($desc)) {
            db()->query(
                "INSERT INTO hallazgos (inspeccion_id, descripcion, criticidad) VALUES (?, ?, ?)",
                [$inspeccionId, $desc, $crit]
            );
        }
    }

    db()->commit();

    jsonResponse(true, 'Inspección guardada correctamente.', [
        'id'        => $inspeccionId,
        'resultado' => $resultado,
        'evidencias'=> count($uploadedFiles),
    ]);

} catch (Exception $e) {
    db()->rollback();
    error_log('[guardar_inspeccion] ' . $e->getMessage());
    jsonResponse(false, 'Error al guardar la inspección. Intenta nuevamente.', null, 500);
}