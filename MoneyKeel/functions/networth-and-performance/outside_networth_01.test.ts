/* THE OUTSIDE CASES, RUN AGAINST THE APP — batch "networth 01", written by Claude from the cards alone.
 *
 * Source, unchanged: MoneyKeel/documents/audit/outside-test-cases/returned/moneykeel_networth01_claude.json.
 * Every expected number below is the outside model's, copied as it wrote it; only its plain input names
 * are mapped onto the app's. A case the app fails is a finding, fixed in the function — never by
 * changing the number here.
 */
import { theBonds } from './bonds';
import { theAccount } from './account';
import { theNetWorth } from './net-worth';
import { theEmergencyFund } from './emergency-fund';
import { theAlternativesOutlook } from './alternatives-outlook';
import { theHolding } from './holding';
import { benchmarkReturn, assetAllocation } from '../../../src/domain/assets';

const TODAY = new Date('2026-10-04T12:00:00');
const bond = (id: string, label: string, face: number, rate: number, value: number | null, maturity: string, extra: Record<string, any> = {}) =>
  ({ asset_id: id, label, kind: 'bond', tax_bucket: 'TAXABLE', balance: value ?? 0, face_value: face, coupon_rate: rate, maturity_date: maturity, ...extra }) as any;

describe('MK-NW-O-001 theBonds — five cases', () => {
  test('easy · one Treasury bought at par', () => {
    const b = theBonds({ accounts: [bond('t', 'US Treasury note', 10000, 0.04, 10000, '2028-10-04', { accrued_interest: 0 })], accountId: 't', today: TODAY });
    expect(b.count).toBe(1);
    expect(b.totalValue).toBeCloseTo(10000, 4);
    expect(b.totalFace).toBeCloseTo(10000, 4);
    expect(b.couponPerYear).toBeCloseTo(400, 4);
    expect(b.avgYield).toBeCloseTo(0.04, 6);
    expect(b.nextMaturity).toBe('2028-10-04');
    expect(b.one!.matured).toBe(false);
  });

  test('easy · a CD opened on its own page: interest given, no rate-move figure', () => {
    const b = theBonds({ accounts: [bond('cd', 'Bank CD', 5000, 0.05, 5000, '2027-04-04')], accountId: 'cd', today: TODAY });
    expect(b.one!.couponPerYear).toBeCloseTo(250, 4);
    expect(b.one!.currentYield).toBeCloseTo(0.05, 6);
    expect(b.one!.matured).toBe(false);
    expect(b.one!.ratesMove).toBeNull();                                   // REFUSES — a CD is not traded
    expect(b.one!.ratesMoveRefusal).toMatch(/not traded/);
  });

  test('complex · three bonds bought at different prices: rows sorted, rows add to the totals', () => {
    const b = theBonds({ accounts: [
      bond('a', 'A', 25000, 0.045, 24200, '2031-06-15', { accrued_interest: 0 }),
      bond('b', 'B', 15000, 0.0525, 14637.5, '2028-02-01', { accrued_interest: 0 }),
      bond('c', 'C', 8000, 0.041, 8213.47, '2027-11-30', { accrued_interest: 0 })], today: TODAY });
    expect(b.rows.map((r) => r.label)).toEqual(['C', 'B', 'A']);
    expect(b.rows.map((r) => [r.value, r.couponPerYear])).toEqual([[8213.47, 328], [14637.5, 787.5], [24200, 1125]].map(([v, c]) => [v, expect.closeTo(c, 6)]));
    expect(b.count).toBe(3);
    expect(b.totalValue).toBeCloseTo(47050.97, 4);
    expect(b.rows.reduce((t, r) => t + r.value, 0)).toBeCloseTo(b.totalValue, 6);              // the rows add to the total
    expect(b.totalFace).toBeCloseTo(48000, 4);
    expect(b.couponPerYear).toBeCloseTo(2240.5, 4);
    expect(b.rows.reduce((t, r) => t + r.couponPerYear, 0)).toBeCloseTo(b.couponPerYear, 6);
    expect(b.avgYield).toBeCloseTo(0.047619, 5);
    expect(b.nextMaturity).toBe('2027-11-30');
  });

  test('complex · one bond unpriced, one carrying known accrued interest, one CD', () => {
    const b = theBonds({ accounts: [
      bond('a', 'A', 20000, 0.03875, 19412.6, '2029-08-15', { accrued_interest: 150, source: 'connected' }),
      bond('b', 'B', 12500, 0.037, null, '2030-05-15'),
      bond('cd', 'Bank CD', 5000, 0.05, 5000, '2027-03-01')], today: TODAY });
    expect(b.couponPerYear).toBeCloseTo(1487.5, 4);
    expect(b.avgYield).toBeCloseTo(0.042246, 5);                           // the formula as sent gave 6.09%
    expect(b.nextMaturity).toBe('2027-03-01');
    expect(b.rows.find((r) => r.label === 'A')!.currentYield).toBeCloseTo(0.040231, 5);
    expect(b.rows.find((r) => r.label === 'B')!.currentYield).toBeNull();  // REFUSES — no value today to divide by
  });

  test('edge · a bond maturing exactly today', () => {
    const accounts = [bond('a', 'A', 10000, 0.04, 10000, '2026-10-04', { accrued_interest: 0 }), bond('b', 'B', 5000, 0.03, 4950, '2027-01-15', { accrued_interest: 0 })];
    const b = theBonds({ accounts, accountId: 'a', today: TODAY });
    expect(b.one!.matured).toBe(true);
    expect(b.one!.yieldToMaturity).toBeNull();                             // REFUSES — matured
    expect(b.one!.ratesMove).toBeNull();                                   // REFUSES — matured
    expect(b.nextMaturity).toBe('2027-01-15');                             // its reading 1: one bond cannot be both matured and next to mature
    // the same answer at any hour of the day — the rule is about the date, not the clock
    for (const hour of ['00:00:00', '09:30:00', '23:59:59']) {
      const at = theBonds({ accounts, accountId: 'a', today: new Date(`2026-10-04T${hour}`) });
      expect([at.one!.matured, at.nextMaturity]).toEqual([true, '2027-01-15']);
    }
  });

  // ── what the same review pointed at beside its five cases ──
  test('its observation · a $10,000 bond: the rate-move band is not the same figure both ways', () => {
    const b = theBonds({ accounts: [bond('t', 'US Treasury note', 10000, 0.04, 10000, '2031-10-04', { accrued_interest: 0 })], accountId: 't', today: TODAY });
    const { ratesUp, ratesDown } = b.one!.ratesMove!;
    expect(ratesUp.high).toBeLessThan(ratesDown.low);                      // it read $10,000–$10,000 both ways
    expect(ratesUp.low).toBeLessThan(ratesUp.high);
    expect(ratesUp.delta).toBeLessThan(0); expect(ratesDown.delta).toBeGreaterThan(0);
  });
  test('found fixing it · a bond with no maturity date has not matured — it is unknown', () => {
    const b = theBonds({ accounts: [bond('u', 'Undated bond', 10000, 0.04, 10000, '')], accountId: 'u', today: TODAY });
    expect(b.one!.matured).toBe(false);
    expect(b.nextMaturity).toBeNull();
  });
});

