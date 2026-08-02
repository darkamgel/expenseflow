import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { checkStorageAvailability } from './db/database';
import { StorageUnavailableScreen } from './components/StorageUnavailableScreen';
import { Onboarding } from './components/Onboarding';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConfirmProvider, useConfirmState } from './contexts/ConfirmContext';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { Toaster } from './components/common/Toaster';
import { Spinner } from './components/common/Spinner';
import { AppShell } from './components/layout/AppShell';
import { categoryRepository } from './repositories';
import { generateDueRecurringExpenses } from './services/recurringService';
import { runNotificationChecks } from './services/notificationService';
import { getPref, setPref, PREF_KEYS } from './utils/localPrefs';

import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { AddExpense } from './pages/AddExpense';

// Chart- and form-heavy pages are code-split so the initial bundle stays small.
const Budgets = lazy(() => import('./pages/Budgets').then((m) => ({ default: m.Budgets })));
const Wallet = lazy(() => import('./pages/Wallet').then((m) => ({ default: m.Wallet })));
const Reports = lazy(() => import('./pages/Reports').then((m) => ({ default: m.Reports })));
const Recurring = lazy(() => import('./pages/Recurring').then((m) => ({ default: m.Recurring })));
const Income = lazy(() => import('./pages/Income').then((m) => ({ default: m.Income })));
const Backup = lazy(() => import('./pages/Backup').then((m) => ({ default: m.Backup })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));

type StorageState = 'checking' | 'unavailable' | 'available';

function StorageGate() {
  const [state, setState] = useState<StorageState>('checking');
  const [reason, setReason] = useState<string | undefined>(undefined);

  const check = useCallback(async () => {
    setState('checking');
    const result = await checkStorageAvailability();
    if (result.available) {
      setState('available');
    } else {
      setReason(result.reason);
      setState('unavailable');
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  if (state === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Spinner label="Starting ExpenseFlow…" />
      </div>
    );
  }

  if (state === 'unavailable') {
    return <StorageUnavailableScreen reason={reason} onRetry={check} />;
  }

  return (
    <SettingsProvider>
      <ToastProvider>
        <ConfirmRoot />
      </ToastProvider>
    </SettingsProvider>
  );
}

function ConfirmRoot() {
  const { pending, confirm, settle } = useConfirmState();
  return (
    <ConfirmProvider confirm={confirm}>
      <AppBody />
      <ConfirmDialog pending={pending} onSettle={settle} />
      <Toaster />
    </ConfirmProvider>
  );
}

function AppBody() {
  const { settings, loading: settingsLoading, reload } = useSettings();
  const [onboardingCompleted, setOnboardingCompleted] = useState(() => getPref(PREF_KEYS.onboardingCompleted, false));
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (!onboardingCompleted || settingsLoading) return;
    let cancelled = false;
    (async () => {
      try {
        await categoryRepository.ensureSeeded();
        if (settings?.autoGenerateRecurring !== false) {
          await generateDueRecurringExpenses();
        }
        await runNotificationChecks();
      } catch {
        // Startup bootstrapping is best-effort; individual pages surface their own errors.
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingCompleted, settingsLoading]);

  if (settingsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Spinner label="Loading your data…" />
      </div>
    );
  }

  if (!onboardingCompleted) {
    return (
      <Onboarding
        onComplete={async () => {
          setPref(PREF_KEYS.onboardingCompleted, true);
          await reload();
          setOnboardingCompleted(true);
        }}
      />
    );
  }

  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Spinner label="Preparing your data…" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <AppShell>
        <Suspense fallback={<Spinner label="Loading…" />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/expenses/new" element={<AddExpense />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/recurring" element={<Recurring />} />
            <Route path="/income" element={<Income />} />
            <Route path="/backup" element={<Backup />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AppShell>
    </BrowserRouter>
  );
}

function App() {
  return (
    <ThemeProvider>
      <StorageGate />
    </ThemeProvider>
  );
}

export default App;
