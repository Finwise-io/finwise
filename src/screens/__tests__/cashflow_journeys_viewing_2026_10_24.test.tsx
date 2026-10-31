/** CASH FLOW JOURNEYS — VIEWING (2026-10-24, E2E-75 to E2E-80). A person moves through Cash flow and reads it.
 *
 *  Each flow renders the real screens, taps the controls a person touches (found by their words or their spoken label), follows
 *  every push to the screen it names with the parameters it carried, and checks the outcome where the person looks next — on the
 *  Cash flow tab's four tabs (This month · Income · Expenses · Debts), Your base pay, the Income summary, the filing-status
 *  question, the Bill calendar and Home's THIS MONTH’S CASH FLOW box. Every figure is worked by hand beside its check.
 *
 *  THE FOUNDER'S HOUSEHOLD (E2E-75) is the one cash-flow_v01 draws on This month and Expenses (frames A and C, built row for row
 *  from his own sheet, cashflow-thismonth+spending-screen-jj.xlsx): $5,000 take-home; a mortgage ($2,000, paid), a car loan ($250,
 *  due the 28th), a HELOC and a card payment ($200 each, entered on the Debts tab); a $2,000 budget; nine expenses typed by hand
 *  ($500) and twenty-three imported from a card ($1,200) — on the drawing's own day in August.
 *
 *  What the flows found wrong in the app, each fixed the same day (2026-10-24) and named where it is checked:
 *   · E2E-77 — the month's take-home left the 401(k) in: $6,000 gross and $500 into a 401(k) read $5,522 on This month, the
 *     Income tab and Home beside Your base pay's ≈$5,022 (fixed in the dated grid by CJA, which found it the same hour, E2E-71).
 *   · E2E-78 — under hide-balances every row on the four tabs and the past month was heard as dots; the Debts rows were heard as
 *     their printed run ("/month", "~", "›"); the planned-expenses door never said an amount; the door inside Home's empty box
 *     could not be reached by a screen reader.
 *   · E2E-79 — "That changes your take-home" compared single, no one over 65, with the status chosen: the drawn couple (Sam, 67),
 *     already taxed jointly, was promised "$328/month more" and the take-home did not move.
 *   · E2E-76 and E2E-80 — a past or future month's band repeated the switcher ("SEPTEMBER 2026 — FINAL — …"); a future month
 *     named the everyday budget as its bill ("incl. Everyday expenses") and said "Nothing entered yet" with a budget entered; the
 *     Bill calendar's month rows said they open a month detail that was retired on 2026-10-02.
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { useStore } from '../../store/useStore';
import { setHideBalances } from '../../domain/_shared/money';
import { builtLines, drawingLines, norm, normExact, firstDifference, missingInOrder } from '../../testing/mockMatch';
import { AS_BUILT, asBuilt, cashflowPhone, BUDGET_BY_CATEGORY } from '../../testing/cashflowDrawing';   // the drawing as built, figure for figure (2026-10-25)

let mockParams: Record<string, string | undefined> = {};
const mockPushes: string[] = [];
const mockBacks = { n: 0 };
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: () => { mockBacks.n += 1; }, push: (r: string) => mockPushes.push(r), replace: (r: string) => mockPushes.push(r), setParams: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => mockParams, useSegments: () => [],
  useFocusEffect: (cb: () => void) => { const R = require('react'); R.useEffect(() => { cb(); }, []); },
  router: { push: (r: string) => mockPushes.push(r), replace: (r: string) => mockPushes.push(r), back: () => { mockBacks.n += 1; } },
  Link: ({ children }: any) => children,
}));
jest.mock('../../services/sync/snaptradeSync', () => ({ runSnapTradeSync: jest.fn(async () => 0) }));

// ── the day ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const FAKE = ['nextTick', 'setImmediate', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] as const;
const onDay = (iso: string) => jest.useFakeTimers({ now: new Date(`${iso}T12:00:00`), doNotFake: [...FAKE] });

// ── reading a screen ────────────────────────────────────────────────────────────────────────────────────────────────────
const lines = () => builtLines(screen.toJSON());
const after = (label: string, n = 1, ls = lines(), from = 0) => { const i = ls.indexOf(label, from); return i >= 0 ? ls[i + n] : undefined; };
/** a block of lines, from its first line up to (not including) the line that ends it */
const block = (ls: string[], start: string, end: string) => { const i = ls.indexOf(start); expect(i).toBeGreaterThanOrEqual(0); const j = ls.indexOf(end, i + 1); expect(j).toBeGreaterThan(i); return ls.slice(i, j); };
const dollars = (s: string | undefined) => (s == null ? NaN : Number(s.replace('−', '-').replace(/[^0-9.\-]/g, '')));
const squash = (s: string) => s.replace(/\s+/g, ' ').trim();
const textOf = (n: any): string => (n == null ? '' : typeof n === 'string' ? n : Array.isArray(n) ? n.map(textOf).join('') : (n.children ?? []).map(textOf).join(''));
/** WHAT A SCREEN READER REACHES, in order (the method of performance_journeys_viewing_2026_10_23): each element marked accessible
 *  (a Text is one of its own), with what it says — its label, or with none its printed words. Anything inside an accessible
 *  element is not reached on its own. A subtree hidden from accessibility is skipped. */
type Reached = { said: string; printed: string; node: any };
function reachable(): Reached[] {
  const out: Reached[] = [];
  const walk = (n: any) => {
    if (n == null || typeof n === 'string') { if (typeof n === 'string' && squash(n)) out.push({ said: squash(n), printed: squash(n), node: null }); return; }
    if (Array.isArray(n)) { n.forEach(walk); return; }
    const p = n.props ?? {};
    if (p.accessibilityElementsHidden || p.importantForAccessibility === 'no-hide-descendants') return;
    if (p.accessible || n.type === 'Text') {
      const printed = squash(textOf(n));
      const said = squash(p.accessibilityLabel ? String(p.accessibilityLabel) : printed);
      if (said) out.push({ said, printed, node: n });
      return;
    }
    (n.children ?? []).forEach(walk);
  };
  walk(screen.toJSON());
  return out;
}
const heard = () => reachable().map((r) => r.said);
/** the marks a screen reader spells out, never words: Performance's list (performance_journeys_viewing, E2E-68), with this
 *  surface's own — ≈ ("almost equal to"), the ⌃ ⌄ of an open or closed section, ✓, a "/month" after "hidden", and a line that
 *  starts with "=" ("equals") */
const MARKS = /[▲▼⚠⏱›•~→＋▾▸≈⌃⌄✓ⓘ]|(\d|%|hidden)\/(year|month)|\d{4}-\d{2}-\d{2}|^=/;
const markHeard = () => reachable().filter((r) => MARKS.test(r.said)).map((r) => r.said);
/** the info dots a screen reader reaches, by what they say */
const dotsSaid = () => heard().filter((l) => /^About /.test(l));

// ── following a push to the screen it names ─────────────────────────────────────────────────────────────────────────────
const SCREENS: Record<string, () => any> = {
  '/(tabs)/cashflow': () => require('../CashFlowScreen').default,
  '/(tabs)/home': () => require('../HomeScreen').default,
  '/base-pay': () => require('../BasePayScreen').default,
  '/income-summary': () => require('../IncomeSummaryScreen').default,
  '/income-manager': () => require('../IncomeManagerScreen').default,
  '/bill-calendar': () => require('../BillCalendarScreen').default,
  '/filing-status': () => require('../FilingStatusScreen').default,
  '/tax-organizer': () => require('../TaxOrganizerScreen').default,
};
/** THE APP'S OWN FRAME, as app/_layout.tsx draws it: the root writes the hide-balances flag every money writer reads and remounts
 *  on it; a tab screen carries the shared top bar (app/(tabs)/_layout.tsx: header: () => <TopBar />). */
function Root({ children }: { children: React.ReactNode }) {
  const hidden = useStore((s: any) => s.hideBalances);
  setHideBalances(!!hidden);
  return <React.Fragment key={String(!!hidden)}>{children}</React.Fragment>;
}
function open(route: string) {
  const [where, q] = route.split('?');
  mockParams = Object.fromEntries(new URLSearchParams(q ?? '').entries());
  const make = SCREENS[where];
  if (!make) throw new Error(`no screen for ${where}`);
  const C = make();
  const TopBar = require('../../components/TopBar').default;
  return render(<Root>{where.startsWith('/(tabs)/') && <TopBar />}<C /></Root>);
}
/** follow the last push: unmount what is open and open where it points */
function follow(): string {
  const to = mockPushes[mockPushes.length - 1];
  if (!to) throw new Error('nothing was pushed');
  screen.unmount();
  open(to);
  return to;
}
/** go back: the screen's own way back was pressed (router.back), so the screen before is opened again, as it now stands */
function back(to: string) {
  const before = mockBacks.n;
  fireEvent.press(screen.getAllByLabelText('Back')[0]);
  expect(mockBacks.n).toBe(before + 1);
  screen.unmount();
  open(to);
}
/** a tap on one of the four tabs of Cash flow, by its spoken label */
const tab = (name: 'This month' | 'Income' | 'Expenses' | 'Debts') => fireEvent.press(screen.getByLabelText(`${name} tab`));
/** the Cash flow tab as built, without the shared top bar's own words (the drawing's chrome) — its "Menu", and its icons, which
 *  print as icon-font glyphs (private-use characters) once the font has loaded */
const tabLines = () => lines().filter((l) => !['Menu', '‹ Back'].includes(l) && !/^[-\s]+$/.test(l));

function start(state: Record<string, any>) {
  useStore.getState().resetAll(); useStore.getState().setOnboardingComplete?.(true);
  useStore.setState({ hideBalances: false, ...state } as any);
  mockPushes.length = 0;
}
afterEach(() => { setHideBalances(false); jest.useRealTimers(); jest.restoreAllMocks(); });

// ── cash-flow_v01, word for word AND FIGURE FOR FIGURE (2026-10-25, the weak guard) — the drawing as built (AS_BUILT, src/testing/
// cashflowDrawing.ts) with each dated row and ruling applied by name, compared with every figure and date as printed. It compared
// every figure as "$#" until 2026-10-25, so a wrong number passed. The only figures held as a token are the payoff plan's month
// and interest, counted from today, and they are named where they are.
const FROM_TODAY = (s: string) => s.replace(/ \$ ([a-z]{3} \d{4}) debt-free \$([\d,]+) \/month total \$([\d,]+) total interest/,
  ' $ <the month it ends> debt-free $$$2 /month total <its interest> total interest');
