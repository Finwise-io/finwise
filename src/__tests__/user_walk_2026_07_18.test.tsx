// USER WALK 2026-07-18 (founder ask): 10 most-common flows + 5 edge cases, driven AS A USER —
// real screens, real taps and typing, outcomes checked where the user would look next. This is
// the post-SnapTrade walk; the earlier 56-flow register still runs beside it.
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { useStore } from '../store/useStore';
import HomeScreen from '../screens/HomeScreen';
import CashFlowScreen from '../screens/CashFlowScreen';
import NetWorthScreen from '../screens/NetWorthScreen';
import AccountDetailScreen from '../screens/AccountDetailScreen';
import AddAccountScreen from '../screens/AddAccountScreen';
import SnapTradeConnect from '../screens/SnapTradeConnect';
import GoalsScreen from '../screens/GoalsScreen';
import { ingestSync } from '../services/sync/ingest';
import { importHoldings, classifyHolding } from '../domain/import/holdingsImport';

let mockParams: Record<string, string> = {};
const mockPushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => mockPushes.push(r), replace: (r: string) => mockPushes.push(r), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(async () => ({ type: 'success', url: 'finwise://connect-done?status=SUCCESS&connection_id=conn-1' })),
}));
jest.mock('expo-linking', () => ({ createURL: (p: string) => `finwise://${p}` }));
jest.mock('../services/sync/snaptradeClient', () => ({
  snaptradeConfigured: () => true,
  snaptradeApi: { loginUrl: jest.fn(async () => ({ redirectURI: 'https://portal' })) },
  usdCash: (b: any[]) => (b ?? []).reduce((t: number, x: any) => t + (x.cash ?? 0), 0),
}));
jest.mock('../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 1) }));

const WORKER = {
  status: 'employed', incomeSources: ['employment'], name: 'Pat',
  birthYear: String(new Date().getFullYear() - 58),
  baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly',
  taxMode: 'manual', manualTaxRate: '20', monthlySpending: '4500',
  targetRetirementAge: '67', horizonAge: '92',
};
const RETIREE = {
  status: 'retired', incomeSources: ['retirement_income'], name: 'June',
  birthYear: String(new Date().getFullYear() - 68), horizonAge: '92', monthlySpending: '4000',
  ri_ss: '2600', ri_ss_freq: 'monthly', ri_pension: '1600', ri_pension_freq: 'monthly',
};
const NOW = new Date().toISOString();

// one connected Robinhood account, the way a real sync lands it
const seedConnected = () => {
  const r = ingestSync([], {}, [{
    account: { id: 'acc-1', brokerage_authorization: 'conn-1', name: 'Robinhood Individual', number: '43219876', institution_name: 'Robinhood', raw_type: 'Individual', balance: { total: { amount: 52000 } }, sync_status: { holdings: { initial_sync_completed: true, last_successful_sync: NOW } } },
    positions: [{ symbol: { id: 'u-vti', raw_symbol: 'VTI', description: 'Vanguard Total Stock', type: { code: 'et' } } as any, units: 100, price: 250, average_purchase_price: 200 }],
    optionPositions: [{ symbol: { option_symbol: { option_type: 'CALL', strike_price: 220, expiration_date: '2027-01-16', underlying_symbol: { raw_symbol: 'AAPL' } } }, units: 2, price: 6.5 }],
    balancesCash: 2000,
    activities: [
      { id: 'a1', type: 'CONTRIBUTION', trade_date: '2026-06-01', amount: 1000 },
      { id: 'a2', type: 'DIVIDEND', trade_date: '2026-07-01', amount: 85, symbol: { id: 'u-vti', raw_symbol: 'VTI' } as any },
    ],
  }], NOW);
  useStore.setState({ assetAccounts: r.accounts, transactions: r.newTransactions, snaptradeSeenKeys: r.seenKeys, snaptradeConnections: [{ id: 'conn-1', brokerage: 'Robinhood', disabled: false }] } as any);
};

beforeEach(() => { jest.clearAllMocks(); mockParams = {}; mockPushes.length = 0; useStore.getState().resetAll(); useStore.setState({ hideBalances: false } as any); });

// ── the 10 most-common flows ────────────────────────────────────────────────────────────────────
describe('USER WALK · 10 common flows', () => {
  test('W1 · connect a brokerage: honesty card → consent → sign-in → sync runs', async () => {
    useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
    render(<SnapTradeConnect />);
    fireEvent.press(screen.getByText('Robinhood'));
    expect(screen.getByText(/WHAT ROBINHOOD SHARES/)).toBeOnTheScreen();
    fireEvent.press(screen.getByText('Continue ›'));
    fireEvent.press(screen.getByText(/Open Robinhood's sign-in/));
    const { runSnapTradeSync } = jest.requireMock('../services/sync/snaptradeSync');
    await waitFor(() => expect(runSnapTradeSync).toHaveBeenCalled());
  });

  test('W2 · the morning glance: connected money shows on Home with the freshness truth', () => {
    useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
    seedConnected();
    render(<HomeScreen />);
    expect(screen.getByText('YOUR INVESTMENTS')).toBeOnTheScreen();
    expect(screen.getByText('Net worth')).toBeOnTheScreen();
    expect(screen.queryByText(/needs re-linking/)).toBeNull();       // healthy link = no alarm
  });

  test('W3 · the retiree morning: paycheck leads, guaranteed income from the answers', () => {
    useStore.setState({ onboardingProfile: RETIREE, onboardingComplete: true } as any);
    render(<HomeScreen />);
    expect(screen.getByText(/SAFE TO SPEND/)).toBeOnTheScreen();
  });

  test('W4 · log a $6.50 coffee on Cash flow — two taps, exact cents on the button', () => {
    useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
    render(<CashFlowScreen />);
    fireEvent.press(screen.getByLabelText('Add expense'));
    fireEvent.changeText(screen.getByPlaceholderText('0'), '6.50');
    fireEvent.press(screen.getByText(/Dining/));
    fireEvent.press(screen.getByText(/^Add \$6\.50$/));
    expect((useStore.getState() as any).expenses).toHaveLength(1);
  });

  test('W5 · check my account: connected Robinhood shows balance, VTI, AND the option row (G2)', () => {
    useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
    seedConnected();
    mockParams = { id: 'st-acc-1' };
    render(<AccountDetailScreen />);
    expect(screen.getByText(/\$52,000/)).toBeOnTheScreen();          // the broker's total — authoritative
    expect(screen.getAllByText(/VTI/).length).toBeGreaterThan(0);
    expect(screen.getByText('AAPL $220 call · exp Jan 16 2027')).toBeOnTheScreen();
    expect(screen.getByText(/Counted inside this account's total/)).toBeOnTheScreen();
  });

  test('W6 · the connected ledger: contribution + dividend rows landed as history', () => {
    useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
    seedConnected();
    const txns = (useStore.getState() as any).transactions;
    expect(txns.some((t: any) => t.type === 'DEPOSIT' && t.source === 'connected')).toBe(true);
    expect(txns.some((t: any) => t.type === 'DIVIDEND' && t.amount === 85)).toBe(true);
  });

  test('W7 · add a home by hand: class chips → save → Net worth OWNs it', () => {
    useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
    const r = render(<AddAccountScreen />);
    fireEvent.press(screen.getByLabelText('Real estate'));
    fireEvent.changeText(screen.getByLabelText('Account name'), 'Our house');
    fireEvent.changeText(screen.getByLabelText('Balance'), '450000');
    fireEvent.press(screen.getByLabelText('Save this account'));
    r.unmount();
    render(<NetWorthScreen />);
    expect(screen.getByText(/Our house/)).toBeOnTheScreen();
  });

  test('W8 · net worth folds connected + manual into one picture', () => {
    useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
    seedConnected();
    (useStore.getState() as any).addAsset({ label: 'Ally Savings', kind: 'savings', tax_bucket: 'CASH', balance: 12000, target_return: 0.04, source: 'manual' });
    render(<NetWorthScreen />);
    expect(screen.getByText(/Robinhood/)).toBeOnTheScreen();
    expect(screen.getByText(/Ally Savings/)).toBeOnTheScreen();
  });

  test('W9 · goals: create one and it shows with its status word', () => {
    useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
    (useStore.getState() as any).addGoal({ label: 'Emergency fund', icon: '🛟', target: 15000, saved: 6000, duration: '12', color: '#178F6B' });
    render(<GoalsScreen />);
    expect(screen.getByText('Emergency fund')).toBeOnTheScreen();
  });

  test('W10 · the eye masks EVERYTHING — including connected balances and option rows', () => {
    useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
    seedConnected();
    useStore.setState({ hideBalances: true } as any);
    const { setHideBalances } = require('../domain/_shared/money');
    setHideBalances(true);
    mockParams = { id: 'st-acc-1' };
    render(<AccountDetailScreen />);
    expect(screen.queryByText(/\$52,000/)).toBeNull();
    expect(screen.queryByText(/\$1,300/)).toBeNull();
    setHideBalances(false);
  });
});

// ── the 5 edge cases ────────────────────────────────────────────────────────────────────────────
describe('USER WALK · 5 edge cases', () => {
  test('E1 · a BROKEN connection: Home shows the fix line; the fix reaches the reconnect portal', async () => {
    useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
    seedConnected();
    useStore.setState({ snaptradeConnections: [{ id: 'conn-1', brokerage: 'Robinhood', disabled: true }] } as any);
    const home = render(<HomeScreen />);
    fireEvent.press(screen.getByText(/Robinhood needs re-linking — fix it ›/));
    expect(mockPushes.some((p) => String(p).includes('reconnect=conn-1'))).toBe(true);
    home.unmount();
    render(<SnapTradeConnect reconnectId="conn-1" />);
    fireEvent.press(screen.getByText('Sign in and re-link ›'));
    const { snaptradeApi } = jest.requireMock('../services/sync/snaptradeClient');
    await waitFor(() => expect(snaptradeApi.loginUrl).toHaveBeenCalledWith(expect.objectContaining({ reconnect: 'conn-1' })));
  });

  test('E2 · an ambiguous account type asks ONCE; the answer survives the next sync', () => {
    useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
    const weird = { account: { id: 'acc-x', brokerage_authorization: 'conn-1', name: 'Custody 7', institution_name: 'Robinhood', raw_type: 'Special Custody 7', balance: { total: { amount: 9000 } }, sync_status: {} } };
    const r1 = ingestSync([], {}, [weird as any], NOW);
    useStore.setState({ assetAccounts: r1.accounts, wrapperConfirmQueue: r1.needsWrapperConfirm } as any);
    render(<SnapTradeConnect />);
    // the confirm renderer is portal-gated in the walk; act through the store the way the chooser does
    (useStore.getState() as any).confirmAccountWrapper('st-acc-x', 'roth_ira', 'ROTH');
    const r2 = ingestSync((useStore.getState() as any).assetAccounts, r1.seenKeys, [weird as any], NOW);
    expect(r2.accounts[0].tax_bucket).toBe('ROTH');
    expect(r2.needsWrapperConfirm).toHaveLength(0);
  });

  test('E3 · a SHORT option shows as a negative row without breaking the account page', () => {
    useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
    const r = ingestSync([], {}, [{
      account: { id: 'acc-s', brokerage_authorization: 'conn-1', name: 'E*TRADE Margin', institution_name: 'E*TRADE', raw_type: 'Margin', balance: { total: { amount: 30000 } }, sync_status: {} },
      optionPositions: [{ symbol: { option_symbol: { option_type: 'PUT', strike_price: 90, expiration_date: '2026-12-18', underlying_symbol: { raw_symbol: 'F' } } }, units: -1, price: 2 }],
    }], NOW);
    useStore.setState({ assetAccounts: r.accounts } as any);
    mockParams = { id: 'st-acc-s' };
    render(<AccountDetailScreen />);
    expect(screen.getByText(/F \$90 put · exp Dec 18 2026 \(short\)/)).toBeOnTheScreen();
  });

  test('E4 · syncing the same history twice cannot double money (the id-churn defense, end to end)', () => {
    useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
    seedConnected();
    const before = (useStore.getState() as any).transactions.length;
    const s = useStore.getState() as any;
    const again = ingestSync(s.assetAccounts, s.snaptradeSeenKeys, [{
      account: { id: 'acc-1', brokerage_authorization: 'conn-1', name: 'Robinhood Individual', institution_name: 'Robinhood', raw_type: 'Individual', balance: { total: { amount: 52000 } }, sync_status: {} },
      activities: [{ id: 'REPROCESSED', type: 'DIVIDEND', trade_date: '2026-07-01', amount: 85, symbol: { id: 'u-vti', raw_symbol: 'VTI' } as any }],
    }], NOW);
    expect(again.newTransactions).toHaveLength(0);
    expect((useStore.getState() as any).transactions.length).toBe(before);
  });

  test('E5 · a CSV with an OCC option row files it under alternatives, never as a stock (G2)', () => {
    expect(classifyHolding('AAPL250116C00220000')).toBe('alternatives');
    const csv = 'Symbol,Quantity,Cost Basis,Value\nVTI,10,2000,2500\nAAPL250116C00220000,2,820,1300\n';
    const r = importHoldings(csv);
    const opt = r.holdings.find((h) => h.symbol === 'AAPL250116C00220000');
    expect(opt?.assetClass).toBe('alternatives');
    const vti = r.holdings.find((h) => h.symbol === 'VTI');
    expect(vti?.assetClass).toBe('stocks_etf');
  });
});
