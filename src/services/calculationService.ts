import type { Budget, CategoryBudget, Category, Expense, Income, PaymentMethod } from '../types';
import { average, groupBy, percentage, safeDivide, sum, getBudgetStatus, type BudgetStatus } from '../utils/calculations';
import {
  daysInMonth,
  getBudgetMonthRange,
  isDateKeyInRange,
  parseDateKey,
  todayDateKey,
} from '../utils/date';

/** When rollover is enabled, unused budget (or overspend) from the previous month
 * carries into the current month's effective total. */
export function computeEffectiveBudgetAmount(
  budget: Pick<Budget, 'totalAmount' | 'rolloverEnabled'> | undefined,
  previousBudget: Pick<Budget, 'totalAmount'> | undefined,
  previousMonthExpenses: Expense[]
): number {
  if (!budget) return 0;
  if (!budget.rolloverEnabled || !previousBudget) return budget.totalAmount;
  const previousSpent = sum(previousMonthExpenses.map((e) => e.amount));
  const rolloverAmount = previousBudget.totalAmount - previousSpent;
  return budget.totalAmount + rolloverAmount;
}

export interface MonthSummary {
  totalBudget: number;
  totalExpenses: number;
  remaining: number;
  percentUsed: number;
  status: BudgetStatus;
  transactionCount: number;
  averageDailySpending: number;
  largestExpense: Expense | null;
  topCategoryId: string | null;
  topCategoryAmount: number;
  projectedEndOfMonth: number;
}

export function computeMonthSummary(
  monthExpenses: Expense[],
  budgetAmount: number | null,
  rangeStart: string,
  rangeEnd: string
): MonthSummary {
  const totalExpenses = sum(monthExpenses.map((e) => e.amount));
  const hasBudget = budgetAmount !== null && budgetAmount > 0;
  const totalBudget = budgetAmount ?? 0;
  const percentUsed = hasBudget ? percentage(totalExpenses, totalBudget) : 0;
  const status = getBudgetStatus(percentUsed, hasBudget);

  const today = todayDateKey();
  const effectiveEnd = today < rangeEnd ? today : rangeEnd;
  const daysElapsed = Math.max(
    1,
    Math.round((parseDateKey(effectiveEnd).getTime() - parseDateKey(rangeStart).getTime()) / 86_400_000) + 1
  );
  const totalRangeDays = Math.max(
    1,
    Math.round((parseDateKey(rangeEnd).getTime() - parseDateKey(rangeStart).getTime()) / 86_400_000) + 1
  );

  const averageDailySpending = safeDivide(totalExpenses, daysElapsed, 0);
  const projectedEndOfMonth = averageDailySpending * totalRangeDays;

  let largestExpense: Expense | null = null;
  for (const e of monthExpenses) {
    if (!largestExpense || e.amount > largestExpense.amount) largestExpense = e;
  }

  const byCategory = groupBy(monthExpenses, (e) => e.categoryId);
  let topCategoryId: string | null = null;
  let topCategoryAmount = 0;
  for (const [categoryId, items] of byCategory) {
    const total = sum(items.map((i) => i.amount));
    if (total > topCategoryAmount) {
      topCategoryAmount = total;
      topCategoryId = categoryId;
    }
  }

  return {
    totalBudget,
    totalExpenses,
    remaining: totalBudget - totalExpenses,
    percentUsed,
    status,
    transactionCount: monthExpenses.length,
    averageDailySpending,
    largestExpense,
    topCategoryId,
    topCategoryAmount,
    projectedEndOfMonth,
  };
}

export interface CategoryBreakdownItem {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
  percent: number;
}

export function computeCategoryBreakdown(
  expenses: Expense[],
  categories: Category[],
  otherThresholdPercent = 3
): CategoryBreakdownItem[] {
  const total = sum(expenses.map((e) => e.amount));
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const byCategory = groupBy(expenses, (e) => e.categoryId);

  const items: CategoryBreakdownItem[] = [];
  for (const [categoryId, group] of byCategory) {
    const amount = sum(group.map((e) => e.amount));
    const category = categoryById.get(categoryId);
    items.push({
      categoryId,
      name: category?.name ?? 'Uncategorized',
      color: category?.color ?? '#94a3b8',
      icon: category?.icon ?? '📦',
      amount,
      percent: percentage(amount, total),
    });
  }

  items.sort((a, b) => b.amount - a.amount);

  const major = items.filter((i) => i.percent >= otherThresholdPercent);
  const minor = items.filter((i) => i.percent < otherThresholdPercent);
  if (minor.length > 1) {
    const otherAmount = sum(minor.map((i) => i.amount));
    major.push({
      categoryId: '__other__',
      name: 'Other',
      color: '#cbd5e1',
      icon: '📦',
      amount: otherAmount,
      percent: percentage(otherAmount, total),
    });
    return major;
  }
  return items;
}

