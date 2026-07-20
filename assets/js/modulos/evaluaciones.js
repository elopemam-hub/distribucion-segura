// ============================================================
// DISTRIBUCIÓN SEGURA — MÓDULO: EVALUACIONES
// Motor genérico: Manejo Práctica | Examen Defensiva | Inducción T2
// ============================================================

// ── Configuración de formularios ─────────────────────────────
const EVAL_CONFIG = {

  manejo_practica: {
    label: 'Manejo Práctica',
    titulo: 'EVALUACIÓN: MANEJO PRÁCTICA',
    subtitulo: 'Aplica para los empresarios T2',
    puntajeMaximo: 20,
    campos: [
      { id: 'fecha',         label: 'Fecha',                           tipo: 'datetime_readonly', subtipo: 'date' },
      { id: 'hora',          label: 'Hora',                            tipo: 'datetime_readonly', subtipo: 'time' },
      { id: 'empresa',       label: 'Empresa Evaluador',               tipo: 'select', opciones: ['Dicorjes'], required: true },
      { id: 'dni',           label: 'D.N.I.',                          tipo: 'dni_autocomplete', required: true },
      { id: 'nombre',        label: 'Nombre y Apellido del Postulante',tipo: 'text', required: true },
      { id: 'tipo_unidad',   label: 'Tipo de Unidad',                  tipo: 'select', opciones: ['Camion 360','Camion 600','Camion 672','Camion 1008'], required: true },
      { id: 'estado_unidad', label: 'Estado de la Unidad',             tipo: 'select', opciones: ['CARGADO','VACÍO'], required: true },
    ],
    secciones: [
      {
        id: 'seguridad', titulo: 'I. SEGURIDAD', puntos: 3, tipo: 'aplica_grid',
        descripcion: 'Este módulo evaluará su actitud frente a la seguridad en la unidad.',
        items: [
          { id: 'tres_puntos', label: 'EMPLEA LOS TRES PUNTOS DE APOYO' },
          { id: 'cinturon',    label: 'USA DEL CINTURÓN DE SEGURIDAD' },
          { id: 'posicion',    label: 'POSICIÓN ERGONÓMICA' },
        ],
      },
      {
        id: 'revisiones', titulo: 'II. REVISIONES ANTES DEL ARRANQUE', puntos: 3, tipo: 'aplica_grid',
        descripcion: 'Evaluará las aptitudes del postulante antes del arranque de la unidad.',
        items: [
          { id: 'neumaticos', label: 'VERIFICA EL ESTADO DE NEUMÁTICOS' },
          { id: 'niveles',    label: 'VERIFICA NIVELES (REFRIGERANTE, ACEITE Y COMBUSTIBLE)' },
          { id: 'documentos', label: 'REVISA LOS DOCUMENTOS DEL VEHÍCULO' },
        ],
      },
      {
        id: 'operacion', titulo: 'III. OPERACIÓN DE LA UNIDAD', puntos: 4, tipo: 'aplica_grid',
        descripcion: 'Evaluará las habilidades para realizar maniobras mientras conduce.',
        items: [
          { id: 'encendido',     label: 'ENCENDIDO CORRECTO DE LA UNIDAD' },
          { id: 'indicadores',   label: 'RECONOCE INDICADORES DEL TABLERO' },
          { id: 'revoluciones',  label: 'RANGO DE REVOLUCIONES' },
          { id: 'caja_cambios',  label: 'USO CORRECTO DE LA CAJA DE CAMBIOS' },
          { id: 'embrague',      label: 'USO CORRECTO DEL PEDAL DE EMBRAGUE' },
          { id: 'freno_motor',   label: 'USO DE FRENO DE MOTOR' },
          { id: 'cuidado_unidad',label: 'CUIDADO DE LA UNIDAD EN EVALUACIÓN' },
        ],
      },
      {
        id: 'defensiva', titulo: 'IV. MANEJO A LA DEFENSIVA', puntos: 5, tipo: 'aplica_grid',
        descripcion: 'Evaluará las aptitudes del postulante en el proceso de conducción.',
        items: [
          { id: 'buenas_practicas', label: 'BUENAS PRÁCTICAS EN LA CONDUCCIÓN' },
          { id: 'distancia',        label: 'GUARDA DISTANCIA CON OTROS VEHÍCULOS' },
          { id: 'velocidad',        label: 'VELOCIDAD DE CONDUCCIÓN' },
          { id: 'senalizacion',     label: 'RESPETA LA SEÑALIZACIÓN' },
          { id: 'luces',            label: 'USO ADECUADO DE LUCES DE SEÑALIZACIÓN' },
        ],
      },
      {
        id: 'maniobras', titulo: 'V. MANIOBRAS', puntos: 3, tipo: 'aplica_grid',
        descripcion: 'Evaluará las maniobras durante la ruta.',
        items: [
          { id: 'giros',           label: 'GIROS' },
          { id: 'retroceso',       label: 'RETROCESO' },
          { id: 'estacionamiento', label: 'ESTACIONAMIENTO' },
        ],
      },
      {
        id: 'presentacion', titulo: 'VI. PRESENTACIÓN', puntos: 2, tipo: 'aplica_grid',
        descripcion: 'Evaluará la presentación y el trato del Conductor durante la evaluación.',
        items: [
          { id: 'buen_trato', label: 'TIENE BUEN TRATO' },
          { id: 'lenguaje',   label: 'UTILIZA LENGUAJE APROPIADO' },
          { id: 'aseo',       label: 'BUEN ASEO E HIGIENE PERSONAL' },
        ],
      },
    ],
  },

  examen_defensiva: {
    label: 'Examen Manejo Defensivo',
    titulo: 'EXAMEN MANEJO A LA DEFENSIVA',
    subtitulo: 'Examen Teórico Presencial',
    puntajeMaximo: 20,
    campos: [
      { id: 'fecha',          label: 'Fecha',              tipo: 'datetime_readonly', subtipo: 'date' },
      { id: 'hora',           label: 'Hora',               tipo: 'datetime_readonly', subtipo: 'time' },
      { id: 'empresa',        label: 'Empresa',            tipo: 'select', opciones: ['Dicorjes'], required: true },
      { id: 'conductor_tipo', label: 'Conductor',          tipo: 'radio',  opciones: ['Nuevo Inducción','Antiguo'], required: true },
      { id: 'dni',            label: 'D.N.I.',             tipo: 'dni_autocomplete', required: true },
      { id: 'nombre',         label: 'Nombre y Apellidos', tipo: 'text',   required: true },
    ],
    secciones: [
      {
        id: 'preguntas', titulo: 'Preguntas', tipo: 'multiple_choice',
        preguntas: [
          { id:'q1',  puntos:2, numero:'1.', texto:'Según estadística las primeras 02 principales causas de accidente en el Perú son:', opciones:[{id:'A',texto:'Falla mecánica y falta de luces'},{id:'B',texto:'Imprudencia del peatón y exceso de carga'},{id:'C',texto:'Ebriedad del conductor y pista en mal estado'},{id:'D',texto:'Velocidad e imprudencia del conductor'},{id:'E',texto:'Ninguna de las anteriores'}] },
          { id:'q2',  puntos:2, numero:'2.', texto:'¿Según el reglamento de tránsito cuántos tipos de señales conoces?', opciones:[{id:'A',texto:'Informativas, reglamentarias y preventivas'},{id:'B',texto:'Preventivas, advertencia e informativas'},{id:'C',texto:'Informativas, regulación y reglamentarias'},{id:'D',texto:'Restrictivas, advertencia y comunicativas'},{id:'E',texto:'Todas las anteriores'}] },
          { id:'q3',  puntos:2, numero:'3.', texto:'El significado de manejo a la defensiva:', opciones:[{id:'A',texto:'Es conducir un vehículo sin choques'},{id:'B',texto:'Arte de mantener la conducción de un vehículo sin registrar accidentes'},{id:'C',texto:'Arte de conducir un vehículo con aceleraciones y frenadas bruscas'},{id:'D',texto:'Mantener la distancia para no colisionar con otro que va adelante'},{id:'E',texto:'Manejar sin hablar por celular'}] },
          { id:'q4',  puntos:2, numero:'4.', texto:'Principios de manejo a la defensiva: ¿Qué significa EPEA?', opciones:[{id:'A',texto:'Esquema para evitar anuncios'},{id:'B',texto:'Empezar para entrar amigos'},{id:'C',texto:'Emplear producto estándar americano'},{id:'D',texto:'Esquema para evitar accidentes'},{id:'E',texto:'Todas las anteriores'}] },
          { id:'q5',  puntos:2, numero:'5.', texto:'La característica de un conductor defensivo profesional es:', opciones:[{id:'A',texto:'Maneja pensando en sus problemas y no le importan ni conductores ni peatones'},{id:'B',texto:'Conduce rápido sin importarle condiciones de pista, vehículo, ambiente etc'},{id:'C',texto:'Efectúa apuradamente lo que debió hacer antes, al tomar curvas, pasar o parar'},{id:'D',texto:'Evita conducir en condiciones deficientes: ebrio, con sueño, cansado etc'},{id:'E',texto:'Ninguna de las anteriores'}] },
          { id:'q6',  puntos:2, numero:'6.', texto:'¿Indique cuáles son los factores de riesgo en condiciones adversas?', opciones:[{id:'A',texto:'Condiciones de conducción y sociales'},{id:'B',texto:'Condiciones de conducción, climatológicas y sociales'},{id:'C',texto:'Condiciones sociales y culturales'},{id:'D',texto:'Condiciones religiosos y deportivos'},{id:'E',texto:'Ninguna de anteriores'}] },
          { id:'q7',  puntos:2, numero:'7.', texto:'¿Cuáles son las consecuencias de una conducción nocturna?', opciones:[{id:'A',texto:'Nuestra visión es más limitada'},{id:'B',texto:'Ocurre mayor incidencia de accidentes de tránsito'},{id:'C',texto:'Se muestran los primeros signos de fatiga y cansancio, sueño, etc'},{id:'D',texto:'Existe mayor dificultad para distinguir peatones, ciclistas y otros usuarios de la vía'},{id:'E',texto:'Todas las anteriores'}] },
          { id:'q8',  puntos:2, numero:'8.', texto:'Conducción en subidas y bajadas: antes de ingresar a una pendiente Ud. debe:', opciones:[{id:'A',texto:'Parar su vehículo y verificar la ruta'},{id:'B',texto:'Avisar a los demás vehículos el inicio de una pendiente'},{id:'C',texto:'Analizar qué tanto conoce la ruta y la unidad para poder realizar la maniobra con seguridad'},{id:'D',texto:'Continuar sin hacer ningún aviso'},{id:'E',texto:'Ninguna de las anteriores'}] },
          { id:'q9',  puntos:2, numero:'9.', texto:'Forma segura de adelantar vehículos. Un adelantamiento mal realizado puede ser la causa de un accidente del cual es difícil salir con vida, corresponde a:', opciones:[{id:'A',texto:'Choque frontal'},{id:'B',texto:'Choque por alcance'},{id:'C',texto:'Choque lateral'},{id:'D',texto:'Choque y fuga'},{id:'E',texto:'Todas las anteriores'}] },
          { id:'q10', puntos:2, numero:'10.', texto:'Son actividades físicas realizadas en un breve espacio de tiempo en la jornada laboral, orientadas a que los trabajadores recuperen energías revirtiendo la fatiga muscular y mental. Este concepto corresponde a:', opciones:[{id:'A',texto:'Pausas inactivas'},{id:'B',texto:'Parada en ruta'},{id:'C',texto:'Pausas activas'},{id:'D',texto:'Parada de vehículo'},{id:'E',texto:'Ninguna de las anteriores'}] },
        ],
      },
    ],
  },

  cd: {
    label: 'Inducción CD',
    titulo: 'EVALUACIÓN INDUCCIÓN SAFETY',
    subtitulo: 'Inducción de Seguridad Logística',
    puntajeMaximo: 20,
    campos: [
      { id: 'fecha',   label: 'Fecha',             tipo: 'datetime_readonly', subtipo: 'date' },
      { id: 'hora',    label: 'Hora',              tipo: 'datetime_readonly', subtipo: 'time' },
      { id: 'nombre',  label: 'Nombre y Apellidos', tipo: 'text',   required: true },
      { id: 'dni',     label: 'D.N.I.',             tipo: 'text',   required: true },
      { id: 'empresa', label: 'Empresa',             tipo: 'select', required: true,
        opciones: ['LIDERMAN','ENGIE','A Y M VIRGEN DE CHAPI S.R.L.','M&F MULTIMOTRIZ E.I.R.L.',
                   'BACKUS','CONTRATISTA TEMPORAL','VISITANTE','LAVORO','MANPOWER','T77','DA PAUSER'] },
    ],
    secciones: [],
  },

  induccion_t2: {
    label: 'Evaluación Inducción T2',
    titulo: 'EVALUACIÓN INDUCCIÓN T2',
    subtitulo: 'Seguridad T2',
    puntajeMaximo: 20,
    campos: [
      { id: 'fecha',   label: 'Fecha',              tipo: 'datetime_readonly', subtipo: 'date' },
      { id: 'hora',    label: 'Hora',               tipo: 'datetime_readonly', subtipo: 'time' },
      { id: 'dni',     label: 'D.N.I.',             tipo: 'dni_autocomplete',  required: true },
      { id: 'nombre',  label: 'Nombre y Apellidos', tipo: 'text',   required: true },
      { id: 'empresa', label: 'Empresa',             tipo: 'select', opciones: ['Amanecer','Dicorjes','Pajcha','T77','S.I.Venturo SAC'], required: true },
      { id: 'puesto',  label: 'Puesto',              tipo: 'select', opciones: ['Chofer','Auxiliar','Reparto','Asistente T2','Supervisor T2','Empresario'], required: true },
    ],
    secciones: [
      {
        id: 'preguntas', titulo: 'Preguntas', tipo: 'multiple_choice',
        preguntas: [
          { id:'q1',  puntos:2, numero:'1.',  texto:'Señale el enunciado INCORRECTO sobre nuestro credo de seguridad:', opciones:[{id:'A',texto:'Cuidaré solo de mi vida'},{id:'B',texto:'Cuidaré mi vida y la de mis compañeros, llegaré a mi casa tan sano como salí, realizaré mi trabajo evitando lesionarme, utilizaré los elementos de protección y reportaré cualquier situación insegura'}] },
          { id:'q2',  puntos:2, numero:'2.',  texto:'¿Qué es un Acto Inseguro?', opciones:[{id:'A',texto:'Incumplir los procedimientos'},{id:'B',texto:'No utilizar los EPPs completo'},{id:'C',texto:'No respetar las señalizaciones'},{id:'D',texto:'Todas las anteriores'}] },
          { id:'q3',  puntos:2, numero:'3.',  texto:'¿Qué es una condición insegura?', opciones:[{id:'A',texto:'No utilizar EPP'},{id:'B',texto:'Respetar señalizaciones'},{id:'C',texto:'Son las instalaciones, equipos de trabajo, maquinaria y herramientas que NO están en buenas condiciones'}] },
          { id:'q4',  puntos:1, numero:'4.',  texto:'¿Qué Equipos de protección personal debe utilizar un reparto?', opciones:[{id:'A',texto:'Botas punta de acero y chaleco reflectivo'},{id:'B',texto:'Casco, lentes, barbiquejo, guantes, chaleco reflectivo, mascarilla y zapatos de seguridad'}] },
          { id:'q5',  puntos:1, numero:'5.',  texto:'¿A qué peligros está expuesta la tripulación en el POC?', opciones:[{id:'A',texto:'Asalto y robo'},{id:'B',texto:'Atropello, resbalones, tropezones y caídas'},{id:'C',texto:'A y B'}] },
          { id:'q6',  puntos:1, numero:'6.',  texto:'¿Qué se recomienda hacer en caso de robo o asalto dentro de la cabina?', opciones:[{id:'A',texto:'Mantener la calma, presionar el botón de pánico, intentar robar el arma y controlar la situación'},{id:'B',texto:'Mantener la calma, presionar el botón de pánico, no intentar resolver la situación, ceder, llamar a la policía, poner la denuncia en el PNP más cercano y notificar a Seguridad CD'}] },
          { id:'q7',  puntos:1, numero:'7.',  texto:'¿Qué debes hacer en caso de un inicio de incendio en la unidad?', opciones:[{id:'A',texto:'Tomar inmediatamente el extintor y controlar el fuego'},{id:'B',texto:'Comunicar al empresario'},{id:'C',texto:'Retirarme del sitio'}] },
          { id:'q8',  puntos:1, numero:'8.',  texto:'Señale la afirmación correcta al llegar al POC:', opciones:[{id:'A',texto:'Al llegar al POC usted debe colocar los conos, bajar del camión y proceder a la entrega'},{id:'B',texto:'Al llegar al POC usted debe activar las luces de parqueo, apagar el camión, bajar del camión utilizando los 3 puntos de apoyo, poner los conos, tacos, y proceder a la entrega'}] },
          { id:'q9',  puntos:1, numero:'9.',  texto:'¿Qué EPP debes utilizar para manipular la carga?', opciones:[{id:'A',texto:'Guantes de seguridad'},{id:'B',texto:'Casco'},{id:'C',texto:'Casco, Lentes, Guantes, Chaleco y Zapatos de seguridad'}] },
          { id:'q10', puntos:2, numero:'10.', texto:'¿Cuál es el límite de velocidad en perimetrales?', opciones:[{id:'A',texto:'90 Km/h'},{id:'B',texto:'60 Km/h'}] },
          { id:'q11', puntos:2, numero:'11.', texto:'¿Cuál es el límite de velocidad en curvas?', opciones:[{id:'A',texto:'10 Km/h'},{id:'B',texto:'25 Km/h'},{id:'C',texto:'70 Km/h'}] },
          { id:'q12', puntos:2, numero:'12.', texto:'¿Cuál es el límite de velocidad dentro del centro de distribución?', opciones:[{id:'A',texto:'18 Km/h'},{id:'B',texto:'40 Km/h'},{id:'C',texto:'70 Km/h'}] },
          { id:'q13', puntos:1, numero:'13.', texto:'¿Con qué elemento de protección personal cuenta la tripulación para amenazas de asalto o robo?', opciones:[{id:'A',texto:'Whatsapp'},{id:'B',texto:'Mensaje de texto'},{id:'C',texto:'Botón de pánico'}] },
          { id:'q14', puntos:1, numero:'14.', texto:'¿Cuál es la distancia de segregación hombre y máquina?', opciones:[{id:'A',texto:'5 mts'},{id:'B',texto:'3 mts'},{id:'C',texto:'1 mts'}] },
        ],
      },
    ],
  },
};

