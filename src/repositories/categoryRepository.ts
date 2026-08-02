import type { Category } from '../types';
import { BaseRepository } from './baseRepository';
import { withRepositoryErrorHandling } from './errors';
import { supabase } from '../supabase/client';
import type { Database } from '../supabase/database.types';

type CategoryRow = Database['public']['Tables']['categories']['Row'];

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

class CategoryRepository extends BaseRepository<Category, CategoryRow> {
  constructor() {
    super('categories', 'category');
  }

  protected toRecord(row: CategoryRow): Category {
    return {
      id: row.id,
      name: row.name,
      icon: row.icon,
      color: row.color,
      isDefault: row.is_default,
      status: row.status as Category['status'],
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  protected toRow(record: Category): Record<string, unknown> {
    return {
      id: record.id,
      name: record.name,
      icon: record.icon,
      color: record.color,
      is_default: record.isDefault,
      status: record.status,
      sort_order: record.sortOrder,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    };
  }

  async getActive(): Promise<Category[]> {
    const all = await this.getAll();
    return all.filter((c) => c.status === 'active').sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async ensureSeeded(): Promise<void> {
    await withRepositoryErrorHandling(async () => {
      const count = await this.count();
      if (count > 0) return;
      const now = Date.now();
      const rows = DEFAULT_CATEGORIES.map((c, index) => ({
        name: c.name,
        icon: c.icon,
        color: c.color,
        is_default: true,
        status: 'active',
        sort_order: index,
        created_at: now,
        updated_at: now,
      }));
      const { error } = await supabase.from('categories').insert(rows);
      if (error) throw error;
    }, 'seed default categories');
  }

  /** A category linked to any expense (or category budget) cannot be permanently deleted;
   * archive it instead so historical expenses keep a valid category reference. */
  async isInUse(categoryId: string): Promise<boolean> {
    return withRepositoryErrorHandling(async () => {
      const [expenses, recurring, categoryBudgets] = await Promise.all([
        supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('category_id', categoryId),
        supabase.from('recurring_expenses').select('id', { count: 'exact', head: true }).eq('category_id', categoryId),
        supabase.from('category_budgets').select('id', { count: 'exact', head: true }).eq('category_id', categoryId),
      ]);
      if (expenses.error) throw expenses.error;
      if (recurring.error) throw recurring.error;
      if (categoryBudgets.error) throw categoryBudgets.error;
      return (expenses.count ?? 0) > 0 || (recurring.count ?? 0) > 0 || (categoryBudgets.count ?? 0) > 0;
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
