<!-- ============================================================
     MODALES GLOBALES — extraído de index.php
     Se incluye vía require_once en contexto HTML (dentro de <body>).
     ============================================================ -->
<!-- ===== MODAL AMONESTACIÓN ===== -->
<div class="modal-overlay" id="modalAmon">
  <div class="modal-box" style="max-width:700px">
    <div class="modal-header">
      <h3><i class="fas fa-file-signature" style="color:var(--primary)"></i> <span id="modalAmonTitulo">Nueva Amonestación</span></h3>
      <button class="modal-close" onclick="cerrarModal('modalAmon')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <form id="formAmon">
        <input type="hidden" id="amon_id">
        <input type="hidden" id="amon_tipo">

        <div id="amonAvisoSoloDoc" style="display:none;background:rgba(212,165,0,.12);border:1px solid var(--primary);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:12.5px;color:var(--gris-100)">
          <i class="fas fa-lock" style="color:var(--primary)"></i> Solo puedes <strong>adjuntar el documento de amonestación</strong>. Los demás campos son de solo lectura (edición reservada al administrador).
        </div>

        <!-- Datos comunes -->
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gris-400);letter-spacing:.08em;margin-bottom:10px">Datos generales</p>
        <div class="form-grid">
          <div class="form-group" style="grid-column:1/-1;position:relative">
            <label class="form-label">Personal *</label>
            <input type="hidden" id="amon_personal_id">
            <input type="text" class="form-control" id="amon_personal_nombre" placeholder="Buscar por nombre o DNI..." autocomplete="off"
                   oninput="buscarPersonalAmon(this.value)" required>
            <div class="autocomplete-box" id="amonPersonalAC"></div>
          </div>
          <div class="form-group">
            <label class="form-label">Fecha *</label>
            <input type="date" class="form-control" id="amon_fecha" required value="<?= date('Y-m-d') ?>">
          </div>
          <div class="form-group">
            <label class="form-label">Estado</label>
            <select class="form-control" id="amon_estado">
              <option value="pendiente">Pendiente</option>
              <option value="notificado">Notificado</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Descripción / Motivo *</label>
            <textarea class="form-control" id="amon_descripcion" rows="3" required placeholder="Detalle de la infracción..."></textarea>
          </div>
        </div>

        <!-- Campos Bancarización -->
        <div id="secAmonBanc" style="display:none">
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gris-400);letter-spacing:.08em;margin:16px 0 10px">Datos de bancarización</p>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Importe (S/.)</label>
              <input type="number" class="form-control" id="amon_monto" step="0.01" min="0" placeholder="0.00">
            </div>
            <div class="form-group">
              <label class="form-label">N° Operación</label>
              <input type="text" class="form-control" id="amon_nro_operacion" maxlength="50" placeholder="Ej: OP-20240412">
            </div>
            <div class="form-group">
              <label class="form-label">Motivo</label>
              <select class="form-control" id="amon_motivo_codigo_banc">
                <option value="">— Selecciona —</option>
                <option value="Cobros efectivo >3500">Cobros efectivo &gt;3500</option>
                <option value="Cobros efectivo >2000">Cobros efectivo &gt;2000</option>
                <option value="N3">Cobro a cliente N3</option>
                <option value="Multiparada">Multiparada sin depósito</option>
                <option value="Protocolo">Incumplimiento protocolo 360°</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Nombre cliente</label>
              <input type="text" class="form-control" id="amon_cliente_banc" maxlength="150" placeholder="Nombre del cliente">
            </div>
            <div class="form-group">
              <label class="form-label">Código cliente</label>
              <input type="text" class="form-control" id="amon_codigo_cliente_banc" maxlength="50" placeholder="Ej: CLI-00123">
            </div>
            <div class="form-group" style="display:flex;align-items:center;gap:10px;padding-top:22px">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;color:var(--gris-200)">
                <input type="checkbox" id="amon_reincidente_banc" style="width:16px;height:16px;accent-color:var(--rojo)">
                <strong>Reincidente</strong>
              </label>
            </div>
          </div>

          <div class="form-group" style="margin-top:10px">
            <label class="form-label">Plan de acciones</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">
              <?php foreach(['Generar amonestación','Refuerzo bancarización','Carta de compromiso','Suspensión','Seguimiento'] as $pa): ?>
              <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;padding:5px 10px;border:1px solid var(--gris-500);border-radius:6px;background:var(--gris-700);color:var(--gris-200)">
                <input type="checkbox" class="plan-banc-check" value="<?= $pa ?>" style="accent-color:var(--primary)"> <?= $pa ?>
              </label>
              <?php endforeach; ?>
            </div>
          </div>

          <div class="form-grid" style="margin-top:8px">
            <div class="form-group">
              <label class="form-label">Fecha cierre</label>
              <input type="date" class="form-control" id="amon_fecha_cierre_banc">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-image" style="color:var(--primary)"></i> Imagen evidencia</label>
              <input type="file" class="form-control" id="amon_imagen_banc" accept="image/*">
              <small style="color:var(--gris-400)">JPG, PNG · Máx 10MB</small>
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label"><i class="fas fa-paperclip" style="color:var(--primary)"></i> Documento de amonestación</label>
              <input type="file" class="form-control" id="amon_archivo_banc" accept=".pdf,.doc,.docx,.odt">
              <small style="color:var(--gris-400)">PDF, Word · Máx 20MB</small>
              <div id="amon_archivo_actual_banc" style="display:none;margin-top:6px">
                <a id="amon_archivo_link_banc" href="#" target="_blank" style="font-size:12px;color:var(--primary);display:inline-flex;align-items:center;gap:5px">
                  <i class="fas fa-file-alt"></i> <span id="amon_archivo_nom_banc">Ver documento</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Campos N3 -->
        <div id="secAmonN3" style="display:none">
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gris-400);letter-spacing:.08em;margin:16px 0 10px">Datos cliente N3</p>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Cliente N3</label>
              <input type="text" class="form-control" id="amon_cliente" maxlength="150" placeholder="Nombre del cliente">
            </div>
            <div class="form-group">
              <label class="form-label">Código cliente</label>
              <input type="text" class="form-control" id="amon_codigo_cliente_n3" maxlength="50" placeholder="Ej: CLI-00123">
            </div>
            <div class="form-group">
              <label class="form-label">Ruta</label>
              <input type="text" class="form-control" id="amon_ruta" maxlength="100" placeholder="Ej: Ruta 05 - Mercado Central">
            </div>
            <div class="form-group">
              <label class="form-label">Motivo</label>
              <select class="form-control" id="amon_motivo_codigo_n3">
                <option value="">— Selecciona —</option>
                <option value="N3">Atención POC N3</option>
                <option value="Cobro N3">Cobro en efectivo N3</option>
                <option value="Sin autorización">Sin autorización</option>
                <option value="Reincidencia N3">Reincidencia N3</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div class="form-group" style="display:flex;align-items:center;gap:10px;padding-top:22px">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;color:var(--gris-200)">
                <input type="checkbox" id="amon_reincidente_n3" style="width:16px;height:16px;accent-color:var(--rojo)">
                <strong>Reincidente</strong>
              </label>
            </div>
          </div>

          <div class="form-group" style="margin-top:10px">
            <label class="form-label">Plan de acciones</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">
              <?php foreach(['Generar amonestación','Refuerzo N3','Carta de compromiso','Suspensión','Seguimiento'] as $pa): ?>
              <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;padding:5px 10px;border:1px solid var(--gris-500);border-radius:6px;background:var(--gris-700);color:var(--gris-200)">
                <input type="checkbox" class="plan-n3-check" value="<?= $pa ?>" style="accent-color:var(--primary)"> <?= $pa ?>
              </label>
              <?php endforeach; ?>
            </div>
          </div>

          <div class="form-grid" style="margin-top:8px">
            <div class="form-group">
              <label class="form-label">Fecha cierre</label>
              <input type="date" class="form-control" id="amon_fecha_cierre_n3">
            </div>
            <div class="form-group">
              <label class="form-label"><i class="fas fa-image" style="color:var(--primary)"></i> Imagen evidencia</label>
              <input type="file" class="form-control" id="amon_imagen_n3" accept="image/*">
              <small style="color:var(--gris-400)">JPG, PNG · Máx 10MB</small>
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label"><i class="fas fa-paperclip" style="color:var(--primary)"></i> Documento de amonestación</label>
              <input type="file" class="form-control" id="amon_archivo_n3" accept=".pdf,.doc,.docx,.odt">
              <small style="color:var(--gris-400)">PDF, Word · Máx 20MB</small>
              <div id="amon_archivo_actual_n3" style="display:none;margin-top:6px">
                <a id="amon_archivo_link_n3" href="#" target="_blank" style="font-size:12px;color:var(--primary);display:inline-flex;align-items:center;gap:5px">
                  <i class="fas fa-file-alt"></i> <span id="amon_archivo_nom_n3">Ver documento</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- Campos Telemetría -->
        <div id="secAmonTele" style="display:none">
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gris-400);letter-spacing:.08em;margin:16px 0 10px">Datos de telemetría</p>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">Placa / Unidad</label>
              <input type="text" class="form-control" id="amon_unidad" maxlength="20" placeholder="Ej: BTT-893" style="text-transform:uppercase">
            </div>
            <div class="form-group">
              <label class="form-label">Regla infringida</label>
              <select class="form-control" id="amon_evento_tele">
                <option value="">— Selecciona regla —</option>
                <option>Cinturón de Seguridad</option>
                <option>Ruta Crítica &gt;30 km/h</option>
                <option>Ruta Crítica &gt;40 km/h</option>
                <option>Exceso de Velocidad &gt;70 km/h</option>
                <option>Exceso de Velocidad &gt;15 km/h (CD)</option>
                <option>Uso de Celular</option>
                <option>Frenada Brusca</option>
                <option>Aceleración Brusca</option>
                <option>Conducción Distraída</option>
                <option>Obstrucción de Cámara</option>
                <option>Sin Cinturón de Seguridad</option>
                <option>Retroceso sin Guía</option>
                <option>Otro</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Valor registrado</label>
              <input type="text" class="form-control" id="amon_valor_registrado" maxlength="50" placeholder="Ej: 92 km/h">
            </div>
            <div class="form-group">
              <label class="form-label">Tipo sanción</label>
              <select class="form-control" id="amon_tipo_sancion">
                <option value="">— Selecciona —</option>
                <option>Amonestación escrita</option>
                <option>Suspensión 1 día</option>
                <option>Suspensión 2 días</option>
                <option>Suspensión 3 días</option>
                <option>Suspensión 1 semana</option>
                <option>Desvinculación</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Tipo de sanción (nivel)</label>
              <select class="form-control" id="amon_tipo_sancion_nivel">
                <option value="">— Selecciona —</option>
                <option>1ERA VEZ</option>
                <option>2DA VEZ</option>
                <option>3ERA VEZ</option>
                <option>4TA VEZ</option>
                <option>5TA VEZ</option>
              </select>
            </div>
            <div class="form-group" style="display:flex;align-items:center;gap:10px;padding-top:22px">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:14px;color:var(--gris-200)">
                <input type="checkbox" id="amon_reincidente" style="width:16px;height:16px;accent-color:var(--rojo)">
                <span><strong>Reincidente</strong></span>
              </label>
            </div>
          </div>

          <div class="form-group" style="margin-top:12px">
            <label class="form-label">Plan de acciones</label>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">
              <?php foreach(['Generar amonestación','Refuerzo telemetría','Carta de compromiso','Capacitación','Suspensión','Seguimiento'] as $pa): ?>
              <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px;padding:5px 10px;border:1px solid var(--gris-500);border-radius:6px;background:var(--gris-700);color:var(--gris-200)">
                <input type="checkbox" class="plan-accion-check" value="<?= $pa ?>" style="accent-color:var(--primary)"> <?= $pa ?>
              </label>
              <?php endforeach; ?>
            </div>
            <input type="hidden" id="amon_plan_acciones">
          </div>

          <div class="form-grid" style="margin-top:4px">
            <div class="form-group">
              <label class="form-label">Fecha cierre</label>
              <input type="date" class="form-control" id="amon_fecha_cierre">
            </div>
            <div class="form-group">
              <label class="form-label">Evento alerta (imagen)</label>
              <input type="file" class="form-control" id="amon_imagen_evento" accept="image/*">
              <small style="color:var(--gris-400)">JPG, PNG · Máx 10MB</small>
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label"><i class="fas fa-paperclip" style="color:var(--primary)"></i> Documento de amonestación</label>
              <input type="file" class="form-control" id="amon_archivo_doc" accept=".pdf,.doc,.docx,.odt">
              <small style="color:var(--gris-400)">PDF, Word, ODT · Máx 20MB</small>
              <!-- Enlace al archivo actual al editar -->
              <div id="amon_archivo_actual" style="display:none;margin-top:6px">
                <a id="amon_archivo_link" href="#" target="_blank"
                   style="font-size:12px;color:var(--primary);display:inline-flex;align-items:center;gap:5px">
                  <i class="fas fa-file-alt"></i> <span id="amon_archivo_nombre">Ver documento actual</span>
                </a>
              </div>
            </div>
          </div>
          <div id="amon_imagen_preview" style="margin-top:8px;display:none">
            <img id="amon_img_thumb" src="" style="max-height:120px;border-radius:8px;border:1px solid var(--gris-500)">
          </div>
        </div>

        <div class="form-group" style="margin-top:16px">
          <label class="form-label">Observaciones adicionales</label>
          <textarea class="form-control" id="amon_observaciones" rows="2"></textarea>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px">
          <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalAmon')">Cancelar</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- ===== MODAL PERSONAL ===== -->
