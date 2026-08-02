import { beforeEach, describe, expect, it } from 'vitest';
import { exportBackup, importBackup, validateBackupFile } from '../repositories/backupService';
import { categoryRepository, expenseRepository } from '../repositories';
import { BACKUP_SCHEMA_VERSION, type BackupFile } from '../types/backup';
import { resetTestDatabase } from './testDb';

describe('exportBackup', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await categoryRepository.ensureSeeded();
  });

  it('includes app/schema metadata and record counts', async () => {
    const categories = await categoryRepository.getActive();
    await expenseRepository.create({
      title: 'Coffee',
      amount: 450,
      categoryId: categories[0].id,
      date: '2026-07-01',
      time: '09:00',
      tags: [],
    });

    const backup = await exportBackup(false);
    expect(backup.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);
    expect(backup.data.expenses).toHaveLength(1);
    expect(backup.data.categories.length).toBeGreaterThan(0);
    expect(backup.includesReceipts).toBe(false);
    expect(backup.data.receipts).toHaveLength(0);
  });
});

describe('validateBackupFile', () => {
  it('accepts a well-formed backup', async () => {
    await resetTestDatabase();
    await categoryRepository.ensureSeeded();
    const backup = await exportBackup(false);
    const result = validateBackupFile(backup);
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('rejects a file with the wrong schema version', () => {
    const result = validateBackupFile({ schemaVersion: 999, data: {} });
    expect(result.valid).toBe(false);
    expect(result.schemaVersionMatch).toBe(false);
  });

  it('rejects a non-object payload', () => {
    const result = validateBackupFile('not an object');
    expect(result.valid).toBe(false);
  });

  it('flags records missing an id', () => {
    const malformed = {
      appVersion: '1.0.0',
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      includesReceipts: false,
      data: {
        expenses: [{ title: 'no id here' }],
        budgets: [],
        categoryBudgets: [],
        categories: [],
        paymentMethods: [],
        incomes: [],
        recurringExpenses: [],
        notifications: [],
        settings: [],
        receipts: [],
      },
    };
    const result = validateBackupFile(malformed);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.store === 'expenses')).toBe(true);
  });
});

describe('importBackup merge mode', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await categoryRepository.ensureSeeded();
  });

  it('skips records that already exist locally instead of duplicating them', async () => {
    const categories = await categoryRepository.getActive();
    const expense = await expenseRepository.create({
      title: 'Groceries',
      amount: 3200,
      categoryId: categories[0].id,
      date: '2026-07-05',
      time: '10:00',
      tags: [],
    });

    const backup: BackupFile = await exportBackup(false);
    // Simulate importing a backup that contains the same expense plus one new one.
    const newExpense = { ...expense, id: 'new-expense-id', title: 'Gas' };
    backup.data.expenses = [expense, newExpense];

    const summary = await importBackup(backup, 'merge');
    expect(summary.skipped).toBeGreaterThanOrEqual(1);

    const allExpenses = await expenseRepository.getAll();
    const titles = allExpenses.map((e) => e.title);
    expect(titles.filter((t) => t === 'Groceries')).toHaveLength(1);
    expect(titles).toContain('Gas');
  });
});

describe('importBackup replace mode', () => {
  beforeEach(async () => {
    await resetTestDatabase();
    await categoryRepository.ensureSeeded();
  });

  it('replaces existing data with the backup contents', async () => {
    const categories = await categoryRepository.getActive();
    await expenseRepository.create({
      title: 'Old expense',
      amount: 100,
      categoryId: categories[0].id,
      date: '2026-01-01',
      time: '10:00',
      tags: [],
    });

    const backup: BackupFile = await exportBackup(false);
    backup.data.expenses = [
      {
        id: 'replacement-1',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        title: 'Replacement expense',
        amount: 500,
        categoryId: categories[0].id,
        date: '2026-02-01',
        time: '10:00',
        tags: [],
      },
    ];

    await importBackup(backup, 'replace');
    const allExpenses = await expenseRepository.getAll();
    expect(allExpenses).toHaveLength(1);
    expect(allExpenses[0].title).toBe('Replacement expense');
  });
});
