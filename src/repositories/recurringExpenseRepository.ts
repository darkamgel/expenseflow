import type { RecurringExpense } from '../types';
import { BaseRepository } from './baseRepository';
import type { Database } from '../supabase/database.types';

type RecurringExpenseRow = Database['public']['Tables']['recurring_expenses']['Row'];

class RecurringExpenseRepository extends BaseRepository<RecurringExpense, RecurringExpenseRow> {
  constructor() {
    super('recurring_expenses', 'recurring expense');
  }

  protected toRecord(row: RecurringExpenseRow): RecurringExpense {
    return {
      id: row.id,
      title: row.title,
      amount: row.amount,
      categoryId: row.category_id,
      paymentMethodId: row.payment_method_id ?? undefined,
      startDate: row.start_date,
      endDate: row.end_date ?? undefined,
      frequency: row.frequency as RecurringExpense['frequency'],
      customIntervalDays: row.custom_interval_days ?? undefined,
      nextOccurrence: row.next_occurrence,
      lastGeneratedDate: row.last_generated_date ?? undefined,
      autoGenerate: row.auto_generate,
      reminderEnabled: row.reminder_enabled,
      active: row.active,
      notes: row.notes ?? undefined,
      isSample: row.is_sample,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  protected toRow(record: RecurringExpense): Record<string, unknown> {
    return {
      id: record.id,
      title: record.title,
      amount: record.amount,
      category_id: record.categoryId,
      payment_method_id: record.paymentMethodId ?? null,
      start_date: record.startDate,
      end_date: record.endDate ?? null,
      frequency: record.frequency,
      custom_interval_days: record.customIntervalDays ?? null,
      next_occurrence: record.nextOccurrence,
      last_generated_date: record.lastGeneratedDate ?? null,
      auto_generate: record.autoGenerate,
      reminder_enabled: record.reminderEnabled,
      active: record.active,
      notes: record.notes ?? null,
      is_sample: record.isSample ?? false,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    };
  }

  async getActive(): Promise<RecurringExpense[]> {
    const all = await this.getAll();
    return all.filter((r) => r.active);
  }
}

export const recurringExpenseRepository = new RecurringExpenseRepository();
