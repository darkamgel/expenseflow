import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Expense, Income } from '../types';
import { expenseRepository, incomeRepository } from '../repositories';
import { PageHeader, Card, Button, EmptyState, ErrorState } from '../components/common';
import { Spinner } from '../components/common/Spinner';
import { StatCard } from '../components/dashboard/StatCard';
import { IncomeFormModal } from '../components/income/IncomeFormModal';
import { StartingBalanceModal } from '../components/income/StartingBalanceModal';
import { IncomeExpenseTrendChart } from '../components/reports/IncomeExpenseTrendChart';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { computeIncomeExpenseTotals, computeIncomeVsExpense } from '../services/calculationService';
import { formatDateDisplay, getLastNMonths } from '../utils/date';
import { formatPercent } from '../utils/currency';

export function Income() {
  const { settings, formatCurrency } = useSettings();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<{ open: boolean; existing?: Income }>({ open: false });
  const [startingBalanceOpen, setStartingBalanceOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [incomeList, expenseList] = await Promise.all([incomeRepository.getAll(), expenseRepository.getAll()]);
      setIncomes(incomeList.sort((a, b) => b.date.localeCompare(a.date)));
      setExpenses(expenseList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load income.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(
    () => computeIncomeExpenseTotals(incomes, expenses, settings?.startingBalance ?? 0),
    [incomes, expenses, settings?.startingBalance]
  );
  const trend = useMemo(() => computeIncomeVsExpense(incomes, expenses, getLastNMonths(6)), [incomes, expenses]);

  const handleDelete = async (income: Income) => {
    const ok = await confirm({ title: 'Delete income', message: `Delete "${income.title}"? This cannot be undone.`, danger: true, confirmLabel: 'Delete' });
    if (!ok) return;
    await incomeRepository.delete(income.id);
    showToast('Income deleted.', 'success');
    await load();
  };

  return (
    <div>
      <PageHeader title="Income" description="Track money coming in alongside your spending." actions={<Button onClick={() => setFormState({ open: true })}>+ Add income</Button>} />

      {loading && <Spinner label="Loading income…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && (
        <>
          <Card className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Starting balance</p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(totals.startingBalance)}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                A one-time lump sum for money you already have. Net balance below adds this to your income and expense
                history &mdash; add income records any time as you receive them, no fixed monthly figure required.
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setStartingBalanceOpen(true)}>
              Edit starting balance
            </Button>
          </Card>

          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total income" icon="💰" value={formatCurrency(totals.totalIncome)} />
            <StatCard label="Total expenses" icon="🧾" value={formatCurrency(totals.totalExpenses)} />
            <StatCard label="Net balance" icon="🏦" value={formatCurrency(totals.netBalance)} accent={totals.netBalance >= 0 ? 'positive' : 'negative'} />
            <StatCard label="Savings rate" icon="📈" value={formatPercent(totals.savingsRate, 1)} />
          </div>

          <Card className="mb-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Income vs. expenses (last 6 months)</h2>
            <IncomeExpenseTrendChart data={trend} formatCurrency={formatCurrency} />
          </Card>

          {incomes.length === 0 ? (
            <EmptyState icon="💰" title="No income recorded yet" description="Add your income sources to see your full financial picture." action={<Button onClick={() => setFormState({ open: true })}>Add income</Button>} />
          ) : (
            <Card padded={false}>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {incomes.map((income) => (
                  <li key={income.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{income.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDateDisplay(income.date)}
                        {income.source ? ` · ${income.source}` : ''}
                        {income.recurring ? ' · Recurring' : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(income.amount)}</span>
                      <button onClick={() => setFormState({ open: true, existing: income })} className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(income)} className="rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950">
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}

      <IncomeFormModal
        open={formState.open}
        onClose={() => setFormState({ open: false })}
        existing={formState.existing}
        onSaved={async () => {
          setFormState({ open: false });
          await load();
        }}
      />

      <StartingBalanceModal open={startingBalanceOpen} onClose={() => setStartingBalanceOpen(false)} />
    </div>
  );
}
