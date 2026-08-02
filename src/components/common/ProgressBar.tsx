import type { BudgetStatus } from '../../utils/calculations';
import { clamp } from '../../utils/calculations';

const STATUS_COLORS: Record<BudgetStatus, string> = {
  safe: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-orange-500',
  over_budget: 'bg-red-600',
  no_budget: 'bg-slate-300 dark:bg-slate-700',
};

interface ProgressBarProps {
  percent: number;
  status: BudgetStatus;
  label?: string;
  className?: string;
}

export function ProgressBar({ percent, status, label, className = '' }: ProgressBarProps) {
  const width = clamp(percent, 0, 100);
  return (
    <div className={className}>
      {label && <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">{label}</div>}
      <div
        className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        role="progressbar"
        aria-valuenow={Math.round(clamp(percent, 0, 999))}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full rounded-full transition-all duration-300 ${STATUS_COLORS[status]}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
