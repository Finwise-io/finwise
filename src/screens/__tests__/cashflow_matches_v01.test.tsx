/** THE CASH FLOW TAB AGAINST ITS APPROVED DRAWING, WORD FOR WORD (cash-flow_v01, approved 2026-09-28).
 *
 *  Method and limits: src/testing/mockMatch.ts. Each frame is rendered in the drawing's own data shape
 *  (the fixture reproduces its sums: 5,000 − 2,000 − 250 − 2,000 − 200 − 200 = 350 planned, and
 *  5,000 − 2,000 − 0 − 500 − 1,200 − 200 − 200 = 900 actual) and must give the same words in order.
 *
 *  KNOWN DIFFERENCES, each named where it is applied:
 *  1. "after tax and 401(k)" rides the planned inflow in BOTH frames. The drawing prints it in frame A
 *     and not in frame B; take-home means the same thing with or without a budget, so it is always said.
 *  2. The "＋ Expense" button floats over every tab, in the same corner as on Home. The drawing has no
 *     way to log an expense once one exists (its only "Log an expense" is on the empty Expenses tab),
 *     and a person has to be able to — so the one button the app already had stays.
 *  3. YOUR FUTURE PAYCHECK follows the two cards wherever there is a retirement pot to project from.
 *     It is not on the drawing. It is kept because he ruled on its arithmetic by name (2026-09-08) and
 *     nothing since says to remove it; src/screens/__tests__/cashflow_fcc.test.tsx holds it. These
 *     frames have no accounts, as the drawing has none, so the card does not appear in them.
 */
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import CashFlowScreen from '../CashFlowScreen';
import { useStore } from '../../store/useStore';
import { isoLocalDate } from '../../domain/_shared/dates';
import { norm, drawingLines, builtLines, firstDifference } from '../../testing/mockMatch';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }), useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
}));

const LINES = drawingLines('MoneyKeel/documents/cashflow/moneykeel_pres_mock_cash-flow_v01.html');
const STARTS = LINES.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
const CHROME = new Set(['9:41', '▮▮▮ ⌁', '▦ Menu', 'Money', 'Keel', '◉', '⚙']);
const phone = (n: number): string[] => {
  const seg = LINES.slice(STARTS[n - 1], STARTS[n] ?? LINES.length);
  const end = seg.findIndex((l, k) => (l === '⌂' || l === 'Home') && k > 8);       // the tab bar closes the phone
  return seg.slice(0, end).filter((l) => !CHROME.has(l));
};
const today = isoLocalDate(new Date());
const WORKER = { status: 'employed', incomeSources: ['employment'], birthYear: String(new Date().getFullYear() - 45),
  baseSalary: '5000', salaryMode: 'takehome', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0' };
const DEBTS = [
  { debt_id: 'm', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 300000, interest_rate_apr: 0.05, minimum_monthly_payment: 2000, due_day: 1 },
  { debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9800, interest_rate_apr: 0.064, minimum_monthly_payment: 250, due_day: 28 },
];
const RADAR = [
  { debt_id: 'h', label: 'HELOC', debt_type: 'HELOC', remaining_balance: 20000, interest_rate_apr: 0.08, minimum_monthly_payment: 200 },
  { debt_id: 'v', label: 'Credit card debt payment', debt_type: 'CREDIT_CARD', remaining_balance: 3200, interest_rate_apr: 0.229, minimum_monthly_payment: 200 },
];
const pay = (store: string, amount: number) => ({ id: `p-${store}`, amount, category: 'Debt payment', store, date: today, notes: '', createdAt: today });
const spend = (id: string, amount: number, origin?: string) => ({ id, amount, category: 'Other', store: id, date: today, notes: '', createdAt: today, ...(origin ? { origin } : {}) });
/** The drawing sets its frames in August; the screen is rendered today. A month's name is data. */
const month = (s: string) => s.replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/g, '<month>');
const KNOWN = (s: string) => s.replace(/inflow \(income \(take-home\)\) after tax and #\(k\) \$#/g, 'inflow (income (take-home)) $#')
  .replace(/ expense$/, '');
const check = (drawn: string[], built: string[]) => {
  const want = KNOWN(month(norm(drawn))), got = KNOWN(month(norm(built)));
  expect(want.split(' ').length).toBeGreaterThan(40);
  expect(firstDifference(want, got)).toBe('');
};

test('the drawing still has its six phones — the guard proves it looked', () => { expect(STARTS).toHaveLength(6); });

test('A · This month, with data — Planned and Actual, every row deducted', () => {
  useStore.getState().resetAll();
  useStore.setState({ onboardingComplete: true, hideBalances: false,
    onboardingProfile: { ...WORKER, monthlySpending: '2000', b_fixed: '1100', b_flexible: '900' },
    liabilities: [...DEBTS, ...RADAR],
    expenses: [pay('Mortgage', 2000), pay('HELOC', 200), pay('Credit card debt payment', 200),
      spend('Amazon', 300), spend('Shell', 200), spend('Target', 700, 'imported'), spend('Costco', 500, 'imported')],
  } as any);
  render(<CashFlowScreen />);
  check(phone(1), builtLines(screen.toJSON()));
});

test('B · This month, a fresh account — no budget set, so no planned surplus and no guess', () => {
  useStore.getState().resetAll();
  useStore.setState({ onboardingComplete: true, hideBalances: false, onboardingProfile: WORKER,
    liabilities: DEBTS, expenses: [pay('Mortgage', 2000)] } as any);
  render(<CashFlowScreen />);
  check(phone(2), builtLines(screen.toJSON()));
});
