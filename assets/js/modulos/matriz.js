// ============================================================
// MÓDULO MATRIZ DE CONSECUENCIAS — React/JSX (transpilado por Babel standalone)
// ============================================================

const { useState, useMemo, useEffect, useRef, useCallback } = React;

const IS_ADMIN  = (document.querySelector('meta[name="user-rol"]')?.content || '') === 'administrador';
const USER_NAME = document.querySelector('meta[name="user-nombre"]')?.content || '';

// ── Datos por defecto ──────────────────────────────────────────────────────
const DEFAULT_DATA = [
  { id:1,  tipo:"Seguridad Vial",       vigencia:"6 meses",      criticidad:"Grave",       motivo:"Exceso de velocidad > 15 KM/H dentro de CD",                                                                                                           v1:"Reinducción / Amonestación escrita y acuerdo compromiso", v2:"Suspensión 2 días",   v3:"Suspensión 3 días",   v4:"Desvinculación", v5:"" },
  { id:2,  tipo:"Seguridad Vial",       vigencia:"6 meses",      criticidad:"Grave",       motivo:"Frenadas o aceleraciones bruscas (Por negligencias del conductor)",                                                                                      v1:"Reinducción / Amonestación escrita y acuerdo compromiso", v2:"Suspensión 2 días",   v3:"Suspensión 3 días",   v4:"Desvinculación", v5:"" },
  { id:3,  tipo:"Seguridad Vial",       vigencia:"No reingreso", criticidad:"Muy Grave",   motivo:"Incidentes sin lesión por malos hábitos de conducción",                                                                                                  v1:"Suspensión 1 semana",                                    v2:"Desvinculación",       v3:"",                    v4:"",               v5:"" },
  { id:4,  tipo:"Seguridad Vial",       vigencia:"6 meses",      criticidad:"Muy Grave",   motivo:"Conducir haciendo uso de elemento distractor: celular, comiendo, dispositivos electrónicos en general, fumar",                                          v1:"Reinducción / Amonestación escrita y acuerdo compromiso", v2:"Suspensión 2 días",   v3:"Desvinculación",      v4:"",               v5:"" },
  { id:5,  tipo:"Seguridad Vial",       vigencia:"6 meses",      criticidad:"Muy Grave",   motivo:"Exceso de velocidad > 70 KM/H fuera del CD",                                                                                                            v1:"Suspensión 2 días / Reinducción / Amonestación escrita",  v2:"Suspensión 1 semana", v3:"Desvinculación",      v4:"",               v5:"" },
  { id:6,  tipo:"Seguridad Vial",       vigencia:"6 meses",      criticidad:"Muy Grave",   motivo:"Exceso de Velocidad en Ruta Crítica (curvas de 30 y 40 km/h)",                                                                                          v1:"Reinducción / Amonestación escrita y acuerdo compromiso", v2:"Suspensión 2 días",   v3:"Desvinculación",      v4:"",               v5:"" },
  { id:7,  tipo:"Seguridad Vial",       vigencia:"6 meses",      criticidad:"Muy Grave",   motivo:"Conducción distraída",                                                                                                                                   v1:"Reinducción / Amonestación escrita y acuerdo compromiso", v2:"Suspensión 2 días",   v3:"Desvinculación",      v4:"",               v5:"" },
  { id:8,  tipo:"Seguridad Vial",       vigencia:"6 meses",      criticidad:"Muy Grave",   motivo:"Obstrucción de cámaras",                                                                                                                                 v1:"Reinducción / Amonestación escrita y acuerdo compromiso", v2:"Suspensión 2 días",   v3:"Desvinculación",      v4:"",               v5:"" },
  { id:9,  tipo:"Seguridad Vial",       vigencia:"6 meses",      criticidad:"Muy Grave",   motivo:"Exceso de tripulación y/o personal externo en cabina",                                                                                                   v1:"Suspensión 1 semana",                                    v2:"Desvinculación",       v3:"",                    v4:"",               v5:"" },
  { id:10, tipo:"Seguridad Vial",       vigencia:"6 meses",      criticidad:"Muy Grave",   motivo:"No usar Cinturón de seguridad (conductor y/o tripulantes)",                                                                                              v1:"Reinducción / Amonestación escrita y acuerdo compromiso", v2:"Suspensión 2 días",   v3:"Desvinculación",      v4:"",               v5:"" },
  { id:11, tipo:"Seguridad Vial",       vigencia:"6 meses",      criticidad:"Muy Grave",   motivo:"Realizar maniobra de retroceso en la ruta sin guía",                                                                                                    v1:"Reinducción / Amonestación escrita y acuerdo compromiso", v2:"Suspensión 2 días",   v3:"Desvinculación",      v4:"",               v5:"" },
  { id:12, tipo:"Seguridad Vial",       vigencia:"6 meses",      criticidad:"Muy Crítico", motivo:"Incumplimiento a señales de tránsito o disposiciones del reglamento nacional de tránsito",                                                               v1:"Suspensión 2 días / Reinducción / Amonestación escrita",  v2:"Suspensión 1 semana", v3:"Desvinculación",      v4:"",               v5:"" },
  { id:13, tipo:"Seguridad Vial",       vigencia:"No reingreso", criticidad:"Muy Crítico", motivo:"LTI / TRI / SIF por malos hábitos de conducción",                                                                                                       v1:"Desvinculación",                                         v2:"",                    v3:"",                    v4:"",               v5:"" },
  { id:14, tipo:"Prevención Violencia", vigencia:"6 meses",      criticidad:"Muy Grave",   motivo:"Incumplimiento de la política de efectivo: portar más de 200 soles (+ vuelta) en el bolsillo",                                                          v1:"Reinducción, Amonestación escrita y acuerdo compromiso",  v2:"Suspensión 2 días",   v3:"Desvinculación",      v4:"",               v5:"" },
  { id:15, tipo:"Prevención Violencia", vigencia:"6 meses",      criticidad:"Muy Grave",   motivo:"Aceptar pago en efectivo de un cliente N3",                                                                                                              v1:"Reinducción, Amonestación escrita y acuerdo compromiso",  v2:"Suspensión 2 días",   v3:"Desvinculación",      v4:"",               v5:"" },
  { id:16, tipo:"Prevención Violencia", vigencia:"6 meses",      criticidad:"Muy Grave",   motivo:"Recolectar pago en efectivo de clientes multiparadas y no depositar en caja fuerte",                                                                     v1:"Reinducción, Amonestación escrita y acuerdo compromiso",  v2:"Suspensión 2 días",   v3:"Desvinculación",      v4:"",               v5:"" },
  { id:17, tipo:"Prevención Violencia", vigencia:"6 meses",      criticidad:"Muy Grave",   motivo:"No cumplir con protocolo de respuesta ante robos asaltos: alertas mediante botón de pánico",                                                             v1:"Reinducción, Amonestación escrita y acuerdo compromiso",  v2:"Suspensión 2 días",   v3:"Desvinculación",      v4:"",               v5:"" },
  { id:18, tipo:"Prevención Violencia", vigencia:"No reingreso", criticidad:"Muy Grave",   motivo:"Incidente sin lesión por incumplimiento a protocolos 360",                                                                                               v1:"Reinducción, Amonestación escrita y acuerdo compromiso",  v2:"Desvinculación",      v3:"",                    v4:"",               v5:"" },
  { id:19, tipo:"Prevención Violencia", vigencia:"6 meses",      criticidad:"Muy Grave",   motivo:"Incidente sin lesión por incumplimiento a política de efectivo",                                                                                         v1:"Reinducción, Amonestación escrita y acuerdo compromiso",  v2:"Desvinculación",      v3:"",                    v4:"",               v5:"" },
  { id:20, tipo:"Prevención Violencia", vigencia:"No reingreso", criticidad:"Muy Crítico", motivo:"Robo de producto en cochera, cliente, cobranza y/o objetos del cliente",                                                                                 v1:"Desvinculación",                                         v2:"",                    v3:"",                    v4:"",               v5:"" },
  { id:21, tipo:"Seguridad",            vigencia:"6 meses",      criticidad:"Bajo",        motivo:"Usar celular mientras camina y/o sube las escaleras",                                                                                                    v1:"Llamada de atención",                                    v2:"Amonestación Escrita", v3:"Suspensión 1 día",    v4:"Suspensión 1 semana", v5:"Desvinculación" },
  { id:22, tipo:"Seguridad",            vigencia:"6 meses",      criticidad:"Grave",       motivo:"Usar cadenas, collares, pulseras o reloj mientras se están realizando las funciones de reparto",                                                         v1:"Amonestación Escrita",                                   v2:"Suspensión 1 día",    v3:"Suspensión 1 semana", v4:"Desvinculación", v5:"" },
  { id:23, tipo:"Seguridad",            vigencia:"6 meses",      criticidad:"Grave",       motivo:"Personal de reparto no respeta senderos peatonales dentro del CD",                                                                                       v1:"Amonestación Escrita",                                   v2:"Suspensión 1 día",    v3:"Suspensión 1 semana", v4:"Desvinculación", v5:"" },
  { id:24, tipo:"Seguridad",            vigencia:"6 meses",      criticidad:"Grave",       motivo:"No usar EPPS completo y adecuadamente",                                                                                                                  v1:"Amonestación Escrita",                                   v2:"Suspensión 1 día",    v3:"Suspensión 1 semana", v4:"Desvinculación", v5:"" },
  { id:25, tipo:"Seguridad",            vigencia:"6 meses",      criticidad:"Grave",       motivo:"Incumplimiento al protocolo de carga y descarga en POC según SOP Ejecución de Ruta",                                                                    v1:"Amonestación Escrita",                                   v2:"Suspensión 1 día",    v3:"Suspensión 1 semana", v4:"Desvinculación", v5:"" },
  { id:26, tipo:"Seguridad",            vigencia:"6 meses",      criticidad:"Grave",       motivo:"Incumplimiento al protocolo de carga y descarga en APT/CD",                                                                                              v1:"Amonestación Escrita",                                   v2:"Suspensión 1 día",    v3:"Suspensión 1 semana", v4:"Desvinculación", v5:"" },
  { id:27, tipo:"Seguridad",            vigencia:"6 meses",      criticidad:"Muy Grave",   motivo:"Conductor no respeta el plan de tráfico del CD",                                                                                                         v1:"Suspensión 1 día",                                       v2:"Suspensión 1 semana", v3:"Desvinculación",      v4:"",               v5:"" },
  { id:28, tipo:"Seguridad",            vigencia:"6 meses",      criticidad:"Muy Grave",   motivo:"Ingreso del personal de reparto a lugares no autorizados del CD",                                                                                        v1:"Suspensión 1 día",                                       v2:"Suspensión 1 semana", v3:"Desvinculación",      v4:"",               v5:"" },
  { id:29, tipo:"Seguridad",            vigencia:"6 meses",      criticidad:"Muy Grave",   motivo:"Incumplimiento reglas de Oro",                                                                                                                           v1:"Suspensión 1 día",                                       v2:"Suspensión 1 semana", v3:"Desvinculación",      v4:"",               v5:"" },
  { id:30, tipo:"Seguridad",            vigencia:"18 meses",     criticidad:"Muy Crítico", motivo:"Personal en estado etílico y/o con síntomas de uso de estupefacientes",                                                                                  v1:"Desvinculación",                                         v2:"",                    v3:"",                    v4:"",               v5:"" },
  { id:31, tipo:"Políticas",            vigencia:"6 meses",      criticidad:"Bajo",        motivo:"No estacionar en reversa en la cochera establecida",                                                                                                     v1:"Llamada de atención",                                    v2:"Amonestación Escrita", v3:"Suspensión 1 día",    v4:"Suspensión 1 semana", v5:"Desvinculación" },
  { id:32, tipo:"Políticas",            vigencia:"6 meses",      criticidad:"Bajo",        motivo:"Tardanza del personal de reparto",                                                                                                                       v1:"Llamada de atención",                                    v2:"Amonestación Escrita", v3:"Suspensión 1 día",    v4:"Suspensión 1 semana", v5:"Desvinculación" },
  { id:33, tipo:"Políticas",            vigencia:"6 meses",      criticidad:"Bajo",        motivo:"Incumplimiento de 5S en el vehículo",                                                                                                                    v1:"Llamada de atención",                                    v2:"Amonestación Escrita", v3:"Suspensión 1 día",    v4:"Suspensión 1 semana", v5:"Desvinculación" },
  { id:34, tipo:"Políticas",            vigencia:"6 meses",      criticidad:"Bajo",        motivo:"Inasistencia del personal de reparto",                                                                                                                   v1:"Llamada de atención",                                    v2:"Amonestación Escrita", v3:"Suspensión 1 día",    v4:"Suspensión 1 semana", v5:"Desvinculación" },
  { id:35, tipo:"Políticas",            vigencia:"6 meses",      criticidad:"Grave",       motivo:"No retirar la llave al bajar de la unidad",                                                                                                              v1:"Amonestación Escrita",                                   v2:"Suspensión 1 día",    v3:"Suspensión 1 semana", v4:"Desvinculación", v5:"" },
  { id:36, tipo:"Políticas",            vigencia:"6 meses",      criticidad:"Grave",       motivo:"No utilizar bandeja de camión para realizar la verificación de mercadería, carga o descarga de los productos",                                           v1:"Amonestación Escrita",                                   v2:"Suspensión 1 día",    v3:"Suspensión 1 semana", v4:"Desvinculación", v5:"" },
  { id:37, tipo:"Políticas",            vigencia:"6 meses",      criticidad:"Grave",       motivo:"Mala atención y/o conducta en el POC (Mercado)",                                                                                                        v1:"Amonestación Escrita",                                   v2:"Suspensión 1 día",    v3:"Suspensión 1 semana", v4:"Desvinculación", v5:"" },
  { id:38, tipo:"Políticas",            vigencia:"6 meses",      criticidad:"Grave",       motivo:"Demora en la solución de reclamos cuando es responsabilidad de la tripulación",                                                                          v1:"Amonestación Escrita",                                   v2:"Suspensión 1 día",    v3:"Suspensión 1 semana", v4:"Desvinculación", v5:"" },
  { id:39, tipo:"Políticas",            vigencia:"6 meses",      criticidad:"Muy Grave",   motivo:"Mala conducta con personal de Transportadoras o Cervecería",                                                                                             v1:"Suspensión 1 día",                                       v2:"Suspensión 1 semana", v3:"Desvinculación",      v4:"",               v5:"" },
  { id:40, tipo:"Políticas",            vigencia:"18 meses",     criticidad:"Muy Grave",   motivo:"Conducir un vehículo con la categoría no correspondiente",                                                                                               v1:"Suspensión 3 días",                                      v2:"Desvinculación",      v3:"",                    v4:"",               v5:"" },
  { id:41, tipo:"Políticas",            vigencia:"6 meses",      criticidad:"Muy Crítico", motivo:"Faltante de dinero, producto terminado y/o envases en la liquidación",                                                                                   v1:"Desvinculación",                                         v2:"",                    v3:"",                    v4:"",               v5:"" },
  { id:42, tipo:"Políticas",            vigencia:"6 meses",      criticidad:"Muy Crítico", motivo:"Manipulación y/o deterioro de Dashcam",                                                                                                                  v1:"Suspensión 3 días",                                      v2:"Desvinculación",      v3:"",                    v4:"",               v5:"" },
  { id:43, tipo:"Políticas",            vigencia:"6 meses",      criticidad:"Bajo",        motivo:"Atención POC crítico sin autorización y/o no reporte del mismo (Reportar en BEES Delivery y Roadmap; Safety Champion evalúa criticidad del POC)",        v1:"Llamada de atención",                                    v2:"Amonestación Escrita", v3:"Suspensión 1 día",    v4:"Suspensión 1 semana", v5:"" },
  { id:44, tipo:"Seguridad Vial",       vigencia:"6 meses",      criticidad:"Grave",       motivo:"No realizar inspección pre operacional checklist",                                                                                                          v1:"Reinducción, Amonestación escrita y acuerdo compromiso", v2:"Suspensión 2 días",   v3:"Desvinculación",      v4:"",               v5:"" },
];

