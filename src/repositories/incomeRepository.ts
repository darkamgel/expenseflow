import type { Income } from '../types';
import { BaseRepository } from './baseRepository';
import { withRepositoryErrorHandling } from './errors';
import { supabase } from '../supabase/client';
import type { Database } from '../supabase/database.types';
import { isDateKeyInRange } from '../utils/date';

type IncomeRow = Database['public']['Tables']['incomes']['Row'];

class IncomeRepository extends BaseRepository<Income, IncomeRow> {
  constructor() {
    super('incomes', 'income');
  }

  protected toRecord(row: IncomeRow): Income {
    return {
      id: row.id,
      title: row.title,
      amount: row.amount,
      date: row.date,
      source: row.source ?? undefined,
      category: row.category ?? undefined,
      notes: row.notes ?? undefined,
      recurring: row.recurring,
      isSample: row.is_sample,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  protected toRow(record: Income): Record<string, unknown> {
    return {
      id: record.id,
      title: record.title,
      amount: record.amount,
      date: record.date,
      source: record.source ?? null,
      category: record.category ?? null,
      notes: record.notes ?? null,
      recurring: record.recurring,
      is_sample: record.isSample ?? false,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    };
  }

  async getByDateRange(from: string, to: string): Promise<Income[]> {
    return withRepositoryErrorHandling(async () => {
      const { data, error } = await supabase.from('incomes').select('*').gte('date', from).lte('date', to);
      if (error) throw error;
      return (data ?? []).map((row) => this.toRecord(row as IncomeRow));
    }, 'load income for date range');
  }

  /** In-memory helper for callers that already have a loaded income list. */
  filterInMemory(incomes: Income[], from: string, to: string): Income[] {
    return incomes.filter((i) => isDateKeyInRange(i.date, from, to));
  }
}

export const incomeRepository = new IncomeRepository();
