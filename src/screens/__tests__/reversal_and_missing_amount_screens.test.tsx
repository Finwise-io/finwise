/** THE TWO WRONG NUMBERS OF 2026-10-21, ON THE THREE REAL SCREENS — the account page, Performance and Net worth agree.
 *
 *  The records come through the real sync (ingestSync) and the store, and each screen is rendered as a person opens it.
 *  1. A broker's −$500 deposit — a reversal, $500 that left (DEC-3523 tenet 1). Before: the account page and Performance
 *     read Return −1.98% with $500 put in and $1,000 lost; Net worth read −1.98%. Now: 0.00% on all three, the walk shows
 *     $500 taken out and nothing earned, and ACTIVITY shows −$500.
 *  2. Interest the broker sent with no amount (DEC-3523 tenet 3: unknown is not zero). Before: read as $0 — savings
 *     $10,000 → $10,040 read +0.00% on Net worth, and ACTIVITY showed $0. Now: no percent on any of the three, the account
 *     page and Performance say why, and ACTIVITY shows a dash.
 *  The logic behind each figure is held in MoneyKeel/functions/networth-and-performance/reversal_and_missing_amount.test.ts.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import PerformanceScreen from '../PerformanceScreen';
import NetWorthScreen from '../NetWorthScreen';
import { useStore } from '../../store/useStore';
import { employedPartner } from '../../testing/personas';
import { ingestSync, stAssetId, type AccountSyncPayload } from '../../services/sync/ingest';
import { buildDayFromAccounts, record, type SnapshotDay } from '../../../Calculation Module code/engines/snapshots';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 1) }));

const TODAY = '2026-10-10';
const NOW = `${TODAY}T12:00:00.000Z`;
beforeAll(() => {
  jest.useFakeTimers({ now: new Date(`${TODAY}T12:00:00`), doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] });
});
afterAll(() => jest.useRealTimers());

const brokerage = (balance: number, cash: number, activities: any[]): AccountSyncPayload => ({
  account: { id: 'acc-1', brokerage_authorization: 'conn-1', name: 'Robinhood Individual', number: '99887766', institution_name: 'Robinhood',
    raw_type: 'Individual', balance: { total: { amount: balance, currency: 'USD' } },
    sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: `${TODAY}T06:00:00Z` } } } as any,
  balancesCash: cash,
  positions: [{ symbol: { id: 'u-vti', raw_symbol: 'VTI', description: 'Vanguard Total', type: { code: 'et' } } as any, units: 100, price: 250, average_purchase_price: 200 }],
  activities,
});
const savings = (balance: number, activities: any[]): AccountSyncPayload => ({
  account: { id: 'sav-1', brokerage_authorization: 'conn-2', name: 'Ally Savings', number: '55554444', institution_name: 'Ally',
    raw_type: 'Deposit account', account_category: 'DEPOSIT', balance: { total: { amount: balance, currency: 'USD' } },
    sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: `${TODAY}T06:00:00Z` } } } as any,
  balancesCash: balance, positions: [], activities,
});
/** Sep 30 to Oct 9 recorded: the account as it stood before Oct 5, then as the sync left it. */
const recordFor = (acct: any, before: { cash: number; total: number }): SnapshotDay[] => {
  let days: SnapshotDay[] = [];
  for (let t = Date.parse('2026-09-30T12:00:00Z'); t <= Date.parse('2026-10-09T12:00:00Z'); t += 864e5) {
    const date = new Date(t).toISOString().slice(0, 10);
    const a = date < '2026-10-05' ? { ...acct, cash_balance: before.cash, balance: before.total } : acct;
    days = record(days, buildDayFromAccounts([a], date, `${date}T20:00:00Z`));
  }
  return days;
};
const VTI = { ticker: 'VTI', points: [{ date: '2024-09-30', close: 250 }, { date: '2026-09-30', close: 250 }, { date: TODAY, close: 250 }] };

function seed(payload: AccountSyncPayload, before: { cash: number; total: number }) {
  const sync = ingestSync([], {}, [payload], NOW);
  const acct = sync.accounts[0];
  useStore.getState().resetAll();
  useStore.setState({
    onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self', hideBalances: false,
    onboardingProfile: { ...employedPartner }, liabilities: [],
    assetAccounts: sync.accounts, transactions: sync.newTransactions, snapshotDays: recordFor(acct, before),
    nwDaily: { '2026-09-30': before.total, [TODAY]: acct.balance }, priceCache: { VTI }, pricesFetchedAt: NOW,
  } as any);
  return { acct, txns: sync.newTransactions };
}
/** Every visible line, in order: each Text with what is nested in it, as a person reads one line. */
function lines(): string[] {
  const out: string[] = [];
  const flat = (n: any): string => (typeof n === 'string' ? n : (n?.children ?? []).map(flat).join(''));
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = flat(n).trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}
/** The figure printed under a label in a summary trio. */
const under = (label: string) => { const ls = lines(); const i = ls.indexOf(label); expect(i).toBeGreaterThanOrEqual(0); return ls[i + 1]; };
const changeLine = () => lines().find((l) => l.includes('Change in net worth'))!;

