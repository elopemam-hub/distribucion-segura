<?php
// ============================================================
// LOGIN
// Archivo: login.php
// ============================================================

require_once __DIR__ . '/includes/auth.php';

if (isLoggedIn()) {
    header('Location: index.php');
    exit;
}

// Rate limit simple: máximo 5 intentos cada 5 minutos por sesión
if (!isset($_SESSION['login_attempts'])) {
    $_SESSION['login_attempts'] = ['count' => 0, 'first' => time()];
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Verificar CSRF
    $tokenRecibido = $_POST['csrf_token'] ?? '';
    $tokenEsperado = $_SESSION['csrf_token'] ?? '';
    if (empty($tokenEsperado) || !hash_equals($tokenEsperado, $tokenRecibido)) {
        $error = 'Sesión expirada. Recarga la página e intenta de nuevo.';
    } else {
        // Rate limit
        $att = &$_SESSION['login_attempts'];
        if (time() - $att['first'] > 300) { $att = ['count' => 0, 'first' => time()]; }

        if ($att['count'] >= 5) {
            $error = 'Demasiados intentos. Espera 5 minutos.';
        } else {
            $u = trim($_POST['usuario'] ?? '');
            $p = $_POST['password'] ?? '';
            if (login($u, $p)) {
                unset($_SESSION['login_attempts']);
                header('Location: index.php');
                exit;
            } else {
                $att['count']++;
                $error = 'Usuario o contraseña incorrectos.';
            }
        }
    }
}

