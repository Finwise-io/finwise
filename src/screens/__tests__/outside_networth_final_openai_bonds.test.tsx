// THE OUTSIDE REVIEW OF NET WORTH (OpenAI final, 2026-10-09), ON THE SCREENS — bonds.
//   MK-NW-M-024: an account's BOND FACTS vanished whole when no coupon rate was entered, taking face value
//   and maturity with it. DEC-2748b + DEC-2748c: the card stands; the rate reads "not entered"; a year's
//   interest reads $0 in the Bonds screen's words, "coupon rate not entered".
//   DEC-2748d: a bond past its maturity date pays no more interest — the Bonds screen's COUPON /year leaves it out.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import BondsScreen from '../BondsScreen';
import AccountPortfolioScreen from '../AccountPortfolioScreen';
import { useStore } from '../../store/useStore';
import { isoLocalDate } from '../../domain/_shared/dates';

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
const dayFromToday = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return isoLocalDate(d); };
beforeEach(() => { mockParams = {}; });

test('M-024 · BOND FACTS stand with no coupon rate: face and maturity shown, rate "not entered", $0 a year said so', () => {
  seed([{ asset_id: 'b', label: 'Treasury note', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE',
    balance: 9800, face_value: 10000, maturity_date: '2031-06-01' }]);
  mockParams = { id: 'b' };
  render(<AccountPortfolioScreen />);
  expect(screen.getByText('BOND FACTS')).toBeOnTheScreen();                   // the whole card used to vanish
  expect(screen.getByText('Face value')).toBeOnTheScreen();
  expect(screen.getAllByText(/\$10,000/).length).toBeGreaterThan(0);
  expect(screen.getByText('Matures')).toBeOnTheScreen();
  expect(screen.getByText(/2031-06-01/)).toBeOnTheScreen();
  expect(screen.getByText('not entered · $0/year — coupon rate not entered')).toBeOnTheScreen();
  // yields that need a rate stay refused
  expect(screen.queryByText('Yield if held to maturity')).toBeNull();
  expect(screen.queryByText("Yield on today's value")).toBeNull();
  expect(screen.queryByText('IF INTEREST RATES MOVE')).toBeNull();
});

test('M-024 · with a rate, the Interest payments line is unchanged', () => {
  seed([{ asset_id: 'b', label: 'Treasury note', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE',
    balance: 9800, face_value: 10000, coupon_rate: 0.05, maturity_date: '2031-06-01' }]);
  mockParams = { id: 'b' };
  render(<AccountPortfolioScreen />);
  expect(screen.getByText('5.00%/year · $500/year')).toBeOnTheScreen();
});

test('DEC-2748d · the Bonds screen COUPON /year leaves out a bond that matured yesterday: $580 → $80', () => {
  seed([{ asset_id: 'x', label: 'Matured note', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE',
    balance: 10000, face_value: 10000, coupon_rate: 0.05, maturity_date: dayFromToday(-1) },
  { asset_id: 'y', label: 'Live note', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE',
    balance: 2000, face_value: 2000, coupon_rate: 0.04, maturity_date: dayFromToday(800) }]);
  render(<BondsScreen />);
  expect(screen.getByText('COUPON /year')).toBeOnTheScreen();
  expect(screen.getByText('$80')).toBeOnTheScreen();
  expect(screen.queryByText('$580')).toBeNull();
});
