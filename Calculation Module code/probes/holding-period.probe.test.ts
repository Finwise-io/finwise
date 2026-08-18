// PROBE — the long-term/short-term line, after Claude's v2 review challenged our rule.
//
// His claim: the threshold is MORE THAN one year and the holding period starts the day AFTER
// purchase, so a lot sold exactly on the anniversary is SHORT term — where our ">= 12 whole months"
// calls it long. He said we were "a day out". Running it shows he was right about the direction and
// understated the size: our rule ignores the DAY entirely and compares calendar months only.
import { capGains } from '../../src/domain/performance';

const lot = (purchase_date: string) => ({ position_id: 'p', ticker: 'VTI',
  lots: [{ lot_id: 'l', shares: 100, cost_per_share: 100, purchase_date }] } as any);
const SOLD = new Date('2026-01-01T12:00:00Z');
const isLong = (d: string) => capGains(lot(d), 150, SOLD).longGain > 0;

describe('HOLDING_PERIOD', () => {
  test('the clear cases are right', () => {
    expect(isLong('2020-01-01')).toBe(true);      // years ago
    expect(isLong('2025-11-01')).toBe(false);     // two months
  });

  test('DEFECT: bought 31 Jan, sold 1 Jan — 11 months and 1 day — counted LONG term', () => {
    // (2026−2025)×12 + (0−0) = 12 → passes ">= 12". The day is never looked at.
    expect(isLong('2025-01-31')).toBe(true);      // ← should be SHORT: held 335 days
  });

  test('the error can reach a full month, always in the same direction', () => {
    for (const d of ['2025-01-02', '2025-01-15', '2025-01-31']) {
      expect(isLong(d)).toBe(true);               // every one is under a year, all called long
    }
    // 2025-01-31 → 2026-01-01 is 335 days. Long-term treatment needs MORE than 365.
  });

  test('DEFECT: the exact anniversary is LONG here, and should be SHORT', () => {
    // the holding period starts the day AFTER purchase, so one year to the day is not "more than".
    expect(isLong('2025-01-01')).toBe(true);      // ← should be SHORT by one day
  });

  test('WHY THE DIRECTION MATTERS: it always favours the lower tax rate', () => {
    // Every case above is wrongly LONG, never wrongly short. Long-term is taxed at 15% in our
    // defaults and short-term at 24%, so the error consistently UNDERSTATES the bill — which this
    // sheet itself calls the worse mistake.
    const g = capGains(lot('2025-01-31'), 150, SOLD);
    expect(g.longGain).toBe(5_000);
    expect(g.shortGain).toBe(0);
  });

  test('THE FIX, expressed as the rule it should be: more than 365 days from the day after purchase', () => {
    const days = (from: string) => Math.floor((SOLD.getTime() - Date.parse(from)) / 86_400_000);
    expect(days('2025-01-31')).toBe(335);         // short
    expect(days('2025-01-01')).toBe(365);         // exactly a year → still SHORT
    expect(days('2024-12-31')).toBe(366);         // more than a year → long
  });
});