export interface PaymentMethodBreakdownItem {
  paymentMethodId: string;
  name: string;
  color: string;
  amount: number;
  transactionCount: number;
}

export function computePaymentMethodBreakdown(expenses: Expense[], paymentMethods: PaymentMethod[]): PaymentMethodBreakdownItem[] {
  const byMethod = groupBy(
    expenses.filter((e) => e.paymentMethodId),
    (e) => e.paymentMethodId as string
  );
  const methodById = new Map(paymentMethods.map((m) => [m.id, m]));
  const items: PaymentMethodBreakdownItem[] = [];
  for (const [id, group] of byMethod) {
    const method = methodById.get(id);
    items.push({
      paymentMethodId: id,
      name: method?.name ?? 'Unknown',
      color: method?.color ?? '#94a3b8',
      amount: sum(group.map((e) => e.amount)),
      transactionCount: group.length,
    });
  }
  return items.sort((a, b) => b.amount - a.amount);
}

export interface DailySpendingPoint {
  date: string;
  amount: number;
}

export function computeDailySpending(expenses: Expense[], year: number, month: number): DailySpendingPoint[] {
  const totalDays = daysInMonth(year, month);
  const byDate = new Map<string, number>();
  for (const e of expenses) {
    byDate.set(e.date, (byDate.get(e.date) ?? 0) + e.amount);
  }
  const points: DailySpendingPoint[] = [];
  const monthStr = String(month).padStart(2, '0');
  for (let day = 1; day <= totalDays; day++) {
    const dateKey = `${year}-${monthStr}-${String(day).padStart(2, '0')}`;
    points.push({ date: dateKey, amount: byDate.get(dateKey) ?? 0 });
  }
  return points;
}

export interface CumulativePoint {
  date: string;
  cumulative: number;
  pace: number;
}

export function computeCumulativeSpending(expenses: Expense[], year: number, month: number, budgetAmount: number): CumulativePoint[] {
  const daily = computeDailySpending(expenses, year, month);
  const totalDays = daily.length;
  const dailyPace = safeDivide(budgetAmount, totalDays, 0);
  let running = 0;
  return daily.map((point, index) => {
    running += point.amount;
    return { date: point.date, cumulative: running, pace: dailyPace * (index + 1) };
  });
}

export interface MonthlyTrendPoint {
  year: number;
  month: number;
  label: string;
  total: number;
}

export function computeMonthlyTrend(expenses: Expense[], months: { year: number; month: number }[]): MonthlyTrendPoint[] {
  return months.map(({ year, month }) => {
    const { start, end } = getBudgetMonthRange(year, month, 1);
    const total = sum(expenses.filter((e) => isDateKeyInRange(e.date, start, end)).map((e) => e.amount));
    return { year, month, label: `${year}-${String(month).padStart(2, '0')}`, total };
  });
}

export interface BudgetVsActualPoint {
  year: number;
  month: number;
  label: string;
  budget: number;
  actual: number;
}

export function computeBudgetVsActual(
  expenses: Expense[],
  budgets: Budget[],
  months: { year: number; month: number }[]
): BudgetVsActualPoint[] {
  const budgetByKey = new Map(budgets.map((b) => [`${b.year}-${b.month}`, b.totalAmount]));
  return months.map(({ year, month }) => {
    const { start, end } = getBudgetMonthRange(year, month, 1);
    const actual = sum(expenses.filter((e) => isDateKeyInRange(e.date, start, end)).map((e) => e.amount));
    return {
      year,
      month,
      label: `${year}-${String(month).padStart(2, '0')}`,
      budget: budgetByKey.get(`${year}-${month}`) ?? 0,
      actual,
    };
  });
}

export interface IncomeVsExpensePoint {
  year: number;
  month: number;
  label: string;
  income: number;
  expenses: number;
  net: number;
}