<div class="modal-overlay" id="modalPersonal">
  <div class="modal-box" style="max-width:780px">
    <div class="modal-header">
      <h3><i class="fas fa-id-card" style="color:var(--amarillo)"></i> <span id="modalPersonalTitulo">Nuevo Personal</span></h3>
      <button class="modal-close" onclick="cerrarModal('modalPersonal')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <form id="formPersonal">
        <input type="hidden" id="personal_id">

        <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gris-400);letter-spacing:.08em;margin-bottom:10px">Datos personales</p>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">DNI *</label>
            <input type="text" class="form-control" id="personal_dni" maxlength="15" required>
          </div>
          <div class="form-group">
            <label class="form-label">Nombre completo *</label>
            <input type="text" class="form-control" id="personal_nombre" required>
          </div>
          <div class="form-group">
            <label class="form-label">Cargo *</label>
            <select class="form-control" id="personal_cargo" required onchange="togglePersonalLicencia()">
              <option value="conductor">Conductor</option>
              <option value="reparto">Reparto</option>
              <option value="auxiliar">Auxiliar</option>
              <option value="supervisor">Supervisor</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div class="form-group" style="display:none">
            <label class="form-label">Empresa</label>
            <select class="form-control" id="personal_empresa_id">
              <option value="">— Sin asignar —</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Teléfono</label>
            <input type="text" class="form-control" id="personal_telefono" maxlength="20">
          </div>
          <div class="form-group">
            <label class="form-label">Fecha de Nacimiento</label>
            <input type="date" class="form-control" id="personal_fecha_nacimiento">
          </div>
          <div class="form-group">
            <label class="form-label">Fecha de ingreso</label>
            <input type="date" class="form-control" id="personal_fecha_ingreso">
          </div>
          <div class="form-group">
            <label class="form-label">Vencimiento DNI</label>
            <input type="date" class="form-control" id="personal_dni_vencimiento">
          </div>
          <div class="form-group">
            <label class="form-label">Estado</label>
            <select class="form-control" id="personal_activo">
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tipo de Contrato</label>
            <select class="form-control" id="personal_tipo_contrato">
              <option value="">— Sin especificar —</option>
              <option value="Planilla">Planilla</option>
              <option value="SCTR">SCTR</option>
              <option value="Planilla + SCTR">Planilla + SCTR</option>
              <option value="Locación de Servicios">Locación de Servicios</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
        </div>

        <div id="personalLicenciaSec">
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gris-400);letter-spacing:.08em;margin:18px 0 10px">Licencia / Brevete <span style="color:var(--gris-500);font-weight:400">· solo conductor</span></p>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">N° Licencia</label>
              <input type="text" class="form-control" id="personal_num_licencia" maxlength="30">
            </div>
            <div class="form-group">
              <label class="form-label">Categoría</label>
              <select class="form-control" id="personal_categoria_licencia">
                <option value="">— Sin licencia —</option>
                <option value="A-I">A-I</option>
                <option value="A-IIa">A-IIa</option>
                <option value="A-IIb">A-IIb</option>
                <option value="A-IIIa">A-IIIa</option>
                <option value="A-IIIb">A-IIIb</option>
                <option value="A-IIIc">A-IIIc</option>
                <option value="B-I">B-I</option>
                <option value="B-IIa">B-IIa</option>
                <option value="B-IIb">B-IIb</option>
                <option value="B-IIc">B-IIc</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Vencimiento Brevete</label>
              <input type="date" class="form-control" id="personal_vencimiento_brevete">
            </div>
          </div>
        </div>

        <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gris-400);letter-spacing:.08em;margin:18px 0 10px">Otros</p>
        <div class="form-grid">
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Foto perfil</label>
            <input type="file" class="form-control" id="personal_foto" accept="image/*">
            <small style="color:var(--gris-400)">JPG, PNG, WEBP · Máx 5MB</small>
          </div>
          <div class="form-group" style="grid-column:1/-1">
            <label class="form-label">Observaciones</label>
            <textarea class="form-control" id="personal_observaciones" rows="2"></textarea>
          </div>
        </div>

        <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--gris-400);letter-spacing:.08em;margin:18px 0 10px">Documentos</p>
        <style>
          .pers-docs-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:12px; }
          .pers-doc-card { border:1px solid var(--gris-700); border-radius:10px; padding:11px 13px; background:var(--gris-800); display:flex; flex-direction:column; gap:9px; }
          .pers-doc-head { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
          .pers-doc-title { font-weight:700; font-size:12px; color:var(--gris-100); flex:1; min-width:110px; }
          .pers-doc-estado { font-size:10px; font-weight:700; padding:2px 9px; border-radius:999px; display:inline-flex; align-items:center; gap:5px; white-space:nowrap; }
          .pers-doc-estado::before { content:''; width:7px; height:7px; border-radius:50%; background:currentColor; }
          .pers-doc-estado.ok { background:rgba(40,167,69,.18); color:var(--verde); }
          .pers-doc-estado.no { background:var(--gris-700); color:var(--gris-400); }
          .pers-doc-card a.pers-doc-act { font-size:11px; font-weight:600; text-decoration:none; white-space:nowrap; }
          .pers-doc-card a.pers-doc-act.ver { color:var(--primary); }
          .pers-doc-card a.pers-doc-act.quitar { color:var(--rojo); }
          .pers-doc-card input[type=file] { font-size:12px; }
        </style>
        <?php
          $persDocs = [
            ['doc_dni',              'DNI · anverso',               ''],
            ['doc_dni_reverso',      'DNI · reverso',               ''],
            ['doc_licencia',         'Licencia · anverso',          'personalDocLicenciaWrap'],
            ['doc_licencia_reverso', 'Licencia · reverso',          'personalDocLicenciaRevWrap'],
            ['doc_certijoven',       'CertiJoven',                  ''],
            ['doc_sctr',             'SCTR',                        ''],
            ['doc_verif_ref',        'Verificación de referencias', ''],
          ];
        ?>
        <div class="pers-docs-grid">
          <?php foreach ($persDocs as [$campo, $titulo, $wrapId]): ?>
          <div class="pers-doc-card"<?= $wrapId ? ' id="' . $wrapId . '"' : '' ?>>
            <div class="pers-doc-head">
              <span class="pers-doc-title"><?= $titulo ?></span>
              <span class="pers-doc-estado no" id="personal_<?= $campo ?>_estado">Falta</span>
              <a class="pers-doc-act ver" id="personal_<?= $campo ?>_link" href="#" onclick="verDocumento(this.href);return false;" style="display:none"><i class="fas fa-eye"></i> Ver</a>
              <a class="pers-doc-act quitar" id="personal_<?= $campo ?>_del" href="#" onclick="eliminarDocPersonal('<?= $campo ?>');return false;" style="display:none"><i class="fas fa-trash"></i> Quitar</a>
            </div>
            <input type="file" class="form-control" id="personal_<?= $campo ?>" accept="image/*,application/pdf">
          </div>
          <?php endforeach; ?>
        </div>
        <small style="color:var(--gris-400);display:block;margin-top:8px">Imagen o PDF · Máx 15MB por documento (las imágenes se optimizan al subir)</small>
        <div id="btnExpedienteWrap" style="display:none;margin-top:12px">
          <button type="button" class="btn btn-secondary btn-sm" id="btnExpedientePersonal" onclick="descargarExpedientePersonal()">
            <i class="fas fa-file-pdf"></i> Descargar expediente (PDF)
          </button>
          <small style="color:var(--gris-400);margin-left:8px">Une todos los documentos en un solo PDF</small>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px">
          <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalPersonal')">Cancelar</button>
          <button type="submit" class="btn btn-primary" id="btnGuardarPersonal"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- ===== MODAL VISOR DE DOCUMENTO (imagen o PDF, en la misma pantalla) ===== -->
<div class="modal-overlay" id="modalVisorDoc">
  <div class="modal-box" style="max-width:960px;width:96%">
    <div class="modal-header">
      <h3><i class="fas fa-file-lines" style="color:var(--primary)"></i> Documento</h3>
      <div style="display:flex;gap:8px;align-items:center">
        <a id="visorDocAbrir" href="#" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" title="Abrir en pestaña nueva">
          <i class="fas fa-up-right-from-square"></i> Abrir aparte
        </a>
        <button class="modal-close" onclick="cerrarModal('modalVisorDoc')"><i class="fas fa-times"></i></button>
      </div>
    </div>
    <div class="modal-body" id="visorDocBody"
         style="padding:0;background:#525659;min-height:72vh;display:flex;align-items:center;justify-content:center;overflow:hidden">
    </div>
  </div>
</div>

<!-- ===== MODAL CAMBIAR ROL ===== -->
<div class="modal-overlay" id="modalCambiarRol">
  <div class="modal-box" style="max-width:420px">
    <div class="modal-header">
      <h3><i class="fas fa-user-tag" style="color:var(--primary)"></i> Cambiar Rol</h3>
      <button class="modal-close" onclick="cerrarModal('modalCambiarRol')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <input type="hidden" id="cr_usuario_id">
      <p id="cr_usuario_nombre" style="font-size:14px;font-weight:600;color:var(--gris-100);margin-bottom:18px;padding:10px 14px;background:var(--gris-700);border-radius:8px;border-left:3px solid var(--primary)"></p>

      <div class="form-group" style="margin-bottom:16px">
        <label class="form-label">Nuevo rol *</label>
        <select class="form-control" id="cr_rol" style="font-size:15px">
          <option value="administrador">🔑 Administrador — acceso completo</option>
          <option value="supervisor">👁 Supervisor — inspecciones, personal, reportes</option>
          <option value="inspector">📋 Inspector — solo inspecciones</option>
        </select>
      </div>

      <label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:12px 14px;border:1px solid var(--gris-500);border-radius:8px;background:var(--gris-700)">
        <input type="checkbox" id="cr_reset_permisos" style="margin-top:2px;accent-color:var(--naranja);width:16px;height:16px;flex-shrink:0">
        <span>
          <strong style="font-size:13px;color:var(--gris-100)">Reiniciar permisos de módulos</strong><br>
          <span style="font-size:12px;color:var(--gris-400)">Elimina los permisos personalizados. El usuario usará los módulos por defecto del nuevo rol.</span>
        </span>
      </label>

      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px">
        <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalCambiarRol')">Cancelar</button>
        <button type="button" class="btn btn-primary" onclick="submitCambiarRol()">
          <i class="fas fa-save"></i> Actualizar rol
        </button>
      </div>
    </div>
  </div>
</div>

<!-- ===== MODAL USUARIO ===== -->
<div class="modal-overlay" id="modalUsuario">
  <div class="modal-box" style="max-width:520px">
    <div class="modal-header">
      <h3><i class="fas fa-user-plus" style="color:var(--amarillo)"></i> <span id="modalUsuarioTitulo">Nuevo Usuario</span></h3>
      <button class="modal-close" onclick="cerrarModal('modalUsuario')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <form id="formUsuario">
        <input type="hidden" id="usuario_id">
        <div class="form-group">
          <label class="form-label">Nombre completo *</label>
          <input type="text" class="form-control" id="usuario_nombre" required>
        </div>
        <div class="form-group">
          <label class="form-label">Usuario (login) *</label>
          <input type="text" class="form-control" id="usuario_usuario" required>
          <small style="color:var(--gris-400)">Solo letras, números, punto, guion y guion bajo</small>
        </div>
        <div class="form-group">
          <label class="form-label">Contraseña <span id="pwd_label_hint">*</span></label>
          <input type="password" class="form-control" id="usuario_password" minlength="6">
          <small style="color:var(--gris-400)" id="pwd_hint">Mínimo 6 caracteres</small>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <label class="form-label">Rol *</label>
            <select class="form-control" id="usuario_rol">
              <option value="administrador">Administrador</option>
              <option value="supervisor">Supervisor</option>
              <option value="inspector" selected>Inspector</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Estado</label>
            <select class="form-control" id="usuario_activo">
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </div>
        </div>
        <!-- Módulos permitidos (solo para no-admin) -->
        <div id="seccionModulos" style="margin-top:18px;display:none">
          <div style="font-size:11px;font-weight:700;color:var(--gris-300);text-transform:uppercase;letter-spacing:1.2px;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--gris-600)">
            <i class="fas fa-shield-halved" style="color:var(--primary);margin-right:6px"></i>
            Módulos permitidos
            <span style="font-weight:400;color:var(--gris-400);margin-left:6px">(vacío = usa defaults del rol)</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px" id="checkboxModulos">
            <label class="modulo-check"><input type="checkbox" value="dashboard" disabled checked> <i class="fas fa-gauge-high"></i> Dashboard</label>
            <label class="modulo-check"><input type="checkbox" value="inspecciones" id="mod_inspecciones"> <i class="fas fa-clipboard-list"></i> Abordajes</label>
            <label class="modulo-check"><input type="checkbox" value="personal" id="mod_personal"> <i class="fas fa-id-card"></i> Personal</label>
            <label class="modulo-check"><input type="checkbox" value="matriz" id="mod_matriz"> <i class="fas fa-bolt"></i> Matriz Consecuencias</label>
            <label class="modulo-check"><input type="checkbox" value="amonestaciones" id="mod_amonestaciones"> <i class="fas fa-file-signature"></i> Amonestaciones</label>
            <label class="modulo-check"><input type="checkbox" value="geocercas" id="mod_geocercas"> <i class="fas fa-draw-polygon"></i> Geocercas</label>
            <label class="modulo-check"><input type="checkbox" value="evaluaciones" id="mod_evaluaciones"> <i class="fas fa-clipboard-check"></i> Evaluaciones</label>
            <label class="modulo-check"><input type="checkbox" value="capacitaciones" id="mod_capacitaciones"> <i class="fas fa-chalkboard-user"></i> Capacitaciones</label>
            <label class="modulo-check"><input type="checkbox" value="kpi_analytics" id="mod_kpi_analytics"> <i class="fas fa-chart-line"></i> KPI Analytics</label>
            <label class="modulo-check"><input type="checkbox" value="epp" id="mod_epp"> <i class="fas fa-helmet-safety"></i> EPP</label>
            <label class="modulo-check"><input type="checkbox" value="vehiculos" id="mod_vehiculos"> <i class="fas fa-truck"></i> Vehículos</label>
            <label class="modulo-check"><input type="checkbox" value="checklist" id="mod_checklist"> <i class="fas fa-clipboard-check"></i> Checklist</label>
            <label class="modulo-check"><input type="checkbox" value="documentos" id="mod_documentos"> <i class="fas fa-folder-open"></i> Documentos</label>
          </div>
          <p style="font-size:11px;color:var(--gris-400);margin-top:8px"><i class="fas fa-info-circle"></i> Dashboard siempre visible. Desmarca todo para usar defaults del rol.</p>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px">
          <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalUsuario')">Cancelar</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- ===== LIGHTBOX FOTO ===== -->
<div class="modal-overlay" id="modalFoto" onclick="cerrarLightboxSiClick(event)">
  <div style="position:relative;display:flex;align-items:center;justify-content:center;width:100%;height:100%;padding:20px;box-sizing:border-box">

    <!-- Botón cerrar -->
    <button onclick="cerrarModal('modalFoto')"
      style="position:fixed;top:16px;right:20px;background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.2);
             color:#fff;border-radius:50%;width:42px;height:42px;font-size:18px;cursor:pointer;z-index:10;
             display:flex;align-items:center;justify-content:center;transition:background 0.2s"
      onmouseover="this.style.background='rgba(245,200,0,0.8)';this.style.color='#000'"
      onmouseout="this.style.background='rgba(0,0,0,0.7)';this.style.color='#fff'">
      <i class="fas fa-times"></i>
    </button>

    <!-- Flecha izquierda -->
    <button id="lbBtnPrev" onclick="navegarGaleria(-1)"
      style="position:fixed;left:16px;top:50%;transform:translateY(-50%);
             background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.2);
             color:#fff;border-radius:50%;width:48px;height:48px;font-size:20px;
             cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;
             transition:background 0.2s"
      onmouseover="this.style.background='rgba(245,200,0,0.8)';this.style.color='#000'"
      onmouseout="this.style.background='rgba(0,0,0,0.7)';this.style.color='#fff'">
      <i class="fas fa-chevron-left"></i>
    </button>

    <!-- Imagen principal -->
    <div style="display:flex;flex-direction:column;align-items:center;gap:14px;max-width:92vw">
      <img id="modalFotoImg" src="" alt=""
        style="max-width:88vw;max-height:80vh;border-radius:10px;
               box-shadow:0 20px 60px rgba(0,0,0,0.8);object-fit:contain;display:block">
      <!-- Contador y nombre -->
      <div id="lbContador"
        style="color:#fff;font-size:13px;background:rgba(0,0,0,0.6);
               padding:6px 16px;border-radius:20px;letter-spacing:0.5px">
        Foto 1 de 1
      </div>
      <!-- Miniaturas -->
      <div id="lbMiniaturas"
        style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;max-width:88vw">
      </div>
    </div>

    <!-- Flecha derecha -->
    <button id="lbBtnNext" onclick="navegarGaleria(1)"
      style="position:fixed;right:16px;top:50%;transform:translateY(-50%);
             background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.2);
             color:#fff;border-radius:50%;width:48px;height:48px;font-size:20px;
             cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;
             transition:background 0.2s"
      onmouseover="this.style.background='rgba(245,200,0,0.8)';this.style.color='#000'"
      onmouseout="this.style.background='rgba(0,0,0,0.7)';this.style.color='#fff'">
      <i class="fas fa-chevron-right"></i>
    </button>
  </div>
