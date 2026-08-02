import type { Table } from 'dexie';
import { getDatabase } from '../db/database';
import { withRepositoryErrorHandling } from './errors';
import { blobToBase64, base64ToBlob, downloadTextFile } from '../services/blobUtils';
import { metadataRepository } from './metadataRepository';
import { METADATA_KEYS } from '../types';
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
    const db = await getDatabase();
    const [expenses, budgets, categoryBudgets, categories, paymentMethods, incomes, recurringExpenses, notifications, settings, receipts] =
      await Promise.all([
        db.expenses.toArray(),
        db.budgets.toArray(),
        db.categoryBudgets.toArray(),
        db.categories.toArray(),
        db.paymentMethods.toArray(),
        db.incomes.toArray(),
        db.recurringExpenses.toArray(),
        db.notifications.toArray(),
        db.settings.toArray(),
        includeReceipts ? db.receipts.toArray() : Promise.resolve([]),
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

export async function importBackup(backup: BackupFile, mode: ImportMode): Promise<ImportSummary> {
  return withRepositoryErrorHandling(async () => {
    const db = await getDatabase();
    let safetyBackupFileName: string | undefined;

    if (mode === 'replace') {
      const safety = await exportBackup(true);
      safetyBackupFileName = backupFileName(new Date()).replace('backup', 'safety-backup');
      downloadTextFile(safetyBackupFileName, JSON.stringify(safety, null, 2));
    }

    let created = 0;
    let skipped = 0;

    await db.transaction(
      'rw',
      [db.expenses, db.budgets, db.categoryBudgets, db.categories, db.paymentMethods, db.incomes, db.recurringExpenses, db.notifications, db.settings, db.receipts],
      async () => {
        if (mode === 'replace') {
          await Promise.all([
            db.expenses.clear(),
            db.budgets.clear(),
            db.categoryBudgets.clear(),
            db.categories.clear(),
            db.paymentMethods.clear(),
            db.incomes.clear(),
            db.recurringExpenses.clear(),
            db.notifications.clear(),
            db.receipts.clear(),
          ]);
        }

        const upsert = async <T extends { id: string }>(dbTable: Table<T, string>, records: T[]) => {
          if (mode === 'replace') {
            await dbTable.bulkPut(records);
            created += records.length;
            return;
          }
          const existingIds = new Set(await dbTable.toCollection().primaryKeys());
          const toInsert = records.filter((r) => !existingIds.has(r.id));
          if (toInsert.length) await dbTable.bulkPut(toInsert);
          created += toInsert.length;
          skipped += records.length - toInsert.length;
        };

        await upsert(db.expenses, backup.data.expenses);
        await upsert(db.categories, backup.data.categories);
        await upsert(db.paymentMethods, backup.data.paymentMethods);
        await upsert(db.budgets, backup.data.budgets);
        await upsert(db.categoryBudgets, backup.data.categoryBudgets);
        await upsert(db.incomes, backup.data.incomes);
        await upsert(db.recurringExpenses, backup.data.recurringExpenses);
        await upsert(db.notifications, backup.data.notifications);

        if (backup.data.receipts.length) {
          const existingReceiptIds = mode === 'merge' ? new Set(await db.receipts.toCollection().primaryKeys()) : new Set<string>();
          for (const r of backup.data.receipts) {
            if (mode === 'merge' && existingReceiptIds.has(r.id)) {
              skipped += 1;
              continue;
            }
            await db.receipts.put({
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

        if (backup.data.settings.length) {
          const latestSettings = backup.data.settings[backup.data.settings.length - 1];
          if (mode === 'replace') {
            await db.settings.put(latestSettings);
          }
        }
      }
    );

    return { mode, created, skipped, safetyBackupFileName };
  }, 'import backup');
}

/** Permanently clears every local data store. Callers must gate this behind the
 * "type DELETE to confirm" flow — there is no undo once this resolves. */
export async function deleteAllLocalData(): Promise<void> {
  return withRepositoryErrorHandling(async () => {
    const db = await getDatabase();
    await db.transaction(
      'rw',
      [db.expenses, db.budgets, db.categoryBudgets, db.categories, db.paymentMethods, db.incomes, db.recurringExpenses, db.notifications, db.settings, db.receipts, db.metadata],
      async () => {
        await Promise.all([
          db.expenses.clear(),
          db.budgets.clear(),
          db.categoryBudgets.clear(),
          db.categories.clear(),
          db.paymentMethods.clear(),
          db.incomes.clear(),
          db.recurringExpenses.clear(),
          db.notifications.clear(),
          db.settings.clear(),
          db.receipts.clear(),
          db.metadata.clear(),
        ]);
      }
    );
  }, 'delete all local data');
}
