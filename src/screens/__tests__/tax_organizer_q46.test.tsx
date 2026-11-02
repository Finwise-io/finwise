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
  // the one minus, against the figure (CF4-10, 2026-11-01): it read "− $20,000". By hand: $1,666.6667 × 12 = $20,000; 120,000 − 20,000 − 16,100 = 83,900
  // R28 (2026-11-02, FX-CF-C; follow-up the same day): a year from a monthly amount prints to the cent only when, rounded to the cent, it is
  // not whole — $1,666.6667 × 12 = $20,000.0004 → $20,000.00, whole, so "−$20,000"; taxable $120,000 − $20,000.0004 − $16,100 = $83,899.9996
  // → $83,900.00, whole, so "$83,900". A typed $1,666.67 × 12 = $20,000.04 keeps its cents (tax_organizer_round6_2026_11_02).
  expect(screen.getByText('−$20,000')).toBeOnTheScreen();
  expect(screen.getByText('−$16,100')).toBeOnTheScreen();
  expect(screen.getByText('$83,900')).toBeOnTheScreen();
});

test('nothing into a 401(k): the line is still one of the four, and reads $0 (DEC-0252) — taxable $120,000 − $0 − $16,100 = $103,900', () => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, onboardingProfile: {
    status: 'employed', incomeSources: ['employment'], baseSalary: '10000', salaryFreq: 'monthly', salaryMode: 'gross', filingStatus: 'single',
  } } as any);
  render(<TaxOrganizerScreen />);
  expect(screen.getByText('401(k) contribution')).toBeOnTheScreen();
  expect(screen.getByText('$0')).toBeOnTheScreen();
  expect(screen.getByText('$103,900')).toBeOnTheScreen();
});
test.failing('the screen from 2026-11-01 until restored, pinned: with no 401(k) the line was not drawn', () => {
  useStore.getState().resetAll();
  useStore.setState({ hideBalances: false, onboardingComplete: true, onboardingProfile: {
    status: 'employed', incomeSources: ['employment'], baseSalary: '10000', salaryFreq: 'monthly', salaryMode: 'gross', filingStatus: 'single',
  } } as any);
  render(<TaxOrganizerScreen />);
  expect(screen.queryByText('401(k) contribution')).toBeNull();
});
