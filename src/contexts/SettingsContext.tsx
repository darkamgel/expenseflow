import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ApplicationSettings } from '../types';
import { settingsRepository } from '../repositories';
import { formatMoney } from '../utils/currency';

interface SettingsContextValue {
  settings: ApplicationSettings | null;
  loading: boolean;
  error: string | null;
  updateSettings: (changes: Partial<Omit<ApplicationSettings, 'id' | 'createdAt'>>) => Promise<void>;
  formatCurrency: (amountMinor: number | undefined | null) => string;
  reload: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ApplicationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await settingsRepository.get();
      setSettings(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const updateSettings = useCallback(async (changes: Partial<Omit<ApplicationSettings, 'id' | 'createdAt'>>) => {
    const updated = await settingsRepository.update(changes);
    setSettings(updated);
  }, []);

  const formatCurrency = useCallback(
    (amountMinor: number | undefined | null) => formatMoney(amountMinor, settings?.currency ?? 'USD'),
    [settings?.currency]
  );

  const value = useMemo(
    () => ({ settings, loading, error, updateSettings, formatCurrency, reload }),
    [settings, loading, error, updateSettings, formatCurrency, reload]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
