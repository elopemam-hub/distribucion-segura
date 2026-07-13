// ============================================================
// KPI ANALYTICS — Dataset Manager
// assets/js/modulos/kpi_datasets.js
// ============================================================

let _kpiParsedRows   = [];
let _kpiHeaders      = [];
let _kpiColTypes     = {};
let _kpiTipos        = [];
let _kpiSelectedFile = null;
window._kpiImporting = false;

// Paginación de datasets
let _kpiAllDatasets  = [];
let _kpiFiltrados    = [];
let _kpiPagina       = 1;

// ── Lifecycle ─────────────────────────────────────────────────

function kpiDatasetsInit() {
    kpiCargarTipos();
    kpiCargarListado();
}

// ── Tab switching ─────────────────────────────────────────────

function kpiSwitchTab(tab) {
    document.querySelectorAll('.kpi-tab-panel').forEach(p => { p.style.display = 'none'; });
    document.querySelectorAll('[id^="kpi-btn-"]').forEach(b => b.classList.remove('active'));
    const panel = document.getElementById('kpi-panel-' + tab);
    const btn   = document.getElementById('kpi-btn-' + tab);
    if (panel) panel.style.display = '';
    if (btn)   btn.classList.add('active');
}

// ── Tipos de Archivo ──────────────────────────────────────────

