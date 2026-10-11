/* THE FINAL AUDIT OF BATCH "networth 01", BY GEMINI (returned 2026-10-05), RUN AGAINST THE APP.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/NW-01-gemini.md.
 * It wrote nine "still open" formula issues and thirty cases. Every expected figure below is its own,
 * with its plain inputs mapped onto the app's shapes; where it gave a rate the app does not use (its own
 * 3% for gold, 7% for a note) the app's published benchmark is used and the arithmetic it describes is
 * held. Each of its nine issues has a test that shows what the app does. Three of its nine name
 * functions that are not in the batch (MK-NW-F-010 "taxBands2026Check", MK-NW-F-012
 * "mortgagePropertyMatcher", MK-NW-F-015 "bondRateSensitivity" — the app's F-010 and F-012 are
 * wrapperAccount and taxTreatmentOf); they are read as the functions it meant.
 */
import { theBonds } from './bonds';
import { theAccount } from './account';
import { theNetWorth, mortgagesByProperty } from './net-worth';
import { theEmergencyFund } from './emergency-fund';
import { theAlternativesOutlook } from './alternatives-outlook';
import { theHolding } from './holding';
import { benchmarkReturn } from '../../../src/domain/assets';
import { timeWeightedReturn } from '../../../Calculation Module code/engines/time-weighted-return';
import { recordedDay } from '../../../src/testing/recordedDay';
import { STANDARD_DEDUCTION, TAX_TABLES } from '../../../src/domain/income/tax';

const TODAY = new Date('2026-10-05T12:00:00');
const bond = (id: string, label: string, face: number, rate: number, value: number | null, maturity: string, extra: Record<string, any> = {}) =>
  ({ asset_id: id, label, kind: 'bond', tax_bucket: 'TAXABLE', balance: value ?? 0, face_value: face, coupon_rate: rate, maturity_date: maturity, accrued_interest: 0, ...extra }) as any;
const acct = (over: Record<string, any>) => ({ asset_id: 'a', label: 'Account', tax_bucket: 'TAXABLE', balance: 0, ...over }) as any;
const debt = (label: string, type: string, balance: number, minimum: number, extra: Record<string, any> = {}) =>
  ({ debt_id: label, label, debt_type: type, remaining_balance: balance, interest_rate_apr: 0.05, minimum_monthly_payment: minimum, ...extra }) as any;
const lot = (id: string, shares: number, cost: number, date: string) => ({ lot_id: id, shares, cost_per_share: cost, purchase_date: date });

describe('MK-NW-O-002 theAccount — its five cases', () => {
  test('easy 1 · a linked checking account: a deposit and a withdrawal', () => {
    const a = theAccount({ account: acct({ kind: 'checking', tax_bucket: 'CASH', source: 'connected', balance: 1500, cash_balance: 1500 }), transactions: [
      { id: '1', account_id: 'a', type: 'DEPOSIT', amount: 500, date: '2026-09-01' },
      { id: '2', account_id: 'a', type: 'WITHDRAWAL', amount: 200, date: '2026-09-02' }] });
    expect(a.marketValue).toBe(1500);
    expect(a.activityCount).toBe(2);
    expect(a.inside).toEqual([{ key: 'cash', label: 'Cash', value: 1500 }]);
    // it expected no income figure; the app says $0: the records are there and none of them is income.
    // No figure is for an account with no records at all (its own edge case below).
    expect(a.income).toBe(0);
  });
  test('easy 2 · a taxable account with one AAPL dividend', () => {
    const a = theAccount({ account: acct({ kind: 'brokerage', balance: 10000 }), transactions: [{ id: '1', account_id: 'a', type: 'DIVIDEND', ticker: 'AAPL', amount: 150, date: '2026-09-01' }] });
    expect([a.marketValue, a.income, a.activityCount]).toEqual([10000, 150, 1]);
  });
  test('complex 1 · an account built by hand: $15k of AAPL, $5k of cash, $5k of a bond; a transfer in and an untickered dividend', () => {
    const account = acct({ kind: 'brokerage', balance: 25000, derive_balance: true, cash_balance: 5000,
      positions: [{ position_id: 'p1', ticker: 'AAPL', lots: [lot('1', 100, 150, '2025-01-02')] }, { position_id: 'p2', ticker: 'BND', asset_class: 'bond', lots: [lot('2', 70, 71.43, '2025-01-02')] }] });
    const a = theAccount({ account, transactions: [
      { id: '1', account_id: 'other', counter_account_id: 'a', type: 'TRANSFER', amount: 2000, date: '2026-09-01' },
      { id: '2', account_id: 'a', type: 'DIVIDEND', amount: 100, date: '2026-09-02' }] });
    expect(a.marketValue).toBe(25000);
    expect(a.income).toBe(100);
    expect(a.activityCount).toBe(2);
    // ITS ISSUE 2: what the uninvested cash is, before the account is itemised. The inside now says:
    // the $5,000 it records is cash; the rest stays whole under the account's class (its prices are
    // looked up, not stored, so the bond is not split out). The parts add to the balance.
    expect(a.inside!.find((r) => r.key === 'cash')!.value).toBe(5000);
    expect(a.inside!.reduce((t, r) => t + r.value, 0)).toBe(25000);
  });
  test('complex 2 · a $300 MSFT dividend and $200 of untickered interest', () => {
    const a = theAccount({ account: acct({ kind: 'brokerage', balance: 50000 }), transactions: [
      { id: '1', account_id: 'a', type: 'DIVIDEND', ticker: 'MSFT', amount: 300, date: '2026-09-01' },
      { id: '2', account_id: 'a', type: 'INTEREST', amount: 200, date: '2026-09-02' }] });
    expect([a.marketValue, a.income]).toEqual([50000, 500]);
    expect(a.incomeOfHolding('MSFT').dividends).toBe(300);
  });
  test('edge · a fresh account: $0 and no records', () => {
    const a = theAccount({ account: acct({ kind: 'brokerage', balance: 0 }), transactions: [] });
    expect([a.marketValue, a.income, a.activityCount]).toEqual([0, null, 0]);    // REFUSES — no records at all
  });
});

