import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Category, Expense, ExpenseFilters, ExpenseSortField, PaymentMethod, SortDirection } from '../types';
import { categoryRepository, expenseRepository, paymentMethodRepository } from '../repositories';
import { PageHeader, Card, Button, EmptyState, ErrorState, Modal, SelectField, InputField } from '../components/common';
import { Spinner } from '../components/common/Spinner';
import { ExpenseFiltersPanel } from '../components/expenses/ExpenseFiltersPanel';
import { ExpenseTable } from '../components/expenses/ExpenseTable';
import { ExpenseCard } from '../components/expenses/ExpenseCard';
import { ExpenseForm } from '../components/expenses/ExpenseForm';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { sum, average } from '../utils/calculations';
import { exportExpensesToCsv } from '../services/csvExport';
import { Link, useSearchParams } from 'react-router-dom';

const PAGE_SIZE = 25;

const SORT_OPTIONS: { value: string; field: ExpenseSortField; direction: SortDirection; label: string }[] = [
  { value: 'date_desc', field: 'date', direction: 'desc', label: 'Newest first' },
  { value: 'date_asc', field: 'date', direction: 'asc', label: 'Oldest first' },
  { value: 'amount_desc', field: 'amount', direction: 'desc', label: 'Highest amount' },
  { value: 'amount_asc', field: 'amount', direction: 'asc', label: 'Lowest amount' },
  { value: 'merchant_asc', field: 'merchant', direction: 'asc', label: 'Merchant name' },
  { value: 'category_asc', field: 'category', direction: 'asc', label: 'Category' },
];