// ── Cache de formularios y secciones ─────────────────────────
const evalSeccionesCache = {};
let   evalFormulariosCache = [];   // [{formulario_id, titulo, icono, color}]

async function cargarFormulariosEval(forzar = false) {
  if (!forzar && evalFormulariosCache.length) return evalFormulariosCache;
  try {
    const resp = await fetch('api/banco_preguntas/formularios.php');
    const data = await resp.json();
    if (!data.success) throw new Error(data.message);
    evalFormulariosCache = data.data;
  } catch {
    evalFormulariosCache = [
      { formulario_id: 'manejo_practica',  titulo: 'Manejo Práctica',   icono: 'fa-truck',          color: '#FFC107' },
      { formulario_id: 'examen_defensiva', titulo: 'Examen Defensiva',  icono: 'fa-shield-halved',  color: '#1565C0' },
      { formulario_id: 'induccion_t2',     titulo: 'Inducción T2',      icono: 'fa-graduation-cap', color: '#28A745' },
      { formulario_id: 'cd',               titulo: 'Inducción CD',       icono: 'fa-warehouse',      color: '#b0a207' },
    ];
  }
  evalRenderSelectorGrid();
  evalRenderFiltroTipo();
  return evalFormulariosCache;
}

function evalRenderSelectorGrid() {
  // Registrar tipos dinámicos en TIPO_LABELS para el listado
  evalFormulariosCache.forEach(f => {
    if (!TIPO_LABELS[f.formulario_id]) {
      TIPO_LABELS[f.formulario_id] = { label: f.titulo, icon: f.icono, color: '', style: `background:${f.color}22;color:${f.color}` };
    }
  });

  const grid = document.getElementById('eval-tipos-grid');
  if (!grid) return;
  if (!evalFormulariosCache.length) {
    grid.innerHTML = '<p style="color:var(--gris-400);padding:20px">No hay formularios disponibles.</p>';
    return;
  }
  grid.innerHTML = evalFormulariosCache.map(f => {
    const colorRgb = f.color || '#1565C0';
    const tituloEsc = f.titulo.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return `
    <div class="card eval-tipo-card" onclick="seleccionarTipoEval('${f.formulario_id}')"
         style="cursor:pointer;transition:all .2s;border:2px solid var(--gris-600)">
      <div class="card-body" style="padding:24px;display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center">
        <div style="width:56px;height:56px;border-radius:50%;background:${colorRgb}22;display:flex;align-items:center;justify-content:center">
          <i class="fas ${f.icono}" style="font-size:22px;color:${colorRgb}"></i>
        </div>
        <div>
          <div style="font-weight:700;font-size:15px;color:var(--gris-100)">${f.titulo}</div>
          <div style="font-size:12px;color:var(--gris-400);margin-top:4px">Evaluación · 20 pts</div>
        </div>
        <button class="btn btn-outline btn-sm" style="font-size:11px;margin-top:2px"
                onclick="event.stopPropagation();abrirEvalQr('${f.formulario_id}','${tituloEsc}','${colorRgb}')">
          <i class="fas fa-qrcode"></i> Link & QR
        </button>
      </div>
    </div>`;
  }).join('');
}

