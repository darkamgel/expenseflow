import type { ReactNode } from 'react';
import { Card } from '../common/Card';

interface StatCardProps {
  label: string;
  value: string;
  icon: string;
  sublabel?: string;
  accent?: 'neutral' | 'positive' | 'negative';
  footer?: ReactNode;
}

const ACCENT_CLASSES = {
  neutral: 'text-slate-900 dark:text-slate-100',
  positive: 'text-emerald-600 dark:text-emerald-400',
  negative: 'text-red-600 dark:text-red-400',
};

export function StatCard({ label, value, icon, sublabel, accent = 'neutral', footer }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
        <span className="text-lg" aria-hidden="true">{icon}</span>
      </div>
      <div className={`mt-2 text-xl font-semibold sm:text-2xl ${ACCENT_CLASSES[accent]}`}>{value}</div>
      {sublabel && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{sublabel}</p>}
      {footer}
    </Card>
  );
}
