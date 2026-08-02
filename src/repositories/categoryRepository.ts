import type { Category } from '../types';
import { BaseRepository } from './baseRepository';
import { generateId } from '../utils/id';
import { withRepositoryErrorHandling } from './errors';
import { getDatabase } from '../db/database';

export const DEFAULT_CATEGORIES: Array<Pick<Category, 'name' | 'icon' | 'color'>> = [
  { name: 'Food and dining', icon: '🍽️', color: '#f97316' },
  { name: 'Groceries', icon: '🛒', color: '#22c55e' },
  { name: 'Rent', icon: '🏠', color: '#6366f1' },
  { name: 'Transportation', icon: '🚌', color: '#0ea5e9' },
  { name: 'Fuel', icon: '⛽', color: '#eab308' },
  { name: 'Shopping', icon: '🛍️', color: '#ec4899' },
  { name: 'Entertainment', icon: '🎬', color: '#a855f7' },
  { name: 'Utilities', icon: '💡', color: '#14b8a6' },
  { name: 'Education', icon: '🎓', color: '#3b82f6' },
  { name: 'Healthcare', icon: '🏥', color: '#ef4444' },
  { name: 'Travel', icon: '✈️', color: '#06b6d4' },
  { name: 'Subscriptions', icon: '🔁', color: '#8b5cf6' },
  { name: 'Insurance', icon: '🛡️', color: '#64748b' },
  { name: 'Personal care', icon: '💆', color: '#f43f5e' },
  { name: 'Gifts', icon: '🎁', color: '#d946ef' },
  { name: 'Other', icon: '📦', color: '#94a3b8' },
];

class CategoryRepository extends BaseRepository<Category> {
  constructor() {
    super('categories', 'category');
  }

  async getActive(): Promise<Category[]> {
    const all = await this.getAll();
    return all.filter((c) => c.status === 'active').sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async ensureSeeded(): Promise<void> {
    await withRepositoryErrorHandling(async () => {
      const count = await this.count();
      if (count > 0) return;
      const db = await getDatabase();
      const now = Date.now();
      const records: Category[] = DEFAULT_CATEGORIES.map((c, index) => ({
        ...c,
        id: generateId(),
        isDefault: true,
        status: 'active',
        sortOrder: index,
        createdAt: now,
        updatedAt: now,
      }));
      await db.categories.bulkAdd(records);
    }, 'seed default categories');
  }

  /** A category linked to any expense (or category budget) cannot be permanently deleted;
   * archive it instead so historical expenses keep a valid category reference. */
  async isInUse(categoryId: string): Promise<boolean> {
    return withRepositoryErrorHandling(async () => {
      const db = await getDatabase();
      const expenseCount = await db.expenses.where('categoryId').equals(categoryId).count();
      if (expenseCount > 0) return true;
      const recurringCount = await db.recurringExpenses.where('categoryId').equals(categoryId).count();
      if (recurringCount > 0) return true;
      const budgetCount = await db.categoryBudgets.where('categoryId').equals(categoryId).count();
      return budgetCount > 0;
    }, 'check category usage');
  }

  async archive(id: string): Promise<Category> {
    return this.update(id, { status: 'archived' });
  }

  async unarchive(id: string): Promise<Category> {
    return this.update(id, { status: 'active' });
  }

  /** Deletes only if unused; otherwise archives as a safe fallback. Returns the action taken. */
  async deleteOrArchive(id: string): Promise<'deleted' | 'archived'> {
    const inUse = await this.isInUse(id);
    if (inUse) {
      await this.archive(id);
      return 'archived';
    }
    await this.delete(id);
    return 'deleted';
  }
}

export const categoryRepository = new CategoryRepository();
