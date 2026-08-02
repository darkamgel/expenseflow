import { budgetRepository, categoryRepository, expenseRepository, paymentMethodRepository } from '../repositories';
import { getCurrentBudgetMonth } from '../utils/date';
import { toMinorUnits } from '../utils/currency';
import type { CurrencyCode } from '../types';

const SAMPLE_PAYMENT_METHODS = [
  { name: 'Chase Freedom', type: 'credit_card' as const, issuer: 'Chase', lastFourDigits: '4821', color: '#1d4ed8', creditLimit: 500000, currentBalance: 84500, paymentDueDay: 15 },
  { name: 'Bank of America Debit', type: 'debit_card' as const, issuer: 'Bank of America', lastFourDigits: '7614', color: '#059669' },
  { name: 'Cash', type: 'cash' as const, color: '#0f172a' },
  { name: 'Apple Pay', type: 'digital_wallet' as const, color: '#7c3aed' },
];

const SAMPLE_EXPENSES: { title: string; categoryName: string; amountMajor: number; day: number; methodIndex: number }[] = [
  { title: 'Monthly rent', categoryName: 'Rent', amountMajor: 900, day: 1, methodIndex: 1 },
  { title: 'Groceries and dining out', categoryName: 'Food and dining', amountMajor: 320, day: 4, methodIndex: 0 },
  { title: 'Gas and rideshare', categoryName: 'Transportation', amountMajor: 180, day: 6, methodIndex: 0 },
  { title: 'New clothes', categoryName: 'Shopping', amountMajor: 210, day: 9, methodIndex: 0 },
  { title: 'Movies and streaming', categoryName: 'Entertainment', amountMajor: 95, day: 12, methodIndex: 3 },
  { title: 'Electricity and water', categoryName: 'Utilities', amountMajor: 140, day: 14, methodIndex: 1 },
];

export interface SampleDataResult {
  expensesCreated: number;
  paymentMethodsCreated: number;
  budgetCreated: boolean;
}

/** Seeds a self-contained example dataset for exploring the app, tagged isSample so it
 * never mixes with real records and can be removed independently via clearSampleData(). */
export async function loadSampleData(currency: CurrencyCode): Promise<SampleDataResult> {
  await categoryRepository.ensureSeeded();
  const categories = await categoryRepository.getActive();
  const categoryByName = new Map(categories.map((c) => [c.name, c]));

  const createdMethods = await Promise.all(
    SAMPLE_PAYMENT_METHODS.map((m) =>
      paymentMethodRepository.create({
        name: m.name,
        type: m.type,
        issuer: m.issuer,
        lastFourDigits: m.lastFourDigits,
        color: m.color,
        creditLimit: m.creditLimit,
        currentBalance: m.currentBalance,
        paymentDueDay: m.paymentDueDay,
        status: 'active',
        isSample: true,
      })
    )
  );

  const { year, month } = getCurrentBudgetMonth(1);
  const monthStr = String(month).padStart(2, '0');

  let expensesCreated = 0;
  for (const item of SAMPLE_EXPENSES) {
    const category = categoryByName.get(item.categoryName);
    if (!category) continue;
    await expenseRepository.create({
      title: item.title,
      amount: toMinorUnits(item.amountMajor, currency),
      categoryId: category.id,
      date: `${year}-${monthStr}-${String(item.day).padStart(2, '0')}`,
      time: '12:00',
      paymentMethodId: createdMethods[item.methodIndex]?.id,
      tags: [],
      isSample: true,
    });
    expensesCreated += 1;
  }

  let budgetCreated = false;
  const existingBudget = await budgetRepository.getForMonth(year, month);
  if (!existingBudget) {
    await budgetRepository.create({
      year,
      month,
      totalAmount: toMinorUnits(3000, currency),
      rolloverEnabled: false,
      isSample: true,
    });
    budgetCreated = true;
  }

  return { expensesCreated, paymentMethodsCreated: createdMethods.length, budgetCreated };
}

export async function clearSampleData(): Promise<void> {
  const [expenses, budgets, paymentMethods] = await Promise.all([
    expenseRepository.getAll(),
    budgetRepository.getAll(),
    paymentMethodRepository.getAll(),
  ]);

  const sampleExpenseIds = expenses.filter((e) => e.isSample).map((e) => e.id);
  const sampleBudgetIds = budgets.filter((b) => b.isSample).map((b) => b.id);
  const samplePaymentMethodIds = paymentMethods.filter((p) => p.isSample).map((p) => p.id);

  await Promise.all([
    sampleExpenseIds.length ? expenseRepository.bulkDeleteWithReceipts(sampleExpenseIds) : Promise.resolve(),
    sampleBudgetIds.length ? budgetRepository.bulkDelete(sampleBudgetIds) : Promise.resolve(),
    samplePaymentMethodIds.length ? paymentMethodRepository.bulkDelete(samplePaymentMethodIds) : Promise.resolve(),
  ]);
}

export async function hasSampleData(): Promise<boolean> {
  const expenses = await expenseRepository.getAll();
  return expenses.some((e) => e.isSample);
}
