import { useState, type FormEvent } from 'react';
import type { Budget } from '../../types';
import { budgetRepository } from '../../repositories';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { InputField, TextAreaField, CheckboxField } from '../common/FormField';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { toMinorUnits, fromMinorUnits } from '../../utils/currency';
import { formatMonthLabel } from '../../utils/date';

interface BudgetFormModalProps {
  open: boolean;
  onClose: () => void;
  year: number;
  month: number;
  existingBudget?: Budget;
  prefillAmount?: number;
  onSaved: () => void;
}

export function BudgetFormModal({ open, onClose, year, month, existingBudget, prefillAmount, onSaved }: BudgetFormModalProps) {
  const { settings } = useSettings();
  const { showToast } = useToast();
  const currency = settings?.currency ?? 'USD';

  const [totalAmount, setTotalAmount] = useState(
    existingBudget
      ? String(fromMinorUnits(existingBudget.totalAmount, currency))
      : prefillAmount
        ? String(fromMinorUnits(prefillAmount, currency))
        : ''
  );
  const [notes, setNotes] = useState(existingBudget?.notes ?? '');
  const [rolloverEnabled, setRolloverEnabled] = useState(existingBudget?.rolloverEnabled ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amountNumber = Number(totalAmount);
    if (!totalAmount || Number.isNaN(amountNumber) || amountNumber <= 0) {
      setError('Enter a budget amount greater than zero.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const amountMinor = toMinorUnits(amountNumber, currency);
      if (existingBudget) {
        await budgetRepository.update(existingBudget.id, { totalAmount: amountMinor, notes: notes.trim() || undefined, rolloverEnabled });
      } else {
        await budgetRepository.create({ year, month, totalAmount: amountMinor, notes: notes.trim() || undefined, rolloverEnabled });
      }
      showToast(existingBudget ? 'Budget updated.' : 'Budget created.', 'success');
      onSaved();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save budget.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={existingBudget ? 'Edit budget' : 'Create budget'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">{formatMonthLabel(year, month)}</p>
        <InputField
          label={`Total budget amount (${currency})`}
          required
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          error={error ?? undefined}
          autoFocus
        />
        <TextAreaField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <CheckboxField
          label="Enable budget rollover"
          description="Unused budget (or overspend) from the previous month carries into this month."
          checked={rolloverEnabled}
          onChange={(e) => setRolloverEnabled(e.target.checked)}
        />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save budget'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
