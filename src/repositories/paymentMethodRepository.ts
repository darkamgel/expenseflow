import type { PaymentMethod } from '../types';
import { BaseRepository } from './baseRepository';
import { withRepositoryErrorHandling } from './errors';
import { supabase } from '../supabase/client';
import type { Database } from '../supabase/database.types';

type PaymentMethodRow = Database['public']['Tables']['payment_methods']['Row'];

class PaymentMethodRepository extends BaseRepository<PaymentMethod, PaymentMethodRow> {
  constructor() {
    super('payment_methods', 'payment method');
  }

  protected toRecord(row: PaymentMethodRow): PaymentMethod {
    return {
      id: row.id,
      name: row.name,
      type: row.type as PaymentMethod['type'],
      issuer: row.issuer ?? undefined,
      lastFourDigits: row.last_four_digits ?? undefined,
      creditLimit: row.credit_limit ?? undefined,
      currentBalance: row.current_balance ?? undefined,
      billingCycleStartDay: row.billing_cycle_start_day ?? undefined,
      paymentDueDay: row.payment_due_day ?? undefined,
      color: row.color,
      notes: row.notes ?? undefined,
      status: row.status as PaymentMethod['status'],
      isSample: row.is_sample,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  protected toRow(record: PaymentMethod): Record<string, unknown> {
    return {
      id: record.id,
      name: record.name,
      type: record.type,
      issuer: record.issuer ?? null,
      last_four_digits: record.lastFourDigits ?? null,
      credit_limit: record.creditLimit ?? null,
      current_balance: record.currentBalance ?? null,
      billing_cycle_start_day: record.billingCycleStartDay ?? null,
      payment_due_day: record.paymentDueDay ?? null,
      color: record.color,
      notes: record.notes ?? null,
      status: record.status,
      is_sample: record.isSample ?? false,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    };
  }

  async getActive(): Promise<PaymentMethod[]> {
    const all = await this.getAll();
    return all.filter((p) => p.status === 'active');
  }

  async isInUse(paymentMethodId: string): Promise<boolean> {
    return withRepositoryErrorHandling(async () => {
      const [expenses, recurring] = await Promise.all([
        supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('payment_method_id', paymentMethodId),
        supabase.from('recurring_expenses').select('id', { count: 'exact', head: true }).eq('payment_method_id', paymentMethodId),
      ]);
      if (expenses.error) throw expenses.error;
      if (recurring.error) throw recurring.error;
      return (expenses.count ?? 0) > 0 || (recurring.count ?? 0) > 0;
    }, 'check payment method usage');
  }

  async archive(id: string): Promise<PaymentMethod> {
    return this.update(id, { status: 'archived' });
  }

  async unarchive(id: string): Promise<PaymentMethod> {
    return this.update(id, { status: 'active' });
  }

  /** Throws if the payment method is still connected to expenses; callers should
   * catch this and offer to archive instead, per the "never delete in-use methods" rule. */
  async deleteIfUnused(id: string): Promise<void> {
    const inUse = await this.isInUse(id);
    if (inUse) {
      throw new Error('This payment method is connected to existing expenses and cannot be deleted. Archive it instead.');
    }
    await this.delete(id);
  }
}

export const paymentMethodRepository = new PaymentMethodRepository();