</div>

<!-- ===== MODAL PREVIEW DOCUMENTO ===== -->
<div class="modal-overlay" id="modalDocPreview" onclick="if(event.target===this)cerrarModal('modalDocPreview')">
  <div class="modal-box" style="max-width:860px;width:95vw;height:90vh;display:flex;flex-direction:column;padding:0;overflow:hidden">
    <div class="modal-header" style="flex-shrink:0;padding:14px 18px">
      <h3 id="modalDocPreviewTitle" style="display:flex;align-items:center;gap:8px">
        <i class="fas fa-file-alt" style="color:var(--primary)"></i> Documento
      </h3>
      <button class="modal-close" onclick="cerrarModal('modalDocPreview')"><i class="fas fa-times"></i></button>
    </div>
    <div style="flex:1;overflow:hidden;background:#525659">
      <iframe id="modalDocPreviewFrame" src="" style="width:100%;height:100%;border:none;display:block"></iframe>
    </div>
    <div class="modal-footer" style="flex-shrink:0;padding:10px 18px;display:flex;justify-content:flex-end;gap:8px;border-top:1px solid var(--gris-600)">
      <a id="modalDocPreviewDownload" href="#" target="_blank" class="btn btn-outline btn-sm"><i class="fas fa-external-link-alt"></i> Abrir en nueva pestaña</a>
      <button class="btn btn-secondary btn-sm" onclick="cerrarModal('modalDocPreview')"><i class="fas fa-times"></i> Cerrar</button>
    </div>
  </div>
