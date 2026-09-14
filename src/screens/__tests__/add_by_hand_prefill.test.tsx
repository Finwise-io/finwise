/** Founder ruling 2026-09-14 ("love it. do it."): accounts named during setup become rows WHICHEVER door is used.
 *  Until today only the Net worth tab created them, so someone who went straight to the Add account form from
 *  Home would never see them. These pin both halves: they appear on the first save, and never twice. */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AddAccountScreen from '../AddAccountScreen';
import { useStore } from '../../store/useStore';
import { employedPartner } from '../../testing/personas';
import { assetsFromOnboarding } from '../../domain/assets';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const addOne = (name: string, balance: string) => {
  render(<AddAccountScreen />);
  fireEvent.changeText(screen.getByLabelText('Account name'), name);
  fireEvent.changeText(screen.getByLabelText(/^Balance/), balance);
  fireEvent.press(screen.getByLabelText('Save this account'));
  screen.unmount();
};

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.getState().setOnboardingProfile(employedPartner as any);
});

test('the first account saved by hand also brings in the accounts named during setup', () => {
  const fromSetup = assetsFromOnboarding('local', employedPartner as any).accounts.length;
  expect(fromSetup).toBeGreaterThan(0);
  addOne('Ally Savings', '20000');
  const s = useStore.getState() as any;
  expect(s.nwSeeded).toBe(true);
  expect(s.assetAccounts.length).toBe(fromSetup + 1);
  expect(s.assetAccounts.some((a: any) => a.label === 'Ally Savings' && a.balance === 20000)).toBe(true);
});

test('a second save never re-creates them, so a setup row someone edited keeps the edit', () => {
  addOne('Ally Savings', '20000');
  const first = (useStore.getState() as any).assetAccounts.find((a: any) => a.label !== 'Ally Savings');
  useStore.getState().updateAsset(first.asset_id, { balance: 12345 } as any);
  addOne('Chase checking', '3000');
  const s = useStore.getState() as any;
  expect(s.assetAccounts.find((a: any) => a.asset_id === first.asset_id)?.balance).toBe(12345);
  expect(s.assetAccounts.filter((a: any) => a.label === first.label).length).toBe(1);
});
