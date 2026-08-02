import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** If set, the user must type this exact text before the confirm button is enabled. */
  requireTypedText?: string;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | undefined>(undefined);

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export function useConfirmState() {
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setPending({ ...options, resolve });
    });
  }, []);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setPending(null);
  }, []);

  return { pending, confirm, settle };
}

export function ConfirmProvider({
  children,
  confirm,
}: {
  children: ReactNode;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}) {
  const value = useMemo(() => ({ confirm }), [confirm]);
  return <ConfirmContext.Provider value={value}>{children}</ConfirmContext.Provider>;
}

export function useConfirm(): ConfirmContextValue['confirm'] {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx.confirm;
}