export function Transactions() {
  const { formatCurrency, settings } = useSettings();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();

  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 250);
  const [filters, setFilters] = useState<ExpenseFilters>(() => {
    const paymentMethodId = searchParams.get('paymentMethodId');
    const categoryId = searchParams.get('categoryId');
    return {
      paymentMethodIds: paymentMethodId ? [paymentMethodId] : undefined,
      categoryIds: categoryId ? [categoryId] : undefined,
    };
  });
  const [sortValue, setSortValue] = useState('date_desc');
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  useEffect(() => {
    if (searchParams.toString()) setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [expenses, cats, methods] = await Promise.all([
        expenseRepository.getAll(),
        categoryRepository.getAll(),
        paymentMethodRepository.getAll(),
      ]);
      setAllExpenses(expenses);
      setCategories(cats);
      setPaymentMethods(methods);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load transactions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const paymentMethodById = useMemo(() => new Map(paymentMethods.map((m) => [m.id, m])), [paymentMethods]);
  const allTags = useMemo(() => Array.from(new Set(allExpenses.flatMap((e) => e.tags))).sort(), [allExpenses]);

  const activeFilters: ExpenseFilters = useMemo(() => ({ ...filters, search: debouncedSearch }), [filters, debouncedSearch]);

  const sortOption = SORT_OPTIONS.find((o) => o.value === sortValue) ?? SORT_OPTIONS[0];
  const categoryNameById = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const filteredExpenses = useMemo(() => {
    return allExpenses
      .filter((e) => {
        if (activeFilters.dateFrom && e.date < activeFilters.dateFrom) return false;
        if (activeFilters.dateTo && e.date > activeFilters.dateTo) return false;
        if (activeFilters.categoryIds?.length && !activeFilters.categoryIds.includes(e.categoryId)) return false;
        if (activeFilters.paymentMethodIds?.length && (!e.paymentMethodId || !activeFilters.paymentMethodIds.includes(e.paymentMethodId))) return false;
        if (activeFilters.tags?.length && !activeFilters.tags.some((t) => e.tags.includes(t))) return false;
        if (typeof activeFilters.minAmount === 'number' && e.amount < activeFilters.minAmount) return false;
        if (typeof activeFilters.maxAmount === 'number' && e.amount > activeFilters.maxAmount) return false;
        if (activeFilters.recurringOnly && !e.recurringExpenseId) return false;
        if (activeFilters.hasReceipt !== undefined && Boolean(e.receiptId) !== activeFilters.hasReceipt) return false;
        if (activeFilters.search?.trim()) {
          const q = activeFilters.search.trim().toLowerCase();
          const haystack = [e.title, e.merchant, e.notes, ...e.tags].join(' ').toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        switch (sortOption.field) {
          case 'amount':
            cmp = a.amount - b.amount;
            break;
          case 'merchant':
            cmp = (a.merchant ?? '').localeCompare(b.merchant ?? '');
            break;
          case 'category':
            cmp = (categoryNameById.get(a.categoryId) ?? '').localeCompare(categoryNameById.get(b.categoryId) ?? '');
            break;
          default:
            cmp = a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date);
        }
        return sortOption.direction === 'desc' ? -cmp : cmp;
      });
  }, [allExpenses, activeFilters, sortOption, categoryNameById]);

  useEffect(() => {
    setPage(1);
  }, [activeFilters, sortValue]);

  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / PAGE_SIZE));
  const pagedExpenses = filteredExpenses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const filteredTotal = sum(filteredExpenses.map((e) => e.amount));
  const filteredAverage = average(filteredExpenses.map((e) => e.amount));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const pageIds = pagedExpenses.map((e) => e.id);
      const allSelected = pageIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const allSelectedOnPage = pagedExpenses.length > 0 && pagedExpenses.every((e) => selectedIds.has(e.id));

  const handleDelete = async (expense: Expense) => {
    const ok = await confirm({ title: 'Delete expense', message: `Delete "${expense.title}"? This cannot be undone.`, danger: true, confirmLabel: 'Delete' });
    if (!ok) return;
    await expenseRepository.deleteWithReceipt(expense.id);
    showToast('Expense deleted.', 'success');
    await load();
  };

  const handleDuplicate = async (expense: Expense) => {
    await expenseRepository.duplicate(expense.id);
    showToast('Expense duplicated.', 'success');
    await load();
  };

  const handleBulkDelete = async () => {
    const ok = await confirm({
      title: 'Delete selected expenses',
      message: `Delete ${selectedIds.size} selected expense${selectedIds.size === 1 ? '' : 's'}? This cannot be undone.`,
      danger: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await expenseRepository.bulkDeleteWithReceipts(Array.from(selectedIds));
    showToast('Selected expenses deleted.', 'success');
    setSelectedIds(new Set());
    await load();
  };

  const handleResetFilters = () => {
    setFilters({});
    setSearch('');
  };

  const handleExportCsv = () => {
    exportExpensesToCsv(filteredExpenses, categories, paymentMethods, settings?.currency ?? 'USD');
    showToast('CSV export downloaded.', 'success');
  };

  return (
    <div>
      <PageHeader
        title="Transactions"
        description={`${filteredExpenses.length} transaction${filteredExpenses.length === 1 ? '' : 's'} · ${formatCurrency(filteredTotal)} total`}
        actions={
          <>
            <Button variant="secondary" onClick={handleExportCsv} disabled={filteredExpenses.length === 0}>
              Export CSV
            </Button>
            <Link to="/expenses/new">
              <Button>+ Add Expense</Button>
            </Link>
          </>
        }
      />

      <Card className="mb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1">
            <InputField label="Search" placeholder="Search title, merchant, notes, tags…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <SelectField label="Sort by" value={sortValue} onChange={(e) => setSortValue(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
          <div className="flex items-end">
            <Button variant="secondary" onClick={() => setShowFilters((v) => !v)}>
              {showFilters ? 'Hide filters' : 'More filters'}
            </Button>
          </div>
        </div>
        {showFilters && (
          <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
            <ExpenseFiltersPanel filters={filters} onChange={setFilters} categories={categories} paymentMethods={paymentMethods} allTags={allTags} onReset={handleResetFilters} />
          </div>
        )}
      </Card>

      {loading && <Spinner label="Loading transactions…" />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && filteredExpenses.length === 0 && (
        <EmptyState
          icon="🧾"
          title={allExpenses.length === 0 ? 'No expenses yet' : 'No transactions match your filters'}
          description={allExpenses.length === 0 ? 'Add your first expense to get started.' : 'Try adjusting or resetting your filters.'}
          action={
            allExpenses.length === 0 ? (
              <Link to="/expenses/new">
                <Button>Add an expense</Button>
              </Link>
            ) : (
              <Button variant="secondary" onClick={handleResetFilters}>
                Reset filters
              </Button>
            )
          }
        />
      )}

      {!loading && !error && filteredExpenses.length > 0 && (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>
              Average: <strong className="text-slate-700 dark:text-slate-200">{formatCurrency(filteredAverage)}</strong>
            </span>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span>{selectedIds.size} selected</span>
                <Button size="sm" variant="danger" onClick={handleBulkDelete}>
                  Delete selected
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                  Clear selection
                </Button>
              </div>
            )}
          </div>

          <ExpenseTable
            expenses={pagedExpenses}
            categoryById={categoryById}
            paymentMethodById={paymentMethodById}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAllOnPage}
            allSelected={allSelectedOnPage}
            onEdit={(e) => setEditingExpense(e)}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            formatCurrency={formatCurrency}
          />

          <div className="space-y-2 md:hidden">
            {pagedExpenses.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                category={categoryById.get(expense.categoryId)}
                paymentMethod={expense.paymentMethodId ? paymentMethodById.get(expense.paymentMethodId) : undefined}
                selected={selectedIds.has(expense.id)}
                onToggleSelect={() => toggleSelect(expense.id)}
                onEdit={() => setEditingExpense(expense)}
                onDuplicate={() => handleDuplicate(expense)}
                onDelete={() => handleDelete(expense)}
                formatCurrency={formatCurrency}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm">
              <Button size="sm" variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Previous
              </Button>
              <span className="text-slate-500 dark:text-slate-400">
                Page {page} of {totalPages}
              </span>
              <Button size="sm" variant="secondary" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <Modal open={editingExpense !== null} onClose={() => setEditingExpense(null)} title="Edit Expense" size="lg">
        {editingExpense && (
          <ExpenseForm
            initialExpense={editingExpense}
            onSaved={async () => {
              setEditingExpense(null);
              await load();
            }}
            onCancel={() => setEditingExpense(null)}
          />
        )}
      </Modal>
    </div>
  );
}
