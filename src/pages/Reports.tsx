import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Budget, Category, Expense, Income, PaymentMethod } from '../types';
import { budgetRepository, categoryRepository, expenseRepository, incomeRepository, paymentMethodRepository } from '../repositories';
import { PageHeader, Card, ErrorState, ProgressBar, StatusBadge } from '../components/common';
import { Spinner } from '../components/common/Spinner';
import { ReportFilters, type ReportFilterState } from '../components/reports/ReportFilters';
import { CategoryDonutChart } from '../components/reports/CategoryDonutChart';
import { MonthlyTrendChart } from '../components/reports/MonthlyTrendChart';
import { BudgetVsActualChart } from '../components/reports/BudgetVsActualChart';
import { PaymentMethodBarChart } from '../components/reports/PaymentMethodBarChart';
import { DailySpendingChart } from '../components/reports/DailySpendingChart';
import { CumulativeSpendingChart } from '../components/reports/CumulativeSpendingChart';
import { IncomeExpenseTrendChart } from '../components/reports/IncomeExpenseTrendChart';
import { useSettings } from '../contexts/SettingsContext';
import {
  computeBudgetVsActual,
  computeCategoryBreakdown,
  computeCategoryBudgetPerformance,
  computeCumulativeSpending,
  computeDailySpending,
  computeIncomeVsExpense,
  computeMonthlyTrend,
  computePaymentMethodBreakdown,
} from '../services/calculationService';
import { budgetRepository as budgetRepo, categoryBudgetRepository } from '../repositories';
import { getMonthYear, getRangeForPreset, isDateKeyInRange, monthsForPreset } from '../utils/date';
import { BUDGET_STATUS_LABEL } from '../utils/calculations';
import { formatPercent } from '../utils/currency';

const DEFAULT_FILTERS: ReportFilterState = {
  preset: 'current_month',
  customFrom: '',
  customTo: '',
  categoryId: '',
  paymentMethodId: '',
};

