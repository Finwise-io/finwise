/* NWFIX, 2026-10-21 — Net worth figures found wrong by OpenAI's Performance re-run, part 1, fixed here; each test names
 * the ruling or the lead's decision it holds. The reviewer's own cases are flipped in
 * outside_performance_rerun_openai_01.test.ts; this file holds the fixes' own examples and the cross-screen agreements.
 *   MK-NW-F-103 investmentRecordDates / MK-NW-O-008 thePerformance — a balance never entered is not a recorded day (DEC-3279e)
 *   MK-NW-O-008 thePerformance — a record dated after today is read on today; the trade sheet takes no later date
 *   MK-NW-O-008 thePerformance — "Since" counts the day a new account opened (DEC-4439)
 *   MK-NW-F-112 yearlyInterest / MK-NW-M-024 — checked, not changed: his ruling DEC-2748c (no face → value × rate) stands
 *   MK-XS-F-002 dataGaps — the amber box says what the row shows for a broker's $0 price
 *   MK-NW-F-084 categoryEarnings — an alternative's income is Alternatives' (lead decision, tenets 1, 4)
 *   MK-NW-M-029 — the holding page's price band says LAST CLOSE and its day (lead decision, tenets 1, 2, 7)
 *   MK-NW-M-035 realizedFromLedger — a sale's own fee comes off its gain (lead decision; IRS Publication 550, Form 8949)
 */
import * as fs from 'fs';
import * as path from 'path';
import { thePerformance, windowStartKey, investmentRecordDates, categoryEarnings, lastCloseLabel } from './performance';
import { theBonds } from './bonds';
import { buildDayFromAccounts } from '../../../Calculation Module code/engines/snapshots';
import { bondInfo, yearlyInterest, couponIncomeAnnual, interestIncomeAnnual } from '../../../src/domain/bonds';
import { dataGaps } from '../../../src/domain/gaps';
import { realizedFromLedger } from '../../../src/domain/performance/realized';
import { dateShown } from '../../../src/domain/_shared/dates';

const day = (date: string, values: Record<string, number | null>) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
  accounts: Object.entries(values).map(([accountId, v]) => ({ date, accountId, cash: 0, statedTotal: null, typedValue: v, currency: 'USD' })) });
const linked = (id: string, balance: number, over: Record<string, any> = {}) =>
  ({ asset_id: id, label: id, kind: 'brokerage', asset_class: 'stocks_etf', tax_bucket: 'TAXABLE', source: 'connected', balance, cash_balance: 0, positions: [], ...over });
const handIra = (b: number | null) => ({ asset_id: 'IRA', label: 'IRA', kind: 'ira', asset_class: 'stocks_etf', tax_bucket: 'PRE_TAX', source: 'manual', balance: b, positions: [] });
const since = (days: any[], ids: Set<string>, today: string, accounts: any[], transactions: any[] = []) =>
  thePerformance({ windowStart: windowStartKey('SINCE', investmentRecordDates(days, ids), today), windowLabel: 'w', today,
    transactions, snapshotDays: days, investmentAccountIds: ids, accounts, wholeRecord: true });

describe('MK-NW-F-103 · a balance never entered is not a recorded day (DEC-3279e)', () => {
  test('the blank day is not on the record; a typed $0 is', () => {
    const blank = buildDayFromAccounts([handIra(null)] as any, '2026-09-01', 'x');
    const zero = buildDayFromAccounts([handIra(0)] as any, '2026-09-02', 'x');
    expect(investmentRecordDates([blank, zero], new Set(['IRA']))).toEqual(['2026-09-02']);
  });
  test('an IRA added blank and given $20,000 the next day: $20,000 put in, $0 earned, +0.00% (before: +$20,000, +40.00%)', () => {
    const dA = buildDayFromAccounts([linked('BRK', 50000), handIra(null)] as any, '2026-09-01', 'x');
    const dB = buildDayFromAccounts([linked('BRK', 50000), handIra(20000)] as any, '2026-09-02', 'x');
    const r = since([dA, dB], new Set(['BRK', 'IRA']), '2026-09-03', [linked('BRK', 50000), handIra(20000)]);
    expect([r.walk!.beginning, r.walk!.contributions, r.walk!.wealthGenerated, r.ending]).toEqual([50000, 20000, 0, 70000]);
    expect(r.ret!).toBeCloseTo(0, 12);
  });
});

