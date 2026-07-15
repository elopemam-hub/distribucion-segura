-- ============================================================
-- MIGRACIÓN: Inducción CD (Evaluación Inducción Safety)
-- Ejecutar en producción (phpMyAdmin o MySQL CLI)
-- ============================================================

-- 1. Agregar 'cd' al ENUM de evaluaciones.tipo
ALTER TABLE evaluaciones
  MODIFY COLUMN tipo ENUM('manejo_practica','examen_defensiva','induccion_t2','cd') NOT NULL;

-- 2. Sección de preguntas para el formulario 'cd'
INSERT INTO eval_secciones (formulario, seccion_id, titulo, descripcion, tipo, puntos, orden)
VALUES ('cd', 'preguntas', 'Preguntas', NULL, 'multiple_choice', 0, 1);

-- 3. Preguntas (8 preguntas, 20 pts total)
INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q1',
  '¿Cuáles de las siguientes son las normas de seguridad para el desplazamiento de los visitantes en nuestras instalaciones?',
  '[{"id":"A","texto":"Avisar del ingreso a las personas visitadas, usar chaleco y gafas"},{"id":"B","texto":"Permanecer acompañado por un funcionario de ABI, no ingresar a áreas no autorizadas, transitar por las cebras, atender y respetar la señalización y usar el pasamanos para subir y bajar escaleras"},{"id":"C","texto":"No ingresar a áreas no autorizadas"},{"id":"D","texto":"Ninguna de las anteriores"}]',
  'B', 2, 1
FROM eval_secciones es WHERE es.formulario='cd' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q2',
  '¿Cuáles son las prohibiciones dentro del CD?',
  '[{"id":"A","texto":"Uso Celulares en operaciones"},{"id":"B","texto":"Tomar fotografías y/o grabar videos"},{"id":"C","texto":"Ingerir alimentos"},{"id":"D","texto":"Caminar fuera del sendero peatonal"},{"id":"E","texto":"Todas"}]',
  'E', 2, 2
FROM eval_secciones es WHERE es.formulario='cd' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q3',
  '¿Los riesgos de atropellamiento en el desplazamiento están dados principalmente por:',
  '[{"id":"A","texto":"Motocicletas, transporte público y vehículos particulares"},{"id":"B","texto":"Montacargas, camionetas y vehículos pesados"},{"id":"C","texto":"Otros peatones"}]',
  'B', 2, 3
FROM eval_secciones es WHERE es.formulario='cd' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q4',
  '¿Cuáles son los pasos a seguir en caso de emergencia?',
  '[{"id":"A","texto":"Mantenga la calma, suspenda cualquier actividad, siga las instrucciones, ayude a las personas, abandone la zona de un modo ordenado, cierre las puertas pero no con llave"},{"id":"B","texto":"Salga por las Salidas de Emergencia establecidas previamente"},{"id":"C","texto":"Ir al punto de encuentro y esperar"},{"id":"D","texto":"Quedarse en el lugar y esperar a que la situación de emergencia termine"}]',
  'A', 2, 4
FROM eval_secciones es WHERE es.formulario='cd' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q5',
  'LTI es sin dias perdidos',
  '[{"id":"A","texto":"Verdadero"},{"id":"B","texto":"Falso"}]',
  'B', 2, 5
FROM eval_secciones es WHERE es.formulario='cd' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q6',
  '¿Cuáles son las reglas de plan de tráfico?',
  '[{"id":"A","texto":"No Transitar por sendero peatonal"},{"id":"B","texto":"Ingresar a zonas no autorizadas"},{"id":"C","texto":"Uso EPP, uso peatonal, no cruzar patio, hacer alto en las intersecciones, respetar las señalizaciones de seguridad, no uso celular en la operación, distancia 5 mts hombre-maquina, etc."}]',
  'C', 2, 6
FROM eval_secciones es WHERE es.formulario='cd' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q7',
  '¿Cuáles son los equipos de emergencia?',
  '[{"id":"A","texto":"Extintor"},{"id":"B","texto":"Botiquín"},{"id":"C","texto":"Extintor, botiquín, camilla, desfibrilador, luces de emergencias, salida de emergencia, etc."}]',
  'C', 4, 7
FROM eval_secciones es WHERE es.formulario='cd' AND es.seccion_id='preguntas';

INSERT INTO eval_preguntas (seccion_id, pregunta_id, texto, opciones, respuesta_correcta, puntos, orden)
SELECT es.id, 'q8',
  '¿Cuál es la distancia de segregación hombre y máquina?',
  '[{"id":"A","texto":"5 mts"},{"id":"B","texto":"2 mts"},{"id":"C","texto":"1 mts"}]',
  'A', 4, 8
FROM eval_secciones es WHERE es.formulario='cd' AND es.seccion_id='preguntas';
