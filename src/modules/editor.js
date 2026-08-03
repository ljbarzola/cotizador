// === CATALOG EDITOR MODULE ===
// Editor CRUD, field updates, batch save.

import { currentSession, setInstalacionesCatalog, CATALOG } from '../state.js';
import supabase from '../lib/supabase.js';
import { $, fmt, escAttr, toast, showConfirm } from '../utils.js';
import { loadAllInstalaciones } from './sync.js';

let editorProducts = [];
let editorChanges = {};
let editorDeleted = new Set();

let installProducts = [];
let installChanges = {};
let installDeleted = new Set();

const EDITOR_COLS = {
  equipos: [
    { key: 'source_id', label: 'Id', w: '90px', type: 'text' },
    { key: 'categoria', label: 'Categoría', w: '110px', type: 'text' },
    { key: 'subcategoria', label: 'Subcategoría', w: '100px', type: 'text' },
    { key: 'producto', label: 'Producto / Servicio', w: 'auto', type: 'text' },
    { key: 'modelo', label: 'Modelo', w: '80px', type: 'text' },
    { key: 'unidades', label: 'Unds', w: '45px', type: 'text', placeholder: 'm, u...' },
    { key: 'cantidad_default', label: 'Cant.', w: '50px', type: 'number', step: '1' },
    { key: 'costo_unitario', label: 'Costo Unit.', w: '70px', type: 'number' },
    { key: 'costo_total', label: 'Costo', w: '70px', type: 'readonly' },
    { key: 'ganancia_flag', label: 'Gan. Prov.', w: '50px', type: 'check' },
    { key: 'instalacion_flag', label: 'Gan. Inst.', w: '50px', type: 'check' },
    { key: 'ultima_act', label: 'ULTIMA ACT', w: '80px', type: 'text' },
    { key: 'proveedor', label: 'PROVEEDOR', w: '80px', type: 'text' },
    { key: 'observaciones', label: 'Observaciones', w: 'auto', type: 'text' },
  ],
  materiales: [
    { key: 'source_id', label: 'Id', w: '90px', type: 'text' },
    { key: 'categoria', label: 'Categoría', w: '110px', type: 'text' },
    { key: 'subcategoria', label: 'Subcategoría', w: '100px', type: 'text' },
    { key: 'producto', label: 'Producto', w: 'auto', type: 'text' },
    { key: 'unidades', label: 'Unds', w: '45px', type: 'text', placeholder: 'm, u...' },
    { key: 'cantidad_default', label: 'Cant.', w: '50px', type: 'number', step: '1' },
    { key: 'costo_unitario', label: 'Costo Unit.', w: '70px', type: 'number' },
    { key: 'costo_total', label: 'Costo', w: '70px', type: 'readonly' },
    { key: 'ganancia_flag', label: 'Gan. Prov.', w: '50px', type: 'check' },
    { key: 'instalacion_flag', label: 'Gan. Inst.', w: '50px', type: 'check' },
    { key: 'observaciones', label: 'Observaciones', w: 'auto', type: 'text' },
  ],
  servicios: [
    { key: 'source_id', label: 'Id', w: '90px', type: 'text' },
    { key: 'categoria', label: 'Categoría', w: '110px', type: 'text' },
    { key: 'subcategoria', label: 'Subcategoría', w: '100px', type: 'text' },
    { key: 'servicio', label: 'Servicio', w: 'auto', type: 'text' },
    { key: 'descripcion', label: 'Descripción', w: 'auto', type: 'text' },
    { key: 'costo_mensual', label: 'Costo Mensual', w: '80px', type: 'number' },
    { key: 'costo_anual', label: 'Costo Anual', w: '80px', type: 'number' },
    { key: 'observaciones', label: 'Observaciones', w: 'auto', type: 'text' },
  ],
  instalaciones: [
    { key: 'source_id', label: 'Id', w: '90px', type: 'text' },
    { key: 'categoria', label: 'Categoría', w: '110px', type: 'select' },
    { key: 'subcategoria', label: 'Subcategoría', w: '100px', type: 'select' },
    { key: 'servicio', label: 'Servicio', w: 'auto', type: 'text' },
    { key: 'costo_unitario', label: 'Costo', w: '80px', type: 'number' },
    { key: 'observaciones', label: 'Observaciones', w: 'auto', type: 'text' },
  ],
};

