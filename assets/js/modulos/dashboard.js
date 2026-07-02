// ============================================================
// DISTRIBUCIÓN SEGURA — MÓDULO: DASHBOARD (mejorado)
// ============================================================

let chartTendencia = null;
let chartDonut     = null;

async function cargarDashboard() {
  const mes = document.getElementById('filtroMes')?.value || new Date().toISOString().slice(0,7);
  // esqueletos mientras carga
  document.getElementById('kpiGrid').innerHTML = Array(6).fill('<div class="dash-kpi-skeleton"></div>').join('');
  try {
    const resp = await fetch(`api/dashboard.php?mes=${mes}&_t=${Date.now()}`);
    const data = await resp.json();
    if (!data.success) return;
    const d = data.data;
    renderKPIs(d);
    renderTendencia(d.tendencia, mes);
    renderDonut(d.kpis, d.totalHallazgos, d.hallazgosCrit);
    renderRankingConductores(d.ranking);
    renderHallazgos(d.hallazgos, d.hallazgosCrit);
    renderEpp(d.epp, d.eppGlobal);
    renderItemsChecklist(d.porItem);
  } catch(e) { console.error(e); }
}

// ── KPIs ─────────────────────────────────────────────────────
function renderKPIs(d) {
  const k    = d.kpis    || {};
  const kAnt = d.kpisAnt || {};
  const epp  = d.eppGlobal    || {};
  const eppA = d.eppGlobalAnt || {};

  const total   = +k.total_inspecciones || 0;
  const prom    = +k.promedio_cumplimiento || 0;
  const aprob   = +k.aprobadas || 0;
  const obser   = +k.observadas || 0;
  const tasaApr = total > 0 ? Math.round(aprob / total * 100) : 0;
  const eppPct  = +epp.pct || 0;
  const cond    = +k.conductores || 0;
  const unids   = +k.unidades_inspeccionadas || 0;

  const totalAnt  = +kAnt.total_inspecciones || 0;
  const promAnt   = +kAnt.promedio_cumplimiento || 0;
  const aprobAnt  = +kAnt.aprobadas || 0;
  const condAnt   = +kAnt.conductores || 0;
  const tasaAnt   = totalAnt > 0 ? Math.round(aprobAnt / totalAnt * 100) : 0;
  const eppPctAnt = +eppA.pct || 0;

  const cards = [
    {
      icon: 'fas fa-clipboard-check', label: 'Inspecciones', color: 'amarillo',
      value: total,
      sub: `${unids} unidad${unids!==1?'es':''} · ${cond} conductor${cond!==1?'es':''}`,
      delta: totalAnt > 0 ? total - totalAnt : null, deltaSuf: '',
    },
    {
      icon: 'fas fa-chart-pie', label: 'Cumplimiento Promedio', color: prom>=80?'verde':prom>=60?'naranja':'rojo',
      value: prom + '%',
      sub: 'checklist 70% + EPP 30%',
      delta: promAnt > 0 ? +(prom - promAnt).toFixed(1) : null, deltaSuf: 'pp',
    },
    {
      icon: 'fas fa-circle-check', label: 'Tasa de Aprobación', color: tasaApr>=80?'verde':tasaApr>=60?'naranja':'rojo',
      value: tasaApr + '%',
      sub: `${aprob} aprobadas / ${obser} en observación`,
      delta: tasaAnt > 0 ? tasaApr - tasaAnt : null, deltaSuf: 'pp',
    },
    {
      icon: 'fas fa-hard-hat', label: 'Cumplimiento EPP', color: eppPct>=80?'verde':eppPct>=60?'naranja':'rojo',
      value: eppPct + '%',
      sub: `${epp.completos||0} de ${epp.total||0} miembros completos`,
      delta: eppPctAnt > 0 ? +(eppPct - eppPctAnt).toFixed(1) : null, deltaSuf: 'pp',
    },
    {
      icon: 'fas fa-triangle-exclamation', label: 'Hallazgos Críticos',
      color: (d.hallazgosCrit?.alta||0) > 0 ? 'rojo' : 'verde',
      value: d.hallazgosCrit?.alta || 0,
      sub: `${d.totalHallazgos||0} total · ${d.hallazgosCrit?.media||0} medios · ${d.hallazgosCrit?.baja||0} bajos`,
      delta: null,
    },
    {
      icon: 'fas fa-users', label: 'Conductores Evaluados', color: 'azul',
      value: cond,
      sub: `${unids} unidad${unids!==1?'es':''} inspeccionadas`,
      delta: condAnt > 0 ? cond - condAnt : null, deltaSuf: '',
    },
  ];

  document.getElementById('kpiGrid').innerHTML = cards.map(c => {
    const deltaHtml = c.delta !== null
      ? `<span class="dash-kpi-delta ${c.delta>0?'positivo':c.delta<0?'negativo':'neutro'}">
           <i class="fas fa-caret-${c.delta>0?'up':c.delta<0?'down':'right'}"></i>
           ${c.delta>0?'+':''}${c.delta}${c.deltaSuf} vs mes ant.
         </span>`
      : '';
    return `<div class="dash-kpi-card">
      <div class="dash-kpi-top">
        <span class="dash-kpi-label">${c.label}</span>
        <i class="${c.icon} dash-kpi-icon ${c.color}"></i>
      </div>
      <div class="dash-kpi-value ${c.color}">${c.value}</div>
      <div class="dash-kpi-sub">${c.sub}</div>
      ${deltaHtml}
    </div>`;
  }).join('');
}

