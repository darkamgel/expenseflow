import { useCallback, useEffect, useState } from 'react';
import { notificationRepository } from '../../repositories';
import type { AppNotification } from '../../types';
import { formatDateDisplay, toDateKey } from '../../utils/date';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    try {
      const [recent, unread] = await Promise.all([
        notificationRepository.getRecentSorted(20),
        notificationRepository.getUnreadCount(),
      ]);
      setNotifications(recent);
      setUnreadCount(unread);
    } catch {
      // Notifications are a non-critical enhancement; fail silently if storage is unavailable.
    }
  }, []);

  useEffect(() => {
    load();
    const interval = window.setInterval(load, 60_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const handleOpen = async () => {
    setOpen((v) => !v);
  };

  const handleMarkAllRead = async () => {
    await notificationRepository.markAllRead();
    await load();
  };

  const handleItemClick = async (id: string) => {
    await notificationRepository.markRead(id);
    await load();
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <span className="text-lg" aria-hidden="true">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs font-medium text-emerald-600 hover:underline dark:text-emerald-400">
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">No notifications yet.</p>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => handleItemClick(n.id)}
                      className={`block w-full px-4 py-3 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 ${
                        n.read ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-slate-800 dark:text-slate-100">{n.title}</span>
                        {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{n.message}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{formatDateDisplay(toDateKey(new Date(n.createdAt)))}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
