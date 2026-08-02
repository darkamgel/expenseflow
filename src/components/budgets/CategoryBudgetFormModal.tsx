import { useState, type FormEvent } from 'react';
import type { Category, CategoryBudget } from '../../types';
import { categoryBudgetRepository } from '../../repositories';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { InputField, SelectField } from '../common/FormField';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { toMinorUnits, fromMinorUnits } from '../../utils/currency';

interface CategoryBudgetFormModalProps {
  open: boolean;
  onClose: () => void;
  budgetId: string;
  availableCategories: Category[];
  existing?: CategoryBudget;
  onSaved: () => void;
}

export function CategoryBudgetFormModal({ open, onClose, budgetId, availableCategories, existing, onSaved }: CategoryBudgetFormModalProps) {
  const { settings } = useSettings();
  const { showToast } = useToast();
  const currency = settings?.currency ?? 'USD';

  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? availableCategories[0]?.id ?? '');
  const [amount, setAmount] = useState(existing ? String(fromMinorUnits(existing.plannedAmount, currency)) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amountNumber = Number(amount);
    if (!categoryId) {
      setError('Select a category.');
      return;
    }
    if (!amount || Number.isNaN(amountNumber) || amountNumber <= 0) {
      setError('Enter a planned amount greater than zero.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const amountMinor = toMinorUnits(amountNumber, currency);
      if (existing) {
        await categoryBudgetRepository.update(existing.id, { plannedAmount: amountMinor });
      } else {
        await categoryBudgetRepository.create({ budgetId, categoryId, plannedAmount: amountMinor });
      }
      showToast('Category budget saved.', 'success');
      onSaved();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save category budget.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit category budget' : 'Add category budget'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <SelectField
          label="Category"
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={Boolean(existing)}
        >
          {availableCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </SelectField>
        <InputField
          label={`Planned amount (${currency})`}
          required
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={error ?? undefined}
          autoFocus
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