describe('MK-NW-O-005 theAlternativesOutlook — its five cases, at the app’s published benchmarks', () => {
  const r = (kind: string) => benchmarkReturn(kind);
  test('easy 1 · one crypto account, $10,000 at 8%', () => {
    const o = theAlternativesOutlook({ accounts: [acct({ asset_id: 'c', label: 'Crypto', kind: 'crypto', balance: 10000 })] });
    expect(r('crypto')).toBe(0.08);
    expect([o.count, o.totalValue, o.expectedReturn, o.estimatedGrowthPerYear]).toEqual([1, 10000, 0.08, 800]);
  });
  test('easy 2 · two equal holdings: the rate is the plain middle of the two', () => {
    const o = theAlternativesOutlook({ accounts: [acct({ asset_id: 'c', kind: 'crypto', balance: 20000 }), acct({ asset_id: 'n', kind: 'annuities', balance: 20000 })] });
    expect([o.count, o.totalValue]).toEqual([2, 40000]);
    expect(o.expectedReturn).toBeCloseTo((r('crypto') + r('annuities')) / 2, 12);
    expect(o.estimatedGrowthPerYear).toBeCloseTo(40000 * (r('crypto') + r('annuities')) / 2, 6);
  });
  test('complex 1 · crypto $28,000, gold $500, a note $11,500: weighted by what each is worth', () => {
    const o = theAlternativesOutlook({ accounts: [acct({ asset_id: 'c', kind: 'crypto', balance: 28000 }), acct({ asset_id: 'g', kind: 'commodities', balance: 500 }), acct({ asset_id: 'n', kind: 'other_asset', balance: 11500 })] });
    expect([o.count, o.totalValue]).toEqual([3, 40000]);
    expect(o.expectedReturn).toBeCloseTo((28000 * r('crypto') + 500 * r('commodities') + 11500 * r('other_asset')) / 40000, 12);
    expect(o.estimatedGrowthPerYear).toBeCloseTo(40000 * o.expectedReturn!, 6);
  });
  test('complex 2 · stocks are not alternatives: $50k of stocks, $15k of crypto, $5k of art', () => {
    const o = theAlternativesOutlook({ accounts: [acct({ asset_id: 's', kind: 'brokerage', asset_class: 'stocks_etf', balance: 50000 }), acct({ asset_id: 'c', kind: 'crypto', balance: 15000 }), acct({ asset_id: 'art', kind: 'other_asset', balance: 5000 })] });
    expect([o.count, o.totalValue]).toEqual([2, 20000]);
    expect(o.rows.map((x) => x.accountId)).toEqual(['c', 'art']);
  });
  test('edge · nothing held — and ITS ISSUE 5: a holding worth $0 gives no rate and no growth', () => {
    const none = theAlternativesOutlook({ accounts: [] });
    expect([none.count, none.totalValue, none.expectedReturn, none.estimatedGrowthPerYear]).toEqual([0, 0, null, null]);
    const zero = theAlternativesOutlook({ accounts: [acct({ asset_id: 'c', kind: 'crypto', balance: 0 })] });
    expect([zero.count, zero.totalValue, zero.expectedReturn, zero.estimatedGrowthPerYear]).toEqual([1, 0, null, null]);
  });
});

