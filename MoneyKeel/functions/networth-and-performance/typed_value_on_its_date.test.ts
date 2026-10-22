/** A VALUE TYPED WITH AN EARLIER "VALUE AS OF" DATE GOES ON THAT DATE (2026-10-20).
 *
 *  The defect: a Treasury recorded at $24,650. On Oct 20 the person types $24,900 from a statement dated Sep 30 (the
 *  Bonds editor's "Value as of"). The daily record was written from today's accounts, so the $250 was booked on Oct 20:
 *  October read +$250 earned and September read nothing.
 *
 *  Held through the real path: the store's updateAsset (the one call every editor saves through) → the engine
 *  (typedValueOnItsDate) → the doors three screens read: the account page (thePerformance on the one account), the
 *  Performance tab (thePerformance on every investment account) and Net worth (theNetWorth's return on cash +
 *  investments, and its change line read off the one-number daily totals).
 */
import { useStore } from '../../../src/store/useStore';
import { buildDayFromAccounts, record, valueOn, typedValueOnItsDate, type SnapshotDay } from '../../../Calculation Module code/engines/snapshots';
import { timeWeightedReturn } from '../../../Calculation Module code/engines/time-weighted-return';
import { thePerformance, windowStartKey } from './performance';
import { theNetWorth } from './net-worth';

const TODAY = '2026-10-20';
const treasury = { asset_id: 't1', label: 'US Treasury 2030', kind: 'fixed_income', source: 'manual', tax_bucket: 'TAXABLE',
  balance: 24_650, value_as_of: '2026-09-01', target_return: 0.04, face_value: 25_000, coupon_rate: 0.04, maturity_date: '2030-05-15' } as any;
const ira = { asset_id: 'ira', label: 'Vanguard IRA', kind: 'trad_ira', source: 'manual', tax_bucket: 'PRE_TAX',
  balance: 100_000, value_as_of: '2026-09-01', target_return: 0.07 } as any;

/** Every day from Sep 1 to Oct 19 recorded, as the app records one each day it is opened. */
const daysBetween = (from: string, to: string): string[] => {
  const out: string[] = [];
  for (let t = Date.parse(`${from}T12:00:00Z`); t <= Date.parse(`${to}T12:00:00Z`); t += 864e5) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
};
const RECORDED = daysBetween('2026-09-01', '2026-10-19');
const seedDays = (): SnapshotDay[] => RECORDED.reduce((d, date) => record(d, buildDayFromAccounts([treasury, ira], date, `${date}T20:00:00Z`)), [] as SnapshotDay[]);
const seedTotals = () => Object.fromEntries(RECORDED.map((d) => [d, 124_650]));

const ids = new Set(['t1', 'ira']);
const accountPage = (days: SnapshotDay[], accounts: any[]) => thePerformance({
  windowStart: '2026-10-01', windowLabel: 'since Sep 30', today: TODAY, holdings: [], transactions: [],
  snapshotDays: days, investmentAccountIds: new Set(['t1']), accounts: accounts.filter((a) => a.asset_id === 't1'),
});
const performanceTab = (days: SnapshotDay[], accounts: any[]) => thePerformance({
  windowStart: '2026-10-01', windowLabel: 'since Sep 30', today: TODAY, holdings: [], transactions: [],
  snapshotDays: days, investmentAccountIds: ids, accounts,
});
const netWorthReturn = (days: SnapshotDay[], accounts: any[]) =>
  theNetWorth({ uid: 'u', accounts, debts: [], snapshotDays: days, transactions: [], since: '2026-09-30', today: TODAY }).investableChangePct;
const september = (days: SnapshotDay[]) => timeWeightedReturn({ days, accountIds: ids, flows: [], start: '2026-09-01', end: '2026-09-30' }).rate;

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date(`${TODAY}T15:00:00`));
  useStore.getState().resetAll();
  useStore.setState({ assetAccounts: [treasury, ira], snapshotDays: seedDays(), nwDaily: seedTotals(), invDaily: seedTotals() } as any);
});
afterEach(() => { jest.useRealTimers(); });

