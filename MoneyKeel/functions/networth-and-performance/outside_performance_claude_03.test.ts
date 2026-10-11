/* THE OUTSIDE CASES, RUN AGAINST THE APP — batch "performance 03", written by the Claude formula auditor from the
 * cards alone (MK-PF-F-013..021, MK-NW-F-084), brief to-send/moneykeel_brief_performance_03_claude-code_v02.md.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/performance_03.claude.json (50 cases).
 * Every expected answer below is the auditor's, copied as written; only its plain input names are mapped onto the
 * app's fields. A case the app fails is marked, never fixed by changing the answer here. Results, case by case:
 * MoneyKeel/documents/audit/outside-test-cases/returned/results/performance_claude_03_results.json
 *
 * Markers: `// FINDING:` the app fails a correct expectation (test.failing) · `// BRIEF WRONG:` the auditor's own
 * expectation is wrong (test.failing, their number kept) — none in this batch, every working line was re-done by
 * hand · `// UNCLEAR:` no decision settles the auditor's expectation; their answer is kept and marked test.failing,
 * the open question named · `// BLOCKED:` the case cannot be handed to the function (test.skip) — none.
 * Decisions cited: DEC-1669 (every return time-weighted), DEC-3035b (weigh by the value when the window began),
 * DEC-0315 (Q3: both boundary days inside; beginning = close of the day before), DEC-0300 (round once, at display),
 * DEC-3523 tenets (3: unknown is not zero; 5: the person's word outranks the app's guess), DEC-0051 / DEC-0094.
 *
 * INPUT NAMES MAPPED (the app's fields, not the answers):
 *   today → the function's `now`, a LOCAL Date at noon of that day (noon keeps the calendar day in any zone; every
 *   function here that reads a clock takes `now`, so no fake timers are needed). period → Period ('1M' '3M' '6M'
 *   'YTD' '1Y' '2Y'). closes {T: [[date, close]…]} → priceOf(T) = { ticker: T, points: [{date, close}…] }, oldest
 *   first; a ticker with no closes → null.
 *   kind words → ASSET_KINDS ids: "stock fund" / "stocks" / "stocks and funds" 'stocks_etf', "fixed income"
 *   'fixed_income', "annuity" 'annuities', "private equity" 'private_equity', "hedge fund" 'hedge_funds',
 *   "commodity" 'commodities', "crypto" 'crypto', "529" 'college_529'; no kind → undefined. class "bond" →
 *   asset_class 'bond'; "stocks" → 'stock_etf'.
 *   purchases → lots { shares, cost_per_share, purchase_date }. holdings given as value + return → a PerformanceRow
 *   with marketValue = value_now, periodReturn = period_return, benchReturn = yardstick_return.
 *   F-014 expected fields → row fields: price, market_value marketValue, cost costBasis, gain, return_on_cost totalROI,
 *   period_return periodReturn, yardstick benchTicker, yardstick_return benchReturn, beat_by beatBy,
 *   capped_since cappedSince.  F-017 keys: "stocks" 'stocks_etf', "fixed income" 'fixed_income', "other"
 *   'other_asset', "cash" 'cash'.  F-084: dividend/interest → 'DIVIDEND'/'INTEREST'; period_first_day → windowStart;
 *   the record's account → account_id; bond_accounts → bonds [{balance, coupon_rate}]; category names → labels.
 *   "REFUSES" = null (a list-returning function: the empty list). "shown" strings are screen formatting and are
 *   asserted only where the auditor says to compare the shown figure (F-015 pct, a whole percent by the card).
 * TOLERANCES: the auditor wrote rates to 4–6 decimals; each is matched to half a unit in its last written decimal
 * (0.032787 → ±0.0000005; 14127.2371 → ±0.00005); whole-dollar and exact figures to 1e-9.
 */
import {
  buildPerformance, benchmarkTicker, topHoldingConcentration, attribution, allocation, portfolioTrend,
  portfolioPeriodReturn, portfolioBenchReturn, periodDollarDelta, type PriceSeries, type PerformanceRow,
} from '../../../src/domain/performance';
import { categoryEarnings } from './performance';

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────────
const D = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d, 12); };
const TODAY = D('2026-10-10');
const refuses = (v: unknown) => expect(v == null).toBe(true);
/** within half a unit of the last decimal the auditor wrote */
const near = (a: number | null | undefined, e: number, dp = 6) => {
  expect(a).not.toBeNull(); expect(a).not.toBeUndefined();
  expect(Math.abs((a as number) - e)).toBeLessThanOrEqual(0.5 * 10 ** -dp + 1e-9);
};
const KIND: Record<string, string> = {
  'stock fund': 'stocks_etf', stocks: 'stocks_etf', 'stocks and funds': 'stocks_etf', 'fixed income': 'fixed_income',
  annuity: 'annuities', 'private equity': 'private_equity', 'hedge fund': 'hedge_funds', commodity: 'commodities',
  crypto: 'crypto', '529': 'college_529',
};
const series = (closes: Record<string, [string, number][]>) => (t: string): PriceSeries | null =>
  closes[t] ? { ticker: t, points: closes[t].map(([date, close]) => ({ date, close })) } : null;
