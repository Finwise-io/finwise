// Account detail (FCC Net worth sheet): one page per account — the pins:
//   every recorded action goes through the ONE transactions engine (balance + ledger move together);
//   a transfer moves both sides; the 6-month stale-value nudge re-stamps or updates honestly;
//   the balance shown IS the stored number every total reads (no per-screen recomputation).
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AccountDetailScreen from '../AccountDetailScreen';
import { useStore } from '../../store/useStore';
import { valueFreshness } from '../../domain/assets';

let mockParams: Record<string, string | undefined> = {};
const mockPushes: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: (r: string) => mockPushes.push(r), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

const CHECKING = { asset_id: 'chk', label: 'Checking', institution: 'Chase', kind: 'checking', tax_bucket: 'CASH', balance: 12000 };
const SAVINGS = { asset_id: 'sav', label: 'Savings', institution: 'Chase', kind: 'savings', tax_bucket: 'CASH', balance: 6000 };
const HOME_VALUE = { asset_id: 'hme', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', balance: 650000, value_as_of: '2025-11-30' };

beforeEach(() => {
  useStore.getState().resetAll();
  mockPushes.length = 0;
  mockParams = { id: 'chk' };
  useStore.setState({ assetAccounts: [CHECKING, SAVINGS, HOME_VALUE] } as any);
});

test('shows the balance, class in plain words, and the Manual source chip', () => {
  render(<AccountDetailScreen />);
  expect(screen.getByText('Chase Checking')).toBeOnTheScreen();
  expect(screen.getByText('Manual')).toBeOnTheScreen();
  expect(screen.getByText('$12,000')).toBeOnTheScreen();
  expect(screen.getByText(/Cash · taxable/)).toBeOnTheScreen();
});

test('recording a deposit moves the BALANCE and the LEDGER together (the one engine)', () => {
  render(<AccountDetailScreen />);
  fireEvent.press(screen.getByLabelText('Record a deposit for Checking'));
  fireEvent.changeText(screen.getByLabelText('Amount'), '2000');
  expect(screen.getByText(/\+\$2,000 into Checking/)).toBeOnTheScreen();   // the effect preview
  fireEvent.press(screen.getByLabelText('Save this deposit'));
  const s = useStore.getState() as any;
  expect(s.assetAccounts.find((a: any) => a.asset_id === 'chk').balance).toBe(14000);
  expect(s.transactions[0].type).toBe('DEPOSIT');
  expect(s.transactions[0].amount).toBe(2000);
  expect(s.transactions[0].source).toBeUndefined();   // hand-recorded → F10 never questions it
});

test('a transfer needs a destination and moves BOTH sides', () => {
  render(<AccountDetailScreen />);
  fireEvent.press(screen.getByLabelText('Record a transfer for Checking'));
  fireEvent.changeText(screen.getByLabelText('Amount'), '500');
  fireEvent.press(screen.getByLabelText('Transfer into Savings'));
  expect(screen.getByText(/−\$500 from Checking → \+\$500 into Savings/)).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Save this transfer'));
  const s = useStore.getState() as any;
  expect(s.assetAccounts.find((a: any) => a.asset_id === 'chk').balance).toBe(11500);
  expect(s.assetAccounts.find((a: any) => a.asset_id === 'sav').balance).toBe(6500);
});

test('the activity list shows the ledger newest-first in plain words with signed effects', () => {
  useStore.getState().recordTransaction({ type: 'DEPOSIT', account_id: 'chk' as any, amount: 2000, date: '2026-07-01' } as any);
  useStore.getState().recordTransaction({ type: 'WITHDRAWAL', account_id: 'chk' as any, amount: 300, date: '2026-07-05' } as any);
  render(<AccountDetailScreen />);
  expect(screen.getByLabelText(/2026-07-05: Withdrawal, minus \$300/)).toBeOnTheScreen();
  expect(screen.getByLabelText(/2026-07-01: Deposit, plus \$2,000/)).toBeOnTheScreen();
});

test('a hand-entered value 6+ months old gets the gentle nudge; "Still right" re-stamps today', () => {
  mockParams = { id: 'hme' };
  expect(valueFreshness(HOME_VALUE as any)!.stale).toBe(true);
  render(<AccountDetailScreen />);
  expect(screen.getByText(/months old — still right\?/)).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Still right — keep the amount and re-stamp today'));
  const a = (useStore.getState() as any).assetAccounts.find((x: any) => x.asset_id === 'hme');
  expect(a.balance).toBe(650000);                                    // the amount never changes silently
  expect(a.value_as_of).toBe(new Date().toISOString().slice(0, 10)); // only the honesty stamp moves
});

test('Update value re-stamps the as-of date with the new amount', () => {
  mockParams = { id: 'hme' };
  render(<AccountDetailScreen />);
  fireEvent.press(screen.getByLabelText("Update this account's value"));
  fireEvent.changeText(screen.getByLabelText('Current value'), '680000');
  fireEvent.press(screen.getByLabelText('Save the updated value'));
  const a = (useStore.getState() as any).assetAccounts.find((x: any) => x.asset_id === 'hme');
  expect(a.balance).toBe(680000);
  expect(a.value_as_of).toBe(new Date().toISOString().slice(0, 10));
});

test('property accounts get no money-movement buttons; cash gets exactly deposit/withdraw/transfer', () => {
  render(<AccountDetailScreen />);
  expect(screen.getByLabelText('Record a deposit for Checking')).toBeOnTheScreen();
  expect(screen.queryByLabelText(/Record a coupon/)).toBeNull();
  mockParams = { id: 'hme' };
  render(<AccountDetailScreen />);
  expect(screen.queryByText('RECORD ACTIVITY')).toBeNull();
});

test('an unknown id (a pre-seed setup row) gets the honest fallback, not a crash', () => {
  mockParams = { id: 'nope' };
  render(<AccountDetailScreen />);
  expect(screen.getByText('This one lives in your setup answers')).toBeOnTheScreen();
});