function evalRenderFiltroTipo() {
  const sel = document.getElementById('filtroEvalTipo');
  if (!sel) return;
  // Mantener el valor actual
  const prev = sel.value;
  // Eliminar opciones dinámicas anteriores (mantener solo "Todos")
  while (sel.options.length > 1) sel.remove(1);
  evalFormulariosCache.forEach(f => {
    const opt = new Option(f.titulo, f.formulario_id);
    if (f.formulario_id === prev) opt.selected = true;
    sel.add(opt);
  });
}

async function cargarSeccionesEval(tipo) {
  if (evalSeccionesCache[tipo]) return evalSeccionesCache[tipo];
  const resp = await fetch(`api/banco_preguntas/secciones.php?formulario=${tipo}`);
  const data = await resp.json();
  if (!data.success) throw new Error(data.message || 'Error al cargar preguntas');
  evalSeccionesCache[tipo] = data.data;
  return data.data;
}

function getEvalSecciones(tipo) {
  return evalSeccionesCache[tipo] || [];
}

// Retorna config del formulario (EVAL_CONFIG para los 3 base, genérico para nuevos)
function getEvalCfg(tipo) {
  if (EVAL_CONFIG[tipo]) return EVAL_CONFIG[tipo];
  const f = evalFormulariosCache.find(x => x.formulario_id === tipo);
  return {
    label:         f?.titulo || tipo,
    titulo:        'EVALUACIÓN: ' + (f?.titulo || tipo).toUpperCase(),
    subtitulo:     '',
    puntajeMaximo: 20,
    campos: [
      { id: 'fecha',   label: 'Fecha',    tipo: 'datetime_readonly', subtipo: 'date' },
      { id: 'hora',    label: 'Hora',     tipo: 'datetime_readonly', subtipo: 'time' },
      { id: 'empresa', label: 'Empresa',  tipo: 'select', opciones: ['Dicorjes'], required: true },
      { id: 'dni',     label: 'D.N.I.',   tipo: 'dni_autocomplete', required: true },
      { id: 'nombre',  label: 'Nombre y Apellido', tipo: 'text', required: true },
    ],
    secciones: [],
  };
}

// ── Estado del módulo ────────────────────────────────────────
let evalTipoActual = null;
let evalAprobFirmaCtx = null, evalAprobFirmaDrawing = false, evalAprobFirmaHasContent = false;
let evalIdActual = null;
let evalPageActual = 1;

