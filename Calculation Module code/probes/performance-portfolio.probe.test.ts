// PROBES — the portfolio-level performance numbers, and the personal return.
//
// This is the other half of the family behind the founder's Vanguard finding. The holding-level
// maths was probed already; these are the figures built ON TOP of it — the ones that answer "how am
// I doing", which is the question a person actually asks.
//
// The personal return is the most honest engine in the app: it refuses to answer rather than guess,
// in four separate ways. It is worth documenting precisely because its refusals are the feature.
import { moneyWeightedReturn, isMoneyWeighted, historyIsComplete, userFlows } from '../../src/domain/performance/moneyWeighted';
import { attribution, allocation, topHoldingConcentration, benchmarkTicker } from '../../src/domain/performance';
import { factorOverMonths, lookBack } from '../../src/domain/performance/lookBack';

const acct = (id: string) => ({ asset_id: id, label: id, tax_bucket: 'TAXABLE', balance: 0 } as any);
const txn = (o: any) => ({ txn_id: 't', account_id: 'a', date: '2025-01-01', type: 'DEPOSIT', amount: 0, ...o } as any);
const IDS = new Set(['a']);
const NOW = Date.parse('2026-08-17T12:00:00Z');

// ════════════════════════════════════════════════════════════════════════════════════════════════
// PERSONAL_RETURN  ·  and its four refusals
// DERIVATION RULE: only money CROSSING THE BOUNDARY counts as a flow. A buy or a sell moves money
// inside the account and must never be counted — the same rule that broke Vanguard, one layer up.
// ════════════════════════════════════════════════════════════════════════════════════════════════
describe('PERSONAL_RETURN', () => {
  test('a buy or a sell is NOT a flow — only money in and out of the account is', () => {
    const flows = userFlows([
      txn({ type: 'DEPOSIT', amount: 10_000 }),
      txn({ type: 'BUY', amount: 9_000 }), txn({ type: 'SELL', amount: 4_000 }),
      txn({ type: 'DIVIDEND', amount: 120 }), txn({ type: 'INTEREST', amount: 5 }),
      txn({ type: 'WITHDRAWAL', amount: 2_000 }),
    ], IDS);
    expect(flows).toHaveLength(2);                      // the deposit and the withdrawal, nothing else
  });

  test('money IN is negative and money OUT positive — the investor convention, and easy to invert', () => {
    expect(userFlows([txn({ type: 'DEPOSIT', amount: 10_000 })], IDS)[0].amount).toBe(-10_000);
    expect(userFlows([txn({ type: 'WITHDRAWAL', amount: 2_000 })], IDS)[0].amount).toBe(2_000);
  });

  test('a transfer BETWEEN two measured accounts cancels; one crossing the edge is real', () => {
    const both = new Set(['a', 'b']);
    expect(userFlows([txn({ type: 'TRANSFER', amount: 500, counter_account_id: 'b' })], both)).toHaveLength(0);
    expect(userFlows([txn({ type: 'TRANSFER', amount: 500, counter_account_id: 'z' })], IDS)).toHaveLength(1);
  });

  test('REFUSAL 1 — a balance older than its ledger cannot be reconstructed, so it is not', () => {
    // the first row must be an opening or a deposit; a SELL first means the story starts mid-way
    expect(historyIsComplete([txn({ type: 'SELL', amount: 100 })], [acct('a')], IDS)).toBe(false);
    expect(historyIsComplete([], [acct('a')], IDS)).toBe(false);
    expect(historyIsComplete([txn({ type: 'OPENING_CASH', amount: 100 })], [acct('a')], IDS)).toBe(true);
    expect((moneyWeightedReturn([txn({ type: 'SELL' })], [acct('a')], IDS, 1000, NOW) as any).reason).toBe('no_history');
  });

  test('REFUSAL 2 — under 30 days is noise once annualised, so it declines to annualise it', () => {
    const r = moneyWeightedReturn([txn({ type: 'DEPOSIT', amount: 1000, date: '2026-08-01' })], [acct('a')], IDS, 1100, NOW);
    expect((r as any).reason).toBe('too_short');
  });

  test('it answers when the history genuinely supports it, and the answer is a yearly rate', () => {
    const r = moneyWeightedReturn(
      [txn({ type: 'OPENING_CASH', amount: 100_000, date: '2025-08-17' })], [acct('a')], IDS, 110_000, NOW);
    expect(isMoneyWeighted(r)).toBe(true);
    if (isMoneyWeighted(r)) {
      expect(r.ratePerYear).toBeCloseTo(0.10, 2);       // 100k → 110k over a year
      expect(r.flows).toBe(1);
      expect(r.sinceDays).toBe(365);
    }
  });

  test('TIMING SHOWS UP, which is the whole point of this measure', () => {
    // Same money, same ending value — but added later, so it worked for less time and earns MORE
    // per year. A price-based return cannot see this; a personal return must.
    const early = moneyWeightedReturn([txn({ type: 'OPENING_CASH', amount: 50_000, date: '2024-08-17' })], [acct('a')], IDS, 60_000, NOW);
    const late  = moneyWeightedReturn([txn({ type: 'OPENING_CASH', amount: 50_000, date: '2025-08-17' })], [acct('a')], IDS, 60_000, NOW);
    expect((late as any).ratePerYear).toBeGreaterThan((early as any).ratePerYear);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ATTRIBUTION · ALLOCATION · CONCENTRATION
// ════════════════════════════════════════════════════════════════════════════════════════════════
const row = (ticker: string, marketValue: number, periodReturn: number | null, kind = 'stocks_etf') =>
  ({ position: { position_id: ticker, ticker, kind, lots: [] }, marketValue, periodReturn } as any);

describe('ATTRIBUTION / ALLOCATION / CONCENTRATION', () => {
  test('each holding contributes its WEIGHT times its return, best first', () => {
    const a = attribution([row('VTI', 75_000, 0.10), row('BND', 25_000, 0.02)]);
    expect(a[0].position.ticker).toBe('VTI');
    expect(a[0].weight).toBe(0.75);
    expect(a[0].contribution).toBeCloseTo(0.075, 4);    // 0.75 × 10%
    expect(a[1].contribution).toBeCloseTo(0.005, 4);
  });

  test('a holding with no return is left out rather than counted as zero', () => {
    // counting an unpriced holding as 0% would drag the portfolio figure down for no reason
    expect(attribution([row('VTI', 75_000, 0.10), row('???', 25_000, null)])).toHaveLength(1);
  });

  test('allocation includes cash and the slices are percentages of the whole', () => {
    const s = allocation([row('VTI', 75_000, 0.10)], 25_000);
    expect(s.find((x) => x.key === 'cash')!.pct).toBe(25);
    expect(s.reduce((t, x) => t + x.pct, 0)).toBeCloseTo(100, 1);
  });

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

// ════════════════════════════════════════════════════════════════════════════════════════════════
// PORTFOLIO_RETURN · PORTFOLIO_TREND
// ════════════════════════════════════════════════════════════════════════════════════════════════
import { portfolioPeriodReturn, portfolioBenchReturn, portfolioTrend } from '../../src/domain/performance';

describe('PORTFOLIO_RETURN', () => {
  test('holdings are weighted by how much money is in them, not counted equally', () => {
    // 90k at +10% and 10k at 0% is +9%, not the +5% an equal-weight average would give
    expect(portfolioPeriodReturn([row('VTI', 90_000, 0.10), row('BND', 10_000, 0)])).toBeCloseTo(0.09, 4);
  });

  test('a holding with no return is excluded from BOTH the top and the bottom of the average', () => {
    // if it were counted as 0% in the total but excluded from the weight, the answer would be wrong
    expect(portfolioPeriodReturn([row('VTI', 90_000, 0.10), row('???', 10_000, null)])).toBeCloseTo(0.10, 4);
  });

  test('nothing usable returns NOTHING, never 0%', () => {
    expect(portfolioPeriodReturn([])).toBeNull();
    expect(portfolioPeriodReturn([row('???', 10_000, null)])).toBeNull();
  });
});

describe('PORTFOLIO_TREND', () => {
  const now = new Date('2026-08-17T12:00:00Z');
  const px = (t: string) => ({ ticker: t, points: [
    { date: '2025-08-01', close: 100 }, { date: '2026-02-01', close: 120 }, { date: '2026-08-17', close: 150 },
  ] } as any);
  const pos = (ticker: string, shares: number, purchase_date: string) =>
    ({ position_id: ticker, ticker, lots: [{ lot_id: 'l', shares, cost_per_share: 1, purchase_date }] } as any);

  test('it draws 13 points across the window, with the benchmark rebased to the same start', () => {
    const t = portfolioTrend([pos('VTI', 10, '2020-01-01')], px, '1Y', 'SPY', now);
    expect(t).toHaveLength(13);
    expect(t[0].value).toBe(t[0].bench);       // both lines start together, so the shapes compare
  });

  test('DEFECT: it values every past date using TODAY\'s share count', () => {
    // 100 shares bought LAST WEEK are shown as having been held for the whole year. The line then
    // rises with the price from a year ago on money that was not there — a history you never had.
    const boughtYesterday = portfolioTrend([pos('VTI', 100, '2026-08-16')], px, '1Y', 'SPY', now);
    expect(boughtYesterday[0].value).toBe(100 * 100);          // 100 shares × the price a YEAR ago
    // identical to a holding genuinely held all year — the two are indistinguishable on the chart:
    const heldAllYear = portfolioTrend([pos('VTI', 100, '2020-01-01')], px, '1Y', 'SPY', now);
    expect(boughtYesterday[0].value).toBe(heldAllYear[0].value);
  });

  test('a holding with no price on a date contributes zero rather than breaking the line', () => {
    const noPrices = portfolioTrend([pos('ZZZ', 10, '2020-01-01')], () => null, '1Y', 'SPY', now);
    expect(noPrices.every((p) => p.value === 0)).toBe(true);
  });
});
