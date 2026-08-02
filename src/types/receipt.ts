import type { BaseRecord } from './common';

export interface Receipt extends BaseRecord {
  expenseId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  blob: Blob;
}