describe('MK-NW-O-001 theBonds — its five cases', () => {
  test('easy 1 · a Treasury: face $10,000, worth $9,800, 5% coupon', () => {
    const b = theBonds({ accounts: [bond('t', 'Treasury', 10000, 0.05, 9800, '2028-10-05')], accountId: 't', today: TODAY });
    expect([b.totalValue, b.totalFace, b.couponPerYear]).toEqual([9800, 10000, 500]);
    expect(b.one!.currentYield).toBeCloseTo(0.0510, 4);
  });
  test('easy 2 · a bank CD: no rate-move figure', () => {
    const b = theBonds({ accounts: [bond('cd', 'Bank CD', 5000, 0.04, 5000, '2027-10-05')], accountId: 'cd', today: TODAY });
    expect([b.totalValue, b.totalFace, b.couponPerYear]).toEqual([5000, 5000, 200]);
    expect(b.one!.currentYield).toBeCloseTo(0.04, 9);
    expect(b.one!.ratesMove).toBeNull();                                   // REFUSES — a CD is not traded
  });
  test('complex 1 · two priced bonds and one worth nothing today: the yield is over the two', () => {
    const b = theBonds({ accounts: [bond('a', 'A', 15000, 0.04, 12000, '2030-01-01'), bond('b', 'B', 8000, 0.03, 8000, '2029-01-01'), bond('d', 'Defaulted', 5000, 0.05, 0, '2028-01-01')], today: TODAY });
    expect([b.totalValue, b.totalFace, b.couponPerYear]).toEqual([20000, 28000, 1090]);
    expect(b.avgYield).toBeCloseTo(0.042, 9);                              // (600 + 240) ÷ 20,000
  });
  test('complex 2 · a bond fund with no date, a CD and a Treasury: soonest first, undated last', () => {
    const b = theBonds({ accounts: [bond('f', 'Bond fund', 10000, 0.03, 10000, ''), bond('cd', 'CD', 5000, 0.04, 5000, '2027-01-15'), bond('t', 'Treasury', 10000, 0.04, 10000, '2026-11-01')], today: TODAY });
    expect(b.nextMaturity).toBe('2026-11-01');
    expect(b.rows.map((r) => r.label)).toEqual(['Treasury', 'CD', 'Bond fund']);
  });
  test('edge · a bond maturing today', () => {
    const b = theBonds({ accounts: [bond('a', 'A', 10000, 0.04, 10000, '2026-10-05')], accountId: 'a', today: TODAY });
    expect([b.one!.matured, b.one!.yieldToMaturity, b.one!.ratesMove]).toEqual([true, null, null]);
  });
  test('ITS ISSUE 1 · a zero-coupon bond and a bond with no maturity date', () => {
    const zero = theBonds({ accounts: [bond('z', 'Zero-coupon bond', 10000, 0, 8200, '2030-10-05')], accountId: 'z', today: TODAY });
    expect(zero.one!.yieldToMaturity).not.toBeNull();                       // (10,000 − 8,200) ÷ 4 years, over the average price
    expect(zero.one!.ratesMove).toBeNull();                                 // REFUSES — no coupon to reprice from
    const perpetual = theBonds({ accounts: [bond('p', 'Perpetual bond', 10000, 0.05, 9000, '')], accountId: 'p', today: TODAY });
    expect([perpetual.one!.yieldToMaturity, perpetual.one!.ratesMove, perpetual.one!.matured]).toEqual([null, null, false]);   // REFUSES both — no maturity
    expect(perpetual.one!.currentYield).toBeCloseTo(500 / 9000, 9);       // what it can say, it says
  });
  test('ITS ISSUE 9 · the rate-move figure reprices the bond at the new yield — it is not a straight line', () => {
    const b = theBonds({ accounts: [bond('t', 'Treasury', 10000, 0.04, 10000, '2036-10-05')], accountId: 't', today: TODAY });
    const { ratesUp, ratesDown } = b.one!.ratesMove!;
    expect(ratesUp.delta).toBeLessThan(0); expect(ratesDown.delta).toBeGreaterThan(0);
    expect(Math.abs(ratesDown.delta)).toBeGreaterThan(Math.abs(ratesUp.delta));   // a fall in rates gains more than a rise loses: the curve, not a line
  });
});

