-- ============================================================
-- BANCO DE PREGUNTAS — Tablas y datos iniciales
-- Ejecutar una vez en la BD (phpMyAdmin o MySQL CLI)
-- ============================================================

CREATE TABLE IF NOT EXISTS eval_secciones (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  formulario  ENUM('manejo_practica','examen_defensiva','induccion_t2') NOT NULL,
  seccion_id  VARCHAR(50)  NOT NULL,
  titulo      VARCHAR(200) NOT NULL,
  descripcion TEXT         NULL,
  tipo        ENUM('aplica_grid','multiple_choice') NOT NULL,
  puntos      DECIMAL(5,2) NOT NULL DEFAULT 0,
  orden       INT          NOT NULL DEFAULT 0,
  activo      TINYINT(1)   NOT NULL DEFAULT 1,
  UNIQUE KEY uk_formulario_seccion (formulario, seccion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS eval_preguntas (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  seccion_id        INT          NOT NULL,
  pregunta_id       VARCHAR(30)  NOT NULL,
  texto             TEXT         NOT NULL,
  opciones          JSON         NULL,
  respuesta_correcta VARCHAR(10) NULL,
  puntos            DECIMAL(5,2) NOT NULL DEFAULT 1,
  orden             INT          NOT NULL DEFAULT 0,
  activo            TINYINT(1)   NOT NULL DEFAULT 1,
  FOREIGN KEY (seccion_id) REFERENCES eval_secciones(id) ON DELETE CASCADE,
  UNIQUE KEY uk_seccion_pregunta (seccion_id, pregunta_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Limpiar datos anteriores (para re-ejecución segura) ───────
DELETE FROM eval_preguntas;
DELETE FROM eval_secciones;
ALTER TABLE eval_preguntas AUTO_INCREMENT = 1;
ALTER TABLE eval_secciones AUTO_INCREMENT = 1;

-- ── Secciones ─────────────────────────────────────────────────

INSERT INTO eval_secciones (formulario, seccion_id, titulo, descripcion, tipo, puntos, orden) VALUES
('manejo_practica',  'seguridad',    'I. SEGURIDAD',                       'Este módulo evaluará su actitud frente a la seguridad en la unidad.',         'aplica_grid', 3, 1),
('manejo_practica',  'revisiones',   'II. REVISIONES ANTES DEL ARRANQUE',  'Evaluará las aptitudes del postulante antes del arranque de la unidad.',       'aplica_grid', 3, 2),
('manejo_practica',  'operacion',    'III. OPERACIÓN DE LA UNIDAD',        'Evaluará las habilidades para realizar maniobras mientras conduce.',            'aplica_grid', 4, 3),
('manejo_practica',  'defensiva',    'IV. MANEJO A LA DEFENSIVA',          'Evaluará las aptitudes del postulante en el proceso de conducción.',            'aplica_grid', 5, 4),
('manejo_practica',  'maniobras',    'V. MANIOBRAS',                       'Evaluará las maniobras durante la ruta.',                                       'aplica_grid', 3, 5),
('manejo_practica',  'presentacion', 'VI. PRESENTACIÓN',                   'Evaluará la presentación y el trato del Conductor durante la evaluación.',      'aplica_grid', 2, 6),
('examen_defensiva', 'preguntas',    'Preguntas',                          NULL,                                                                            'multiple_choice', 0, 1),
('induccion_t2',     'preguntas',    'Preguntas',                          NULL,                                                                            'multiple_choice', 0, 1);

-- ── Items: Manejo Práctica — I. Seguridad ─────────────────────

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'tres_puntos', 'EMPLEA LOS TRES PUNTOS DE APOYO',    0, 1 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='seguridad';
INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'cinturon',    'USA DEL CINTURÓN DE SEGURIDAD',      0, 2 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='seguridad';
INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'posicion',    'POSICIÓN ERGONÓMICA',                0, 3 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='seguridad';

-- ── Items: II. Revisiones ─────────────────────────────────────

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'neumaticos', 'VERIFICA EL ESTADO DE NEUMÁTICOS',                          0, 1 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='revisiones';
INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'niveles',    'VERIFICA NIVELES (REFRIGERANTE, ACEITE Y COMBUSTIBLE)',      0, 2 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='revisiones';
INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'documentos', 'REVISA LOS DOCUMENTOS DEL VEHÍCULO',                        0, 3 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='revisiones';

-- ── Items: III. Operación ─────────────────────────────────────

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'encendido',     'ENCENDIDO CORRECTO DE LA UNIDAD',      0, 1 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='operacion';
INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'indicadores',   'RECONOCE INDICADORES DEL TABLERO',     0, 2 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='operacion';
INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'revoluciones',  'RANGO DE REVOLUCIONES',                0, 3 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='operacion';
INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'caja_cambios',  'USO CORRECTO DE LA CAJA DE CAMBIOS',   0, 4 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='operacion';
INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'embrague',      'USO CORRECTO DEL PEDAL DE EMBRAGUE',   0, 5 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='operacion';
INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'freno_motor',   'USO DE FRENO DE MOTOR',                0, 6 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='operacion';
INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'cuidado_unidad','CUIDADO DE LA UNIDAD EN EVALUACIÓN',   0, 7 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='operacion';

-- ── Items: IV. Defensiva ─────────────────────────────────────

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'buenas_practicas', 'BUENAS PRÁCTICAS EN LA CONDUCCIÓN',      0, 1 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='defensiva';
INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'distancia',        'GUARDA DISTANCIA CON OTROS VEHÍCULOS',   0, 2 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='defensiva';
INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'velocidad',        'VELOCIDAD DE CONDUCCIÓN',                0, 3 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='defensiva';
INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'senalizacion',     'RESPETA LA SEÑALIZACIÓN',                0, 4 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='defensiva';
INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'luces',            'USO ADECUADO DE LUCES DE SEÑALIZACIÓN',  0, 5 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='defensiva';

-- ── Items: V. Maniobras ───────────────────────────────────────

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'giros',           'GIROS',            0, 1 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='maniobras';
INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'retroceso',       'RETROCESO',        0, 2 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='maniobras';
INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'estacionamiento', 'ESTACIONAMIENTO',  0, 3 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='maniobras';

-- ── Items: VI. Presentación ───────────────────────────────────

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'buen_trato', 'TIENE BUEN TRATO',             0, 1 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='presentacion';
INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'lenguaje',   'UTILIZA LENGUAJE APROPIADO',   0, 2 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='presentacion';
INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, puntos, orden)
SELECT id, 'aseo',       'BUEN ASEO E HIGIENE PERSONAL', 0, 3 FROM eval_secciones WHERE formulario='manejo_practica' AND seccion_id='presentacion';

-- ── Preguntas: Examen Defensiva ───────────────────────────────

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q1',
  'Según estadística las primeras 02 principales causas de accidente en el Perú son:',
  '[{"id":"A","texto":"Falla mecánica y falta de luces"},{"id":"B","texto":"Imprudencia del peatón y exceso de carga"},{"id":"C","texto":"Ebriedad del conductor y pista en mal estado"},{"id":"D","texto":"Velocidad e imprudencia del conductor"},{"id":"E","texto":"Ninguna de las anteriores"}]',
  'D', 2, 1 FROM eval_secciones es WHERE es.formulario='examen_defensiva' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q2',
  '¿Según el reglamento de tránsito cuántos tipos de señales conoces?',
  '[{"id":"A","texto":"Informativas, reglamentarias y preventivas"},{"id":"B","texto":"Preventivas, advertencia e informativas"},{"id":"C","texto":"Informativas, regulación y reglamentarias"},{"id":"D","texto":"Restrictivas, advertencia y comunicativas"},{"id":"E","texto":"Todas las anteriores"}]',
  'A', 2, 2 FROM eval_secciones es WHERE es.formulario='examen_defensiva' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q3',
  'El significado de manejo a la defensiva:',
  '[{"id":"A","texto":"Es conducir un vehículo sin choques"},{"id":"B","texto":"Arte de mantener la conducción de un vehículo sin registrar accidentes"},{"id":"C","texto":"Arte de conducir un vehículo con aceleraciones y frenadas bruscas"},{"id":"D","texto":"Mantener la distancia para no colisionar con otro que va adelante"},{"id":"E","texto":"Manejar sin hablar por celular"}]',
  'B', 2, 3 FROM eval_secciones es WHERE es.formulario='examen_defensiva' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q4',
  'Principios de manejo a la defensiva: ¿Qué significa EPEA?',
  '[{"id":"A","texto":"Esquema para evitar anuncios"},{"id":"B","texto":"Empezar para entrar amigos"},{"id":"C","texto":"Emplear producto estándar americano"},{"id":"D","texto":"Esquema para evitar accidentes"},{"id":"E","texto":"Todas las anteriores"}]',
  'D', 2, 4 FROM eval_secciones es WHERE es.formulario='examen_defensiva' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q5',
  'La característica de un conductor defensivo profesional es:',
  '[{"id":"A","texto":"Maneja pensando en sus problemas y no le importan ni conductores ni peatones"},{"id":"B","texto":"Conduce rápido sin importarle condiciones de pista, vehículo, ambiente etc"},{"id":"C","texto":"Efectúa apuradamente lo que debió hacer antes, al tomar curvas, pasar o parar"},{"id":"D","texto":"Evita conducir en condiciones deficientes: ebrio, con sueño, cansado etc"},{"id":"E","texto":"Ninguna de las anteriores"}]',
  'D', 2, 5 FROM eval_secciones es WHERE es.formulario='examen_defensiva' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q6',
  '¿Indique cuáles son los factores de riesgo en condiciones adversas?',
  '[{"id":"A","texto":"Condiciones de conducción y sociales"},{"id":"B","texto":"Condiciones de conducción, climatológicas y sociales"},{"id":"C","texto":"Condiciones sociales y culturales"},{"id":"D","texto":"Condiciones religiosos y deportivos"},{"id":"E","texto":"Ninguna de anteriores"}]',
  'B', 2, 6 FROM eval_secciones es WHERE es.formulario='examen_defensiva' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q7',
  '¿Cuáles son las consecuencias de una conducción nocturna?',
  '[{"id":"A","texto":"Nuestra visión es más limitada"},{"id":"B","texto":"Ocurre mayor incidencia de accidentes de tránsito"},{"id":"C","texto":"Se muestran los primeros signos de fatiga y cansancio, sueño, etc"},{"id":"D","texto":"Existe mayor dificultad para distinguir peatones, ciclistas y otros usuarios de la vía"},{"id":"E","texto":"Todas las anteriores"}]',
  'E', 2, 7 FROM eval_secciones es WHERE es.formulario='examen_defensiva' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q8',
  'Conducción en subidas y bajadas: antes de ingresar a una pendiente Ud. debe:',
  '[{"id":"A","texto":"Parar su vehículo y verificar la ruta"},{"id":"B","texto":"Avisar a los demás vehículos el inicio de una pendiente"},{"id":"C","texto":"Analizar qué tanto conoce la ruta y la unidad para poder realizar la maniobra con seguridad"},{"id":"D","texto":"Continuar sin hacer ningún aviso"},{"id":"E","texto":"Ninguna de las anteriores"}]',
  'C', 2, 8 FROM eval_secciones es WHERE es.formulario='examen_defensiva' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q9',
  'Forma segura de adelantar vehículos. Un adelantamiento mal realizado puede ser la causa de un accidente del cual es difícil salir con vida, corresponde a:',
  '[{"id":"A","texto":"Choque frontal"},{"id":"B","texto":"Choque por alcance"},{"id":"C","texto":"Choque lateral"},{"id":"D","texto":"Choque y fuga"},{"id":"E","texto":"Todas las anteriores"}]',
  'A', 2, 9 FROM eval_secciones es WHERE es.formulario='examen_defensiva' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q10',
  'Son actividades físicas realizadas en un breve espacio de tiempo en la jornada laboral, orientadas a que los trabajadores recuperen energías revirtiendo la fatiga muscular y mental. Este concepto corresponde a:',
  '[{"id":"A","texto":"Pausas inactivas"},{"id":"B","texto":"Parada en ruta"},{"id":"C","texto":"Pausas activas"},{"id":"D","texto":"Parada de vehículo"},{"id":"E","texto":"Ninguna de las anteriores"}]',
  'C', 2, 10 FROM eval_secciones es WHERE es.formulario='examen_defensiva' AND es.seccion_id='preguntas';

-- ── Preguntas: Inducción T2 ───────────────────────────────────

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q1',
  'Señale el enunciado INCORRECTO sobre nuestro credo de seguridad:',
  '[{"id":"A","texto":"Cuidaré solo de mi vida"},{"id":"B","texto":"Cuidaré mi vida y la de mis compañeros, llegaré a mi casa tan sano como salí, realizaré mi trabajo evitando lesionarme, utilizaré los elementos de protección y reportaré cualquier situación insegura"}]',
  'A', 2, 1 FROM eval_secciones es WHERE es.formulario='induccion_t2' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q2',
  '¿Qué es un Acto Inseguro?',
  '[{"id":"A","texto":"Incumplir los procedimientos"},{"id":"B","texto":"No utilizar los EPPs completo"},{"id":"C","texto":"No respetar las señalizaciones"},{"id":"D","texto":"Todas las anteriores"}]',
  'D', 2, 2 FROM eval_secciones es WHERE es.formulario='induccion_t2' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q3',
  '¿Qué es una condición insegura?',
  '[{"id":"A","texto":"No utilizar EPP"},{"id":"B","texto":"Respetar señalizaciones"},{"id":"C","texto":"Son las instalaciones, equipos de trabajo, maquinaria y herramientas que NO están en buenas condiciones"}]',
  'C', 2, 3 FROM eval_secciones es WHERE es.formulario='induccion_t2' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q4',
  '¿Qué Equipos de protección personal debe utilizar un reparto?',
  '[{"id":"A","texto":"Botas punta de acero y chaleco reflectivo"},{"id":"B","texto":"Casco, lentes, barbiquejo, guantes, chaleco reflectivo, mascarilla y zapatos de seguridad"}]',
  'B', 1, 4 FROM eval_secciones es WHERE es.formulario='induccion_t2' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q5',
  '¿A qué peligros está expuesta la tripulación en el POC?',
  '[{"id":"A","texto":"Asalto y robo"},{"id":"B","texto":"Atropello, resbalones, tropezones y caídas"},{"id":"C","texto":"A y B"}]',
  'C', 1, 5 FROM eval_secciones es WHERE es.formulario='induccion_t2' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q6',
  '¿Qué se recomienda hacer en caso de robo o asalto dentro de la cabina?',
  '[{"id":"A","texto":"Mantener la calma, presionar el botón de pánico, intentar robar el arma y controlar la situación"},{"id":"B","texto":"Mantener la calma, presionar el botón de pánico, no intentar resolver la situación, ceder, llamar a la policía, poner la denuncia en el PNP más cercano y notificar a Seguridad CD"}]',
  'B', 1, 6 FROM eval_secciones es WHERE es.formulario='induccion_t2' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q7',
  '¿Qué debes hacer en caso de un inicio de incendio en la unidad?',
  '[{"id":"A","texto":"Tomar inmediatamente el extintor y controlar el fuego"},{"id":"B","texto":"Comunicar al empresario"},{"id":"C","texto":"Retirarme del sitio"}]',
  'C', 1, 7 FROM eval_secciones es WHERE es.formulario='induccion_t2' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q8',
  'Señale la afirmación correcta al llegar al POC:',
  '[{"id":"A","texto":"Al llegar al POC usted debe colocar los conos, bajar del camión y proceder a la entrega"},{"id":"B","texto":"Al llegar al POC usted debe activar las luces de parqueo, apagar el camión, bajar del camión utilizando los 3 puntos de apoyo, poner los conos, tacos, y proceder a la entrega"}]',
  'B', 1, 8 FROM eval_secciones es WHERE es.formulario='induccion_t2' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q9',
  '¿Qué EPP debes utilizar para manipular la carga?',
  '[{"id":"A","texto":"Guantes de seguridad"},{"id":"B","texto":"Casco"},{"id":"C","texto":"Casco, Lentes, Guantes, Chaleco y Zapatos de seguridad"}]',
  'C', 1, 9 FROM eval_secciones es WHERE es.formulario='induccion_t2' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q10',
  '¿Cuál es el límite de velocidad en perimetrales?',
  '[{"id":"A","texto":"90 Km/h"},{"id":"B","texto":"60 Km/h"}]',
  'B', 2, 10 FROM eval_secciones es WHERE es.formulario='induccion_t2' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q11',
  '¿Cuál es el límite de velocidad en curvas?',
  '[{"id":"A","texto":"10 Km/h"},{"id":"B","texto":"25 Km/h"},{"id":"C","texto":"70 Km/h"}]',
  'B', 2, 11 FROM eval_secciones es WHERE es.formulario='induccion_t2' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q12',
  '¿Cuál es el límite de velocidad dentro del centro de distribución?',
  '[{"id":"A","texto":"18 Km/h"},{"id":"B","texto":"40 Km/h"},{"id":"C","texto":"70 Km/h"}]',
  'A', 2, 12 FROM eval_secciones es WHERE es.formulario='induccion_t2' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q13',
  '¿Con qué elemento de protección personal cuenta la tripulación para amenazas de asalto o robo?',
  '[{"id":"A","texto":"Whatsapp"},{"id":"B","texto":"Mensaje de texto"},{"id":"C","texto":"Botón de pánico"}]',
  'C', 1, 13 FROM eval_secciones es WHERE es.formulario='induccion_t2' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q14',
  '¿Cuál es la distancia de segregación hombre y máquina?',
  '[{"id":"A","texto":"5 mts"},{"id":"B","texto":"3 mts"},{"id":"C","texto":"1 mts"}]',
  'B', 1, 14 FROM eval_secciones es WHERE es.formulario='induccion_t2' AND es.seccion_id='preguntas';
