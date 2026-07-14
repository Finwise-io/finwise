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
  fireEvent.press(screen.getByLabelText('Retired, or nearly'));
  fireEvent.press(screen.getByLabelText('Continue'));
  const s = useStore.getState() as any;
  expect(s.lensOverride).toBe('retired');
  expect(resolveLens(s.onboardingProfile, s.lensOverride)).toBe('retired');
  expect(mockReplaces).toEqual(['/(tabs)/home']);
});

test('the retired fast-path: paycheck intent + retired → the Monthly-income door (two typed numbers first)', () => {
  render(<FirstRunScreen />);
  fireEvent.press(screen.getByLabelText('A retirement paycheck I can trust'));
  fireEvent.press(screen.getByLabelText('Retired, or nearly'));
  fireEvent.press(screen.getByLabelText('Continue'));
  expect(mockReplaces).toEqual(['/monthly-income']);
  expect((useStore.getState() as any).onboardingProfile.intents).toEqual(['paycheck']);
});

test('Skip — just explore writes NOTHING and lands on Home (defaults, no dead end)', () => {
  render(<FirstRunScreen />);
  fireEvent.press(screen.getByLabelText('A retirement paycheck I can trust'));   // picked but then skipped
  fireEvent.press(screen.getByLabelText('Skip — just explore'));
  const s = useStore.getState() as any;
  expect(s.lensOverride).toBeNull();
  expect(s.onboardingProfile?.intents).toBeUndefined();
  expect(mockReplaces).toEqual(['/(tabs)/home']);
});

test('the consequence sentence renders before the buttons (the a11y spec)', () => {
  render(<FirstRunScreen />);
  expect(screen.getByText(/This sets up your Home and your tab order/)).toBeOnTheScreen();
});
