import type { BaseRecord, Sampleable } from './common';

export interface Budget extends BaseRecord, Sampleable {
  month: number; // 1-12
  year: number;
  totalAmount: number; // smallest currency unit
  notes?: string;
  rolloverEnabled: boolean;
}

export interface CategoryBudget extends BaseRecord, Sampleable {
  budgetId: string;
  categoryId: string;
  plannedAmount: number; // smallest currency unit
}