const holding = (ticker: string, kind: string | null, purchases: { date: string; shares: number; cost_per_share?: number }[]) =>
  ({ position_id: ticker, ticker, kind: kind ? KIND[kind] : undefined,
     lots: purchases.map((p, i) => ({ lot_id: `${ticker}-${i}`, shares: p.shares, cost_per_share: p.cost_per_share ?? 0, purchase_date: p.date })) }) as any;
const row = (ticker: string, value: number, ret: number | null, bench: number | null = null, kind?: string): PerformanceRow =>
  ({ position: { position_id: ticker, ticker, kind: kind ? KIND[kind] : undefined, lots: [] } as any, price: null, marketValue: value,
     costBasis: 0, gain: 0, totalROI: null, periodReturn: ret, benchTicker: 'SPY', benchReturn: bench, beatBy: null, cappedSince: null });
type RowExp = { price: number; market_value: number; cost: number; gain: number; return_on_cost: number; period_return: number;
  yardstick: string; yardstick_return: number; beat_by: number; capped_since: string | null };
const checkRow = (r: PerformanceRow, e: RowExp) => {
  near(r.price, e.price, 9); near(r.marketValue, e.market_value, 9); near(r.costBasis, e.cost, 9); near(r.gain, e.gain, 9);
  near(r.totalROI, e.return_on_cost); near(r.periodReturn, e.period_return); expect(r.benchTicker).toBe(e.yardstick);
  near(r.benchReturn, e.yardstick_return); near(r.beatBy, e.beat_by); expect(r.cappedSince).toBe(e.capped_since);
};

