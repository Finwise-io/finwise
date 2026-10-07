// THE OUTSIDE REVIEW OF NET WORTH BATCH 5, ON THE SCREENS (2026-10-07). The functions are held by
// MoneyKeel/functions/networth-and-performance/outside_networth_05.test.ts; this holds what a person
// reads. Before the fixes a face value or a rate never entered was read as $0, so:
//   1. The Bonds screen printed "face $0" and "0.00% coupon" for a bond whose figures were never typed.
//   2. A CD typed by its balance and rate counted $0 a year in the Bonds screen's coupon total.
//   3. An account's BOND FACTS vanished whole when its face value was missing, rate and date included.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import BondsScreen from '../BondsScreen';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import { useStore } from '../../store/useStore';

let mockParams: Record<string, string | undefined> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => mockParams,
  useFocusEffect: () => {},
}));

const WORKER = { status: 'employed', incomeSources: ['employment'], name: 'Pat', birthYear: String(new Date().getFullYear() - 58),
  baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '5000', targetRetirementAge: '67', horizonAge: '92' };
const seed = (accounts: any[]) => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, onboardingProfile: WORKER, nwSeeded: true, nwSetupChoice: 'self', assetAccounts: accounts } as any);
};
beforeEach(() => { mockParams = {}; });

test('1 · a bond with no face value and no rate entered says so on the Bonds screen — never "$0" or "0.00%"', () => {
  seed([{ asset_id: 'b', label: 'Muni bond', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 20000, maturity_date: '2031-06-01' }]);
  render(<BondsScreen />);
  expect(screen.getAllByText(/face value not entered/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/coupon rate not entered/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/face \$0/)).toBeNull();
  expect(screen.queryByText(/0\.00% coupon/)).toBeNull();
  expect(screen.getByText('Average yield leaves out Muni bond — no rate entered.')).toBeOnTheScreen();
});

test('1 · among several bonds, the total face value names the one it leaves out', () => {
  seed([{ asset_id: 'b', label: 'Muni bond', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 20000, coupon_rate: 0.03, maturity_date: '2031-06-01' },
    { asset_id: 't', label: 'Treasury note', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 25000, face_value: 25000, coupon_rate: 0.045, maturity_date: '2030-06-01' }]);
  render(<BondsScreen />);
  expect(screen.getAllByText(/face \$25,000/).length).toBeGreaterThan(0);
  expect(screen.getByText('Face value leaves out Muni bond — not entered.')).toBeOnTheScreen();
});

test('2 · a CD typed by its balance and rate counts balance × rate a year on the Bonds screen', () => {
  seed([{ asset_id: 'cd', label: 'Ally CD', kind: 'cd', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 10000, coupon_rate: 0.05, maturity_date: '2027-06-01' }]);
  render(<BondsScreen />);
  expect(screen.getAllByText(/\$500/).length).toBeGreaterThan(0);          // it read $0
});

test('3 · an account’s BOND FACTS stand when only the face value is missing, and say "not entered"', () => {
  seed([{ asset_id: 'b', label: 'Treasury note', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE', balance: 25000, coupon_rate: 0.045, maturity_date: '2031-06-01' }]);
  mockParams = { id: 'b' };
  render(<AccountPortfolioScreen />);
  expect(screen.getByText('BOND FACTS')).toBeOnTheScreen();                  // the whole card used to vanish
  expect(screen.getAllByText(/not entered/).length).toBeGreaterThan(0);
  expect(screen.queryByText(/comes back — if the issuer pays/)).toBeNull();  // no face, no promise of what comes back
});
