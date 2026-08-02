import type { BaseRecord } from './common';

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'NPR', 'INR', 'CAD', 'AUD', 'JPY'] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export interface ApplicationSettings extends BaseRecord {
  /** Singleton record id, always 'default'. */
  id: string;
  displayName: string;
  currency: CurrencyCode;
  defaultMonthlyBudget: number; // smallest currency unit
  /** Lump sum of money you're starting with (e.g. current account balance), rather
   * than a recurring income figure. Optional so records saved before this field
   * existed still load cleanly. */
  startingBalance?: number; // smallest currency unit
  /** Day of month (1-28) the budget month is considered to start on. */
  firstDayOfBudgetMonth: number;
  autoGenerateRecurring: boolean;
  /** Expenses at/above this amount (smallest currency unit) trigger a "large expense" notification. */
  largeExpenseThreshold: number;
}
