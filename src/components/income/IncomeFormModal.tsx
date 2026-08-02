import { useState, type FormEvent } from 'react';
import type { Income } from '../../types';
import { incomeRepository } from '../../repositories';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { InputField, TextAreaField, CheckboxField } from '../common/FormField';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { toMinorUnits, fromMinorUnits } from '../../utils/currency';
import { todayDateKey } from '../../utils/date';

interface IncomeFormModalProps {
  open: boolean;
  onClose: () => void;
  existing?: Income;
  onSaved: () => void;
}

export function IncomeFormModal({ open, onClose, existing, onSaved }: IncomeFormModalProps) {
  const { settings } = useSettings();
  const { showToast } = useToast();
  const currency = settings?.currency ?? 'USD';

  const [title, setTitle] = useState(existing?.title ?? '');
  const [amount, setAmount] = useState(existing ? String(fromMinorUnits(existing.amount, currency)) : '');
  const [date, setDate] = useState(existing?.date ?? todayDateKey());
  const [source, setSource] = useState(existing?.source ?? '');
  const [category, setCategory] = useState(existing?.category ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [recurring, setRecurring] = useState(existing?.recurring ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amountNumber = Number(amount);
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!amount || Number.isNaN(amountNumber) || amountNumber <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: title.trim(),
        amount: toMinorUnits(amountNumber, currency),
        date,
        source: source.trim() || undefined,
        category: category.trim() || undefined,
        notes: notes.trim() || undefined,
        recurring,
      };
      if (existing) {
        await incomeRepository.update(existing.id, payload);
      } else {
        await incomeRepository.create(payload);
      }
      showToast(existing ? 'Income updated.' : 'Income added.', 'success');
      onSaved();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save income.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit income' : 'Add income'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <InputField label={`Amount (${currency})`} required type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <InputField label="Date" required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Source" value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Employer" />
          <InputField label="Category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Salary" />
        </div>
        <TextAreaField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <CheckboxField label="Recurring income" description="This income repeats regularly (e.g. salary)." checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
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
