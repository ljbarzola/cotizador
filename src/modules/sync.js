import supabase from '../lib/supabase.js';

const GOOGLE_SHEET_ID = '1UDY7vse-NqjQcBYSgsSdS3bT7s-MiZl_w_uaTcCOyUo';
const SHEETS = [
  { name: 'PRECIOS EQUIPOS BD',   table: 'equipos',    type: 'equipo' },
  { name: 'PRECIOS MATERIALES BD', table: 'materiales', type: 'material' },
  { name: 'PRECIOS SERVICIOS BD',  table: 'servicios',  type: 'servicio' },
];

let syncLog = [];
function log(msg, level = 'info') {
  syncLog.push({ ts: new Date().toLocaleTimeString(), level, msg });
}
export function getSyncLog() { return syncLog; }
export function clearSyncLog() { syncLog = []; }

function csvUrl(sheetName) {
  return `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

// CSV parser unificado: maneja multi-línea, comas dentro de comillas, y "" escapado
function parseCsvRows(text) {
  const rows = [];
  let fields = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuote && i + 1 < text.length && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
      continue;
    }
    if (ch === ',' && !inQuote) {
      fields.push(current.trim());
      current = '';
      continue;
    }
    if (ch === '\n' && !inQuote) {
      fields.push(current.trim());
      rows.push(fields);
      fields = [];
      current = '';
      continue;
    }
    if (ch === '\r') continue;
    current += ch;
  }
  if (current || fields.length > 0) {
    fields.push(current.trim());
    rows.push(fields);
  }
  return rows;
}

function num(v) {
  if (!v || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^\d.\-]/g, ''));
  if (isNaN(n)) return 0;
  return Math.round(n * 1000) / 1000;
}

function txt(v) {
  if (!v || v === '') return '';
  return String(v).trim();
}

function flag(v) {
  const s = String(v || '').trim();
  return s === '1' || s.toLowerCase() === 'true' || s.toLowerCase() === 'sí' || s.toLowerCase() === 'si';
}

// --- HEADER MAPS CORREGIDOS ---
// IMPORTANTE: Los keys NO deben tener tildes porque la normalización las elimina.
// CSV headers: toLowerCase → NFD → remove accents → trim

// EQUIPOS CSV: Id,Categoría,Subcategoría,Modelo,Producto / Servicio,Unds,Costo Unitario,Gan. Prov.,Gan. Inst.,ULTIMA ACT,PROVEEDOR,Observaciones
const EQUIPOS_HEADER_MAP = {
  'id': 'source_id',
  'categoria': 'categoria',
  'subcategoria': 'subcategoria',
  'modelo': 'modelo',
  'producto / servicio': 'producto',
  'producto': 'producto',
  'unds': 'unidades',
  'costo unitario': 'costo_unitario',
  'gan. prov.': 'ganancia_flag',
  'gan. inst.': 'instalacion_flag',
  'ultima act': 'ultima_act',
  'proveedor': 'proveedor',
  'observaciones': 'observaciones',
};

// MATERIALES CSV: Id,Categoría,Subcategoría,Producto,Unds,Costo Unitario,Gan. Prov.,Gan. Inst.,Observaciones
const MATERIALES_HEADER_MAP = {
  'id': 'source_id',
  'categoria': 'categoria',
  'subcategoria': 'subcategoria',
  'producto': 'producto',
  'unds': 'unidades',
  'costo unitario': 'costo_unitario',
  'gan. prov.': 'ganancia_flag',
  'gan. inst.': 'instalacion_flag',
  'observaciones': 'observaciones',
};

// SERVICIOS CSV: Id,Categoría,Subcategoría,Servicio,Descripción,Costo Mensual,Costo Anual,Observaciones
const SERVICIOS_HEADER_MAP = {
  'id': 'source_id',
  'categoria': 'categoria',
  'subcategoria': 'subcategoria',
  'servicio': 'servicio',
  'descripcion': 'descripcion',
  'costo mensual': 'costo_mensual',
  'costo anual': 'costo_anual',
  'observaciones': 'observaciones',
};

function buildEquipo(mapped) {
  return {
    source_id: txt(mapped.source_id) || null,
    categoria: txt(mapped.categoria),
    subcategoria: txt(mapped.subcategoria),
    modelo: txt(mapped.modelo),
    producto: txt(mapped.producto),
    unidades: txt(mapped.unidades),
    costo_unitario: num(mapped.costo_unitario),
    ganancia_flag: flag(mapped.ganancia_flag),
    instalacion_flag: flag(mapped.instalacion_flag),
    ultima_act: txt(mapped.ultima_act),
    proveedor: txt(mapped.proveedor),
    observaciones: txt(mapped.observaciones),
  };
}

function buildMaterial(mapped) {
  return {
    source_id: txt(mapped.source_id) || null,
    categoria: txt(mapped.categoria),
    subcategoria: txt(mapped.subcategoria),
    producto: txt(mapped.producto),
    unidades: txt(mapped.unidades),
    costo_unitario: num(mapped.costo_unitario),
    ganancia_flag: flag(mapped.ganancia_flag),
    instalacion_flag: flag(mapped.instalacion_flag),
    observaciones: txt(mapped.observaciones),
  };
}

function buildServicio(mapped) {
  return {
    source_id: txt(mapped.source_id) || null,
    categoria: txt(mapped.categoria) || 'SERVICIOS',
    subcategoria: txt(mapped.subcategoria),
    servicio: txt(mapped.servicio),
    descripcion: txt(mapped.descripcion),
    costo_mensual: num(mapped.costo_mensual),
    costo_anual: num(mapped.costo_anual),
    costo_unitario: num(mapped.costo_mensual) || num(mapped.costo_anual) || 0,
    observaciones: txt(mapped.observaciones),
  };
}

// Detecta columnas existentes de una tabla
async function getTableColumns(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);
  if (error) {
    console.warn(`[SYNC] Error detectando esquema de ${tableName}:`, error.message);
    return null;
  }
  if (data && data.length > 0) return Object.keys(data[0]);

  // Tabla vacía: intentar insertar un dummy para descubrir columnas
  // Usar campos genéricos que existen en las 3 tablas
  const dummy = { source_id: '___schema_probe___', categoria: '', subcategoria: '', observaciones: '' };
  const { error: insErr } = await supabase.from(tableName).insert(dummy);
  if (!insErr) {
    const { data: rowData } = await supabase.from(tableName).select('*').eq('source_id', '___schema_probe___').maybeSingle();
    await supabase.from(tableName).delete().eq('source_id', '___schema_probe___');
    if (rowData) {
      return Object.keys(rowData);
    }
  } else {
    await supabase.from(tableName).delete().eq('source_id', '___schema_probe___');
  }
  return null;
}

// Columnas que solo existen en el schema v3.2+ (pueden no existir en tablas viejas)
const V3_2_COLUMNS = ['ganancia_flag', 'instalacion_flag', 'costo_unitario'];

// Filtra un objeto row para que solo incluya columnas que existen en la tabla
function filterRowToColumns(row, validColumns) {
  if (!validColumns) {
    // Sin esquema detectado: quitar columnas que podrían no existir
    const filtered = {};
    for (const key of Object.keys(row)) {
      if (!V3_2_COLUMNS.includes(key)) filtered[key] = row[key];
    }
    return filtered;
  }
  const filtered = {};
  for (const key of Object.keys(row)) {
    if (validColumns.includes(key)) filtered[key] = row[key];
  }
  return filtered;
}

// Nombres amigables para las columnas
const COLUMN_LABELS = {
  categoria: 'Categoría', subcategoria: 'Subcategoría', modelo: 'Modelo',
  producto: 'Producto', unidades: 'Unidades', costo_unitario: 'Costo',
  proveedor: 'Proveedor', observaciones: 'Observaciones', ultima_act: 'Última act.',
  servicio: 'Servicio', descripcion: 'Descripción', costo_mensual: 'Costo mensual',
  costo_anual: 'Costo anual', ganancia_flag: 'Gan. Prov.', instalacion_flag: 'Gan. Inst.',
  source_id: 'Código',
};

function compareRows(oldRow, newRow, fields) {
  const changes = [];
  for (const f of fields) {
    if (f === 'id' || f === 'created_at') continue;
    const oldVal = oldRow[f];
    const newVal = newRow[f];
    const label = COLUMN_LABELS[f] || f;
    if (oldVal !== newVal && !(oldVal == null && newVal == null)) {
      const ov = oldVal === null || oldVal === undefined ? '(vacío)' : String(oldVal);
      const nv = newVal === null || newVal === undefined ? '(vacío)' : String(newVal);
      changes.push(`${label}: ${ov} → ${nv}`);
    }
  }
  return changes;
}

// ---- Sync principal ----

export async function syncFromGoogleSheets(onProgress, signal) {
  clearSyncLog();
  const results = { inserted: 0, updated: 0, failed: 0, skipped: 0, unchanged: 0, errors: [], sheets: {} };
  let aborted = false;

  // Detectar columnas existentes por tabla (1 query por tabla)
  const tableColumns = {};
  for (const sheet of SHEETS) {
    const cols = await getTableColumns(sheet.table);
    if (cols) tableColumns[sheet.table] = cols;
  }

  for (const sheet of SHEETS) {
    if (signal && signal.aborted) { aborted = true; break; }

    const sheetLog = { downloaded: 0, parsed: 0, inserted: 0, updated: 0, failed: 0, unchanged: 0 };
    results.sheets[sheet.name] = sheetLog;

    try {
      if (signal && signal.aborted) { aborted = true; break; }
      if (onProgress) onProgress(`Descargando ${sheet.name}...`);

      const resp = await fetch(csvUrl(sheet.name));
      if (signal && signal.aborted) { aborted = true; break; }
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      let text = await resp.text();
      if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);

      const csvRows = parseCsvRows(text);
      if (csvRows.length < 2) { log(`${sheet.name}: vacía`, 'error'); continue; }
      sheetLog.downloaded = csvRows.length - 1;

      const headerFields = csvRows[0];
      const headerMapConfig = sheet.table === 'equipos' ? EQUIPOS_HEADER_MAP
        : sheet.table === 'materiales' ? MATERIALES_HEADER_MAP
        : SERVICIOS_HEADER_MAP;

      const posToDbField = [];
      for (let i = 0; i < headerFields.length; i++) {
        const normalized = headerFields[i].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
        posToDbField.push(headerMapConfig[normalized] || null);
      }

      const builder = sheet.table === 'equipos' ? buildEquipo
        : sheet.table === 'materiales' ? buildMaterial
        : buildServicio;

      const csvItems = [];
      for (let i = 1; i < csvRows.length; i++) {
        if (signal && signal.aborted) { aborted = true; break; }
        const fields = csvRows[i];
        if (fields.length < 2 || !fields[0]) continue;

        const mapped = {};
        for (let j = 0; j < fields.length; j++) {
          if (posToDbField[j]) mapped[posToDbField[j]] = fields[j];
        }
        if (!mapped.source_id) continue;

        try {
          csvItems.push(builder(mapped));
        } catch (e) {
          log(`${mapped.source_id}: ${e.message}`, 'error');
          sheetLog.failed++;
        }
      }

      if (aborted) break;
      sheetLog.parsed = csvItems.length;

      // 1 query: cargar todos los source_id existentes
      if (onProgress) onProgress(`Comparando ${sheet.name}...`);
      const { data: existingRows, error: fetchErr } = await supabase
        .from(sheet.table)
        .select('id, source_id');
      if (fetchErr) throw new Error(`Lectura ${sheet.table}: ${fetchErr.message}`);

      const existingMap = {};
      for (const r of (existingRows || [])) existingMap[r.source_id] = r;

      const toInsert = [];
      const toUpdate = [];

      for (const csvRow of csvItems) {
        const existing = existingMap[csvRow.source_id];
        if (existing) {
          const { data: fullExisting } = await supabase
            .from(sheet.table).select('*').eq('id', existing.id).maybeSingle();
          if (fullExisting) {
            const changes = compareRows(fullExisting, csvRow, Object.keys(csvRow));
            if (changes.length > 0) {
              toUpdate.push({ id: existing.id, source_id: csvRow.source_id, changes, newRow: csvRow });
            } else {
              sheetLog.unchanged++;
            }
          }
        } else {
          toInsert.push(csvRow);
        }
      }

      if (toInsert.length > 0) {
        if (onProgress) onProgress(`Insertando ${toInsert.length} nuevos en ${sheet.name}...`);
        const validInserts = toInsert.map(r => filterRowToColumns(r, tableColumns[sheet.table]));
        const { error } = await supabase.from(sheet.table).insert(validInserts);
        if (error) {
          log(`${sheet.name}: error insertando ${toInsert.length} filas: ${error.message}`, 'error');
          sheetLog.failed += toInsert.length;
        } else {
          sheetLog.inserted = toInsert.length;
          for (const r of toInsert) log(`  + ${r.source_id} nuevo`, 'info');
        }
      }

      for (const { id, source_id, changes, newRow } of toUpdate) {
        if (signal && signal.aborted) { aborted = true; break; }
        const validRow = filterRowToColumns(newRow, tableColumns[sheet.table]);
        const { error } = await supabase.from(sheet.table).update(validRow).eq('id', id);
        if (error) {
          log(`  ${source_id} ERROR: ${error.message}`, 'error');
          sheetLog.failed++;
        } else {
          sheetLog.updated++;
          log(`  ${source_id} → ${changes.join(', ')}`, 'info');
        }
      }

      if (aborted) break;
      log(`${sheet.name}: +${sheetLog.inserted} ~${sheetLog.updated} =${sheetLog.unchanged} ✕${sheetLog.failed}`);

    } catch (e) {
      log(`${sheet.name}: ${e.message}`, 'error');
      results.errors.push(`${sheet.name}: ${e.message}`);
    }

    results.inserted += sheetLog.inserted;
    results.updated += sheetLog.updated;
    results.unchanged += sheetLog.unchanged;
    results.failed += sheetLog.failed;
  }

  if (aborted) {
    log('Detenido por el usuario', 'warn');
    results.aborted = true;
  } else {
    log(`RESUMEN: +${results.inserted} nuevos ~${results.updated} actualizados =${results.unchanged} sin cambio ✕${results.failed} errores`);
  }
  return results;
}

// ---- Lectura unificada ----
// Los precios se calculan en tiempo real en app.js, aquí solo leemos datos crudos

export async function loadAllProducts() {
  const catalog = [];
  const [eqRes, mtRes, svRes] = await Promise.all([
    supabase.from('equipos').select('*'),
    supabase.from('materiales').select('*'),
    supabase.from('servicios').select('*'),
  ]);

  if (eqRes.error) { console.error('Error leyendo equipos:', eqRes.error.message); toast('⚠️ Error leyendo equipos: ' + eqRes.error.message, 'warning'); }
  if (mtRes.error) { console.error('Error leyendo materiales:', mtRes.error.message); toast('⚠️ Error leyendo materiales: ' + mtRes.error.message, 'warning'); }
  if (svRes.error) { console.error('Error leyendo servicios:', svRes.error.message); toast('⚠️ Error leyendo servicios: ' + svRes.error.message, 'warning'); }

  if (eqRes.data && eqRes.data.length > 0) {
    for (const r of eqRes.data) {
      catalog.push({
        _table: 'equipos', _id: r.id, sourceId: r.source_id || '',
        category: r.categoria || '', subcategory: r.subcategoria || '',
        model: r.modelo || '', description: r.producto || '',
        unit: r.unidades || '', cost: r.costo_unitario || 0,
        hasGanancia: !!(r.ganancia_flag ?? r.ganancia ?? (r.pct_ganancia > 0)),
        hasInstalacion: !!(r.instalacion_flag ?? r.instalacion ?? (r.pct_instalacion > 0)),
        lastUpdate: r.ultima_act || null, supplier: r.proveedor || '',
        observations: r.observaciones || '', isService: false,
        monthlyCost: null, annualCost: null,
      });
    }
  }
  if (mtRes.data) {
    for (const r of mtRes.data) {
      catalog.push({
        _table: 'materiales', _id: r.id, sourceId: r.source_id || '',
        category: r.categoria || '', subcategory: r.subcategoria || '',
        model: '', description: r.producto || '', unit: r.unidades || '',
        cost: r.costo_unitario || 0,
        hasGanancia: !!(r.ganancia_flag ?? r.ganancia ?? (r.pct_ganancia > 0)),
        hasInstalacion: !!(r.instalacion_flag ?? r.instalacion ?? (r.pct_instalacion > 0)),
        lastUpdate: null, supplier: '',
        observations: r.observaciones || '', isService: false,
        monthlyCost: null, annualCost: null,
      });
    }
  }
  if (svRes.data) {
    for (const r of svRes.data) {
      const mensual = num(r.costo_mensual);
      const anual = num(r.costo_anual);
      const unitario = num(r.costo_unitario);
      const effectiveCost = mensual > 0 ? mensual
        : (anual > 0 ? Math.round((anual / 12) * 100) / 100
        : (unitario > 0 ? unitario : 0));
      catalog.push({
        _table: 'servicios', _id: r.id, sourceId: r.source_id || '',
        category: r.categoria || 'SERVICIOS', subcategory: r.subcategoria || '',
        model: '', description: r.servicio || '', unit: 'servicio',
        cost: effectiveCost,
        hasGanancia: false, hasInstalacion: false,
        lastUpdate: null, supplier: '',
        observations: r.descripcion || r.observaciones || '',
        isService: true, monthlyCost: mensual, annualCost: anual,
      });
      if (effectiveCost === 0 && (mensual > 0 || anual > 0 || unitario > 0)) {
        toast('⚠️ Servicio ' + r.source_id + ' con costo inválido', 'warning');
      }
    }
  }

  catalog.sort((a, b) => {
    const sa = a.sourceId || '';
    const sb = b.sourceId || '';
    const prefixA = sa.replace(/\d+.*$/, '');
    const prefixB = sb.replace(/\d+.*$/, '');
    if (prefixA !== prefixB) return prefixA.localeCompare(prefixB);
    const numA = parseInt(sa.replace(/^\D+/, '')) || 0;
    const numB = parseInt(sb.replace(/^\D+/, '')) || 0;
    return numA - numB;
  });

  return catalog;
}

export function getCategoryHierarchy(catalog) {
  const map = {};
  for (const p of catalog) {
    const cat = p.category || '(sin categoría)';
    if (!map[cat]) map[cat] = { subcategories: new Set(), count: 0 };
    if (p.subcategory) map[cat].subcategories.add(p.subcategory);
    map[cat].count++;
  }
  const result = {};
  for (const [cat, info] of Object.entries(map)) {
    result[cat] = { subcategories: [...info.subcategories].sort(), count: info.count };
  }
  return result;
}
