import type { BaseRecord, Sampleable } from './common';

export interface Income extends BaseRecord, Sampleable {
  title: string;
  amount: number; // smallest currency unit
  date: string; // YYYY-MM-DD
  source?: string;
  category?: string;
  notes?: string;
  recurring: boolean;
}
