/** Every window chip on Performance can be tapped (found 2026-09-14): "Since <date>" crashed the screen in
 *  Build 53 and after it, because the words for the window came from a table with no Since entry. This taps
 *  every chip and checks the summary names the window — Since included, measured from where the record starts. */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { employedPartner } from '../../testing/personas';

jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn() }, useSegments: () => [],
}));
const iso = (d: Date) => d.toISOString().slice(0, 10);
const START = iso(new Date(Date.now() - 16 * 86400000)), TODAY = iso(new Date());

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self',
    onboardingProfile: { ...employedPartner, monthlySpending: '4500' },
    assetAccounts: [{ asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 301610, target_return: 0.07,
      source: 'connected', last_synced: `${TODAY}T09:00:00Z`, cash_balance: 4040,
      positions: [{ position_id: 'v1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 105, price: 105, shares: 2834, lots: [{ lot_id: 'l1', shares: 2834, cost_per_share: 88, purchase_date: '2024-01-02' }] }] }],
    liabilities: [], transactions: [{ account_id: 'van', type: 'DIVIDEND', ticker: 'VTI', amount: 1100, date: TODAY }],
    invDaily: { [START]: 300000, [TODAY]: 301610 }, nwDaily: { [START]: 300000, [TODAY]: 301610 } } as any);
});

test('tapping "Since <date>" shows that window instead of crashing, measured from where the record starts', () => {
  const P = require('../PerformanceScreen').default;
  render(<P />);
  const since = screen.getAllByText(/^Since/)[0];
  fireEvent.press(since);
  const label = new Date(`${START}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  expect(screen.getByText(`SUMMARY · SINCE ${label.toUpperCase()}`)).toBeOnTheScreen();
  expect(screen.getByText(new RegExp(`window you picked \\(since ${label}\\)`))).toBeOnTheScreen();
  expect(screen.getByText(`Beginning market value (${label})`)).toBeOnTheScreen();
});

test('every other window chip can be tapped too', () => {
  const P = require('../PerformanceScreen').default;
  render(<P />);
  for (const chip of ['1M', '3M', '6M', 'YTD', '1Y', '2Y']) {
    fireEvent.press(screen.getAllByText(new RegExp(`^${chip}\\b`))[0]);   // the chip reads "1M —" in one line
    expect(screen.getAllByText(/^SUMMARY · /).length).toBeGreaterThan(0);
  }
});
