-- ExpenseFlow schema. Every table carries a user_id column and is protected
-- by a row-level security policy scoping all access to auth.uid(), so one
-- signed-in user can never read or write another user's data.
--
-- Dates (date, start_date, end_date, next_occurrence, last_generated_date)
-- are stored as plain YYYY-MM-DD text rather than Postgres `date`, matching
-- the app's own date handling (utils/date.ts) and avoiding any
-- timezone-conversion surprises between the client and the database.
--
-- created_at/updated_at are bigint epoch-milliseconds, matching the app's
-- existing BaseRecord convention (Date.now()) so no conversion is needed
-- between the client and the database.

create or replace function public.epoch_ms() returns bigint
language sql stable as $$
  select (extract(epoch from clock_timestamp()) * 1000)::bigint;
$$;

-- ── categories ──────────────────────────────────────────────────────────
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  icon text not null,
  color text not null,
  is_default boolean not null default false,
  status text not null default 'active' check (status in ('active', 'archived')),
  sort_order integer not null default 0,
  created_at bigint not null default public.epoch_ms(),
  updated_at bigint not null default public.epoch_ms()
);
create index if not exists categories_user_idx on public.categories (user_id);
create index if not exists categories_user_status_idx on public.categories (user_id, status);

-- ── payment_methods ─────────────────────────────────────────────────────
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('credit_card', 'debit_card', 'bank_account', 'cash', 'digital_wallet', 'other')),
  issuer text,
  last_four_digits text,
  credit_limit bigint,
  current_balance bigint,
  billing_cycle_start_day integer,
  payment_due_day integer,
  color text not null,
  notes text,
  status text not null default 'active' check (status in ('active', 'archived')),
  is_sample boolean not null default false,
  created_at bigint not null default public.epoch_ms(),
  updated_at bigint not null default public.epoch_ms()
);
create index if not exists payment_methods_user_idx on public.payment_methods (user_id);
create index if not exists payment_methods_user_status_idx on public.payment_methods (user_id, status);

-- ── recurring_expenses ──────────────────────────────────────────────────
create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount bigint not null check (amount > 0),
  category_id uuid not null,
  payment_method_id uuid,
  start_date text not null,
  end_date text,
  frequency text not null check (frequency in ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly', 'custom')),
  custom_interval_days integer,
  next_occurrence text not null,
  last_generated_date text,
  auto_generate boolean not null default true,
  reminder_enabled boolean not null default true,
  active boolean not null default true,
  notes text,
  is_sample boolean not null default false,
  created_at bigint not null default public.epoch_ms(),
  updated_at bigint not null default public.epoch_ms()
);
create index if not exists recurring_user_idx on public.recurring_expenses (user_id);
create index if not exists recurring_user_active_idx on public.recurring_expenses (user_id, active);
create index if not exists recurring_user_next_idx on public.recurring_expenses (user_id, next_occurrence);

-- ── expenses ────────────────────────────────────────────────────────────
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount bigint not null check (amount > 0),
  category_id uuid not null,
  date text not null,
  time text not null default '12:00',
  payment_method_id uuid,
  merchant text,
  notes text,
  tags text[] not null default '{}',
  recurring_expense_id uuid,
  receipt_id uuid,
  is_sample boolean not null default false,
  created_at bigint not null default public.epoch_ms(),
  updated_at bigint not null default public.epoch_ms()
);
create index if not exists expenses_user_idx on public.expenses (user_id);
create index if not exists expenses_user_date_idx on public.expenses (user_id, date);
create index if not exists expenses_user_category_idx on public.expenses (user_id, category_id);
create index if not exists expenses_user_payment_method_idx on public.expenses (user_id, payment_method_id);
create index if not exists expenses_user_merchant_idx on public.expenses (user_id, merchant);
create index if not exists expenses_user_recurring_idx on public.expenses (user_id, recurring_expense_id);
create index if not exists expenses_user_created_idx on public.expenses (user_id, created_at);
create index if not exists expenses_user_updated_idx on public.expenses (user_id, updated_at);

-- ── budgets ─────────────────────────────────────────────────────────────
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year integer not null,
  month integer not null check (month between 1 and 12),
  total_amount bigint not null,
  notes text,
  rollover_enabled boolean not null default false,
  is_sample boolean not null default false,
  created_at bigint not null default public.epoch_ms(),
  updated_at bigint not null default public.epoch_ms(),
  unique (user_id, year, month)
);
create index if not exists budgets_user_year_month_idx on public.budgets (user_id, year, month);

-- ── category_budgets ────────────────────────────────────────────────────
create table if not exists public.category_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  budget_id uuid not null,
  category_id uuid not null,
  planned_amount bigint not null,
  is_sample boolean not null default false,
  created_at bigint not null default public.epoch_ms(),
  updated_at bigint not null default public.epoch_ms()
);
create index if not exists category_budgets_user_budget_idx on public.category_budgets (user_id, budget_id);

-- ── incomes ─────────────────────────────────────────────────────────────
create table if not exists public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount bigint not null check (amount > 0),
  date text not null,
  source text,
  category text,
  notes text,
  recurring boolean not null default false,
  is_sample boolean not null default false,
  created_at bigint not null default public.epoch_ms(),
  updated_at bigint not null default public.epoch_ms()
);
create index if not exists incomes_user_date_idx on public.incomes (user_id, date);

-- ── notifications ───────────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  dedupe_key text not null,
  related_id uuid,
  created_at bigint not null default public.epoch_ms(),
  updated_at bigint not null default public.epoch_ms()
);
create index if not exists notifications_user_read_idx on public.notifications (user_id, read);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at);
create unique index if not exists notifications_user_dedupe_idx on public.notifications (user_id, dedupe_key);

-- ── settings (one row per user) ────────────────────────────────────────
create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  currency text not null default 'USD',
  default_monthly_budget bigint not null default 0,
  starting_balance bigint not null default 0,
  first_day_of_budget_month integer not null default 1,
  auto_generate_recurring boolean not null default true,
  large_expense_threshold bigint not null default 50000,
  created_at bigint not null default public.epoch_ms(),
  updated_at bigint not null default public.epoch_ms()
);

-- ── receipts (metadata; the file itself lives in Supabase Storage) ─────
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expense_id uuid not null,
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  storage_path text not null,
  created_at bigint not null default public.epoch_ms(),
  updated_at bigint not null default public.epoch_ms()
);
create index if not exists receipts_user_expense_idx on public.receipts (user_id, expense_id);

-- ── metadata (small key/value bookkeeping, e.g. last backup date) ──────
create table if not exists public.metadata (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value text not null,
  updated_at bigint not null default public.epoch_ms(),
  primary key (user_id, key)
);

-- ── Row Level Security: every table is owner-only ──────────────────────
alter table public.categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.expenses enable row level security;
alter table public.budgets enable row level security;
alter table public.category_budgets enable row level security;
alter table public.incomes enable row level security;
alter table public.notifications enable row level security;
alter table public.settings enable row level security;
alter table public.receipts enable row level security;
alter table public.metadata enable row level security;

create policy "categories_owner" on public.categories for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "payment_methods_owner" on public.payment_methods for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "recurring_expenses_owner" on public.recurring_expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "expenses_owner" on public.expenses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "budgets_owner" on public.budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "category_budgets_owner" on public.category_budgets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "incomes_owner" on public.incomes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notifications_owner" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "settings_owner" on public.settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "receipts_owner" on public.receipts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "metadata_owner" on public.metadata for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
