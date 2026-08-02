import type { Receipt } from '../types';
import { BaseRepository } from './baseRepository';
import { withRepositoryErrorHandling } from './errors';
import { getDatabase } from '../db/database';

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

class ReceiptRepository extends BaseRepository<Receipt> {
  constructor() {
    super('receipts', 'receipt');
  }

  validateFile(file: File): { valid: boolean; reason?: string } {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { valid: false, reason: 'Only JPEG, PNG, WebP, or PDF files are supported.' };
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      return { valid: false, reason: 'Receipt files must be smaller than 5 MB.' };
    }
    return { valid: true };
  }

  async getByExpenseId(expenseId: string): Promise<Receipt | undefined> {
    return withRepositoryErrorHandling(async () => {
      const db = await getDatabase();
      return db.receipts.where('expenseId').equals(expenseId).first();
    }, 'load receipt');
  }
}

export const receiptRepository = new ReceiptRepository();
export { MAX_RECEIPT_BYTES, ALLOWED_MIME_TYPES };
