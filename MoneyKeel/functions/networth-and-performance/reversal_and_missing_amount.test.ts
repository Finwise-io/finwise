/** TWO WRONG NUMBERS FOUND BY THE PERFORMANCE RE-RUN, PART 4 (2026-10-21) — through the real sync and the real doors.
 *
 *  1. A BROKER'S NEGATIVE DEPOSIT — A REVERSAL. SnapTrade sends a CONTRIBUTION of −$500: $500 that LEFT. The sync saved it
 *     as a plain $500 deposit, its direction dropped, so the return, the walk and the activity list read $500 coming in.
 *     Now the sync writes its direction (OUT), the way it keeps a journal's (DEC-6623), and every reader of a stored amount
 *     reads it one way: moneyIntoAccount (ledger.ts) — the return (movementsOf), the walk (personalFlowTotals), the activity
 *     list (cashEffect) and the rebuilt record (rebuild-history). Ruled by tenet 1 (DEC-3523: a wrong number ends trust).
 *  2. INTEREST OR A DIVIDEND WITH NO AMOUNT. It was counted as $0. On a cash account only interest is earned (rule 3 of the
 *     time-weighted return), so savings worth $10,000 then $10,040 read the $40 as money paid in: +0.00%. Now the sync
 *     saves a broker's real 0 as 0 and a missing amount as not on record, and the return refuses a window holding that day,
 *     with a sentence naming the record (INCOME_HAS_NO_AMOUNT). Ruled by tenet 3 (DEC-3523: unknown is not zero).
 *
 *  Every figure runs through ingestSync (the sync's one writer) → the store's rows → thePerformance (the account page and
 *  the Performance tab), theNetWorth (Net worth's return on cash + investments, MK-NW-M-002) and theAccount (ACTIVITY).
 *  The same two examples are rendered on the three real screens in src/screens/__tests__/reversal_and_missing_amount_screens.test.tsx.
 */
import { ingestSync, stAssetId, type AccountSyncPayload } from '../../../src/services/sync/ingest';
import { buildDayFromAccounts, record, type SnapshotDay } from '../../../Calculation Module code/engines/snapshots';
import { timeWeightedReturn, movementsOf, TIME_WEIGHTED_REFUSALS } from '../../../Calculation Module code/engines/time-weighted-return';
import { moneyIntoAccount, amountNotOnRecord, personalFlowTotals } from '../../../Calculation Module code/engines/ledger';
import { rebuildDays } from '../../../Calculation Module code/engines/rebuild-history';
import { cashEffect } from '../../../src/domain/transactions';
import { assetClassOf } from '../../../src/domain/assets';
import { thePerformance, investmentAccountIdsOf, whyNoReturn } from './performance';
import { theNetWorth } from './net-worth';
import { theAccount } from './account';

const TODAY = '2026-10-10';
const NOW = `${TODAY}T12:00:00.000Z`;
const brokerage = (id: string, balance: number, cash: number, activities: any[]): AccountSyncPayload => ({
  account: { id, brokerage_authorization: 'conn-1', name: `Robinhood ${id}`, number: `99887766${id.length}`, institution_name: 'Robinhood',
    raw_type: 'Individual', balance: { total: { amount: balance, currency: 'USD' } },
    sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: `${TODAY}T06:00:00Z` } } } as any,
  balancesCash: cash,
  positions: [{ symbol: { id: 'u-vti', raw_symbol: 'VTI', description: 'Vanguard Total', type: { code: 'et' } } as any, units: 100, price: 250, average_purchase_price: 200 }],
  activities,
});
/** A linked cash account: a deposit account at a bank, holding cash only (its class is Cash, rule 3 applies). */
const savings = (balance: number, activities: any[]): AccountSyncPayload => ({
  account: { id: 'sav-1', brokerage_authorization: 'conn-2', name: 'Ally Savings', number: '55554444', institution_name: 'Ally',
    raw_type: 'Deposit account', account_category: 'DEPOSIT', balance: { total: { amount: balance, currency: 'USD' } },
    sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: `${TODAY}T06:00:00Z` } } } as any,
  balancesCash: balance, positions: [], activities,
});

