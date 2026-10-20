/** DEC-6412 (owner, 2026-10-19, his word: "approved.") — after his question: "state A - Oct 1, 2025 → Sep 30, 2026 return
 *  is 8.26% and 1Y return is 7.12%. Why different as Oct 1 to sept 30 is 1 Year."
 *
 *  The cause: 1Y's beginning (Sep 29, 2025) is before the daily record's first day (Oct 1, 2025), so DEC-5291 worked the
 *  WHOLE window back from today's holdings and their prices, while Since is the record's own time-weighted return
 *  (DEC-4439). The fix joins the two instead of choosing one: the days before the record's first day are worked back from
 *  each holding's price history (DEC-5068 / DEC-5291 rules, a bond's or CD's interest added per DEC-6212), and from that
 *  first day on the record is measured. Return = (1 + the days before) × (1 + the record's part) − 1. The walk is the same
 *  join, and still adds up to today's ending. Function: MK-NW-O-008 thePerformance (amends DEC-5291).
 *
 *  The three cases he set, plus a mixed one:
 *    (1) state A of the account-page drawing: 1Y = Since (+8.26%) × VOO's move over the days before the record.
 *    (2) a record that begins today: exactly DEC-5291's answer.
 *    (3) a record that reaches back the whole window: exactly the measured return.
 *    (4) mixed: a holding with no price history in those days (named, for those days only), money put in during them, a
 *        holding bought after the record began (no part in those days), and an account that joins the record later.
 */
import { thePerformance, windowStartKey } from './performance';
import { buildPerformance } from '../../../src/domain/performance';

const TODAY = '2026-09-30';
const NOW = new Date(`${TODAY}T12:00:00`);
const series = (pts: [string, number][]) => ({ ticker: 'x', points: pts.map(([date, close]) => ({ date, close })) });
const linkedDay = (id: string, date: string, total: number) => ({
  date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
  accounts: [{ date, accountId: id, cash: 0, statedTotal: total, currency: 'USD' }],
});

// ── STATE A of moneykeel_pres_mock_account-page_v01.html, as account_page_drawing_states.test.tsx seeds it ──────────
const VAN = {
  asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: 101_000, cash_balance: 2_000, source: 'connected',
  positions: [
    { position_id: 'voo', ticker: 'VOO', asset_class: 'stock_etf', last_price: 562.5,
      lots: [{ lot_id: 'v1', shares: 150, cost_per_share: 531.33, purchase_date: '2024-01-02' },
             { lot_id: 'v2', shares: 10, cost_per_share: 600, purchase_date: '2026-04-02' }] },
    { position_id: 'kcd', ticker: '49306SAB2', name: 'KeyBank CD', label: 'KeyBank CD', kind: 'cd', asset_class: 'bond', last_price: 100,
      face_value: 5_000, coupon_rate: 0.04, maturity_date: '2027-03-31',
      lots: [{ lot_id: 'k1', shares: 50, cost_per_share: 100, purchase_date: '2026-04-02' }] },
    { position_id: 'ust', ticker: '91282CGM7', name: 'US Treasury 2028', label: 'US Treasury 2028', asset_class: 'bond', last_price: 100,
      face_value: 4_000, coupon_rate: 0.0425, maturity_date: '2028-02-15',
      lots: [{ lot_id: 'u1', shares: 40, cost_per_share: 100, purchase_date: '2026-04-02' }] },
  ],
};
const r = (id: string, date: string, type: string, amount: number, ticker?: string, extra: any = {}) =>
  ({ id, date, type, amount, account_id: 'van', source: 'connected', ...(ticker ? { ticker } : {}), ...extra });