// Generar token CSRF para el formulario
$csrf = csrfToken();
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#2A3F54">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Dist. Segura">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="/distribucion-segura/manifest.json">
<link rel="apple-touch-icon" href="/distribucion-segura/assets/img/logo-camion.png">
<title>Login - Distribución Segura</title>
<link rel="icon" type="image/png" href="assets/img/logo-camion.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=Barlow:wght@300;400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Barlow', sans-serif;
    min-height: 100vh;
    display: flex;
    background: #F5F7FA;
  }

  /* ── Panel izquierdo: sidebar oscuro Gentelella ── */
  .panel-left {
    width: 42%;
    background: #1A1A1A;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 40px;
    position: relative;
    overflow: hidden;
  }

  .panel-left::before {
    content: '';
    position: absolute;
    width: 380px; height: 380px;
    border-radius: 50%;
    border: 50px solid rgba(245,200,0,.08);
    top: -100px; left: -100px;
  }
  .panel-left::after {
    content: '';
    position: absolute;
    width: 260px; height: 260px;
    border-radius: 50%;
    border: 35px solid rgba(245,200,0,.06);
    bottom: -70px; right: -70px;
  }

  .brand { text-align: center; position: relative; z-index: 1; }

  .logo-badge {
    width: 80px; height: 80px;
    background: #F5C800;
    border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 24px;
    font-size: 36px; color: #fff;
    box-shadow: 0 6px 24px rgba(245,200,0,.35);
  }

  .brand h1 {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 26px; font-weight: 800;
    color: #FFFFFF;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    line-height: 1.2;
    margin-bottom: 6px;
  }

  .brand p {
    color: rgba(255,255,255,.45);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 3px;
    margin-bottom: 48px;
  }

  .features { text-align: left; width: 100%; max-width: 280px; }
  .feature-item {
    display: flex; align-items: center; gap: 14px;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255,255,255,.07);
  }
  .feature-item:last-child { border-bottom: none; }
  .feature-icon {
    width: 36px; height: 36px; flex-shrink: 0;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-size: 15px;
  }
  .feature-item .txt { font-size: 13px; color: rgba(255,255,255,.60); line-height: 1.35; }
  .feature-item .txt strong { color: rgba(255,255,255,.90); display: block; font-size: 13px; margin-bottom: 1px; }

  .panel-footer {
    position: absolute; bottom: 20px;
    font-size: 11px; color: rgba(255,255,255,.22);
    letter-spacing: .5px;
  }

  /* ── Panel derecho: fondo claro Gentelella ── */
  .panel-right {
    flex: 1;
    background: #F5F7FA;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 32px;
  }

  .login-card {
    background: #FFFFFF;
    border: 1px solid #E6E9ED;
    border-radius: 5px;
    padding: 40px 36px;
    width: 100%;
    max-width: 380px;
    box-shadow: 0 2px 12px rgba(0,0,0,.08);
  }

  .card-header { margin-bottom: 28px; }
  .card-header h2 {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 22px; font-weight: 800;
    color: #2A3F54;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }
  .card-header p { font-size: 13px; color: #98A6AD; }

  .form-group { margin-bottom: 18px; }
  .form-group label {
    display: block;
    font-size: 11px; font-weight: 700;
    color: #73879C;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    margin-bottom: 7px;
  }
  .input-wrap { position: relative; }
  .input-wrap i {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%);
    color: #98A6AD; font-size: 14px;
    pointer-events: none;
  }
  .input-wrap input {
    width: 100%;
    background: #FFFFFF;
    border: 1px solid #CDD3D8;
    border-radius: 4px;
    padding: 10px 12px 10px 38px;
    color: #2A3F54;
    font-family: 'Barlow', sans-serif;
    font-size: 14px;
    transition: border-color .2s, box-shadow .2s;
    outline: none;
  }
  .input-wrap input::placeholder { color: #CDD3D8; }
  .input-wrap input:focus {
    border-color: #F5C800;
    box-shadow: 0 0 0 3px rgba(245,200,0,.15);
  }

  .btn-login {
    width: 100%;
    background: #F5C800;
    color: #1A1A1A;
    border: none;
    border-radius: 4px;
    padding: 12px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 16px; font-weight: 800;
    text-transform: uppercase; letter-spacing: 2px;
    cursor: pointer;
    transition: background .2s, box-shadow .2s, transform .1s;
    margin-top: 6px;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    box-shadow: 0 3px 10px rgba(245,200,0,.30);
  }
  .btn-login:hover {
    background: #D4A500;
    box-shadow: 0 5px 16px rgba(245,200,0,.40);
    transform: translateY(-1px);
  }
  .btn-login:active { transform: translateY(0); }

  .error-msg {
    background: #FEF2F2;
    border: 1px solid #FECACA;
    border-radius: 4px;
    padding: 10px 14px;
    color: #B91C1C;
    font-size: 13px;
    margin-bottom: 18px;
    display: flex; align-items: center; gap: 8px;
  }

  .divider {
    text-align: center;
    margin: 22px 0 0;
    font-size: 11px; color: #CDD3D8;
    letter-spacing: .5px;
  }

  /* Responsive */
  @media (max-width: 768px) {
    body { flex-direction: column; }
    .panel-left {
      width: 100%; padding: 36px 24px 28px;
      min-height: auto;
    }
    .panel-left::before, .panel-left::after { display: none; }
    .features { display: none; }
    .brand p { margin-bottom: 0; }
    .panel-right { padding: 28px 20px; background: #F5F7FA; }
    .login-card { padding: 28px 24px; }
    .panel-footer { position: static; margin-top: 16px; }
  }
</style>
</head>
<body>

<!-- Panel izquierdo: branding -->
<div class="panel-left">
  <div class="brand">
    <div class="logo-badge" style="background:none;box-shadow:none;padding:0;overflow:hidden;width:120px;height:90px">
      <img src="assets/img/logo-camion.png" alt="Logo" style="width:100%;height:100%;object-fit:contain;display:block">
    </div>
    <h1>Distribución Segura</h1>
    <p>SST · Juliaca</p>
  </div>

  <div class="features">
    <div class="feature-item">
      <div class="feature-icon" style="background:rgba(245,200,0,.15)">
        <i class="fas fa-clipboard-check" style="color:#F5C800"></i>
      </div>
      <div class="txt">
        <strong>Inspecciones en ruta</strong>
        Registro digital con GPS y firma
      </div>
    </div>
    <div class="feature-item">
      <div class="feature-icon" style="background:rgba(245,200,0,.15)">
        <i class="fas fa-id-card" style="color:#F5C800"></i>
      </div>
      <div class="txt">
        <strong>Gestión de personal</strong>
        Control de licencias y vencimientos
      </div>
    </div>
    <div class="feature-item">
      <div class="feature-icon" style="background:rgba(245,200,0,.15)">
        <i class="fas fa-bolt" style="color:#F5C800"></i>
      </div>
      <div class="txt">
        <strong>Matriz de consecuencias</strong>
        Infracciones y sanciones SST
      </div>
    </div>
    <div class="feature-item">
      <div class="feature-icon" style="background:rgba(245,200,0,.15)">
        <i class="fas fa-chart-bar" style="color:#F5C800"></i>
      </div>
      <div class="txt">
        <strong>Dashboard y reportes</strong>
        KPIs y exportación Excel/PDF
      </div>
    </div>
  </div>

  <div class="panel-footer">Distribución Segura &copy; <?= date('Y') ?></div>
</div>

<!-- Panel derecho: formulario -->
<div class="panel-right">
  <div class="login-card">
    <div class="card-header">
      <h2><i class="fas fa-lock" style="color:#F5C800;margin-right:8px;font-size:18px"></i>Acceso al Sistema</h2>
      <p>Ingresa tus credenciales para continuar</p>
    </div>

    <?php if ($error): ?>
    <div class="error-msg">
      <i class="fas fa-exclamation-circle"></i>
      <?= htmlspecialchars($error) ?>
    </div>
    <?php endif; ?>

    <form method="POST">
      <input type="hidden" name="csrf_token" value="<?= htmlspecialchars($csrf, ENT_QUOTES) ?>">

      <div class="form-group">
        <label>Usuario</label>
        <div class="input-wrap">
          <i class="fas fa-user"></i>
          <input type="text" name="usuario" placeholder="Ingresa tu usuario" required autofocus autocomplete="username">
        </div>
      </div>

      <div class="form-group">
        <label>Contraseña</label>
        <div class="input-wrap">
          <i class="fas fa-lock"></i>
          <input type="password" name="password" placeholder="••••••••" required autocomplete="current-password">
        </div>
      </div>

      <button type="submit" class="btn-login">
        <i class="fas fa-sign-in-alt"></i> Ingresar
      </button>
    </form>

    <div class="divider">Sistema de Gestión SST — Juliaca</div>
  </div>
</div>

<script>
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/distribucion-segura/sw.js', { scope: '/distribucion-segura/' })
      .catch(() => {});
  }
</script>
</body>
</html>