describe('the Treasury: $24,650 on record, retyped on Oct 20 at $24,900 "as of Sep 30"', () => {
  test('BEFORE (the old write, today only): October carries the $250 and September nothing', () => {
    const typedToday = { ...treasury, balance: 24_900, value_as_of: '2026-09-30' };
    const days = seedDays();                                  // nothing moved back: Sep 30 to Oct 19 still say $24,650
    expect(accountPage(days, [typedToday, ira]).walk!.wealthGenerated).toBeCloseTo(250, 6);
    expect(performanceTab(days, [typedToday, ira]).ret).toBeCloseTo(250 / 124_650, 12);
    expect(netWorthReturn(days, [typedToday, ira])).toBeCloseTo(250 / 124_650, 12);
    expect(september(days)).toBe(0);
  });

  test('NOW: the $250 sits on Sep 30 — September +$250, October $0, on all three screens alike', () => {
    useStore.getState().updateAsset('t1', { balance: 24_900, value_as_of: '2026-09-30' });
    const s = useStore.getState() as any;
    const days: SnapshotDay[] = s.snapshotDays;

    // the record: Sep 29 still $24,650; Sep 30 to Oct 19 superseded at $24,900; no day invented, none lost
    expect(days.map((d) => d.date)).toEqual(RECORDED);
    expect(valueOn(days, new Set(['t1']), '2026-09-29')).toBe(24_650);
    for (const d of daysBetween('2026-09-30', '2026-10-19')) expect(valueOn(days, new Set(['t1']), d)).toBe(24_900);

    // September: +$250 on $124,650
    expect(valueOn(days, ids, '2026-09-30')! - valueOn(days, ids, '2026-09-01')!).toBe(250);
    expect(september(days)).toBeCloseTo(250 / 124_650, 12);

    // October, on every screen: $0 and 0.00%
    const acct = accountPage(days, s.assetAccounts), perf = performanceTab(days, s.assetAccounts);
    expect(acct.walk!.beginning).toBe(24_900);
    expect(acct.walk!.ending).toBe(24_900);
    expect(acct.walk!.wealthGenerated).toBe(0);
    expect(acct.ret).toBe(0);
    expect(perf.walk!.wealthGenerated).toBe(0);
    expect(perf.ret).toBe(0);
    expect(netWorthReturn(days, s.assetAccounts)).toBe(0);

    // the Net worth change line reads the one-number daily totals: they moved on the same days by the same $250
    expect(s.nwDaily['2026-09-29']).toBe(124_650);
    expect(s.nwDaily['2026-09-30']).toBe(124_900);
    expect(s.invDaily['2026-10-19']).toBe(124_900);
    const nwNow = theNetWorth({ uid: 'u', accounts: s.assetAccounts, debts: [] }).netWorth;
    expect(nwNow - s.nwDaily['2026-09-30']).toBe(0);         // October's change in net worth
    expect(s.nwDaily['2026-09-30'] - s.nwDaily['2026-09-01']).toBe(250);   // September's
  });

  test('the guard looked: 49 recorded days, 20 superseded (Sep 30 to Oct 19), 29 left as they were', () => {
    const before = seedDays();
    const { days, moved } = typedValueOnItsDate(before, { ...treasury, balance: 24_900, value_as_of: '2026-09-30' }, TODAY, `${TODAY}T15:00:00Z`);
    expect(before).toHaveLength(49);
    expect(moved).toHaveLength(20);
    expect(moved[0]).toEqual({ date: '2026-09-30', was: 24_650, now: 24_900 });
    expect(days.filter((d) => d.writtenAt === `${TODAY}T15:00:00Z`)).toHaveLength(20);
    expect(days.filter((d) => d.writtenAt !== `${TODAY}T15:00:00Z`)).toHaveLength(29);
    // the IRA's rows on the superseded days are untouched
    expect(days.every((d) => d.accounts.find((r) => r.accountId === 'ira')!.typedValue === 100_000)).toBe(true);
  });

  test('DEC-6621: the month records are left as captured — September and October keep $124,650 after the save', () => {
    const months = { '2026-09': { netWorth: 124_650, investments: 124_650 }, '2026-10': { netWorth: 124_650, investments: 124_650 } };
    useStore.setState({ monthlySnapshots: JSON.parse(JSON.stringify(months)) } as any);
    useStore.getState().updateAsset('t1', { balance: 24_900, value_as_of: '2026-09-30' });
    const s = useStore.getState() as any;
    expect(s.snapshotDays.filter((d: SnapshotDay) => valueOn([d], new Set(['t1']), d.date) === 24_900)).toHaveLength(20);   // the save did move the days
    expect(Object.keys(s.monthlySnapshots)).toHaveLength(2);
    expect(s.monthlySnapshots).toEqual(months);
  });
});