describe('MK-NW-O-002 theAccount — five cases', () => {
  const lot = (shares: number, price: number) => [{ lot_id: 'l', shares, cost_per_share: price, purchase_date: '2025-01-02' }];
  test('easy · a hand-entered account with one dividend and one interest payment', () => {
    const account: any = { asset_id: 'a', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 50000,
      positions: [{ position_id: 'p', ticker: 'VTI', lots: lot(10, 250) }] };
    const a = theAccount({ account, transactions: [
      { id: '1', account_id: 'a', type: 'DIVIDEND', ticker: 'VTI', amount: 120, date: '2026-09-01' },
      { id: '2', account_id: 'a', type: 'INTEREST', amount: 30, date: '2026-09-02' }] });
    expect(a.marketValue).toBeCloseTo(50000, 4);
    expect(a.income).toBeCloseTo(150, 4);
    expect(a.inside).toBeNull();                                           // not linked — the itemise door is shown
    expect(a.activityCount).toBe(2);
    expect(a.incomeOfHolding('VTI').dividends).toBeCloseTo(120, 4);
  });

  test('easy · what each record moved, with its sign', () => {
    const account: any = { asset_id: 'a', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 10000 };
    const a = theAccount({ account, transactions: [
      { id: '1', account_id: 'other', counter_account_id: 'a', type: 'TRANSFER', amount: 5000, date: '2026-09-01', source: 'manual' },
      { id: '2', account_id: 'a', type: 'WITHDRAWAL', amount: 1200, date: '2026-09-02', source: 'manual' },
      { id: '3', account_id: 'a', type: 'BUY', ticker: 'VTI', shares: 20, price: 100, date: '2026-09-03', source: 'connected' }] });
    expect(a.activityCount).toBe(3);
    expect(a.activity.map((r) => r.amount)).toEqual([5000, -1200, -2000]);
    expect(a.activity.map((r) => r.mine)).toEqual([true, true, false]);
  });

  test('complex · a linked account holding cash, stocks and a Treasury, with a small gap to the broker balance', () => {
    const account: any = { asset_id: 'v', label: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', source: 'connected', balance: 186442.19, cash_balance: 1213.62,
      positions: [
        { position_id: 'p1', ticker: 'VTI', last_price: 301.18, lots: lot(412, 200) },
        { position_id: 'p2', ticker: '', name: 'Treasury bill', last_price: 23915.08, lots: lot(1, 23000) },
        { position_id: 'p3', ticker: 'COST', last_price: 1006.1, lots: lot(37, 800) }] };
    const a = theAccount({ account, transactions: [
      { id: '1', account_id: 'v', type: 'DIVIDEND', ticker: 'VTI', amount: 486.12, date: '2026-09-01' },
      { id: '2', account_id: 'v', type: 'INTEREST', amount: 71.4, date: '2026-09-02' },
      { id: '3', account_id: 'v', type: 'DIVIDEND', ticker: 'cost', amount: 134.85, date: '2026-09-03' }] });
    expect(a.marketValue).toBeCloseTo(186442.19, 4);
    const inside = Object.fromEntries(a.inside!.map((r) => [r.key, r.value]));
    expect(inside.stocks_etf).toBeCloseTo(161311.86, 2);
    expect(inside.bonds).toBeCloseTo(23915.08, 2);
    expect(inside.cash).toBeCloseTo(1215.25, 2);                           // its cash, and the $1.63 the holdings do not explain
    expect(a.inside!.reduce((t, r) => t + r.value, 0)).toBeCloseTo(a.marketValue, 2);   // the inside adds to the market value
    expect(a.income).toBeCloseTo(692.37, 4);
    expect(a.incomeOfHolding('VTI').dividends).toBeCloseTo(486.12, 4);
    expect(a.incomeOfHolding('COST').dividends).toBeCloseTo(134.85, 4);     // the record says "cost"
  });

  test('complex · two CDs paying untickered interest, plus a typed deposit alongside broker records', () => {
    const account: any = { asset_id: 'a', label: 'Bank', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 30500,
      positions: [{ position_id: 'c1', name: 'CD 1', lots: lot(1, 15000) }, { position_id: 'c2', name: 'CD 2', lots: lot(1, 15000) }] };
    const a = theAccount({ account, transactions: [
      { id: '1', account_id: 'a', type: 'INTEREST', amount: 210, date: '2026-09-01', source: 'connected' },
      { id: '2', account_id: 'a', type: 'INTEREST', amount: 187.5, date: '2026-09-02', source: 'connected' },
      { id: '3', account_id: 'other', counter_account_id: 'a', type: 'TRANSFER', amount: 500, date: '2026-09-03', source: 'manual' },
      { id: '4', account_id: 'a', type: 'TRANSFER', amount: 2000, date: '2026-09-04', source: 'connected' }] });
    expect(a.marketValue).toBeCloseTo(30500, 4);
    expect(a.income).toBeCloseTo(397.5, 4);
    expect(a.incomeOfHolding(null).words).toBe('');                        // no line — no record names it
    expect(a.incomeOfHolding(undefined).words).toBe('');
    expect(a.activityCount).toBe(4);
    expect(a.activity.map((r) => r.amount)).toEqual([210, 187.5, 500, -2000]);
    expect(a.activity.map((r) => r.mine)).toEqual([false, false, true, false]);
  });

  test('edge · a new account with no records at all', () => {
    const a = theAccount({ account: { asset_id: 'n', label: 'New', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 2000 } as any, transactions: [] });
    expect(a.marketValue).toBeCloseTo(2000, 4);
    expect(a.income).toBeNull();                                           // REFUSES — no records; it says so instead of $0
    expect(a.activityCount).toBe(0);
  });

  test('its second finding · a broker record with a stray space still finds its holding', () => {
    const a = theAccount({ account: { asset_id: 'a', label: 'B', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 100 } as any,
      transactions: [{ id: '1', account_id: 'a', type: 'DIVIDEND', ticker: 'VTI ', amount: 12, date: '2026-09-01' }] });
    expect(a.incomeOfHolding('vti').dividends).toBeCloseTo(12, 4);
  });
});

