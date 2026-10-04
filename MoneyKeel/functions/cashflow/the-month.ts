// Cash flow · What came in and what went out this month, and the surplus that leaves — planned and
// actual.
//
// THE DOOR for Q-CF-2, ruled by the founder 2026-09-27 ("yes") and settled by him again on
// 2026-09-28 when he corrected how I had described it:
//
//   "this month is actual - and as we decided it is not three number it is spelling out all flow to
//    calculate surplus... Expense tab is listing transaction details. Are you working of latest
//    approved screens or older one?"
//
// I was not. READ FROM THE APPROVED DESIGN — moneykeel_pres_mock_cash-flow_v01 (This month and
// Expenses, carried in from this-month-and-expenses v07, 2026-09-26):
//
//   THIS MONTH spells out EVERY ROW, twice. Planned: the inflow, each debt, the budget, each
//   big-ticket item, = Planned surplus. Actual: the inflow received, each debt paid or still due,
//   expenses entered by hand, expenses imported from the card, the same big-ticket items,
//   = Actual surplus so far. His rule under that drawing: "every row shown is a row deducted —
//   nothing appears without being in the sum."
//
//   EXPENSES IS NOT A SECOND QUESTION. It is the DETAIL BEHIND ONE ROW of that flow: monthly
//   recurring, planned by category, actual by source (by hand · imported · debt payments counted as
//   expenses), and the big-ticket radar that says of each item whether it is counted. Part and whole
//   — which is why conflict C-2 was withdrawn rather than answered.
import { declareFigures } from '../_figure-spec';
import { thisMonth, cash, type ThisMonth, type MonthInput } from './this-month';
import { expenses, type Expenses, type ExpensesInput } from './expenses';

export interface TheMonth {
  /** The flow, spelled out — planned and actual, each ending in its surplus. */
  planned: ThisMonth['planned'];
  actual: ThisMonth['actual'];
  /** The detail behind the Expenses row of that flow. */
  expenses: Expenses;
  /** MK-CF-M-021 — what the Plan has already promised to goals this month, added up. */
  committed: number;
  /** MK-CF-M-020 — the hero figure: the planned surplus, less anything already promised to a goal. */
  free: number;
}

/** How is this month going: the plan, what has actually happened, the detail behind the expenses, and what is free after anything already promised to a goal?
 *  ── ORCHESTRATOR ── the one function a screen asks for this.
 *  The one function a screen calls for this question. Written as a DOC comment on purpose: the
 *  header generator owns the plain block comment below and rewrites it on every build, which is how
 *  all twelve doors lost this marker once and two were typed F instead of O (2026-09-28). */
/* ─ MK-CF-O-010 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theMonth
 *
 * Answers ..... How is this month going: the plan, what has actually happened, the detail behind the expenses, and what is free after anything already promised to a goal?
 *
 * Formula .....
 *     flow = this month(input)
 *     committed = cash((input.commitments ?? []).reduce((t, c) => t + (monthly amount or 0), 0))
 *
 * Called by ... MK-CF-F-203 MONTH
 *
 * Reaches ..... 69 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-005 actualMonthFlow
 *               MK-CF-F-012 annualCashflow · MK-CF-F-210 annualOfSource
 *               … and 51 more — the full list is on functions_from_code
 *
 * Serves ...... MK-CF-M-001 · MK-CF-M-002 · MK-CF-M-003 · MK-CF-M-013
 *               MK-CF-M-014 · MK-CF-M-015 · MK-CF-M-020 · MK-CF-M-021
 *               MK-CF-M-056
 * Reads ....... MK-XS-I-014 debt balance
 *               MK-XS-I-015 debt interest rate
 *               MK-XS-I-016 debt minimum payment
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 * Ruled by .... DEC-0260
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Decides .....
 *     · If monthly amount is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-010
 * Changed ..... not in git yet (—)
 */
