/** SHARES ADDED INSIDE THE WINDOW — the start a holding is measured from, what it gained, and the return of a category of
 *  holdings (W-START, 2026-10-22; outside re-run OpenAI part 1: MK-NW-F-091, MK-NW-F-127, MK-PF-M-006; MK-PF-F-044).
 *
 *  Every figure below was worked by hand first; the working is beside each check. The rows are the ones the app itself builds
 *  (MK-PF-F-014 buildPerformance) from real purchases and real closes — the rows every screen hands on.
 *
 *  1 · DEC-3656 ("today's value less what each holding gained, less the money moved"): a holding held when the window began
 *      that bought more inside it gained its value today less what it was worth then less what it paid. 10 held at $100, 10
 *      more bought at $110, now 20 at $121: $2,420 − $1,000 − $1,100 = $320. Worked back from today's 20 shares ($2,420 ÷ 1.21
 *      = $2,000) it read $420, and the walk's beginning $900 where $1,000 was there.
 *  2 · DEC-1669 ("All return should be True Weighted Return and not Dietz return."): a category's return is split at every day
 *      money went into it — each piece measured from each holding's own closes, the pieces multiplied. Weighed by value now ÷
 *      (1 + each return), shares bought inside the window weighed as if held all along (−20.00% where −21.60% is right), and a
 *      holding bought last week weighed as if held all month (+5.00% where +10.00% is right).
 *  3 · One rule: the holdings' return where the beginning is worked back (MK-NW-F-138) is the category method (MK-NW-F-142);
 *      a category of one holding reads that holding's own figure; with no money moving inside the window the split return is
 *      the old weighing to the last decimal — no figure moves where nothing was bought.
 */
import {
  buildPerformance, portfolioBenchReturn, returnSplitAtPurchases, marketSplitAtPurchases, marketGap, type PriceSeries, type Position,
} from '../../../src/domain/performance';
import { thePerformance, pricedGainOf, categoryEarnings, classReturnOf, knownHoldingsReturn, windowStartKey } from './performance';

const S = (pts: [string, number][]): PriceSeries => ({ points: pts.map(([date, close]) => ({ date, close })) } as any);
const lot = (shares: number, cost: number | null, date: string | null) => ({ lot_id: `${date}-${shares}`, shares, cost_per_share: cost, purchase_date: date });
const pos = (id: string, ticker: string, lots: any[], extra: any = {}): Position => ({ position_id: id, ticker, kind: 'stock', asset_class: 'stock_etf', lots, ...extra } as any);
const near = (a: number | null | undefined, b: number, digits = 10) => { expect(a).not.toBeNull(); expect(a as number).toBeCloseTo(b, digits); };

// ── 1 · THE TOPPED-UP HOLDING (part 1's household): 10 held before the 1Y window (close $100 the evening before it opens),
// 10 more bought at $110 on Apr 1, close $121 today (Oct 13, 2026) ──────────────────────────────────────────────────────
const TODAY = '2026-10-13';
const X = pos('p1', 'X', [lot(10, 90, '2025-01-02'), lot(10, 110, '2026-04-01')]);
const X_PRICES = S([['2025-01-02', 90], ['2025-10-12', 100], ['2026-04-01', 110], ['2026-10-13', 121]]);
const toppedUp = () => buildPerformance([X], () => X_PRICES, '1Y', new Date(`${TODAY}T12:00:00`))[0];

