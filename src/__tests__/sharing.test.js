import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../state.js', () => ({
  currentSession: { userId: 'owner-1', rol: 'vendedor' },
}));

// Fake Supabase table for saved_quote_shares + a fixed profiles list, enough
// to exercise sharing.js's own logic (it never touches saved_quotes directly).
const { fakeSupabase, resetShares, getShares } = vi.hoisted(() => {
  let shares;
  let idCounter = 1;
  function reset() {
    shares = [];
  }
  reset();

  const profiles = [
    { id: 'owner-1', nombre: 'Dueño', correo: 'owner@x.com', activo: true },
    { id: 'user-2', nombre: 'Juan', correo: 'juan@x.com', activo: true },
    { id: 'user-3', nombre: 'Inactivo', correo: 'inactivo@x.com', activo: false },
  ];

  function makeSharesBuilder() {
    const filters = {};
    let op = null;
    const builder = {
      select() {
        return builder;
      },
      eq(field, value) {
        filters[field] = value;
        return builder;
      },
      upsert(row) {
        op = { type: 'upsert', row };
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
    };
    function execute() {
      if (!op) {
        let rows = shares;
        for (const [f, v] of Object.entries(filters)) rows = rows.filter(r => r[f] === v);
        return { data: rows.map(r => ({ ...r })), error: null };
      }
      if (op.type === 'upsert') {
        const idx = shares.findIndex(s => s.quote_id === op.row.quote_id && s.shared_with === op.row.shared_with);
        if (idx >= 0) shares[idx] = { ...shares[idx], ...op.row };
        else shares.push({ id: 'share-' + idCounter++, ...op.row });
        return { data: null, error: null };
      }
      if (op.type === 'update') {
        const idx = shares.findIndex(s => s.id === filters.id);
        if (idx >= 0) shares[idx] = { ...shares[idx], ...op.changes };
        return { data: null, error: null };
      }
      if (op.type === 'delete') {
        const idx = shares.findIndex(s => s.id === filters.id);
        if (idx >= 0) shares.splice(idx, 1);
        return { data: null, error: null };
      }
      return { data: null, error: null };
    }
    return builder;
  }

  function makeProfilesBuilder() {
    const filters = {};
    let inField = null;
    let inValues = null;
    const builder = {
      select() {
        return builder;
      },
      eq(field, value) {
        filters[field] = value;
        return builder;
      },
      in(field, values) {
        inField = field;
        inValues = values;
        return builder;
      },
      order() {
        return builder;
      },
      then(resolve) {
        let rows = profiles;
        for (const [f, v] of Object.entries(filters)) rows = rows.filter(r => r[f] === v);
        if (inField) rows = rows.filter(r => inValues.includes(r[inField]));
        resolve({ data: rows.map(r => ({ ...r })), error: null });
      },
    };
    return builder;
  }

  function makeEditGrantsBuilder() {
    // Sin concesiones de edición en estos tests de sharing.js: siempre vacío,
    // así el filtro de "ya tiene acceso completo" nunca excluye a nadie.
    const builder = {
      select() {
        return builder;
      },
      eq() {
        return builder;
      },
      then(resolve) {
        resolve({ data: [], error: null });
      },
    };
    return builder;
  }

  const supabaseMock = {
    from: table => {
      if (table === 'saved_quote_shares') return makeSharesBuilder();
      if (table === 'profiles') return makeProfilesBuilder();
      if (table === 'quote_edit_grants') return makeEditGrantsBuilder();
      throw new Error('tabla no mockeada: ' + table);
    },
  };

  return {
    fakeSupabase: supabaseMock,
    resetShares: reset,
    getShares: () => shares,
  };
});

vi.mock('../lib/supabase.js', () => ({ default: fakeSupabase }));

document.body.innerHTML = `
  <div id="toast"></div>
  <div id="shareQuoteModal" class="modal-backdrop"></div>
  <select id="shareUserSelect"></select>
  <div id="shareCurrentList"></div>
`;

const { openShareQuoteModal, closeShareQuoteModal, addQuoteShare, revokeQuoteShare } =
  await import('../modules/sharing.js');

beforeEach(() => {
  resetShares();
  document.getElementById('shareUserSelect').value = '';
});

describe('openShareQuoteModal() - selector de usuarios', () => {
  it('lista usuarios activos excluyendo al dueño actual y a inactivos, con un placeholder sin selección por defecto', async () => {
    await openShareQuoteModal('quote-1');
    const select = document.getElementById('shareUserSelect');
    const options = [...select.options].map(o => o.value);
    expect(options).toEqual(['', 'user-2']);
    expect(select.value).toBe('');
    closeShareQuoteModal();
  });
});

describe('addQuoteShare() / revokeQuoteShare()', () => {
  it('compartir crea un registro de acceso para el usuario elegido', async () => {
    await openShareQuoteModal('quote-1');
    document.getElementById('shareUserSelect').value = 'user-2';

    await addQuoteShare();

    expect(getShares()).toHaveLength(1);
    expect(getShares()[0]).toMatchObject({
      quote_id: 'quote-1',
      owner_id: 'owner-1',
      shared_with: 'user-2',
    });
  });

  it('volver a compartir con la misma persona no duplica la fila (upsert)', async () => {
    await openShareQuoteModal('quote-1');
    document.getElementById('shareUserSelect').value = 'user-2';
    await addQuoteShare();
    await addQuoteShare();

    expect(getShares()).toHaveLength(1);
  });

  it('revokeQuoteShare elimina el acceso por completo', async () => {
    await openShareQuoteModal('quote-1');
    document.getElementById('shareUserSelect').value = 'user-2';
    await addQuoteShare();
    const shareId = getShares()[0].id;

    await revokeQuoteShare(shareId);

    expect(getShares()).toHaveLength(0);
  });

  it('no comparte si no hay usuario seleccionado', async () => {
    await openShareQuoteModal('quote-1');
    document.getElementById('shareUserSelect').value = '';

    await addQuoteShare();

    expect(getShares()).toHaveLength(0);
  });
});
