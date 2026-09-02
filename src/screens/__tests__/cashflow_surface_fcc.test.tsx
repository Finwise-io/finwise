// THE CASH FLOW SURFACE (v1.3, FINAL mock approved 2026-07-19 — MoneyKeel/documents/other/archive/2026-07-19_moneykeel_pres_mock_cashflow-4tabs_v01.html).
// Pins: four tabs · first-open has doors not zeros · the income pop-up saves CANONICAL fields
// (steady → baseSalary/takehome/monthly; varies → salaryByMonth) · Spending embeds the proven
// Activity body · Debts embeds the debt manager · the month switcher shows past actuals and
// future "planned — an estimate" · the menu no longer lists Budget (the tab covers it).
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CashFlowScreen from '../CashFlowScreen';
import { useStore } from '../../store/useStore';
import { isoLocalDate } from '../../domain/_shared/dates';

var mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: mockPush, replace: jest.fn() }),
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

// THE DOOR MOVED, 2026-08-27. The approved mock (income-v5, frame 2a) replaces the bottom sheet with
// a full screen: a sheet caps at 88% of the display, and three figures plus a fourteen-month table
// plus a second earner never fitted in one. The four pop-up tests that stood here are replaced by
// src/screens/__tests__/base_pay_screen.test.tsx (the screen, frames 2a-2e) and
// src/domain/income/salary-months.test.ts (the month keys, including the cross-year window that the
// rolling-frame test used to pin). What is checked HERE is the door itself.
test('FIRST OPEN: no zeros — the two setup doors; door 1 opens the base-pay screen', () => {
  useStore.setState({ onboardingProfile: {}, onboardingComplete: true } as any);
  render(<CashFlowScreen />);
  expect(screen.getByText('SET UP YOUR MONTH — 2 STEPS')).toBeOnTheScreen();
  expect(screen.queryByText(/\$0/)).toBeNull();                        // the founder's $0 wall is gone
  expect(screen.getByText('1 · Your base pay')).toBeOnTheScreen();
  fireEvent.press(screen.getByLabelText(/Step 1: set up your income/));
  expect(mockPush).toHaveBeenCalledWith('/base-pay');
});

test('Spending tab (approved mock): month header, rows with source chips, categories vs plan, both door links', () => {
  // bucket plans come from the budget fields (spendCats / b_*) — give the fixture a real plan
  useStore.setState({ onboardingProfile: { ...WORKER, b_fixed: '1800', b_flexible: '900' }, onboardingComplete: true } as any);
  (useStore.getState() as any).addExpense({ amount: 86, category: 'Food', store: 'Whole Foods', date: isoLocalDate(new Date()), notes: '' });
  render(<CashFlowScreen />);
  fireEvent.press(screen.getByLabelText('Spending tab'));
  expect(screen.getByText(/· \$86 SPENT/)).toBeOnTheScreen();                  // the month header with the sum
  expect(screen.getByText(/Whole Foods/)).toBeOnTheScreen();
  expect(screen.getByText('by hand')).toBeOnTheScreen();                       // the Teller-ready source chip
  expect(screen.getByText('BY CATEGORY VS PLAN')).toBeOnTheScreen();
  expect(screen.getByText('All transactions · search ›')).toBeOnTheScreen();
  expect(screen.getByText('Import a statement ›')).toBeOnTheScreen();
  // the all-transactions door opens the PROVEN browse/search body
  fireEvent.press(screen.getByLabelText('All transactions — browse, search, edit'));
  expect(screen.getByText('All transactions')).toBeOnTheScreen();
  const { MENU_ITEMS } = jest.requireActual('../../components/TopBar');
  if (MENU_ITEMS) expect(JSON.stringify(MENU_ITEMS)).not.toMatch('/budget');
});

test('Spending tab day one: the three doors (connect SOON · import · by hand), never an empty list', () => {
  useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
  render(<CashFlowScreen />);
  fireEvent.press(screen.getByLabelText('Spending tab'));
  expect(screen.getByText('GET YOUR SPENDING IN')).toBeOnTheScreen();
  expect(screen.getByText('Connect your bank or card')).toBeOnTheScreen();
  expect(screen.getByText('SOON')).toBeOnTheScreen();
  expect(screen.getByText('Import a statement')).toBeOnTheScreen();
  expect(screen.getByText('Add by hand')).toBeOnTheScreen();
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
