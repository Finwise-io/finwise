/** FX-PF, 2026-10-27 — the drawing match of 2026-10-27 (round 2), PF-4 and PF-5, and the class around them. The lead's ruling R4:
 *  "A HOLDING BOUGHT INSIDE A WINDOW COUNTS: bought today it counts at its cost with 0% gain … never dropped silently. A CD with a
 *  stated rate gains by its rate wherever it is held (DEC-3656)."
 *
 *  Each case is asked the way the Performance tab asks it: MK-PF-F-014 buildPerformance builds the rows, MK-NW-O-008
 *  thePerformance answers the window. Every expected figure is worked by hand on its own line.
 */
import { buildPerformance } from '../../../src/domain/performance';
import { thePerformance, windowStartKey } from './performance';
import { buildDayFromAccounts } from '../../../Calculation Module code/engines/snapshots';

const T = '2026-08-04';
const acct = (id: string, institution: string, balance: number, positions: any[], cash = 0) => ({
  asset_id: id, label: 'BROKERAGE', institution, kind: 'brokerage', tax_bucket: 'TAXABLE', balance, cash_balance: cash, positions });
const pos = (id: string, ticker: string, shares: number, price: number | undefined, cost: number | undefined, date: string, cls = 'stock_etf', extra: any = {}) => (
  { position_id: id, ticker, asset_class: cls, ...(price != null ? { last_price: price } : {}),
    lots: [{ lot_id: `${id}l`, shares, ...(cost != null ? { cost_per_share: cost } : {}), purchase_date: date }], ...extra });
const closes = (ticker: string, pts: [string, number][]) => ({ ticker, points: pts.map(([date, close]) => ({ date, close })) });
const VTI = closes('VTI', [['2024-01-01', 300], ['2024-08-02', 330], ['2025-08-03', 360], ['2025-12-31', 380], ['2026-05-06', 400], ['2026-07-03', 390], [T, 400]]);

/** the window as the Performance tab answers it, for every account together */
function windowOf(w: string, accounts: any[], priceCache: Record<string, any>, recordFrom?: string) {
  const days = [...(recordFrom ? [buildDayFromAccounts(accounts as any, recordFrom, `${recordFrom}T09:00:00Z`)] : []), buildDayFromAccounts(accounts as any, T, `${T}T09:00:00Z`)];
  const priceOf = (t: string) => priceCache[t.trim().toUpperCase()];
  const rows = buildPerformance(accounts.flatMap((a) => a.positions) as any, priceOf, w as any, new Date(`${T}T12:00:00`), () => null, undefined, { transactions: [], accounts });
  const f = thePerformance({ windowStart: windowStartKey(w, [recordFrom ?? T], T), windowLabel: w, today: T, holdings: rows as any, priceOf,
    transactions: [], snapshotDays: days, investmentAccountIds: new Set(accounts.map((a) => a.asset_id)), accounts });
  return { f, rows };
}
const pct = (x: number | null) => (x == null ? null : `${x >= 0 ? '+' : ''}${(x * 100).toFixed(2)}%`);

