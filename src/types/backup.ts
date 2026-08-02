import type { Expense } from './expense';
import type { Budget, CategoryBudget } from './budget';
import type { Category } from './category';
import type { PaymentMethod } from './paymentMethod';
import type { Income } from './income';
import type { RecurringExpense } from './recurringExpense';
import type { AppNotification } from './notification';
import type { ApplicationSettings } from './settings';

export const BACKUP_SCHEMA_VERSION = 1;
export const APP_VERSION = '1.0.0';

/** A receipt serialized for JSON export: the Blob is base64-encoded. */
export interface SerializedReceipt {
  id: string;
  expenseId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  data: string; // base64
  createdAt: number;
  updatedAt: number;
}

export interface BackupFile {
  appVersion: string;
  schemaVersion: number;
  exportedAt: string; // ISO timestamp
  includesReceipts: boolean;
  data: {
    expenses: Expense[];
    budgets: Budget[];
    categoryBudgets: CategoryBudget[];
    categories: Category[];
    paymentMethods: PaymentMethod[];
    incomes: Income[];
    recurringExpenses: RecurringExpense[];
    notifications: AppNotification[];
    settings: ApplicationSettings[];
    receipts: SerializedReceipt[];
  };
}

export interface BackupValidationIssue {
  store: string;
  recordIndex: number;
  reason: string;
}

export interface BackupValidationResult {
  valid: boolean;
  schemaVersionMatch: boolean;
  recordCounts: Record<string, number>;
  issues: BackupValidationIssue[];
}

export type ImportMode = 'merge' | 'replace';
