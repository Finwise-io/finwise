/** Q15 — AN ACTIVITY WORD THE APP DOES NOT KNOW (2026-10-20), and the journal the app does know.
 *
 *  No ruling decides Q15 ("refuse the line and ask you, or book it as unclassified with no direction?" — open on
 *  MK-NW-M-019). The rule applied is the safest honest one, in line with DEC-2160 (Q11: "Refuse the line and ask"),
 *  DEC-0296 ("an unknown input produces no number and a reason") and tenet 3 (unknown is not zero):
 *    · the money still moves the balance — the broker's own total — and the record is kept;
 *    · the return refuses the day it cannot explain, and its sentence names the broker's word;
 *    · the gap banner names the word, on Net worth, Performance and the account page alike.
 *
 *  FOUND WHILE VERIFYING: "JOURNAL" is NOT an unknown word here. events.ts reads it as a move between the person's own
 *  accounts and the sync wrote it as a TRANSFER with the broker's sign dropped, so $500 journalled IN read as $500 OUT.
 *  The unknown-word rule is held below with "JNL", a word the app does not know; "JOURNAL" is held separately.
 *
 *  Every figure runs through the real path: ingestSync (the sync's one writer) → the store's rows → thePerformance
 *  (account page and Performance tab), theNetWorth (Net worth's return on cash + investments) and dataGaps (the banner).
 */
import { ingestSync, stAssetId, type AccountSyncPayload } from '../../../src/services/sync/ingest';
import { buildDayFromAccounts, record, type SnapshotDay } from '../../../Calculation Module code/engines/snapshots';
import { timeWeightedReturn, movementsOf } from '../../../Calculation Module code/engines/time-weighted-return';
import { unnamedActivityOf } from '../../../Calculation Module code/engines/ledger';
import { cashEffect } from '../../../src/domain/transactions';
import { dataGaps } from '../../../src/domain/gaps';
import { incomeFromAccounts } from '../../../src/domain/income/from-accounts';
import { thePerformance } from './performance';
import { theNetWorth } from './net-worth';

const TODAY = '2026-10-10';
const NOW = `${TODAY}T12:00:00.000Z`;
const payload = (id: string, balance: number, cash: number, activities: any[]): AccountSyncPayload => ({
  account: { id, brokerage_authorization: 'conn-1', name: `Robinhood ${id}`, number: `99887766${id.length}`, institution_name: 'Robinhood',
    raw_type: 'Individual', balance: { total: { amount: balance, currency: 'USD' } },
    sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: `${TODAY}T06:00:00Z` } } } as any,
  balancesCash: cash,
  positions: [{ symbol: { id: 'u-vti', raw_symbol: 'VTI', description: 'Vanguard Total', type: { code: 'et' } } as any, units: 100, price: 250, average_purchase_price: 200 }],
  activities,
});

/** Sep 30 to Oct 9 recorded: $50,000 (VTI $25,000 + cash $25,000) until the record on the activity's day, then the
 *  broker's total and cash include the $500. Today (Oct 10) is read from the account as the sync left it. */
const recordFor = (acct: any, before: { cash: number; total: number }, from: string): SnapshotDay[] => {
  const out: SnapshotDay[] = [];
  let days: SnapshotDay[] = out;
  for (let t = Date.parse('2026-09-30T12:00:00Z'); t <= Date.parse('2026-10-09T12:00:00Z'); t += 864e5) {
    const date = new Date(t).toISOString().slice(0, 10);
    const a = date < from ? { ...acct, cash_balance: before.cash, balance: before.total } : acct;
    days = record(days, buildDayFromAccounts([a], date, `${date}T20:00:00Z`));
  }
  return days;
};

const perf = (accounts: any[], txns: any[], days: SnapshotDay[], ids: Set<string>) => thePerformance({
  windowStart: '2026-10-01', windowLabel: 'since Sep 30', today: TODAY, holdings: [], transactions: txns,
  snapshotDays: days, investmentAccountIds: ids, accounts,
});

