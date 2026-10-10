/**
 * OpenAI final audit of the Net worth module (2026-10-09):
 *  · MK-NW-M-004 / MK-NW-M-008 / MK-NW-M-017 — an account whose balance is absent is left out of What you
 *    own, and its row says "not entered", never "$0" or the refusal sentence (DEC-3279e).
 *  · MK-NW-F-053 — a class the person picks in the editor is marked theirs, so the class sweep keeps it (DEC-2748h).
 */
import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import NetWorthScreen from '../NetWorthScreen';
import { useStore } from '../../store/useStore';
import { reclassifyAccounts } from '../../domain/assets/reclassify';

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false } as any);
});

const seedMissing = () => useStore.setState({
  nwSeeded: true, nwSetupChoice: 'self',
  assetAccounts: [
    { asset_id: 'c1', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 2000, target_return: 0 },
    { asset_id: 'cd1', label: 'Linked CD', institution: 'Ally', kind: 'cd', tax_bucket: 'TAXABLE', target_return: 0.04, source: 'connected' },   // no balance field at all
  ],
  liabilities: [],
} as any);

test('an absent balance: What you own is $2,000, the amber box names the account, the row says "not entered"', () => {
  seedMissing();
  render(<NetWorthScreen />);
  expect(screen.queryByText(/NaN/)).toBeNull();
  expect(screen.getAllByText('$2,000').length).toBeGreaterThan(0);          // What you own, the absent CD left out
  expect(screen.getAllByText(/Ally CD has no balance/).length).toBeGreaterThan(0);   // the amber box names it (its shown name)
  fireEvent.press(screen.getByLabelText(/Group what you own by institution/));
  expect(screen.getByLabelText(/Ally CD, value not entered\. Opens its page\./)).toBeOnTheScreen();
  expect(screen.getAllByText('Value not entered').length).toBeGreaterThan(0);
  expect(screen.getByLabelText(/^Ally, value not entered, 1 account/)).toBeOnTheScreen();
  // his wording, DEC-3657: the bank's line says WHAT is not entered — "Ally · Value not entered"
  expect(screen.queryByText('not entered')).toBeNull();   // a bank with no known balance says so, never $0
});

test('a class picked in the editor is marked as the person\'s, and the sweep keeps it', () => {
  useStore.setState({
    nwSeeded: true,
    assetAccounts: [{ asset_id: 'k1', label: 'Marcus CD ladder', kind: '401k', tax_bucket: 'PRE_TAX', balance: 50000, target_return: 0.07 }],
    liabilities: [],
  } as any);
  const er = jest.requireMock('expo-router');
  const restoreParams = er.useLocalSearchParams;
  er.useLocalSearchParams = () => ({ edit: 'k1' });
  render(<NetWorthScreen />);
  er.useLocalSearchParams = restoreParams;
  fireEvent.press(screen.getByLabelText('Stocks / Funds'));
  fireEvent.press(screen.getByText(/Save \$/));
  const acct = useStore.getState().assetAccounts.find((a: any) => a.asset_id === 'k1') as any;
  expect(acct.asset_class).toBe('stocks_etf');
  expect(acct.class_source).toBe('user');
  // the name says CD, but the person said Stocks / Funds: the sweep leaves it
  const out = reclassifyAccounts([acct]);
  expect(out.accounts[0].asset_class).toBe('stocks_etf');
  expect(out.changed).toBe(0);
});

test('a debt with no balance is named in the amber box, and Net worth counts the debts that are known (DEC-3279e, MK-NW-F-065)', () => {
  useStore.setState({
    nwSeeded: true, nwSetupChoice: 'self',
    assetAccounts: [{ asset_id: 'c1', label: 'Chase Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 100000, target_return: 0 }],
    liabilities: [
      { debt_id: 'd1', label: 'Car loan', remaining_balance: 20000, minimum_payment: 400, interest_rate: 0.06 },
      { debt_id: 'd2', label: 'Personal loan', minimum_payment: 100, interest_rate: 0.09 },   // no balance entered
    ],
  } as any);
  render(<NetWorthScreen />);
  expect(screen.queryByText(/NaN/)).toBeNull();
  expect(screen.getAllByText(/Personal loan has no balance/).length).toBeGreaterThan(0);
  expect(screen.getByLabelText(/^Personal loan, value not entered\. Opens the editor\./)).toBeOnTheScreen();   // the row: never −$0
});

test('by category, an account with no balance stays listed under its class, reading "not entered"', () => {
  seedMissing();
  render(<NetWorthScreen />);
  // the CD is the only Bonds & CDs account and has no balance: its class still shows, and so does it
  expect(screen.getByLabelText(/^Bonds & CDs, value not entered\./)).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText(/^Bonds & CDs, value not entered\./));
  expect(screen.getByLabelText(/^Ally CD, value not entered\. Opens its page\./)).toBeOnTheScreen();
  expect(screen.queryByText(/NaN/)).toBeNull();
});
