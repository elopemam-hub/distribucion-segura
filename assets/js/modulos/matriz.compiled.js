// ============================================================
// MÓDULO MATRIZ DE CONSECUENCIAS — React/JSX (transpilado por Babel standalone)
// ============================================================

const {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback
} = React;
const IS_ADMIN = (document.querySelector('meta[name="user-rol"]')?.content || '') === 'administrador';
const USER_NAME = document.querySelector('meta[name="user-nombre"]')?.content || '';

// ── Datos por defecto ──────────────────────────────────────────────────────
const DEFAULT_DATA = [{
  id: 1,
  tipo: "Seguridad Vial",
  vigencia: "6 meses",
  criticidad: "Grave",
  motivo: "Exceso de velocidad > 15 KM/H dentro de CD",
  v1: "Reinducción / Amonestación escrita y acuerdo compromiso",
  v2: "Suspensión 2 días",
  v3: "Suspensión 3 días",
  v4: "Desvinculación",
  v5: ""
}, {
  id: 2,
  tipo: "Seguridad Vial",
  vigencia: "6 meses",
  criticidad: "Grave",
  motivo: "Frenadas o aceleraciones bruscas (Por negligencias del conductor)",
  v1: "Reinducción / Amonestación escrita y acuerdo compromiso",
  v2: "Suspensión 2 días",
  v3: "Suspensión 3 días",
  v4: "Desvinculación",
  v5: ""
}, {
  id: 3,
  tipo: "Seguridad Vial",
  vigencia: "No reingreso",
  criticidad: "Muy Grave",
  motivo: "Incidentes sin lesión por malos hábitos de conducción",
  v1: "Suspensión 1 semana",
  v2: "Desvinculación",
  v3: "",
  v4: "",
  v5: ""
}, {
  id: 4,
  tipo: "Seguridad Vial",
  vigencia: "6 meses",
  criticidad: "Muy Grave",
  motivo: "Conducir haciendo uso de elemento distractor: celular, comiendo, dispositivos electrónicos en general, fumar",
  v1: "Reinducción / Amonestación escrita y acuerdo compromiso",
  v2: "Suspensión 2 días",
  v3: "Desvinculación",
  v4: "",
  v5: ""
}, {
  id: 5,
  tipo: "Seguridad Vial",
  vigencia: "6 meses",
  criticidad: "Muy Grave",
  motivo: "Exceso de velocidad > 70 KM/H fuera del CD",
  v1: "Suspensión 2 días / Reinducción / Amonestación escrita",
  v2: "Suspensión 1 semana",
  v3: "Desvinculación",
  v4: "",
  v5: ""
}, {
  id: 6,
  tipo: "Seguridad Vial",
  vigencia: "6 meses",
  criticidad: "Muy Grave",
  motivo: "Exceso de Velocidad en Ruta Crítica (curvas de 30 y 40 km/h)",
  v1: "Reinducción / Amonestación escrita y acuerdo compromiso",
  v2: "Suspensión 2 días",
  v3: "Desvinculación",
  v4: "",
  v5: ""
}, {
  id: 7,
  tipo: "Seguridad Vial",
  vigencia: "6 meses",
  criticidad: "Muy Grave",
  motivo: "Conducción distraída",
  v1: "Reinducción / Amonestación escrita y acuerdo compromiso",
  v2: "Suspensión 2 días",
  v3: "Desvinculación",
  v4: "",
  v5: ""
}, {
  id: 8,
  tipo: "Seguridad Vial",
  vigencia: "6 meses",
  criticidad: "Muy Grave",
  motivo: "Obstrucción de cámaras",
  v1: "Reinducción / Amonestación escrita y acuerdo compromiso",
  v2: "Suspensión 2 días",
  v3: "Desvinculación",
  v4: "",
  v5: ""
}, {
  id: 9,
  tipo: "Seguridad Vial",
  vigencia: "6 meses",
  criticidad: "Muy Grave",
  motivo: "Exceso de tripulación y/o personal externo en cabina",
  v1: "Suspensión 1 semana",
  v2: "Desvinculación",
  v3: "",
  v4: "",
  v5: ""
}, {
  id: 10,
  tipo: "Seguridad Vial",
  vigencia: "6 meses",
  criticidad: "Muy Grave",
  motivo: "No usar Cinturón de seguridad (conductor y/o tripulantes)",
  v1: "Reinducción / Amonestación escrita y acuerdo compromiso",
  v2: "Suspensión 2 días",
  v3: "Desvinculación",
  v4: "",
  v5: ""
}, {
  id: 11,
  tipo: "Seguridad Vial",
  vigencia: "6 meses",
  criticidad: "Muy Grave",
  motivo: "Realizar maniobra de retroceso en la ruta sin guía",
  v1: "Reinducción / Amonestación escrita y acuerdo compromiso",
  v2: "Suspensión 2 días",
  v3: "Desvinculación",
  v4: "",
  v5: ""
}, {
  id: 12,
  tipo: "Seguridad Vial",
  vigencia: "6 meses",
  criticidad: "Muy Crítico",
  motivo: "Incumplimiento a señales de tránsito o disposiciones del reglamento nacional de tránsito",
  v1: "Suspensión 2 días / Reinducción / Amonestación escrita",
  v2: "Suspensión 1 semana",
  v3: "Desvinculación",
  v4: "",
  v5: ""
}, {
  id: 13,
  tipo: "Seguridad Vial",
  vigencia: "No reingreso",
  criticidad: "Muy Crítico",
  motivo: "LTI / TRI / SIF por malos hábitos de conducción",
  v1: "Desvinculación",
  v2: "",
  v3: "",
  v4: "",
  v5: ""
}, {
  id: 14,
  tipo: "Prevención Violencia",
  vigencia: "6 meses",
  criticidad: "Muy Grave",
  motivo: "Incumplimiento de la política de efectivo: portar más de 200 soles (+ vuelta) en el bolsillo",
  v1: "Reinducción, Amonestación escrita y acuerdo compromiso",
  v2: "Suspensión 2 días",
  v3: "Desvinculación",
  v4: "",
  v5: ""
}, {
  id: 15,
  tipo: "Prevención Violencia",
  vigencia: "6 meses",
  criticidad: "Muy Grave",
  motivo: "Aceptar pago en efectivo de un cliente N3",
  v1: "Reinducción, Amonestación escrita y acuerdo compromiso",
  v2: "Suspensión 2 días",
  v3: "Desvinculación",
  v4: "",
  v5: ""
}, {
  id: 16,
  tipo: "Prevención Violencia",
  vigencia: "6 meses",
  criticidad: "Muy Grave",
  motivo: "Recolectar pago en efectivo de clientes multiparadas y no depositar en caja fuerte",
  v1: "Reinducción, Amonestación escrita y acuerdo compromiso",
  v2: "Suspensión 2 días",
  v3: "Desvinculación",
  v4: "",
  v5: ""
}, {
  id: 17,
  tipo: "Prevención Violencia",
  vigencia: "6 meses",
  criticidad: "Muy Grave",
  motivo: "No cumplir con protocolo de respuesta ante robos asaltos: alertas mediante botón de pánico",
  v1: "Reinducción, Amonestación escrita y acuerdo compromiso",
  v2: "Suspensión 2 días",
  v3: "Desvinculación",
  v4: "",
  v5: ""
}, {
  id: 18,
  tipo: "Prevención Violencia",
  vigencia: "No reingreso",
  criticidad: "Muy Grave",
  motivo: "Incidente sin lesión por incumplimiento a protocolos 360",
  v1: "Reinducción, Amonestación escrita y acuerdo compromiso",
  v2: "Desvinculación",
  v3: "",
  v4: "",
  v5: ""
}, {
  id: 19,
  tipo: "Prevención Violencia",
  vigencia: "6 meses",
  criticidad: "Muy Grave",
  motivo: "Incidente sin lesión por incumplimiento a política de efectivo",
  v1: "Reinducción, Amonestación escrita y acuerdo compromiso",
  v2: "Desvinculación",
  v3: "",
  v4: "",
  v5: ""
}, {
  id: 20,
  tipo: "Prevención Violencia",
  vigencia: "No reingreso",
  criticidad: "Muy Crítico",
  motivo: "Robo de producto en cochera, cliente, cobranza y/o objetos del cliente",
  v1: "Desvinculación",
  v2: "",
  v3: "",
  v4: "",
  v5: ""
}, {
  id: 21,
  tipo: "Seguridad",
  vigencia: "6 meses",
  criticidad: "Bajo",
  motivo: "Usar celular mientras camina y/o sube las escaleras",
  v1: "Llamada de atención",
  v2: "Amonestación Escrita",
  v3: "Suspensión 1 día",
  v4: "Suspensión 1 semana",
  v5: "Desvinculación"
}, {
  id: 22,
  tipo: "Seguridad",
  vigencia: "6 meses",
  criticidad: "Grave",
  motivo: "Usar cadenas, collares, pulseras o reloj mientras se están realizando las funciones de reparto",
  v1: "Amonestación Escrita",
  v2: "Suspensión 1 día",
  v3: "Suspensión 1 semana",
  v4: "Desvinculación",
  v5: ""
}, {
  id: 23,
  tipo: "Seguridad",
  vigencia: "6 meses",
  criticidad: "Grave",
  motivo: "Personal de reparto no respeta senderos peatonales dentro del CD",
  v1: "Amonestación Escrita",
  v2: "Suspensión 1 día",
  v3: "Suspensión 1 semana",
  v4: "Desvinculación",
  v5: ""
}, {
  id: 24,
  tipo: "Seguridad",
  vigencia: "6 meses",
  criticidad: "Grave",
  motivo: "No usar EPPS completo y adecuadamente",
  v1: "Amonestación Escrita",
  v2: "Suspensión 1 día",
  v3: "Suspensión 1 semana",
  v4: "Desvinculación",
  v5: ""
}, {
  id: 25,
  tipo: "Seguridad",
  vigencia: "6 meses",
  criticidad: "Grave",
  motivo: "Incumplimiento al protocolo de carga y descarga en POC según SOP Ejecución de Ruta",
  v1: "Amonestación Escrita",
  v2: "Suspensión 1 día",
  v3: "Suspensión 1 semana",
  v4: "Desvinculación",
  v5: ""
}, {
  id: 26,
  tipo: "Seguridad",
  vigencia: "6 meses",
  criticidad: "Grave",
  motivo: "Incumplimiento al protocolo de carga y descarga en APT/CD",
  v1: "Amonestación Escrita",
  v2: "Suspensión 1 día",
  v3: "Suspensión 1 semana",
  v4: "Desvinculación",
  v5: ""
}, {
  id: 27,
  tipo: "Seguridad",
  vigencia: "6 meses",
  criticidad: "Muy Grave",
  motivo: "Conductor no respeta el plan de tráfico del CD",
  v1: "Suspensión 1 día",
  v2: "Suspensión 1 semana",
  v3: "Desvinculación",
  v4: "",
  v5: ""
}, {
  id: 28,
  tipo: "Seguridad",
  vigencia: "6 meses",
  criticidad: "Muy Grave",
  motivo: "Ingreso del personal de reparto a lugares no autorizados del CD",
  v1: "Suspensión 1 día",
  v2: "Suspensión 1 semana",
  v3: "Desvinculación",
  v4: "",
  v5: ""
}, {
  id: 29,
  tipo: "Seguridad",
  vigencia: "6 meses",
  criticidad: "Muy Grave",
  motivo: "Incumplimiento reglas de Oro",
  v1: "Suspensión 1 día",
  v2: "Suspensión 1 semana",
  v3: "Desvinculación",
  v4: "",
  v5: ""
}, {
  id: 30,
  tipo: "Seguridad",
  vigencia: "18 meses",
  criticidad: "Muy Crítico",
  motivo: "Personal en estado etílico y/o con síntomas de uso de estupefacientes",
  v1: "Desvinculación",
  v2: "",
  v3: "",
  v4: "",
  v5: ""
}, {
  id: 31,
  tipo: "Políticas",
  vigencia: "6 meses",
  criticidad: "Bajo",
  motivo: "No estacionar en reversa en la cochera establecida",
  v1: "Llamada de atención",
  v2: "Amonestación Escrita",
  v3: "Suspensión 1 día",
  v4: "Suspensión 1 semana",
  v5: "Desvinculación"
}, {
  id: 32,
  tipo: "Políticas",
  vigencia: "6 meses",
  criticidad: "Bajo",
  motivo: "Tardanza del personal de reparto",
  v1: "Llamada de atención",
  v2: "Amonestación Escrita",
  v3: "Suspensión 1 día",
  v4: "Suspensión 1 semana",
  v5: "Desvinculación"
}, {
  id: 33,
  tipo: "Políticas",
  vigencia: "6 meses",
  criticidad: "Bajo",
  motivo: "Incumplimiento de 5S en el vehículo",
  v1: "Llamada de atención",
  v2: "Amonestación Escrita",
  v3: "Suspensión 1 día",
  v4: "Suspensión 1 semana",
  v5: "Desvinculación"
}, {
  id: 34,
  tipo: "Políticas",
  vigencia: "6 meses",
  criticidad: "Bajo",
  motivo: "Inasistencia del personal de reparto",
  v1: "Llamada de atención",
  v2: "Amonestación Escrita",
  v3: "Suspensión 1 día",
  v4: "Suspensión 1 semana",
  v5: "Desvinculación"
}, {
  id: 35,
  tipo: "Políticas",
  vigencia: "6 meses",
  criticidad: "Grave",
  motivo: "No retirar la llave al bajar de la unidad",
  v1: "Amonestación Escrita",
  v2: "Suspensión 1 día",
  v3: "Suspensión 1 semana",
  v4: "Desvinculación",
  v5: ""
}, {
  id: 36,
  tipo: "Políticas",
  vigencia: "6 meses",
  criticidad: "Grave",
  motivo: "No utilizar bandeja de camión para realizar la verificación de mercadería, carga o descarga de los productos",
  v1: "Amonestación Escrita",
  v2: "Suspensión 1 día",
  v3: "Suspensión 1 semana",
  v4: "Desvinculación",
  v5: ""
}, {
  id: 37,
  tipo: "Políticas",
  vigencia: "6 meses",
  criticidad: "Grave",
  motivo: "Mala atención y/o conducta en el POC (Mercado)",
  v1: "Amonestación Escrita",
  v2: "Suspensión 1 día",
  v3: "Suspensión 1 semana",
  v4: "Desvinculación",
  v5: ""
}, {
  id: 38,
  tipo: "Políticas",
  vigencia: "6 meses",
  criticidad: "Grave",
  motivo: "Demora en la solución de reclamos cuando es responsabilidad de la tripulación",
  v1: "Amonestación Escrita",
  v2: "Suspensión 1 día",
  v3: "Suspensión 1 semana",
  v4: "Desvinculación",
  v5: ""
}, {
  id: 39,
  tipo: "Políticas",
  vigencia: "6 meses",
  criticidad: "Muy Grave",
  motivo: "Mala conducta con personal de Transportadoras o Cervecería",
  v1: "Suspensión 1 día",
  v2: "Suspensión 1 semana",
  v3: "Desvinculación",
  v4: "",
  v5: ""
}, {
  id: 40,
  tipo: "Políticas",
  vigencia: "18 meses",
  criticidad: "Muy Grave",
  motivo: "Conducir un vehículo con la categoría no correspondiente",
  v1: "Suspensión 3 días",
  v2: "Desvinculación",
  v3: "",
  v4: "",
  v5: ""
}, {
  id: 41,
  tipo: "Políticas",
  vigencia: "6 meses",
  criticidad: "Muy Crítico",
  motivo: "Faltante de dinero, producto terminado y/o envases en la liquidación",
  v1: "Desvinculación",
  v2: "",
  v3: "",
  v4: "",
  v5: ""
}, {
  id: 42,
  tipo: "Políticas",
  vigencia: "6 meses",
  criticidad: "Muy Crítico",
  motivo: "Manipulación y/o deterioro de Dashcam",
  v1: "Suspensión 3 días",
  v2: "Desvinculación",
  v3: "",
  v4: "",
  v5: ""
}, {
  id: 43,
  tipo: "Políticas",
  vigencia: "6 meses",
  criticidad: "Bajo",
  motivo: "Atención POC crítico sin autorización y/o no reporte del mismo (Reportar en BEES Delivery y Roadmap; Safety Champion evalúa criticidad del POC)",
  v1: "Llamada de atención",
  v2: "Amonestación Escrita",
  v3: "Suspensión 1 día",
  v4: "Suspensión 1 semana",
  v5: ""
}, {
  id: 44,
  tipo: "Seguridad Vial",
  vigencia: "6 meses",
  criticidad: "Grave",
  motivo: "No realizar inspección pre operacional checklist",
  v1: "Reinducción, Amonestación escrita y acuerdo compromiso",
  v2: "Suspensión 2 días",
  v3: "Desvinculación",
  v4: "",
  v5: ""
}];
const TIPO_CFG = {
  "Seguridad Vial": {
    color: "#0d5c9a",
    bg: "#A4E9FF",
    icon: "🛣️"
  },
  "Prevención Violencia": {
    color: "#a02020",
    bg: "#FFACA8",
    icon: "🛡️"
  },
  "Seguridad": {
    color: "#0d6b68",
    bg: "#A1E0DD",
    icon: "⚠️"
  },
  "Políticas": {
    color: "#7B52A0",
    bg: "#F7DFF6",
    icon: "📋"
  }
};
const CRIT_CFG = {
  "Bajo": {
    color: "#7B52A0",
    bg: "#F7DFF6"
  },
  "Grave": {
    color: "#a05018",
    bg: "#FFDBBA"
  },
  "Muy Grave": {
    color: "#a02020",
    bg: "#FFACA8"
  },
  "Muy Crítico": {
    color: "#8B0020",
    bg: "#FF8894"
  }
};
const VIG_CFG = {
  "6 meses": {
    color: "#0d7a78",
    bg: "#A1E0DD"
  },
  "No reingreso": {
    color: "#8B0020",
    bg: "#FF8894"
  },
  "18 meses": {
    color: "#a05018",
    bg: "#FFDBBA"
  }
};
const TIPOS_ALL = ["Seguridad Vial", "Prevención Violencia", "Seguridad", "Políticas"];
const CRITS_ALL = ["Bajo", "Grave", "Muy Grave", "Muy Crítico"];
const VIGS_ALL = ["6 meses", "No reingreso", "18 meses"];
const BLANK_ROW = {
  tipo: "Seguridad Vial",
  vigencia: "6 meses",
  motivo: "",
  criticidad: "Grave",
  v1: "",
  v2: "",
  v3: "",
  v4: "",
  v5: ""
};
const LS_KEY = "dist-segura-matriz-v2";
function consecStyle(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  if (t.includes("desvinculación")) return {
    bg: "#FF8894",
    color: "#6b0020",
    border: "#FA65B9"
  };
  if (t.includes("semana")) return {
    bg: "#FFACA8",
    color: "#a02020",
    border: "#FF8894"
  };
  if (t.includes("suspensión")) return {
    bg: "#FFDBBA",
    color: "#a05018",
    border: "#FFACA8"
  };
  if (t.includes("amonestación")) return {
    bg: "#A1E0DD",
    color: "#0d6b68",
    border: "#5CC2C6"
  };
  if (t.includes("llamada") || t.includes("reinducción")) return {
    bg: "#A4E9FF",
    color: "#0d5c9a",
    border: "#5EA8E6"
  };
  return {
    bg: "#F1F5F9",
    color: "#64748B",
    border: "#CBD5E1"
  };
}