describe('an unknown word: "JNL", $500, Oct 5, into a linked Robinhood account', () => {
  const sync = ingestSync([], {}, [payload('acc-1', 50_500, 25_500, [
    { id: 'j1', type: 'JNL', trade_date: '2026-10-05', amount: 500 },
  ])], NOW);
  const acct = sync.accounts[0];
  const id = stAssetId('acc-1');
  const txns = sync.newTransactions;
  const days = recordFor(acct, { cash: 25_000, total: 50_000 }, '2026-10-05');
  const ids = new Set([id]);

  test('the money still moves the balance and the record is kept, with the broker’s word on it', () => {
    expect(acct.balance).toBe(50_500);                       // the broker's total, the $500 inside it
    expect(txns).toHaveLength(1);
    expect(txns[0].type).toBe('ADJUSTMENT');
    expect((txns[0] as any).unclassified_word).toBe('JNL');
    expect(unnamedActivityOf(txns[0] as any)).toEqual({ word: 'JNL', amount: 500 });
    expect(cashEffect(txns[0] as any)).toBe(0);              // counted in no total: not put in, not taken out
  });

  test('BEFORE: the return read the $500 as earned — +1.00% — and said nothing', () => {
    const m = movementsOf(txns, ids);
    // the engine as it was called before: no list of records it could not name
    const old = timeWeightedReturn({ days: recordFor(acct, { cash: 25_000, total: 50_000 }, '2026-10-05').concat(buildDayFromAccounts([acct], TODAY, NOW)),
      accountIds: ids, flows: m.flows, start: '2026-09-30', end: TODAY });
    expect(old.rate).toBeCloseTo(0.01, 12);
  });

  test('NOW: the return refuses Oct 5, and the sentence names "JNL" and the $500', () => {
    const p = perf([acct], txns, days, ids);
    expect(p.ret).toBeNull();
    expect(p.sentence).toBe('Your broker recorded $500 on Oct 5, 2026 as "JNL", a kind of activity the app does not know, so a return cannot be measured across that day. It is not counted as money put in or taken out.');
    expect(p.sentence.split(/\s+/).length).toBeLessThan(60);
    // the walk still adds up — its ending is the broker's total — and the $500 is not called a deposit
    expect(p.walk!.beginning).toBe(50_000);
    expect(p.walk!.ending).toBe(50_500);
    expect(p.walk!.contributions).toBe(0);
    // Net worth's return on cash + investments refuses the same day
    expect(theNetWorth({ uid: 'u', accounts: [acct], debts: [], snapshotDays: days, transactions: txns, since: '2026-09-30', today: TODAY }).investableChangePct).toBeNull();
  });

  test('the gap banner names it — the same words on Net worth, Performance and the account page', () => {
    const gaps = dataGaps([acct], '2026-10-01', Date.parse(NOW), txns as any).filter((g) => g.kind === 'unknown-activity');
    expect(gaps).toHaveLength(1);
    expect(gaps[0].title).toMatch(/sent an activity the app does not know: "JNL"$/);
    expect(gaps[0].onItsPage).toBe('Robinhood sent an activity the app does not know: "JNL"');
    expect(gaps[0].meanwhile).toBe('It is dated Oct 5. The app does not count it as money put in or taken out, and does not measure the return across that day. The balance is the one Robinhood sends.');
    // its door opens the account's activity (the account-page drawing's rows 49-50, 2026-10-20): the account's own page,
    // at ACTIVITY with every record listed — it opened the top of the page
    expect(gaps[0].route).toBe(`/account-detail?id=${id}&show=activity`);
    // a window that opens after the record says nothing about it
    expect(dataGaps([acct], '2026-10-06', Date.parse(NOW), txns as any).filter((g) => g.kind === 'unknown-activity')).toHaveLength(0);
  });

  test('a record stored before today carries the word only in its note — it is read the same way', () => {
    const old = { ...txns[0], unclassified_word: undefined } as any;
    expect(old.note).toMatch(/broker word: JNL$/);
    expect(unnamedActivityOf(old)).toEqual({ word: 'JNL', amount: 500 });
    expect(perf([acct], [old], days, ids).ret).toBeNull();
  });

  test('Cash flow is not touched: it reads only dividends, interest and coupons from broker records', () => {
    expect(incomeFromAccounts([acct] as any, txns as any).annual).toBe(0);
  });

  test('the guard looked: the named things a sync writes as ADJUSTMENT are not unknown', () => {
    // a sweep and a split are named (SWEEP, CORPORATE_ACTION): they carry no "broker word", so nothing refuses
    const named = ingestSync([], {}, [payload('acc-2', 50_000, 25_000, [
      { id: 's1', type: 'SWEEP', trade_date: '2026-10-05', amount: 300 },
      { id: 's2', type: 'STOCK SPLIT', trade_date: '2026-10-06', units: 100, symbol: { id: 'u-vti', raw_symbol: 'VTI' } },
    ])], NOW).newTransactions;
    expect(named.map((t) => t.type)).toEqual(['ADJUSTMENT', 'ADJUSTMENT']);
    expect(named.map((t) => unnamedActivityOf(t as any))).toEqual([null, null]);
    expect(movementsOf(named, new Set([stAssetId('acc-2')])).unnamed).toBeUndefined();
  });
});