describe('MK-NW-O-008 · a record dated after today is read on today (lead decision, tenets 1 and 4)', () => {
  const futureDeposit = () => thePerformance({ windowStart: '2026-09-01', windowLabel: 'w', today: '2026-09-02',
    transactions: [{ type: 'DEPOSIT', account_id: 'H', date: '2026-09-05', amount: 1000 }],
    snapshotDays: [day('2026-08-31', { H: 1000 }), day('2026-09-01', { H: 1000 })], investmentAccountIds: new Set(['H']),
    accounts: [{ asset_id: 'H', label: 'H', kind: 'brokerage', asset_class: 'stocks_etf', tax_bucket: 'TAXABLE', source: 'manual', balance: 2000, positions: [] }] });
  test('a $1,000 deposit typed for Sep 5 on Sep 2: $1,000 put in, Wealth generated $0, Return +0.00% (before: +100.00%)', () => {
    const r = futureDeposit();
    expect([r.walk!.contributions, r.walk!.wealthGenerated]).toEqual([1000, 0]);
    expect(r.ret!).toBeCloseTo(0, 12);
  });
  test('the trade sheet takes no date after today: its transaction and purchase dates stop at today (2 + 1 fields)', () => {
    const src = fs.readFileSync(path.join(__dirname, '../../../src/screens/PerformanceScreen.tsx'), 'utf8');
    expect(src.match(/label="transaction date" style=\{styles\.lotIn\} maximumDate=\{new Date\(\)\}/g)).toHaveLength(2);
    expect(src).toContain('label="purchase date" style={styles.lotIn} maximumDate={new Date()}');
    expect(src.match(/label="transaction date"/g)).toHaveLength(2);   // the guard saw every transaction date field
  });
});

describe('MK-NW-O-008 · Since counts the day a new account opened (DEC-4439)', () => {
  const newAccount = (evening: number) => since([day('2026-09-27', { n1: evening }), day('2026-09-28', { n1: evening })], new Set(['n1']), '2026-09-28',
    [linked('n1', evening)], [{ type: 'DEPOSIT', account_id: 'n1', date: '2026-09-27', amount: 10000 }]);
  test('$10,000 in, $10,050 that evening: +$50, +0.50%, Contributions $10,000 (before: $0, +0.00%, $0)', () => {
    const r = newAccount(10050);
    expect([r.walk!.beginning, r.walk!.contributions, r.ending]).toEqual([0, 10000, 10050]);
    expect(r.walk!.wealthGenerated).toBeCloseTo(50, 6); expect(r.ret!).toBeCloseTo(0.005, 12);
    expect(r.beginningAsOf).toBe('2026-09-27');
  });
  test('$9,800 that evening: −$200, −2.00%', () => {
    const r = newAccount(9800);
    expect(r.walk!.wealthGenerated).toBeCloseTo(-200, 6); expect(r.ret!).toBeCloseTo(-0.02, 12);
  });
  test('an account already there that day keeps its value as the beginning; only the new one starts at $0', () => {
    const days = [day('2026-09-27', { old: 5000, n1: 10050 }), day('2026-09-28', { old: 5000, n1: 10050 })];
    const r = since(days, new Set(['old', 'n1']), '2026-09-28', [linked('old', 5000), linked('n1', 10050)],
      [{ type: 'DEPOSIT', account_id: 'n1', date: '2026-09-27', amount: 10000 }]);
    expect([r.walk!.beginning, r.walk!.contributions, r.ending]).toEqual([5000, 10000, 15050]);
    expect(r.walk!.wealthGenerated).toBeCloseTo(50, 6);
  });
  test('cross-screen: the Performance tab (all accounts) and the account page (the one account) give the same $50 and +0.50%', () => {
    const days = [day('2026-09-27', { n1: 10050 }), day('2026-09-28', { n1: 10050 })];
    const deposit = [{ type: 'DEPOSIT', account_id: 'n1', date: '2026-09-27', amount: 10000 }];
    const tab = since(days, new Set(['n1']), '2026-09-28', [linked('n1', 10050), { ...linked('cash', 3000), asset_class: 'cash' }], deposit);
    const page = since(days, new Set(['n1']), '2026-09-28', [linked('n1', 10050)], deposit);
    expect(tab.walk!.wealthGenerated).toBeCloseTo(page.walk!.wealthGenerated, 9); expect(tab.ret!).toBeCloseTo(page.ret!, 12);
  });
  test('an account first recorded with no money added that day is unchanged: its first value is the beginning', () => {
    const r = since([day('2026-09-27', { A: 8000 }), day('2026-09-28', { A: 8100 })], new Set(['A']), '2026-09-28', [linked('A', 8100)]);
    expect([r.walk!.beginning, r.walk!.contributions]).toEqual([8000, 0]);
    expect(r.walk!.wealthGenerated).toBeCloseTo(100, 6);
  });
});