describe('MK-NW-O-004 theEmergencyFund — its five cases', () => {
  const cashAt = (balance: number) => acct({ kind: 'checking', tax_bucket: 'CASH', balance });
  const monthsBack = (m: number) => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() - m, 15).toISOString().slice(0, 10); };
  const logged = (monthly: number) => [1, 2, 3, 4, 5, 6].map((m) => ({ id: `e${m}`, date: monthsBack(m), amount: monthly, category: 'Groceries' }));
  test('easy 1 · $30,000 of cash, $5,000 a month of essentials', () => {
    const e = theEmergencyFund({ accounts: [cashAt(30000)], expenses: [], profile: { monthlySpending: 5000 }, debts: [] });
    expect([e.cash, e.fromCashMonthly, e.monthsCovered]).toEqual([30000, 5000, 6]);
  });
  test('easy 2 · a $500 car-loan minimum is a month’s need too', () => {
    const e = theEmergencyFund({ accounts: [cashAt(20000)], expenses: [], profile: { monthlySpending: 3000 }, debts: [debt('Car loan', 'AUTO', 12000, 500)] });
    expect(e.fromCashMonthly).toBe(3500);
    expect(e.monthsCovered).toBeCloseTo(5.7, 1);
  });
  test('complex 1 · essentials $4,000 logged, a $1,500 mortgage, $1,200 of rent coming in, $7,000 planned', () => {
    const e = theEmergencyFund({ accounts: [cashAt(25000), acct({ asset_id: 'h', kind: 'home', tax_bucket: 'PROPERTY', re_use: 'primary', balance: 400000 })], expenses: logged(4000),
      profile: { monthlySpending: 7000, taxMode: 'manual', manualTaxRate: '0', rentals: [{ type: 'long', income: '1200', expenses: '0', property_id: 'r' }] },   // names its property (DEC-4059d, 2026-10-10)
      debts: [debt('Home mortgage', 'MORTGAGE', 250000, 1500, { property_id: 'h' })] });
    expect(e.fromCashMonthly).toBe(4300);                                  // 4,000 + 1,500 − 1,200
    expect(e.monthsCovered).toBeCloseTo(5.8, 1);
    expect(e.monthsCoveredAtPlannedSpend).toBeCloseTo(3.4, 1);            // 25,000 ÷ (7,000 + 1,500 − 1,200)
  });
  test('complex 2 · a six-month target already met, and the months left after a $10,000 shock', () => {
    const e = theEmergencyFund({ accounts: [cashAt(40000)], expenses: [], profile: { monthlySpending: 6000 }, debts: [] });
    expect(e.targetFor(6)).toEqual({ target: 36000, gap: 0 });
    const after = theEmergencyFund({ accounts: [cashAt(40000)], expenses: [], profile: { monthlySpending: 6000 }, debts: [], cashOverride: 30000 });
    expect(after.monthsCovered).toBeCloseTo(5, 9);
  });
  test('edge, and ITS ISSUE 4 · rent of $3,500 against $3,000 of essentials: nothing is drawn from cash, and no months are shown', () => {
    const e = theEmergencyFund({ accounts: [cashAt(10000)], expenses: [], profile: { monthlySpending: 3000, taxMode: 'manual', manualTaxRate: '0', rentals: [{ type: 'long', income: '3500', expenses: '0', property_id: 'r' }] }, debts: [] });   // names its property (DEC-4059d, 2026-10-10)
    expect([e.fromCashMonthly, e.rentCoversEssentials, e.monthsCovered]).toEqual([0, true, null]);
  });
});

