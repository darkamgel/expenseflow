import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col overflow-x-hidden">
        <Topbar />
        <main className="flex-1 px-4 pb-20 pt-4 sm:px-6 sm:pt-6 lg:pb-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
