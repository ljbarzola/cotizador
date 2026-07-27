import { describe, it, expect, vi, beforeEach } from 'vitest';

// Extract pure logic functions from editor.js for testing

// Editor column definitions
const EDITOR_COLS = {
  equipos: [
    { key: 'source_id', label: 'Código', w: '90px', type: 'text' },
    { key: 'categoria', label: 'Categoría', w: '110px', type: 'text' },
    { key: 'subcategoria', label: 'Subcategoría', w: '100px', type: 'text' },
    { key: 'producto', label: 'Descripción', w: 'auto', type: 'text' },
    { key: 'costo_unitario', label: 'Costo Unit.', w: '70px', type: 'number' },
    { key: 'ganancia_flag', label: 'Gan.', w: '36px', type: 'check' },
    { key: 'instalacion_flag', label: 'Inst.', w: '36px', type: 'check' },
  ],
  materiales: [
    { key: 'source_id', label: 'Código', w: '90px', type: 'text' },
    { key: 'categoria', label: 'Categoría', w: '110px', type: 'text' },
    { key: 'producto', label: 'Descripción', w: 'auto', type: 'text' },
    { key: 'costo_unitario', label: 'Costo Unit.', w: '70px', type: 'number' },
  ],
  servicios: [
    { key: 'source_id', label: 'Código', w: '90px', type: 'text' },
    { key: 'categoria', label: 'Categoría', w: '110px', type: 'text' },
    { key: 'producto', label: 'Servicio', w: 'auto', type: 'text' },
  ],
};

// Pure functions extracted for testing
function getEditorCols(table) {
  return EDITOR_COLS[table] || EDITOR_COLS.equipos;
}

function filterEditorProducts(products, query, category) {
  let filtered = products;
  if (category) {
    filtered = filtered.filter(p => p._table === category);
  }
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(
      p =>
        (p.source_id || '').toLowerCase().includes(q) ||
        (p.producto || '').toLowerCase().includes(q) ||
        (p.subcategoria || '').toLowerCase().includes(q) ||
        (p.modelo || '').toLowerCase().includes(q)
    );
  }
  return filtered;
}

function applyEditorChange(changes, idx, field, value) {
  if (!changes[idx]) changes[idx] = {};
  changes[idx][field] = value;
  return changes;
}

function toggleDelete(deleted, idx, products) {
  if (deleted.has(idx)) {
    deleted.delete(idx);
  } else {
    deleted.add(idx);
  }
  return deleted;
}

function buildInsertRow(product, tableMap) {
  const row = { ...product };
  row._table = tableMap[product._table] || product._table;
  delete row.id;
  delete row._idx;
  return row;
}

function hasUnsavedChanges(changes, deleted) {
  return Object.keys(changes).length > 0 || deleted.size > 0;
}

function countEditorStats(products, changes, deleted) {
  let modified = 0;
  let deletedCount = 0;
  let newCount = 0;
  for (const idx of deleted) {
    const p = products[idx];
    if (p && p.id) deletedCount++;
    else newCount++;
  }
  for (const idxStr of Object.keys(changes)) {
    const idx = parseInt(idxStr);
    const p = products[idx];
    if (p && p.id) modified++;
    else if (!deleted.has(idx)) newCount++;
  }
  return { modified, deleted: deletedCount, new: newCount };
}

// Tests
describe('getEditorCols() - column definitions', () => {
  it('returns equipos columns', () => {
    const cols = getEditorCols('equipos');
    expect(cols.length).toBe(7);
    expect(cols[0].key).toBe('source_id');
    expect(cols[4].type).toBe('number');
    expect(cols[5].type).toBe('check');
  });

  it('returns materiales columns', () => {
    const cols = getEditorCols('materiales');
    expect(cols.length).toBe(4);
    expect(cols[0].key).toBe('source_id');
  });

  it('returns servicios columns', () => {
    const cols = getEditorCols('servicios');
    expect(cols.length).toBe(3);
    expect(cols[2].key).toBe('producto');
  });

  it('falls back to equipos for unknown', () => {
    const cols = getEditorCols('unknown');
    expect(cols.length).toBe(7);
  });
});

describe('filterEditorProducts() - product filtering', () => {
  const products = [
    { _table: 'equipos', source_id: 'EQ-001', producto: 'Camera IP', subcategoria: 'Camaras', modelo: 'Pro' },
    { _table: 'equipos', source_id: 'EQ-002', producto: 'Alarm Sensor', subcategoria: 'Alarmas', modelo: 'Basic' },
    { _table: 'materiales', source_id: 'MT-001', producto: 'Cable UTP', subcategoria: 'Cables', modelo: '' },
    { _table: 'servicios', source_id: 'SV-001', producto: 'Installation', subcategoria: 'Instalacion', modelo: '' },
  ];

  it('returns all when no filters', () => {
    expect(filterEditorProducts(products, '', '')).toHaveLength(4);
  });

  it('filters by category', () => {
    expect(filterEditorProducts(products, '', 'equipos')).toHaveLength(2);
    expect(filterEditorProducts(products, '', 'materiales')).toHaveLength(1);
    expect(filterEditorProducts(products, '', 'servicios')).toHaveLength(1);
  });

  it('filters by search query', () => {
    expect(filterEditorProducts(products, 'camera', '')).toHaveLength(1);
    expect(filterEditorProducts(products, 'EQ-001', '')).toHaveLength(1);
  });

  it('filters by subcategory', () => {
    expect(filterEditorProducts(products, 'alarmas', '')).toHaveLength(1);
  });

  it('combines category and search', () => {
    expect(filterEditorProducts(products, 'camera', 'equipos')).toHaveLength(1);
    expect(filterEditorProducts(products, 'camera', 'materiales')).toHaveLength(0);
  });

  it('is case insensitive', () => {
    expect(filterEditorProducts(products, 'CAMERA', '')).toHaveLength(1);
    expect(filterEditorProducts(products, 'cable', '')).toHaveLength(1);
  });

  it('returns empty for no matches', () => {
    expect(filterEditorProducts(products, 'xyz', '')).toHaveLength(0);
  });
});