async function kpiCargarTipos() {
    const sel    = document.getElementById('kpiTipoSel');
    const tbody  = document.getElementById('kpiTiposRefBody');
    const addBtn = document.getElementById('kpiAgregarTipoBtn');

    try {
        const res  = await fetch(KPI_FILE_TYPES_API + '?action=list');
        const data = await res.json();

        // Mostrar botón agregar para admins/supervisores
        if (addBtn) {
            const rol = document.body.dataset.rol || '';
            if (['administrador', 'supervisor'].includes(rol)) addBtn.style.display = 'inline-flex';
        }

        if (!data.success) {
            if (data.message === 'migration_pending') {
                _renderTiposRefPending(tbody);
                // ocultar selector y mostrar aviso
                const sel = document.getElementById('kpiTipoSel');
                if (sel) sel.innerHTML = '<option value="">⚠ Ejecuta kpi_file_types.sql primero</option>';
            } else {
                if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--rojo)">
                    <i class="fas fa-circle-exclamation"></i> ${kpiEsc(data.message)}
                </td></tr>`;
            }
            return;
        }

        _kpiTipos = data.data || [];

        // Populate selector
        if (sel) {
            sel.innerHTML = '<option value="">— Selecciona el tipo —</option>' +
                _kpiTipos.map(t =>
                    `<option value="${t.codigo}">${t.codigo} — ${kpiEsc(t.descripcion)}</option>`
                ).join('');
        }

        // Reference table
        _renderTiposRef(tbody, _kpiTipos);

    } catch (err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--gris-500)">
            Error cargando tipos: ${kpiEsc(err.message)}
        </td></tr>`;
    }
}

function _renderTiposRef(tbody, tipos) {
    if (!tbody) return;
    if (!tipos.length) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--gris-500)">
            No hay tipos configurados. Haz clic en <strong>Agregar tipo</strong> para comenzar.
        </td></tr>`;
        return;
    }
    tbody.innerHTML = tipos.map(t => `
        <tr>
            <td>
                <span style="font-family:monospace;font-weight:800;font-size:12px;letter-spacing:.06em;color:var(--gris-100)">${kpiEsc(t.codigo)}</span>
            </td>
            <td style="color:var(--gris-200)">${kpiEsc(t.descripcion)}</td>
            <td>
                <span style="background:#111;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;font-family:monospace">.${kpiEsc(t.formato)}</span>
            </td>
            <td style="color:var(--gris-300)">${t.max_mb} MB</td>
            <td style="font-family:monospace;font-size:11px;color:var(--gris-400)">${t.tabla_destino ? kpiEsc(t.tabla_destino) : '<span style="color:var(--gris-600)">—</span>'}</td>
            <td>
                <div style="display:flex;gap:4px">
                    <button onclick="kpiEditarTipo(${t.id})" title="Editar"
                            style="padding:3px 7px;border:1px solid var(--gris-600);background:transparent;border-radius:5px;cursor:pointer;color:var(--gris-400);font-size:11px">
                        <i class="fas fa-pencil"></i>
                    </button>
                    <button onclick="kpiEliminarTipo(${t.id}, '${kpiEsc(t.codigo)}')" title="Eliminar"
                            style="padding:3px 7px;border:1px solid var(--rojo);background:transparent;border-radius:5px;cursor:pointer;color:var(--rojo);font-size:11px">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function _renderTiposRefPending(tbody) {
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:16px;color:var(--naranja)">
        <i class="fas fa-triangle-exclamation"></i>
        Ejecuta <code>deploy/kpi_file_types.sql</code> en phpMyAdmin para habilitar los tipos de archivo.
    </td></tr>`;
}

function kpiOnTipoChange() {
    const sel    = document.getElementById('kpiTipoSel');
    const card   = document.getElementById('kpiTipoCard');
    const title  = document.getElementById('kpiTipoCardTitle');
    const meta   = document.getElementById('kpiTipoCardMeta');
    const hint   = document.getElementById('kpiDropZoneHint');

    const tipo   = _kpiTipos.find(t => t.codigo === sel?.value);

    if (tipo && card) {
        card.style.display  = 'block';
        title.textContent   = tipo.descripcion;
        meta.textContent    = `Formato: .${tipo.formato} | Máximo: ${tipo.max_mb} MB`;

        // Update file input accept
        const input = document.getElementById('kpiFileInput');
        if (input) input.accept = '.' + tipo.formato;

        // Update hint text
        if (hint) hint.textContent = `Solo archivos .${tipo.formato} (máx. ${tipo.max_mb} MB)`;

        // If a file was already selected, validate it
        if (_kpiSelectedFile) {
            const ext = _kpiSelectedFile.name.split('.').pop().toLowerCase();
            if (ext !== tipo.formato) {
                _kpiResetDropZone();
                toast(`El archivo seleccionado no es .${tipo.formato}. Selecciona otro archivo.`, 'warning');
            }
        }
    } else if (card) {
        card.style.display = 'none';
        if (hint) hint.textContent = 'Solo archivos .xlsx (máx. 5 MB)';
    }
}

// ── File handling ─────────────────────────────────────────────

function kpiHandleFileSelect(input) {
    const file = input.files[0];
    if (file) _kpiSetSelectedFile(file);
    input.value = '';
}

function kpiHandleDrop(e) {
    e.preventDefault();
    const zone = document.getElementById('kpiDropZone');
    if (zone) zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) _kpiSetSelectedFile(file);
}

function _kpiSetSelectedFile(file) {
    // Validate format against selected tipo
    const sel  = document.getElementById('kpiTipoSel');
    const tipo = _kpiTipos.find(t => t.codigo === sel?.value);

    if (tipo) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext !== tipo.formato) {
            toast(`Formato incorrecto. El tipo "${tipo.codigo}" requiere .${tipo.formato}`, 'error');
            return;
        }
        const maxBytes = tipo.max_mb * 1024 * 1024;
        if (file.size > maxBytes) {
            toast(`Archivo demasiado grande. Máximo ${tipo.max_mb} MB para este tipo.`, 'error');
            return;
        }
    } else {
        // No tipo selected — generic validation
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls', 'csv'].includes(ext)) {
            toast('Formato no soportado. Usa .xlsx, .xls o .csv', 'error');
            return;
        }
        if (file.size > 25 * 1024 * 1024) {
            toast('Archivo demasiado grande. Máximo 25 MB.', 'error');
            return;
        }
    }

    _kpiSelectedFile = file;
    _kpiUpdateDropZoneSelected(file);
}

function _kpiUpdateDropZoneSelected(file) {
    const zone = document.getElementById('kpiDropZone');
    const btn  = document.getElementById('kpiSubirBtn');
    const mb   = (file.size / 1024 / 1024).toFixed(2);

    if (zone) zone.innerHTML = `
        <i class="fas fa-file-excel" style="font-size:30px;color:var(--verde)"></i>
        <div style="font-size:14px;font-weight:600;color:var(--gris-100);text-align:center;word-break:break-all;max-width:90%">${kpiEsc(file.name)}</div>
        <div style="font-size:11px;color:var(--gris-400)">${mb} MB</div>
        <div style="font-size:12px;color:var(--verde);font-weight:600"><i class="fas fa-check-circle"></i> Archivo listo</div>
        <div style="font-size:11px;color:var(--gris-500);margin-top:2px;cursor:pointer;text-decoration:underline"
             onclick="event.stopPropagation();document.getElementById('kpiFileInput').click()">Cambiar archivo</div>`;

    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
}

function _kpiResetDropZone() {
    _kpiSelectedFile = null;
    const zone = document.getElementById('kpiDropZone');
    const btn  = document.getElementById('kpiSubirBtn');

    if (zone) zone.innerHTML = `
        <i class="fas fa-cloud-arrow-up" style="font-size:32px;color:var(--gris-500);opacity:.5"></i>
        <div style="font-size:14px;font-weight:600;color:var(--gris-300)">Arrastra tu archivo aquí o haz clic para seleccionar</div>
        <div id="kpiDropZoneHint" style="font-size:11px;color:var(--gris-500)">Solo archivos .xlsx (máx. 5 MB)</div>`;
    if (btn) { btn.disabled = true; btn.style.opacity = '.45'; }
}

// Botón "Subir Archivo" — valida y abre el mapper
function kpiSubirArchivo() {
    const sel    = document.getElementById('kpiTipoSel');
    const fechaEl = document.getElementById('kpiFechaPlan');

    if (!_kpiSelectedFile) {
        toast('Selecciona un archivo primero.', 'error');
        return;
    }
    if (!sel?.value) {
        toast('Selecciona el tipo de archivo.', 'error');
        sel?.focus();
        return;
    }
    if (!fechaEl?.value) {
        toast('Selecciona la fecha de planificación.', 'error');
        fechaEl?.focus();
        return;
    }

    kpiHandleFile(_kpiSelectedFile);
}

function kpiHandleFile(file) {
    const zone = document.getElementById('kpiDropZone');
    if (zone) zone.innerHTML = `
        <div class="spinner" style="width:24px;height:24px;border-width:3px"></div>
        <div style="color:var(--gris-400);font-size:13px;margin-top:4px">Leyendo archivo...</div>`;

    const reader = new FileReader();
    reader.onload = ev => {
        try {
            const wb   = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
            const ws   = wb.Sheets[wb.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

            _kpiUpdateDropZoneSelected(file);  // restore after loading

            if (!data || data.length < 2) {
                toast('El archivo no tiene filas de datos.', 'error');
                return;
            }

            const rawHeaders = data[0];
            let lastNonEmpty = rawHeaders.length - 1;
            while (lastNonEmpty > 0 && String(rawHeaders[lastNonEmpty] ?? '').trim() === '') lastNonEmpty--;
            _kpiHeaders = rawHeaders.slice(0, lastNonEmpty + 1)
                .map((h, i) => String(h).trim() || ('Col' + (i + 1)));

            _kpiParsedRows = data.slice(1)
                .filter(r => r.slice(0, _kpiHeaders.length).some(v => v !== '' && v !== null && v !== undefined))
                .map(r => r.slice(0, _kpiHeaders.length));

            if (!_kpiParsedRows.length) {
                toast('El archivo tiene encabezados pero ninguna fila de datos.', 'error');
                return;
            }

            _kpiColTypes = {};
            _kpiHeaders.forEach((h, i) => {
                _kpiColTypes[h] = kpiAutoDetectType(h, _kpiParsedRows.slice(0, 30).map(r => r[i]));
            });

            kpiAbrirMapper(file.name);

        } catch (err) {
            _kpiUpdateDropZoneSelected(file);
            console.error('[kpi] parse error:', err);
            toast('No se pudo leer el archivo: ' + err.message, 'error');
        }
    };
    reader.onerror = () => {
        _kpiUpdateDropZoneSelected(file);
        toast('No se pudo acceder al archivo.', 'error');
    };
    reader.readAsArrayBuffer(file);
}

function kpiAutoDetectType(colName, muestra) {
    const n = colName.toLowerCase();
    const fechaKw = ['fecha', 'date', 'dia', 'día', 'mes', 'año', 'year', 'month', 'week', 'semana', 'periodo', 'period', 'tiempo', 'time'];
    if (fechaKw.some(k => n.includes(k))) return 'fecha';
    const noVacias = muestra.filter(v => v !== '' && v !== null && v !== undefined);
    if (!noVacias.length) return 'dimension';
    const numCount = noVacias.filter(v => !isNaN(parseFloat(String(v))) && isFinite(String(v))).length;
    return (numCount / noVacias.length >= 0.7) ? 'metrica' : 'dimension';
}

// ── Column Mapper Modal ───────────────────────────────────────

function kpiAbrirMapper(filename) {
    const nameInput = document.getElementById('kpiDatasetNombre');

    // Pre-fill nombre: TIPO_CODIGO + fecha si están disponibles
    const tipo  = document.getElementById('kpiTipoSel')?.value || '';
    const fecha = document.getElementById('kpiFechaPlan')?.value || '';
    const tipoObj = _kpiTipos.find(t => t.codigo === tipo);

    let nombre = '';
    if (tipo && fecha) {
        nombre = `${tipo} - ${fecha}`;
    } else if (tipo) {
        nombre = tipo;
    } else {
        nombre = filename.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ').trim();
    }
    nameInput.value = nombre;

    document.getElementById('kpiMapperInfo').textContent =
        `${_kpiParsedRows.length.toLocaleString('es-PE')} filas · ${_kpiHeaders.length} columnas`;

    // Tabla de tipos
    const tbody = document.getElementById('kpiMapperCols');
    tbody.innerHTML = '';
    _kpiHeaders.forEach((col, idx) => {
        const muestra = _kpiParsedRows.slice(0, 3)
            .map(r => String(r[idx] ?? '').slice(0, 40))
            .filter(v => v !== '')
            .join(' · ');

        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid var(--gris-600)';
        tr.innerHTML = `
            <td style="padding:7px 14px;font-family:monospace;font-size:12px;color:var(--gris-100);font-weight:600;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${kpiEsc(col)}">${kpiEsc(col)}</td>
            <td style="padding:5px 14px">
                <select class="form-control" style="font-size:12px;padding:5px 8px;min-width:130px"
                        data-col="${kpiEsc(col)}" onchange="kpiUpdateColType(this)">
                    <option value="dimension" ${_kpiColTypes[col]==='dimension'?'selected':''}>📊 Dimensión</option>
                    <option value="metrica"   ${_kpiColTypes[col]==='metrica'  ?'selected':''}>🔢 Métrica</option>
                    <option value="fecha"     ${_kpiColTypes[col]==='fecha'    ?'selected':''}>📅 Fecha</option>
                    <option value="ignorar"   ${_kpiColTypes[col]==='ignorar'  ?'selected':''}>— Ignorar</option>
                </select>
            </td>
            <td style="padding:7px 14px;font-size:11px;color:var(--gris-400);max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${kpiEsc(muestra)}</td>`;
        tbody.appendChild(tr);
    });

    // Preview
    const head = document.getElementById('kpiPreviewHead');
    const body = document.getElementById('kpiPreviewBody');
    head.innerHTML = '<tr>' + _kpiHeaders.map(h =>
        `<th style="padding:6px 10px;background:var(--gris-700);text-align:left;font-size:10px;font-weight:700;color:var(--gris-400);text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;border-bottom:1px solid var(--gris-600)">${kpiEsc(h)}</th>`
    ).join('') + '</tr>';
    body.innerHTML = _kpiParsedRows.slice(0, 5).map((row, ri) =>
        '<tr>' + _kpiHeaders.map((_, ci) =>
            `<td style="padding:5px 10px;font-size:11px;color:var(--gris-200);white-space:nowrap;${ri < 4 ? 'border-bottom:1px solid var(--gris-600)' : ''}">${kpiEsc(String(row[ci] ?? '').slice(0, 60))}</td>`
        ).join('') + '</tr>'
    ).join('');

    kpiSetImportUI(false);
    abrirModal('kpiMapperModal');
    nameInput.focus();
    nameInput.select();
}