describe('1 · DEC-3656 — a holding that bought more inside the window: its start, what it paid, what it gained', () => {
  test('the row: start $1,000 (10 shares × $100), paid inside $1,100 (10 × $110), value $2,420, its own figure +21.00% (121 ÷ 100 − 1)', () => {
    const r = toppedUp();
    near(r.startValue, 10 * 100); near(r.paidInside, 10 * 110); near(r.marketValue, 20 * 121); near(r.periodTotal, 121 / 100 - 1, 12);
  });
  test('MK-NW-F-091 pricedGainOf: $2,420 − $1,000 − $1,100 = $320 (it read $420: 2,420 × (1 − 1 ÷ 1.21))', () => {
    near(pricedGainOf([toppedUp()] as any, 1), 2420 - 1000 - 1100, 6);
    expect(Math.abs((pricedGainOf([toppedUp()] as any, 1) as number) - 2420 * (1 - 1 / 1.21))).toBeGreaterThan(99);
  });
  test('MK-NW-O-008 thePerformance, no daily record, $1,100 paid in on Apr 1: Beginning $1,000, Wealth generated $320, Return +21.00% (it read $900 and $420)', () => {
    const p = thePerformance({ windowStart: windowStartKey('1Y', [], TODAY), windowLabel: 'the past year', today: TODAY, snapshotDays: [],
      investmentAccountIds: new Set(['s']), transactions: [{ txn_id: 'd', account_id: 's', type: 'DEPOSIT', amount: 1100, date: '2026-04-01' }],
      accounts: [{ asset_id: 's', label: 'Brokerage', kind: 'brokerage', asset_class: 'stocks_etf', balance: 2420, positions: [X] }] as any,
      holdings: [toppedUp()] as any });
    expect(p.workedBack).toBe(true);
    near(p.walk!.beginning, 2420 - 320 - 1100, 6);          // $1,000 — what the 10 shares were worth when the window began
    near(p.walk!.wealthGenerated, 320, 6);
    near(p.cumulative, 0.21, 12);                            // the holding's own return: money paid in is never a gain
  });
  test('a purchase inside the window with no price paid on record: what the holding gained is unknown, and it is named — never a guess (tenet 3)', () => {
    const Y = pos('p2', 'Y', [lot(10, 90, '2025-01-02'), lot(10, null, '2026-04-01')]);
    const [r] = buildPerformance([Y], () => X_PRICES, '1Y', new Date(`${TODAY}T12:00:00`));
    expect(r.paidInside).toBeNull();
    expect(pricedGainOf([r] as any, 1)).toBeNull();
    const p = thePerformance({ windowStart: windowStartKey('1Y', [], TODAY), windowLabel: 'the past year', today: TODAY, snapshotDays: [],
      investmentAccountIds: new Set(['s']), transactions: [], accounts: [{ asset_id: 's', label: 'B', kind: 'brokerage', asset_class: 'stocks_etf', balance: 2420, positions: [Y] }] as any,
      holdings: [r] as any });
    expect(p.notIncluded).toContain('Y');
  });
  test('a holding that bought nothing inside the window carries no money paid inside, and its gain is worked as before', () => {
    const [r] = buildPerformance([pos('p3', 'Z', [lot(10, 90, '2025-01-02')])], () => X_PRICES, '1Y', new Date(`${TODAY}T12:00:00`));
    expect('paidInside' in r).toBe(false);
    near(pricedGainOf([r] as any, 1), 10 * 121 - 10 * 100, 6);   // $1,210 − $1,000 = $210
  });
});

// ── 2 · THE CATEGORY, SPLIT AT EVERY DAY MONEY WENT INTO IT — the reviewer's household (MK-PF-M-006): 1M window to Sep 30, 2026
// (it opens Aug 30; the evening before, Aug 29). A: 10 held at $100, 90 more bought Sep 15 at $105 (Sep 14 close $105), $110
// today. B: 100 held at $100, still $100 on Sep 14, $50 today ──────────────────────────────────────────────────────────────
const T2 = new Date('2026-09-30T12:00:00');
const A = pos('a', 'AAA', [lot(10, 95, '2026-01-02'), lot(90, 105, '2026-09-15')]);
const B = pos('b', 'BBB', [lot(100, 80, '2026-01-02')]);
const PX: Record<string, PriceSeries> = {
  AAA: S([['2026-08-29', 100], ['2026-09-14', 105], ['2026-09-30', 110]]),
  BBB: S([['2026-08-29', 100], ['2026-09-14', 100], ['2026-09-30', 50]]),
  VTI: S([['2026-08-29', 100], ['2026-09-24', 110], ['2026-09-30', 110]]),
  NEW: S([['2026-09-25', 1000], ['2026-09-30', 1000]]),
  BND: S([['2026-08-29', 100], ['2026-09-30', 104]]),
  SPY: S([['2026-08-29', 500], ['2026-09-14', 520], ['2026-09-30', 550]]), AGG: S([['2026-08-29', 100], ['2026-09-14', 102], ['2026-09-30', 104]]),
};
const rowsOf = (ps: Position[]) => buildPerformance(ps, (t) => PX[t] ?? null, '1M', T2);
const stocks = (rows: any[]) => categoryEarnings({ windowStart: '2026-08-30', rows, transactions: [{ txn_id: 'd', type: 'DIVIDEND', ticker: rows[0].position.ticker, amount: 10, date: '2026-09-20' }] })
  .find((c) => c.key === 'stocks_etf')!.ret;

