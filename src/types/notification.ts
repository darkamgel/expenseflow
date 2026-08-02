import type { BaseRecord } from './common';

export type NotificationType =
  | 'budget_70'
  | 'budget_90'
  | 'budget_100'
  | 'category_over_budget'
  | 'recurring_upcoming'
  | 'payment_due'
  | 'large_expense'
  | 'backup_reminder';

export interface AppNotification extends BaseRecord {
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  /** Deduplication key so the same condition doesn't spam repeat notifications. */
  dedupeKey: string;
  relatedId?: string;
}
