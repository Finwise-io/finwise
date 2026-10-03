// THE CASH FLOW SURFACE (v1.3, FINAL mock approved 2026-07-19 — MoneyKeel/documents/other/archive/2026-07-19_moneykeel_pres_mock_cashflow-4tabs_v01.html).
// Pins: four tabs · first-open has doors not zeros · the income pop-up saves CANONICAL fields
// (steady → baseSalary/takehome/monthly; varies → salaryByMonth) · Expenses embeds the proven
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

test('the four tabs render and switch (This month · Income · Expenses · Debts)', () => {
  useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
  render(<CashFlowScreen />);
  expect(screen.getByLabelText('This month tab, selected')).toBeOnTheScreen();
  expect(screen.getByText(/^PLANNED · /)).toBeOnTheScreen();          // cash-flow_v01: the month's two cards
  expect(screen.getByText('ACTUAL · SO FAR')).toBeOnTheScreen();
  expect(screen.getByLabelText(/^Expenses, your budget, .*Opens your budget\.$/)).toBeOnTheScreen();   // the budget row is the door to the budget
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

// THE EXPENSES TAB, as cash-flow_v01 draws it (frames C and D, approved 2026-09-28; built 2026-10-03).
// The word-for-word comparison is in cashflow_matches_v01.test.tsx; what is checked HERE is that the
// actions the old tab offered still have a way in.
test('Expenses tab: a logged expense lands under "Entered by hand", and the budget, the full list and the import are each one tap away', () => {
  useStore.setState({ onboardingProfile: { ...WORKER, b_fixed: '1800', b_flexible: '900' }, onboardingComplete: true } as any);
  for (let i = 0; i < 6; i += 1) (useStore.getState() as any).addExpense({ amount: 10 + i, category: 'Food', store: `Shop ${i}`, date: isoLocalDate(new Date()), notes: '' });
  render(<CashFlowScreen />);
  fireEvent.press(screen.getByLabelText('Expenses tab'));
  expect(screen.getByText('PLANNED EXPENSES')).toBeOnTheScreen();
  expect(screen.getByText('ENTERED BY HAND')).toBeOnTheScreen();
  expect(screen.getByText('= Entered by hand · 6 items')).toBeOnTheScreen();
  expect(screen.getByText('= Actual expenses, all sources')).toBeOnTheScreen();
  // five, then the rest on a tap — and the rest opens the PROVEN browse / search / edit body
  fireEvent.press(screen.getByLabelText(/^Show all 6 — /));
  expect(screen.getByText('All transactions')).toBeOnTheScreen();
  // the planned rows are the door to the budget; the statement import keeps its one link
  expect(screen.getByLabelText('Planned expenses, by category. Opens your budget.')).toBeOnTheScreen();
  expect(screen.getByLabelText('Import a statement — a CSV from your bank')).toBeOnTheScreen();
});

test('Expenses tab day one: every section keeps its heading, and each empty one offers its door', () => {
  useStore.setState({ onboardingProfile: WORKER, onboardingComplete: true } as any);
  render(<CashFlowScreen />);
  fireEvent.press(screen.getByLabelText('Expenses tab'));
  for (const h of ['MONTHLY RECURRING EXPENSES', 'PLANNED EXPENSES', 'ACTUAL EXPENSES', 'BIG-TICKET RADAR']) expect(screen.getByText(h)).toBeOnTheScreen();
  expect(screen.getByLabelText('Log an expense')).toBeOnTheScreen();
  expect(screen.getByText(/^Nothing unusual\./)).toBeOnTheScreen();
  // one door, one term: "Add by hand" adds an ACCOUNT; this tab logs an EXPENSE and says so
  expect(screen.queryByText('Add by hand')).toBeNull();
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
