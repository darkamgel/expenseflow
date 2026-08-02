/** Small key/value records stored in the `metadata` store, e.g. backup bookkeeping. */
export interface MetadataRecord {
  key: string;
  value: string;
  updatedAt: number;
}

export const METADATA_KEYS = {
  lastBackupAt: 'lastBackupAt',
  lastRecurringGenerationRun: 'lastRecurringGenerationRun',
} as const;
