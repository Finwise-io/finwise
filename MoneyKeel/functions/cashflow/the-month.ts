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
// the worked month runs on the budget AS IT IS COUNTED, as every screen's month does (2026-10-26, PF-TOOLS; FIX-MONTH's finding)
import { theBudgetCounted, expensesAsCounted } from './budget-counted';
import { spendByMonthByBucket, spendByMonthByCategory } from '../../../src/domain/budget';

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
 *     sep = spend by month by bucket(counted)[8]
 *
 * Called by ... MK-CF-F-203 MONTH
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
 *
 * Serves ...... MK-CF-M-001 · MK-CF-M-002 · MK-CF-M-003 · MK-CF-M-004
 *               MK-CF-M-013 · MK-CF-M-014 · MK-CF-M-015 · MK-CF-M-020
 *               MK-CF-M-021 · MK-CF-M-056 · MK-CF-M-101
 * Reads ....... MK-XS-I-014 debt balance
 *               MK-XS-I-015 debt interest rate
 *               MK-XS-I-016 debt minimum payment
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-032 expenses categories the person set up
 *               MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 * Ruled by .... DEC-0002 · DEC-0260
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
 *  September 2026: $7,200 of take-home, a $2,400 mortgage (on no property in Net worth) and a $250 car loan due, a $3,400
 *  budget — $2,300 Rent / Mortgage, $700 groceries, $400 eating out. So far $2,300 under Rent / Mortgage, $512 of groceries and
 *  $186 of eating out are logged, and the car loan has been paid. Every figure runs `theMonth`, the real door.
 *
 *  THE BUDGET AS IT IS COUNTED (2026-10-26, PF-TOOLS; FIX-MONTH's finding, his DEC-1923 and the lead's ruling of 2026-10-25 on
 *  DEC-2440): the example handed theMonth the budget as typed, so it counted the mortgage twice — once as the $2,300 line, once as
 *  the $2,400 debt — and read $1,150, where every screen reads $3,450. It now runs the screens' own rule (theBudgetCounted, then
 *  expensesAsCounted): a mortgage on no property beside a Rent / Mortgage line is taken as that line, so the line stands down and
 *  what was logged under it is the mortgage's payment.
 *
 *  THE ROWS ADD UP, WHICH IS THE WHOLE POINT of his correction on 2026-09-28: This month is not three
 *  summary numbers, it SPELLS OUT every flow until it reaches the surplus. Planned: 7,200 − 2,400 −
 *  250 − 1,100 = $3,450. Actual so far: 7,200 − 2,300 (the mortgage's payment, logged under Rent / Mortgage) − 250 − 698 =
 *  $3,952. Anyone can add either column by hand and land on the figure the screen shows.
 */
const EXAMPLE = {
  ym: '2026-09', takeHomeMonthly: 7200, inflowSources: ['income (take-home)'],
  debts: [
    { debt_id: 'd1', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 228000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2400, payment_type: 'installment' },
    { debt_id: 'd2', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250, payment_type: 'installment' },
  ] as any[],
  // the $3,400 budget as typed, $2,300 of it the Rent / Mortgage line — and, below, as it is counted
  ...((): any => {
    const typed = { monthlySpending: '3400', spendCats: [
      { id: 'rent', label: 'Rent / Mortgage', amount: 2300, bucket: 'fixed' }, { id: 'groceries', label: 'Groceries', amount: 700, bucket: 'flexible' },
      { id: 'dining', label: 'Eating out', amount: 400, bucket: 'flexible' }] };
    const counted = theBudgetCounted({ profile: typed, accounts: [], debts: [
      { debt_id: 'd1', label: 'Mortgage', debt_type: 'MORTGAGE', remaining_balance: 228000, interest_rate_apr: 0.0625, minimum_monthly_payment: 2400, payment_type: 'installment' },
      { debt_id: 'd2', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250, payment_type: 'installment' }] as any[] }).profile;
    const sep = spendByMonthByBucket(counted)[8];
    return {
      plannedExpenses: sep.fixed + sep.nonmonthly + sep.flexible,
      plannedByCategory: spendByMonthByCategory(counted)[8].map((r) => ({ label: r.label, monthly: r.monthly })),
      expenses: expensesAsCounted([
        { amount: 2300, category: 'Rent / Mortgage', date: '2026-09-01' },
        { amount: 512, category: 'Groceries', date: '2026-09-07' },
        { amount: 186, category: 'Eating out', date: '2026-09-12' },
        { amount: 250, category: 'Debt payment', store: 'Car loan', date: '2026-09-12' }] as any[], counted),
    };
  })(),
  bigBills: [{ label: 'Property tax', amount: 4800, dueLabel: 'Nov 1' }],   // the radar writes "due …" itself (it read "due due Nov 1"; 2026-10-25)
  commitments: [{ label: 'Emergency fund', monthlyAmount: 300 }],
} as any;
const GIVEN =
  'September 2026: $7,200 take-home; a $2,400 mortgage (on no property in Net worth) and a $250 car loan due; a $3,400 budget '
  + '($2,300 Rent / Mortgage, $700 groceries, $400 eating out) — the Rent / Mortgage line stands down, the mortgage in Debts counted once. '
  + 'Logged so far: $2,300 under Rent / Mortgage (the mortgage\u2019s payment), $512 groceries, $186 eating out, and the $250 car loan paid. '
  + 'The Plan already promises $300/month to the emergency fund.';

/** Example only: runs theMonth on the worked example and calculates nothing of its own. */
/* ─ MK-CF-F-203 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * MONTH
 *
 * Answers ..... Example only: runs theMonth on the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     the month(EXAMPLE)
 *
 * Called by ... MK-CF-F-055 annualHsaLimit · MK-CF-F-065 equityVestWeights
 *               MK-CF-F-079 incomeFromOnboarding · MK-CF-F-087 monthlyTaxRates
 *               MK-CF-F-088 taxableByCalendarMonth · MK-CF-F-146 payFiguresAgree
 *               MK-CF-F-153 radar · MK-CF-F-157 debtPaymentsByDebt
 *               MK-CF-F-186 convertTakeHomeMode · MK-CF-F-204 line
 *               MK-CF-F-205 COMING · MK-CF-F-231 addedAfterRecord
 *               MK-CF-F-246 expensesAsCounted · MK-CF-F-255 spendByMonthByCategory
 *               MK-CF-F-259 rateNotEntered · MK-CF-O-004 incomeSummary
 *               MK-CF-O-010 theMonth · MK-CF-O-020 theBudgetCounted
 *               MK-NW-F-046 historyCoverage · MK-NW-O-004 theEmergencyFund
 *               MK-PF-F-045 priceHistoryShortSentence · MK-PL-F-036 weighGoals
 *               MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
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
 * Called by ... MK-CF-F-036 buildDebtState · MK-CF-F-157 debtPaymentsByDebt
 *               MK-CF-F-171 earnerPay · MK-CF-F-184 incomeFromAccounts
 *               MK-CF-F-199 ROOM · MK-CF-F-241 M
 *               MK-CF-F-246 expensesAsCounted · MK-CF-F-263 incomeIsTaxedWhenPaid
 *               MK-CF-O-001 basePay · MK-CF-O-006 theCreditLine
 *               MK-CF-O-010 theMonth · MK-CF-O-017 futurePaycheck
 *               MK-CF-O-019 theIncomeManager · MK-CF-O-020 theBudgetCounted
 *               MK-NW-F-002 alternativesSummary · MK-NW-F-028 classPortionLabel
 *               MK-NW-F-088 BENCH · MK-NW-F-139 leftOutValueOf
 *               MK-NW-F-141 holdingBondFacts · MK-NW-F-147 paymentNotEntered
 *               MK-NW-F-167 COMPARE · MK-NW-F-185 valueChanged
 *               MK-NW-F-265 historyPurchaseRow · MK-NW-F-277 purchasesFromList
 *               MK-NW-F-283 splitsBetween · MK-NW-F-284 activityOf
 *               MK-NW-F-345 accountWalksShown · MK-NW-F-412 priceFromDay
 *               MK-NW-O-003 theNetWorth · MK-NW-O-008 thePerformance
 *               MK-PF-F-015 topHoldingConcentration · MK-PF-F-035 unknownFigure
 *               MK-PF-F-053 isBroadIndexOption · MK-ST-F-081 timeWeightedReturn
 *               MK-XS-F-002 dataGaps · MK-XS-F-004 buildDatedGrid
 *               MK-XS-F-058 parseReceipt · MK-XS-F-094 parseReceiptText
 *               MK-XS-F-096 pickReceipt
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-024 logged expenses
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
    answers: 'What you plan to spend in this month, as one line on the flow — and the total of the Expenses tab\'s planned rows.',
    // ONE PRODUCER, IN ITS OWN MONTH (2026-10-23, CF-FIX): This month summed the month's own bills while the Expenses tab summed
    // the budget's monthly average — a September with a $1,200 December bill read −$700 and $800. Both read spendByMonthByBucket now.
    formula: 'this month\'s planned expenses = bills & fixed + once-in-a-while bills that fall in this month + everyday expenses (spendByMonthByBucket, the budget as counted) — a once-a-year bill counts in its own month, never a twelfth; a once-in-a-while bill with no month set is a twelfth a month',
    inputs: ['MK-CF-I-001 your logged expenses'],
    decisions: ['One line on This month, and the Expenses tab is its detail — not a second answer to the same question (his correction, 2026-09-28).',
      'A bill that lands once a year is planned in the month it lands, never spread (his DEC-0002 and DEC-0447; MK-CF-M-048). A budget whose only line falls in another month reads $0 this month, not "not set" (2026-10-23).'],
    refusal: 'No budget set — on This month the row reads "— not set", and under the rows a sentence says there is no planned surplus until a budget is set ("… we won’t guess one.") with the door "Set your budget"; on Expenses the band reads — with "You haven’t set your budget yet. …" and the same door. Income not entered — the month is not drawn: its two set-up steps stand in its place.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '−$1,100/month',   // 3,400 typed − the 2,300 Rent / Mortgage line, stood down for the mortgage in Debts (2026-10-26)
      run: () => line('planned', 'Expenses'),
    },
  },
  'MK-CF-M-002': {
    label: '= Planned surplus', unit: 'money', per: 'month', screens: ['/cashflow', '/home'],
    answers: 'The surplus in the month if everything goes to plan.',
    formula: 'the inflow, less every debt payment due, less the budget, less each big-ticket item',
    inputs: ['MK-XS-I-023 salary and other income', 'MK-NW-I-002 your debts', 'MK-CF-I-001 your logged expenses'],
    decisions: ['EVERY ROW SHOWN IS A ROW DEDUCTED (his rule under the approved design): nothing appears on This month without being in the sum.'],
    refusal: 'No planned surplus is shown, and the band reads —: when no budget is set (the sentence under the rows says so and offers "Set your budget"), or when a debt’s payment was never entered ("Car loan’s payment is not entered, so there is no planned surplus — we won’t guess one.", 2026-10-23). Income not entered — the month is not drawn: its two set-up steps stand in its place.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '$3,450/month',   // 7,200 − 2,400 − 250 − 1,100: the mortgage counted once, as the screens count it (2026-10-26; was $1,150)
      run: () => MONTH().planned.surplus,
    },
  },
  'MK-CF-M-003': {
    label: '= Actual surplus so far', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'What is actually left, on what has really happened so far this month.',
    // THE ROW'S WORDS NOW SAY WHAT THE CODE COUNTS (2026-10-27, PF-TOOLS; the screens measurement, MK-CF-M-003 tenet 1): the
    // words said "the inflow received", but the code counts the month's take-home before anything is received ($7,200 on
    // the 1st), as DEC-7607 settled for MK-CF-M-051's row. No figure moves ($3,952). To reverse: put "received" back.
    formula: 'the month’s take-home (MK-CF-M-051), less each debt actually paid, less everything logged by hand and imported',
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
    period: 'this month — the plan for the whole calendar month, and on the actual side what has happened from the 1st to today',
    answers: 'One line per thing in or out this month, so the surplus can be checked by reading down the column — and, on Expenses, each line of its lists.',
    // THE TRUE FORMULA (2026-10-23, CF-FIX): the master printed the month's outflow here (MK-CF-F-194, from when the row was the
    // outflow line); that figure is MK-CF-M-052 now
    formula: 'one row per line of the month, each at its own amount. This month, planned: the inflow, each debt\'s payment due, the month\'s planned expenses, each big-ticket item. This month, actual: the inflow, each debt\'s payment made so far ($0 with its due day when nothing was), other debt payments, the expenses entered by hand and imported. Expenses: each debt that repeats every month at its payment, the total of the repeating debts, and each list\'s total of what was logged',
    inputs: ['MK-XS-I-023 salary and other income', 'MK-NW-I-002 your debts', 'MK-CF-I-001 your logged expenses'],
    decisions: ['Drawn from the approved design (cash-flow_v01): the flow is SPELLED OUT, not summarised into three numbers.'],
    refusal: 'A row whose amount is not known says so where the amount would be: "— not set" for a budget not set, "payment not entered" for a debt whose payment was never entered (2026-10-23). A debt not paid yet shows $0 with its due day ("not paid yet" when no due day is recorded). Nothing logged: "Expenses entered by hand" stays at a real $0, with "Nothing logged yet, and no card connected. …" under the rows. On Expenses every section keeps its heading when empty, at a real $0.',
    ruled: '2026-09-27',
    worked: {
      given: GIVEN,
      answer: '−$250',
      run: () => line('planned', 'Car loan'),
    },
  },

  // ── THE EXPENSES FIGURES AND THE HERO (2026-10-02): hand-typed rows of the master, now printed from
  //    here. MK-CF-M-018 and MK-CF-M-019 (the old In and Out lines) were the same figures as 051 and 052
  //    and are retired; MK-CF-M-005 (the old surplus line) is 053; MK-CF-M-025 (a month's cell) is 047 to
  //    054 on Month detail; MK-CF-M-029 (the tax band) is 032 and 043. All five are retired on the register.
  'MK-CF-M-013': {
    label: 'Actual expenses', unit: 'money', screens: ['/cashflow'],
    period: 'the month shown — this month unless another is picked with ‹ ›; a month in progress counts what is logged from the 1st to today',
    answers: 'What has actually gone out so far this month, from the expenses logged.',
    formula: 'every expense logged inside the month, added up — a debt payment logged as an expense is counted with the debts, not here',
    inputs: ['MK-CF-I-001 your logged expenses'],
    refusal: 'Nothing logged in the month — a real $0 on the ACTUAL EXPENSES band, with "Nothing logged this month. Connect a card and purchases arrive on their own, or add a receipt by hand." and the door "Log an expense".',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$698', run: () => MONTH().expenses.actualTotal },   // 512 + 186: the 2,300 is the mortgage's payment (2026-10-26; was $2,998)
  },
  'MK-CF-M-014': {
    label: 'each expense and its amount', unit: 'money-cents', screens: ['/cashflow'], grain: 'one expense',
    period: 'the month shown — this month unless another is picked with ‹ ›',
    answers: 'One logged expense — where, when, how much.',
    formula: 'the amount as logged',
    inputs: ['MK-CF-I-016 logged expense'],
    refusal: 'Nothing logged in the month — the list is not drawn; "Nothing logged this month. …" and the door "Log an expense" stand in its place.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$186.00', run: () => MONTH().expenses.actual.items[0].amount },
  },
  // EACH LIST'S TOTAL ON EXPENSES, TO THE CENT (2026-10-27, FX-CF-A; the lead's ruling R5 on the round-2 drawing match, CF2-06): the
  // rows above it are written to the cent (MK-CF-M-014, and a debt payment logged), so the total under them is too — two $200.40
  // payments read $200.40 + $200.40 = $400.80; each rounded to the dollar alone they read $200 + $200 under $401
  'MK-CF-M-101': {
    label: 'each list’s total on Expenses — what its rows add up to', unit: 'money-cents', screens: ['/cashflow'], grain: 'one list',
    period: 'the month shown — this month unless another is picked with ‹ ›; a month in progress counts what is logged from the 1st to today',
    answers: 'What the rows printed above it add up to, to the cent — entered by hand, imported, debt payments counted as expenses, the rest of a list under “Show all”, and all sources together.',
    formula: 'the amounts as logged, added up with nothing rounded on the way, then written to the cent once; each row shares its list’s total (centsShown, in MoneyKeel/functions/_figure-spec.ts), so the rows as printed add up to it, and the lists add up to all sources',
    inputs: ['MK-CF-I-016 logged expense'],
    decisions: ['ROWS ROUND ONCE (the lead’s ruling R5, 2026-10-27; DEC-3523 tenet 2 above tenet 4): every row is printed from its full value and the rows under a total add up to that total as printed — an expense is written to the cent (DEC-0264), so its total is.'],
    refusal: 'Nothing logged in the month — a real $0.00 on the ACTUAL EXPENSES bar, with "Nothing logged this month. …" and the door "Log an expense".',
    ruled: '2026-10-27',   // the lead's decision R5, made without asking him; its decision row is PF-RECORDS'
    worked: { given: GIVEN, answer: '$698.00', run: () => MONTH().expenses.byHand.total },   // $512 + $186: the $2,300 is the mortgage's payment
  },
  'MK-CF-M-015': {
    label: 'Planned expenses — each category', unit: 'money', screens: ['/cashflow'], grain: 'one category',
    period: 'this month — each category’s budget for the month, and what is logged against it from the 1st to today',
    answers: 'For each of the budget\'s groups — bills & fixed, once in a while, everyday expenses: what is planned for it in this month.',
    formula: 'planned = the group\'s planned expenses for this month (spendByMonthByBucket, the budget as counted): bills & fixed and everyday expenses every month, a once-in-a-while bill only in the months it falls; a group with nothing planned this month is not drawn; the rows add up to MK-CF-M-001',
    inputs: ['MK-CF-I-012 planned expenses', 'MK-CF-I-001 your logged expenses'],
    refusal: 'No budget set — the categories are not drawn: the band reads —, with "You haven’t set your budget yet. This is what every “of $X planned” on any screen is measured against." and the door "Set your budget".',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$700', run: () => MONTH().expenses.planned[0].monthly },   // Groceries: the Rent / Mortgage line stood down (2026-10-26; was $2,300)
  },
  'MK-CF-M-020': {
    label: 'THIS MONTH — free to use', unit: 'money', screens: ['/cashflow'],
    period: 'this month — the calendar month',
    answers: 'The planned surplus, less what the Plan has already promised to goals this month — what is genuinely free.',
    formula: '= Planned surplus (MK-CF-M-002) − the goals’ commitments (MK-CF-M-021)',
    inputs: ['MK-XS-I-023 salary and other income', 'MK-NW-I-002 your debts', 'MK-CF-I-012 planned expenses', 'MK-XS-I-027 goals (target, saved, date)'],
    decisions: ['A PROMISE TO A GOAL IS MONEY ALREADY SPOKEN FOR — it never reads as free.'],
    refusal: 'No budget set, or a debt’s payment never entered (2026-10-23) — no line: nothing is called free until there is a plan to be free of.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$3,150', run: () => MONTH().free },   // 3,450 − the 300 promised to the emergency fund (2026-10-26; was $850)
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
    period: 'this month, from the 1st to today',
    answers: 'What is left of this month’s budget after what has been spent so far.',
    formula: 'the budget (MK-CF-M-001) − spent so far (MK-CF-M-013); below zero it reads as over',
    inputs: ['MK-CF-I-012 planned expenses', 'MK-CF-I-001 your logged expenses'],
    refusal: 'No budget set — nothing to be left of.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$402', run: () => MONTH().expenses.plannedTotal - MONTH().expenses.actualTotal },
  },
});
