import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { IncomeVsExpensePoint } from '../../services/calculationService';
import { CATEGORICAL_PALETTE, CHART_AXIS_TICK, CHART_GRID_CLASS, STATUS_COLORS } from '../../utils/chartColors';
import { EmptyState } from '../common/EmptyState';
import { formatMonthLabel } from '../../utils/date';

interface IncomeExpenseTrendChartProps {
  data: IncomeVsExpensePoint[];
  formatCurrency: (amount: number) => string;
}

export function IncomeExpenseTrendChart({ data, formatCurrency }: IncomeExpenseTrendChartProps) {
  const hasData = data.some((d) => d.income > 0 || d.expenses > 0);
  if (!hasData) {
    return <EmptyState icon="💰" title="No income or expense data" description="Add income and expenses to compare them over time." />;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className={CHART_GRID_CLASS} />
          <XAxis dataKey="label" tick={CHART_AXIS_TICK} tickFormatter={(v: string) => { const [y, m] = v.split('-').map(Number); return formatMonthLabel(y, m).slice(0, 3); }} />
          <YAxis tick={CHART_AXIS_TICK} tickFormatter={(v) => formatCurrency(v)} width={80} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} labelFormatter={(v) => { const [y, m] = String(v).split('-').map(Number); return formatMonthLabel(y, m); }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Line type="monotone" dataKey="income" name="Income" stroke={STATUS_COLORS.good} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="expenses" name="Expenses" stroke={STATUS_COLORS.critical} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="net" name="Net" stroke={CATEGORICAL_PALETTE[6]} strokeWidth={2} dot={false} strokeDasharray="4 4" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
