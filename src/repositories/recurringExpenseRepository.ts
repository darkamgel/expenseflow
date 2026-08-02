import type { RecurringExpense } from '../types';
import { BaseRepository } from './baseRepository';

class RecurringExpenseRepository extends BaseRepository<RecurringExpense> {
  constructor() {
    super('recurringExpenses', 'recurring expense');
  }

  async getActive(): Promise<RecurringExpense[]> {
    const all = await this.getAll();
    return all.filter((r) => r.active);
  }
}

export const recurringExpenseRepository = new RecurringExpenseRepository();
