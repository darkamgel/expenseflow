import { beforeEach, describe, expect, it } from 'vitest';
import { checkStorageAvailability, getDatabase, SCHEMA_VERSION } from '../db/database';
import { resetTestDatabase } from './testDb';

describe('database bootstrap', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it('reports storage as available in the test environment', async () => {
    const result = await checkStorageAvailability();
    expect(result.available).toBe(true);
  });

  it('opens with every expected object store present', async () => {
    const db = await getDatabase();
    const storeNames = db.tables.map((t) => t.name).sort();
    expect(storeNames).toEqual(
      [
        'budgets',
        'categories',
        'categoryBudgets',
        'expenses',
        'incomes',
        'metadata',
        'notifications',
        'paymentMethods',
        'receipts',
        'recurringExpenses',
        'settings',
      ].sort()
    );
    expect(db.verno).toBe(SCHEMA_VERSION);
  });
});