// ── Tendencia del mes ─────────────────────────────────────────
function renderTendencia(data, mes) {
  const ctx = document.getElementById('chartTendencia')?.getContext('2d');
  if (!ctx) return;
  if (chartTendencia) { chartTendencia.destroy(); chartTendencia = null; }

  const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
  const gridC  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const tickC  = isDark ? '#666' : '#999';

  // Rellenar días del mes sin dato
  const [anio, mesN] = mes.split('-').map(Number);
  const diasMes = new Date(anio, mesN, 0).getDate();
  const hoy = new Date();
  const limDia = (anio === hoy.getFullYear() && mesN === hoy.getMonth()+1)
    ? hoy.getDate() : diasMes;

  const mapaData = {};
  data.forEach(r => { mapaData[r.dia] = r; });

  const labels = [], totales = [], promedios = [], aprobadas = [];
  for (let d = 1; d <= limDia; d++) {
    const key = `${anio}-${String(mesN).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    labels.push(String(d));
    totales.push(mapaData[key]?.total || 0);
    promedios.push(mapaData[key]?.promedio || null);
    aprobadas.push(mapaData[key]?.aprobadas || 0);
  }

  chartTendencia = new Chart(ctx, {
    data: {
      labels,
      datasets: [
        {
          type: 'bar', label: 'Inspecciones',
          data: totales,
          backgroundColor: 'rgba(21,101,192,0.55)',
          borderColor: '#1565C0', borderWidth: 1,
          borderRadius: 4, yAxisID: 'y',
        },
        {
          type: 'line', label: '% Cumplimiento',
          data: promedios,
          borderColor: '#2EB85C', backgroundColor: 'rgba(46,184,92,0.08)',
          tension: 0.4, fill: true,
          pointBackgroundColor: '#2EB85C', pointRadius: 3,
          yAxisID: 'y1', spanGaps: true,
        },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ctx.dataset.yAxisID === 'y1'
              ? ` ${ctx.raw ?? '—'}%`
              : ` ${ctx.raw} inspección${ctx.raw!==1?'es':''}`,
          }
        }
      },
      scales: {
        x: { ticks: { color: tickC, font: { size: 11 } }, grid: { color: gridC } },
        y: { ticks: { color: tickC, stepSize: 1, font: { size: 11 } }, grid: { color: gridC }, min: 0 },
        y1: {
          position: 'right', min: 0, max: 100,
          ticks: { color: '#2EB85C', callback: v => v + '%', font: { size: 11 } },
          grid: { display: false },
        },
      }
    }
  });

  // leyenda manual
  const leg = document.getElementById('dashTendLegend');
  if (leg) leg.innerHTML = `
    <span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:12px;background:#1565C0;border-radius:2px;display:inline-block"></span>Inspecciones</span>
    <span style="display:flex;align-items:center;gap:5px"><span style="width:12px;height:3px;background:#2EB85C;display:inline-block;border-radius:2px"></span>% Cumplimiento</span>`;
}

// ── Donut distribución ────────────────────────────────────────
function renderDonut(kpis, totalH, critMap) {
  const ctx = document.getElementById('chartDonut')?.getContext('2d');
  if (!ctx) return;
  if (chartDonut) { chartDonut.destroy(); chartDonut = null; }

  const aprob = +kpis?.aprobadas  || 0;
  const obser = +kpis?.observadas || 0;
  const total = aprob + obser;
  const tasa  = total > 0 ? Math.round(aprob / total * 100) : 0;

  document.getElementById('donutPct').textContent = tasa + '%';

  chartDonut = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Aprobadas (≥80%)', 'Observadas (<80%)'],
      datasets: [{
        data: [aprob, obser || (total===0?1:0)],
        backgroundColor: ['#2EB85C', obser===0&&total===0?'rgba(255,255,255,0.08)':'#E55353'],
        borderWidth: 0,
        hoverOffset: 6,
      }]
    },
    options: {
      cutout: '72%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.label}: ${c.raw}` } } },
      animation: { animateRotate: true, duration: 600 },
    }
  });

  const leyenda = document.getElementById('donutLeyenda');
  if (!leyenda) return;
  leyenda.innerHTML = [
    { color:'#2EB85C', label:'Aprobadas', n: aprob },
    { color:'#E55353', label:'Observadas', n: obser },
    { color:'#F9B115', label:'Hallazgos críticos', n: critMap?.alta||0 },
  ].map(r => `<div style="display:flex;align-items:center;justify-content:space-between;font-size:12px">
    <span style="display:flex;align-items:center;gap:7px">
      <span style="width:10px;height:10px;border-radius:50%;background:${r.color};flex-shrink:0"></span>
      <span style="color:var(--gris-300)">${r.label}</span>
    </span>
    <strong style="color:var(--gris-100)">${r.n}</strong>
  </div>`).join('');
}