function kpiUpdateColType(select) {
    _kpiColTypes[select.dataset.col] = select.value;
}

function kpiSetImportUI(importing) {
    window._kpiImporting = importing;
    const btnImport = document.getElementById('kpiImportBtn');
    const btnCancel = document.getElementById('kpiCancelBtn');
    const btnClose  = document.getElementById('kpiMapperCloseBtn');
    const progress  = document.getElementById('kpiImportProgress');

    if (importing) {
        btnImport.disabled = true;
        btnImport.innerHTML = '<div class="spinner" style="width:13px;height:13px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px"></div> Importando...';
        btnCancel.disabled = true;
        btnClose.disabled  = true;
        progress.style.display = 'block';
    } else {
        btnImport.disabled = false;
        btnImport.innerHTML = '<i class="fas fa-upload"></i> Importar dataset';
        btnCancel.disabled = false;
        btnClose.disabled  = false;
        progress.style.display = 'none';
    }
}

// ── Import ────────────────────────────────────────────────────

async function kpiImportarDataset() {
    const nombre = document.getElementById('kpiDatasetNombre').value.trim();
    if (!nombre) {
        document.getElementById('kpiDatasetNombre').focus();
        toast('Ingresa un nombre para el dataset.', 'error');
        return;
    }

    const columnas   = _kpiHeaders.map(h => ({ nombre: h, tipo: _kpiColTypes[h] || 'dimension' }));
    const colActivas = columnas.filter(c => c.tipo !== 'ignorar');
    if (!colActivas.length) {
        toast('Debes mantener al menos una columna activa.', 'error');
        return;
    }

    // Tipo y fecha de planificación
    const tipoCodigo         = document.getElementById('kpiTipoSel')?.value         || '';
    const fechaPlanificacion = document.getElementById('kpiFechaPlan')?.value || '';

    kpiSetImportUI(true);
    kpiSetProgress(3, 'Creando dataset...');

    const csrf = document.querySelector('meta[name="csrf-token"]').content;

    try {
        // 1. Crear registro
        const createRes = await kpiFetch('create', {
            nombre, columnas,
            tipo_codigo: tipoCodigo || undefined,
            fecha_planificacion: fechaPlanificacion || undefined,
        }, csrf);
        if (!createRes.success) throw new Error(createRes.message || 'Error al crear el dataset.');
        const datasetId = createRes.data.id;

        // 2. Enviar filas en batches
        const activeMap  = _kpiHeaders
            .map((h, i) => ({ h, i, tipo: _kpiColTypes[h] }))
            .filter(c => c.tipo !== 'ignorar');

        const usarPartes = document.getElementById('kpiSubirPartes')?.checked ?? true;
        const BATCH      = usarPartes ? 500 : _kpiParsedRows.length;
        const totalRows  = _kpiParsedRows.length;
        const totalBatch = Math.ceil(totalRows / BATCH);

        for (let b = 0; b < totalBatch; b++) {
            const start = b * BATCH;
            const end   = Math.min(start + BATCH, totalRows);
            const filas = _kpiParsedRows.slice(start, end).map(row => {
                const obj = {};
                activeMap.forEach(({ h, i }) => { obj[h] = row[i]; });
                return obj;
            });

            const batchRes = await kpiFetch('import_batch', { dataset_id: datasetId, filas, offset: start }, csrf);
            if (!batchRes.success) throw new Error(batchRes.message || `Error en lote ${b + 1}.`);

            const pct = Math.round(10 + ((b + 1) / totalBatch) * 82);
            kpiSetProgress(pct, `Importando... ${end.toLocaleString('es-PE')} / ${totalRows.toLocaleString('es-PE')} filas`);
        }

        // 3. Finalizar
        kpiSetProgress(96, 'Finalizando...');
        const finRes = await kpiFetch('finalize', { dataset_id: datasetId }, csrf);
        if (!finRes.success) throw new Error(finRes.message || 'Error al finalizar.');

        kpiSetProgress(100, '¡Listo!');

        setTimeout(() => {
            kpiSetImportUI(false);
            cerrarModal('kpiMapperModal');
            _kpiResetDropZone();
            const total = (finRes.data.total_filas || totalRows).toLocaleString('es-PE');
            toast(`Dataset "${nombre}" importado con ${total} filas.`, 'success');
            kpiCargarListado();
        }, 500);

    } catch (err) {
        kpiSetImportUI(false);
        document.getElementById('kpiImportBtn').innerHTML = '<i class="fas fa-rotate-right"></i> Reintentar';
        toast(err.message || 'Error durante la importación.', 'error');
    }
}

