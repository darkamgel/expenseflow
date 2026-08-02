import Dexie, { type Table } from 'dexie';
import type {
  Expense,
  Budget,
  CategoryBudget,
  Category,
  PaymentMethod,
  RecurringExpense,
  Income,
  AppNotification,
  ApplicationSettings,
  Receipt,
  MetadataRecord,
} from '../types';

/**
 * Migration strategy: every schema change gets its own `.version(n).stores(...)`
 * block, applied in order by Dexie. Add new stores/indexes as a new version
 * rather than editing an existing one, and use `.upgrade(tx => ...)` when
 * existing rows need to be transformed. Never remove a version block that a
 * deployed build has already shipped, since a user's existing database may
 * still be sitting at that version and needs a path forward.
 */
export class ExpenseFlowDatabase extends Dexie {
  expenses!: Table<Expense, string>;
  budgets!: Table<Budget, string>;
  categoryBudgets!: Table<CategoryBudget, string>;
  categories!: Table<Category, string>;
  paymentMethods!: Table<PaymentMethod, string>;
  recurringExpenses!: Table<RecurringExpense, string>;
  incomes!: Table<Income, string>;
  notifications!: Table<AppNotification, string>;
  settings!: Table<ApplicationSettings, string>;
  receipts!: Table<Receipt, string>;
  metadata!: Table<MetadataRecord, string>;

  constructor() {
    super('expenseflow');

    this.version(1).stores({
      expenses:
        'id, date, categoryId, paymentMethodId, merchant, recurringExpenseId, createdAt, updatedAt',
      budgets: 'id, year, month, [year+month], createdAt, updatedAt',
      categoryBudgets: 'id, budgetId, categoryId, createdAt, updatedAt',
      categories: 'id, status, sortOrder, createdAt, updatedAt',
      paymentMethods: 'id, status, type, createdAt, updatedAt',
      recurringExpenses:
        'id, active, nextOccurrence, categoryId, paymentMethodId, createdAt, updatedAt',
      incomes: 'id, date, recurring, createdAt, updatedAt',
      notifications: 'id, read, type, createdAt, updatedAt',
      settings: 'id',
      receipts: 'id, expenseId, createdAt, updatedAt',
      metadata: 'key, updatedAt',
    });
  }
}

export const SCHEMA_VERSION = 1;

let dbInstance: ExpenseFlowDatabase | null = null;
let openError: unknown = null;

export class StorageUnavailableError extends Error {
  cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'StorageUnavailableError';
    this.cause = cause;
  }
}

/**
 * Detects environments where IndexedDB is missing or non-functional
 * (older private-browsing modes, storage disabled by policy, etc.) without
 * throwing, so the UI can show a graceful fallback instead of a blank screen.
 */
export async function checkStorageAvailability(): Promise<{ available: boolean; reason?: string }> {
  if (typeof indexedDB === 'undefined') {
    return { available: false, reason: 'This browser does not support local storage (IndexedDB).' };
  }
  try {
    const testDb = new Dexie('expenseflow-availability-check');
    testDb.version(1).stores({ probe: 'id' });
    await testDb.open();
    await testDb.table('probe').put({ id: 'probe' });
    await testDb.table('probe').delete('probe');
    await testDb.close();
    await Dexie.delete('expenseflow-availability-check');
    return { available: true };
  } catch {
    return {
      available: false,
      reason:
        'Local storage could not be opened. This often happens in private browsing mode or when storage is disabled.',
    };
  }
}

/** Lazily opens the shared database instance, caching failures so repeated calls don't hang. */
export async function getDatabase(): Promise<ExpenseFlowDatabase> {
  if (dbInstance) return dbInstance;
  if (openError) throw new StorageUnavailableError('Local storage is unavailable.', openError);

  const db = new ExpenseFlowDatabase();
  try {
    await db.open();
    dbInstance = db;
    return db;
  } catch (err) {
    openError = err;
    throw new StorageUnavailableError(
      'Could not open local storage. Your data may be inaccessible in this browsing session.',
      err
    );
  }
}

/** Resets the cached instance/error so a subsequent getDatabase() retries opening from scratch. */
export function resetDatabaseCache(): void {
  dbInstance = null;
  openError = null;
}
