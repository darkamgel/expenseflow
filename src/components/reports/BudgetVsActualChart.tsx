import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { BudgetVsActualPoint } from '../../services/calculationService';
import { CATEGORICAL_PALETTE, CHART_AXIS_TICK, CHART_GRID_CLASS } from '../../utils/chartColors';
import { EmptyState } from '../common/EmptyState';
import { formatMonthLabel } from '../../utils/date';

interface BudgetVsActualChartProps {
  data: BudgetVsActualPoint[];
  formatCurrency: (amount: number) => string;
}

export function BudgetVsActualChart({ data, formatCurrency }: BudgetVsActualChartProps) {
  const hasData = data.some((d) => d.budget > 0 || d.actual > 0);
  if (!hasData) {
    return <EmptyState icon="📊" title="No budget or spending data" description="Create a budget and add expenses to compare them." />;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className={CHART_GRID_CLASS} />
          <XAxis dataKey="label" tick={CHART_AXIS_TICK} tickFormatter={(v: string) => { const [y, m] = v.split('-').map(Number); return formatMonthLabel(y, m).slice(0, 3); }} />
          <YAxis tick={CHART_AXIS_TICK} tickFormatter={(v) => formatCurrency(v)} width={80} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} labelFormatter={(v) => { const [y, m] = String(v).split('-').map(Number); return formatMonthLabel(y, m); }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="budget" name="Budget" fill={CATEGORICAL_PALETTE[0]} radius={[4, 4, 0, 0]} />
          <Bar dataKey="actual" name="Actual" fill={CATEGORICAL_PALETTE[1]} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