export function Reports() {
  const { formatCurrency } = useSettings();

  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allIncomes, setAllIncomes] = useState<Income[]>([]);
  const [allBudgets, setAllBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilterState>(DEFAULT_FILTERS);
  const [categoryBudgetPerf, setCategoryBudgetPerf] = useState<ReturnType<typeof computeCategoryBudgetPerformance>>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [expenses, incomes, budgets, cats, methods] = await Promise.all([
        expenseRepository.getAll(),
        incomeRepository.getAll(),
        budgetRepository.getAll(),
        categoryRepository.getAll(),
        paymentMethodRepository.getAll(),
      ]);
      setAllExpenses(expenses);
      setAllIncomes(incomes);
      setAllBudgets(budgets);
      setCategories(cats);
      setPaymentMethods(methods);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const range = useMemo(
    () => getRangeForPreset(filters.preset, { from: filters.customFrom || '2000-01-01', to: filters.customTo || filters.customFrom || '2100-01-01' }),
    [filters.preset, filters.customFrom, filters.customTo]
  );

  const filteredExpenses = useMemo(() => {
    return allExpenses.filter((e) => {
      if (filters.categoryId && e.categoryId !== filters.categoryId) return false;
      if (filters.paymentMethodId && e.paymentMethodId !== filters.paymentMethodId) return false;
      return true;
    });
  }, [allExpenses, filters.categoryId, filters.paymentMethodId]);

  const periodExpenses = useMemo(
    () => filteredExpenses.filter((e) => isDateKeyInRange(e.date, range.from, range.to)),
    [filteredExpenses, range]
  );

  const trendMonths = useMemo(() => monthsForPreset(filters.preset, range), [filters.preset, range]);
  const categoryBreakdown = useMemo(() => computeCategoryBreakdown(periodExpenses, categories), [periodExpenses, categories]);
  const monthlyTrend = useMemo(() => computeMonthlyTrend(filteredExpenses, trendMonths), [filteredExpenses, trendMonths]);
  const budgetVsActual = useMemo(() => computeBudgetVsActual(filteredExpenses, allBudgets, trendMonths), [filteredExpenses, allBudgets, trendMonths]);
  const paymentMethodBreakdown = useMemo(() => computePaymentMethodBreakdown(periodExpenses, paymentMethods), [periodExpenses, paymentMethods]);
  const incomeVsExpense = useMemo(() => computeIncomeVsExpense(allIncomes, filteredExpenses, trendMonths), [allIncomes, filteredExpenses, trendMonths]);

  const { year: dailyYear, month: dailyMonth } = getMonthYear(range.to);
  const dailySpending = useMemo(() => computeDailySpending(periodExpenses, dailyYear, dailyMonth), [periodExpenses, dailyYear, dailyMonth]);

  const [selectedMonthBudget, setSelectedMonthBudget] = useState<Budget | undefined>(undefined);
  useEffect(() => {
    (async () => {
      const budget = await budgetRepo.getForMonth(dailyYear, dailyMonth);
      setSelectedMonthBudget(budget);
      if (budget) {
        const catBudgets = await categoryBudgetRepository.getForBudget(budget.id);
        const monthExpenses = allExpenses.filter((e) => getMonthYear(e.date).year === dailyYear && getMonthYear(e.date).month === dailyMonth);
        setCategoryBudgetPerf(computeCategoryBudgetPerformance(catBudgets, monthExpenses, categories));
      } else {
        setCategoryBudgetPerf([]);
      }
    })();
  }, [dailyYear, dailyMonth, allExpenses, categories]);

  const cumulativeSpending = useMemo(
    () => computeCumulativeSpending(periodExpenses, dailyYear, dailyMonth, selectedMonthBudget?.totalAmount ?? 0),
    [periodExpenses, dailyYear, dailyMonth, selectedMonthBudget]
  );

  return (
    <div>
      <PageHeader title="Reports" description="Every chart updates automatically as you add, edit, import, or delete records." />

      <Card className="mb-5">
        <ReportFilters filters={filters} onChange={setFilters} categories={categories} paymentMethods={paymentMethods} onReset={() => setFilters(DEFAULT_FILTERS)} />
      </Card>

      {loading && <Spinner label="Loading reports…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Spending by category</h2>
            <CategoryDonutChart data={categoryBreakdown} formatCurrency={formatCurrency} />
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Monthly spending trend</h2>
            <MonthlyTrendChart data={monthlyTrend} formatCurrency={formatCurrency} />
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Budget vs. actual spending</h2>
            <BudgetVsActualChart data={budgetVsActual} formatCurrency={formatCurrency} />
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Spending by payment method</h2>
            <PaymentMethodBarChart data={paymentMethodBreakdown} formatCurrency={formatCurrency} />
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Daily spending trend</h2>
            <DailySpendingChart data={dailySpending} formatCurrency={formatCurrency} />
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Cumulative monthly spending</h2>
            <CumulativeSpendingChart data={cumulativeSpending} hasBudget={Boolean(selectedMonthBudget)} formatCurrency={formatCurrency} />
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Income vs. expenses</h2>
            <IncomeExpenseTrendChart data={incomeVsExpense} formatCurrency={formatCurrency} />
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Category budget performance</h2>
            {categoryBudgetPerf.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No category budgets set for this period.</p>
            ) : (
              <div className="space-y-3">
                {categoryBudgetPerf.map((item) => (
                  <div key={item.categoryId}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-slate-800 dark:text-slate-100">{item.categoryName}</span>
                      <StatusBadge status={item.status}>{BUDGET_STATUS_LABEL[item.status]}</StatusBadge>
                    </div>
                    <ProgressBar percent={item.percentUsed} status={item.status} />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {formatCurrency(item.spent)} of {formatCurrency(item.planned)} ({formatPercent(item.percentUsed)})
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