// ── Ranking conductores ───────────────────────────────────────
function renderRankingConductores(ranking) {
  const c = document.getElementById('rankingConductores');
  const tot = document.getElementById('rankingTotal');
  if (!ranking.length) {
    c.innerHTML = '<p style="color:var(--gris-400);font-size:13px">Sin datos en el período</p>';
    return;
  }
  if (tot) tot.textContent = `Top ${ranking.length}`;

  const medals = ['🥇','🥈','🥉'];
  c.innerHTML = ranking.map((r, i) => {
    const pct = +r.promedio || 0;
    const col = pct>=80?'var(--verde)':pct>=60?'var(--naranja)':'var(--rojo)';
    return `<div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
      <div style="width:28px;text-align:center;font-size:${i<3?'18px':'13px'};flex-shrink:0;${i>=3?'color:var(--gris-500);font-weight:700':''}">${i<3?medals[i]:i+1}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--gris-100);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(r.conductor)}</div>
        <div style="font-size:10px;color:var(--gris-400);margin-top:2px">${r.inspecciones} insp. · ${r.aprobadas} aprob.</div>
      </div>
      <div style="text-align:right;flex-shrink:0">
        <div style="font-family:var(--font-display);font-size:20px;font-weight:900;color:${col};line-height:1">${pct}%</div>
        <div style="height:3px;width:48px;background:var(--gris-600);border-radius:2px;margin-top:4px;overflow:hidden">
          <div style="height:100%;width:${Math.min(pct,100)}%;background:${col};border-radius:2px"></div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ── Hallazgos más frecuentes ──────────────────────────────────
function renderHallazgos(hallazgos, critMap) {
  const c  = document.getElementById('principalesHallazgos');
  const bd = document.getElementById('hallazgosBadges');
  if (bd) {
    bd.innerHTML = [
      { k:'alta',  color:'#E55353', label:'Alta'  },
      { k:'media', color:'#F9B115', label:'Media' },
      { k:'baja',  color:'#3D99F5', label:'Baja'  },
    ].filter(x=>(critMap?.[x.k]||0)>0).map(x =>
      `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:12px;background:${x.color}22;color:${x.color};border:1px solid ${x.color}55">${x.label}: ${critMap[x.k]}</span>`
    ).join('');
  }
  if (!hallazgos.length) {
    c.innerHTML = '<p style="color:var(--gris-400);font-size:13px;padding:4px">Sin hallazgos registrados</p>';
    return;
  }
  const maxF = Math.max(...hallazgos.map(h=>h.frecuencia));
  const critColor = { alta:'#E55353', media:'#F9B115', baja:'#3D99F5' };
  c.innerHTML = hallazgos.map(h => {
    const col = critColor[h.criticidad] || '#888';
    const barW = Math.round(h.frecuencia / maxF * 100);
    return `<div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.05)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <span style="font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;background:${col}22;color:${col};border:1px solid ${col}44;white-space:nowrap">${h.criticidad}</span>
        <span style="font-size:12px;color:var(--gris-100);flex:1;line-height:1.3">${escapeHtml(h.descripcion)}</span>
        <span style="font-family:var(--font-display);font-size:15px;font-weight:800;color:var(--amarillo);flex-shrink:0">${h.frecuencia}×</span>
      </div>
      <div style="height:3px;background:var(--gris-600);border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${barW}%;background:${col};border-radius:2px;transition:width .4s"></div>
      </div>
    </div>`;
  }).join('');
}

