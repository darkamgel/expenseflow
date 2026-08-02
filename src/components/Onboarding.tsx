import { useState, type FormEvent } from 'react';
import { CURRENCIES, type CurrencyCode } from '../types';
import { settingsRepository } from '../repositories';
import { toMinorUnits } from '../utils/currency';
import { setPref, PREF_KEYS } from '../utils/localPrefs';
import { Button } from './common/Button';
import { InputField, SelectField } from './common/FormField';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [displayName, setDisplayName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [defaultBudget, setDefaultBudget] = useState('');
  const [startingBalance, setStartingBalance] = useState('');
  const [firstDay, setFirstDay] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await settingsRepository.update({
        displayName: displayName.trim(),
        currency,
        defaultMonthlyBudget: toMinorUnits(Number(defaultBudget) || 0, currency),
        startingBalance: toMinorUnits(Number(startingBalance) || 0, currency),
        firstDayOfBudgetMonth: firstDay,
      });
      setPref(PREF_KEYS.onboardingCompleted, true);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    setPref(PREF_KEYS.onboardingCompleted, true);
    onComplete();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <div className="mb-2 text-3xl" aria-hidden="true">💸</div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Welcome to ExpenseFlow</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          A private, local-first expense and budget tracker. Set a few preferences to get started — you can change these
          anytime in Settings.
        </p>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          Your financial information is stored only in this browser. It is not uploaded to a server or synchronized
          between devices. Export regular backups to avoid losing your information. Anyone with access to this same
          unlocked browser profile can also access this data — local storage is not encrypted or fully secure.
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <InputField
            label="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Optional"
            autoComplete="off"
          />
          <SelectField label="Preferred currency" value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </SelectField>
          <InputField
            label="Default monthly budget"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={defaultBudget}
            onChange={(e) => setDefaultBudget(e.target.value)}
            placeholder="0.00"
            hint="You can create month-specific budgets later."
          />
          <InputField
            label="Starting balance"
            type="number"
            step="0.01"
            inputMode="decimal"
            value={startingBalance}
            onChange={(e) => setStartingBalance(e.target.value)}
            placeholder="0.00"
            hint="Optional — a one-time lump sum for money you already have. No need to know your monthly income; add income records any time as you receive them."
          />
          <SelectField
            label="First day of the budget month"
            value={firstDay}
            onChange={(e) => setFirstDay(Number(e.target.value))}
            hint="Use 1 unless your budget cycle starts on a different day (e.g. payday)."
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </SelectField>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={handleSkip}>
              Skip for now
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Get started'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
