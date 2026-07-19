// BUILD-43 FOUNDER FEEDBACK PINS (2026-07-19) — the workbook lives at
// docs/FCC-core-55-70/build43-feedback-v1-2026-07-19.xlsx. Each # here matches a row there.
// #2: "YOUR INVESTMENTS" needs an info dot saying how investments differ from net worth.
// #3: the approved mock shows a CHANGE line and a DATE under the hero ALWAYS — the build hid both
//     whenever the account was new/empty (exactly the founder's device state). Never again: the
//     empty state renders honest words in the same slots.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import HomeScreen from '../HomeScreen';
import NetWorthScreen from '../NetWorthScreen';
import { useStore } from '../../store/useStore';
import { GLOSSARY } from '../../domain/glossary';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

beforeEach(() => useStore.getState().resetAll());

const freshWorker = () => useStore.setState({
  onboardingProfile: { status: 'employed', incomeSources: ['employment'], baseSalary: '5000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '3500' },
  onboardingComplete: true,
} as any);

test('#2 · the investments info dot exists and the glossary says the difference in plain English', () => {
  freshWorker();
  useStore.setState({ assetAccounts: [{ asset_id: 'a1', label: 'Checking', kind: 'cash', tax_bucket: 'TAXABLE', balance: 1500, target_return: 0 }] } as any);
  render(<HomeScreen />);
  expect(screen.getByLabelText('What is Investments?')).toBeOnTheScreen();
  expect(GLOSSARY.investments.body).toMatch(/net worth/i);
  expect(GLOSSARY.investments.body).toMatch(/\$0 in investments/);
});

test('#3 · Home: $0 invested still shows a change-slot line and a date line under the hero', () => {
  freshWorker();
  render(<HomeScreen />);
  expect(screen.getByText(/nothing invested yet — connect or add an account to start/)).toBeOnTheScreen();
  expect(screen.getByText(/as of \w{3} \d/)).toBeOnTheScreen();
});

test('#3 · Home: holdings without prices say so instead of hiding the line', () => {
  freshWorker();
  useStore.setState({ assetAccounts: [{ asset_id: 'b1', label: 'Brokerage', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 10000, target_return: 0.08 }] } as any);
  render(<HomeScreen />);
  expect(screen.getByText(/change shows once your holdings have prices|▲ up|▼ down/)).toBeOnTheScreen();
  expect(screen.getByText(/as of \w{3} \d|updated/)).toBeOnTheScreen();
});

test('#3 · the hero change is DOLLARS+percent from ONE source — the approved wireframe\'s own numbers round-trip', () => {
  const { periodDollarDelta } = require('../../domain/performance');
  // wireframe: hero $843,700 · "up $11,200 this month" → the return that produced it gives back $11,200
  const ret = 11200 / (843700 - 11200);
  expect(periodDollarDelta(843700, ret)).toBe(11200);
  expect(periodDollarDelta(843700, 0)).toBe(0);
  expect(periodDollarDelta(0, 0.05)).toBe(0);
});

test('#3 · Net worth: first-day account shows the tracking line AND the as-of date, not a bare number', () => {
  freshWorker();
  useStore.setState({ assetAccounts: [{ asset_id: 'a1', label: 'Checking', kind: 'cash', tax_bucket: 'TAXABLE', balance: 1500, target_return: 0 }] } as any);
  render(<NetWorthScreen />);
  expect(screen.getByText(/tracking starts today — change shows as history builds|▲ up|▼ down/)).toBeOnTheScreen();
  expect(screen.getByText(/as of \w{3} \d/)).toBeOnTheScreen();
});

// ── round 2 (device findings on the live E*TRADE connection) ────────────────────────────────────
const { accountDisplayName, accountDisplayNames } = require('../../domain/assets');

test('R2-1 · display names: institution never doubles; a REAL digit mask shows; scrambled broker ids never do', () => {
  expect(accountDisplayName({ label: 'Individual Brokerage', institution: 'Robinhood', mask: '••4821' }))
    .toBe('Robinhood Individual Brokerage ••4821');           // real last-4 digits — useful, shown
  expect(accountDisplayName({ label: 'E*Trade Individual Brokerage', institution: 'E-Trade' }))
    .toBe('E*Trade Individual Brokerage');                    // no "E-Trade E*Trade …" doubling
  // founder catch R3-1: "9Cmw" is E*TRADE's SCRAMBLED id, not account digits — never shown as a mask.
  // Twins instead get a stable ordinal:
  const names = accountDisplayNames([
    { asset_id: 'st-a', label: 'E*Trade Individual Brokerage', institution: 'E-Trade' },
    { asset_id: 'st-b', label: 'E*Trade Individual Brokerage', institution: 'E-Trade' },
  ]);
  expect(names.get('st-a')).toBe('E*Trade Individual Brokerage · 1');
  expect(names.get('st-b')).toBe('E*Trade Individual Brokerage · 2');
  expect(new Set(names.values()).size).toBe(2);               // always tellable apart
});

// ── APPROVED 2026-07-19: class split + daily snapshots + Mixed-holdings line ────────────────────
test('APPROVED split · slices sum EXACTLY to the broker total; manual accounts never split', () => {
  const { accountClassBreakdown } = require('../../domain/assets');
  const connected = {
    asset_id: 'st-x', source: 'connected', balance: 168700, cash_balance: 6800,
    positions: [
      { position_id: 'p1', ticker: '49306SX43', asset_class: 'bond', last_price: 100, lots: [{ shares: 1100, cost_per_share: 100, purchase_date: '' }] },
      { position_id: 'p2', ticker: 'VMFXX', asset_class: 'cash', last_price: 1, lots: [{ shares: 48700, cost_per_share: 1, purchase_date: '' }] },
      { position_id: 'p3', ticker: 'LCTX', asset_class: 'stock_etf', last_price: 1.4, lots: [{ shares: 1000, cost_per_share: 2, purchase_date: '' }] },
    ],
    option_holdings: [{ label: 'QQQ $600 put · exp Dec 31 2026', contracts: 1, value: 1800 }],
  };
  const b = accountClassBreakdown(connected as any)!;
  expect(b.bonds).toBe(110000);
  expect(b.cash).toBe(55500);                        // VMFXX 48,700 + sleeve 6,800
  expect(b.alternatives).toBe(1800);
  expect(b.stocks_etf).toBe(1400);
  expect(Object.values(b).reduce((t: number, v: any) => t + v, 0)).toBe(168700);   // EXACT
  expect(accountClassBreakdown({ asset_id: 'm', source: 'manual', balance: 5000 } as any)).toBeNull();
});

test('APPROVED daily snapshots · two open-days draw the trend; same-day recapture overwrites; retention bounded', () => {
  const { trendPoints, pruneDaily, DAILY_KEEP } = require('../../domain/history');
  const pts = trendPoints({}, { '2026-07-18': 1500, '2026-07-19': 1650 });
  expect(pts).toHaveLength(2);
  expect(pts[1].nw).toBe(1650);
  const s = (useStore.getState() as any);
  s.captureDailyNw('2026-07-19', 1500);
  s.captureDailyNw('2026-07-19', 1650);              // same day → last write wins, ONE point
  expect((useStore.getState() as any).nwDaily['2026-07-19']).toBe(1650);
  expect(Object.keys((useStore.getState() as any).nwDaily)).toHaveLength(1);
  const big: Record<string, number> = {};
  for (let i = 0; i < DAILY_KEEP + 50; i++) big[`2025-01-${String(100 + i)}`] = i;   // synthetic sortable keys
  expect(Object.keys(pruneDaily(big))).toHaveLength(DAILY_KEEP);
});

test('APPROVED detail · a multi-type connected account is called "Mixed holdings", never mislabeled', () => {
  const AccountDetailScreen = require('../AccountDetailScreen').default;
  useStore.setState({
    assetAccounts: [{ asset_id: 'st-m1', label: 'E*Trade Individual Brokerage', institution: 'E-Trade', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 111000, target_return: 0.08, source: 'connected', cash_balance: 1000, last_synced: new Date().toISOString(),
      positions: [{ position_id: 'p1', ticker: '49306SX43', name: 'CD 4.30% due May 2027', asset_class: 'bond', last_price: 100, lots: [{ shares: 1100, cost_per_share: 100, purchase_date: '' }] }] }],
  } as any);
  jest.spyOn(require('expo-router'), 'useLocalSearchParams').mockReturnValue({ id: 'st-m1' });
  render(<AccountDetailScreen />);
  expect(screen.getByText(/Mixed holdings · taxable/)).toBeOnTheScreen();
  expect(screen.getByText(/CD 4\.30% due May 2027/)).toBeOnTheScreen();     // the readable name, not the CUSIP
  expect(screen.getByText('Cash in the account')).toBeOnTheScreen();
});

test('R3-1 · ingest: a scrambled account "number" produces NO mask; real digits produce one', () => {
  const { ingestSync } = require('../../services/sync/ingest');
  const mk = (id: string, number: string) => ({ account: {
    id, brokerage_authorization: 'c1', name: 'Individual Brokerage', number,
    institution_name: 'E-Trade', raw_type: 'INDIVIDUAL', balance: { total: { amount: 1000 } }, sync_status: {},
  } });
  const r = ingestSync([], {}, [mk('a1', '....9Cmw'), mk('a2', '87654821')] as any, '2026-07-19T00:00:00.000Z');
  expect(r.accounts.find((a: any) => a.asset_id === 'st-a1').mask).toBeUndefined();
  expect(r.accounts.find((a: any) => a.asset_id === 'st-a2').mask).toBe('••4821');
});

test('R2-approved-v4 · class rows collapse by default; tapping expands; a lone class auto-expands', () => {
  freshWorker();
  useStore.setState({ assetAccounts: [
    { asset_id: 'c1', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 1500, target_return: 0 },
    { asset_id: 'b1', label: 'Brokerage', institution: 'Fidelity', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 9000, target_return: 0.08 },
  ] } as any);
  render(<NetWorthScreen />);
  expect(screen.queryByText(/Fidelity Brokerage/)).toBeNull();                  // collapsed by default
  fireEvent.press(screen.getByLabelText(/Stocks \/ ETFs.*Expands/));
  expect(screen.getByText(/Fidelity Brokerage/)).toBeOnTheScreen();             // expanded on tap
});

test('R2-approved-v4 · a single class auto-expands so the only account is never hidden', () => {
  freshWorker();
  useStore.setState({ assetAccounts: [{ asset_id: 'c1', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 1500, target_return: 0 }] } as any);
  render(<NetWorthScreen />);
  expect(screen.getByText('Checking')).toBeOnTheScreen();
});
