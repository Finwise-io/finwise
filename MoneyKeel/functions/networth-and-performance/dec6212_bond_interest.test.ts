/** DEC-6212 (owner, 2026-10-19, "approved."), after his two points: "(1) the return listed in the timebar at the top is
 *  not accurate for all screens except StateA. (2) Rule is to return % should include price change, dividend and
 *  interest, so showing 0% return for bond is not accurate."
 *
 *  A bond's or CD's return over a window = its price change + the interest it was paid in the window. By hand, state A
 *  of the account-page drawing v01 (Vanguard Brokerage, Oct 1, 2025 → Sep 30, 2026; both bonds bought Apr 2, 2026 at
 *  $100 per $100 of face, still $100):
 *    KeyBank CD    $5,000, $50 + $50 interest      → (5,000 + 100) ÷ 5,000 − 1 = +2.00%
 *    US Treasury   $4,000, $85 interest            → (4,000 + 85) ÷ 4,000 − 1 = +2.125%, shown +2.13%
 *    Bonds & CDs   $9,000, $185                    → (9,000 + 185) ÷ 9,000 − 1 = +2.0556%, shown +2.06%
 *  A bond FUND keeps its adjusted closes alone (DEC-4644): its distributions are in them already. An account's own
 *  time-weighted return (DEC-4439) reads its whole value and does not change. */
import { buildPerformance, isIndividualBondOrCD, bondInterestInWindow, returnWithInterest, portfolioBenchReturn, type Position } from '../../../src/domain/performance';
import { categoryEarnings, knownHoldingsReturn, pricedGainOf, thePerformance } from './performance';
import { percentDigits, writeFigure } from '../_figure-spec';
import { PERFORMANCE_FIGURES } from './performance';
import { theAccount } from './account';
import { holdingBondFacts } from './bonds';

const NOW = new Date('2026-09-30T12:00:00');
const series = (pts: [string, number][]): any => ({ ticker: 'X', points: pts.map(([date, close]) => ({ date, close })) });
const flat = series([['2024-09-29', 100], ['2025-09-29', 100], ['2026-04-02', 100], ['2026-08-29', 100], ['2026-09-30', 100]]);
const CD: Position = { position_id: 'kcd', ticker: '49306SAB2', label: 'KeyBank CD', kind: 'cd', asset_class: 'bond', last_price: 100,
  face_value: 5000, coupon_rate: 0.04, maturity_date: '2027-03-31',
  lots: [{ lot_id: 'k1', shares: 50, cost_per_share: 100, purchase_date: '2026-04-02' }] } as any;
const UST: Position = { position_id: 'ust', ticker: '91282CGM7', label: 'US Treasury 2028', asset_class: 'bond', last_price: 100,
  face_value: 4000, coupon_rate: 0.0425, maturity_date: '2028-02-15',
  lots: [{ lot_id: 'u1', shares: 40, cost_per_share: 100, purchase_date: '2026-04-02' }] } as any;
const BND: Position = { position_id: 'bnd', ticker: 'BND', label: 'Vanguard Total Bond Market ETF', asset_class: 'bond', last_price: 100,
  lots: [{ lot_id: 'b1', shares: 50, cost_per_share: 100, purchase_date: '2024-01-02' }] } as any;
const ACCOUNT = { asset_id: 'van', label: 'Vanguard Brokerage', kind: 'brokerage', positions: [CD, UST] };
const rec = (id: string, date: string, type: string, amount: number, ticker?: string, account = 'van') =>
  ({ id, date, type, amount, account_id: account, ...(ticker ? { ticker } : {}) });
const LEDGER = [
  rec('i1', '2026-09-30', 'INTEREST', 50, '49306SAB2'), rec('i4', '2026-06-30', 'INTEREST', 50, '49306SAB2'),
  rec('i3', '2026-08-15', 'INTEREST', 85, '91282CGM7'), rec('i2', '2026-09-30', 'INTEREST', 4),
];
const prices: Record<string, any> = { '49306SAB2': flat, '91282CGM7': flat, BND: flat };
const rowsFor = (positions: Position[], transactions = LEDGER, period: any = '1Y', start?: string) =>
  buildPerformance(positions, (t) => prices[t], period, NOW, () => null, start, { transactions, accounts: [ACCOUNT] });

