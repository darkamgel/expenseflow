/** Thin wrapper around localStorage for small UI preferences only (never financial data).
 * Falls back silently when localStorage is unavailable (private browsing, disabled storage). */

function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__expenseflow_probe__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

export const localPrefsAvailable = isLocalStorageAvailable();

export function getPref<T>(key: string, fallback: T): T {
  if (!localPrefsAvailable) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function setPref<T>(key: string, value: T): void {
  if (!localPrefsAvailable) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked; preference simply won't persist this session.
  }
}

export const PREF_KEYS = {
  theme: 'expenseflow:theme',
  dashboardLayout: 'expenseflow:dashboardLayout',
  lastDateFilter: 'expenseflow:lastDateFilter',
} as const;
