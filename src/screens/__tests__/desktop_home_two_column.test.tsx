// DESKTOP Home — two-column pins (approved shell mock, Home window, 2026-08-03).
// LEFT: glance (net worth line · gauge · this month) · RIGHT: chief-of-staff + investments TABLE.
// Agreement pin: the table's rows sum EXACTLY to investmentsTotal (same accounts, same helpers).
import React from 'react';
import { render, screen, within } from '@testing-library/react-native';
import { Platform } from 'react-native';
import HomeScreen from '../HomeScreen';
import { investTableRows } from '../../../desktop/platform/DesktopInvestTable';
import { investmentsTotal } from '../../domain/assets';
import { useStore } from '../../store/useStore';
import { employedPartner } from '../../testing/personas';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), setParams: jest.fn() },
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: any) => {},
}));

const ACCOUNTS = [
  { asset_id: 'b1', label: 'Brokerage', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 100000 },
  { asset_id: 'bd1', label: 'Treasuries', kind: 'brokerage', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 5000 },
  { asset_id: 'c1', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 8000 },
];
const seed = () => useStore.setState({
  onboardingComplete: true,
  onboardingProfile: { ...employedPartner, monthlySpending: '4500' },
  assetAccounts: ACCOUNTS,
} as any);

const origOS = Platform.OS;
afterEach(() => { (Platform as any).OS = origOS; });
beforeEach(() => { useStore.getState().resetAll(); });

test('AGREEMENT: table rows sum exactly to investmentsTotal — same accounts, same helpers', () => {
  const rows = investTableRows(ACCOUNTS as any);
  const sum = rows.reduce((t, r) => t + r.total, 0);
  expect(sum).toBe(investmentsTotal(ACCOUNTS as any));
  expect(sum).toBe(105000);                                   // stocks 100,000 + bonds 5,000; checking excluded
  expect(rows.map((r) => r.label)).toEqual(['Bonds & CDs', 'Stocks / ETFs']);   // liquidity order, canonical labels
});

test('web renders columns: glance LEFT (net worth · gauge · cash flow), chief-of-staff + table RIGHT', () => {
  (Platform as any).OS = 'web';
  seed();
  render(<HomeScreen />);
  expect(screen.getByTestId('home-desktop-columns')).toBeOnTheScreen();
  const left = screen.getByTestId('home-desktop-left');
  const right = screen.getByTestId('home-desktop-right');
  expect(within(left).getByText('Net worth')).toBeTruthy();
  expect(within(left).getByText('WILL MY MONEY LAST?')).toBeTruthy();
  expect(within(left).getByText(/THIS MONTH'S CASH FLOW/)).toBeTruthy();
  expect(within(right).getByText(/CHIEF OF STAFF — WHAT NEEDS YOU/)).toBeTruthy();
  expect(within(right).getByTestId('desktop-invest-table')).toBeTruthy();
  expect(within(within(right).getByTestId('desktop-invest-table')).getByText('See your growth ›')).toBeTruthy();
});

test('phone keeps the single column — no desktop artifacts', () => {
  seed();
  render(<HomeScreen />);
  expect(screen.queryByTestId('home-desktop-columns')).toBeNull();
  expect(screen.queryByTestId('desktop-invest-table')).toBeNull();
});