// ── Navegación de tabs ───────────────────────────────────────
function switchEvalTab(tab) {
  document.querySelectorAll('.eval-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.eval-tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('eval-btn-' + tab).classList.add('active');
  document.getElementById('eval-panel-' + tab).classList.add('active');
  if (tab === 'listado') cargarListadoEval();
  if (tab === 'banco' && typeof bpInitBancoTab === 'function') bpInitBancoTab();
}

// ── Selector de tipo ─────────────────────────────────────────
async function seleccionarTipoEval(tipo) {
  evalTipoActual = tipo;
  const cfg = getEvalCfg(tipo);
  document.getElementById('eval-tipo-selector').style.display = 'none';
  document.getElementById('eval-form-container').style.display = 'block';
  document.getElementById('eval-form-titulo').textContent = cfg.titulo;
  renderCamposIdentificacion(cfg);
  document.getElementById('eval-observaciones').value = '';

  const secContainer = document.getElementById('eval-secciones');
  secContainer.innerHTML = '<div style="text-align:center;padding:40px"><div class="spinner"></div><p style="margin-top:12px;color:var(--gris-400);font-size:13px">Cargando preguntas...</p></div>';
  try {
    await cargarSeccionesEval(tipo);
    renderSecciones({ secciones: getEvalSecciones(tipo) });
  } catch (e) {
    secContainer.innerHTML = `<p style="color:var(--rojo);padding:20px;text-align:center"><i class="fas fa-triangle-exclamation"></i> Error al cargar las preguntas. Recarga la página.</p>`;
  }
}

function volverTipoSelector() {
  evalTipoActual = null;
  document.getElementById('eval-tipo-selector').style.display = 'block';
  document.getElementById('eval-form-container').style.display = 'none';
}

function cancelarEvaluacion() {
  volverTipoSelector();
  switchEvalTab('listado');
}

// ── Render: campos de identificación ─────────────────────────
function renderCamposIdentificacion(cfg) {
  const container = document.getElementById('eval-campos-identificacion');
  const now       = new Date();
  const hoyFecha  = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
  const horaAhora = now.toTimeString().slice(0, 5);
  let html = '';

  for (const campo of cfg.campos) {
    html += `<div class="form-group">`;
    html += `<label class="form-label">${campo.label}${campo.required ? ' *' : ''}</label>`;

    if (campo.tipo === 'datetime_readonly') {
      const val = campo.subtipo === 'date' ? hoyFecha : horaAhora;
      html += `<div style="position:relative">
        <input type="${campo.subtipo}" class="form-control eval-campo" id="eval-campo-${campo.id}"
               data-campo="${campo.id}" value="${val}" readonly
               style="background:var(--gris-700);color:var(--gris-400);cursor:not-allowed;padding-right:32px">
        <i class="fas fa-lock" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);color:var(--gris-600);font-size:11px;pointer-events:none"></i>
      </div>`;

    } else if (campo.tipo === 'dni_autocomplete') {
      html += `<div style="position:relative">
        <input type="text" class="form-control eval-campo" id="eval-campo-${campo.id}"
               data-campo="${campo.id}" placeholder="Escribe DNI o nombre para buscar..."
               autocomplete="off" oninput="buscarPersonalEval(this.value)"${campo.required ? ' required' : ''}>
        <input type="hidden" id="eval-personal-id" value="">
        <div id="evalPersonalAC" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:200;
             background:var(--gris-800);border:1px solid var(--gris-600);border-radius:0 0 8px 8px;
             max-height:200px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.4)"></div>
      </div>`;

    } else if (campo.tipo === 'text') {
      html += `<input type="text" class="form-control eval-campo" id="eval-campo-${campo.id}" data-campo="${campo.id}"${campo.required ? ' required' : ''}>`;

    } else if (campo.tipo === 'select') {
      html += `<select class="form-control eval-campo" id="eval-campo-${campo.id}" data-campo="${campo.id}"${campo.required ? ' required' : ''}>`;
      html += `<option value="">— Selecciona —</option>`;
      const opciones = (campo.id === 'empresa' && evalEmpresasCache.length)
        ? evalEmpresasCache.map(e => e.nombre)
        : (campo.opciones || []);
      for (const op of opciones) html += `<option value="${op}">${op}</option>`;
      html += `</select>`;

    } else if (campo.tipo === 'radio') {
      html += `<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:6px">`;
      for (const op of campo.opciones) {
        html += `<label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;color:var(--gris-200)">
          <input type="radio" name="eval-campo-${campo.id}" class="eval-campo-radio" data-campo="${campo.id}" value="${op}" style="accent-color:var(--primary)"> ${op}
        </label>`;
      }
      html += `</div>`;
    }
    html += `</div>`;
  }
  container.innerHTML = html;
}

// ── Render: secciones del formulario ─────────────────────────
function renderSecciones(cfg) {
  const container = document.getElementById('eval-secciones');
  let html = '';
  for (const sec of cfg.secciones) {
    if (sec.tipo === 'aplica_grid') {
      html += renderSeccionAplikaGrid(sec);
    } else if (sec.tipo === 'multiple_choice') {
      html += renderSeccionMultipleChoice(sec);
    }
  }
  container.innerHTML = html;
}

function renderSeccionAplikaGrid(sec) {
  const ptsLabel = sec.puntos + ' pt' + (sec.puntos !== 1 ? 's' : '');
  let html = `
    <div class="card" style="margin-bottom:18px">
      <div class="card-header">
        <h3><i class="fas fa-table-list"></i> ${sec.titulo}</h3>
        <span class="badge badge-yellow">${ptsLabel}</span>
      </div>
      <div class="card-body">
        <p style="font-size:12px;color:var(--gris-400);margin-bottom:14px">${sec.descripcion} <strong>Indicar APLICA o NO APLICA según sea el caso.</strong></p>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr>
                <th style="text-align:left;padding:8px 12px;font-size:12px;font-weight:700;color:var(--gris-300);border-bottom:2px solid var(--gris-600);width:55%">CRITERIO</th>
                <th style="text-align:center;padding:8px 12px;font-size:12px;font-weight:700;color:var(--verde);border-bottom:2px solid var(--gris-600);width:22%">APLICA</th>
                <th style="text-align:center;padding:8px 12px;font-size:12px;font-weight:700;color:var(--rojo);border-bottom:2px solid var(--gris-600);width:23%">NO APLICA</th>
              </tr>
            </thead>
            <tbody>`;

  for (const item of sec.items) {
    const n = `eval-${sec.id}-${item.id}`;
    html += `
      <tr style="border-bottom:1px solid var(--gris-700)">
        <td style="padding:10px 12px;font-size:13px;font-weight:600;color:var(--gris-200)">${item.label}</td>
        <td style="text-align:center;padding:10px">
          <label style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;border:2px solid var(--gris-600);transition:all .15s" class="eval-aplica-btn" data-sec="${sec.id}" data-item="${item.id}" data-val="aplica">
            <input type="radio" name="${n}" value="aplica" class="eval-aplica-radio" style="display:none">
            <i class="fas fa-check" style="font-size:13px;color:var(--verde);display:none"></i>
          </label>
        </td>
        <td style="text-align:center;padding:10px">
          <label style="cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;border:2px solid var(--gris-600);transition:all .15s" class="eval-aplica-btn" data-sec="${sec.id}" data-item="${item.id}" data-val="no_aplica">
            <input type="radio" name="${n}" value="no_aplica" class="eval-aplica-radio" style="display:none">
            <i class="fas fa-times" style="font-size:13px;color:var(--rojo);display:none"></i>
          </label>
        </td>
      </tr>`;
  }

  html += `
            </tbody>
          </table>
        </div>
        <div style="margin-top:10px;text-align:right;font-size:12px;color:var(--gris-400)" id="eval-score-${sec.id}">
          Puntaje sección: —/${sec.puntos} pts
        </div>
      </div>
    </div>`;

  return html;
}

function renderSeccionMultipleChoice(sec) {
  let html = `
    <div class="card" style="margin-bottom:18px">
      <div class="card-header"><h3><i class="fas fa-list-ol"></i> ${sec.titulo}</h3></div>
      <div class="card-body">`;

  for (const q of sec.preguntas) {
    html += `
      <div style="margin-bottom:22px;padding-bottom:18px;border-bottom:1px solid var(--gris-700)">
        <p style="font-size:13px;font-weight:600;color:var(--gris-100);margin-bottom:10px">
          <span style="color:var(--primary);font-weight:700">${q.numero}</span> ${q.texto}
          <span style="font-size:11px;color:var(--gris-500);margin-left:6px">(${q.puntos} pt${q.puntos !== 1 ? 's' : ''})</span>
        </p>
        <div style="display:flex;flex-direction:column;gap:6px">`;

    for (const op of q.opciones) {
      const radioId = `eval-q-${q.id}-${op.id}`;
      html += `
          <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:8px 12px;border-radius:8px;border:1px solid var(--gris-600);background:var(--gris-750, var(--gris-700));transition:all .15s;font-size:13px;color:var(--gris-200)" class="eval-opcion-label" id="lbl-${radioId}">
            <input type="radio" name="eval-q-${q.id}" value="${op.id}" class="eval-opcion-radio" data-qid="${q.id}" style="margin-top:2px;accent-color:var(--primary);flex-shrink:0">
            <span><strong style="color:var(--primary)">${op.id}.</strong> ${op.texto}</span>
          </label>`;
    }

    html += `
        </div>
      </div>`;
  }

  html += `
      </div>
    </div>`;

  return html;
}

// ── Eventos dinámicos: APLICA/NO APLICA ──────────────────────
document.addEventListener('click', function(e) {
  const btn = e.target.closest('.eval-aplica-btn');
  if (!btn) return;
  const secId  = btn.dataset.sec;
  const itemId = btn.dataset.item;
  const val    = btn.dataset.val;

  // Marcar radio interno
  const radio = btn.querySelector('input[type=radio]');
  if (radio) radio.checked = true;

  // Limpiar estilos de la fila
  const fila = btn.closest('tr');
  fila.querySelectorAll('.eval-aplica-btn').forEach(b => {
    b.style.background = '';
    b.style.borderColor = 'var(--gris-600)';
    b.querySelector('i').style.display = 'none';
  });

  // Aplicar estilo al seleccionado
  const icon = btn.querySelector('i');
  if (val === 'aplica') {
    btn.style.background = 'rgba(40,167,69,0.15)';
    btn.style.borderColor = 'var(--verde)';
  } else {
    btn.style.background = 'rgba(220,53,69,0.15)';
    btn.style.borderColor = 'var(--rojo)';
  }
  icon.style.display = 'block';

  actualizarScoreSeccion(secId);
});

// Hover en opciones múltiple choice
document.addEventListener('change', function(e) {
  if (!e.target.classList.contains('eval-opcion-radio')) return;
  const name = e.target.name;
  document.querySelectorAll(`input[name="${name}"]`).forEach(r => {
    const lbl = r.closest('.eval-opcion-label');
    if (lbl) lbl.style.borderColor = r.checked ? 'var(--primary)' : 'var(--gris-600)';
    if (lbl) lbl.style.background  = r.checked ? 'rgba(21,101,192,0.1)' : '';
  });
});

function actualizarScoreSeccion(secId) {
  if (!evalTipoActual) return;
  const sec = getEvalSecciones(evalTipoActual).find(s => s.id === secId);
  if (!sec || sec.tipo !== 'aplica_grid') return;

  let aplica = 0;
  for (const item of sec.items) {
    const checked = document.querySelector(`input[name="eval-${secId}-${item.id}"]:checked`);
    if (checked && checked.value === 'aplica') aplica++;
  }
  const pts = ((aplica / sec.items.length) * sec.puntos).toFixed(2);
  const el = document.getElementById('eval-score-' + secId);
  if (el) el.textContent = `Puntaje sección: ${pts}/${sec.puntos} pts`;
}

// ── Autocomplete DNI desde módulo Personal ────────────────────
async function buscarPersonalEval(q) {
  const ac = document.getElementById('evalPersonalAC');
  if (!ac) return;
  document.getElementById('eval-personal-id').value = '';
  if (q.length < 2) { cerrarEvalPersonalAC(); return; }

  try {
    const r = await fetch(`api/personal.php?action=buscar&q=${encodeURIComponent(q)}`);
    const d = await r.json();
    const items = d.data || [];

    if (!items.length) {
      ac.innerHTML = '<div style="padding:10px 14px;font-size:12px;color:var(--gris-400)">Sin resultados — puedes escribir manualmente</div>';
      ac.style.display = 'block';
      return;
    }

    ac.innerHTML = items.map(p => {
      const nombre = p.nombre.replace(/"/g, '&quot;');
      const dni    = (p.dni || '').replace(/"/g, '&quot;');
      const cargo  = (p.cargo || '').replace(/"/g, '&quot;');
      return `<div class="auto-item" style="padding:9px 14px;cursor:pointer;border-bottom:1px solid var(--gris-700);font-size:13px"
                   data-pid="${p.id}" data-nombre="${nombre}" data-dni="${dni}" data-cargo="${cargo}"
                   onclick="seleccionarPersonalEvalItem(this)"
                   onmouseenter="this.style.background='var(--gris-700)'"
                   onmouseleave="this.style.background=''">
        <strong style="color:var(--gris-100)">${p.nombre}</strong>
        <span style="font-size:11px;color:var(--gris-400);margin-left:8px">DNI ${p.dni}${p.cargo ? ' · ' + p.cargo : ''}</span>
      </div>`;
    }).join('');
    ac.style.display = 'block';
  } catch { cerrarEvalPersonalAC(); }
}

function seleccionarPersonalEvalItem(el) {
  seleccionarPersonalEval(el.dataset.pid, el.dataset.nombre, el.dataset.dni, el.dataset.cargo);
}

function seleccionarPersonalEval(id, nombre, dni, cargo) {
  const pidEl = document.getElementById('eval-personal-id');
  if (pidEl) pidEl.value = id;

  const dniEl = document.getElementById('eval-campo-dni');
  if (dniEl) dniEl.value = dni;

  const nombreEl = document.getElementById('eval-campo-nombre');
  if (nombreEl) nombreEl.value = nombre;

  // Intenta coincidir cargo con opciones del campo puesto (select)
  const puestoEl = document.getElementById('eval-campo-puesto');
  if (puestoEl && cargo) {
    for (const opt of puestoEl.options) {
      if (opt.value.toLowerCase() === cargo.toLowerCase()) { opt.selected = true; break; }
    }
  }

  cerrarEvalPersonalAC();
}

function cerrarEvalPersonalAC() {
  const ac = document.getElementById('evalPersonalAC');
  if (ac) { ac.innerHTML = ''; ac.style.display = 'none'; }
}

// ── Recolectar respuestas ─────────────────────────────────────
function obtenerCamposIdentificacion() {
  const data = {};
  // Inputs/selects
  document.querySelectorAll('.eval-campo').forEach(el => {
    data[el.dataset.campo] = el.value.trim();
  });
  // Radios (conductor_tipo, etc.)
  document.querySelectorAll('.eval-campo-radio:checked').forEach(r => {
    data[r.dataset.campo] = r.value;
  });
  return data;
}

function obtenerRespuestasEval() {
  if (!evalTipoActual) return {};
  const respuestas = {};

  for (const sec of getEvalSecciones(evalTipoActual)) {
    if (sec.tipo === 'aplica_grid') {
      respuestas[sec.id] = {};
      for (const item of sec.items) {
        const checked = document.querySelector(`input[name="eval-${sec.id}-${item.id}"]:checked`);
        respuestas[sec.id][item.id] = checked ? checked.value : '';
      }
    } else if (sec.tipo === 'multiple_choice') {
      for (const q of sec.preguntas) {
        const checked = document.querySelector(`input[name="eval-q-${q.id}"]:checked`);
        respuestas[q.id] = checked ? checked.value : '';
      }
    }
  }
  return respuestas;
}

// ── Guardar evaluación ────────────────────────────────────────
async function guardarEvaluacion() {
  if (!evalTipoActual) return;
  const cfg    = getEvalCfg(evalTipoActual);
  const campos = obtenerCamposIdentificacion();

  // Validar campos requeridos
  for (const campo of cfg.campos) {
    if (campo.required) {
      const v = campos[campo.id] || '';
      if (!v) { toast(`El campo "${campo.label}" es obligatorio.`, 'error'); return; }
    }
  }

  // Validar que todas las preguntas / items tengan respuesta
  const respuestas = obtenerRespuestasEval();
  let incompleto = false;
  for (const sec of getEvalSecciones(evalTipoActual)) {
    if (sec.tipo === 'aplica_grid') {
      for (const item of sec.items) {
        if (!respuestas[sec.id]?.[item.id]) { incompleto = true; break; }
      }
    } else if (sec.tipo === 'multiple_choice') {
      for (const q of sec.preguntas) {
        if (!respuestas[q.id]) { incompleto = true; break; }
      }
    }
    if (incompleto) break;
  }
  if (incompleto) { toast('Completa todas las preguntas / criterios antes de guardar.', 'error'); return; }

  const btn = document.getElementById('btnGuardarEval');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Guardando...';

  const fd = new FormData();
  fd.append('csrf_token',    CSRF_TOKEN);
  fd.append('tipo',          evalTipoActual);
  fd.append('fecha',         campos.fecha || (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); })());
  fd.append('empresa',       campos.empresa       || '');
  fd.append('nombre',        campos.nombre        || '');
  fd.append('dni',           campos.dni           || '');
  fd.append('puesto',        campos.puesto        || '');
  fd.append('tipo_unidad',   campos.tipo_unidad   || '');
  fd.append('estado_unidad', campos.estado_unidad || '');
  fd.append('conductor_tipo',campos.conductor_tipo || '');
  fd.append('observaciones', document.getElementById('eval-observaciones').value);
  fd.append('respuestas',    JSON.stringify(respuestas));

  try {
    const resp = await fetch('api/guardar_evaluacion.php', { method: 'POST', body: fd });
    const data = await resp.json();
    if (data.success) {
      const pct = data.data.porcentaje;
      const color = pct >= 80 ? 'success' : pct >= 60 ? 'warning' : 'error';
      toast(`✔ Evaluación guardada · ${pct}% (${data.data.puntaje}/${data.data.puntaje_max} pts)`, color, 6000);
      cancelarEvaluacion();
    } else {
      toast(data.message || 'Error al guardar.', 'error');
    }
  } catch {
    toast('Error de conexión con el servidor.', 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-save"></i> Guardar Evaluación';
}

// ── Firma del aprobador ───────────────────────────────────────
function initFirmaAprobador() {
  const canvas = document.getElementById('evalFirmaAprobadorCanvas');
  if (!canvas) return;
  evalAprobFirmaCtx = canvas.getContext('2d');
  evalAprobFirmaCtx.fillStyle = '#FFFFFF';
  evalAprobFirmaCtx.fillRect(0, 0, canvas.width, canvas.height);
  evalAprobFirmaCtx.strokeStyle = '#1565C0';
  evalAprobFirmaCtx.lineWidth = 2;
  evalAprobFirmaCtx.lineCap = 'round';
  evalAprobFirmaHasContent = false;

  const pos = (e, r) => {
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - r.left) * (canvas.width / r.width), y: (src.clientY - r.top) * (canvas.height / r.height) };
  };
  canvas.onmousedown  = e => { evalAprobFirmaDrawing = true; const r = canvas.getBoundingClientRect(), p = pos(e,r); evalAprobFirmaCtx.beginPath(); evalAprobFirmaCtx.moveTo(p.x,p.y); };
  canvas.onmouseup    = () => evalAprobFirmaDrawing = false;
  canvas.onmouseleave = () => evalAprobFirmaDrawing = false;
  canvas.onmousemove  = e => { if (!evalAprobFirmaDrawing) return; const r = canvas.getBoundingClientRect(), p = pos(e,r); evalAprobFirmaCtx.lineTo(p.x,p.y); evalAprobFirmaCtx.stroke(); evalAprobFirmaHasContent = true; };
  canvas.ontouchstart = e => { e.preventDefault(); evalAprobFirmaDrawing = true; const r = canvas.getBoundingClientRect(), p = pos(e,r); evalAprobFirmaCtx.beginPath(); evalAprobFirmaCtx.moveTo(p.x,p.y); };
  canvas.ontouchend   = () => evalAprobFirmaDrawing = false;
  canvas.ontouchmove  = e => { e.preventDefault(); if (!evalAprobFirmaDrawing) return; const r = canvas.getBoundingClientRect(), p = pos(e,r); evalAprobFirmaCtx.lineTo(p.x,p.y); evalAprobFirmaCtx.stroke(); evalAprobFirmaHasContent = true; };
}

function limpiarFirmaAprobador() {
  const canvas = document.getElementById('evalFirmaAprobadorCanvas');
  if (!evalAprobFirmaCtx || !canvas) return;
  evalAprobFirmaCtx.fillStyle = '#FFFFFF';
  evalAprobFirmaCtx.fillRect(0, 0, canvas.width, canvas.height);
  evalAprobFirmaHasContent = false;
}

// ── Listado ───────────────────────────────────────────────────
async function cargarListadoEval(page = 1) {
  evalPageActual = page;
  const params = new URLSearchParams({
    tipo:   document.getElementById('filtroEvalTipo')?.value   || '',
    estado: document.getElementById('filtroEvalEstado')?.value || '',
    desde:  document.getElementById('filtroEvalDesde')?.value  || '',
    hasta:  document.getElementById('filtroEvalHasta')?.value  || '',
    q:      document.getElementById('filtroEvalQ')?.value      || '',
    page, limit: 20,
  });

  const tbody = document.getElementById('evalTablaBody');
  if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px"><div class="spinner"></div></td></tr>';

  try {
    const resp = await fetch('api/listar_evaluaciones.php?' + params);
    const data = await resp.json();
    if (!data.success) {
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--rojo)"><i class="fas fa-triangle-exclamation"></i> ${data.message || 'Error al cargar.'}</td></tr>`;
      return;
    }
    renderTablaEval(data.data);
  } catch (err) {
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--gris-400)">Error de conexión con el servidor.</td></tr>';
    console.error('[evaluaciones]', err);
  }
}

