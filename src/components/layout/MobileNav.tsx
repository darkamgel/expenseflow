import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { MOBILE_PRIMARY_ITEMS, NAV_ITEMS } from './navItems';

export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreItems = NAV_ITEMS.filter((item) => !MOBILE_PRIMARY_ITEMS.includes(item));

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={() => setMoreOpen(false)}>
          <div
            className="absolute inset-x-0 bottom-16 rounded-t-2xl bg-white p-4 shadow-xl dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-3 gap-3">
              {moreItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className="flex flex-col items-center gap-1 rounded-xl p-3 text-center text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <span className="text-xl" aria-hidden="true">{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden"
        aria-label="Primary"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {MOBILE_PRIMARY_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            <span className="text-lg" aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className="flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400"
          aria-expanded={moreOpen}
          aria-label="More navigation options"
        >
          <span className="text-lg" aria-hidden="true">☰</span>
          More
        </button>
      </nav>
    </>
  );
}
