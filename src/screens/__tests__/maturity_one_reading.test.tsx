// ONE READING OF A MATURITY DATE, ON THE SCREENS (outside review OpenAI re-run part 4, MK-NW-F-124, SETTLED 2026-10-13).
//   The account page's "This bond matured" banner compared the stored text with today's as strings, and the Bonds
//   screen read the date with its own split — so a date with spaces round it read as matured years early, and a text
//   that is no date ('tomorrow') was shown as today's date. Both now ask the one reader every function asks.
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
const note = (maturity: string) => ({ asset_id: 'b', label: 'Treasury note', kind: 'fixed_income', asset_class: 'bonds', tax_bucket: 'TAXABLE',
  balance: 9800, face_value: 10000, coupon_rate: 0.04, maturity_date: maturity });
beforeEach(() => { mockParams = {}; });

test('MK-NW-F-124 · a future date with spaces round it has not matured — no banner, and the facts read the date', () => {
  seed([note(' 2031-06-01 ')]);
  mockParams = { id: 'b' };
  render(<AccountPortfolioScreen />);
  expect(screen.queryByText(/This bond matured/)).toBeNull();      // ' 2031-06-01 ' <= today as text was true
  expect(screen.getByText(/2031-06-01 \(/)).toBeOnTheScreen();     // written back the one way, years away
});

test('MK-NW-F-124 · a past date still shows the matured banner, its day read by the one reader', () => {
  seed([note('2026-06-30')]);
  mockParams = { id: 'b' };
  render(<AccountPortfolioScreen />);
  expect(screen.getByText(/⏰ This bond matured Jun 30/)).toBeOnTheScreen();
});

test('MK-NW-F-124 · a text that is no date reads "maturity date not entered" on the Bonds screen, never as today', () => {
  seed([note('tomorrow')]);
  render(<BondsScreen />);
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  expect(screen.queryByText(new RegExp(`matures ${today}`))).toBeNull();
  expect(screen.getAllByText(/maturity date not entered/).length).toBeGreaterThan(0);
});