describe('"JOURNAL" — a move between the person’s own accounts, $500 into this one on Oct 5', () => {
  const sync = ingestSync([], {}, [payload('acc-1', 50_500, 25_500, [
    { id: 'j1', type: 'JOURNAL', trade_date: '2026-10-05', amount: 500 },
  ])], NOW);
  const acct = sync.accounts[0];
  const id = stAssetId('acc-1');
  const txns = sync.newTransactions;
  const days = recordFor(acct, { cash: 25_000, total: 50_000 }, '2026-10-05');
  const ids = new Set([id]);

  test('the sync now writes which way it went', () => {
    expect(txns[0].type).toBe('TRANSFER');
    expect(txns[0].direction).toBe('IN');
    expect(cashEffect(txns[0])).toBe(500);                   // the activity list read −$500
  });

  test('BEFORE: read as $500 leaving — the walk said $500 taken out and the return +2.02%', () => {
    const noSign = [{ ...txns[0], direction: undefined }];
    const p = perf([acct], noSign, days, ids);
    expect(p.walk!.withdrawals).toBe(500);
    expect(p.walk!.wealthGenerated).toBe(1_000);
    expect(p.ret).toBeCloseTo(50_500 / 49_500 - 1, 12);
  });

  test('NOW: $500 put in, $0 earned, 0.00% — on the account page and on Net worth alike', () => {
    const p = perf([acct], txns, days, ids);
    expect(p.walk!.contributions).toBe(500);
    expect(p.walk!.withdrawals).toBe(0);
    expect(p.walk!.wealthGenerated).toBe(0);
    expect(p.ret).toBe(0);
    expect(theNetWorth({ uid: 'u', accounts: [acct], debts: [], snapshotDays: days, transactions: txns, since: '2026-09-30', today: TODAY }).investableChangePct).toBe(0);
  });

  test('both legs linked (out of one account, into another): across the two the money cancels — 0.00%, $0 earned', () => {
    const two = ingestSync([], {}, [
      payload('acc-1', 50_500, 25_500, [{ id: 'j1', type: 'JOURNAL', trade_date: '2026-10-05', amount: 500 }]),
      payload('acc-9', 49_500, 24_500, [{ id: 'j2', type: 'JOURNAL', trade_date: '2026-10-05', amount: -500 }]),
    ], NOW);
    const [a1, a9] = two.accounts;
    expect(two.newTransactions.map((t) => t.direction)).toEqual(['IN', 'OUT']);
    const both = recordFor(a1, { cash: 25_000, total: 50_000 }, '2026-10-05')
      .map((d) => ({ ...d, ...(() => { const o = buildDayFromAccounts([d.date < '2026-10-05' ? { ...a9, cash_balance: 25_000, balance: 50_000 } : a9], d.date, d.writtenAt);
        return { holdings: [...d.holdings, ...o.holdings], accounts: [...d.accounts, ...o.accounts] }; })() }));
    const p = perf([a1, a9], two.newTransactions, both, new Set([String(a1.asset_id), String(a9.asset_id)]));
    expect(p.ret).toBe(0);
    expect(p.walk!.wealthGenerated).toBe(0);
  });
});