// Paleta semántica tokenizada: los valores reales viven en main.css y cambian
// con el tema (claro = texto oscuro saturado / oscuro = texto vivo translúcido).
const SEM = k => ({ color:`var(--mtz-${k}-fg)`, bg:`var(--mtz-${k}-bg)`, border:`var(--mtz-${k}-bd)` });

const TIPO_CFG = {
  "Seguridad Vial":       { ...SEM("info"), k:"info", icon:"🛣️" },
  "Prevención Violencia": { ...SEM("crit"), k:"crit", icon:"🛡️" },
  "Seguridad":            { ...SEM("ok"),   k:"ok",   icon:"⚠️" },
  "Políticas":            { ...SEM("low"),  k:"low",  icon:"📋" },
};
const CRIT_CFG = {
  "Bajo":        { ...SEM("low"),  k:"low"  },
  "Grave":       { ...SEM("warn"), k:"warn" },
  "Muy Grave":   { ...SEM("high"), k:"high" },
  "Muy Crítico": { ...SEM("crit"), k:"crit" },
};
const VIG_CFG = {
  "6 meses":      { ...SEM("ok"),   k:"ok"   },
  "No reingreso": { ...SEM("crit"), k:"crit" },
  "18 meses":     { ...SEM("warn"), k:"warn" },
};

