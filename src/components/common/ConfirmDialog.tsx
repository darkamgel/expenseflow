import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import type { ConfirmOptions } from '../../contexts/ConfirmContext';

interface ConfirmDialogProps {
  pending: (ConfirmOptions & { resolve: (value: boolean) => void }) | null;
  onSettle: (value: boolean) => void;
}

export function ConfirmDialog({ pending, onSettle }: ConfirmDialogProps) {
  const [typedText, setTypedText] = useState('');

  if (!pending) return null;

  const requiresTyping = Boolean(pending.requireTypedText);
  const canConfirm = !requiresTyping || typedText === pending.requireTypedText;

  const handleClose = () => {
    setTypedText('');
    onSettle(false);
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    setTypedText('');
    onSettle(true);
  };

  return (
    <Modal
      open
      onClose={handleClose}
      title={pending.title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            {pending.cancelLabel ?? 'Cancel'}
          </Button>
          <Button variant={pending.danger ? 'danger' : 'primary'} onClick={handleConfirm} disabled={!canConfirm}>
            {pending.confirmLabel ?? 'Confirm'}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-300">{pending.message}</p>
      {requiresTyping && (
        <div className="mt-4">
          <label htmlFor="confirm-typed-text" className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
            Type <span className="font-mono font-semibold">{pending.requireTypedText}</span> to confirm
          </label>
          <input
            id="confirm-typed-text"
            value={typedText}
            onChange={(e) => setTypedText(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800"
            autoComplete="off"
          />
        </div>
      )}
    </Modal>
  );
}
