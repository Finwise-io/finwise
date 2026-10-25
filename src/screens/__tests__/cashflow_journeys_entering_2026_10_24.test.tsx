/** CASH FLOW JOURNEYS — ENTERING (2026-10-24, E2E-69 to E2E-74). A person enters or changes money, then looks at what it did.
 *
 *  Each flow renders the real screens, taps and types on the controls a person touches (found by their words or their spoken
 *  label), follows every push to the screen it names with what the push carried, and checks the outcome where the person looks
 *  next — the Cash flow tab's four tabs (This month · Income · Expenses · Debts), Your base pay, the Income summary, the
 *  filing-status question, the Bill calendar, Net worth and Home's THIS MONTH'S CASH FLOW box. The store is written only to set
 *  up the starting household. Every figure is worked by hand beside its check. The day is Mon Sep 28, 2026.
 *
 *  THE FOUNDER'S HOUSEHOLD is the one cash-flow_v01 draws (frames A and B, src/screens/__tests__/cashflow_matches_v01.test.tsx):
 *  $5,000 take-home; a mortgage ($2,000, paid), a car loan ($250, due the 28th), a HELOC and a card payment ($200 each, entered
 *  on the Debts tab); a $2,000 budget; $500 typed by hand and $1,200 imported from a card. E2E-69, E2E-73 and E2E-74 run in it.
 *
 *  WHAT THE FLOWS FOUND, AND WHAT CHANGED IN THE APP (each fix is held by the flow that found it):
 *   · E2E-69 — rows that did not add up to their total. A $6.50 coffee made This month read $5,000 − $2,000 − $0 − $507 − $1,200
 *     − $200 − $200 above "= Actual surplus so far +$894" (the rows make $893), and Home read Income $5,000 · Outflow $4,107 ·
 *     Left $894. One writer now prints a month's rows and its surplus so they add up (monthShown), read by both screens, by the
 *     past and future month cards (flowShown) and by the Expenses tab's lists (partsShown).
 *   · E2E-71 — the Cash flow months left the 401(k) in the take-home. $9,000 a month with $1,000 into a 401(k) read $7,976 on
 *     This month, the Income tab and Home, beside $6,976 on Your base pay and the Income summary; a take-home typed as $6,200
 *     read $7,200. The month's wage is now the base-pay take-home (MK-XS-F-004 buildDatedGrid, through wagesLandingByMonth).
 *   · E2E-70 — "Bonus / one-time" opened the bonus editor, which records a bonus every year: a one-time $2,000 came back the next
 *     September. One-time income now has its own door, keeps the year it lands in, and is listed under YOUR SOURCES (it raised
 *     the month's take-home with no row saying why).
 *   · E2E-72 — the Bill calendar built its months from the budget as typed, so with the home's mortgage in Debts it counted the
 *     Rent / Mortgage line beside it ($2,300/month) where This month stands it down (DEC-1923). It reads the Cash flow tab's own
 *     months now. (Its COMING UP line, which left out the debt payments, was fixed beside this suite by the bill-check agent.)
 *   · E2E-73 — the budget editor's card printed "− Expenses (plan) $0 · = Planned surplus $2,350" with no budget set, beside This
 *     month's "— not set" and no planned surplus; and it was a typical month of its own, not this month. It reads This month's
 *     planned block now.
 *   · E2E-74 — Log payment offered a $386.42 car payment as "386", so Log recorded $386. It offers the payment to the cent.
 */
import React from 'react';
import { Alert, StyleSheet } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { useStore } from '../../store/useStore';
import { norm, drawingLines, builtLines, firstDifference } from '../../testing/mockMatch';
import { monthShown, partsShown, flowShown } from '../../components/figure';
import { rateInForce } from '../../domain/income/tax-rate';
import { buildDatedGrid } from '../../domain/grid';
import { spendByMonthByBucket } from '../../domain/budget';
import { incomeSummary } from '../../../MoneyKeel/functions/cashflow/income-summary';
import { incomeMonthlyGrid } from '../../domain/income/onboarding';

let mockParams: Record<string, string | undefined> = {};
const mockNav = { pushes: [] as string[], backs: 0 };
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: () => { mockNav.backs += 1; }, push: (r: string) => mockNav.pushes.push(r), replace: (r: string) => mockNav.pushes.push(r),
    setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: (r: string) => mockNav.pushes.push(r), replace: (r: string) => mockNav.pushes.push(r), back: () => { mockNav.backs += 1; } },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

const TODAY = '2026-09-28';
const FAKE = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
const onDay = (iso: string) => jest.useFakeTimers({ now: new Date(`${iso}T12:00:00`), doNotFake: [...FAKE] });
beforeEach(() => { onDay(TODAY); mockNav.pushes.length = 0; mockParams = {}; });
afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });

// ═══ READING A SCREEN: every Text in order, as a person reads it ═════════════════════════════════════════════════════════
const flat = (st: any) => (StyleSheet.flatten(st) ?? {}) as any;
const textOf = (n: any, tt?: string): string => {
  if (n == null) return '';
  if (typeof n === 'string') return tt === 'uppercase' ? n.toUpperCase() : n;
  if (Array.isArray(n)) return n.map((c) => textOf(c, tt)).join('');
  const t2 = flat(n.props?.style).textTransform ?? tt;
  return (n.children ?? []).map((c: any) => textOf(c, t2)).join('');
};
function readLines(): string[] {
  const out: string[] = [];
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    if (n.type === 'Text') { const t = textOf(n).replace(/\s+/g, ' ').trim(); if (t) out.push(t); return; }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}
const SCREENS: Record<string, () => any> = {
  '/(tabs)/cashflow': () => require('../CashFlowScreen').default, '/(tabs)/home': () => require('../HomeScreen').default,
  '/base-pay': () => require('../BasePayScreen').default, '/income-summary': () => require('../IncomeSummaryScreen').default,
  '/income-manager': () => require('../IncomeManagerScreen').default, '/bill-calendar': () => require('../BillCalendarScreen').default,
  '/filing-status': () => require('../FilingStatusScreen').default, '/networth': () => require('../NetWorthScreen').default,
  '/tax-organizer': () => require('../TaxOrganizerScreen').default,
};
/** open a route as a push carries it: '/income-manager?open=onetime' renders the manager with { open: 'onetime' } */
function open(route: string) {
  const [p, q] = route.split('?');
  mockParams = Object.fromEntries(new URLSearchParams(q ?? '').entries());
  const C = SCREENS[p]?.();
  if (!C) throw new Error(`no screen for ${route}`);
  return render(<C />);
}
/** a screen as the person opens it now, read and closed */
function look(route: string, act?: () => void): string[] {
  const r = open(route);
  if (act) act();
  const lines = readLines();
  r.unmount();
  return lines;
}
/** follow the last push: render the route it named */
const follow = () => { const r = mockNav.pushes[mockNav.pushes.length - 1]; expect(r).toBeTruthy(); return open(r); };
const press = (label: string | RegExp) => fireEvent.press(screen.getByLabelText(label));
const after = (L: string[], label: string, n = 1, anchor?: string): string | undefined => {
  const from = anchor ? L.indexOf(anchor) : 0; if (from < 0) return undefined;
  const i = L.indexOf(label, from); return i >= 0 ? L[i + n] : undefined;
};
const block = (L: string[], start: string, end: string, extra = 1) => {
  const i = L.indexOf(start); expect(i).toBeGreaterThanOrEqual(0);
  const j = L.indexOf(end, i + 1); expect(j).toBeGreaterThan(i);
  return L.slice(i, j + 1 + extra);
};
const dollars = (s: string | undefined) => (s == null ? NaN : Number(s.replace('−', '-').replace(/[^0-9.\-]/g, '')));
/** Home's box, from its band to Left / Over and its figure */
const homeBox = (L: string[]) => { const i = L.indexOf("THIS MONTH'S CASH FLOW"); expect(i).toBeGreaterThanOrEqual(0); return L.slice(i, i + 9); };
/** an Alert's buttons, recorded, with the one named pressed */
function chooseInAlert(text: string) {
  const seen: { title: string; buttons: string[] }[] = [];
  jest.spyOn(Alert, 'alert').mockImplementation((title: any, _m: any, btns: any) => {
    seen.push({ title, buttons: (btns ?? []).map((b: any) => b.text) });
    (btns ?? []).find((b: any) => b.text === text)?.onPress?.();
  });
  return seen;
}
const tab = (name: 'This month' | 'Income' | 'Expenses' | 'Debts') => fireEvent.press(screen.getByLabelText(new RegExp(`^${name} tab`)));
const nextMonth = (n: number) => { for (let k = 0; k < n; k++) press('Next month'); };

