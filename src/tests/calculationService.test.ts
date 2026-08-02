import { describe, expect, it } from 'vitest';
import {
  computeCategoryBreakdown,
  computeDailySpending,
  computeIncomeExpenseTotals,
  computeMonthSummary,
  computePaymentMethodBreakdown,
} from '../services/calculationService';
import type { Category, Expense, Income, PaymentMethod } from '../types';

function makeExpense(overrides: Partial<Expense>): Expense {
  return {
    id: overrides.id ?? Math.random().toString(36),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    title: 'Test expense',
    amount: 1000,
    categoryId: 'cat-1',
    date: '2026-07-15',
    time: '12:00',
    tags: [],
    ...overrides,
  };
}

const categories: Category[] = [
  { id: 'cat-1', name: 'Food', icon: '🍽️', color: '#f97316', isDefault: true, status: 'active', sortOrder: 0, createdAt: 0, updatedAt: 0 },
  { id: 'cat-2', name: 'Rent', icon: '🏠', color: '#6366f1', isDefault: true, status: 'active', sortOrder: 1, createdAt: 0, updatedAt: 0 },
];

describe('computeMonthSummary', () => {
  it('handles an empty dataset without NaN/Infinity', () => {
    const summary = computeMonthSummary([], null, '2026-07-01', '2026-07-31');
    expect(summary.totalExpenses).toBe(0);
    expect(summary.percentUsed).toBe(0);
    expect(summary.status).toBe('no_budget');
    expect(Number.isFinite(summary.averageDailySpending)).toBe(true);
    expect(summary.largestExpense).toBeNull();
  });

  it('handles a zero budget without dividing by zero', () => {
    const expenses = [makeExpense({ amount: 500 })];
    const summary = computeMonthSummary(expenses, 0, '2026-07-01', '2026-07-31');
    expect(summary.status).toBe('no_budget');
    expect(Number.isFinite(summary.percentUsed)).toBe(true);
  });

  it('finds the largest expense and top category', () => {
    const expenses = [
      makeExpense({ amount: 500, categoryId: 'cat-1' }),
      makeExpense({ amount: 1500, categoryId: 'cat-2' }),
      makeExpense({ amount: 300, categoryId: 'cat-2' }),
    ];
    const summary = computeMonthSummary(expenses, 5000, '2026-07-01', '2026-07-31');
    expect(summary.largestExpense?.amount).toBe(1500);
    expect(summary.topCategoryId).toBe('cat-2');
    expect(summary.topCategoryAmount).toBe(1800);
    expect(summary.transactionCount).toBe(3);
  });
});

describe('computeCategoryBreakdown', () => {
  it('groups spending by category and computes percentages', () => {
    const expenses = [
      makeExpense({ amount: 700, categoryId: 'cat-1' }),
      makeExpense({ amount: 300, categoryId: 'cat-2' }),
    ];
    const breakdown = computeCategoryBreakdown(expenses, categories, 0);
    const food = breakdown.find((b) => b.categoryId === 'cat-1');
    expect(food?.amount).toBe(700);
    expect(food?.percent).toBe(70);
  });

  it('returns an empty array for no expenses', () => {
    expect(computeCategoryBreakdown([], categories)).toEqual([]);
  });

  it('groups small categories into Other above the threshold', () => {
    const expenses = [
      makeExpense({ amount: 9700, categoryId: 'cat-1' }),
      makeExpense({ amount: 200, categoryId: 'cat-2' }),
      makeExpense({ amount: 100, categoryId: 'cat-3' }),
    ];
    const catsWithThird: Category[] = [
      ...categories,
      { id: 'cat-3', name: 'Misc', icon: '📦', color: '#000', isDefault: false, status: 'active', sortOrder: 2, createdAt: 0, updatedAt: 0 },
    ];
    const breakdown = computeCategoryBreakdown(expenses, catsWithThird, 3);
    expect(breakdown.some((b) => b.name === 'Other')).toBe(true);
    expect(breakdown.find((b) => b.categoryId === 'cat-1')?.amount).toBe(9700);
  });
});

describe('computePaymentMethodBreakdown', () => {
  const methods: PaymentMethod[] = [
    { id: 'pm-1', name: 'Cash', type: 'cash', color: '#000', status: 'active', createdAt: 0, updatedAt: 0 },
  ];

  it('ignores expenses without a payment method', () => {
    const expenses = [makeExpense({ amount: 100, paymentMethodId: undefined }), makeExpense({ amount: 200, paymentMethodId: 'pm-1' })];
    const breakdown = computePaymentMethodBreakdown(expenses, methods);
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].amount).toBe(200);
    expect(breakdown[0].transactionCount).toBe(1);
  });
});

describe('computeDailySpending', () => {
  it('fills every day of the month with zero when there is no expense', () => {
    const points = computeDailySpending([], 2026, 2);
    expect(points).toHaveLength(28);
    expect(points.every((p) => p.amount === 0)).toBe(true);
  });

  it('attributes spending to the correct day and leaves others at zero', () => {
    const expenses = [makeExpense({ amount: 500, date: '2026-02-10' })];
    const points = computeDailySpending(expenses, 2026, 2);
    expect(points.find((p) => p.date === '2026-02-10')?.amount).toBe(500);
    expect(points.find((p) => p.date === '2026-02-11')?.amount).toBe(0);
  });
});

function makeIncome(overrides: Partial<Income>): Income {
  return {
    id: overrides.id ?? Math.random().toString(36),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    title: 'Test income',
    amount: 1000,
    date: '2026-07-15',
    recurring: false,
    ...overrides,
  };
}

describe('computeIncomeExpenseTotals', () => {
  it('defaults starting balance to 0 and matches flow-based net balance', () => {
    const totals = computeIncomeExpenseTotals([makeIncome({ amount: 1000 })], [makeExpense({ amount: 400 })]);
    expect(totals.startingBalance).toBe(0);
    expect(totals.netBalance).toBe(600);
    expect(totals.savingsRate).toBe(60);
  });

  it('adds starting balance into net balance without affecting the flow-based savings rate', () => {
    const totals = computeIncomeExpenseTotals([makeIncome({ amount: 1000 })], [makeExpense({ amount: 400 })], 5000);
    expect(totals.netBalance).toBe(5600);
    expect(totals.savingsRate).toBe(60);
  });

  it('handles no income without producing NaN/Infinity', () => {
    const totals = computeIncomeExpenseTotals([], [makeExpense({ amount: 100 })], 200);
    expect(Number.isFinite(totals.savingsRate)).toBe(true);
    expect(totals.netBalance).toBe(100);
  });
});