describe('MK-NW-O-003 theNetWorth — five cases', () => {
  const debt = (id: string, label: string, type: string, balance: number, minimum: number | null, extra: Record<string, any> = {}) =>
    ({ debt_id: id, label, debt_type: type, remaining_balance: balance, interest_rate_apr: 0.05, minimum_monthly_payment: minimum ?? 0, ...extra }) as any;
  test('easy · checking account and a home with a mortgage', () => {
    const n = theNetWorth({ uid: 'u', accounts: [
      { asset_id: 'c', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 10000 },
      { asset_id: 'h', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 300000 }] as any,
      debts: [debt('m', 'Mortgage', 'MORTGAGE', 250000, 1500)] });
    expect(n.assets).toBeCloseTo(310000, 4);
    expect(n.debts).toBeCloseTo(250000, 4);
    expect(n.netWorth).toBeCloseTo(60000, 4);
    expect(n.cash).toBeCloseTo(10000, 4);
    expect(n.investments).toBeCloseTo(0, 4);
    expect(n.investable).toBeCloseTo(10000, 4);
  });

  test('easy · owes more than owns — negative net worth shown, not floored', () => {
    const n = theNetWorth({ uid: 'u', accounts: [
      { asset_id: 's', label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: 5000 },
      { asset_id: 'v', label: 'Car', kind: 'vehicle', tax_bucket: 'PROPERTY', balance: 18000 }] as any,
      debts: [debt('c', 'Car loan', 'AUTO', 22000, 455), debt('s', 'Student loan', 'STUDENT_LOAN', 30000, 312)] });
    expect(n.assets).toBeCloseTo(23000, 4);
    expect(n.debts).toBeCloseTo(52000, 4);
    expect(n.netWorth).toBeCloseTo(-29000, 4);
    expect(n.monthlyDebtMinimum).toBeCloseTo(767, 4);
  });

  test('complex · the approved drawing, state A, exactly as drawn', () => {
    const n = theNetWorth({ uid: 'u', accounts: [
      { asset_id: 'c', label: 'Chase Checking', kind: 'checking', tax_bucket: 'CASH', balance: 8000 },
      { asset_id: 'v', label: 'Vanguard Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', source: 'connected', balance: 349333, cash_balance: 838,
        positions: [{ position_id: 'p', ticker: 'VTI', last_price: 348495, lots: [{ lot_id: 'l', shares: 1, cost_per_share: 300000, purchase_date: '2024-01-02' }] }] },
      { asset_id: 'e', label: 'E*TRADE bonds and CDs', kind: 'bond', tax_bucket: 'TAXABLE', balance: 5819 },
      { asset_id: 'h', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 450000 }] as any,
      debts: [debt('m', 'Home mortgage', 'MORTGAGE', 412000, 2500), debt('v', 'Chase Visa', 'CREDIT_CARD', 6000, 120)] });
    expect(n.cash).toBeCloseTo(8838, 4);
    expect(n.investments).toBeCloseTo(354314, 4);                          // the formula as sent gave $355,152 — the $838 twice
    expect(n.assets).toBeCloseTo(813152, 4);
    expect(n.cash + n.investments + 450000).toBeCloseTo(n.assets, 4);      // the parts add to What you own
    expect(n.debts).toBeCloseTo(418000, 4);
    expect(n.netWorth).toBeCloseTo(395152, 4);
    expect(n.investable).toBeCloseTo(363152, 4);
  });

  test('complex · three kinds of debt — the rows, and the minimum that is owed', () => {
    const n = theNetWorth({ uid: 'u', accounts: [{ asset_id: 'c', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 1000 }] as any,
      debts: [debt('m', 'mortgage', 'MORTGAGE', 318400, 2140), debt('c', 'credit card', 'CREDIT_CARD', 1912.33, 85), debt('f', 'family loan', 'OTHER', 8000, null)] });
    expect(n.debts).toBeCloseTo(328312.33, 4);
    expect(n.debtLines.map((d) => [d.label, d.balance])).toEqual([['mortgage', 318400], ['credit card', 1912.33], ['family loan', 8000]]);
    expect(n.monthlyDebtMinimum).toBeCloseTo(2225, 4);
  });

  // THE RETURN, time-weighted (owner decision 2026-10-04, in the note returned with this file: "All
  // return should be True Weighted Return and not Dietz return."). Its "recorded cash + investments"
  // is drawn here as a brokerage account and a savings account that add to its totals on each day.
  const recordedDay = (date: string, brokerage: number, savings: number) => ({
    date, origin: 'observed', writtenAt: `${date}T00:00:00Z`,
    holdings: [{ date, accountId: 'b', securityKey: 'VTI', units: 1, price: brokerage, value: brokerage, currency: 'USD' }],
    accounts: [{ date, accountId: 'b', cash: 0, statedTotal: null, currency: 'USD' }, { date, accountId: 's', cash: savings, statedTotal: null, currency: 'USD' }],
  });
  const household = (brokerage: number, savings: number) => [
    { asset_id: 'b', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: brokerage,
      positions: [{ position_id: 'p', ticker: 'VTI', last_price: brokerage, lots: [{ lot_id: 'l', shares: 1, cost_per_share: 100000, purchase_date: '2024-01-02' }] }] },
    { asset_id: 's', label: 'Savings', kind: 'savings', tax_bucket: 'CASH', balance: savings }] as any;

  test('complex · the return on cash + investments with a large deposit mid-year: 10.97%, not 42.32%', () => {
    // $200,000 on 2025-10-04; $212,400 just before a $60,000 deposit on 2026-04-15; $284,630 on 2026-10-04
    for (const where of ['paid into the brokerage', 'paid into savings'] as const) {
      const intoBrokerage = where === 'paid into the brokerage';
      const n = theNetWorth({
        uid: 'u', debts: [], since: '2025-10-04', today: '2026-10-04',
        accounts: intoBrokerage ? household(264630, 20000) : household(204630, 80000),
        snapshotDays: [recordedDay('2025-10-04', 180000, 20000),
          intoBrokerage ? recordedDay('2026-04-15', 252400, 20000) : recordedDay('2026-04-15', 192400, 80000)],
        // the inheritance is a recorded deposit when it lands in the brokerage; in savings, the balance itself shows it
        transactions: intoBrokerage ? [{ id: 'd', type: 'DEPOSIT', account_id: 'b', amount: 60000, date: '2026-04-15' }] : [],
      });
      expect(n.investable).toBeCloseTo(284630, 4);
      expect(n.investableChangePct).toBeCloseTo(0.109681, 6);              // its figure: 1.062000 × 1.0448972 − 1
      expect(n.investableChangePct).not.toBeCloseTo(0.42315, 3);           // what the formula as sent gave
    }
  });

  test('edge · comparison day before the record begins: no figure, never a made-up change', () => {
    // the record begins 2026-03-01 at $142,000; today $151,300; the person compares from 2026-01-01
    const n = theNetWorth({ uid: 'u', debts: [], since: '2026-01-01', today: '2026-10-04', accounts: household(131300, 20000),
      snapshotDays: [recordedDay('2026-03-01', 122000, 20000)], transactions: [] });
    expect(n.investable).toBeCloseTo(151300, 4);
    expect(n.investableChangePct).toBeNull();                              // REFUSES — the record does not reach back
    // the same record compared from its own first day does answer, so the refusal is about the DAY
    const from = theNetWorth({ uid: 'u', debts: [], since: '2026-03-01', today: '2026-10-04', accounts: household(131300, 20000),
      snapshotDays: [recordedDay('2026-03-01', 122000, 20000)], transactions: [] });
    expect(from.investableChangePct).toBeCloseTo(151300 / 142000 - 1, 8);
  });
});