/** Sep 30 to Oct 9 recorded: the account as it stood before the record's day, then as the sync left it. Today (Oct 10) is
 *  read from the account itself, as the screens read it. */
const recordFor = (acct: any, before: { cash: number; total: number }, from: string): SnapshotDay[] => {
  let days: SnapshotDay[] = [];
  for (let t = Date.parse('2026-09-30T12:00:00Z'); t <= Date.parse('2026-10-09T12:00:00Z'); t += 864e5) {
    const date = new Date(t).toISOString().slice(0, 10);
    const a = date < from ? { ...acct, cash_balance: before.cash, balance: before.total } : acct;
    days = record(days, buildDayFromAccounts([a], date, `${date}T20:00:00Z`));
  }
  return days;
};
/** The account page: the one door, this account only, "Since" the record's first day. */
const accountPage = (acct: any, txns: any[], days: SnapshotDay[]) => thePerformance({
  windowStart: '2026-10-01', windowLabel: 'since Sep 30', today: TODAY, holdings: [], transactions: txns,
  snapshotDays: days, investmentAccountIds: new Set([String(acct.asset_id)]), accounts: [acct],
});
/** The Performance tab: the same door over every investment account (never cash or property — MK-NW-F-092). */
const performanceTab = (accounts: any[], txns: any[], days: SnapshotDay[]) => thePerformance({
  windowStart: '2026-10-01', windowLabel: 'since Sep 30', today: TODAY, holdings: [], transactions: txns,
  snapshotDays: days, investmentAccountIds: investmentAccountIdsOf(accounts, assetClassOf as any), accounts,
});
/** Net worth's return on cash + investments over the same days (MK-NW-M-002). */
const netWorthReturn = (accounts: any[], txns: any[], days: SnapshotDay[]) =>
  theNetWorth({ uid: 'u', accounts, debts: [], snapshotDays: days, transactions: txns, since: '2026-09-30', today: TODAY }).investableChangePct;