describe('the pinned example — state A of the account-page drawing', () => {
  test('KeyBank CD: $100 of interest on $5,000, price flat → +2.00%', () => {
    const [r] = rowsFor([CD]);
    expect(r.interest).toBe(100);
    expect(r.periodTotal!).toBeCloseTo(0.02, 12);
    expect(r.periodReturn!).toBeCloseTo(0.02, 12);
    expect(writeFigure(PERFORMANCE_FIGURES['MK-PF-M-017'], r.periodReturn)).toBe('+2.00%');
  });
  test('US Treasury: $85 on $4,000 → +2.125%, written +2.13% (half away from zero, not the computer\'s +2.12%)', () => {
    const [r] = rowsFor([UST]);
    expect(writeFigure(PERFORMANCE_FIGURES['MK-PF-M-017'], r.periodReturn)).toBe('+2.13%');
    expect(r.interest).toBe(85);
    expect(r.periodReturn!).toBeCloseTo(0.02125, 12);
    expect(percentDigits(r.periodReturn!)).toBe('2.13');
    expect(percentDigits(0.0212499)).toBe('2.12');
    expect(percentDigits(-0.02125)).toBe('-2.13');
    expect(percentDigits(0)).toBe('0.00');
  });
  test('the Bonds & CDs category: $185 on $9,000 → +2.06%', () => {
    const cats = categoryEarnings({ transactions: LEDGER, windowStart: '2025-09-30', rows: rowsFor([CD, UST]) as any });
    const b = cats.find((c) => c.key === 'bonds')!;
    expect(b.earned).toBe(185);
    expect(b.ret!).toBeCloseTo(185 / 9000, 12);
    expect(b.yearly).toBe(false);
  });
  test('a holding bought inside the window counts the interest from its purchase: same figures under Since', () => {
    const [r] = rowsFor([CD], LEDGER, 'SINCE', '2025-10-02');
    expect(r.cappedSince).toBe('2026-04-02');
    expect(r.periodTotal!).toBeCloseTo(0.02, 12);
  });
});

describe('what it gained, worked back — the price change plus the interest, exactly', () => {
  test('pricedGainOf: the CD gained $100, the Treasury $85 (not $98.04 and $83.23)', () => {
    const [cd, ust] = rowsFor([CD, UST]);
    expect(pricedGainOf([cd as any], 1)).toBeCloseTo(100, 9);
    expect(pricedGainOf([ust as any], 1)).toBeCloseTo(85, 9);
  });
  test('a bond not capped: price up 1% and $40 of interest on $5,050 → gained $50 + $40 = $90', () => {
    const up = series([['2025-09-29', 100], ['2026-09-30', 101]]);
    const p: Position = { ...CD, position_id: 'old', last_price: 101, lots: [{ lot_id: 'o', shares: 50, cost_per_share: 100, purchase_date: '2024-01-02' }] } as any;
    const [r] = buildPerformance([p], () => up, '1Y', NOW, () => null, undefined,
      { transactions: [rec('x', '2026-03-31', 'INTEREST', 40, '49306SAB2')], accounts: [{ ...ACCOUNT, positions: [p] }] });
    expect(r.periodTotal!).toBeCloseTo((5050 + 40) / 5000 - 1, 12);   // +1.80%
    expect(pricedGainOf([r as any], 1)).toBeCloseTo(90, 9);
    expect(knownHoldingsReturn([r as any], 1)!).toBeCloseTo(0.018, 12);
  });
  test('knownHoldingsReturn over the two bonds: (5,100 + 4,085) ÷ 9,000 − 1', () => {
    expect(knownHoldingsReturn(rowsFor([CD, UST]) as any, 1)!).toBeCloseTo(185 / 9000, 12);
  });
  test('the market figure weighs each bond by its start, not by its value plus interest twice', () => {
    const rows = rowsFor([CD, UST]).map((r) => ({ ...r, benchReturn: 0.03, benchTotal: 0.03 }));
    expect(portfolioBenchReturn(rows as any)!).toBeCloseTo(0.03, 12);
  });
});

