import { Link } from 'react-router-dom';
import { OfflineIndicator } from './OfflineIndicator';
import { NotificationBell } from './NotificationBell';
import { useTheme } from '../../contexts/ThemeContext';

export function Topbar() {
  const { resolvedTheme, setMode, mode } = useTheme();

  const toggleTheme = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:px-6">
      <Link to="/" className="flex items-center gap-2 lg:hidden">
        <span className="text-xl" aria-hidden="true">💸</span>
        <span className="font-semibold text-slate-900 dark:text-slate-100">ExpenseFlow</span>
      </Link>
      <div className="ml-auto flex items-center gap-2">
        <OfflineIndicator />
        <button
          onClick={toggleTheme}
          aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <span aria-hidden="true">{resolvedTheme === 'dark' ? '☀️' : '🌙'}</span>
        </button>
        <NotificationBell />
      </div>
    </header>
  );
}
