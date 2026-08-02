import { describe, expect, it } from 'vitest';
import { average, clamp, getBudgetStatus, percentage, safeDivide, sum } from '../utils/calculations';

describe('safeDivide', () => {
  it('divides normally', () => {
    expect(safeDivide(10, 4)).toBe(2.5);
  });

  it('never divides by zero', () => {
    expect(safeDivide(10, 0)).toBe(0);
  });

  it('returns fallback for non-finite inputs', () => {
    expect(safeDivide(Infinity, 5)).toBe(0);
    expect(safeDivide(NaN, 5)).toBe(0);
    expect(safeDivide(5, NaN, -1)).toBe(-1);
  });
});

describe('percentage', () => {
  it('computes a percentage', () => {
    expect(percentage(50, 200)).toBe(25);
  });

  it('is 0 when whole is 0 instead of NaN/Infinity', () => {
    expect(percentage(50, 0)).toBe(0);
    expect(Number.isFinite(percentage(50, 0))).toBe(true);
  });
});

describe('sum/average', () => {
  it('sums an empty array to 0', () => {
    expect(sum([])).toBe(0);
  });

  it('averages an empty array to 0, not NaN', () => {
    expect(average([])).toBe(0);
  });

  it('ignores non-finite values when summing', () => {
    expect(sum([10, NaN, 5, Infinity])).toBe(15);
  });
});

describe('clamp', () => {
  it('clamps within range', () => {
    expect(clamp(150, 0, 100)).toBe(100);
    expect(clamp(-10, 0, 100)).toBe(0);
    expect(clamp(50, 0, 100)).toBe(50);
  });
});

describe('getBudgetStatus', () => {
  it('reports no_budget when there is no budget', () => {
    expect(getBudgetStatus(50, false)).toBe('no_budget');
  });

  it('reports safe below 70%', () => {
    expect(getBudgetStatus(69.9, true)).toBe('safe');
  });

  it('reports warning between 70% and 90%', () => {
    expect(getBudgetStatus(70, true)).toBe('warning');
    expect(getBudgetStatus(89.9, true)).toBe('warning');
  });

  it('reports critical between 90% and 100%', () => {
    expect(getBudgetStatus(90, true)).toBe('critical');
    expect(getBudgetStatus(100, true)).toBe('critical');
  });

  it('reports over_budget above 100%', () => {
    expect(getBudgetStatus(100.1, true)).toBe('over_budget');
  });
});
