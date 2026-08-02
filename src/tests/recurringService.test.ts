import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../supabase/client');

import { __resetFakeSupabase } from '../supabase/__mocks__/client';
import { computeNextOccurrence, generateDueRecurringExpenses } from '../services/recurringService';
import { recurringExpenseRepository } from '../repositories/recurringExpenseRepository';
import { expenseRepository } from '../repositories/expenseRepository';
import { categoryRepository } from '../repositories/categoryRepository';

describe('computeNextOccurrence', () => {
  it('advances daily', () => {
    expect(computeNextOccurrence('2026-07-01', { frequency: 'daily' })).toBe('2026-07-02');
  });
  it('advances weekly', () => {
    expect(computeNextOccurrence('2026-07-01', { frequency: 'weekly' })).toBe('2026-07-08');
  });
  it('advances biweekly', () => {
    expect(computeNextOccurrence('2026-07-01', { frequency: 'biweekly' })).toBe('2026-07-15');
  });
  it('advances monthly', () => {
    expect(computeNextOccurrence('2026-07-01', { frequency: 'monthly' })).toBe('2026-08-01');
  });
  it('advances quarterly', () => {
    expect(computeNextOccurrence('2026-07-01', { frequency: 'quarterly' })).toBe('2026-10-01');
  });
  it('advances yearly', () => {
    expect(computeNextOccurrence('2026-07-01', { frequency: 'yearly' })).toBe('2027-07-01');
  });
  it('advances by a custom interval', () => {
    expect(computeNextOccurrence('2026-07-01', { frequency: 'custom', customIntervalDays: 10 })).toBe('2026-07-11');
  });
});

describe('generateDueRecurringExpenses', () => {
  beforeEach(async () => {
    __resetFakeSupabase();
    await categoryRepository.ensureSeeded();
  });

  it('generates a missed expense and advances nextOccurrence', async () => {
    const categories = await categoryRepository.getActive();
    const categoryId = categories[0].id;
    const pastDate = '2020-01-01';

    await recurringExpenseRepository.create({
      title: 'Rent',
      amount: 90000,
      categoryId,
      startDate: pastDate,
      frequency: 'monthly',
      nextOccurrence: pastDate,
      autoGenerate: true,
      reminderEnabled: false,
      active: true,
    });

    const result = await generateDueRecurringExpenses();
    expect(result.createdExpenses.length).toBeGreaterThan(0);
    expect(result.updatedSeries).toHaveLength(1);
    expect(result.updatedSeries[0].nextOccurrence > pastDate).toBe(true);
  });

  it('does not generate duplicate expenses when run twice', async () => {
    const categories = await categoryRepository.getActive();
    const categoryId = categories[0].id;
    const pastDate = '2026-01-01';

    await recurringExpenseRepository.create({
      title: 'Subscription',
      amount: 999,
      categoryId,
      startDate: pastDate,
      frequency: 'monthly',
      nextOccurrence: pastDate,
      autoGenerate: true,
      reminderEnabled: false,
      active: true,
    });

    const first = await generateDueRecurringExpenses();
    const second = await generateDueRecurringExpenses();

    expect(first.createdExpenses.length).toBeGreaterThan(0);
    expect(second.createdExpenses.length).toBe(0);

    const allExpenses = await expenseRepository.getAll();
    const dates = allExpenses.map((e) => e.date);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it('skips series with autoGenerate disabled', async () => {
    const categories = await categoryRepository.getActive();
    const categoryId = categories[0].id;

    await recurringExpenseRepository.create({
      title: 'Manual only',
      amount: 500,
      categoryId,
      startDate: '2020-01-01',
      frequency: 'monthly',
      nextOccurrence: '2020-01-01',
      autoGenerate: false,
      reminderEnabled: false,
      active: true,
    });

    const result = await generateDueRecurringExpenses();
    expect(result.createdExpenses).toHaveLength(0);
  });
});
