// PROBES — the lot maths behind every holding number on Performance and Account detail.
//
// These are the numbers a person checks against their own brokerage statement first, because they
// are the ones they can verify without trusting us: how many shares, what I paid, what it is worth,
// what I am up. If these are wrong nothing above them can be right.
import {
  totalShares, costBasis, avgCost, marketValue, unrealizedGain,
  capGains, capGainsTax, totalROI, latestClose, earliestPurchaseDate,
} from '../../src/domain/performance';

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
    expect(avgCost(p)).toBe(106.67);              // 1600 ÷ 15, to the cent
  });

  test('no lots is zero, not an error and not a guess', () => {
    expect(totalShares(P())).toBe(0);
    expect(costBasis(P())).toBe(0);
    expect(avgCost(P())).toBe(0);                 // avoids dividing by zero
  });

  test('a lot with no cost still counts toward shares — you own them either way', () => {
    const p = P(lot(10, 0));
    expect(totalShares(p)).toBe(10);
    expect(costBasis(p)).toBe(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// HOLDING_MARKET_VALUE · HOLDING_UNREALISED_GAIN
// DERIVATION RULE: NO PRICE MEANS ZERO, NOT A GUESS. An unpriced holding contributes nothing rather
// than being valued at what it cost — the screen says the price is missing instead of inventing one.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('HOLDING_MARKET_VALUE / UNREALISED_GAIN', () => {
  test('value is shares × price; gain is value − basis', () => {
    const p = P(lot(10, 100));
    expect(marketValue(p, 150)).toBe(1500);
    expect(unrealizedGain(p, 150)).toBe(500);
  });

  test('a missing price yields zero, and never falls back to cost', () => {
    const p = P(lot(10, 100));
    expect(marketValue(p, null)).toBe(0);
    expect(unrealizedGain(p, null)).toBe(0);      // NOT −1000, and NOT 0-because-it-equals-cost
  });

  test('a loss is a real negative — it is never floored', () => {
    expect(unrealizedGain(P(lot(10, 100)), 60)).toBe(-400);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// HOLDING_CAP_GAINS · CAP_GAINS_TAX
// DERIVATION RULE: long-term means held twelve WHOLE MONTHS or more, measured per lot from its own
// purchase date — not per position. Lots with no cost basis are skipped rather than treated as free
// shares, which would report the entire value as gain.
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

  test('twelve whole months is the line', () => {
    expect(capGains(P(lot(10, 100, '2025-08-17')), 150, NOW).longGain).toBe(500);
    expect(capGains(P(lot(10, 100, '2025-09-17')), 150, NOW).shortGain).toBe(500);
  });

  test('a lot with no cost is SKIPPED, not treated as free shares', () => {
    // treating it as free would report the whole $1,500 as gain and tax it
    expect(capGains(P(lot(10, 0, '2020-01-15')), 150, NOW).totalGain).toBe(0);
  });

  test('no price means no gain figure at all', () => {
    expect(capGains(P(lot(10, 100)), null, NOW)).toEqual({ longGain: 0, shortGain: 0, totalGain: 0 });
  });

  test('losses never create a positive tax bill', () => {
    expect(capGainsTax(-1000, -500)).toBe(0);
    expect(capGainsTax(1000, 500)).toBe(270);     // 1000×0.15 + 500×0.24
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