const VAN_LEDGER = [
  r('i1', '2026-09-30', 'INTEREST', 50, '49306SAB2'), r('i2', '2026-09-30', 'INTEREST', 4),
  r('d1', '2026-09-26', 'DIVIDEND', 400, 'VOO'), r('i3', '2026-08-15', 'INTEREST', 85, '91282CGM7'),
  r('i4', '2026-06-30', 'INTEREST', 50, '49306SAB2'), r('i5', '2026-06-30', 'INTEREST', 3),
  r('d2', '2026-06-26', 'DIVIDEND', 380, 'VOO'),
  r('b1', '2026-04-02', 'BUY', 6_000, 'VOO', { shares: 10, price: 600 }),
  r('b2', '2026-04-02', 'BUY', 5_000, '49306SAB2', { shares: 50, price: 100 }),
  r('b3', '2026-04-02', 'BUY', 4_000, '91282CGM7', { shares: 40, price: 100 }),
  r('c1', '2026-04-01', 'DEPOSIT', 15_000),
  r('i6', '2026-03-31', 'INTEREST', 4), r('d3', '2026-03-26', 'DIVIDEND', 360, 'VOO'),
  r('i7', '2025-12-31', 'INTEREST', 4), r('d4', '2025-12-26', 'DIVIDEND', 360, 'VOO'),
];
const VAN_DAYS = [
  linkedDay('van', '2025-10-01', 80_000), linkedDay('van', '2025-12-31', 85_000),
  linkedDay('van', '2026-03-31', 90_278), linkedDay('van', '2026-04-01', 105_278),
  linkedDay('van', '2026-08-29', 100_000),
];
const VOO_SEP29 = 562.5 / 1.0767;   // $522.43, VOO's dividend-adjusted close on Sep 29, 2025
const vooSeries = (extra: [string, number][] = []) => series([['2024-09-29', 460], ['2025-09-29', VOO_SEP29], ...extra,
  ['2025-12-31', 545], ['2026-03-31', 590], ['2026-04-02', 600], ['2026-08-29', 556], ['2026-09-30', 562.5]]);
const flat100 = series([['2024-09-29', 100], ['2025-09-29', 100], ['2026-04-02', 100], ['2026-08-29', 100], ['2026-09-30', 100]]);

/** The account page's own question for one window, with or without the price histories handed over. */
function stateA(p: 'SINCE' | '1Y' | '2Y', voo = vooSeries(), withPrices = true) {
  const prices: Record<string, any> = { VOO: voo, '49306SAB2': flat100, '91282CGM7': flat100 };
  const priceOf = (t: string) => prices[String(t).trim().toUpperCase()];
  const start = p === 'SINCE' ? windowStartKey('SINCE', VAN_DAYS.map((d) => d.date), TODAY) : windowStartKey(p, [], TODAY);
  const income = { transactions: VAN_LEDGER, accounts: [VAN] };
  const holdings = buildPerformance(VAN.positions as any, priceOf, p as any, NOW, () => null, p === 'SINCE' ? start : undefined, income);
  return thePerformance({
    windowStart: start, windowLabel: p, today: TODAY, holdings: holdings as any, ...(withPrices ? { priceOf } : {}),
    transactions: VAN_LEDGER, snapshotDays: VAN_DAYS, investmentAccountIds: new Set(['van']), accounts: [VAN], wholeRecord: p === 'SINCE',
  });
}
const SINCE = (90_278 / 80_000) * (101_000 / 105_278) - 1;   // +8.2619%, the record's own time-weighted return

