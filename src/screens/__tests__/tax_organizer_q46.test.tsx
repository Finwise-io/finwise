// Q46 (founder ruling 2026-09-08): the tax organizer shows gross income, the 401(k) contribution,
// the standard deduction and taxable income — the four lines a return shows, in that order.
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import TaxOrganizerScreen from '../TaxOrganizerScreen';
import { useStore } from '../../store/useStore';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }), useLocalSearchParams: () => ({}) }));

test('$120,000 salary, $20,000 into the 401(k), single → the four lines, taxable $83,900', () => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, onboardingProfile: {
    status: 'employed', incomeSources: ['employment'], baseSalary: '10000', salaryFreq: 'monthly', salaryMode: 'gross', c_401k: '1666.6667', filingStatus: 'single',
  } } as any);
  render(<TaxOrganizerScreen />);
  expect(screen.getByText('Gross income')).toBeOnTheScreen();
  expect(screen.getByText('401(k) contribution')).toBeOnTheScreen();
  expect(screen.getByText(/^Standard deduction/)).toBeOnTheScreen();
  expect(screen.getByText('Taxable income')).toBeOnTheScreen();
  expect(screen.getAllByText('$120,000').length).toBe(2);       // the Wages line and the Gross income line
  expect(screen.getByText('− $20,000')).toBeOnTheScreen();
  expect(screen.getByText('− $16,100')).toBeOnTheScreen();
  expect(screen.getByText('$83,900')).toBeOnTheScreen();
});
