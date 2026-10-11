// PROBE — the long-term/short-term line, after Claude's v2 review challenged our rule.
//
// His claim: the threshold is MORE THAN one year and the holding period starts the day AFTER
// purchase, so a lot sold exactly on the anniversary is SHORT term — where the old ">= 12 whole
// months" called it long. Running it showed he was right about the direction and understated the
// size: the old rule ignored the DAY entirely and compared calendar months only, so 335 days
// could read long-term — always the LOWER tax, which this sheet itself calls the worse mistake.
//
// FIXED 2026-08-20 (E7, founder brief): the line is day-precise now. These pins hold the cure.
import { capGains } from '../../src/domain/performance';

const lot = (purchase_date: string) => ({ position_id: 'p', ticker: 'VTI',
  lots: [{ lot_id: 'l', shares: 100, cost_per_share: 100, purchase_date }] } as any);
const SOLD = new Date('2026-01-01T12:00:00Z');
const isLong = (d: string) => (capGains(lot(d), 150, SOLD).longGain ?? 0) > 0;

describe('HOLDING_PERIOD', () => {
  test('the clear cases are right', () => {
    expect(isLong('2020-01-01')).toBe(true);      // years ago
    expect(isLong('2025-11-01')).toBe(false);     // two months
  });

  test('FIXED (E7): bought 31 Jan, sold 1 Jan — 335 days — is SHORT term now', () => {
    // the old rule computed (2026−2025)×12 + (0−0) = 12 calendar months and called it long
    expect(isLong('2025-01-31')).toBe(false);
  });

  test('every under-a-year January lot is SHORT — the month-counting error class is dead', () => {
    for (const d of ['2025-01-02', '2025-01-15', '2025-01-31']) {
      expect(isLong(d)).toBe(false);              // all under a year, all short
    }
  });

  test('FIXED (E7): the exact anniversary is SHORT — long-term needs MORE than one year', () => {
    expect(isLong('2025-01-01')).toBe(false);     // one year to the day is not "more than"
    expect(isLong('2024-12-31')).toBe(true);      // a year and a day IS
  });

  test('the tax direction is now the cautious one', () => {
    // The old error always favoured the 15% long-term rate over the ~24% short-term rate,
    // consistently UNDERSTATING the bill. The 335-day lot now carries its gain as short.
    const g = capGains(lot('2025-01-31'), 150, SOLD);
    expect(g.shortGain).toBe(5_000);
    expect(g.longGain).toBe(0);
  });

  test('the rule, in days, for the record', () => {
    const days = (from: string) => Math.floor((SOLD.getTime() - Date.parse(from)) / 86_400_000);
    expect(days('2025-01-31')).toBe(335);         // short
    expect(days('2025-01-01')).toBe(365);         // exactly a year → still SHORT
    expect(days('2024-12-31')).toBe(366);         // more than a year → long
  });
});
