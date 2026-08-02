import { describe, expect, it } from 'vitest';
import { formatMoney, fromMinorUnits, getMinorUnitDigits, toMinorUnits } from '../utils/currency';

describe('toMinorUnits / fromMinorUnits', () => {
  it('converts dollars to cents without floating-point drift', () => {
    expect(toMinorUnits(10.99, 'USD')).toBe(1099);
    expect(toMinorUnits(0.1, 'USD') + toMinorUnits(0.2, 'USD')).toBe(30);
  });

  it('round-trips back to the original major amount', () => {
    expect(fromMinorUnits(1099, 'USD')).toBeCloseTo(10.99);
  });

  it('treats JPY as a zero-decimal currency', () => {
    expect(getMinorUnitDigits('JPY')).toBe(0);
    expect(toMinorUnits(500, 'JPY')).toBe(500);
  });

  it('never produces NaN or Infinity for invalid input', () => {
    expect(toMinorUnits(NaN, 'USD')).toBe(0);
    expect(toMinorUnits(Infinity, 'USD')).toBe(0);
    expect(fromMinorUnits(NaN, 'USD')).toBe(0);
  });
});

describe('formatMoney', () => {
  it('formats a valid amount', () => {
    expect(formatMoney(1099, 'USD')).toContain('10.99');
  });

  it('falls back to 0 instead of throwing or showing NaN for invalid amounts', () => {
    expect(formatMoney(undefined, 'USD')).not.toMatch(/NaN|undefined|Infinity/);
    expect(formatMoney(null, 'USD')).not.toMatch(/NaN|undefined|Infinity/);
    expect(formatMoney(NaN, 'USD')).not.toMatch(/NaN|undefined|Infinity/);
  });
});
