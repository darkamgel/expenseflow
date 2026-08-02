# ExpenseFlow

A modern, responsive personal expense and budget manager that runs entirely in your
browser. There is no backend, no account, and no cloud database — every expense,
budget, category, payment method, income record, and receipt is stored locally in
IndexedDB, and the app is deployable as a static site on Vercel.

## Privacy model

> Your financial information is stored only in this browser. It is not uploaded to
> a server or synchronized between devices. Export regular backups to avoid losing
> your information. Local storage is not encrypted or fully secure — anyone with
> access to this same unlocked browser profile can also access this data.

This notice is shown during onboarding and again in Settings. ExpenseFlow never
requests full card numbers, CVVs, PINs, online banking credentials, security
answers, or routing information — only a payment method's last four digits are
ever collected, for identification.

## Tech stack

- **React 19 + TypeScript + Vite** — static SPA, no server code
- **Tailwind CSS v4** — utility-first styling, light/dark themes
- **Dexie.js** — a thin, ergonomic wrapper over IndexedDB
- **Recharts** — all report charts
- **react-router-dom** — client-side routing (with a SPA rewrite for deep links)
- **uuid** — stable client-generated record ids
- **Vitest** + **fake-indexeddb** — unit/integration tests

No Supabase, Firebase, MongoDB, Postgres/MySQL, or Vercel storage products are
used anywhere in this project.

## Getting started

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check + production build to dist/
npm run preview   # preview the production build locally
npm run test      # run the test suite in watch mode
npm run test:run  # run the test suite once (CI mode)
npm run lint       # oxlint
```

Requires Node 18+.

## Project structure

```
src/
  types/            TypeScript data models (Expense, Budget, Category, ...)
  db/               Dexie schema, versioned migrations, storage-availability checks
  repositories/      Data-access layer — every IndexedDB read/write goes through here
  services/          Domain logic: calculations, recurring generation, notifications,
                     backup/restore, CSV export, receipt compression, sample data
  contexts/          Theme, app settings, toast, and confirm-dialog providers
  hooks/             Shared data-loading and utility hooks
  components/        Reusable UI, organized by feature area (expenses, budgets,
                     wallet, reports, recurring, income, settings, layout, common)
  pages/             One component per route
  utils/             Currency formatting, date handling, safe math, chart colors
  tests/             Vitest unit/integration tests
```

Components never touch IndexedDB directly — they call into `repositories/` and
`services/`, which are the only code that imports `db/database.ts`.

## Data & storage

- **IndexedDB** (via Dexie) holds all financial data: expenses, budgets, category
  budgets, categories, payment methods, recurring expenses, income, notifications,
  settings, receipts (as `Blob`s), and backup metadata.
- **localStorage** holds only small UI preferences: theme, dashboard layout,
  last-used date filter, and whether onboarding has been completed.
- Every record has a stable `id` (UUID) plus `createdAt`/`updatedAt` timestamps.
- Monetary values are stored as **integers in the smallest currency unit** (e.g.
  cents for USD, whole yen for JPY) to avoid floating-point rounding errors, and
  are only converted to a decimal display value at the UI edge.
- Schema changes are additive Dexie `.version(n).stores(...)` blocks — see the
  comment at the top of `src/db/database.ts` for the migration strategy.
- If IndexedDB can't be opened (private browsing, disabled storage, corrupted
  data), the app shows a dedicated error screen instead of a blank page or crash.

## Feature overview

- **Dashboard** — budget progress, status (safe/warning/critical/over budget),
  and 8 summary cards, all computed live from IndexedDB.
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
- **Income** — income tracking with net balance and savings rate.
- **Backup & Restore** — full JSON export/import (merge or replace, with a
  safety backup taken automatically before any replace), plus CSV export.
- **Settings** — currency, budget month start, categories, theme, sample data,
  and the privacy notice.

## Deploying to Vercel

This is a static frontend — no environment variables or serverless functions are
required.

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **SPA routing:** `vercel.json` rewrites every path to `index.html` so refreshing
  a nested route (e.g. `/transactions`) doesn't 404.

To deploy: push this project to a Git provider and import it in Vercel, or run
`vercel` from the project root with the Vercel CLI. No database, API keys, or
backend configuration is needed.

## Offline support

ExpenseFlow registers a service worker (`public/sw.js`) in production builds that
caches the app shell, so after the first visit you can reopen the app, view
existing data, add/edit expenses, view reports, and export backups without a
network connection. An offline indicator appears in the top bar when the browser
has no connection.

## Sample data

Settings → **Load sample data** seeds an example budget, a handful of categorized
expenses, and a few payment methods, all tagged separately from real records so
they never mix. **Clear sample data** removes them again without touching your
own data.

## Testing

`src/tests/` covers expense/budget calculations, category and payment-method
totals, date-range filtering, recurring-expense generation and duplicate
prevention, backup export/validation/merge/replace, IndexedDB schema bootstrap,
and safe handling of empty datasets and invalid amounts (no `NaN`/`Infinity`
ever reaches the UI). Run with `npm run test:run`.
