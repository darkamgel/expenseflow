import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { CumulativePoint } from '../../services/calculationService';
import { CATEGORICAL_PALETTE, CHART_AXIS_TICK, CHART_GRID_CLASS } from '../../utils/chartColors';
import { EmptyState } from '../common/EmptyState';
import { formatDateDisplay } from '../../utils/date';

interface CumulativeSpendingChartProps {
  data: CumulativePoint[];
  hasBudget: boolean;
  formatCurrency: (amount: number) => string;
}

export function CumulativeSpendingChart({ data, hasBudget, formatCurrency }: CumulativeSpendingChartProps) {
  if (data.length === 0) {
    return <EmptyState icon="📉" title="No data" description="Select a month with expenses to see cumulative spending." />;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className={CHART_GRID_CLASS} />
          <XAxis dataKey="date" tick={CHART_AXIS_TICK} tickFormatter={(v: string) => v.slice(-2)} interval={Math.ceil(data.length / 10)} />
          <YAxis tick={CHART_AXIS_TICK} tickFormatter={(v) => formatCurrency(v)} width={80} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} labelFormatter={(v) => formatDateDisplay(String(v))} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="cumulative" name="Cumulative spending" stroke={CATEGORICAL_PALETTE[0]} strokeWidth={2} dot={false} />
          {hasBudget && (
            <Line type="monotone" dataKey="pace" name="Recommended pace" stroke={CATEGORICAL_PALETTE[1]} strokeWidth={2} strokeDasharray="4 4" dot={false} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
