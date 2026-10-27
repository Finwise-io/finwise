/** THE CASH FLOW TAB AGAINST ITS APPROVED DRAWING, WORD FOR WORD AND FIGURE FOR FIGURE (cash-flow_v01, approved 2026-09-28).
 *
 *  REBUILT 2026-10-25 (Cash flow drawing match, the weak guard). This file compared every figure as a stand-in token ("$#"), so
 *  a screen printing the wrong number matched its drawing: 124 Cash flow match and journey checks passed while the budget
 *  editor's rows did not add up to their totals. Now each frame is rendered on the drawing's own day (Aug 20, 2026) in the
 *  drawing's own household (src/testing/cashflowDrawing.ts, worked by hand against the drawing's rule 8:
 *  5,000 − 2,000 − 250 − 2,000 − 200 − 200 = 350 · 5,000 − 2,000 − 0 − 500 − 1,200 − 200 − 200 = 900 ·
 *  200 + 900 + 200 + 700 = 2,000 · 500 + 1,200 + 200 + 200 = 2,100), and compared with every figure and date as printed.
 *
 *  What the drawing does not show, or shows wrongly, is applied to the drawn phone BY NAME before the comparison — each edit
 *  names its dated READ THIS FIRST row or his ruling, and each must find its line exactly once (AS_BUILT): DEC-1560's kept
 *  items (＋ Expense, Import a statement ›, Your income, all of it, PAYOFF PLAN, each debt's payment and interest, + Add debt
 *  account and the edit hint); the 2026-10-25 rows (two decimals on an expense or a payment received; $410, not $310; no
 *  connected card yet; the drawing's own note under "Add your income ›"). The only figures held as a token are the two the
 *  payoff plan counts from today — the month it ends and its interest — and they are said where they are.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import CashFlowScreen from '../CashFlowScreen';
import { builtLines, firstDifference, normExact } from '../../testing/mockMatch';
import * as H from '../../testing/cashflowDrawing';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }), useLocalSearchParams: () => ({}),
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

beforeEach(() => { jest.useFakeTimers({ now: H.DRAWN_NOW, doNotFake: [...H.ONLY_THE_CLOCK] }); });
afterEach(() => { jest.useRealTimers(); });
const tab = (t: string) => fireEvent.press(screen.getByLabelText(new RegExp(`^${t} tab`)));
/** the payoff plan's month and interest are counted from today: the two figures this file holds as a token, said here */
const FROM_TODAY = (s: string) => s.replace(/ \$ ([a-z]{3} \d{4}) debt-free \$410 \/month total \$([\d,]+) total interest/,
  ' $ <the month it ends> debt-free $410 /month total <its interest> total interest');
const check = (drawn: string[], built: string[], floor: number) => {
  const want = normExact(drawn), got = FROM_TODAY(normExact(built));
  expect(want.split(' ').length).toBeGreaterThan(floor);                 // the guard looked: the frame has its words
  expect(firstDifference(want, got)).toBe('');
};

test('the drawing still has its six phones — the guard proves it looked', () => {
  for (const n of [1, 2, 3, 4, 5, 6]) expect(H.cashflowPhone(n).length).toBeGreaterThan(15);
});

test('the guard fires on a wrong figure: one dollar off on one row is a difference (the token compare passed it)', () => {
  H.householdWithData();
  render(<CashFlowScreen />);
  const built = builtLines(screen.toJSON());
  const i = built.indexOf('+$900');
  expect(i).toBeGreaterThan(0);
  const wrong = built.slice(); wrong[i] = '+$901';
  expect(firstDifference(normExact(H.AS_BUILT.A()), normExact(wrong))).not.toBe('');
});

test('A · This month, with data — Planned +$350 and Actual so far +$900, every row deducted, figure for figure', () => {
  H.householdWithData();
  render(<CashFlowScreen />);
  check(H.AS_BUILT.A(), builtLines(screen.toJSON()), 40);
});

test('B · This month, a fresh account — no budget, so no planned surplus and no guess; Actual so far +$3,000', () => {
  H.householdFreshB();
  render(<CashFlowScreen />);
  check(H.AS_BUILT.B(), builtLines(screen.toJSON()), 40);
});

test('C · Expenses, with data — recurring $2,250, planned $2,000 by category, actual $2,100 by where it came from, the radar', () => {
  H.householdWithData();
  render(<CashFlowScreen />);
  tab('Expenses');
  check(H.AS_BUILT.C(), builtLines(screen.toJSON()), 60);
});

test('D · Expenses, a fresh account — every section keeps its heading when empty', () => {
  H.householdFreshD();
  render(<CashFlowScreen />);
  tab('Expenses');
  check(H.AS_BUILT.D(), builtLines(screen.toJSON()), 40);
});

test('E · Income — $6,200 expected, every source the household has (two rentals at $0, RSU grants with no value), two paychecks', () => {
  H.householdIncome();
  render(<CashFlowScreen />);
  tab('Income');
  check(H.AS_BUILT.E(), builtLines(screen.toJSON()), 25);
});

test('F · Debts — $13,000 across 2 debts, the Visa first, one way to log a payment, $4,100 paid down since January (24%)', () => {
  H.householdDebts();
  render(<CashFlowScreen />);
  tab('Debts');
  check(H.AS_BUILT.F(), builtLines(screen.toJSON()), 25);
});
