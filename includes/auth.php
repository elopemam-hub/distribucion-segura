<?php
// ============================================================
// AUTENTICACIÓN Y SESIONES
// Archivo: includes/auth.php
// ============================================================

require_once __DIR__ . '/db.php';

// Configuración segura de cookie de sesión (antes de session_start)
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', '1');
    ini_set('session.use_only_cookies', '1');
    ini_set('session.cookie_samesite', 'Lax');
    // Si el sitio sirve por HTTPS, activar también cookie_secure
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        ini_set('session.cookie_secure', '1');
    }
    session_start();
}

function isLoggedIn(): bool {
    return isset($_SESSION['user_id']) && !empty($_SESSION['user_id']);
}

// Libera el bloqueo de escritura de la sesión (tras leer usuario/CSRF). Permite
// que otras peticiones del mismo usuario corran en paralelo (p.ej. subir varios
// archivos) sin quedar en cola por el lock de la sesión. $_SESSION sigue legible.
function liberarSesion(): void {
    if (session_status() === PHP_SESSION_ACTIVE) session_write_close();
}

function requireLogin(): void {
    if (!isLoggedIn()) {
        header('Location: ' . BASE_URL . '/login.php');
        exit;
    }
}

function requireRole(array $roles): void {
    requireLogin();
    if (!in_array($_SESSION['user_rol'], $roles)) {
        http_response_code(403);
        die(json_encode(['success' => false, 'message' => 'Acceso no autorizado.']));
    }
}

function getCurrentUser(): ?array {
    if (!isLoggedIn()) return null;
    return [
        'id'     => $_SESSION['user_id'],
        'nombre' => $_SESSION['user_nombre'],
        'usuario'=> $_SESSION['user_usuario'],
        'rol'    => $_SESSION['user_rol'],
    ];
}

function login(string $usuario, string $password): bool {
    $user = db()->fetchOne(
        "SELECT * FROM usuarios WHERE usuario = ? AND activo = 1",
        [$usuario]
    );
    if (!$user) return false;
    if (!password_verify($password, $user['password'])) return false;

    $_SESSION['user_id']      = $user['id'];
    $_SESSION['user_nombre']  = $user['nombre'];
    $_SESSION['user_usuario'] = $user['usuario'];
    $_SESSION['user_rol']     = $user['rol'];
    session_regenerate_id(true);
    return true;
}

function logout(): void {
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
    header('Location: ' . BASE_URL . '/login.php');
    exit;
}

// ============================================================
// CSRF - Protección contra Cross-Site Request Forgery
// ============================================================

// Genera (o recupera) el token CSRF de la sesión actual
function csrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

// Imprime un <input hidden> con el token (para formularios HTML)
function csrfField(): string {
    return '<input type="hidden" name="csrf_token" value="' . htmlspecialchars(csrfToken(), ENT_QUOTES) . '">';
}

