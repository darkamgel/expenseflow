import type { ApplicationSettings } from '../types';
import { withRepositoryErrorHandling } from './errors';
import { supabase } from '../supabase/client';
import { getCurrentUserId } from '../supabase/auth';
import type { Database } from '../supabase/database.types';

type SettingsRow = Database['public']['Tables']['settings']['Row'];

export const DEFAULT_SETTINGS: Omit<ApplicationSettings, 'id' | 'createdAt' | 'updatedAt'> = {
  displayName: '',
  onboardingCompleted: false,
  currency: 'USD',
  defaultMonthlyBudget: 0,
  startingBalance: 0,
  firstDayOfBudgetMonth: 1,
  autoGenerateRecurring: true,
  largeExpenseThreshold: 50000, // $500.00 in cents, adjusted for currency at display time
};

function toRecord(row: SettingsRow): ApplicationSettings {
  return {
    id: row.user_id,
    displayName: row.display_name,
    onboardingCompleted: row.onboarding_completed,
    currency: row.currency as ApplicationSettings['currency'],
    defaultMonthlyBudget: row.default_monthly_budget,
    startingBalance: row.starting_balance,
    firstDayOfBudgetMonth: row.first_day_of_budget_month,
    autoGenerateRecurring: row.auto_generate_recurring,
    largeExpenseThreshold: row.large_expense_threshold,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

class SettingsRepository {
  /** Settings is a single row per user, keyed by user_id, created on first read. */
  async get(): Promise<ApplicationSettings> {
    return withRepositoryErrorHandling(async () => {
      const userId = await getCurrentUserId();
      const { data, error } = await supabase.from('settings').select('*').eq('user_id', userId).maybeSingle();
      if (error) throw error;
      if (data) return toRecord(data as SettingsRow);

      const now = Date.now();
      const { data: inserted, error: insertError } = await supabase
        .from('settings')
        .insert({
          user_id: userId,
          display_name: DEFAULT_SETTINGS.displayName,
          onboarding_completed: DEFAULT_SETTINGS.onboardingCompleted,
          currency: DEFAULT_SETTINGS.currency,
          default_monthly_budget: DEFAULT_SETTINGS.defaultMonthlyBudget,
          starting_balance: DEFAULT_SETTINGS.startingBalance,
          first_day_of_budget_month: DEFAULT_SETTINGS.firstDayOfBudgetMonth,
          auto_generate_recurring: DEFAULT_SETTINGS.autoGenerateRecurring,
          large_expense_threshold: DEFAULT_SETTINGS.largeExpenseThreshold,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();
      if (insertError) throw insertError;
      return toRecord(inserted as SettingsRow);
    }, 'load settings');
  }

  async update(changes: Partial<Omit<ApplicationSettings, 'id' | 'createdAt'>>): Promise<ApplicationSettings> {
    return withRepositoryErrorHandling(async () => {
      await this.get(); // ensures a row exists to update
      const userId = await getCurrentUserId();
      const row: Record<string, unknown> = { updated_at: Date.now() };
      if (changes.displayName !== undefined) row.display_name = changes.displayName;
      if (changes.onboardingCompleted !== undefined) row.onboarding_completed = changes.onboardingCompleted;
      if (changes.currency !== undefined) row.currency = changes.currency;
      if (changes.defaultMonthlyBudget !== undefined) row.default_monthly_budget = changes.defaultMonthlyBudget;
      if (changes.startingBalance !== undefined) row.starting_balance = changes.startingBalance;
      if (changes.firstDayOfBudgetMonth !== undefined) row.first_day_of_budget_month = changes.firstDayOfBudgetMonth;
      if (changes.autoGenerateRecurring !== undefined) row.auto_generate_recurring = changes.autoGenerateRecurring;
      if (changes.largeExpenseThreshold !== undefined) row.large_expense_threshold = changes.largeExpenseThreshold;

      const { data, error } = await supabase.from('settings').update(row as never).eq('user_id', userId).select().single();
      if (error) throw error;
      return toRecord(data as SettingsRow);
    }, 'update settings');
  }
}

export const settingsRepository = new SettingsRepository();
