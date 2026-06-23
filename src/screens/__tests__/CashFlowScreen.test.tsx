/**
 * #15: the cash-flow detail screen — breakdown + month-by-month projection + this month's
 * planned-vs-actual. Numbers come from the same canonical helpers as the rest of the app.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import CashFlowScreen from '../CashFlowScreen';
import { useStore } from '../../store/useStore';

beforeEach(() => useStore.getState().resetAll());

test('renders the breakdown, the monthly projection, and planned-vs-actual', () => {
  useStore.setState({
    onboardingProfile: {
      taxMode: 'manual', manualTaxRate: '20',
      baseSalary: '8000', salaryFreq: 'monthly', c_401k: '500', monthlySpending: '4000',
    },
    expenses: [{ amount: 1000, category: 'Groceries', date: new Date().toISOString().slice(0, 10) }],
  } as any);

  const { getByText } = render(<CashFlowScreen />);
  expect(getByText('A TYPICAL MONTH')).toBeTruthy();
  expect(getByText('= Surplus')).toBeTruthy();                 // the breakdown bottom line
  expect(getByText('SURPLUS, MONTH BY MONTH')).toBeTruthy();   // the projection chart
  expect(getByText('TAKE-HOME vs SPENDING')).toBeTruthy();     // estimates by month
  expect(getByText(/THIS MONTH/)).toBeTruthy();                // planned vs actual
});
