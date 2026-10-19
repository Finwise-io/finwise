/** THE ACCOUNT PAGE'S DAY-ONE LINE — his approval, 2026-10-19, his word "approved" (DEC-6075).
 *  On an account's own page, on its first day (nothing recorded and no money moved):
 *   · linked, and the broker sent no past activity → "You linked this account today. <Broker> sent no past activity,
 *     so its figures start today." — the broker's own institution name;
 *   · added by hand today → "You added this account today, so its figures start today."
 *  A linked account whose broker DID send past activity is not day one: its history is rebuilt (state A of the
 *  account-page drawing v01), and neither line shows. Drawing: state C, READ THIS FIRST row 31. */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import { useStore } from '../../store/useStore';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

function seed(account: Record<string, unknown>, transactions: any[] = []) {
  useStore.getState().resetAll();
  mockParams = { id: String(account.asset_id) };
  useStore.setState({ hideBalances: false, assetAccounts: [account], transactions } as any);
}

const LINKED = 'You linked this account today. Fidelity sent no past activity, so its figures start today.';
const BY_HAND = 'You added this account today, so its figures start today.';
const FIDELITY = {
  asset_id: 'f1', label: 'Fidelity Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE',
  balance: 50000, source: 'connected', last_synced: new Date().toISOString(),
  positions: [{ position_id: 'p1', ticker: 'VTI', asset_class: 'stock_etf', last_price: 312.5, lots: [{ lot_id: 'l1', shares: 128, cost_per_share: 300 }] }],
};

test('linked today, no past activity sent: the line names the broker', () => {
  seed(FIDELITY);
  render(<AccountPortfolioScreen />);
  expect(screen.getByText(LINKED)).toBeOnTheScreen();
  expect(screen.queryByText(BY_HAND)).toBeNull();
  expect(screen.queryByText(/Day one: your value is real/)).toBeNull();
});

test('added by hand today: the hand-added line', () => {
  seed({ asset_id: 'h1', label: 'Muni 2029', institution: 'Schwab', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE',
    balance: 10000, face_value: 10000, maturity_date: '2029-06-01', source: 'manual' });
  render(<AccountPortfolioScreen />);
  expect(screen.getByText(BY_HAND)).toBeOnTheScreen();
  expect(screen.queryByText(LINKED)).toBeNull();
  expect(screen.queryByText(/Day one: your value is real/)).toBeNull();
});

test('linked WITH past activity sent is not day one: neither line shows', () => {
  seed(FIDELITY, [{ id: 'd1', account_id: 'f1', type: 'DIVIDEND', ticker: 'VTI', amount: 120, date: '2026-03-02' }]);
  render(<AccountPortfolioScreen />);
  expect(screen.queryByText(LINKED)).toBeNull();
  expect(screen.queryByText(BY_HAND)).toBeNull();
});