describe('MK-PF-F-014 buildPerformance — five cases', () => {
  test('easy · One holding held all year', () => {
    const rows = buildPerformance([holding('VTI', 'stock fund', [{ date: '2024-01-02', shares: 10, cost_per_share: 200 }])],
      series({ VTI: [['2025-10-09', 250], ['2025-10-10', 250], ['2026-10-09', 275]], SPY: [['2025-10-09', 600], ['2025-10-10', 600], ['2026-10-09', 630]] }), '1Y', TODAY);
    expect(rows).toHaveLength(1);
    checkRow(rows[0], { price: 275, market_value: 2750, cost: 2000, gain: 750, return_on_cost: 0.375, period_return: 0.1, yardstick: 'SPY',
      yardstick_return: 0.05, beat_by: 0.05, capped_since: null });
  });
  test('easy · Bought once, inside the period', () => {
    const rows = buildPerformance([holding('QQQ', 'stock fund', [{ date: '2026-06-01', shares: 10, cost_per_share: 100 }])],
      series({ QQQ: [['2026-06-01', 100], ['2026-10-09', 112]], SPY: [['2026-06-01', 610], ['2026-10-09', 630]] }), '1Y', TODAY);
    checkRow(rows[0], { price: 112, market_value: 1120, cost: 1000, gain: 120, return_on_cost: 0.12, period_return: 0.12, yardstick: 'SPY',
      yardstick_return: 0.032787, beat_by: 0.087213, capped_since: '2026-06-01' });
  });
  // FINDING: app gives period_return 0.155556 and beat_by 0.055556, expected 0.30 and 0.20 — a holding bought inside the
  // window takes its return on cost (index.ts:830, totalROI = 700 ÷ 4,500). DEC-1669 (2026-10-04): every return the app
  // shows is time-weighted — split at each purchase: 250 ÷ 200 × 260 ÷ 250 − 1 = +30%, set beside SPY's +10% since the
  // same day. The (value − cost) ÷ cost rule is the invest-v3 approval of 2026-07-19, which DEC-1669 post-dates.
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-1669): a holding bought inside the window is time-weighted from its purchases (returnSincePurchases).
  test('complex · Bought twice inside the period at different prices', () => {
    const rows = buildPerformance([holding('VTI', 'stock fund', [{ date: '2026-01-15', shares: 10, cost_per_share: 200 }, { date: '2026-06-15', shares: 10, cost_per_share: 250 }])],
      series({ VTI: [['2026-01-15', 200], ['2026-06-15', 250], ['2026-10-09', 260]], SPY: [['2026-01-15', 600], ['2026-10-09', 660]] }), '1Y', TODAY);
    checkRow(rows[0], { price: 260, market_value: 5200, cost: 4500, gain: 700, return_on_cost: 0.155556, period_return: 0.3, yardstick: 'SPY',
      yardstick_return: 0.1, beat_by: 0.2, capped_since: '2026-01-15' });
  });
  test('complex · Two years, a stock fund and a bond fund, both held throughout', () => {
    const rows = buildPerformance([
      holding('VTI', 'stock fund', [{ date: '2023-05-01', shares: 30, cost_per_share: 180 }]),
      holding('BND', 'fixed income', [{ date: '2022-01-03', shares: 50, cost_per_share: 85 }]),
    ], series({
      VTI: [['2024-10-09', 260], ['2024-10-10', 260], ['2026-10-09', 314.6]], BND: [['2024-10-09', 74], ['2024-10-10', 74], ['2026-10-09', 74.74]],
      SPY: [['2024-10-09', 570], ['2024-10-10', 570], ['2026-10-09', 627]], AGG: [['2024-10-09', 100], ['2024-10-10', 100], ['2026-10-09', 102.01]],
    }), '2Y', TODAY);
    checkRow(rows[0], { price: 314.6, market_value: 9438, cost: 5400, gain: 4038, return_on_cost: 0.747778, period_return: 0.1, yardstick: 'SPY',
      yardstick_return: 0.048809, beat_by: 0.051191, capped_since: null });
    checkRow(rows[1], { price: 74.74, market_value: 3737, cost: 4250, gain: -513, return_on_cost: -0.120706, period_return: 0.004988, yardstick: 'AGG',
      yardstick_return: 0.01, beat_by: -0.005012, capped_since: null });
  });
  // FINDING: app gives capped_since null, expected '2025-10-10' — `bought > periodStart` (index.ts:829) leaves a purchase
  // made ON the first day uncapped. DEC-0315 (Q3): both boundary days are inside the window and the beginning is the close
  // of the day BEFORE, when this money was not yet held. Every figure agrees today (+10%, SPY +5%); only the label differs.
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-0315): a purchase on the first day is inside the window (bought >= period start).
  test('edge · Bought on the period\'s first day', () => {
    const rows = buildPerformance([holding('VXUS', 'stock fund', [{ date: '2025-10-10', shares: 40, cost_per_share: 62.5 }])],
      series({ VXUS: [['2025-10-09', 62], ['2025-10-10', 62.5], ['2026-10-09', 68.75]], SPY: [['2025-10-09', 598], ['2025-10-10', 600], ['2026-10-09', 630]] }), '1Y', TODAY);
    checkRow(rows[0], { price: 68.75, market_value: 2750, cost: 2500, gain: 250, return_on_cost: 0.1, period_return: 0.1, yardstick: 'SPY',
      yardstick_return: 0.05, beat_by: 0.05, capped_since: '2025-10-10' });
  });
});

describe('MK-PF-F-013 benchmarkTicker — five cases', () => {
  test('easy · A stock fund', () => { expect(benchmarkTicker(KIND['stocks and funds'])).toBe('SPY'); });
  test('easy · Crypto', () => { expect(benchmarkTicker(KIND.crypto)).toBe('BTC'); });
  test('complex · Every named kind', () => {
    expect(['fixed income', 'annuity', 'private equity', 'hedge fund', 'commodity', '529'].map((k) => benchmarkTicker(KIND[k])))
      .toEqual(['AGG', 'AGG', 'PSP', 'QAI', 'GLD', 'AOR']);
  });
  // FINDING: app gives 'SPY', expected 'AGG' — the yardstick reads `kind` only (index.ts:831 → :761); a holding whose class
  // says bond and whose kind does not is compared with the S&P 500. The sync writes kind in step with class
  // (ingest.ts:203-204), but a class the PERSON sets (useStore.ts:811 updatePosition) leaves kind as it was — tenet 5
  // (DEC-3523: the person's word outranks the app's guess) and DEC-0309 (class_source user wins). Run through
  // buildPerformance, the one caller that picks a holding's yardstick, because benchmarkTicker is handed no class.
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-3523 tenet 5, DEC-0309): the class decides when the person set it or no kind names a yardstick.
  test('complex · A bond fund described by its class, not its kind', () => {
    const p = { position_id: 'BNDX', ticker: 'BNDX', asset_class: 'bond', lots: [] } as any;
    expect(buildPerformance([p], () => null, '1Y', TODAY)[0].benchTicker).toBe('AGG');
  });
  // FINDING: app gives 'SPY', expected REFUSES — "anything else or none → SPY" (index.ts:761) is a default that looks like
  // an answer. Tenet 3 (DEC-3523, "Unknown is not zero … never a default that looks like an answer") and DEC-2160 ("when
  // nothing says what a holding is, the app does not guess").
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-2160, DEC-3523 tenet 3): no yardstick — null, the comparison refuses.
  test('edge · Nothing says what the holding is', () => { refuses(benchmarkTicker(undefined)); });
});

