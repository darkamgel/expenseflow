/**
 * All dates in this app are stored and compared as local-calendar
 * YYYY-MM-DD strings rather than Date objects or ISO UTC timestamps, so an
 * expense entered at 11pm never silently shifts to the next UTC day.
 */

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayDateKey(): string {
  return toDateKey(new Date());
}

export function nowTimeKey(): string {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Parses a YYYY-MM-DD string into a local-midnight Date (never shifts across timezones). */
export function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function isValidDateKey(dateKey: string | undefined | null): dateKey is string {
  if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  const d = parseDateKey(dateKey);
  return !Number.isNaN(d.getTime());
}

export function addDays(dateKey: string, days: number): string {
  const d = parseDateKey(dateKey);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

export function addMonths(dateKey: string, months: number): string {
  const d = parseDateKey(dateKey);
  d.setMonth(d.getMonth() + months);
  return toDateKey(d);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function getMonthYear(dateKey: string): { month: number; year: number } {
  const d = parseDateKey(dateKey);
  return { month: d.getMonth() + 1, year: d.getFullYear() };
}

export function monthKey(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

export function formatMonthLabel(year: number, month: number): string {
  return parseDateKey(`${year}-${pad2(month)}-01`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateDisplay(dateKey: string, opts?: Intl.DateTimeFormatOptions): string {
  if (!isValidDateKey(dateKey)) return '—';
  return parseDateKey(dateKey).toLocaleDateString(
    undefined,
    opts ?? { month: 'short', day: 'numeric', year: 'numeric' }
  );
}

/** Returns the current local year/month, or the budget-month-adjusted equivalent
 * when `firstDayOfBudgetMonth` pushes the boundary away from calendar day 1. */
export function getCurrentBudgetMonth(firstDayOfBudgetMonth = 1): { year: number; month: number } {
  const today = new Date();
  if (firstDayOfBudgetMonth <= 1 || today.getDate() >= firstDayOfBudgetMonth) {
    return { year: today.getFullYear(), month: today.getMonth() + 1 };
  }
  const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  return { year: prev.getFullYear(), month: prev.getMonth() + 1 };
}

/** Inclusive [start, end] date-key range for a given budget month, honoring a custom first day. */
export function getBudgetMonthRange(
  year: number,
  month: number,
  firstDayOfBudgetMonth = 1
): { start: string; end: string } {
  const clampedFirstDay = Math.min(Math.max(firstDayOfBudgetMonth, 1), 28);
  const start = new Date(year, month - 1, clampedFirstDay);
  const end = new Date(year, month, clampedFirstDay - 1);
  return { start: toDateKey(start), end: toDateKey(end) };
}

export type ReportRangePreset =
  | 'current_month'
  | 'previous_month'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_12_months'
  | 'current_year'
  | 'custom';

export function getRangeForPreset(
  preset: ReportRangePreset,
  custom?: { from: string; to: string }
): { from: string; to: string } {
  const today = todayDateKey();
  const { year, month } = getMonthYear(today);

  switch (preset) {
    case 'current_month': {
      const { start, end } = getBudgetMonthRange(year, month, 1);
      return { from: start, to: end };
    }
    case 'previous_month': {
      const prevKey = addMonths(`${year}-${pad2(month)}-01`, -1);
      const { year: py, month: pm } = getMonthYear(prevKey);
      const { start, end } = getBudgetMonthRange(py, pm, 1);
      return { from: start, to: end };
    }
    case 'last_3_months':
      return { from: addMonths(today, -2).slice(0, 8) + '01', to: today };
    case 'last_6_months':
      return { from: addMonths(today, -5).slice(0, 8) + '01', to: today };
    case 'last_12_months':
      return { from: addMonths(today, -11).slice(0, 8) + '01', to: today };
    case 'current_year':
      return { from: `${year}-01-01`, to: today };
    case 'custom':
      return custom ?? { from: today, to: today };
    default:
      return { from: today, to: today };
  }
}

/** Returns the last N (year, month) pairs ending at the current month, oldest first. */
export function getLastNMonths(n: number): { year: number; month: number }[] {
  const today = todayDateKey();
  const result: { year: number; month: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const key = addMonths(today, -i);
    result.push(getMonthYear(key));
  }
  return result;
}

export function isDateKeyInRange(dateKey: string, from: string, to: string): boolean {
  return dateKey >= from && dateKey <= to;
}

/** Chooses a sensible trend window (year/month list) for a given report preset, so
 * month-over-month charts stay meaningful even when the preset targets a single period. */
export function monthsForPreset(preset: ReportRangePreset, range: { from: string; to: string }): { year: number; month: number }[] {
  const { year: toYear, month: toMonth } = getMonthYear(range.to);
  const toKey = `${toYear}-${String(toMonth).padStart(2, '0')}-01`;

  switch (preset) {
    case 'last_3_months':
      return monthsEndingAt(toKey, 3);
    case 'last_6_months':
      return monthsEndingAt(toKey, 6);
    case 'last_12_months':
      return monthsEndingAt(toKey, 12);
    case 'current_year':
      return Array.from({ length: toMonth }, (_, i) => ({ year: toYear, month: i + 1 }));
    default:
      return monthsEndingAt(toKey, 6);
  }
}

function monthsEndingAt(dateKey: string, n: number): { year: number; month: number }[] {
  const result: { year: number; month: number }[] = [];
  for (let i = n - 1; i >= 0; i--) {
    result.push(getMonthYear(addMonths(dateKey, -i)));
  }
  return result;
}