describe('DEC-6412 · case (1): state A — 1Y = Since × VOO\'s move over the days before the record', () => {
  test('the drawing\'s prices: VOO holds no close between Sep 29 and Dec 31, 2025, so it moved 0.00% and 1Y = Since = +8.26%', () => {
    const since = stateA('SINCE'), y = stateA('1Y');
    expect(since.cumulative!).toBeCloseTo(SINCE, 12);
    expect(y.cumulative!).toBeCloseTo((1 + 0) * (1 + SINCE) - 1, 12);   // was +7.12% (DEC-5291, worked back whole)
    expect(y.ret!).toBeCloseTo(0.0826191132, 9);
    expect(y.recordBegins).toBe('2025-10-01');
    expect(y.workedBack).toBe(true);                                   // not greyed
    expect(y.beginningAsOf).toBe('2025-09-29');
    // the walk is the Since walk: nothing gained, nothing moved, before Oct 1
    expect(y.walk!.beginning).toBeCloseTo(80_000, 6);
    expect(y.walk!.contributions).toBe(15_000);
    expect(y.walk!.wealthGenerated).toBeCloseTo(6_000, 6);
    expect(y.walk!.ending).toBe(101_000);
    expect(y.notIncluded).toBe('');                                    // the bonds were bought Apr 2, 2026: no part in those days
  });
  test('VOO up 1.00% on Oct 1, 2025: 1Y = 1.01 × 1.0826 − 1, and its walk starts that 1% lower', () => {
    const y = stateA('1Y', vooSeries([['2025-10-01', VOO_SEP29 * 1.01]]));
    expect(y.cumulative!).toBeCloseTo(1.01 * (1 + SINCE) - 1, 12);     // +9.3445%
    const gained = 150 * VOO_SEP29 * 1.01 - 150 * VOO_SEP29;           // 150 VOO held on Oct 1: $783.64
    expect(y.walk!.beginning).toBeCloseTo(80_000 - gained, 6);
    expect(y.walk!.beginning + y.walk!.contributions - y.walk!.withdrawals + y.walk!.wealthGenerated).toBeCloseTo(101_000, 6);
  });
  test('2Y: VOO $522.43 ÷ $460.00 over the days before the record, joined to +8.26%, a year over 731 days = +10.87%', () => {
    const y2 = stateA('2Y');
    const gap = VOO_SEP29 / 460 - 1;                                   // +13.5717%
    expect(y2.cumulative!).toBeCloseTo((1 + gap) * (1 + SINCE) - 1, 12);   // +22.9549%
    expect(y2.perYear!).toBeCloseTo(Math.pow((1 + gap) * (1 + SINCE), 365 / 731) - 1, 12);
    expect(y2.ret!).toBeCloseTo(0.1086933702, 9);                      // was +9.57%
    expect(y2.walk!.beginning).toBeCloseTo(80_000 - 150 * (VOO_SEP29 - 460), 6);   // $70,635.55
    expect(y2.walk!.ending).toBe(101_000);
  });
});

describe('DEC-6412 · case (2): a record that begins today — exactly DEC-5291\'s answer', () => {
  const FID = { asset_id: 'fid', label: 'Fidelity Brokerage', kind: 'brokerage', balance: 50_000, source: 'connected',
    positions: [{ position_id: 'vti', ticker: 'VTI', asset_class: 'stock_etf', last_price: 312.5, lots: [{ lot_id: 't1', shares: 128, cost_per_share: 250 }] },
                { position_id: 't31', ticker: '912810TM0', name: 'Treasury 2031', label: 'Treasury 2031', asset_class: 'bond', last_price: 100, face_value: 10_000, lots: [{ lot_id: 't2', shares: 100 }] }] };
  const VTI = series([['2024-09-29', 250], ['2025-09-29', 312.5 / 1.1], ['2026-09-30', 312.5]]);
  const ask = (withPrices: boolean) => {
    const priceOf = (t: string) => (t === 'VTI' ? VTI : undefined) as any;
    const start = windowStartKey('1Y', [], TODAY);
    const holdings = buildPerformance(FID.positions as any, priceOf, '1Y', NOW, () => null, undefined, { transactions: [], accounts: [FID] });
    return thePerformance({ windowStart: start, windowLabel: '1Y', today: TODAY, holdings: holdings as any, ...(withPrices ? { priceOf } : {}),
      transactions: [], snapshotDays: [linkedDay('fid', TODAY, 50_000)], investmentAccountIds: new Set(['fid']), accounts: [FID] });
  };
  test('state D: +10.00%, Wealth generated $3,636, the DEC-6076 sentence — identical with or without the join', () => {
    const joined = ask(true), before = ask(false);
    expect(joined).toEqual(before);
    expect(joined.ret!).toBeCloseTo(0.10, 12);
    expect(joined.walk!.wealthGenerated).toBeCloseTo(40_000 * (1 - 1 / 1.1), 6);
    expect(joined.notIncluded).toBe('Return is on the $40,000 with a price history. Treasury 2031 ($10,000) has no price history, so its gains are not included.');
    expect(joined.recordBegins).toBeUndefined();
  });
});

