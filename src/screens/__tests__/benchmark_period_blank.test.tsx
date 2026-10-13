/**
 * MK-NW-F-036 benchmarkInfo — a blank period prints nothing on the Plan's "Your investments" card
 * (outside re-run, Gemini 02, settled 2026-10-13). The function now returns '' for a rate the person set
 * and for a kind with no record; the em-dash it used to return was a screen mark made inside the
 * calculation. This screen is the one place that prints the period (RetirementCockpit, Advisor mode):
 * a blank period must leave no " · — " and no doubled separator behind.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import RetirementCockpit from '../RetirementCockpit';
import { useStore } from '../../store/useStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() }),
  useLocalSearchParams: () => ({}),
  useFocusEffect: () => {},
}));

const OP = { status: 'employed', incomeSources: ['employment'], name: 'Pat', birthYear: String(new Date().getFullYear() - 58),
  baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly', monthlySpending: '5000', targetRetirementAge: '67', horizonAge: '92' };

const seed = (accounts: any[]) => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, onboardingProfile: OP, nwSeeded: true, nwSetupChoice: 'self',
    displayMode: 'advisor', assetAccounts: accounts, liabilities: [], bigCosts: [] } as any);
};

test('a kind with no benchmark record reads "Generic blended estimate · est." — no dash for the blank period', () => {
  // 'brokerage' has no record of its own, so its period is blank ('')
  seed([{ asset_id: 'b', label: 'Brokerage', institution: 'Fidelity', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 100000, retirement_pct: 100 }]);
  render(<RetirementCockpit />);
  expect(screen.getByText(/Generic blended estimate · est\./)).toBeOnTheScreen();
  expect(screen.queryByText(/ · — /)).toBeNull();
  expect(screen.queryByText(/estimate · {2}·|· {2}·/)).toBeNull();
});

test('a kind with a record still prints its period: "S&P 500 total return · 30-yr"', () => {
  seed([{ asset_id: 's', label: 'Index fund', institution: 'Vanguard', kind: 'stocks_etf', tax_bucket: 'TAXABLE', balance: 100000, retirement_pct: 100 }]);
  render(<RetirementCockpit />);
  expect(screen.getByText(/S&P 500 total return · 30-yr/)).toBeOnTheScreen();
});
