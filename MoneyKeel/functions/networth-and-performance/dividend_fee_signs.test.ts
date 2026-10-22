/** A DIVIDEND REVERSAL AND A FEE REFUND KEEP THEIR SIGN (2026-10-21) — the class of the −$500 deposit, through the real sync
 *  and the real doors.
 *
 *  A broker sends a −$50 DIVIDEND (a reversal: $50 that LEFT) and a +$5 FEE (a refund: $5 that came IN). Until 2026-10-21
 *  the sync kept only their size, so ACTIVITY read +$50 and −$5, the walk counted $50 of dividends earned, and the income
 *  of the account read +$50. Now the sync writes each one's direction and every reader asks moneyIntoAccount (ledger.ts).
 *
 *  THE FIGURES, WORKED BY HAND FIRST. A $10,000 brokerage: VTI 30 shares × $250 = $7,500 + cash $2,500.
 *    Oct 5  the −$50 dividend reversal: cash $2,450, the account $9,950.
 *    Oct 6  the +$5 fee refund:         cash $2,455, the account $9,955. Today (Oct 10) the broker's total is $9,955.
 *    Neither is money you put in or took out — both are inside the account's value — so the return since Sep 30 is
 *    $9,955 ÷ $10,000 − 1 = −0.45%, on the account page, the Performance tab and Net worth alike.
 *    The walk: began $10,000 · put in $0 · taken out $0 · dividends −$50 · interest $0 · change in investment value +$5
 *    (the fee refund; a fee is always inside that line) · ended $9,955. Wealth generated −$45.
 *    ACTIVITY: the dividend −$50, the fee +$5. The account's income: −$50.
 *  BEFORE (directions dropped, as the sync wrote them until today): ACTIVITY +$50 and −$5; walk dividends +$50 and change in
 *  investment value −$95; income +$50. The return was −0.45% then too — these records never moved it — which is why
 *  nothing but the signs caught it.
 */
import { ingestSync, stAssetId, fixStoredMoney, type AccountSyncPayload, type StoredMoneyFix } from '../../../src/services/sync/ingest';
import { buildDayFromAccounts, record, type SnapshotDay } from '../../../Calculation Module code/engines/snapshots';
import { moneyIntoAccount, personalFlowTotals } from '../../../Calculation Module code/engines/ledger';
import { rebuildDays } from '../../../Calculation Module code/engines/rebuild-history';
import { cashEffect, investmentIncomeAnnual, applyTransaction, inverseOf } from '../../../src/domain/transactions';
import { isMoneyOut } from '../../../src/domain/transactions/flags';
import { assetClassOf } from '../../../src/domain/assets';
import { thePerformance, investmentAccountIdsOf } from './performance';
import { theNetWorth } from './net-worth';
import { theAccount } from './account';

const TODAY = '2026-10-10';
const NOW = `${TODAY}T12:00:00.000Z`;
const brokerage = (balance: number, cash: number, activities: any[]): AccountSyncPayload => ({
  account: { id: 'acc-s', brokerage_authorization: 'conn-1', name: 'Robinhood Individual', number: '99887766', institution_name: 'Robinhood',
    raw_type: 'Individual', balance: { total: { amount: balance, currency: 'USD' } },
    sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: `${TODAY}T06:00:00Z` } } } as any,
  balancesCash: cash,
  positions: [{ symbol: { id: 'u-vti', raw_symbol: 'VTI', description: 'Vanguard Total', type: { code: 'et' } } as any, units: 30, price: 250, average_purchase_price: 200 }],
  activities,
});
const ACTS = [
  { id: 'd-rev', type: 'DIVIDEND', trade_date: '2026-10-05', amount: -50, symbol: { id: 'u-vti', raw_symbol: 'VTI' } },
  { id: 'f-ref', type: 'FEE', trade_date: '2026-10-06', amount: 5 },
];

