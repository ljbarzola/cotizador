// === CATALOG EDITOR MODULE ===
// Editor CRUD, field updates, batch save.

import { currentSession } from '../state.js';
import supabase from '../lib/supabase.js';
import { $, escAttr, toast, showConfirm } from '../utils.js';

let editorProducts = [];
let editorChanges = {};
let editorDeleted = new Set();

const EDITOR_COLS = {
  equipos: [
    { key: 'source_id', label: 'Código', w: '90px', type: 'text' },
    { key: 'categoria', label: 'Categoría', w: '110px', type: 'text' },
    { key: 'subcategoria', label: 'Subcategoría', w: '100px', type: 'text' },
    { key: 'producto', label: 'Descripción', w: 'auto', type: 'text' },
    { key: 'modelo', label: 'Modelo', w: '80px', type: 'text' },
    { key: 'unidades', label: 'Und', w: '45px', type: 'text', placeholder: 'm, u...' },
    { key: 'cantidad_default', label: 'Cant.', w: '50px', type: 'number', step: '1' },
    { key: 'costo_unitario', label: 'Costo Unit.', w: '70px', type: 'number' },
    { key: 'costo_total', label: 'Costo Total', w: '70px', type: 'number' },
    { key: 'ganancia_flag', label: 'Gan.', w: '36px', type: 'check' },
    { key: 'instalacion_flag', label: 'Inst.', w: '36px', type: 'check' },
    { key: 'ultima_act', label: 'Última act.', w: '80px', type: 'text' },
    { key: 'proveedor', label: 'Proveedor', w: '80px', type: 'text' },
    { key: 'observaciones', label: 'Observaciones', w: 'auto', type: 'text' },
  ],
  materiales: [
    { key: 'source_id', label: 'Código', w: '90px', type: 'text' },
    { key: 'categoria', label: 'Categoría', w: '110px', type: 'text' },
    { key: 'subcategoria', label: 'Subcategoría', w: '100px', type: 'text' },
    { key: 'producto', label: 'Descripción', w: 'auto', type: 'text' },
    { key: 'unidades', label: 'Und', w: '45px', type: 'text', placeholder: 'm, u...' },
    { key: 'cantidad_default', label: 'Cant.', w: '50px', type: 'number', step: '1' },
    { key: 'costo_unitario', label: 'Costo Unit.', w: '70px', type: 'number' },
    { key: 'costo_total', label: 'Costo Total', w: '70px', type: 'number' },
    { key: 'ganancia_flag', label: 'Gan.', w: '36px', type: 'check' },
    { key: 'instalacion_flag', label: 'Inst.', w: '36px', type: 'check' },
    { key: 'observaciones', label: 'Observaciones', w: 'auto', type: 'text' },
  ],
  servicios: [
    { key: 'source_id', label: 'Código', w: '90px', type: 'text' },
    { key: 'categoria', label: 'Categoría', w: '110px', type: 'text' },
    { key: 'subcategoria', label: 'Subcategoría', w: '100px', type: 'text' },
    { key: 'producto', label: 'Servicio', w: 'auto', type: 'text' },
    { key: 'observaciones', label: 'Descripción', w: 'auto', type: 'text' },
    { key: 'costo_unitario', label: 'Costo Mensual', w: '80px', type: 'number' },
    { key: 'costo_total', label: 'Costo Anual', w: '80px', type: 'number' },
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
    const [eqRes, mtRes, svRes] = await Promise.all([
      supabase.from('equipos').select('*').order('categoria'),
      supabase.from('materiales').select('*').order('categoria'),
      supabase.from('servicios').select('*').order('categoria'),
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
        costo_unitario: r.costo_unitario,
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
        modelo: '',
        producto: r.producto,
        unidades: r.unidades,
        costo_unitario: r.costo_unitario,
        ganancia_flag: r.ganancia_flag,
        instalacion_flag: r.instalacion_flag,
        ultima_act: null,
        proveedor: '',
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
        modelo: '',
        producto: r.servicio,
        unidades: '',
        costo_unitario: r.costo_mensual,
        ganancia_flag: false,
        instalacion_flag: false,
        ultima_act: null,
        proveedor: '',
        observaciones: r.descripcion || r.observaciones,
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
        (p.producto || '').toLowerCase().includes(q) ||
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
        if (c.type === 'check') {
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
  const tableMap = { equipos: 'equipos', materiales: 'materiales', servicios: 'servicios' };
  const newIdx = editorProducts.length;
  const defaults = {
    equipos: {
      modelo: '',
      unidades: '',
      ganancia_flag: false,
      instalacion_flag: false,
      ultima_act: null,
      proveedor: '',
    },
    materiales: { modelo: '', unidades: '', ganancia_flag: false, instalacion_flag: false, proveedor: '' },
    servicios: { modelo: '', unidades: '', ganancia_flag: false, instalacion_flag: false, proveedor: '' },
  };
  editorProducts.push({
    _table: tableMap[cat],
    id: null,
    source_id: '',
    categoria: '',
    subcategoria: '',
    producto: '',
    costo_unitario: 0,
    costo_total: 0,
    observaciones: '',
    cantidad_default: 1,
    ...defaults[cat],
  });
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
  const btn = document.querySelector('#catalogEditorModal .btn-primary');
  btn.disabled = true;
  btn.textContent = 'Guardando...';
  try {
    for (const idx of editorDeleted) {
      const p = editorProducts[idx];
      if (p.id) {
        const { error } = await supabase.from(p._table).delete().eq('id', p.id);
        if (error) throw error;
      }
    }
    for (const [idxStr, changes] of Object.entries(editorChanges)) {
      const idx = parseInt(idxStr);
      const p = editorProducts[idx];
      if (editorDeleted.has(idx)) continue;
      if (p.id) {
        const { error } = await supabase.from(p._table).update(changes).eq('id', p.id);
        if (error) throw error;
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
      if (error) throw error;
    }
    toast(
      `✓ Guardado: ${Object.keys(editorChanges).length} editados, ${inserts.length} nuevos, ${editorDeleted.size} eliminados`,
      'success'
    );
    await loadEditorProducts();
  } catch (e) {
    toast('Error: ' + e.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Guardar cambios';
  }
}
