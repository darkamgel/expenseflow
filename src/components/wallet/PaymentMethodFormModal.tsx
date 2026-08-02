import { useState, type FormEvent } from 'react';
import type { PaymentMethod, PaymentMethodType } from '../../types';
import { paymentMethodRepository } from '../../repositories';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { InputField, SelectField, TextAreaField } from '../common/FormField';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { toMinorUnits, fromMinorUnits } from '../../utils/currency';

const TYPE_OPTIONS: { value: PaymentMethodType; label: string }[] = [
  { value: 'credit_card', label: 'Credit card' },
  { value: 'debit_card', label: 'Debit card' },
  { value: 'bank_account', label: 'Bank account' },
  { value: 'cash', label: 'Cash' },
  { value: 'digital_wallet', label: 'Digital wallet' },
  { value: 'other', label: 'Other' },
];

const COLOR_SWATCHES = ['#0f172a', '#1d4ed8', '#7c3aed', '#0891b2', '#059669', '#d97706', '#dc2626', '#db2777'];

interface PaymentMethodFormModalProps {
  open: boolean;
  onClose: () => void;
  existing?: PaymentMethod;
  onSaved: () => void;
}

export function PaymentMethodFormModal({ open, onClose, existing, onSaved }: PaymentMethodFormModalProps) {
  const { settings } = useSettings();
  const { showToast } = useToast();
  const currency = settings?.currency ?? 'USD';

  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<PaymentMethodType>(existing?.type ?? 'credit_card');
  const [issuer, setIssuer] = useState(existing?.issuer ?? '');
  const [lastFour, setLastFour] = useState(existing?.lastFourDigits ?? '');
  const [creditLimit, setCreditLimit] = useState(existing?.creditLimit ? String(fromMinorUnits(existing.creditLimit, currency)) : '');
  const [currentBalance, setCurrentBalance] = useState(existing?.currentBalance ? String(fromMinorUnits(existing.currentBalance, currency)) : '');
  const [billingCycleStartDay, setBillingCycleStartDay] = useState(existing?.billingCycleStartDay ? String(existing.billingCycleStartDay) : '');
  const [paymentDueDay, setPaymentDueDay] = useState(existing?.paymentDueDay ? String(existing.paymentDueDay) : '');
  const [color, setColor] = useState(existing?.color ?? COLOR_SWATCHES[0]);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showCardFields = type === 'credit_card' || type === 'debit_card' || type === 'bank_account';
  const showCreditFields = type === 'credit_card';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (lastFour && !/^\d{4}$/.test(lastFour)) {
      setError('Last four digits must be exactly 4 numbers.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        type,
        issuer: issuer.trim() || undefined,
        lastFourDigits: lastFour || undefined,
        creditLimit: creditLimit ? toMinorUnits(Number(creditLimit), currency) : undefined,
        currentBalance: currentBalance ? toMinorUnits(Number(currentBalance), currency) : undefined,
        billingCycleStartDay: billingCycleStartDay ? Number(billingCycleStartDay) : undefined,
        paymentDueDay: paymentDueDay ? Number(paymentDueDay) : undefined,
        color,
        notes: notes.trim() || undefined,
        status: existing?.status ?? ('active' as const),
      };
      if (existing) {
        await paymentMethodRepository.update(existing.id, payload);
      } else {
        await paymentMethodRepository.create(payload);
      }
      showToast(existing ? 'Payment method updated.' : 'Payment method added.', 'success');
      onSaved();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save payment method.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={existing ? 'Edit payment method' : 'Add payment method'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <InputField label="Name" required value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <SelectField label="Type" required value={type} onChange={(e) => setType(e.target.value as PaymentMethodType)}>
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectField>
        </div>

        {showCardFields && (
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Bank / issuer name" value={issuer} onChange={(e) => setIssuer(e.target.value)} />
            <InputField
              label="Last four digits"
              value={lastFour}
              onChange={(e) => setLastFour(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="1234"
              inputMode="numeric"
              hint="Never enter a full card number."
            />
          </div>
        )}

        {showCreditFields && (
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label={`Credit limit (${currency})`}
              type="number"
              min="0"
              step="0.01"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
            />
            <InputField
              label={`Current balance (${currency})`}
              type="number"
              min="0"
              step="0.01"
              value={currentBalance}
              onChange={(e) => setCurrentBalance(e.target.value)}
            />
          </div>
        )}

        {showCardFields && (
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="Billing cycle start day"
              type="number"
              min="1"
              max="28"
              value={billingCycleStartDay}
              onChange={(e) => setBillingCycleStartDay(e.target.value)}
            />
            <InputField label="Payment due day" type="number" min="1" max="28" value={paymentDueDay} onChange={(e) => setPaymentDueDay(e.target.value)} />
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Display color</label>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-8 w-8 rounded-full border-2 ${color === c ? 'border-slate-900 dark:border-white' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
                aria-label={`Use color ${c}`}
                aria-pressed={color === c}
              />
            ))}
          </div>
        </div>

        <TextAreaField label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

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
