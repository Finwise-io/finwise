// RENT NOT KNOWN, EVERYWHERE THE MONTHS ARE SHOWN (DEC-3836, 2026-10-10). DEC-3769 put the line on Net worth's
// emergency fund: "<N> months, rent not included. Enter rent to include." His ruling carries it to every screen
// that states the emergency fund's months — Stress test, Job safety, and the runway card on Insights and Home.
// Each screen: a blank rent entry → the line, with that screen's months; rent entered → no line; no property → no line.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import JobSafetyScreen from '../JobSafetyScreen';
import StressTestScreen from '../StressTestScreen';
import InsightsScreen from '../InsightsScreen';
import HomeScreen from '../HomeScreen';
import { useStore } from '../../store/useStore';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }), useLocalSearchParams: () => ({}), useFocusEffect: () => {} }));

const HOME = { asset_id: 'home', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', re_use: 'primary', balance: 400000 };
const LAKE = { asset_id: 'lake', label: 'Lake house', kind: 'home', tax_bucket: 'PROPERTY', balance: 250000 };
const BLANK = [{ type: 'long', income: '', expenses: '', property_id: 'lake' }];
const ENTERED = [{ type: 'long', income: '1000', expenses: '0', property_id: 'lake' }];
// $2,000 a month of essentials (the typed plan; nothing logged)
const at = (cash: number, rentals: any, accounts: any[]) => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, nwSetupChoice: 'self', expenses: [],
    onboardingProfile: { monthlySpending: '2000', spendCats: [{ id: 'groceries', label: 'Groceries', amount: 2000, bucket: 'flexible', tier: 'need' }], rentals },
    assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: cash }, ...accounts] } as any);
};
const NO_LINE: [string, any, any[]][] = [['rent entered', ENTERED, [HOME, LAKE]], ['no property', [], []]];

describe('Stress test (DEC-3836)', () => {
  test('a blank rent figure: $10,000 ÷ $2,000 = 5.0 months, and the line beside them', () => {
    at(10000, BLANK, [HOME, LAKE]);
    render(<StressTestScreen />);
    expect(screen.getByText('5.0')).toBeOnTheScreen();
    expect(screen.getByText('5.0 months, rent not included. Enter rent to include.')).toBeOnTheScreen();
    expect(screen.getByLabelText('5.0 months, rent not included. Enter rent to include. Opens Income.')).toBeOnTheScreen();
  });
  test.each(NO_LINE)('%s: no such line', (_n, rentals, accounts) => {
    at(10000, rentals, accounts);
    render(<StressTestScreen />);
    expect(screen.queryByText(/rent not included/)).toBeNull();
  });
});

describe('Job safety (DEC-3836)', () => {
  test('a blank rent figure: 6 months of essentials is $12,000, and the line names those 6 months', () => {
    at(10000, BLANK, [HOME, LAKE]);
    render(<JobSafetyScreen />);
    expect(screen.getByText(/6 months of essentials is \$12,000 \(\$2,000\/month\)/)).toBeOnTheScreen();
    expect(screen.getByText('6 months, rent not included. Enter rent to include.')).toBeOnTheScreen();
    expect(screen.getByLabelText('6 months, rent not included. Enter rent to include. Opens Income.')).toBeOnTheScreen();
  });
  test.each(NO_LINE)('%s: no such line', (_n, rentals, accounts) => {
    at(10000, rentals, accounts);
    render(<JobSafetyScreen />);
    expect(screen.queryByText(/rent not included/)).toBeNull();
  });
});

// the runway card appears below 3 months: $4,000 ÷ $2,000 = 2.0 months
describe.each([['Insights', InsightsScreen], ['Home', HomeScreen]] as const)('%s runway card (DEC-3836)', (_s, C) => {
  test('a blank rent figure: "about 2.0 months", and the line beside them', () => {
    at(4000, BLANK, [HOME, LAKE]);
    render(<C />);
    expect(screen.getByText(/Your cash covers about 2\.0 months of expenses/)).toBeOnTheScreen();
    expect(screen.getByText('2.0 months, rent not included. Enter rent to include.')).toBeOnTheScreen();
  });
  test.each(NO_LINE)('%s: no such line', (_n, rentals, accounts) => {
    at(4000, rentals, accounts);
    render(<C />);
    expect(screen.queryByText(/rent not included/)).toBeNull();
  });
});
