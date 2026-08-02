import type { ActiveStatus, BaseRecord, Sampleable } from './common';

export type PaymentMethodType =
  | 'credit_card'
  | 'debit_card'
  | 'bank_account'
  | 'cash'
  | 'digital_wallet'
  | 'other';

/**
 * Deliberately excludes full card numbers, CVV, PIN, online-banking
 * credentials, security answers, and routing information. Only the last
 * four digits are ever collected, for display/identification purposes.
 */
export interface PaymentMethod extends BaseRecord, Sampleable {
  name: string;
  type: PaymentMethodType;
  issuer?: string;
  lastFourDigits?: string;
  creditLimit?: number; // smallest currency unit
  currentBalance?: number; // smallest currency unit
  billingCycleStartDay?: number; // 1-31
  paymentDueDay?: number; // 1-31
  color: string;
  notes?: string;
  status: ActiveStatus;
}
