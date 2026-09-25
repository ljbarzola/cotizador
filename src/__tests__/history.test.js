import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../state.js', () => ({
  CATALOG: [
    {
      sourceId: 'EQ-0001',
      cost: 100,
      isService: false,
      hasGanancia: true,
      hasInstalacion: false,
      supplier: 'Sisegusa',
    },
    { sourceId: 'SV-0001', cost: 50, isService: true, hasGanancia: false, hasInstalacion: false },
    { sourceId: 'EQ-0002', cost: 200, isService: false, hasGanancia: true, hasInstalacion: true, supplier: 'Other' },
  ],
  supplierMargins: { Sisegusa: 25 },
  DEFAULT_SUPPLIER_MARGIN: 15,
  DEFAULT_INSTALL_MARGIN: 35,
  installationMarginPct: 35,
  cart: [],
  currentSession: { userId: 'u1', rol: 'vendedor' },
  currentQuoteId: null,
  historyQuotesCache: [],
  STATUS_LABELS: {
    borrador: 'Borrador',
    enviada: 'Enviada',
    vista: 'Vista',
    aceptada: 'Aceptada',
    rechazada: 'Rechazada',
    vencida: 'Vencida',
  },
  STATUS_ORDER: ['borrador', 'enviada', 'vista', 'aceptada', 'rechazada', 'vencida'],
  setCurrentQuoteId: vi.fn(),
  setCart: vi.fn(),
  setSupplierMargins: vi.fn(),
  setInstallationMarginPct: vi.fn(),
  setDiscountType: vi.fn(),
  setDiscountValue: vi.fn(),
  setHistoryQuotesCache: vi.fn(),
  setCotNumIsTentative: vi.fn(),
  setLoadedQuoteOwnerProfile: vi.fn(),
}));

const { rpcMock, singleMock } = vi.hoisted(() => ({
  rpcMock: vi.fn(() => Promise.resolve({ data: 1, error: null })),
  singleMock: vi.fn(),
}));
vi.mock('../lib/supabase.js', () => ({
  default: {
    from: () => ({
      select: () => ({ eq: () => ({ single: singleMock }) }),
    }),
    rpc: rpcMock,
  },
}));

import { getSupplierMargin } from '../modules/helpers.js';
import { quoteTotal, renderHistoryList, duplicateSharedQuote } from '../modules/history.js';
import { setCurrentQuoteId } from '../state.js';

// getSupplierMargin() tests
describe('getSupplierMargin() - supplier margin lookup', () => {
  it('returns margin for known supplier', () => {
    expect(getSupplierMargin('Sisegusa')).toBe(25);
  });

  it('returns default margin for unknown supplier', () => {
    expect(getSupplierMargin('Unknown')).toBe(15);
  });
});

// quoteTotal() tests
describe('quoteTotal() - quote total calculation', () => {
  it('calculates total for single item', () => {
    const q = { productos: [{ catalogIdx: 0, qty: 1 }], supplierMargins: {} };
    const total = quoteTotal(q);
    expect(total).toBeGreaterThan(0);
  });

  it('calculates total for multiple items', () => {
    const q = {
      productos: [
        { catalogIdx: 0, qty: 2 },
        { catalogIdx: 1, qty: 1 },
      ],
      supplierMargins: {},
    };
    const total = quoteTotal(q);
    expect(total).toBeGreaterThan(0);
  });

  it('handles empty items', () => {
    const q = { productos: [] };
    expect(quoteTotal(q)).toBe(0);
  });

  it('handles missing items field', () => {
    const q = {};
    expect(quoteTotal(q)).toBe(0);
  });

  it('skips items with invalid catalogIdx', () => {
    const q = { productos: [{ catalogIdx: 99, qty: 1 }] };
    expect(quoteTotal(q)).toBe(0);
  });

  it('applies custom margin per item', () => {
    const q = { productos: [{ catalogIdx: 0, qty: 1, customMargin: 25 }], supplierMargins: {} };
    const total = quoteTotal(q);
    expect(total).toBeGreaterThan(0);
  });

  it('includes installation cost when active', () => {
    const q = {
      productos: [{ catalogIdx: 2, qty: 1, installActive: true, techCost: 100 }],
      supplierMargins: {},
    };
    const total = quoteTotal(q);
    expect(total).toBeGreaterThan(0);
  });

  it('no installation cost when inactive', () => {
    const q = {
      productos: [{ catalogIdx: 2, qty: 1, installActive: false, techCost: 100 }],
      supplierMargins: {},
    };
    const total = quoteTotal(q);
    expect(total).toBeGreaterThan(0);
  });

  it('resolves by sourceId even when catalogIdx is stale (points to a different item, e.g. after a catalog deletion shifted positions)', () => {
    const viaCorrectIdx = quoteTotal({
      productos: [{ catalogIdx: 2, qty: 1, installActive: true, techCost: 100 }],
      supplierMargins: {},
    });
    const viaStaleIdxWithSourceId = quoteTotal({
      productos: [{ catalogIdx: 1, sourceId: 'EQ-0002', qty: 1, installActive: true, techCost: 100 }],
      supplierMargins: {},
    });
    expect(viaStaleIdxWithSourceId).toBe(viaCorrectIdx);
  });

  it('falls back to catalogIdx when sourceId is not found (legacy saved quotes without sourceId)', () => {
    const total = quoteTotal({
      productos: [{ catalogIdx: 0, sourceId: 'DOES-NOT-EXIST', qty: 1 }],
      supplierMargins: {},
    });
    expect(total).toBeGreaterThan(0);
  });

  it('resolves kit components by sourceId even when catalogIdx is stale', () => {
    const viaCorrectIdx = quoteTotal({
      productos: [{ isKit: true, qty: 1, kitComponents: [{ catalogIdx: 2, qty: 1 }] }],
      supplierMargins: {},
    });
    const viaStaleIdxWithSourceId = quoteTotal({
      productos: [{ isKit: true, qty: 1, kitComponents: [{ catalogIdx: 1, sourceId: 'EQ-0002', qty: 1 }] }],
      supplierMargins: {},
    });
    expect(viaStaleIdxWithSourceId).toBe(viaCorrectIdx);
  });
});

