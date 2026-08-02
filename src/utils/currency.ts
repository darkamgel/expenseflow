import type { CurrencyCode } from '../types';

/** Number of digits after the decimal point for each currency's smallest unit. */
const MINOR_UNIT_DIGITS: Record<CurrencyCode, number> = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  NPR: 2,
  INR: 2,
  CAD: 2,
  AUD: 2,
  JPY: 0,
};

export function getMinorUnitDigits(currency: CurrencyCode): number {
  return MINOR_UNIT_DIGITS[currency] ?? 2;
}

/** Converts a decimal major-unit amount (e.g. dollars) to an integer smallest-unit amount (e.g. cents). */
export function toMinorUnits(amountMajor: number, currency: CurrencyCode): number {
  if (!Number.isFinite(amountMajor)) return 0;
  const factor = 10 ** getMinorUnitDigits(currency);
  return Math.round(amountMajor * factor);
}

/** Converts an integer smallest-unit amount back to a decimal major-unit amount. */
export function fromMinorUnits(amountMinor: number, currency: CurrencyCode): number {
  if (!Number.isFinite(amountMinor)) return 0;
  const factor = 10 ** getMinorUnitDigits(currency);
  return amountMinor / factor;
}

/** Formats an integer smallest-unit amount as a localized currency string. Never returns NaN/undefined. */
export function formatMoney(amountMinor: number | undefined | null, currency: CurrencyCode): string {
  const safeAmount = Number.isFinite(amountMinor) ? (amountMinor as number) : 0;
  const major = fromMinorUnits(safeAmount, currency);
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(major);
  } catch {
    return `${currency} ${major.toFixed(getMinorUnitDigits(currency))}`;
  }
}

export function formatPercent(value: number | undefined | null, fractionDigits = 0): string {
  const safeValue = Number.isFinite(value) ? (value as number) : 0;
  return `${safeValue.toFixed(fractionDigits)}%`;
}
