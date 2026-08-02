import type { CategoryBudget } from '../types';
import { BaseRepository } from './baseRepository';
import { withRepositoryErrorHandling } from './errors';
import { getDatabase } from '../db/database';

class CategoryBudgetRepository extends BaseRepository<CategoryBudget> {
  constructor() {
    super('categoryBudgets', 'category budget');
  }

  async getForBudget(budgetId: string): Promise<CategoryBudget[]> {
    return withRepositoryErrorHandling(async () => {
      const db = await getDatabase();
      return db.categoryBudgets.where('budgetId').equals(budgetId).toArray();
    }, 'load category budgets');
  }

  async deleteForBudget(budgetId: string): Promise<void> {
    return withRepositoryErrorHandling(async () => {
      const db = await getDatabase();
      const ids = await db.categoryBudgets.where('budgetId').equals(budgetId).primaryKeys();
      await db.categoryBudgets.bulkDelete(ids);
    }, 'delete category budgets');
  }
}

export const categoryBudgetRepository = new CategoryBudgetRepository();