// Equivalente impreso de la paleta semántica (el PDF siempre va sobre papel
// blanco, así que usa los valores del tema claro en RGB).
const PDF_PAL = {
  info: { fg:[23,86,143],  bg:[231,240,251] },
  ok:   { fg:[11,107,79],  bg:[226,244,237] },
  warn: { fg:[133,86,10],  bg:[252,242,218] },
  high: { fg:[160,67,30],  bg:[251,235,227] },
  crit: { fg:[168,31,26],  bg:[251,232,231] },
  low:  { fg:[85,52,155],  bg:[239,233,250] },
};
const TIPOS_ALL = ["Seguridad Vial","Prevención Violencia","Seguridad","Políticas"];
const CRITS_ALL = ["Bajo","Grave","Muy Grave","Muy Crítico"];
const VIGS_ALL  = ["6 meses","No reingreso","18 meses"];
const BLANK_ROW = { tipo:"Seguridad Vial", vigencia:"6 meses", motivo:"", criticidad:"Grave", v1:"", v2:"", v3:"", v4:"", v5:"" };
const LS_KEY    = "dist-segura-matriz-v2";

// Clasificador único de severidad — lo consumen la tabla en pantalla y el PDF,
// para que ambos rendericen exactamente la misma escala de color.
function severityKey(text) {
  if (!text) return null;
  const t = String(text).toLowerCase();
  if (t.includes("desvinculación")) return "crit";
  if (t.includes("semana"))         return "high";
  if (t.includes("suspensión"))     return "warn";
  if (t.includes("amonestación"))   return "ok";
  if (t.includes("llamada") || t.includes("reinducción")) return "info";
  return null;
}

function consecStyle(text) {
  if (!text) return null;
  const k = severityKey(text);
  return k ? SEM(k)
           : { bg:"var(--mtz-surface-2)", color:"var(--mtz-text-muted)", border:"var(--mtz-border-2)" };
}

// ── Toast ──────────────────────────────────────────────────────────────────
function MatrizToast({ toasts }) {
  return (
    <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,display:"flex",flexDirection:"column",gap:8}}>
      {toasts.map(t=>(
        <div key={t.id} style={{
          background:t.type==="error"?"#7f1d1d":t.type==="warn"?"#713f12":"#14532d",
          border:`1px solid ${t.type==="error"?"#ef4444":t.type==="warn"?"#eab308":"#22c55e"}`,
          color:"#FFFFFF",padding:"10px 16px",borderRadius:8,fontSize:13,fontWeight:500,
          maxWidth:360,boxShadow:"0 4px 16px rgba(0,0,0,.25)",display:"flex",alignItems:"center",gap:10
        }}>
          <i className={`fas fa-${t.type==="error"?"times-circle":t.type==="warn"?"exclamation-triangle":"check-circle"}`}></i>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────
function MatrizModal({ title, onClose, children, width=700 }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
         onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"var(--mtz-surface)",border:"1px solid var(--mtz-border)",borderRadius:5,width:"100%",maxWidth:width,maxHeight:"90vh",overflow:"auto",boxShadow:"0 4px 24px rgba(0,0,0,.18)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 20px",borderBottom:"1px solid var(--mtz-border)",position:"sticky",top:0,background:"var(--mtz-surface)",zIndex:1}}>
          <h2 style={{fontSize:14,fontWeight:700,color:"var(--mtz-text)",margin:0}}>{title}</h2>
          <button onClick={onClose} style={{background:"none",border:"none",color:"var(--mtz-text-muted)",fontSize:18,cursor:"pointer",lineHeight:1,padding:"2px 6px"}}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div style={{padding:"16px 20px"}}>{children}</div>
      </div>
    </div>
  );
}