describe('the limits the record keeps', () => {
  test('nothing is written before the account’s first recorded day — a date before it moves only the days on record', () => {
    // the record holds the Treasury from Oct 5 only; the statement is dated Sep 30
    const late = daysBetween('2026-10-05', '2026-10-19').reduce((d, date) => record(d, buildDayFromAccounts([treasury], date, `${date}T20:00:00Z`)), [] as SnapshotDay[]);
    const { days, moved } = typedValueOnItsDate(late, { ...treasury, balance: 24_900, value_as_of: '2026-09-30' }, TODAY, `${TODAY}T15:00:00Z`);
    expect(days.map((d) => d.date)[0]).toBe('2026-10-05');
    expect(days).toHaveLength(late.length);
    expect(moved.map((m) => m.date)[0]).toBe('2026-10-05');
  });

  test('a day nobody recorded is not invented: with Sep 28 and Oct 2 on record, the value starts on Oct 2', () => {
    const gappy = ['2026-09-28', '2026-10-02'].reduce((d, date) => record(d, buildDayFromAccounts([treasury], date, `${date}T20:00:00Z`)), [] as SnapshotDay[]);
    const { days, moved } = typedValueOnItsDate(gappy, { ...treasury, balance: 24_900, value_as_of: '2026-09-30' }, TODAY, `${TODAY}T15:00:00Z`);
    expect(days.map((d) => d.date)).toEqual(['2026-09-28', '2026-10-02']);
    expect(moved).toEqual([{ date: '2026-10-02', was: 24_650, now: 24_900 }]);
  });

  test('a linked account, an account with holdings, a date after today and a date that is not a day move nothing', () => {
    const days = seedDays();
    const none = (a: any) => typedValueOnItsDate(days, a, TODAY, `${TODAY}T15:00:00Z`).moved.length;
    expect(none({ ...treasury, balance: 24_900, value_as_of: '2026-09-30', source: 'connected' })).toBe(0);
    expect(none({ ...treasury, balance: 24_900, value_as_of: '2026-09-30', positions: [{ ticker: 'X', lots: [{ shares: 1, cost_per_share: 1 }] }] })).toBe(0);
    expect(none({ ...treasury, balance: 24_900, value_as_of: '2026-10-21' })).toBe(0);
    expect(none({ ...treasury, balance: 24_900, value_as_of: '2026-02-30' })).toBe(0);
    expect(none({ ...treasury, balance: 24_900, value_as_of: '2026-09' })).toBe(0);
  });

  test('saving the same value again changes nothing (an edit of the name alone moves no history)', () => {
    useStore.getState().updateAsset('t1', { balance: 24_900, value_as_of: '2026-09-30' });
    const once = (useStore.getState() as any).snapshotDays;
    useStore.getState().updateAsset('t1', { label: 'US Treasury 2030 (renamed)' });
    expect((useStore.getState() as any).snapshotDays).toBe(once);
  });
});

describe('a value is never written over a day that holds a different one (2026-10-20, resumed)', () => {
  // The Treasury sold $5,000 on Oct 5: Sep 1 to Oct 4 hold $24,650, Oct 5 to Oct 19 hold $19,650. The editor opens with
  // the date it was last given (Sep 1) still in the box.
  const SALE = { id: 'sale', account_id: 't1', type: 'SELL', amount: 5_000, date: '2026-10-05' };
  const sold = { ...treasury, balance: 19_650 };
  const seedWithSale = (): SnapshotDay[] => RECORDED.reduce((d, date) =>
    record(d, buildDayFromAccounts([date < '2026-10-05' ? treasury : sold, ira], date, `${date}T20:00:00Z`)), [] as SnapshotDay[]);
  beforeEach(() => {
    useStore.setState({ assetAccounts: [sold, ira], snapshotDays: seedWithSale(), transactions: [SALE],
      nwDaily: Object.fromEntries(RECORDED.map((d) => [d, d < '2026-10-05' ? 124_650 : 119_650])),
      invDaily: Object.fromEntries(RECORDED.map((d) => [d, d < '2026-10-05' ? 124_650 : 119_650])) } as any);
  });

  test('$19,800 typed with Sep 1 left in the box moves Oct 5 to Oct 19 only — the days before the sale keep $24,650', () => {
    useStore.getState().updateAsset('t1', { balance: 19_800, value_as_of: '2026-09-01' });
    const days: SnapshotDay[] = (useStore.getState() as any).snapshotDays;
    const t1 = new Set(['t1']);
    expect(valueOn(days, t1, '2026-10-04')).toBe(24_650);
    expect(valueOn(days, t1, '2026-10-05')).toBe(19_800);
    expect(valueOn(days, t1, '2026-10-19')).toBe(19_800);
    expect(days.filter((d) => d.writtenAt.startsWith(TODAY))).toHaveLength(15);   // Oct 5 to Oct 19
    // the sale stays a sale: the $150 is the only thing earned, and it sits on the day of the sale (the time-weighted
    // return measures that day on the $19,650 left after the $5,000 went out: 150 ÷ 19,650). Written over Sep 1 to
    // Oct 4 as well, the days before the sale would have read $19,800 and the $5,000 sale as a gain of over 25%.
    const flows = [{ date: '2026-10-05', amount: -5_000, accountId: 't1' }] as any;
    expect(timeWeightedReturn({ days, accountIds: t1, flows, start: '2026-09-02', end: '2026-10-04' }).rate).toBe(0);
    expect(timeWeightedReturn({ days, accountIds: t1, flows, start: '2026-09-02', end: '2026-10-19' }).rate).toBeCloseTo(150 / 19_650, 12);
  });

  test('saving the coupon alone (same $19,650, Sep 1 still in the box) moves nothing', () => {
    const before = (useStore.getState() as any).snapshotDays;
    useStore.getState().updateAsset('t1', { balance: 19_650, value_as_of: '2026-09-01', coupon_rate: 0.041 });
    expect((useStore.getState() as any).snapshotDays).toBe(before);
  });
});

