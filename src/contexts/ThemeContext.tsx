import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getPref, setPref, PREF_KEYS } from '../utils/localPrefs';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => getPref(PREF_KEYS.theme, 'system' as ThemeMode));
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => resolveTheme(mode));

  useEffect(() => {
    const applied = resolveTheme(mode);
    setResolvedTheme(applied);
    document.documentElement.classList.toggle('dark', applied === 'dark');
  }, [mode]);

  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      const applied = resolveTheme('system');
      setResolvedTheme(applied);
      document.documentElement.classList.toggle('dark', applied === 'dark');
    };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [mode]);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    setPref(PREF_KEYS.theme, next);
  };

  const value = useMemo(() => ({ mode, resolvedTheme, setMode }), [mode, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