// ═════════════════════════════════════ 1 · A −$500 DEPOSIT, A REVERSAL ════════════════════════════════════════════
describe('1 · a broker\'s −$500 deposit on Oct 5 — a reversal, $500 that left (DEC-3523 tenet 1)', () => {
  // VTI $25,000 + cash $25,000 = $50,000 until Oct 5; the reversal takes $500 of the cash: $49,500 from Oct 5 to today
  const sync = ingestSync([], {}, [brokerage('acc-1', 49_500, 24_500, [
    { id: 'r1', type: 'CONTRIBUTION', trade_date: '2026-10-05', amount: -500 },
  ])], NOW);
  const acct = sync.accounts[0];
  const id = stAssetId('acc-1');
  const txns = sync.newTransactions;
  const days = recordFor(acct, { cash: 25_000, total: 50_000 }, '2026-10-05');

  test('the sync keeps it as a $500 deposit that went OUT — the size and the direction, as a journal is kept', () => {
    expect(txns).toHaveLength(1);
    expect(txns[0]).toMatchObject({ type: 'DEPOSIT', amount: 500, direction: 'OUT', account_id: id });
    expect(moneyIntoAccount(txns[0] as any)).toBe(-500);
    expect(acct.balance).toBe(49_500);
  });

  test('BEFORE (its direction dropped, as the sync wrote it until 2026-10-21): $500 read as put in — return −1.98%, walk "put in $500", −$1,000 earned', () => {
    const old = [{ ...txns[0], direction: undefined }];
    const p = accountPage(acct, old, days);
    expect(p.ret).toBeCloseTo(49_500 / 50_500 - 1, 12);   // −1.98%
    expect(p.walk!.contributions).toBe(500);
    expect(p.walk!.wealthGenerated).toBe(-1_000);
    expect(netWorthReturn([acct], old, days)).toBeCloseTo(49_500 / 50_500 - 1, 12);
    expect(cashEffect(old[0] as any)).toBe(500);
  });

  test('NOW: the account page, Performance and Net worth agree — 0.00%, nothing earned, the $500 gone out', () => {
    const page = accountPage(acct, txns, days);
    const tab = performanceTab([acct], txns, days);
    const nw = netWorthReturn([acct], txns, days);
    expect(page.ret).toBe(0);
    expect(tab.ret).toBe(0);
    expect(nw).toBe(0);
    // the walk: $50,000 − the $500 reversed = $49,500, nothing earned. A reversal lowers what was put in (personalFlowTotals,
    // as it always has for a typed −$500 deposit); with no deposit in the window to cancel, the walk shows it as $500 taken
    // out (buildChangeWalk) — it used to cut it to $0 and show a $500 loss
    for (const w of [page.walk!, tab.walk!]) {
      expect(w.beginning).toBe(50_000);
      expect(w.contributions).toBe(0);
      expect(w.withdrawals).toBe(500);
      expect(w.wealthGenerated).toBe(0);
      expect(w.ending).toBe(49_500);
    }
    expect(page.sentence).toBe('');
  });

  test('ACTIVITY on the account page: −$500, a minus, never +$500', () => {
    const a = theAccount({ account: acct as any, transactions: txns });
    expect(a.activity).toHaveLength(1);
    expect(a.activity[0]).toMatchObject({ type: 'DEPOSIT', amount: -500, noAmount: false });
    expect(cashEffect(txns[0] as any)).toBe(-500);
  });

  test('the rebuilt record puts the $500 back on the days before it (it took it away a second time: $1,000 short)', () => {
    // a $3 interest on Oct 1 is the first record, so the rebuild reaches back to Oct 1 and walks across Oct 5
    const both = ingestSync([], {}, [brokerage('acc-1', 49_503, 24_503, [
      { id: 'i0', type: 'INTEREST', trade_date: '2026-10-01', amount: 3 },
      { id: 'r1', type: 'CONTRIBUTION', trade_date: '2026-10-05', amount: -500 },
    ])], NOW);
    const out = rebuildDays({ accounts: both.accounts as any, transactions: both.newTransactions as any, priceOn: () => 250, today: TODAY,
      earliest: '2026-09-01', accountIds: new Set([id]), writtenAt: NOW });
    const cashOn = (date: string) => out.days.find((d) => d.date === date)!.accounts.find((x) => x.accountId === id)!.cash;
    expect(cashOn('2026-10-05')).toBe(24_503);   // the day's value is after its money moved
    expect(cashOn('2026-10-04')).toBe(25_003);   // before the reversal the $500 was there — it read $24,003 before the fix
    // the same record with its direction dropped, as the sync wrote it until 2026-10-21: $1,000 short
    const old = rebuildDays({ accounts: both.accounts as any, transactions: both.newTransactions.map((t) => ({ ...t, direction: undefined })) as any,
      priceOn: () => 250, today: TODAY, earliest: '2026-09-01', accountIds: new Set([id]), writtenAt: NOW });
    expect(old.days.find((d) => d.date === '2026-10-04')!.accounts.find((x) => x.accountId === id)!.cash).toBe(24_003);
  });

  test('the mirror: a broker\'s +$300 withdrawal is a withdrawal reversed — $300 that came back in', () => {
    const r = ingestSync([], {}, [brokerage('acc-3', 50_300, 25_300, [{ id: 'w1', type: 'WITHDRAWAL', trade_date: '2026-10-05', amount: 300 }])], NOW);
    expect(r.newTransactions[0]).toMatchObject({ type: 'WITHDRAWAL', amount: 300, direction: 'IN' });
    expect(moneyIntoAccount(r.newTransactions[0] as any)).toBe(300);
    expect(personalFlowTotals(r.newTransactions as any).withdrawals.toNumber(2)).toBe(-300);
    // an ordinary deposit and withdrawal read exactly as before: their direction is their kind's
    const plain = ingestSync([], {}, [brokerage('acc-4', 50_000, 25_000, [
      { id: 'c1', type: 'CONTRIBUTION', trade_date: '2026-10-05', amount: 500 },
      { id: 'w2', type: 'WITHDRAWAL', trade_date: '2026-10-06', amount: -200 },
    ])], NOW).newTransactions;
    expect(plain.map((t) => [t.type, t.amount, t.direction])).toEqual([['DEPOSIT', 500, 'IN'], ['WITHDRAWAL', 200, 'OUT']]);
    expect(plain.map((t) => moneyIntoAccount(t as any))).toEqual([500, -200]);
  });

  test('one rule for a stored amount: a typed −$500 deposit (no direction) still reads as the reversal it always was', () => {
    const typed = { type: 'DEPOSIT', amount: -500, account_id: 'x', date: '2026-10-05' };
    expect(moneyIntoAccount(typed)).toBe(-500);
    expect(cashEffect(typed as any)).toBe(-500);
    expect(personalFlowTotals([typed]).contributions.toNumber(2)).toBe(-500);
    expect(movementsOf([typed], new Set(['x'])).flows).toEqual([{ date: '2026-10-05', accountId: 'x', amount: -500 }]);
  });
});