const TIPO_LABELS = {
  manejo_practica:  { label: 'Manejo Práctica',      color: 'badge-yellow', icon: 'fa-truck' },
  examen_defensiva: { label: 'Examen Defensiva',      color: '',             icon: 'fa-shield-halved', style: 'background:rgba(21,101,192,0.2);color:var(--primary)' },
  induccion_t2:     { label: 'Inducción T2',          color: '',             icon: 'fa-graduation-cap', style: 'background:rgba(40,167,69,0.2);color:var(--verde)' },
};

const ESTADO_LABELS = {
  pendiente_revision: { label: 'Pendiente revisión', color: 'background:rgba(255,193,7,0.2);color:var(--amarillo)' },
  aprobado:           { label: 'Aprobado',           color: 'background:rgba(40,167,69,0.2);color:var(--verde)' },
  desaprobado:        { label: 'Desaprobado',        color: 'background:rgba(220,53,69,0.2);color:var(--rojo)' },
};

function renderTablaEval({ rows, total, page, limit, totalPages }) {
  const tbody = document.getElementById('evalTablaBody');
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--gris-400)">Sin evaluaciones registradas</td></tr>';
    document.getElementById('evalPaginacion').innerHTML = '';
    return;
  }

  tbody.innerHTML = rows.map(r => {
    const tipoInfo   = TIPO_LABELS[r.tipo]   || { label: r.tipo, color: '', icon: 'fa-file', style: '' };
    const estadoInfo = ESTADO_LABELS[r.estado] || { label: r.estado, color: '' };
    const pct        = parseFloat(r.porcentaje);
    const pctColor   = pct >= 80 ? 'var(--verde)' : pct >= 60 ? 'var(--amarillo)' : 'var(--rojo)';
    const tipoBadge  = tipoInfo.color
      ? `<span class="badge ${tipoInfo.color}"><i class="fas ${tipoInfo.icon}"></i> ${tipoInfo.label}</span>`
      : `<span class="badge" style="${tipoInfo.style || ''}"><i class="fas ${tipoInfo.icon}"></i> ${tipoInfo.label}</span>`;

    const origenBadge = r.origen === 'publico'
      ? ` <span class="badge" style="background:rgba(21,101,192,0.15);color:var(--primary);font-size:10px" title="Enviada por link/QR público"><i class="fas fa-qrcode"></i> QR</span>`
      : '';

    return `<tr>
      <td style="font-size:13px">${r.fecha}</td>
      <td>${tipoBadge}</td>
      <td style="font-size:13px;font-weight:600">${r.nombre}${origenBadge}</td>
      <td style="font-size:12px;font-family:monospace">${r.dni}</td>
      <td style="font-size:12px">${r.empresa || '—'}</td>
      <td style="text-align:center">
        <span style="font-weight:700;color:${pctColor};font-size:14px">${pct}%</span>
        <div style="font-size:11px;color:var(--gris-400)">${r.puntaje}/${r.puntaje_maximo}</div>
      </td>
      <td style="text-align:center">
        <span class="badge" style="${estadoInfo.color}">${estadoInfo.label}</span>
      </td>
      <td style="text-align:center;white-space:nowrap">
        <button class="btn btn-outline btn-sm" onclick="verEvaluacion(${r.id})" title="Ver detalle">
          <i class="fas fa-eye"></i>
        </button>
        ${(r.estado === 'pendiente_revision' && (USER_ROL === 'administrador' || USER_ROL === 'supervisor')) ? `<button class="btn btn-success btn-sm" onclick="aprobarEvalRapido(${r.id},\`${r.nombre}\`)" title="Aprobar"><i class="fas fa-check"></i></button>` : ''}
        ${USER_ROL === 'administrador' ? `<button class="btn btn-danger btn-sm" onclick="eliminarEvaluacion(${r.id},\`${r.nombre}\`)" title="Eliminar"><i class="fas fa-trash"></i></button>` : ''}
      </td>
    </tr>`;
  }).join('');

  // Paginación
  const pag = document.getElementById('evalPaginacion');
  if (pag) {
    const desde = (page - 1) * limit + 1;
    const hasta = Math.min(page * limit, total);
    let btns = '';
    for (let p = 1; p <= totalPages; p++) {
      if (totalPages <= 7 || Math.abs(p - page) <= 2 || p === 1 || p === totalPages) {
        btns += `<button${p === page ? ' class="active"' : ''} onclick="cargarListadoEval(${p})">${p}</button>`;
      } else if (btns.slice(-4) !== '...') {
        btns += `<button disabled>…</button>`;
      }
    }
    pag.innerHTML = `
      <span class="amon-pag-info">${desde}–${hasta} de ${total}</span>
      <div class="amon-pag-btns">
        <button${page <= 1 ? ' disabled' : ''} onclick="cargarListadoEval(${page - 1})">‹</button>
        ${btns}
        <button${page >= totalPages ? ' disabled' : ''} onclick="cargarListadoEval(${page + 1})">›</button>
      </div>`;
  }
}