</div>

<!-- ===== MODAL DETALLE ===== -->
<div class="modal-overlay" id="modalDetalle">
  <div class="modal-box" style="max-width:1100px">
    <div class="modal-header">
      <h3 style="font-size:22px;letter-spacing:1px"><i class="fas fa-clipboard-check" style="color:var(--amarillo)"></i> DETALLE DE INSPECCIÓN EN RUTA</h3>
      <button class="modal-close" onclick="cerrarModal('modalDetalle')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body" id="modalDetalleBody">
      <div style="text-align:center;padding:32px"><div class="spinner"></div></div>
    </div>
  </div>
</div>

<!-- ===== MODAL GEOCERCAS ===== -->
<?php if (tieneAccesoModulo('geocercas')): ?>
<div class="modal-overlay" id="modalGeo">
  <div class="modal-box" style="max-width:1040px;width:97%">
    <div class="modal-header">
      <h3><i class="fas fa-draw-polygon" style="color:var(--primary)"></i> <span id="modalGeoTitulo">Nueva Geocerca</span></h3>
      <button class="modal-close" onclick="cerrarModal('modalGeo');if(geoDrawMap){geoDrawMap.remove();geoDrawMap=null;}"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <form id="formGeo">
        <input type="hidden" id="geo_id"              name="id">
        <input type="hidden" id="geo_tipo"            name="tipo">
        <input type="hidden" id="geoCoordenadasHidden" name="coordenadas">

        <!-- Fila: Nombre + Color -->
        <div class="form-grid" style="grid-template-columns:1fr auto;gap:12px;margin-bottom:10px">
          <div class="form-group" style="margin:0">
            <label class="form-label">Nombre *</label>
            <input type="text" class="form-control" id="geo_nombre" name="nombre" placeholder="Ej: Zona Roja Av. Ferrocarril" required>
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label">Color</label>
            <input type="color" class="form-control" id="geo_color" name="color" style="height:38px;padding:3px 6px;cursor:pointer" oninput="geoColorCambiado()">
          </div>
        </div>

        <!-- Campos solo para Zonas N3 -->
        <div id="geoClienteFields" style="display:none">
          <input type="hidden" id="geo_icono" name="icono" value="fa-circle">

          <!-- Selector de icono -->
          <div class="form-group" style="margin-bottom:10px">
            <label class="form-label">Icono del marcador</label>
            <div id="geoIconPicker" style="display:flex;flex-wrap:wrap;gap:5px;margin-top:6px"></div>
          </div>

          <!-- Fila: Código + Dirección de Cliente -->
          <div class="form-grid" style="grid-template-columns:1fr 2fr;gap:10px;margin-bottom:10px">
            <div class="form-group" style="margin:0">
              <label class="form-label">Código</label>
              <input type="text" class="form-control" id="geo_codigo" name="codigo" placeholder="Ej: 12527266">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Dirección de Cliente</label>
              <input type="text" class="form-control" id="geo_direccion_cliente" name="direccion_cliente" placeholder="Ej: Jr. Ayacucho 527 - 529">
            </div>
          </div>

          <!-- Fila: Latitud + Longitud (solo Zona N3) -->
          <div id="geoLatLngFields" style="display:none">
            <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
              <div class="form-group" style="margin:0">
                <label class="form-label"><i class="fas fa-location-dot" style="color:var(--primary);margin-right:4px"></i>Latitud</label>
                <input type="number" step="any" class="form-control" id="geo_lat" placeholder="-15.4948788">
              </div>
              <div class="form-group" style="margin:0">
                <label class="form-label"><i class="fas fa-location-dot" style="color:var(--primary);margin-right:4px"></i>Longitud</label>
                <input type="number" step="any" class="form-control" id="geo_lng" placeholder="-70.1345618">
              </div>
            </div>
          </div>

          <!-- Fila: Supervisor + Clientes N3 -->
          <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
            <div class="form-group" style="margin:0">
              <label class="form-label">Supervisor</label>
              <input type="text" class="form-control" id="geo_supervisor" name="supervisor" placeholder="Nombre del supervisor">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Clientes N3</label>
              <input type="text" class="form-control" id="geo_clientes_n3" name="clientes_n3" placeholder="Ej: CLIENTE N3 2022">
            </div>
          </div>
        </div>

        <!-- Descripción -->
        <div class="form-group" style="margin-bottom:10px">
          <label class="form-label">Descripción</label>
          <textarea class="form-control" id="geo_descripcion" name="descripcion" rows="2" placeholder="Descripción opcional"></textarea>
        </div>

        <!-- Instrucciones -->
        <div style="background:rgba(26,187,156,.08);border:1px solid rgba(26,187,156,.25);border-radius:4px;padding:8px 12px;font-size:12px;color:var(--gris-300);margin-bottom:10px;display:flex;align-items:flex-start;gap:8px">
          <i class="fas fa-info-circle" style="color:var(--primary);margin-top:1px;flex-shrink:0"></i>
          <span id="geoDrawHint">Usa las herramientas del mapa para dibujar.</span>
        </div>

        <!-- Mapa de dibujo -->
        <div style="border-radius:4px;overflow:hidden;border:1px solid var(--gris-600)">
          <div id="geoDrawMap" style="height:60vh;min-height:420px;width:100%"></div>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
          <button type="button" class="btn btn-secondary" onclick="cerrarModal('modalGeo');if(geoDrawMap){geoDrawMap.remove();geoDrawMap=null;}">Cancelar</button>
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> Guardar</button>
        </div>
      </form>
    </div>
  </div>
