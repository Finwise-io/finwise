// Money formatting — the single source of truth for how amounts display app-wide.
import { setMoneyFormat, setHideBalances, activeCurrency, currencySymbol, formatMoney, moneyCompact, CURRENCIES, BALANCE_MASK } from './money';

afterEach(() => { setMoneyFormat('USD', 'en-US'); setHideBalances(false); });   // module-level state — always reset

describe('hide-balances masking (the one display-mask source)', () => {
  test('setHideBalances(true) masks every formatter; (false) restores', () => {
    setHideBalances(true);
    expect(formatMoney(2_500_000)).toBe(BALANCE_MASK);
    expect(moneyCompact(2_500_000)).toBe(BALANCE_MASK);
    setHideBalances(false);
    expect(formatMoney(2500)).toBe('$2,500');
    expect(moneyCompact(2500)).toBe('$3K');
  });
});

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

  // CHANGED 2026-08-10: a figure we could not compute used to print as "$0" — a real-looking balance.
  // That is how a Net Worth screen whose debts failed to parse rendered a confident "$0" net worth
  // instead of admitting it had nothing to show. Non-finite now reads as an em dash: never throws,
  // and never passes itself off as zero.
  test('non-finite input renders as an em dash — never a real-looking $0 — and never throws', () => {
    expect(formatMoney(NaN)).toBe('—');
    expect(formatMoney(Infinity)).toBe('—');
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
