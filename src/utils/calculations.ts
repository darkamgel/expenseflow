/** Generic, defensive math helpers used throughout dashboard/report calculations.
 * Every function here is guaranteed to never return NaN, Infinity, or undefined. */

export function safeDivide(numerator: number, denominator: number, fallback = 0): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return fallback;
  }
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
}

export function percentage(part: number, whole: number): number {
  return safeDivide(part, whole, 0) * 100;
}

export function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
}

export function average(values: number[]): number {
  return safeDivide(sum(values), values.length, 0);
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function groupBy<T, K extends string | number>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return map;
}

export type BudgetStatus = 'safe' | 'warning' | 'critical' | 'over_budget' | 'no_budget';

export function getBudgetStatus(percentUsed: number, hasBudget: boolean): BudgetStatus {
  if (!hasBudget) return 'no_budget';
  if (percentUsed > 100) return 'over_budget';
  if (percentUsed >= 90) return 'critical';
  if (percentUsed >= 70) return 'warning';
  return 'safe';
}

export const BUDGET_STATUS_LABEL: Record<BudgetStatus, string> = {
  safe: 'On track',
  warning: 'Approaching limit',
  critical: 'Near limit',
  over_budget: 'Over budget',
  no_budget: 'No budget set',
};