function getEditorCols(table) {
  return EDITOR_COLS[table] || EDITOR_COLS.equipos;
}

/**
 * Open the catalog editor modal and load products.
 * @returns {void}
 */
export function openCatalogEditor() {
  if (!currentSession) {
    toast('Inicia sesión primero', 'danger');
    return;
  }
  $('catalogEditorModal').classList.add('open');
  loadEditorProducts();
}

/**
 * Close the catalog editor modal, discarding unsaved changes after confirmation.
 * @returns {Promise<void>}
 */
export async function closeCatalogEditor() {
  if (Object.keys(editorChanges).size > 0 || editorDeleted.size > 0) {
    if (!(await showConfirm('Hay cambios sin guardar. ¿Cerrar?', 'Cambios sin guardar', 'Cerrar'))) return;
  }
  $('catalogEditorModal').classList.remove('open');
  editorProducts = [];
  editorChanges = {};
  editorDeleted = new Set();
}

/**
 * Load all products from equipos, materiales, and servicios tables into the editor.
 * @returns {Promise<void>}
 */
export async function loadEditorProducts() {
  $('editorBody').innerHTML = '<tr><td colspan="15" style="text-align:center;padding:20px;">Cargando...</td></tr>';
  try {
    const [eqRes, mtRes, svRes, instRes] = await Promise.all([
      supabase.from('equipos').select('*').order('categoria'),
      supabase.from('materiales').select('*').order('categoria'),
      supabase.from('servicios').select('*').order('categoria'),
      supabase.from('instalaciones').select('*').order('servicio'),
    ]);
    editorProducts = [];
    (eqRes.data || []).forEach(r =>
      editorProducts.push({
        _table: 'equipos',
        id: r.id,
        source_id: r.source_id,
        categoria: r.categoria,
        subcategoria: r.subcategoria,
        modelo: r.modelo,
        producto: r.producto,
        unidades: r.unidades,
        cantidad_default: r.cantidad_default ?? 1,
        costo_unitario: r.costo_unitario,
        costo_total: r.costo_total ?? 0,
        ganancia_flag: r.ganancia_flag,
        instalacion_flag: r.instalacion_flag,
        ultima_act: r.ultima_act,
        proveedor: r.proveedor,
        observaciones: r.observaciones,
      })
    );
    (mtRes.data || []).forEach(r =>
      editorProducts.push({
        _table: 'materiales',
        id: r.id,
        source_id: r.source_id,
        categoria: r.categoria,
        subcategoria: r.subcategoria,
        producto: r.producto,
        unidades: r.unidades,
        cantidad_default: r.cantidad_default ?? 1,
        costo_unitario: r.costo_unitario,
        costo_total: r.costo_total ?? 0,
        ganancia_flag: r.ganancia_flag,
        instalacion_flag: r.instalacion_flag,
        observaciones: r.observaciones,
      })
    );
    (svRes.data || []).forEach(r =>
      editorProducts.push({
        _table: 'servicios',
        id: r.id,
        source_id: r.source_id,
        categoria: r.categoria,
        subcategoria: r.subcategoria,
        servicio: r.servicio,
        descripcion: r.descripcion || '',
        costo_mensual: r.costo_mensual,
        costo_anual: r.costo_anual,
        observaciones: r.observaciones || '',
      })
    );
    (instRes.data || []).forEach(r =>
      editorProducts.push({
        _table: 'instalaciones',
        id: r.id,
        source_id: r.source_id,
        categoria: r.categoria || 'INSTALACIONES',
        subcategoria: r.subcategoria || '',
        servicio: r.servicio,
        costo_unitario: r.costo_unitario,
        observaciones: r.observaciones || '',
      })
    );
    editorChanges = {};
    editorDeleted = new Set();
    renderEditorTable();
  } catch (e) {
    $('editorBody').innerHTML =
      '<tr><td colspan="15" style="text-align:center;padding:20px;color:red;">Error: ' + e.message + '</td></tr>';
  }
}

/**
 * Render the editor table with current filters and changes applied.
 * @returns {void}
 */
