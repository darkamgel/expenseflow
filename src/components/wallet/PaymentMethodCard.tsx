import type { PaymentMethod } from '../../types';
import { computePaymentMethodStats } from '../../services/calculationService';
import type { Expense } from '../../types';
import { ProgressBar } from '../common/ProgressBar';
import { getBudgetStatus } from '../../utils/calculations';
import { formatDateDisplay } from '../../utils/date';
import { formatPercent } from '../../utils/currency';

const TYPE_ICON: Record<PaymentMethod['type'], string> = {
  credit_card: '💳',
  debit_card: '💳',
  bank_account: '🏦',
  cash: '💵',
  digital_wallet: '📱',
  other: '🪙',
};

const TYPE_LABEL: Record<PaymentMethod['type'], string> = {
  credit_card: 'Credit card',
  debit_card: 'Debit card',
  bank_account: 'Bank account',
  cash: 'Cash',
  digital_wallet: 'Digital wallet',
  other: 'Other',
};

interface PaymentMethodCardProps {
  method: PaymentMethod;
  allExpenses: Expense[];
  monthStart: string;
  monthEnd: string;
  formatCurrency: (amount: number) => string;
  onEdit: () => void;
  onArchiveToggle: () => void;
  onDelete: () => void;
  onViewExpenses: () => void;
}

export function PaymentMethodCard({
  method,
  allExpenses,
  monthStart,
  monthEnd,
  formatCurrency,
  onEdit,
  onArchiveToggle,
  onDelete,
  onViewExpenses,
}: PaymentMethodCardProps) {
  const stats = computePaymentMethodStats(method, allExpenses, monthStart, monthEnd);
  const hasCreditLimit = Boolean(method.creditLimit);
  const creditStatus = getBudgetStatus(stats.creditLimitPercentUsed, hasCreditLimit);

  return (
    <div className={`overflow-hidden rounded-2xl shadow-sm ${method.status === 'archived' ? 'opacity-60' : ''}`}>
      <div
        className="p-4 text-white"
        style={{ background: `linear-gradient(135deg, ${method.color}, ${method.color}cc)` }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/70">{TYPE_LABEL[method.type]}</p>
            <p className="mt-0.5 text-lg font-semibold">{method.name}</p>
          </div>
          <span className="text-2xl" aria-hidden="true">{TYPE_ICON[method.type]}</span>
        </div>
        <div className="mt-6 flex items-end justify-between text-sm">
          <span className="font-mono tracking-widest text-white/90">
            {method.lastFourDigits ? `•••• ${method.lastFourDigits}` : ''}
          </span>
          {method.issuer && <span className="text-white/80">{method.issuer}</span>}
        </div>
      </div>

      <div className="border border-t-0 border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Total spent</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(stats.totalSpent)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Transactions</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{stats.transactionCount}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">This month</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(stats.monthSpent)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Due date</p>
            <p className="font-semibold text-slate-900 dark:text-slate-100">{stats.upcomingDueDate ? formatDateDisplay(stats.upcomingDueDate) : '—'}</p>
          </div>
        </div>

        {hasCreditLimit && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Credit used ({formatPercent(stats.creditLimitPercentUsed)})</span>
              <span>{formatCurrency(stats.availableCredit)} available</span>
            </div>
            <ProgressBar percent={stats.creditLimitPercentUsed} status={creditStatus} />
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
          <button onClick={onViewExpenses} className="rounded-lg px-2 py-1 font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            View expenses
          </button>
          <button onClick={onEdit} className="rounded-lg px-2 py-1 font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            Edit
          </button>
          <button onClick={onArchiveToggle} className="rounded-lg px-2 py-1 font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
            {method.status === 'active' ? 'Archive' : 'Restore'}
          </button>
          <button onClick={onDelete} className="rounded-lg px-2 py-1 font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
