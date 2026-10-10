// RENT FROM A PROPERTY KEEPS ARRIVING (founder, 2026-10-04: "add it to the cash as losing job does not
// mean loosing rental income too"). The three screens that state months of cash all read MK-NW-O-004
// theEmergencyFund — so all three count the rent, and each one SAYS so beside its figure, or the
// months could not be followed by hand.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import NetWorthScreen from '../NetWorthScreen';
import JobSafetyScreen from '../JobSafetyScreen';
import StressTestScreen from '../StressTestScreen';
import { useStore } from '../../store/useStore';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }), useLocalSearchParams: () => ({}), useFocusEffect: () => {} }));

const now = new Date();
const monthsAgo = (k: number) => { const d = new Date(now.getFullYear(), now.getMonth() - k, 10); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-10`; };
const SEVEN_MONTHS = [1, 2, 3, 4, 5, 6, 7].map((k) => ({ id: `e${k}`, amount: 3000, category: 'Groceries', store: 'x', date: monthsAgo(k), createdAt: monthsAgo(k) }));
// their own tax rate is a rate on their pay, so the rent row is rent less running costs: $1,500 − $500
const PROFILE = { status: 'employed', incomeSources: ['employment'], baseSalary: '6000', salaryFreq: 'monthly', salaryMode: 'gross',
  taxMode: 'manual', manualTaxRate: '20', monthlySpending: '4200', rentals: [{ type: 'long', income: '1500', expenses: '500' }] };

const seed = (profile: any) => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, onboardingProfile: profile, nwSetupChoice: 'self',
    assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 21000 }], expenses: SEVEN_MONTHS } as any);
};
beforeEach(() => seed(PROFILE));

test('Net worth: $21,000 ÷ ($3,000 − $1,000 of rent) = 10.5 months, with the sum and the reason written out', () => {
  render(<NetWorthScreen />);
  expect(screen.getByText('10.5 months')).toBeOnTheScreen();
  expect(screen.getByText('of essentials covered by your cash — $21,000 cash ÷ ($3,000/month essentials − $1,000/month rent from your property) — 7 month average')).toBeOnTheScreen();
  expect(screen.getByText(/at your planned spend — \$21,000 cash ÷ \(\$4,200\/month − \$1,000\/month rent from your property\)/)).toBeOnTheScreen();
  expect(screen.getByText('Both count $1,000/month of rent from your property, which keeps arriving if your pay stops.')).toBeOnTheScreen();
});

test('Net worth with no rental: the card reads exactly as it did', () => {
  seed({ ...PROFILE, rentals: [] });
  render(<NetWorthScreen />);
  expect(screen.getByText('7.0 months')).toBeOnTheScreen();
  expect(screen.getByText('of essentials covered by your cash — $21,000 cash ÷ $3,000/month essentials — 7 month average')).toBeOnTheScreen();
  expect(screen.queryByText(/rent from your property/)).toBeNull();
});

test('Net worth, rent that pays for the whole month: no months figure, and the sentence says why', () => {
  seed({ ...PROFILE, rentals: [{ type: 'long', income: '5000', expenses: '500' }] });
  render(<NetWorthScreen />);
  expect(screen.getByText('Rent from your property ($4,500/month) pays for your essentials ($3,000/month), so your cash is not drawn on if your pay stops.')).toBeOnTheScreen();
  expect(screen.queryByText(/months$/)).toBeNull();
  expect(screen.queryByText(/tell us your typical monthly expenses/)).toBeNull();
});

test('Stress test: the same 10.5 months, and the note names the rent', () => {
  render(<StressTestScreen />);
  expect(screen.getByText('10.5')).toBeOnTheScreen();
  expect(screen.getByText(/Covering your \$3,000\/month of essentials \(7 month average\) with no paycheck coming in, counting \$1,000\/month of rent from your property, which keeps arriving\./)).toBeOnTheScreen();
  // after the $3,000 hit: $18,000 ÷ $2,000 = 9.0 months
  expect(screen.getByText(/You'd have \$18,000 left — about 9\.0 months of essentials \(\$3,000\/month — 7 month average, less \$1,000\/month rent from your property\)\./)).toBeOnTheScreen();
});

test('Job safety: six months is 6 × ($3,000 − $1,000), and the line shows the sum', () => {
  render(<JobSafetyScreen />);
  expect(screen.getByText(/6 months of essentials is \$12,000 \(\$3,000\/month − \$1,000\/month rent from your property, which keeps arriving\)/)).toBeOnTheScreen();
});

// RENT NOT KNOWN (DEC-3769, founder 2026-10-10): 'How about we say "5 month xx, rent not included. Enter rent to
// include." instead of just showing nothing.' $10,000 cash, $2,000 a month of essentials, a lake house with a
// rent entry whose rent is blank → 5.0 months, counted without that rent, and the card says so.
describe('Net worth emergency fund, rent not known (DEC-3769)', () => {
  const HOME = { asset_id: 'home', label: 'Home', kind: 'home', tax_bucket: 'PROPERTY', re_use: 'primary', balance: 400000 };
  const LAKE = { asset_id: 'lake', label: 'Lake house', kind: 'home', tax_bucket: 'PROPERTY', balance: 250000 };
  const at = (rentals: any, accounts: any[]) => {
    useStore.getState().resetAll();
    useStore.setState({ hideBalances: false, onboardingComplete: true, nwSetupChoice: 'self', expenses: [],
      onboardingProfile: { monthlySpending: '2000', spendCats: [{ id: 'groceries', label: 'Groceries', amount: 2000, bucket: 'flexible', tier: 'need' }], rentals },
      assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 10000 }, ...accounts] } as any);
  };

  test('a blank rent figure: "5.0 months, rent not included. Enter rent to include." beside the months', () => {
    at([{ type: 'long', income: '', expenses: '', property_id: 'lake' }], [HOME, LAKE]);
    render(<NetWorthScreen />);
    expect(screen.getByText('5.0 months')).toBeOnTheScreen();
    expect(screen.getByText('5.0 months, rent not included. Enter rent to include.')).toBeOnTheScreen();
    expect(screen.getByLabelText('5.0 months, rent not included. Enter rent to include. Opens Income.')).toBeOnTheScreen();
  });

  test('rent entered, a second home with no rent entry, or no property: no such line', () => {
    for (const [rentals, accounts] of [[[{ type: 'long', income: '1000', expenses: '0', property_id: 'lake' }], [HOME, LAKE]], [[], [HOME, LAKE]], [[{ type: 'long', income: '', expenses: '' }], []]] as any[]) {
      at(rentals, accounts);
      const { unmount } = render(<NetWorthScreen />);
      expect(screen.queryByText(/rent not included/)).toBeNull();
      unmount();
    }
  });
});