export function computeIncomeVsExpense(
  incomes: Income[],
  expenses: Expense[],
  months: { year: number; month: number }[]
): IncomeVsExpensePoint[] {
  return months.map(({ year, month }) => {
    const { start, end } = getBudgetMonthRange(year, month, 1);
    const income = sum(incomes.filter((i) => isDateKeyInRange(i.date, start, end)).map((i) => i.amount));
    const expenseTotal = sum(expenses.filter((e) => isDateKeyInRange(e.date, start, end)).map((e) => e.amount));
    return { year, month, label: `${year}-${String(month).padStart(2, '0')}`, income, expenses: expenseTotal, net: income - expenseTotal };
  });
}

export interface CategoryBudgetPerformanceItem {
  categoryId: string;
  categoryName: string;
  color: string;
  planned: number;
  spent: number;
  remaining: number;
  percentUsed: number;
  status: BudgetStatus;
}

export function computeCategoryBudgetPerformance(
  categoryBudgets: CategoryBudget[],
  expenses: Expense[],
  categories: Category[]
): CategoryBudgetPerformanceItem[] {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  return categoryBudgets.map((cb) => {
    const spent = sum(expenses.filter((e) => e.categoryId === cb.categoryId).map((e) => e.amount));
    const percentUsed = percentage(spent, cb.plannedAmount);
    const category = categoryById.get(cb.categoryId);
    return {
      categoryId: cb.categoryId,
      categoryName: category?.name ?? 'Uncategorized',
      color: category?.color ?? '#94a3b8',
      planned: cb.plannedAmount,
      spent,
      remaining: cb.plannedAmount - spent,
      percentUsed,
      status: getBudgetStatus(percentUsed, cb.plannedAmount > 0),
    };
  });
}

export interface IncomeExpenseTotals {
  startingBalance: number;
  totalIncome: number;
  totalExpenses: number;
  /** startingBalance + totalIncome - totalExpenses: your current total money. */
  netBalance: number;
  /** (totalIncome - totalExpenses) / totalIncome, a pure flow measure unaffected
   * by startingBalance so it stays meaningful even when starting balance is 0/unset. */
  savingsRate: number;
}

export function computeIncomeExpenseTotals(
  incomes: Income[],
  expenses: Expense[],
  startingBalance = 0
): IncomeExpenseTotals {
  const totalIncome = sum(incomes.map((i) => i.amount));
  const totalExpenses = sum(expenses.map((e) => e.amount));
  const flowNet = totalIncome - totalExpenses;
  const savingsRate = percentage(flowNet, totalIncome);
  const netBalance = startingBalance + flowNet;
  return { startingBalance, totalIncome, totalExpenses, netBalance, savingsRate };
}

export function computePaymentMethodStats(
  paymentMethod: PaymentMethod,
  allExpenses: Expense[],
  monthStart: string,
  monthEnd: string
) {
  const methodExpenses = allExpenses.filter((e) => e.paymentMethodId === paymentMethod.id);
  const totalSpent = sum(methodExpenses.map((e) => e.amount));
  const monthSpent = sum(
    methodExpenses.filter((e) => isDateKeyInRange(e.date, monthStart, monthEnd)).map((e) => e.amount)
  );
  const creditLimit = paymentMethod.creditLimit ?? 0;
  const currentBalance = paymentMethod.currentBalance ?? 0;
  const creditLimitPercentUsed = creditLimit > 0 ? percentage(currentBalance, creditLimit) : 0;
  const availableCredit = creditLimit > 0 ? Math.max(creditLimit - currentBalance, 0) : 0;

  let upcomingDueDate: string | null = null;
  if (paymentMethod.paymentDueDay) {
    const today = new Date();
    const day = Math.min(paymentMethod.paymentDueDay, 28);
    let due = new Date(today.getFullYear(), today.getMonth(), day);
    if (due.getTime() < today.setHours(0, 0, 0, 0)) {
      due = new Date(today.getFullYear(), today.getMonth() + 1, day);
    }
    upcomingDueDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`;
  }

  return {
    totalSpent,
    transactionCount: methodExpenses.length,
    monthSpent,
    creditLimitPercentUsed,
    availableCredit,
    upcomingDueDate,
  };
}

export function averageExpenseAmount(expenses: Expense[]): number {
  return average(expenses.map((e) => e.amount));
}
