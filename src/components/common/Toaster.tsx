import { useToast, type ToastVariant } from '../../contexts/ToastContext';

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-slate-800 text-white dark:bg-slate-700',
};

export function Toaster() {
  const { toasts, dismissToast } = useToast();

  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:pr-6"
      aria-live="polite"
      role="status"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex w-full max-w-sm items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm shadow-lg ${VARIANT_STYLES[toast.variant]}`}
        >
          <span>{toast.message}</span>
          <button onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification" className="shrink-0 opacity-80 hover:opacity-100">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
