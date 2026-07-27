import { describe, it, expect, vi } from 'vitest';

vi.mock('../state.js', () => ({
  supplierMargins: { Sisegusa: 25, 'Sin proveedor': 10 },
  DEFAULT_SUPPLIER_MARGIN: 15,
  installationMarginPct: 35,
}));

import { esc } from '../utils.js';
import { calcItemPrice, getSupplierMargin } from '../modules/helpers.js';

// esc() tests
describe('esc() - HTML escaping', () => {
  it('escapes HTML tags', () => {
    expect(esc('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
  });

  it('escapes ampersands', () => {
    expect(esc('a & b')).toBe('a &amp; b');
  });

  it('does not escape double quotes (textContent method)', () => {
    expect(esc('He said "hello"')).toBe('He said "hello"');
  });

  it('returns empty string for null/undefined', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
    expect(esc('')).toBe('');
  });

  it('handles normal text unchanged', () => {
    expect(esc('Hello World')).toBe('Hello World');
  });
});

// getSupplierMargin() tests
describe('getSupplierMargin() - supplier margin lookup', () => {
  it('returns margin for known supplier', () => {
    expect(getSupplierMargin('Sisegusa')).toBe(25);
  });

  it('returns margin for Sin proveedor', () => {
    expect(getSupplierMargin('')).toBe(10);
    expect(getSupplierMargin(null)).toBe(10);
  });

  it('returns default margin for unknown supplier', () => {
    expect(getSupplierMargin('Unknown')).toBe(15);
  });
});

// calcItemPrice() tests
describe('calcItemPrice() - service items', () => {
  it('calculates service price with IVA only', () => {
    const item = { cost: 100, isService: true, hasGanancia: false, hasInstalacion: false };
    const result = calcItemPrice(item, { supplierMargin: 15, installMargin: 35 });
    expect(result.baseCost).toBe(100);
    expect(result.priceBeforeIva).toBe(100);
    expect(result.iva).toBe(15);
    expect(result.total).toBe(115);
    expect(result.gananciaProveedor).toBe(0);
    expect(result.hasGanancia).toBe(false);
  });

  it('no installation cost for services', () => {
    const item = { cost: 50, isService: true, hasGanancia: false, hasInstalacion: false };
    const result = calcItemPrice(item, { supplierMargin: 15, installMargin: 35, techCost: 100, installActive: true });
    expect(result.instalacionPrice).toBe(0);
    expect(result.total).toBe(57.5);
  });
});

describe('calcItemPrice() - equipment with ganancia', () => {
  it('calculates 15% supplier margin', () => {
    const item = { cost: 100, isService: false, hasGanancia: true, hasInstalacion: false };
    const result = calcItemPrice(item, { supplierMargin: 15, installMargin: 35 });
    expect(result.baseCost).toBe(100);
    expect(result.gananciaProveedor).toBe(15);
    expect(result.priceBeforeIva).toBe(115);
    expect(result.iva).toBe(17.25);
    expect(result.subtotalEquipo).toBe(132.25);
    expect(result.total).toBe(132.25);
  });

  it('calculates custom supplier margin', () => {
    const item = { cost: 200, isService: false, hasGanancia: true, hasInstalacion: false };
    const result = calcItemPrice(item, { supplierMargin: 25, installMargin: 35 });
    expect(result.gananciaProveedor).toBe(50);
    expect(result.priceBeforeIva).toBe(250);
  });
});

describe('calcItemPrice() - equipment with installation', () => {
  it('adds installation cost when active', () => {
    const item = { cost: 100, isService: false, hasGanancia: true, hasInstalacion: true };
    const result = calcItemPrice(item, {
      supplierMargin: 15,
      installMargin: 35,
      techCost: 50,
      installActive: true,
    });
    expect(result.gananciaInstalacion).toBe(17.5);
    expect(result.instalacionPrice).toBe(67.5);
    expect(result.total).toBe(199.75);
  });

  it('no installation cost when inactive', () => {
    const item = { cost: 100, isService: false, hasGanancia: true, hasInstalacion: true };
    const result = calcItemPrice(item, {
      supplierMargin: 15,
      installMargin: 35,
      installActive: false,
      techCost: 50,
    });
    expect(result.instalacionPrice).toBe(0);
    expect(result.total).toBe(132.25);
  });

  it('no installation cost when techCost is 0', () => {
    const item = { cost: 100, isService: false, hasGanancia: true, hasInstalacion: true };
    const result = calcItemPrice(item, {
      supplierMargin: 15,
      installMargin: 35,
      installActive: true,
      techCost: 0,
    });
    expect(result.instalacionPrice).toBe(0);
  });
});

describe('calcItemPrice() - equipment without ganancia', () => {
  it('no margin when hasGanancia is false', () => {
    const item = { cost: 100, isService: false, hasGanancia: false, hasInstalacion: false };
    const result = calcItemPrice(item, { supplierMargin: 15, installMargin: 35 });
    expect(result.gananciaProveedor).toBe(0);
    expect(result.priceBeforeIva).toBe(100);
    expect(result.iva).toBe(15);
    expect(result.total).toBe(115);
  });
});