describe('only a save that states its date is dated back', () => {
  test('a balance the app lowers by itself (a bond split out of an account) carries no date and moves no history', () => {
    const before = (useStore.getState() as any).snapshotDays;
    useStore.getState().updateAsset('ira', { balance: 75_100 });   // the Bonds screen's "Part of it" path
    expect((useStore.getState() as any).snapshotDays).toBe(before);
    expect((useStore.getState() as any).nwDaily['2026-10-19']).toBe(124_650);
  });

  test('"Still right" (today’s date, no new value) moves nothing', () => {
    const before = (useStore.getState() as any).snapshotDays;
    useStore.getState().updateAsset('t1', { value_as_of: TODAY });
    expect((useStore.getState() as any).snapshotDays).toBe(before);
  });
});

describe('a NEW account typed with a past "Value as of" (addAsset)', () => {
  // DEC-0230 (no day back-filled that was not recorded) and DEC-6075 (an account added by hand today: its figures start
  // today). The record holds no day for an account that did not exist in the app, so there is nothing to supersede and
  // nothing is invented; the account joins the record on the day it is added, at the value typed, and nothing it is
  // worth is counted as earned.
  test('no day is written for it before today, and October counts none of its $10,000 as earned', () => {
    const before = (useStore.getState() as any).snapshotDays as SnapshotDay[];
    useStore.getState().addAsset({ label: 'Savings bond', kind: 'fixed_income', source: 'manual', tax_bucket: 'TAXABLE',
      balance: 10_000, value_as_of: '2026-09-30', target_return: 0.03 } as any);
    const s = useStore.getState() as any;
    expect(s.snapshotDays).toBe(before);                                   // nothing written back
    const added = s.assetAccounts.find((a: any) => a.label === 'Savings bond');
    expect(before.some((d) => d.accounts.some((r) => r.accountId === added.asset_id))).toBe(false);
    // today's record is written as every day is (the once-a-day capture) — the account first appears today
    useStore.getState().captureDailyNw(TODAY, 134_650, 134_650);
    const days: SnapshotDay[] = (useStore.getState() as any).snapshotDays;
    expect(days.filter((d) => d.accounts.some((r) => r.accountId === added.asset_id)).map((d) => d.date)).toEqual([TODAY]);
    const all = new Set(['t1', 'ira', added.asset_id]);
    const perf = thePerformance({ windowStart: '2026-10-01', windowLabel: 'since Sep 30', today: TODAY, holdings: [], transactions: [],
      snapshotDays: days, investmentAccountIds: all, accounts: (useStore.getState() as any).assetAccounts });
    expect(perf.ret).toBe(0);
    expect(perf.walk!.wealthGenerated).toBe(0);
  });
});

describe('the real one-month window (Sep 20 to Oct 20) holds Sep 30, so it carries the $250 — the same on all three screens', () => {
  test('1M opens on Sep 20; account page, Performance and Net worth all read +$250 on $124,650', () => {
    useStore.getState().updateAsset('t1', { balance: 24_900, value_as_of: '2026-09-30' });
    const s = useStore.getState() as any;
    const start = windowStartKey('1M', [], TODAY)!;
    expect(start).toBe('2026-09-20');
    const args = { windowStart: start, windowLabel: 'the last month', today: TODAY, holdings: [], transactions: [], snapshotDays: s.snapshotDays };
    const acct = thePerformance({ ...args, investmentAccountIds: new Set(['t1']), accounts: s.assetAccounts.filter((a: any) => a.asset_id === 't1') } as any);
    const perf = thePerformance({ ...args, investmentAccountIds: ids, accounts: s.assetAccounts } as any);
    const nw = theNetWorth({ uid: 'u', accounts: s.assetAccounts, debts: [], snapshotDays: s.snapshotDays, transactions: [], since: '2026-09-19', today: TODAY });
    expect(acct.walk!.wealthGenerated).toBeCloseTo(250, 9);
    expect(perf.walk!.wealthGenerated).toBeCloseTo(250, 9);
    expect(perf.ret).toBeCloseTo(250 / 124_650, 12);
    expect(nw.investableChangePct).toBeCloseTo(perf.ret!, 12);
  });
});
