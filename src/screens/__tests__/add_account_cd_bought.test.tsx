// DEC-3837 (2026-10-10): adding or editing a CD asks once — "Bought from the bank, or through a broker?" —
// and saves the answer on the account. Not answered = bank. A bond that is not a CD is never asked.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AddAccountScreen from '../AddAccountScreen';
import { useStore } from '../../store/useStore';

let mockParams: any = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

beforeEach(() => { mockParams = {}; useStore.getState().resetAll(); useStore.setState({ nwSeeded: true } as any); });

const typeBond = (name: string) => {
  render(<AddAccountScreen />);
  fireEvent.press(screen.getAllByText('Bonds')[0]);
  fireEvent.changeText(screen.getByLabelText('Account name'), name);
  fireEvent.changeText(screen.getByLabelText(/^Balance/), '9850');
  fireEvent.changeText(screen.getByLabelText('Face value'), '10000');
  fireEvent.changeText(screen.getByLabelText('Coupon percent'), '4.2');
};
const saved = (name: string) => (useStore.getState() as any).assetAccounts.find((a: any) => a.label === name);

test('a CD asks where it was bought, and saves "through a broker"', () => {
  typeBond('Schwab CD');
  expect(screen.getByText('Bought from the bank, or through a broker?')).toBeTruthy();
  fireEvent.press(screen.getByLabelText('CD bought through a broker'));
  fireEvent.press(screen.getByLabelText('Save this account'));
  expect(saved('Schwab CD').cd_bought).toBe('broker');
});

test('a CD left unanswered saves as bought from the bank', () => {
  typeBond('Ally CD');
  fireEvent.press(screen.getByLabelText('Save this account'));
  expect(saved('Ally CD').cd_bought).toBe('bank');
});

test('a bond that is not a CD is never asked', () => {
  typeBond('US Treasury 2028');
  expect(screen.queryByText('Bought from the bank, or through a broker?')).toBeNull();
  fireEvent.press(screen.getByLabelText('Save this account'));
  expect(saved('US Treasury 2028').cd_bought).toBeUndefined();
});

test('editing a CD shows the saved answer and can change it', () => {
  useStore.setState({ assetAccounts: [{ asset_id: 'c1', label: 'Schwab CD', kind: 'cd', asset_class: 'bonds', tax_bucket: 'TAXABLE',
    balance: 9850, target_return: 0.042, face_value: 10000, coupon_rate: 0.042, maturity_date: '2028-10-10', cd_bought: 'broker' }] } as any);
  mockParams = { edit: 'c1' };
  render(<AddAccountScreen />);
  expect(screen.getByLabelText('CD bought through a broker').props.accessibilityState).toEqual({ selected: true });
  fireEvent.press(screen.getByLabelText('CD bought from the bank'));
  fireEvent.press(screen.getByLabelText('Save the update'));
  expect(saved('Schwab CD').cd_bought).toBe('bank');
});