describe('MK-NW-O-006 theHolding — its five cases', () => {
  const hold = (lots: any[], price: number | null, extra: Record<string, any> = {}, transactions: any[] = [], now = TODAY) =>
    theHolding({ position: { position_id: 'p', ticker: 'ABC', lots, ...extra } as any, accountId: 'a', price, transactions, now, ...(extra.recentCloses ? { recentCloses: extra.recentCloses } : {}) });
  test('easy 1 · 100 shares bought at $50 two years ago, $70 today', () => {
    const h = hold([lot('1', 100, 50, '2024-10-05')], 70);
    expect([h.totalPaid, h.value, h.gain, h.returnOnCost]).toEqual([5000, 7000, 2000, 0.4]);
    expect([h.capitalGains!.longGain, h.capitalGains!.shortGain]).toEqual([2000, 0]);
  });
  test('easy 2 · two option contracts bought at $3.00 a share, $5.00 today', () => {
    const h = hold([lot('1', 2, 3, '2026-06-01')], 5, { kind: 'options' });
    expect([h.totalPaid, h.value, h.gain]).toEqual([600, 1000, 400]);
  });
  test('complex 1 · two lots, one held over a year and one not, $150 today', () => {
    const h = hold([lot('1', 50, 100, '2025-01-01'), lot('2', 50, 120, '2026-06-01')], 150);
    expect([h.capitalGains!.longGain, h.capitalGains!.shortGain, h.gain]).toEqual([2500, 1500, 4000]);
  });
  test('complex 2 · bought 100 at $10, sold 40 at $15; 60 left at $20, yesterday $18', () => {
    const h = hold([lot('1', 60, 10, '2026-01-05')], 20, { recentCloses: [18, 20] }, [
      { id: 'b', account_id: 'a', type: 'BUY', ticker: 'ABC', shares: 100, price: 10, amount: -1000, date: '2026-01-05' },
      { id: 's', account_id: 'a', type: 'SELL', ticker: 'ABC', shares: 40, price: 15, amount: 600, date: '2026-08-01' }]);
    expect([h.totalPaid, h.value, h.gain]).toEqual([600, 1200, 600]);
    expect(h.realised.realizedAllTime).toBe(200);
    expect(h.dayChange!.amount).toBeCloseTo(2, 9);                         // a share
    expect(h.dayChange!.share).toBeCloseTo(0.1111, 4);
  });
  test('edge · no price today', () => {
    const h = hold([lot('1', 100, 25, '2026-01-05')], null);
    expect([h.priced, h.value, h.gain, h.returnOnCost]).toEqual([false, 2500, null, null]);
  });
  test('ITS ISSUE 6 · the line between short and long term, on ordinary days and on 29 February', () => {
    const split = (bought: string, today: string) => { const h = hold([lot('1', 10, 100, bought)], 110, {}, [], new Date(`${today}T12:00:00`)); return h.capitalGains!.longGain! > 0 ? 'long' : 'short'; };
    expect(split('2025-10-05', '2026-10-05')).toBe('short');                // exactly one year is not more than one year
    expect(split('2025-10-05', '2026-10-06')).toBe('long');
    expect(split('2027-02-28', '2028-02-28')).toBe('short');
    expect(split('2027-02-28', '2028-02-29')).toBe('long');
    expect(split('2028-02-29', '2029-02-28')).toBe('short');                // the year after has no 29th: that day is the anniversary
    expect(split('2028-02-29', '2029-03-01')).toBe('long');                 // it read short until 2 March (fixed 2026-10-07)
  });
});