describe('MK-NW-M-024 · a bond with no face value: his ruling DEC-2748c stands (checked 2026-10-21, not changed)', () => {
  const bond = { asset_id: 'b1', label: 'US Treasury 2031', kind: 'bond', asset_class: 'bonds', tax_bucket: 'TAXABLE', source: 'manual',
    balance: 24200, market_value: 24200, face_value: null, coupon_rate: 0.045, maturity_date: '2031-05-15' };
  test('4.50% and a $24,200 market value, no face: value × rate, $1,089 a year — the Bonds screen, the account page and the income figure agree', () => {
    const now = new Date(2026, 9, 21);
    expect(yearlyInterest(bondInfo(bond as any))!).toBeCloseTo(1089, 6);
    expect(theBonds({ accounts: [bond] as any, today: now } as any).rows[0].couponPerYear!).toBeCloseTo(1089, 6);
    expect(theBonds({ accounts: [bond] as any, accountId: 'b1', today: now } as any).one!.couponPerYear!).toBeCloseTo(1089, 6);
    expect(couponIncomeAnnual([bond] as any, now)).toBeCloseTo(1089, 6);
    expect(interestIncomeAnnual([bond] as any, now)).toBeCloseTo(1089, 6);
  });
});

describe('MK-XS-F-002 · the amber box says what the row shows (tenet 2)', () => {
  const acct = (last_price: number | undefined) => ({ asset_id: 'S', label: 'Schwab', institution: 'Schwab', kind: 'brokerage', asset_class: 'stocks_etf',
    tax_bucket: 'TAXABLE', source: 'connected', balance: 1000, last_synced: new Date().toISOString(),
    positions: [{ position_id: 'p', ticker: 'XYZ', last_price, lots: [{ shares: 10, cost_per_share: 50 }] }] });
  test('a broker\'s $0 price with no close behind it: the box says the $0 price Schwab sent (before: what you paid)', () => {
    const g = dataGaps([acct(0)] as any).filter((x: any) => x.kind === 'no-price');
    expect(g).toHaveLength(1);
    expect(g[0].meanwhile).toBe('Meanwhile we show the $0 price Schwab sent — it stays out of the change line, and we say so.');
  });
  test('a holding with no price at all keeps the sentence about what was paid', () => {
    // LINKED, NO PRICE AT ALL (2026-10-21, ACCOUNT pass): counted as the rest of Schwab's total — $1,000 here, not the $500
    // paid — on Net worth and on the account page's row, so the box says that; built by hand it is counted at what was paid
    const g = dataGaps([acct(undefined)] as any).filter((x: any) => x.kind === 'no-price');
    expect(g).toHaveLength(1);
    expect(g[0].meanwhile).toBe("Meanwhile it counts as the rest of Schwab's total — what the other holdings and the cash leave over. It stays out of the change line, and we say so.");
    const byHand = dataGaps([{ ...acct(undefined), source: 'manual', derive_balance: true }] as any, null, Date.now(), [], [], [], () => null).filter((x: any) => x.kind === 'no-price');
    expect(byHand).toHaveLength(1);
    expect(byHand[0].meanwhile).toBe('Meanwhile we show what you paid — it stays out of the change line, and we say so.');
  });
});