describe('MK-NW-O-004 theEmergencyFund — five cases', () => {
  const cashAt = (id: string, kind: string, balance: number) => ({ asset_id: id, label: id, kind, tax_bucket: 'CASH', balance }) as any;
  const debt = (label: string, type: string, minimum: number) => ({ debt_id: label, label, debt_type: type, remaining_balance: 10000, interest_rate_apr: 0.05, minimum_monthly_payment: minimum }) as any;
  const monthsBack = (m: number) => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() - m, 15).toISOString().slice(0, 10); };

  test('easy · cash and a planned essentials figure, no debts', () => {
    const e = theEmergencyFund({ accounts: [cashAt('c', 'checking', 30000)], expenses: [], profile: { monthlySpending: 5000 }, debts: [] });
    expect(e.essentialsMonthly).toBeCloseTo(5000, 4);
    expect(e.monthsCovered).toBeCloseTo(6, 6);
    expect(e.essentialsBasis).toBe('you entered');                         // the plan, not a logged average
  });

  test('easy · what a six-month target costs and how far off it is', () => {
    const e = theEmergencyFund({ accounts: [cashAt('c', 'checking', 12000)], expenses: [], profile: { monthlySpending: 4000 }, debts: [] });
    expect(e.targetFor(6)).toEqual({ target: 24000, gap: 12000 });
    expect(e.monthsCovered).toBeCloseTo(3, 6);
  });

  test('complex · cash in three places, a CD and a money-market fund that are not cash, three debts, a mortgage budgeted $100 light', () => {
    const e = theEmergencyFund({
      accounts: [cashAt('chk', 'checking', 9412.55), cashAt('hysa', 'hysa', 31200),
        { asset_id: 'brk', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', source: 'connected', balance: 51846.2, cash_balance: 1846.2,
          positions: [{ position_id: 'p', ticker: 'VTI', last_price: 50000, lots: [{ lot_id: 'l', shares: 1, cost_per_share: 40000, purchase_date: '2024-01-02' }] }] },
        { asset_id: 'cd', label: 'Bank CD', kind: 'cd', tax_bucket: 'CASH', balance: 10000 },
        { asset_id: 'mm', label: 'Money market fund', kind: 'money_market', tax_bucket: 'CASH', balance: 6500 },
        { asset_id: 'home', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 400000 }] as any,
      expenses: [1, 2, 3, 4].map((m) => ({ id: `e${m}`, date: monthsBack(m), amount: 4100, category: 'Groceries' })),
      profile: { spendCats: [{ id: 'rent', label: 'Rent / Mortgage', amount: 2300, bucket: 'fixed', tier: 'critical' }, { id: 'other', label: 'Everything else', amount: 3550, bucket: 'flexible' }] },
      debts: [debt('car loan', 'AUTO', 412.37), debt('credit card', 'CREDIT_CARD', 95), debt('home mortgage', 'MORTGAGE', 2400)],
    });
    expect(e.cash).toBeCloseTo(42458.75, 4);                               // the CD and the money-market fund are not cash (DEC-0051)
    expect(e.debtMinimums).toBeCloseTo(507.37, 4);                         // the home mortgage is left out: the budget carries it
    expect(e.essentialsMonthly).toBeCloseTo(4607.37, 4);
    expect(e.monthsCovered).toBeCloseTo(9.215398, 5);
    expect(e.plannedSpendMonthly).toBeCloseTo(6357.37, 4);
    expect(e.monthsCoveredAtPlannedSpend).toBeCloseTo(6.678666, 5);
    expect(e.housingDisagreement).toEqual({ budgeted: 2300, owed: 2400, difference: 100 });
    expect(e.targetFor(6)!.target).toBeCloseTo(27644.22, 4);
    expect(e.targetFor(6)!.gap).toBe(0);
    const hit = e.afterAShock(10000);
    expect(hit.cashAfter).toBeCloseTo(32458.75, 4);
    expect(hit.monthsAfter).toBeCloseTo(7.044963, 5);
    expect(hit.coversIt).toBe(true);
  });

  test('complex · a renter who also owes a mortgage on a rental house', () => {
    const e = theEmergencyFund({
      accounts: [cashAt('chk', 'checking', 6140.88), cashAt('sav', 'savings', 14700),
        { asset_id: 'rental', label: 'Rental house', kind: 'home', tax_bucket: 'PROPERTY', re_use: 'rental', balance: 310000 }] as any,
      expenses: [[1, 3512.44], [2, 3498.02], [3, 3566.54]].map(([m, amount]) => ({ id: `e${m}`, date: monthsBack(m), amount, category: 'Groceries' })),
      profile: { spendCats: [{ id: 'rent', label: 'Rent / Mortgage', amount: 2200, bucket: 'fixed', tier: 'critical' }] },
      debts: [debt('rental-house mortgage', 'MORTGAGE', 1980), debt('car loan', 'AUTO', 254.5)],
    });
    expect(e.cash).toBeCloseTo(20840.88, 4);
    expect(e.debtMinimums).toBeCloseTo(2234.5, 4);                         // the formula as sent gave $254.50 — the mortgage dropped
    expect(e.essentialsMonthly).toBeCloseTo(5760.1667, 3);
    expect(e.monthsCovered).toBeCloseTo(3.618104, 5);                      // it read 5.5 months — 1.9 too long
    expect(e.housingDisagreement).toBeNull();                              // their rent is not compared with another property's mortgage
  });

  test('edge · cash but nothing logged, no plan and no debts entered', () => {
    const e = theEmergencyFund({ accounts: [cashAt('c', 'checking', 8000)], expenses: [], profile: {} });
    expect(e.cash).toBeCloseTo(8000, 4);
    expect(e.monthsCovered).toBeNull();                                    // REFUSES — no essentials figure
    expect(e.monthsCoveredAtPlannedSpend).toBeNull();
    expect(e.targetFor(6)).toBeNull();                                     // REFUSES — it read a target of $0
    expect(e.afterAShock(1000).monthsAfter).toBeNull();
  });
});