describe('2 · DEC-1669 — WHAT EACH CATEGORY EARNED (MK-PF-M-006) is split at every day money went into the category', () => {
  test('the reviewer\'s case: 11,050 ÷ 11,000 × 16,000 ÷ 20,500 − 1 = −21.60% (it read −20.00%: 16,000 ÷ (11,000 ÷ 1.1 + 5,000 ÷ 0.5) − 1)', () => {
    const rows = rowsOf([A, B]);
    // the pieces, by hand: the window begins at A 10 × $100 + B 100 × $100 = $11,000; the evening before A buys, A 10 × $105 +
    // B 100 × $100 = $11,050; with the 90 bought at $105 (= $9,450) the next piece begins at $20,500; today A 100 × $110 +
    // B 100 × $50 = $16,000
    near(rows[0].startValue, 1000); near(rows[1].startValue, 10000); near(rows[0].paidInside, 90 * 105);
    expect(rows.map((r) => r.path!.marks.map((m) => m.day))).toEqual([['2026-09-15'], ['2026-09-15']]);   // one list of days
    near(stocks(rows), (11050 / 11000) * (16000 / 20500) - 1, 12);
    expect(Math.round(((stocks(rows) as number)) * 10000) / 100).toBe(-21.6);
  });
  test('the same rows weighed as before (no path): −20.00% — the figure the table showed until 2026-10-22', () => {
    const rows = rowsOf([A, B]).map(({ path, paidInside, ...r }) => r);
    near(stocks(rows), 16000 / (11000 / 1.1 + 5000 / 0.5) - 1, 12);
  });
  test('a holding bought inside the window weighs nothing before it was bought: VTI $10,000 → $11,000 by Sep 24, then $10,000 of NEW bought Sep 25, flat → +10.00% (it read +5.00%)', () => {
    const rows = rowsOf([pos('v', 'VTI', [lot(100, 90, '2025-01-02')]), pos('n', 'NEW', [lot(10, 1000, '2026-09-25')])]);
    expect(rows[1].cappedSince).toBe('2026-09-25');
    // 11,000 ÷ 10,000 (VTI to the evening before NEW) × (11,000 + 10,000) ÷ (11,000 + 10,000) − 1
    near(stocks(rows), (11000 / 10000) * (21000 / 21000) - 1, 12);
    // before: NEW weighed from the window's first day at its $10,000 → (11,000 + 10,000) ÷ (10,000 + 10,000) − 1 = +5.00%
    near(stocks(rows.map(({ path, ...r }) => r)), (11000 + 10000) / (10000 + 10000) - 1, 12);
  });
  test('nothing bought inside the window: the split return is the old weighing to the last decimal — VTI +10.00% and BND +4.00% on $10,000 each → +7.00%', () => {
    const rows = rowsOf([pos('v', 'VTI', [lot(100, 90, '2025-01-02')]), pos('d', 'BND', [lot(100, 90, '2025-01-02')], { asset_class: 'stock_etf' })]);
    expect(rows.every((r) => r.path && r.path.marks.length === 0)).toBe(true);
    const split = classReturnOf(rows.map((r) => ({ marketValue: r.marketValue, interest: r.interest, total: r.periodTotal!, startValue: r.startValue, path: r.path })));
    const weighed = classReturnOf(rows.map((r) => ({ marketValue: r.marketValue, interest: r.interest, total: r.periodTotal!, startValue: r.startValue })));
    near(split, (11000 + 10400) / 20000 - 1, 12); near(split, weighed as number, 14);
  });
});

