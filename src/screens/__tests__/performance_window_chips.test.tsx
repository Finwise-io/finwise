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
// the screen's own day (local), not the UTC day: after 5pm Pacific the two differ, and this test then
// built its record on tomorrow's date and looked for words the screen never prints (found 2026-10-04)
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const START = iso(new Date(Date.now() - 16 * 86400000)), TODAY = iso(new Date());

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, nwSeeded: true, nwSetupChoice: 'self',
    onboardingProfile: { ...employedPartner, monthlySpending: '4500' },
    assetAccounts: [{ asset_id: 'van', label: 'Vanguard Brokerage', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 301610, target_return: 0.07,
      source: 'connected', last_synced: `${TODAY}T09:00:00Z`, cash_balance: 4040,
      positions: [{ position_id: 'v1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 105, price: 105, shares: 2834, lots: [{ lot_id: 'l1', shares: 2834, cost_per_share: 88, purchase_date: '2024-01-02' }] }] }],
    liabilities: [], transactions: [{ account_id: 'van', type: 'DIVIDEND', ticker: 'VTI', amount: 1100, date: TODAY }],
    invDaily: { [START]: 300000, [TODAY]: 301610 }, nwDaily: { [START]: 300000, [TODAY]: 301610 },
    // the daily record the door reads the beginning from: sixteen days of it
    snapshotDays: [[START, 300000], [TODAY, 301610]].map(([date, v]) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
      accounts: [{ date, accountId: 'van', cash: 0, statedTotal: v, typedValue: v, currency: 'USD' }] })) } as any);
});

test('tapping "Since <date>" shows that window instead of crashing, measured from where the record starts', () => {
  const P = require('../PerformanceScreen').default;
  render(<P />);
  const since = screen.getAllByText(/^Since/)[0];
  fireEvent.press(since);
  // Performance v17 writes every day as month, day, year — and the note names both ends of the window
  const label = new Date(`${START}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const today = new Date(`${TODAY}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  expect(screen.getByText(`SUMMARY · SINCE ${label.toUpperCase()}`)).toBeOnTheScreen();
  expect(screen.getByText(`Return is for the window you picked (${label} → ${today}) — not a yearly rate`)).toBeOnTheScreen();
  expect(screen.getByText(`Beginning market value (${label})`)).toBeOnTheScreen();
  expect(screen.getByText(`Ending market value (${today})`)).toBeOnTheScreen();
});

test('a window the record cannot cover is greyed and cannot be picked; one it covers can', () => {
  const P = require('../PerformanceScreen').default;
  render(<P />);
  // mock v14 (approved 2026-09-25): FIVE windows, each its own segment — 3M, 6M and the initialism
  // "YTD" are gone, and "This year" says it in words. Mock v17 (approved 2026-10-01): on a record
  // sixteen days long none of the four fixed windows is covered, so each shows an em-dash, says so
  // aloud, and a tap on it leaves the screen where it was.
  for (const w of ['1M', 'This year', '1Y', '2Y']) {
    expect(screen.getByLabelText(`Show ${w}, no data for that window yet`).props.accessibilityState.disabled).toBe(true);
    fireEvent.press(screen.getAllByText(w)[0]);
    expect(screen.getByText(/^SUMMARY · SINCE /)).toBeOnTheScreen();
  }
  screen.unmount();
  // give the record two months and the past month is covered: it answers, and it can be picked
  const back = iso(new Date(Date.now() - 62 * 86400000));
  useStore.setState({ snapshotDays: [[back, 290000], [START, 300000], [TODAY, 301610]].map(([date, v]) => ({ date, origin: 'observed', writtenAt: `${date}T00:00:00Z`, holdings: [],
    accounts: [{ date, accountId: 'van', cash: 0, statedTotal: v, typedValue: v, currency: 'USD' }] })) } as any);
  render(<P />);
  fireEvent.press(screen.getAllByText('1M')[0]);
  expect(screen.getByText('SUMMARY · PAST MONTH')).toBeOnTheScreen();
  expect(screen.queryByText('3M')).toBeNull();
  expect(screen.queryByText('6M')).toBeNull();
  expect(screen.queryByText('YTD')).toBeNull();
});

test('the window selector carries each window and its own return, on two lines', () => {
  const P = require('../PerformanceScreen').default;
  render(<P />);
  // the window, and beneath it either its return to two decimals or an em-dash where we have none
  for (const w of ['1M', 'This year', '1Y', '2Y']) expect(screen.getAllByText(w).length).toBeGreaterThan(0);
  const figures = screen.queryAllByText(/^[+−-]?\d+\.\d\d%$/);
  const dashes = screen.queryAllByText('—');
  expect(figures.length + dashes.length).toBeGreaterThanOrEqual(5);
});