function setupHistoryDOM() {
  document.body.innerHTML = `
    <div id="toast"></div>
    <div id="savedModal" class="modal-backdrop"></div>
    <div id="historyStats"></div>
    <div id="historyList"></div>
  `;
}

// renderHistoryList() - compartir cotizaciones: gating por _myPermission
describe('renderHistoryList() - cotizaciones compartidas', () => {
  beforeEach(() => {
    setupHistoryDOM();
  });

  it('una cotización propia muestra Compartir/Eliminar y el estado editable, sin badge', () => {
    renderHistoryList([{ id: 'q1', user_id: 'u1', client: { name: 'Cliente A' }, status: 'borrador', productos: [] }]);
    const html = document.getElementById('historyList').innerHTML;
    expect(html).toContain("openShareQuoteModal('q1')");
    expect(html).toContain("deleteSaved('q1')");
    expect(html).toContain("changeStatus('q1'");
    expect(html).not.toContain('history-shared-badge');
    expect(html).not.toContain('duplicateSharedQuote');
  });

  it('como admin, una cotización ajena (no compartida explícitamente) NO muestra el botón Compartir, pero sí Eliminar/estado (comportamiento admin ya existente)', () => {
    renderHistoryList([
      { id: 'q-other', user_id: 'otro-usuario', client: { name: 'Cliente Ajeno' }, status: 'borrador', productos: [] },
    ]);
    const html = document.getElementById('historyList').innerHTML;
    expect(html).not.toContain('openShareQuoteModal');
    expect(html).toContain("deleteSaved('q-other')");
    expect(html).toContain("changeStatus('q-other'");
  });

  it('una cotización compartida muestra el badge, el estado como texto, y un único botón "Crear copia" (sin Cargar/Compartir/Eliminar/estado editable)', () => {
    renderHistoryList([
      {
        id: 'q2',
        client: { name: 'Cliente B' },
        status: 'enviada',
        productos: [],
        _sharedBy: 'Juan',
      },
    ]);
    const html = document.getElementById('historyList').innerHTML;
    expect(html).toContain('🔗 Compartida por Juan');
    expect(html).toContain('status-readonly');
    expect(html).toContain("duplicateSharedQuote('q2')");
    expect(html).toContain('Crear copia');
    expect(html).not.toContain('openShareQuoteModal');
    expect(html).not.toContain('deleteSaved');
    expect(html).not.toContain('changeStatus');
    expect(html).not.toContain('loadSaved');
  });
});

// duplicateSharedQuote() - nunca escribe sobre la cotización original
describe('duplicateSharedQuote() - duplicar como cotización propia', () => {
  beforeEach(() => {
    setupHistoryDOM();
    singleMock.mockReset();
    setCurrentQuoteId.mockClear();
    window.loadQuoteData = vi.fn();
  });

  it('lee la cotización compartida y la carga como una nueva (currentQuoteId a null, sin update/insert)', async () => {
    singleMock.mockResolvedValue({
      data: {
        id: 'shared-1',
        cot_num: 'COT-20260101-0001',
        client: { name: 'Cliente Compartido' },
        supplier_margins: {},
        install_margin: 35,
        productos: [],
      },
      error: null,
    });

    await duplicateSharedQuote('shared-1');

    // Nunca se llama a update/insert contra saved_quotes: solo se leyó.
    expect(setCurrentQuoteId).toHaveBeenCalledWith(null);
    expect(window.loadQuoteData).toHaveBeenCalledTimes(1);
    const loaded = window.loadQuoteData.mock.calls[0][0];
    expect(loaded.client).toEqual({ name: 'Cliente Compartido' });
    // El número de cotización de la copia es nuevo, no el de la original.
    expect(loaded.cotNum).not.toBe('COT-20260101-0001');
  });

  it('muestra un error si la lectura falla, sin lanzar excepción', async () => {
    singleMock.mockResolvedValue({ data: null, error: { message: 'no autorizado' } });
    await expect(duplicateSharedQuote('shared-2')).resolves.toBeUndefined();
    expect(window.loadQuoteData).not.toHaveBeenCalled();
  });
});