describe('3 · one rule, and each holding\'s path gives back its own figure', () => {
  test('MK-NW-F-138 knownHoldingsReturn IS the category method: the reviewer\'s two holdings read −21.60% both ways', () => {
    const rows = rowsOf([A, B]);
    near(knownHoldingsReturn(rows as any, 30 / 365), (11050 / 11000) * (16000 / 20500) - 1, 12);
  });
  test('a category of one holding reads that holding\'s own figure — every kind of row the app builds (5 of 5 kinds checked)', () => {
    const kinds: { what: string; row: any }[] = [
      { what: 'held, bought more inside', row: toppedUp() },
      { what: 'bought inside on two days ($200, then $250; $260 today → +30.00%)', row: buildPerformance([pos('c', 'C', [lot(10, 200, '2026-09-02'), lot(10, 250, '2026-09-16')])],
        () => S([['2026-09-01', 200], ['2026-09-02', 200], ['2026-09-15', 250], ['2026-09-30', 260]]), '1M', T2)[0] },
      { what: 'prices begin after the window opens', row: buildPerformance([pos('s', 'SH', [lot(10, 50, '2025-01-02'), lot(5, 60, '2026-09-20')])],
        () => S([['2026-09-10', 50], ['2026-09-19', 60], ['2026-09-30', 66]]), '1M', T2)[0] },
      { what: 'worth $0 today', row: buildPerformance([pos('w', 'W', [lot(10, 90, '2025-01-02')])], () => S([['2026-08-29', 100], ['2026-09-30', 0]]), '1M', T2)[0] },
      { what: 'held, nothing bought', row: rowsOf([B])[0] },
    ];
    for (const k of kinds) {
      expect({ what: k.what, path: !!k.row.path }).toEqual({ what: k.what, path: true });
      near(returnSplitAtPurchases([k.row.path]), k.row.periodTotal, 12);
    }
    near(kinds[1].row.periodTotal, 0.30, 12);   // (10 × 250 ÷ 2,000) × (20 × 260 ÷ (2,500 + 2,500)) − 1
    expect(kinds.length).toBe(5);
  });
});

describe('4 · MK-PF-M-008 — the market beside your return is split on the same days, with the same weights (decided 2026-10-22)', () => {
  // the reviewer's household with a bond fund beside it; the market rose before A bought more (SPY $500 → $520 by Sep 14, AGG
  // $100 → $102) and after (SPY → $550, AGG → $104)
  const rows = () => rowsOf([A, B, pos('d', 'BND', [lot(100, 90, '2025-01-02')], { asset_class: 'bond' })]);
  test('by hand: piece 1 weighs A $1,000, B $10,000, BND $10,000; piece 2 weighs A $10,500 (100 × $105), B $10,000, BND $10,000 → +7.71% (weighed by the starts alone, +7.14%)', () => {
    expect(rows().map((r) => r.benchTicker)).toEqual(['SPY', 'SPY', 'AGG']);
    const piece1 = (1000 * 520 / 500 + 10000 * 520 / 500 + 10000 * 102 / 100) / 21000;
    const piece2 = (10500 * 550 / 520 + 10000 * 550 / 520 + 10000 * 104 / 102) / 30500;
    near(portfolioBenchReturn(rows()), piece1 * piece2 - 1, 12);
    expect(Math.round((piece1 * piece2 - 1) * 10000) / 100).toBe(7.71);
    near((1000 * 0.10 + 10000 * 0.10 + 10000 * 0.04) / 21000, 0.0714285714, 9);   // the starts alone
  });
  test('the same days as your return: each holding\'s yardstick path gives back its own market figure, and your return is split at the same day', () => {
    const r = rows();
    for (const x of r) near(marketSplitAtPurchases([x.path!]), x.benchTotal!, 12);
    expect(r.map((x) => x.path!.marks.map((m) => m.day))).toEqual([['2026-09-15'], ['2026-09-15'], ['2026-09-15']]);
  });
  test('nothing bought or sold inside the window: one piece, the market weighed by the starts — the figure it always was (DEC-7221)', () => {
    const held = rowsOf([B, pos('d', 'BND', [lot(100, 90, '2025-01-02')], { asset_class: 'bond' })]);
    near(portfolioBenchReturn(held), (10000 * 0.10 + 10000 * 0.04) / 20000, 12);
  });
  test('Home\'s case: VTI $10,000 up 10% with the market, then $10,000 more bought Sep 25 with the market flat after → your +10.00%, market +10.00%, level (it read market +5.00%, ahead by 5.00%)', () => {
    const px: Record<string, PriceSeries> = {
      VTI: S([['2026-08-29', 100], ['2026-09-24', 110], ['2026-09-30', 110]]), NEW: S([['2026-09-25', 1000], ['2026-09-30', 1000]]),
      SPY: S([['2026-08-29', 500], ['2026-09-24', 550], ['2026-09-25', 550], ['2026-09-30', 550]]),
    };
    const r = buildPerformance([pos('v', 'VTI', [lot(100, 90, '2025-01-02')]), pos('n', 'NEW', [lot(10, 1000, '2026-09-25')])], (t) => px[t] ?? null, '1M', T2);
    const you = knownHoldingsReturn(r as any, 30 / 365);
    near(you, (11000 / 10000) * (21000 / 21000) - 1, 12);                                    // +10.00%
    near(portfolioBenchReturn(r), (10000 * 1.1) / 10000 * ((11000 * 550 / 550 + 10000 * 550 / 550) / 21000) - 1, 12);   // +10.00%
    near(marketGap(you, portfolioBenchReturn(r)), 0, 12);
    // weighed by the starts alone: VTI $10,000 at +10%, NEW at what was paid, $10,000, with its week of the market, 0%
    near((10000 * 0.10 + 10000 * 0) / 20000, 0.05, 12);
  });
});

