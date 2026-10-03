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
 *  On the Expenses tab (frames C and D):
 *  4. The planned rows are the budget's OWN categories (Bills & fixed · Once in a while · Everyday
 *     expenses). The drawing's four — Gas, Grocery, Utilities, Other — are examples of categories.
 *  5. The radar row for a CONNECTED card ("NOT counted as an expense — the purchases are") cannot occur
 *     yet: no card can be connected. The door writes that row and its test holds it; the frame omits it.
 *  6. "same every month" rides each recurring row in both frames (the drawing prints it in C, not in D).
 *  7. "Import a statement ›" stays at the foot of the tab: it is the one way anything arrives imported.
 *  8. Rows the drawing folds away under "Show all N" are opened in the full list, not in place.
 *  On the Income tab (frame 5):
 *  9. A source is listed once it has been entered, under the name the Income screens give it
 *     (income-end-to-end_v07 — "where the architecture file and a detail file disagree, the detail file
 *     wins"). The drawing lists two unentered ones ("Rental income $0", "Equity comp —") under older names.
 *  10. The line under "Add your income ›" — "opens the steady-or-varies pop-up…" — describes a pop-up
 *     that became a full screen on 2026-08-27 (v07, frame 2). It is not printed.
 *  11. "Your income, all of it — Open ›" stays under the tab: it is the only way in to the approved
 *     summary screen (v07, frames 16 and 17).
 *  On the Debts tab (frame 6):
 *  12. PAYOFF PLAN — and the mortgage comparison inside it — stays between the total and the list. It is
 *     not on the drawing; he moved "Pay off the mortgage early" to Cash flow · Debt himself (DEC-0157).
 *  13. Each debt's line goes on after the drawn words to say its monthly payment and its interest, and
 *     the total's line adds the interest a month — figures the tab already carried.
 *  14. "+ Add debt account" and the edit hint stay under the list: the drawing has no way to add a debt.
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
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

// ── the Expenses tab ─────────────────────────────────────────────────────────────────────────────
/** The same drawing, with the rows it folds under "Show all N" left out — they are behind a tap. */
const FOLDED = drawingLines('MoneyKeel/documents/cashflow/moneykeel_pres_mock_cash-flow_v01.html', [/<\/summary>[\s\S]*?<\/details>/g]);
const FSTARTS = FOLDED.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
const folded = (n: number): string[] => {
  const seg = FOLDED.slice(FSTARTS[n - 1], FSTARTS[n] ?? FOLDED.length);
  const end = seg.findIndex((l, k) => (l === '⌂' || l === 'Home') && k > 8);
  return seg.slice(0, end).filter((l) => !CHROME.has(l));
};
const KNOWN_EXPENSES = (s: string) => s
  .replace(/# (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/g, '<day>')                       // a day of the month is data
  .replace(/planned expenses \$# .*? = total \$#/, 'planned expenses $# <the budget\'s categories> = total $#')   // 4
  .replace(/credit card debt payment debt connected card not counted as an expense — the \$# of purchases is \$# /, '')   // 5
  .replace(/ same every month/g, '')                                                                 // 6
  .replace(/ import a statement/, '')                                                                // 7
  .replace(/ expense$/, '');                                                                         // 2
const checkExpenses = (drawn: string[], built: string[]) => {
  const want = KNOWN_EXPENSES(month(norm(drawn))), got = KNOWN_EXPENSES(month(norm(built)));
  expect(want.split(' ').length).toBeGreaterThan(60);
  expect(firstDifference(want, got)).toBe('');
};
const typed = (store: string, category: string, amount: number, receipt = false) =>
  ({ id: `h-${store}`, amount, category, store, date: today, notes: '', createdAt: today, ...(receipt ? { receiptUri: 'file://r.jpg' } : {}) });
const card = (store: string, category: string, amount: number, i = 0) =>
  ({ id: `c-${store}-${i}`, amount, category, store, date: today, notes: '', createdAt: today, origin: 'imported' });

test('C · Expenses, with data — recurring, planned, actual by where it came from, and the radar', () => {
  useStore.getState().resetAll();
  useStore.setState({ onboardingComplete: true, hideBalances: false,
    onboardingProfile: { ...WORKER, monthlySpending: '2000', b_fixed: '1100', b_flexible: '900' },
    liabilities: [...DEBTS, ...RADAR],
    expenses: [
      // nine entered by hand — $500; the five most recent are shown, $195 more behind the tap
      typed('Amazon', 'Other', 100), typed('Trader Joe’s', 'Grocery', 65, true), typed('Shell', 'Gas', 60), typed('CVS', 'Other', 42, true), typed('Starbucks', 'Other', 38, true),
      typed('Costco', 'Grocery', 88, true), typed('Chevron', 'Gas', 55), typed('Walgreens', 'Other', 30, true), typed('PG&E', 'Utilities', 22),
      // twenty-three from the card — $1,200; five shown, $560 more behind the tap
      card('Target', 'Other', 15), card('Home Depot', 'Other', 315), card('Chevron', 'Gas', 70), card('Local Kitchen', 'Other', 95), card('Whole Foods', 'Grocery', 145),
      card('Safeway', 'Grocery', 120), card('Netflix', 'Other', 18), ...Array.from({ length: 16 }, (_, i) => card('Corner shop', 'Other', i === 0 ? 32 : 26, i)),
      pay('HELOC', 200), pay('Credit card debt payment', 200),
    ],
  } as any);
  render(<CashFlowScreen />);
  fireEvent.press(screen.getByLabelText('Expenses tab'));
  checkExpenses(folded(3), builtLines(screen.toJSON()));
});

test('D · Expenses, a fresh account — every section keeps its heading when empty', () => {
  useStore.getState().resetAll();
  useStore.setState({ onboardingComplete: true, hideBalances: false, onboardingProfile: WORKER, liabilities: DEBTS, expenses: [] } as any);
  render(<CashFlowScreen />);
  fireEvent.press(screen.getByLabelText('Expenses tab'));
  checkExpenses(folded(4), builtLines(screen.toJSON()));
});

// ── the Income tab ───────────────────────────────────────────────────────────────────────────────
test('E · Income — the month’s expected take-home, your sources, and what has been received', () => {
  useStore.getState().resetAll();
  useStore.setState({ onboardingComplete: true, hideBalances: false,
    onboardingProfile: { ...WORKER, baseSalary: '6200', monthlySpending: '2000' },
    incomes: [{ id: 'i2', date: today, source: 'Paycheck', amount: 3100 }, { id: 'i1', date: `${today.slice(0, 8)}01`, source: 'Paycheck', amount: 3100 }],
  } as any);
  render(<CashFlowScreen />);
  fireEvent.press(screen.getByLabelText('Income tab'));
  const KNOWN_INCOME = (s: string) => s
    .replace(/ rental income # properties \$# equity comp rsu grants —/, '')                                   // 9
    .replace(/ opens the steady-or-varies pop-up — variable earners fine-tune month by month/, '')             // 10
    .replace(/ your income, all of it the take-home, and what it is taxed on open/, '')                        // 11
    .replace(/ expense$/, '');                                                                                 // 2
  const want = KNOWN_INCOME(month(norm(phone(5)))), got = KNOWN_INCOME(month(norm(builtLines(screen.toJSON()))));
  expect(want.split(' ').length).toBeGreaterThan(25);
  expect(firstDifference(want, got)).toBe('');
});

// ── the Debts tab ────────────────────────────────────────────────────────────────────────────────
test('F · Debts — what you owe, each debt in the order to pay it, one way to log a payment, and progress', () => {
  useStore.getState().resetAll();
  const year = today.slice(0, 4);
  useStore.setState({ onboardingComplete: true, hideBalances: false, onboardingProfile: { ...WORKER, monthlySpending: '2000' },
    liabilities: [
      { debt_id: 'v', label: 'Visa card', debt_type: 'CREDIT_CARD', remaining_balance: 3200, interest_rate_apr: 0.229, minimum_monthly_payment: 110 },
      { debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9800, interest_rate_apr: 0.064, minimum_monthly_payment: 300 },
    ],
    monthlySnapshots: { [`${year}-01`]: { month: `${year}-01`, gross_debt: 17100 } },
  } as any);
  render(<CashFlowScreen />);
  fireEvent.press(screen.getByLabelText('Debts tab'));
  const KNOWN_DEBTS = (s: string) => s
    .replace(/ payoff plan avalanche snowball .*? your debts /, ' your debts ')              // 12
    .replace(/ \$#\/month in payments \$#\/month interest/, ' $#/month in payments')         // 13
    .replace(/ \$#\/month min \$#\/month interest/g, '')                                     // 13
    .replace(/ \+ add debt account tap a debt to edit • hold to delete/, '')                 // 14
    .replace(/#%( — the costliest)? # (years?|months?) left/g, '#%$1 <time> left')          // how long is data
    .replace(/#% — the costliest(?! <time>)/, '#% — the costliest <time> left')              // the drawing leaves the time off the costliest row
    .replace(/ expense$/, '');                                                               // 2
  const want = KNOWN_DEBTS(month(norm(phone(6)))), got = KNOWN_DEBTS(month(norm(builtLines(screen.toJSON()))));
  expect(want.split(' ').length).toBeGreaterThan(25);
  expect(firstDifference(want, got)).toBe('');
});
