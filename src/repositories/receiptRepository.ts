import type { Receipt } from '../types';
import { supabase } from '../supabase/client';
import { getCurrentUserId } from '../supabase/auth';
import { withRepositoryErrorHandling } from './errors';
import { generateId } from '../utils/id';
import type { Database } from '../supabase/database.types';

type ReceiptRow = Database['public']['Tables']['receipts']['Row'];

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const BUCKET = 'receipts';

interface CreateReceiptInput {
  expenseId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
}

function rowToReceiptMeta(row: ReceiptRow): Omit<Receipt, 'blob'> {
  return {
    id: row.id,
    expenseId: row.expense_id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Receipt files live in Supabase Storage (path "{userId}/{receiptId}-{fileName}",
 * scoped by storage RLS policy); this table only holds metadata plus that
 * path. Doesn't extend BaseRepository since every read needs an extra
 * Storage download to hydrate the blob, unlike the other plain-Postgres repos.
 */
class ReceiptRepository {
  validateFile(file: File): { valid: boolean; reason?: string } {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return { valid: false, reason: 'Only JPEG, PNG, WebP, or PDF files are supported.' };
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      return { valid: false, reason: 'Receipt files must be smaller than 5 MB.' };
    }
    return { valid: true };
  }

  async create(input: CreateReceiptInput): Promise<Receipt> {
    return withRepositoryErrorHandling(async () => {
      const userId = await getCurrentUserId();
      const id = generateId();
      const storagePath = `${userId}/${id}-${input.fileName}`;

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, input.blob, {
        contentType: input.mimeType,
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const now = Date.now();
      const { data, error } = await supabase
        .from('receipts')
        .insert({
          id,
          expense_id: input.expenseId,
          file_name: input.fileName,
          mime_type: input.mimeType,
          size_bytes: input.sizeBytes,
          storage_path: storagePath,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        await supabase.storage.from(BUCKET).remove([storagePath]);
        throw error;
      }
      return { ...rowToReceiptMeta(data as ReceiptRow), blob: input.blob };
    }, 'create receipt');
  }

  async getById(id: string): Promise<Receipt | undefined> {
    return withRepositoryErrorHandling(async () => {
      const { data, error } = await supabase.from('receipts').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return undefined;
      const row = data as ReceiptRow;
      return { ...rowToReceiptMeta(row), blob: await this.downloadBlob(row.storage_path) };
    }, 'load receipt');
  }

  async getByExpenseId(expenseId: string): Promise<Receipt | undefined> {
    return withRepositoryErrorHandling(async () => {
      const { data, error } = await supabase.from('receipts').select('*').eq('expense_id', expenseId).maybeSingle();
      if (error) throw error;
      if (!data) return undefined;
      const row = data as ReceiptRow;
      return { ...rowToReceiptMeta(row), blob: await this.downloadBlob(row.storage_path) };
    }, 'load receipt');
  }

  private async downloadBlob(storagePath: string): Promise<Blob> {
    const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    return withRepositoryErrorHandling(async () => {
      const { data, error: fetchError } = await supabase.from('receipts').select('storage_path').eq('id', id).maybeSingle();
      if (fetchError) throw fetchError;
      if (data) await supabase.storage.from(BUCKET).remove([(data as { storage_path: string }).storage_path]);
      const { error } = await supabase.from('receipts').delete().eq('id', id);
      if (error) throw error;
    }, 'delete receipt');
  }

  async bulkDelete(ids: string[]): Promise<void> {
    if (!ids.length) return;
    return withRepositoryErrorHandling(async () => {
      const { data, error: fetchError } = await supabase.from('receipts').select('storage_path').in('id', ids);
      if (fetchError) throw fetchError;
      const paths = (data ?? []).map((r) => (r as { storage_path: string }).storage_path);
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
      const { error } = await supabase.from('receipts').delete().in('id', ids);
      if (error) throw error;
    }, 'delete receipts');
  }

  /** Fetches every receipt including its file contents. Only used for full backup export
   * (the app never loads every receipt Blob just to render a transaction list). */
  async getAllWithBlobs(): Promise<Receipt[]> {
    return withRepositoryErrorHandling(async () => {
      const { data, error } = await supabase.from('receipts').select('*');
      if (error) throw error;
      const rows = (data ?? []) as ReceiptRow[];
      return Promise.all(rows.map(async (row) => ({ ...rowToReceiptMeta(row), blob: await this.downloadBlob(row.storage_path) })));
    }, 'export receipts');
  }

  async listIds(): Promise<string[]> {
    return withRepositoryErrorHandling(async () => {
      const { data, error } = await supabase.from('receipts').select('id');
      if (error) throw error;
      return (data ?? []).map((row) => (row as { id: string }).id);
    }, 'list receipts');
  }

  /** Restores a receipt with its original id/timestamps preserved, so the
   * expense.receiptId that referenced it keeps pointing at the right row.
   * Used by backup import — a fresh create() would mint a new id instead. */
  async restore(receipt: Receipt): Promise<Receipt> {
    return withRepositoryErrorHandling(async () => {
      const userId = await getCurrentUserId();
      const storagePath = `${userId}/${receipt.id}-${receipt.fileName}`;

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, receipt.blob, {
        contentType: receipt.mimeType,
        upsert: true,
      });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from('receipts')
        .upsert({
          id: receipt.id,
          expense_id: receipt.expenseId,
          file_name: receipt.fileName,
          mime_type: receipt.mimeType,
          size_bytes: receipt.sizeBytes,
          storage_path: storagePath,
          created_at: receipt.createdAt,
          updated_at: receipt.updatedAt,
        })
        .select()
        .single();
      if (error) throw error;
      return { ...rowToReceiptMeta(data as ReceiptRow), blob: receipt.blob };
    }, 'restore receipt');
  }
}

export const receiptRepository = new ReceiptRepository();
export { MAX_RECEIPT_BYTES, ALLOWED_MIME_TYPES };
