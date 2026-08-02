import { useEffect, useRef, useState } from 'react';
import type { Receipt } from '../../types';
import { receiptRepository, ALLOWED_MIME_TYPES } from '../../repositories';
import { compressImageIfNeeded } from '../../services/receiptService';

interface ReceiptUploaderProps {
  existingReceipt?: Receipt;
  pendingFile: File | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
  error?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReceiptUploader({ existingReceipt, pendingFile, onSelect, onRemove, error }: ReceiptUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const activeFile = pendingFile;
  const activeMime = activeFile?.type ?? existingReceipt?.mimeType;
  const activeName = activeFile?.name ?? existingReceipt?.fileName;
  const activeSize = activeFile?.size ?? existingReceipt?.sizeBytes;
  const isImage = activeMime?.startsWith('image/');

  useEffect(() => {
    let url: string | null = null;
    if (activeFile && isImage) {
      url = URL.createObjectURL(activeFile);
      setPreviewUrl(url);
    } else if (!activeFile && existingReceipt && existingReceipt.mimeType.startsWith('image/')) {
      url = URL.createObjectURL(existingReceipt.blob);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [activeFile, existingReceipt, isImage]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const validation = receiptRepository.validateFile(file);
    if (!validation.valid) {
      setLocalError(validation.reason ?? 'Invalid file.');
      return;
    }
    setLocalError(null);
    const processed = file.type.startsWith('image/') ? await compressImageIfNeeded(file) : file;
    onSelect(processed);
  };

  const handleDownload = () => {
    const blob = activeFile ?? existingReceipt?.blob;
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeName ?? 'receipt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Receipt (optional)</label>
      {!activeName ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500 hover:border-emerald-400 hover:text-emerald-600 dark:border-slate-700 dark:text-slate-400"
        >
          <span className="text-xl" aria-hidden="true">📎</span>
          Attach a receipt (JPEG, PNG, WebP, or PDF, up to 5 MB)
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          {previewUrl ? (
            <img src={previewUrl} alt="Receipt preview" className="h-14 w-14 rounded-lg object-cover" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-slate-100 text-2xl dark:bg-slate-800" aria-hidden="true">
              📄
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{activeName}</p>
            {typeof activeSize === 'number' && <p className="text-xs text-slate-400">{formatBytes(activeSize)}</p>}
          </div>
          <button type="button" onClick={handleDownload} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Download receipt">
            ⬇️
          </button>
          <button type="button" onClick={onRemove} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950" aria-label="Remove receipt">
            🗑️
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_MIME_TYPES.join(',')}
        onChange={handleFileChange}
        className="hidden"
      />
      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">Large receipt files consume browser storage space.</p>
      {(error || localError) && (
        <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
          {error || localError}
        </p>
      )}
    </div>
  );
}
