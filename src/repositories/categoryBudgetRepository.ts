import type { CategoryBudget } from '../types';
import { BaseRepository } from './baseRepository';
import { withRepositoryErrorHandling } from './errors';
import { supabase } from '../supabase/client';
import type { Database } from '../supabase/database.types';

type CategoryBudgetRow = Database['public']['Tables']['category_budgets']['Row'];

class CategoryBudgetRepository extends BaseRepository<CategoryBudget, CategoryBudgetRow> {
  constructor() {
    super('category_budgets', 'category budget');
  }

  protected toRecord(row: CategoryBudgetRow): CategoryBudget {
    return {
      id: row.id,
      budgetId: row.budget_id,
      categoryId: row.category_id,
      plannedAmount: row.planned_amount,
      isSample: row.is_sample,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  protected toRow(record: CategoryBudget): Record<string, unknown> {
    return {
      id: record.id,
      budget_id: record.budgetId,
      category_id: record.categoryId,
      planned_amount: record.plannedAmount,
      is_sample: record.isSample ?? false,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    };
  }

  async getForBudget(budgetId: string): Promise<CategoryBudget[]> {
    return withRepositoryErrorHandling(async () => {
      const { data, error } = await supabase.from('category_budgets').select('*').eq('budget_id', budgetId);
      if (error) throw error;
      return (data ?? []).map((row) => this.toRecord(row as CategoryBudgetRow));
    }, 'load category budgets');
  }

  async deleteForBudget(budgetId: string): Promise<void> {
    return withRepositoryErrorHandling(async () => {
      const { error } = await supabase.from('category_budgets').delete().eq('budget_id', budgetId);
      if (error) throw error;
    }, 'delete category budgets');
  }
}

export const categoryBudgetRepository = new CategoryBudgetRepository();