// ── Toast ──────────────────────────────────────────────────────────────────
function MatrizToast({
  toasts
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      bottom: 24,
      right: 24,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, toasts.map(t => /*#__PURE__*/React.createElement("div", {
    key: t.id,
    style: {
      background: t.type === "error" ? "#7f1d1d" : t.type === "warn" ? "#713f12" : "#14532d",
      border: `1px solid ${t.type === "error" ? "#ef4444" : t.type === "warn" ? "#eab308" : "#22c55e"}`,
      color: "#FFFFFF",
      padding: "10px 16px",
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 500,
      maxWidth: 360,
      boxShadow: "0 4px 16px rgba(0,0,0,.25)",
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: `fas fa-${t.type === "error" ? "times-circle" : t.type === "warn" ? "exclamation-triangle" : "check-circle"}`
  }), t.msg)));
}

// ── Modal ──────────────────────────────────────────────────────────────────
function MatrizModal({
  title,
  onClose,
  children,
  width = 700
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.55)",
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16
    },
    onClick: e => e.target === e.currentTarget && onClose()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#FFFFFF",
      border: "1px solid #E6E9ED",
      borderRadius: 5,
      width: "100%",
      maxWidth: width,
      maxHeight: "90vh",
      overflow: "auto",
      boxShadow: "0 4px 24px rgba(0,0,0,.18)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "14px 20px",
      borderBottom: "1px solid #E6E9ED",
      position: "sticky",
      top: 0,
      background: "#FFFFFF",
      zIndex: 1
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 14,
      fontWeight: 700,
      color: "#2A3F54",
      margin: 0
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: "none",
      border: "none",
      color: "#98A6AD",
      fontSize: 18,
      cursor: "pointer",
      lineHeight: 1,
      padding: "2px 6px"
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-times"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "16px 20px"
    }
  }, children)));
}

