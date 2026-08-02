import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConnectionErrorScreen } from './components/ConnectionErrorScreen';
import { AuthPage } from './components/AuthPage';
import { Onboarding } from './components/Onboarding';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SettingsProvider, useSettings } from './contexts/SettingsContext';
import { ToastProvider } from './contexts/ToastContext';
import { ConfirmProvider, useConfirmState } from './contexts/ConfirmContext';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { Toaster } from './components/common/Toaster';
import { Spinner } from './components/common/Spinner';
import { AppShell } from './components/layout/AppShell';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { categoryRepository } from './repositories';
import { generateDueRecurringExpenses } from './services/recurringService';
import { runNotificationChecks } from './services/notificationService';

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

function FullScreenSpinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <Spinner label={label} />
    </div>
  );
}

/** ExpenseFlow is online-only: every read/write goes straight to Supabase,
 * so there's no local fallback to offer when the network is down. */
function RootGate() {
  const online = useOnlineStatus();
  const { user, loading } = useAuth();

  if (!online) {
    return <ConnectionErrorScreen onRetry={() => window.location.reload()} />;
  }
  if (loading) {
    return <FullScreenSpinner label="Signing you in…" />;
  }
  if (!user) {
    return <AuthPage />;
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
  const [bootstrapped, setBootstrapped] = useState(false);

  const runBootstrap = useCallback(async () => {
    try {
      await categoryRepository.ensureSeeded();
      if (settings?.autoGenerateRecurring !== false) {
        await generateDueRecurringExpenses();
      }
      await runNotificationChecks();
    } catch {
      // Startup bootstrapping is best-effort; individual pages surface their own errors.
    } finally {
      setBootstrapped(true);
    }
  }, [settings?.autoGenerateRecurring]);

  useEffect(() => {
    if (settingsLoading || !settings?.onboardingCompleted) return;
    runBootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoading, settings?.onboardingCompleted]);

  if (settingsLoading) {
    return <FullScreenSpinner label="Loading your data…" />;
  }

  if (!settings?.onboardingCompleted) {
    return <Onboarding onComplete={reload} />;
  }

  if (!bootstrapped) {
    return <FullScreenSpinner label="Preparing your data…" />;
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
      <AuthProvider>
        <RootGate />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