/** Sep 30 to Oct 9 recorded, as the account stood each day; today is read from the account itself. */
const recordFor = (acct: any): SnapshotDay[] => {
  let days: SnapshotDay[] = [];
  for (let t = Date.parse('2026-09-30T12:00:00Z'); t <= Date.parse('2026-10-09T12:00:00Z'); t += 864e5) {
    const date = new Date(t).toISOString().slice(0, 10);
    const [cash, total] = date < '2026-10-05' ? [2_500, 10_000] : date < '2026-10-06' ? [2_450, 9_950] : [2_455, 9_955];
    days = record(days, buildDayFromAccounts([{ ...acct, cash_balance: cash, balance: total }], date, `${date}T20:00:00Z`));
  }
  return days;
};
const accountPage = (acct: any, txns: any[], days: SnapshotDay[]) => thePerformance({
  windowStart: '2026-10-01', windowLabel: 'since Sep 30', today: TODAY, holdings: [], transactions: txns,
  snapshotDays: days, investmentAccountIds: new Set([String(acct.asset_id)]), accounts: [acct],
});
const performanceTab = (accounts: any[], txns: any[], days: SnapshotDay[]) => thePerformance({
  windowStart: '2026-10-01', windowLabel: 'since Sep 30', today: TODAY, holdings: [], transactions: txns,
  snapshotDays: days, investmentAccountIds: investmentAccountIdsOf(accounts, assetClassOf as any), accounts,
});
const netWorthReturn = (accounts: any[], txns: any[], days: SnapshotDay[]) =>
  theNetWorth({ uid: 'u', accounts, debts: [], snapshotDays: days, transactions: txns, since: '2026-09-30', today: TODAY }).investableChangePct;

describe('a −$50 dividend reversal and a +$5 fee refund on a $10,000 brokerage', () => {
  const sync = ingestSync([], {}, [brokerage(9_955, 2_455, ACTS)], NOW);
  const acct = sync.accounts[0];
  const id = stAssetId('acc-s');
  const txns = sync.newTransactions;
  const days = recordFor(acct);
  const dividend = txns.find((t) => t.type === 'DIVIDEND')!;
  const fee = txns.find((t) => t.type === 'FEE')!;
  const dropped = txns.map((t) => ({ ...t, direction: undefined }));   // as the sync wrote them until 2026-10-21

  test('the sync keeps the size and the direction: the dividend went OUT, the fee came IN', () => {
    expect(txns).toHaveLength(2);
    expect(dividend).toMatchObject({ type: 'DIVIDEND', amount: 50, direction: 'OUT', account_id: id, ticker: 'VTI' });
    expect(fee).toMatchObject({ type: 'FEE', amount: 5, direction: 'IN', account_id: id });
    expect(moneyIntoAccount(dividend as any)).toBe(-50);
    expect(moneyIntoAccount(fee as any)).toBe(5);
    expect(acct.balance).toBe(9_955);
  });

  test('BEFORE: ACTIVITY read +$50 and −$5, the walk $50 of dividends and −$95 of change, the income +$50', () => {
    const a = theAccount({ account: acct as any, transactions: dropped });
    expect(a.activity.find((r) => r.type === 'DIVIDEND')!.amount).toBe(50);
    expect(a.activity.find((r) => r.type === 'FEE')!.amount).toBe(-5);
    expect(a.income).toBe(50);
    const p = accountPage(acct, dropped, days);
    expect(p.ret).toBeCloseTo(9_955 / 10_000 - 1, 12);
    expect(p.walk!.dividends).toBe(50);
    expect(p.walk!.marketChange).toBe(-95);
  });

  test('NOW: the account page, Performance and Net worth agree — −0.45%, dividends −$50, change in investment value +$5', () => {
    const page = accountPage(acct, txns, days);
    const tab = performanceTab([acct], txns, days);
    const nw = netWorthReturn([acct], txns, days);
    expect(page.ret).toBeCloseTo(-0.0045, 12);
    expect(tab.ret).toBeCloseTo(-0.0045, 12);
    expect(nw).toBeCloseTo(-0.0045, 12);
    for (const w of [page.walk!, tab.walk!]) {
      expect(w.beginning).toBe(10_000);
      expect(w.contributions).toBe(0);
      expect(w.withdrawals).toBe(0);
      expect(w.dividends).toBe(-50);
      expect(w.interest).toBe(0);
      expect(w.wealthGenerated).toBe(-45);
      expect(w.marketChange).toBe(5);
      expect(w.ending).toBe(9_955);
    }
  });

  test('ACTIVITY on the account page: the dividend −$50, the fee +$5; the account\'s income −$50', () => {
    const a = theAccount({ account: acct as any, transactions: txns });
    expect(a.activity.find((r) => r.type === 'DIVIDEND')).toMatchObject({ amount: -50, noAmount: false });
    expect(a.activity.find((r) => r.type === 'FEE')).toMatchObject({ amount: 5, noAmount: false });
    expect(a.income).toBe(-50);
    // every other reader of a stored amount reads the same two signs
    expect(cashEffect(dividend)).toBe(-50);
    expect(cashEffect(fee)).toBe(5);
    expect(personalFlowTotals(txns as any).dividends.toNumber(2)).toBe(-50);
    expect(personalFlowTotals(txns as any).fees.toNumber(2)).toBe(-5);           // a refund lowers the fees paid
    expect(investmentIncomeAnnual(txns, new Date(NOW))).toBe(-50);
    expect(isMoneyOut(fee)).toBe(false);                                           // a refund is not money out
    expect(isMoneyOut({ ...fee, direction: undefined })).toBe(true);               // a fee with no direction still is
  });

  test('the cash kept by hand moves the same way: −$50 then +$5, and undoing each puts it back', () => {
    const start = [{ ...acct, cash_balance: 2_500 } as any];
    const after = applyTransaction(applyTransaction(start, dividend), fee);
    expect(after[0].cash_balance).toBe(2_455);
    const undone = applyTransaction(applyTransaction(after, inverseOf(fee)!), inverseOf(dividend)!);
    expect(undone[0].cash_balance).toBe(2_500);
  });

  test('the rebuilt record puts the $50 back and takes the $5 away on the days before them', () => {
    const both = ingestSync([], {}, [brokerage(9_958, 2_458, [
      { id: 'i0', type: 'INTEREST', trade_date: '2026-10-01', amount: 3 }, ...ACTS])], NOW);
    const out = rebuildDays({ accounts: both.accounts as any, transactions: both.newTransactions as any, priceOn: () => 250, today: TODAY,
      earliest: '2026-09-01', accountIds: new Set([id]), writtenAt: NOW });
    const cashOn = (date: string) => out.days.find((d) => d.date === date)!.accounts.find((x) => x.accountId === id)!.cash;
    expect(cashOn('2026-10-06')).toBe(2_458);
    expect(cashOn('2026-10-05')).toBe(2_453);
    expect(cashOn('2026-10-04')).toBe(2_503);
  });
});