// ── RowForm ────────────────────────────────────────────────────────────────
const ROW_FORM_INP = {
  background: "#F5F7FA",
  border: "1px solid #CDD3D8",
  color: "#2A3F54",
  borderRadius: 4,
  padding: "7px 10px",
  fontSize: 13,
  width: "100%",
  fontFamily: "'Barlow',sans-serif",
  outline: "none",
  boxSizing: "border-box"
};
const ROW_FORM_LBL = {
  fontSize: 10,
  fontWeight: 700,
  color: "#73879C",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  marginBottom: 4,
  display: "block"
};
const ROW_FORM_GRP = {
  marginBottom: 12
};
function RowForm({
  row,
  onSave,
  onCancel
}) {
  const [form, setForm] = useState({
    ...BLANK_ROW,
    ...(row || {})
  });
  const set = k => e => setForm(f => ({
    ...f,
    [k]: e.target.value
  }));
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "0 18px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: ROW_FORM_GRP
  }, /*#__PURE__*/React.createElement("label", {
    style: ROW_FORM_LBL
  }, "Tipo"), /*#__PURE__*/React.createElement("select", {
    style: {
      ...ROW_FORM_INP,
      cursor: "pointer"
    },
    value: form.tipo,
    onChange: set("tipo")
  }, TIPOS_ALL.map(o => /*#__PURE__*/React.createElement("option", {
    key: o
  }, o)))), /*#__PURE__*/React.createElement("div", {
    style: ROW_FORM_GRP
  }, /*#__PURE__*/React.createElement("label", {
    style: ROW_FORM_LBL
  }, "Vigencia"), /*#__PURE__*/React.createElement("select", {
    style: {
      ...ROW_FORM_INP,
      cursor: "pointer"
    },
    value: form.vigencia,
    onChange: set("vigencia")
  }, VIGS_ALL.map(o => /*#__PURE__*/React.createElement("option", {
    key: o
  }, o)))), /*#__PURE__*/React.createElement("div", {
    style: ROW_FORM_GRP
  }, /*#__PURE__*/React.createElement("label", {
    style: ROW_FORM_LBL
  }, "Criticidad"), /*#__PURE__*/React.createElement("select", {
    style: {
      ...ROW_FORM_INP,
      cursor: "pointer"
    },
    value: form.criticidad,
    onChange: set("criticidad")
  }, CRITS_ALL.map(o => /*#__PURE__*/React.createElement("option", {
    key: o
  }, o))))), /*#__PURE__*/React.createElement("div", {
    style: ROW_FORM_GRP
  }, /*#__PURE__*/React.createElement("label", {
    style: ROW_FORM_LBL
  }, "Motivo / Infracción"), /*#__PURE__*/React.createElement("textarea", {
    style: {
      ...ROW_FORM_INP,
      minHeight: 68,
      resize: "vertical"
    },
    value: form.motivo,
    onChange: set("motivo")
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "0 18px"
    }
  }, [["v1", "1ra vez"], ["v2", "2da vez"], ["v3", "3ra vez"], ["v4", "4ta vez"], ["v5", "5ta vez"]].map(([k, lbl]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: ROW_FORM_GRP
  }, /*#__PURE__*/React.createElement("label", {
    style: ROW_FORM_LBL
  }, lbl), /*#__PURE__*/React.createElement("input", {
    style: ROW_FORM_INP,
    value: form[k],
    onChange: set(k)
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end",
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    style: {
      padding: "8px 18px",
      borderRadius: 4,
      border: "1px solid #CDD3D8",
      background: "none",
      color: "#73879C",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      fontFamily: "'Barlow',sans-serif"
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onSave(form),
    style: {
      padding: "8px 20px",
      borderRadius: 4,
      border: "none",
      background: "#F5C800",
      color: "#fff",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "'Barlow',sans-serif"
    }
  }, row ? "Guardar cambios" : "Agregar fila")));
}

