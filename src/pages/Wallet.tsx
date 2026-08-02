import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Expense, PaymentMethod } from '../types';
import { expenseRepository, paymentMethodRepository } from '../repositories';
import { PageHeader, Button, EmptyState, ErrorState } from '../components/common';
import { Spinner } from '../components/common/Spinner';
import { PaymentMethodCard } from '../components/wallet/PaymentMethodCard';
import { PaymentMethodFormModal } from '../components/wallet/PaymentMethodFormModal';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { getBudgetMonthRange, getCurrentBudgetMonth } from '../utils/date';

export function Wallet() {
  const { settings, formatCurrency } = useSettings();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();

  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [formState, setFormState] = useState<{ open: boolean; existing?: PaymentMethod }>({ open: false });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [methodList, expenseList] = await Promise.all([paymentMethodRepository.getAll(), expenseRepository.getAll()]);
      setMethods(methodList);
      setExpenses(expenseList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load wallet.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { year, month } = getCurrentBudgetMonth(settings?.firstDayOfBudgetMonth ?? 1);
  const { start, end } = getBudgetMonthRange(year, month, settings?.firstDayOfBudgetMonth ?? 1);

  const handleArchiveToggle = async (method: PaymentMethod) => {
    if (method.status === 'active') {
      await paymentMethodRepository.archive(method.id);
      showToast(`${method.name} archived.`, 'info');
    } else {
      await paymentMethodRepository.unarchive(method.id);
      showToast(`${method.name} restored.`, 'info');
    }
    await load();
  };

  const handleDelete = async (method: PaymentMethod) => {
    const inUse = await paymentMethodRepository.isInUse(method.id);
    if (inUse) {
      const archiveInstead = await confirm({
        title: 'Payment method in use',
        message: `${method.name} is connected to existing expenses and can't be deleted. Archive it instead?`,
        confirmLabel: 'Archive',
      });
      if (archiveInstead) {
        await paymentMethodRepository.archive(method.id);
        showToast(`${method.name} archived.`, 'info');
        await load();
      }
      return;
    }
    const ok = await confirm({ title: 'Delete payment method', message: `Delete ${method.name}? This cannot be undone.`, danger: true, confirmLabel: 'Delete' });
    if (!ok) return;
    await paymentMethodRepository.delete(method.id);
    showToast(`${method.name} deleted.`, 'success');
    await load();
  };

  const visibleMethods = methods.filter((m) => (showArchived ? true : m.status === 'active'));

  return (
    <div>
      <PageHeader
        title="Wallet"
        description="Cards, accounts, and cash you spend from — never full numbers, CVVs, or banking credentials."
        actions={<Button onClick={() => setFormState({ open: true })}>+ Add payment method</Button>}
      />

      {loading && <Spinner label="Loading wallet…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && (
        <>
          {methods.some((m) => m.status === 'archived') && (
            <div className="mb-3 flex justify-end">
              <button onClick={() => setShowArchived((v) => !v)} className="text-xs font-medium text-slate-500 hover:underline dark:text-slate-400">
                {showArchived ? 'Hide archived' : 'Show archived'}
              </button>
            </div>
          )}

          {visibleMethods.length === 0 ? (
            <EmptyState
              icon="💳"
              title="No payment methods yet"
              description="Add a card, bank account, or cash so you can track spending by source."
              action={<Button onClick={() => setFormState({ open: true })}>Add payment method</Button>}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleMethods.map((method) => (
                <PaymentMethodCard
                  key={method.id}
                  method={method}
                  allExpenses={expenses}
                  monthStart={start}
                  monthEnd={end}
                  formatCurrency={formatCurrency}
                  onEdit={() => setFormState({ open: true, existing: method })}
                  onArchiveToggle={() => handleArchiveToggle(method)}
                  onDelete={() => handleDelete(method)}
                  onViewExpenses={() => navigate(`/transactions?paymentMethodId=${method.id}`)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <PaymentMethodFormModal
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
