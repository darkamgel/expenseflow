export function Spinner({ label = 'Loading…', size = 'md' }: { label?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dimension = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-9 w-9' : 'h-6 w-6';
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-slate-400" role="status" aria-live="polite">
      <span
        className={`${dimension} animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600 dark:border-slate-700 dark:border-t-emerald-500`}
        aria-hidden="true"
      />
      <span className="text-sm">{label}</span>
    </div>
  );
}
