import { useEffect, useState, type FormEvent } from 'react';
import type { Expense, RecurringFrequency, Receipt } from '../../types';
import { categoryRepository, expenseRepository, paymentMethodRepository, receiptRepository, recurringExpenseRepository } from '../../repositories';
import { computeNextOccurrence } from '../../services/recurringService';
import { checkLargeExpense } from '../../services/notificationService';
import { toMinorUnits, fromMinorUnits } from '../../utils/currency';
import { todayDateKey, nowTimeKey } from '../../utils/date';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../common/Button';
import { InputField, SelectField, TextAreaField, CheckboxField } from '../common/FormField';
import { TagInput } from './TagInput';
import { ReceiptUploader } from './ReceiptUploader';
import type { Category, PaymentMethod } from '../../types';

interface ExpenseFormProps {
  initialExpense?: Expense;
  onSaved: (expense: Expense) => void;
  onCancel?: () => void;
}

const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every two weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Every three months' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom interval' },
];

interface FormErrors {
  title?: string;
  amount?: string;
  categoryId?: string;
  date?: string;
  receipt?: string;
}

export function ExpenseForm({ initialExpense, onSaved, onCancel }: ExpenseFormProps) {
  const { settings, formatCurrency } = useSettings();
  const { showToast } = useToast();
  const currency = settings?.currency ?? 'USD';

  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [existingReceipt, setExistingReceipt] = useState<Receipt | undefined>(undefined);

  const [title, setTitle] = useState(initialExpense?.title ?? '');
  const [amount, setAmount] = useState(initialExpense ? String(fromMinorUnits(initialExpense.amount, currency)) : '');
  const [categoryId, setCategoryId] = useState(initialExpense?.categoryId ?? '');
  const [date, setDate] = useState(initialExpense?.date ?? todayDateKey());
  const [time, setTime] = useState(initialExpense?.time ?? nowTimeKey());
  const [paymentMethodId, setPaymentMethodId] = useState(initialExpense?.paymentMethodId ?? '');
  const [merchant, setMerchant] = useState(initialExpense?.merchant ?? '');
  const [notes, setNotes] = useState(initialExpense?.notes ?? '');
  const [tags, setTags] = useState<string[]>(initialExpense?.tags ?? []);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [customIntervalDays, setCustomIntervalDays] = useState(30);

  const [pendingReceiptFile, setPendingReceiptFile] = useState<File | null>(null);
  const [removeExistingReceipt, setRemoveExistingReceipt] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await categoryRepository.ensureSeeded();
        const [cats, methods] = await Promise.all([categoryRepository.getActive(), paymentMethodRepository.getActive()]);
        setCategories(cats);
        setPaymentMethods(methods);
        if (!categoryId && cats.length) setCategoryId(cats[0].id);
        if (initialExpense?.receiptId) {
          const receipt = await receiptRepository.getById(initialExpense.receiptId);
          setExistingReceipt(receipt);
        }
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Failed to load form data.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validate = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!title.trim()) nextErrors.title = 'Title is required.';
    const amountNumber = Number(amount);
    if (!amount || Number.isNaN(amountNumber) || amountNumber <= 0) {
      nextErrors.amount = 'Enter an amount greater than zero.';
    }
    if (!categoryId) nextErrors.categoryId = 'Select a category.';
    if (!date) nextErrors.date = 'Select a date.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const amountMinor = toMinorUnits(Number(amount), currency);
      let recurringExpenseId = initialExpense?.recurringExpenseId;

      if (isRecurring && !initialExpense) {
        const series = await recurringExpenseRepository.create({
          title: title.trim(),
          amount: amountMinor,
          categoryId,
          paymentMethodId: paymentMethodId || undefined,
          startDate: date,
          frequency,
          customIntervalDays: frequency === 'custom' ? customIntervalDays : undefined,
          nextOccurrence: computeNextOccurrence(date, { frequency, customIntervalDays }),
          lastGeneratedDate: date,
          autoGenerate: true,
          reminderEnabled: true,
          active: true,
        });
        recurringExpenseId = series.id;
      }

      const payload = {
        title: title.trim(),
        amount: amountMinor,
        categoryId,
        date,
        time,
        paymentMethodId: paymentMethodId || undefined,
        merchant: merchant.trim() || undefined,
        notes: notes.trim() || undefined,
        tags,
        recurringExpenseId,
      };

      let saved: Expense;
      if (initialExpense) {
        saved = await expenseRepository.update(initialExpense.id, payload);
      } else {
        saved = await expenseRepository.create(payload);
      }

      if (removeExistingReceipt && existingReceipt) {
        await receiptRepository.delete(existingReceipt.id);
        saved = await expenseRepository.update(saved.id, { receiptId: undefined });
      }
      if (pendingReceiptFile) {
        const receipt = await receiptRepository.create({
          expenseId: saved.id,
          fileName: pendingReceiptFile.name,
          mimeType: pendingReceiptFile.type,
          sizeBytes: pendingReceiptFile.size,
          blob: pendingReceiptFile,
        });
        saved = await expenseRepository.update(saved.id, { receiptId: receipt.id });
      }

      await checkLargeExpense(saved);
      showToast(initialExpense ? 'Expense updated.' : 'Expense added.', 'success');
      onSaved(saved);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save expense.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loadError) {
    return <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} autoFocus />

      <div className="grid grid-cols-2 gap-3">
        <InputField
          label={`Amount (${currency})`}
          required
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
          hint={amount ? formatCurrency(toMinorUnits(Number(amount) || 0, currency)) : undefined}
        />
        <SelectField label="Category" required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} error={errors.categoryId}>
          <option value="">Select…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </SelectField>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InputField label="Date" required type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} />
        <InputField label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SelectField label="Payment method" value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)}>
          <option value="">None</option>
          {paymentMethods.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </SelectField>
        <InputField label="Merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
      </div>

      <TextAreaField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <TagInput tags={tags} onChange={setTags} />

      <ReceiptUploader
        existingReceipt={removeExistingReceipt ? undefined : existingReceipt}
        pendingFile={pendingReceiptFile}
        onSelect={(file) => {
          setPendingReceiptFile(file);
          setRemoveExistingReceipt(false);
        }}
        onRemove={() => {
          setPendingReceiptFile(null);
          setRemoveExistingReceipt(true);
        }}
        error={errors.receipt}
      />

      {!initialExpense && (
        <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <CheckboxField
            label="Make this a recurring expense"
            description="Automatically create this expense on a schedule going forward."
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
          />
          {isRecurring && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <SelectField label="Frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}>
                {FREQUENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </SelectField>
              {frequency === 'custom' && (
                <InputField
                  label="Repeat every (days)"
                  type="number"
                  min="1"
                  value={customIntervalDays}
                  onChange={(e) => setCustomIntervalDays(Number(e.target.value) || 1)}
                />
              )}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : initialExpense ? 'Save changes' : 'Add expense'}
        </Button>
      </div>
    </form>
  );
}