export function theMonth(input: MonthInput & ExpensesInput): TheMonth {
  const flow = thisMonth(input);
  // MK-CF-M-021 AND MK-CF-M-020, MOVED OFF THE SCREEN (Cash flow pass 1, 2026-09-30). Both were
  // derived on CashFlowScreen: `committed = commitments.reduce(...)` and
  // `free = committed > 0 ? surplus - committed : surplus`. The second is the HERO NUMBER of the This
  // month tab — the largest figure on the screen — and the master file's own row said it outright:
  // "Worked out on the screen itself, with no function behind it — a place a second definition can
  // appear." His rule is that a screen computes nothing, and a money figure is never re-derived on one.
  //
  // WHY FREE IS NOT THE SAME AS THE SURPLUS: money the Plan has already promised to a goal is not free
  // to use. Where nothing is committed the two are the same figure, and the label says which is which
  // ("Planned surplus" against "Surplus after your budget").
  const committed = cash((input.commitments ?? []).reduce((t, c) => t + (c.monthlyAmount || 0), 0));
  return {
    planned: flow.planned, actual: flow.actual, expenses: expenses(input),
    committed,
    free: cash(committed > 0 ? flow.planned.surplus - committed : flow.planned.surplus),
  };
}

/** THE WORKED EXAMPLE — ONE MONTH, SPELLED OUT (six steps, step 6, 2026-09-28).
 *
 *  September 2026: $7,200 of take-home, a $2,400 mortgage and a $250 car loan due, a $3,400 budget.
 *  So far $2,300 of rent, $512 of groceries and $186 of eating out are logged, and the car loan has
 *  been paid. Every figure runs `theMonth`, the real door.
 *
 *  THE ROWS ADD UP, WHICH IS THE WHOLE POINT of his correction on 2026-09-28: This month is not three
 *  summary numbers, it SPELLS OUT every flow until it reaches the surplus. Planned: 7,200 − 2,400 −
 *  250 − 3,400 = $1,150. Actual so far: 7,200 − 0 (the mortgage is not paid yet) − 250 − 2,998 =
 *  $3,952. Anyone can add either column by hand and land on the figure the screen shows.
 */
const EXAMPLE = {
  ym: '2026-09', takeHomeMonthly: 7200, inflowSources: ['income (take-home)'],
  debts: [
    { debt_id: 'd1', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 228000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2400, payment_type: 'installment' },
    { debt_id: 'd2', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250, payment_type: 'installment' },
  ] as any[],
  plannedExpenses: 3400,
  plannedByCategory: [
    { label: 'Rent / Mortgage', monthly: 2300 },
    { label: 'Groceries', monthly: 700 },
    { label: 'Eating out', monthly: 400 },
  ],
  expenses: [
    { amount: 2300, category: 'Rent / Mortgage', date: '2026-09-01' },
    { amount: 512, category: 'Groceries', date: '2026-09-07' },
    { amount: 186, category: 'Eating out', date: '2026-09-12' },
    { amount: 250, category: 'Debt payment', store: 'Car loan', date: '2026-09-12' },
  ],
  bigBills: [{ label: 'Property tax', amount: 4800, dueLabel: 'due Nov 1' }],
  commitments: [{ label: 'Emergency fund', monthlyAmount: 300 }],
} as any;
const GIVEN =
  'September 2026: $7,200 take-home; a $2,400 mortgage and a $250 car loan due; a $3,400 budget '
  + '($2,300 rent, $700 groceries, $400 eating out). Logged so far: $2,300 rent, $512 groceries, '
  + '$186 eating out, and the $250 car loan paid. The Plan already promises $300/month to the emergency fund.';

/** Example only: runs theMonth on the worked example and calculates nothing of its own. */
/* ─ MK-CF-F-203 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * MONTH
 *
 * Answers ..... Example only: runs theMonth on the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     the month(EXAMPLE)
 *
 * Called by ... MK-CF-F-087 monthlyTaxRates · MK-CF-F-157 debtPaymentsByDebt
 *               MK-CF-F-204 line · MK-CF-F-205 COMING
 *               MK-CF-O-004 incomeSummary · MK-CF-O-010 theMonth
 *
 * Reaches ..... 69 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-005 actualMonthFlow
 *               MK-CF-F-012 annualCashflow · MK-CF-F-210 annualOfSource
 *               … and 51 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-203
 * Changed ..... not in git yet (—)
 */
