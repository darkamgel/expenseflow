import { supabase } from '../supabase/client';
import { getCurrentUserId } from '../supabase/auth';
import { withRepositoryErrorHandling } from './errors';
import { base64ToBlob, blobToBase64, downloadTextFile } from '../services/blobUtils';
import { metadataRepository } from './metadataRepository';
import { categoryRepository } from './categoryRepository';
import { paymentMethodRepository } from './paymentMethodRepository';
import { expenseRepository } from './expenseRepository';
import { budgetRepository } from './budgetRepository';
import { categoryBudgetRepository } from './categoryBudgetRepository';
import { incomeRepository } from './incomeRepository';
import { recurringExpenseRepository } from './recurringExpenseRepository';
import { notificationRepository } from './notificationRepository';
import { settingsRepository } from './settingsRepository';
import { receiptRepository } from './receiptRepository';
import { METADATA_KEYS, type BaseRecord } from '../types';
import {
  BACKUP_SCHEMA_VERSION,
  APP_VERSION,
  type BackupFile,
  type BackupValidationResult,
  type BackupValidationIssue,
  type ImportMode,
  type SerializedReceipt,
} from '../types/backup';

export async function exportBackup(includeReceipts: boolean): Promise<BackupFile> {
  return withRepositoryErrorHandling(async () => {
    const [expenses, budgets, categoryBudgets, categories, paymentMethods, incomes, recurringExpenses, notifications, settings, receipts] =
      await Promise.all([
        expenseRepository.getAll(),
        budgetRepository.getAll(),
        categoryBudgetRepository.getAll(),
        categoryRepository.getAll(),
        paymentMethodRepository.getAll(),
        incomeRepository.getAll(),
        recurringExpenseRepository.getAll(),
        notificationRepository.getAll(),
        settingsRepository.get().then((s) => [s]),
        includeReceipts ? receiptRepository.getAllWithBlobs() : Promise.resolve([]),
      ]);

    const serializedReceipts: SerializedReceipt[] = await Promise.all(
      receipts.map(async (r) => ({
        id: r.id,
        expenseId: r.expenseId,
        fileName: r.fileName,
        mimeType: r.mimeType,
        sizeBytes: r.sizeBytes,
        data: await blobToBase64(r.blob),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }))
    );

    const backup: BackupFile = {
      appVersion: APP_VERSION,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      includesReceipts: includeReceipts,
      data: {
        expenses,
        budgets,
        categoryBudgets,
        categories,
        paymentMethods,
        incomes,
        recurringExpenses,
        notifications,
        settings,
        receipts: serializedReceipts,
      },
    };

    await metadataRepository.set(METADATA_KEYS.lastBackupAt, new Date().toISOString());
    return backup;
  }, 'export backup');
}

export function backupFileName(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `expenseflow-backup-${y}-${m}-${d}.json`;
}

export async function exportAndDownloadBackup(includeReceipts: boolean): Promise<void> {
  const backup = await exportBackup(includeReceipts);
  downloadTextFile(backupFileName(), JSON.stringify(backup, null, 2));
}

const REQUIRED_ARRAYS = [
  'expenses',
  'budgets',
  'categoryBudgets',
  'categories',
  'paymentMethods',
  'incomes',
  'recurringExpenses',
  'notifications',
  'settings',
  'receipts',
] as const;

export function validateBackupFile(raw: unknown): BackupValidationResult {
  const issues: BackupValidationIssue[] = [];
  const recordCounts: Record<string, number> = {};

  if (typeof raw !== 'object' || raw === null) {
    return { valid: false, schemaVersionMatch: false, recordCounts, issues: [{ store: 'file', recordIndex: -1, reason: 'File is not a valid JSON object.' }] };
  }

  const file = raw as Partial<BackupFile>;
  const schemaVersionMatch = file.schemaVersion === BACKUP_SCHEMA_VERSION;
  if (typeof file.schemaVersion !== 'number') {
    issues.push({ store: 'file', recordIndex: -1, reason: 'Missing or invalid schemaVersion.' });
  } else if (!schemaVersionMatch) {
    issues.push({ store: 'file', recordIndex: -1, reason: `Backup schema version ${file.schemaVersion} does not match the app's expected version ${BACKUP_SCHEMA_VERSION}.` });
  }

  if (!file.data || typeof file.data !== 'object') {
    issues.push({ store: 'file', recordIndex: -1, reason: 'Missing data section.' });
    return { valid: false, schemaVersionMatch, recordCounts, issues };
  }

  for (const storeName of REQUIRED_ARRAYS) {
    const arr = (file.data as Record<string, unknown>)[storeName];
    if (!Array.isArray(arr)) {
      issues.push({ store: storeName, recordIndex: -1, reason: `Expected an array for "${storeName}".` });
      recordCounts[storeName] = 0;
      continue;
    }
    recordCounts[storeName] = arr.length;
    arr.forEach((record, index) => {
      if (typeof record !== 'object' || record === null || typeof (record as { id?: unknown }).id !== 'string') {
        issues.push({ store: storeName, recordIndex: index, reason: 'Record is missing a valid id.' });
      }
    });
  }

  const valid = schemaVersionMatch && issues.length === 0;
  return { valid, schemaVersionMatch, recordCounts, issues };
}