describe('only one bond or one CD counts its interest — never a fund, never twice', () => {
  test('a bond ETF keeps its adjusted closes alone (DEC-4644), even beside an interest record naming it', () => {
    const [r] = rowsFor([BND], [rec('f', '2026-06-30', 'INTEREST', 200, 'BND')]);
    expect(isIndividualBondOrCD(BND)).toBe(false);
    expect(r.interest).toBeNull();
    expect(r.periodTotal).toBe(0);
  });
  test('the line between them, case by case', () => {
    const base = { position_id: 'x', lots: [] } as any;
    expect(isIndividualBondOrCD({ ...base, ticker: '912810TM0', asset_class: 'bond' })).toBe(true);        // a security id
    expect(isIndividualBondOrCD({ ...base, ticker: 'KEYCD', kind: 'cd' })).toBe(true);                      // the CD type
    expect(isIndividualBondOrCD({ ...base, ticker: 'MUNI', asset_class: 'bond', maturity_date: '2029-06-01' })).toBe(true);
    expect(isIndividualBondOrCD({ ...base, ticker: 'SGOV', asset_class: 'bond' })).toBe(false);             // a T-bill ETF
    expect(isIndividualBondOrCD({ ...base, ticker: 'VBTLX', label: 'Total Bond Index Fund', asset_class: 'bond', maturity_date: '2030-01-01' })).toBe(false);
    expect(isIndividualBondOrCD({ ...base, ticker: 'AGG', asset_class: 'bond' })).toBe(false);              // nothing says one instrument
    expect(isIndividualBondOrCD({ ...base, ticker: '912810TM0', asset_class: 'stock_etf' })).toBe(false);   // not in Bonds & CDs
  });
  test('interest before the window, on another account, or naming another holding is not counted; a COUPON is', () => {
    const t = [
      rec('a', '2025-09-15', 'INTEREST', 30, '49306SAB2'),                 // before the window's first day
      rec('b', '2026-06-30', 'INTEREST', 70, '49306SAB2', 'other'),        // another account
      rec('c', '2026-06-30', 'INTEREST', 11, '91282CGM7'),                 // another holding
      rec('d', '2026-07-31', 'COUPON', 25, '49306SAB2'),                   // a coupon is interest
    ];
    expect(bondInterestInWindow(CD, t, '2025-09-30', [ACCOUNT])).toBe(25);
  });
  test('a record naming no holding counts only where the account is that one bond or CD', () => {
    const lone = { asset_id: 'cdacct', label: 'Ally CD', kind: 'cd', positions: [{ ...CD, position_id: 'lone' }] };
    const t = [rec('u', '2026-06-30', 'INTEREST', 40, undefined, 'cdacct'), rec('v', '2026-06-30', 'INTEREST', 9)];
    expect(bondInterestInWindow({ ...CD, position_id: 'lone' } as any, t, '2025-09-30', [lone])).toBe(40);
    expect(bondInterestInWindow(CD, t, '2025-09-30', [ACCOUNT])).toBe(0);   // a brokerage's untickered interest is its cash's
  });
  test('no records handed over: the row is its price move, as before', () => {
    const [r] = buildPerformance([CD], (t) => prices[t], '1Y', NOW);
    expect(r.interest).toBeNull();
    expect(r.periodTotal).toBe(0);
  });
  test('returnWithInterest: no value today to divide by leaves the price move', () => {
    expect(returnWithInterest(0.01, 0, 50)).toBe(0.01);
    expect(returnWithInterest(null, 5000, 50)).toBeNull();
    expect(returnWithInterest(0, 5000, 100)).toBeCloseTo(0.02, 12);
  });
});