// ── ImportPreview ──────────────────────────────────────────────────────────
function ImportPreview({
  rows,
  onConfirm,
  onCancel
}) {
  const [mode, setMode] = useState("replace");
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14,
      padding: "12px 16px",
      background: "#F5F7FA",
      borderRadius: 4,
      border: "1px solid #E6E9ED"
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 13,
      color: "#73879C",
      marginBottom: 10
    }
  }, "Se encontraron ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "#2A3F54"
    }
  }, rows.length, " filas"), ". ¿Cómo deseas importar?"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, [["replace", "Reemplazar todo"], ["append", "Agregar al final"]].map(([v, l]) => /*#__PURE__*/React.createElement("button", {
    key: v,
    onClick: () => setMode(v),
    style: {
      padding: "6px 14px",
      borderRadius: 4,
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
      border: `1px solid ${mode === v ? "#F5C800" : "#CDD3D8"}`,
      background: mode === v ? "rgba(245,200,0,.08)" : "none",
      color: mode === v ? "#F5C800" : "#73879C",
      fontFamily: "'Barlow',sans-serif"
    }
  }, l)))), /*#__PURE__*/React.createElement("div", {
    style: {
      maxHeight: 250,
      overflow: "auto",
      border: "1px solid #E6E9ED",
      borderRadius: 4
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 11
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "#F5F7FA"
    }
  }, ["Tipo", "Vigencia", "Criticidad", "Motivo (extracto)", "1ra Vez"].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: "8px 10px",
      color: "#98A6AD",
      fontWeight: 700,
      textAlign: "left",
      borderBottom: "1px solid #E6E9ED",
      whiteSpace: "nowrap"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, rows.slice(0, 20).map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderBottom: "1px solid #F5F7FA"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "6px 10px",
      color: "#555"
    }
  }, r.tipo), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "6px 10px",
      color: "#98A6AD"
    }
  }, r.vigencia), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "6px 10px",
      color: "#555"
    }
  }, r.criticidad), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "6px 10px",
      color: "#2A3F54",
      maxWidth: 200,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, r.motivo), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "6px 10px",
      color: "#98A6AD",
      maxWidth: 120,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap"
    }
  }, r.v1))), rows.length > 20 && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: 5,
    style: {
      padding: "8px 10px",
      color: "#98A6AD",
      textAlign: "center"
    }
  }, "...y ", rows.length - 20, " filas más"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end",
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onCancel,
    style: {
      padding: "8px 18px",
      borderRadius: 4,
      border: "1px solid #CDD3D8",
      background: "none",
      color: "#73879C",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      fontFamily: "'Barlow',sans-serif"
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => onConfirm(rows, mode),
    style: {
      padding: "8px 20px",
      borderRadius: 4,
      border: "none",
      background: "#F5C800",
      color: "#fff",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "'Barlow',sans-serif"
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-check",
    style: {
      marginRight: 6
    }
  }), "Confirmar importación")));
}

