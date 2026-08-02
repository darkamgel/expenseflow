import type { Category, Expense, PaymentMethod } from '../../types';
import { formatDateDisplay } from '../../utils/date';

interface ExpenseTableProps {
  expenses: Expense[];
  categoryById: Map<string, Category>;
  paymentMethodById: Map<string, PaymentMethod>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  allSelected: boolean;
  onEdit: (expense: Expense) => void;
  onDuplicate: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  formatCurrency: (amount: number) => string;
}

export function ExpenseTable({
  expenses,
  categoryById,
  paymentMethodById,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allSelected,
  onEdit,
  onDuplicate,
  onDelete,
  formatCurrency,
}: ExpenseTableProps) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 md:block">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          <tr>
            <th className="w-10 px-3 py-2.5">
              <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} aria-label="Select all transactions" className="h-4 w-4 rounded border-slate-300" />
            </th>
            <th className="px-3 py-2.5">Date</th>
            <th className="px-3 py-2.5">Title</th>
            <th className="px-3 py-2.5">Category</th>
            <th className="px-3 py-2.5">Payment method</th>
            <th className="px-3 py-2.5 text-right">Amount</th>
            <th className="px-3 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {expenses.map((expense) => {
            const category = categoryById.get(expense.categoryId);
            const method = expense.paymentMethodId ? paymentMethodById.get(expense.paymentMethodId) : undefined;
            const selected = selectedIds.has(expense.id);
            return (
              <tr key={expense.id} className={selected ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}>
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleSelect(expense.id)}
                    aria-label={`Select ${expense.title}`}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-600 dark:text-slate-300">{formatDateDisplay(expense.date)}</td>
                <td className="px-3 py-2.5">
                  <button onClick={() => onEdit(expense)} className="font-medium text-slate-800 hover:underline dark:text-slate-100">
                    {expense.title}
                  </button>
                  {expense.receiptId && <span className="ml-1.5 text-xs text-slate-400">📎</span>}
                  {expense.merchant && <p className="text-xs text-slate-400">{expense.merchant}</p>}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-600 dark:text-slate-300">
                  {category ? `${category.icon} ${category.name}` : 'Uncategorized'}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-600 dark:text-slate-300">{method?.name ?? '—'}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(expense.amount)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right">
                  <button onClick={() => onDuplicate(expense)} className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                    Duplicate
                  </button>
                  <button onClick={() => onDelete(expense)} className="rounded-lg px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950">
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
