import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center dark:border-red-900/50 dark:bg-red-950/30">
      <div className="mb-3 text-3xl" aria-hidden="true">
        ⚠️
      </div>
      <h3 className="text-base font-semibold text-red-800 dark:text-red-300">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-red-700 dark:text-red-400">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
