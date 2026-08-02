import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-5 dark:border-slate-800 dark:bg-slate-900 lg:flex">
      <div className="mb-6 flex items-center gap-2 px-2">
        <span className="text-2xl" aria-hidden="true">💸</span>
        <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">ExpenseFlow</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`
            }
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <p className="mt-4 px-2 text-[11px] leading-snug text-slate-400 dark:text-slate-500">
        Your data stays in this browser only. Export backups regularly.
      </p>
    </aside>
  );
}
