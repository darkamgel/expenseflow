import type { RecurringExpense, Expense } from '../types';
import { recurringExpenseRepository, expenseRepository } from '../repositories';
import { addDays, addMonths, todayDateKey } from '../utils/date';

const MAX_OCCURRENCES_PER_RUN = 366; // safety cap so a long-neglected series can't loop forever

export function computeNextOccurrence(current: string, recurring: Pick<RecurringExpense, 'frequency' | 'customIntervalDays'>): string {
  switch (recurring.frequency) {
    case 'daily':
      return addDays(current, 1);
    case 'weekly':
      return addDays(current, 7);
    case 'biweekly':
      return addDays(current, 14);
    case 'monthly':
      return addMonths(current, 1);
    case 'quarterly':
      return addMonths(current, 3);
    case 'yearly':
      return addMonths(current, 12);
    case 'custom':
      return addDays(current, Math.max(1, recurring.customIntervalDays ?? 30));
    default:
      return addMonths(current, 1);
  }
}

export interface GenerationResult {
  createdExpenses: Expense[];
  updatedSeries: RecurringExpense[];
}

/**
 * Runs on app open (there's no backend scheduler). For each active,
 * auto-generating recurring expense whose nextOccurrence has arrived, walks
 * forward creating one expense per due date up to today (or the series end
 * date), then advances nextOccurrence/lastGeneratedDate so the same date is
 * never generated twice.
 */
export async function generateDueRecurringExpenses(): Promise<GenerationResult> {
  const allRecurring = await recurringExpenseRepository.getActive();
  const today = todayDateKey();
  const createdExpenses: Expense[] = [];
  const updatedSeries: RecurringExpense[] = [];

  for (const series of allRecurring) {
    if (!series.autoGenerate) continue;

    let cursor = series.nextOccurrence;
    let lastGenerated = series.lastGeneratedDate;
    let iterations = 0;
    const dueDates: string[] = [];

    while (cursor <= today && iterations < MAX_OCCURRENCES_PER_RUN) {
      if (series.endDate && cursor > series.endDate) break;
      if (cursor !== lastGenerated) {
        dueDates.push(cursor);
        lastGenerated = cursor;
      }
      cursor = computeNextOccurrence(cursor, series);
      iterations += 1;
    }

    if (dueDates.length === 0) continue;

    for (const dueDate of dueDates) {
      const expense = await expenseRepository.create({
        title: series.title,
        amount: series.amount,
        categoryId: series.categoryId,
        date: dueDate,
        time: '09:00',
        paymentMethodId: series.paymentMethodId,
        tags: [],
        recurringExpenseId: series.id,
      });
      createdExpenses.push(expense);
    }

    const updated = await recurringExpenseRepository.update(series.id, {
      nextOccurrence: cursor,
      lastGeneratedDate: lastGenerated,
    });
    updatedSeries.push(updated);
  }

  return { createdExpenses, updatedSeries };
}