// ── RowForm ────────────────────────────────────────────────────────────────
const ROW_FORM_INP = {background:"var(--mtz-surface-2)",border:"1px solid var(--mtz-border-2)",color:"var(--mtz-text)",borderRadius:4,padding:"7px 10px",fontSize:13,width:"100%",fontFamily:"'Barlow',sans-serif",outline:"none",boxSizing:"border-box"};
const ROW_FORM_LBL = {fontSize:10,fontWeight:700,color:"var(--mtz-text-3)",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:4,display:"block"};
const ROW_FORM_GRP = {marginBottom:12};

function RowForm({ row, onSave, onCancel }) {
  const [form, setForm] = useState({...BLANK_ROW,...(row||{})});
  const set = (k) => (e) => setForm(f=>({...f,[k]:e.target.value}));
  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 18px"}}>
        <div style={ROW_FORM_GRP}>
          <label style={ROW_FORM_LBL}>Tipo</label>
          <select style={{...ROW_FORM_INP,cursor:"pointer"}} value={form.tipo} onChange={set("tipo")}>
            {TIPOS_ALL.map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
        <div style={ROW_FORM_GRP}>
          <label style={ROW_FORM_LBL}>Vigencia</label>
          <select style={{...ROW_FORM_INP,cursor:"pointer"}} value={form.vigencia} onChange={set("vigencia")}>
            {VIGS_ALL.map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
        <div style={ROW_FORM_GRP}>
          <label style={ROW_FORM_LBL}>Criticidad</label>
          <select style={{...ROW_FORM_INP,cursor:"pointer"}} value={form.criticidad} onChange={set("criticidad")}>
            {CRITS_ALL.map(o=><option key={o}>{o}</option>)}
          </select>
        </div>
      </div>
      <div style={ROW_FORM_GRP}>
        <label style={ROW_FORM_LBL}>Motivo / Infracción</label>
        <textarea style={{...ROW_FORM_INP,minHeight:68,resize:"vertical"}} value={form.motivo} onChange={set("motivo")}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 18px"}}>
        {[["v1","1ra vez"],["v2","2da vez"],["v3","3ra vez"],["v4","4ta vez"],["v5","5ta vez"]].map(([k,lbl])=>(
          <div key={k} style={ROW_FORM_GRP}>
            <label style={ROW_FORM_LBL}>{lbl}</label>
            <input style={ROW_FORM_INP} value={form[k]} onChange={set(k)}/>
          </div>
        ))}
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
        <button onClick={onCancel} style={{padding:"8px 18px",borderRadius:4,border:"1px solid #CDD3D8",background:"none",color:"#73879C",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"'Barlow',sans-serif"}}>Cancelar</button>
        <button onClick={()=>onSave(form)} style={{padding:"8px 20px",borderRadius:4,border:"none",background:"#F5C800",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Barlow',sans-serif"}}>
          {row ? "Guardar cambios" : "Agregar fila"}
        </button>
      </div>
    </div>
  );
}

// ── ImportPreview ──────────────────────────────────────────────────────────
function ImportPreview({ rows, onConfirm, onCancel }) {
  const [mode, setMode] = useState("replace");
  return (
    <div>
      <div style={{marginBottom:14,padding:"12px 16px",background:"#F5F7FA",borderRadius:4,border:"1px solid #E6E9ED"}}>
        <p style={{fontSize:13,color:"#73879C",marginBottom:10}}>
          Se encontraron <strong style={{color:"#2A3F54"}}>{rows.length} filas</strong>. ¿Cómo deseas importar?
        </p>
        <div style={{display:"flex",gap:10}}>
          {[["replace","Reemplazar todo"],["append","Agregar al final"]].map(([v,l])=>(
            <button key={v} onClick={()=>setMode(v)} style={{padding:"6px 14px",borderRadius:4,fontSize:12,fontWeight:600,cursor:"pointer",border:`1px solid ${mode===v?"#F5C800":"#CDD3D8"}`,background:mode===v?"rgba(245,200,0,.08)":"none",color:mode===v?"#F5C800":"#73879C",fontFamily:"'Barlow',sans-serif"}}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{maxHeight:250,overflow:"auto",border:"1px solid #E6E9ED",borderRadius:4}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
          <thead>
            <tr style={{background:"#F5F7FA"}}>
              {["Tipo","Vigencia","Criticidad","Motivo (extracto)","1ra Vez"].map(h=>(
                <th key={h} style={{padding:"8px 10px",color:"#98A6AD",fontWeight:700,textAlign:"left",borderBottom:"1px solid #E6E9ED",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0,20).map((r,i)=>(
              <tr key={i} style={{borderBottom:"1px solid #F5F7FA"}}>
                <td style={{padding:"6px 10px",color:"#555"}}>{r.tipo}</td>
                <td style={{padding:"6px 10px",color:"#98A6AD"}}>{r.vigencia}</td>
                <td style={{padding:"6px 10px",color:"#555"}}>{r.criticidad}</td>
                <td style={{padding:"6px 10px",color:"#2A3F54",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.motivo}</td>
                <td style={{padding:"6px 10px",color:"#98A6AD",maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.v1}</td>
              </tr>
            ))}
            {rows.length>20 && <tr><td colSpan={5} style={{padding:"8px 10px",color:"#98A6AD",textAlign:"center"}}>...y {rows.length-20} filas más</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:14}}>
        <button onClick={onCancel} style={{padding:"8px 18px",borderRadius:4,border:"1px solid #CDD3D8",background:"none",color:"#73879C",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"'Barlow',sans-serif"}}>Cancelar</button>
        <button onClick={()=>onConfirm(rows,mode)} style={{padding:"8px 20px",borderRadius:4,border:"none",background:"#F5C800",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Barlow',sans-serif"}}>
          <i className="fas fa-check" style={{marginRight:6}}></i>Confirmar importación
        </button>
      </div>
    </div>
  );
}

// ── App principal ──────────────────────────────────────────────────────────
function MatrizApp() {
  const [data, setData]          = useState(DEFAULT_DATA);
  const [search, setSearch]      = useState("");
  const [tipoF, setTipoF]        = useState("Todos");
  const [critF, setCritF]        = useState("Todas");
  const [sortF, setSortF]        = useState(null);
  const [sortD, setSortD]        = useState("asc");
  const [expandedId, setExp]     = useState(null);
  const [editRow, setEditRow]    = useState(null);
  const [importRows, setImpRows] = useState(null);
  const [deleteId, setDelId]     = useState(null);
  const [toasts, setToasts]      = useState([]);
  const fileRef = useRef();

  useEffect(()=>{
    try { const s = localStorage.getItem(LS_KEY); if(s) setData(JSON.parse(s)); } catch {}
  },[]);

  const persist = useCallback(rows=>{
    try { localStorage.setItem(LS_KEY, JSON.stringify(rows)); } catch {}
  },[]);

  const addToast = (msg, type="ok") => {
    const id = Date.now();
    setToasts(t=>[...t,{id,msg,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)), 3500);
  };

  const saveData   = rows => { setData(rows); persist(rows); };
  const handleAdd  = form => { const id=Math.max(0,...data.map(d=>d.id))+1; saveData([...data,{...form,id}]); setEditRow(null); addToast("Fila agregada"); };
  const handleEdit = form => { saveData(data.map(r=>r.id===form.id?form:r)); setEditRow(null); addToast("Fila actualizada"); };
  const handleDel  = id   => { saveData(data.filter(r=>r.id!==id)); setDelId(null); addToast("Fila eliminada","warn"); };

  const handleImportConfirm = (rows, mode) => {
    let maxId = Math.max(0,...data.map(d=>d.id));
    const newRows = rows.map(r=>({...r,id:++maxId}));
    saveData(mode==="replace" ? newRows : [...data,...newRows]);
    setImpRows(null);
    addToast(`${newRows.length} filas importadas (${mode==="replace"?"reemplazo":"agregadas"})`);
  };

  const handleFile = e => {
    const file = e.target.files[0]; if(!file) return; e.target.value="";
    const ext  = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        let rows = [];
        if (ext==="csv") {
          const lines = ev.target.result.trim().split("\n");
          const hdrs  = lines[0].split(",").map(h=>h.trim().replace(/"/g,"").toLowerCase());
          rows = lines.slice(1).filter(l=>l.trim()).map(line=>{
            const vals = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(v=>v.trim().replace(/^"|"$/g,""));
            const obj={}; hdrs.forEach((h,i)=>{ obj[h]=vals[i]||""; });
            return {tipo:obj.tipo||"Seguridad Vial",vigencia:obj.vigencia||"6 meses",motivo:obj.motivo||"",criticidad:obj.criticidad||"Grave",v1:obj.v1||"",v2:obj.v2||"",v3:obj.v3||"",v4:obj.v4||"",v5:obj.v5||""};
          });
        } else {
          const wb   = XLSX.read(ev.target.result,{type:"array"});
          const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:""});
          rows = json.map(r=>({
            tipo:r.tipo||r.TIPO||"Seguridad Vial", vigencia:r.vigencia||r.VIGENCIA||"6 meses",
            motivo:r.motivo||r.MOTIVO||"",         criticidad:r.criticidad||r.CRITICIDAD||"Grave",
            v1:r.v1||r["1ERA VEZ"]||"", v2:r.v2||r["2DA VEZ"]||"",
            v3:r.v3||r["3ERA VEZ"]||"", v4:r.v4||r["4TA VEZ"]||"", v5:r.v5||r["5TA VEZ"]||""
          }));
        }
        if(!rows.length){ addToast("No se encontraron filas válidas","error"); return; }
        setImpRows(rows);
      } catch(err){ addToast("Error al leer archivo: "+err.message,"error"); }
    };
    if(ext==="csv") reader.readAsText(file,"UTF-8"); else reader.readAsArrayBuffer(file);
  };

  const exportCSV = rows => {
    const e = v=>`"${String(v||"").replace(/"/g,'""')}"`;
    const head = ["Tipo","Vigencia","Motivo","Criticidad","1ERA VEZ","2DA VEZ","3ERA VEZ","4TA VEZ","5TA VEZ"].map(e).join(",");
    const body = rows.map(r=>[r.tipo,r.vigencia,r.motivo,r.criticidad,r.v1,r.v2,r.v3,r.v4,r.v5].map(e).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿"+head+"\n"+body],{type:"text/csv;charset=utf-8"}));
    a.download = `matriz_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    addToast("CSV exportado");
  };

  const exportXLSX = rows => {
    const wsData = [
      ["Tipo","Vigencia","Motivo","Criticidad","1ERA VEZ","2DA VEZ","3ERA VEZ","4TA VEZ","5TA VEZ"],
      ...rows.map(r=>[r.tipo,r.vigencia,r.motivo,r.criticidad,r.v1,r.v2,r.v3,r.v4,r.v5])
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [14,12,50,14,28,22,22,22,22].map(w=>({wch:w}));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Matriz");
    XLSX.writeFile(wb,`matriz_${new Date().toISOString().slice(0,10)}.xlsx`);
    addToast("Excel exportado");
  };

  // Contexto de filtros aplicados — se imprime en el PDF para que el documento
  // sea auditable (qué subconjunto de la matriz se exportó y cuándo).
  const filtroTxt = () => {
    const p = [];
    if (tipoF !== "Todos") p.push(`Tipo: ${tipoF}`);
    if (critF !== "Todas") p.push(`Criticidad: ${critF}`);
    if (search.trim())     p.push(`Búsqueda: "${search.trim()}"`);
    return p.length ? p.join(" · ") : "Sin filtros aplicados";
  };

  const exportPDF = rows => {
    const JsPDF = window.jspdf?.jsPDF;
    if (!JsPDF) { addToast("Módulo PDF no disponible","error"); return; }
    if (!rows.length) { addToast("No hay filas que exportar","warn"); return; }

    const doc = new JsPDF({ orientation:"landscape", unit:"mm", format:"a4" });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const fecha = new Date().toLocaleDateString("es-PE",{day:"2-digit",month:"2-digit",year:"numeric"});

    const drawHeader = () => {
      doc.setFillColor(245,200,0); doc.rect(0,0,W,3.2,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(14); doc.setTextColor(31,45,61);
      doc.text("MATRIZ DE CONSECUENCIAS", 8, 13);
      doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(110,124,143);
      doc.text(`Tripulantes de Reparto · ${rows.length} infracciones · ${filtroTxt()}`, 8, 18.4);
      doc.text(`Generado ${fecha}${USER_NAME ? " · " + USER_NAME : ""}`, W-8, 18.4, {align:"right"});
      doc.setDrawColor(228,231,237); doc.setLineWidth(0.25); doc.line(8, 21, W-8, 21);
    };

    doc.autoTable({
      startY: 25,
      margin: { left:8, right:8, top:25, bottom:12 },
      head: [["Tipo","Vigencia","Motivo / Infracción","Criticidad","1ra vez","2da vez","3ra vez","4ta vez","5ta vez"]],
      body: rows.map(r=>[r.tipo,r.vigencia,r.motivo,r.criticidad,r.v1||"—",r.v2||"—",r.v3||"—",r.v4||"—",r.v5||"—"]),
      theme: "grid",
      styles: { font:"helvetica", fontSize:6.5, cellPadding:1.7, lineColor:[228,231,237], lineWidth:0.1,
                valign:"middle", overflow:"linebreak", textColor:[31,45,61] },
      headStyles: { fillColor:[42,63,84], textColor:[255,255,255], fontSize:6.4, fontStyle:"bold", lineWidth:0 },
      alternateRowStyles: { fillColor:[250,251,252] },
      columnStyles: {
        0:{cellWidth:26, fontStyle:"bold"}, 1:{cellWidth:17, halign:"center", fontSize:6},
        2:{cellWidth:70}, 3:{cellWidth:20, halign:"center", fontStyle:"bold"},
        4:{cellWidth:30}, 5:{cellWidth:30}, 6:{cellWidth:30}, 7:{cellWidth:29}, 8:{cellWidth:29},
      },
      didParseCell: d => {
        if (d.section !== "body") return;
        const i = d.column.index, raw = d.cell.raw;
        const key = i===0 ? TIPO_CFG[raw]?.k
                  : i===1 ? VIG_CFG[raw]?.k
                  : i===3 ? CRIT_CFG[raw]?.k
                  : i>=4  ? severityKey(raw) : null;
        if (key && PDF_PAL[key]) {
          d.cell.styles.fillColor = PDF_PAL[key].bg;
          d.cell.styles.textColor = PDF_PAL[key].fg;
        }
        if (raw === "—") { d.cell.styles.textColor = [186,194,205]; d.cell.styles.halign = "center"; }
      },
      didDrawPage: drawHeader,
    });

    const total = doc.internal.getNumberOfPages();
    for (let p=1; p<=total; p++) {
      doc.setPage(p);
      doc.setFont("helvetica","normal"); doc.setFontSize(6.5); doc.setTextColor(150,158,170);
      doc.text("Distribución Segura · Documento generado automáticamente", 8, H-5);
      doc.text(`Página ${p} de ${total}`, W-8, H-5, {align:"right"});
    }
    doc.save(`matriz_${new Date().toISOString().slice(0,10)}.pdf`);
    addToast(`PDF exportado (${rows.length} filas, ${total} pág.)`);
  };

  const exportPNG = async () => {
    if (!window.html2canvas) { addToast("Módulo de captura no disponible","error"); return; }
    const el = document.getElementById("mtz-table-wrap");
    if (!el) { addToast("No se encontró la tabla","error"); return; }
    addToast("Generando imagen PNG...");
    // La tabla vive en un contenedor con scroll horizontal: hay que expandirla
    // en el clon para que la captura incluya las columnas fuera de vista.
    const fullW = el.scrollWidth;
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--mtz-surface").trim() || "#ffffff";
    try {
      const canvas = await html2canvas(el, {
        scale: 2, backgroundColor: bg, logging: false, useCORS: true,
        width: fullW, windowWidth: Math.max(fullW + 80, document.documentElement.clientWidth),
        onclone: d => {
          const c = d.getElementById("mtz-table-wrap");
          if (c) { c.style.overflow = "visible"; c.style.width = fullW+"px"; c.style.maxWidth = "none"; }
        },
      });
      const a = document.createElement("a");
      a.download = `matriz_${new Date().toISOString().slice(0,10)}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
      addToast("PNG exportado");
    } catch (err) {
      addToast("No se pudo generar el PNG: "+err.message, "error");
    }
  };

  const exportTemplate = () => {
    const wsData = [
      ["tipo","vigencia","motivo","criticidad","v1","v2","v3","v4","v5"],
      ["Seguridad Vial","6 meses","Descripción de la infracción","Grave","1ra consecuencia","2da consecuencia","3ra consecuencia","",""]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [18,14,50,14,28,22,22,22,22].map(w=>({wch:w}));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,"Plantilla");
    XLSX.writeFile(wb,"plantilla_matriz.xlsx");
    addToast("Plantilla descargada");
  };

  const filtered = useMemo(()=>{
    let rows = [...data];
    if(tipoF!=="Todos") rows = rows.filter(r=>r.tipo===tipoF);
    if(critF!=="Todas") rows = rows.filter(r=>r.criticidad===critF);
    if(search.trim()){ const q=search.toLowerCase(); rows=rows.filter(r=>r.motivo.toLowerCase().includes(q)||r.tipo.toLowerCase().includes(q)||r.criticidad.toLowerCase().includes(q)); }
    if(sortF) rows.sort((a,b)=>sortD==="asc"?String(a[sortF]).localeCompare(String(b[sortF])):String(b[sortF]).localeCompare(String(a[sortF])));
    return rows;
  },[data,tipoF,critF,search,sortF,sortD]);

  const handleSort = f => { if(sortF===f) setSortD(d=>d==="asc"?"desc":"asc"); else { setSortF(f); setSortD("asc"); } };
  const byTipo = TIPOS_ALL.map(t=>({t,n:data.filter(r=>r.tipo===t).length}));

  const btnBase = {border:"none",borderRadius:4,padding:"7px 13px",fontSize:12,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"'Barlow',sans-serif",transition:"opacity .15s"};

  return (
    <div style={{fontFamily:"'Barlow',sans-serif",color:"#2A3F54"}}>
      <style>{`
        .mtz-trow{transition:background .12s}
        .mtz-trow:hover{background:var(--mtz-row-hover)!important}
        .mtz-fchip{border:1px solid var(--mtz-border-2);border-radius:4px;padding:4px 11px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;font-family:'Barlow',sans-serif;background:none;color:var(--mtz-text-3)}
        .mtz-fchip:hover{border-color:#F5C800;color:#F5C800}
        .mtz-ibtn{background:none;border:1px solid var(--mtz-border-2);border-radius:4px;padding:4px 8px;color:var(--mtz-text-muted);cursor:pointer;font-size:12px;transition:all .15s}.mtz-ibtn:hover{border-color:var(--mtz-text-muted);color:var(--mtz-text-2)}
        .mtz-scinp{background:var(--mtz-surface-2);border:1px solid var(--mtz-border-2);color:var(--mtz-text);border-radius:4px;padding:7px 10px 7px 34px;font-size:13px;outline:none;font-family:'Barlow',sans-serif;width:100%}.mtz-scinp:focus{border-color:#F5C800;box-shadow:0 0 0 3px rgba(245,200,0,.12)}
        .mtz-th-srt{cursor:pointer;user-select:none}.mtz-th-srt:hover{color:#F5C800}
        .mtz-cq{border-radius:4px;padding:4px 8px;font-size:11.5px;font-weight:600;text-align:center;line-height:1.35;border:1px solid;display:inline-block}
        .mtz-bdg{display:inline-flex;align-items:center;gap:3px;padding:3px 9px;border-radius:999px;font-size:11.5px;font-weight:700;white-space:nowrap;border:1px solid}
        .mtz-tg{display:inline-block;padding:3px 8px;border-radius:3px;font-size:10.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;border:1px solid}
        .mtz-abtn{cursor:pointer;border:none;font-family:'Barlow',sans-serif;transition:opacity .15s}.mtz-abtn:hover{opacity:.82}
      `}</style>

      {/* ── CABECERA ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10,marginBottom:14}}>
        <div>
          <h2 style={{fontFamily:"'Barlow Condensed',sans-serif",fontSize:23,fontWeight:800,color:"var(--mtz-text)",textTransform:"uppercase",letterSpacing:"0.5px",margin:0,lineHeight:1.2}}>
            <i className="fas fa-bolt" style={{color:"#F5C800",marginRight:8}}></i>
            Matriz de Consecuencias
          </h2>
          <p style={{fontSize:12.5,color:"var(--mtz-text-3)",margin:"3px 0 0"}}>Tripulantes de Reparto · {filtered.length} de {data.length} infracciones</p>
        </div>

        <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
          {IS_ADMIN && (
            <span style={{padding:"4px 10px",borderRadius:4,background:"rgba(245,200,0,.1)",border:"1px solid rgba(245,200,0,.3)",color:"#F5C800",fontSize:11,fontWeight:700}}>
              <i className="fas fa-crown" style={{marginRight:5}}></i>{USER_NAME} · Admin
            </span>
          )}
          <button className="mtz-abtn" onClick={()=>exportCSV(filtered)} style={{...btnBase,background:"var(--mtz-surface-2)",color:"var(--mtz-text-3)",border:"1px solid var(--mtz-border-2)"}}>
            <i className="fas fa-file-csv"></i> CSV
          </button>
          <button className="mtz-abtn" onClick={()=>exportXLSX(filtered)} style={{...btnBase,background:"rgba(245,200,0,.08)",color:"#F5C800",border:"1px solid rgba(245,200,0,.3)"}}>
            <i className="fas fa-file-excel"></i> Excel
          </button>
          <button className="mtz-abtn" onClick={()=>exportPDF(filtered)} style={{...btnBase,background:"var(--mtz-crit-bg)",color:"var(--mtz-crit-fg)",border:"1px solid var(--mtz-crit-bd)"}}>
            <i className="fas fa-file-pdf"></i> PDF
          </button>
          <button className="mtz-abtn" onClick={exportPNG} style={{...btnBase,background:"var(--mtz-info-bg)",color:"var(--mtz-info-fg)",border:"1px solid var(--mtz-info-bd)"}}>
            <i className="fas fa-image"></i> PNG
          </button>
          {IS_ADMIN && <>
            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{display:"none"}} onChange={handleFile}/>
            <button className="mtz-abtn" onClick={()=>fileRef.current.click()} style={{...btnBase,background:"var(--mtz-surface-2)",color:"var(--mtz-text-3)",border:"1px solid var(--mtz-border-2)"}}>
              <i className="fas fa-file-import"></i> Importar
            </button>
            <button className="mtz-abtn" onClick={()=>setEditRow("new")} style={{...btnBase,background:"#F5C800",color:"#fff"}}>
              <i className="fas fa-plus"></i> Nueva fila
            </button>
          </>}
        </div>
      </div>

      {/* ── STATS CARDS ── */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:12}}>
        {[{label:"Total",val:data.length,color:"var(--mtz-text)"},...byTipo.map(({t,n})=>({label:t,val:n,color:TIPO_CFG[t]?.color||"var(--mtz-text-2)",icon:TIPO_CFG[t]?.icon}))].map(s=>(
          <div key={s.label} style={{background:"var(--mtz-surface)",border:"1px solid var(--mtz-border)",borderRadius:4,padding:"9px 15px",minWidth:92,borderTop:`3px solid ${s.color}`}}>
            <div style={{fontSize:21,fontWeight:800,color:s.color,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{s.val}</div>
            <div style={{fontSize:10.5,color:"var(--mtz-text-3)",fontWeight:600,marginTop:3}}>{s.icon&&s.icon+" "}{s.label}</div>
          </div>
        ))}
        {IS_ADMIN && <>
          <button className="mtz-abtn" onClick={exportTemplate} style={{...btnBase,background:"#F5F7FA",color:"#73879C",border:"1px solid #CDD3D8",marginLeft:"auto",alignSelf:"center",fontSize:11}}>
            <i className="fas fa-download"></i> Plantilla
          </button>
        </>}
      </div>

      {/* ── FILTROS ── */}
      <div style={{background:"var(--mtz-surface)",border:"1px solid var(--mtz-border)",borderRadius:4,padding:"12px 14px",marginBottom:8,display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{position:"relative",flex:"1 1 200px",maxWidth:280}}>
          <i className="fas fa-search" style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",color:"#98A6AD",fontSize:12,pointerEvents:"none"}}></i>
          <input className="mtz-scinp" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar infracción..."/>
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:10,color:"var(--mtz-text-3)",fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",marginRight:2}}>TIPO:</span>
          {["Todos",...TIPOS_ALL].map(t=>{ const c=TIPO_CFG[t]; const a=tipoF===t; return(
            <button key={t} className="mtz-fchip" onClick={()=>setTipoF(t)} style={{background:a?(c?.bg||"rgba(245,200,0,.1)"):"none",color:a?(c?.color||"#F5C800"):"var(--mtz-text-3)",borderColor:a?(c?.color||"#F5C800"):"var(--mtz-border-2)"}}>
              {c?.icon&&c.icon+" "}{t}
            </button>);
          })}
        </div>
        <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:10,color:"var(--mtz-text-3)",fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",marginRight:2}}>CRITICIDAD:</span>
          {["Todas",...CRITS_ALL].map(c=>{ const cfg=CRIT_CFG[c]; const a=critF===c; return(
            <button key={c} className="mtz-fchip" onClick={()=>setCritF(c)} style={{background:a?(cfg?.bg||"rgba(245,200,0,.1)"):"none",color:a?(cfg?.color||"#F5C800"):"var(--mtz-text-3)",borderColor:a?(cfg?.color||"#F5C800"):"var(--mtz-border-2)"}}>{c}</button>);
          })}
        </div>
      </div>

      {/* ── LEYENDA ── */}
      <div style={{background:"var(--mtz-surface)",border:"1px solid var(--mtz-border)",borderRadius:4,padding:"8px 14px",marginBottom:12,display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:10,color:"var(--mtz-text-3)",fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",marginRight:4}}>LEYENDA:</span>
        {[
          {l:"Llamada / Reinducción", k:"info"},
          {l:"Amonestación Escrita",  k:"ok"},
          {l:"Suspensión",            k:"warn"},
          {l:"Susp. extendida",       k:"high"},
          {l:"Desvinculación",        k:"crit"},
        ].map(x=>{ const s=SEM(x.k); return <div key={x.l} className="mtz-cq" style={{background:s.bg,color:s.color,borderColor:s.border}}>{x.l}</div>; })}
      </div>

      {/* ── TABLA ── */}
      <div id="mtz-table-wrap" style={{background:"var(--mtz-surface)",border:"1px solid var(--mtz-border)",borderRadius:4,overflow:"auto",boxShadow:"0 1px 3px rgba(0,0,0,.05)"}}>
        <table style={{borderCollapse:"collapse",width:"100%",minWidth:IS_ADMIN?1160:1080}}>
          <thead>
            <tr style={{background:"var(--mtz-surface-2)"}}>
              {[
                {l:"Tipo",               k:"tipo",       w:145},
                {l:"Vigencia",           k:"vigencia",   w:100},
                {l:"Motivo / Infracción",k:"motivo",     w:280},
                {l:"Criticidad",         k:"criticidad", w:108},
                {l:"1RA VEZ",k:null,w:155},{l:"2DA VEZ",k:null,w:128},{l:"3RA VEZ",k:null,w:118},{l:"4TA VEZ",k:null,w:115},{l:"5TA VEZ",k:null,w:105},
                ...(IS_ADMIN?[{l:"",k:null,w:75}]:[]),
              ].map(col=>(
                <th key={col.l} className={col.k?"mtz-th-srt":""} onClick={col.k?()=>handleSort(col.k):undefined}
                    style={{padding:"11px 12px",textAlign:"left",fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:".08em",color:"var(--mtz-text-3)",borderBottom:"2px solid #F5C800",whiteSpace:"nowrap",width:col.w}}>
                  {col.l}{col.k&&<span style={{marginLeft:3,opacity:sortF===col.k?1:.3,fontSize:8}}>{sortF===col.k?(sortD==="asc"?"▲":"▼"):"↕"}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!filtered.length && <tr><td colSpan={IS_ADMIN?10:9} style={{textAlign:"center",padding:48,color:"var(--mtz-text-muted)"}}>No hay resultados.</td></tr>}
            {filtered.map((row,i)=>{
              const tc=TIPO_CFG[row.tipo]||{}; const cc=CRIT_CFG[row.criticidad]||{}; const vc=VIG_CFG[row.vigencia]||VIG_CFG["6 meses"];
              const isExp=expandedId===row.id;
              return (
                <tr key={row.id} className="mtz-trow" style={{background:i%2===0?"var(--mtz-surface)":"var(--mtz-row-alt)",cursor:"pointer",borderBottom:"1px solid var(--mtz-border)"}} onClick={()=>setExp(isExp?null:row.id)}>
                  <td style={{padding:"11px 12px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:7}}>
                      <div style={{width:3,height:26,borderRadius:2,background:tc.color||"var(--mtz-border-2)",flexShrink:0}}/>
                      <span style={{fontSize:12,fontWeight:700,color:tc.color||"var(--mtz-text-muted)"}}>{tc.icon} {row.tipo}</span>
                    </div>
                  </td>
                  <td style={{padding:"11px 12px"}}><span className="mtz-tg" style={{background:vc.bg,color:vc.color,borderColor:vc.border}}>{row.vigencia}</span></td>
                  <td style={{padding:"11px 12px"}}>
                    <div style={{color:"var(--mtz-text)",lineHeight:1.45,fontSize:13,fontWeight:500}}>
                      {isExp ? row.motivo : row.motivo.length>78 ? row.motivo.slice(0,76)+"…" : row.motivo}
                      {!isExp && row.motivo.length>78 && <span style={{color:"#F5C800",fontSize:10,marginLeft:4}}>▾</span>}
                    </div>
                  </td>
                  <td style={{padding:"11px 12px"}}><span className="mtz-bdg" style={{background:cc.bg,color:cc.color,borderColor:cc.border}}>{row.criticidad}</span></td>
                  {[row.v1,row.v2,row.v3,row.v4,row.v5].map((v,vi)=>{ const st=consecStyle(v); return(
                    <td key={vi} style={{padding:"11px 10px"}}>
                      {v&&st?<div className="mtz-cq" style={{background:st.bg,color:st.color,borderColor:st.border}}>{v}</div>:<span style={{color:"var(--mtz-border-2)"}}>—</span>}
                    </td>);
                  })}
                  {IS_ADMIN&&(
                    <td style={{padding:"8px 10px"}} onClick={e=>e.stopPropagation()}>
                      <div style={{display:"flex",gap:4}}>
                        <button className="mtz-ibtn" onClick={()=>setEditRow(row)} title="Editar"><i className="fas fa-pen"></i></button>
                        <button className="mtz-ibtn" onClick={()=>setDelId(row.id)} title="Eliminar" style={{borderColor:"rgba(231,76,60,.3)",color:"#E74C3C"}}><i className="fas fa-trash"></i></button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{marginTop:6,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:4}}>
        <span style={{fontSize:10,color:"var(--mtz-text-muted)"}}>Clic en fila para expandir el motivo completo</span>
        <span style={{fontSize:10,color:"var(--mtz-text-muted)"}}>Exportaciones incluyen <strong style={{color:"var(--mtz-text-2)"}}>{filtered.length}</strong> filas visibles</span>
      </div>

      {/* ── MODALES ── */}
      {editRow&&(
        <MatrizModal title={editRow==="new"?"Nueva infracción":"Editar infracción"} onClose={()=>setEditRow(null)} width={660}>
          <RowForm row={editRow==="new"?null:editRow} onSave={editRow==="new"?handleAdd:handleEdit} onCancel={()=>setEditRow(null)}/>
        </MatrizModal>
      )}
      {importRows&&(
        <MatrizModal title="Vista previa — Importación" onClose={()=>setImpRows(null)} width={800}>
          <ImportPreview rows={importRows} onConfirm={handleImportConfirm} onCancel={()=>setImpRows(null)}/>
        </MatrizModal>
      )}
      {deleteId&&(
        <MatrizModal title="Confirmar eliminación" onClose={()=>setDelId(null)} width={380}>
          <p style={{color:"var(--mtz-text-3)",fontSize:14,marginBottom:20,lineHeight:1.6}}>¿Eliminar esta infracción? Esta acción no se puede deshacer.</p>
          <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
            <button onClick={()=>setDelId(null)} style={{padding:"8px 18px",borderRadius:4,border:"1px solid var(--mtz-border-2)",background:"none",color:"var(--mtz-text-3)",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"'Barlow',sans-serif"}}>Cancelar</button>
            <button onClick={()=>handleDel(deleteId)} style={{padding:"8px 18px",borderRadius:4,border:"none",background:"#E74C3C",color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700,fontFamily:"'Barlow',sans-serif"}}>
              <i className="fas fa-trash" style={{marginRight:6}}></i>Eliminar
            </button>
          </div>
        </MatrizModal>
      )}
      <MatrizToast toasts={toasts}/>
    </div>
  );
}

// ── Montaje diferido ─────────────────────────────────────────────────────
// Se monta la primera vez que el usuario abre la página "Matriz Consecuencias"
// (cuando showPage('matriz') es llamado desde el SPA).
let _mtzMounted = false;
function initMatriz() {
  if (_mtzMounted) return;
  const container = document.getElementById('page-matriz');
  if (!container) return;
  _mtzMounted = true;
  ReactDOM.createRoot(container).render(<MatrizApp />);
}