// ── 5 · SHARES SOLD INSIDE THE WINDOW (2026-10-22; DEC-3656): 20 held before the 1Y window (close $100 the evening before it),
// 10 sold on Apr 1 at $110 — the sale took the oldest purchase first, so today's lot holds 10 — and $121 today ─────────────
const XS = pos('ps', 'X', [lot(10, 90, '2025-01-02')]);
const SALE = { txn_id: 's1', account_id: 'k', type: 'SELL', ticker: 'X', shares: 10, price: 110, amount: 1100, date: '2026-04-01' };
const ACCT = (positions: Position[], balance: number) => [{ asset_id: 'k', label: 'Brokerage', kind: 'brokerage', asset_class: 'stocks_etf', balance, positions }];
const soldRow = (txns: any[] = [SALE]) => buildPerformance([XS], () => X_PRICES, '1Y', new Date(`${TODAY}T12:00:00`), undefined, undefined,
  { transactions: txns, accounts: ACCT([XS], 1210 + 1100) })[0];

describe('5 · DEC-3656 — a holding that sold shares inside the window starts from the shares it held then', () => {
  test('the row: start 20 × $100 = $2,000 (it read 10 × $100 = $1,000), sales brought in 10 × $110 = $1,100, value 10 × $121 = $1,210, its own figure +21.00%', () => {
    const r = soldRow();
    near(r.startValue, 20 * 100); near(r.soldInside, 10 * 110); near(r.marketValue, 10 * 121); near(r.periodTotal, 0.21, 12);
    near(returnSplitAtPurchases([r.path!]), 0.21, 12);   // 2,000 → 2,000 the evening before the sale, then 1,000 → 1,210
  });
  test('what it gained: $1,210 − $2,000 + $1,100 = $310 (from today\'s 10 shares it read $210)', () => {
    near(pricedGainOf([soldRow()] as any, 1), 1210 - 2000 + 1100, 6);
  });
  test('MK-NW-O-008 thePerformance, no daily record, the $1,100 kept as cash: Beginning $2,000 (it read $2,100), Wealth generated $310, Return +21.00%', () => {
    const p = thePerformance({ windowStart: windowStartKey('1Y', [], TODAY), windowLabel: 'the past year', today: TODAY, snapshotDays: [],
      investmentAccountIds: new Set(['k']), transactions: [SALE], accounts: ACCT([XS], 1210 + 1100) as any, holdings: [soldRow()] as any });
    near(p.walk!.beginning, 2310 - 310, 6); near(p.walk!.wealthGenerated, 310, 6); near(p.cumulative, 0.21, 12);
  });
  test('sold out and bought again inside the window: 10 held at $100, sold Mar 1 at $110, 10 bought Apr 1 at $105, $121 now → gained $260 from a beginning of $1,000', () => {
    const XR = pos('pr', 'X', [lot(10, 105, '2026-04-01')]);
    const t = [{ ...SALE, shares: 10, date: '2026-03-01' }, { txn_id: 'b1', account_id: 'k', type: 'BUY', ticker: 'X', shares: 10, price: 105, amount: 1050, date: '2026-04-01' }];
    const [r] = buildPerformance([XR], () => X_PRICES, '1Y', new Date(`${TODAY}T12:00:00`), undefined, undefined, { transactions: t, accounts: ACCT([XR], 1210 + 1100 - 1050) });
    expect(r.cappedSince).toBe('2026-04-01');
    near(r.heldAtStart, 10 * 100); near(r.paidInside, 10 * 105); near(r.soldInside, 10 * 110);
    near(pricedGainOf([r] as any, 1), 1210 + 1100 - 1050 - 1000, 6);
    const p = thePerformance({ windowStart: windowStartKey('1Y', [], TODAY), windowLabel: 'w', today: TODAY, snapshotDays: [],
      investmentAccountIds: new Set(['k']), transactions: t, accounts: ACCT([XR], 1260) as any, holdings: [r] as any });
    near(p.walk!.beginning, 1260 - 260, 6);
  });
  test('a sale that may have taken a purchase made inside the window, with no record of how large it was: the start is not known, never guessed (tenet 3)', () => {
    // 10 bought Jan 2025 and sold out; 10 bought May 1 by hand (no record), 5 of the holding sold Jun 1 → which purchase the sale
    // took cannot be told, so what was held when the window began is not known
    const XQ = pos('pq', 'X', [lot(5, 112, '2026-05-01')]);
    const t = [{ ...SALE, shares: 5, date: '2026-06-01' }];
    const [r] = buildPerformance([XQ], () => X_PRICES, '1Y', new Date(`${TODAY}T12:00:00`), undefined, undefined, { transactions: t, accounts: ACCT([XQ], 605) });
    expect(r.paidInside).toBeNull();
    expect(pricedGainOf([r] as any, 1)).toBeNull();
  });
});

