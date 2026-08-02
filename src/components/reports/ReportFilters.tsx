import type { Category, PaymentMethod } from '../../types';
import type { ReportRangePreset } from '../../utils/date';
import { SelectField, InputField, Button } from '../common';

const PRESET_OPTIONS: { value: ReportRangePreset; label: string }[] = [
  { value: 'current_month', label: 'Current month' },
  { value: 'previous_month', label: 'Previous month' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'last_6_months', label: 'Last 6 months' },
  { value: 'last_12_months', label: 'Last 12 months' },
  { value: 'current_year', label: 'Current year' },
  { value: 'custom', label: 'Custom range' },
];

export interface ReportFilterState {
  preset: ReportRangePreset;
  customFrom: string;
  customTo: string;
  categoryId: string;
  paymentMethodId: string;
}

interface ReportFiltersProps {
  filters: ReportFilterState;
  onChange: (filters: ReportFilterState) => void;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  onReset: () => void;
}

export function ReportFilters({ filters, onChange, categories, paymentMethods, onReset }: ReportFiltersProps) {
  const update = (changes: Partial<ReportFilterState>) => onChange({ ...filters, ...changes });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <SelectField label="Period" value={filters.preset} onChange={(e) => update({ preset: e.target.value as ReportRangePreset })}>
        {PRESET_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </SelectField>
      {filters.preset === 'custom' && (
        <>
          <InputField label="From" type="date" value={filters.customFrom} onChange={(e) => update({ customFrom: e.target.value })} />
          <InputField label="To" type="date" value={filters.customTo} onChange={(e) => update({ customTo: e.target.value })} />
        </>
      )}
      <SelectField label="Category" value={filters.categoryId} onChange={(e) => update({ categoryId: e.target.value })}>
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.icon} {c.name}
          </option>
        ))}
      </SelectField>
      <SelectField label="Payment method" value={filters.paymentMethodId} onChange={(e) => update({ paymentMethodId: e.target.value })}>
        <option value="">All payment methods</option>
        {paymentMethods.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </SelectField>
      <div className="flex items-end">
        <Button variant="secondary" onClick={onReset} fullWidth>
          Reset filters
        </Button>
      </div>
    </div>
  );
}
