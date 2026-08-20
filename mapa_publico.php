<?php
// ============================================================
// PÁGINA PÚBLICA: Mapa del Conductor
// Ruta crítica + señalización (velocidad máxima / curvas) para conductores.
// SIN login. Se abre por enlace/QR: mapa_publico.php?t=TOKEN
// ============================================================
$token = preg_replace('/[^a-f0-9]/', '', $_GET['t'] ?? '');
?>
<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Mapa del Conductor · Ruta Crítica</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<style>
  :root { --amar:#F5C800; --rojo:#E74C3C; --naranja:#F39C12; --verde:#2EB85C; --tinta:#1A1A1A; }
  * { box-sizing:border-box; }
  html,body { margin:0; height:100%; font-family:'Segoe UI',system-ui,Arial,sans-serif; background:#0e1116; color:#eee; }
  #top { position:fixed; top:0; left:0; right:0; z-index:1000; background:var(--tinta); color:#fff;
         padding:10px 14px; display:flex; align-items:center; gap:10px; box-shadow:0 2px 10px rgba(0,0,0,.4); }
  #top .ico { width:30px;height:30px;background:var(--amar);border-radius:7px;display:flex;align-items:center;justify-content:center;color:#1A1A1A;font-weight:900;flex-shrink:0; }
  #top h1 { font-size:15px; margin:0; font-weight:800; line-height:1.1; }
  #top small { color:#9aa; font-size:11px; }
  #map { position:absolute; top:52px; bottom:0; left:0; right:0; }
  #banner { position:fixed; left:10px; right:10px; top:60px; z-index:1000; display:none;
            border-radius:12px; padding:12px 14px; font-weight:800; box-shadow:0 6px 20px rgba(0,0,0,.5); }
  #banner .d { font-size:13px; font-weight:600; opacity:.9; }
  #banner .v { font-size:22px; }
  #dock { position:fixed; left:0; right:0; bottom:0; z-index:1000; background:rgba(20,24,31,.96);
          border-top:1px solid #2a2f38; padding:10px 14px calc(10px + env(safe-area-inset-bottom));
          display:flex; align-items:center; gap:12px; }
  #dock .spd { text-align:center; min-width:78px; }
  #dock .spd b { font-size:26px; font-weight:900; color:#fff; display:block; line-height:1; }
  #dock .spd span { font-size:10px; color:#9aa; text-transform:uppercase; letter-spacing:.5px; }
  .btn { flex:1; border:0; border-radius:10px; padding:13px; font-size:15px; font-weight:800; cursor:pointer; }
  .btn-go { background:var(--amar); color:#1A1A1A; }
  .btn-stop { background:#333; color:#fff; }
  .spd-sign { background:#fff; border:3px solid var(--rojo); border-radius:50%; width:38px; height:38px;
              display:flex; align-items:center; justify-content:center; color:#1A1A1A; font-weight:900; font-size:14px; box-shadow:0 2px 6px rgba(0,0,0,.4); }
  .warn-sign { background:var(--naranja); border:2px solid #fff; border-radius:8px; width:30px; height:30px;
               display:flex; align-items:center; justify-content:center; color:#1A1A1A; font-size:15px; transform:rotate(0); box-shadow:0 2px 6px rgba(0,0,0,.4); }
  #msg { position:fixed; inset:0; display:flex; align-items:center; justify-content:center; text-align:center; padding:30px; z-index:1100; background:#0e1116; }
  #msg div { max-width:340px; }
  #msg h2 { color:var(--amar); }
  .note { position:fixed; left:10px; right:10px; bottom:76px; z-index:999; font-size:11px; color:#9aa; text-align:center; }
</style>
</head>
<body>
  <div id="top">
    <div class="ico">SST</div>
    <div><h1 id="rutaNombre">Mapa del Conductor</h1><small id="rutaSub">Ruta crítica · señalización</small></div>
  </div>
  <div id="map"></div>
  <div id="banner"></div>
  <div class="note" id="note" style="display:none">Consulta antes de salir. No manipules el teléfono conduciendo.</div>
  <div id="dock" style="display:none">
    <div class="spd"><b id="spdVal">—</b><span>km/h</span></div>
    <button class="btn btn-go" id="btnGo">▶ Modo conductor</button>
  </div>

  <div id="msg"><div><h2>Cargando…</h2><p id="msgTxt">Obteniendo la ruta.</p></div></div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
const TOKEN = <?= json_encode($token) ?>;
let map, pts = [], driveOn = false, watchId = null, meMarker = null;
const announced = {};   // índice de puntos ya avisados

function speedIcon(v){ return L.divIcon({ className:'', html:`<div class="spd-sign">${v||'!'}</div>`, iconSize:[38,38], iconAnchor:[19,19] }); }
function warnIcon(t){ const e={curva:'↩',cruce:'✚',zona_escolar:'🏫',pendiente:'⛰',baden:'〰',peligro:'⚠'}[t]||'⚠';
  return L.divIcon({ className:'', html:`<div class="warn-sign">${e}</div>`, iconSize:[30,30], iconAnchor:[15,15] }); }

function haversine(a,b,c,d){ const R=6371000,r=x=>x*Math.PI/180;
  const dLat=r(c-a),dLng=r(d-b); const s=Math.sin(dLat/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(s)); }

async function init(){
  if(!TOKEN){ return fail('Enlace no válido','Pide el enlace o QR actualizado.'); }
  let d;
  try { const r = await fetch('api/geo_publico/mapa.php?t='+encodeURIComponent(TOKEN)); const j = await r.json();
    if(!j.success){ return fail('No disponible', j.message||''); } d = j.data; }
  catch(e){ return fail('Sin conexión','Revisa tu internet e intenta de nuevo.'); }

  document.getElementById('rutaNombre').textContent = d.nombre || 'Ruta crítica';
  document.getElementById('rutaSub').textContent = d.descripcion || 'Señalización de la ruta';
  document.getElementById('msg').style.display='none';
  document.getElementById('dock').style.display='flex';
  document.getElementById('note').style.display='block';

  map = L.map('map',{zoomControl:true});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19, attribution:'© OpenStreetMap'}).addTo(map);

  const line = (d.coordenadas||[]).map(p=>[+p[0],+p[1]]);
  let bounds = null;
  if(line.length>1){ const pl=L.polyline(line,{color:d.color||'#F39C12',weight:5,opacity:.9}).addTo(map); bounds=pl.getBounds(); }

  pts = (d.puntos||[]).map(p=>({lat:+p.lat,lng:+p.lng,vel:p.velocidad,tipo:p.tipo,desc:p.descripcion,sev:p.severidad}));
  const grp=[];
  pts.forEach(p=>{
    const ic = p.tipo==='velocidad_max' ? speedIcon(p.vel) : warnIcon(p.tipo);
    const m=L.marker([p.lat,p.lng],{icon:ic}).addTo(map);
    const t = p.tipo==='velocidad_max' ? `Velocidad máx. ${p.vel} km/h` : (p.tipo.replace('_',' '));
    m.bindPopup(`<b>${t}</b>${p.desc?'<br>'+p.desc:''}`);
    grp.push(m);
  });
  if(!bounds && grp.length) bounds=L.featureGroup(grp).getBounds();
  if(bounds) map.fitBounds(bounds.pad(0.2)); else map.setView([-15.5,-70.13],12);

  document.getElementById('btnGo').onclick=toggleDrive;
}

function toggleDrive(){
  const b=document.getElementById('btnGo');
  if(driveOn){ driveOn=false; if(watchId)navigator.geolocation.clearWatch(watchId); watchId=null;
    b.textContent='▶ Modo conductor'; b.className='btn btn-go'; hideBanner(); document.getElementById('spdVal').textContent='—'; return; }
  if(!navigator.geolocation){ alert('Tu dispositivo no permite ubicación.'); return; }
  driveOn=true; b.textContent='■ Detener'; b.className='btn btn-stop';
  try{ const u=new SpeechSynthesisUtterance('Modo conductor activado'); u.lang='es-PE'; speechSynthesis.speak(u); }catch(e){}
  watchId=navigator.geolocation.watchPosition(onPos, ()=>{}, {enableHighAccuracy:true, maximumAge:1000, timeout:10000});
}

function onPos(pos){
  const {latitude:la,longitude:lo,speed}=pos.coords;
  document.getElementById('spdVal').textContent = (speed!=null && speed>=0) ? Math.round(speed*3.6) : '—';
  if(!meMarker){ meMarker=L.circleMarker([la,lo],{radius:8,color:'#2EB85C',fillColor:'#2EB85C',fillOpacity:.9}).addTo(map); }
  else meMarker.setLatLng([la,lo]);
  map.panTo([la,lo],{animate:true});

  // Punto más cercano dentro de 500 m
  let best=null,bd=1e9,bi=-1;
  pts.forEach((p,i)=>{ const dist=haversine(la,lo,p.lat,p.lng); if(dist<bd){bd=dist;best=p;bi=i;} });
  if(best && bd<=500){ showBanner(best,bd);
    if(bd<=180 && !announced[bi]){ announced[bi]=true; announce(best); }
    if(bd>250) announced[bi]=false;   // permite reavisar si se aleja y vuelve
  } else hideBanner();
}

function showBanner(p,dist){
  const el=document.getElementById('banner');
  const col = p.sev==='peligro'?'#E74C3C':p.sev==='info'?'#3498DB':'#F39C12';
  const t = p.tipo==='velocidad_max' ? `Máx. ${p.vel} km/h` : p.tipo.replace('_',' ');
  el.style.background=col; el.style.color='#fff'; el.style.display='block';
  el.innerHTML=`<div class="d">A ${Math.round(dist)} m${p.desc?' · '+p.desc:''}</div><div class="v">⚠ ${t}</div>`;
}
function hideBanner(){ document.getElementById('banner').style.display='none'; }

function announce(p){
  const t = p.tipo==='velocidad_max' ? `Reduzca. Velocidad máxima ${p.vel} kilómetros por hora` : `Atención. ${p.tipo.replace('_',' ')} adelante`;
  try{ if(navigator.vibrate) navigator.vibrate([250,120,250]); }catch(e){}
  try{ const u=new SpeechSynthesisUtterance(t); u.lang='es-PE'; u.rate=1; speechSynthesis.speak(u); }catch(e){}
}

function fail(h,t){ document.getElementById('msg').innerHTML=`<div><h2>${h}</h2><p>${t||''}</p></div>`; }
init();
</script>
</body>
</html>
