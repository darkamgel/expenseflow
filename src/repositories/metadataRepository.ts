import { withRepositoryErrorHandling } from './errors';
import { getDatabase } from '../db/database';

class MetadataRepository {
  async get(key: string): Promise<string | undefined> {
    return withRepositoryErrorHandling(async () => {
      const db = await getDatabase();
      const record = await db.metadata.get(key);
      return record?.value;
    }, 'load metadata');
  }

  async set(key: string, value: string): Promise<void> {
    return withRepositoryErrorHandling(async () => {
      const db = await getDatabase();
      await db.metadata.put({ key, value, updatedAt: Date.now() });
    }, 'save metadata');
  }
}

export const metadataRepository = new MetadataRepository();
