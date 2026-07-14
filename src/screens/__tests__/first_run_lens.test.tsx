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

// founder finding 2026-07-15: finishing the QUESTIONS (a profile, not data) must still land on
// the doors — connect / import / add by hand — never a dashboard of fake zeros.
test('answering the questions without any money data still shows the three doors on Home', () => {
  const HomeScreen = require('../HomeScreen').default;
  useStore.setState({
    onboardingComplete: true,
    onboardingProfile: { intents: ['cashflow'], status: 'employed', name: 'Pat' },   // questions answered, zero dollars anywhere
  } as any);
  render(<HomeScreen />);
  expect(screen.getByText("Let's get your real numbers in.")).toBeOnTheScreen();
  expect(screen.getByLabelText('Import a file from your brokerage')).toBeOnTheScreen();
  expect(screen.getByLabelText(/Add something by hand/)).toBeOnTheScreen();
  expect(screen.getByLabelText(/Connect your first account — coming soon/)).toBeOnTheScreen();
});

test('the cash-flow goal card exists and toggles (screen-1 benefit has its matching goal)', () => {
  useStore.getState().resetAll();
  render(<FirstRunScreen />);
  fireEvent.press(screen.getByLabelText('Continue'));                       // intro → questions
  fireEvent.press(screen.getByLabelText('Stay on top of income and spending'));
  fireEvent.press(screen.getByLabelText('Still working'));
  fireEvent.press(screen.getByLabelText('Continue'));
  expect(((useStore.getState() as any).onboardingProfile.intents)).toContain('cashflow');
});

// founder Home-dashboard round (2026-07-15): the will-it-last tease is a SAMPLE, never a real-looking
// claim; the cash-flow snapshot reads the same month figures the rest of Home uses.
test('no odds captured → the locked gauge shows SAMPLE 84% (labeled), never an unlabeled number', () => {
  const HomeScreen = require('../HomeScreen').default;
  useStore.setState({
    onboardingComplete: true,
    onboardingProfile: { status: 'employed', baseSalary: '8000', salaryMode: 'gross', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '20', name: 'Pat' },
  } as any);
  render(<HomeScreen />);
  expect(screen.getByText('SAMPLE')).toBeOnTheScreen();                    // the uncroppable pill
  expect(screen.getByText(/3 quick answers unlock your real number/)).toBeOnTheScreen();
  expect(screen.getByLabelText(/sample, not your number/)).toBeOnTheScreen();
});

test("the cash-flow snapshot card: income/spent/left from the month's own figures", () => {
  const HomeScreen = require('../HomeScreen').default;
  useStore.setState({
    onboardingComplete: true,
    onboardingProfile: { status: 'employed', baseSalary: '8000', salaryMode: 'gross', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '25', name: 'Pat', monthlySpending: '3000' },
    expenses: [{ id: 'e1', amount: 1200, category: 'Groceries', date: new Date().toISOString().slice(0, 10) }],
  } as any);
  render(<HomeScreen />);
  expect(screen.getByText("THIS MONTH'S CASH FLOW")).toBeOnTheScreen();
  expect(screen.getByLabelText(/This month's cash flow: income \$6,000, spent \$1,200, \$4,800 left/)).toBeOnTheScreen();
});