describe('MK-NW-O-003 theNetWorth — its five cases', () => {
  test('easy 1 · cash, stocks and a credit card', () => {
    const n = theNetWorth({ uid: 'u', accounts: [acct({ asset_id: 'c', kind: 'checking', tax_bucket: 'CASH', balance: 10000 }), acct({ asset_id: 's', kind: 'brokerage', asset_class: 'stocks_etf', balance: 50000 })], debts: [debt('Card', 'CREDIT_CARD', 5000, 150)] });
    expect([n.assets, n.debts, n.netWorth]).toEqual([60000, 5000, 55000]);
  });
  test('easy 2 · a property with its mortgage, and cash', () => {
    const n = theNetWorth({ uid: 'u', accounts: [acct({ asset_id: 'h', kind: 'home', tax_bucket: 'PROPERTY', balance: 500000 }), acct({ asset_id: 'c', kind: 'checking', tax_bucket: 'CASH', balance: 20000 })],
      debts: [debt('Home mortgage', 'MORTGAGE', 300000, 1800, { property_id: 'h' })] });
    expect([n.assets, n.debts, n.netWorth]).toEqual([520000, 300000, 220000]);
    expect(n.mortgageCheck.ok).toBe(true);
  });
  test('complex 1 · seven lines', () => {
    const n = theNetWorth({ uid: 'u', accounts: [
      acct({ asset_id: 'c', kind: 'checking', tax_bucket: 'CASH', balance: 15000 }), acct({ asset_id: 's', kind: 'brokerage', asset_class: 'stocks_etf', balance: 100000 }),
      acct({ asset_id: 'b', kind: 'fixed_income', asset_class: 'bonds', balance: 40000 }), acct({ asset_id: 'x', kind: 'crypto', balance: 25000 }),
      acct({ asset_id: 'h', kind: 'home', tax_bucket: 'PROPERTY', balance: 300000 })],
      debts: [debt('Home mortgage', 'MORTGAGE', 200000, 1000, { property_id: 'h' }), debt('Car loan', 'AUTO', 15000, 550)] });
    expect([n.assets, n.debts, n.netWorth, n.investable, n.monthlyDebtMinimum]).toEqual([480000, 215000, 265000, 180000, 1550]);
  });
  test('complex 2 · the time-weighted return: $10,000 grows to $10,500, $500 is paid in, it grows to $11,550', () => {
    const days = [recordedDay('2026-09-05', [['b', 10000]]), recordedDay('2026-09-15', [['b', 11000]]), recordedDay('2026-10-05', [['b', 11550]])];
    const n = theNetWorth({ uid: 'u', accounts: [acct({ asset_id: 'b', kind: 'brokerage', asset_class: 'stocks_etf', balance: 11550 })], debts: [],
      snapshotDays: days, transactions: [{ id: 'd', account_id: 'b', type: 'DEPOSIT', amount: 500, date: '2026-09-15' }], since: '2026-09-05', today: '2026-10-05' } as any);
    expect(n.investableChangePct).toBeCloseTo(0.1025, 9);                  // 1.05 × 1.05 − 1
  });
  test('edge · nothing entered', () => {
    const n = theNetWorth({ uid: 'u', accounts: [], debts: [] });
    expect([n.assets, n.debts, n.netWorth]).toEqual([0, 0, 0]);
  });
  test('ITS ISSUE 3 · a start of $0, and a start below $0: no division, no breakdown', () => {
    const ask = (days: any[], flows: any[]) => timeWeightedReturn({ days, accountIds: new Set(['b']), flows, start: '2026-09-05', end: '2026-10-05' });
    // an empty account that money then arrives in: measured from the day it held something
    const fromNothing = ask([recordedDay('2026-09-05', [['b', 0, 'cash']]), recordedDay('2026-09-15', [['b', 10000]]), recordedDay('2026-10-05', [['b', 11000]])], [{ date: '2026-09-15', accountId: 'b', amount: 10000 }]);
    expect(fromNothing.rate).toBeCloseTo(0.10, 9);
    expect(fromNothing.measuredFrom).toBe('2026-09-15');
    // a margin debit at the start: no figure, with the reason named — never a number
    const belowZero = ask([recordedDay('2026-09-05', [['b', -2000, 'cash']]), recordedDay('2026-10-05', [['b', 1000, 'cash']])], []);
    expect(belowZero.rate).toBeNull();
    expect(belowZero.refused).toBeTruthy();
  });
});

describe('ITS ISSUES 7 AND 8 — on functions it named by ids that are not theirs', () => {
  test('7 · the 2026 standard deduction is the IRS figure ($16,100 single, $32,200 married)', () => {
    expect(STANDARD_DEDUCTION).toBe(16100);
    expect(TAX_TABLES.married.deduction).toBe(32200);
  });
  test('8 · two mortgages with the same balance and no property named: neither is guessed onto a property; both are flagged', () => {
    const accounts = [acct({ asset_id: 'h1', label: 'Lake house', kind: 'real_estate', tax_bucket: 'PROPERTY', re_use: 'secondary', balance: 400000 }), acct({ asset_id: 'h2', label: 'Home', kind: 'real_estate', tax_bucket: 'PROPERTY', re_use: 'primary', balance: 600000 })];
    const m = mortgagesByProperty(accounts, [debt('Chase', 'MORTGAGE', 250000, 1500), debt('Wells', 'MORTGAGE', 250000, 1500)]);
    expect(m.ok).toBe(false);
    expect(m.unmatched.map((u) => u.label).sort()).toEqual(['Chase', 'Wells']);
    expect(m.byProperty.filter((p) => p.mortgageId).length).toBe(0);
    // named by id, it is placed, whatever the balances
    const placed = mortgagesByProperty(accounts, [debt('Chase', 'MORTGAGE', 250000, 1500, { property_id: 'h1' }), debt('Wells', 'MORTGAGE', 250000, 1500, { property_id: 'h2' })]);
    expect([placed.ok, placed.unmatched.length]).toEqual([true, 0]);
  });
});
