import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategoryBreakdownItem } from '../../services/calculationService';
import { EmptyState } from '../common/EmptyState';
import { formatPercent } from '../../utils/currency';

interface CategoryDonutChartProps {
  data: CategoryBreakdownItem[];
  formatCurrency: (amount: number) => string;
}

export function CategoryDonutChart({ data, formatCurrency }: CategoryDonutChartProps) {
  if (data.length === 0) {
    return <EmptyState icon="🍩" title="No spending in this period" description="Add expenses to see a category breakdown." />;
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
            {data.map((entry) => (
              <Cell key={entry.categoryId} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value, _name, item) => [`${formatCurrency(Number(value))} (${formatPercent(item.payload.percent)})`, item.payload.name]} />
          <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
