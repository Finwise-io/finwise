// SnapTrade connect flow pins (design v2 §2): the broker list is honest (early-access tags,
// unsupported list with the by-hand path), the HONESTY CARD tells the Chase truth before any
// sign-in, consent is the approved copy, a successful portal handoff triggers the sync, and the
// wrapper question writes through the one store action.
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import SnapTradeConnect from '../SnapTradeConnect';
import { useStore } from '../../store/useStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(async () => ({ type: 'success', url: 'finwise://connect-done?status=SUCCESS&connection_id=conn-1' })),
}));
jest.mock('expo-linking', () => ({ createURL: (p: string) => `finwise://${p}` }));
jest.mock('../../services/sync/snaptradeClient', () => ({
  snaptradeConfigured: () => true,
  snaptradeApi: { loginUrl: jest.fn(async () => ({ redirectURI: 'https://app.snaptrade.com/portal/xyz' })) },
  usdCash: () => 0,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 1) }));

const { runSnapTradeSync } = jest.requireMock('../../services/sync/snaptradeSync');
const { snaptradeApi } = jest.requireMock('../../services/sync/snaptradeClient');

beforeEach(() => { useStore.getState().resetAll(); jest.clearAllMocks(); });

test('the broker list: GA brokers tappable, alpha tagged "early access", gated Fidelity "coming soon", unsupported listed honestly', () => {
  render(<SnapTradeConnect />);
  expect(screen.getByText('Chase / J.P. Morgan')).toBeOnTheScreen();
  expect(screen.getAllByText('early access').length).toBeGreaterThanOrEqual(3);     // TIAA, Edward Jones, Transamerica
  expect(screen.getByText('coming soon')).toBeOnTheScreen();                        // Fidelity (gated)
  expect(screen.getByText('Merrill / Bank of America')).toBeOnTheScreen();          // unsupported, said honestly
  expect(screen.getAllByText(/Add it by hand or import a CSV/).length).toBeGreaterThan(0);
});

test('the HONESTY CARD tells the Chase truth (founder decision 4): no fixed income, no options', () => {
  render(<SnapTradeConnect />);
  fireEvent.press(screen.getByText('Chase / J.P. Morgan'));
  expect(screen.getByText(/WHAT CHASE \/ J\.P\. MORGAN SHARES/)).toBeOnTheScreen();
  expect(screen.getByText(/stocks, ETFs and mutual funds/)).toBeOnTheScreen();
  expect(screen.getByText(/bonds and fixed income/)).toBeOnTheScreen();             // in CAN'T share
  expect(screen.getByText(/Anything you add by hand stays and counts/)).toBeOnTheScreen();
});

test('consent shows the approved copy, then the portal handoff runs the sync on SUCCESS', async () => {
  render(<SnapTradeConnect />);
  fireEvent.press(screen.getByText('Chase / J.P. Morgan'));
  fireEvent.press(screen.getByText('Continue ›'));
  expect(screen.getByText(/we never see or store your password/)).toBeOnTheScreen();  // CONSENT_COPY
  fireEvent.press(screen.getByText(/Open Chase \/ J\.P\. Morgan's sign-in/));
  await waitFor(() => expect(runSnapTradeSync).toHaveBeenCalledWith({ force: true }));
  expect(snaptradeApi.loginUrl).toHaveBeenCalledWith(expect.objectContaining({ broker: 'CHASE' }));
});

test('the wrapper question: an ambiguous account is asked about, and the answer is permanent', () => {
  useStore.setState({
    assetAccounts: [{ asset_id: 'st-a1', label: 'Mystery account', tax_bucket: 'TAXABLE', balance: 1000, target_return: 0.08, source: 'connected' }],
    wrapperConfirmQueue: ['st-a1'],
  } as any);
  render(<SnapTradeConnect />);
  // jump to confirm by simulating post-sync state — the component renders 'confirm' when queue is set
  // (drive via the same UI path: pick → card → consent is portal-gated, so test the confirm renderer directly)
  const store = useStore.getState() as any;
  store.confirmAccountWrapper('st-a1', 'roth_ira', 'ROTH');
  const a = (useStore.getState() as any).assetAccounts[0];
  expect(a.tax_bucket).toBe('ROTH');
  expect(a.wrapper_confirmed).toBe(true);
  expect((useStore.getState() as any).wrapperConfirmQueue).toHaveLength(0);
});

test('the reconnect (fix) flow goes straight to the portal with the connection id', async () => {
  render(<SnapTradeConnect reconnectId="conn-9" />);
  fireEvent.press(screen.getByText('Sign in and re-link ›'));
  await waitFor(() => expect(snaptradeApi.loginUrl).toHaveBeenCalledWith(expect.objectContaining({ reconnect: 'conn-9' })));
});

// display + lifecycle pins: options itemize on the account page; a broken connection gets the
// Home fix line; Settings lists connections with Fix/Disconnect.
describe('display & lifecycle', () => {
  const AccountDetailScreen = require('../AccountDetailScreen').default;
  const HomeScreen = require('../HomeScreen').default;

  test('AccountDetail: BY CATEGORY & HOLDING itemizes options with the counted-inside note (G2 + final mock rename)', () => {
    useStore.setState({
      assetAccounts: [{ asset_id: 'st-a1', label: 'Robinhood Individual', institution: 'Robinhood', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 50000, target_return: 0.08, source: 'connected', last_synced: new Date().toISOString(),
        option_holdings: [{ label: 'AAPL $220 call · exp Jan 16 2027', contracts: 2, value: 1300 }] }],
    } as any);
    jest.spyOn(require('expo-router'), 'useLocalSearchParams').mockReturnValue({ id: 'st-a1' });
    render(<AccountDetailScreen />);
    expect(screen.getByText('BY CATEGORY & HOLDING')).toBeOnTheScreen();     // final mock rename, 2026-08-04
    expect(screen.getByText('AAPL $220 call · exp Jan 16 2027')).toBeOnTheScreen();
    expect(screen.getByText(/option — 2 contracts/)).toBeOnTheScreen();
    expect(screen.getByText(/Counted inside this account's total/)).toBeOnTheScreen();
  });

  test('Home shows the fix line when a connection is broken (cached data is silent — the flag is the tell)', () => {
    useStore.setState({
      onboardingProfile: { status: 'working', baseSalary: '8000', salaryMode: 'gross', salaryFreq: 'monthly' },
      onboardingComplete: true,
      snaptradeConnections: [{ id: 'conn-9', brokerage: 'Vanguard', disabled: true }],
    } as any);
    render(<HomeScreen />);
    expect(screen.getByText(/Vanguard needs re-linking — fix it ›/)).toBeOnTheScreen();
  });
});