describe('a truly unknown word: "XYZ_ADJUST", $500, Oct 5 (2026-10-20, resumed)', () => {
  const run = (amount: number, total: number, cash: number) => {
    const sync = ingestSync([], {}, [payload('acc-1', total, cash, [
      { id: 'x1', type: 'XYZ_ADJUST', trade_date: '2026-10-05', amount },
    ])], NOW);
    const acct = sync.accounts[0];
    const txns = sync.newTransactions;
    return { acct, txns, ids: new Set([stAssetId('acc-1')]), days: recordFor(acct, { cash: 25_000, total: 50_000 }, '2026-10-05') };
  };

  test('$500 in: the balance is the broker’s $50,500 — the $500 is never lost — and the record keeps the word', () => {
    const { acct, txns } = run(500, 50_500, 25_500);
    expect(acct.balance).toBe(50_500);
    expect(txns).toHaveLength(1);
    expect(txns[0].type).toBe('ADJUSTMENT');
    expect((txns[0] as any).unclassified_word).toBe('XYZ_ADJUST');
    expect(unnamedActivityOf(txns[0] as any)).toEqual({ word: 'XYZ_ADJUST', amount: 500 });
  });

  test('the return refuses the window holding Oct 5, and its sentence names "XYZ_ADJUST" and the $500', () => {
    const { acct, txns, ids, days } = run(500, 50_500, 25_500);
    const p = perf([acct], txns, days, ids);
    expect(p.ret).toBeNull();
    expect(p.sentence).toBe('Your broker recorded $500 on Oct 5, 2026 as "XYZ_ADJUST", a kind of activity the app does not know, so a return cannot be measured across that day. It is not counted as money put in or taken out.');
    expect(p.walk!.ending).toBe(50_500);                      // the money is in the balance the walk ends on
    expect(p.walk!.contributions).toBe(0);
    expect(p.walk!.withdrawals).toBe(0);
    expect(theNetWorth({ uid: 'u', accounts: [acct], debts: [], snapshotDays: days, transactions: txns, since: '2026-09-30', today: TODAY }).investableChangePct).toBeNull();
  });

  test('a window that opens after Oct 5 does not hold the day, so its return is measured', () => {
    const { acct, txns, ids, days } = run(500, 50_500, 25_500);
    const after = thePerformance({ windowStart: '2026-10-07', windowLabel: 'since Oct 6', today: TODAY, holdings: [], transactions: txns,
      snapshotDays: days, investmentAccountIds: ids, accounts: [acct] });
    expect(after.ret).toBe(0);
  });

  test('the amber box names "XYZ_ADJUST" on Net worth, Performance and the account page', () => {
    const { acct, txns } = run(500, 50_500, 25_500);
    const gaps = dataGaps([acct], '2026-10-01', Date.parse(NOW), txns as any).filter((g) => g.kind === 'unknown-activity');
    expect(gaps).toHaveLength(1);
    expect(gaps[0].onItsPage).toBe('Robinhood sent an activity the app does not know: "XYZ_ADJUST"');
    expect(gaps[0].meanwhile).toBe('It is dated Oct 5. The app does not count it as money put in or taken out, and does not measure the return across that day. The balance is the one Robinhood sends.');
  });

  test('$500 out reads the same way: the balance is the broker’s $49,500 and the sentence says $500, never −$500 earned', () => {
    const { acct, txns, ids } = run(-500, 49_500, 24_500);
    expect(acct.balance).toBe(49_500);
    const days = recordFor(acct, { cash: 25_000, total: 50_000 }, '2026-10-05');
    const p = perf([acct], txns, days, ids);
    expect(p.ret).toBeNull();
    expect(p.sentence).toMatch(/^Your broker recorded \$500 on Oct 5, 2026 as "XYZ_ADJUST", /);
  });

  test('the guard looked: one record handed over, one written, one named, one refusal', () => {
    const { acct, txns, ids, days } = run(500, 50_500, 25_500);
    expect(txns).toHaveLength(1);
    expect(movementsOf(txns, ids).unnamed).toEqual([{ date: '2026-10-05', accountId: String(acct.asset_id), word: 'XYZ_ADJUST', amount: 500 }]);
    const v = timeWeightedReturn({ days: days.concat(buildDayFromAccounts([acct], TODAY, NOW)), accountIds: ids,
      flows: [], unnamed: movementsOf(txns, ids).unnamed, start: '2026-09-30', end: TODAY });
    expect(v.refused).toBe('ACTIVITY_NOT_KNOWN');
    expect(v.day).toBe('2026-10-05');
    expect(v.word).toBe('XYZ_ADJUST');
  });
});