describe('DEC-6412 · case (3): a record that reaches back the whole window — exactly the measured return', () => {
  test('state A\'s This year (beginning Dec 31, 2025, on the record): +1.89%, identical with or without the join', () => {
    const ask = (withPrices: boolean) => {
      const prices: Record<string, any> = { VOO: vooSeries(), '49306SAB2': flat100, '91282CGM7': flat100 };
      const priceOf = (t: string) => prices[String(t).trim().toUpperCase()];
      const holdings = buildPerformance(VAN.positions as any, priceOf, 'YTD', NOW, () => null, undefined, { transactions: VAN_LEDGER, accounts: [VAN] });
      return thePerformance({ windowStart: windowStartKey('YTD', [], TODAY), windowLabel: 'this year', today: TODAY, holdings: holdings as any,
        ...(withPrices ? { priceOf } : {}), transactions: VAN_LEDGER, snapshotDays: VAN_DAYS, investmentAccountIds: new Set(['van']), accounts: [VAN] });
    };
    const joined = ask(true), measured = ask(false);
    expect(joined).toEqual(measured);
    expect(joined.measured).toBe(85_000);
    expect(joined.cumulative!).toBeCloseTo((90_278 / 85_000) * (101_000 / 105_278) - 1, 12);
  });
});

describe('DEC-6412 · case (4): mixed — a holding with no price history, money put in before the record, a later buy, a later account', () => {
  // Brokerage "bro": the record begins Jun 30, 2026 at $30,000 (VTI 100 × $200 = $20,000 + a bond typed $10,000).
  // $5,000 put in on Jun 15, 2026 (before the record). VXUS bought Aug 1, 2026 (after it). Account "late" joins Aug 1.
  const T = '2026-09-30';
  const BRO = { asset_id: 'bro', label: 'Brokerage', kind: 'brokerage', balance: 37_000, source: 'connected',
    positions: [
      { position_id: 'vti', ticker: 'VTI', asset_class: 'stock_etf', last_price: 210, lots: [{ lot_id: 'a', shares: 100, cost_per_share: 150, purchase_date: '2024-01-02' }] },
      { position_id: 'muni', ticker: 'MUNI29', name: 'Muni 2029', label: 'Muni 2029', asset_class: 'bond', last_price: 100, lots: [{ lot_id: 'b', shares: 100, cost_per_share: 100, purchase_date: '2024-01-02' }] },
      { position_id: 'vxus', ticker: 'VXUS', asset_class: 'stock_etf', last_price: 60, lots: [{ lot_id: 'c', shares: 100, cost_per_share: 50, purchase_date: '2026-08-01' }] },
    ] };
  const LATE = { asset_id: 'late', label: 'Late IRA', kind: 'ira', balance: 8_000, source: 'connected',
    positions: [{ position_id: 'voo', ticker: 'VOO', asset_class: 'stock_etf', last_price: 400, lots: [{ lot_id: 'd', shares: 20, cost_per_share: 300, purchase_date: '2023-01-02' }] }] };
  const prices: Record<string, any> = {
    VTI: series([['2025-09-29', 160], ['2026-06-30', 200], ['2026-09-30', 210]]),
    VXUS: series([['2026-08-01', 50], ['2026-09-30', 60]]),
    VOO: series([['2025-09-29', 300], ['2026-08-01', 380], ['2026-09-30', 400]]),
  };
  const priceOf = (t: string) => prices[String(t).trim().toUpperCase()];
  const LEDGER = [{ id: 'dep', date: '2026-06-15', type: 'DEPOSIT', amount: 5_000, account_id: 'bro' },
                  { id: 'buy', date: '2026-08-01', type: 'BUY', amount: 5_000, ticker: 'VXUS', account_id: 'bro' }];
  const typed = (date: string, id: string, v: number) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
    accounts: [{ date, accountId: id, cash: 0, statedTotal: v, currency: 'USD' }] });
  const DAYS = [typed('2026-06-30', 'bro', 30_000), { ...typed('2026-08-01', 'bro', 31_000), accounts: [...typed('2026-08-01', 'bro', 31_000).accounts, ...typed('2026-08-01', 'late', 7_600).accounts] }];
  const ACCTS = [BRO, LATE];
  const ask = () => {
    const holdings = buildPerformance([...BRO.positions, ...LATE.positions] as any, priceOf, '1Y', new Date(`${T}T12:00:00`), () => null, undefined, { transactions: LEDGER, accounts: ACCTS });
    return thePerformance({ windowStart: windowStartKey('1Y', [], T), windowLabel: '1Y', today: T, holdings: holdings as any, priceOf,
      transactions: LEDGER, snapshotDays: DAYS, investmentAccountIds: new Set(['bro', 'late']), accounts: ACCTS });
  };
  test('Return = (1 + VTI\'s move to Jun 30) × (1 + the record\'s own return from Jun 30) − 1; the bond is named for those days only', () => {
    const f = ask();
    const since = thePerformance({ windowStart: windowStartKey('SINCE', ['2026-06-30'], T), windowLabel: 'since', today: T,
      holdings: buildPerformance([...BRO.positions, ...LATE.positions] as any, priceOf, 'SINCE' as any, new Date(`${T}T12:00:00`), () => null, windowStartKey('SINCE', ['2026-06-30'], T), { transactions: LEDGER, accounts: ACCTS }) as any,
      transactions: LEDGER, snapshotDays: DAYS, investmentAccountIds: new Set(['bro', 'late']), accounts: ACCTS });
    // the days before the record (Sep 29, 2025 → Jun 30, 2026): VTI 160 → 200, $16,000 → $20,000; the late account's VOO,
    // worked back on its own by the record's part as Since does it (DEC-5291), 20 × $300 = $6,000, unmoved; the Muni (named by its ticker, MUNI29) has
    // no price history (left out, named); VXUS was bought Aug 1, 2026, after the record began, so it had no part
    const rGap = (20_000 + 6_000) / (16_000 + 6_000) - 1;          // +18.18%
    expect(f.recordBegins).toBe('2026-06-30');
    expect(f.cumulative!).toBeCloseTo((1 + rGap) * (1 + since.cumulative!) - 1, 12);
    // today's values: VTI 100 × $210 + VOO 20 × $400 are counted; the Muni's 100 × $100 is left out
    expect(f.notIncluded).toBe('Before Jun 30, 2026, when the daily record begins: Return is on the $29,000 with a price history. MUNI29 ($10,000) has no price history, so its gains are not included.');
    // the walk: the record's part's beginning less the $4,000 VTI gained before Jun 30, less the $5,000 put in before it
    expect(f.walk!.beginning).toBeCloseTo(since.walk!.beginning - 4_000 - 5_000, 6);
    expect(f.walk!.contributions).toBeCloseTo(5_000 + since.walk!.contributions, 6);
    expect(f.walk!.ending).toBe(45_000);
    expect(f.walk!.ending).toBe(since.walk!.ending);
    expect(f.walk!.beginning + f.walk!.contributions - f.walk!.withdrawals + f.walk!.wealthGenerated).toBeCloseTo(f.walk!.ending, 6);
    expect(f.sentence).toBe('');
  });
});
