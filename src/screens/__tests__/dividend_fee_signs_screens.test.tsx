/** A −$50 DIVIDEND REVERSAL AND A +$5 FEE REFUND, ON THE THREE REAL SCREENS (2026-10-21) — the account page, Performance and
 *  Net worth agree on the sign and the return.
 *
 *  A $10,000 brokerage (VTI 30 × $250 = $7,500 + cash $2,500). The broker sends a −$50 DIVIDEND on Oct 5 (a reversal, $50 that
 *  left) and a +$5 FEE on Oct 6 (a refund, $5 that came in); the account ends at $9,955. Worked by hand: neither is money put
 *  in or taken out, so the return is $9,955 ÷ $10,000 − 1 = −0.45% on all three screens; wealth generated −$45 = dividends
 *  −$50 + change in investment value +$5; ACTIVITY shows −$50 and +$5. Before 2026-10-21 the sync dropped both directions:
 *  ACTIVITY read +$50 and −$5, and the walk read $50 of dividends with −$95 of change in investment value.
 *  The logic behind each figure: MoneyKeel/functions/networth-and-performance/dividend_fee_signs.test.ts.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import PerformanceScreen from '../PerformanceScreen';
import NetWorthScreen from '../NetWorthScreen';
import { useStore } from '../../store/useStore';
import { employedPartner } from '../../testing/personas';
import { ingestSync, type AccountSyncPayload } from '../../services/sync/ingest';
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
  positions: [{ symbol: { id: 'u-vti', raw_symbol: 'VTI', description: 'Vanguard Total', type: { code: 'et' } } as any, units: 30, price: 250, average_purchase_price: 200 }],
  activities,
});
/** Sep 30 to Oct 9 recorded: $10,000 until Oct 5, $9,950 after the reversal, $9,955 after the refund. */
const recordFor = (acct: any): SnapshotDay[] => {
  let days: SnapshotDay[] = [];
  for (let t = Date.parse('2026-09-30T12:00:00Z'); t <= Date.parse('2026-10-09T12:00:00Z'); t += 864e5) {
    const date = new Date(t).toISOString().slice(0, 10);
    const [cash, total] = date < '2026-10-05' ? [2_500, 10_000] : date < '2026-10-06' ? [2_450, 9_950] : [2_455, 9_955];
    days = record(days, buildDayFromAccounts([{ ...acct, cash_balance: cash, balance: total }], date, `${date}T20:00:00Z`));
  }
  return days;
};
const VTI = { ticker: 'VTI', points: [{ date: '2024-09-30', close: 250 }, { date: '2026-09-30', close: 250 }, { date: TODAY, close: 250 }] };

function seed(payload: AccountSyncPayload) {
  const sync = ingestSync([], {}, [payload], NOW);
  const acct = sync.accounts[0];
  useStore.getState().resetAll();
  useStore.setState({
    onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self', hideBalances: false,
    onboardingProfile: { ...employedPartner }, liabilities: [],
    assetAccounts: sync.accounts, transactions: sync.newTransactions, snapshotDays: recordFor(acct),
    nwDaily: { '2026-09-30': 10_000, [TODAY]: acct.balance }, priceCache: { VTI }, pricesFetchedAt: NOW,
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

const pay = () => brokerage(9_955, 2_455, [
  { id: 'd-rev', type: 'DIVIDEND', trade_date: '2026-10-05', amount: -50, symbol: { id: 'u-vti', raw_symbol: 'VTI' } },
  { id: 'f-ref', type: 'FEE', trade_date: '2026-10-06', amount: 5 },
]);

/** The walk's lines, in order, as printed under its heading. */
const walkLines = () => { const ls = lines(); const at = ls.indexOf('Beginning market value (Sep 30, 2026)'); return ls.slice(at, at + 16); };
const WALK = ['Beginning market value (Sep 30, 2026)', '$10,000', 'Contributions', '$0', 'Withdrawals', '$0', 'Wealth generated', '−$45',
  'Dividends', '−$50', 'Interest', '$0', 'Change in investment value', '$5', 'Ending market value (Oct 10, 2026)', '$9,955'];
/** An ACTIVITY row: its words, its day and its amount, as printed. */
const row = (words: string, day: string) => { const ls = lines(); const at = ls.indexOf(day); expect(ls[at - 1]).toBe(words); return ls[at + 1]; };

describe('a −$50 dividend reversal and a +$5 fee refund on a $10,000 brokerage', () => {
  test('the account page: Return −0.45%, wealth generated −$45, dividends −$50 — and ACTIVITY shows −$50 and $5', () => {
    const { acct } = seed(pay());
    mockParams = { id: String(acct.asset_id) };
    render(<AccountPortfolioScreen />);
    expect(under('Return')).toBe('−0.45%');
    expect(walkLines()).toEqual(WALK);
    expect(row('Dividend · VTI', 'Oct 5 · from Robinhood')).toBe('−$50');
    expect(row('Fee', 'Oct 6 · from Robinhood')).toBe('$5');
  });

  test('Performance: the same — Return −0.45%, the same walk', () => {
    seed(pay());
    mockParams = {};
    render(<PerformanceScreen />);
    expect(under('Return')).toBe('−0.45%');
    expect(walkLines()).toEqual(WALK);
  });

  test('Net worth: the same — change −$45, return on cash + investments −0.45%', () => {
    seed(pay());
    mockParams = {};
    render(<NetWorthScreen />);
    expect(changeLine()).toMatch(/Change in net worth −\$45 · Return on cash \+ investments −0\.45%/);
  });

  test('BEFORE (directions dropped, as the sync saved them until 2026-10-21): ACTIVITY read $50 and −$5, the walk $50 of dividends', () => {
    const { acct, txns } = seed(pay());
    useStore.setState({ transactions: txns.map((t) => ({ ...t, direction: undefined })) } as any);
    mockParams = { id: String(acct.asset_id) };
    render(<AccountPortfolioScreen />);
    expect(row('Dividend · VTI', 'Oct 5 · from Robinhood')).toBe('$50');
    expect(row('Fee', 'Oct 6 · from Robinhood')).toBe('−$5');
    expect(walkLines().slice(8, 14)).toEqual(['Dividends', '$50', 'Interest', '$0', 'Change in investment value', '−$95']);
    expect(under('Return')).toBe('−0.45%');   // the return was right then too: neither record is money put in or taken out
  });
});