export interface ImportSummary {
  mode: ImportMode;
  created: number;
  skipped: number;
  safetyBackupFileName?: string;
}

interface PutRepository<T extends BaseRecord> {
  getAll: () => Promise<T[]>;
  put: (record: T) => Promise<T>;
}

async function importRecords<T extends BaseRecord>(
  repo: PutRepository<T>,
  records: T[],
  mode: ImportMode
): Promise<{ created: number; skipped: number }> {
  if (!records.length) return { created: 0, skipped: 0 };

  let existingIds = new Set<string>();
  if (mode === 'merge') {
    existingIds = new Set((await repo.getAll()).map((r) => r.id));
  }

  let created = 0;
  let skipped = 0;
  for (const record of records) {
    if (mode === 'merge' && existingIds.has(record.id)) {
      skipped += 1;
      continue;
    }
    await repo.put(record);
    created += 1;
  }
  return { created, skipped };
}

/** Permanently clears every table (and receipt files) for the signed-in user.
 * Callers must gate this behind confirmation — there is no undo once it resolves. */
export async function deleteAllLocalData(): Promise<void> {
  return withRepositoryErrorHandling(async () => {
    const userId = await getCurrentUserId();
    await Promise.all([
      expenseRepository.clear(),
      categoryRepository.clear(),
      paymentMethodRepository.clear(),
      budgetRepository.clear(),
      categoryBudgetRepository.clear(),
      incomeRepository.clear(),
      recurringExpenseRepository.clear(),
      notificationRepository.clear(),
      supabase.from('settings').delete().eq('user_id', userId),
      supabase.from('metadata').delete().eq('user_id', userId),
      supabase.from('receipts').delete().eq('user_id', userId),
    ]);

    const { data: files } = await supabase.storage.from('receipts').list(userId);
    if (files?.length) {
      await supabase.storage.from('receipts').remove(files.map((f) => `${userId}/${f.name}`));
    }
  }, 'delete all data');
}

export async function importBackup(backup: BackupFile, mode: ImportMode): Promise<ImportSummary> {
  return withRepositoryErrorHandling(async () => {
    let safetyBackupFileName: string | undefined;

    if (mode === 'replace') {
      const safety = await exportBackup(true);
      safetyBackupFileName = backupFileName(new Date()).replace('backup', 'safety-backup');
      downloadTextFile(safetyBackupFileName, JSON.stringify(safety, null, 2));
      await deleteAllLocalData();
    }

    let created = 0;
    let skipped = 0;

    const tally = (result: { created: number; skipped: number }) => {
      created += result.created;
      skipped += result.skipped;
    };

    // Each table is imported as its own set of requests (Supabase's REST API
    // doesn't expose cross-table transactions to the client), so a failure
    // partway through can leave a partial import — the merge/replace + safety
    // backup flow above is the safeguard, not a database-level rollback.
    tally(await importRecords(categoryRepository, backup.data.categories, mode));
    tally(await importRecords(paymentMethodRepository, backup.data.paymentMethods, mode));
    tally(await importRecords(expenseRepository, backup.data.expenses, mode));
    tally(await importRecords(budgetRepository, backup.data.budgets, mode));
    tally(await importRecords(categoryBudgetRepository, backup.data.categoryBudgets, mode));
    tally(await importRecords(incomeRepository, backup.data.incomes, mode));
    tally(await importRecords(recurringExpenseRepository, backup.data.recurringExpenses, mode));
    tally(await importRecords(notificationRepository, backup.data.notifications, mode));

    if (backup.data.receipts.length) {
      const existingReceiptIds = mode === 'merge' ? new Set(await receiptRepository.listIds()) : new Set<string>();
      for (const r of backup.data.receipts) {
        if (mode === 'merge' && existingReceiptIds.has(r.id)) {
          skipped += 1;
          continue;
        }
        await receiptRepository.restore({
          id: r.id,
          expenseId: r.expenseId,
          fileName: r.fileName,
          mimeType: r.mimeType,
          sizeBytes: r.sizeBytes,
          blob: base64ToBlob(r.data, r.mimeType),
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        });
        created += 1;
      }
    }

    if (mode === 'replace' && backup.data.settings.length) {
      const latestSettings = backup.data.settings[backup.data.settings.length - 1];
      await settingsRepository.update(latestSettings);
    }

    return { mode, created, skipped, safetyBackupFileName };
  }, 'import backup');
}
