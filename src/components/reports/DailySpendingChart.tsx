import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { DailySpendingPoint } from '../../services/calculationService';
import { CATEGORICAL_PALETTE, CHART_AXIS_TICK, CHART_GRID_CLASS } from '../../utils/chartColors';
import { EmptyState } from '../common/EmptyState';
import { formatDateDisplay } from '../../utils/date';

interface DailySpendingChartProps {
  data: DailySpendingPoint[];
  formatCurrency: (amount: number) => string;
}

export function DailySpendingChart({ data, formatCurrency }: DailySpendingChartProps) {
  if (data.length === 0) {
    return <EmptyState icon="📅" title="No data" description="Select a month with expenses to see daily spending." />;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="dailySpendingFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CATEGORICAL_PALETTE[2]} stopOpacity={0.3} />
              <stop offset="100%" stopColor={CATEGORICAL_PALETTE[2]} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className={CHART_GRID_CLASS} />
          <XAxis dataKey="date" tick={CHART_AXIS_TICK} tickFormatter={(v: string) => v.slice(-2)} interval={Math.ceil(data.length / 10)} />
          <YAxis tick={CHART_AXIS_TICK} tickFormatter={(v) => formatCurrency(v)} width={80} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} labelFormatter={(v) => formatDateDisplay(String(v))} />
          <Area type="monotone" dataKey="amount" name="Spending" stroke={CATEGORICAL_PALETTE[2]} fill="url(#dailySpendingFill)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