const drawnDifference = (drawn: string[], built: string[], floor: number) => {
  const want = normExact(drawn), got = FROM_TODAY(normExact(built));
  expect(want.split(' ').length).toBeGreaterThan(floor);                 // the guard looked: the frame has its words
  return firstDifference(want, got);
};

// ── THE FOUNDER'S HOUSEHOLD (cash-flow_v01 frames A and C) ───────────────────────────────────────────────────────────────
const AUG = '2026-08-20';                       // a day in the drawing's month, after its newest expense (19 Aug)
const WORKER = { status: 'employed', incomeSources: ['employment'], birthYear: '1981', baseSalary: '5000', salaryMode: 'takehome',
  salaryFreq: 'monthly', taxMode: 'manual', manualTaxRate: '0' };
const DEBTS = [
  { debt_id: 'm', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 300_000, interest_rate_apr: 0.05, minimum_monthly_payment: 2_000, due_day: 1 },
  { debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9_800, interest_rate_apr: 0.064, minimum_monthly_payment: 250, due_day: 28 },
];
const RADAR = [
  { debt_id: 'h', label: 'HELOC', debt_type: 'HELOC', remaining_balance: 20_000, interest_rate_apr: 0.08, minimum_monthly_payment: 200 },
  { debt_id: 'v', label: 'Credit card debt payment', debt_type: 'CREDIT_CARD', remaining_balance: 3_200, interest_rate_apr: 0.229, minimum_monthly_payment: 200 },
];
const exp = (id: string, amount: number, category: string, date: string, extra: Record<string, any> = {}) =>
  ({ id, amount, category, store: id.replace(/-\d+$/, ''), date, notes: '', createdAt: date, ...extra });