// ── EPP por rol ───────────────────────────────────────────────
function renderEpp(epp, eppGlobal) {
  const c  = document.getElementById('dashEpp');
  const gb = document.getElementById('eppGlobalBadge');
  const pctG = +eppGlobal?.pct || 0;
  if (gb) {
    const col = pctG>=80?'var(--verde)':pctG>=60?'var(--naranja)':'var(--rojo)';
    gb.innerHTML = `<span style="color:${col}">${pctG}% global</span>`;
  }
  if (!epp?.length) {
    c.innerHTML = '<p style="color:var(--gris-400);font-size:13px">Sin datos EPP en el período</p>';
    return;
  }
  const rolLabel = { conductor:'Conductor', reparto:'Reparto', auxiliar:'Auxiliar' };
  const rolIcon  = { conductor:'fas fa-steering-wheel', reparto:'fas fa-box', auxiliar:'fas fa-person-walking' };
  const rolColor = { conductor:'var(--azul)', reparto:'var(--verde)', auxiliar:'var(--naranja)' };
  c.innerHTML = epp.map(r => {
    const pct = +r.pct_cumplimiento || 0;
    const col = pct>=80?'var(--verde)':pct>=60?'var(--naranja)':'var(--rojo)';
    const label = rolLabel[r.rol] || r.rol;
    const icon  = rolIcon[r.rol]  || 'fas fa-user';
    const rc    = rolColor[r.rol] || 'var(--gris-300)';
    return `<div style="margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:8px">
          <i class="${icon}" style="color:${rc};font-size:13px;width:16px;text-align:center"></i>
          <span style="font-size:13px;font-weight:600;color:var(--gris-200)">${label}</span>
          <span style="font-size:11px;color:var(--gris-400)">${r.completos}/${r.total}</span>
        </div>
        <span style="font-family:var(--font-display);font-size:17px;font-weight:800;color:${col}">${pct}%</span>
      </div>
      <div style="height:8px;background:var(--gris-600);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${Math.min(pct,100)}%;background:${col};border-radius:4px;transition:width .5s ease"></div>
      </div>
    </div>`;
  }).join('');
}

// ── Cumplimiento por ítem ─────────────────────────────────────
function renderItemsChecklist(items) {
  const c = document.getElementById('itemsChecklist');
  if (!items.length) {
    c.innerHTML = '<p style="color:var(--gris-400);font-size:13px">Sin datos</p>';
    return;
  }
  c.innerHTML = items.map(i => {
    const pct = +i.pct || 0;
    const col = pct>=80?'var(--verde)':pct>=60?'var(--naranja)':'var(--rojo)';
    return `<div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span style="font-size:12px;color:var(--gris-200)">${escapeHtml(i.item)}</span>
        <span style="font-size:12px;font-weight:700;color:${col};flex-shrink:0;margin-left:8px">${pct}%</span>
      </div>
      <div style="height:5px;background:var(--gris-600);border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${Math.min(pct,100)}%;background:${col};border-radius:3px;transition:width .4s"></div>
      </div>
    </div>`;
  }).join('');
}
