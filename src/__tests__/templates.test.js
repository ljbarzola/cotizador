import { describe, it, expect } from 'vitest';
import { resolveTemplateProductos } from '../modules/quote.js';

// resolveTemplateProductos() tests
describe('resolveTemplateProductos() - template to cart conversion', () => {
  const catalog = [
    { sourceId: 'EQ-001', cost: 100 },
    { sourceId: 'EQ-002', cost: 200 },
    { sourceId: 'MT-001', cost: 50 },
  ];

  it('resolves matching items to cart', () => {
    const templateItems = [
      { sourceId: 'EQ-001', qty: 2 },
      { sourceId: 'EQ-002', qty: 1 },
    ];
    const result = resolveTemplateProductos(templateItems, catalog);
    expect(result.cart).toHaveLength(2);
    expect(result.unmatched).toHaveLength(0);
    expect(result.cart[0].catalogIdx).toBe(0);
    expect(result.cart[0].qty).toBe(2);
    expect(result.cart[1].catalogIdx).toBe(1);
  });

  it('tracks unmatched items', () => {
    const templateItems = [
      { sourceId: 'EQ-001', qty: 1 },
      { sourceId: 'NONEXISTENT', qty: 1 },
    ];
    const result = resolveTemplateProductos(templateItems, catalog);
    expect(result.cart).toHaveLength(1);
    expect(result.unmatched).toHaveLength(1);
    expect(result.unmatched[0].sourceId).toBe('NONEXISTENT');
  });

  it('uses default qty of 1', () => {
    const templateItems = [{ sourceId: 'EQ-001' }];
    const result = resolveTemplateProductos(templateItems, catalog);
    expect(result.cart[0].qty).toBe(1);
  });

  it('preserves installActive and techCost', () => {
    const templateItems = [{ sourceId: 'EQ-001', qty: 1, installActive: true, techCost: 50 }];
    const result = resolveTemplateProductos(templateItems, catalog);
    expect(result.cart[0].installActive).toBe(true);
    expect(result.cart[0].techCost).toBe(50);
  });

  it('handles empty template items', () => {
    const result = resolveTemplateProductos([], catalog);
    expect(result.cart).toHaveLength(0);
    expect(result.unmatched).toHaveLength(0);
  });
});

// Template filtering logic (local helper — not exported from source)
function filterTemplates(templates, { search = '', type = '', industry = '' } = {}) {
  let filtered = templates;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
  }
  if (type) filtered = filtered.filter(t => t.clientType === type);
  if (industry) filtered = filtered.filter(t => t.industry === industry);
  return filtered;
}

describe('filterTemplates() - template filtering', () => {
  const templates = [
    { name: 'Bank Security', description: 'Full security for banks', clientType: 'grande', industry: 'banco' },
    { name: 'Small Shop', description: 'Basic alarm system', clientType: 'pequeña', industry: 'comercio' },
    { name: 'Office Pack', description: 'Cameras for office', clientType: 'mediana', industry: 'oficina' },
    { name: 'Industrial Security', description: 'Heavy duty sensors', clientType: 'grande', industry: 'industrial' },
  ];

  it('returns all templates when no filters', () => {
    expect(filterTemplates(templates)).toHaveLength(4);
  });

  it('filters by search term', () => {
    const result = filterTemplates(templates, { search: 'bank' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Bank Security');
  });

  it('filters by search in description', () => {
    const result = filterTemplates(templates, { search: 'cameras' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Office Pack');
  });

  it('filters by type', () => {
    const result = filterTemplates(templates, { type: 'grande' });
    expect(result).toHaveLength(2);
  });

  it('filters by industry', () => {
    const result = filterTemplates(templates, { industry: 'comercio' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Small Shop');
  });

  it('combines filters', () => {
    const result = filterTemplates(templates, { type: 'grande', industry: 'banco' });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Bank Security');
  });

  it('is case insensitive for search', () => {
    const result = filterTemplates(templates, { search: 'BANK' });
    expect(result).toHaveLength(1);
  });

  it('returns empty for no matches', () => {
    const result = filterTemplates(templates, { search: 'xyz' });
    expect(result).toHaveLength(0);
  });
});

// Template total calculation (local helper — not exported from source)
function calcTemplateTotal(template, CATALOG = []) {
  let total = 0;
  (template.productos || []).forEach(item => {
    const catItem = CATALOG.find(c => c.sourceId === item.sourceId);
    if (!catItem) return;
    const qty = item.qty || 1;
    const price = catItem.cost * qty;
    total += price;
  });
  return total;
}

describe('calcTemplateTotal() - template total calculation', () => {
  const CATALOG = [
    { sourceId: 'EQ-001', cost: 100 },
    { sourceId: 'EQ-002', cost: 200 },
    { sourceId: 'MT-001', cost: 50 },
  ];

  it('calculates total for template with items', () => {
    const template = {
      productos: [
        { sourceId: 'EQ-001', qty: 2 },
        { sourceId: 'EQ-002', qty: 1 },
      ],
    };
    expect(calcTemplateTotal(template, CATALOG)).toBe(400);
  });

  it('uses default qty of 1', () => {
    const template = { productos: [{ sourceId: 'EQ-001' }] };
    expect(calcTemplateTotal(template, CATALOG)).toBe(100);
  });

  it('skips unmatched items', () => {
    const template = {
      productos: [
        { sourceId: 'EQ-001', qty: 1 },
        { sourceId: 'NONEXISTENT', qty: 1 },
      ],
    };
    expect(calcTemplateTotal(template, CATALOG)).toBe(100);
  });

  it('handles empty items', () => {
    const template = { productos: [] };
    expect(calcTemplateTotal(template, CATALOG)).toBe(0);
  });

  it('handles missing items field', () => {
    const template = {};
    expect(calcTemplateTotal(template, CATALOG)).toBe(0);
  });
});