describe('6 · the left-out line names the true reason (2026-10-22; canon row 24, tenets 1 and 3)', () => {
  test('a holding with a price history whose purchase in the window has no price paid on record is named for that, not for a price history it has', () => {
    const Y = pos('p2', 'Y', [lot(10, 90, '2025-01-02'), lot(10, null, '2026-04-01')]);
    const [r] = buildPerformance([Y], () => X_PRICES, '1Y', new Date(`${TODAY}T12:00:00`));
    const p = thePerformance({ windowStart: windowStartKey('1Y', [], TODAY), windowLabel: 'the past year', today: TODAY, snapshotDays: [],
      investmentAccountIds: new Set(['s']), transactions: [], accounts: [{ asset_id: 's', label: 'B', kind: 'brokerage', asset_class: 'stocks_etf', balance: 2420, positions: [Y] }] as any,
      holdings: [r] as any });
    expect(p.notIncluded).toBe('Return is on the $2,420 with a price history. Y ($2,420) has a purchase with no price paid on record, so its gains are not included.');
    expect(p.notIncluded).not.toContain('no price history, so');
  });
  test('two reasons, two sentences: no price history first, then no price paid on record', () => {
    const Y = pos('p2', 'Y', [lot(10, 90, '2025-01-02'), lot(10, null, '2026-04-01')]);
    const T = { position: { ticker: '912810TM0', label: 'Treasury 2031', lots: [{ shares: 10000 }], value_now: 10000 }, periodReturn: null };
    const [r] = buildPerformance([Y], () => X_PRICES, '1Y', new Date(`${TODAY}T12:00:00`));
    const p = thePerformance({ windowStart: windowStartKey('1Y', [], TODAY), windowLabel: 'w', today: TODAY, snapshotDays: [], investmentAccountIds: new Set(['s']),
      transactions: [], accounts: [{ asset_id: 's', label: 'B', kind: 'brokerage', asset_class: 'stocks_etf', balance: 12420, positions: [Y, {}] }] as any,
      holdings: [r, T] as any });
    expect(p.notIncluded).toBe('Return is on the $2,420 with a price history. Treasury 2031 ($10,000) has no price history, so its gains are not included. '
      + 'Y ($2,420) has a purchase with no price paid on record, so its gains are not included.');
  });
});

// ── 7 · SOLD IN FULL INSIDE THE WINDOW (2026-10-22; DEC-3656): 10 X held when the 1Y window began (close $100 the evening before),
// all 10 sold Apr 1 at $110 for $1,100 (the close of Mar 31 was $108); the account now holds only that cash ─────────────────
const GONE_PRICES = S([['2025-01-02', 90], ['2025-10-12', 100], ['2026-03-31', 108], ['2026-04-01', 110], ['2026-10-13', 121]]);
const GONE_SALE = { txn_id: 'g1', account_id: 'k', type: 'SELL', ticker: 'X', shares: 10, price: 110, amount: 1100, date: '2026-04-01' };
const goneRows = () => buildPerformance([], () => GONE_PRICES, '1Y', new Date(`${TODAY}T12:00:00`), undefined, undefined,
  { transactions: [GONE_SALE], accounts: ACCT([], 1100) });

