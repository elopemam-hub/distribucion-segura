// ============================================================
// DISTRIBUCIÓN SEGURA — MÓDULO: DASHBOARD
// ============================================================

async function cargarDashboard() {
  const mes = document.getElementById('filtroMes')?.value || new Date().toISOString().slice(0,7);
  try {
    const resp = await fetch(`api/dashboard.php?mes=${mes}`);
    const data = await resp.json();
    if (!data.success) return;
    const d = data.data;
    renderKPIs(d.kpis);
    renderChartTendencia(d.tendencia);
    renderItemsChecklist(d.porItem);
    renderRankingConductores(d.ranking);
    renderHallazgos2(d.hallazgos);
  } catch(e) { console.error(e); }
}

function renderKPIs(k) {
  const pct=parseFloat(k.promedio_cumplimiento)||0, colorPct=pct>=80?'verde':pct>=60?'naranja':'rojo';
  document.getElementById('kpiGrid').innerHTML=`
    <div class="kpi-card amarillo"><div class="kpi-label">Total Inspecciones</div><div class="kpi-value">${k.total_inspecciones}</div><div class="kpi-sub">en el período</div><i class="fas fa-clipboard-check kpi-icon"></i></div>
    <div class="kpi-card ${colorPct}"><div class="kpi-label">Cumplimiento Promedio</div><div class="kpi-value ${colorPct}">${pct}%</div><div class="kpi-sub">promedio global</div><i class="fas fa-chart-pie kpi-icon"></i></div>
    <div class="kpi-card verde"><div class="kpi-label">Aprobadas (≥80%)</div><div class="kpi-value verde">${k.aprobadas}</div><div class="kpi-sub">inspecciones OK</div><i class="fas fa-check-circle kpi-icon"></i></div>
    <div class="kpi-card rojo"><div class="kpi-label">Con Observaciones</div><div class="kpi-value rojo">${k.observadas}</div><div class="kpi-sub">requieren atención</div><i class="fas fa-exclamation-triangle kpi-icon"></i></div>
    <div class="kpi-card azul"><div class="kpi-label">Unidades / Conductores</div><div class="kpi-value" style="font-size:32px">${k.unidades_inspeccionadas} / ${k.conductores}</div><div class="kpi-sub">inspeccionados</div><i class="fas fa-truck kpi-icon"></i></div>`;
}

function renderChartTendencia(data) {
  const ctx=document.getElementById('chartTendencia').getContext('2d');
  if (chartTendencia) chartTendencia.destroy();
  chartTendencia=new Chart(ctx, {
    type:'line',
    data:{ labels:data.map(d=>d.dia.slice(5)), datasets:[
      { label:'Inspecciones', data:data.map(d=>d.total), borderColor:'#1565C0', backgroundColor:'rgba(21,101,192,0.1)', tension:0.4, fill:true, pointBackgroundColor:'#1565C0' },
      { label:'% Cumplimiento', data:data.map(d=>d.promedio), borderColor:'#2ECC71', backgroundColor:'rgba(46,204,113,0.07)', tension:0.4, fill:true, pointBackgroundColor:'#2ECC71', yAxisID:'y1' }
    ]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{labels:{color:'#888',font:{size:11}}}}, scales:{ x:{ticks:{color:'#666'},grid:{color:'rgba(255,255,255,0.05)'}}, y:{ticks:{color:'#666'},grid:{color:'rgba(255,255,255,0.05)'}}, y1:{position:'right',min:0,max:100,ticks:{color:'#2ECC71',callback:v=>v+'%'},grid:{display:false}} } }
  });
}

function renderItemsChecklist(items) {
  const c=document.getElementById('itemsChecklist');
  if (!items.length) { c.innerHTML='<p style="color:var(--gris-400);font-size:13px">Sin datos</p>'; return; }
  c.innerHTML=items.map(i=>`<div style="margin-bottom:10px">
    <div class="progress-label" style="font-size:12px"><span style="color:var(--gris-200)">${i.item}</span><span style="color:${i.pct>=80?'var(--verde)':i.pct>=60?'var(--naranja)':'var(--rojo)'};font-weight:700">${i.pct}%</span></div>
    <div class="progress-bar-container"><div class="progress-bar-fill ${i.pct>=80?'verde':i.pct>=60?'naranja':'rojo'}" style="width:${i.pct}%"></div></div>
  </div>`).join('');
}

function renderRankingConductores(ranking) {
  const c=document.getElementById('rankingConductores');
  if (!ranking.length) { c.innerHTML='<p style="color:var(--gris-400);font-size:13px">Sin datos en el período</p>'; return; }
  c.innerHTML=ranking.map((r,i)=>`<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
    <div style="width:28px;height:28px;border-radius:50%;background:${i<3?'var(--amarillo)':'var(--gris-600)'};color:${i<3?'var(--negro)':'var(--gris-300)'};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0">${i+1}</div>
    <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--gris-100);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.conductor}</div><div style="font-size:11px;color:var(--gris-400)">${r.inspecciones} inspeccion${r.inspecciones!=1?'es':''}</div></div>
    <div style="text-align:right;flex-shrink:0"><div style="font-family:var(--font-display);font-size:18px;font-weight:800;color:${r.promedio>=80?'var(--verde)':r.promedio>=60?'var(--naranja)':'var(--rojo)'}">${r.promedio}%</div></div>
  </div>`).join('');
}

function renderHallazgos2(hallazgos) {
  const c=document.getElementById('principalesHallazgos');
  if (!hallazgos.length) { c.innerHTML='<p style="color:var(--gris-400);font-size:13px;padding:4px">Sin hallazgos registrados</p>'; return; }
  c.innerHTML=hallazgos.map(h=>`<div class="hallazgo-item" style="margin-bottom:8px">
    <span class="hallazgo-crit crit-${h.criticidad}">${h.criticidad}</span>
    <div style="flex:1;font-size:13px;color:var(--gris-100)">${h.descripcion}</div>
    <div style="font-family:var(--font-display);font-size:16px;font-weight:800;color:var(--amarillo)">${h.frecuencia}x</div>
  </div>`).join('');
}
