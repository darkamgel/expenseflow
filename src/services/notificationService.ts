import { notificationRepository, expenseRepository, budgetRepository, categoryBudgetRepository, categoryRepository, paymentMethodRepository, recurringExpenseRepository, metadataRepository, settingsRepository } from '../repositories';
import { computeMonthSummary, computeCategoryBudgetPerformance } from './calculationService';
import { getBudgetMonthRange, getCurrentBudgetMonth, addDays, todayDateKey, formatMonthLabel } from '../utils/date';
import { METADATA_KEYS, type Expense } from '../types';

async function notifyOnce(dedupeKey: string, title: string, message: string, type: Parameters<typeof notificationRepository.create>[0]['type'], relatedId?: string) {
  const exists = await notificationRepository.existsByDedupeKey(dedupeKey);
  if (exists) return;
  await notificationRepository.create({ type, title, message, read: false, dedupeKey, relatedId });
}

async function checkBudgetThresholds(): Promise<void> {
  const settings = await settingsRepository.get();
  const { year, month } = getCurrentBudgetMonth(settings.firstDayOfBudgetMonth);
  const budget = await budgetRepository.getForMonth(year, month);
  if (!budget || budget.totalAmount <= 0) return;

  const { start, end } = getBudgetMonthRange(year, month, settings.firstDayOfBudgetMonth);
  const expenses = await expenseRepository.getByDateRange(start, end);
  const summary = computeMonthSummary(expenses, budget.totalAmount, start, end);
  const monthLabel = formatMonthLabel(year, month);
  const keyBase = `budget_${year}-${month}`;

  if (summary.percentUsed >= 100) {
    await notifyOnce(`${keyBase}_100`, 'Budget fully used', `You have used ${Math.round(summary.percentUsed)}% of your ${monthLabel} budget.`, 'budget_100');
  } else if (summary.percentUsed >= 90) {
    await notifyOnce(`${keyBase}_90`, 'Budget nearly used up', `You have used ${Math.round(summary.percentUsed)}% of your ${monthLabel} budget.`, 'budget_90');
  } else if (summary.percentUsed >= 70) {
    await notifyOnce(`${keyBase}_70`, 'Budget check-in', `You have used ${Math.round(summary.percentUsed)}% of your ${monthLabel} budget.`, 'budget_70');
  }

  const budgetCategories = await categoryBudgetRepository.getForBudget(budget.id);
  if (budgetCategories.length) {
    const categories = await categoryRepository.getAll();
    const performance = computeCategoryBudgetPerformance(budgetCategories, expenses, categories);
    for (const perf of performance) {
      if (perf.status === 'over_budget') {
        await notifyOnce(
          `category_over_${year}-${month}_${perf.categoryId}`,
          'Category over budget',
          `${perf.categoryName} spending has gone over its planned budget for ${monthLabel}.`,
          'category_over_budget',
          perf.categoryId
        );
      }
    }
  }
}

export async function checkLargeExpense(expense: Expense): Promise<void> {
  const settings = await settingsRepository.get();
  if (settings.largeExpenseThreshold > 0 && expense.amount >= settings.largeExpenseThreshold) {
    await notifyOnce(
      `large_expense_${expense.id}`,
      'Unusually large expense',
      `"${expense.title}" was recorded for a large amount.`,
      'large_expense',
      expense.id
    );
  }
}

async function checkRecurringUpcoming(): Promise<void> {
  const today = todayDateKey();
  const horizon = addDays(today, 3);
  const active = await recurringExpenseRepository.getActive();
  for (const series of active) {
    if (!series.reminderEnabled) continue;
    if (series.nextOccurrence >= today && series.nextOccurrence <= horizon) {
      await notifyOnce(
        `recurring_upcoming_${series.id}_${series.nextOccurrence}`,
        'Recurring payment approaching',
        `${series.title} is due on ${series.nextOccurrence}.`,
        'recurring_upcoming',
        series.id
      );
    }
  }
}

async function checkPaymentDue(): Promise<void> {
  const today = new Date();
  const methods = await paymentMethodRepository.getActive();
  for (const method of methods) {
    if (!method.paymentDueDay) continue;
    const day = Math.min(method.paymentDueDay, 28);
    let due = new Date(today.getFullYear(), today.getMonth(), day);
    if (due.getTime() < new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) {
      due = new Date(today.getFullYear(), today.getMonth() + 1, day);
    }
    const diffDays = Math.round((due.getTime() - today.getTime()) / 86_400_000);
    if (diffDays >= 0 && diffDays <= 3) {
      const dueKey = `${due.getFullYear()}-${due.getMonth() + 1}-${due.getDate()}`;
      await notifyOnce(
        `payment_due_${method.id}_${dueKey}`,
        'Card payment due soon',
        `${method.name} has a payment due on ${due.toLocaleDateString()}.`,
        'payment_due',
        method.id
      );
    }
  }
}

async function checkBackupReminder(): Promise<void> {
  const lastBackupAt = await metadataRepository.get(METADATA_KEYS.lastBackupAt);
  const daysSince = lastBackupAt ? (Date.now() - new Date(lastBackupAt).getTime()) / 86_400_000 : Infinity;
  if (daysSince >= 14) {
    const bucket = Math.floor(daysSince / 7); // re-notify roughly weekly rather than every single day
    await notifyOnce(
      `backup_reminder_${bucket}`,
      'Backup not created recently',
      lastBackupAt
        ? `It has been over ${Math.floor(daysSince)} days since your last backup. Export one from the Backup page.`
        : 'You have not exported a backup yet. Export one from the Backup page to avoid losing your data.',
      'backup_reminder'
    );
  }
}

export async function runNotificationChecks(): Promise<void> {
  await Promise.all([checkBudgetThresholds(), checkRecurringUpcoming(), checkPaymentDue(), checkBackupReminder()]);
}