export function renderEditorTable() {
  const q = $('editorSearch').value.toLowerCase().trim();
  const cat = $('editorCategory').value;

  if (!cat) {
    $('editorHead').innerHTML =
      '<tr><th colspan="15" style="text-align:center;padding:20px;color:var(--muted);">Selecciona una categoría para ver las columnas</th></tr>';
    $('editorBody').innerHTML =
      '<tr><td colspan="15" style="text-align:center;padding:20px;color:var(--muted);">Selecciona Equipos, Materiales o Servicios arriba</td></tr>';
    $('editorCount').textContent = '';
    return;
  }
  const tableMap = { equipos: 'equipos', materiales: 'materiales', servicios: 'servicios' };
  const cols = getEditorCols(cat);
  let filtered = editorProducts.filter(p => p._table === tableMap[cat]);
  if (q)
    filtered = filtered.filter(
      p =>
        (p.source_id || '').toLowerCase().includes(q) ||
        (p.producto || p.servicio || '').toLowerCase().includes(q) ||
        (p.subcategoria || '').toLowerCase().includes(q) ||
        (p.modelo || '').toLowerCase().includes(q)
    );
  $('editorCount').textContent = filtered.length + ' productos';
  let thead = '<tr>';
  cols.forEach(c => {
    thead += `<th style="width:${c.w};">${c.label}</th>`;
  });
  thead += '<th style="width:36px;"></th></tr>';
  $('editorHead').innerHTML = thead;
  const tbody = $('editorBody');
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${cols.length + 1}" style="text-align:center;padding:20px;">Sin resultados</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered
    .map(p => {
      const origIdx = editorProducts.indexOf(p);
      const idx = origIdx;
      const ch = editorChanges[idx] || {};
      const isDel = editorDeleted.has(idx);
      const rowClass = isDel ? 'row-deleted' : Object.keys(ch).length > 0 ? 'row-modified' : '';
      const g = f => (ch[f] !== undefined ? ch[f] : (p[f] ?? ''));
      let cells = '';
      cols.forEach(c => {
        if (c.type === 'readonly') {
          cells += `<td style="padding:4px 6px;color:var(--muted);font-size:12px;">${fmt(g(c.key))}</td>`;
        } else if (c.type === 'check') {
          cells += `<td style="text-align:center;"><input type="checkbox" ${g(c.key) ? 'checked' : ''} onchange="editorField(${idx},'${c.key}',this.checked)"></td>`;
        } else if (c.type === 'number') {
          cells += `<td><input type="number" step="${c.step || '0.01'}" value="${g(c.key) || (c.key === 'cantidad_default' ? 1 : 0)}" onchange="editorField(${idx},'${c.key}',parseFloat(this.value)||${c.key === 'cantidad_default' ? 1 : 0})"></td>`;
        } else {
          cells += `<td><input value="${escAttr(g(c.key))}" onchange="editorField(${idx},'${c.key}',this.value)"${c.placeholder ? ' placeholder="' + c.placeholder + '"' : ''}></td>`;
        }
      });
      cells += `<td style="text-align:center;"><button class="del-btn" onclick="editorToggleDelete(${idx})" title="${isDel ? 'Restaurar' : 'Eliminar'}">${isDel ? '↩' : '✕'}</button></td>`;
      return `<tr class="${rowClass}" data-idx="${idx}">${cells}</tr>`;
    })
    .join('');
}

/**
 * Record a field change in the editor change tracker.
 * @param {number} idx - Product index in editorProducts
 * @param {string} field - Field name that changed
 * @param {*} value - New value
 * @returns {void}
 */
export function editorField(idx, field, value) {
  if (!editorChanges[idx]) editorChanges[idx] = {};
  editorChanges[idx][field] = value;
  const row = document.querySelector(`tr[data-idx="${idx}"]`);
  if (row && !editorDeleted.has(idx)) row.classList.add('row-modified');
}

/**
 * Toggle a product's deleted state (with confirmation on delete).
 * @param {number} idx - Product index in editorProducts
 * @returns {Promise<void>}
 */
export async function editorToggleDelete(idx) {
  if (editorDeleted.has(idx)) {
    editorDeleted.delete(idx);
  } else {
    const p = editorProducts[idx];
    if (
      !(await showConfirm(
        '¿Eliminar "' + (p.producto || p.source_id || '').slice(0, 60) + '"?',
        'Eliminar producto',
        'Eliminar'
      ))
    )
      return;
    editorDeleted.add(idx);
  }
  renderEditorTable();
}