const MONTH = () => theMonth(EXAMPLE);

/** Example only: reads one row's amount from the worked example of the month. */
/* ─ MK-CF-F-204 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * line
 *
 * Answers ..... Example only: reads one row's amount from the worked example of the month.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-CF-F-036 buildDebtState · MK-CF-O-001 basePay
 *               MK-CF-O-006 theCreditLine · MK-NW-F-028 classPortionLabel
 *               MK-NW-F-101 PLAN · MK-PF-F-005 unrealizedGain
 *               MK-XS-F-002 dataGaps · MK-XS-F-004 buildDatedGrid
 *               MK-XS-F-058 parseReceipt · MK-XS-F-094 parseReceiptText
 *               MK-XS-F-096 pickReceipt
 *
 * Reaches ..... 41 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-CF-F-026 actualDebtPayment
 *               MK-CF-F-210 annualOfSource · MK-CF-O-001 basePay
 *               MK-XS-F-004 buildDatedGrid · MK-CF-F-036 buildDebtState
 *               MK-CF-F-107 buildPaycheckYear · MK-PF-F-014 buildPerformance
 *               … and 23 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *               MK-XS-I-027 goals (target, saved, date)
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-204
 * Changed ..... not in git yet (—)
 */
const line = (block: 'planned' | 'actual', startsWith: string) =>
  MONTH()[block].lines.find((l) => l.label.startsWith(startsWith))!.amount;

