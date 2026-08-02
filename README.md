# ExpenseFlow

A modern, responsive personal expense and budget manager. Sign in and your
expenses, budgets, categories, payment methods, income, and receipts sync
across every device you use — backed by Supabase (Postgres + Auth + Storage),
deployed as a static frontend on Vercel.

## Privacy model

Your financial data lives in your own Supabase project's Postgres database,
scoped to your account by Row Level Security — every table enforces
`auth.uid() = user_id`, so one signed-in user can never read or write another
user's rows, even if they knew the raw table structure. It is **not**
end-to-end encrypted, so it should be treated like any other password-protected
financial account. ExpenseFlow never requests full card numbers, CVVs, PINs,
online banking credentials, security answers, or routing information — only a
payment method's last four digits are ever collected, for identification.

This notice is shown during onboarding and again in Settings.

## Tech stack

- **React 19 + TypeScript + Vite** — static SPA
- **Tailwind CSS v4** — utility-first styling, light/dark themes
- **Supabase** — Postgres database, email/password auth, and file storage for receipts
- **Recharts** — all report charts
- **react-router-dom** — client-side routing (with a SPA rewrite for deep links)
- **uuid** — client-generated record ids (Postgres can also default these)
- **Vitest** — unit/integration tests, with an in-memory fake Supabase client
  (`src/supabase/__mocks__/client.ts`) so repository/service tests run without
  a live database

The app is online-only: every read/write goes straight to Supabase, and there
is no local database fallback.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project URL + anon key
npm run dev                  # start the dev server
npm run build                # type-check + production build to dist/
npm run preview              # preview the production build locally
npm run test                 # run the test suite in watch mode
npm run test:run             # run the test suite once (CI mode)
npm run lint                 # oxlint
```

Requires Node 18+. See **Supabase project setup** below for how to create the
backend this app talks to.

## Supabase project setup

1. Create a free project at [supabase.com](https://supabase.com) (no card required).
2. In **Project Settings → API**, copy the **Project URL** and **anon/public key**
   into `.env.local` (see `.env.example`) as `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
3. Apply the schema: `supabase link --project-ref <your-project-ref>` then
   `supabase db push` — this runs everything in `supabase/migrations/` (tables,
   indexes, Row Level Security policies, and the `receipts` storage bucket).
4. In **Authentication → Sign-in method**, enable **Email/Password** (this may
   prompt you to attach a billing account as an activation step — the free tier
   itself doesn't charge for auth or database usage at this app's scale).
5. In **Storage**, confirm the `receipts` bucket was created by the migration.

## Project structure

```
src/
  types/            TypeScript data models (Expense, Budget, Category, ...)
  supabase/         Supabase client, generated DB types, auth helper, test mock
  repositories/      Data-access layer — every Postgres/Storage read/write goes through here
  services/          Domain logic: calculations, recurring generation, notifications,
                     backup/restore, CSV export, receipt compression, sample data
  contexts/          Auth, theme, app settings, toast, and confirm-dialog providers
  hooks/             Shared data-loading and utility hooks
  components/        Reusable UI, organized by feature area (expenses, budgets,
                     wallet, reports, recurring, income, settings, layout, common)
  pages/             One component per route
  utils/             Currency formatting, date handling, safe math, chart colors
  tests/             Vitest unit/integration tests
supabase/
  migrations/        SQL schema, RLS policies, and storage bucket setup
```

Components never call Supabase directly — they call into `repositories/` and
`services/`, which are the only code that imports `supabase/client.ts`.

## Data & storage

- **Postgres** (via Supabase) holds all financial data: expenses, budgets,
  category budgets, categories, payment methods, recurring expenses, income,
  notifications, settings, and receipt metadata — one row per record, every
  table scoped to `user_id` and protected by Row Level Security.
- **Supabase Storage** holds receipt files (JPEG/PNG/WebP/PDF) in a private
  `receipts` bucket, one folder per user, with storage policies mirroring the
  database RLS rules.