// ── App principal ──────────────────────────────────────────────────────────
function MatrizApp() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [search, setSearch] = useState("");
  const [tipoF, setTipoF] = useState("Todos");
  const [critF, setCritF] = useState("Todas");
  const [sortF, setSortF] = useState(null);
  const [sortD, setSortD] = useState("asc");
  const [expandedId, setExp] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [importRows, setImpRows] = useState(null);
  const [deleteId, setDelId] = useState(null);
  const [toasts, setToasts] = useState([]);
  const fileRef = useRef();
  useEffect(() => {
    try {
      const s = localStorage.getItem(LS_KEY);
      if (s) setData(JSON.parse(s));
    } catch {}
  }, []);
  const persist = useCallback(rows => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(rows));
    } catch {}
  }, []);
  const addToast = (msg, type = "ok") => {
    const id = Date.now();
    setToasts(t => [...t, {
      id,
      msg,
      type
    }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  const saveData = rows => {
    setData(rows);
    persist(rows);
  };
  const handleAdd = form => {
    const id = Math.max(0, ...data.map(d => d.id)) + 1;
    saveData([...data, {
      ...form,
      id
    }]);
    setEditRow(null);
    addToast("Fila agregada");
  };
  const handleEdit = form => {
    saveData(data.map(r => r.id === form.id ? form : r));
    setEditRow(null);
    addToast("Fila actualizada");
  };
  const handleDel = id => {
    saveData(data.filter(r => r.id !== id));
    setDelId(null);
    addToast("Fila eliminada", "warn");
  };
  const handleReset = () => {
    saveData(DEFAULT_DATA);
    addToast("Datos restaurados a valores originales", "warn");
  };
  const handleImportConfirm = (rows, mode) => {
    let maxId = Math.max(0, ...data.map(d => d.id));
    const newRows = rows.map(r => ({
      ...r,
      id: ++maxId
    }));
    saveData(mode === "replace" ? newRows : [...data, ...newRows]);
    setImpRows(null);
    addToast(`${newRows.length} filas importadas (${mode === "replace" ? "reemplazo" : "agregadas"})`);
  };
  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    const ext = file.name.split(".").pop().toLowerCase();
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        let rows = [];
        if (ext === "csv") {
          const lines = ev.target.result.trim().split("\n");
          const hdrs = lines[0].split(",").map(h => h.trim().replace(/"/g, "").toLowerCase());
          rows = lines.slice(1).filter(l => l.trim()).map(line => {
            const vals = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(v => v.trim().replace(/^"|"$/g, ""));
            const obj = {};
            hdrs.forEach((h, i) => {
              obj[h] = vals[i] || "";
            });
            return {
              tipo: obj.tipo || "Seguridad Vial",
              vigencia: obj.vigencia || "6 meses",
              motivo: obj.motivo || "",
              criticidad: obj.criticidad || "Grave",
              v1: obj.v1 || "",
              v2: obj.v2 || "",
              v3: obj.v3 || "",
              v4: obj.v4 || "",
              v5: obj.v5 || ""
            };
          });
        } else {
          const wb = XLSX.read(ev.target.result, {
            type: "array"
          });
          const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
            defval: ""
          });
          rows = json.map(r => ({
            tipo: r.tipo || r.TIPO || "Seguridad Vial",
            vigencia: r.vigencia || r.VIGENCIA || "6 meses",
            motivo: r.motivo || r.MOTIVO || "",
            criticidad: r.criticidad || r.CRITICIDAD || "Grave",
            v1: r.v1 || r["1ERA VEZ"] || "",
            v2: r.v2 || r["2DA VEZ"] || "",
            v3: r.v3 || r["3ERA VEZ"] || "",
            v4: r.v4 || r["4TA VEZ"] || "",
            v5: r.v5 || r["5TA VEZ"] || ""
          }));
        }
        if (!rows.length) {
          addToast("No se encontraron filas válidas", "error");
          return;
        }
        setImpRows(rows);
      } catch (err) {
        addToast("Error al leer archivo: " + err.message, "error");
      }
    };
    if (ext === "csv") reader.readAsText(file, "UTF-8");else reader.readAsArrayBuffer(file);
  };
  const exportCSV = rows => {
    const e = v => `"${String(v || "").replace(/"/g, '""')}"`;
    const head = ["Tipo", "Vigencia", "Motivo", "Criticidad", "1ERA VEZ", "2DA VEZ", "3ERA VEZ", "4TA VEZ", "5TA VEZ"].map(e).join(",");
    const body = rows.map(r => [r.tipo, r.vigencia, r.motivo, r.criticidad, r.v1, r.v2, r.v3, r.v4, r.v5].map(e).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + head + "\n" + body], {
      type: "text/csv;charset=utf-8"
    }));
    a.download = `matriz_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    addToast("CSV exportado");
  };
  const exportXLSX = rows => {
    const wsData = [["Tipo", "Vigencia", "Motivo", "Criticidad", "1ERA VEZ", "2DA VEZ", "3ERA VEZ", "4TA VEZ", "5TA VEZ"], ...rows.map(r => [r.tipo, r.vigencia, r.motivo, r.criticidad, r.v1, r.v2, r.v3, r.v4, r.v5])];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [14, 12, 50, 14, 28, 22, 22, 22, 22].map(w => ({
      wch: w
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Matriz");
    XLSX.writeFile(wb, `matriz_${new Date().toISOString().slice(0, 10)}.xlsx`);
    addToast("Excel exportado");
  };
  const exportTemplate = () => {
    const wsData = [["tipo", "vigencia", "motivo", "criticidad", "v1", "v2", "v3", "v4", "v5"], ["Seguridad Vial", "6 meses", "Descripción de la infracción", "Grave", "1ra consecuencia", "2da consecuencia", "3ra consecuencia", "", ""]];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [18, 14, 50, 14, 28, 22, 22, 22, 22].map(w => ({
      wch: w
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "plantilla_matriz.xlsx");
    addToast("Plantilla descargada");
  };
  const filtered = useMemo(() => {
    let rows = [...data];
    if (tipoF !== "Todos") rows = rows.filter(r => r.tipo === tipoF);
    if (critF !== "Todas") rows = rows.filter(r => r.criticidad === critF);
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(r => r.motivo.toLowerCase().includes(q) || r.tipo.toLowerCase().includes(q) || r.criticidad.toLowerCase().includes(q));
    }
    if (sortF) rows.sort((a, b) => sortD === "asc" ? String(a[sortF]).localeCompare(String(b[sortF])) : String(b[sortF]).localeCompare(String(a[sortF])));
    return rows;
  }, [data, tipoF, critF, search, sortF, sortD]);
  const handleSort = f => {
    if (sortF === f) setSortD(d => d === "asc" ? "desc" : "asc");else {
      setSortF(f);
      setSortD("asc");
    }
  };
  const byTipo = TIPOS_ALL.map(t => ({
    t,
    n: data.filter(r => r.tipo === t).length
  }));
  const btnBase = {
    border: "none",
    borderRadius: 4,
    padding: "7px 13px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontFamily: "'Barlow',sans-serif",
    transition: "opacity .15s"
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "'Barlow',sans-serif",
      color: "#2A3F54"
    }
  }, /*#__PURE__*/React.createElement("style", null, `
        .mtz-trow:hover{background:#f0faf8!important}
        .mtz-fchip{border:1px solid #CDD3D8;border-radius:4px;padding:4px 11px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;font-family:'Barlow',sans-serif;background:#fff;color:#73879C}
        .mtz-fchip:hover{border-color:#F5C800;color:#F5C800}
        .mtz-ibtn{background:none;border:1px solid #CDD3D8;border-radius:4px;padding:4px 8px;color:#98A6AD;cursor:pointer;font-size:12px;transition:all .15s}.mtz-ibtn:hover{border-color:#98A6AD;color:#555}
        .mtz-scinp{background:#fff;border:1px solid #CDD3D8;color:#2A3F54;border-radius:4px;padding:7px 10px 7px 34px;font-size:13px;outline:none;font-family:'Barlow',sans-serif;width:100%}.mtz-scinp:focus{border-color:#F5C800;box-shadow:0 0 0 3px rgba(245,200,0,.12)}
        .mtz-th-srt{cursor:pointer;user-select:none}.mtz-th-srt:hover{color:#F5C800}
        .mtz-cq{border-radius:4px;padding:3px 7px;font-size:11px;font-weight:500;text-align:center;line-height:1.3;border:1px solid;display:inline-block}
        .mtz-bdg{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;white-space:nowrap}
        .mtz-tg{display:inline-block;padding:2px 7px;border-radius:3px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
        .mtz-abtn{cursor:pointer;border:none;font-family:'Barlow',sans-serif;transition:opacity .15s}.mtz-abtn:hover{opacity:.82}
      `), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 10,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "'Barlow Condensed',sans-serif",
      fontSize: 22,
      fontWeight: 800,
      color: "#2A3F54",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      margin: 0,
      lineHeight: 1.2
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-bolt",
    style: {
      color: "#F5C800",
      marginRight: 8
    }
  }), "Matriz de Consecuencias"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 12,
      color: "#98A6AD",
      margin: "3px 0 0"
    }
  }, "Tripulantes de Reparto · ", filtered.length, " de ", data.length, " infracciones")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 7,
      alignItems: "center",
      flexWrap: "wrap"
    }
  }, IS_ADMIN && /*#__PURE__*/React.createElement("span", {
    style: {
      padding: "4px 10px",
      borderRadius: 4,
      background: "rgba(245,200,0,.1)",
      border: "1px solid rgba(245,200,0,.3)",
      color: "#F5C800",
      fontSize: 11,
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-crown",
    style: {
      marginRight: 5
    }
  }), USER_NAME, " · Admin"), /*#__PURE__*/React.createElement("button", {
    className: "mtz-abtn",
    onClick: () => exportCSV(filtered),
    style: {
      ...btnBase,
      background: "#F5F7FA",
      color: "#73879C",
      border: "1px solid #CDD3D8"
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-file-csv"
  }), " CSV"), /*#__PURE__*/React.createElement("button", {
    className: "mtz-abtn",
    onClick: () => exportXLSX(filtered),
    style: {
      ...btnBase,
      background: "rgba(245,200,0,.08)",
      color: "#F5C800",
      border: "1px solid rgba(245,200,0,.3)"
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-file-excel"
  }), " Excel"), IS_ADMIN && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: ".csv,.xlsx,.xls",
    style: {
      display: "none"
    },
    onChange: handleFile
  }), /*#__PURE__*/React.createElement("button", {
    className: "mtz-abtn",
    onClick: () => fileRef.current.click(),
    style: {
      ...btnBase,
      background: "#F5F7FA",
      color: "#73879C",
      border: "1px solid #CDD3D8"
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-file-import"
  }), " Importar"), /*#__PURE__*/React.createElement("button", {
    className: "mtz-abtn",
    onClick: () => setEditRow("new"),
    style: {
      ...btnBase,
      background: "#F5C800",
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-plus"
  }), " Nueva fila")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginBottom: 12
    }
  }, [{
    label: "Total",
    val: data.length,
    color: "#2A3F54"
  }, ...byTipo.map(({
    t,
    n
  }) => ({
    label: t,
    val: n,
    color: TIPO_CFG[t]?.color || "#555",
    icon: TIPO_CFG[t]?.icon
  }))].map(s => /*#__PURE__*/React.createElement("div", {
    key: s.label,
    style: {
      background: "#fff",
      border: "1px solid #E6E9ED",
      borderRadius: 4,
      padding: "8px 14px",
      minWidth: 90,
      borderTop: `3px solid ${s.color}`
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 800,
      color: s.color,
      lineHeight: 1
    }
  }, s.val), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "#98A6AD",
      fontWeight: 600,
      marginTop: 2
    }
  }, s.icon && s.icon + " ", s.label))), IS_ADMIN && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", {
    className: "mtz-abtn",
    onClick: exportTemplate,
    style: {
      ...btnBase,
      background: "#F5F7FA",
      color: "#73879C",
      border: "1px solid #CDD3D8",
      marginLeft: "auto",
      alignSelf: "center",
      fontSize: 11
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-download"
  }), " Plantilla"), /*#__PURE__*/React.createElement("button", {
    className: "mtz-abtn",
    onClick: handleReset,
    style: {
      ...btnBase,
      background: "rgba(231,76,60,.06)",
      color: "#E74C3C",
      border: "1px solid rgba(231,76,60,.2)",
      alignSelf: "center",
      fontSize: 11
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-rotate-left"
  }), " Restaurar original"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid #E6E9ED",
      borderRadius: 4,
      padding: "12px 14px",
      marginBottom: 8,
      display: "flex",
      gap: 12,
      flexWrap: "wrap",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      flex: "1 1 200px",
      maxWidth: 280
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-search",
    style: {
      position: "absolute",
      left: 9,
      top: "50%",
      transform: "translateY(-50%)",
      color: "#98A6AD",
      fontSize: 12,
      pointerEvents: "none"
    }
  }), /*#__PURE__*/React.createElement("input", {
    className: "mtz-scinp",
    value: search,
    onChange: e => setSearch(e.target.value),
    placeholder: "Buscar infracción..."
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      flexWrap: "wrap",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: "#98A6AD",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: ".1em",
      marginRight: 2
    }
  }, "TIPO:"), ["Todos", ...TIPOS_ALL].map(t => {
    const c = TIPO_CFG[t];
    const a = tipoF === t;
    return /*#__PURE__*/React.createElement("button", {
      key: t,
      className: "mtz-fchip",
      onClick: () => setTipoF(t),
      style: {
        background: a ? c?.bg || "rgba(245,200,0,.1)" : "none",
        color: a ? c?.color || "#F5C800" : "#73879C",
        borderColor: a ? c?.color || "#F5C800" : "#CDD3D8"
      }
    }, c?.icon && c.icon + " ", t);
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      flexWrap: "wrap",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: "#98A6AD",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: ".1em",
      marginRight: 2
    }
  }, "CRITICIDAD:"), ["Todas", ...CRITS_ALL].map(c => {
    const cfg = CRIT_CFG[c];
    const a = critF === c;
    return /*#__PURE__*/React.createElement("button", {
      key: c,
      className: "mtz-fchip",
      onClick: () => setCritF(c),
      style: {
        background: a ? cfg?.bg || "rgba(245,200,0,.1)" : "none",
        color: a ? cfg?.color || "#F5C800" : "#73879C",
        borderColor: a ? cfg?.color || "#F5C800" : "#CDD3D8"
      }
    }, c);
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid #E6E9ED",
      borderRadius: 4,
      padding: "8px 14px",
      marginBottom: 12,
      display: "flex",
      gap: 6,
      flexWrap: "wrap",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 9,
      color: "#98A6AD",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: ".1em",
      marginRight: 4
    }
  }, "LEYENDA:"), [{
    l: "Llamada / Reinducción",
    bg: "#A4E9FF",
    c: "#0d5c9a",
    b: "#5EA8E6"
  }, {
    l: "Amonestación Escrita",
    bg: "#A1E0DD",
    c: "#0d6b68",
    b: "#5CC2C6"
  }, {
    l: "Suspensión",
    bg: "#FFDBBA",
    c: "#a05018",
    b: "#FFACA8"
  }, {
    l: "Susp. extendida",
    bg: "#FFACA8",
    c: "#a02020",
    b: "#FF8894"
  }, {
    l: "Desvinculación",
    bg: "#FF8894",
    c: "#6b0020",
    b: "#FA65B9"
  }].map(x => /*#__PURE__*/React.createElement("div", {
    key: x.l,
    className: "mtz-cq",
    style: {
      background: x.bg,
      color: x.c,
      borderColor: x.b
    }
  }, x.l))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid #E6E9ED",
      borderRadius: 4,
      overflow: "auto",
      boxShadow: "0 1px 3px rgba(0,0,0,.05)"
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      borderCollapse: "collapse",
      width: "100%",
      minWidth: IS_ADMIN ? 1160 : 1080
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "#F5F7FA"
    }
  }, [{
    l: "Tipo",
    k: "tipo",
    w: 145
  }, {
    l: "Vigencia",
    k: "vigencia",
    w: 100
  }, {
    l: "Motivo / Infracción",
    k: "motivo",
    w: 280
  }, {
    l: "Criticidad",
    k: "criticidad",
    w: 108
  }, {
    l: "1RA VEZ",
    k: null,
    w: 155
  }, {
    l: "2DA VEZ",
    k: null,
    w: 128
  }, {
    l: "3RA VEZ",
    k: null,
    w: 118
  }, {
    l: "4TA VEZ",
    k: null,
    w: 115
  }, {
    l: "5TA VEZ",
    k: null,
    w: 105
  }, ...(IS_ADMIN ? [{
    l: "",
    k: null,
    w: 75
  }] : [])].map(col => /*#__PURE__*/React.createElement("th", {
    key: col.l,
    className: col.k ? "mtz-th-srt" : "",
    onClick: col.k ? () => handleSort(col.k) : undefined,
    style: {
      padding: "10px 12px",
      textAlign: "left",
      fontSize: 9,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: ".09em",
      color: "#98A6AD",
      borderBottom: "2px solid #F5C800",
      whiteSpace: "nowrap",
      width: col.w
    }
  }, col.l, col.k && /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 3,
      opacity: sortF === col.k ? 1 : .3,
      fontSize: 8
    }
  }, sortF === col.k ? sortD === "asc" ? "▲" : "▼" : "↕"))))), /*#__PURE__*/React.createElement("tbody", null, !filtered.length && /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: IS_ADMIN ? 10 : 9,
    style: {
      textAlign: "center",
      padding: 48,
      color: "#98A6AD"
    }
  }, "No hay resultados.")), filtered.map((row, i) => {
    const tc = TIPO_CFG[row.tipo] || {};
    const cc = CRIT_CFG[row.criticidad] || {};
    const vc = VIG_CFG[row.vigencia] || VIG_CFG["6 meses"];
    const isExp = expandedId === row.id;
    return /*#__PURE__*/React.createElement("tr", {
      key: row.id,
      className: "mtz-trow",
      style: {
        background: i % 2 === 0 ? "#FFFFFF" : "#F9FAFB",
        cursor: "pointer",
        borderBottom: "1px solid #E6E9ED"
      },
      onClick: () => setExp(isExp ? null : row.id)
    }, /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "8px 12px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 3,
        height: 26,
        borderRadius: 2,
        background: tc.color || "#CDD3D8",
        flexShrink: 0
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 11,
        fontWeight: 700,
        color: tc.color || "#98A6AD"
      }
    }, tc.icon, " ", row.tipo))), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "8px 12px"
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "mtz-tg",
      style: {
        background: vc.bg,
        color: vc.color,
        border: `1px solid ${vc.color}40`
      }
    }, row.vigencia)), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "8px 12px"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: "#555",
        lineHeight: 1.4,
        fontSize: 12
      }
    }, isExp ? row.motivo : row.motivo.length > 78 ? row.motivo.slice(0, 76) + "…" : row.motivo, !isExp && row.motivo.length > 78 && /*#__PURE__*/React.createElement("span", {
      style: {
        color: "#F5C800",
        fontSize: 10,
        marginLeft: 4
      }
    }, "▾"))), /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "8px 12px"
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "mtz-bdg",
      style: {
        background: cc.bg,
        color: cc.color,
        border: `1px solid ${cc.color}30`
      }
    }, row.criticidad)), [row.v1, row.v2, row.v3, row.v4, row.v5].map((v, vi) => {
      const st = consecStyle(v);
      return /*#__PURE__*/React.createElement("td", {
        key: vi,
        style: {
          padding: "8px 10px"
        }
      }, v && st ? /*#__PURE__*/React.createElement("div", {
        className: "mtz-cq",
        style: {
          background: st.bg,
          color: st.color,
          borderColor: st.border
        }
      }, v) : /*#__PURE__*/React.createElement("span", {
        style: {
          color: "#CDD3D8"
        }
      }, "—"));
    }), IS_ADMIN && /*#__PURE__*/React.createElement("td", {
      style: {
        padding: "8px 10px"
      },
      onClick: e => e.stopPropagation()
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("button", {
      className: "mtz-ibtn",
      onClick: () => setEditRow(row),
      title: "Editar"
    }, /*#__PURE__*/React.createElement("i", {
      className: "fas fa-pen"
    })), /*#__PURE__*/React.createElement("button", {
      className: "mtz-ibtn",
      onClick: () => setDelId(row.id),
      title: "Eliminar",
      style: {
        borderColor: "rgba(231,76,60,.3)",
        color: "#E74C3C"
      }
    }, /*#__PURE__*/React.createElement("i", {
      className: "fas fa-trash"
    })))));
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 6,
      display: "flex",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: "#98A6AD"
    }
  }, "Clic en fila para expandir el motivo completo"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 10,
      color: "#98A6AD"
    }
  }, "Exportaciones incluyen ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "#555"
    }
  }, filtered.length), " filas visibles")), editRow && /*#__PURE__*/React.createElement(MatrizModal, {
    title: editRow === "new" ? "Nueva infracción" : "Editar infracción",
    onClose: () => setEditRow(null),
    width: 660
  }, /*#__PURE__*/React.createElement(RowForm, {
    row: editRow === "new" ? null : editRow,
    onSave: editRow === "new" ? handleAdd : handleEdit,
    onCancel: () => setEditRow(null)
  })), importRows && /*#__PURE__*/React.createElement(MatrizModal, {
    title: "Vista previa — Importación",
    onClose: () => setImpRows(null),
    width: 800
  }, /*#__PURE__*/React.createElement(ImportPreview, {
    rows: importRows,
    onConfirm: handleImportConfirm,
    onCancel: () => setImpRows(null)
  })), deleteId && /*#__PURE__*/React.createElement(MatrizModal, {
    title: "Confirmar eliminación",
    onClose: () => setDelId(null),
    width: 380
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      color: "#73879C",
      fontSize: 14,
      marginBottom: 20,
      lineHeight: 1.6
    }
  }, "¿Eliminar esta infracción? Esta acción no se puede deshacer."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setDelId(null),
    style: {
      padding: "8px 18px",
      borderRadius: 4,
      border: "1px solid #CDD3D8",
      background: "none",
      color: "#73879C",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 600,
      fontFamily: "'Barlow',sans-serif"
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => handleDel(deleteId),
    style: {
      padding: "8px 18px",
      borderRadius: 4,
      border: "none",
      background: "#E74C3C",
      color: "#fff",
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 700,
      fontFamily: "'Barlow',sans-serif"
    }
  }, /*#__PURE__*/React.createElement("i", {
    className: "fas fa-trash",
    style: {
      marginRight: 6
    }
  }), "Eliminar"))), /*#__PURE__*/React.createElement(MatrizToast, {
    toasts: toasts
  }));
}

// Montar en el contenedor del SPA
const _mtzContainer = document.getElementById('page-matriz');
if (_mtzContainer) {
  ReactDOM.createRoot(_mtzContainer).render(/*#__PURE__*/React.createElement(MatrizApp, null));
}
