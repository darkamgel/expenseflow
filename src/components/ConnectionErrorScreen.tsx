interface ConnectionErrorScreenProps {
  reason?: string;
  onRetry: () => void;
}

/** Shown when the app can't reach Supabase — e.g. no network connection, a
 * misconfigured deployment, or the Supabase project being unreachable. Since
 * ExpenseFlow is online-only, there's no local fallback to offer here. */
export function ConnectionErrorScreen({ reason, onRetry }: ConnectionErrorScreenProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center dark:bg-slate-950">
      <div className="mb-4 text-5xl" aria-hidden="true">📡</div>
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Can't reach ExpenseFlow's server</h1>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        {reason ?? 'ExpenseFlow needs an internet connection to load and save your data.'}
      </p>
      <p className="mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
        Check your connection and try again. If this keeps happening, the service may be temporarily unavailable.
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
