import { describe, expect, it } from 'vitest';
import { addDays, addMonths, getBudgetMonthRange, isDateKeyInRange, isValidDateKey } from '../utils/date';

describe('addDays / addMonths', () => {
  it('adds days across a month boundary without a timezone shift', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
  });

  it('adds months and clamps to a valid day', () => {
    expect(addMonths('2026-01-15', 1)).toBe('2026-02-15');
  });
});

describe('isValidDateKey', () => {
  it('accepts well-formed date keys', () => {
    expect(isValidDateKey('2026-07-31')).toBe(true);
  });

  it('rejects malformed input', () => {
    expect(isValidDateKey('not-a-date')).toBe(false);
    expect(isValidDateKey(undefined)).toBe(false);
    expect(isValidDateKey('')).toBe(false);
  });
});

describe('getBudgetMonthRange', () => {
  it('returns the full calendar month when the first day is 1', () => {
    const { start, end } = getBudgetMonthRange(2026, 2, 1);
    expect(start).toBe('2026-02-01');
    expect(end).toBe('2026-02-28');
  });

  it('shifts the range when the budget month starts mid-month', () => {
    const { start, end } = getBudgetMonthRange(2026, 3, 15);
    expect(start).toBe('2026-03-15');
    expect(end).toBe('2026-04-14');
  });
});

describe('isDateKeyInRange', () => {
  it('includes both endpoints', () => {
    expect(isDateKeyInRange('2026-07-01', '2026-07-01', '2026-07-31')).toBe(true);
    expect(isDateKeyInRange('2026-07-31', '2026-07-01', '2026-07-31')).toBe(true);
  });

  it('excludes dates outside the range', () => {
    expect(isDateKeyInRange('2026-08-01', '2026-07-01', '2026-07-31')).toBe(false);
  });
});
