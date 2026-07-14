// First run — the lens questions. Pins: the stage answer writes the ONE lensOverride field the
// resolver reads; intents order suggestions only; the retired+paycheck fast-path lands on the
// Monthly-income door; Skip never writes anything and never dead-ends.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import FirstRunScreen from '../FirstRunScreen';
import { useStore } from '../../store/useStore';
import { resolveLens } from '../../domain/profile/lens';

const mockReplaces: string[] = [];
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: (r: string) => mockReplaces.push(r) }),
  useLocalSearchParams: () => ({}),
}));

beforeEach(() => {
  useStore.getState().resetAll();
  mockReplaces.length = 0;
});

test('answering the stage question sets the lens for the whole app (the one resolver field)', () => {
  render(<FirstRunScreen />);
  // STEP 1 (B46): the value intro with the read-only promise comes first
  expect(screen.getByText('MoneyKeel: Your finance command center.')).toBeOnTheScreen();
  expect(screen.getByText(/never move your money/)).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Continue'));
  fireEvent.press(screen.getByLabelText('Retired, or nearly'));
  fireEvent.press(screen.getByLabelText('Continue'));
  const s = useStore.getState() as any;
  expect(s.lensOverride).toBe('retired');
  expect(resolveLens(s.onboardingProfile, s.lensOverride)).toBe('retired');
  expect(s.onboardingProfile.status).toBe('retired');   // the stage answer seeds the profile status
  expect(s.onboardingComplete).toBe(true);              // the light flow IS onboarding (B46)
  expect(mockReplaces).toEqual(['/(tabs)/home']);
});

test('the retired fast-path: paycheck intent + retired → the Monthly-income door (two typed numbers first)', () => {
  render(<FirstRunScreen />);
  fireEvent.press(screen.getByLabelText('Continue'));
  fireEvent.press(screen.getByLabelText('Plan for a secure retirement'));
  fireEvent.press(screen.getByLabelText('Retired, or nearly'));
  fireEvent.press(screen.getByLabelText('Continue'));
  expect(mockReplaces).toEqual(['/monthly-income']);
  expect((useStore.getState() as any).onboardingProfile.intents).toEqual(['paycheck']);
});

test('Skip — just explore writes NOTHING and lands on Home (defaults, no dead end)', () => {
  render(<FirstRunScreen />);
  fireEvent.press(screen.getByLabelText('Skip — just explore'));   // skippable straight from the intro
  const s = useStore.getState() as any;
  expect(s.lensOverride).toBeNull();
  expect(s.onboardingProfile?.intents).toBeUndefined();
  expect(s.onboardingComplete).toBe(true);                          // skip = sensible defaults, still done
  expect(mockReplaces).toEqual(['/(tabs)/home']);
});

test('the consequence sentence renders before the buttons (the a11y spec)', () => {
  render(<FirstRunScreen />);
  fireEvent.press(screen.getByLabelText('Continue'));
  expect(screen.getByText(/This sets up your Home and your tab order/)).toBeOnTheScreen();
});

test('the Settings revisit skips the intro and shows the questions directly, titled Your setup', () => {
  useStore.setState({ onboardingComplete: true } as any);
  render(<FirstRunScreen />);
  expect(screen.queryByText('MoneyKeel: Your finance command center.')).toBeNull();
  expect(screen.getByText('Your setup')).toBeOnTheScreen();
});