describe('MK-PF-F-015 topHoldingConcentration — five cases', () => {
  const rowsOf = (v: Record<string, number>) => Object.entries(v).map(([t, x]) => row(t, x, null));
  test('easy · Three quarters in one fund', () => {
    expect(topHoldingConcentration(rowsOf({ VTI: 75000, BND: 25000 }))).toEqual({ ticker: 'VTI', pct: 75, value: 75000 });
  });
  test('easy · Only one holding', () => { refuses(topHoldingConcentration(rowsOf({ VTI: 40000 }))); });
  // FINDING: app gives value 41250, expected 41250.17 — the holding's value is rounded to whole dollars inside the function
  // (index.ts:880). DEC-0300: "full precision throughout, round once at display". pct is compared as shown (43), as the
  // auditor's note asks (the card says the share is returned as a whole percent).
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-0300): the value is not rounded inside; pct stays the whole percent the card states.
  test('complex · Five holdings from a broker link', () => {
    const t = topHoldingConcentration(rowsOf({ VTI: 41250.17, SCHD: 22980.4, BND: 18100.0, QQQ: 9875.55, GLD: 3410.88 }))!;
    expect(t.ticker).toBe('VTI'); expect(t.pct).toBe(43); near(t.value, 41250.17, 9);
  });
  test('complex · Spread out: no fact to report', () => {
    refuses(topHoldingConcentration(rowsOf({ VTI: 22000, VXUS: 21500, BND: 20800, SCHD: 19700, VNQ: 16000 })));
  });
  // FINDING: app gives { VTI, pct 25, value 24600 }, expected REFUSES — the 25% line is tested on the share AFTER it is
  // rounded (index.ts:879-880): 24.6% → 25 → reported. DEC-0300: nothing rounds inside a calculation, so 24.6% < 25%.
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-0300): the 25% line is tested on the unrounded share.
  test('edge · 24.6% — just under the line before rounding', () => {
    refuses(topHoldingConcentration(rowsOf({ VTI: 24600, VXUS: 24500, BND: 24400, SCHD: 24300, GLD: 2200 })));
  });
});

describe('MK-PF-F-016 attribution — five cases', () => {
  const view = (a: ReturnType<typeof attribution>) => a.map((x) => ({ ticker: x.position.ticker, weight: x.weight, contribution: x.contribution }));
  const check = (a: ReturnType<typeof attribution>, e: [string, number, number][]) => {
    const v = view(a); expect(v.map((x) => x.ticker)).toEqual(e.map((x) => x[0]));
    e.forEach(([, w, c], i) => { near(v[i].weight, w); near(v[i].contribution, c); });
  };
  // FINDING: app gives VTI weight 0.545455 / contribution 0.109091, expected 0.5 / 0.10 — weights are today's values
  // (index.ts:906). DEC-1669 + DEC-3035b (and MK-NW-F-084's fix of 2026-10-09): weigh by the value when the window began,
  // so the contributions add up to the time-weighted portfolio return, $10,000 → $11,000 = +10%.
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-1669, DEC-3035b): weighed by the value when the window began.
  test('easy · Two holdings, one up twenty percent', () => {
    check(attribution([row('VTI', 6000, 0.2), row('BND', 5000, 0)]), [['VTI', 0.5, 0.1], ['BND', 0.5, 0]]);
  });
  test('easy · One holding: its contribution is its return', () => {
    check(attribution([row('VTI', 10000, 0.05)]), [['VTI', 1, 0.05]]);
  });
  // FINDING: app gives VTI 0.484 / 0.0484 and QQQ 0.336 / −0.05376, expected 0.52381 / 0.052381 and 0.47619 / −0.07619 —
  // today's values, divided by a total that includes the REIT with no return (index.ts:902, :906). DEC-1669 + DEC-3035b.
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-1669, DEC-3035b): start-weighted; a holding with no return is out of the weights.
  test('complex · A holding with no return sits in the total', () => {
    check(attribution([row('VTI', 12100, 0.1), row('QQQ', 8400, -0.16), row('REIT', 4500, null)]),
      [['VTI', 0.52381, 0.052381], ['QQQ', 0.47619, -0.07619]]);
  });
  // FINDING: app gives the today-weighted figures (VTI 0.484277 / 0.054492 …), expected start-weighted (VTI 0.457914 /
  // 0.051526 …) — DEC-1669 + DEC-3035b; the expected contributions sum to Σ now ÷ Σ start − 1 = 0.05196.
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-1669, DEC-3035b): start-weighted.
  test('complex · Four holdings, sorted largest first', () => {
    check(attribution([row('VTI', 31302.0, 0.112523), row('SCHD', 9880.0, 0.0233), row('BND', 14610.0, 0.0126), row('QQQ', 8844.6, -0.0412)]),
      [['VTI', 0.457914, 0.051526], ['SCHD', 0.157136, 0.003661], ['BND', 0.234819, 0.002959], ['QQQ', 0.150131, -0.006185]]);
  });
  test('edge · Nothing held', () => { expect(attribution([])).toEqual([]); });
});