describe('MK-NW-O-005 theAlternativesOutlook — five cases', () => {
  const acct = (label: string, kind: string, balance: number, extra: Record<string, any> = {}) =>
    ({ asset_id: label, label, kind, tax_bucket: 'TAXABLE', balance, ...extra }) as any;
  const rCrypto = benchmarkReturn('crypto'), rGold = benchmarkReturn('commodities');

  test('easy · one crypto holding', () => {
    const o = theAlternativesOutlook({ accounts: [acct('crypto', 'crypto', 10000)] });
    expect(o.count).toBe(1);
    expect(o.totalValue).toBeCloseTo(10000, 4);
    expect(o.expectedReturn).toBeCloseTo(rCrypto, 9);
    expect(o.estimatedGrowthPerYear).toBeCloseTo(10000 * rCrypto, 6);
    expect(o.rows.map((r) => [r.label, r.value])).toEqual([['crypto', 10000]]);
  });

  test('easy · weighted by value, not an average of rates', () => {
    const o = theAlternativesOutlook({ accounts: [acct('c', 'crypto', 28000), acct('g', 'commodities', 500)] });
    expect(o.totalValue).toBeCloseTo(28500, 4);
    expect(28000 / 28500).toBeCloseTo(0.982456, 6);
    expect(o.expectedReturn).toBeCloseTo((28000 / 28500) * rCrypto + (500 / 28500) * rGold, 9);
  });

  test('complex · a fund the person classed as an alternative, and a crypto-kind account they classed as stocks', () => {
    const accounts = [acct('Coinbase', 'crypto', 14382.77), acct('RE fund', 'stocks_etf', 8640.15, { asset_class: 'alternatives' }),
      acct('Bitcoin ETF', 'crypto', 3905.4, { asset_class: 'stocks_etf' })];
    const o = theAlternativesOutlook({ accounts });
    expect(o.count).toBe(2);
    expect(o.rows.map((r) => [r.label, r.value])).toEqual([['Coinbase', 14382.77], ['RE fund', 8640.15]]);
    expect(o.totalValue).toBeCloseTo(23022.92, 4);                         // the formula as sent gave $18,288 above rows adding to $23,023
    expect(o.rows.reduce((t, r) => t + r.value, 0)).toBeCloseTo(o.totalValue, 6);
    expect(assetAllocation(accounts).alternatives).toBeCloseTo(o.totalValue, 6);   // the same total as the Net worth tab's Alternatives slice
  });

  test('complex · crypto linked, gold typed in, an annuity with a maturity date, and a house', () => {
    const accounts = [acct('Coinbase', 'crypto', 21906.48, { source: 'connected' }), acct('Gold', 'commodities', 4310),
      acct('Annuity', 'annuities', 1455, { maturity_date: '2034-01-01' }), acct('Home', 'home', 610000, { tax_bucket: 'PROPERTY' })];
    const o = theAlternativesOutlook({ accounts });
    expect(o.count).toBe(2);
    expect(o.rows.map((r) => [r.label, r.value])).toEqual([['Coinbase', 21906.48], ['Gold', 4310]]);
    expect(o.totalValue).toBeCloseTo(26216.48, 4);
    expect(o.rows.reduce((t, r) => t + r.value, 0)).toBeCloseTo(o.totalValue, 6);
    expect(21906.48 / 26216.48).toBeCloseTo(0.8356, 4);
    expect(o.expectedReturn).toBeCloseTo((21906.48 * rCrypto + 4310 * rGold) / 26216.48, 9);
  });

  test('edge · no alternatives held', () => {
    const o = theAlternativesOutlook({ accounts: [acct('Checking', 'checking', 5000, { tax_bucket: 'CASH' }), acct('Stocks', 'stocks_etf', 40000)] });
    expect(o.count).toBe(0);
    expect(o.totalValue).toBe(0);
    expect(o.expectedReturn).toBeNull();                                   // REFUSES — a 0.00% reads as a forecast
    expect(o.estimatedGrowthPerYear).toBeNull();
    expect(o.rows).toEqual([]);
  });
});

