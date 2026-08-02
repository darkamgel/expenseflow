interface StorageUnavailableScreenProps {
  reason?: string;
  onRetry: () => void;
}

export function StorageUnavailableScreen({ reason, onRetry }: StorageUnavailableScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center dark:bg-slate-950">
      <div className="mb-4 text-5xl" aria-hidden="true">🔒</div>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Local storage isn't available</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        {reason ?? 'ExpenseFlow stores everything in your browser using IndexedDB, and this browsing session cannot access it.'}
      </p>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        This commonly happens in private/incognito browsing, when a browser setting blocks site storage, or when device
        storage is full. Try opening ExpenseFlow in a normal browsing window, or free up storage space, then retry.
      </p>
      <button
        onClick={onRetry}
        className="mt-6 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Retry
      </button>
    </div>
  );
}