describe('7 · DEC-3656 — a holding sold in full inside the window has a row from its sale records', () => {
  // DECIDED 2026-10-22 (the lead's ruling, tenet 2 — a person can see how the figure was made): a sale counts out at what it
  // brought in, the mirror of a purchase counting in at what was paid. $1,100 from $1,000: +10.00% beside a gain of $100.
  test('the row: no shares today, 10 held when the window began worth 10 × $100 = $1,000, the sale brought in $1,100; its own figure 1,100 ÷ 1,000 − 1 = +10.00%', () => {
    const r = goneRows();
    expect(r).toHaveLength(1);
    expect((r[0].position as any).sold_out).toBe(true);
    near(r[0].marketValue, 0); near(r[0].startValue, 1000); near(r[0].soldInside, 1100);
    near(r[0].periodTotal, 1100 / 1000 - 1, 12);
  });
  test.failing('the row on 2026-10-22 before the ruling, pinned: the sale valued at the evening before, 1,080 ÷ 1,000 − 1 = +8.00% — no longer its answer', () => {
    near(goneRows()[0].periodTotal, 1080 / 1000 - 1, 12);
  });
  test('with the broker\'s $5 fee the cash figure leaves out: brought in $1,095 → +9.50%, gained $95', () => {
    const sale = { ...GONE_SALE, fee: 5, fee_in_price: false };
    const [r] = buildPerformance([], () => GONE_PRICES, '1Y', new Date(`${TODAY}T12:00:00`), undefined, undefined, { transactions: [sale], accounts: ACCT([], 1095) });
    near(r.soldInside, 1095, 6); near(r.periodTotal, 1095 / 1000 - 1, 12); near(pricedGainOf([r] as any, 1), 95, 6);
  });
  test('its market ends where it did, at the sale day\'s close: from the $100 close to Apr 1\'s $110, +10.00%', () => {
    near(goneRows()[0].benchReturn, 110 / 100 - 1, 12);
  });
  test('what it gained: $0 − $1,000 + $1,100 = $100; the walk begins at $1,000 (it read $1,100 — the sale\'s cash as if held from the start — and $0 gained)', () => {
    near(pricedGainOf(goneRows() as any, 1), 0 - 1000 + 1100, 6);
    const p = thePerformance({ windowStart: windowStartKey('1Y', [], TODAY), windowLabel: 'w', today: TODAY, snapshotDays: [], investmentAccountIds: new Set(['k']),
      transactions: [GONE_SALE], accounts: ACCT([], 1100) as any, holdings: goneRows() as any });
    near(p.walk!.beginning, 1000, 6); near(p.walk!.wealthGenerated, 100, 6); near(p.cumulative, 0.10, 12);
    expect(p.notIncluded).toBe('');
  });
  test('beside a holding still held, the sold one weighs until its sale: ZZ $500 flat all year with X → +6.67% ((500 + 1,100) ÷ 1,500, then flat)', () => {
    const ZZ = pos('pz', 'ZZ', [lot(10, 40, '2025-01-02')]);
    const px: Record<string, PriceSeries> = { X: GONE_PRICES, ZZ: S([['2025-10-12', 50], ['2026-10-13', 50]]) };
    const rows = buildPerformance([ZZ], (t) => px[t] ?? null, '1Y', new Date(`${TODAY}T12:00:00`), undefined, undefined, { transactions: [GONE_SALE], accounts: ACCT([ZZ], 1600) });
    expect(rows.map((r) => r.position.ticker)).toEqual(['ZZ', 'X']);
    near(knownHoldingsReturn(rows as any, 1), (500 + 1100) / (500 + 1000) * (500 / 500) - 1, 12);
  });
});