describe('over two years the figure is a yearly rate of the total with its interest', () => {
  test('a bond held three years, flat, $400 of interest on $10,000 over 2Y → (1.04)^(1/2) − 1 a year', () => {
    const p: Position = { ...UST, position_id: 'two', last_price: 100, lots: [{ lot_id: 't', shares: 100, cost_per_share: 100, purchase_date: '2023-01-02' }] } as any;
    const [r] = buildPerformance([p], () => flat, '2Y', NOW, () => null, undefined,
      { transactions: [rec('y1', '2025-02-15', 'INTEREST', 200, '91282CGM7'), rec('y2', '2026-02-15', 'INTEREST', 200, '91282CGM7')], accounts: [{ ...ACCOUNT, positions: [p] }] });
    expect(r.periodTotal!).toBeCloseTo(0.04, 12);
    expect(r.periodReturn!).toBeCloseTo(Math.pow(1.04, 1 / 2) - 1, 12);
  });
});

describe('an account\'s own time-weighted return does not change and counts nothing twice (DEC-4439)', () => {
  test('state A, Since Oct 1, 2025: +8.26% with or without the bonds\' interest on their rows', () => {
    const day = (date: string, total: number) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
      accounts: [{ date, accountId: 'van', cash: 0, statedTotal: total, currency: 'USD' }] });
    const acct = { asset_id: 'van', label: 'Vanguard Brokerage', kind: 'brokerage', balance: 101000, cash_balance: 2000, source: 'connected',
      positions: [{ position_id: 'voo', ticker: 'VOO', asset_class: 'stock_etf', last_price: 562.5, lots: [{ lot_id: 'v', shares: 160, cost_per_share: 531.33, purchase_date: '2024-01-02' }] }, CD, UST] };
    const ask = (holdings: any[]) => thePerformance({ windowStart: '2025-10-02', windowLabel: 'since Oct 1, 2025', today: '2026-09-30',
      transactions: [...LEDGER, rec('c1', '2026-04-01', 'DEPOSIT', 15000)],
      snapshotDays: [day('2025-10-01', 80000), day('2026-03-31', 90278), day('2026-04-01', 105278)],
      investmentAccountIds: new Set(['van']), accounts: [acct], holdings, wholeRecord: true });
    const withIt = ask(rowsFor([CD, UST], LEDGER, 'SINCE', '2025-10-02'));
    const without = ask(buildPerformance([CD, UST], (t) => prices[t], 'SINCE' as any, NOW, () => null, '2025-10-02'));
    expect(withIt.ret!).toBeCloseTo((90278 / 80000) * (101000 / 105278) - 1, 12);
    expect(withIt.ret).toBe(without.ret);
    expect(withIt.walk!.interest).toBe(without.walk!.interest);
  });
});

describe('the line under a bond\'s name and its income', () => {
  test('face, coupon and yield to maturity — a bank CD\'s yield to maturity is its rate', () => {
    expect(holdingBondFacts(CD, 5000, NOW)).toEqual({ face: 5000, couponRate: 0.04, yieldToMaturity: 0.04 });
    const ust = holdingBondFacts(UST, 4000, NOW);
    expect(ust.face).toBe(4000);
    expect(ust.couponRate).toBe(0.0425);
    expect(ust.yieldToMaturity).not.toBeNull();
    expect(holdingBondFacts({ ticker: '912810TM0', label: 'Treasury 2031', face_value: 10000, maturity_date: '2031-11-15' }, 10000, NOW))
      .toEqual({ face: 10000, couponRate: null, yieldToMaturity: null });
  });
  test('a coupon record is income on the account page too', () => {
    const a = theAccount({ account: { asset_id: 'van', label: 'Vanguard', balance: 9000, positions: [] } as any,
      transactions: [rec('k', '2026-07-31', 'COUPON', 25, '49306SAB2')] });
    expect(a.income).toBe(25);
    expect(a.incomeOfHolding('49306SAB2').interest).toBe(25);
  });
});