async function kpiFetch(action, body, csrf) {
    const res = await fetch(KPI_DATASETS_API + '?action=' + action, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body:    JSON.stringify(body),
    });
    if (!res.ok) {
        let msg = `Error ${res.status}`;
        try { const j = await res.json(); msg = j.message || msg; } catch (_) {}
        throw new Error(msg);
    }
    return res.json();
}

function kpiSetProgress(pct, label) {
    const bar    = document.getElementById('kpiProgressBar');
    const lbl    = document.getElementById('kpiProgressLabel');
    const status = document.getElementById('kpiProgressStatus');
    if (bar)    bar.style.width    = pct + '%';
    if (lbl)    lbl.textContent    = pct + '%';
    if (status) status.textContent = label || (pct + '%');
}

// ── Dataset List con paginación ───────────────────────────────

async function kpiCargarListado() {
    const tbody = document.getElementById('kpiDatasetsBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--gris-400)">
        <div class="spinner"></div>
    </td></tr>`;
    const pag = document.getElementById('kpiPaginacion');
    if (pag) pag.style.display = 'none';

    const csrf = document.querySelector('meta[name="csrf-token"]').content;
    try {
        const res  = await fetch(KPI_DATASETS_API + '?action=list', {
            headers: { 'X-CSRF-Token': csrf },
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        _kpiAllDatasets = data.data || [];

        // Preservar búsqueda activa
        const q = document.getElementById('kpiBuscar')?.value?.trim() || '';
        kpiFiltrarDatasets(q, /*silent=*/true);

    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--rojo)">
            <i class="fas fa-circle-exclamation"></i> ${kpiEsc(err.message)}
        </td></tr>`;
    }
}