const paid = (store: string, amount: number, date: string) => exp(`pay ${store}`, amount, 'Debt payment', date, { store });
/** nine typed by hand — $500: 100 + 65 + 60 + 42 + 38 = 305 shown, 88 + 55 + 30 + 22 = 195 behind "Show all 9" */
const BY_HAND = [
  exp('Amazon', 100, 'Other', '2026-08-18'), exp('Trader Joe’s', 65, 'Grocery', '2026-08-16', { receiptUri: 'file://r1.jpg' }),
  exp('Shell', 60, 'Gas', '2026-08-14'), exp('CVS', 42, 'Other', '2026-08-11', { receiptUri: 'file://r2.jpg' }),
  exp('Starbucks', 38, 'Other', '2026-08-09', { receiptUri: 'file://r3.jpg' }), exp('Costco', 88, 'Grocery', '2026-08-07', { receiptUri: 'file://r4.jpg' }),
  exp('Chevron', 55, 'Gas', '2026-08-06'), exp('Walgreens', 30, 'Other', '2026-08-04', { receiptUri: 'file://r5.jpg' }),
  exp('PG&E', 22, 'Utilities', '2026-08-02'),
];
/** twenty-three from the card — $1,200: 15 + 315 + 70 + 95 + 145 = 640 shown; 120 + 18 + 16 more (32 + 15 × 26 = 422) = 560 behind */
const card = (s: string, category: string, amount: number, date: string, i = 0) => exp(`${s}-${i}`, amount, category, date, { origin: 'imported', store: s });
const IMPORTED = [
  card('Target', 'Other', 15, '2026-08-19'), card('Home Depot', 'Other', 315, '2026-08-16'), card('Chevron', 'Gas', 70, '2026-08-11'),
  card('Local Kitchen', 'Other', 95, '2026-08-08'), card('Whole Foods', 'Grocery', 145, '2026-08-03'), card('Safeway', 'Grocery', 120, '2026-08-02'),
  card('Netflix', 'Other', 18, '2026-08-02'), ...Array.from({ length: 16 }, (_, i) => card('Corner shop', 'Other', i === 0 ? 32 : 26, '2026-08-01', i)),
];
const FOUNDER = () => ({
  // the budget frame C draws, by category: Gas $200 · Grocery $900 · Utilities $200, and the rest of $2,000 as Other (2026-10-25)
  onboardingProfile: { ...WORKER, ...BUDGET_BY_CATEGORY },
  liabilities: [...DEBTS, ...RADAR],
  expenses: [paid('Mortgage', 2_000, '2026-08-01'), paid('HELOC', 200, '2026-08-05'), paid('Credit card debt payment', 200, '2026-08-12'), ...BY_HAND, ...IMPORTED],
  // the two paychecks the Income tab lists as received — $2,500 + $2,500, the month's take-home
  incomes: [{ id: 'i1', date: '2026-08-01', source: 'Paycheck', amount: 2_500 }, { id: 'i2', date: '2026-08-15', source: 'Paycheck', amount: 2_500 }],
  // where the debts stood at January's month-end, for PROGRESS: 333,000 now
  monthlySnapshots: { '2026-01': { month: '2026-01', gross_debt: 340_000 } },
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-75 · THE TAB TOUR in the founder's household — This month → Income → Expenses → Debts, then Home. Every frame word for word
// as cash-flow_v01 draws it; This month's rows add up; each tab's totals are This month's own lines; Home's box is This month's.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('E2E-75 · the tab tour in the founder\'s household (cash-flow_v01 frames A and C)', () => {
  test('E2E-75 · This month → Income → Expenses → Debts: each as drawn, and every total is one of This month\'s own lines', () => {
    onDay(AUG);
    start(FOUNDER());
    open('/(tabs)/cashflow');

    // THIS MONTH — frame A, word for word
    expect(drawnDifference(AS_BUILT.A(), tabLines(), 40)).toBe('');
    const tm = lines();
    // PLANNED: 5,000 − 2,000 − 250 − 2,000 − 200 − 200 = +$350 — every row shown is a row deducted
    const planned = block(tm, 'PLANNED · AUGUST', '= Planned surplus');
    expect(planned).toEqual(['PLANNED · AUGUST', '+$350', 'Inflow (income (take-home))', 'after tax and 401(k)', '$5,000',
      'Mortgage', 'debt', '−$2,000', 'Car loan', 'debt', '−$250', 'Expenses', 'your budget', '−$2,000',
      'HELOC', 'from big-ticket radar', '−$200', 'Credit card debt payment', 'from big-ticket radar', '−$200']);
    const plannedRows = planned.slice(2).filter((l) => /^[−+]?\$[\d,]+$/.test(l)).map(dollars);
    expect(plannedRows.reduce((t, v) => t + v, 0)).toBe(350);
    expect(after('= Planned surplus', 1, tm)).toBe('+$350');
    // ACTUAL: in 5,000; out = mortgage 2,000 + car loan 0 (due the 28th) + by hand 500 + imported 1,200 + HELOC 200 + card 200 = 4,100;
    // Inflow − Outflow = 5,000 − 4,100 = +$900
    const actual = block(tm, 'ACTUAL · SO FAR', '= Actual surplus so far');
    const actualRows = actual.slice(2).filter((l) => /^[−+]?\$[\d,]+$/.test(l)).map(dollars);
    expect(actualRows).toEqual([5_000, -2_000, 0, -500, -1_200, -200, -200]);
    const inflow = actualRows[0], outflow = -actualRows.slice(1).reduce((t, v) => t + v, 0);
    expect([inflow, outflow, inflow - outflow]).toEqual([5_000, 4_100, 900]);
    expect(after('= Actual surplus so far', 1, tm)).toBe('+$900');

    // INCOME — frame 5, word for word; its take-home is This month's inflow
    tab('Income');
    // frame 5 draws another household ($6,200, two rentals, RSU grants — held in its own household by cashflow_matches_v01 E); here its
    // words with this household's figures: $5,000 a month, no rental and no equity, two $2,500 paychecks, each to the cent
    expect(drawnDifference(asBuilt(cashflowPhone(5), [
      { why: 'the founder’s take-home', replace: ['$6,200', '$5,000'] }, { why: 'the founder’s take-home', replace: ['$6,200 ›', '$5,000 ›'] },
      { why: 'the founder has no rental and no equity', remove: ['Rental income', '2 properties', '$0 ›', 'Equity comp', 'RSU grants', '— ›'] },
      { why: 'cash-flow_v01 row 2026-10-25: the drawing’s own note', remove: ['opens the steady-or-varies pop-up — variable earners fine-tune month by month'] },
      { why: 'the founder’s paychecks, to the cent (row 2026-10-25)', replaceEvery: ['+$3,100', '+$2,500.00'] },
      { why: 'DEC-1560: kept', append: ['Your income, all of it', 'the take-home, and what it is taxed on', 'Open ›', '＋ Expense'] },
    ]), tabLines(), 25)).toBe('');
    let ls = lines();
    expect(after('THIS MONTH', 1, ls)).toBe('$5,000');                       // = This month's "Inflow (income (take-home)) $5,000"
    expect(after('THIS MONTH', 1, ls)).toBe(after('Inflow (income (take-home))', 2, tm));
    expect(after('Salary — steady', 2, ls)).toBe('$5,000 ›');
    // received: $2,500 on Aug 1 and $2,500 on Aug 15 — newest first; together the month's take-home
    expect(block(ls, 'RECEIVED THIS MONTH', 'Your income, all of it')).toEqual(['RECEIVED THIS MONTH', 'Aug 15 · Paycheck', '+$2,500.00', 'Aug 1 · Paycheck', '+$2,500.00']);

    // EXPENSES — frame C, word for word; its totals are This month's lines
    tab('Expenses');
    expect(drawnDifference(AS_BUILT.C(), tabLines(), 60)).toBe('');
    ls = lines();
    // MONTHLY RECURRING = This month's planned Mortgage + Car loan: 2,000 + 250 = $2,250
    expect(after('MONTHLY RECURRING EXPENSES', 1, ls)).toBe('$2,250');
    expect(dollars(after('MONTHLY RECURRING EXPENSES', 1, ls))).toBe(-(plannedRows[1] + plannedRows[2]));
    // PLANNED = This month's planned "Expenses · your budget −$2,000", by category as drawn: Gas 200 + Grocery 900 + Utilities 200 +
    // Other (the rest of the 2,000) 700 = $2,000
    expect(block(ls, 'PLANNED EXPENSES', 'ACTUAL EXPENSES')).toEqual(['PLANNED EXPENSES', '$2,000', 'Gas', '$200', 'Grocery', '$900', 'Utilities', '$200', 'Other', '$700', '= Total', '$2,000']);
    expect(dollars(after('PLANNED EXPENSES', 1, ls))).toBe(-plannedRows[3]);
    // ACTUAL, by where it came from — each the actual row of the same name: by hand $500 (305 shown + 195 more), imported $1,200
    // (640 shown + 560 more), the HELOC and the card $200 each; all sources 500 + 1,200 + 400 = $2,100
    // each total over rows written to the cent is written to the cent, R5 (2026-10-27, FX-CF-A — cash-flow_v01’s rows of that date; the old answer is held as test.failing in cashflow_fix_wave_2026_10_27.test.tsx)
    expect([after('ENTERED BY HAND', 1, ls), after('IMPORTED FROM YOUR CARD', 1, ls), after('DEBT PAYMENTS COUNTED AS EXPENSES', 1, ls)])
      .toEqual(['$500.00', '$1,200.00', '$400.00']);
    expect([dollars(after('ENTERED BY HAND', 1, ls)), dollars(after('IMPORTED FROM YOUR CARD', 1, ls)), dollars(after('DEBT PAYMENTS COUNTED AS EXPENSES', 1, ls))])
      .toEqual([-actualRows[3], -actualRows[4], -(actualRows[5] + actualRows[6])]);
    expect([after('ACTUAL EXPENSES', 1, ls), after('= Actual expenses, all sources', 1, ls)]).toEqual(['$2,100.00', '$2,100.00']);
    // and what This month took out is those expenses plus the debt paid that is not an expense: 2,100 + mortgage 2,000 = 4,100
    expect(dollars(after('ACTUAL EXPENSES', 1, ls)) + 2_000).toBe(outflow);

    // DEBTS — what it asks of the month is This month's planned debt rows: 2,000 + 250 + 200 + 200 = $2,650
    tab('Debts');
    ls = lines();
    // what is owed: 300,000 + 9,800 + 20,000 + 3,200 = $333,000; the interest a month 300,000 × 5% ÷ 12 = 1,250 + 9,800 × 6.4% ÷ 12 =
    // 52.27 + 20,000 × 8% ÷ 12 = 133.33 + 3,200 × 22.9% ÷ 12 = 61.07 → 1,496.67 → ~$1,497
    // the total line is the payments only — each debt's interest is on its own line (DEC-1560; CF2-03), and PAYOFF PLAN is on its bar (R1) (2026-10-27, FX-CF-A — cash-flow_v01’s rows of that date; the old answer is held as test.failing in cashflow_fix_wave_2026_10_27.test.tsx)
    expect(block(ls, 'YOUR DEBT', 'PAYOFF PLAN')).toEqual(['YOUR DEBT', '$333,000', 'across 4 debts · $2,650/month in payments']);
    expect(-(plannedRows[1] + plannedRows[2] + plannedRows[4] + plannedRows[5])).toBe(2_650);
    // the drawn lines of frame 6 that are not its household's own figures, in its order: the total, the list, the one door, progress
    expect(missingInOrder(['YOUR DEBT', 'YOUR DEBTS', 'pay first', 'Log a payment ›', 'PROGRESS'], ls)).toEqual([]);
    // each debt in the order to pay it (avalanche, the costliest first), its balance on its line
    const order = ['Credit card debt payment', 'HELOC', 'Car loan', 'Mortgage'];
    expect(order.map((d) => ls.indexOf(d))).toEqual([...order.map((d) => ls.indexOf(d))].sort((a, b) => a - b));
    expect(order.map((d) => ls.slice(ls.indexOf(d)).find((l) => /^−\$[\d,]+ ›$/.test(l)))).toEqual(['−$3,200 ›', '−$20,000 ›', '−$9,800 ›', '−$300,000 ›']);
    // PROGRESS: January's month-end owed $340,000 → 340,000 − 333,000 = $7,000 paid down; 7,000 ÷ 340,000 = 2.06% → 2%
    expect(after('PROGRESS', 1, ls)).toBe('$7,000 paid down since January — 2% of where you started');
  });

  test('E2E-75 · the Debts tab, reached by the same tour, is frame 6 word for word in the household frame 6 draws', () => {
    // frame 6 draws a different household from frames A and C (the drawing carried it in from money-four-tabs_v02): a Visa card
    // $3,200 at 22.90% and a car loan $9,800 at 6.40%; January's month-end owed $17,100. 3,200 + 9,800 = $13,000; paid down
    // 17,100 − 13,000 = $4,100; 4,100 ÷ 17,100 = 23.98% → 24%, as drawn
    onDay(AUG);
    start({ onboardingProfile: { ...WORKER, monthlySpending: '2000' },
      liabilities: [
        { debt_id: 'v', label: 'Visa card', debt_type: 'CREDIT_CARD', remaining_balance: 3_200, interest_rate_apr: 0.229, minimum_monthly_payment: 110 },
        { debt_id: 'c', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 9_800, interest_rate_apr: 0.064, minimum_monthly_payment: 300 },
      ],
      monthlySnapshots: { '2026-01': { month: '2026-01', gross_debt: 17_100 } } });
    open('/(tabs)/cashflow');
    tab('Debts');
    expect(drawnDifference(AS_BUILT.F(), tabLines(), 25)).toBe('');
    const ls = lines();
    // its payments 110 + 300 = $410 a month — This month's two debt rows
    expect(after('YOUR DEBT', 2, ls)).toBe('across 2 debts · $410/month in payments');   // CF2-03 (2026-10-27, FX-CF-A — cash-flow_v01’s rows of that date; the old answer is held as test.failing in cashflow_fix_wave_2026_10_27.test.tsx)
    expect(after('PROGRESS', 1, ls)).toBe('$4,100 paid down since January — 24% of where you started');
    tab('This month');
    const p = block(lines(), 'PLANNED · AUGUST', '= Planned surplus');
    expect([after('Visa card', 2, p), after('Car loan', 2, p)]).toEqual(['−$110', '−$300']);
  });

  test('E2E-75 · Home\'s box is This month\'s ACTUAL · SO FAR: Income $5,000 · Outflow $4,100 · Left $900, and it opens the Cash flow tab', () => {
    onDay(AUG);
    start(FOUNDER());
    open('/(tabs)/home');
    const ls = lines();
    const i = ls.indexOf("THIS MONTH’S CASH FLOW");
    // 4,100 ÷ 5,000 = 82% spent, over 70% of what came in, so the pace word is "Expenses running fast"; Aug 20 of 31 days
    expect(ls.slice(i, i + 9)).toEqual(["THIS MONTH’S CASH FLOW", 'Expenses running fast', '82% spent · day 20 of 31',
      'Income', '$5,000', 'Outflow (expenses + debt)', '$4,100', 'Left', '$900']);
    expect(dollars(ls[i + 4]) - dollars(ls[i + 6])).toBe(dollars(ls[i + 8]));   // Inflow − Outflow = Left: 5,000 − 4,100 = 900
    fireEvent.press(screen.getByLabelText(/^This month’s cash flow, Expenses running fast: /));
    expect(follow()).toBe('/(tabs)/cashflow');
    expect(after('= Actual surplus so far')).toBe('+$900');
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-76 · MONTHS — Home saves each month's record while the month is open. On Oct 3 the person opens This month, taps back to
// September, then to August: each past month's figures are the record Home saved and the surplus Home's month-end sheet offered.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('E2E-76 · last month, then the month before, against what Home saved and offered', () => {
  // $6,000 take-home; a $1,100 budget (groceries $800, utilities $300); a $300 car loan; a $5,000 checking account
  const PROFILE = { ...WORKER, baseSalary: '6000', monthlySpending: '1100',
    spendCats: [{ id: 'groc', label: 'Groceries', amount: 800, bucket: 'flexible', tier: 'need' }, { id: 'util', label: 'Utilities', amount: 300, bucket: 'fixed', tier: 'need' }] };
  const CAR = { debt_id: 'car', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 12_000, interest_rate_apr: 0.06, minimum_monthly_payment: 300, payment_type: 'installment' };
  // August: 450 + 280 = $730 of expenses and the $300 car loan → out 1,030; 6,000 − 1,030 = $4,970 left
  const AUGUST = [exp('Grocer-1', 450, 'Groceries', '2026-08-05'), exp('Power-1', 280, 'Utilities', '2026-08-10'), paid('Car loan', 300, '2026-08-15')];
  // September: 520 + 290 + 400 = $1,210 and the car loan → out 1,510; 6,000 − 1,510 = $4,490 left
  const SEPTEMBER = [exp('Grocer-2', 520, 'Groceries', '2026-09-06'), exp('Power-2', 290, 'Utilities', '2026-09-10'),
    exp('Dentist-2', 400, 'Health', '2026-09-18'), paid('Car loan', 300, '2026-09-15')];
  const HOUSE = { onboardingProfile: PROFILE, liabilities: [CAR], assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'TAXABLE', balance: 5_000, asset_class: 'cash' }] };
  const record = (ym: string) => (useStore.getState() as any).monthlySnapshots?.[ym];

  test('E2E-76 · September reads $6,000 · $1,510 · $4,490 and August $6,000 · $1,030 · $4,970 — Home\'s records and Home\'s sheets, line for line', () => {
    // AUG 30 — the person opens the app on Home; Home saves August's record
    onDay('2026-08-30');
    start({ ...HOUSE, expenses: AUGUST });
    open('/(tabs)/home');
    expect(record('2026-08')).toMatchObject({ income_net: 6_000, spending: 730, debt_paid: 300, savings: 4_970 });
    screen.unmount(); jest.useRealTimers();

    // SEP 29 — September's expenses have been logged; Home saves September's record, and offers August's surplus to assign
    onDay('2026-09-29');
    useStore.setState({ expenses: [...AUGUST, ...SEPTEMBER] } as any);
    open('/(tabs)/home');
    expect(record('2026-09')).toMatchObject({ income_net: 6_000, spending: 1_210, debt_paid: 300, savings: 4_490 });
    expect(record('2026-08')).toMatchObject({ income_net: 6_000, spending: 730, debt_paid: 300, savings: 4_970 });   // August is not touched
    let ls = lines();
    expect(ls).toContain('Put your Aug surplus to work');
    expect(ls).toContain('$4,970 of $4,970 left to assign');                  // 6,000 − 730 − 300
    screen.unmount(); jest.useRealTimers();

    // OCT 3 — Home offers September's surplus
    onDay('2026-10-03');
    open('/(tabs)/home');
    ls = lines();
    expect(ls).toContain('Put your Sep surplus to work');
    expect(ls).toContain('$4,490 of $4,490 left to assign');                  // 6,000 − 1,210 − 300
    screen.unmount();

    // THE CASH FLOW TAB, on October; the person taps back a month
    open('/(tabs)/cashflow');
    expect(lines()).toContain('PLANNED · OCTOBER');
    fireEvent.press(screen.getByLabelText('Previous month'));
    ls = lines();
    expect(ls).toContain('September 2026 — final');
    // the band names the month, as the card's last drawing does (FIXED 2026-10-24: "SEPTEMBER 2026 — FINAL — WHAT ACTUALLY HAPPENED")
    const sep = block(ls, 'SEPTEMBER 2026 — WHAT ACTUALLY HAPPENED', 'That month’s activity ›');
    // the record: in 6,000; out = expenses 1,210 + debt paid 300 = 1,510; surplus 6,000 − 1,510 = 4,490 — the sheet's $4,490
    // the surplus carries its sign, as This month's does (CF2-07) (2026-10-27, FX-CF-A — cash-flow_v01’s rows of that date; the old answer is held as test.failing in cashflow_fix_wave_2026_10_27.test.tsx)
    expect(sep).toEqual(['SEPTEMBER 2026 — WHAT ACTUALLY HAPPENED', 'Actual inflow', '$6,000', 'Outflow (expenses + debt)', '$1,510', '= Surplus', '+$4,490']);
    const s = record('2026-09');
    expect([dollars(sep[2]), dollars(sep[4]), dollars(sep[6])]).toEqual([s.income_net, s.spending + s.debt_paid, s.savings]);
    expect(ls).toContain('Frozen — past months never change under you.');

    // a month further back: August — the record Home saved on Aug 30, and the $4,970 its sheet offered on Sep 29
    fireEvent.press(screen.getByLabelText('Previous month'));
    ls = lines();
    const aug = block(ls, 'AUGUST 2026 — WHAT ACTUALLY HAPPENED', 'That month’s activity ›');
    expect(aug).toEqual(['AUGUST 2026 — WHAT ACTUALLY HAPPENED', 'Actual inflow', '$6,000', 'Outflow (expenses + debt)', '$1,030', '= Surplus', '+$4,970']);   // its sign (CF2-07, 2026-10-27)
    const a = record('2026-08');
    expect([dollars(aug[2]), dollars(aug[4]), dollars(aug[6])]).toEqual([a.income_net, a.spending + a.debt_paid, a.savings]);

    // that month's activity: August's Expenses tab lists its $730 — the record's expenses, the car loan apart (same every month)
    fireEvent.press(screen.getByLabelText('See that month’s activity on the Expenses tab'));
    ls = lines();
    expect([after('MONTHLY RECURRING EXPENSES', 1, ls), after('ACTUAL EXPENSES', 1, ls)]).toEqual(['$300', '$730.00']);   // to the cent, R5 (2026-10-27)
    expect(dollars(after('ACTUAL EXPENSES', 1, ls)) + dollars(after('MONTHLY RECURRING EXPENSES', 1, ls))).toBe(dollars(aug[4]));
    // August's plan: groceries 800 + utilities 300 = $1,100
    // the budget as entered, by category (2026-10-25, CF-09 — it read Bills & fixed $300 · Everyday expenses $800): 800 + 300 = $1,100
    expect(block(ls, 'PLANNED EXPENSES', 'ACTUAL EXPENSES')).toEqual(['PLANNED EXPENSES', '$1,100', 'Groceries', '$800', 'Utilities', '$300', '= Total', '$1,100']);

    // A STATEMENT IMPORTED ON OCT 3 brings a $150 purchase dated Sep 25. September's card stays its record — $1,510 out, $4,490 left —
    // and September's Expenses tab lists the purchase and says on its row and under its total that September's figures leave it out:
    // listed 520 + 290 + 400 + 150 = $1,360; the record's 1,210 + the car loan 300 = the card's $1,510; 1,360 − 150 = 1,210 (FIXED
    // 2026-10-24, the lead's ruling: the tab and the card disagreed by $150 with nothing said)
    fireEvent.press(screen.getByLabelText('Back to the current month'));
    act(() => { useStore.setState({ expenses: [...(useStore.getState() as any).expenses, { id: 'late-1', amount: 150, category: 'Groceries', store: 'Market',
      date: '2026-09-25', notes: '', createdAt: '2026-10-03T12:00:00.000Z', origin: 'imported' }] } as any); });
    fireEvent.press(screen.getByLabelText('Previous month'));
    tab('This month');
    expect(block(lines(), 'SEPTEMBER 2026 — WHAT ACTUALLY HAPPENED', 'That month’s activity ›').slice(1)).toEqual(['Actual inflow', '$6,000', 'Outflow (expenses + debt)', '$1,510', '= Surplus', '+$4,490']);
    tab('Expenses');
    ls = lines();
    expect(ls.slice(ls.indexOf('25 Sep · Market'), ls.indexOf('25 Sep · Market') + 3)).toEqual(['25 Sep · Market', 'Groceries · added after September closed — not in September’s figures', '$150.00']);
    expect([after('ACTUAL EXPENSES', 1, ls), after('= Actual expenses, all sources', 2, ls)]).toEqual(['$1,360.00', '$150 of it was added after September closed — not in September’s figures.']);   // R5
    expect(dollars(after('ACTUAL EXPENSES', 1, ls)) - 150 + 300).toBe(1_510);
    expect(heard()).toContain('25 Sep · Market, Groceries · added after September closed — not in September’s figures, $150.00');
    // an expense on the record is not named: the Sep 6 groceries were entered before September's record was saved
    expect(ls.filter((l) => /added after September closed/.test(l))).toHaveLength(2);

    // and back to today: October's This month again
    fireEvent.press(screen.getByLabelText('Back to the current month'));
    tab('This month');
    expect(lines()).toContain('PLANNED · OCTOBER');
  });

  test('E2E-76 · the producer both read, run on its own: pastMonthFlow on each record gives the card\'s three figures', () => {
    const { pastMonthFlow } = require('../../../MoneyKeel/functions/cashflow/this-month');
    const sep = { income_net: 6_000, spending: 1_210, debt_paid: 300 }, aug = { income_net: 6_000, spending: 730, debt_paid: 300 };
    expect(pastMonthFlow(sep, [], [...AUGUST, ...SEPTEMBER], '2026-09')).toEqual({ inflow: 6_000, outflow: 1_510, surplus: 4_490 });
    expect(pastMonthFlow(aug, [], [...AUGUST, ...SEPTEMBER], '2026-08')).toEqual({ inflow: 6_000, outflow: 1_030, surplus: 4_970 });
  });
});


// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-77 · A BRAND-NEW PERSON — one checking account added, nothing else. The empty Cash flow tab and Home's box (Left —, no
// "Over"); the door to enter pay; Your base pay; Save; This month and Home's box fill with the take-home Your base pay printed.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const OCT = '2026-10-24';
const BRAND_NEW = { onboardingProfile: { status: 'employed', incomeSources: ['employment'], birthYear: '1981' },
  assetAccounts: [{ asset_id: 'chk', label: 'Checking', kind: 'checking', tax_bucket: 'TAXABLE', balance: 3_000, asset_class: 'cash' }] };
const homeBox = (ls = lines()) => { const i = ls.indexOf("THIS MONTH’S CASH FLOW"); expect(i).toBeGreaterThanOrEqual(0); return ls.slice(i, ls.indexOf('Estimates for guidance only — not financial, investment, or tax advice, and projections aren\'t guaranteed. See Settings for the full disclaimer.', i)); };
const V10 = 'MoneyKeel/documents/home-screen/moneykeel_pres_mock_ways-to-add-an-account_v10.html';

describe('E2E-77 · a brand-new person enters their pay', () => {
  test('E2E-77 · empty tab and box → "Add your income ›" → the manager → Your base pay → Save → This month and Home read Your base pay\'s ≈$5,022', () => {
    onDay(OCT);
    start(BRAND_NEW);

    // THE EMPTY CASH FLOW TAB: its two set-up steps, and no figure — "No zeros shown until they're real"
    open('/(tabs)/cashflow');
    let ls = tabLines();
    expect(ls.slice(ls.indexOf('SET UP YOUR MONTH — 2 STEPS'))).toEqual(['SET UP YOUR MONTH — 2 STEPS', '1 · Your base pay',
      'one section per earner — bonus and other income come after', 'Set up ›', '2 · About what goes out monthly?', 'rent, food, bills — roughly', '$',
      '✓ Answers save to your plan — Home, Plan and this screen use the same numbers. No zeros shown until they’re real.', '＋ Expense']);   // ’ (CF2-10)
    expect(ls.filter((l) => /\$\d/.test(l))).toEqual([]);
    // its first step is a door straight to Your base pay
    fireEvent.press(screen.getByLabelText('Step 1: set up your income — your base pay, one section per earner'));
    expect(mockPushes[mockPushes.length - 1]).toBe('/base-pay');
    screen.unmount();

    // HOME'S BOX, as its drawing's dated row words it: "Income $0 · Nothing entered yet. Add your income › · Outflow (expenses +
    // debt) $0 · Left —" — no pace word, no share spent, never "Over"
    open('/(tabs)/home');
    const drawn = drawingLines(V10).join(' ').match(/Left reads — : (Income \$0 · Nothing entered yet\. Add your income › · Outflow \(expenses \+ debt\) \$0 · Left —)\./);
    expect(drawn).not.toBeNull();
    const box = homeBox();
    // (2026-10-25, HM-01: no "day 24 of 31" before income — the pace line goes with the pace word, and the row lists neither)
    expect(box).toEqual(["THIS MONTH’S CASH FLOW", 'Income', '$0', 'Nothing entered yet. Add your income ›', 'Outflow (expenses + debt)', '$0', 'Left', '—']);
    expect([`${box[1]} ${box[2]}`, box[3], `${box[4]} ${box[5]}`, `${box[6]} ${box[7]}`].join(' · ')).toBe(drawn![1]);
    for (const w of ['Over', '✓ On pace', 'Expenses running fast']) expect(box).not.toContain(w);

    // THE DOOR TO ENTER PAY: "Add your income ›" opens the income manager, whose own door opens Your base pay
    fireEvent.press(screen.getByText('Add your income ›'));
    expect(follow()).toBe('/income-manager');
    ls = lines();
    // a fresh account: the one line and its door, and no count of no sources (CF-MMFIX-B, IN-12, 2026-10-25 — it read "You entered
    // about 0 sources")
    expect(ls).toContain('Nothing entered yet. Add your income ›');
    expect(ls).not.toContain('You entered about');
    fireEvent.press(screen.getAllByText('Add your income ›')[0]);
    expect(follow()).toBe('/base-pay');

    // YOUR BASE PAY: $6,000 gross a month, $500 into the 401(k). Taxed on (6,000 − 500) × 12 = 66,000 less the single deduction
    // 16,100 = 49,900: 12,400 × 10% + (49,900 − 12,400) × 12% = 1,240 + 4,500 = $5,740 a year = $478.33 a month (bracket 12%).
    // Take-home 6,000 − 478.33 − 500 = $5,021.67 → ≈$5,022
    fireEvent.changeText(screen.getByLabelText('Gross pay each month'), '6000');
    fireEvent.changeText(screen.getByLabelText('Into your 401(k) each month'), '500');
    ls = lines();
    expect([after('Gross /year', 1, ls), after('what your next dollar costs', 1, ls), after('assumes you take the standard deduction', 1, ls), after('Your 401(k)s', 1, ls), after('= Take-home', 1, ls)])
      .toEqual(['$72,000', '12%', '≈$478/month', '$500/month', '≈$5,022/month']);
    expect(ls).toContain('$6,000 gross − $478 tax − $500 of 401(k)s = $5,022.');
    expect(1_240 + (66_000 - 16_100 - 12_400) * 0.12).toBe(5_740);
    fireEvent.press(screen.getByLabelText('Save your base pay'));
    expect(mockBacks.n).toBeGreaterThan(0);
    screen.unmount();

    // THIS MONTH FILLS: frame B of cash-flow_v01 (a fresh account, no plan set), word for word — without frame B's two debts, which
    // this person has not entered, and with its sentence's opening clause, "Your debts are here, but", which is about them
    open('/(tabs)/cashflow');
    // figure for figure (2026-10-25): October, not the drawing's August; the take-home ≈$5,022, the app's calculation (it wears ≈,
    // CF-24); nothing spent, so the surplus so far is 5,022 − 0 = +$5,022; no budget, so no line under the inflow (frame B, CF-11)
    const want = normExact(asBuilt(cashflowPhone(2), [
      { why: 'the journey’s own day', replaceEvery: ['August 2026', 'October 2026'] },
      { why: 'the journey’s own day', replace: ['Planned · August', 'Planned · October'] },
      { why: 'this person has no debts', remove: ['Mortgage', 'debt', '−$2,000', 'Car loan', 'debt', '−$250'] },
      { why: 'this person has no debts', remove: ['Mortgage', 'paid', '−$2,000', 'Car loan', 'due 28th', '$0'] },
      { why: 'its opening clause is about the debts', replace: ['Your debts are here, but you haven’t set your budget. Until you do there is no planned surplus — we won’t guess one.', 'You haven’t set your budget. Until you do there is no planned surplus — we won’t guess one.'] },
      { why: 'Your base pay’s take-home, calculated', replaceEvery: ['$5,000', '≈$5,022'] },
      { why: '5,022 − 0', replaceEvery: ['+$3,000', '+$5,022'] },
      { why: 'DEC-1560: kept', append: ['＋ Expense'] },
    ]));
    // YOUR FUTURE PAYCHECK follows the two cards wherever there is a pot to project from (his ruling of 2026-09-08 on its arithmetic;
    // not drawn; its figures are held by cashflow_fcc) — taken out here by its own words and nothing else
    const got = normExact(tabLines()).replace(/ your future paycheck projection — an estimate, not a promise at \d+: ~\$[\d,]+\/month in today's dollars assumes an? [\d.]+%\/year return and [\d.]+%\/year inflation draw from savings ~\$[\d,]+/, '');   // "/year", canon row 14 (CF2-09)
    expect(want.split(' ').length).toBeGreaterThan(30);
    expect(firstDifference(want, got)).toBe('');
    ls = lines();
    // the inflow is Your base pay's take-home, $5,022 (FIXED 2026-10-24 by CJA, E2E-71 — found here too: it read $5,522, the 401(k)
    // left in); nothing spent, so Inflow − Outflow = 5,022 − 0 = +$5,022
    // (2026-10-25: ≈ on the calculated take-home, CF-24; no line under the inflow with no budget, CF-11)
    expect([after('Inflow (income (take-home))', 1, ls), after('Actual inflow (income (take-home))', 1, ls), after('= Actual surplus so far', 1, ls)])
      .toEqual(['≈$5,022', '≈$5,022', '+$5,022']);
    // the Income tab: its hero and its own source row read the same take-home, in one form
    tab('Income');
    ls = lines();
    expect([after('THIS MONTH', 1, ls), after('Salary — steady', 1, ls), after('Salary — steady', 2, ls)])
      .toEqual(['≈$5,022', 'before tax · monthly · ≈$5,022/month take-home', '$6,000 ›']);
    screen.unmount();

    // HOME'S BOX FILLS with the same figures: in $5,022, out $0, left 5,022 − 0 = $5,022; 0% spent — on pace
    open('/(tabs)/home');
    expect(homeBox()).toEqual(["THIS MONTH’S CASH FLOW", '✓ On pace', '0% spent · day 24 of 31', 'Income', '≈$5,022', 'Outflow (expenses + debt)', '$0', 'Left', '$5,022']);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-78 · HIDE BALANCES AND A SCREEN READER — the person taps the eye on the Cash flow tab. Every dollar on the four tabs, the
// past month and Home's box is dots; every percent stays; a screen reader says "hidden", never the dots, and hears no mark. It
// reaches every tab and every door, with balances hidden and shown.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('E2E-78 · hide balances on the Cash flow tabs and Home\'s box, heard by a screen reader', () => {
  const dollarsPrinted = () => lines().filter((l) => /\$\s?\d/.test(l));
  const dotsHeard = () => heard().filter((l) => l.includes('•'));
  const buttons = () => screen.getAllByRole('button').map((b) => String(b.props.accessibilityLabel ?? ''));
  /** the same checks on every tab: nothing printed in dollars, nothing heard as dots or a mark */
  const quiet = () => { expect(dollarsPrinted()).toEqual([]); expect(dotsHeard()).toEqual([]); expect(markHeard()).toEqual([]); };

  test('E2E-78 · the eye hides every dollar on This month, Income, Expenses, Debts, the month before and Home; each row is heard as "hidden"', () => {
    onDay(AUG);
    start(FOUNDER());
    open('/(tabs)/cashflow');
    expect(lines()).toContain('+$350');
    fireEvent.press(screen.getByLabelText('Hide balances'));
    expect((useStore.getState() as any).hideBalances).toBe(true);
    expect(screen.getByLabelText('Show balances')).toBeOnTheScreen();
    expect(lines()).toContain('Balances hidden — tap the eye to show');

    // THIS MONTH — every row one element, said in words (FIXED 2026-10-24: each figure was a bare "••••", heard as dots)
    quiet();
    let h = heard();
    for (const said of ['Inflow (income (take-home)), after tax and 401(k), hidden', 'Mortgage, debt, −hidden', 'Car loan, debt, −hidden',
      'Expenses, your budget, −hidden. Opens your budget.', 'HELOC, from big-ticket radar, −hidden', 'Planned surplus, +hidden',
      'Actual inflow (income (take-home)), hidden', 'Mortgage, paid, −hidden', 'Car loan, due 28th, hidden', 'Expenses entered by hand, −hidden',
      'Expenses imported from your card, imported, −hidden', 'Actual surplus so far, +hidden']) expect(h).toContain(said);
    expect(lines().filter((l) => l.includes('••••')).length).toBeGreaterThanOrEqual(14);   // the guard looked: 2 bands + 6 planned + 7 actual rows, the totals

    // INCOME
    tab('Income');
    quiet();
    h = heard();
    for (const said of ['Salary — steady, take-home · monthly, hidden. Opens it to change.', 'Aug 15 · Paycheck, +hidden', 'Aug 1 · Paycheck, +hidden'])
      expect(h).toContain(said);

    // EXPENSES — the planned card says its rows (FIXED 2026-10-24: it said only "Planned expenses, by category" — no amount was
    // ever heard, hidden or not)
    tab('Expenses');
    quiet();
    h = heard();
    // the planned rows are the budget's categories, as frame C draws them (2026-10-25, CF-09)
    for (const said of ['Mortgage, same every month, hidden', 'Planned expenses: Gas, hidden; Grocery, hidden; Utilities, hidden; Other, hidden; total, hidden. Opens your budget.',
      '18 Aug · Amazon, Other · typed, hidden', 'Show all 9 — hidden more', 'Entered by hand · 9 items, hidden', 'Imported · 23 purchases, hidden',
      'HELOC payment, entered on the Debts tab, hidden', 'Actual expenses, all sources, hidden',
      'Credit card debt payment, debt, entered on the Debts tab · counted as an expense — no receipts to match it to, hidden']) expect(h).toContain(said);

    // DEBTS — each debt one element, its rate kept (FIXED 2026-10-24: each was heard as its printed run — icon, "/month", "~", "›")
    tab('Debts');
    quiet();
    const ls = lines();
    expect(ls).toContain('across 4 debts · ••••/month in payments');   // CF2-03
    expect(ls).toContain('•••• paid down since January — 2% of where you started');            // the percent stays
    h = heard();
    for (const said of ['You owe hidden', 'across 4 debts · hidden a month in payments', 'hidden a month total',
      // a card's minimum floats with its balance, so it has no time left (2026-10-25, CF-06 — the drawn Visa reads "22.90% — the costliest")
      'Credit card debt payment, pay first, 22.90% — the costliest, hidden a month minimum, about hidden a month interest, hidden owed. Opens it to edit; hold to delete.',
      'Car loan, 6.40%, 4 years left, hidden a month minimum, about hidden a month interest, payment due in 8 days, hidden owed. Opens it to edit; hold to delete.',
      'hidden paid down since January — 2% of where you started']) expect(h).toContain(said);   // no edit hint (CF2-04): each row says it

    // THE MONTH BEFORE — July, nothing on record
    tab('This month');
    fireEvent.press(screen.getByLabelText('Previous month'));
    quiet();
    h = heard();
    // the surplus carries its sign, heard as This month's is, "+hidden" (CF2-07, 2026-10-27)
    for (const said of ['Actual inflow, hidden', 'Outflow (expenses + debt), hidden', 'Surplus, +hidden']) expect(h).toContain(said);
    screen.unmount();

    // HOME'S BOX — its three figures dots, its percent kept (4,100 ÷ 5,000 = 82%), heard as "hidden"
    open('/(tabs)/home');
    expect(homeBox()).toEqual(["THIS MONTH’S CASH FLOW", 'Expenses running fast', '82% spent · day 20 of 31', 'Income', '••••', 'Outflow (expenses + debt)', '••••', 'Left', '••••']);
    quiet();
    expect(heard()).toContain("This month’s cash flow, Expenses running fast: income hidden, expenses and debt paid so far hidden, hidden left, bills may still be coming. Opens the Cash flow tab.");
  });

  test('E2E-78 · a screen-reader user reaches every tab and every door, and hears no mark, with balances shown', () => {
    onDay(AUG);
    start(FOUNDER());
    open('/(tabs)/cashflow');
    const tabs = ['This month tab, selected', 'Income tab', 'Expenses tab', 'Debts tab'];
    expect(markHeard()).toEqual([]);
    let b = buttons();
    for (const door of [...tabs, 'Previous month', 'Next month', 'Add expense', 'Menu', 'Hide balances', 'Expenses, your budget, −$2,000. Opens your budget.']) expect(b).toContain(door);
    expect(heard()).toContain('Planned surplus, +$350');                       // a total is not heard as "equals"
    tab('Income');
    expect(markHeard()).toEqual([]);
    b = buttons();
    for (const door of ['Income tab, selected', 'Salary — steady, take-home · monthly, $5,000. Opens it to change.', 'Add your income', 'Your income, all of it — the take-home and what it is taxed on']) expect(b).toContain(door);
    tab('Expenses');
    expect(markHeard()).toEqual([]);
    b = buttons();
    for (const door of ['Expenses tab, selected', 'Planned expenses: Gas, $200; Grocery, $900; Utilities, $200; Other, $700; total, $2,000. Opens your budget.',
      'Show all 9 — $195.00 more', 'Show all 23 — $560.00 more', 'Import a statement — a CSV from your bank']) expect(b).toContain(door);   // R5
    tab('Debts');
    expect(markHeard()).toEqual([]);
    b = buttons();
    for (const door of ['Debts tab, selected', 'Log a payment', 'Add debt account',
      // a mortgage on no property says so, as Net worth does (2026-10-25, CF-23; his rule DEC-1925) — this household holds no property
      'Mortgage, 5.00%, 15 years left, $2,000 a month minimum, about $1,250 a month interest, $300,000 owed. Your mortgage “Mortgage” is not on a property. A mortgage is always on a property — open it and say which one. Opens it to edit; hold to delete.']) expect(b).toContain(door);
    expect(heard()).toContain('across 4 debts · $2,650 a month in payments');   // CF2-03
    expect(screen.getByLabelText('Extra payment a month, in dollars')).toBeOnTheScreen();   // the field is named (it had no label)
    // each door reached is a door that works: the row opens its debt's editor, the past month's opens that month's Expenses tab
    tab('This month');
    fireEvent.press(screen.getByLabelText('Previous month'));
    b = buttons();
    for (const door of ['See that month’s activity on the Expenses tab', 'Back to the current month']) expect(b).toContain(door);
    expect(markHeard()).toEqual([]);
    screen.unmount();
    open('/(tabs)/home');
    expect(markHeard()).toEqual([]);
  });

  test('E2E-78 · every info dot is said in words that name what it explains — never "ⓘ" — and none sits inside a sentence anywhere in src', () => {
    // FIXED 2026-10-24 (the lead's ruling): the mortgage comparison on the Debts tab put its dot inside its sentence, so a screen
    // reader read "…your own return.ⓘ" and the dot as "ⓘ"; and every dot said "What is <title>?" ("What is How we calculate your
    // odds?"). Each dot now sits beside its sentence and says "About <title>".
    onDay(AUG);
    const BRK = { asset_id: 'b', label: 'BROKERAGE', institution: 'Vanguard', kind: 'brokerage', tax_bucket: 'TAXABLE', balance: 30_000, cash_balance: 2_000,
      source: 'connected', last_synced: `${AUG}T08:00:00Z`, positions: [{ position_id: 'p', ticker: 'VTI', asset_class: 'stock_etf', last_price: 280, lots: [{ lot_id: 'l', shares: 100, cost_per_share: 200, purchase_date: '2024-01-02' }] }] };
    start({ ...FOUNDER(), assetAccounts: [BRK] });
    open('/(tabs)/cashflow');
    tab('Debts');
    expect(dotsSaid()).toEqual(['About How we calculate your odds']);
    // 2026-10-25 (FIX-ROOM; the lead's ruling on MK-CF-F-043): the second half of this sentence says how tax was counted —
    // after federal tax at the founder's bracket (the Income summary's), before tax when no income is entered
    expect(heard().filter((l) => l.startsWith('Shares might earn more than either'))).toEqual(['Shares might earn more than either — or less. Paying the mortgage is the only one that is certain. The Treasury is shown after federal tax (it pays no state tax), the mortgage without any interest deduction.']);
    expect(markHeard()).toEqual([]);
    screen.unmount();
    const TopBar = require('../../components/TopBar').default;
    const heardOn = (name: string) => { const C = require(`../${name}`).default; render(<Root><TopBar /><C /></Root>); const r = { dots: dotsSaid(), marks: heard().filter((l) => l.includes('ⓘ')) }; screen.unmount(); return r; };
    // the Performance tab and the Net worth tab: their dots in words too, and no ⓘ heard
    const perf = heardOn('PerformanceScreen'), nw = heardOn('NetWorthScreen');
    expect(perf).toEqual({ dots: ['About Summary', 'About Day one', 'About Earned'], marks: [] });
    expect(nw).toEqual({ dots: ['About Debt'], marks: [] });

    // THE GUARD, over every file in src: no <InfoDot> inside an open <Text> or <SaidText> — it must prove it looked
    const fs = require('fs'), path = require('path');
    const files: string[] = [];
    const walk = (d: string) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== '__tests__' && e.name !== 'node_modules') walk(p); } else if (/\.tsx$/.test(e.name)) files.push(p); } };
    walk(path.join(__dirname, '..', '..'));
    let seen = 0; const nested: string[] = [];
    for (const f of files) {
      const t = fs.readFileSync(f, 'utf8').replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const m of t.matchAll(/<InfoDot\b/g)) {
        if (/export function InfoDot/.test(t.slice(Math.max(0, m.index! - 200), m.index!))) continue;
        seen += 1;
        const before = t.slice(0, m.index!);
        const opens = (before.match(/<(Text|SaidText)\b(?![^<>]*\/>)/g) ?? []).length, closes = (before.match(/<\/(Text|SaidText)>/g) ?? []).length;
        if (opens > closes) nested.push(`${path.relative(path.join(__dirname, '..', '..'), f)}:${before.split('\n').length}`);
      }
    }
    // the guard looked: 36 dots in src on 2026-10-24; 34 on 2026-10-25, when Bonds and Alternatives put theirs inside their bars (the
    // Net worth drawing match — a bar never sits beside its title); 33 on 2026-10-27, when the Retirement cockpit's Tax-smart moves put
    // its dot inside its light-green bar (FX-PLAN, R1) — the dot is still drawn, by the bar; 32 on 2026-10-30, when the account page's
    // IF INTEREST RATES MOVE did the same (FX-NW, R1)
    expect(seen).toBeGreaterThanOrEqual(32);
    expect(nested).toEqual([]);
  });

  test('E2E-78 · the door inside Home\'s empty box is reached as the box\'s action, and opens where the printed door does', () => {
    onDay(OCT);
    start(BRAND_NEW);
    open('/(tabs)/home');
    const box = reachable().find((r) => r.said.startsWith("This month’s cash flow"))!;
    expect(box.said).toBe("This month’s cash flow: income not entered, expenses and debt paid so far $0, nothing left is shown until your income is entered. Opens the Cash flow tab.");
    // FIXED 2026-10-24: "Add your income ›" sat inside the box, so a screen reader could not reach it
    const action = box.node.props.accessibilityActions?.find((a: any) => a.label === 'Add your income');
    expect(action).toBeDefined();
    fireEvent(screen.getByLabelText(box.said), 'accessibilityAction', { nativeEvent: { actionName: action.name } });
    expect(mockPushes[mockPushes.length - 1]).toBe('/income-manager');      // the printed door's own route
    expect(markHeard()).toEqual([]);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-79 · FILING STATUS — single → married filing jointly, with a 401(k): Cash flow → Menu → Tax organizer → How you file →
// jointly → Save → "That changes your take-home" → Got it. Take-home, bracket and the Income summary move together, and the
// comparison's figures are the ones the take-home moves by.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('E2E-79 · filing status, and the comparison it shows', () => {
  // $8,000 gross a month, $1,000 into the 401(k): $96,000 a year, taxed on 96,000 − 12,000 = $84,000 (DEC-0283) — the drawing's own $84,000
  const PAY = { status: 'employed', incomeSources: ['employment'], birthYear: '1981', baseSalary: '8000', salaryFreq: 'monthly', c_401k: '1000' };
  const V07 = drawingLines('MoneyKeel/documents/cashflow/moneykeel_pres_mock_income-end-to-end_v07.html', [/<svg[\s\S]*?<\/svg>/g]);
  const v07phone = (first: string, last: string) => { const i = V07.indexOf(first, V07.indexOf('4a · they said “just me”')); const j = V07.indexOf(last, i); expect(j).toBeGreaterThan(i + 3); return V07.slice(i, j + 1); };
  /** the base-pay card and the Income summary, read for the four figures that move */
  const basePay = () => { const ls = lines(); return [after('what your next dollar costs', 1, ls), after('assumes you take the standard deduction', 1, ls), after('= Take-home', 1, ls)]; };
  const summary = () => { const ls = lines(); const b = ls.indexOf('Federal tax bracket');
    return [after('Take-home each month', 1, ls), ls[b + 1], ls[b + 2], after('assumes you take the standard deduction', 1, ls)]; };
  const look = (route: string, read: () => any) => { open(route); const v = read(); screen.unmount(); return v; };

  test('E2E-79 · single → jointly: $9,650 → $5,720 a year, 22% → 12%, take-home $6,196 → $6,523 on every screen, and 4c says their printed difference, $327/month more', () => {
    onDay(OCT);
    start({ onboardingProfile: { ...PAY, hasPartner: 'no' } });
    // BEFORE, single: 84,000 − 16,100 = 67,900 taxed: 1,240 + 38,000 × 12% (4,560) + 17,500 × 22% (3,850) = $9,650 a year, $804.17 a
    // month, bracket 22%; take-home 8,000 − 804.17 − 1,000 = $6,195.83 → $6,196
    expect(1_240 + 4_560 + (67_900 - 50_400) * 0.22).toBe(9_650);
    expect(look('/base-pay', basePay)).toEqual(['22%', '≈$804/month', '≈$6,196/month']);
    expect(look('/income-summary', summary)).toEqual(['≈$6,196', 'single, every source counted', '22%', '≈$9,650/year']);   // ≈ on a calculated take-home (CF-MMFIX-B, IN-03)

    // Cash flow → Menu → Tax organizer
    open('/(tabs)/cashflow');
    expect(after('Inflow (income (take-home))', 1)).toBe('≈$6,196');   // calculated: ≈ (CF-24); no budget, no line under it (CF-11)
    fireEvent.press(screen.getByLabelText('Menu'));
    fireEvent.press(screen.getByLabelText('Tax organizer'));
    expect(follow()).toBe('/tax-organizer');
    expect(lines()).toContain('Assumed — we have never asked');
    fireEvent.press(screen.getByLabelText('How you file your taxes — change it'));
    expect(follow()).toBe('/filing-status');
    // 4a, word for word — the screen frame's Save where onboarding has Continue, under the screen's ‹ Back
    const q = v07phone('How do you file your taxes?', 'Continue').map((l) => (l === 'Continue' ? 'Save' : l));
    expect(firstDifference(norm(q), norm(lines().filter((l) => l !== '‹ Back')))).toBe('');

    // jointly, neither over 65, Save
    fireEvent.press(screen.getByLabelText('Married filing jointly'));
    fireEvent.press(screen.getByLabelText('Neither'));
    fireEvent.press(screen.getByLabelText('Save'));
    // 4c. Jointly: 84,000 − 32,200 = 51,800: 24,800 × 10% + 27,000 × 12% = 2,480 + 3,240 = $5,720. Both over 65: 32,200 + 2 × 1,650 + 2 ×
    // 6,000 (the senior deduction, G3) = 47,500 off → 36,500: 2,480 + 11,700 × 12% = $3,884. The month's difference is the two take-homes
    // as printed (the lead's ruling, 2026-10-24, DEC-3523 tenet 2): 8,000 − 5,720 ÷ 12 − 1,000 = 6,523.33 → $6,523, less $6,196 = $327;
    // both over 65, 8,000 − 3,884 ÷ 12 − 1,000 = 6,676.33 → $6,676, less $6,196 = $480. (FIXED 2026-10-24: it read $328 and $481, the
    // cent-exact 327.50 and 480.50 rounded — a dollar off the figures beside it.)
    const shown = (tax: number) => Math.round(8_000 - tax / 12 - 1_000);
    expect([2_480 + 27_000 * 0.12, 2_480 + (36_500 - 24_800) * 0.12, shown(5_720) - shown(9_650), shown(3_884) - shown(9_650)]).toEqual([5_720, 3_884, 327, 480]);
    // the MoneyKeel bar's way back and its icons are the bar's, not the screen's (DEC-0354; FX-CF-B 2026-10-27, IN2-13); the box's
    // figure is bold inside its sentence, as phone 15 draws it (IN2-11), so the two are one line
    const c = lines().filter((l) => l !== '‹ Back' && !/^[\uE000-\uF8FF]+$/.test(l));
    expect(c).toEqual(['That changes your take-home', 'On the $96,000 you entered, less your 401(k)', 'Taxed as single', '$9,650/year — what we were assuming',
      'Married filing jointly', '$5,720/year', '…and both of you over 65', '$3,884/year',
      '$327/month more take-home than we were showing you — $480 if you are both over 65.', 'Your tax bracket is calculated from your income only.',
      'Add your spouse’s income if you want it to be accurate.', 'Got it']);
    // the drawn 4c, word for word, with the dated line under its title (filing-status-question_v03, READ THIS FIRST 2026-10-24)
    const drawn4c = norm(v07phone('That changes your take-home', 'Got it')).replace('on the $# you entered', 'on the $# you entered, less your #(k)');
    expect(firstDifference(drawn4c, norm(c))).toBe('');
    fireEvent.press(screen.getByLabelText('Got it'));
    expect((useStore.getState() as any).onboardingProfile).toMatchObject({ filingStatus: 'married', over65Who: 'neither' });
    screen.unmount();

    // AFTER, on every screen: tax $476.67 a month, bracket 12%, take-home 8,000 − 476.67 − 1,000 = $6,523.33 → $6,523. The take-home
    // as printed moved $6,196 → $6,523 = $327, the comparison's figure
    expect(look('/tax-organizer', () => lines())).not.toContain('Assumed — we have never asked');
    expect(look('/base-pay', basePay)).toEqual(['12%', '≈$477/month', '≈$6,523/month']);
    expect(look('/income-summary', summary)).toEqual(['≈$6,523', 'filing jointly, every source counted', '12%', '≈$5,720/year']);
    expect(shown(5_720) - shown(9_650)).toBe(327);
    open('/(tabs)/cashflow');
    expect([after('Inflow (income (take-home))', 1), after('Actual inflow (income (take-home))', 1)]).toEqual(['≈$6,523', '≈$6,523']);
    tab('Income');
    expect(after('THIS MONTH', 1)).toBe('≈$6,523');
    screen.unmount();
    open('/(tabs)/home');
    expect(homeBox().slice(3, 5)).toEqual(['Income', '≈$6,523']);
  });

  test('E2E-79 · a fall is said too: jointly → separately, "$327/month less", and the take-home moves $6,523 → $6,196 on every screen', () => {
    // the lead's ruling, 2026-10-24: the comparison shows whenever the status moves the take-home, down as well as up (tenet 1). On
    // record, jointly (neither over 65): $5,720 a year, take-home $6,523. Separately: 84,000 − 16,100 = 67,900 taxed, the same bands as
    // single below $384,350: $9,650, take-home 8,000 − 804.17 − 1,000 = 6,195.83 → $6,196. $6,196 − $6,523 = −$327. No "both of you
    // over 65" row or clause: that row goes with a joint return.
    onDay(OCT);
    start({ onboardingProfile: { ...PAY, hasPartner: 'yes', partnerName: 'Sam', filingStatus: 'married', over65Who: 'neither' } });
    expect(look('/base-pay', basePay)).toEqual(['12%', '≈$477/month', '≈$6,523/month']);
    open('/filing-status');
    fireEvent.press(screen.getByLabelText('Married filing separately'));
    fireEvent.press(screen.getByLabelText('Save'));
    expect(lines().filter((l) => l !== '‹ Back' && !/^[\uE000-\uF8FF]+$/.test(l))).toEqual(['That changes your take-home', 'On the $96,000 you entered, less your 401(k)',
      'Taxed as married filing jointly', '$5,720/year — what we were assuming', 'Married filing separately', '$9,650/year',
      '$327/month less take-home than we were showing you.', 'Your tax bracket is calculated from your income only.', 'Add your spouse’s income if you want it to be accurate.', 'Got it']);
    fireEvent.press(screen.getByLabelText('Got it'));
    screen.unmount();
    expect(look('/base-pay', basePay)).toEqual(['22%', '≈$804/month', '≈$6,196/month']);
    open('/(tabs)/cashflow');
    expect(after('Inflow (income (take-home))', 1)).toBe('≈$6,196');   // calculated: ≈ (CF-24); no budget, no line under it (CF-11)
  });

  test('E2E-79 · the drawn couple (Sam, 67) is already taxed jointly: confirming it moves nothing, so no "$328/month more" is promised', () => {
    // FIXED 2026-10-24: 4c compared single, no one over 65, with the status chosen, no one over 65. For this couple the app was
    // already showing jointly with one over 65: 84,000 − 32,200 − 1,650 − 6,000 = 44,150 taxed: 2,480 + 19,350 × 12% = $4,802 a year,
    // $400.17 a month; take-home 8,000 − 400.17 − 1,000 = $6,599.83 → ≈$6,600. 4c read "Taxed as single $9,650/year — what we were
    // assuming … $328/month more", and the take-home did not move.
    onDay(OCT);
    start({ onboardingProfile: { ...PAY, birthYear: String(2026 - 67), hasPartner: 'yes', partnerName: 'Sam' } });
    expect(2_480 + (44_150 - 24_800) * 0.12).toBe(4_802);
    expect(look('/base-pay', basePay)).toEqual(['12%', '≈$400/month', '≈$6,600/month']);
    open('/filing-status');
    expect(lines()).toContain('Set to Married filing jointly because you entered Sam.');
    const backs = mockBacks.n;
    fireEvent.press(screen.getByLabelText('Just me'));
    fireEvent.press(screen.getByLabelText('Save'));
    expect(lines()).not.toContain('That changes your take-home');
    expect(mockBacks.n).toBe(backs + 1);                                       // straight back, the answer saved
    expect((useStore.getState() as any).onboardingProfile).toMatchObject({ filingStatus: 'married', over65Who: 'me' });
    screen.unmount();
    expect(look('/base-pay', basePay)).toEqual(['12%', '≈$400/month', '≈$6,600/month']);
    open('/(tabs)/cashflow');
    expect(after('Inflow (income (take-home))', 1)).toBe('≈$6,600');
  });

  test('E2E-79 · a 67-year-old filing single who now files jointly: 4c counts the over-65 deduction both sides, as the take-home does', () => {
    // FIXED 2026-10-24. Single at 67: the deduction 16,100 + 2,050 (65 or older) + the senior deduction, $6,000 less 6% of what the
    // $84,000 is above $75,000 (540) = 5,460 → 23,610 off → 60,390 taxed: 1,240 + 4,560 + 9,990 × 22% = $7,997.80 a year, $666.48 a
    // month; take-home 8,000 − 666.48 − 1,000 = $6,333.52. Jointly, "Just me" (no phase-out below $150,000): $4,802, take-home $6,599.83.
    // The take-home moves by (7,997.80 − 4,802) ÷ 12 = 266.32 → $266/month more. 4c read $9,650 and $5,720 (no one over 65), $328 more.
    onDay(OCT);
    start({ onboardingProfile: { ...PAY, birthYear: String(2026 - 67), hasPartner: 'no' } });
    expect(1_240 + 4_560 + (84_000 - 16_100 - 2_050 - (6_000 - 0.06 * (84_000 - 75_000)) - 50_400) * 0.22).toBeCloseTo(7_997.8, 6);
    expect((7_997.8 - 4_802) / 12).toBeCloseTo(266.32, 2);
    expect(look('/base-pay', basePay)).toEqual(['22%', '≈$666/month', '≈$6,334/month']);
    open('/filing-status');
    fireEvent.press(screen.getByLabelText('Married filing jointly'));
    fireEvent.press(screen.getByLabelText('Just me'));
    fireEvent.press(screen.getByLabelText('Save'));
    const c = lines();
    expect([after('Taxed as single', 1, c), after('Married filing jointly', 1, c)]).toEqual(['$7,998/year — what we were assuming', '$4,802/year']);
    // both over 65 (2026-10-27, worked by hand): 84,000 − 32,200 − 2 × 1,650 − 2 × 6,000 = 36,500 taxed → $3,884; take-home 8,000 −
    // 323.67 − 1,000 = 6,676.33 → $6,676, less the $6,334 shown = $342
    expect(c).toContain('$266/month more take-home than we were showing you — $342 if you are both over 65.');
    fireEvent.press(screen.getByLabelText('Got it'));
    screen.unmount();
    expect(look('/base-pay', basePay)).toEqual(['12%', '≈$400/month', '≈$6,600/month']);
    expect((8_000 - 4_802 / 12 - 1_000) - (8_000 - 7_997.8 / 12 - 1_000)).toBeCloseTo(266.32, 2);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// E2E-80 · THE BILL CALENDAR — from the Expenses tab (＋ Expense → "Add something else" → "A dated bill"), the person opens the
// car insurance on its day, Dec 15, raises it from $1,200 to $1,500, and goes back. December moves by $300 on the Expenses tab,
// on This month and on the calendar; every other month stays where it was.
// ════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
describe('E2E-80 · the bill calendar: one bill changed, its month moves and no other', () => {
  // $6,000 take-home; $900 a month typed, $800 of it groceries, and car insurance $1,200 due Dec 15. The typed $900 is what goes
  // out every month (groceries + $100 more); the bill is on top, in December (2026-10-24, CF-FIX; DEC-0002, DEC-0447). Until then
  // the $900 was taken to hold $100 a month of the bill: October $800, December $2,000.
  const HOUSE = { onboardingProfile: { ...WORKER, baseSalary: '6000', monthlySpending: '900',
    spendCats: [{ id: 'groc', label: 'Groceries', amount: 800, bucket: 'flexible', tier: 'need' },
      { id: 'ins', label: 'Car insurance', amount: 1_200, bucket: 'nonmonthly', months: [12], dueDay: 15, tier: 'critical', custom: true }] } };
  /** what the Cash flow tab shows for one month: This month's planned figures, and the Expenses tab's planned block */
  const monthOnCashFlow = (steps: number) => {
    open('/(tabs)/cashflow');
    for (let k = 0; k < steps; k++) fireEvent.press(screen.getByLabelText('Next month'));
    const tm = lines();
    tab('Expenses');
    const ex = block(lines(), 'PLANNED EXPENSES', 'ACTUAL EXPENSES');
    screen.unmount();
    return { tm, ex };
  };
  const calendarRows = () => { const ls = lines(); return ['Oct', 'Nov', 'Dec', 'Jan ’27'].map((m) => ls.slice(ls.indexOf(m), ls.indexOf(m) + 4)); };

  test('E2E-80 · Expenses → A dated bill → Car insurance on Dec 15 → $1,500 → back: December +$300 on Expenses, This month and the calendar; Oct and Nov unchanged', () => {
    onDay(OCT);
    start(HOUSE);
    // BEFORE: October and November plan the typed $900 (groceries 800 + 100 more, both everyday); December the $900 and the
    // insurance, 900 + 1,200 = $2,100
    const before = [0, 1, 2].map(monthOnCashFlow);
    expect(after('Expenses', 2, before[0].tm, before[0].tm.indexOf('PLANNED · OCTOBER'))).toBe('−$900');
    // the budget as entered, by category, the rest of the typed $900 as Other (2026-10-25, CF-09): 800 + (900 − 800) = $900; in
    // December 800 + 1,200 + 100 = $2,100 (they read Everyday expenses $900, and Once in a while $1,200)
    expect(before[0].ex).toEqual(['PLANNED EXPENSES', '$900', 'Groceries', '$800', 'Other', '$100', '= Total', '$900']);
    expect(before[1].ex).toEqual(['PLANNED EXPENSES', '$900', 'Groceries', '$800', 'Other', '$100', '= Total', '$900']);
    expect(before[2].ex).toEqual(['PLANNED EXPENSES', '$2,100', 'Groceries', '$800', 'Car insurance', '$1,200', 'Other', '$100', '= Total', '$2,100']);
    // December's This month is its plan: in 6,000, out 2,100, surplus 6,000 − 2,100 = $3,900
    expect(block(before[2].tm, 'DECEMBER 2026 — THE PLAN (AN ESTIMATE)', 'Every figure is planned — an estimate, never dressed as fact.')).toEqual([
      'DECEMBER 2026 — THE PLAN (AN ESTIMATE)', 'Planned inflow', '$6,000', 'Planned outflow (expenses + debt) · incl. Car insurance', '$2,100', '= Planned surplus', '+$3,900']);   // CF2-07
    // November plans its $900: 6,000 − 900 = $5,100. FIXED 2026-10-24: it read "· incl. Everyday expenses" — the budget left
    // over named as if it were a dated bill — and "Nothing entered yet. Add your bills ›" with a budget and a bill entered
    expect(block(before[1].tm, 'NOVEMBER 2026 — THE PLAN (AN ESTIMATE)', 'Every figure is planned — an estimate, never dressed as fact.')).toEqual([
      'NOVEMBER 2026 — THE PLAN (AN ESTIMATE)', 'Planned inflow', '$6,000', 'Planned outflow (expenses + debt)', '$900', '= Planned surplus', '+$5,100']);   // its sign (CF2-07)

    // THE DOOR, from the Expenses tab: ＋ Expense → "Add something else" → "A dated bill"
    open('/(tabs)/cashflow');
    tab('Expenses');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    fireEvent.press(screen.getByLabelText('Add expense'));
    fireEvent.press(screen.getByLabelText('Add something else — a dated bill, an account, or one-time money in'));
    const [title, , choices] = alert.mock.calls[0] as any[];
    expect([title, choices.map((c: any) => c.text)]).toEqual(['Add something else', ['A dated bill', 'An account', 'Inflow (one-time income)', 'Cancel']]);
    act(() => { choices.find((c: any) => c.text === 'A dated bill').onPress(); });
    expect(follow()).toBe('/bill-calendar');

    // THE CALENDAR: from $0 on hand, each month +6,000 in; Oct −900 → End 5,100; Nov −900 → 10,200; Dec −2,100 → 14,100; Jan −900 → 19,200
    expect(calendarRows()).toEqual([['Oct', '+$6,000', '−$900', '$5,100'], ['Nov', '+$6,000', '−$900', '$10,200'], ['Dec', '+$6,000', '−$2,100', '$14,100'], ['Jan ’27', '+$6,000', '−$900', '$19,200']]);
    expect(lines()).toContain('Car insurance · $1,200 due Dec 15, 2026');
    // the span says each year once, as the one date writer writes a month (FIXED 2026-10-24: "Oct 2026 – Sep ’27 2027")
    expect(lines()).toContain('Oct 2026 – Sep 2027 · when money lands, when bills are due, and the surplus.');
    expect(heard()).toContain('Jan 2027: in $6,000 a month, out $900 a month, ending balance $19,200.');
    // no month row says it opens anything (FIXED 2026-10-24: each said "Opens the month's detail.", and none had a tap)
    expect(heard().filter((l) => /Opens the month's detail|Tap any row/.test(l))).toEqual([]);
    expect(heard()).toContain('Dec 2026: in $6,000 a month, out $2,100 a month, ending balance $14,100.');

    // the bill, on its day → its editor → $1,500 → Save
    fireEvent.press(screen.getByLabelText(/^Car insurance, \$1,200 due Dec 15, 2026\. .* Opens the editor\.$/));
    expect(lines()).toContain('EDIT THIS BILL');   // the box title on its dark-green bar (DEC-8839, R1 — 2026-10-27)
    expect(screen.getByLabelText('Bill amount').props.value).toBe('$1,200');   // the money form since 2026-10-27 (DEC-8385); the bill is the same $1,200
    fireEvent.changeText(screen.getByLabelText('Bill amount'), '1500');
    fireEvent.press(screen.getByLabelText('Save this bill'));
    // the calendar moves in December only: Dec −2,400 → End 10,200 + 6,000 − 2,400 = 13,800; January's End follows, 13,800 + 5,100
    expect(calendarRows()).toEqual([['Oct', '+$6,000', '−$900', '$5,100'], ['Nov', '+$6,000', '−$900', '$10,200'], ['Dec', '+$6,000', '−$2,400', '$13,800'], ['Jan ’27', '+$6,000', '−$900', '$18,900']]);
    expect(lines()).toContain('Car insurance · $1,500 due Dec 15, 2026');
    back('/(tabs)/cashflow');
    screen.unmount();

    // AFTER, on the Cash flow tab: December 2,100 + 300 = $2,400 out, its surplus 6,000 − 2,400 = $3,600; Car insurance $1,500.
    // October and November read what they read before.
    const after_ = [0, 1, 2].map(monthOnCashFlow);
    expect(after_[0].ex).toEqual(before[0].ex);
    expect(after_[1].ex).toEqual(before[1].ex);
    expect(after('Expenses', 2, after_[0].tm, after_[0].tm.indexOf('PLANNED · OCTOBER'))).toBe('−$900');
    expect(block(after_[1].tm, 'NOVEMBER 2026 — THE PLAN (AN ESTIMATE)', 'Every figure is planned — an estimate, never dressed as fact.')).toEqual(
      block(before[1].tm, 'NOVEMBER 2026 — THE PLAN (AN ESTIMATE)', 'Every figure is planned — an estimate, never dressed as fact.'));
    expect(after_[2].ex).toEqual(['PLANNED EXPENSES', '$2,400', 'Groceries', '$800', 'Car insurance', '$1,500', 'Other', '$100', '= Total', '$2,400']);
    expect([after('Planned outflow (expenses + debt) · incl. Car insurance', 1, after_[2].tm), after('= Planned surplus', 1, after_[2].tm)]).toEqual(['$2,400', '+$3,600']);   // its sign, CF2-07 (2026-10-27)
    expect(dollars(after_[2].ex[1]) - dollars(before[2].ex[1])).toBe(300);
  });
});

