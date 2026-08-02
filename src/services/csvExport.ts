import type { Category, Expense, PaymentMethod, CurrencyCode } from '../types';
import { fromMinorUnits } from '../utils/currency';
import { downloadTextFile } from './blobUtils';

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function exportExpensesToCsv(
  expenses: Expense[],
  categories: Category[],
  paymentMethods: PaymentMethod[],
  currency: CurrencyCode
): void {
  const categoryById = new Map(categories.map((c) => [c.id, c.name]));
  const methodById = new Map(paymentMethods.map((m) => [m.id, m.name]));

  const header = ['Date', 'Title', 'Merchant', 'Category', 'Payment Method', 'Amount', 'Notes', 'Tags'];
  const rows = expenses.map((e) => [
    e.date,
    e.title,
    e.merchant ?? '',
    categoryById.get(e.categoryId) ?? 'Uncategorized',
    e.paymentMethodId ? methodById.get(e.paymentMethodId) ?? '' : '',
    fromMinorUnits(e.amount, currency).toFixed(2),
    e.notes ?? '',
    e.tags.join('; '),
  ]);

  const csv = [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(',')).join('\n');
  const date = new Date();
  const fileName = `expenseflow-transactions-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.csv`;
  downloadTextFile(fileName, csv, 'text/csv');
}
