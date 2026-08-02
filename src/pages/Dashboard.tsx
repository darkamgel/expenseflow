import { Link } from 'react-router-dom';
import { PageHeader, Card, ProgressBar, EmptyState, ErrorState, Button } from '../components/common';
import { Spinner } from '../components/common/Spinner';
import { StatCard } from '../components/dashboard/StatCard';
import { useDashboardData } from '../hooks/useDashboardData';
import { useSettings } from '../contexts/SettingsContext';
import { formatMonthLabel } from '../utils/date';
import { BUDGET_STATUS_LABEL } from '../utils/calculations';
import { formatPercent } from '../utils/currency';

export function Dashboard() {
  const { formatCurrency } = useSettings();
  const { loading, error, budget, summary, categories, year, month, reload } = useDashboardData();

  const monthLabel = formatMonthLabel(year, month);
  const topCategory = categories.find((c) => c.id === summary.topCategoryId);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={monthLabel}
        actions={
          <Link to="/expenses/new">
            <Button icon={<span aria-hidden="true">➕</span>}>Add Expense</Button>
          </Link>
        }
      />

      {loading && <Spinner label="Loading your dashboard…" />}
      {!loading && error && <ErrorState message={error} onRetry={reload} />}

      {!loading && !error && !budget && (
        <EmptyState
          icon="🎯"
          title={`No budget set for ${monthLabel}`}
          description="Create a monthly budget to track how your spending compares against your goal."
          action={
            <Link to="/budgets">
              <Button>Create a budget</Button>
            </Link>
          }
        />
      )}

      {!loading && !error && budget && (
        <>
          <Card className="mb-5">
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Monthly budget progress</h2>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {BUDGET_STATUS_LABEL[summary.status]}
              </span>
            </div>
            <ProgressBar percent={summary.percentUsed} status={summary.status} />
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              You have used <strong>{formatPercent(summary.percentUsed)}</strong> of your {monthLabel} budget (
              {formatCurrency(summary.totalExpenses)} of {formatCurrency(summary.totalBudget)}).
            </p>
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total monthly budget" icon="🎯" value={formatCurrency(summary.totalBudget)} />
            <StatCard label="Total expenses" icon="🧾" value={formatCurrency(summary.totalExpenses)} />
            <StatCard
              label="Remaining budget"
              icon="🏦"
              value={formatCurrency(summary.remaining)}
              accent={summary.remaining < 0 ? 'negative' : 'positive'}
            />
            <StatCard label="Budget used" icon="📊" value={formatPercent(summary.percentUsed)} />
            <StatCard label="Transactions" icon="🔢" value={String(summary.transactionCount)} />
            <StatCard label="Average daily spending" icon="📅" value={formatCurrency(summary.averageDailySpending)} />
            <StatCard
              label="Largest expense"
              icon="💥"
              value={summary.largestExpense ? formatCurrency(summary.largestExpense.amount) : '—'}
              sublabel={summary.largestExpense?.title}
            />
            <StatCard
              label="Top category"
              icon={topCategory?.icon ?? '📦'}
              value={topCategory ? topCategory.name : '—'}
              sublabel={summary.topCategoryAmount ? formatCurrency(summary.topCategoryAmount) : undefined}
            />
          </div>

          {summary.transactionCount === 0 && (
            <div className="mt-5">
              <EmptyState
                icon="🧾"
                title="No expenses recorded yet this month"
                description="Add your first expense to start tracking against your budget."
                action={
                  <Link to="/expenses/new">
                    <Button>Add an expense</Button>
                  </Link>
                }
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