describe('PF-4 · a holding bought inside the window counts (R4)', () => {
  // v17 phone 4: Vanguard VTI 900 × $330 (paid $300, today) + KEYBANK CD 4.00% 4,610 × $1 (paid $1, today, no prices); E*TRADE VOO
  // 90 × $550 (paid $500, today) + $3,204 cash.
  const PHONE4 = [acct('van', 'Vanguard', 301_610, [pos('p1', 'VTI', 900, 330, 300, T), pos('p3', 'KEYBANK CD 4.00%', 4610, 1, 1, T, 'bond')]),
    acct('etr', 'E*TRADE', 52_704, [pos('p2', 'VOO', 90, 550, 500, T)], 3_204)];
  const P4 = { VTI: closes('VTI', [[T, 330]]), VOO: closes('VOO', [[T, 550]]) };
  // R18 (2026-11-01): both accounts are typed totals (no derive_balance), so each one's Return is its own walk's and the summary folds the
  // two walks: Vanguard $274,610 → $301,610 (its holdings are its whole total), E*TRADE $48,204 → $52,704 (VOO's $4,500 beside $3,204
  // of cash), together 354,314 ÷ 322,814 − 1 = +9.76%. R4's +9.86% (the holdings' own, 351,110 ÷ 319,610 − 1) is kept below as test.failing.
  test.each([['1M'], ['YTD'], ['1Y']])('%s: 354,314 ÷ 322,814 − 1 = +9.76% (R18); the CD at $4,610 ÷ $4,610 − 1 = +0.00%, named nowhere', (w) => {
    const { f, rows } = windowOf(w, PHONE4, P4);
    const cd = rows.find((r: any) => r.position.ticker === 'KEYBANK CD 4.00%')!;
    expect([cd.marketValue, cd.periodTotal, cd.paidInside, cd.cappedSince]).toEqual([4_610, 0, 4_610, T]);
    expect(pct(f.cumulative)).toBe('+9.76%');
    expect(f.cumulative).toBeCloseTo(354_314 / 322_814 - 1, 12);
    expect(f.walk!.beginning).toBe(354_314 - 27_000 - 4_500 - 0);   // $322,814
    expect(f.notIncluded).toBe('');
  });
  test('2Y: (354,314 ÷ 322,814)^(365 ÷ 731) − 1 = +4.76% a year (R18)', () => {
    const { f } = windowOf('2Y', PHONE4, P4);
    expect(f.years).toBeCloseTo(731 / 365, 12);
    expect(f.perYear).toBeCloseTo(Math.pow(354_314 / 322_814, 365 / 731) - 1, 12);
    expect(pct(f.perYear)).toBe('+4.76%');
  });
  test.failing('the answer until 2026-11-01, kept (no longer the app\'s): 351,110 ÷ 319,610 − 1 = +9.86%, the holdings\' own (R4)', () => {
    const { f } = windowOf('1M', PHONE4, P4);
    expect(pct(f.cumulative)).toBe('+9.86%');
  });
  test('E*TRADE alone: its walk 52,704 ÷ 48,204 − 1 = +9.34% (R18; VOO\'s own +10.00% beside $3,204 of cash)', () => {
    const { f } = windowOf('1M', [PHONE4[1]], P4);
    expect(f.cumulative).toBeCloseTo(52_704 / 48_204 - 1, 12);
    expect(pct(f.cumulative)).toBe('+9.34%');
  });
  test('Vanguard alone: 301,610 ÷ 274,610 − 1 = +9.83%', () => {
    const { f } = windowOf('1M', [PHONE4[0]], P4);
    expect(pct(f.cumulative)).toBe('+9.83%');
  });
  // THE SAME CLASS: bought inside the window, its gain not knowable — named, never a silent $0
  // DEC-10982 (2026-11-12): no money in or out, so Return = (ending − beginning) ÷ beginning on the walk, PRIV ($1,000, no price
  // history) counted as unchanged: $40,000 → $41,000, 1,000 ÷ 40,000 = +2.50% (it read VTI's own +2.56%, 40,000 ÷ 39,000 − 1)
  test('no close and no price on record, bought Jul 20 (not today): PRIV is named, Return +2.50% on the walk (DEC-10982)', () => {
    const { f } = windowOf('1M', [acct('van', 'Vanguard', 41_000, [pos('p1', 'VTI', 100, 400, 300, '2024-01-02'),
      pos('p9', 'PRIV', 10, undefined, 100, '2026-07-20')])], { VTI });
    expect(f.cumulative).toBeCloseTo((f.walk!.ending - f.walk!.beginning) / f.walk!.beginning, 12);
    expect(pct(f.cumulative)).toBe('+2.50%');
    expect(f.notIncluded).toBe('PRIV ($1,000) has no price history, so its gains are not included.');
  });
  test('a purchase inside the window with no price paid on record: VOO is named for that reason (it counted the first 10 shares\' $500 alone, said nowhere)', () => {
    const voo = { position_id: 'p8', ticker: 'VOO', asset_class: 'stock_etf', last_price: 550,
      lots: [{ lot_id: 'y1', shares: 10, cost_per_share: 500, purchase_date: '2026-07-20' }, { lot_id: 'y2', shares: 10, purchase_date: '2026-07-25' }] };
    const { f } = windowOf('1M', [acct('van', 'Vanguard', 51_000, [pos('p1', 'VTI', 100, 400, 300, '2024-01-02'), voo])],
      { VTI, VOO: closes('VOO', [['2026-07-01', 500], [T, 550]]) });
    expect(f.walk!.beginning).toBe(51_000 - 1_000);   // VTI's $1,000 alone; VOO's gain unknown, so its value is taken as unchanged
    expect(f.notIncluded).toBe('Return is on the $40,000 with a price history. VOO ($11,000) has a purchase with no price paid on record, so its gains are not included.');
  });
});