- **localStorage** holds only small UI preferences: theme, dashboard layout,
  and the last-used date filter — never financial data.
- Every record has a stable `id` (UUID) plus `createdAt`/`updatedAt` timestamps
  (stored as epoch-millisecond `bigint` columns, matching the app's own
  `Date.now()` convention).
- Monetary values are stored as **integers in the smallest currency unit** (e.g.
  cents for USD, whole yen for JPY) to avoid floating-point rounding errors, and
  are only converted to a decimal display value at the UI edge.
- Dates (`date`, `startDate`, `nextOccurrence`, etc.) are stored as plain
  `YYYY-MM-DD` text rather than a SQL `date` type, matching the app's own
  date handling and avoiding timezone-conversion surprises.
- Schema changes are additive files under `supabase/migrations/` — see
  `0001_init.sql` for the full schema and RLS policies.
- If the app can't reach Supabase (offline, misconfigured deployment), it shows
  a dedicated error screen instead of a blank page or crash.

## Feature overview

- **Accounts** — email/password sign up, sign in, sign out, and password reset,
  via Supabase Auth. Onboarding (display name, currency, default budget,
  starting balance) is tied to the account, not the browser.
- **Dashboard** — budget progress, status (safe/warning/critical/over budget),
  and 8 summary cards, all computed live from your data.
- **Transactions** — search, multi-field filtering, sorting, bulk select/delete,
  pagination, and a card layout on mobile.
- **Add/Edit Expense** — full validation, tags, receipts, and an inline option to
  turn an expense into a recurring series.
- **Budgets** — monthly budgets, category budgets, rollover, "copy previous
  month," and historical view.
- **Wallet** — card/account management with spending stats, credit usage, and
  upcoming due dates. Full card numbers/CVV/PIN are never collected.
- **Reports** — 8 charts (category donut, monthly trend, budget vs. actual,
  spending by payment method, daily trend, cumulative spending, category budget
  performance, income vs. expenses), all driven by the same shared filters.
- **Recurring expenses** — generates missed occurrences on app open, with
  duplicate prevention and a summary of what was created.
- **Income** — income tracking, a one-time starting balance, net balance, and
  savings rate.
- **Backup & Restore** — full JSON export/import (merge or replace, with a
  safety backup taken automatically before any replace), plus CSV export.
- **Settings** — currency, budget month start, categories, theme, sample data,
  account/sign-out, and the privacy notice.

## Deploying to Vercel

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **SPA routing:** `vercel.json` rewrites every path to `index.html` so refreshing
  a nested route (e.g. `/transactions`) doesn't 404.
- **Environment variables:** set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
  in the Vercel project settings (Production, Preview, and Development), matching
  your `.env.local` values. No other secrets or server-side env vars are needed —
  the anon key is safe to expose client-side; access control is enforced by RLS.

To deploy: push this project to a Git provider and import it in Vercel, or run
`vercel --prod` from the project root with the Vercel CLI.

## Offline support

ExpenseFlow is intentionally online-only — it requires a network connection to
read or write your data, since everything lives in Supabase rather than in
local storage. An offline indicator/error screen appears when the browser has
no connection. A service worker (`public/sw.js`) still caches the static app
shell for faster repeat loads, but does not enable offline data access.

## Sample data

Settings → **Load sample data** seeds an example budget, a handful of categorized
expenses, and a few payment methods, all tagged separately from real records so
they never mix. **Clear sample data** removes them again without touching your
own data.

## Testing

`src/tests/` covers expense/budget calculations, category and payment-method
totals, date-range filtering, recurring-expense generation and duplicate
prevention, backup export/validation/merge/replace, repository CRUD behavior,
and safe handling of empty datasets and invalid amounts (no `NaN`/`Infinity`
ever reaches the UI). Repository and service tests run against an in-memory
fake Supabase client (`src/supabase/__mocks__/client.ts`) rather than a live
database. Run with `npm run test:run`.
