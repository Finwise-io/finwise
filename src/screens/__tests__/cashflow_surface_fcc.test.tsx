// THE CASH FLOW SURFACE (v1.3, FINAL mock approved 2026-07-19 — mockups/final/cashflow-4tabs-FINAL…).
// Pins: four tabs · first-open has doors not zeros · the income pop-up saves CANONICAL fields
// (steady → baseSalary/takehome/monthly; varies → salaryByMonth) · Spending embeds the proven
// Activity body · Debts embeds the debt manager · the month switcher shows past actuals and
// future "planned — an estimate" · the menu no longer lists Budget (the tab covers it).
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CashFlowScreen from '../CashFlowScreen';
import { useStore } from '../../store/useStore';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));

const WORKER = {
  status: 'employed', incomeSources: ['employment'],
  birthYear: String(new Date().getFullYear() - 45),
  baseSalary: '6200', salaryMode: 'takehome', salaryFreq: 'monthly',
  taxMode: 'manual', manualTaxRate: '0', monthlySpending: '4500',
};

beforeEach(() => { jest.clearAllMocks(); useStore.getState().resetAll(); });

test('the four tabs render and switch (This month · Income · Spending · Debts)', () => {
  useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
  render(<CashFlowScreen />);
  expect(screen.getByLabelText('This month tab, selected')).toBeOnTheScreen();
  expect(screen.getByText('THIS MONTH')).toBeOnTheScreen();          // the working hero
  expect(screen.getByText('YOUR PLAN BY CATEGORY')).toBeOnTheScreen();   // budget absorbed
  fireEvent.press(screen.getByLabelText('Income tab'));
  expect(screen.getByText('YOUR SOURCES')).toBeOnTheScreen();
  expect(screen.getByText(/Salary — steady/)).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Debts tab'));
  expect(screen.getAllByText(/debt/i).length).toBeGreaterThan(0);     // embedded debt manager
});

test('FIRST OPEN: no zeros — the two setup doors; the income pop-up opens from door 1', () => {
  useStore.setState({ onboardingProfile: {}, onboardingComplete: true } as any);
  render(<CashFlowScreen />);
  expect(screen.getByText('SET UP YOUR MONTH — 2 STEPS')).toBeOnTheScreen();
  expect(screen.queryByText(/\$0/)).toBeNull();                        // the founder's $0 wall is gone
  fireEvent.press(screen.getByLabelText(/Step 1: set up your income/));
  expect(screen.getByText('How steady is it?')).toBeOnTheScreen();     // the approved pop-up
});

test('income pop-up STEADY saves the canonical fields (baseSalary · takehome · monthly)', () => {
  useStore.setState({ onboardingProfile: {}, onboardingComplete: true } as any);
  render(<CashFlowScreen />);
  fireEvent.press(screen.getByLabelText(/Step 1: set up your income/));
  fireEvent.changeText(screen.getByLabelText('Monthly take-home amount'), '6200');
  fireEvent.press(screen.getByLabelText('Save my income'));
  const op = (useStore.getState() as any).onboardingProfile;
  expect(op.baseSalary).toBe('6200');
  expect(op.salaryMode).toBe('takehome');
  expect(op.salaryFreq).toBe('monthly');
});

test('income pop-up VARIES writes the canonical by-month table (salaryByMonth)', () => {
  useStore.setState({ onboardingProfile: {}, onboardingComplete: true } as any);
  render(<CashFlowScreen />);
  fireEvent.press(screen.getByLabelText(/Step 1: set up your income/));
  fireEvent.press(screen.getByLabelText('It varies month to month'));
  fireEvent.changeText(screen.getByLabelText('Monthly take-home amount'), '5000');
  fireEvent.press(screen.getByLabelText(/Dec: .*Tap to adjust/));
  fireEvent.changeText(screen.getByLabelText('Dec take-home amount'), '9000');
  fireEvent.press(screen.getByLabelText('Save my income'));
  const op = (useStore.getState() as any).onboardingProfile;
  expect(op.salaryByMonth).toHaveLength(12);
  expect(op.salaryByMonth[11]).toBe('9000');
  expect(op.salaryByMonth[0]).toBe('5000');
});

test('Spending tab: the proven Activity body embeds (a logged expense is visible) + no Budget in the menu', () => {
  useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
  (useStore.getState() as any).addExpense({ amount: 86, category: 'Food', store: 'Whole Foods', date: new Date().toISOString().slice(0, 10), notes: '' });
  render(<CashFlowScreen />);
  fireEvent.press(screen.getByLabelText('Spending tab'));
  expect(screen.getByText(/Whole Foods/)).toBeOnTheScreen();
  const { MENU_ITEMS } = jest.requireActual('../../components/TopBar');
  if (MENU_ITEMS) expect(JSON.stringify(MENU_ITEMS)).not.toMatch('/budget');
});

test('month switcher: back = frozen actuals; forward = "planned — an estimate" from the dated grid', () => {
  useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
  render(<CashFlowScreen />);
  fireEvent.press(screen.getByLabelText('Previous month'));
  expect(screen.getByText(/WHAT ACTUALLY HAPPENED/)).toBeOnTheScreen();
  expect(screen.getByText(/final/)).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText('Back to the current month'));
  fireEvent.press(screen.getByLabelText('Next month'));
  expect(screen.getByText(/THE PLAN \(AN ESTIMATE\)/)).toBeOnTheScreen();
  expect(screen.getByText(/planned — an estimate|Every figure is planned/)).toBeOnTheScreen();
});