/** THE FIGURES THIS DOOR HANDS OUT (rule 11). The master file's rows are printed from here. */
export const THE_MONTH_FIGURES = declareFigures({
  'MK-CF-M-001': {
    label: 'Expenses', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'What you plan to spend in a month, as one line on the flow.',
    formula: 'your budget — the per-category plan added up',
    inputs: ['MK-CF-I-001 your logged expenses'],
    decisions: ['One line on This month, and the Expenses tab is its detail — not a second answer to the same question (his correction, 2026-09-28).'],
    refusal: 'No budget set — the line reads "not set" and offers the door, never a planned surplus built on a guess.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '-$3,400/month',
      run: () => line('planned', 'Expenses'),
    },
  },
  'MK-CF-M-002': {
    label: '= Planned surplus', unit: 'money', per: 'month', screens: ['/cashflow', '/home'],
    answers: 'The surplus in the month if everything goes to plan.',
    formula: 'the inflow, less every debt payment due, less the budget, less each big-ticket item',
    inputs: ['MK-XS-I-023 salary and other income', 'MK-NW-I-002 your debts', 'MK-CF-I-001 your logged expenses'],
    decisions: ['EVERY ROW SHOWN IS A ROW DEDUCTED (his rule under the approved design): nothing appears on This month without being in the sum.'],
    refusal: 'No budget set — there is no planned surplus, and the screen says so rather than guessing one.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$1,150/month',
      run: () => MONTH().planned.surplus,
    },
  },
  'MK-CF-M-003': {
    label: '= Actual surplus so far', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'What is actually left, on what has really happened so far this month.',
    formula: 'the inflow received, less each debt actually paid, less everything logged by hand and imported',
    inputs: ['MK-NW-I-004 the activity records', 'MK-CF-I-001 your logged expenses'],
    decisions: [
      'An unpaid debt shows $0 with its due date — never silently dropped, or the surplus would flatter the month.',
      'A card payment is counted ONCE: connected card → the imported purchases are the expense and the payment is a radar note; not connected → the payment IS the expense.',
    ],
    refusal: 'Nothing logged and no card linked — it says so and offers the door.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$3,952/month',
      run: () => MONTH().actual.surplus,
    },
  },
  'MK-CF-M-004': {
    label: 'each row of the month — what it is and what it costs', unit: 'money', screens: ['/cashflow'], grain: 'one row',
    answers: 'One line per thing in or out this month, so the surplus can be checked by reading down the column.',
    formula: 'the inflow; each debt by name; the budget; each big-ticket item — each with its own amount',
    inputs: ['MK-XS-I-023 salary and other income', 'MK-NW-I-002 your debts', 'MK-CF-I-001 your logged expenses'],
    decisions: ['Drawn from the approved design (cash-flow_v01): the flow is SPELLED OUT, not summarised into three numbers.'],
    refusal: 'A section with nothing in it keeps its heading and says so.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '-$250',
      run: () => line('planned', 'Car loan'),
    },
  },

  // ── THE EXPENSES FIGURES AND THE HERO (2026-10-02): hand-typed rows of the master, now printed from
  //    here. MK-CF-M-018 and MK-CF-M-019 (the old In and Out lines) were the same figures as 051 and 052
  //    and are retired; MK-CF-M-005 (the old surplus line) is 053; MK-CF-M-025 (a month's cell) is 047 to
  //    054 on Month detail; MK-CF-M-029 (the tax band) is 032 and 043. All five are retired on the register.
  'MK-CF-M-013': {
    label: 'Actual expenses', unit: 'money', screens: ['/cashflow'],
    answers: 'What has actually gone out so far this month, from the expenses logged.',
    formula: 'every expense logged inside the month, added up — a debt payment logged as an expense is counted with the debts, not here',
    inputs: ['MK-CF-I-001 your logged expenses'],
    refusal: 'Nothing logged yet — $0, and the door to log one.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$2,998', run: () => MONTH().expenses.actualTotal },
  },
  'MK-CF-M-014': {
    label: 'each expense and its amount', unit: 'money-cents', screens: ['/cashflow'], grain: 'one expense',
    answers: 'One logged expense — where, when, how much.',
    formula: 'the amount as logged',
    inputs: ['MK-CF-I-016 logged expense'],
    refusal: 'Nothing logged yet — the list is replaced by the door to log one.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$186.00', run: () => MONTH().expenses.actual.items[0].amount },
  },
  'MK-CF-M-015': {
    label: 'Planned expenses — each category', unit: 'money', screens: ['/cashflow'], grain: 'one category',
    answers: 'For each category: what was planned for it this month, and what has been spent against it so far.',
    formula: 'planned = the category’s budget line; spent = the expenses logged in that category inside the month',
    inputs: ['MK-CF-I-012 planned expenses', 'MK-CF-I-001 your logged expenses'],
    refusal: 'No budget set — the comparison is not drawn; the door to set one is.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$2,300', run: () => MONTH().expenses.planned[0].monthly },
  },
  'MK-CF-M-020': {
    label: 'THIS MONTH — free to use', unit: 'money', screens: ['/cashflow'],
    answers: 'The planned surplus, less what the Plan has already promised to goals this month — what is genuinely free.',
    formula: '= Planned surplus (MK-CF-M-002) − the goals’ commitments (MK-CF-M-021)',
    inputs: ['MK-XS-I-023 salary and other income', 'MK-NW-I-002 your debts', 'MK-CF-I-012 planned expenses', 'MK-XS-I-027 goals (target, saved, date)'],
    decisions: ['A PROMISE TO A GOAL IS MONEY ALREADY SPOKEN FOR — it never reads as free.'],
    refusal: 'No budget set — nothing is called free until there is a plan to be free of.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$850', run: () => MONTH().free },
  },
  'MK-CF-M-021': {
    label: '<goal> · from your Plan', unit: 'money', per: 'month', screens: ['/cashflow'], grain: 'one goal',
    answers: 'What the Plan sends to one goal each month, shown on This month as a line already spoken for.',
    formula: 'the goal’s monthly amount, as the Plan set it',
    inputs: ['MK-XS-I-027 goals (target, saved, date)'],
    refusal: 'No goal with a monthly amount — no line.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$300/month', run: () => MONTH().committed },
  },
  'MK-CF-M-056': {
    label: 'left of your budget', unit: 'money', screens: ['/cashflow'],
    answers: 'What is left of this month’s budget after what has been spent so far.',
    formula: 'the budget (MK-CF-M-001) − spent so far (MK-CF-M-013); below zero it reads as over',
    inputs: ['MK-CF-I-012 planned expenses', 'MK-CF-I-001 your logged expenses'],
    refusal: 'No budget set — nothing to be left of.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$402', run: () => MONTH().expenses.plannedTotal - MONTH().expenses.actualTotal },
  },
});