// ── Ver / Revisar evaluación ──────────────────────────────────
async function verEvaluacion(id) {
  evalIdActual = id;
  document.getElementById('modalEvalBody').innerHTML = '<div style="text-align:center;padding:40px"><div class="spinner"></div></div>';
  document.getElementById('modalEvalAprobacion').style.display = 'none';
  abrirModal('modalEvaluacion');

  try {
    const resp = await fetch(`api/detalle_evaluacion.php?id=${id}`);
    const data = await resp.json();
    if (!data.success) { toast(data.message || 'Error.', 'error'); return; }
    // Asegurar secciones cargadas para el tipo de esta evaluación
    try { await cargarSeccionesEval(data.data.tipo); } catch (_) {}
    renderDetalleEval(data.data);
  } catch {
    toast('Error de conexión.', 'error');
  }
}

function renderDetalleEval(ev) {
  const cfg = { ...getEvalCfg(ev.tipo), secciones: getEvalSecciones(ev.tipo) };
  const tipoInfo   = TIPO_LABELS[ev.tipo]   || {};
  const estadoInfo = ESTADO_LABELS[ev.estado] || { label: ev.estado, color: '' };
  const pct = parseFloat(ev.porcentaje);
  const pctColor = pct >= 80 ? 'var(--verde)' : pct >= 60 ? 'var(--amarillo)' : 'var(--rojo)';

  // Título del modal
  document.getElementById('modalEvalTitulo').innerHTML =
    `<i class="fas fa-clipboard-check" style="color:var(--amarillo)"></i> ${cfg?.titulo || ev.tipo}`;

  let html = '';

  // ── Resumen ──────────────────────────────────────────────
  html += `
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px">
      <div class="card" style="padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--gris-400);margin-bottom:4px">NOMBRE</div>
        <div style="font-weight:700;font-size:14px;color:var(--gris-100)">${ev.nombre}</div>
      </div>
      <div class="card" style="padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--gris-400);margin-bottom:4px">DNI</div>
        <div style="font-weight:700;font-size:14px;font-family:monospace">${ev.dni}</div>
      </div>
      <div class="card" style="padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--gris-400);margin-bottom:4px">FECHA</div>
        <div style="font-weight:700;font-size:14px">${ev.fecha}</div>
      </div>
      <div class="card" style="padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--gris-400);margin-bottom:4px">PUNTAJE</div>
        <div style="font-weight:800;font-size:22px;color:${pctColor}">${pct}%</div>
        <div style="font-size:11px;color:var(--gris-400)">${ev.puntaje}/${ev.puntaje_maximo} pts</div>
      </div>
      <div class="card" style="padding:14px;text-align:center">
        <div style="font-size:11px;color:var(--gris-400);margin-bottom:4px">ESTADO</div>
        <span class="badge" style="${estadoInfo.color};font-size:12px">${estadoInfo.label}</span>
      </div>
    </div>`;

  // Datos adicionales
  const extras = [];
  if (ev.empresa)       extras.push(['Empresa', ev.empresa]);
  if (ev.puesto)        extras.push(['Puesto', ev.puesto]);
  if (ev.tipo_unidad)   extras.push(['Unidad', ev.tipo_unidad]);
  if (ev.estado_unidad) extras.push(['Estado unidad', ev.estado_unidad]);
  if (ev.conductor_tipo)extras.push(['Tipo conductor', ev.conductor_tipo]);
  if (ev.evaluador_nombre) extras.push(['Evaluador', ev.evaluador_nombre]);

  if (extras.length) {
    html += `<div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:20px">`;
    for (const [k, v] of extras) {
      html += `<div style="font-size:12px"><span style="color:var(--gris-400)">${k}:</span> <strong style="color:var(--gris-200)">${v}</strong></div>`;
    }
    html += `</div>`;
  }

  // ── Respuestas ────────────────────────────────────────────
  if (cfg) {
    for (const sec of cfg.secciones) {
      if (sec.tipo === 'aplica_grid') {
        const secResp = ev.respuestas[sec.id] || {};
        let aplica = 0;
        html += `
          <div style="margin-bottom:18px">
            <div style="font-weight:700;font-size:13px;color:var(--gris-300);margin-bottom:10px;display:flex;justify-content:space-between">
              <span>${sec.titulo}</span>
              <span style="color:var(--gris-400)">Máx ${sec.puntos} pts</span>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:12px">
              <thead><tr>
                <th style="text-align:left;padding:6px 10px;background:var(--gris-700);color:var(--gris-300);border-radius:4px 0 0 4px">Criterio</th>
                <th style="text-align:center;padding:6px 10px;background:var(--gris-700);color:var(--verde)">Aplica</th>
                <th style="text-align:center;padding:6px 10px;background:var(--gris-700);color:var(--rojo);border-radius:0 4px 4px 0">No Aplica</th>
              </tr></thead>
              <tbody>`;

        for (const item of sec.items) {
          const val = secResp[item.id] || '';
          if (val === 'aplica') aplica++;
          html += `<tr style="border-bottom:1px solid var(--gris-700)">
            <td style="padding:7px 10px;color:var(--gris-200)">${item.label}</td>
            <td style="text-align:center;padding:7px">${val === 'aplica'  ? '<i class="fas fa-check" style="color:var(--verde)"></i>' : ''}</td>
            <td style="text-align:center;padding:7px">${val === 'no_aplica' ? '<i class="fas fa-times" style="color:var(--rojo)"></i>' : ''}</td>
          </tr>`;
        }

        const pts = ((aplica / sec.items.length) * sec.puntos).toFixed(2);
        html += `</tbody></table>
            <div style="text-align:right;font-size:11px;color:var(--gris-400);margin-top:4px">
              Puntaje sección: <strong style="color:var(--gris-200)">${pts}/${sec.puntos}</strong>
            </div>
          </div>`;

      } else if (sec.tipo === 'multiple_choice') {
        const correctas = ev.respuestas_correctas || {};
        html += `<div style="margin-bottom:18px">
          <div style="font-weight:700;font-size:13px;color:var(--gris-300);margin-bottom:12px">Preguntas y Respuestas</div>`;

        for (const q of sec.preguntas) {
          const resp     = ev.respuestas[q.id] || '';
          const correcta = correctas[q.id]     || '';
          const esCorr   = resp === correcta && correcta !== '';
          const opElegida = q.opciones.find(o => o.id === resp);
          const opCorr    = q.opciones.find(o => o.id === correcta);
          const borderColor = esCorr ? 'var(--verde)' : resp ? 'var(--rojo)' : 'var(--gris-600)';

          html += `
            <div style="margin-bottom:14px;padding:12px;border:1px solid ${borderColor};border-radius:8px;background:var(--gris-800)">
              <div style="font-size:12px;font-weight:600;color:var(--gris-100);margin-bottom:8px">
                <span style="color:var(--primary)">${q.numero}</span> ${q.texto}
                <span style="float:right;font-size:11px;color:var(--gris-400)">${q.puntos} pt${q.puntos !== 1 ? 's' : ''}</span>
              </div>
              <div style="font-size:12px;margin-bottom:${!esCorr && correcta ? '6px' : '0'}">
                <i class="fas ${esCorr ? 'fa-check-circle' : 'fa-times-circle'}" style="color:${esCorr ? 'var(--verde)' : 'var(--rojo)'}"></i>
                Respuesta: <strong>${resp ? `${resp}. ${opElegida?.texto || ''}` : '— sin respuesta —'}</strong>
                ${esCorr ? `<span style="color:var(--verde);font-size:11px"> (+${q.puntos} pts)</span>` : `<span style="color:var(--rojo);font-size:11px"> (0 pts)</span>`}
              </div>
              ${!esCorr && correcta ? `<div style="font-size:11px;color:var(--verde)"><i class="fas fa-lightbulb"></i> Correcta: ${correcta}. ${opCorr?.texto || ''}</div>` : ''}
            </div>`;
        }
        html += `</div>`;
      }
    }
  }

  // Observaciones
  if (ev.observaciones) {
    html += `
      <div style="margin-bottom:18px;padding:12px;border-left:3px solid var(--primary);background:var(--gris-800);border-radius:0 8px 8px 0">
        <div style="font-size:11px;color:var(--gris-400);margin-bottom:4px">OBSERVACIONES</div>
        <div style="font-size:13px;color:var(--gris-200)">${ev.observaciones}</div>
      </div>`;
  }

  // Firma del evaluador
  if (ev.firma_evaluado) {
    html += `
      <div style="margin-bottom:18px">
        <div style="font-size:12px;color:var(--gris-400);margin-bottom:6px"><i class="fas fa-signature"></i> Firma del Evaluador</div>
        <div style="border:1px solid var(--gris-600);border-radius:8px;padding:8px;background:#fff;display:inline-block;max-width:100%">
          <img src="${ev.firma_evaluado}" style="max-width:400px;height:auto;display:block">
        </div>
        <div style="font-size:11px;color:var(--gris-400);margin-top:4px">${ev.evaluador_nombre || ''}</div>
      </div>`;
  }

  // Info de aprobación si ya fue procesado
  if (ev.estado !== 'pendiente_revision' && ev.aprobador_nombre) {
    const estadoAprob = ESTADO_LABELS[ev.estado] || {};
    html += `
      <div style="border:1px solid var(--gris-600);border-radius:8px;padding:16px;margin-bottom:12px">
        <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:var(--gris-200)">
          <i class="fas fa-stamp"></i> Revisión:
          <span class="badge" style="${estadoAprob.color}">${estadoAprob.label}</span>
        </div>
        <div style="font-size:12px;color:var(--gris-400)">Revisado por: <strong style="color:var(--gris-200)">${ev.aprobador_nombre}</strong> el ${ev.aprobado_en?.split(' ')[0] || ''}</div>
        ${ev.comentario_aprobacion ? `<div style="font-size:12px;color:var(--gris-300);margin-top:6px">"${ev.comentario_aprobacion}"</div>` : ''}
        ${ev.firma_aprobador ? `<div style="margin-top:10px;border:1px solid var(--gris-600);border-radius:6px;padding:6px;background:#fff;display:inline-block"><img src="${ev.firma_aprobador}" style="max-width:360px;height:auto;display:block"></div>` : ''}
      </div>`;
  }

  document.getElementById('modalEvalBody').innerHTML = html;

  // Mostrar sección de aprobación si corresponde
  if (ev.puede_aprobar) {
    document.getElementById('evalComentarioAprobacion').value = '';
    document.getElementById('modalEvalAprobacion').style.display = 'block';
    setTimeout(() => initFirmaAprobador(), 50);
  }
}

