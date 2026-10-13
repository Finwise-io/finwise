/**
 * MK-NW-F-094 ledgerGroups (outside review OpenAI re-run 03, SETTLED 2026-10-13): an account with no balance is a row of
 * null — not known — never $0 (DEC-3279e, tenet 3). ledgerGroups has ONE caller, the Investments step of the Net worth
 * screen (By class / By institution). This holds that caller: the account still reads "Value not entered", and the
 * group total is the known $100, by class and by institution alike.
 */
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import NetWorthScreen from '../NetWorthScreen';
import { useStore } from '../../store/useStore';

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.setState({
    hideBalances: false, nwSeeded: true, nwSetupChoice: 'guided',
    assetAccounts: [
      { asset_id: 'a', label: 'Bank brokerage A', institution: 'Bank', kind: 'brokerage', tax_bucket: 'TAXABLE', asset_class: 'stocks_etf', target_return: 0.08, balance: null },
      { asset_id: 'b', label: 'Bank brokerage B', institution: 'Bank', kind: 'brokerage', tax_bucket: 'TAXABLE', asset_class: 'stocks_etf', target_return: 0.08, balance: 100 },
    ],
    liabilities: [],
  } as any);
});

const toInvestments = () => { render(<NetWorthScreen />); fireEvent.press(screen.getByText('Next →')); };

test('by class: the account with no balance reads "Value not entered", the Stocks / Funds total is the known $100', () => {
  toInvestments();
  expect(screen.getByText('By class')).toBeOnTheScreen();   // the Investments step, grouped by class (the default)
  expect(screen.getByText('Value not entered')).toBeOnTheScreen();
  expect(screen.getByLabelText(/^Open .*, value not entered/)).toBeOnTheScreen();
  expect(screen.getAllByText('$100').length).toBeGreaterThanOrEqual(2);   // the group total and B's row
  expect(screen.queryByText('$0')).toBeNull();
});

test('by institution: the same — "Value not entered" on the row, the Bank total the known $100, never $0', () => {
  toInvestments();
  fireEvent.press(screen.getByText('By institution'));
  expect(screen.getByText('Bank')).toBeOnTheScreen();
  expect(screen.getByText('Value not entered')).toBeOnTheScreen();
  expect(screen.getAllByText('$100').length).toBeGreaterThanOrEqual(2);
  expect(screen.queryByText('$0')).toBeNull();
});
