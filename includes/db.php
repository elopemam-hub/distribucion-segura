<?php
// ============================================================
// CLASE DE CONEXIÓN A BASE DE DATOS (PDO)
// Archivo: includes/db.php
// ============================================================

// Verificar que config.php existe antes de requerirlo
if (!file_exists(__DIR__ . '/config.php')) {
    http_response_code(503);
    $ejemplo = file_exists(__DIR__ . '/config.example.php') ? 'config.example.php' : 'N/A';
    die('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Configuración requerida</title>
    <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5}
    .box{background:#fff;padding:40px;border-radius:8px;max-width:500px;box-shadow:0 2px 12px rgba(0,0,0,.1)}
    h2{color:#1a1a1a;margin:0 0 16px}code{background:#f0f0f0;padding:2px 6px;border-radius:3px;font-size:13px}
    p{color:#555;line-height:1.6}</style></head><body><div class="box">
    <h2>⚙️ Configuración requerida</h2>
    <p>El archivo <code>includes/config.php</code> no existe.</p>
    <p>Copia <code>' . $ejemplo . '</code> como <code>config.php</code> y completa las credenciales de base de datos.</p>
    <p>En Hostinger: sube el archivo via <strong>Administrador de Archivos</strong> o FTP.</p>
    </div></body></html>');
}
require_once __DIR__ . '/config.php';

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
