import type { Category, ExpenseFilters, PaymentMethod } from '../../types';
import { InputField, SelectField } from '../common/FormField';
import { Button } from '../common/Button';

interface ExpenseFiltersPanelProps {
  filters: ExpenseFilters;
  onChange: (filters: ExpenseFilters) => void;
  categories: Category[];
  paymentMethods: PaymentMethod[];
  allTags: string[];
  onReset: () => void;
}

export function ExpenseFiltersPanel({ filters, onChange, categories, paymentMethods, allTags, onReset }: ExpenseFiltersPanelProps) {
  const update = (changes: Partial<ExpenseFilters>) => onChange({ ...filters, ...changes });

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <InputField label="From date" type="date" value={filters.dateFrom ?? ''} onChange={(e) => update({ dateFrom: e.target.value || undefined })} />
      <InputField label="To date" type="date" value={filters.dateTo ?? ''} onChange={(e) => update({ dateTo: e.target.value || undefined })} />
      <SelectField
        label="Category"
        value={filters.categoryIds?.[0] ?? ''}
        onChange={(e) => update({ categoryIds: e.target.value ? [e.target.value] : undefined })}
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.icon} {c.name}
          </option>
        ))}
      </SelectField>
      <SelectField
        label="Payment method"
        value={filters.paymentMethodIds?.[0] ?? ''}
        onChange={(e) => update({ paymentMethodIds: e.target.value ? [e.target.value] : undefined })}
      >
        <option value="">All payment methods</option>
        {paymentMethods.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </SelectField>
      <InputField
        label="Min amount"
        type="number"
        min="0"
        step="0.01"
        value={filters.minAmount ?? ''}
        onChange={(e) => update({ minAmount: e.target.value ? Number(e.target.value) * 100 : undefined })}
      />
      <InputField
        label="Max amount"
        type="number"
        min="0"
        step="0.01"
        value={filters.maxAmount ?? ''}
        onChange={(e) => update({ maxAmount: e.target.value ? Number(e.target.value) * 100 : undefined })}
      />
      <SelectField
        label="Tag"
        value={filters.tags?.[0] ?? ''}
        onChange={(e) => update({ tags: e.target.value ? [e.target.value] : undefined })}
      >
        <option value="">All tags</option>
        {allTags.map((tag) => (
          <option key={tag} value={tag}>
            {tag}
          </option>
        ))}
      </SelectField>
      <SelectField
        label="Recurring"
        value={filters.recurringOnly ? 'yes' : ''}
        onChange={(e) => update({ recurringOnly: e.target.value === 'yes' ? true : undefined })}
      >
        <option value="">All expenses</option>
        <option value="yes">Recurring only</option>
      </SelectField>
      <SelectField
        label="Receipt"
        value={filters.hasReceipt === undefined ? '' : filters.hasReceipt ? 'yes' : 'no'}
        onChange={(e) => update({ hasReceipt: e.target.value === '' ? undefined : e.target.value === 'yes' })}
      >
        <option value="">Any</option>
        <option value="yes">Has receipt</option>
        <option value="no">No receipt</option>
      </SelectField>
      <div className="flex items-end">
        <Button variant="secondary" onClick={onReset} fullWidth>
          Reset filters
        </Button>
      </div>
    </div>
  );
}
