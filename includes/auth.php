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

const MODULOS_VALIDOS = ['dashboard', 'inspecciones', 'personal', 'reportes', 'matriz', 'amonestaciones', 'geocercas'];

// Defaults de acceso según rol (cuando el usuario no tiene filas en permisos)
const ROL_DEFAULTS = [
    'supervisor' => ['dashboard', 'inspecciones', 'personal', 'reportes', 'matriz', 'amonestaciones', 'geocercas'],
    'inspector'  => ['dashboard', 'inspecciones'],
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
