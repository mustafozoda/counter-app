import { format as formatDate, isToday, isYesterday } from 'date-fns';

export interface CurrencyFormatSpec {
  /** ISO 4217 code, e.g. "USD". */
  code: string;
  /** Display symbol, e.g. "$". */
  symbol: string;
  /** Whether the symbol leads ("$1,200") or trails ("1 200 ₽"). */
  symbolPosition: 'before' | 'after';
  /** Thousands group separator. */
  groupSeparator: string;
  /** Decimal separator. */
  decimalSeparator: string;
  /** Number of fraction digits (0 for JPY-like currencies). */
  fractionDigits: number;
}

const specCache = new Map<string, CurrencyFormatSpec>();

/**
 * Derive a plain formatting spec from Intl once per currency. The spec is a
 * serializable object, so it can cross the Reanimated worklet boundary and
 * drive 60fps animated money counters without touching Intl on the UI thread.
 */
export function getCurrencySpec(code: string): CurrencyFormatSpec {
  const cached = specCache.get(code);
  if (cached) return cached;

  let spec: CurrencyFormatSpec = {
    code,
    symbol: code,
    symbolPosition: 'before',
    groupSeparator: ',',
    decimalSeparator: '.',
    fractionDigits: 2,
  };

  try {
    const formatter = new Intl.NumberFormat(undefined, { style: 'currency', currency: code });
    const parts = formatter.formatToParts(-12345.6);
    const currencyIndex = parts.findIndex((p) => p.type === 'currency');
    const integerIndex = parts.findIndex((p) => p.type === 'integer');
    spec = {
      code,
      symbol: parts.find((p) => p.type === 'currency')?.value ?? code,
      symbolPosition: currencyIndex >= 0 && currencyIndex < integerIndex ? 'before' : 'after',
      groupSeparator: parts.find((p) => p.type === 'group')?.value ?? ',',
      decimalSeparator: parts.find((p) => p.type === 'decimal')?.value ?? '.',
      fractionDigits: formatter.resolvedOptions().maximumFractionDigits ?? 2,
    };
  } catch {
    // Fall back to the default spec when Intl lacks this currency.
  }

  specCache.set(code, spec);
  return spec;
}

/**
 * Format an amount with a currency spec. Marked as a worklet so Reanimated
 * animated counters can call it on the UI thread; it is equally safe on JS.
 */
export function formatMoneyWithSpec(value: number, spec: CurrencyFormatSpec): string {
  'worklet';
  const negative = value < 0 || Object.is(value, -0);
  const abs = Math.abs(value);
  const fixed = abs.toFixed(spec.fractionDigits);
  const [intPartRaw, fracPart] = fixed.split('.');
  const intPart = intPartRaw ?? '0';

  let grouped = '';
  for (let i = 0; i < intPart.length; i++) {
    const fromEnd = intPart.length - i;
    grouped += intPart[i];
    if (fromEnd > 1 && (fromEnd - 1) % 3 === 0) grouped += spec.groupSeparator;
  }

  // Non-breaking space keeps the amount and a trailing symbol on one line.
  const NBSP = '\u00A0';
  const number = fracPart ? grouped + spec.decimalSeparator + fracPart : grouped;
  const sign = negative ? '-' : '';
  return spec.symbolPosition === 'before'
    ? sign + spec.symbol + number
    : sign + number + NBSP + spec.symbol;
}

/** Format an amount in a currency for static display. */
export function formatMoney(value: number, currencyCode: string): string {
  return formatMoneyWithSpec(value, getCurrencySpec(currencyCode));
}

/** Signed money movement: "+$1,250.00" / "-$89.50". */
export function formatMoneyDelta(value: number, currencyCode: string): string {
  const sign = value > 0 ? '+' : '';
  return sign + formatMoney(value, currencyCode);
}

/** "+12.4%" / "-3.1%" with one decimal. */
export function formatPercentDelta(ratio: number): string {
  const sign = ratio > 0 ? '+' : '';
  return `${sign}${(ratio * 100).toFixed(1)}%`;
}

/** Compact quantities for badges: 999 → "999", 12400 → "12.4k". */
export function formatCompact(value: number): string {
  if (Math.abs(value) < 1000) return String(value);
  if (Math.abs(value) < 1_000_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

/** Friendly day label: "Today", "Yesterday", or "Mar 4". */
export function formatDayLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return formatDate(date, 'MMM d');
}

/** Full date-time for receipts and ledgers: "Mar 4, 2026 · 2:41 PM". */
export function formatDateTime(date: Date): string {
  return formatDate(date, 'MMM d, yyyy · h:mm a');
}