describe('MK-NW-O-006 theHolding — five cases', () => {
  const lot = (id: string, shares: number, cost: number, date: string) => ({ lot_id: id, shares, cost_per_share: cost, purchase_date: date });
  test('easy · one purchase, priced today', () => {
    const h = theHolding({ position: { position_id: 'p', ticker: 'ABC', lots: [lot('1', 100, 50, '2024-01-02')] } as any, accountId: 'a', price: 60, transactions: [], now: TODAY });
    expect(h.shares).toBe(100);
    expect(h.totalPaid).toBeCloseTo(5000, 4);
    expect(h.avgPaidPerShare).toBeCloseTo(50, 6);
    expect(h.value).toBeCloseTo(6000, 4);
    expect(h.gain).toBeCloseTo(1000, 4);
    expect(h.returnOnCost).toBeCloseTo(0.2, 9);
  });

  test('easy · no price today', () => {
    const h = theHolding({ position: { position_id: 'p', ticker: 'ABC', lots: [lot('1', 20, 150, '2024-01-02')] } as any, accountId: 'a', price: null, transactions: [], now: TODAY });
    expect(h.value).toBeCloseTo(3000, 4);                                  // what you paid
    expect(h.priced).toBe(false);
    expect(h.gain).toBeNull();                                             // REFUSES — no price
    expect(h.returnOnCost).toBeNull();
    expect(h.capitalGains).toBeNull();
  });

  test('complex · three purchases across two years, fractional shares, dividends in and out of the 12-month window', () => {
    const div = (id: string, amount: number, date: string, ticker: string | null = 'ABC') => ({ id, account_id: 'a', type: 'DIVIDEND', ticker, amount, date });
    const h = theHolding({
      position: { position_id: 'p', ticker: 'ABC', lots: [lot('1', 37.5, 251.18, '2024-03-12'), lot('2', 12.25, 318.44, '2026-02-20'), lot('3', 8.4, 329.07, '2026-08-05')] } as any,
      accountId: 'a', price: 334.62, now: TODAY, recentCloses: [331.9, 334.62],
      transactions: [div('1', 35.1, '2025-09-18'), div('2', 41.27, '2025-12-18'), div('3', 38.9, '2026-03-19'), div('4', 44.12, '2026-06-18'), div('5', 47.6, '2026-09-17'),
        div('6', 112.35, '2026-07-01', null)],
    });
    expect(h.shares).toBeCloseTo(58.15, 9);
    expect(h.totalPaid).toBeCloseTo(16084.328, 3);
    expect(h.avgPaidPerShare).toBeCloseTo(276.600653, 5);
    expect(h.value).toBeCloseTo(19458.153, 3);
    expect(h.gain).toBeCloseTo(3373.825, 3);
    expect(h.returnOnCost).toBeCloseTo(0.209759, 6);
    expect(h.capitalGains!.longGain).toBeCloseTo(3129, 3);
    expect(h.capitalGains!.shortGain).toBeCloseTo(244.825, 3);
    expect(h.capitalGains!.longGain + h.capitalGains!.shortGain).toBeCloseTo(h.gain as number, 6);   // the parts add to the gain
    expect(h.dividends.trailing12).toBeCloseTo(171.89, 4);
    expect(h.dividends.allTime).toBeCloseTo(206.99, 4);                    // the record naming no ticker belongs to no holding
    // its RULE UNCLEAR: the day's change is the PRICE's — per share, as the line under "Current price" reads
    expect(h.dayChange!.amount).toBeCloseTo(2.72, 6);
    expect(h.dayChange!.share).toBeCloseTo(2.72 / 331.9, 9);
  });

  test('complex · call options bought in two lots, priced per share as a broker quotes them', () => {
    const h = theHolding({ position: { position_id: 'p', ticker: 'ABC261218C00100000', kind: 'options', lots: [lot('1', 4, 7.35, '2026-05-01'), lot('2', 2, 5.8, '2026-07-01')] } as any,
      accountId: 'a', price: 9.1, transactions: [], now: TODAY });
    expect(h.shares).toBe(6);
    expect(h.totalPaid).toBeCloseTo(4100, 4);                              // the formula as sent gave $41
    expect(h.value).toBeCloseTo(5460, 4);
    expect(h.gain).toBeCloseTo(1360, 4);
    expect(h.returnOnCost).toBeCloseTo(0.331707, 6);
    expect(h.avgPaidPerShare).toBeCloseTo(6.833333, 5);                    // in the unit the price is quoted in
    expect(h.capitalGains!.longGain + h.capitalGains!.shortGain).toBeCloseTo(1360, 4);   // the split adds to the gain for an option too
  });

  test('edge · held exactly one year to the day', () => {
    const h = theHolding({ position: { position_id: 'p', ticker: 'ABC', lots: [lot('1', 10, 100, '2025-10-04')] } as any, accountId: 'a', price: 130, transactions: [], now: TODAY });
    expect(h.gain).toBeCloseTo(300, 4);
    expect(h.capitalGains!.longGain).toBe(0);                              // long-term is MORE than one year
    expect(h.capitalGains!.shortGain).toBeCloseTo(300, 4);
  });
});

/** ITS SMALLER POINTS, fixed on his instruction of 2026-10-04 ("work on fixing all 5+4 findings"). */
describe('the smaller points of the same review', () => {
  test('MK-NW-O-001 theBonds · a bond with no value today is left out of the average, and the function names it', () => {
    const b = theBonds({ accounts: [bond('a', 'Priced bond', 10000, 0.04, 10000, '2028-10-04', { accrued_interest: 0 }),
      bond('b', 'Unpriced bond', 10000, 0.08, null, '2029-10-04', { source: 'connected' })], today: TODAY });
    expect(b.avgYield).toBeCloseTo(0.04, 6);
    expect(b.leftOutOfAverage).toEqual(['Unpriced bond']);
    expect(theBonds({ accounts: [bond('a', 'Priced bond', 10000, 0.04, 10000, '2028-10-04')], today: TODAY }).leftOutOfAverage).toEqual([]);
  });
});