/**
 * Add a new blank product row to the editor for the selected category.
 * @returns {void}
 */
export function addNewProduct() {
  const cat = $('editorCategory').value;
  if (!cat) {
    toast('Selecciona una categoría primero', 'warning');
    return;
  }
  const tableMap = {
    equipos: 'equipos',
    materiales: 'materiales',
    servicios: 'servicios',
    instalaciones: 'instalaciones',
  };
  const newIdx = editorProducts.length;
  const base = {
    _table: tableMap[cat],
    id: null,
    source_id: '',
    categoria: cat === 'instalaciones' ? 'INSTALACIONES' : '',
    subcategoria: '',
    observaciones: '',
  };
  const defaults = {
    equipos: {
      modelo: '',
      producto: '',
      unidades: '',
      costo_unitario: 0,
      costo_total: 0,
      cantidad_default: 1,
      ganancia_flag: false,
      instalacion_flag: false,
      ultima_act: null,
      proveedor: '',
    },
    materiales: {
      producto: '',
      unidades: '',
      costo_unitario: 0,
      costo_total: 0,
      cantidad_default: 1,
      ganancia_flag: false,
      instalacion_flag: false,
    },
    servicios: {
      servicio: '',
      descripcion: '',
      costo_mensual: 0,
      costo_anual: 0,
    },
    instalaciones: {
      servicio: '',
      costo_unitario: 0,
    },
  };
  editorProducts.push({ ...base, ...defaults[cat] });
  editorChanges[newIdx] = {};
  renderEditorTable();
  $('editorTable').parentElement.scrollTop = $('editorTable').parentElement.scrollHeight;
}

/**
 * Save all editor changes (updates, inserts, deletes) to Supabase.
 * @returns {Promise<void>}
 */
