import type { BaseRecord, Sampleable } from './common';

export type RecurringFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'custom';

export interface RecurringExpense extends BaseRecord, Sampleable {
  title: string;
  amount: number; // smallest currency unit
  categoryId: string;
  paymentMethodId?: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
  frequency: RecurringFrequency;
  /** Only used when frequency === 'custom'. Number of days between occurrences. */
  customIntervalDays?: number;
  /** Next date (YYYY-MM-DD) an expense should be generated for. */
  nextOccurrence: string;
  /** Last date an expense was actually generated for, to prevent duplicates. */
  lastGeneratedDate?: string;
  autoGenerate: boolean;
  reminderEnabled: boolean;
  active: boolean;
  notes?: string;
}
