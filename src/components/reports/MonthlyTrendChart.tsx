import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { MonthlyTrendPoint } from '../../services/calculationService';
import { CATEGORICAL_PALETTE, CHART_AXIS_TICK, CHART_GRID_CLASS } from '../../utils/chartColors';
import { EmptyState } from '../common/EmptyState';
import { formatMonthLabel } from '../../utils/date';

interface MonthlyTrendChartProps {
  data: MonthlyTrendPoint[];
  formatCurrency: (amount: number) => string;
}

export function MonthlyTrendChart({ data, formatCurrency }: MonthlyTrendChartProps) {
  if (data.length === 0) {
    return <EmptyState icon="📈" title="No data yet" description="Add expenses to see your spending trend." />;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="monthlyTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CATEGORICAL_PALETTE[0]} stopOpacity={0.25} />
              <stop offset="100%" stopColor={CATEGORICAL_PALETTE[0]} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className={CHART_GRID_CLASS} />
          <XAxis dataKey="label" tick={CHART_AXIS_TICK} tickFormatter={(v: string) => { const [y, m] = v.split('-').map(Number); return formatMonthLabel(y, m).slice(0, 3); }} />
          <YAxis tick={CHART_AXIS_TICK} tickFormatter={(v) => formatCurrency(v)} width={80} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} labelFormatter={(v) => { const [y, m] = String(v).split('-').map(Number); return formatMonthLabel(y, m); }} />
          <Area type="monotone" dataKey="total" name="Spending" stroke={CATEGORICAL_PALETTE[0]} fill="url(#monthlyTrendFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