export async function saveCatalogEdits() {
  if (!currentSession) {
    toast('Inicia sesión primero', 'danger');
    return;
  }
  const {
    data: { session },
    error: sessErr,
  } = await supabase.auth.getSession();
  if (sessErr || !session) {
    toast('Sesión expirada. Inicia sesión de nuevo.', 'danger');
    console.error('[EDITOR] Session invalid:', sessErr);
    return;
  }
  const changesCount = Object.keys(editorChanges).length;
  const deleteCount = editorDeleted.size;
  if (changesCount === 0 && deleteCount === 0) {
    toast('No hay cambios para guardar', 'info');
    return;
  }
  const btn = document.querySelector('#catalogEditorModal .btn-primary');
  btn.disabled = true;
  btn.textContent = 'Guardando...';
  try {
    for (const idx of editorDeleted) {
      const p = editorProducts[idx];
      if (p.id) {
        const { error } = await supabase.from(p._table).delete().eq('id', p.id);
        if (error) {
          console.error(`[EDITOR] Delete failed for ${p._table} id=${p.id}:`, error);
          throw error;
        }
      }
    }
    for (const [idxStr, changes] of Object.entries(editorChanges)) {
      const idx = parseInt(idxStr);
      const p = editorProducts[idx];
      if (editorDeleted.has(idx)) continue;
      if (p.id) {
        const { data, error } = await supabase.from(p._table).update(changes).eq('id', p.id).select();
        if (error) {
          console.error(`[EDITOR] Update failed for ${p._table} id=${p.id}:`, error, 'changes:', changes);
          throw error;
        }
        if (!data || data.length === 0) {
          console.warn(`[EDITOR] Update returned 0 rows for ${p._table} id=${p.id} — RLS or missing row?`, changes);
        }
      }
    }
    const inserts = [];
    for (const [idxStr, changes] of Object.entries(editorChanges)) {
      const idx = parseInt(idxStr);
      const p = editorProducts[idx];
      if (editorDeleted.has(idx) || p.id) continue;
      const row = { ...p, ...changes };
      delete row.id;
      delete row._table;
      delete row._idx;
      inserts.push({ table: p._table, data: row });
    }
    for (const ins of inserts) {
      const { error } = await supabase.from(ins.table).insert(ins.data);
      if (error) {
        console.error(`[EDITOR] Insert failed for ${ins.table}:`, error, ins.data);
        throw error;
      }
    }
    toast(`✓ Guardado: ${changesCount} editados, ${inserts.length} nuevos, ${deleteCount} eliminados`, 'success');
    await loadEditorProducts();
  } catch (e) {
    console.error('[EDITOR] Save error:', e);
    toast('Error al guardar: ' + e.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Guardar cambios';
  }
}

// === INSTALL EDITOR ===

/**
 * Open the install-only editor modal and load instalaciones.
 * @returns {void}
 */
export function openInstallEditor() {
  if (!currentSession) {
    toast('Inicia sesión primero', 'danger');
    return;
  }
  $('installEditorModal').classList.add('open');
  loadInstallEditorProducts();
}

/**
 * Close the install editor modal.
 * @returns {void}
 */
export function closeInstallEditor() {
  $('installEditorModal').classList.remove('open');
}

/**
 * Load instalaciones from Supabase into the install editor.
 * @returns {Promise<void>}
 */
async function loadInstallEditorProducts() {
  $('installEditorBody').innerHTML =
    '<tr><td colspan="7" style="text-align:center;padding:20px;">Cargando instalaciones...</td></tr>';
  try {
    const { data, error } = await supabase.from('instalaciones').select('*').order('source_id');
    if (error) throw error;
    installProducts = (data || []).map(r => ({
      _table: 'instalaciones',
      id: r.id,
      source_id: r.source_id,
      categoria: r.categoria || '',
      subcategoria: r.subcategoria || '',
      servicio: r.servicio,
      costo_unitario: r.costo_unitario,
      observaciones: r.observaciones || '',
    }));
    installProducts.sort((a, b) => (a.source_id || '').localeCompare(b.source_id || '', undefined, { numeric: true }));
    installChanges = {};
    installDeleted = new Set();
    renderInstallEditorTable();
  } catch (e) {
    $('installEditorBody').innerHTML =
      '<tr><td colspan="7" style="text-align:center;padding:20px;color:red;">Error: ' + e.message + '</td></tr>';
  }
}

/**
 * Render the install editor table with current filters and changes.
 * @returns {void}
 */
export function renderInstallEditorTable() {
  const q = $('installEditorSearch').value.toLowerCase().trim();
  let filtered = [...installProducts];
  if (q)
    filtered = filtered.filter(
      p =>
        (p.source_id || '').toLowerCase().includes(q) ||
        (p.servicio || '').toLowerCase().includes(q) ||
        (p.categoria || '').toLowerCase().includes(q) ||
        (p.subcategoria || '').toLowerCase().includes(q) ||
        (p.observaciones || '').toLowerCase().includes(q)
    );
  $('installEditorCount').textContent = filtered.length + ' instalaciones';
  const tbody = $('installEditorBody');
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">Sin resultados</td></tr>';
    return;
  }

  // Build unique options for select columns from CATALOG (product catalog)
  const allCats = [...new Set(CATALOG.map(p => p.category).filter(Boolean))].sort();
  const allSubs = [...new Set(CATALOG.map(p => p.subcategory).filter(Boolean))].sort();
  const selectOptions = {
    categoria: allCats,
    subcategoria: allSubs,
  };

  const cols = EDITOR_COLS.instalaciones;
  tbody.innerHTML = filtered
    .map(p => {
      const origIdx = installProducts.indexOf(p);
      const ch = installChanges[origIdx] || {};
      const isDel = installDeleted.has(origIdx);
      const rowClass = isDel ? 'row-deleted' : Object.keys(ch).length > 0 ? 'row-modified' : '';
      const g = f => (ch[f] !== undefined ? ch[f] : (p[f] ?? ''));
      let cells = '';
      cols.forEach(c => {
        if (c.type === 'select') {
          const opts = selectOptions[c.key] || [];
          const val = g(c.key);
          const optionsHtml = opts
            .map(o => `<option value="${escAttr(o)}"${o === val ? ' selected' : ''}>${escAttr(o)}</option>`)
            .join('');
          cells += `<td><select onchange="installEditorField(${origIdx},'${c.key}',this.value)"><option value="">—</option>${optionsHtml}</select></td>`;
        } else if (c.type === 'number') {
          cells += `<td><input type="number" step="${c.step || '0.01'}" value="${g(c.key) || 0}" onchange="installEditorField(${origIdx},'${c.key}',parseFloat(this.value)||0)"></td>`;
        } else {
          cells += `<td><input value="${escAttr(g(c.key))}" onchange="installEditorField(${origIdx},'${c.key}',this.value)"${c.placeholder ? ' placeholder="' + c.placeholder + '"' : ''}></td>`;
        }
      });
      cells += `<td style="text-align:center;"><button class="del-btn" onclick="installEditorToggleDelete(${origIdx})" title="${isDel ? 'Restaurar' : 'Eliminar'}">${isDel ? '↩' : '✕'}</button></td>`;
      return `<tr class="${rowClass}" data-idx="${origIdx}">${cells}</tr>`;
    })
    .join('');
}

