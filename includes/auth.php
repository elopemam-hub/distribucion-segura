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

const MODULOS_VALIDOS = ['dashboard', 'inspecciones', 'personal', 'reportes', 'matriz', 'amonestaciones', 'geocercas', 'evaluaciones', 'kpi_analytics', 'epp', 'vehiculos', 'empresas'];

// Defaults de acceso según rol (cuando el usuario no tiene filas en permisos)
const ROL_DEFAULTS = [
    'supervisor' => ['dashboard', 'inspecciones', 'personal', 'reportes', 'matriz', 'amonestaciones', 'geocercas', 'evaluaciones', 'kpi_analytics', 'epp', 'vehiculos', 'empresas'],
    'inspector'  => ['dashboard', 'inspecciones', 'evaluaciones'],
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
    } catch (Exception $e) {
        error_log('[setupEpp] ' . $e->getMessage());
    }
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
