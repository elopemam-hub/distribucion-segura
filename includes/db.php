<?php
// ============================================================
// CLASE DE CONEXIÓN A BASE DE DATOS (PDO)
// Archivo: includes/db.php
// ============================================================

// Buscar config en varias ubicaciones (de más específica a más general):
// 1. includes/config.php                        → local XAMPP
// 2. tres niveles arriba de includes/            → junto a public_html/ en Hostinger
// 3. dos niveles arriba de includes/ (public_html) → alternativa Hostinger
$_configPaths = [
    __DIR__ . '/config.php',
    dirname(dirname(dirname(__DIR__))) . '/dist-segura.config.php',
    dirname(dirname(__DIR__))          . '/dist-segura.config.php',
];
$_configLoaded = false;
foreach ($_configPaths as $_path) {
    if (file_exists($_path)) {
        require_once $_path;
        $_configLoaded = true;
        break;
    }
}
if (!$_configLoaded) {
    http_response_code(503);
    $tried = implode('<br>', array_map(function($p){ return '<code>'.htmlspecialchars($p).'</code>'; }, $_configPaths));
    die('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Configuración requerida</title>
    <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5}
    .box{background:#fff;padding:40px;border-radius:8px;max-width:620px;box-shadow:0 2px 12px rgba(0,0,0,.1)}
    h2{color:#1a1a1a;margin:0 0 16px}code{background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:12px;word-break:break-all}
    p{color:#555;line-height:1.6}</style></head><body><div class="box">
    <h2>&#9881;&#65039; Configuración requerida</h2>
    <p>No se encontró <strong>config.php</strong> ni <strong>dist-segura.config.php</strong>.<br>
    Rutas buscadas:</p><p>' . $tried . '</p>
    <p>Sube <code>dist-segura.config.php</code> (basado en <code>config.example.php</code>) a la carpeta que está al mismo nivel que <code>public_html/</code> en Hostinger.</p>
    </div></body></html>');
}
unset($_configPaths, $_configLoaded, $_path, $tried);

class Database {
    private static $instance = null;
    private $pdo;

    private function __construct() {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $this->pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
            $this->pdo->exec("SET time_zone = '-05:00'");
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode(['success' => false, 'message' => 'Error de conexión a base de datos.']));
        }
    }

    public static function getInstance(): Database {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection(): PDO {
        return $this->pdo;
    }

    // Ejecuta query con parámetros y retorna PDOStatement
    public function query(string $sql, array $params = []): PDOStatement {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }

    // Retorna todas las filas
    public function fetchAll(string $sql, array $params = []): array {
        return $this->query($sql, $params)->fetchAll();
    }

    // Retorna una fila
    public function fetchOne(string $sql, array $params = []): ?array {
        $row = $this->query($sql, $params)->fetch();
        return $row ?: null;
    }

    // Retorna último ID insertado
    public function lastInsertId(): string {
        return $this->pdo->lastInsertId();
    }

    // Transacciones
    public function beginTransaction(): void { $this->pdo->beginTransaction(); }
    public function commit(): void { $this->pdo->commit(); }
    public function rollback(): void { $this->pdo->rollBack(); }
}

function db(): Database {
    return Database::getInstance();
}
