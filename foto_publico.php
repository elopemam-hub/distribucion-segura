<?php
// Página pública (SIN login) para que el trabajador envíe su foto de perfil.
// Uso: foto_publico.php?t=TOKEN
require_once __DIR__ . '/includes/auth.php';
setupFotoPublica();
$t = (string)($_GET['t'] ?? '');
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<title>Enviar mi foto de perfil</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:linear-gradient(135deg,#12161c,#1a2130);color:#e8ebf0;min-height:100vh;display:flex;align-items:flex-start;justify-content:center;padding:22px 14px}
  .card{background:#1e2530;border:1px solid #2c3646;border-radius:16px;max-width:440px;width:100%;padding:26px 22px;box-shadow:0 12px 40px rgba(0,0,0,.4)}
  h1{font-size:20px;font-weight:800;margin-bottom:6px}
  .sub{color:#9aa6b6;font-size:13px;margin-bottom:20px}
  label{display:block;font-size:12px;font-weight:700;color:#9aa6b6;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px}
  input[type=text]{width:100%;padding:12px 14px;border-radius:10px;border:1px solid #3a465a;background:#151b25;color:#fff;font-size:16px}
  .btn{width:100%;padding:13px;border:0;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer;margin-top:14px}
  .btn-primary{background:#D4A500;color:#1a1400}
  .btn-sec{background:#2c3646;color:#e8ebf0}
  .msg{padding:11px 14px;border-radius:9px;font-size:13px;margin-top:14px;display:none}
  .msg.err{background:rgba(231,76,60,.15);color:#ff8a7a;border-left:3px solid #e74c3c;display:block}
  .msg.ok{background:rgba(40,167,69,.15);color:#7ee6a0;border-left:3px solid #28a745;display:block}
  .confirm{background:#151b25;border:1px solid #3a465a;border-radius:10px;padding:14px;margin-top:16px;text-align:center}
  .confirm .nom{font-size:18px;font-weight:800;color:#fff;margin:4px 0}
  #preview{width:150px;height:150px;border-radius:50%;object-fit:cover;border:3px solid #D4A500;margin:14px auto;display:none}
  .hide{display:none}
  .step{display:none}.step.active{display:block}
  .foot{text-align:center;color:#6b7688;font-size:11px;margin-top:18px}
  .spin{display:inline-block;width:16px;height:16px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:sp .7s linear infinite;vertical-align:-3px}
  @keyframes sp{to{transform:rotate(360deg)}}
</style>
</head>
<body>
  <div class="card">
    <h1><i class="fas fa-camera-retro" style="color:#D4A500"></i> Envía tu foto de perfil</h1>
    <div class="sub">Ingresa tu DNI y sube tu foto. Tu supervisor la aprobará.</div>

    <!-- Paso 1: DNI -->
    <div class="step active" id="step1">
      <label>Tu DNI</label>
      <input type="text" id="dni" inputmode="numeric" maxlength="15" placeholder="Ej: 41960239" autocomplete="off">
      <button class="btn btn-primary" id="btnVerificar">Continuar</button>
      <div class="msg" id="msg1"></div>
    </div>

    <!-- Paso 2: confirmar + foto -->
    <div class="step" id="step2">
      <div class="confirm">
        <div style="font-size:12px;color:#9aa6b6">¿Eres tú?</div>
        <div class="nom" id="nomConfirm">—</div>
        <button class="btn btn-sec" id="btnNoSoy" style="margin-top:8px;padding:8px">No, cambiar DNI</button>
      </div>
      <img id="preview" alt="Vista previa">
      <label style="margin-top:16px">Tu foto</label>
      <div style="display:flex;gap:10px;margin-top:6px">
        <label class="btn btn-sec" style="flex:1;margin:0;text-align:center;cursor:pointer;font-size:14px">
          <i class="fas fa-camera"></i> Tomar foto
          <input type="file" id="fotoCam" accept="image/*" capture="user" style="display:none">
        </label>
        <label class="btn btn-sec" style="flex:1;margin:0;text-align:center;cursor:pointer;font-size:14px">
          <i class="fas fa-images"></i> Galería
          <input type="file" id="fotoGal" accept="image/*" style="display:none">
        </label>
      </div>
      <div style="font-size:11px;color:#6b7688;margin-top:8px">Tómate la foto o elige una de tu galería · Máx 8MB</div>
      <button class="btn btn-primary" id="btnEnviar" disabled>Enviar foto</button>
      <div class="msg" id="msg2"></div>
    </div>

    <!-- Paso 3: éxito -->
    <div class="step" id="step3" style="text-align:center">
      <div style="font-size:54px;margin:10px 0">✅</div>
      <div style="font-size:17px;font-weight:800;color:#fff">¡Foto enviada!</div>
      <div class="sub" style="margin-top:8px" id="okTxt">Quedará activa cuando tu supervisor la apruebe.</div>
    </div>

    <div class="foot">Distribución Segura · Solo para personal de la empresa</div>
  </div>

<script>
  var T = <?= json_encode($t) ?>;
  var $ = function(id){ return document.getElementById(id); };
  function paso(n){ document.querySelectorAll('.step').forEach(function(s){s.classList.remove('active');}); $('step'+n).classList.add('active'); }
  function msg(el, txt, ok){ el.className='msg '+(ok?'ok':'err'); el.textContent=txt; }

  // Paso 1: verificar DNI
  $('btnVerificar').onclick = async function(){
    var dni = $('dni').value.trim();
    if(!/^\d{6,15}$/.test(dni)){ msg($('msg1'),'Ingresa un DNI válido.',false); return; }
    this.disabled=true; var prev=this.innerHTML; this.innerHTML='<span class="spin"></span> Verificando…';
    try{
      var r = await fetch('api/foto_publico/verificar.php?t='+encodeURIComponent(T)+'&dni='+encodeURIComponent(dni));
      var d = await r.json();
      if(!d.success){ msg($('msg1'), d.message||'No se pudo verificar.', false); return; }
      $('nomConfirm').textContent = d.data.nombre || '—';
      paso(2);
    }catch(e){ msg($('msg1'),'Error de conexión. Reintenta.',false); }
    finally{ this.disabled=false; this.innerHTML=prev; }
  };
  $('btnNoSoy').onclick = function(){ paso(1); };

  // Comprime la imagen antes de enviar.
  function comprimir(file){
    return new Promise(function(res){
      var url=URL.createObjectURL(file); var img=new Image();
      img.onload=function(){ URL.revokeObjectURL(url);
        var max=1000, w=img.naturalWidth||img.width, h=img.naturalHeight||img.height;
        var s=Math.min(1,max/Math.max(w,h)); var nw=Math.round(w*s),nh=Math.round(h*s);
        var c=document.createElement('canvas'); c.width=nw;c.height=nh;
        var ctx=c.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,nw,nh); ctx.drawImage(img,0,0,nw,nh);
        res(c.toDataURL('image/jpeg',0.85));
      };
      img.onerror=function(){ URL.revokeObjectURL(url); res(null); };
      img.src=url;
    });
  }

  var fotoData=null;
  async function procesarFoto(f){
    if(!f){ return; }
    if(f.size > 8*1024*1024){ msg($('msg2'),'La imagen supera 8MB.',false); return; }
    $('msg2').className='msg';
    fotoData = await comprimir(f);
    if(fotoData){ $('preview').src=fotoData; $('preview').style.display='block'; $('btnEnviar').disabled=false; }
  }
  $('fotoCam').onchange = function(){ procesarFoto(this.files&&this.files[0]); };
  $('fotoGal').onchange = function(){ procesarFoto(this.files&&this.files[0]); };

  $('btnEnviar').onclick = async function(){
    if(!fotoData){ msg($('msg2'),'Elige tu foto primero.',false); return; }
    var dni=$('dni').value.trim();
    this.disabled=true; var prev=this.innerHTML; this.innerHTML='<span class="spin"></span> Enviando…';
    try{
      var fd=new FormData(); fd.append('t',T); fd.append('dni',dni); fd.append('imagen_b64',fotoData);
      var r=await fetch('api/foto_publico/subir.php',{method:'POST',body:fd});
      var d=await r.json();
      if(!d.success){ msg($('msg2'), d.message||'No se pudo enviar.', false); this.disabled=false; this.innerHTML=prev; return; }
      $('okTxt').textContent = d.message || 'Quedará activa cuando tu supervisor la apruebe.';
      paso(3);
    }catch(e){ msg($('msg2'),'Error de conexión. Reintenta.',false); this.disabled=false; this.innerHTML=prev; }
  };
</script>
</body>
</html>
