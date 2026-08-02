import { useState, type FormEvent } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { InputField } from '../common/FormField';
import { useSettings } from '../../contexts/SettingsContext';
import { useToast } from '../../contexts/ToastContext';
import { toMinorUnits, fromMinorUnits } from '../../utils/currency';

interface StartingBalanceModalProps {
  open: boolean;
  onClose: () => void;
}

export function StartingBalanceModal({ open, onClose }: StartingBalanceModalProps) {
  const { settings, updateSettings } = useSettings();
  const { showToast } = useToast();
  const currency = settings?.currency ?? 'USD';

  const [amount, setAmount] = useState(() => String(fromMinorUnits(settings?.startingBalance ?? 0, currency)));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({ startingBalance: toMinorUnits(Number(amount) || 0, currency) });
      showToast('Starting balance updated.', 'success');
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not update starting balance.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit starting balance" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label={`Starting balance (${currency})`}
          type="number"
          step="0.01"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          hint="A one-time lump sum for money you already have today. You don't need to know your monthly income — just add income records whenever you receive money."
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