// ═════════════════════════════ 2 · INTEREST WITH NO AMOUNT ════════════════════════════════════════════════════════
describe('2 · interest with no amount on Oct 5 — unknown, not $0 (DEC-3523 tenet 3)', () => {
  const SENTENCE = 'Interest on Oct 5, 2026 has no amount in your records, so a return cannot be measured across that day. The Interest line does not count it.';

  describe('savings $10,000 → $10,040, the broker sends interest with no amount', () => {
    const sync = ingestSync([], {}, [savings(10_040, [{ id: 'i1', type: 'INTEREST', trade_date: '2026-10-05', amount: null }])], NOW);
    const acct = sync.accounts[0];
    const id = stAssetId('sav-1');
    const txns = sync.newTransactions;
    const days = recordFor(acct, { cash: 10_000, total: 10_000 }, '2026-10-05');

    test('the sync keeps it with no amount — not $0 — and the account is Cash', () => {
      expect(txns).toHaveLength(1);
      expect(txns[0].type).toBe('INTEREST');
      expect(txns[0].amount).toBeUndefined();
      expect(amountNotOnRecord(txns[0] as any)).toBe(true);
      expect(assetClassOf(acct as any)).toBe('cash');
    });

    test('BEFORE (read as $0): Net worth read the $40 as money paid in — +0.00%', () => {
      const asZero = [{ ...txns[0], amount: 0 }];
      expect(netWorthReturn([acct], asZero, days)).toBe(0);
    });

    test('NOW: Net worth gives no figure, and the account page gives none and says why — the two agree', () => {
      expect(netWorthReturn([acct], txns, days)).toBeNull();
      const page = accountPage(acct, txns, days);
      expect(page.ret).toBeNull();
      expect(page.sentence).toBe(SENTENCE);
      expect(page.sentence.split(/\s+/).length).toBeLessThan(60);
      // the walk still adds up to the balance: the $40 is in the ending, and the Interest line does not count it
      expect(page.walk!.beginning).toBe(10_000);
      expect(page.walk!.ending).toBe(10_040);
      expect(page.walk!.interest).toBe(0);
      // the Performance tab measures investments only: a savings account is not on it, so it shows nothing of this
      expect(investmentAccountIdsOf([acct], assetClassOf as any).has(id)).toBe(false);
    });

    test('ACTIVITY on the account page: a dash where the amount would be, never $0', () => {
      const a = theAccount({ account: acct as any, transactions: txns });
      expect(a.activity[0]).toMatchObject({ type: 'INTEREST', noAmount: true });
      expect(a.income).toBe(0);   // income counts what is on record; the record with no amount adds nothing to it
    });

    test('a window that opens after Oct 5 does not hold the day, so its return is measured', () => {
      const after = thePerformance({ windowStart: '2026-10-07', windowLabel: 'since Oct 6', today: TODAY, holdings: [], transactions: txns,
        snapshotDays: days, investmentAccountIds: new Set([id]), accounts: [acct] });
      expect(after.ret).toBe(0);
    });

    test('a broker\'s real $0 interest is saved as 0 and measured: Net worth reads the $40 as money moved, 0.00%', () => {
      const zero = ingestSync([], {}, [savings(10_040, [{ id: 'i1', type: 'INTEREST', trade_date: '2026-10-05', amount: 0 }])], NOW);
      expect(zero.newTransactions[0].amount).toBe(0);
      expect(amountNotOnRecord(zero.newTransactions[0] as any)).toBe(false);
      expect(netWorthReturn([zero.accounts[0]], zero.newTransactions, days)).toBe(0);
    });

    test('with its amount, $40, it is measured: +0.40% on Net worth', () => {
      const known = ingestSync([], {}, [savings(10_040, [{ id: 'i1', type: 'INTEREST', trade_date: '2026-10-05', amount: 40 }])], NOW);
      expect(netWorthReturn([known.accounts[0]], known.newTransactions, days)).toBeCloseTo(0.004, 12);
    });
  });

  describe('the same record on a linked brokerage account: VTI $25,000 + cash $25,000, the cash $25,000 → $25,040', () => {
    const sync = ingestSync([], {}, [brokerage('acc-1', 50_040, 25_040, [{ id: 'i1', type: 'INTEREST', trade_date: '2026-10-05', amount: null }])], NOW);
    const acct = sync.accounts[0];
    const txns = sync.newTransactions;
    const days = recordFor(acct, { cash: 25_000, total: 50_000 }, '2026-10-05');

    test('the account page, Performance and Net worth agree: no figure, and the same sentence on both pages that state one', () => {
      const page = accountPage(acct, txns, days);
      const tab = performanceTab([acct], txns, days);
      expect(page.ret).toBeNull();
      expect(tab.ret).toBeNull();
      expect(netWorthReturn([acct], txns, days)).toBeNull();
      expect(page.sentence).toBe(SENTENCE);
      expect(tab.sentence).toBe(SENTENCE);
    });

    test('a dividend with no amount is named as a dividend, and its line is Dividends', () => {
      const div = ingestSync([], {}, [brokerage('acc-1', 50_040, 25_040, [{ id: 'd1', type: 'DIVIDEND', trade_date: '2026-10-05', amount: null, symbol: { id: 'u-vti', raw_symbol: 'VTI' } }])], NOW);
      const p = accountPage(div.accounts[0], div.newTransactions, days);
      expect(p.ret).toBeNull();
      expect(p.sentence).toBe('A dividend on Oct 5, 2026 has no amount in your records, so a return cannot be measured across that day. The Dividends line does not count it.');
    });
  });

  test('the guard looked: one record handed over, one listed with no amount, one refusal — its day and kind', () => {
    const sync = ingestSync([], {}, [savings(10_040, [{ id: 'i1', type: 'INTEREST', trade_date: '2026-10-05', amount: null }])], NOW);
    const ids = new Set([stAssetId('sav-1')]);
    const m = movementsOf(sync.newTransactions, ids);
    expect(m.incomeMissing).toEqual([{ date: '2026-10-05', accountId: stAssetId('sav-1'), kind: 'INTEREST' }]);
    expect(m.interest).toEqual([]);
    const v = timeWeightedReturn({ days: recordFor(sync.accounts[0], { cash: 10_000, total: 10_000 }, '2026-10-05').concat(buildDayFromAccounts(sync.accounts, TODAY, NOW)),
      accountIds: ids, cashIds: ids, flows: m.flows, interest: m.interest, incomeMissing: m.incomeMissing, start: '2026-09-30', end: TODAY });
    expect(v).toMatchObject({ rate: null, refused: 'INCOME_HAS_NO_AMOUNT', day: '2026-10-05', kind: 'INTEREST' });
    // every refusal the return can give has a sentence (MK-NW-F-105) — this one included
    expect(TIME_WEIGHTED_REFUSALS).toContain('INCOME_HAS_NO_AMOUNT');
    for (const kind of ['INTEREST', 'DIVIDEND', 'COUPON'] as const) {
      expect(whyNoReturn({ rate: null, refused: 'INCOME_HAS_NO_AMOUNT', day: '2026-10-05', measuredFrom: null, kind })).toMatch(/^(Interest|A dividend|A coupon) on Oct 5, 2026 has no amount in your records/);
    }
  });
});
