import type { ReactNode } from 'react';
import type { BudgetStatus } from '../../utils/calculations';

const STATUS_CLASSES: Record<BudgetStatus, string> = {
  safe: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  critical: 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  over_budget: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  no_budget: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export function StatusBadge({ status, children }: { status: BudgetStatus; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[status]}`}>{children}</span>
  );
}

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300 ${className}`}
    >
      {children}
    </span>
  );
}
