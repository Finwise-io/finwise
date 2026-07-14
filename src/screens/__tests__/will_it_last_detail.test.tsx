// Will-it-last detail — the pins: the headline IS the hub's selector number (one number, opened
// up); every driver is sourced (you set it / estimated) and routes somewhere changeable; the
// not-captured state invites, never guesses.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import WillItLastScreen from '../WillItLastScreen';
import { useStore } from '../../store/useStore';
import { selectWillItLast } from '../../domain/retirement/willItLast';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const RETIREE = {
  status: 'retired', incomeSources: ['retirement_income'],
  birthYear: String(new Date().getFullYear() - 68), horizonAge: '92',
  ri_ss: '2600', ri_ss_freq: 'monthly', monthlySpending: '4500',
};

beforeEach(() => useStore.getState().resetAll());

test('the headline equals the hub selector to the digit, with the range and the plain meaning', () => {
  useStore.setState({
    onboardingProfile: RETIREE,
    assetAccounts: [{ asset_id: 'ira', label: 'IRA', kind: 'trad_ira', tax_bucket: 'PRE_TAX', balance: 415000 }],
  } as any);
  render(<WillItLastScreen />);
  const s = useStore.getState() as any;
  const hub = selectWillItLast({ op: s.onboardingProfile, accounts: s.assetAccounts, assumptions: s.retirementAssumptions, inflationRate: s.inflationRate, employmentStatus: s.employmentStatus, withBand: true });
  expect(screen.getByText(new RegExp(`${hub.word} — ${hub.chance}%`))).toBeOnTheScreen();
  expect(screen.getByText(new RegExp(`range ${hub.band!.low}–${hub.band!.high}%`))).toBeOnTheScreen();
  expect(screen.getByText(new RegExp(`In ${hub.chance} of every 100 futures`))).toBeOnTheScreen();
  // every driver names its source and is a labeled road to change it
  expect(screen.getByLabelText(/What you have \(nest egg\).*your live account balances/)).toBeOnTheScreen();
  expect(screen.getByLabelText(/Guaranteed income.*Opens where you can change it/)).toBeOnTheScreen();
  expect(screen.getByText(/they are one number/)).toBeOnTheScreen();
});

test('nothing captured → the three-questions invitation, never a guessed percent', () => {
  render(<WillItLastScreen />);
  expect(screen.getByText('Answer three questions first')).toBeOnTheScreen();
  expect(screen.getByText(/No guessed numbers/)).toBeOnTheScreen();
  expect(screen.queryByText(/%/)).toBeNull();
});
