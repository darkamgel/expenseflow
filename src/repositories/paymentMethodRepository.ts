import type { PaymentMethod } from '../types';
import { BaseRepository } from './baseRepository';
import { withRepositoryErrorHandling } from './errors';
import { getDatabase } from '../db/database';

class PaymentMethodRepository extends BaseRepository<PaymentMethod> {
  constructor() {
    super('paymentMethods', 'payment method');
  }

  async getActive(): Promise<PaymentMethod[]> {
    const all = await this.getAll();
    return all.filter((p) => p.status === 'active');
  }

  async isInUse(paymentMethodId: string): Promise<boolean> {
    return withRepositoryErrorHandling(async () => {
      const db = await getDatabase();
      const expenseCount = await db.expenses.where('paymentMethodId').equals(paymentMethodId).count();
      if (expenseCount > 0) return true;
      const recurringCount = await db.recurringExpenses.where('paymentMethodId').equals(paymentMethodId).count();
      return recurringCount > 0;
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
