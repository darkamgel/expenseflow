import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PaymentMethodBreakdownItem } from '../../services/calculationService';
import { categoricalColor, CHART_AXIS_TICK, CHART_GRID_CLASS } from '../../utils/chartColors';
import { EmptyState } from '../common/EmptyState';

interface PaymentMethodBarChartProps {
  data: PaymentMethodBreakdownItem[];
  formatCurrency: (amount: number) => string;
}

export function PaymentMethodBarChart({ data, formatCurrency }: PaymentMethodBarChartProps) {
  if (data.length === 0) {
    return <EmptyState icon="💳" title="No payment method data" description="Add expenses with a payment method to see this breakdown." />;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 12 }}>
          <CartesianGrid strokeDasharray="3 3" className={CHART_GRID_CLASS} horizontal={false} />
          <XAxis type="number" tick={CHART_AXIS_TICK} tickFormatter={(v) => formatCurrency(v)} />
          <YAxis type="category" dataKey="name" tick={CHART_AXIS_TICK} width={110} />
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
          <Bar dataKey="amount" name="Spending" radius={[0, 4, 4, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.paymentMethodId} fill={categoricalColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
