// PROBES — the lot maths behind every holding number on Performance and Account detail.
//
// These are the numbers a person checks against their own brokerage statement first, because they
// are the ones they can verify without trusting us: how many shares, what I paid, what it is worth,
// what I am up. If these are wrong nothing above them can be right.
import {
  totalShares, costBasis, marketValue, unrealizedGain,
  capGains, totalROI, latestClose, earliestPurchaseDate, paidOnRecord,
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
// UPDATED 2026-10-21 to the rule of 2026-10-20 (paidOnRecord, by his rule for sales DEC-4643, master question Q20): Total
// paid and the average price paid count ONLY the purchases with a price paid on record (a cost above zero, lotCostOnRecord);
// a purchase without one is left out and named, never counted as $0. Before: a cost of 0 was paid $0, so 10 shares at $100
// and 10 with no price paid read Total paid $1,000 for all 20 and an average of $50.00.
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

  test('a lot with no cost still counts toward shares — you own them either way; Total paid and the average leave it out, not on record, never $0 (paidOnRecord 2026-10-20, DEC-4643 · Q20)', () => {
    const p = P(lot(10, 0));
    expect(totalShares(p)).toBe(10);
    // MK-PF-F-002 costBasis on its own still adds a typed 0 as a figure; Total paid on the screens no longer reads it
    expect(costBasis(p)).toBe(0);
    // old: Total paid $0 (costBasis). New: not on record — 0 of the 10 shares have a price paid
    expect(paidOnRecord(p)).toEqual({ paid: null, counted: 0, held: 10 });
    const alone = theHolding({ position: p, accountId: 'a', price: null, transactions: [] });
    expect([alone.totalPaid, alone.avgPaidPerShare, alone.avgLeavesOut]).toEqual([null, null, 10]);
    // beside a purchase with a price paid: 10 at $100 and 10 with none — old: Total paid $1,000 on all 20, average $50.00;
    // new: $1,000 on the 10 with a price paid, average $100.00, the other 10 named as left out
    const mixed = P(lot(10, 100), lot(10, 0));
    expect(paidOnRecord(mixed)).toEqual({ paid: 1000, counted: 10, held: 20 });
    const both = theHolding({ position: mixed, accountId: 'a', price: null, transactions: [] });
    expect([both.totalPaid, both.avgPaidPerShare, both.avgLeavesOut]).toEqual([1000, 100, 10]);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// HOLDING_MARKET_VALUE · HOLDING_UNREALISED_GAIN
// DERIVATION RULE: NO PRICE MEANS UNKNOWN, NOT A GUESS (and, since 2026-10-11, not zero either — tenet 3). An
// unpriced holding is never valued at what it cost — the screen says the price is missing instead of inventing one.
// UPDATED 2026-10-21: since 2026-10-20 (paidOnRecord, DEC-4643 · Q20) the gain is the value of the purchases WITH a price
// paid on record, less what was paid for them — never the whole value less a $0 for a purchase with no price paid.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('HOLDING_MARKET_VALUE / UNREALISED_GAIN', () => {
  test('value is shares × price; gain is the value of the purchases with a price paid on record less what was paid for them (paidOnRecord 2026-10-20, DEC-4643 · Q20)', () => {
    const p = P(lot(10, 100));
    expect(marketValue(p, 150)).toBe(1500);
    expect(unrealizedGain(p, 150)).toBe(500);
    // 10 at $100 and 10 with no price paid, today $120 — old: $2,400 − $1,000 = $1,400 (the second 10 as free shares);
    // new: 10 × $120 − $1,000 = $200, the same $200 as the gain if sold today
    const mixed = P(lot(10, 100), lot(10, 0));
    expect(marketValue(mixed, 120)).toBe(2400);
    expect(unrealizedGain(mixed, 120)).toBe(200);
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
// report the entire value as gain. UPDATED 2026-10-21 to Q20 (2026-10-20, by his rule for sales DEC-4643: "$200 gain on 10
// of 15 shares sold; what you paid for the other 5 is not on record"): a lot with no cost is LEFT OUT of the gain and its
// shares are counted as held, not counted, so the page says how many the gain covers. A part is unknown only when none of
// its shares has a price paid. Before (2026-10-11 to 2026-10-20): one lot with no cost made its whole part unknown.
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
  test('Q20 (DEC-4643): a lot with no cost is left out of the gain and said — alone its part is unknown (0 of 10 counted); beside a lot with a price paid the gain is that lot\'s, $200 on 10 of 20; never free shares, never $0', () => {
    const g = capGains(P(lot(10, 0, '2020-01-15')), 150, NOW);
    expect(g.longGain).toBeNull();
    expect(g.totalGain).toBeNull();
    expect(g.shortGain).toBe(0);                  // nothing short-term was held
    expect([g.countedShares, g.heldShares]).toEqual([0, 10]);   // new: how much of the holding the gain covers
    // 10 bought at $50 and 10 with no price paid, both in 2020, today $70 — old: long-term gain not stated at all (the
    // purchase with no price paid refused the whole part); new: 10 × ($70 − $50) = $200, on 10 of 20 shares
    const q20 = capGains(P(lot(10, 50, '2020-01-15'), lot(10, 0, '2020-01-15')), 70, NOW);
    expect(q20).toEqual({ longGain: 200, shortGain: 0, totalGain: 200, countedShares: 10, heldShares: 20 });
  });

  test('no price means no gain figure at all — and no count of the shares a gain covers (Q20, DEC-4643)', () => {
    // old: the three gains alone; new (Q20, 2026-10-20): the counted and held shares are part of the answer, unknown here too
    expect(capGains(P(lot(10, 100)), null, NOW)).toEqual({ longGain: null, shortGain: null, totalGain: null, countedShares: null, heldShares: null });
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

  // the rule until 2026-10-21, kept as it was pinned; it no longer holds (test.failing: this body now fails)
  test.failing('an unparseable purchase date is treated as SHORT-term — the cautious side — no longer the rule (FIXED 2026-10-21)', () => {
    // held-months falls to 0, so the gain is taxed at the higher rate rather than the lower one.
    // Erring the other way would understate a tax bill, which is the worse mistake.
    expect(capGains(P(lot(10, 100, 'not-a-date')), 150, NOW).shortGain).toBe(500);
  });
  test('a purchase date not on record — unparseable, blank or a day that does not exist — is in neither part; its gain is in the total (FIXED 2026-10-21, tenet 3)', () => {
    // a split nothing supports is a figure that looks known: the gain is counted, how long the shares were held is not
    for (const d of ['not-a-date', '', '2026-02-31']) {
      const g = capGains(P(lot(10, 100, d)), 150, NOW);
      expect([g.longGain, g.shortGain, g.totalGain, g.undated]).toEqual([null, null, 500, { gain: 500, counted: 10, held: 10 }]);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// HOLDING_TOTAL_ROI
// DERIVATION RULE: gain ÷ cost basis, SINCE PURCHASE — not annualised, and not comparable to a
// period return. A zero basis returns null rather than infinity. UPDATED 2026-10-21: since 2026-10-20 (paidOnRecord,
// DEC-4643 · Q20) both the gain and what was paid count only the purchases with a price paid on record.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('HOLDING_TOTAL_ROI', () => {
  test('it is the gain over what was paid, as a decimal — both over the purchases with a price paid on record (paidOnRecord 2026-10-20, DEC-4643 · Q20)', () => {
    expect(totalROI(P(lot(10, 100)), 150)).toBe(0.5);
    // 10 at $100 and 10 with no price paid, today $120 — old: $1,400 ÷ $1,000 = +140%; new: $200 ÷ $1,000 = +20.00%
    expect(totalROI(P(lot(10, 100), lot(10, 0)), 120)).toBeCloseTo(0.2, 12);
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
