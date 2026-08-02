import { useEffect, useState, type FormEvent } from 'react';
import type { Category, PaymentMethod, RecurringExpense, RecurringFrequency } from '../../types';
import { categoryRepository, paymentMethodRepository, recurringExpenseRepository } from '../../repositories';
import { computeNextOccurrence } from '../../services/recurringService';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { InputField, SelectField, CheckboxField } from '../common/FormField';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { toMinorUnits, fromMinorUnits } from '../../utils/currency';
import { todayDateKey } from '../../utils/date';

const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every two weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Every three months' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom interval' },
];

interface RecurringFormModalProps {
  open: boolean;
  onClose: () => void;
  existing?: RecurringExpense;
  onSaved: () => void;
}

export function RecurringFormModal({ open, onClose, existing, onSaved }: RecurringFormModalProps) {
  const { settings } = useSettings();
  const { showToast } = useToast();
  const currency = settings?.currency ?? 'USD';

  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [title, setTitle] = useState(existing?.title ?? '');
  const [amount, setAmount] = useState(existing ? String(fromMinorUnits(existing.amount, currency)) : '');
  const [categoryId, setCategoryId] = useState(existing?.categoryId ?? '');
  const [paymentMethodId, setPaymentMethodId] = useState(existing?.paymentMethodId ?? '');
  const [startDate, setStartDate] = useState(existing?.startDate ?? todayDateKey());
  const [endDate, setEndDate] = useState(existing?.endDate ?? '');
  const [frequency, setFrequency] = useState<RecurringFrequency>(existing?.frequency ?? 'monthly');
  const [customIntervalDays, setCustomIntervalDays] = useState(existing?.customIntervalDays ?? 30);
  const [autoGenerate, setAutoGenerate] = useState(existing?.autoGenerate ?? true);
  const [reminderEnabled, setReminderEnabled] = useState(existing?.reminderEnabled ?? true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      await categoryRepository.ensureSeeded();
      const [cats, methods] = await Promise.all([categoryRepository.getActive(), paymentMethodRepository.getActive()]);
      setCategories(cats);
      setPaymentMethods(methods);
      if (!categoryId && cats.length) setCategoryId(cats[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    if (!categoryId) {
      setError('Select a category.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const amountMinor = toMinorUnits(amountNumber, currency);
      const payload = {
        title: title.trim(),
        amount: amountMinor,
        categoryId,
        paymentMethodId: paymentMethodId || undefined,
        startDate,
        endDate: endDate || undefined,
        frequency,
        customIntervalDays: frequency === 'custom' ? customIntervalDays : undefined,
        autoGenerate,
        reminderEnabled,
      };
      if (existing) {
        await recurringExpenseRepository.update(existing.id, payload);
      } else {
        await recurringExpenseRepository.create({
          ...payload,
          nextOccurrence: startDate,
          active: true,
        });
      }
      showToast(existing ? 'Recurring expense updated.' : 'Recurring expense created.', 'success');
      onSaved();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save recurring expense.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit recurring expense' : 'Add recurring expense'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        <div className="grid grid-cols-2 gap-3">
          <InputField
            label={`Amount (${currency})`}
            required
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <SelectField label="Category" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Select…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </SelectField>
        </div>
        <SelectField label="Payment method" value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}>
          <option value="">None</option>
          {paymentMethods.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </SelectField>
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Start date" required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} disabled={Boolean(existing)} />
          <InputField label="End date (optional)" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <SelectField label="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}>
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectField>
          {frequency === 'custom' && (
            <InputField label="Repeat every (days)" type="number" min="1" value={customIntervalDays} onChange={(e) => setCustomIntervalDays(Number(e.target.value) || 1)} />
          )}
        </div>
        {existing && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Next occurrence: <strong>{existing.nextOccurrence}</strong>{' '}
            {frequency !== existing.frequency && `(will recalculate to ${computeNextOccurrence(existing.lastGeneratedDate ?? existing.startDate, { frequency, customIntervalDays })} after saving)`}
          </p>
        )}
        <CheckboxField
          label="Automatically create expenses"
          description="Generate this expense on schedule when the app is opened. Turn off to add it manually each time."
          checked={autoGenerate}
          onChange={(e) => setAutoGenerate(e.target.checked)}
        />
        <CheckboxField
          label="Remind me before it's due"
          description="Shows an in-app notification a few days before the next occurrence."
          checked={reminderEnabled}
          onChange={(e) => setReminderEnabled(e.target.checked)}
        />
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
