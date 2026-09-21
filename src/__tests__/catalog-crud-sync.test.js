import { describe, it, expect, beforeEach, vi } from 'vitest';

// This file verifies the real production flow (not reimplemented logic):
// editor.js WRITES a product/instalación directly to Supabase, and sync.js's
// loadAllProducts()/loadAllInstalaciones() READ straight from Supabase — the
// exact same functions every other user's browser calls when it (re)loads the
// catalog. There is no separate cache or sheet in between, so proving these
// two modules round-trip through one fake shared table proves a create/edit/
// delete made by one user is visible to everyone else on their next load,
// with no sync step required — and that this flow survived the removal of
// the old Google Sheets sync code untouched.

const { fakeSupabase, resetTables, seed, getTable } = vi.hoisted(() => {
  let tables;
  let idCounter = 1;

  function reset() {
    tables = { equipos: [], materiales: [], servicios: [], instalaciones: [] };
  }
  reset();

  function seedFn(table, rows) {
    tables[table] = rows.map(r => ({ ...r }));
  }

  function getTableFn(table) {
    return tables[table];
  }

  function makeBuilder(table) {
    const filters = {};
    let op = null;
    const builder = {
      select() {
        op = op && op.type === 'update' ? { type: 'update-select', changes: op.changes } : { type: 'select' };
        return builder;
      },
      order() {
        return builder;
      },
      eq(field, value) {
        filters[field] = value;
        return builder;
      },
      in(field, values) {
        filters[field + '__in'] = values;
        return builder;
      },
      insert(row) {
        op = { type: 'insert', row };
        return builder;
      },
      update(changes) {
        op = { type: 'update', changes };
        return builder;
      },
      delete() {
        op = { type: 'delete' };
        return builder;
      },
      then(resolve, reject) {
        try {
          resolve(execute());
        } catch (e) {
          if (reject) reject(e);
          else throw e;
        }
      },
      catch() {
        return builder;
      },
    };
    function execute() {
      const arr = tables[table];
      if (op.type === 'select') {
        let rows = arr;
        for (const [f, v] of Object.entries(filters)) {
          if (f.endsWith('__in')) continue;
          rows = rows.filter(r => r[f] === v);
        }
        return { data: rows.map(r => ({ ...r })), error: null };
      }
      if (op.type === 'insert') {
        const row = { id: 'id-' + idCounter++, ...op.row };
        arr.push(row);
        return { data: [row], error: null };
      }
      if (op.type === 'update' || op.type === 'update-select') {
        const idx = arr.findIndex(r => r.id === filters.id);
        if (idx === -1) return { data: [], error: null };
        arr[idx] = { ...arr[idx], ...op.changes };
        return { data: [arr[idx]], error: null };
      }
      if (op.type === 'delete') {
        const idx = arr.findIndex(r => r.id === filters.id);
        if (idx !== -1) arr.splice(idx, 1);
        return { data: [], error: null };
      }
      return { data: [], error: null };
    }
    return builder;
  }

  const supabaseMock = {
    from: table => makeBuilder(table),
    auth: {
      getSession: () => Promise.resolve({ data: { session: { user: { id: 'u1' } } }, error: null }),
    },
    rpc: () => Promise.resolve({ data: null, error: { message: 'rpc not mocked' } }),
  };

  return { fakeSupabase: supabaseMock, resetTables: reset, seed: seedFn, getTable: getTableFn };
});

vi.mock('../lib/supabase.js', () => ({ default: fakeSupabase }));

const { loadAllProducts, loadAllInstalaciones } = await import('../modules/sync.js');
const {
  addNewProduct,
  editorField,
  editorToggleDelete,
  saveCatalogEdits,
  loadEditorProducts,
  addNewInstall,
  installEditorField,
  installEditorToggleDelete,
  saveInstallEditor,
} = await import('../modules/editor.js');
const { setCurrentSession } = await import('../state.js');
const { resolveConfirm } = await import('../utils.js');

function setupDOM() {
  document.body.innerHTML = `
    <div id="toast"></div>
    <div id="confirmModal">
      <div id="confirmTitle"></div>
      <div id="confirmMsg"></div>
      <button id="confirmBtn"></button>
    </div>
    <div id="catalogEditorModal">
      <input id="editorSearch" value="" />
      <select id="editorCategory"><option value="equipos" selected>Equipos</option></select>
      <span id="editorCount"></span>
      <div><table id="editorTable"><thead id="editorHead"></thead><tbody id="editorBody"></tbody></table></div>
      <button class="btn-primary">Guardar cambios</button>
    </div>
    <div id="installEditorModal">
      <input id="installEditorSearch" value="" />
      <span id="installEditorCount"></span>
      <table id="installEditorTable"><tbody id="installEditorBody"></tbody></table>
      <button class="btn-primary">Guardar</button>
    </div>
  `;
}

beforeEach(() => {
  resetTables();
  setupDOM();
  setCurrentSession({ rol: 'admin', userId: 'u1' });
});

