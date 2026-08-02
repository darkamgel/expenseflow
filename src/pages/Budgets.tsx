import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Budget, Category, CategoryBudget, Expense } from '../types';
import { budgetRepository, categoryBudgetRepository, categoryRepository, expenseRepository } from '../repositories';
import { PageHeader, Card, Button, EmptyState, ErrorState, ProgressBar, StatusBadge } from '../components/common';
import { Spinner } from '../components/common/Spinner';
import { BudgetFormModal } from '../components/budgets/BudgetFormModal';
import { CategoryBudgetFormModal } from '../components/budgets/CategoryBudgetFormModal';
import { CategoryBudgetRow } from '../components/budgets/CategoryBudgetRow';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import {
  computeCategoryBudgetPerformance,
  computeEffectiveBudgetAmount,
  computeMonthSummary,
} from '../services/calculationService';
import { addMonths, formatMonthLabel, getBudgetMonthRange, getCurrentBudgetMonth } from '../utils/date';
import { BUDGET_STATUS_LABEL } from '../utils/calculations';
import { formatPercent } from '../utils/currency';

export function Budgets() {
  const { settings, formatCurrency } = useSettings();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const firstDay = settings?.firstDayOfBudgetMonth ?? 1;

  const initial = getCurrentBudgetMonth(firstDay);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [budget, setBudget] = useState<Budget | undefined>(undefined);
  const [previousBudget, setPreviousBudget] = useState<Budget | undefined>(undefined);
  const [previousMonthExpenses, setPreviousMonthExpenses] = useState<Expense[]>([]);
  const [monthExpenses, setMonthExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [allBudgets, setAllBudgets] = useState<Budget[]>([]);

  const [budgetFormOpen, setBudgetFormOpen] = useState(false);
  const [categoryFormState, setCategoryFormState] = useState<{ open: boolean; existing?: CategoryBudget }>({ open: false });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await categoryRepository.ensureSeeded();
      const { start, end } = getBudgetMonthRange(year, month, firstDay);
      const prevKey = addMonths(`${year}-${String(month).padStart(2, '0')}-01`, -1);
      const [prevYear, prevMonth] = prevKey.split('-').map(Number);
      const prevRange = getBudgetMonthRange(prevYear, prevMonth, firstDay);

      const [budgetRecord, prevBudgetRecord, expenses, prevExpenses, cats, sortedBudgets] = await Promise.all([
        budgetRepository.getForMonth(year, month),
        budgetRepository.getForMonth(prevYear, prevMonth),
        expenseRepository.getByDateRange(start, end),
        expenseRepository.getByDateRange(prevRange.start, prevRange.end),
        categoryRepository.getActive(),
        budgetRepository.getAllSorted(),
      ]);

      setBudget(budgetRecord);
      setPreviousBudget(prevBudgetRecord);
      setMonthExpenses(expenses);
      setPreviousMonthExpenses(prevExpenses);
      setCategories(cats);
      setAllBudgets(sortedBudgets);

      if (budgetRecord) {
        const catBudgets = await categoryBudgetRepository.getForBudget(budgetRecord.id);
        setCategoryBudgets(catBudgets);
      } else {
        setCategoryBudgets([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load budgets.');
    } finally {
      setLoading(false);
    }
  }, [year, month, firstDay]);

  useEffect(() => {
    load();
  }, [load]);

  const effectiveBudgetAmount = budget
    ? computeEffectiveBudgetAmount(budget, previousBudget, previousMonthExpenses)
    : 0;

  const { start, end } = useMemo(() => getBudgetMonthRange(year, month, firstDay), [year, month, firstDay]);
  const summary = useMemo(
    () => computeMonthSummary(monthExpenses, budget ? effectiveBudgetAmount : null, start, end),
    [monthExpenses, budget, effectiveBudgetAmount, start, end]
  );

  const categoryPerformance = useMemo(
    () => computeCategoryBudgetPerformance(categoryBudgets, monthExpenses, categories),
    [categoryBudgets, monthExpenses, categories]
  );

  const budgetedCategoryIds = new Set(categoryBudgets.map((cb) => cb.categoryId));
  const availableCategoriesForBudget = categories.filter((c) => !budgetedCategoryIds.has(c.id));

  const goToMonth = (delta: number) => {
    const key = addMonths(`${year}-${String(month).padStart(2, '0')}-01`, delta);
    const [y, m] = key.split('-').map(Number);
    setYear(y);
    setMonth(m);
  };

  const handleCopyPreviousMonth = async () => {
    if (!previousBudget) return;
    await budgetRepository.create({
      year,
      month,
      totalAmount: previousBudget.totalAmount,
      notes: previousBudget.notes,
      rolloverEnabled: previousBudget.rolloverEnabled,
    });
    const prevCategoryBudgets = await categoryBudgetRepository.getForBudget(previousBudget.id);
    const newBudget = await budgetRepository.getForMonth(year, month);
    if (newBudget) {
      await Promise.all(
        prevCategoryBudgets.map((cb) =>
          categoryBudgetRepository.create({ budgetId: newBudget.id, categoryId: cb.categoryId, plannedAmount: cb.plannedAmount })
        )
      );
    }
    showToast('Copied last month’s budget.', 'success');
    await load();
  };

  const handleDeleteCategoryBudget = async (cb: CategoryBudget) => {
    const ok = await confirm({ title: 'Remove category budget', message: 'Remove this category budget for the month?', danger: true, confirmLabel: 'Remove' });
    if (!ok) return;
    await categoryBudgetRepository.delete(cb.id);
    showToast('Category budget removed.', 'success');
    await load();
  };

  return (
    <div>
      <PageHeader
        title="Budgets"
        actions={
          budget ? (
            <Button variant="secondary" onClick={() => setBudgetFormOpen(true)}>
              Edit budget
            </Button>
          ) : undefined
        }
      />

      <Card className="mb-5">
        <div className="flex items-center justify-between">
          <button onClick={() => goToMonth(-1)} aria-label="Previous month" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            ←
          </button>
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{formatMonthLabel(year, month)}</span>
          <button onClick={() => goToMonth(1)} aria-label="Next month" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            →
          </button>
        </div>
      </Card>

      {loading && <Spinner label="Loading budgets…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && !budget && (
        <EmptyState
          icon="🎯"
          title={`No budget for ${formatMonthLabel(year, month)}`}
          description="Create a budget to track your spending against a monthly goal."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setBudgetFormOpen(true)}>Create budget</Button>
              {previousBudget && (
                <Button variant="secondary" onClick={handleCopyPreviousMonth}>
                  Copy previous month
                </Button>
              )}
            </div>
          }
        />
      )}

      {!loading && !error && budget && (
        <>
          <Card className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Overall budget</h2>
              <StatusBadge status={summary.status}>{BUDGET_STATUS_LABEL[summary.status]}</StatusBadge>
            </div>
            <ProgressBar percent={summary.percentUsed} status={summary.status} />
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Planned</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(effectiveBudgetAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Spent</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(summary.totalExpenses)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Remaining</p>
                <p className={`font-semibold ${summary.remaining < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                  {formatCurrency(summary.remaining)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">Used</p>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{formatPercent(summary.percentUsed)}</p>
              </div>
            </div>
            {budget.rolloverEnabled && (
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Rollover enabled — base budget {formatCurrency(budget.totalAmount)}, adjusted with last month's unused amount.
              </p>
            )}
            {budget.notes && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Note: {budget.notes}</p>}
          </Card>

          <Card className="mb-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Category budgets</h2>
              <Button size="sm" onClick={() => setCategoryFormState({ open: true })} disabled={availableCategoriesForBudget.length === 0}>
                + Add category budget
              </Button>
            </div>
            {categoryPerformance.length === 0 ? (
              <EmptyState icon="🏷️" title="No category budgets yet" description="Break your budget down by category for more detailed tracking." />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {categoryPerformance.map((item) => {
                  const cb = categoryBudgets.find((c) => c.categoryId === item.categoryId);
                  if (!cb) return null;
                  return (
                    <CategoryBudgetRow
                      key={item.categoryId}
                      item={item}
                      formatCurrency={formatCurrency}
                      onEdit={() => setCategoryFormState({ open: true, existing: cb })}
                      onDelete={() => handleDeleteCategoryBudget(cb)}
                    />
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Budget history</h2>
        {allBudgets.length === 0 ? (
          <p className="text-sm text-slate-400">No budgets created yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {allBudgets.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => {
                    setYear(b.year);
                    setMonth(b.month);
                  }}
                  className={`flex w-full items-center justify-between px-1 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 ${
                    b.year === year && b.month === month ? 'font-semibold text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span>{formatMonthLabel(b.year, b.month)}</span>
                  <span>{formatCurrency(b.totalAmount)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <BudgetFormModal
        open={budgetFormOpen}
        onClose={() => setBudgetFormOpen(false)}
        year={year}
        month={month}
        existingBudget={budget}
        prefillAmount={settings?.defaultMonthlyBudget}
        onSaved={async () => {
          setBudgetFormOpen(false);
          await load();
        }}
      />

      {budget && (
        <CategoryBudgetFormModal
          open={categoryFormState.open}
          onClose={() => setCategoryFormState({ open: false })}
          budgetId={budget.id}
          availableCategories={categoryFormState.existing ? categories : availableCategoriesForBudget}
          existing={categoryFormState.existing}
          onSaved={async () => {
            setCategoryFormState({ open: false });
            await load();
          }}
        />
      )}
    </div>
  );
}
