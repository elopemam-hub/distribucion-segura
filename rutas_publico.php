<?php
// ============================================================
// PÁGINA PÚBLICA: Portal del Conductor
// Un solo enlace/QR. El conductor elige su ruta del día y abre su guía.
// SIN login. Se abre por: rutas_publico.php
// ============================================================
?>
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Portal del Conductor · Rutas</title>
<style>
  :root { --amar:#F5C800; --tinta:#1A1A1A; }
  * { box-sizing:border-box; }
  html,body { margin:0; min-height:100%; font-family:'Segoe UI',system-ui,Arial,sans-serif; background:#0e1116; color:#eee; }
  header { background:var(--tinta); color:#fff; padding:16px; display:flex; align-items:center; gap:12px; box-shadow:0 2px 10px rgba(0,0,0,.4); }
  header .ico { width:34px;height:34px;background:var(--amar);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#1A1A1A;font-weight:900;flex-shrink:0; }
  header h1 { font-size:16px; margin:0; font-weight:800; }
  header small { color:#9aa; font-size:12px; }
  .wrap { padding:16px; max-width:560px; margin:0 auto; }
  .lead { color:#9aa; font-size:13px; margin:4px 0 14px; }
  a.route { display:flex; align-items:center; gap:12px; text-decoration:none; color:#fff;
            background:#161b22; border:1px solid #2a2f38; border-radius:12px; padding:15px 16px; margin-bottom:11px; transition:border-color .15s; }
  a.route:active, a.route:hover { border-color:var(--amar); }
  a.route .rico { width:40px;height:40px;flex-shrink:0;background:rgba(245,200,0,.14);color:var(--amar);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px; }
  a.route .rt { flex:1; min-width:0; }
  a.route .rt b { font-size:15px; display:block; }
  a.route .rt span { font-size:12px; color:#9aa; }
  a.route .go { color:#9aa; font-size:18px; }
  .empty { text-align:center; color:#9aa; padding:50px 20px; }
  .foot { text-align:center; color:#67707d; font-size:11px; margin-top:20px; }
</style>
</head>
<body>
  <header>
    <div class="ico">SST</div>
    <div><h1>Portal del Conductor</h1><small>Elige tu ruta del día</small></div>
  </header>
  <div class="wrap">
    <p class="lead">Selecciona la ruta que te toca hoy para ver sus curvas y velocidades máximas.</p>
    <div id="lista"><p class="empty">Cargando rutas…</p></div>
    <p class="foot">Consulta antes de salir. No manipules el teléfono conduciendo.</p>
  </div>

<script>
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
async function init(){
  let rutas = [];
  try { const r = await fetch('api/geo_publico/rutas.php'); const j = await r.json(); if(j.success) rutas = j.data.rutas||[]; }
  catch(e){ document.getElementById('lista').innerHTML = '<p class="empty">Sin conexión. Intenta de nuevo.</p>'; return; }
  const cont = document.getElementById('lista');
  if(!rutas.length){ cont.innerHTML = '<p class="empty">Aún no hay rutas publicadas.</p>'; return; }
  cont.innerHTML = rutas.map(x => `
    <a class="route" href="mapa_publico.php?t=${encodeURIComponent(x.token)}">
      <div class="rico">🛣️</div>
      <div class="rt"><b>${esc(x.nombre)}</b><span>${x.n_puntos>0 ? x.n_puntos+' señal'+(x.n_puntos!=1?'es':'') : 'Ver mapa'}${x.descripcion? ' · '+esc(x.descripcion):''}</span></div>
      <div class="go">›</div>
    </a>`).join('');
}
init();
</script>
</body>
</html>
