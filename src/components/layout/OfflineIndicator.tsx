import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export function OfflineIndicator() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden="true" />
      Offline
    </div>
  );
}
