/**
 * The Cash flow tab (FCC lens-switched main). The deep pins live in cashflow_fcc.test.tsx;
 * this file keeps the original vocabulary guard: the working lens speaks the canonical
 * after-debt surplus (2026-06-23 decision) and the dated by-month view exists.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import CashFlowScreen from '../CashFlowScreen';
import { useStore } from '../../store/useStore';
import { isoLocalDate } from '../../domain/_shared/dates';

beforeEach(() => useStore.getState().resetAll());

test('working lens: this-month in/out + the canonical Planned surplus + dated by-month bars', () => {
  useStore.setState({
    onboardingProfile: {
      status: 'employed', incomeSources: ['employment'],
      taxMode: 'manual', manualTaxRate: '20',
      baseSalary: '8000', salaryFreq: 'monthly', c_401k: '500', monthlySpending: '4000',
    },
    expenses: [{ amount: 1000, category: 'Groceries', date: isoLocalDate(new Date()) }],
  } as any);

  const { getByText } = render(<CashFlowScreen />);
  // cash-flow_v01 (approved 2026-09-28), built 2026-10-03: the working month is two cards — what is
  // planned, and what has actually happened — each ending in its own surplus, and nothing after them
  expect(getByText(/^PLANNED · /)).toBeTruthy();
  expect(getByText('Inflow (income (take-home))')).toBeTruthy();
  expect(getByText('= Planned surplus')).toBeTruthy();       // canonical after-debt vocabulary
  expect(getByText('ACTUAL · SO FAR')).toBeTruthy();
  expect(getByText('= Actual surplus so far')).toBeTruthy();
});
