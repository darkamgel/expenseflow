import type { Budget } from '../types';
import { BaseRepository } from './baseRepository';
import { withRepositoryErrorHandling } from './errors';
import { supabase } from '../supabase/client';
import type { Database } from '../supabase/database.types';

type BudgetRow = Database['public']['Tables']['budgets']['Row'];

class BudgetRepository extends BaseRepository<Budget, BudgetRow> {
  constructor() {
    super('budgets', 'budget');
  }

  protected toRecord(row: BudgetRow): Budget {
    return {
      id: row.id,
      year: row.year,
      month: row.month,
      totalAmount: row.total_amount,
      notes: row.notes ?? undefined,
      rolloverEnabled: row.rollover_enabled,
      isSample: row.is_sample,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  protected toRow(record: Budget): Record<string, unknown> {
    return {
      id: record.id,
      year: record.year,
      month: record.month,
      total_amount: record.totalAmount,
      notes: record.notes ?? null,
      rollover_enabled: record.rolloverEnabled,
      is_sample: record.isSample ?? false,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    };
  }

  async getForMonth(year: number, month: number): Promise<Budget | undefined> {
    return withRepositoryErrorHandling(async () => {
      const { data, error } = await supabase.from('budgets').select('*').eq('year', year).eq('month', month).maybeSingle();
      if (error) throw error;
      return data ? this.toRecord(data as BudgetRow) : undefined;
    }, 'load budget for month');
  }

  async getAllSorted(): Promise<Budget[]> {
    const all = await this.getAll();
    return all.sort((a, b) => (a.year === b.year ? b.month - a.month : b.year - a.year));
  }
}

export const budgetRepository = new BudgetRepository();
