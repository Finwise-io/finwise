// Money formatting — the single source of truth for how amounts display app-wide.
import { setMoneyFormat, activeCurrency, currencySymbol, formatMoney, moneyCompact, CURRENCIES } from './money';

afterEach(() => setMoneyFormat('USD', 'en-US'));   // module-level state — always reset

describe('setMoneyFormat / activeCurrency', () => {
  test('defaults to USD', () => {
    expect(activeCurrency().code).toBe('USD');
    expect(currencySymbol()).toBe('$');
  });

  test('switching currency picks up its symbol and locale', () => {
    setMoneyFormat('INR');
    expect(activeCurrency().code).toBe('INR');
    expect(currencySymbol()).toBe('₹');
  });

  test('unknown currency code falls back to USD for activeCurrency()', () => {
    setMoneyFormat('XYZ');
    expect(activeCurrency().code).toBe('USD');     // safe fallback, never undefined
  });

  test('every launch currency has a symbol, locale, and sane decimals', () => {
    for (const c of CURRENCIES) {
      expect(c.symbol).toBeTruthy();
      expect(c.locale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
      expect([0, 2]).toContain(c.decimals);
    }
  });
});

describe('formatMoney', () => {
  test('USD: whole-number, grouped', () => {
    expect(formatMoney(2460137)).toBe('$2,460,137');
  });

  test('negative amounts keep the sign', () => {
    expect(formatMoney(-1500)).toMatch(/-\$?1,500|\$-1,500|-\$1,500/);
  });

  test('INR uses lakh/crore grouping', () => {
    setMoneyFormat('INR');
    expect(formatMoney(2460137)).toBe('₹24,60,137');
  });

  test('EUR formats with the euro symbol', () => {
    setMoneyFormat('EUR');
    expect(formatMoney(1000)).toContain('€');
  });

  test('non-finite input renders as zero, never throws', () => {
    expect(formatMoney(NaN)).toBe('$0');
    expect(formatMoney(Infinity)).toBe('$0');
  });

  test('rounds to whole units (the app-wide whole-number money style)', () => {
    expect(formatMoney(99.6)).toBe('$100');
  });
});

describe('moneyCompact', () => {
  test('millions, thousands, and small amounts', () => {
    expect(moneyCompact(2500000)).toBe('$2.5MM');
    expect(moneyCompact(2500000, 'M')).toBe('$2.5M');
    expect(moneyCompact(75500)).toBe('$76K');
    expect(moneyCompact(950)).toBe('$950');
  });

  test('negatives carry the sign in front of the symbol', () => {
    expect(moneyCompact(-1200000)).toBe('-$1.2MM');
  });

  test('honors the active currency symbol', () => {
    setMoneyFormat('GBP');
    expect(moneyCompact(2000)).toBe('£2K');
  });
});
