import { resetDatabaseCache } from '../db/database';

/** Wipes the shared IndexedDB (fake-indexeddb in test environment) and clears the
 * cached Dexie instance so each test starts from a clean, isolated database. */
export async function resetTestDatabase(): Promise<void> {
  resetDatabaseCache();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('expenseflow');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}
