import { describe, it, expect } from 'vitest';
import { num, txt, flag, parseCsvRows, buildEquipo, buildMaterial, buildServicio } from '../modules/sync.js';

describe('num()', () => {
  it('returns 0 for empty/null/undefined', () => {
    expect(num('')).toBe(0);
    expect(num(null)).toBe(0);
    expect(num(undefined)).toBe(0);
  });

  it('parses numeric strings', () => {
    expect(num('100')).toBe(100);
    expect(num('100.50')).toBe(100.5);
    expect(num('0')).toBe(0);
  });

  it('strips non-numeric characters', () => {
    expect(num('$100.50')).toBe(100.5);
    expect(num('USD 1,200.00')).toBe(1200);
    expect(num('100%')).toBe(100);
  });

  it('rounds to 3 decimal places', () => {
    expect(num('100.1234')).toBe(100.123);
    expect(num('0.1236')).toBe(0.124);
  });
});

describe('txt()', () => {
  it('returns empty string for null/undefined/empty', () => {
    expect(txt('')).toBe('');
    expect(txt(null)).toBe('');
    expect(txt(undefined)).toBe('');
  });

  it('trims whitespace', () => {
    expect(txt('  hello  ')).toBe('hello');
    expect(txt('\t\n foo \n\t')).toBe('foo');
  });

  it('converts to string', () => {
    expect(txt(123)).toBe('123');
    expect(txt(true)).toBe('true');
  });
});

describe('flag()', () => {
  it('returns true for truthy values', () => {
    expect(flag('1')).toBe(true);
    expect(flag('true')).toBe(true);
    expect(flag('True')).toBe(true);
    expect(flag('sí')).toBe(true);
    expect(flag('si')).toBe(true);
    expect(flag('SI')).toBe(true);
  });

  it('returns false for falsy values', () => {
    expect(flag('0')).toBe(false);
    expect(flag('false')).toBe(false);
    expect(flag('no')).toBe(false);
    expect(flag('')).toBe(false);
    expect(flag(null)).toBe(false);
    expect(flag(undefined)).toBe(false);
  });
});

describe('parseCsvRows()', () => {
  it('parses simple CSV', () => {
    const csv = 'a,b,c\n1,2,3\n4,5,6';
    const rows = parseCsvRows(csv);
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
      ['4', '5', '6'],
    ]);
  });

  it('handles quoted fields with commas', () => {
    const csv = 'name,desc\n"Product A","Has, comma"\nB,Simple';
    const rows = parseCsvRows(csv);
    expect(rows[1][1]).toBe('Has, comma');
  });

  it('handles escaped quotes', () => {
    const csv = 'name,desc\n"Product ""A""","Normal"';
    const rows = parseCsvRows(csv);
    expect(rows[1][0]).toBe('Product "A"');
  });

  it('handles multi-line quoted fields', () => {
    const csv = 'name,desc\n"Product","Line1\nLine2"\nB,X';
    const rows = parseCsvRows(csv);
    expect(rows[1][1]).toBe('Line1\nLine2');
    expect(rows.length).toBe(3);
  });

  it('handles empty input', () => {
    expect(parseCsvRows('')).toEqual([]);
  });
});

describe('buildEquipo()', () => {
  it('builds a complete equipo object', () => {
    const mapped = {
      source_id: 'EQ-0001',
      categoria: 'Cámaras',
      subcategoria: 'IP',
      modelo: 'DS-2CD2143G2-I',
      producto: 'Cámara IP 4MP',
      unidades: 'u',
      cantidad_default: '2',
      costo_unitario: '150.00',
      costo_total: '300.00',
      ganancia_flag: '1',
      instalacion_flag: '0',
      ultima_act: '2026-01-15',
      proveedor: 'Hikvision',
      observaciones: 'Stock disponible',
    };
    const result = buildEquipo(mapped);
    expect(result.source_id).toBe('EQ-0001');
    expect(result.categoria).toBe('Cámaras');
    expect(result.costo_unitario).toBe(150);
    expect(result.cantidad_default).toBe(2);
    expect(result.ganancia_flag).toBe(true);
    expect(result.instalacion_flag).toBe(false);
  });

  it('defaults cantidad_default to 1', () => {
    const result = buildEquipo({ source_id: 'EQ-0002', producto: 'Test' });
    expect(result.cantidad_default).toBe(1);
  });
});

describe('buildMaterial()', () => {
  it('builds a material object', () => {
    const mapped = {
      source_id: 'MT-0001',
      categoria: 'Cable',
      subcategoria: 'UTP',
      producto: 'Cable UTP Cat6',
      unidades: 'm',
      costo_unitario: '0.50',
    };
    const result = buildMaterial(mapped);
    expect(result.source_id).toBe('MT-0001');
    expect(result.costo_unitario).toBe(0.5);
    expect(result.ganancia_flag).toBe(false);
  });
});

describe('buildServicio()', () => {
  it('builds a servicio object', () => {
    const mapped = {
      source_id: 'SV-0001',
      categoria: 'Monitoreo',
      subcategoria: 'Mensual',
      servicio: 'Monitoreo 24/7',
      descripcion: 'Servicio de monitoreo continuo',
      costo_mensual: '99.99',
      costo_anual: '1099.89',
      observaciones: 'Incluye soporte',
    };
    const result = buildServicio(mapped);
    expect(result.source_id).toBe('SV-0001');
    expect(result.servicio).toBe('Monitoreo 24/7');
    expect(result.costo_mensual).toBe(99.99);
    expect(result.costo_anual).toBe(1099.89);
  });
});