// ── 8 · BOUGHT INSIDE THE WINDOW AND SOLD SOME (2026-10-22; DEC-1669, DEC-4439): this year to Sep 30, 2026 — 10 C bought Aug 3 at $100,
// 10 more Sep 1 at $110 (Aug 31 close $110), the first 10 sold Sep 15 at $120 (Sep 14 close $120), $130 today ─────────────────
describe('8 · a holding bought inside the window that also sold reads its figure from every purchase and sale', () => {
  const C = pos('pc', 'C', [lot(10, 110, '2026-09-01')]);   // the sale took the oldest purchase first, so today's lot is the second
  const px: Record<string, PriceSeries> = {
    C: S([['2026-08-03', 100], ['2026-08-31', 110], ['2026-09-01', 110], ['2026-09-14', 120], ['2026-09-30', 130]]),
    SPY: S([['2026-08-03', 500], ['2026-08-31', 520], ['2026-09-14', 540], ['2026-09-30', 560]]),
  };
  const t = [{ txn_id: 'b1', account_id: 'k', type: 'BUY', ticker: 'C', shares: 10, price: 100, date: '2026-08-03' },
    { txn_id: 'b2', account_id: 'k', type: 'BUY', ticker: 'C', shares: 10, price: 110, date: '2026-09-01' },
    { txn_id: 's2', account_id: 'k', type: 'SELL', ticker: 'C', shares: 10, price: 120, amount: 1200, date: '2026-09-15' }];
  const row = () => buildPerformance([C], (k) => px[k] ?? null, 'YTD', T2, undefined, undefined, { transactions: t, accounts: ACCT([C], 1300 + 1200) })[0];
  test('its own return: 1,100 ÷ 1,000 × 2,400 ÷ 2,200 × 1,300 ÷ 1,200 − 1 = +30.00% (from the 10 still held it read 1,300 ÷ 1,100 − 1 = +18.18%)', () => {
    const r = row();
    expect(r.cappedSince).toBe('2026-09-01');
    near(r.periodTotal, (1100 / 1000) * (2400 / 2200) * (1300 / 1200) - 1, 12);
    near(r.periodReturn, 0.30, 12);
    expect(Math.abs((r.periodReturn as number) - (1300 / 1100 - 1))).toBeGreaterThan(0.1);
  });
  test('its market over the same days: from the Aug 3 close, 560 ÷ 500 − 1 = +12.00% (it read from Sep 1, 560 ÷ 520 − 1 = +7.69%)', () => {
    near(row().benchReturn, 560 / 500 - 1, 12);
  });
  test('what it gained: $1,300 + $1,200 − ($1,000 + $1,100) = $400; its path gives back its figure', () => {
    near(pricedGainOf([row()] as any, 0.75), 1300 + 1200 - 2100, 6);
    near(returnSplitAtPurchases([row().path!]), 0.30, 12);
  });
});

// ── 9 · A SALE'S FEE, ONCE (2026-10-22; DEC-6873, DEC-6874): 20 X held at $100, 10 sold Apr 1, $121 today — the broker's fee of $5 ──
describe('9 · what a sale brought in is counted after its fee, once — never twice, never not at all', () => {
  const rowWith = (sale: any) => buildPerformance([XS], () => X_PRICES, '1Y', new Date(`${TODAY}T12:00:00`), undefined, undefined,
    { transactions: [sale], accounts: ACCT([XS], 1210 + 1195) })[0];
  test('the cash figure leaves the fee out ($120 a share, $1,200 of cash, fee $5 not in the price): brought in $1,195', () => {
    near(rowWith({ ...SALE, price: 120, amount: 1200, fee: 5, fee_in_price: false }).soldInside, 1200 - 5, 6);
  });
  test('the cash figure already holds the fee ($119.50 a share, $1,195 of cash, fee in the price): brought in $1,195 — not taken off again', () => {
    near(rowWith({ ...SALE, price: 119.5, amount: 1195, fee: 5, fee_in_price: true }).soldInside, 1195, 6);
  });
  test('Wealth generated takes the fee once: $1,210 − $2,000 + $1,195 = $405, and the walk begins at $2,000 (counted at $1,200 it read $410 and $1,995)', () => {
    const sale = { ...SALE, price: 120, amount: 1200, fee: 5, fee_in_price: false };
    const r = rowWith(sale);
    near(pricedGainOf([r] as any, 1), 1210 - 2000 + 1195, 6);
    const p = thePerformance({ windowStart: windowStartKey('1Y', [], TODAY), windowLabel: 'w', today: TODAY, snapshotDays: [], investmentAccountIds: new Set(['k']),
      transactions: [sale], accounts: ACCT([XS], 1210 + 1195) as any, holdings: [r] as any });
    near(p.walk!.beginning, 2000, 6); near(p.walk!.wealthGenerated, 405, 6);
  });
  test('no fee on record: brought in 10 × $110 = $1,100, as before', () => {
    near(rowWith(SALE).soldInside, 1100, 6);
  });
});