describe('MK-PF-F-017 allocation — five cases', () => {
  const KEY: Record<string, string> = { stocks: 'stocks_etf', 'fixed income': 'fixed_income', other: 'other_asset', cash: 'cash' };
  const check = (a: ReturnType<typeof allocation>, e: [string, number, number][]) => {
    expect(a.map((s) => s.key)).toEqual(e.map((x) => KEY[x[0]]));
    e.forEach(([, v, p], i) => { near(a[i].value, v, 9); near(a[i].pct, p); });
  };
  const rowsOf = (h: { kind: string | null; value: number }[]) => h.map((x, i) => row(`H${i}`, x.value, null, null, x.kind ?? undefined));
  test('easy · Sixty-forty', () => {
    check(allocation(rowsOf([{ kind: 'stocks', value: 60000 }, { kind: 'fixed income', value: 40000 }]), 0), [['stocks', 60000, 60], ['fixed income', 40000, 40]]);
  });
  test('easy · Cash only', () => { check(allocation([], 10000), [['cash', 10000, 100]]); });
  // FINDING: app gives pct 66.8 / 23.7 / 6.0 / 3.5, expected 66.790228 / 23.712384 / 6.003405 / 3.493983 — each share is
  // rounded to one decimal inside the function (index.ts:942). DEC-0300: round once, at display. Values and order agree.
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-0300): shares unrounded.
  test('complex · Linked and hand-entered holdings with cash in the account', () => {
    check(allocation(rowsOf([{ kind: 'stocks', value: 48210.55 }, { kind: 'stocks', value: 12004.18 }, { kind: 'fixed income', value: 21377.9 }, { kind: null, value: 3150.0 }]), 5412.37),
      [['stocks', 60214.73, 66.790228], ['fixed income', 21377.9, 23.712384], ['cash', 5412.37, 6.003405], ['other', 3150.0, 3.493983]]);
  });
  // FINDING: app gives pct 33.3 for each slice, expected 33.333333 — rounded inside (index.ts:942), DEC-0300. The auditor's
  // shown 33.4 / 33.3 / 33.3 (largest remainder, so the shown slices sum to 100.0) is a display rule no decision states yet.
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-0300): shares unrounded.
  test('complex · Three equal slices', () => {
    check(allocation(rowsOf([{ kind: 'stocks', value: 10000 }, { kind: 'fixed income', value: 10000 }]), 10000),
      [['stocks', 10000, 33.333333], ['fixed income', 10000, 33.333333], ['cash', 10000, 33.333333]]);
  });
  test('edge · Nothing held and no cash', () => { expect(allocation([], 0)).toEqual([]); });
});