describe('Productos (equipos): crear/editar/eliminar se refleja para todos vía Supabase', () => {
  it('un producto creado por un usuario aparece para todos al recargar el catálogo', async () => {
    await loadEditorProducts(); // arranca con el editor vacío, sin contaminación de otros tests
    $('editorCategory').value = 'equipos';
    addNewProduct();
    editorField(0, 'source_id', 'EQ-9001');
    editorField(0, 'categoria', 'EQUIPOS');
    editorField(0, 'producto', 'Cámara de prueba');
    editorField(0, 'costo_unitario', 120);

    await saveCatalogEdits();

    expect(getTable('equipos')).toHaveLength(1);
    expect(getTable('equipos')[0]).toMatchObject({
      source_id: 'EQ-9001',
      producto: 'Cámara de prueba',
      costo_unitario: 120,
    });

    // Simula a CUALQUIER OTRO usuario abriendo/recargando el catálogo
    const catalogForEveryoneElse = await loadAllProducts();
    const found = catalogForEveryoneElse.find(p => p.sourceId === 'EQ-9001');
    expect(found).toBeDefined();
    expect(found.description).toBe('Cámara de prueba');
    expect(found.cost).toBe(120);
  });

  it('un producto editado por un usuario refleja el cambio para todos', async () => {
    seed('equipos', [
      {
        id: 'seed-eq-1',
        source_id: 'EQ-1',
        categoria: 'EQUIPOS',
        producto: 'Nombre viejo',
        costo_unitario: 50,
        cantidad_default: 1,
        costo_total: 50,
        ganancia_flag: false,
        instalacion_flag: false,
        observaciones: '',
      },
    ]);
    await loadEditorProducts();
    editorField(0, 'costo_unitario', 999);

    await saveCatalogEdits();

    expect(getTable('equipos')[0].costo_unitario).toBe(999);

    const catalogForEveryoneElse = await loadAllProducts();
    const found = catalogForEveryoneElse.find(p => p.sourceId === 'EQ-1');
    expect(found.cost).toBe(999);
  });

  it('un producto eliminado por un usuario desaparece para todos', async () => {
    seed('equipos', [
      {
        id: 'seed-eq-2',
        source_id: 'EQ-2',
        categoria: 'EQUIPOS',
        producto: 'A borrar',
        costo_unitario: 20,
        cantidad_default: 1,
        costo_total: 20,
        ganancia_flag: false,
        instalacion_flag: false,
        observaciones: '',
      },
    ]);
    await loadEditorProducts();

    const delPromise = editorToggleDelete(0);
    resolveConfirm(true);
    await delPromise;
    await saveCatalogEdits();

    expect(getTable('equipos')).toHaveLength(0);

    const catalogForEveryoneElse = await loadAllProducts();
    expect(catalogForEveryoneElse.find(p => p.sourceId === 'EQ-2')).toBeUndefined();
  });
});

describe('Instalaciones: crear/editar/eliminar se refleja para todos vía Supabase', () => {
  it('una instalación creada por un usuario aparece para todos al recargar el catálogo', async () => {
    await saveInstallEditor(); // reload-only: arranca con el editor vacío, sin contaminación de otros tests

    await addNewInstall(); // asigna su propio source_id (p.ej. INST-001), no editable desde el editor
    installEditorField(0, 'categoria', 'SERVICIOS');
    installEditorField(0, 'servicio', 'Instalación de prueba');
    installEditorField(0, 'costo_unitario', 300);

    await saveInstallEditor();

    expect(getTable('instalaciones')).toHaveLength(1);
    expect(getTable('instalaciones')[0]).toMatchObject({
      servicio: 'Instalación de prueba',
      costo_unitario: 300,
    });
    const createdSourceId = getTable('instalaciones')[0].source_id;

    const catalogForEveryoneElse = await loadAllInstalaciones();
    const found = catalogForEveryoneElse.find(p => p.sourceId === createdSourceId);
    expect(found).toBeDefined();
    expect(found.description).toBe('Instalación de prueba');
    expect(found.cost).toBe(300);
  });

  it('una instalación editada por un usuario refleja el cambio para todos', async () => {
    seed('instalaciones', [
      {
        id: 'seed-inst-1',
        source_id: 'INST-1',
        categoria: 'SERVICIOS',
        subcategoria: '',
        servicio: 'Instalación vieja',
        costo_unitario: 10,
        observaciones: '',
      },
    ]);
    await saveInstallEditor(); // reload-only, recoge el seed

    installEditorField(0, 'costo_unitario', 555);
    await saveInstallEditor();

    expect(getTable('instalaciones')[0].costo_unitario).toBe(555);

    const catalogForEveryoneElse = await loadAllInstalaciones();
    const found = catalogForEveryoneElse.find(p => p.sourceId === 'INST-1');
    expect(found.cost).toBe(555);
  });

  it('una instalación eliminada por un usuario desaparece para todos', async () => {
    seed('instalaciones', [
      {
        id: 'seed-inst-2',
        source_id: 'INST-2',
        categoria: 'SERVICIOS',
        subcategoria: '',
        servicio: 'Instalación a borrar',
        costo_unitario: 15,
        observaciones: '',
      },
    ]);
    await saveInstallEditor(); // reload-only, recoge el seed

    const delPromise = installEditorToggleDelete(0);
    resolveConfirm(true);
    await delPromise;
    await saveInstallEditor();

    expect(getTable('instalaciones')).toHaveLength(0);

    const catalogForEveryoneElse = await loadAllInstalaciones();
    expect(catalogForEveryoneElse.find(p => p.sourceId === 'INST-2')).toBeUndefined();
  });
});

function $(id) {
  return document.getElementById(id);
}
