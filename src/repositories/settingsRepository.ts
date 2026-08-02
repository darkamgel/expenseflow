import type { ApplicationSettings } from '../types';
import { withRepositoryErrorHandling } from './errors';
import { getDatabase } from '../db/database';

const SETTINGS_ID = 'default';

export const DEFAULT_SETTINGS: Omit<ApplicationSettings, 'createdAt' | 'updatedAt'> = {
  id: SETTINGS_ID,
  displayName: '',
  currency: 'USD',
  defaultMonthlyBudget: 0,
  startingBalance: 0,
  firstDayOfBudgetMonth: 1,
  autoGenerateRecurring: true,
  largeExpenseThreshold: 50000, // $500.00 in cents, adjusted for currency at display time
};

class SettingsRepository {
  async get(): Promise<ApplicationSettings> {
    return withRepositoryErrorHandling(async () => {
      const db = await getDatabase();
      const existing = await db.settings.get(SETTINGS_ID);
      if (existing) return existing;
      const now = Date.now();
      const record: ApplicationSettings = { ...DEFAULT_SETTINGS, createdAt: now, updatedAt: now };
      await db.settings.put(record);
      return record;
    }, 'load settings');
  }

  async update(changes: Partial<Omit<ApplicationSettings, 'id' | 'createdAt'>>): Promise<ApplicationSettings> {
    return withRepositoryErrorHandling(async () => {
      const db = await getDatabase();
      const existing = await this.get();
      const updated: ApplicationSettings = { ...existing, ...changes, updatedAt: Date.now() };
      await db.settings.put(updated);
      return updated;
    }, 'update settings');
  }
}

export const settingsRepository = new SettingsRepository();
