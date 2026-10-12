// PROBES — the lot maths behind every holding number on Performance and Account detail.
//
// These are the numbers a person checks against their own brokerage statement first, because they
// are the ones they can verify without trusting us: how many shares, what I paid, what it is worth,
// what I am up. If these are wrong nothing above them can be right.
import {
  totalShares, costBasis, marketValue, unrealizedGain,
  capGains, totalROI, latestClose, earliestPurchaseDate,
} from '../../src/domain/performance';
import { theHolding } from '../../MoneyKeel/functions/networth-and-performance/holding';

const lot = (shares: number, cost: number, date = '2020-01-15') =>
  ({ lot_id: 'l', shares, cost_per_share: cost, purchase_date: date });
const P = (...lots: any[]) => ({ position_id: 'p', ticker: 'VTI', lots } as any);

// ════════════════════════════════════════════════════════════════════════════════════════════════
// HOLDING_SHARES · HOLDING_COST_BASIS · HOLDING_AVG_COST
// DERIVATION RULE: a position is the SUM OF ITS LOTS, never a single stored figure. A broker that
// sends no lots gets one synthetic lot built from the average price, so gain-since-purchase stays
// exact even when the purchase history does not exist.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('HOLDING_SHARES / COST_BASIS / AVG_COST', () => {
  test('shares and basis are summed across every lot', () => {
    const p = P(lot(10, 100), lot(5, 120));
    expect(totalShares(p)).toBe(15);
    expect(costBasis(p)).toBe(1600);              // 10×100 + 5×120
    // the average paid per share is MK-NW-O-006 theHolding's avgPaidPerShare (MK-PF-F-003 avgCost removed 2026-10-12, DEC-4642)
    expect(theHolding({ position: p, accountId: 'a', price: null, transactions: [] }).avgPaidPerShare).toBeCloseTo(1600 / 15, 12);
    expect(theHolding({ position: P(), accountId: 'a', price: null, transactions: [] }).avgPaidPerShare).toBeNull();   // no shares held: no average
  });

  test('no lots is zero, not an error and not a guess', () => {
    expect(totalShares(P())).toBe(0);
    expect(costBasis(P())).toBe(0);
  });

  test('a lot with no cost still counts toward shares — you own them either way', () => {
    const p = P(lot(10, 0));
    expect(totalShares(p)).toBe(10);
    expect(costBasis(p)).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// HOLDING_MARKET_VALUE · HOLDING_UNREALISED_GAIN
// DERIVATION RULE: NO PRICE MEANS UNKNOWN, NOT A GUESS (and, since 2026-10-11, not zero either — tenet 3). An
// unpriced holding is never valued at what it cost — the screen says the price is missing instead of inventing one.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('HOLDING_MARKET_VALUE / UNREALISED_GAIN', () => {
  test('value is shares × price; gain is value − basis', () => {
    const p = P(lot(10, 100));
    expect(marketValue(p, 150)).toBe(1500);
    expect(unrealizedGain(p, 150)).toBe(500);
  });

  // UNKNOWN, NOT ZERO (outside review Claude Performance, 2026-10-11, DEC-3523 tenet 3): shares with no price are
  // worth something unknown — it read $0 and "no gain". Still never a fallback to cost.
  test('a missing price yields UNKNOWN, and never falls back to cost', () => {
    const p = P(lot(10, 100));
    expect(marketValue(p, null)).toBeNull();
    expect(unrealizedGain(p, null)).toBeNull();   // NOT −1000, NOT 0, and NOT 0-because-it-equals-cost
  });

  test('a loss is a real negative — it is never floored', () => {
    expect(unrealizedGain(P(lot(10, 100)), 60)).toBe(-400);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// HOLDING_CAP_GAINS · CAP_GAINS_TAX
// DERIVATION RULE: long-term means held twelve WHOLE MONTHS or more, measured per lot from its own
// purchase date — not per position. A lot with no cost basis is never treated as free shares, which would
// report the entire value as gain; since 2026-10-11 its part of the split is unknown rather than skipped.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('HOLDING_CAP_GAINS / CAP_GAINS_TAX', () => {
  const NOW = new Date('2026-08-17T12:00:00Z');

  test('each lot is judged on its OWN purchase date, not the position\'s', () => {
    const p = P(lot(10, 100, '2020-01-15'), lot(10, 100, '2026-06-01'));
    const g = capGains(p, 150, NOW);
    expect(g.longGain).toBe(500);                 // the 2020 lot
    expect(g.shortGain).toBe(500);                // the June lot
    expect(g.totalGain).toBe(1000);
  });

  test('MORE than one year is the line, day-precise (E7 — was: twelve calendar months)', () => {
    expect(capGains(P(lot(10, 100, '2025-08-16')), 150, NOW).longGain).toBe(500);   // a year and a day
    expect(capGains(P(lot(10, 100, '2025-09-17')), 150, NOW).shortGain).toBe(500);  // well inside a year
  });

  // A LOT WITH NO COST IS NOT FREE SHARES, AND NOT A $0 GAIN EITHER (outside review Claude Performance, 2026-10-11,
  // DEC-3523 tenets 3 and 4): skipping it made its shares vanish from the split, so the total disagreed with the
  // gain above it. Its part is unknown, and the total with it.
  test('a lot with no cost makes its part of the split UNKNOWN, not free shares and not $0', () => {
    const g = capGains(P(lot(10, 0, '2020-01-15')), 150, NOW);
    expect(g.longGain).toBeNull();
    expect(g.totalGain).toBeNull();
    expect(g.shortGain).toBe(0);                  // nothing short-term was held
  });

  test('no price means no gain figure at all', () => {
    expect(capGains(P(lot(10, 100)), null, NOW)).toEqual({ longGain: null, shortGain: null, totalGain: null });
  });

  test('E7: the line is DAY-precise — 335 days is SHORT, whatever the calendar months say', () => {
    // the old rule counted calendar months: bought Jan 31, checked Jan 1 read as 12 months and
    // went LONG-term at 335 days — always the lower tax. Day-precise now, and exactly one year
    // is still short (the IRS line is MORE than one year).
    const jan1 = new Date(2026, 0, 1);
    expect(capGains(P(lot(10, 100, '2025-01-31')), 150, jan1).shortGain).toBe(500);
    const exactYear = new Date(2026, 0, 31);
    expect(capGains(P(lot(10, 100, '2025-01-31')), 150, exactYear).shortGain).toBe(500);
    const dayAfter = new Date(2026, 1, 1);
    expect(capGains(P(lot(10, 100, '2025-01-31')), 150, dayAfter).longGain).toBe(500);
  });

  test('an unparseable purchase date is treated as SHORT-term — the cautious side', () => {
    // held-months falls to 0, so the gain is taxed at the higher rate rather than the lower one.
    // Erring the other way would understate a tax bill, which is the worse mistake.
    expect(capGains(P(lot(10, 100, 'not-a-date')), 150, NOW).shortGain).toBe(500);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// HOLDING_TOTAL_ROI
// DERIVATION RULE: gain ÷ cost basis, SINCE PURCHASE — not annualised, and not comparable to a
// period return. A zero basis returns null rather than infinity.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('HOLDING_TOTAL_ROI', () => {
  test('it is the gain over what was paid, as a decimal', () => {
    expect(totalROI(P(lot(10, 100)), 150)).toBe(0.5);
  });

  test('no price, or nothing paid, returns null rather than infinity or zero', () => {
    expect(totalROI(P(lot(10, 100)), null)).toBeNull();
    expect(totalROI(P(lot(10, 0)), 150)).toBeNull();
    expect(totalROI(P(), 150)).toBeNull();
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// PRICE_LATEST · HOLDING_EARLIEST_PURCHASE
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('PRICE_LATEST / EARLIEST_PURCHASE', () => {
  test('the latest close is the last point, and an empty series is null not zero', () => {
    expect(latestClose({ ticker: 'VTI', points: [{ date: '2026-08-01', close: 10 }, { date: '2026-08-14', close: 12 }] } as any)).toBe(12);
    expect(latestClose({ ticker: 'VTI', points: [] } as any)).toBeNull();
    expect(latestClose(null as any)).toBeNull();
  });

  test('the earliest purchase date is the oldest lot, and null when nothing is dated', () => {
    expect(earliestPurchaseDate(P(lot(1, 1, '2024-05-01'), lot(1, 1, '2020-01-15')))).toBe('2020-01-15');
    expect(earliestPurchaseDate(P(lot(1, 1, '')))).toBeNull();
  });
});
