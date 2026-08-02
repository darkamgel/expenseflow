import type { Income } from '../types';
import { BaseRepository } from './baseRepository';
import { isDateKeyInRange } from '../utils/date';

class IncomeRepository extends BaseRepository<Income> {
  constructor() {
    super('incomes', 'income');
  }

  async getByDateRange(from: string, to: string): Promise<Income[]> {
    const all = await this.getAll();
    return all.filter((i) => isDateKeyInRange(i.date, from, to));
  }
}

export const incomeRepository = new IncomeRepository();
