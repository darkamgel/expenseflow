import type { CategoryBudgetPerformanceItem } from '../../services/calculationService';
import { ProgressBar } from '../common/ProgressBar';
import { StatusBadge } from '../common/Badge';
import { BUDGET_STATUS_LABEL } from '../../utils/calculations';
import { formatPercent } from '../../utils/currency';

interface CategoryBudgetRowProps {
  item: CategoryBudgetPerformanceItem;
  formatCurrency: (amount: number) => string;
  onEdit: () => void;
  onDelete: () => void;
}

export function CategoryBudgetRow({ item, formatCurrency, onEdit, onDelete }: CategoryBudgetRowProps) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{item.categoryName}</span>
        <StatusBadge status={item.status}>{BUDGET_STATUS_LABEL[item.status]}</StatusBadge>
      </div>
      <ProgressBar percent={item.percentUsed} status={item.status} className="mt-2" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-xs text-slate-500 dark:text-slate-400">
        <span>
          {formatCurrency(item.spent)} of {formatCurrency(item.planned)} ({formatPercent(item.percentUsed)})
        </span>
        <span className={item.remaining < 0 ? 'font-medium text-red-500' : ''}>
          {item.remaining < 0 ? `${formatCurrency(Math.abs(item.remaining))} over` : `${formatCurrency(item.remaining)} left`}
        </span>
      </div>
      <div className="mt-2 flex justify-end gap-1">
        <button onClick={onEdit} className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
          Edit
        </button>
        <button onClick={onDelete} className="rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950">
          Remove
        </button>
      </div>
    </div>
  );
}
