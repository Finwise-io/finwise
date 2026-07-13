/**
 * The Cash flow tab (FCC lens-switched main). The deep pins live in cashflow_fcc.test.tsx;
 * this file keeps the original vocabulary guard: the working lens speaks the canonical
 * after-debt surplus (2026-06-23 decision) and the dated by-month view exists.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import CashFlowScreen from '../CashFlowScreen';
import { useStore } from '../../store/useStore';

beforeEach(() => useStore.getState().resetAll());

test('working lens: this-month in/out + the canonical Planned surplus + dated by-month bars', () => {
  useStore.setState({
    onboardingProfile: {
      status: 'employed', incomeSources: ['employment'],
      taxMode: 'manual', manualTaxRate: '20',
      baseSalary: '8000', salaryFreq: 'monthly', c_401k: '500', monthlySpending: '4000',
    },
    expenses: [{ amount: 1000, category: 'Groceries', date: new Date().toISOString().slice(0, 10) }],
  } as any);

  const { getByText } = render(<CashFlowScreen />);
  expect(getByText('THIS MONTH')).toBeTruthy();
  expect(getByText('In (take-home)')).toBeTruthy();
  expect(getByText('= Planned surplus')).toBeTruthy();       // canonical after-debt vocabulary
  expect(getByText(/BY MONTH ·/)).toBeTruthy();              // the dated F2 window (Jul 26 – Jun 27 style)
  expect(getByText(/Spent so far/)).toBeTruthy();            // planned-vs-actual line
});