describe('MK-PF-F-018 portfolioTrend — five cases', () => {
  test('easy · One fund held all year', () => {
    const t = portfolioTrend([holding('VTI', null, [{ date: '2023-01-03', shares: 10 }])],
      series({ VTI: [['2025-10-10', 100], ['2026-10-09', 120]], SPY: [['2025-10-10', 500], ['2026-10-09', 550]] }), '1Y', 'SPY', TODAY);
    expect(t).toHaveLength(13);
    expect(t[0].date).toBe('2025-10-10'); near(t[0].value, 1000, 9); near(t[0].bench, 1000, 9);
    expect(t[12].date).toBe('2026-10-10'); near(t[12].value, 1200, 9); near(t[12].bench, 1100, 9);
  });
  test('easy · No holdings', () => { expect(portfolioTrend([], series({}), '6M', 'SPY', TODAY)).toEqual([]); });
  // UNCLEAR: app gives first value 8,000 (today's 20 QQQ shares priced at the start, index.ts:996), expected 1,000 (only VTI
  // was held then). The function's own header calls it a "growth-of-holdings view; ignores past buys/sells" and no screen
  // calls it today. Open question: should the trend show what the portfolio WAS (shares held on each date) or what today's
  // holdings would have done? No decision settles it (DEC-2158 is the Net worth trend, read from the daily record).
  test.failing('complex · A second fund bought in June', () => {
    const t = portfolioTrend([holding('VTI', null, [{ date: '2023-01-03', shares: 10 }]), holding('QQQ', null, [{ date: '2026-06-01', shares: 20, cost_per_share: 400 }])],
      series({ VTI: [['2025-10-10', 100], ['2026-10-09', 120]], QQQ: [['2025-10-10', 350], ['2026-06-01', 400], ['2026-10-09', 440]], SPY: [['2025-10-10', 500], ['2026-10-09', 550]] }),
      '1Y', 'SPY', TODAY);
    near(t[0].value, 1000, 9); near(t[12].value, 10000, 9);
  });
  test('complex · Two funds with broker-style fractional shares', () => {
    const t = portfolioTrend([holding('VTI', null, [{ date: '2020-01-02', shares: 23.417 }]), holding('BND', null, [{ date: '2020-01-02', shares: 104.5 }])],
      series({ VTI: [['2025-10-10', 281.36], ['2026-10-09', 313.02]], BND: [['2025-10-10', 72.14], ['2026-10-09', 73.05]], SPY: [['2025-10-10', 571.2], ['2026-10-09', 627.33]] }),
      '1Y', 'SPY', TODAY);
    expect(t).toHaveLength(13);
    near(t[0].value, 14127.2371, 4); near(t[0].bench, 14127.2371, 4); near(t[12].value, 14963.7143, 4); near(t[12].bench, 15515.4756, 4);
  });
  // FINDING: app gives 13 points, every value $0 and the yardstick equal to it, expected REFUSES — a holding with no price
  // counts as zero (index.ts:996) and the yardstick falls back to the value line (:1002). Tenet 3 (DEC-3523): unknown is not
  // zero; a flat $0 line says the holdings are worth nothing.
  test.failing('edge · Holdings but no prices at all', () => {
    expect(portfolioTrend([holding('VTI', null, [{ date: '2020-01-02', shares: 10 }]), holding('BND', null, [{ date: '2020-01-02', shares: 20 }])],
      series({}), '3M', 'SPY', TODAY)).toEqual([]);
  });
});

describe('MK-PF-F-019 portfolioPeriodReturn — five cases', () => {
  // FINDING: app gives 0.666667, expected 0.50 — returns averaged by TODAY's values (index.ts:1033). DEC-1669 (every return
  // time-weighted) + DEC-3035b (weigh by the value when the window began; the same fix as MK-NW-F-084, 2026-10-09):
  // $1,000 + $1,000 became $2,000 + $1,000 = +50%. DEC-0248 ("value-weighted", 2026-09-08) predates both and still holds —
  // a start-value weighting is value-weighted.
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-1669, DEC-3035b): Σ now ÷ Σ start − 1.
  test('easy · One fund doubled, one flat', () => { near(portfolioPeriodReturn([row('A', 2000, 1.0), row('B', 1000, 0)]), 0.5); });
  test('easy · One holding', () => { near(portfolioPeriodReturn([row('VTI', 10000, 0.05)]), 0.05); });
  // FINDING: app gives −0.006537, expected −0.02381 — today-weighted (index.ts:1033); DEC-1669 + DEC-3035b: 21,000 → 20,500.
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-1669, DEC-3035b): Σ now ÷ Σ start − 1.
  test('complex · A holding with no return is left out', () => {
    near(portfolioPeriodReturn([row('VTI', 12100, 0.1), row('QQQ', 8400, -0.16), row('REIT', 4500, null)]), -0.02381);
  });
  // FINDING: app gives 0.055264, expected 0.05196 — today-weighted (index.ts:1033); DEC-1669 + DEC-3035b. MK-NW-F-084 gives
  // the start-weighted figure for the same holdings, so the two disagree today.
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-1669, DEC-3035b): Σ now ÷ Σ start − 1, the same as MK-NW-F-084.
  test('complex · Four holdings, three months', () => {
    near(portfolioPeriodReturn([row('VTI', 31302.0, 0.112523), row('SCHD', 9880.0, 0.0233), row('BND', 14610.0, 0.0126), row('QQQ', 8844.6, -0.0412)]), 0.05196, 5);
  });
  test('edge · No holding has a return', () => { refuses(portfolioPeriodReturn([row('REIT', 4500, null), row('PRIV', 9000, null)])); });
});

