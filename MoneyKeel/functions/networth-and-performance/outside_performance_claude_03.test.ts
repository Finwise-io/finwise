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
  buildPerformance, benchmarkTicker, topHoldingConcentration,
  portfolioBenchReturn, type PriceSeries, type PerformanceRow,
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
  // BRIEF WRONG since 2026-10-21 (DEC-4439, his "approved." of 2026-10-11: money that arrives on a day counts for that whole
  // day; outside re-run OpenAI MK-PF-F-040). The auditor's +30% ends the first piece at the SECOND purchase day's close
  // ($250 on 15 Jun) — the end-of-day rule DEC-4439 retired. The piece now ends at the previous evening's close; these
  // closes hold none between 15 Jan and 15 Jun, so the last value on record stands (the piece began at $2,000 and ends
  // there): 5,200 ÷ (2,000 + 2,500) − 1 = +15.56%. With a 14 Jun close of $250 — as a daily price list has — it is +30.00%,
  // the auditor's figure (the second test). The auditor's case is kept, failing.
  test.failing('complex · Bought twice inside the period at different prices', () => {
    const rows = buildPerformance([holding('VTI', 'stock fund', [{ date: '2026-01-15', shares: 10, cost_per_share: 200 }, { date: '2026-06-15', shares: 10, cost_per_share: 250 }])],
      series({ VTI: [['2026-01-15', 200], ['2026-06-15', 250], ['2026-10-09', 260]], SPY: [['2026-01-15', 600], ['2026-10-09', 660]] }), '1Y', TODAY);
    checkRow(rows[0], { price: 260, market_value: 5200, cost: 4500, gain: 700, return_on_cost: 0.155556, period_return: 0.3, yardstick: 'SPY',
      yardstick_return: 0.1, beat_by: 0.2, capped_since: '2026-01-15' });
  });
  test('complex · Bought twice inside the period at different prices — DEC-4439 (2026-10-21): +30.00% with the evening-before close; +15.56% where the record holds no close between the purchases', () => {
    const lots = [{ date: '2026-01-15', shares: 10, cost_per_share: 200 }, { date: '2026-06-15', shares: 10, cost_per_share: 250 }];
    const [daily] = buildPerformance([holding('VTI', 'stock fund', lots)],
      series({ VTI: [['2026-01-15', 200], ['2026-06-14', 250], ['2026-06-15', 250], ['2026-10-09', 260]], SPY: [['2026-01-15', 600], ['2026-10-09', 660]] }), '1Y', TODAY);
    near(daily.periodReturn, (10 * 250) / 2000 * 5200 / (10 * 250 + 2500) - 1);    // 1.25 × 1.04 − 1 = +30.00%
    const [sparse] = buildPerformance([holding('VTI', 'stock fund', lots)],
      series({ VTI: [['2026-01-15', 200], ['2026-06-15', 250], ['2026-10-09', 260]], SPY: [['2026-01-15', 600], ['2026-10-09', 660]] }), '1Y', TODAY);
    near(sparse.periodReturn, 5200 / (2000 + 2500) - 1);                           // +15.56%
    near(sparse.benchReturn, 0.1); expect(sparse.cappedSince).toBe('2026-01-15');
  });
  // BRIEF WRONG since 2026-10-21 (one rule for a yearly rate on every screen, the precision standard's "(1 + the return)^(365 ÷
  // days) − 1"; outside re-run OpenAI MK-PF-M-016): the auditor made 2Y yearly over exactly 2 years (+10.00% for +21%); the
  // window 9 Oct 2024 → 10 Oct 2026 is 731 days, so +9.99% a year, as the account's own figure reads the same window. Kept, failing.
  test.failing('complex · Two years, a stock fund and a bond fund, both held throughout', () => {
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
  test('complex · Two years, a stock fund and a bond fund — one rule (2026-10-21): each total made yearly over 731 days ÷ 365', () => {
    const rows = buildPerformance([
      holding('VTI', 'stock fund', [{ date: '2023-05-01', shares: 30, cost_per_share: 180 }]),
      holding('BND', 'fixed income', [{ date: '2022-01-03', shares: 50, cost_per_share: 85 }]),
    ], series({
      VTI: [['2024-10-09', 260], ['2024-10-10', 260], ['2026-10-09', 314.6]], BND: [['2024-10-09', 74], ['2024-10-10', 74], ['2026-10-09', 74.74]],
      SPY: [['2024-10-09', 570], ['2024-10-10', 570], ['2026-10-09', 627]], AGG: [['2024-10-09', 100], ['2024-10-10', 100], ['2026-10-09', 102.01]],
    }), '2Y', TODAY);
    const yr = (t: number) => Math.pow(1 + t, 365 / 731) - 1;
    near(rows[0].periodReturn, yr(0.21), 12); near(rows[0].benchReturn, yr(0.1), 12); near(rows[0].periodTotal, 0.21, 12);
    near(rows[1].periodReturn, yr(0.01), 12); near(rows[1].benchReturn, yr(0.0201), 12); near(rows[1].periodTotal, 0.01, 12);
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

// REMOVED 2026-10-12 by DEC-4642 (his approval: "3,4, 8-approved"): MK-PF-F-016 attribution, MK-PF-F-017 allocation,
// MK-PF-F-018 portfolioTrend and MK-PF-F-019 portfolioPeriodReturn left the code — no screen called them. Their twenty
// cases are no longer run; each is marked REMOVED, with this decision, in
// MoneyKeel/documents/audit/outside-test-cases/returned/results/performance_claude_03_results.json. What took their
// place: the return is MK-NW-O-008 thePerformance (MK-ST-F-081 timeWeightedReturn); the graph is drawn from the saved
// daily values. Two of the twenty were open (portfolioTrend: "A second fund bought in June" UNCLEAR, "Holdings but no
// prices at all" FINDING) and close with the function.

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

// REMOVED 2026-10-12 by DEC-4642: MK-PF-F-021 periodDollarDelta left the code — no screen called it. The dollars a
// window earned are the wealth generated of MK-NW-O-008 thePerformance, which needs the beginning and the money moved.
// Its five cases are no longer run (results file: REMOVED); the open one ("A large deposit nine days before the end",
// FINDING, NOT BUILT) closes with the function — the walk already gives the auditor's $3,010.

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
  // BRIEF WRONG: Bonds & CDs $183.20 reads the BND dividend of −$58.20 as $58.20 earned. A negative dividend is a reversal —
  // $58.20 that left (audit item 36, money.ts: a negative row whose event says money came in is a reversal of it) — and every
  // reader of a stored amount now reads it one way (moneyIntoAccount, ledger.ts, 2026-10-21): Bonds & CDs earned $125.00 −
  // $58.20 = $66.80, the same signed total the walk's Dividends and Interest lines give (personalFlowTotals). Their number is kept.
  test.failing('complex · A quarter of dividends and interest, as a broker sends them', () => {
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