// Verifica el token recibido (POST o header X-CSRF-Token).
// Aborta la ejecución con 403 si es inválido.
function requireCsrf(): void {
    $recibido = $_POST['csrf_token']
        ?? ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    $esperado = $_SESSION['csrf_token'] ?? '';

    if (empty($esperado) || empty($recibido) || !hash_equals($esperado, $recibido)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'success' => false,
            'message' => 'Token CSRF inválido o expirado. Recarga la página.',
            'data'    => null,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ============================================================
// PERMISOS POR MÓDULO
// ============================================================

const MODULOS_VALIDOS = ['dashboard', 'inspecciones', 'personal', 'reportes', 'matriz', 'amonestaciones', 'geocercas', 'evaluaciones', 'capacitaciones', 'checklist', 'kpi_analytics', 'epp', 'vehiculos', 'empresas'];

// Defaults de acceso según rol (cuando el usuario no tiene filas en permisos)
const ROL_DEFAULTS = [
    'supervisor' => ['dashboard', 'inspecciones', 'personal', 'reportes', 'matriz', 'amonestaciones', 'geocercas', 'evaluaciones', 'capacitaciones', 'checklist', 'kpi_analytics', 'epp', 'vehiculos', 'empresas'],
    'inspector'  => ['dashboard', 'inspecciones', 'evaluaciones', 'capacitaciones', 'checklist'],
];

function getModulosUsuario(int $userId): array {
    try {
        $rows = db()->fetchAll("SELECT modulo FROM permisos WHERE usuario_id = ?", [$userId]);
        return array_column($rows, 'modulo');
    } catch (Exception $e) {
        return [];
    }
}

function tieneAccesoModulo(string $modulo): bool {
    $user = getCurrentUser();
    if (!$user) return false;

    // Administrador siempre tiene acceso completo
    if ($user['rol'] === 'administrador') return true;

    $permisos = getModulosUsuario((int)$user['id']);

    // Si tiene permisos explícitos, usar exactamente esos
    if (!empty($permisos)) {
        return in_array($modulo, $permisos, true);
    }

    // Sin permisos explícitos → usar defaults del rol
    return in_array($modulo, ROL_DEFAULTS[$user['rol']] ?? [], true);
}

// Crea eval_formularios si no existe y siembra los 3 base.
// También migra eval_secciones.formulario de ENUM a VARCHAR si aplica.
function setupEvalFormularios(): void {
    try {
        db()->query("CREATE TABLE IF NOT EXISTS eval_formularios (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            formulario_id VARCHAR(50)  NOT NULL,
            titulo        VARCHAR(200) NOT NULL,
            icono         VARCHAR(60)  NOT NULL DEFAULT 'fa-clipboard-list',
            color         VARCHAR(30)  NOT NULL DEFAULT '#1565C0',
            orden         INT          NOT NULL DEFAULT 0,
            activo        TINYINT(1)   NOT NULL DEFAULT 1,
            UNIQUE KEY uk_formulario_id (formulario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);

        db()->query("INSERT IGNORE INTO eval_formularios
            (formulario_id, titulo, icono, color, orden) VALUES
            ('manejo_practica',  'Manejo Práctica',  'fa-truck',          '#FFC107', 1),
            ('examen_defensiva', 'Examen Defensiva', 'fa-shield-halved',  '#1565C0', 2),
            ('induccion_t2',     'Inducción T2',     'fa-graduation-cap', '#28A745', 3)", []);
    } catch (Exception $e) {
        error_log('[setupEvalFormularios] ' . $e->getMessage());
    }

    // Migrar ENUM → VARCHAR si eval_secciones aún tiene ENUM
    try {
        db()->query("ALTER TABLE eval_secciones MODIFY formulario VARCHAR(50) NOT NULL", []);
    } catch (Exception $e) {
        // Ya es VARCHAR o la tabla no existe — ignorar
    }
}

// ============================================================
// MÓDULO EPP — Auto-provisión idempotente de tablas + seed.
// Se invoca al inicio de cada endpoint api/epp/* y al cargar la vista.
// Mismo patrón que setupEvalFormularios(): CREATE IF NOT EXISTS + INSERT IGNORE,
// para no depender de correr SQL manual por SSH en cada despliegue.
// ============================================================
function setupEpp(): void {
    static $done = false;
    if ($done) return;
    $done = true;
    try {
        // Catálogo de tipos de EPP
        db()->query("CREATE TABLE IF NOT EXISTS epp_tipos (
            id             INT AUTO_INCREMENT PRIMARY KEY,
            nombre         VARCHAR(120) NOT NULL,
            categoria      VARCHAR(80)  NOT NULL DEFAULT 'General',
            norma_tecnica  VARCHAR(120) NULL,
            vida_util_dias INT          NOT NULL DEFAULT 180,
            stock_minimo   INT          NOT NULL DEFAULT 0,
            unidad         VARCHAR(30)  NOT NULL DEFAULT 'unidad',
            activo         TINYINT(1)   NOT NULL DEFAULT 1,
            creado_en      DATETIME     DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);

        // Proveedores
        db()->query("CREATE TABLE IF NOT EXISTS epp_proveedores (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            razon_social    VARCHAR(200) NOT NULL,
            ruc             VARCHAR(20)  NULL,
            contacto        VARCHAR(150) NULL,
            telefono        VARCHAR(30)  NULL,
            email           VARCHAR(150) NULL,
            direccion       VARCHAR(255) NULL,
            certificaciones VARCHAR(255) NULL,
            activo          TINYINT(1)   NOT NULL DEFAULT 1,
            creado_en       DATETIME     DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);

        // Movimientos de inventario (kardex con signo: entradas +, salidas −).
        // Stock actual de un tipo = SUM(cantidad).
        db()->query("CREATE TABLE IF NOT EXISTS epp_movimientos (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            tipo_epp_id   INT NOT NULL,
            tipo_mov      ENUM('inicial','entrada','salida','ajuste') NOT NULL DEFAULT 'entrada',
            cantidad      INT NOT NULL,
            costo_unitario DECIMAL(10,2) NULL,
            proveedor_id  INT NULL,
            entrega_id    INT NULL,
            fecha         DATE NOT NULL,
            documento_ref VARCHAR(100) NULL,
            usuario_id    INT NULL,
            observacion   VARCHAR(255) NULL,
            creado_en     DATETIME DEFAULT CURRENT_TIMESTAMP,
            KEY idx_epp_mov_tipo (tipo_epp_id),
            KEY idx_epp_mov_fecha (fecha)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);

        // Seed del catálogo: los 5 EPP estándar (mismos de EPP_ITEMS en core.js),
        // con norma técnica y vida útil referenciales (editables desde Configuración).
        // Se siembra SOLO si la tabla está vacía (ya no hay UNIQUE por nombre que
        // haga idempotente al INSERT IGNORE, porque un EPP puede repetirse por talla).
        $eppVacio = (int)(db()->fetchOne("SELECT COUNT(*) c FROM epp_tipos")['c'] ?? 0) === 0;
        if ($eppVacio) {
            db()->query("INSERT INTO epp_tipos
                (nombre, categoria, norma_tecnica, vida_util_dias, stock_minimo, unidad) VALUES
                ('Casco',                'Cabeza',      'ANSI Z89.1',  365, 5, 'unidad'),
                ('Chaleco reflectivo',   'Alta visibilidad', 'EN ISO 20471', 180, 5, 'unidad'),
                ('Zapatos de seguridad', 'Pies',        'ISO 20345',   365, 5, 'par'),
                ('Lentes',               'Ojos',        'ANSI Z87.1',   90, 10, 'unidad'),
                ('Guantes',              'Manos',       'EN 388',       60, 10, 'par')", []);
        }

        // ── FASE 2: entrega de EPP a trabajador (núcleo legal R.M. 050-2013-TR) ──
        // Cabecera de la entrega: a quién, cuándo, por qué motivo, con firma del
        // trabajador (base64). Los datos del trabajador se copian como snapshot para
        // conservar el registro aunque el personal cambie o se desactive.
        db()->query("CREATE TABLE IF NOT EXISTS epp_entregas (
            id                   INT AUTO_INCREMENT PRIMARY KEY,
            personal_id          INT NULL,
            trabajador_nombre    VARCHAR(160) NOT NULL,
            trabajador_dni       VARCHAR(20)  NULL,
            trabajador_cargo     VARCHAR(60)  NULL,
            motivo               ENUM('nuevo','renovacion','reposicion','perdida') NOT NULL DEFAULT 'nuevo',
            fecha                DATE NOT NULL,
            firma_trabajador     MEDIUMTEXT NULL,
            observacion          VARCHAR(255) NULL,
            entregado_por        INT NULL,
            entregado_por_nombre VARCHAR(120) NULL,
            estado               ENUM('vigente','anulada') NOT NULL DEFAULT 'vigente',
            creado_en            DATETIME DEFAULT CURRENT_TIMESTAMP,
            KEY idx_epp_ent_personal (personal_id),
            KEY idx_epp_ent_fecha (fecha)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);

        // Detalle: un renglón por EPP entregado. Guarda snapshot de nombre y vida útil,
        // y la fecha de renovación calculada (fecha + vida_util_dias).
        db()->query("CREATE TABLE IF NOT EXISTS epp_entrega_items (
            id               INT AUTO_INCREMENT PRIMARY KEY,
            entrega_id       INT NOT NULL,
            tipo_epp_id      INT NOT NULL,
            tipo_nombre      VARCHAR(120) NOT NULL,
            norma_tecnica    VARCHAR(120) NULL,
            cantidad         INT NOT NULL,
            vida_util_dias   INT NULL,
            fecha_renovacion DATE NULL,
            KEY idx_epp_ei_entrega (entrega_id),
            KEY idx_epp_ei_tipo (tipo_epp_id),
            KEY idx_epp_ei_renov (fecha_renovacion)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);

        // Configuración clave/valor. Datos del empleador para la cabecera del registro
        // oficial (R.M. 050-2013-TR exige razón social, RUC, domicilio y actividad).
        db()->query("CREATE TABLE IF NOT EXISTS epp_config (
            clave     VARCHAR(60)  PRIMARY KEY,
            valor     VARCHAR(255) NULL,
            actualizado DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);

        db()->query("INSERT IGNORE INTO epp_config (clave, valor) VALUES
            ('emp_razon_social',    ''),
            ('emp_ruc',             ''),
            ('emp_domicilio',       ''),
            ('emp_actividad',       ''),
            ('emp_num_trab',        ''),
            ('emp_responsable',     ''),
            ('ct_nombre',           ''),
            ('ct_domicilio',        ''),
            ('ct_responsable',      ''),
            ('ct_num_trab',         ''),
            ('ct_area',             ''),
            ('doc_codigo',          ''),
            ('doc_version',         ''),
            ('doc_fecha',           ''),
            ('stock_min_pct',       '10'),
            ('stock_max_pct',       '20')", []);

        // ── Ampliación del catálogo (referencia de inventario con código, talla,
        // marca, imagen y consumo anual). Stock mín/máx se derivan del consumo
        // anual (× stock_min_pct / stock_max_pct). ALTER idempotente. ──
        $eppAddCol = function (string $col, string $ddl) {
            $exists = db()->fetchOne(
                "SELECT 1 FROM information_schema.columns
                  WHERE table_schema = DATABASE() AND table_name = 'epp_tipos' AND column_name = ?",
                [$col]
            );
            if (!$exists) db()->query("ALTER TABLE epp_tipos ADD COLUMN $ddl", []);
        };
        $eppAddCol('codigo',        "codigo VARCHAR(40) NULL AFTER id");
        $eppAddCol('marca',         "marca VARCHAR(80) NULL AFTER nombre");
        $eppAddCol('talla',         "talla VARCHAR(20) NULL AFTER categoria");
        $eppAddCol('consumo_anual', "consumo_anual INT NOT NULL DEFAULT 0 AFTER talla");
        $eppAddCol('stock_maximo',  "stock_maximo INT NOT NULL DEFAULT 0 AFTER stock_minimo");
        $eppAddCol('imagen',        "imagen VARCHAR(255) NULL AFTER unidad");

        // El catálogo ahora admite el mismo nombre en varias tallas, así que el
        // UNIQUE por nombre ya no aplica; se elimina si existe (la dedup pasa a
        // (nombre, talla) en api/epp/tipos.php).
        $hasUk = db()->fetchOne(
            "SELECT 1 FROM information_schema.statistics
              WHERE table_schema = DATABASE() AND table_name = 'epp_tipos'
                AND index_name = 'uk_epp_tipo_nombre'"
        );
        if ($hasUk) db()->query("ALTER TABLE epp_tipos DROP INDEX uk_epp_tipo_nombre", []);

        // ── Matriz de EPP por puesto ──
        // Define qué EPP (y cuántos) corresponde a cada cargo. Alimenta la
        // sugerencia automática del kit al registrar una entrega. Un renglón por
        // (cargo, tipo_epp); UNIQUE evita duplicados y permite upsert por cargo.
        db()->query("CREATE TABLE IF NOT EXISTS epp_puesto_matriz (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            cargo       VARCHAR(60) NOT NULL,
            tipo_epp_id INT NOT NULL,
            cantidad    INT NOT NULL DEFAULT 1,
            obligatorio TINYINT(1) NOT NULL DEFAULT 1,
            creado_en   DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_epp_matriz (cargo, tipo_epp_id),
            KEY idx_epp_matriz_cargo (cargo)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);

        // ── Catálogo de tallas reutilizable ──
        db()->query("CREATE TABLE IF NOT EXISTS epp_tallas (
            id        INT AUTO_INCREMENT PRIMARY KEY,
            nombre    VARCHAR(30) NOT NULL,
            orden     INT NOT NULL DEFAULT 0,
            activo    TINYINT(1) NOT NULL DEFAULT 1,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_epp_talla (nombre)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);
        if ((int)(db()->fetchOne("SELECT COUNT(*) c FROM epp_tallas")['c'] ?? 0) === 0) {
            db()->query("INSERT INTO epp_tallas (nombre, orden) VALUES
                ('Única',1),('XS',2),('S',3),('M',4),('L',5),('XL',6),('XXL',7)", []);
        }

        // ── Ingresos (recepción/compra de EPP): cabecera del documento. ──
        // Cada línea del ingreso genera un movimiento 'entrada' con ingreso_id.
        db()->query("CREATE TABLE IF NOT EXISTS epp_ingresos (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            proveedor_id  INT NULL,
            documento_ref VARCHAR(100) NULL,
            fecha         DATE NOT NULL,
            observacion   VARCHAR(255) NULL,
            usuario_id    INT NULL,
            usuario_nombre VARCHAR(120) NULL,
            estado        ENUM('vigente','anulado') NOT NULL DEFAULT 'vigente',
            creado_en     DATETIME DEFAULT CURRENT_TIMESTAMP,
            KEY idx_epp_ing_fecha (fecha)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);

        // Enlace de los movimientos a su ingreso (simétrico a entrega_id).
        $exists = db()->fetchOne(
            "SELECT 1 FROM information_schema.columns
              WHERE table_schema = DATABASE() AND table_name = 'epp_movimientos' AND column_name = 'ingreso_id'"
        );
        if (!$exists) db()->query("ALTER TABLE epp_movimientos ADD COLUMN ingreso_id INT NULL AFTER entrega_id", []);

        // Firma de quien entrega el EPP (además de la del trabajador que recibe).
        $exists = db()->fetchOne(
            "SELECT 1 FROM information_schema.columns
              WHERE table_schema = DATABASE() AND table_name = 'epp_entregas' AND column_name = 'firma_entrega'"
        );
        if (!$exists) db()->query("ALTER TABLE epp_entregas ADD COLUMN firma_entrega MEDIUMTEXT NULL AFTER firma_trabajador", []);

        // Snapshot de la empresa del trabajador al momento de la entrega, para que
        // el registro oficial (R.M. 050-2013-TR) salga con el empleador correcto
        // aunque luego cambie la asignación del trabajador (multi-empresa Fase 2).
        $exists = db()->fetchOne(
            "SELECT 1 FROM information_schema.columns
              WHERE table_schema = DATABASE() AND table_name = 'epp_entregas' AND column_name = 'empresa_id'"
        );
        if (!$exists) db()->query("ALTER TABLE epp_entregas ADD COLUMN empresa_id INT NULL AFTER personal_id", []);

        // Backfill: entregas registradas antes de la Fase 2 quedaron con empresa_id
        // NULL. Se rellena con la empresa actual del trabajador (personal.empresa_id)
        // para que aparezcan al filtrar por empresa. Solo toca filas NULL → idempotente.
        db()->query(
            "UPDATE epp_entregas e
                JOIN personal p ON p.id = e.personal_id
                SET e.empresa_id = p.empresa_id
              WHERE e.empresa_id IS NULL AND p.empresa_id IS NOT NULL", []
        );

        // ── SILOS POR EMPRESA (multi-empresa): cada empresa tiene su propio
        // catálogo de tipos, tallas, proveedores, ingresos y matriz de puesto.
        // El stock/kardex se derivan del tipo (que ya pertenece a una empresa),
        // así que epp_movimientos NO necesita empresa_id. ALTER idempotente. ──
        $eppAddEmp = function (string $tabla) {
            $ex = db()->fetchOne(
                "SELECT 1 FROM information_schema.columns
                  WHERE table_schema = DATABASE() AND table_name = ? AND column_name = 'empresa_id'",
                [$tabla]
            );
            if (!$ex) db()->query("ALTER TABLE `$tabla` ADD COLUMN empresa_id INT NULL AFTER id", []);
        };
        foreach (['epp_tipos', 'epp_tallas', 'epp_proveedores', 'epp_ingresos', 'epp_puesto_matriz'] as $t) {
            $eppAddEmp($t);
        }
        // La talla ya no es única global (se repite por empresa): se quita el UNIQUE.
        $hasUkTalla = db()->fetchOne(
            "SELECT 1 FROM information_schema.statistics
              WHERE table_schema = DATABASE() AND table_name = 'epp_tallas' AND index_name = 'uk_epp_talla'"
        );
        if ($hasUkTalla) db()->query("ALTER TABLE epp_tallas DROP INDEX uk_epp_talla", []);
        // Igual con el UNIQUE (cargo, tipo_epp) de la matriz: ahora es por empresa.
        $hasUkMatriz = db()->fetchOne(
            "SELECT 1 FROM information_schema.statistics
              WHERE table_schema = DATABASE() AND table_name = 'epp_puesto_matriz' AND index_name = 'uk_epp_matriz'"
        );
        if ($hasUkMatriz) db()->query("ALTER TABLE epp_puesto_matriz DROP INDEX uk_epp_matriz", []);
    } catch (Exception $e) {
        error_log('[setupEpp] ' . $e->getMessage());
    }
}

// ============================================================
// MODO EMPRESA ÚNICA
// El sistema opera con una sola empresa (DICORJES). El multi-empresa queda
// desactivado (selector, módulo Empresas y silos EPP): todo se resuelve sobre
// la empresa principal. Para reactivar multi-empresa, poner esto en true.
// ============================================================
function esMultiempresa(): bool {
    return false;
}

// Empresa principal (única). DICORJES por nombre; si no, la primera activa.
function empresaUnica(): int {
    static $cache = null;
    if ($cache !== null) return $cache;
    try {
        $r = db()->fetchOne("SELECT id FROM empresas WHERE razon_social LIKE '%DICORJES%' AND activo = 1 ORDER BY id LIMIT 1");
        if (!$r) $r = db()->fetchOne("SELECT id FROM empresas WHERE activo = 1 ORDER BY id LIMIT 1");
        $cache = $r ? (int)$r['id'] : 0;
    } catch (Exception $e) { $cache = 0; }
    return $cache;
}

// Empresa activa para operaciones EPP. En modo empresa única siempre es la
// principal; en multi-empresa viene del selector global (empresa_id).
function eppEmpresaSel(): int {
    $e = (int)($_GET['empresa_id'] ?? $_POST['empresa_id'] ?? 0);
    if ($e > 0) return $e;
    if (!esMultiempresa()) return empresaUnica();
    return 0;
}

// Escrituras EPP: exige una empresa seleccionada y permitida. Devuelve su id
// o corta con jsonResponse. (Cada empresa es un silo independiente.)
function eppRequireEmpresa(): int {
    $e = eppEmpresaSel();
    if ($e <= 0) jsonResponse(false, 'Selecciona una empresa en la barra superior para gestionar su EPP.', null, 422);
    if (!empresaEsPermitida($e)) jsonResponse(false, 'Sin acceso a esa empresa.', null, 403);
    return $e;
}

// Lecturas EPP: fragmento WHERE según la empresa seleccionada + restricción del
// usuario (Fase 3). $col = columna de empresa (ej. 't.empresa_id'). Si no hay
// empresa seleccionada ("Todas"), solo aplica la restricción del usuario.
function eppEmpresaFiltro(string $col): array {
    $e = eppEmpresaSel();
    if ($e > 0) {
        if (!empresaEsPermitida($e)) return [' AND 1=0', []];
        return [" AND $col = ?", [$e]];
    }
    return empresaWhere($col);
}

// Agrega el catálogo estándar (5 EPP + tallas) a una empresa, solo los que aún
// no existan (por nombre). Aditivo e idempotente: lo dispara el botón "Sembrar
// catálogo estándar". Devuelve cuántos EPP y tallas se agregaron.
function eppSeedEmpresa(int $empresaId): array {
    if ($empresaId <= 0) return ['tipos' => 0, 'tallas' => 0];
    $addT = 0; $addS = 0;
    try {
        $tiposStd = [
            ['Casco', 'Cabeza', 'ANSI Z89.1', 365, 5, 'unidad'],
            ['Chaleco reflectivo', 'Alta visibilidad', 'EN ISO 20471', 180, 5, 'unidad'],
            ['Zapatos de seguridad', 'Pies', 'ISO 20345', 365, 5, 'par'],
            ['Lentes', 'Ojos', 'ANSI Z87.1', 90, 10, 'unidad'],
            ['Guantes', 'Manos', 'EN 388', 60, 10, 'par'],
        ];
        $exT = array_map(fn($n) => mb_strtolower($n, 'UTF-8'),
            array_column(db()->fetchAll("SELECT nombre FROM epp_tipos WHERE empresa_id = ?", [$empresaId]), 'nombre'));
        foreach ($tiposStd as $t) {
            if (in_array(mb_strtolower($t[0], 'UTF-8'), $exT, true)) continue;
            db()->query(
                "INSERT INTO epp_tipos (empresa_id, nombre, categoria, norma_tecnica, vida_util_dias, stock_minimo, unidad)
                 VALUES (?, ?, ?, ?, ?, ?, ?)",
                [$empresaId, $t[0], $t[1], $t[2], $t[3], $t[4], $t[5]]
            );
            $addT++;
        }
        $tallasStd = [['Única', 1], ['XS', 2], ['S', 3], ['M', 4], ['L', 5], ['XL', 6], ['XXL', 7]];
        $exS = array_map(fn($n) => mb_strtolower($n, 'UTF-8'),
            array_column(db()->fetchAll("SELECT nombre FROM epp_tallas WHERE empresa_id = ?", [$empresaId]), 'nombre'));
        foreach ($tallasStd as $s) {
            if (in_array(mb_strtolower($s[0], 'UTF-8'), $exS, true)) continue;
            db()->query("INSERT INTO epp_tallas (empresa_id, nombre, orden) VALUES (?, ?, ?)", [$empresaId, $s[0], $s[1]]);
            $addS++;
        }
    } catch (Exception $e) {
        error_log('[eppSeedEmpresa] ' . $e->getMessage());
    }
    return ['tipos' => $addT, 'tallas' => $addS];
}

// ============================================================
// AUTO-PROVISIÓN: MÓDULO EMPRESAS (multi-empresa, Fase 1)
// Se administran varias empresas tercerizadoras (Ley 29245), cada una con su
// propia identidad legal (RUC, logo, cabecera). Cada trabajador pertenece a una
// empresa (personal.empresa_id). Idempotente, sin SQL manual en el deploy.
// ============================================================
function setupEmpresas(): void {
    try {
        db()->query("CREATE TABLE IF NOT EXISTS empresas (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            razon_social  VARCHAR(200) NOT NULL,
            ruc           VARCHAR(20)  NULL,
            tipo          VARCHAR(40)  NOT NULL DEFAULT 'tercerizacion',
            domicilio     VARCHAR(255) NULL,
            actividad     VARCHAR(200) NULL,
            responsable   VARCHAR(150) NULL,
            telefono      VARCHAR(30)  NULL,
            email         VARCHAR(150) NULL,
            logo          VARCHAR(255) NULL,
            color         VARCHAR(20)  NULL,
            activo        TINYINT(1)   NOT NULL DEFAULT 1,
            creado_en     DATETIME     DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_empresa_ruc (ruc)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);

        // Enlace del trabajador a su empresa (idempotente).
        $existe = db()->fetchOne(
            "SELECT 1 FROM information_schema.columns
              WHERE table_schema = DATABASE() AND table_name = 'personal' AND column_name = 'empresa_id'"
        );
        if (!$existe) db()->query("ALTER TABLE personal ADD COLUMN empresa_id INT NULL AFTER empresa", []);

        // Reverso de DNI y licencia (anverso = doc_dni / doc_licencia existentes).
        foreach (['doc_dni_reverso', 'doc_licencia_reverso'] as $col) {
            $exR = db()->fetchOne("SELECT 1 FROM information_schema.columns
                  WHERE table_schema = DATABASE() AND table_name = 'personal' AND column_name = ?", [$col]);
            if (!$exR) db()->query("ALTER TABLE personal ADD COLUMN `$col` VARCHAR(255) NULL", []);
        }

        // Migración: convierte los textos distintos de personal.empresa en filas de
        // empresas y enlaza empresa_id. Solo corre si aún hay trabajadores con
        // empresa (texto) pero sin empresa_id — así es segura de repetir.
        $pendientes = (int)(db()->fetchOne(
            "SELECT COUNT(*) c FROM personal
              WHERE empresa IS NOT NULL AND TRIM(empresa) <> '' AND empresa_id IS NULL"
        )['c'] ?? 0);
        if ($pendientes > 0) {
            $nombres = db()->fetchAll(
                "SELECT DISTINCT TRIM(empresa) AS nom FROM personal
                  WHERE empresa IS NOT NULL AND TRIM(empresa) <> '' AND empresa_id IS NULL"
            );
            foreach ($nombres as $n) {
                $nom = $n['nom'];
                if ($nom === '') continue;
                $emp = db()->fetchOne("SELECT id FROM empresas WHERE razon_social = ?", [$nom]);
                if ($emp) {
                    $empId = (int)$emp['id'];
                } else {
                    db()->query("INSERT INTO empresas (razon_social, tipo) VALUES (?, 'tercerizacion')", [$nom]);
                    $empId = (int)db()->lastInsertId();
                }
                db()->query(
                    "UPDATE personal SET empresa_id = ?
                      WHERE empresa_id IS NULL AND TRIM(empresa) = ?",
                    [$empId, $nom]
                );
            }
        }
    } catch (Exception $e) {
        error_log('[setupEmpresas] ' . $e->getMessage());
    }
}

// ============================================================
// AUTO-PROVISIÓN: MÓDULO CAPACITACIONES
// Programa anual de capacitación (Ley 29783 Art. 35). Tabla unificada con un
// discriminador `tipo` para los 4 sub-módulos: cronograma anual, semana de
// seguridad, safety alert (alerta de seguridad) y campañas. Idempotente.
// ============================================================
function setupCapacitaciones(): void {
    try {
        db()->query("CREATE TABLE IF NOT EXISTS capacitaciones (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            tipo          ENUM('cronograma','semana','alerta','campana') NOT NULL DEFAULT 'cronograma',
            anio          INT NOT NULL,
            titulo        VARCHAR(200) NOT NULL,
            subtipo       VARCHAR(60)  NULL,
            descripcion   TEXT         NULL,
            dirigido_a    VARCHAR(60)  NULL,
            responsable   VARCHAR(150) NULL,
            lugar         VARCHAR(150) NULL,
            fecha         DATE         NULL,
            fecha_fin     DATE         NULL,
            hora          VARCHAR(20)  NULL,
            horas         DECIMAL(5,1) NULL,
            participantes INT          NULL,
            estado        ENUM('programado','en_curso','ejecutado','reprogramado','cancelado') NOT NULL DEFAULT 'programado',
            imagen        VARCHAR(255) NULL,
            creado_en     DATETIME     DEFAULT CURRENT_TIMESTAMP,
            KEY idx_cap_tipo (tipo),
            KEY idx_cap_anio (anio)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);

        // Adjuntos de evidencia/despliegue: material difundido, fotos de la
        // actividad y hoja de asistencia escaneada. Varios por capacitación.
        db()->query("CREATE TABLE IF NOT EXISTS cap_adjuntos (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            capacitacion_id INT NOT NULL,
            tipo            ENUM('material','foto','asistencia') NOT NULL DEFAULT 'material',
            archivo         VARCHAR(255) NOT NULL,
            nombre_original VARCHAR(200) NULL,
            creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP,
            KEY idx_capadj (capacitacion_id, tipo)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);

        // Lista de asistencia digital (R.M. 050-2013-TR): asistentes con firma.
        // personal_id enlaza al trabajador; se guarda snapshot de nombre/dni/cargo.
        db()->query("CREATE TABLE IF NOT EXISTS cap_asistentes (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            capacitacion_id INT NOT NULL,
            personal_id     INT NULL,
            nombre          VARCHAR(160) NOT NULL,
            dni             VARCHAR(20)  NULL,
            cargo           VARCHAR(60)  NULL,
            firma           MEDIUMTEXT   NULL,
            presente        TINYINT(1)   NOT NULL DEFAULT 1,
            creado_en       DATETIME DEFAULT CURRENT_TIMESTAMP,
            KEY idx_capasis (capacitacion_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);
    } catch (Exception $e) {
        error_log('[setupCapacitaciones] ' . $e->getMessage());
    }
}

// ============================================================
// AUTO-PROVISIÓN: MÓDULO CHECKLIST (inspección mensual de componentes de unidad)
// Componentes del camión (extintores, botiquín, EPP, etc.) inspeccionados por
// unidad (placa) cada mes. Normas SST: Ley 29783, NTP 350.043 (extintores),
// R.M. 050-2013-TR (EPP), R.M. 1275-2021-SA (botiquín). Idempotente.
// ============================================================
function setupChecklist(): void {
    try {
        db()->query("CREATE TABLE IF NOT EXISTS chk_componentes (
            id INT AUTO_INCREMENT PRIMARY KEY, nombre VARCHAR(120) NOT NULL, orden INT NOT NULL DEFAULT 0,
            activo TINYINT(1) NOT NULL DEFAULT 1, creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);
        db()->query("CREATE TABLE IF NOT EXISTS chk_items (
            id INT AUTO_INCREMENT PRIMARY KEY, componente_id INT NOT NULL, texto VARCHAR(255) NOT NULL,
            orden INT NOT NULL DEFAULT 0, activo TINYINT(1) NOT NULL DEFAULT 1, creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            KEY idx_chkitem_comp (componente_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);
        db()->query("CREATE TABLE IF NOT EXISTS chk_inspecciones (
            id INT AUTO_INCREMENT PRIMARY KEY, placa VARCHAR(20) NOT NULL, periodo CHAR(7) NOT NULL,
            fecha DATE NOT NULL, inspector_id INT NULL, inspector_nombre VARCHAR(120) NULL,
            estado ENUM('apto','observado','no_apto') NOT NULL DEFAULT 'apto',
            observacion VARCHAR(500) NULL, firma MEDIUMTEXT NULL, creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            KEY idx_chkinsp (periodo, placa)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);
        db()->query("CREATE TABLE IF NOT EXISTS chk_resultados (
            id INT AUTO_INCREMENT PRIMARY KEY, inspeccion_id INT NOT NULL, item_id INT NOT NULL, componente_id INT NOT NULL,
            resultado ENUM('conforme','no_conforme','na') NOT NULL DEFAULT 'conforme', observacion VARCHAR(300) NULL,
            KEY idx_chkres (inspeccion_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);

        // Cada inspección es de UN equipo (su formulario/banco de preguntas).
        $ex = db()->fetchOne("SELECT 1 FROM information_schema.columns
              WHERE table_schema = DATABASE() AND table_name = 'chk_inspecciones' AND column_name = 'componente_id'");
        if (!$ex) db()->query("ALTER TABLE chk_inspecciones ADD COLUMN componente_id INT NULL AFTER placa", []);

        // Evidencia fotográfica de la inspección.
        db()->query("CREATE TABLE IF NOT EXISTS chk_fotos (
            id INT AUTO_INCREMENT PRIMARY KEY, inspeccion_id INT NOT NULL, archivo VARCHAR(255) NOT NULL,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP, KEY idx_chkfoto (inspeccion_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);

        // Inventario de equipos físicos (unidades individuales por tipo de equipo).
        db()->query("CREATE TABLE IF NOT EXISTS chk_unidades (
            id INT AUTO_INCREMENT PRIMARY KEY, componente_id INT NOT NULL,
            codigo VARCHAR(40) NOT NULL, nombre VARCHAR(160) NOT NULL,
            ubicacion VARCHAR(120) NULL, area VARCHAR(80) NULL, vencimiento DATE NULL,
            activo TINYINT(1) NOT NULL DEFAULT 1, creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_chkuni_codigo (codigo), KEY idx_chkuni_comp (componente_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);

        // Vincula la inspección a una unidad de inventario (equipos físicos).
        $exU = db()->fetchOne("SELECT 1 FROM information_schema.columns
              WHERE table_schema = DATABASE() AND table_name = 'chk_inspecciones' AND column_name = 'unidad_id'");
        if (!$exU) db()->query("ALTER TABLE chk_inspecciones ADD COLUMN unidad_id INT NULL AFTER componente_id", []);

        // Área de la inspección (para el cumplimiento por área en el dashboard).
        $exA = db()->fetchOne("SELECT 1 FROM information_schema.columns
              WHERE table_schema = DATABASE() AND table_name = 'chk_inspecciones' AND column_name = 'area'");
        if (!$exA) db()->query("ALTER TABLE chk_inspecciones ADD COLUMN area VARCHAR(80) NULL AFTER placa", []);

        // Vencimiento de cada insumo POR UNIDAD (botiquín: cada botiquín guarda la
        // caducidad de sus productos, editable desde el modal de la unidad).
        db()->query("CREATE TABLE IF NOT EXISTS chk_unidad_items (
            id INT AUTO_INCREMENT PRIMARY KEY, unidad_id INT NOT NULL, item_id INT NOT NULL,
            vencimiento DATE NULL, creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uq_uniitem (unidad_id, item_id), KEY idx_cui_uni (unidad_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);

        // Fecha de vencimiento a nivel de inspección (extintor: recarga/prueba
        // hidrostática — una sola fecha para todo el equipo).
        $exV = db()->fetchOne("SELECT 1 FROM information_schema.columns
              WHERE table_schema = DATABASE() AND table_name = 'chk_inspecciones' AND column_name = 'vencimiento'");
        if (!$exV) db()->query("ALTER TABLE chk_inspecciones ADD COLUMN vencimiento DATE NULL AFTER fecha", []);

        // Vencimiento POR ÍTEM (botiquín: cada producto/insumo tiene su caducidad).
        $exRV = db()->fetchOne("SELECT 1 FROM information_schema.columns
              WHERE table_schema = DATABASE() AND table_name = 'chk_resultados' AND column_name = 'vencimiento'");
        if (!$exRV) db()->query("ALTER TABLE chk_resultados ADD COLUMN vencimiento DATE NULL AFTER observacion", []);

        // Campos de gestión por unidad (extintores: camión asignado, ruta, agente,
        // capacidad, mantenimiento y estado operativo). Se autoprovisionan una vez.
        $uniCols = [
            'placa'                => "VARCHAR(20) NULL AFTER nombre",
            'ruta'                 => "VARCHAR(40) NULL AFTER placa",
            'tipo_agente'          => "VARCHAR(40) NULL AFTER area",
            'capacidad'            => "VARCHAR(30) NULL AFTER tipo_agente",
            'ultimo_mantenimiento' => "DATE NULL AFTER vencimiento",
            'estado_operativo'     => "VARCHAR(20) NOT NULL DEFAULT 'operativo' AFTER activo",
        ];
        foreach ($uniCols as $col => $ddl) {
            $exC = db()->fetchOne("SELECT 1 FROM information_schema.columns
                  WHERE table_schema = DATABASE() AND table_name = 'chk_unidades' AND column_name = ?", [$col]);
            if (!$exC) db()->query("ALTER TABLE chk_unidades ADD COLUMN $col $ddl", []);
        }

        // Siembra componentes + ítems estándar (solo si está vacío).
        if ((int)(db()->fetchOne("SELECT COUNT(*) c FROM chk_componentes")['c'] ?? 0) === 0) {
            $data = [
                'Extintores' => ['Manómetro/presión en rango (aguja en verde)', 'Precinto y seguro intactos', 'Fecha de vencimiento/recarga vigente', 'Manguera y boquilla en buen estado', 'Cilindro sin corrosión ni daños', 'Señalización visible y acceso libre', 'Soporte/fijación firme', 'Tarjeta de control al día'],
                'Botiquín' => ['Contenido completo según norma', 'Insumos vigentes (no vencidos)', 'Limpio, sellado y en buen estado', 'Ubicación accesible y señalizada', 'Inventario de contenido presente'],
                'EPP' => ['Casco en buen estado y vigente', 'Chaleco reflectivo visible', 'Zapatos de seguridad en buen estado', 'Lentes de seguridad', 'Guantes', 'EPP completo para la tripulación'],
                'Botón de pánico' => ['Funciona (prueba de activación)', 'Visible y accesible para el conductor', 'Cableado/conexión en buen estado', 'Enlazado al sistema de monitoreo'],
                'Tanque de combustible' => ['Sin fugas ni goteos', 'Tapa segura y con precinto', 'Fijación firme al chasis', 'Sin corrosión ni abolladuras', 'Sin olor a combustible'],
                'Gata hidráulica' => ['Levanta y baja correctamente', 'Sin fugas de aceite hidráulico', 'Base y brazo firmes, sin daños', 'Capacidad acorde a la carga'],
                'Carretillas' => ['Ruedas en buen estado', 'Estructura sin fisuras ni deformaciones', 'Manijas/agarraderas firmes', 'Limpieza general'],
                'Caja fuerte' => ['Cierre/cerradura funciona', 'Fijación segura (anclada)', 'Sin daños ni forzaduras', 'Llave/clave operativa y controlada'],
            ];
            $orden = 0;
            foreach ($data as $comp => $items) {
                $orden++;
                db()->query("INSERT INTO chk_componentes (nombre, orden) VALUES (?, ?)", [$comp, $orden]);
                $cid = (int)db()->lastInsertId();
                $io = 0;
                foreach ($items as $it) { $io++; db()->query("INSERT INTO chk_items (componente_id, texto, orden) VALUES (?, ?, ?)", [$cid, $it, $io]); }
            }
        }

        // Banco de preguntas oficial de extintores + inventario de 28 unidades.
        seedExtintoresT2();
        // Banco de contenido de botiquín + inventario de 28 unidades (1 por camión).
        seedBotiquinT2();
    } catch (Exception $e) {
        error_log('[setupChecklist] ' . $e->getMessage());
    }
}

// Placas/rutas de los 28 camiones (compartidas por extintores y botiquines: un
// equipo de cada tipo por camión). [codigo_sufijo, placa, ruta].
function _chkFlotaT2(): array {
    return [
        ['01', 'D8W-880', 'BK77-01'], ['02', 'BNN-921', 'BK77-02'], ['03', 'BTT-893', 'BK77-03'],
        ['04', 'CAE-720', 'BK77-05'], ['05', 'CAD-777', 'BK77-06'], ['06', 'C9G-909', 'BK77-07'],
        ['07', 'D8Y-857', 'BK77-08'], ['08', 'BMD-795', 'BK77-09'], ['09', 'CAD-782', 'BK77-10'],
        ['10', 'D8Y-729', 'BK77-13'], ['11', 'C9H-906', 'BK77-14'], ['12', 'CHD-926', 'BK77-16'],
        ['13', 'D6M-720', 'BK77-17'], ['14', 'C9I-941', 'BK77-18'], ['15', 'CAD-788', 'BK77-21'],
        ['16', 'F6F-862', 'BK77-22'], ['17', 'D0L-840', 'BK77-24'], ['18', 'C9J-885', 'BK77-25'],
        ['19', 'CAE-717', 'BK77-26'], ['20', 'CAD-854', 'BK77-29'], ['21', 'BTT-892', 'BK77-32'],
        ['22', 'BMT-924', 'BK77-33'], ['23', 'C2C-806', 'CREE'],    ['24', 'BMB-922', 'PORTER'],
        ['25', 'BXG-750', ''],        ['26', 'BMC-750', ''],        ['27', 'D0M-840', ''],
        ['28', 'D8X-891', ''],
    ];
}

// ============================================================
// Siembra específica de BOTIQUINES (proyecto T2): reemplaza el banco genérico
// del componente Botiquín por su contenido normado (9 ítems, R.M. 1275-2021-SA)
// y crea 28 unidades (una por camión). Idempotente (guardas por existencia).
// ============================================================
function seedBotiquinT2(): void {
    try {
        $comp = db()->fetchOne("SELECT id FROM chk_componentes WHERE nombre LIKE '%otiqu%' ORDER BY id ASC LIMIT 1");
        if (!$comp) return;
        $compId = (int)$comp['id'];

        // ── 9 ítems de contenido (cada uno lleva su vencimiento por fila) ──
        $items = [
            'Alcohol de 70° de 500 ml — Cantidad: 1',
            'Gasa esterilizada fraccionada 10 cm x 10 cm — Cantidad: 10',
            'Esparadrapo 2.5 cm x 5 m — Cantidad: 1',
            'Vendas elásticas 4" x 5 yardas — Cantidad: 1',
            'Jabón antiséptico — Cantidad: 1',
            'Bandas adhesivas (curitas) — Cantidad: 5',
            'Tijera punta roma de 3 pulgadas — Cantidad: 1',
            'Guantes quirúrgicos esterilizados (7 ½) — Cantidad: 2',
            'Algodón por 50 gramos — Cantidad: 1',
        ];
        $yaItem = db()->fetchOne("SELECT id FROM chk_items WHERE componente_id = ? AND texto = ? LIMIT 1", [$compId, $items[0]]);
        if (!$yaItem) {
            db()->query("UPDATE chk_items SET activo = 0 WHERE componente_id = ?", [$compId]);
            $o = 0;
            foreach ($items as $t) { $o++; db()->query("INSERT INTO chk_items (componente_id, texto, orden, activo) VALUES (?, ?, ?, 1)", [$compId, $t, $o]); }
        }

        // ── 28 unidades BOT-01…BOT-28 (una por camión) ──
        $yaUni = db()->fetchOne("SELECT id FROM chk_unidades WHERE codigo = 'BOT-01' LIMIT 1");
        if (!$yaUni) {
            foreach (_chkFlotaT2() as $f) {
                db()->query(
                    "INSERT INTO chk_unidades (componente_id, codigo, nombre, placa, ruta, estado_operativo, activo)
                     VALUES (?, ?, ?, ?, ?, 'operativo', 1)",
                    [$compId, 'BOT-' . $f[0], 'Botiquín ' . $f[0], $f[1] ?: null, $f[2] ?: null]);
            }
        }
    } catch (Throwable $e) {
        error_log('[seedBotiquinT2] ' . $e->getMessage());
    }
}

// ============================================================
// Siembra específica de EXTINTORES (proyecto T2): reemplaza el banco de
// preguntas genérico del componente por el checklist NTP 350.021/043 (17 ítems)
// y crea las 28 unidades con su camión, ruta, capacidad y vencimiento.
// Idempotente: cada bloque se ejecuta una sola vez (guardas por existencia).
// ============================================================
function seedExtintoresT2(): void {
    try {
        $comp = db()->fetchOne("SELECT id FROM chk_componentes WHERE nombre LIKE '%xtintor%' ORDER BY id ASC LIMIT 1");
        if (!$comp) return;
        $compId = (int)$comp['id'];

        // ── 17 preguntas oficiales ──
        $preguntas = [
            'El extintor está correctamente ubicado (visible, señalizado, altura 0.90–1.50 m)',
            'El acceso al extintor está libre de obstáculos (radio mínimo 1 metro)',
            'La zona y el extintor están correctamente numerados',
            'Pictograma de clase de fuego (NTP 350.021) presente y legible',
            'Pictograma de forma de uso presente y legible',
            'Etiqueta de carga presente y legible (agente, capacidad, fecha, proveedor)',
            'Tipo de recarga, N° de parte y concentración del agente ignífugo indicados',
            'Colgador o soporte presente y en buen estado',
            'Pasador y precinto de seguridad intactos (no manipulados)',
            'Manómetro indica presión adecuada (aguja en zona verde)',
            'Manija, palanca de activación y cabezal en buen estado y completos',
            'Manguera presente y en buen estado (sin grietas, torceduras ni cortes)',
            'Tobera, pitón o pistola presente y sin obstrucciones',
            'Abrazadera sujetadora de manguera en buen estado',
            'Cilindro en buen estado (sin golpes, corrosión ni deformaciones)',
            'Pintura del cilindro en buen estado (sin deterioro ni oxidación visible)',
            'Otras anomalías o condiciones inseguras observadas',
        ];
        // Guarda: si la primera pregunta ya existe, no re-sembramos.
        $yaPreg = db()->fetchOne("SELECT id FROM chk_items WHERE componente_id = ? AND texto = ? LIMIT 1", [$compId, $preguntas[0]]);
        if (!$yaPreg) {
            // Retira las preguntas genéricas del componente (conserva historial: solo desactiva).
            db()->query("UPDATE chk_items SET activo = 0 WHERE componente_id = ?", [$compId]);
            $o = 0;
            foreach ($preguntas as $t) { $o++; db()->query("INSERT INTO chk_items (componente_id, texto, orden, activo) VALUES (?, ?, ?, 1)", [$compId, $t, $o]); }
        }

        // ── 28 unidades (código, capacidad, camión/placa, ruta, vencimiento) ──
        $yaUni = db()->fetchOne("SELECT id FROM chk_unidades WHERE codigo = 'EXT-01' LIMIT 1");
        if (!$yaUni) {
            // [codigo, capacidad, placa (camión), ruta, vencimiento Y-m-d]
            $rows = [
                ['EXT-01', '06 Klg', 'D8W-880', 'BK77-01', '2027-01-31'],
                ['EXT-02', '12 Klg', 'BNN-921', 'BK77-02', '2027-03-31'],
                ['EXT-03', '09 Klg', 'BTT-893', 'BK77-03', '2027-04-30'],
                ['EXT-04', '06 Klg', 'CAE-720', 'BK77-05', '2026-12-31'],
                ['EXT-05', '06 Klg', 'CAD-777', 'BK77-06', '2026-12-31'],
                ['EXT-06', '12 Klg', 'C9G-909', 'BK77-07', '2026-12-31'],
                ['EXT-07', '09 Klg', 'D8Y-857', 'BK77-08', '2027-03-31'],
                ['EXT-08', '06 Klg', 'BMD-795', 'BK77-09', '2027-01-30'],
                ['EXT-09', '09 Klg', 'CAD-782', 'BK77-10', '2027-01-31'],
                ['EXT-10', '10 Klg', 'D8Y-729', 'BK77-13', '2027-05-31'],
                ['EXT-11', '11 Klg', 'C9H-906', 'BK77-14', '2027-04-30'],
                ['EXT-12', '12 Klg', 'CHD-926', 'BK77-16', '2026-10-30'],
                ['EXT-13', '13 Klg', 'D6M-720', 'BK77-17', '2027-02-28'],
                ['EXT-14', '14 Klg', 'C9I-941', 'BK77-18', '2027-03-30'],
                ['EXT-15', '15 Klg', 'CAD-788', 'BK77-21', '2027-01-31'],
                ['EXT-16', '16 Klg', 'F6F-862', 'BK77-22', '2026-09-30'],
                ['EXT-17', '17 Klg', 'D0L-840', 'BK77-24', '2026-12-30'],
                ['EXT-18', '18 Klg', 'C9J-885', 'BK77-25', '2027-07-30'],
                ['EXT-19', '19 Klg', 'CAE-717', 'BK77-26', '2026-12-31'],
                ['EXT-20', '20 Klg', 'CAD-854', 'BK77-29', '2027-03-31'],
                ['EXT-21', '21 Klg', 'BTT-892', 'BK77-32', '2027-07-30'],
                ['EXT-22', '22 Klg', 'BMT-924', 'BK77-33', '2027-01-31'],
                ['EXT-23', '23 Klg', 'C2C-806', 'CREE',    '2027-01-31'],
                ['EXT-24', '24 Klg', 'BMB-922', 'PORTER',  '2027-04-30'],
                ['EXT-25', '25 Klg', 'BXG-750', '',        '2027-05-30'],
                ['EXT-26', '26 Klg', 'BMC-750', '',        '2027-05-30'],
                ['EXT-27', '27 Klg', 'D0M-840', '',        '2026-12-31'],
                ['EXT-28', '28 Klg', 'D8X-891', '',        '2027-03-31'],
            ];
            foreach ($rows as $r) {
                db()->query(
                    "INSERT INTO chk_unidades (componente_id, codigo, nombre, placa, ruta, tipo_agente, capacidad, vencimiento, estado_operativo, activo)
                     VALUES (?, ?, ?, ?, ?, 'PQS/NITR - ABC', ?, ?, 'operativo', 1)",
                    [$compId, $r[0], 'Extintor ' . substr($r[0], 4), $r[2] ?: null, $r[3] ?: null, $r[1], $r[4]]);
            }
        }
    } catch (Throwable $e) {
        error_log('[seedExtintoresT2] ' . $e->getMessage());
    }
}

// ============================================================
// RESTRICCIÓN DE EMPRESAS POR USUARIO (multi-empresa, Fase 3)
// Un usuario puede quedar limitado a ver solo ciertas empresas. Sin filas =
// sin restricción (ve todas). El administrador siempre ve todas.
// ============================================================
function setupUsuarioEmpresas(): void {
    try {
        db()->query("CREATE TABLE IF NOT EXISTS usuario_empresas (
            usuario_id INT NOT NULL,
            empresa_id INT NOT NULL,
            creado_en  DATETIME DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (usuario_id, empresa_id),
            KEY idx_ue_usuario (usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci", []);
    } catch (Exception $e) {
        error_log('[setupUsuarioEmpresas] ' . $e->getMessage());
    }
}

// Empresas que el usuario puede ver. null = SIN restricción (todas).
// Array de ids = restringido a esas. [] = restringido a nada.
function empresasPermitidas(?int $userId = null): ?array {
    if (!esMultiempresa()) return null;   // modo empresa única: sin restricción
    $user = $userId ? db()->fetchOne("SELECT id, rol FROM usuarios WHERE id = ?", [$userId]) : getCurrentUser();
    if (!$user) return [];
    if (($user['rol'] ?? '') === 'administrador') return null;
    try {
        $rows = db()->fetchAll("SELECT empresa_id FROM usuario_empresas WHERE usuario_id = ?", [(int)$user['id']]);
    } catch (Exception $e) { return null; }
    if (!$rows) return null;
    return array_map('intval', array_column($rows, 'empresa_id'));
}

// Fragmento WHERE para restringir por la empresa del usuario actual.
// $col = columna de empresa (ej. 'p.empresa_id', 'e.empresa_id', 'empresa_id').
// Devuelve [sqlFragment, params]; '' si el usuario no tiene restricción.
function empresaWhere(string $col): array {
    $ids = empresasPermitidas();
    if ($ids === null) return ['', []];
    if (!$ids) return [' AND 1=0', []];
    $ph = implode(',', array_fill(0, count($ids), '?'));
    return [" AND $col IN ($ph)", array_values($ids)];
}

// Valida que la empresa esté dentro de lo permitido para el usuario actual.
function empresaEsPermitida($empresaId): bool {
    $ids = empresasPermitidas();
    if ($ids === null) return true;
    return in_array((int)$empresaId, $ids, true);
}

// Valida que un formulario_id exista en eval_formularios.
// Fallback a los 3 base si la tabla aún no fue migrada.
function formularioEsValido(string $formulario): bool {
    if (empty($formulario) || !preg_match('/^[a-z0-9_]+$/', $formulario)) return false;
    try {
        $row = db()->fetchOne(
            "SELECT id FROM eval_formularios WHERE formulario_id = ? AND activo = 1",
            [$formulario]
        );
        return (bool)$row;
    } catch (Exception $e) {
        return in_array($formulario, ['manejo_practica', 'examen_defensiva', 'induccion_t2'], true);
    }
}

// Respuesta JSON estándar
function jsonResponse(bool $success, string $message = '', mixed $data = null, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data'    => $data,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}