describe('1 · a broker\'s −$500 deposit on Oct 5 — a reversal (DEC-3523 tenet 1)', () => {
  const before = { cash: 25_000, total: 50_000 };
  const pay = () => brokerage(49_500, 24_500, [{ id: 'r1', type: 'CONTRIBUTION', trade_date: '2026-10-05', amount: -500 }]);

  test('the account page: Return +0.00%, $500 taken out, nothing earned — and ACTIVITY shows −$500', () => {
    const { acct } = seed(pay(), before);
    mockParams = { id: String(acct.asset_id) };
    render(<AccountPortfolioScreen />);
    expect(under('Return')).toBe('+0.00%');
    expect(under('Wealth generated')).toBe('$0');
    expect(under('Withdrawals')).toBe('−$500');   // the walk: $500 taken out — it showed $500 put in and $1,000 lost
    expect(under('Contributions')).toBe('$0');
    expect(screen.getAllByLabelText(/^2026-10-05: .*, minus \$500\. from Robinhood, read-only\.$/)).toHaveLength(1);
    expect(lines()).toContain('−$500');
    expect(lines()).not.toContain('+$500');
  });

  test('Performance: the same — Return +0.00%, nothing earned', () => {
    seed(pay(), before);
    mockParams = {};
    render(<PerformanceScreen />);
    expect(under('Return')).toBe('+0.00%');
    expect(under('Wealth generated')).toBe('$0');
  });

  test('Net worth: the same — Return on cash + investments 0.00% (it read −1.98%)', () => {
    seed(pay(), before);
    mockParams = {};
    render(<NetWorthScreen />);
    expect(changeLine()).toMatch(/Change in net worth −\$500 · Return on cash \+ investments 0\.00%/);
  });
});

describe('2 · interest with no amount on Oct 5 — unknown, not $0 (DEC-3523 tenet 3)', () => {
  const SENTENCE = 'Interest on Oct 5, 2026 has no amount in your records, so a return cannot be measured across that day. The Interest line does not count it.';

  test('savings $10,000 → $10,040 — the account page: no Return, the sentence, and a dash in ACTIVITY', () => {
    const { acct } = seed(savings(10_040, [{ id: 'i1', type: 'INTEREST', trade_date: '2026-10-05', amount: null }]), { cash: 10_000, total: 10_000 });
    expect(String(acct.asset_id)).toBe(stAssetId('sav-1'));
    mockParams = { id: String(acct.asset_id) };
    render(<AccountPortfolioScreen />);
    expect(under('Return')).toBe('—');
    expect(lines()).toContain(SENTENCE);
    expect(screen.getAllByLabelText(/^2026-10-05: .*, no amount on record\. from Ally, read-only\.$/)).toHaveLength(1);
    // the ACTIVITY row: its words, its day, and a dash where the amount would be — it read $0 in green before
    const ls = lines();
    const at = ls.indexOf('Oct 5 · from Ally');
    expect(ls.slice(at - 1, at + 2)).toEqual(['Interest · cash in this account', 'Oct 5 · from Ally', '—']);
  });

  test('savings $10,000 → $10,040 — Net worth: the change line carries no percent (it read +0.00%)', () => {
    seed(savings(10_040, [{ id: 'i1', type: 'INTEREST', trade_date: '2026-10-05', amount: null }]), { cash: 10_000, total: 10_000 });
    mockParams = {};
    render(<NetWorthScreen />);
    const line = changeLine();
    expect(line).toMatch(/Change in net worth \+\$40/);
    expect(line).not.toMatch(/Return on cash/);
  });

  test('the same record on a linked brokerage — the account page, Performance and Net worth agree: no percent, one sentence', () => {
    const pay = brokerage(50_040, 25_040, [{ id: 'i1', type: 'INTEREST', trade_date: '2026-10-05', amount: null }]);
    const { acct } = seed(pay, { cash: 25_000, total: 50_000 });
    mockParams = { id: String(acct.asset_id) };
    render(<AccountPortfolioScreen />);
    expect(under('Return')).toBe('—');
    expect(lines()).toContain(SENTENCE);
    screen.unmount();
    mockParams = {};
    render(<PerformanceScreen />);
    expect(under('Return')).toBe('—');
    expect(lines()).toContain(SENTENCE);
    screen.unmount();
    render(<NetWorthScreen />);
    expect(changeLine()).not.toMatch(/Return on cash/);
  });
});