// ═══ THE HOUSEHOLDS ══════════════════════════════════════════════════════════════════════════════════════════════════════
const WORKER = { status: 'employed', incomeSources: ['employment'], birthYear: '1981',
  baseSalary: '5000', salaryMode: 'takehome', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0' };
const DEBTS = [
  { debt_id: 'm', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 300000, interest_rate_apr: 0.05, minimum_monthly_payment: 2000, due_day: 1 },
  { debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9800, interest_rate_apr: 0.064, minimum_monthly_payment: 250, due_day: 28 },
];
const RADAR = [
  { debt_id: 'h', label: 'HELOC', debt_type: 'HELOC', remaining_balance: 20000, interest_rate_apr: 0.08, minimum_monthly_payment: 200 },
  { debt_id: 'v', label: 'Credit card debt payment', debt_type: 'CREDIT_CARD', remaining_balance: 3200, interest_rate_apr: 0.229, minimum_monthly_payment: 200 },
];
const pay = (store: string, amount: number) => ({ id: `p-${store}`, amount, category: 'Debt payment', store, date: TODAY, notes: '', createdAt: TODAY });
const spend = (id: string, amount: number, origin?: string) => ({ id, amount, category: 'Other', store: id, date: TODAY, notes: '', createdAt: TODAY, ...(origin ? { origin } : {}) });
/** cash-flow_v01 frame A — the founder's household */
const FRAME_A = () => ({ onboardingComplete: true, hideBalances: false, nwSetupChoice: 'self',
  onboardingProfile: { ...WORKER, monthlySpending: '2000', b_fixed: '1100', b_flexible: '900' },
  liabilities: [...DEBTS, ...RADAR].map((d) => ({ ...d })),
  expenses: [pay('Mortgage', 2000), pay('HELOC', 200), pay('Credit card debt payment', 200),
    spend('Amazon', 300), spend('Shell', 200), spend('Target', 700, 'imported'), spend('Costco', 500, 'imported')] });
/** cash-flow_v01 frame B — the same household on a fresh account: no budget set, the mortgage paid */
const FRAME_B = () => ({ onboardingComplete: true, hideBalances: false, nwSetupChoice: 'self',
  onboardingProfile: { ...WORKER }, liabilities: DEBTS.map((d) => ({ ...d })), expenses: [pay('Mortgage', 2000)] });
function start(state: any) {
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
  useStore.setState({ hideBalances: false, ...state } as any);
}
const profile = () => (useStore.getState() as any).onboardingProfile;

// ═══ THE APPROVED DRAWING, WORD FOR WORD (the method of cashflow_matches_v01, with its named differences) ════════════════
const LINES = drawingLines('MoneyKeel/documents/cashflow/moneykeel_pres_mock_cash-flow_v01.html');
const STARTS = LINES.map((l, i) => (l === '9:41' ? i : -1)).filter((i) => i >= 0);
const CHROME = new Set(['9:41', '▮▮▮ ⌁', '▦ Menu', 'Money', 'Keel', '◉', '⚙']);
const phone = (n: number): string[] => {
  const seg = LINES.slice(STARTS[n - 1], STARTS[n] ?? LINES.length);
  const end = seg.findIndex((l, k) => (l === '⌂' || l === 'Home') && k > 8);
  return seg.slice(0, end).filter((l) => !CHROME.has(l));
};
const monthWord = (s: string) => s.replace(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/g, '<month>');
const KNOWN = (s: string) => s.replace(/inflow \(income \(take-home\)\) after tax and #\(k\) \$#/g, 'inflow (income (take-home)) $#').replace(/ expense$/, '');
const asDrawn = (n: number) => {
  expect(STARTS).toHaveLength(6);                                                   // the guard looked: six phones
  const want = KNOWN(monthWord(norm(phone(n)))), got = KNOWN(monthWord(norm(builtLines(screen.toJSON()))));
  expect(want.split(' ').length).toBeGreaterThan(40);
  expect(firstDifference(want, got)).toBe('');
};

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-69 · LOG AN EXPENSE — a $6.50 coffee, today, from the "＋ Expense" button (the one place, DEC-0039: Home has none)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('E2E-69 · a $6.50 coffee logged from ＋ Expense moves This month, the Expenses tab and Home by $6.50, and all three agree', () => {
  test('E2E-69 · in the founder\'s household: This month −$507 · +$893, the Expenses tab $507 · $2,107, Home $4,107 · $893 — rows that add up', () => {
    start(FRAME_A());
    // BEFORE — the drawing's own figures (frame A): $5,000 − $2,000 − $0 − $500 − $1,200 − $200 − $200 = +$900
    let home = homeBox(look('/(tabs)/home'));
    expect([after(home, 'Income'), after(home, 'Outflow (expenses + debt)'), after(home, 'Left')]).toEqual(['$5,000', '$4,100', '$900']);

    open('/(tabs)/cashflow');
    asDrawn(1);                                                                     // This month is frame A, word for word
    press('Add expense');                                                           // the floating "＋ Expense"
    expect(readLines()).toContain('Add expense');
    fireEvent.changeText(screen.getByPlaceholderText('0'), '6.50');
    fireEvent.press(screen.getByLabelText('Dining out'));
    fireEvent.changeText(screen.getByPlaceholderText('Where? (optional)'), 'Starbucks');
    expect(readLines()).toContain('Dining out → Flexible budget');
    expect(readLines()).toContain('✓ today');
    fireEvent.press(screen.getByText('Add $6.50'));                                 // the button says exactly what is saved
    const saved = (useStore.getState() as any).expenses[0];
    expect([saved.amount, saved.category, saved.store, saved.date]).toEqual([6.5, 'Dining out', 'Starbucks', TODAY]);

    // AFTER, on the tab the person is still on. By hand: entered by hand $500 + $6.50 = $506.50. What went out:
    // $2,000 + $0 + $506.50 + $1,200 + $200 + $200 = $4,106.50 → $4,107; rounded down the rows make $4,106, and the one dollar
    // goes to the 50¢ → −$507. Left: $5,000 − $4,107 = +$893 (exactly $893.50). It printed +$894 under rows that make $893.
    const L = readLines();
    expect(block(L, 'ACTUAL · SO FAR', '= Actual surplus so far')).toEqual(['ACTUAL · SO FAR', '+$893',
      'Actual inflow (income (take-home))', '$5,000', 'Mortgage', 'PAID', '−$2,000', 'Car loan', 'DUE 28TH', '$0',
      'Expenses entered by hand', '−$507', 'Expenses imported from your card', 'IMPORTED', '−$1,200',
      'HELOC', 'from big-ticket radar', '−$200', 'Credit card debt payment', 'from big-ticket radar', '−$200',
      '= Actual surplus so far', '+$893']);
    const rows = block(L, 'ACTUAL · SO FAR', '= Actual surplus so far', 0).slice(2).filter((l) => /^[−+]?\$[\d,]+$/.test(l)).map(dollars);
    expect(rows.reduce((t, v) => t + v, 0)).toBe(893);                              // every row shown is a row deducted, and they add up
    expect(after(L, '= Planned surplus')).toBe('+$350');                            // a coffee is not a plan: Planned does not move
    asDrawn(1);                                                                     // the words are still frame A's, word for word

    // the Expenses tab: the coffee is the newest row, with its category; by hand $6.50 + $300.00 + $200.00 = $506.50 → $507,
    // and the three sources $506.50 + $1,200 + $400 = $2,106.50 → $2,107 = $507 + $1,200 + $400
    tab('Expenses');
    const X = readLines();
    expect(block(X, 'ENTERED BY HAND', '= Entered by hand · 3 items')).toEqual(['ENTERED BY HAND', '$507',
      '28 Sep · Starbucks', 'Dining out · typed', '$6.50', '28 Sep · Amazon', 'Other · typed', '$300.00',
      '28 Sep · Shell', 'Other · typed', '$200.00', '= Entered by hand · 3 items', '$507']);
    expect([after(X, 'ACTUAL EXPENSES'), after(X, 'IMPORTED FROM YOUR CARD'), after(X, 'DEBT PAYMENTS COUNTED AS EXPENSES'),
      after(X, '= Actual expenses, all sources')]).toEqual(['$2,107', '$1,200', '$400', '$2,107']);
    expect(after(X, 'PLANNED EXPENSES')).toBe('$2,000');
    screen.unmount();

    // Home: the tab's own three, Income less Outflow is Left — $5,000 − $4,107 = $893; 82% spent ($4,106.50 ÷ $5,000 = 82.13%)
    home = homeBox(look('/(tabs)/home'));
    expect(home).toEqual(["THIS MONTH'S CASH FLOW", 'Expenses running fast', '82% spent · day 28 of 30', 'Income', '$5,000',
      'Outflow (expenses + debt)', '$4,107', 'Left', '$893']);
    expect(dollars(home[4]) - dollars(home[6])).toBe(dollars(home[8]));
  });

  test('E2E-69 · the writer behind both, run on its own: the rows share the total, no row moves more than a dollar, a whole row never moves', () => {
    // This month's actual rows with the coffee in, as theMonth hands them over
    const m = monthShown([{ amount: 5000, kind: 'in' }, { amount: -2000, kind: 'debt' }, { amount: 0, kind: 'debt' }, { amount: -506.5, kind: 'spend' },
      { amount: -1200, kind: 'spend' }, { amount: -200, kind: 'debt' }, { amount: -200, kind: 'debt' }]);
    expect(m.amounts).toEqual([5000, -2000, 0, -507, -1200, -200, -200]);
    expect([m.inflow, m.outflow, m.surplus]).toEqual([5000, 4107, 893]);
    expect(Math.round(5000 - 4106.5)).toBe(894);                                    // what each figure rounded alone printed
    // a list of exact cents: $386.42 + $2,187.65 = $2,574.07 → $2,574 = $386 + $2,188
    expect(partsShown([386.42, 2187.65])).toEqual({ parts: [386, 2188], total: 2574 });
    // three figures: $7,200 in, $3,248.50 out → $7,200 · $3,249 · $3,951 (each alone: $3,952)
    expect(flowShown(7200, 3248.5)).toEqual({ inflow: 7200, outflow: 3249, surplus: 3951 });
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-70 · A ONE-TIME $2,000 BONUS THIS MONTH — it lands in September only, after the rate in force (MK-CF-F-181)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('E2E-70 · a one-time $2,000 bonus lands in its own month, taxed at the rate in force, and never comes back', () => {
  // single, $6,000 a month before tax, no 401(k), the tax calculated; $1,000 of budget
  const H70 = () => ({ onboardingComplete: true, hideBalances: false, nwSetupChoice: 'self',
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1981', baseSalary: '6000', salaryFreq: 'monthly',
      spendCats: [{ id: 'groceries', label: 'Groceries', amount: 700, bucket: 'flexible', tier: 'need' }, { id: 'utilities', label: 'Utilities', amount: 300, bucket: 'fixed', tier: 'need' }] },
    liabilities: [], expenses: [], assetAccounts: [] });

  test('E2E-70 · Income tab → Add your income → One-time income: September reads $7,195 on the Income tab, This month and Home; October $5,396', () => {
    start(H70());
    // BEFORE. By hand: $72,000 − the $16,100 standard deduction = $55,900 → 10% × $12,400 + 12% × $38,000 + 22% × $5,500 =
    // $1,240 + $4,560 + $1,210 = $7,010 a year, 9.74% of $72,000 → $6,000 × (1 − 0.09736) = $5,415.83 a month
    open('/(tabs)/cashflow'); tab('Income');
    expect(after(readLines(), 'THIS MONTH')).toBe('$5,416');
    const chooser = chooseInAlert('One-time income');
    press('Add your income');
    expect(chooser[0]).toEqual({ title: 'Add your income', buttons: ['Salary / take-home', 'Stock vesting (equity)', 'Rental property', 'Self-employment', 'Bonus', 'One-time income', 'Cancel'] });
    expect(mockNav.pushes).toEqual(['/income-manager?open=onetime']);
    screen.unmount();

    // the question the person was asked when they first picked "Something else" — one time, $2,000, September, taxable
    follow();
    expect(readLines()).toContain('Other income');
    fireEvent.changeText(screen.getByPlaceholderText('e.g. tutoring, a gift'), 'Bonus');
    fireEvent.press(screen.getByText('One time'));
    fireEvent.changeText(screen.getByPlaceholderText('$0'), '2000');
    expect(readLines()).toContain('Which month does it land?');
    fireEvent.press(screen.getByText('Sep'));
    expect(readLines()).toContain('Taxable');
    press('Done — your changes save as you type');
    screen.unmount();
    const op = profile();
    // the year is kept with the month, so it lands once (it was the month alone, and came back every September)
    expect([op.otherLabel, op.otherFreq, op.otherAmount, op.otherMonth, op.otherIncomeYear, op.otherTaxable ?? 'yes']).toEqual(['Bonus', 'onetime', '2000', 9, 2026, 'yes']);

    // THE RATE IN FORCE, worked by hand: $74,000 (with the bonus) − $16,100 = $57,900 → $1,240 + $4,560 + 22% × $7,500 = $7,450,
    // a rate of 7,450 ÷ 74,000 = 10.07%. The bonus lands $2,000 × (1 − 0.10068) = $1,798.65; the salary $6,000 × (1 − 0.10068) =
    // $5,395.95; September $7,194.59 → $7,195. One rate in every month (his ruling G46), so the bonus's tax lifts the rate on the
    // salary too: October reads $5,396, $19.88 below the $5,416 of before — the year's tax rose by 22% × $2,000 = $440.
    const rate = rateInForce(op).rate;
    expect(rate).toBeCloseTo(7450 / 74000, 10);
    const sep = buildDatedGrid(op, {}).cells[0];
    expect(sep.incomeItems.find((i: any) => i.source === 'Bonus')?.amount).toBeCloseTo(2000 * (1 - 7450 / 74000), 8);
    expect(2000 * rate + 12 * (5415.8333 - 6000 * (1 - rate))).toBeCloseTo(440, 1);

    // the Income tab: the month's take-home first, then every source with what it is
    open('/(tabs)/cashflow'); tab('Income');
    let L = readLines();
    expect(block(L, 'THIS MONTH', 'Add your income ›', 0)).toEqual(['THIS MONTH', '$7,195', 'expected take-home', 'YOUR SOURCES',
      'Salary — steady', 'before tax · monthly · ≈ $5,396/month take-home', '$6,000 ›', 'Bonus', 'one-time · lands in September', '$2,000 ›', 'Add your income ›']);
    // This month: the inflow names the bonus, and Planned and Actual read the one take-home
    tab('This month');
    L = readLines();
    expect([after(L, 'Inflow (income (take-home) + bonus)', 2), after(L, 'Actual inflow (income (take-home) + bonus)')]).toEqual(['$7,195', '$7,195']);
    // October: the plan, without it — not spread
    nextMonth(1);
    L = readLines();
    expect(after(L, 'Planned inflow')).toBe('$5,396');
    tab('Income');
    expect(after(readLines(), 'OCTOBER 2026')).toBe('$5,396');
    screen.unmount();
    expect(after(homeBox(look('/(tabs)/home')), 'Income')).toBe('$7,195');

    // and it never comes back: on Oct 15 the twelve months ahead (October to next September) carry no bonus, and nothing is
    // left "beyond the window" for a payment that has already landed
    onDay('2026-10-15');
    const year = buildDatedGrid(profile(), {});
    expect(year.cells.map((c: any) => c.incomeItems.some((i: any) => i.source === 'Bonus'))).toEqual(new Array(12).fill(false));
    expect(year.later).toEqual([]);
    open('/(tabs)/cashflow'); nextMonth(11);
    expect(readLines()).toContain('September 2027 — planned');
    // the salary alone — at 2026's one rate, which still holds the bonus's tax (one rate in every month, his ruling G46)
    expect(after(readLines(), 'Planned inflow')).toBe('$5,396');
    screen.unmount();
    // in 2027 the bonus is no part of the year's income: $72,000 is taxed again, $5,416 a month (it stayed in every year)
    onDay('2027-01-15');
    expect(rateInForce(profile()).rate).toBeCloseTo(7010 / 72000, 10);
    expect(after(look('/(tabs)/cashflow'), 'Inflow (income (take-home))', 2)).toBe('$5,416');
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-71 · CHANGE BASE PAY — salary, the 401(k), filing status — and every take-home moves together
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('E2E-71 · base pay: the take-home on Your base pay, the Income summary, This month and Home is one figure, worked by the 2026 tables', () => {
  test('E2E-71 · $9,000 with $1,000 into a 401(k): $6,976 single (22%), $7,403 filing jointly (12%), $6,963 at $1,500 — on all four', () => {
    start({ onboardingComplete: true, hideBalances: false, nwSetupChoice: 'self', liabilities: [], expenses: [], assetAccounts: [],
      onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1981' } });
    const takeHomes = () => {
      const bp = look('/base-pay'), sum = look('/income-summary'), cf = look('/(tabs)/cashflow'), home = homeBox(look('/(tabs)/home'));
      return { bp: after(bp, '= Take-home'), sum: after(sum, 'TAKE-HOME EACH MONTH'), cf: after(cf, 'Inflow (income (take-home))', 2),
        actual: after(cf, 'Actual inflow (income (take-home))'), home: after(home, 'Income'), bpLines: bp, sumLines: sum };
    };
    // the first-open door on This month opens Your base pay
    open('/(tabs)/cashflow');
    expect(readLines()).toContain('SET UP YOUR MONTH — 2 STEPS');
    press('Step 1: set up your income — your base pay, one section per earner');
    screen.unmount();
    follow();
    fireEvent.changeText(screen.getByLabelText('Gross pay each month'), '9000');
    fireEvent.changeText(screen.getByLabelText('Into your 401(k) each month'), '1000');
    // SINGLE, by hand (IRS Rev. Proc. 2025-32): $108,000 − $12,000 into the 401(k) = $96,000; − $16,100 = $79,900, in the 22%
    // band → $1,240 + $4,560 + 22% × ($79,900 − $50,400) = $1,240 + $4,560 + $6,490 = $12,290 a year = $1,024.17 a month.
    // Take-home = $9,000 − $1,024.17 − $1,000 = $6,975.83 → $6,976
    const card = block(readLines(), 'YOUR HOUSEHOLD', '$9,000 gross − $1,024 tax − $1,000 of 401(k)s = $6,976.', 0);
    expect(card).toEqual(['YOUR HOUSEHOLD', '≈$6,976/month', 'Gross /year', '$108,000', 'Federal tax bracket', 'what your next dollar costs', '22%',
      'Calculated federal tax', 'assumes you take the standard deduction', '≈$1,024/month', 'Your 401(k)s', '$1,000/month',
      '= Take-home', '≈$6,976/month', '$9,000 gross − $1,024 tax − $1,000 of 401(k)s = $6,976.']);
    press('Save your base pay');
    expect(mockNav.backs).toBe(1);
    screen.unmount();
    let t = takeHomes();
    // This month and Home read $7,976 here before the fix: the 401(k) was left in the month's take-home
    expect([t.bp, t.sum, t.cf, t.actual, t.home]).toEqual(['≈$6,976/month', '$6,976', '$6,976', '$6,976', '$6,976']);
    expect([after(t.sumLines, '= What it is taxed on'), after(t.sumLines, 'Federal tax bracket', 2), after(t.sumLines, 'Calculated federal tax', 2)])
      .toEqual(['$96,000', '22%', '≈$12,290/year']);

    // FILING JOINTLY, from the Tax organizer's one door. By hand: $96,000 − $32,200 = $63,800, in the 12% band → 10% × $24,800
    // + 12% × $39,000 = $2,480 + $4,680 = $7,160 a year = $596.67 a month; take-home $9,000 − $596.67 − $1,000 = $7,403.33 → $7,403
    open('/tax-organizer');
    press('How you file your taxes — change it');
    screen.unmount();
    follow();
    fireEvent.press(screen.getByLabelText('Married filing jointly'));
    press('Save');
    const fs4c = readLines();
    expect([after(fs4c, 'Taxed as single'), after(fs4c, 'Married filing jointly')]).toEqual(['$12,290/year — what we were assuming', '$7,160/year']);
    expect(fs4c).toContain('$427/month more');                                     // the two take-homes as printed: $7,403 − $6,976 (E2E-79's ruling)
    press('Got it');
    screen.unmount();
    t = takeHomes();
    expect([t.bp, t.sum, t.cf, t.actual, t.home]).toEqual(['≈$7,403/month', '$7,403', '$7,403', '$7,403', '$7,403']);
    expect([after(t.bpLines, 'Federal tax bracket', 2), after(t.bpLines, 'Calculated federal tax', 2)]).toEqual(['12%', '≈$597/month']);
    expect([after(t.sumLines, 'Federal tax bracket'), after(t.sumLines, 'Federal tax bracket', 2), after(t.sumLines, 'Calculated federal tax', 2)])
      .toEqual(['filing jointly, every source counted', '12%', '≈$7,160/year']);

    // A LARGER 401(k), back on Your base pay. By hand: $108,000 − $18,000 = $90,000; − $32,200 = $57,800 → $2,480 + 12% × $33,000 =
    // $6,440 a year = $536.67 a month; take-home $9,000 − $536.67 − $1,500 = $6,963.33 → $6,963
    open('/base-pay');
    fireEvent.changeText(screen.getByLabelText('Into your 401(k) each month'), '1500');
    press('Save your base pay');
    screen.unmount();
    t = takeHomes();
    expect([t.bp, t.sum, t.cf, t.actual, t.home]).toEqual(['≈$6,963/month', '$6,963', '$6,963', '$6,963', '$6,963']);
    expect([after(t.sumLines, '= What it is taxed on'), after(t.sumLines, 'Calculated federal tax', 2)]).toEqual(['$90,000', '≈$6,440/year']);
  });

  test('E2E-71 · a take-home typed the old way, with their own 0%: Your base pay says the gross was worked back, and it is $5,000.00, not 5475.378787878787', () => {
    // the founder's household stores "$5,000 take-home, their rate 0%" the pre-2026-08-28 way; the first save anywhere converts it
    start(FRAME_A());
    open('/bill-calendar');
    press('Add a dated bill');
    fireEvent.changeText(screen.getByLabelText('Bill name'), 'Car insurance');
    fireEvent.changeText(screen.getByLabelText('Bill amount'), '1200');
    press('Due in Dec');
    press('Save this bill');
    screen.unmount();
    // by hand, with THEIR rate: take-home = gross × (1 − 0%) − $0 of 401(k) → gross $5,000 (the federal schedule gave $5,475.38)
    expect([Number(profile().baseSalary), profile().landsTypical, profile().grossWorkedBack]).toEqual([5000, '5000', true]);
    open('/base-pay');
    let L = readLines();
    expect(screen.getByLabelText('Gross pay each month').props.value).toBe('5000.00');
    expect(after(L, 'Gross pay each month')).toBe('≈ Worked back from the take-home you entered. Type the gross from a payslip to replace it.');
    expect([after(L, 'Everything else taken out', 2, 'YOUR HOUSEHOLD'), after(L, '= Take-home')]).toEqual(['$0/month · 0%', '$5,000/month']);
    expect(L).toContain('The take-home is what you entered; the gross was worked back from it.');
    expect(L).not.toContain('This is what you entered — nothing here is calculated.');
    // typed from a payslip, the gross is theirs: the words go back to the drawing's
    fireEvent.changeText(screen.getByLabelText('Gross pay each month'), '6250');
    L = readLines();
    expect(after(L, 'Gross pay each month')).toBe('Before anything comes out.');
    expect(L).toContain('This is what you entered — nothing here is calculated.');
    press('Save your base pay');
    expect([profile().baseSalary, profile().grossWorkedBack]).toEqual(['6250', undefined]);
    screen.unmount();
    expect(after(look('/(tabs)/cashflow'), 'Inflow (income (take-home))', 2)).toBe('$5,000');      // the take-home typed stays
  });

  test('E2E-71 · the class: the Cash flow month\'s take-home is the Income summary\'s in every way a take-home is entered', () => {
    // the months used to take the tax off the wage and leave the 401(k) in; a typed take-home, a rate on the payslip laid on
    // rent, reinvested dividends counted as landing, and a household of two wages entered two ways all disagreed too
    const HH: Record<string, any> = {
      'calculated, a 401(k)': { baseSalary: '9000', c_401k: '1000', salaryFreq: 'monthly' },
      'calculated, no 401(k)': { baseSalary: '9000', salaryFreq: 'monthly' },
      'take-home typed': { baseSalary: '9000', c_401k: '1000', landsTypical: '6200', salaryFreq: 'monthly' },
      'their own rate': { baseSalary: '9000', c_401k: '1000', taxMode: 'manual', manualTaxRate: '20', salaryFreq: 'monthly' },
      'take-home typed, rent': { baseSalary: '9000', c_401k: '500', landsTypical: '6500', salaryFreq: 'monthly', rentals: [{ property_id: 'p1', income: 2000, expenses: 800 }], incomeSources: ['employment', 'rental'] },
      'calculated, rent': { baseSalary: '9000', c_401k: '500', salaryFreq: 'monthly', rentals: [{ property_id: 'p1', income: 2000, expenses: 800 }], incomeSources: ['employment', 'rental'] },
      'dividends reinvested': { baseSalary: '9000', c_401k: '500', salaryFreq: 'monthly', invAnnual: '3000' },
      'dividends paid to the bank': { baseSalary: '9000', c_401k: '500', salaryFreq: 'monthly', invAnnual: '3000', invPaidToBank: 'yes' },
      'two wages, one typed': { baseSalary: '6000', c_401k: '500', landsTypical: '4300', salaryFreq: 'monthly', whoEarns: 'both', hasPartner: 'yes', partnerWage: { baseSalary: '5000', c_401k: '300', salaryFreq: 'monthly' } },
    };
    expect(Object.keys(HH)).toHaveLength(9);                                         // the guard looked: nine households
    for (const [name, op] of Object.entries(HH)) {
      const month = buildDatedGrid(op, {}).cells[0].inflow;
      expect([name, Math.round(month * 100) / 100]).toEqual([name, Math.round(incomeSummary(op).lands.usualMonth * 100) / 100]);
      expect([name, Math.round(month * 100) / 100]).toEqual([name, Math.round(incomeMonthlyGrid(op, 'available')[8].amount * 100) / 100]);
    }
    // two by hand: a typed take-home of $6,200 lands $6,200 (it read $7,200); their 20% on $9,000 less the $1,000 401(k) is $6,200
    expect(buildDatedGrid(HH['take-home typed'], {}).cells[0].inflow).toBeCloseTo(6200, 6);
    expect(buildDatedGrid(HH['their own rate'], {}).cells[0].inflow).toBeCloseTo(9000 * 0.8 - 1000, 6);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-72 · A ONCE-A-YEAR BILL — $1,200 of car insurance due December 15 (DEC-0002, DEC-0447: in its own month, never spread)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('E2E-72 · a $1,200 December bill: September reads without it, December with it, the calendar puts it on its day, Home\'s record agrees', () => {
  // $6,250 before tax at their own 20% = $5,000 take-home; Groceries $700 and Phone $100; a $250 car loan; $3,000 in checking
  const H72 = () => ({ onboardingComplete: true, hideBalances: false, nwSetupChoice: 'self',
    onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1981', baseSalary: '6250', salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '20',
      spendCats: [{ id: 'groceries', label: 'Groceries', amount: 700, bucket: 'flexible', tier: 'need' }, { id: 'phone', label: 'Phone / Internet', amount: 100, bucket: 'fixed', tier: 'need' }] },
    liabilities: [{ debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9800, interest_rate_apr: 0.064, minimum_monthly_payment: 250, due_day: 28 }],
    expenses: [], assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'CASH', balance: 3000, asset_class: 'cash' }] });
  const planned = (L: string[]) => block(L, 'PLANNED EXPENSES', '= Total');

  test('E2E-72 · Add a dated bill on the Bill calendar: Sep −$800 on both tabs, Dec $2,000 with Once in a while $1,200, Dec 15 on the calendar', () => {
    start(H72());
    // the way in a person has from the expense sheet: "Adding something else? … A dated bill"
    open('/(tabs)/cashflow');
    expect(after(readLines(), 'Expenses', 2, 'PLANNED · SEPTEMBER')).toBe('−$800');
    chooseInAlert('A dated bill');
    press('Add expense');
    press('Add something else — a dated bill, an account, or one-time money in');
    expect(mockNav.pushes).toEqual(['/bill-calendar']);
    screen.unmount();
    follow();
    press('Add a dated bill');
    fireEvent.changeText(screen.getByLabelText('Bill name'), 'Car insurance');
    fireEvent.changeText(screen.getByLabelText('Bill amount'), '1200');
    press('Due in Dec');
    fireEvent.changeText(screen.getByLabelText('Due day of month'), '15');
    press('Save this bill');
    // THE CALENDAR, by hand from $3,000: each month in $5,000; out $800 + the $250 car loan = $1,050, and in December $1,200 more.
    // Sep End $3,000 + $5,000 − $1,050 = $6,950; Oct $10,900; Nov $14,850; Dec $14,850 + $5,000 − $2,250 = $17,600
    const C = readLines();
    expect(block(C, 'Sep', 'Dec', 3)).toEqual(['Sep', '+$5,000', '−$1,050', '$6,950', 'Oct', '+$5,000', '−$1,050', '$10,900',
      'Nov', '+$5,000', '−$1,050', '$14,850', 'Dec', '+$5,000', '−$2,250', '$17,600']);
    // on its day — and what is there two days before is November's End: nothing else in December is dated before the 13th, and
    // December's pay covers its everyday expenses and the car loan
    expect(after(C, 'COMING UP')).toBe('Car insurance · $1,200 due Dec 15, 2026');
    expect(after(C, 'COMING UP', 2)).toBe('✓ Covered — about $14,850 there by Dec 13, 2026.');
    screen.unmount();
    expect(profile().spendCats.find((c: any) => c.label === 'Car insurance')).toMatchObject({ bucket: 'nonmonthly', amount: 1200, months: [12], dueDay: 15 });

    // SEPTEMBER, without it — This month and the Expenses tab read $800 as before, and no Once in a while row
    open('/(tabs)/cashflow');
    let L = readLines();
    expect(after(L, 'Expenses', 2, 'PLANNED · SEPTEMBER')).toBe('−$800');
    expect(after(L, '= Planned surplus')).toBe('+$3,950');                         // $5,000 − $250 − $800
    tab('Expenses');
    expect(planned(readLines())).toEqual(['PLANNED EXPENSES', '$800', 'Bills & fixed', '$100', 'Everyday expenses', '$700', '= Total', '$800']);
    // DECEMBER, with it — three taps ahead on the one month switcher
    nextMonth(3);
    expect(readLines()).toContain('December 2026 — planned');
    expect(planned(readLines())).toEqual(['PLANNED EXPENSES', '$2,000', 'Bills & fixed', '$100', 'Once in a while', '$1,200', 'Everyday expenses', '$700', '= Total', '$2,000']);
    tab('This month');
    L = readLines();
    expect(block(L, 'DECEMBER 2026 — THE PLAN (AN ESTIMATE)', '= Planned surplus')).toEqual(['DECEMBER 2026 — THE PLAN (AN ESTIMATE)',
      'Planned inflow', '$5,000', 'Planned outflow (expenses + debt) · incl. Car insurance', '$2,250', '= Planned surplus', '$2,750']);
    screen.unmount();

    // HOME'S RECORDS of the month — September's plans $800; on Dec 10, December's plans $2,000 and This month reads −$2,000
    look('/(tabs)/home');
    expect((useStore.getState() as any).monthlySnapshots['2026-09'].planned_budget).toBe(800);
    onDay('2026-12-10');
    look('/(tabs)/home');
    expect((useStore.getState() as any).monthlySnapshots['2026-12'].planned_budget).toBe(2000);
    expect(after(look('/(tabs)/cashflow'), 'Expenses', 2, 'PLANNED · DECEMBER')).toBe('−$2,000');
    // the one producer all of them read
    const g = spendByMonthByBucket(profile());
    expect([g[8], g[11]]).toEqual([{ fixed: 100, nonmonthly: 0, flexible: 700 }, { fixed: 100, nonmonthly: 1200, flexible: 700 }]);
  });

  test('E2E-72 · a yearly bill whose day has passed this month has ONE place: this month\'s Out and plan — not "coming up", and not next year', () => {
    // $300 of car registration every September 15, seen on Sep 28: September plans $800 + $300 = $1,100 and the calendar's
    // September Out is $1,100 + the $250 car loan = $1,350; the list dated it Sep 15, 2027, a month the table does not have it in
    const h = H72();
    h.onboardingProfile.spendCats.push({ id: 'reg', label: 'Car registration', amount: 300, bucket: 'nonmonthly', months: [9], dueDay: 15, tier: 'need' } as any);
    start(h);
    const { whatsComing } = require('../../../MoneyKeel/functions/cashflow/whats-coming');
    const coming = whatsComing({ profile: profile(), startBalance: 3000, debts: (useStore.getState() as any).liabilities });
    expect(coming.bills.filter((b: any) => b.label === 'Car registration')).toEqual([]);
    const grid = buildDatedGrid(profile(), { liabilities: (useStore.getState() as any).liabilities });
    expect(grid.cells.map((c: any) => c.billItems.filter((b: any) => b.label === 'Car registration').length)).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(after(look('/(tabs)/cashflow'), 'Expenses', 2, 'PLANNED · SEPTEMBER')).toBe('−$1,100');
    const C = look('/bill-calendar');
    expect(block(C, 'Sep', 'Oct', -1)).toEqual(['Sep', '+$5,000', '−$1,350', '$6,650']);   // $3,000 + $5,000 − $1,350
    expect(C.join(' ')).not.toMatch(/Car registration/);
  });

  test('E2E-72 · every one of the calendar\'s 12 rows adds up as printed: the End before it + In − Out = End, in a household of cents', () => {
    // $6,000 before tax, the tax calculated ($5,415.83 take-home); Groceries $712.35, Phone $100; a $386.42 car loan; a $1,200 bill in
    // December; $3,000 on hand. Each figure rounded alone, a row could miss its End by a dollar
    start({ ...H72(), onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1981', baseSalary: '6000', salaryFreq: 'monthly',
      spendCats: [{ id: 'groceries', label: 'Groceries', amount: 712.35, bucket: 'flexible', tier: 'need' }, { id: 'phone', label: 'Phone / Internet', amount: 100, bucket: 'fixed', tier: 'need' },
        { id: 'ins', label: 'Car insurance', amount: 1200, bucket: 'nonmonthly', months: [12], dueDay: 15, tier: 'need' }] },
      liabilities: [{ debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9800, interest_rate_apr: 0.064, minimum_monthly_payment: 386.42, due_day: 28 }] });
    const C = look('/bill-calendar');
    const rows = block(C, 'Month', 'Aug ’27', 3).slice(4);                         // 12 rows of Month · In · Out · End
    expect(rows).toHaveLength(48);                                                // the guard looked: twelve months
    const grid = buildDatedGrid(profile(), { liabilities: (useStore.getState() as any).liabilities, startBalance: 3000 });
    let prev = 3000;
    for (let k = 0; k < 12; k++) {
      const [, inn, out, end] = rows.slice(k * 4, k * 4 + 4).map(dollars);
      expect([k, prev + inn + out]).toEqual([k, end]);                            // Out is printed with its minus sign
      expect(end).toBe(Math.round(grid.cells[k].runningBalance));                 // each End is the balance, rounded as balances are
      expect(Math.abs(inn - grid.cells[k].inflow)).toBeLessThan(1);
      expect(Math.abs(-out - grid.cells[k].outflow)).toBeLessThan(1);
      prev = end;
    }
    // September by hand: $3,000 + $5,415.83 − ($812.35 + $386.42) = $7,217.06 → End $7,217; In $5,416, Out $5,416 − $4,217 = $1,199
    expect(rows.slice(0, 4)).toEqual(['Sep', '+$5,416', '−$1,199', '$7,217']);
    expect(rows.slice(12, 16)).toEqual(['Dec', '+$5,416', '−$2,399', expect.any(String)]);
  });

  test('E2E-72 · with the home\'s mortgage in Debts, the calendar stands the Rent / Mortgage line down as This month does (DEC-1923)', () => {
    // $7,200 typed take-home on $9,000; Rent / Mortgage $2,300 and Groceries $700 budgeted; the $2,400 mortgage is on the home
    start({ onboardingComplete: true, hideBalances: false, nwSetupChoice: 'self', expenses: [],
      onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1975', baseSalary: '9000', salaryFreq: 'monthly', landsTypical: '7200',
        spendCats: [{ id: 'rent', label: 'Rent / Mortgage', amount: 2300, bucket: 'fixed', tier: 'need' }, { id: 'groceries', label: 'Groceries', amount: 700, bucket: 'flexible', tier: 'need' }] },
      liabilities: [{ debt_id: 'd1', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 228000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2400, property_id: 'home' }],
      assetAccounts: [{ asset_id: 'home', label: 'Home', kind: 'real_estate', asset_class: 'real_estate', re_use: 'primary', balance: 400000, tax_bucket: 'NONE' }] });
    // This month: $7,200 − $2,400 − $700 = +$4,100 (the $2,300 line is not counted: the mortgage is in Debts)
    const cf = look('/(tabs)/cashflow');
    expect([after(cf, 'Expenses', 2, 'PLANNED · SEPTEMBER'), after(cf, '= Planned surplus')]).toEqual(['−$700', '+$4,100']);
    // the calendar's September: in $7,200, out $700 + $2,400 = $3,100, End $4,100 — it read out $5,400, End $1,800
    const C = look('/bill-calendar');
    expect(block(C, 'Sep', 'Oct', -1)).toEqual(['Sep', '+$7,200', '−$3,100', '$4,100']);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-73 · SET THE BUDGET, THEN CHANGE ONE CATEGORY
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('E2E-73 · set the budget, change one category: the editor, This month, the Expenses tab and Home\'s record move together', () => {
  const editorCard = (L: string[]) => block(L, 'Income (take-home)', '= Planned surplus', 2).filter((l) => l !== 'ⓘ');

  test('E2E-73 · in the founder\'s fresh account: no budget reads "— not set", $1,200 set reads +$1,550, Dining out $300 → $450 reads +$1,400', () => {
    start(FRAME_B());
    open('/(tabs)/cashflow');
    asDrawn(2);                                                                     // This month is frame B, word for word
    press('Set your budget');                                                       // the editor opens over This month
    // NOTHING SET reads as This month reads it: no expenses plan and no planned surplus — it read "$0" and "= Planned surplus $2,350"
    expect(editorCard(readLines())).toEqual(['Income (take-home)', '$5,000', '− Expenses (plan)', '— not set', '− Debt payments', '$2,250', '= Planned surplus', '—']);
    fireEvent.press(screen.getByText('Set your budget →'));
    fireEvent.changeText(screen.getByLabelText('Groceries, monthly limit'), '700');
    fireEvent.changeText(screen.getByLabelText('Dining out, monthly limit'), '300');
    fireEvent.changeText(screen.getByLabelText('Utilities, monthly limit'), '200');
    fireEvent.press(screen.getByText('Save'));
    // SET: $700 + $300 + $200 = $1,200; planned surplus $5,000 − $2,000 − $250 − $1,200 = $1,550
    expect(editorCard(readLines())).toEqual(['Income (take-home)', '$5,000', '− Expenses (plan)', '$1,200', '− Debt payments', '$2,250', '= Planned surplus', '$1,550']);
    press('Done editing your budget');
    let L = readLines();
    expect(block(L, 'PLANNED · SEPTEMBER', '= Planned surplus')).toEqual(['PLANNED · SEPTEMBER', '+$1,550', 'Inflow (income (take-home))', 'after tax and 401(k)', '$5,000',
      'Mortgage', 'DEBT', '−$2,000', 'Car loan', 'DEBT', '−$250', 'Expenses', 'your budget', '−$1,200', '= Planned surplus', '+$1,550']);
    tab('Expenses');
    expect(block(readLines(), 'PLANNED EXPENSES', '= Total')).toEqual(['PLANNED EXPENSES', '$1,200', 'Bills & fixed', '$200', 'Everyday expenses', '$1,000', '= Total', '$1,200']);

    // CHANGE ONE: Dining out $300 → $450, from the Expenses tab's planned rows. $700 + $450 + $200 = $1,350; surplus $1,400
    fireEvent.press(screen.getByLabelText(/^Planned expenses: .*Opens your budget\.$/));
    fireEvent.press(screen.getByText('Set your budget →'));
    expect(screen.getByLabelText('Dining out, monthly limit').props.value).toBe('300');
    fireEvent.changeText(screen.getByLabelText('Dining out, monthly limit'), '450');
    fireEvent.press(screen.getByText('Save'));
    expect(editorCard(readLines())).toEqual(['Income (take-home)', '$5,000', '− Expenses (plan)', '$1,350', '− Debt payments', '$2,250', '= Planned surplus', '$1,400']);
    press('Done editing your budget');
    expect(block(readLines(), 'PLANNED EXPENSES', '= Total')).toEqual(['PLANNED EXPENSES', '$1,350', 'Bills & fixed', '$200', 'Everyday expenses', '$1,150', '= Total', '$1,350']);
    tab('This month');
    L = readLines();
    expect([after(L, 'Expenses', 2, 'PLANNED · SEPTEMBER'), after(L, '= Planned surplus')]).toEqual(['−$1,350', '+$1,400']);
    expect(after(L, '= Actual surplus so far')).toBe('+$3,000');                    // a plan does not move what happened: $5,000 − $2,000
    screen.unmount();

    // Home: the box is what happened, so it does not move; the month's record carries the plan, $1,350
    const home = homeBox(look('/(tabs)/home'));
    expect([after(home, 'Income'), after(home, 'Outflow (expenses + debt)'), after(home, 'Left')]).toEqual(['$5,000', '$2,000', '$3,000']);
    expect((useStore.getState() as any).monthlySnapshots['2026-09'].planned_budget).toBe(1350);
  });

  test('E2E-73 · a budget whose only line falls in December reads $0 in September — set, never "not set" — on the editor, This month and Expenses', () => {
    start(FRAME_B());
    open('/bill-calendar');
    press('Add a dated bill');
    fireEvent.changeText(screen.getByLabelText('Bill name'), 'Car insurance');
    fireEvent.changeText(screen.getByLabelText('Bill amount'), '1200');
    press('Due in Dec');
    press('Save this bill');
    screen.unmount();
    open('/(tabs)/cashflow');
    let L = readLines();
    // $5,000 − $2,000 − $250 − $0 = +$2,750
    expect([after(L, 'Expenses', 1, 'PLANNED · SEPTEMBER'), after(L, 'Expenses', 2, 'PLANNED · SEPTEMBER'), after(L, '= Planned surplus')]).toEqual(['your budget', '$0', '+$2,750']);
    expect(L.join(' ')).not.toMatch(/haven’t set your budget/);
    expect(screen.queryByText('Set your budget')).toBeNull();                       // the door is gone: a budget is set
    press('Expenses, your budget, $0. Opens your budget.');                         // the Expenses row opens the editor
    expect(editorCard(readLines())).toEqual(['Income (take-home)', '$5,000', '− Expenses (plan)', '$0', '− Debt payments', '$2,250', '= Planned surplus', '$2,750']);
    press('Done editing your budget');
    tab('Expenses');
    expect(block(readLines(), 'PLANNED EXPENSES', '= Total')).toEqual(['PLANNED EXPENSES', '$0', '= Total', '$0']);
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-74 · RECORD A CAR-LOAN PAYMENT ON THE DEBTS TAB
// ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('E2E-74 · a car-loan payment: the Debts tab, This month (expenses + debt, DEC-0269), Home and Net worth agree', () => {
  test('E2E-74 · in the founder\'s household: $250 paid — owed $333,000 → $332,750 everywhere, surplus +$900 → +$650, Outflow $4,350', () => {
    start(FRAME_A());
    const nwBefore = look('/networth');
    expect([after(nwBefore, 'DEBTS', 2), after(nwBefore, 'Car loan', 1, '🚗')]).toEqual(['−$333,000', '−$9,800']);
    open('/(tabs)/cashflow');
    asDrawn(1);
    tab('Debts');
    expect(after(readLines(), 'YOUR DEBT')).toBe('$333,000');
    const chooser = chooseInAlert('Car loan');
    press('Log a payment');
    expect(chooser[0]).toEqual({ title: 'Log a payment', buttons: ['Credit card debt payment', 'HELOC', 'Car loan', 'Mortgage', 'Cancel'] });
    let L = readLines();
    expect(after(L, 'Log payment', 2)).toBe('Car loan · $9,800 balance');
    expect(L).toContain('Adds a “Debt payment” to your activity and lowers this balance. New balance: $9,550.');
    fireEvent.press(screen.getByText('Log'));                                       // the $250 it offers
    const paid = (useStore.getState() as any).expenses[0];
    expect([paid.amount, paid.category, paid.store, paid.date]).toEqual([250, 'Debt payment', 'Car loan', TODAY]);
    // the Debts tab: $9,800 − $250 = $9,550; owed $333,000 − $250 = $332,750
    L = readLines();
    expect([after(L, 'YOUR DEBT'), after(L, '🔔 payment due today')]).toEqual(['$332,750', '−$9,550 ›']);
    // This month: the car loan is paid; $5,000 − $2,000 − $250 − $500 − $1,200 − $200 − $200 = +$650
    tab('This month');
    L = readLines();
    expect(after(L, 'Car loan', 1, 'ACTUAL · SO FAR')).toBe('PAID');
    expect(after(L, 'Car loan', 2, 'ACTUAL · SO FAR')).toBe('−$250');
    expect([after(L, 'ACTUAL · SO FAR'), after(L, '= Actual surplus so far')]).toEqual(['+$650', '+$650']);
    // an installment payment is debt, not an expense: the Expenses tab's actual expenses stay $2,100
    tab('Expenses');
    expect(after(readLines(), 'ACTUAL EXPENSES')).toBe('$2,100');
    screen.unmount();
    // Home: out = $2,100 of expenses + $2,250 of debt paid = $4,350 (DEC-0269); left $5,000 − $4,350 = $650; 87% spent
    const home = homeBox(look('/(tabs)/home'));
    expect(home).toEqual(["THIS MONTH'S CASH FLOW", 'Expenses running fast', '87% spent · day 28 of 30', 'Income', '$5,000',
      'Outflow (expenses + debt)', '$4,350', 'Left', '$650']);
    // Net worth: the same balance
    const nw = look('/networth');
    expect([after(nw, 'DEBTS', 2), after(nw, 'Car loan', 1, '🚗'), nw[1 + nw.indexOf('ⓘ')]]).toEqual(['−$332,750', '−$9,550', 'Own $0 − Owe $332,750']);
  });

  test('E2E-74 · a $386.42 payment is offered and recorded to the cent — it was offered as "386"', () => {
    start({ ...FRAME_B(), expenses: [],
      liabilities: [{ debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 386.42, due_day: 28 }] });
    open('/(tabs)/cashflow');
    tab('Debts');
    press('Log a payment');                                                         // one debt: no question which
    const amount = screen.UNSAFE_getAllByType(require('react-native').TextInput).find((t: any) => t.props.autoFocus && t.props.placeholder === '0');
    expect(amount?.props.value).toBe('386.42');
    expect(readLines()).toContain('Adds a “Debt payment” to your activity and lowers this balance. New balance: $13,614.');   // $13,613.58
    fireEvent.press(screen.getByText('Log'));
    expect((useStore.getState() as any).expenses[0].amount).toBe(386.42);
    expect((useStore.getState() as any).liabilities[0].remaining_balance).toBeCloseTo(13613.58, 8);
    tab('This month');
    const A = readLines();
    expect([after(A, 'Car loan', 1, 'ACTUAL · SO FAR'), after(A, 'Car loan', 2, 'ACTUAL · SO FAR')]).toEqual(['PAID', '−$386']);
  });
});
