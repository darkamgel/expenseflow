import { useCallback, useEffect, useRef, useState } from 'react';
import type { BackupFile, BackupValidationResult } from '../types';
import { deleteAllLocalData, exportAndDownloadBackup, importBackup, validateBackupFile } from '../repositories';
import { metadataRepository, expenseRepository, categoryRepository, paymentMethodRepository } from '../repositories';
import { exportExpensesToCsv } from '../services/csvExport';
import { METADATA_KEYS } from '../types';
import { PageHeader, Card, Button, EmptyState } from '../components/common';
import { CheckboxField, InputField } from '../components/common/FormField';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { formatDateDisplay, toDateKey } from '../utils/date';

export function Backup() {
  const { settings } = useSettings();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [includeReceipts, setIncludeReceipts] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | undefined>(undefined);

  const [parsedFile, setParsedFile] = useState<BackupFile | null>(null);
  const [validation, setValidation] = useState<BackupValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const refreshLastBackup = useCallback(async () => {
    const value = await metadataRepository.get(METADATA_KEYS.lastBackupAt);
    setLastBackupAt(value);
  }, []);

  useEffect(() => {
    refreshLastBackup();
  }, [refreshLastBackup]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAndDownloadBackup(includeReceipts);
      showToast('Backup downloaded.', 'success');
      await refreshLastBackup();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not export backup.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportAllCsv = async () => {
    try {
      const [expenses, categories, methods] = await Promise.all([
        expenseRepository.getAll(),
        categoryRepository.getAll(),
        paymentMethodRepository.getAll(),
      ]);
      exportExpensesToCsv(expenses, categories, methods, settings?.currency ?? 'USD');
      showToast('CSV export downloaded.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not export CSV.', 'error');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const result = validateBackupFile(json);
      setValidation(result);
      setParsedFile(result.schemaVersionMatch ? (json as BackupFile) : null);
    } catch {
      setValidation({ valid: false, schemaVersionMatch: false, recordCounts: {}, issues: [{ store: 'file', recordIndex: -1, reason: 'This file is not valid JSON.' }] });
      setParsedFile(null);
    }
  };

  const handleImport = async (mode: 'merge' | 'replace') => {
    if (!parsedFile) return;
    if (mode === 'replace') {
      const ok = await confirm({
        title: 'Replace all local data',
        message: 'This will erase your current data and replace it with the contents of this backup. A safety backup of your current data will be downloaded first.',
        danger: true,
        confirmLabel: 'Replace data',
      });
      if (!ok) return;
    }
    setImporting(true);
    try {
      const summary = await importBackup(parsedFile, mode);
      showToast(
        `Import complete: ${summary.created} record${summary.created === 1 ? '' : 's'} added${summary.skipped ? `, ${summary.skipped} duplicate${summary.skipped === 1 ? '' : 's'} skipped` : ''}.`,
        'success'
      );
      setParsedFile(null);
      setValidation(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not import backup.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await deleteAllLocalData();
      showToast('All local data deleted.', 'success');
      window.location.href = '/';
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not delete data.', 'error');
      setDeleting(false);
    }
  };

  const daysSinceBackup = lastBackupAt ? Math.floor((Date.now() - new Date(lastBackupAt).getTime()) / 86_400_000) : null;

  return (
    <div>
      <PageHeader title="Backup & Restore" description="Your data lives only in this browser. Export backups regularly to avoid losing it." />

      <Card className="mb-5">
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Export full backup</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          {lastBackupAt
            ? `Last backup: ${formatDateDisplay(toDateKey(new Date(lastBackupAt)))}${daysSinceBackup !== null && daysSinceBackup > 0 ? ` (${daysSinceBackup} day${daysSinceBackup === 1 ? '' : 's'} ago)` : ''}.`
            : 'You have not exported a backup yet.'}
        </p>
        <CheckboxField
          label="Include receipt attachments"
          description="Receipt images/PDFs can make the backup file much larger."
          checked={includeReceipts}
          onChange={(e) => setIncludeReceipts(e.target.checked)}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting…' : 'Export backup (.json)'}
          </Button>
          <Button variant="secondary" onClick={handleExportAllCsv}>
            Export all transactions (.csv)
          </Button>
        </div>
      </Card>

      <Card className="mb-5">
        <h2 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Import backup</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">Restore from a previously exported ExpenseFlow backup file.</p>
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
          Choose backup file…
        </Button>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileSelect} className="hidden" />

        {validation && (
          <div className="mt-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            {validation.valid ? (
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">This backup file looks valid.</p>
            ) : (
              <p className="text-sm font-medium text-red-600 dark:text-red-400">This backup file has problems and cannot be imported.</p>
            )}
            <ul className="mt-2 grid grid-cols-2 gap-1 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-3">
              {Object.entries(validation.recordCounts).map(([store, count]) => (
                <li key={store}>
                  {store}: <strong>{count}</strong>
                </li>
              ))}
            </ul>
            {validation.issues.length > 0 && (
              <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto text-xs text-red-600 dark:text-red-400">
                {validation.issues.slice(0, 20).map((issue, i) => (
                  <li key={i}>
                    {issue.store}
                    {issue.recordIndex >= 0 ? ` #${issue.recordIndex}` : ''}: {issue.reason}
                  </li>
                ))}
              </ul>
            )}
            {validation.valid && parsedFile && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => handleImport('merge')} disabled={importing}>
                  {importing ? 'Importing…' : 'Merge with current data'}
                </Button>
                <Button variant="danger" onClick={() => handleImport('replace')} disabled={importing}>
                  Replace all data
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="border-red-200 dark:border-red-900/50">
        <h2 className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">Delete all local data</h2>
        <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
          This permanently erases every expense, budget, category, payment method, income record, and receipt stored in this
          browser. This cannot be undone. Export a backup first if you might need this data again.
        </p>
        <div className="max-w-xs">
          <InputField
            label='Type "DELETE" to confirm'
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="mt-3">
          <Button variant="danger" onClick={handleDeleteAll} disabled={deleteConfirmText !== 'DELETE' || deleting}>
            {deleting ? 'Deleting…' : 'Delete all local data'}
          </Button>
        </div>
      </Card>

      {!lastBackupAt && (
        <div className="mt-5">
          <EmptyState icon="🗄️" title="No backups yet" description="Export your first backup so your data isn't only stored in this one browser." />
        </div>
      )}
    </div>
  );
}
