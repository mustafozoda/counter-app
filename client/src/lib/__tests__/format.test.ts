import {
  formatCompact,
  formatMoney,
  formatMoneyWithSpec,
  formatPercentDelta,
  getCurrencySpec,
  type CurrencyFormatSpec,
} from '../format';

const usd: CurrencyFormatSpec = {
  code: 'USD',
  symbol: '$',
  symbolPosition: 'before',
  groupSeparator: ',',
  decimalSeparator: '.',
  fractionDigits: 2,
};

describe('formatMoneyWithSpec', () => {
  it('groups thousands and fixes decimals', () => {
    expect(formatMoneyWithSpec(1284.5, usd)).toBe('$1,284.50');
    expect(formatMoneyWithSpec(31908.2, usd)).toBe('$31,908.20');
    expect(formatMoneyWithSpec(1_000_000, usd)).toBe('$1,000,000.00');
  });

  it('handles zero and small values', () => {
    expect(formatMoneyWithSpec(0, usd)).toBe('$0.00');
    expect(formatMoneyWithSpec(7, usd)).toBe('$7.00');
    expect(formatMoneyWithSpec(999.999, usd)).toBe('$1,000.00');
  });

  it('handles negatives', () => {
    expect(formatMoneyWithSpec(-312.4, usd)).toBe('-$312.40');
  });

  it('supports trailing symbols and zero-decimal currencies', () => {
    const jpyLike: CurrencyFormatSpec = {
      ...usd,
      symbol: '¥',
      fractionDigits: 0,
    };
    expect(formatMoneyWithSpec(125000, jpyLike)).toBe('¥125,000');

    const trailing: CurrencyFormatSpec = {
      ...usd,
      symbol: 'SM',
      symbolPosition: 'after',
      groupSeparator: '\u00A0',
      decimalSeparator: ',',
    };
    expect(formatMoneyWithSpec(1284.5, trailing)).toBe('1\u00A0284,50\u00A0SM');
  });
});

describe('getCurrencySpec', () => {
  it('derives a usable spec from Intl', () => {
    const spec = getCurrencySpec('USD');
    expect(spec.symbol.length).toBeGreaterThan(0);
    expect(spec.fractionDigits).toBe(2);
  });

  it('falls back gracefully for unknown codes', () => {
    const spec = getCurrencySpec('XXX');
    expect(spec.code).toBe('XXX');
    expect(formatMoneyWithSpec(10, spec)).toContain('10');
  });

  it('round-trips through formatMoney', () => {
    expect(formatMoney(1284.5, 'USD')).toBe(formatMoneyWithSpec(1284.5, getCurrencySpec('USD')));
  });
});

describe('formatPercentDelta', () => {
  it('signs and rounds to one decimal', () => {
    expect(formatPercentDelta(0.124)).toBe('+12.4%');
    expect(formatPercentDelta(-0.031)).toBe('-3.1%');
    expect(formatPercentDelta(0)).toBe('0.0%');
  });
});

describe('formatCompact', () => {
  it('keeps small numbers and compacts large ones', () => {
    expect(formatCompact(999)).toBe('999');
    expect(formatCompact(1000)).toBe('1k');
    expect(formatCompact(12400)).toBe('12.4k');
    expect(formatCompact(2_000_000)).toBe('2M');
  });
});
