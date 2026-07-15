// PRD F11#13 — comparing two saved scenarios side by side: pick two chips, see dials AND
// re-run outcomes (same engine, today's balances), rows spoken as sentences with 'different'
// flagged in words. Closing changes nothing.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import RetirementCockpit from '../RetirementCockpit';
import { useStore } from '../../store/useStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const WORKER = {
  status: 'employed', incomeSources: ['employment'], name: 'Pat',
  birthYear: String(new Date().getFullYear() - 58),
  baseSalary: '9000', salaryMode: 'gross', salaryFreq: 'monthly',
  taxMode: 'manual', manualTaxRate: '20', monthlySpending: '4500',
  targetRetirementAge: '67', horizonAge: '92',
};

beforeEach(() => {
  useStore.getState().resetAll();
  useStore.setState({
    hideBalances: false, onboardingComplete: true, onboardingProfile: WORKER,
    assetAccounts: [{ asset_id: 'k', label: '401k', kind: '401k', tax_bucket: 'PRE_TAX', balance: 500000 }],
    retirementScenarios: [
      { id: 's1', name: 'Retire 65', createdAt: '2026-07-01', retireAge: 65, chance: 78, assumptions: { retireAge: 65, contribMonthly: 1200, spendMonthly: 4800, expectedReturn: 0.055, inflation: 0.025 } },
      { id: 's2', name: 'Retire 68', createdAt: '2026-07-02', retireAge: 68, chance: 90, assumptions: { retireAge: 68, contribMonthly: 1500, spendMonthly: 4500, expectedReturn: 0.055, inflation: 0.025 } },
    ],
  } as any);
});

test('pick two → the side-by-side shows dials AND re-run outcomes, differences flagged in words', () => {
  render(<RetirementCockpit />);
  fireEvent.press(screen.getByText(/Run scenario analysis/));            // the sandbox hosts the chips
  fireEvent.press(screen.getByLabelText('Compare two scenarios side by side'));
  fireEvent.press(screen.getByLabelText('Retire 65: not picked for comparison'));
  fireEvent.press(screen.getByLabelText('Retire 68: not picked for comparison'));
  expect(screen.getByText(/Side by side — re-run on today's balances/)).toBeOnTheScreen();
  expect(screen.getByLabelText(/Retire at: 65 versus 68 — different/)).toBeOnTheScreen();
  expect(screen.getByLabelText(/Saving \/ month: \$1,200 versus \$1,500 — different/)).toBeOnTheScreen();
  expect(screen.getByLabelText(/Odds it lasts: \d+% versus \d+%/)).toBeOnTheScreen();     // real re-run, not the cached chip
  expect(screen.getByText(/same engine, same balances, only the dials differ/)).toBeOnTheScreen();
});

test('closing the comparison changes nothing (no adoption, no plan writes)', () => {
  const before = JSON.stringify((useStore.getState() as any).retirementAssumptions);
  render(<RetirementCockpit />);
  fireEvent.press(screen.getByText(/Run scenario analysis/));
  fireEvent.press(screen.getByLabelText('Compare two scenarios side by side'));
  fireEvent.press(screen.getByLabelText('Retire 65: not picked for comparison'));
  fireEvent.press(screen.getByLabelText('Retire 68: not picked for comparison'));
  fireEvent.press(screen.getByLabelText('Close the comparison'));
  expect(JSON.stringify((useStore.getState() as any).retirementAssumptions)).toBe(before);
  expect(screen.queryByText(/Side by side/)).toBeNull();
});
