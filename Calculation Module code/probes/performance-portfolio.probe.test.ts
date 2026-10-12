// PROBES — the portfolio-level performance numbers, and the personal return.
//
// This is the other half of the family behind the founder's Vanguard finding. The holding-level
// maths was probed already; these are the figures built ON TOP of it — the ones that answer "how am
// I doing", which is the question a person actually asks.
//
// The personal return is the most honest engine in the app: it refuses to answer rather than guess,
// in four separate ways. It is worth documenting precisely because its refusals are the feature.
import { topHoldingConcentration, benchmarkTicker } from '../../src/domain/performance';
import { factorOverMonths, lookBack } from '../../src/domain/performance/lookBack';

const acct = (id: string) => ({ asset_id: id, label: id, tax_bucket: 'TAXABLE', balance: 0 } as any);
const txn = (o: any) => ({ txn_id: 't', account_id: 'a', date: '2025-01-01', type: 'DEPOSIT', amount: 0, ...o } as any);
const IDS = new Set(['a']);
const NOW = Date.parse('2026-08-17T12:00:00Z');

// PERSONAL_RETURN — the money-weighted rate (src/domain/performance/moneyWeighted.ts) — was probed here.
// The function was removed on 2026-10-04 (owner decision DEC-1669: every return is time-weighted).

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ATTRIBUTION · ALLOCATION · CONCENTRATION
// ════════════════════════════════════════════════════════════════════════════════════════════════
const row = (ticker: string, marketValue: number, periodReturn: number | null, kind = 'stocks_etf') =>
  ({ position: { position_id: ticker, ticker, kind, lots: [] }, marketValue, periodReturn } as any);

// ATTRIBUTION and ALLOCATION (MK-PF-F-016, MK-PF-F-017) were probed here. Both were removed on 2026-10-12 (his
// approval, DEC-4642): no screen called them.
describe('CONCENTRATION', () => {
  // MY TEST WAS WRONG, NOT THE CODE. I asserted null for a 70% holding because it was second in my
  // list; it is the LARGEST that is measured, wherever it sits. Rewritten to test what I meant.
  test('concentration is reported only at 25% or more, and only with 2+ holdings', () => {
    expect(topHoldingConcentration([row('VTI', 70_000, 0.1), row('BND', 30_000, 0.1)])!.pct).toBe(70);
    expect(topHoldingConcentration([row('BND', 30_000, 0.1), row('VTI', 70_000, 0.1)])!.ticker).toBe('VTI');  // order does not matter
    // a genuinely spread portfolio: five holdings at 20% each — the biggest is under the line
    const spread = ['A', 'B', 'C', 'D', 'E'].map((t) => row(t, 20_000, 0.1));
    expect(topHoldingConcentration(spread)).toBeNull();
    expect(topHoldingConcentration([row('VTI', 100_000, 0.1)])).toBeNull();   // one holding is not a concentration
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// LOOK_BACK — hindsight answered with real past prices, never an invented one
// ════════════════════════════════════════════════════════════════════════════════════════════════
const series = (points: [string, number][]) => ({ ticker: 'X', points: points.map(([date, close]) => ({ date, close })) } as any);

describe('LOOK_BACK', () => {
  const now = new Date('2026-08-17T12:00:00Z');
  const from = series([['2025-08-17', 100], ['2026-08-17', 110]]);
  const to   = series([['2025-08-17', 100], ['2026-08-17', 130]]);

  test('it says what the dollars became in each place, and the plain difference', () => {
    const r = lookBack(10_000, from, to, 12, now)!;
    expect(r.stayed.endValue).toBe(11_000);
    expect(r.moved.endValue).toBe(13_000);
    expect(r.difference).toBe(2_000);
  });

  test('a move that would have LOST money reports a negative, never a hidden zero', () => {
    expect(lookBack(10_000, to, from, 12, now)!.difference).toBe(-2_000);
  });

  test('a history that does not reach back far enough returns NOTHING — no price is ever invented', () => {
    const short = series([['2026-06-01', 100], ['2026-08-17', 110]]);
    expect(factorOverMonths(short, 12, now)).toBeNull();
    expect(lookBack(10_000, short, to, 12, now)).toBeNull();
  });
});

// PORTFOLIO_RETURN and PORTFOLIO_TREND (MK-PF-F-019 portfolioPeriodReturn, MK-PF-F-018 portfolioTrend) were probed
// here. Both were removed on 2026-10-12 (his approval, DEC-4642): the return on screen is MK-NW-O-008
// thePerformance's time-weighted return, and the graph is drawn from the saved daily values.