/**
 * Record a field change in the install editor change tracker.
 * @param {number} idx - Index in installProducts
 * @param {string} field - Field name
 * @param {*} value - New value
 * @returns {void}
 */
export function installEditorField(idx, field, value) {
  if (!installChanges[idx]) installChanges[idx] = {};
  installChanges[idx][field] = value;
  const row = document.querySelector(`#installEditorTable tr[data-idx="${idx}"]`);
  if (row && !installDeleted.has(idx)) row.classList.add('row-modified');
}

/**
 * Toggle an installation's deleted state.
 * @param {number} idx - Index in installProducts
 * @returns {Promise<void>}
 */
export async function installEditorToggleDelete(idx) {
  if (installDeleted.has(idx)) {
    installDeleted.delete(idx);
  } else {
    const p = installProducts[idx];
    if (
      !(await showConfirm(
        '¿Eliminar "' + (p.servicio || p.source_id || '').slice(0, 60) + '"?',
        'Eliminar instalación',
        'Eliminar'
      ))
    )
      return;
    installDeleted.add(idx);
  }
  renderInstallEditorTable();
}

/**
 * Add a new blank installation row to the editor.
 * @returns {void}
 */
export function addNewInstall() {
  const idx = installProducts.length;
  installProducts.push({
    _table: 'instalaciones',
    id: null,
    source_id: 'INST-' + String(idx + 1).padStart(3, '0'),
    categoria: '',
    subcategoria: '',
    servicio: '',
    costo_unitario: 0,
    observaciones: '',
  });
  installProducts.sort((a, b) => (a.source_id || '').localeCompare(b.source_id || '', undefined, { numeric: true }));
  installChanges[idx] = {};
  renderInstallEditorTable();
}

/**
 * Save install editor changes to Supabase.
 * @returns {Promise<void>}
 */
export async function saveInstallEditor() {
  const btn = document.querySelector('#installEditorModal .btn-primary');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = 'Guardando...';
  try {
    let changesCount = 0;
    let deleteCount = 0;
    const inserts = [];

    for (const idx of installDeleted) {
      const p = installProducts[idx];
      if (p.id) {
        const { error } = await supabase.from('instalaciones').delete().eq('id', p.id);
        if (error) throw error;
      }
      deleteCount++;
    }

    for (const [idxStr, ch] of Object.entries(installChanges)) {
      const idx = parseInt(idxStr);
      const p = installProducts[idx];
      if (installDeleted.has(idx)) continue;
      if (p.id) {
        const { error } = await supabase.from('instalaciones').update(ch).eq('id', p.id);
        if (error) throw error;
        changesCount++;
      } else {
        inserts.push({ table: 'instalaciones', data: { ...ch, source_id: p.source_id } });
      }
    }

    for (const ins of inserts) {
      const { error } = await supabase.from(ins.table).insert(ins.data);
      if (error) throw error;
    }

    toast(`✓ Guardado: ${changesCount} editados, ${inserts.length} nuevos, ${deleteCount} eliminados`, 'success');
    await loadInstallEditorProducts();

    // Reload instalacionesCatalog in memory so the picker sees new data
    try {
      const instalaciones = await loadAllInstalaciones();
      setInstalacionesCatalog(instalaciones);
    } catch (e) {
      console.warn('Error reloading instalaciones after save:', e.message);
    }
  } catch (e) {
    console.error('[INSTALL EDITOR] Save error:', e);
    toast('Error al guardar: ' + e.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Guardar';
  }
}
