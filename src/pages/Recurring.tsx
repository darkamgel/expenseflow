import { useCallback, useEffect, useState } from 'react';
import type { Category, PaymentMethod, RecurringExpense } from '../types';
import { categoryRepository, paymentMethodRepository, recurringExpenseRepository } from '../repositories';
import { generateDueRecurringExpenses } from '../services/recurringService';
import { PageHeader, Card, Button, EmptyState, ErrorState, Badge } from '../components/common';
import { Spinner } from '../components/common/Spinner';
import { RecurringFormModal } from '../components/recurring/RecurringFormModal';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { formatDateDisplay } from '../utils/date';

const FREQUENCY_LABEL: Record<RecurringExpense['frequency'], string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  biweekly: 'Every two weeks',
  monthly: 'Monthly',
  quarterly: 'Every three months',
  yearly: 'Yearly',
  custom: 'Custom',
};

export function Recurring() {
  const { formatCurrency } = useSettings();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [series, setSeries] = useState<RecurringExpense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<{ open: boolean; existing?: RecurringExpense }>({ open: false });
  const [generatedBanner, setGeneratedBanner] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await generateDueRecurringExpenses();
      if (result.createdExpenses.length > 0) {
        setGeneratedBanner(
          `Generated ${result.createdExpenses.length} expense${result.createdExpenses.length === 1 ? '' : 's'} from ${result.updatedSeries.length} recurring series.`
        );
      }
      const [all, cats, methods] = await Promise.all([
        recurringExpenseRepository.getAll(),
        categoryRepository.getActive(),
        paymentMethodRepository.getActive(),
      ]);
      setSeries(all.sort((a, b) => a.nextOccurrence.localeCompare(b.nextOccurrence)));
      setCategories(cats);
      setPaymentMethods(methods);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load recurring expenses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const methodById = new Map(paymentMethods.map((m) => [m.id, m]));

  const handleToggleActive = async (item: RecurringExpense) => {
    await recurringExpenseRepository.update(item.id, { active: !item.active });
    await load();
  };

  const handleToggleAutoGenerate = async (item: RecurringExpense) => {
    await recurringExpenseRepository.update(item.id, { autoGenerate: !item.autoGenerate });
    await load();
  };

  const handleDelete = async (item: RecurringExpense) => {
    const ok = await confirm({
      title: 'Delete recurring expense',
      message: `Delete "${item.title}"? Past expenses already generated from it will stay in your transactions.`,
      danger: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await recurringExpenseRepository.delete(item.id);
    showToast('Recurring expense deleted.', 'success');
    await load();
  };

  return (
    <div>
      <PageHeader
        title="Recurring Expenses"
        description="Expenses that repeat on a schedule are generated automatically when you open the app."
        actions={<Button onClick={() => setFormState({ open: true })}>+ Add recurring expense</Button>}
      />

      {generatedBanner && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          {generatedBanner}
        </div>
      )}

      {loading && <Spinner label="Loading recurring expenses…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && series.length === 0 && (
        <EmptyState
          icon="🔁"
          title="No recurring expenses"
          description="Set up subscriptions, rent, or other repeating costs so they're tracked automatically."
          action={<Button onClick={() => setFormState({ open: true })}>Add recurring expense</Button>}
        />
      )}

      {!loading && !error && series.length > 0 && (
        <div className="space-y-3">
          {series.map((item) => {
            const category = categoryById.get(item.categoryId);
            const method = item.paymentMethodId ? methodById.get(item.paymentMethodId) : undefined;
            return (
              <Card key={item.id} className={!item.active ? 'opacity-60' : ''}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{item.title}</p>
                      {!item.active && <Badge>Inactive</Badge>}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {category ? `${category.icon} ${category.name}` : 'Uncategorized'} · {FREQUENCY_LABEL[item.frequency]}
                      {method ? ` · ${method.name}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      Next occurrence: <strong>{formatDateDisplay(item.nextOccurrence)}</strong>
                      {item.endDate && <> · Ends {formatDateDisplay(item.endDate)}</>}
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(item.amount)}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
                  <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <input type="checkbox" checked={item.autoGenerate} onChange={() => handleToggleAutoGenerate(item)} className="h-4 w-4 rounded border-slate-300" />
                    Auto-generate
                  </label>
                  <label className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <input type="checkbox" checked={item.active} onChange={() => handleToggleActive(item)} className="h-4 w-4 rounded border-slate-300" />
                    Active
                  </label>
                  <div className="ml-auto flex gap-1">
                    <button onClick={() => setFormState({ open: true, existing: item })} className="rounded-lg px-2 py-1 font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(item)} className="rounded-lg px-2 py-1 font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950">
                      Delete
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <RecurringFormModal
        open={formState.open}
        onClose={() => setFormState({ open: false })}
        existing={formState.existing}
        onSaved={async () => {
          setFormState({ open: false });
          await load();
        }}
      />
    </div>
  );
}