describe('MK-PF-F-020 portfolioBenchReturn — five cases', () => {
  // FINDING: app gives 0.073333, expected 0.06 — yardstick returns averaged by TODAY's values (index.ts:1064), so the
  // person's own +100% doubles its yardstick's weight. DEC-1669 + DEC-3035b: the market matched to the mix held when the
  // window began. Shown on /home as "market +X%" (HomeScreen.tsx:208).
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-1669, DEC-3035b): yardsticks weighed by the start value.
  test('easy · A holding that doubled does not double its yardstick', () => {
    near(portfolioBenchReturn([row('A', 2000, 1.0, 0.1), row('B', 1000, 0, 0.02)]), 0.06);
  });
  test('easy · One holding', () => { near(portfolioBenchReturn([row('VTI', 10000, 0.05, 0.03)]), 0.03); });
  // FINDING: app gives 0.064971, expected 0.06434 — today-weighted (index.ts:1064); DEC-1669 + DEC-3035b.
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-1669, DEC-3035b): start-weighted.
  test('complex · Four holdings, two yardsticks', () => {
    near(portfolioBenchReturn([row('VTI', 31302.0, 0.112523, 0.0812), row('SCHD', 9880.0, 0.0233, 0.0812), row('BND', 14610.0, 0.0126, 0.0094),
      row('QQQ', 8844.6, -0.0412, 0.0812)]), 0.06434, 5);
  });
  // FINDING: app gives 0.041867, expected 0.05 — FNEW (no return of its own) is in the market average but not in the
  // person's (index.ts:1061 filters on benchReturn only). Under DEC-3035b's start weighting a holding with no return has no
  // start value, so it falls out of both — the comparison is then about the same money (tenet 4, DEC-3523).
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-3523 tenet 4): out of both averages.
  test('complex · A holding with a yardstick but no return of its own', () => {
    near(portfolioBenchReturn([row('VTI', 12100, 0.1, 0.05), row('FNEW', 4500, null, 0.02)]), 0.05);
  });
  test('edge · No holding has a yardstick return', () => { refuses(portfolioBenchReturn([row('VTI', 10000, 0.01, null)])); });
});

describe('MK-PF-F-021 periodDollarDelta — five cases', () => {
  test('easy · Up five percent, nothing moved', () => { near(periodDollarDelta(105000, 0.05), 5000, 9); });
  test('easy · Down ten percent', () => { near(periodDollarDelta(90000, -0.1), -10000, 9); });
  // NOT BUILT 2026-10-11 (outside review Claude Performance) — stopped, reported: the function is handed only today's total
  // and a return, and those two cannot tell money added from money earned; the dollars earned need the beginning and
  // the money moved (the walk, MK-NW-O-008). No screen calls this function.
  // FINDING: app gives 4,000, expected 3,010 — handed today's $203,010 and the time-weighted +2.01%, the function charges the
  // return to the $100,000 deposited on 1 Oct as if it had been there all month (index.ts:1092). DEC-1669: "money added is
  // never counted as earned"; the dollars earned are 203,010 − 100,000 − 100,000 = 3,010 (the walk, MK-NW-O-008).
  test.failing('complex · A large deposit nine days before the end', () => {
    const twr = (101000 / 100000) * (203010 / 201000) - 1;   // the auditor's 0.0201, from the dated values given
    near(periodDollarDelta(203010, twr), 3010, 9);
  });
  // FINDING: app gives 6,840, expected 6,840.4824 — rounded to whole dollars inside the function (index.ts:1092). DEC-0300:
  // round once, at display (the screen shows $6,840 either way).
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-0300): not rounded inside.
  test('complex · A large account, small return, nothing moved', () => { near(periodDollarDelta(487312.66, 0.014237), 6840.4824, 4); });
  // FINDING: app gives 0, expected REFUSES — "0 when either input is not a number" (index.ts:1091). Tenet 3 (DEC-3523):
  // unknown is not zero; $0 reads as "flat".
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-3523 tenet 3): null, never $0.
  test('edge · The return is not a number', () => { refuses(periodDollarDelta(50000, null as any)); });
});