// ── Procesar aprobación ───────────────────────────────────────
async function procesarAprobacion(accion) {
  const canvas = document.getElementById('evalFirmaAprobadorCanvas');
  if (!evalAprobFirmaHasContent || !canvas) {
    toast('Dibuja tu firma para continuar.', 'error'); return;
  }

  const btnId = accion === 'aprobar' ? 'btnAprobarEval' : 'btnRechazarEval';
  const btn   = document.getElementById(btnId);
  btn.disabled = true;

  const fd = new FormData();
  fd.append('csrf_token',       CSRF_TOKEN);
  fd.append('id',               evalIdActual);
  fd.append('accion',           accion);
  fd.append('comentario',       document.getElementById('evalComentarioAprobacion').value);
  fd.append('firma_aprobador',  canvas.toDataURL('image/png'));

  try {
    const resp = await fetch('api/aprobar_evaluacion.php', { method: 'POST', body: fd });
    const data = await resp.json();
    if (data.success) {
      toast(data.message, 'success', 5000);
      cerrarModal('modalEvaluacion');
      cargarListadoEval(evalPageActual);
    } else {
      toast(data.message || 'Error.', 'error');
    }
  } catch {
    toast('Error de conexión.', 'error');
  }

  btn.disabled = false;
}

// ── Empresas dinámicas ───────────────────────────────────────
let evalEmpresasCache = [];