describe('PF-5 · a CD with a stated rate gains by its rate inside a brokerage too (DEC-3656, R4)', () => {
  // Vanguard: 100 VTI ($400 today) + KEYBANK CD, 10,400 × $1, 4.00% entered, both held since Jan 2, 2024; no prices for the CD.
  const HOUSE = [acct('van', 'Vanguard', 50_400, [pos('p1', 'VTI', 100, 400, 300, '2024-01-02'),
    pos('p3', 'KEYBANK CD', 10_400, 1, 1, '2024-01-02', 'bond', { coupon_rate: 0.04, kind: 'cd' })])];
  test('1Y (Aug 4, 2025 → Aug 4, 2026, 366 days): the CD +4.01% = 1.04^(366 ÷ 365) − 1; Return 50,400 ÷ (36,000 + 10,400 ÷ 1.0401) − 1 = +9.57%', () => {
    const { f, rows } = windowOf('1Y', HOUSE, { VTI });
    const cd = rows.find((r: any) => r.position.ticker === 'KEYBANK CD')!;
    expect(cd.periodTotal).toBeCloseTo(Math.pow(1.04, 366 / 365) - 1, 12);
    expect(cd.startValue).toBeCloseTo(10_400 / Math.pow(1.04, 366 / 365), 9);
    const start = 36_000 + 10_400 / Math.pow(1.04, 366 / 365);
    expect(f.cumulative).toBeCloseTo(50_400 / start - 1, 12);
    expect(pct(f.cumulative)).toBe('+9.57%');
    expect(f.walk!.beginning).toBeCloseTo(start, 6);   // $45,998.93 — 50,400 less VTI's $4,000 less the CD's $401.07
    expect(f.notIncluded).toBe('');                    // it read "KEYBANK CD ($10,400) has no price history, so its gains are not included."
  });
  test('2Y: the CD shows its rate a year, 4.00%, and the two years\' total 1.04^(731 ÷ 365) − 1 = +8.17%', () => {
    const { rows } = windowOf('2Y', HOUSE, { VTI });
    const cd = rows.find((r: any) => r.position.ticker === 'KEYBANK CD')!;
    expect(cd.periodReturn).toBeCloseTo(0.04, 12);
    expect(cd.periodTotal).toBeCloseTo(Math.pow(1.04, 731 / 365) - 1, 12);
    expect(cd.years).toBeCloseTo(731 / 365, 12);
  });
  test('a CD with no rate entered stays unknown and named (DEC-2748b: a rate never entered stays blank)', () => {
    const noRate = [acct('van', 'Vanguard', 50_400, [pos('p1', 'VTI', 100, 400, 300, '2024-01-02'), pos('p3', 'KEYBANK CD', 10_400, 1, 1, '2024-01-02', 'bond', { kind: 'cd' })])];
    expect(windowOf('1Y', noRate, { VTI }).f.notIncluded).toBe('KEYBANK CD ($10,400) has no price history, so its gains are not included.');   // DEC-10982: first half not said
  });
  test('a bond (not a CD) with a coupon and no prices stays unknown: its price is not known (v17 line 131)', () => {
    const bond = [acct('van', 'Vanguard', 50_400, [pos('p1', 'VTI', 100, 400, 300, '2024-01-02'), pos('p3', 'US TREASURY 2031', 10_400, 1, 1, '2024-01-02', 'bond', { coupon_rate: 0.04 })])];
    expect(windowOf('1Y', bond, { VTI }).f.notIncluded).toMatch(/^US TREASURY 2031 \(\$10,400\) has no price history/);   // DEC-10982
  });
  test('a record that began May 6, 2026, 1Y joined there (DEC-6412): the 276 days before it by the rate, 1.04^(276 ÷ 365) − 1; nothing named', () => {
    const { f } = windowOf('1Y', HOUSE, { VTI }, '2026-05-06');
    // on May 6 (the record's first day): VTI 100 × $400 = $40,000; the CD 10,400 ÷ 1.04^(90 ÷ 365). The evening before the window:
    // VTI 100 × $360 = $36,000; the CD 10,400 ÷ 1.04^(366 ÷ 365). The record from May 6 holds $50,400 both days: its part +0.00%.
    const thenCd = 10_400 / Math.pow(1.04, 90 / 365), startCd = 10_400 / Math.pow(1.04, 366 / 365);
    // DEC-10982 (2026-11-12): no money in or out, so Return = (ending − beginning) ÷ beginning on the joined walk. Its beginning is
    // the record's $50,400 on May 6 less what the days before it made, VTI's $4,000 and the CD's 10,400 ÷ 1.04^(90/365) − startCd
    // = $300.99: $46,099.01; ending $50,400 → 4,300.99 ÷ 46,099.01 = +9.33% (the two parts chained read +9.35%)
    const begin = 50_400 - (40_000 + thenCd - 36_000 - startCd);
    expect(f.walk!.beginning).toBeCloseTo(begin, 6);
    expect(f.cumulative).toBeCloseTo((50_400 - begin) / begin, 12);
    expect(pct(f.cumulative)).toBe('+9.33%');
    expect(f.notIncluded).toBe('');
  });
});