describe('applyEditorChange() - change tracking', () => {
  it('creates new change entry', () => {
    const changes = {};
    applyEditorChange(changes, 0, 'producto', 'New Product');
    expect(changes[0].producto).toBe('New Product');
  });

  it('appends to existing changes', () => {
    const changes = { 0: { producto: 'Old' } };
    applyEditorChange(changes, 0, 'costo_unitario', 100);
    expect(changes[0].producto).toBe('Old');
    expect(changes[0].costo_unitario).toBe(100);
  });

  it('tracks multiple indices', () => {
    const changes = {};
    applyEditorChange(changes, 0, 'producto', 'A');
    applyEditorChange(changes, 5, 'producto', 'B');
    expect(Object.keys(changes)).toHaveLength(2);
  });
});

describe('toggleDelete() - delete tracking', () => {
  it('adds index to deleted set', () => {
    const deleted = new Set();
    toggleDelete(deleted, 3, []);
    expect(deleted.has(3)).toBe(true);
  });

  it('removes index from deleted set', () => {
    const deleted = new Set([3]);
    toggleDelete(deleted, 3, []);
    expect(deleted.has(3)).toBe(false);
  });

  it('handles multiple toggles', () => {
    const deleted = new Set();
    toggleDelete(deleted, 1, []);
    toggleDelete(deleted, 2, []);
    expect(deleted.size).toBe(2);
    toggleDelete(deleted, 1, []);
    expect(deleted.size).toBe(1);
  });
});

describe('buildInsertRow() - new product row', () => {
  it('builds row with defaults for new product', () => {
    const product = {
      _table: 'equipos',
      id: null,
      source_id: 'EQ-NEW',
      producto: 'Test',
      costo_unitario: 100,
    };
    const row = buildInsertRow(product, { equipos: 'equipos' });
    expect(row.source_id).toBe('EQ-NEW');
    expect(row.producto).toBe('Test');
    expect(row.costo_unitario).toBe(100);
    expect(row.id).toBeUndefined();
    expect(row._table).toBe('equipos');
  });

  it('removes internal fields', () => {
    const product = { _table: 'equipos', id: 'some-id', _idx: 5, source_id: 'EQ-001' };
    const row = buildInsertRow(product, { equipos: 'equipos' });
    expect(row.id).toBeUndefined();
    expect(row._idx).toBeUndefined();
  });
});

describe('hasUnsavedChanges() - change detection', () => {
  it('returns false when empty', () => {
    expect(hasUnsavedChanges({}, new Set())).toBe(false);
  });

  it('returns true when changes exist', () => {
    expect(hasUnsavedChanges({ 0: { producto: 'x' } }, new Set())).toBe(true);
  });

  it('returns true when deletions exist', () => {
    expect(hasUnsavedChanges({}, new Set([1]))).toBe(true);
  });

  it('returns true when both exist', () => {
    expect(hasUnsavedChanges({ 0: {} }, new Set([1]))).toBe(true);
  });
});

describe('countEditorStats() - statistics', () => {
  const products = [
    { id: 'existing-1', _table: 'equipos' },
    { id: 'existing-2', _table: 'equipos' },
    { id: null, _table: 'equipos' },
  ];

  it('counts modified existing products', () => {
    const changes = { 0: { producto: 'Updated' } };
    const deleted = new Set();
    const stats = countEditorStats(products, changes, deleted);
    expect(stats.modified).toBe(1);
    expect(stats.deleted).toBe(0);
    expect(stats.new).toBe(0);
  });

  it('counts deleted existing products', () => {
    const changes = {};
    const deleted = new Set([1]);
    const stats = countEditorStats(products, changes, deleted);
    expect(stats.modified).toBe(0);
    expect(stats.deleted).toBe(1);
    expect(stats.new).toBe(0);
  });

  it('counts new products', () => {
    const changes = { 2: { producto: 'New' } };
    const deleted = new Set();
    const stats = countEditorStats(products, changes, deleted);
    expect(stats.modified).toBe(0);
    expect(stats.deleted).toBe(0);
    expect(stats.new).toBe(1);
  });

  it('handles mixed operations', () => {
    const changes = { 0: { producto: 'Updated' }, 2: { producto: 'New' } };
    const deleted = new Set([1]);
    const stats = countEditorStats(products, changes, deleted);
    expect(stats.modified).toBe(1);
    expect(stats.deleted).toBe(1);
    expect(stats.new).toBe(1);
  });
});