async function cargarEmpresasEval() {
  try {
    const r = await fetch('api/eval_empresas.php?action=list');
    const d = await r.json();
    if (d.success) evalEmpresasCache = d.data;
  } catch { /* silencioso */ }
}

function inyectarEmpresasEnSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">— Selecciona —</option>';
  evalEmpresasCache.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e.nombre; opt.textContent = e.nombre;
    if (e.nombre === prev) opt.selected = true;
    sel.appendChild(opt);
  });
}

async function abrirGestionEmpresas() {
  abrirModal('modalEvalEmpresas');
  await renderListaEmpresas();
}

async function renderListaEmpresas() {
  const lista = document.getElementById('evalEmpresasLista');
  lista.innerHTML = '<div style="text-align:center;padding:20px;color:var(--gris-400)"><div class="spinner" style="margin:0 auto 8px"></div></div>';
  const r = await fetch('api/eval_empresas.php?action=list');
  const d = await r.json();
  evalEmpresasCache = d.data || [];
  if (!evalEmpresasCache.length) {
    lista.innerHTML = '<p style="color:var(--gris-400);text-align:center;padding:16px">Sin empresas registradas.</p>';
    return;
  }
  lista.innerHTML = evalEmpresasCache.map(e => `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--gris-700);border-radius:6px;border:1px solid var(--gris-600)">
      <span style="font-size:14px;color:var(--gris-100)"><i class="fas fa-building" style="color:var(--primary);margin-right:8px;font-size:12px"></i>${e.nombre}</span>
      <button class="btn btn-danger btn-sm" style="padding:3px 8px" onclick="eliminarEmpresa(${e.id},'${e.nombre.replace(/'/g,"\\'")}')">
        <i class="fas fa-trash"></i>
      </button>
    </div>`).join('');
  // Actualizar selects abiertos
  inyectarEmpresasEnSelect('eval-campo-empresa');
}

async function agregarEmpresa() {
  const inp = document.getElementById('evalEmpresaNueva');
  const nombre = inp.value.trim();
  if (!nombre) { toast('Escribe el nombre de la empresa', 'error'); return; }
  const fd = new FormData();
  fd.append('action', 'add'); fd.append('csrf_token', CSRF_TOKEN); fd.append('nombre', nombre);
  const r = await fetch('api/eval_empresas.php', { method: 'POST', body: fd });
  const d = await r.json();
  if (d.success) { inp.value = ''; toast('Empresa agregada', 'success'); await renderListaEmpresas(); }
  else toast(d.message || 'Error', 'error');
}

async function eliminarEmpresa(id, nombre) {
  if (!confirm(`¿Eliminar la empresa "${nombre}"?`)) return;
  const fd = new FormData();
  fd.append('action', 'delete'); fd.append('csrf_token', CSRF_TOKEN); fd.append('id', id);
  const r = await fetch('api/eval_empresas.php', { method: 'POST', body: fd });
  const d = await r.json();
  if (d.success) { toast('Empresa eliminada', 'success'); await renderListaEmpresas(); }
  else toast(d.message || 'Error', 'error');
}

// ── Aprobación rápida desde el listado (sin firma) ────────────
async function aprobarEvalRapido(id, nombre) {
  if (!confirm(`¿Aprobar la evaluación de "${nombre}"?`)) return;
  const fd = new FormData();
  fd.append('csrf_token', CSRF_TOKEN);
  fd.append('id', id);
  fd.append('accion', 'aprobar');
  try {
    const r = await fetch('api/aprobar_evaluacion.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (d.success) { toast(d.message || 'Evaluación aprobada', 'success'); cargarListadoEval(evalPageActual); }
    else toast(d.message || 'Error al aprobar', 'error');
  } catch { toast('Error de conexión', 'error'); }
}

// ── Eliminar evaluación ───────────────────────────────────────
async function eliminarEvaluacion(id, nombre) {
  if (!confirm(`¿Eliminar la evaluación de "${nombre}"? Esta acción no se puede deshacer.`)) return;
  const fd = new FormData();
  fd.append('csrf_token', CSRF_TOKEN);
  fd.append('id', id);
  try {
    const r = await fetch('api/eliminar_evaluacion.php', { method: 'POST', body: fd });
    const d = await r.json();
    if (d.success) { toast('Evaluación eliminada', 'success'); cargarListadoEval(evalPageActual); }
    else toast(d.message || 'Error al eliminar', 'error');
  } catch { toast('Error de conexión', 'error'); }
}

// ── Link & QR por tipo de evaluación ─────────────────────────
let _evalQrInstance = null;

function abrirEvalQr(formularioId, titulo, color) {
  document.getElementById('modalEvalQrTitulo').innerHTML =
    `<i class="fas fa-qrcode"></i> ${titulo}`;

  // Link a la página PÚBLICA (sin login) — cualquier persona puede abrirlo
  const dir = window.location.pathname.replace(/[^/]*$/, '');   // .../distribucion-segura/
  const url = `${window.location.origin}${dir}eval_publico.php?eval=${encodeURIComponent(formularioId)}`;
  document.getElementById('evalQrLink').value = url;

  const qrDiv = document.getElementById('evalQrCanvas');
  qrDiv.innerHTML = '';
  _evalQrInstance = null;

  if (window.QRCode) {
    // colorDark SIEMPRE oscuro de alto contraste: un QR con el color de
    // marca (dorado/amarillo) sobre blanco no es legible por los escáneres.
    _evalQrInstance = new QRCode(qrDiv, {
      text: url,
      width: 220,
      height: 220,
      colorDark:  '#111111',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });
  } else {
    qrDiv.innerHTML = '<p style="color:var(--gris-400);font-size:13px">QR no disponible (sin conexión)</p>';
  }

  abrirModal('modalEvalQr');
}

function copiarLinkEval() {
  const val = document.getElementById('evalQrLink').value;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(val).then(() => toast('Link copiado', 'success'));
  } else {
    const inp = document.getElementById('evalQrLink');
    inp.select(); document.execCommand('copy'); toast('Link copiado', 'success');
  }
}

function descargarQrEval() {
  const canvas = document.querySelector('#evalQrCanvas canvas');
  if (!canvas) { toast('QR no generado aún', 'error'); return; }
  const a = document.createElement('a');
  a.download = 'qr-evaluacion.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
}

// ── Init al mostrar la página ─────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Cerrar autocomplete DNI al hacer clic fuera
  document.addEventListener('click', e => {
    if (!e.target.closest('#eval-campo-dni') && !e.target.closest('#evalPersonalAC')) {
      cerrarEvalPersonalAC();
    }
  });

  const page = document.getElementById('page-evaluaciones');
  if (!page) return;

  // Usar fecha local del cliente para evitar desfase de timezone servidor
  const hoy = new Date();
  const hoyStr = hoy.getFullYear() + '-' +
    String(hoy.getMonth() + 1).padStart(2, '0') + '-' +
    String(hoy.getDate()).padStart(2, '0');
  const hasta = document.getElementById('filtroEvalHasta');
  if (hasta && !hasta.value) hasta.value = hoyStr;

  // Cargar formularios y empresas al inicio
  cargarFormulariosEval();
  cargarEmpresasEval();

  const observer = new MutationObserver(() => {
    if (page.style.display !== 'none' && !page.dataset.evalInit) {
      page.dataset.evalInit = '1';
      cargarListadoEval();
    }
  });
  observer.observe(page, { attributes: true, attributeFilter: ['style'] });

  // Auto-abrir formulario si viene ?eval=tipo en la URL
  const urlEvalParam = new URLSearchParams(window.location.search).get('eval');
  if (urlEvalParam) {
    const tryOpen = () => {
      if (evalFormulariosCache.length) {
        if (typeof showPage === 'function') showPage('evaluaciones');
        switchEvalTab('nueva');
        seleccionarTipoEval(urlEvalParam);
      } else {
        setTimeout(tryOpen, 250);
      }
    };
    setTimeout(tryOpen, 400);
  }
});
