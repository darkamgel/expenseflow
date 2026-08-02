import type { BaseRecord, Sampleable } from './common';

export interface Expense extends BaseRecord, Sampleable {
  title: string;
  /** Smallest currency unit (e.g. cents for USD) to avoid floating-point errors. */
  amount: number;
  categoryId: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** Local time, HH:MM (24h). */
  time: string;
  paymentMethodId?: string;
  merchant?: string;
  notes?: string;
  tags: string[];
  recurringExpenseId?: string;
  receiptId?: string;
}

export type ExpenseInput = Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>;

export type ExpenseSortField = 'date' | 'amount' | 'merchant' | 'category';
export type SortDirection = 'asc' | 'desc';

export interface ExpenseFilters {
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  categoryIds?: string[];
  paymentMethodIds?: string[];
  tags?: string[];
  minAmount?: number;
  maxAmount?: number;
  recurringOnly?: boolean;
  hasReceipt?: boolean;
}
