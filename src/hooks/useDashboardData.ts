import { useCallback, useEffect, useState } from 'react';
import { budgetRepository, categoryRepository, expenseRepository, paymentMethodRepository } from '../repositories';
import type { Budget, Category, Expense, PaymentMethod } from '../types';
import { computeEffectiveBudgetAmount, computeMonthSummary, type MonthSummary } from '../services/calculationService';
import { addMonths, getBudgetMonthRange, getCurrentBudgetMonth } from '../utils/date';
import { useSettings } from '../contexts/SettingsContext';

export interface DashboardData {
  loading: boolean;
  error: string | null;
  budget: Budget | undefined;
  monthExpenses: Expense[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  summary: MonthSummary;
  year: number;
  month: number;
  reload: () => Promise<void>;
}

const EMPTY_SUMMARY: MonthSummary = {
  totalBudget: 0,
  totalExpenses: 0,
  remaining: 0,
  percentUsed: 0,
  status: 'no_budget',
  transactionCount: 0,
  averageDailySpending: 0,
  largestExpense: null,
  topCategoryId: null,
  topCategoryAmount: 0,
  projectedEndOfMonth: 0,
};

export function useDashboardData(): DashboardData {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<Budget | undefined>(undefined);
  const [monthExpenses, setMonthExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [summary, setSummary] = useState<MonthSummary>(EMPTY_SUMMARY);

  const { year, month } = getCurrentBudgetMonth(settings?.firstDayOfBudgetMonth ?? 1);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await categoryRepository.ensureSeeded();
      const { start, end } = getBudgetMonthRange(year, month, settings?.firstDayOfBudgetMonth ?? 1);
      const [budgetRecord, expenses, cats, methods] = await Promise.all([
        budgetRepository.getForMonth(year, month),
        expenseRepository.getByDateRange(start, end),
        categoryRepository.getActive(),
        paymentMethodRepository.getActive(),
      ]);
      setBudget(budgetRecord);
      setMonthExpenses(expenses);
      setCategories(cats);
      setPaymentMethods(methods);

      let effectiveBudget: number | null = budgetRecord ? budgetRecord.totalAmount : null;
      if (budgetRecord?.rolloverEnabled) {
        const prevKey = addMonths(`${year}-${String(month).padStart(2, '0')}-01`, -1);
        const [prevYear, prevMonth] = prevKey.split('-').map(Number);
        const prevRange = getBudgetMonthRange(prevYear, prevMonth, settings?.firstDayOfBudgetMonth ?? 1);
        const [prevBudget, prevExpenses] = await Promise.all([
          budgetRepository.getForMonth(prevYear, prevMonth),
          expenseRepository.getByDateRange(prevRange.start, prevRange.end),
        ]);
        effectiveBudget = computeEffectiveBudgetAmount(budgetRecord, prevBudget, prevExpenses);
      }

      setSummary(computeMonthSummary(expenses, effectiveBudget, start, end));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, settings?.firstDayOfBudgetMonth]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { loading, error, budget, monthExpenses, categories, paymentMethods, summary, year, month, reload };
}