describe('MK-NW-F-084 · an alternative\'s income is Alternatives\', never Stocks / Funds (lead decision, tenets 1 and 4)', () => {
  const rows = [{ position: { ticker: 'GLD', asset_class: 'other' }, marketValue: 5000, periodReturn: 0.02, periodTotal: 0.02 },
    { position: { ticker: 'VTI', asset_class: 'stock_etf' }, marketValue: 10000, periodReturn: 0.05, periodTotal: 0.05 }];
  test('an alternative\'s $83.27 dividend reads Alternatives earned $83.27 (before: Stocks / Funds earned $83.27)', () => {
    const c = categoryEarnings({ windowStart: '2026-01-01', rows: rows as any, transactions: [{ type: 'DIVIDEND', account_id: 'A', ticker: 'GLD', date: '2026-03-01', amount: 83.27 }] });
    expect(c.map((b) => [b.label, b.earned])).toEqual([['Alternatives', 83.27]]);
  });
  test('day one draws Alternatives only where one is held', () => {
    expect(categoryEarnings({ windowStart: null, rows: rows as any, transactions: [], dayOne: true }).map((b) => b.key)).toContain('alternatives');
    expect(categoryEarnings({ windowStart: null, rows: [rows[1]] as any, transactions: [], dayOne: true }).map((b) => b.key)).toEqual(['stocks_etf', 'bonds', 'cash']);
  });
});

describe('MK-NW-M-029 · the price band says LAST CLOSE and its day (lead decision, tenets 1, 2 and 7)', () => {
  test('the latest close\'s day, whatever order the prices arrived in', () => {
    const s = { ticker: 'VTI', points: [{ date: '2026-09-28', close: 290 }, { date: '2026-09-25', close: 288 }] };
    expect(lastCloseLabel(s as any)).toBe(`LAST CLOSE · ${dateShown('2026-09-28').toUpperCase()}`);
    expect(lastCloseLabel(null)).toBe('LAST CLOSE');
  });
});

describe('MK-NW-M-035 · a sale\'s own fee comes off its gain (lead decision; IRS Publication 550, Form 8949)', () => {
  const buy = { txn_id: 'b', account_id: 'A', ticker: 'X', type: 'BUY', shares: 10, price: 100, date: '2025-01-02' };
  test('10 bought at $100, sold at $120 with a $5 fee: $195 (before: $200); no fee recorded: $200', () => {
    const sell = { txn_id: 's', account_id: 'A', ticker: 'X', type: 'SELL', shares: 10, price: 120, date: '2026-03-02' };
    expect(realizedFromLedger([buy, { ...sell, fee: 5 }] as any, { now: new Date(2026, 9, 21) }).realizedAllTime).toBeCloseTo(195, 6);
    expect(realizedFromLedger([buy, sell] as any, { now: new Date(2026, 9, 21) }).realizedAllTime).toBeCloseTo(200, 6);
  });
  test('15 sold with a $6 fee, 10 on record: the 10 carry $4 of it — $196', () => {
    const sell = { txn_id: 's', account_id: 'A', ticker: 'X', type: 'SELL', shares: 15, price: 120, fee: 6, date: '2026-03-02' };
    expect(realizedFromLedger([buy, sell] as any, { now: new Date(2026, 9, 21) }).realizedAllTime).toBeCloseTo(196, 6);
  });
});
