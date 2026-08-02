import type { Category, Expense, PaymentMethod } from '../../types';
import { formatDateDisplay } from '../../utils/date';

interface ExpenseCardProps {
  expense: Expense;
  category?: Category;
  paymentMethod?: PaymentMethod;
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  formatCurrency: (amount: number) => string;
}

export function ExpenseCard({ expense, category, paymentMethod, selected, onToggleSelect, onEdit, onDuplicate, onDelete, formatCurrency }: ExpenseCardProps) {
  return (
    <div className={`rounded-xl border p-3 ${selected ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800'}`}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="mt-1.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          aria-label={`Select ${expense.title}`}
        />
        <button onClick={onEdit} className="flex flex-1 items-start justify-between gap-2 text-left">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{expense.title}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {category ? `${category.icon} ${category.name}` : 'Uncategorized'} · {formatDateDisplay(expense.date)}
              {paymentMethod ? ` · ${paymentMethod.name}` : ''}
            </p>
            {expense.merchant && <p className="text-xs text-slate-400">{expense.merchant}</p>}
            {expense.receiptId && <span className="mt-1 inline-block text-xs text-slate-400">📎 Receipt attached</span>}
          </div>
          <span className="shrink-0 text-sm font-semibold text-slate-900 dark:text-slate-100">{formatCurrency(expense.amount)}</span>
        </button>
      </div>
      <div className="mt-2 flex justify-end gap-1 border-t border-slate-100 pt-2 dark:border-slate-800">
        <button onClick={onDuplicate} className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
          Duplicate
        </button>
        <button onClick={onEdit} className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
          Edit
        </button>
        <button onClick={onDelete} className="rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950">
          Delete
        </button>
      </div>
    </div>
  );
}