function kpiFiltrarDatasets(q, silent = false) {
    const needle = (q || '').toLowerCase().trim();
    _kpiFiltrados = needle
        ? _kpiAllDatasets.filter(ds =>
            (ds.nombre           || '').toLowerCase().includes(needle) ||
            (ds.tipo_codigo      || '').toLowerCase().includes(needle) ||
            (ds.creado_por_nombre|| '').toLowerCase().includes(needle)
          )
        : [..._kpiAllDatasets];

    _kpiPagina = 1;
    kpiRenderPagina();
}

function kpiSetPagina(n) {
    _kpiPagina = n;
    kpiRenderPagina();
}

function kpiRenderPagina() {
    const tbody  = document.getElementById('kpiDatasetsBody');
    const countEl = document.getElementById('kpiDatasetsCount');
    const pagEl  = document.getElementById('kpiPaginacion');
    const infoEl = document.getElementById('kpiPagInfo');
    const btnsEl = document.getElementById('kpiPagBtns');
    if (!tbody) return;

    const total  = _kpiFiltrados.length;
    const all    = _kpiAllDatasets.length;
    const rawPSz = parseInt(document.getElementById('kpiPageSize')?.value || '10', 10);
    const pSz    = rawPSz === 0 ? total : rawPSz;  // 0 = mostrar todos
    const pages  = pSz > 0 ? Math.max(1, Math.ceil(total / pSz)) : 1;
    if (_kpiPagina > pages) _kpiPagina = pages;

    // Count badge
    if (countEl) {
        const filtStr = total < all ? ` (${total} filtrado${total !== 1 ? 's' : ''})` : '';
        countEl.textContent = `${all} dataset${all !== 1 ? 's' : ''}${filtStr}`;
    }

    if (!total) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:48px;color:var(--gris-400)">
            <i class="fas fa-database" style="font-size:32px;display:block;margin-bottom:12px;opacity:.25"></i>
            ${_kpiAllDatasets.length ? 'Sin resultados para la búsqueda.' : 'No hay datasets aún.'}<br>
            <span style="font-size:12px">Selecciona un tipo, fecha y arrastra un archivo Excel para comenzar.</span>
        </td></tr>`;
        if (pagEl) pagEl.style.display = 'none';
        return;
    }

    const start = ((_kpiPagina - 1) * pSz);
    const slice = rawPSz === 0 ? _kpiFiltrados : _kpiFiltrados.slice(start, start + pSz);
    tbody.innerHTML = slice.map(ds => kpiRenderDatasetRow(ds)).join('');

    // Paginación
    if (pagEl) pagEl.style.display = pages > 1 || rawPSz !== 0 ? 'flex' : 'none';
    if (infoEl) {
        const from = rawPSz === 0 ? 1 : start + 1;
        const to   = rawPSz === 0 ? total : Math.min(start + pSz, total);
        infoEl.textContent = `Mostrando ${from}–${to} de ${total}`;
    }
    if (btnsEl) btnsEl.innerHTML = _kpiPagBtns(_kpiPagina, pages);
}

function _kpiPagBtns(current, total) {
    const btn = (n, label, active, disabled) => {
        const st = active
            ? 'background:var(--amarillo);color:#000;border-color:var(--amarillo);font-weight:700'
            : disabled
                ? 'opacity:.35;cursor:default;background:transparent;color:var(--gris-400);border-color:var(--gris-600)'
                : 'background:transparent;color:var(--gris-300);border-color:var(--gris-600);cursor:pointer';
        const click = disabled ? '' : `onclick="kpiSetPagina(${n})"`;
        return `<button ${click} style="padding:4px 10px;font-size:12px;border:1px solid;border-radius:5px;${st}">${label}</button>`;
    };

    let html = btn(current - 1, '‹', false, current === 1);

    // Ventana de páginas: siempre muestra al máximo 7 botones
    const delta = 2;
    let pages = new Set([1, total]);
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) pages.add(i);
    const sorted = [...pages].sort((a, b) => a - b);
    let prev = 0;
    sorted.forEach(p => {
        if (prev && p - prev > 1) html += `<span style="padding:4px 4px;color:var(--gris-600);font-size:12px">…</span>`;
        html += btn(p, p, p === current, false);
        prev = p;
    });

    html += btn(current + 1, '›', false, current === total);
    return html;
}

function kpiRenderDatasetRow(ds) {
    const cols    = ds.columnas || [];
    const dims    = cols.filter(c => c.tipo === 'dimension').length;
    const metrics = cols.filter(c => c.tipo === 'metrica').length;
    const dates   = cols.filter(c => c.tipo === 'fecha').length;
    const fecha   = new Date(ds.creado_en).toLocaleString('es-PE', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

    const tipoCodigo = ds.tipo_codigo || '';
    const fechaPlan  = ds.fecha_planificacion || '';

    const tipoBadge = tipoCodigo
        ? `<span style="font-family:monospace;font-size:11px;font-weight:800;background:rgba(245,200,0,.12);color:var(--amarillo);border:1px solid rgba(245,200,0,.3);padding:2px 7px;border-radius:4px;letter-spacing:.05em">${kpiEsc(tipoCodigo)}</span>`
        : '<span style="color:var(--gris-600)">—</span>';

    const fechaPlanStr = fechaPlan
        ? new Date(fechaPlan + 'T00:00:00').toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' })
        : '<span style="color:var(--gris-600)">—</span>';

    const bdDim = dims    ? `<span style="font-size:10px;background:rgba(61,153,245,.15);color:var(--azul);border:1px solid rgba(61,153,245,.3);padding:2px 6px;border-radius:3px;font-weight:700">${dims}D</span>` : '';
    const bdMet = metrics ? `<span style="font-size:10px;background:rgba(46,184,92,.15);color:var(--verde);border:1px solid rgba(46,184,92,.3);padding:2px 6px;border-radius:3px;font-weight:700">${metrics}M</span>` : '';
    const bdFec = dates   ? `<span style="font-size:10px;background:rgba(249,177,21,.15);color:var(--naranja);border:1px solid rgba(249,177,21,.3);padding:2px 6px;border-radius:3px;font-weight:700">${dates}F</span>` : '';
    const bdTot = `<span style="font-size:10px;color:var(--gris-500)">${cols.length} col${cols.length !== 1 ? 's' : ''}</span>`;

    const usuario = ds.creado_por_nombre
        ? `<span style="font-size:11px;color:var(--gris-400)">${kpiEsc(ds.creado_por_nombre)}</span>`
        : '<span style="color:var(--gris-600)">—</span>';

    return `<tr>
        <td style="font-weight:600;color:var(--gris-100);max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${kpiEsc(ds.nombre)}">${kpiEsc(ds.nombre)}</td>
        <td>${tipoBadge}</td>
        <td style="font-size:12px;color:var(--gris-300);white-space:nowrap">${fechaPlanStr}</td>
        <td><div style="display:flex;flex-wrap:wrap;gap:4px;align-items:center">${bdDim}${bdMet}${bdFec}${bdTot}</div></td>
        <td style="text-align:right;font-variant-numeric:tabular-nums;color:var(--gris-200);white-space:nowrap">
            ${Number(ds.total_filas).toLocaleString('es-PE')}
        </td>
        <td style="font-size:12px;color:var(--gris-400);white-space:nowrap">${kpiEsc(fecha)}</td>
        <td>${usuario}</td>
        <td>
            <button class="btn btn-danger btn-sm"
                    onclick="kpiEliminar(${ds.id}, '${kpiEsc(ds.nombre).replace(/'/g,'&#39;')}')"
                    title="Eliminar dataset"
                    style="padding:4px 10px;font-size:12px">
                <i class="fas fa-trash-alt"></i>
            </button>
        </td>
    </tr>`;
}

// ── Delete Dataset ────────────────────────────────────────────

async function kpiEliminar(id, nombre) {
    if (!confirm(`¿Eliminar el dataset "${nombre}"?\n\nSe borrarán todos sus datos. Esta acción no se puede deshacer.`)) return;
    const csrf = document.querySelector('meta[name="csrf-token"]').content;
    try {
        const res  = await fetch(KPI_DATASETS_API + '?action=delete', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
            body:    JSON.stringify({ id }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        toast(`Dataset "${nombre}" eliminado.`, 'success');
        kpiCargarListado();
    } catch (err) {
        toast(err.message || 'Error al eliminar.', 'error');
    }
}

// ── File Type Manager ─────────────────────────────────────────

function kpiAbrirModalTipo(tipoData = null) {
    document.getElementById('kpiTipoEditId').value    = tipoData?.id    || '';
    document.getElementById('kpiTipoCodigo').value    = tipoData?.codigo || '';
    document.getElementById('kpiTipoDescripcion').value = tipoData?.descripcion || '';
    document.getElementById('kpiTipoFormato').value   = tipoData?.formato || 'xlsx';
    document.getElementById('kpiTipoMaxMb').value     = tipoData?.max_mb || 5;
    document.getElementById('kpiTipoTabla').value     = tipoData?.tabla_destino || '';
    document.getElementById('kpiTipoModalTitle').textContent =
        tipoData ? 'Editar Tipo de Archivo' : 'Agregar Tipo de Archivo';
    abrirModal('kpiTipoModal');
    document.getElementById('kpiTipoCodigo').focus();
}

function kpiEditarTipo(id) {
    const tipo = _kpiTipos.find(t => t.id === id);
    if (tipo) kpiAbrirModalTipo(tipo);
}

async function kpiGuardarTipo() {
    const id          = parseInt(document.getElementById('kpiTipoEditId').value || '0');
    const codigo      = document.getElementById('kpiTipoCodigo').value.trim().toUpperCase();
    const descripcion = document.getElementById('kpiTipoDescripcion').value.trim();
    const formato     = document.getElementById('kpiTipoFormato').value;
    const maxMb       = parseInt(document.getElementById('kpiTipoMaxMb').value || '5');
    const tabla       = document.getElementById('kpiTipoTabla').value.trim();

    if (!codigo)      { toast('El código es requerido.', 'error'); return; }
    if (!descripcion) { toast('La descripción es requerida.', 'error'); return; }

    const csrf = document.querySelector('meta[name="csrf-token"]').content;
    const payload = { codigo, descripcion, formato, max_mb: maxMb, tabla_destino: tabla || null };
    if (id > 0) payload.id = id;

    try {
        const res  = await fetch(KPI_FILE_TYPES_API + '?action=save', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
            body:    JSON.stringify(payload),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        toast(id > 0 ? 'Tipo actualizado.' : `Tipo "${codigo}" creado.`, 'success');
        cerrarModal('kpiTipoModal');
        kpiCargarTipos();
    } catch (err) {
        const msg = err.message || 'Error al guardar tipo.';
        const esMigration = msg.includes('migration_pending') || msg.includes('kpi_file_types');
        toast(esMigration
            ? 'Primero ejecuta deploy/kpi_file_types.sql en phpMyAdmin.'
            : msg, 'error');
    }
}

async function kpiEliminarTipo(id, codigo) {
    if (!confirm(`¿Eliminar el tipo "${codigo}"?`)) return;
    const csrf = document.querySelector('meta[name="csrf-token"]').content;
    try {
        const res  = await fetch(KPI_FILE_TYPES_API + '?action=delete', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
            body:    JSON.stringify({ id }),
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.message);
        toast(`Tipo "${codigo}" eliminado.`, 'success');
        kpiCargarTipos();
    } catch (err) {
        toast(err.message || 'Error al eliminar tipo.', 'error');
    }
}

// ── Utils ─────────────────────────────────────────────────────

function kpiEsc(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
