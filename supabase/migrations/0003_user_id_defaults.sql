-- Default user_id to the requesting user's uid, so the client doesn't need
-- to pass it on every insert. RLS's WITH CHECK clause still enforces that
-- the value (default or explicit) always equals auth.uid().
alter table public.categories alter column user_id set default auth.uid();
alter table public.payment_methods alter column user_id set default auth.uid();
alter table public.recurring_expenses alter column user_id set default auth.uid();
alter table public.expenses alter column user_id set default auth.uid();
alter table public.budgets alter column user_id set default auth.uid();
alter table public.category_budgets alter column user_id set default auth.uid();
alter table public.incomes alter column user_id set default auth.uid();
alter table public.notifications alter column user_id set default auth.uid();
alter table public.settings alter column user_id set default auth.uid();
alter table public.receipts alter column user_id set default auth.uid();
alter table public.metadata alter column user_id set default auth.uid();
