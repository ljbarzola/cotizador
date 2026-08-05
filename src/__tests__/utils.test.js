import { describe, it, expect, beforeEach } from 'vitest';
import { esc, escAttr, fmt, generateCotNumber, isAdmin } from '../utils.js';

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

  it('handles numbers', () => {
    expect(esc(123)).toBe('123');
  });
});

// escAttr() tests
describe('escAttr() - attribute escaping', () => {
  it('escapes double quotes', () => {
    expect(escAttr('value="test"')).toBe('value=&quot;test&quot;');
  });

  it('escapes less than signs', () => {
    expect(escAttr('a < b')).toBe('a &lt; b');
  });

  it('escapes greater than signs', () => {
    expect(escAttr('a > b')).toBe('a &gt; b');
  });

  it('escapes single quotes', () => {
    expect(escAttr("it's")).toBe('it&#39;s');
  });

  it('escapes ampersands', () => {
    expect(escAttr('a & b')).toBe('a &amp; b');
  });

  it('escapes all special chars together', () => {
    expect(escAttr('<script>"test"</script>')).toBe('&lt;script&gt;&quot;test&quot;&lt;/script&gt;');
  });

  it('returns empty string for null/undefined', () => {
    expect(escAttr(null)).toBe('');
    expect(escAttr(undefined)).toBe('');
    expect(escAttr('')).toBe('');
  });

  it('handles normal text unchanged', () => {
    expect(escAttr('Hello World')).toBe('Hello World');
  });

  it('handles numbers', () => {
    expect(escAttr(123)).toBe('123');
  });
});

// fmt() tests
describe('fmt() - currency formatting', () => {
  it('formats basic numbers', () => {
    expect(fmt(100)).toBe('$100.00');
    expect(fmt(0)).toBe('$0.00');
  });

  it('formats decimal numbers', () => {
    expect(fmt(100.5)).toBe('$100.50');
    expect(fmt(99.99)).toBe('$99.99');
  });

  it('adds comma separators', () => {
    expect(fmt(1000)).toBe('$1,000.00');
    expect(fmt(1000000)).toBe('$1,000,000.00');
  });

  it('handles null/undefined/NaN', () => {
    expect(fmt(null)).toBe('$0.00');
    expect(fmt(undefined)).toBe('$0.00');
    expect(fmt('abc')).toBe('$0.00');
  });

  it('handles negative numbers', () => {
    expect(fmt(-100)).toBe('$-100.00');
  });

  it('rounds to 2 decimal places', () => {
    expect(fmt(100.126)).toBe('$100.13');
    expect(fmt(100.124)).toBe('$100.12');
  });
});

// generateCotNumber() tests
describe('generateCotNumber() - quote number generation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('generates COT-YYYYMMDD-NNNN format', () => {
    const result = generateCotNumber();
    expect(result).toMatch(/^COT-\d{8}-\d{4}$/);
  });

  it('increments sequence number', () => {
    const first = generateCotNumber();
    const second = generateCotNumber();
    const firstSeq = parseInt(first.split('-')[2]);
    const secondSeq = parseInt(second.split('-')[2]);
    expect(secondSeq).toBe(firstSeq + 1);
  });

  it('uses today date', () => {
    const result = generateCotNumber();
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    expect(result).toContain(today);
  });
});

// isAdmin() tests
describe('isAdmin() - role checking', () => {
  it('returns true for admin role', () => {
    expect(isAdmin({ rol: 'admin' })).toBe(true);
  });

  it('returns false for vendedor role', () => {
    expect(isAdmin({ rol: 'vendedor' })).toBe(false);
  });

  it('returns false for null/undefined session', () => {
    expect(isAdmin(null)).toBe(false);
    expect(isAdmin(undefined)).toBe(false);
  });

  it('returns false for empty session', () => {
    expect(isAdmin({})).toBe(false);
  });
});
