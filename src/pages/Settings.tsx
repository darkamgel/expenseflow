import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CURRENCIES, type CurrencyCode } from '../types';
import { PageHeader, Card, Button } from '../components/common';
import { InputField, SelectField, CheckboxField } from '../components/common/FormField';
import { CategoryManager } from '../components/settings/CategoryManager';
import { useSettings } from '../contexts/SettingsContext';
import { useTheme, type ThemeMode } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useAuth } from '../contexts/AuthContext';
import { toMinorUnits, fromMinorUnits } from '../utils/currency';
import { loadSampleData, clearSampleData } from '../services/sampleDataService';

export function Settings() {
  const { settings, updateSettings } = useSettings();
  const { mode, setMode } = useTheme();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { user, signOut } = useAuth();

  const [displayName, setDisplayName] = useState(settings?.displayName ?? '');
  const [currency, setCurrency] = useState<CurrencyCode>(settings?.currency ?? 'USD');
  const [defaultBudget, setDefaultBudget] = useState(settings ? String(fromMinorUnits(settings.defaultMonthlyBudget, settings.currency)) : '');
  const [startingBalance, setStartingBalance] = useState(settings ? String(fromMinorUnits(settings.startingBalance ?? 0, settings.currency)) : '');
  const [firstDay, setFirstDay] = useState(settings?.firstDayOfBudgetMonth ?? 1);
  const [autoGenerateRecurring, setAutoGenerateRecurring] = useState(settings?.autoGenerateRecurring ?? true);
  const [largeExpenseThreshold, setLargeExpenseThreshold] = useState(
    settings ? String(fromMinorUnits(settings.largeExpenseThreshold, settings.currency)) : ''
  );
  const [saving, setSaving] = useState(false);
  const [sampleBusy, setSampleBusy] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings({
        displayName: displayName.trim(),
        currency,
        defaultMonthlyBudget: toMinorUnits(Number(defaultBudget) || 0, currency),
        startingBalance: toMinorUnits(Number(startingBalance) || 0, currency),
        firstDayOfBudgetMonth: firstDay,
        autoGenerateRecurring,
        largeExpenseThreshold: toMinorUnits(Number(largeExpenseThreshold) || 0, currency),
      });
      showToast('Settings saved.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSampleData = async () => {
    setSampleBusy(true);
    try {
      const result = await loadSampleData(currency);
      showToast(`Loaded ${result.expensesCreated} sample expenses and ${result.paymentMethodsCreated} payment methods.`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not load sample data.', 'error');
    } finally {
      setSampleBusy(false);
    }
  };

  const handleClearSampleData = async () => {
    const ok = await confirm({ title: 'Clear sample data', message: 'Remove all sample expenses, budgets, and payment methods? Your real data will not be affected.', confirmLabel: 'Clear sample data' });
    if (!ok) return;
    setSampleBusy(true);
    try {
      await clearSampleData();
      showToast('Sample data cleared.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not clear sample data.', 'error');
    } finally {
      setSampleBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" />

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
        <strong>Privacy notice:</strong> Your financial information is stored in your account and synced across every
        device you sign in on. It's protected by your password and database access rules that restrict it to your
        account only — but it isn't end-to-end encrypted, so anyone who gains access to your account credentials could
        access this data. Export regular backups to avoid losing your information.
      </div>

      <Card className="my-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Account</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Signed in as {user?.email}</p>
        <Button variant="secondary" onClick={signOut}>
          Sign out
        </Button>
      </Card>

      <Card className="mb-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Appearance</h2>
        <div className="flex gap-2">
          {(['light', 'dark', 'system'] as ThemeMode[]).map((option) => (
            <button
              key={option}
              onClick={() => setMode(option)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium capitalize ${
                mode === option
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300'
              }`}
              aria-pressed={mode === option}
            >
              {option}
            </button>
          ))}
        </div>
      </Card>

      <Card className="mb-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Preferences</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <InputField label="Display name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <SelectField label="Preferred currency" value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </SelectField>
            <SelectField label="First day of budget month" value={firstDay} onChange={(e) => setFirstDay(Number(e.target.value))}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </SelectField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label={`Default monthly budget (${currency})`}
              type="number"
              min="0"
              step="0.01"
              value={defaultBudget}
              onChange={(e) => setDefaultBudget(e.target.value)}
              hint="Used to pre-fill new budgets."
            />
            <InputField
              label={`Large expense alert threshold (${currency})`}
              type="number"
              min="0"
              step="0.01"
              value={largeExpenseThreshold}
              onChange={(e) => setLargeExpenseThreshold(e.target.value)}
              hint="Expenses at or above this amount trigger a notification."
            />
          </div>
          <InputField
            label={`Starting balance (${currency})`}
            type="number"
            step="0.01"
            value={startingBalance}
            onChange={(e) => setStartingBalance(e.target.value)}
            hint="A one-time lump sum for money you already have, used in the Net balance on the Income page. Add income records any time — no fixed monthly figure needed."
          />
          <CheckboxField
            label="Automatically generate recurring expenses"
            description="Create due recurring expenses when the app opens. Turn off to add them manually."
            checked={autoGenerateRecurring}
            onChange={(e) => setAutoGenerateRecurring(e.target.checked)}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save preferences'}
            </Button>
          </div>
        </form>
      </Card>

      <div className="mb-5">
        <CategoryManager />
      </div>

      <Card className="mb-5">
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Sample data</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          Load example expenses, a budget, and payment methods to explore the app. Sample records are tagged separately
          and never mix with your real data.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={handleLoadSampleData} disabled={sampleBusy}>
            Load sample data
          </Button>
          <Button variant="ghost" onClick={handleClearSampleData} disabled={sampleBusy}>
            Clear sample data
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Backup, restore, and data reset</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Export/import your data or permanently delete everything on the Backup page.</p>
        <Link to="/backup">
          <Button variant="secondary">Go to Backup & Restore</Button>
        </Link>
      </Card>

      <p className="mt-6 text-center text-xs text-slate-400">ExpenseFlow · Your data stays in this browser</p>
    </div>
  );
}
