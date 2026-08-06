import { describe, it, expect, vi } from 'vitest';

vi.mock('../state.js', () => ({
  CATALOG: [
    { cost: 100, isService: false, hasGanancia: true, hasInstalacion: false, supplier: 'Sisegusa' },
    { cost: 50, isService: true, hasGanancia: false, hasInstalacion: false },
    { cost: 200, isService: false, hasGanancia: true, hasInstalacion: true, supplier: 'Other' },
  ],
  supplierMargins: { Sisegusa: 25 },
  DEFAULT_SUPPLIER_MARGIN: 15,
  installationMarginPct: 35,
}));

import { getSupplierMargin } from '../modules/helpers.js';
import { quoteTotal } from '../modules/history.js';

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
});