describe('MK-NW-F-084 categoryEarnings — five cases', () => {
  const T = (type: string, ticker: string | null, date: string, amount: number, account_id?: string) =>
    ({ type: type === 'dividend' ? 'DIVIDEND' : 'INTEREST', ticker: ticker ?? undefined, date, amount, account_id });
  const H = (ticker: string, cls: string, value: number, ret: number | null) =>
    ({ position: { ticker, asset_class: cls === 'bond' ? 'bond' : 'stock_etf' }, marketValue: value, periodReturn: ret });
  const view = (c: ReturnType<typeof categoryEarnings>) => c.map((b) => ({ category: b.label, earned: b.earned, return: b.ret, yearly: b.yearly }));
  const check = (c: ReturnType<typeof categoryEarnings>, e: [string, number, number | null, boolean][]) => {
    const v = view(c); expect(v.map((x) => x.category)).toEqual(e.map((x) => x[0]));
    e.forEach(([, earned, ret, yearly], i) => {
      near(v[i].earned, earned, 9); expect(v[i].yearly).toBe(yearly);
      if (ret == null) refuses(v[i].return); else near(v[i].return, ret);
    });
  };
  test('easy · One dividend from a stock fund', () => {
    check(categoryEarnings({ transactions: [T('dividend', 'VTI', '2026-09-25', 120)], windowStart: '2026-07-10', rows: [H('VTI', 'stocks', 10500, 0.05)] }),
      [['Stocks / Funds', 120, 0.05, false]]);
  });
  test('easy · Sweep interest with no ticker', () => {
    check(categoryEarnings({ transactions: [T('interest', null, '2026-09-30', 35, 'brokerage')], windowStart: '2026-07-10', rows: [] }),
      [['Cash in this account', 35, null, false]]);
  });
  test('complex · A quarter of dividends and interest, as a broker sends them', () => {
    check(categoryEarnings({
      transactions: [T('dividend', 'SCHD', '2026-07-10', 41.0), T('dividend', 'VTI', '2026-07-09', 80.0), T('dividend', 'VTI', '2026-09-25', 212.4),
        T('dividend', 'SCHD', '2026-09-28', 96.15), T('dividend', 'BND', '2026-10-01', -58.2), T('interest', '912828ZT6', '2026-08-15', 125.0),
        T('interest', null, '2026-09-30', 14.73, 'brokerage')],
      windowStart: '2026-07-10',
      rows: [H('VTI', 'stocks', 31302.0, 0.112523), H('SCHD', 'stocks', 9880.0, 0.0233), H('QQQ', 'stocks', 8844.6, -0.0412), H('BND', 'bond', 14610.0, 0.0126)],
    }), [['Stocks / Funds', 349.55, 0.064039, false], ['Bonds & CDs', 183.2, 0.0126, false], ['Cash in this account', 14.73, null, false]]);
  });
  // FINDING: app gives [Cash in this account $412, no return], expected [Bonds & CDs $412, 4.00625%/year] — interest naming
  // no ticker is filed under Cash (performance.ts:891) though it came from a CD held as its own account; Bonds & CDs then
  // "earned nothing" and is left out, its stated rate with it. DEC-0051 (a CD is Bonds & CDs, it pays interest) and DEC-0094
  // (untickered income is counted at the ACCOUNT level, where it belongs). The Performance tab hands this function every
  // record in the store (PerformanceScreen.tsx:432), CD accounts' included.
  // FIXED 2026-10-11 (outside review Claude Performance, DEC-0051, DEC-0094): untickered interest on a bond or CD account is Bonds & CDs.
  test('complex · Interest from two CDs held as accounts', () => {
    check(categoryEarnings({
      transactions: [T('interest', null, '2026-09-30', 256.25, 'ally-cd'), T('interest', null, '2026-09-30', 155.75, 'marcus-cd')],
      // the judge's bond_accounts are NAMED ("Ally CD", "Marcus CD") — the same accounts the records name — so each
      // carries its account here, as PerformanceScreen hands the bond accounts themselves (mapping completed
      // 2026-10-11; no expected answer changed)
      windowStart: '2026-07-10', rows: [], bonds: [{ asset_id: 'ally-cd', balance: 25000, coupon_rate: 0.041 }, { asset_id: 'marcus-cd', balance: 15000, coupon_rate: 0.0385 }],
    }), [['Bonds & CDs', 412.0, 0.040062, true]]);
  });
  test('edge · Day one: nothing yet', () => {
    check(categoryEarnings({ transactions: [], windowStart: null, rows: [], dayOne: true }),
      [['Stocks / Funds', 0, null, false], ['Bonds & CDs', 0, null, false], ['Cash in this account', 0, null, false]]);
  });
});
