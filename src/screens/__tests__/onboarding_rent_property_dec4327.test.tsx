/**
 * WHICH PROPERTY IS IT? AT SIGN-UP (DEC-4327, 2026-10-11, his words "1: yes").
 * When a property is already held when the person reaches the rent step, the step asks "Which property is it?" with
 * the Income screen's pick, Continue waits for the pick, and the pick saves property_id on the rent entry — so the
 * rent counts at once (DEC-4059d: a rent entry counts only once it names its property). With no property held, the
 * step keeps today's line and the question waits for the Income screen.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import OnboardingScreen from '../OnboardingScreen';
import IncomeManagerScreen from '../IncomeManagerScreen';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), canGoBack: () => true, setParams: jest.fn() }),
  useLocalSearchParams: () => ({}), router: { push: jest.fn(), back: jest.fn() },
}));

const LAKE = { asset_id: 'lake', label: 'Lake house', asset_class: 'real_estate', tax_bucket: 'REAL_ESTATE', balance: 400_000 };
// steps: status · goals · whatYouNeed · income_sources · income_rental (index 4)
const atRentStep = (accounts: any[]) => {
  useStore.getState().resetAll();
  useStore.setState({
    user: { uid: 't', email: 't@t.com', name: 'T' }, onboardingComplete: false, assetAccounts: accounts,
    onboardingDraft: { stepIndex: 4, status: 'employed', tracks: ['spend'], name: 'T',
      answers: { incomeSources: ['rental'], rentals: [{ type: 'long', income: '1800', expenses: '600' }] } },
  } as any);
  render(<OnboardingScreen />);
};
const savedRent = () => (useStore.getState().onboardingDraft as any).answers.rentals[0];

test('a property already held — the rent step asks which property it is, and Continue waits for the pick', () => {
  atRentStep([LAKE]);
  expect(screen.getByText('Rental property')).toBeOnTheScreen();
  expect(screen.getByText('Which property is it?')).toBeOnTheScreen();
  expect(screen.getByText('Not counted as rent until you pick its property.')).toBeOnTheScreen();
  expect(screen.getByText(/The rent is counted once you pick its property above\./)).toBeOnTheScreen();
  // Continue is blocked: the button says so, and pressing it leaves the person on the rent step
  expect(screen.getByLabelText('Continue →').props.accessibilityState.disabled).toBe(true);
  fireEvent.press(screen.getByText('Continue →'));
  expect(screen.getByText('Rental property')).toBeOnTheScreen();
  expect(savedRent().property_id).toBeUndefined();

  fireEvent.press(screen.getByLabelText('Property 1 is Lake house'));
  expect(savedRent().property_id).toBe('lake');                 // saved on the rent entry, as the Income screen does
  expect(screen.queryByText('Not counted as rent until you pick its property.')).toBeNull();
  expect(screen.getByText('About $14,400/year across 1 property after costs.')).toBeOnTheScreen();
  expect(screen.getByLabelText('Continue →').props.accessibilityState.disabled).toBe(false);
  fireEvent.press(screen.getByText('Continue →'));
  expect(screen.queryByText('Rental property')).toBeNull();     // moved on
});

test('the rent picked at sign-up counts at once in the Income summary', () => {
  atRentStep([LAKE]);
  fireEvent.press(screen.getByLabelText('Property 1 is Lake house'));
  const answers = (useStore.getState().onboardingDraft as any).answers;
  screen.unmount();
  useStore.setState({ onboardingProfile: answers, onboardingComplete: true, hideBalances: false } as any);
  render(<IncomeManagerScreen />);
  expect(screen.getByText('One property · $1,200/month net')).toBeOnTheScreen();
});

test('without the pick the same rent is not counted in the Income summary (DEC-4059d)', () => {
  useStore.getState().resetAll();
  useStore.setState({ assetAccounts: [LAKE], onboardingComplete: true, hideBalances: false,
    onboardingProfile: { incomeSources: ['rental'], rentals: [{ type: 'long', income: '1800', expenses: '600' }] } } as any);
  render(<IncomeManagerScreen />);
  expect(screen.queryByText('One property · $1,200/month net')).toBeNull();
});

test('no property held — today\'s line, no question, Continue open', () => {
  atRentStep([]);
  expect(screen.queryByText('Which property is it?')).toBeNull();
  expect(screen.getByText('About $14,400/year across 1 property after costs. The rent is counted once you pick its property on the Income screen.')).toBeOnTheScreen();
  fireEvent.press(screen.getByText('Continue →'));
  expect(screen.queryByText('Rental property')).toBeNull();
});
