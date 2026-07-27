import { describe, it, expect } from 'vitest';

// Kit component filtering logic - extracted for testing
function getFilteredKitProducts(CATALOG = [], searchTerm = '') {
  const term = searchTerm.toLowerCase();
  if (!term) return CATALOG.map((item, i) => ({ item, idx: i }));
  return CATALOG.map((item, i) => ({ item, idx: i })).filter(
    ({ item }) =>
      (item.sourceId || '').toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term) ||
      (item.category || '').toLowerCase().includes(term) ||
      (item.subcategory || '').toLowerCase().includes(term)
  );
}

// Kit price calculation - only included components
function calcKitTotal(kit, CATALOG = []) {
  return kit.components
    .filter(c => c.included && c.catalogIdx !== null && c.catalogIdx < CATALOG.length)
    .reduce((s, c) => s + CATALOG[c.catalogIdx].cost, 0);
}

// Kit included components extraction - extracted for testing
function getIncludedComponents(kit, CATALOG = []) {
  return kit.components
    .filter(c => c.included && c.catalogIdx !== null && c.catalogIdx < CATALOG.length)
    .map(c => CATALOG[c.catalogIdx])
    .filter(Boolean);
}

// getFilteredKitProducts() tests
describe('getFilteredKitProducts() - kit product filtering', () => {
  const CATALOG = [
    { sourceId: 'EQ-001', description: 'Camera IP', category: 'EQUIPOS', subcategory: 'Camaras' },
    { sourceId: 'EQ-002', description: 'Alarm Sensor', category: 'EQUIPOS', subcategory: 'Alarmas' },
    { sourceId: 'MT-001', description: 'Cable UTP', category: 'MATERIALES', subcategory: 'Cables' },
    { sourceId: 'SV-001', description: 'Installation Service', category: 'SERVICIOS', subcategory: 'Instalacion' },
  ];

  it('returns all products when no search term', () => {
    const result = getFilteredKitProducts(CATALOG, '');
    expect(result).toHaveLength(4);
  });

  it('filters by sourceId', () => {
    const result = getFilteredKitProducts(CATALOG, 'eq-001');
    expect(result).toHaveLength(1);
    expect(result[0].item.sourceId).toBe('EQ-001');
  });

  it('filters by description', () => {
    const result = getFilteredKitProducts(CATALOG, 'camera');
    expect(result).toHaveLength(1);
    expect(result[0].item.description).toBe('Camera IP');
  });

  it('filters by category', () => {
    const result = getFilteredKitProducts(CATALOG, 'materiales');
    expect(result).toHaveLength(1);
    expect(result[0].item.sourceId).toBe('MT-001');
  });

  it('filters by subcategory', () => {
    const result = getFilteredKitProducts(CATALOG, 'alarmas');
    expect(result).toHaveLength(1);
    expect(result[0].item.sourceId).toBe('EQ-002');
  });

  it('is case insensitive', () => {
    const result = getFilteredKitProducts(CATALOG, 'CAMERA');
    expect(result).toHaveLength(1);
  });

  it('returns empty array for no matches', () => {
    const result = getFilteredKitProducts(CATALOG, 'xyz123');
    expect(result).toHaveLength(0);
  });

  it('returns correct indices', () => {
    const result = getFilteredKitProducts(CATALOG, 'cable');
    expect(result[0].idx).toBe(2);
  });
});

// calcKitTotal() tests
describe('calcKitTotal() - kit total calculation', () => {
  const CATALOG = [{ cost: 100 }, { cost: 200 }, { cost: 50 }];

  it('calculates total for kit with all components included', () => {
    const kit = {
      components: [
        { catalogIdx: 0, included: true },
        { catalogIdx: 1, included: true },
      ],
    };
    expect(calcKitTotal(kit, CATALOG)).toBe(300);
  });

  it('excludes non-included components', () => {
    const kit = {
      components: [
        { catalogIdx: 0, included: true },
        { catalogIdx: 1, included: false },
      ],
    };
    expect(calcKitTotal(kit, CATALOG)).toBe(100);
  });

  it('handles empty components', () => {
    const kit = { components: [] };
    expect(calcKitTotal(kit, CATALOG)).toBe(0);
  });

  it('handles invalid catalogIdx', () => {
    const kit = {
      components: [
        { catalogIdx: 0, included: true },
        { catalogIdx: 99, included: true },
      ],
    };
    expect(calcKitTotal(kit, CATALOG)).toBe(100);
  });

  it('handles null catalogIdx', () => {
    const kit = {
      components: [
        { catalogIdx: null, included: true },
        { catalogIdx: 0, included: true },
      ],
    };
    expect(calcKitTotal(kit, CATALOG)).toBe(100);
  });
});

// getIncludedComponents() tests
describe('getIncludedComponents() - kit included components', () => {
  const CATALOG = [
    { sourceId: 'EQ-001', description: 'Camera' },
    { sourceId: 'EQ-002', description: 'Sensor' },
    { sourceId: 'EQ-003', description: 'Alarm' },
  ];

  it('returns only included components', () => {
    const kit = {
      components: [
        { catalogIdx: 0, included: true },
        { catalogIdx: 1, included: false },
        { catalogIdx: 2, included: true },
      ],
    };
    const result = getIncludedComponents(kit, CATALOG);
    expect(result).toHaveLength(2);
    expect(result[0].sourceId).toBe('EQ-001');
    expect(result[1].sourceId).toBe('EQ-003');
  });

  it('returns empty array when no components included', () => {
    const kit = {
      components: [
        { catalogIdx: 0, included: false },
        { catalogIdx: 1, included: false },
      ],
    };
    const result = getIncludedComponents(kit, CATALOG);
    expect(result).toHaveLength(0);
  });

  it('handles empty components', () => {
    const kit = { components: [] };
    const result = getIncludedComponents(kit, CATALOG);
    expect(result).toHaveLength(0);
  });

  it('skips invalid catalogIdx', () => {
    const kit = {
      components: [
        { catalogIdx: 0, included: true },
        { catalogIdx: 99, included: true },
      ],
    };
    const result = getIncludedComponents(kit, CATALOG);
    expect(result).toHaveLength(1);
  });
});
