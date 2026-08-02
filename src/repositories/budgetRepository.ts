import type { Budget } from '../types';
import { BaseRepository } from './baseRepository';
import { withRepositoryErrorHandling } from './errors';
import { getDatabase } from '../db/database';

class BudgetRepository extends BaseRepository<Budget> {
  constructor() {
    super('budgets', 'budget');
  }

  async getForMonth(year: number, month: number): Promise<Budget | undefined> {
    return withRepositoryErrorHandling(async () => {
      const db = await getDatabase();
      return db.budgets.where('[year+month]').equals([year, month]).first();
    }, 'load budget for month');
  }

  async getAllSorted(): Promise<Budget[]> {
    const all = await this.getAll();
    return all.sort((a, b) => (a.year === b.year ? b.month - a.month : b.year - a.year));
  }
}

export const budgetRepository = new BudgetRepository();