</div>
<?php endif; ?>

<!-- ===== MODAL IMPORT ZONAS N3 ===== -->
<?php if (tieneAccesoModulo('geocercas')): ?>
<div class="modal-overlay" id="modalGeoImport">
  <div class="modal-box" style="max-width:820px">
    <div class="modal-header">
      <h3><i class="fas fa-file-import" style="color:var(--primary)"></i> Vista Previa — Importar Zonas N3</h3>
      <button class="modal-close" onclick="cerrarModal('modalGeoImport')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <div id="geoImportPreviewBody"></div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
        <button class="btn btn-secondary" onclick="cerrarModal('modalGeoImport')">Cancelar</button>
        <button class="btn btn-primary" id="btnConfirmarImportN3" onclick="confirmarImportN3()">
          <i class="fas fa-check"></i> Confirmar importación
        </button>
      </div>
    </div>
  </div>
</div>

<!-- ===== MODAL: SEÑALIZACIÓN DE RUTA (curvas / velocidad máxima) ===== -->
<div class="modal-overlay" id="modalGeoSenales">
  <div class="modal-box" style="max-width:900px;width:97%">
    <div class="modal-header">
      <h3><i class="fas fa-gauge-high" style="color:var(--primary)"></i> Señalización — <span id="geoSenTitulo"></span></h3>
      <button class="modal-close" onclick="geoSenalesCerrar()"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body">
      <p class="muted" style="font-size:12px;margin:0 0 8px">Haz clic sobre la carretera para colocar una señal. Completa la velocidad y guarda.</p>
      <div id="geoSenMap" style="height:340px;width:100%;border-radius:8px;overflow:hidden"></div>
      <input type="hidden" id="geoSenGid"><input type="hidden" id="geoSenId">
      <input type="hidden" id="geoSenLat"><input type="hidden" id="geoSenLng">
      <div class="filter-bar" style="margin-top:12px">
        <div class="form-group"><label class="form-label">Tipo</label>
          <select class="form-control" id="geoSenTipo" onchange="geoSenTipoCambio()">
            <option value="velocidad_max">Velocidad máxima</option>
            <option value="curva">Curva peligrosa</option>
            <option value="cruce">Cruce</option>
            <option value="zona_escolar">Zona escolar</option>
            <option value="pendiente">Pendiente</option>
            <option value="baden">Badén</option>
            <option value="peligro">Otro peligro</option>
          </select></div>
        <div class="form-group" id="geoSenVelWrap"><label class="form-label">Velocidad (km/h)</label>
          <input type="number" class="form-control" id="geoSenVel" min="5" max="120" step="5" placeholder="Ej: 40"></div>
        <div class="form-group"><label class="form-label">Severidad</label>
          <select class="form-control" id="geoSenSev">
            <option value="precaucion">Precaución</option><option value="peligro">Peligro</option><option value="info">Informativo</option>
          </select></div>
        <div class="form-group" style="flex:1;min-width:200px"><label class="form-label">Descripción (opcional)</label>
          <input type="text" class="form-control" id="geoSenDesc" maxlength="200" placeholder="Ej: curva cerrada a la derecha"></div>
        <button class="btn btn-primary" onclick="geoSenGuardar()"><i class="fas fa-save"></i> <span id="geoSenBtnTxt">Agregar señal</span></button>
      </div>
      <div id="geoSenLista" style="margin-top:12px"></div>
    </div>
  </div>
</div>

<!-- ===== MODAL: COMPARTIR MAPA (QR / link) ===== -->
<div class="modal-overlay" id="modalGeoShare">
  <div class="modal-box" style="max-width:440px;width:94%">
    <div class="modal-header">
      <h3><i class="fas fa-share-nodes" style="color:var(--primary)"></i> Compartir con conductores</h3>
      <button class="modal-close" onclick="cerrarModal('modalGeoShare')"><i class="fas fa-times"></i></button>
    </div>
    <div class="modal-body" style="text-align:center">
      <input type="hidden" id="geoShareGid">
      <div id="geoShareBody"><p class="muted">Generando enlace…</p></div>
    </div>
  </div>
</div>
<?php endif; ?>
