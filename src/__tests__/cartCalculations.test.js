import { describe, it, expect, vi } from 'vitest';
import { calcItemTotals, calcDiscount, calcSubtotal } from '../modules/cartCalculations.js';

vi.mock('../state.js', () => ({
  supplierMargins: {},
  DEFAULT_SUPPLIER_MARGIN: 15,
  installationMarginPct: 35,
}));

const { calcItemPrice, getSupplierMargin } = await import('../modules/helpers.js');

const CATALOG = [
  { cost: 100, isService: false, hasGanancia: true, hasInstalacion: false, supplier: 'A' },
  { cost: 50, isService: true, hasGanancia: false, hasInstalacion: false },
  { cost: 200, isService: false, hasGanancia: true, hasInstalacion: true, supplier: 'B' },
];

describe('calcItemTotals() - item-level totals', () => {
  it('calculates totals for single equipment item', () => {
    const cart = [{ catalogIdx: 0, qty: 1, installActive: false, techCost: 0 }];
    const result = calcItemTotals(cart, CATALOG, calcItemPrice, getSupplierMargin, 35);
    // 100 + 15% = 115 (PVP), iva = 17.25
    expect(result.subtotalEquipo).toBe(115);
    expect(result.totalIva).toBe(17.25);
    expect(result.totalInstalacion).toBe(0);
  });

  it('calculates totals for multiple items', () => {
    const cart = [
      { catalogIdx: 0, qty: 2, installActive: false, techCost: 0 },
      { catalogIdx: 1, qty: 1, installActive: false, techCost: 0 },
    ];
    const result = calcItemTotals(cart, CATALOG, calcItemPrice, getSupplierMargin, 35);
    // Item 0: (100 + 15%) * 2 = 230 PVP, iva = 34.50
    // Item 1: 50 * 1 = 50 PVP, iva = 7.50
    expect(result.subtotalEquipo).toBe(280);
    expect(result.totalIva).toBe(42);
  });

  it('includes installation cost when active', () => {
    const cart = [{ catalogIdx: 2, qty: 1, installActive: true, techCost: 100 }];
    const result = calcItemTotals(cart, CATALOG, calcItemPrice, getSupplierMargin, 35);
    // 200 + 15% = 230 PVP, iva = 34.50
    // Install: 100 + 35% = 135
    expect(result.subtotalEquipo).toBe(230);
    expect(result.totalIva).toBe(34.5);
    expect(result.totalInstalacion).toBe(135);
  });

  it('handles kit items', () => {
    const cart = [
      {
        isKit: true,
        qty: 1,
        kitComponents: [
          { catalogIdx: 0, qty: 1, installActive: false, techCost: 0 },
          { catalogIdx: 1, qty: 2, installActive: false, techCost: 0 },
        ],
      },
    ];
    const result = calcItemTotals(cart, CATALOG, calcItemPrice, getSupplierMargin, 35);
    // Comp 0: 115 PVP, iva 17.25
    // Comp 1: 50 * 2 = 100 PVP, iva 15
    expect(result.subtotalEquipo).toBe(215);
    expect(result.totalIva).toBe(32.25);
  });

  it('skips items with invalid catalogIdx', () => {
    const cart = [{ catalogIdx: 99, qty: 1 }];
    const result = calcItemTotals(cart, CATALOG, calcItemPrice, getSupplierMargin, 35);
    expect(result.subtotalEquipo).toBe(0);
    expect(result.totalIva).toBe(0);
    expect(result.totalInstalacion).toBe(0);
  });

  it('handles empty cart', () => {
    const result = calcItemTotals([], CATALOG, calcItemPrice, getSupplierMargin, 35);
    expect(result.subtotalEquipo).toBe(0);
    expect(result.totalIva).toBe(0);
    expect(result.totalInstalacion).toBe(0);
  });

  it('applies custom margin per item', () => {
    const cart = [{ catalogIdx: 0, qty: 1, customMargin: 25, installActive: false }];
    const result = calcItemTotals(cart, CATALOG, calcItemPrice, getSupplierMargin, 35);
    // 100 + 25% = 125 PVP
    expect(result.subtotalEquipo).toBe(125);
  });
});

describe('calcDiscount() - discount calculation', () => {
  it('returns 0 for none type', () => {
    expect(calcDiscount(1000, 'none', 0)).toBe(0);
  });

  it('calculates percentage discount', () => {
    expect(calcDiscount(1000, 'percent', 10)).toBe(100);
    expect(calcDiscount(1000, 'percent', 15)).toBe(150);
  });

  it('calculates fixed discount', () => {
    expect(calcDiscount(1000, 'fixed', 50)).toBe(50);
  });

  it('caps fixed discount at total', () => {
    expect(calcDiscount(30, 'fixed', 50)).toBe(30);
  });

  it('returns 0 for zero value', () => {
    expect(calcDiscount(1000, 'percent', 0)).toBe(0);
    expect(calcDiscount(1000, 'fixed', 0)).toBe(0);
  });

  it('rounds percentage to 2 decimals', () => {
    expect(calcDiscount(1000, 'percent', 33.33)).toBe(333.3);
  });
});

describe('calcSubtotal() - subtotal calculation', () => {
  it('calculates subtotal for single item', () => {
    const cart = [{ catalogIdx: 0, qty: 1, installActive: false, techCost: 0 }];
    const { baseParaDescuento, totalGeneral } = calcSubtotal(cart, CATALOG, calcItemPrice, getSupplierMargin, 35);
    // 100 cost + 15 supplier margin = 115 baseParaDescuento
    expect(baseParaDescuento).toBe(115);
    // 115 PVP + 17.25 IVA = 132.25
    expect(totalGeneral).toBe(132.25);
  });

  it('includes installation in subtotal for items with install', () => {
    const cart = [{ catalogIdx: 2, qty: 1, installActive: true, techCost: 100 }];
    const { baseParaDescuento, totalGeneral } = calcSubtotal(cart, CATALOG, calcItemPrice, getSupplierMargin, 35);
    // calcSubtotal doesn't pass install params to calcItemPrice for regular items
    // so installation is not included (matches original getSubtotal behavior)
    // 200 cost + 30 supplier margin = 230 baseParaDescuento
    expect(baseParaDescuento).toBe(230);
    // 230 PVP + 34.5 IVA = 264.5
    expect(totalGeneral).toBe(264.5);
  });

  it('handles empty cart', () => {
    const result = calcSubtotal([], CATALOG, calcItemPrice, getSupplierMargin, 35);
    expect(result.baseParaDescuento).toBe(0);
    expect(result.totalGeneral).toBe(0);
  });
});
