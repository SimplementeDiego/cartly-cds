import { formatMoney as formatCurrencyCents } from '../lib/format';

export type CurrencyCode = 'USD' | 'UYU';

export type CurrencyBoundary = 'min' | 'max' | 'nearest';

const DEFAULT_USD_UYU_RATE = 42;

export function resolveUsdUyuRate(value: string | number | undefined) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_USD_UYU_RATE;
}

/** Uruguayan pesos represented by one US dollar. */
export const USD_UYU_RATE = resolveUsdUyuRate(import.meta.env.VITE_USD_UYU_RATE);

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return value === 'USD' || value === 'UYU';
}

function requireFiniteCents(cents: number) {
  if (!Number.isFinite(cents)) throw new TypeError('El importe debe ser un numero finito.');
}

/** Converts the USD cents stored by the backend to the selected currency's minor unit. */
export function convertUsdCentsToDisplayCents(usdCents: number, currency: CurrencyCode) {
  requireFiniteCents(usdCents);
  return currency === 'USD' ? Math.round(usdCents) : Math.round(usdCents * USD_UYU_RATE);
}

/**
 * Converts a displayed amount back to backend USD cents.
 * Inclusive minimum filters round up; inclusive maximum filters round down.
 */
export function convertDisplayCentsToUsdCents(
  displayCents: number,
  currency: CurrencyCode,
  boundary: CurrencyBoundary = 'nearest',
) {
  requireFiniteCents(displayCents);
  const usdCents = currency === 'USD' ? displayCents : displayCents / USD_UYU_RATE;

  if (boundary === 'min') return Math.ceil(usdCents);
  if (boundary === 'max') return Math.floor(usdCents);
  return Math.round(usdCents);
}

export function formatUsdCents(usdCents: number, currency: CurrencyCode) {
  return formatCurrencyCents(convertUsdCentsToDisplayCents(usdCents, currency), currency);
}