describe('a record saved before 2026-10-21 takes the broker\'s direction, and its real $0, at the one-time full re-fetch', () => {
  const sync = ingestSync([], {}, [brokerage(9_955, 2_455, [...ACTS,
    { id: 'i-zero', type: 'INTEREST', trade_date: '2026-10-07', amount: 0 }])], NOW);
  // as stored before today: no direction, and the real $0 saved as no amount
  const old = sync.newTransactions.map((t) => ({ ...t, direction: undefined, ...(t.type === 'INTEREST' ? { amount: undefined } : {}) }));

  test('the re-fetch imports nothing twice and hands back each one\'s direction and $0', () => {
    const again = ingestSync(sync.accounts, sync.seenKeys, [brokerage(9_955, 2_455, [...ACTS,
      { id: 'i-zero', type: 'INTEREST', trade_date: '2026-10-07', amount: 0 }])], NOW);
    expect(again.newTransactions).toHaveLength(0);
    expect(again.moneyOf).toHaveLength(3);
    const fixed = fixStoredMoney(old, again.moneyOf!);
    expect(fixed.find((t) => t.type === 'DIVIDEND')).toMatchObject({ amount: 50, direction: 'OUT' });
    expect(fixed.find((t) => t.type === 'FEE')).toMatchObject({ amount: 5, direction: 'IN' });
    expect(fixed.find((t) => t.type === 'INTEREST')).toMatchObject({ amount: 0 });
    const a = theAccount({ account: sync.accounts[0] as any, transactions: fixed });
    expect(a.activity.find((r) => r.type === 'DIVIDEND')!.amount).toBe(-50);
    expect(a.activity.find((r) => r.type === 'FEE')!.amount).toBe(5);
    expect(a.activity.find((r) => r.type === 'INTEREST')).toMatchObject({ amount: 0, noAmount: false });
  });

  test('each fix is used once, and a record the person typed or that already states a direction is left alone', () => {
    const fix: StoredMoneyFix = { account_id: 'a', date: '2026-10-05', type: 'DIVIDEND', ticker: 'VTI', size: 50, direction: 'OUT' };
    const rows = [
      { type: 'DIVIDEND', account_id: 'a', date: '2026-10-05', ticker: 'VTI', amount: 50, source: 'connected' },
      { type: 'DIVIDEND', account_id: 'a', date: '2026-10-05', ticker: 'VTI', amount: 50, source: 'connected' },
      { type: 'DIVIDEND', account_id: 'a', date: '2026-10-05', ticker: 'VTI', amount: 50, source: 'manual' },
      { type: 'DIVIDEND', account_id: 'a', date: '2026-10-05', ticker: 'VTI', amount: 50, source: 'connected', direction: 'IN' },
    ];
    const out = fixStoredMoney(rows, [fix, { ...fix, direction: 'IN' }]);
    expect(out.map((t: any) => t.direction ?? null)).toEqual(['OUT', 'IN', null, 'IN']);
    expect(fixStoredMoney(rows, [])).toBe(rows);
  });
});
