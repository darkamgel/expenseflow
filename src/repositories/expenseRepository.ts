import type { Expense, ExpenseFilters, ExpenseSortField, SortDirection } from '../types';
import { BaseRepository } from './baseRepository';
import { withRepositoryErrorHandling } from './errors';
import { supabase } from '../supabase/client';
import type { Database } from '../supabase/database.types';
import { receiptRepository } from './receiptRepository';
import { isDateKeyInRange } from '../utils/date';

type ExpenseRow = Database['public']['Tables']['expenses']['Row'];

function matchesFilters(expense: Expense, filters: ExpenseFilters): boolean {
  if (filters.dateFrom && expense.date < filters.dateFrom) return false;
  if (filters.dateTo && expense.date > filters.dateTo) return false;
  if (filters.categoryIds?.length && !filters.categoryIds.includes(expense.categoryId)) return false;
  if (filters.paymentMethodIds?.length) {
    if (!expense.paymentMethodId || !filters.paymentMethodIds.includes(expense.paymentMethodId)) return false;
  }
  if (filters.tags?.length) {
    const hasTag = filters.tags.some((t) => expense.tags.includes(t));
    if (!hasTag) return false;
  }
  if (typeof filters.minAmount === 'number' && expense.amount < filters.minAmount) return false;
  if (typeof filters.maxAmount === 'number' && expense.amount > filters.maxAmount) return false;
  if (filters.recurringOnly && !expense.recurringExpenseId) return false;
  if (filters.hasReceipt !== undefined) {
    const hasReceipt = Boolean(expense.receiptId);
    if (hasReceipt !== filters.hasReceipt) return false;
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    const haystack = [expense.title, expense.merchant, expense.notes, ...expense.tags].join(' ').toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

function sortExpenses(
  expenses: Expense[],
  field: ExpenseSortField,
  direction: SortDirection,
  categoryNameById: Map<string, string>
): Expense[] {
  const sorted = [...expenses].sort((a, b) => {
    switch (field) {
      case 'amount':
        return a.amount - b.amount;
      case 'merchant':
        return (a.merchant ?? '').localeCompare(b.merchant ?? '');
      case 'category':
        return (categoryNameById.get(a.categoryId) ?? '').localeCompare(categoryNameById.get(b.categoryId) ?? '');
      case 'date':
      default:
        return a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date);
    }
  });
  return direction === 'desc' ? sorted.reverse() : sorted;
}

class ExpenseRepository extends BaseRepository<Expense, ExpenseRow> {
  constructor() {
    super('expenses', 'expense');
  }

  protected toRecord(row: ExpenseRow): Expense {
    return {
      id: row.id,
      title: row.title,
      amount: row.amount,
      categoryId: row.category_id,
      date: row.date,
      time: row.time,
      paymentMethodId: row.payment_method_id ?? undefined,
      merchant: row.merchant ?? undefined,
      notes: row.notes ?? undefined,
      tags: row.tags ?? [],
      recurringExpenseId: row.recurring_expense_id ?? undefined,
      receiptId: row.receipt_id ?? undefined,
      isSample: row.is_sample,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  protected toRow(record: Expense): Record<string, unknown> {
    return {
      id: record.id,
      title: record.title,
      amount: record.amount,
      category_id: record.categoryId,
      date: record.date,
      time: record.time,
      payment_method_id: record.paymentMethodId ?? null,
      merchant: record.merchant ?? null,
      notes: record.notes ?? null,
      tags: record.tags,
      recurring_expense_id: record.recurringExpenseId ?? null,
      receipt_id: record.receiptId ?? null,
      is_sample: record.isSample ?? false,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    };
  }

  async getByDateRange(from: string, to: string): Promise<Expense[]> {
    return withRepositoryErrorHandling(async () => {
      const { data, error } = await supabase.from('expenses').select('*').gte('date', from).lte('date', to);
      if (error) throw error;
      return (data ?? []).map((row) => this.toRecord(row));
    }, 'load expenses for date range');
  }

  async getByCategory(categoryId: string): Promise<Expense[]> {
    return withRepositoryErrorHandling(async () => {
      const { data, error } = await supabase.from('expenses').select('*').eq('category_id', categoryId);
      if (error) throw error;
      return (data ?? []).map((row) => this.toRecord(row));
    }, 'load expenses for category');
  }

  async getByPaymentMethod(paymentMethodId: string): Promise<Expense[]> {
    return withRepositoryErrorHandling(async () => {
      const { data, error } = await supabase.from('expenses').select('*').eq('payment_method_id', paymentMethodId);
      if (error) throw error;
      return (data ?? []).map((row) => this.toRecord(row));
    }, 'load expenses for payment method');
  }

  async getByRecurringExpense(recurringExpenseId: string): Promise<Expense[]> {
    return withRepositoryErrorHandling(async () => {
      const { data, error } = await supabase.from('expenses').select('*').eq('recurring_expense_id', recurringExpenseId);
      if (error) throw error;
      return (data ?? []).map((row) => this.toRecord(row));
    }, 'load expenses for recurring series');
  }

  async query(
    filters: ExpenseFilters,
    sort: { field: ExpenseSortField; direction: SortDirection },
    categoryNameById: Map<string, string> = new Map()
  ): Promise<Expense[]> {
    const all = await this.getAll();
    const filtered = all.filter((e) => matchesFilters(e, filters));
    return sortExpenses(filtered, sort.field, sort.direction, categoryNameById);
  }

  async duplicate(id: string): Promise<Expense> {
    return withRepositoryErrorHandling(async () => {
      const existing = await this.getById(id);
      if (!existing) throw new Error('Expense not found');
      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, receiptId: _receiptId, ...rest } = existing;
      return this.create(rest);
    }, 'duplicate expense');
  }

  async deleteWithReceipt(id: string): Promise<void> {
    return withRepositoryErrorHandling(async () => {
      const existing = await this.getById(id);
      if (existing?.receiptId) {
        await receiptRepository.delete(existing.receiptId);
      }
      await this.delete(id);
    }, 'delete expense');
  }

  async bulkDeleteWithReceipts(ids: string[]): Promise<void> {
    return withRepositoryErrorHandling(async () => {
      const all = await Promise.all(ids.map((id) => this.getById(id)));
      const receiptIds = all.filter((e): e is Expense => Boolean(e?.receiptId)).map((e) => e.receiptId as string);
      if (receiptIds.length) await receiptRepository.bulkDelete(receiptIds);
      await this.bulkDelete(ids);
    }, 'bulk delete expenses');
  }

  /** In-memory helper for callers that already have a loaded expense list (avoids re-querying per chart). */
  filterInMemory(expenses: Expense[], from: string, to: string): Expense[] {
    return expenses.filter((e) => isDateKeyInRange(e.date, from, to));
  }
}

export const expenseRepository = new ExpenseRepository();
