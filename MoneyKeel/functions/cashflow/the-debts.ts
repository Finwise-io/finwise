/** WHAT DO YOUR DEBTS ASK OF YOU, AND WHEN ARE THEY GONE? — the Debts tab's one door (2026-10-02).
 *
 *  The Budget screen's Debts tab added balances, minimums and interest up on the screen and called
 *  payoffPlan itself. A screen computes nothing (his rule, 2026-09-13), so the three figures it prints
 *  are handed out here, with their inputs and an example that runs.
 */
import { declareFigures } from '../_figure-spec';
import { payoffPlan, minimumDebtService, totalDebtMonthly, requiredPayment, type Debt, type PayoffMethod, type PayoffResult } from '../../../src/domain/debt';

export interface TheDebts {
  /** Every debt still owed, together. */
  totalBalance: number;
  /** The obligation — what the debts require of you in a month (MK-NW-M-012 is what you actually pay). */
  minimumMonthly: number;
  /** What actually leaves each month, across every debt. */
  paymentsMonthly: number;
  /** Interest accruing in a month at today's balances and rates. */
  interestMonthly: number;
  /** What the plan puts to debts each month: every minimum plus anything extra. */
  planMonthly: number;
  /** The plan: months to debt-free, interest paid over it, and whether the payments can ever clear it. */
  plan: PayoffResult;
  /** PROGRESS (cash-flow_v01, frame 6: "$4,100 paid down since January — 24% of where you started").
   *  What the debts stood at on the first month-end we hold this year, less what they stand at now.
   *  Null — and the line is not drawn — where we hold no earlier figure, or the debts have not fallen:
   *  progress is read from two recorded totals, never estimated from the payments. */
  progress: { paidDown: number; share: number } | null;
}

/** What do I owe, what does it ask of me each month, when would I be clear of it, and how much have I paid down this year?
 *  ── ORCHESTRATOR ── the one function a screen asks for this.
 *  The one function the Debts tab calls. */
/* ─ MK-CF-O-018 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * theDebts
 *
 * Answers ..... What do I owe, what does it ask of me each month, when would I be clear of it, and how much have I paid down this year?
 *
 * Formula .....
 *     active = input.debts (or none when missing) where (remaining balance or 0) > 0
 *     total now = Σ over active of (remaining balance (or 0 when missing or zero))
 *     began = input.start of year debt (or 0 when missing)
 *     paid down = began − total now
 *
 * Called by ... MK-CF-F-211 DEBTS
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS
 *
 * Serves ...... MK-CF-M-057 · MK-CF-M-058 · MK-CF-M-059 · MK-CF-M-071
 *               MK-CF-M-072 · MK-CF-M-073 · MK-CF-M-074 · MK-CF-M-075
 * Reads ....... MK-XS-I-014 debt balance
 *               MK-XS-I-015 debt interest rate
 *               MK-XS-I-016 debt minimum payment
 *
 * Decides .....
 *     · If start of year debt is missing it uses 0.
 *     · If extra monthly is missing it uses 0.
 *     · If remaining balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If interest rate apr is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-018
 * Changed ..... not in git yet (—)
 */
export function theDebts(input: { debts: Debt[]; extraMonthly?: number; method?: PayoffMethod; now?: Date;
  /** what every debt together stood at on the earliest month-end recorded this year, if any */
  startOfYearDebt?: number | null }): TheDebts {
  const active = (input.debts ?? []).filter((d) => (d.remaining_balance || 0) > 0);
  const totalNow = active.reduce((t, d) => t + (d.remaining_balance || 0), 0);
  const began = input.startOfYearDebt ?? 0;
  const paidDown = began - totalNow;
  return {
    progress: began > 0 && paidDown > 0 ? { paidDown, share: paidDown / began } : null,
    totalBalance: active.reduce((t, d) => t + (d.remaining_balance || 0), 0),
    minimumMonthly: minimumDebtService(active),
    paymentsMonthly: totalDebtMonthly(active),
    interestMonthly: active.reduce((t, d) => t + (d.remaining_balance || 0) * (d.interest_rate_apr || 0) / 12, 0),
    planMonthly: minimumDebtService(active) + (input.extraMonthly ?? 0),
    plan: payoffPlan(input.debts ?? [], input.extraMonthly ?? 0, input.method ?? 'avalanche', input.now ?? new Date()),
  };
}

const EXAMPLE = {
  debts: [
    { debt_id: 'c', label: 'Card', debt_type: 'CREDIT_CARD', remaining_balance: 9000, interest_rate_apr: 0.24, minimum_monthly_payment: 200 },
    { debt_id: 'a', label: 'Car loan', debt_type: 'AUTO', remaining_balance: 14000, interest_rate_apr: 0.069, minimum_monthly_payment: 250 },
  ] as any[],
  extraMonthly: 0, method: 'avalanche' as PayoffMethod, now: new Date('2026-10-01T12:00:00'),
};
const GIVEN = 'A $9,000 card at 24% with a $200 minimum and a $14,000 car loan at 6.9% with a $250 minimum, nothing extra paid.';

/** Example only: runs theDebts on the worked example and calculates nothing of its own. */
/* ─ MK-CF-F-211 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * DEBTS
 *
 * Answers ..... Example only: runs theDebts on the worked example and calculates nothing of its own.
 *
 * Formula .....
 *     the debts(EXAMPLE)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-211
 * Changed ..... not in git yet (—)
 */
const DEBTS = () => theDebts(EXAMPLE);

export const DEBT_FIGURES = declareFigures({
  'MK-CF-M-057': {
    label: '/month interest', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'What your debts cost in interest in a month, at today’s balances and rates.',
    formula: 'Σ balance × yearly rate ÷ 12, over every debt still owed',
    inputs: ['MK-XS-I-014 debt balance', 'MK-XS-I-015 debt interest rate'],
    refusal: 'No debts — $0.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$261/month', run: () => DEBTS().interestMonthly },
  },
  'MK-CF-M-058': {
    label: 'debt-free', unit: 'count', screens: ['/cashflow'],
    answers: 'How many months until the last debt is cleared, paying the minimums plus anything extra, highest rate first.',
    formula: 'the payoff plan: each month pay every minimum, put the extra on the costliest debt, roll a cleared debt’s payment onto the next',
    inputs: ['MK-XS-I-014 debt balance', 'MK-XS-I-015 debt interest rate', 'MK-XS-I-016 debt minimum payment'],
    refusal: 'The payments cannot cover the interest — the screen says never, not a number.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '84', run: () => (DEBTS().plan.neverPaysOff ? null : DEBTS().plan.months) },
  },
  'MK-CF-M-059': {
    label: 'total interest', unit: 'money', screens: ['/cashflow'],
    answers: 'All the interest paid over the plan until the last debt is gone.',
    formula: 'the interest paid month by month over the payoff plan, added up',
    inputs: ['MK-XS-I-014 debt balance', 'MK-XS-I-015 debt interest rate', 'MK-XS-I-016 debt minimum payment'],
    refusal: 'The payments cannot cover the interest — the screen says never, not a number.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$14,787', run: () => (DEBTS().plan.neverPaysOff ? null : DEBTS().plan.totalInterest) },
  },
  'MK-CF-M-071': {
    label: '/month min', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'The least your debts require of you in a month, every minimum added up — the obligation, not what you choose to pay.',
    formula: 'Σ the minimum monthly payment of every debt still owed',
    inputs: ['MK-XS-I-016 debt minimum payment'],
    refusal: 'No debts — $0.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$450/month', run: () => DEBTS().minimumMonthly },
  },
  'MK-CF-M-072': {
    label: '/month total', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'What the payoff plan puts to debts each month: every minimum plus the extra you set.',
    formula: 'the minimums added up (MK-CF-M-071) + the extra a month you set',
    inputs: ['MK-XS-I-016 debt minimum payment', 'MK-XS-I-041 the payment the person chose to make on a debt'],
    refusal: 'No debts — $0.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$450/month', run: () => DEBTS().planMonthly },
  },
  'MK-CF-M-074': {
    label: 'paid down since <month>', unit: 'money', screens: ['/cashflow'],
    answers: 'How much less you owe than at the first month-end we recorded this year.',
    formula: 'what every debt together stood at then − what they stand at now',
    inputs: ['MK-XS-I-014 debt balance'],
    decisions: ['READ FROM TWO RECORDED TOTALS, never estimated from the payments made — interest and new borrowing are inside it.',
      'NOT DRAWN where there is no earlier total to compare with, or the debts have not fallen.'],
    refusal: 'No earlier total on record, or the debts have not fallen — the line is not drawn.',
    ruled: '2026-10-03',
    worked: { given: `${GIVEN} They stood at $27,100 at the end of January.`, answer: '$4,100', run: () => theDebts({ ...EXAMPLE, startOfYearDebt: 27_100 }).progress?.paidDown ?? null },
  },
  'MK-CF-M-075': {
    label: '% of where you started', unit: 'percent', screens: ['/cashflow'],
    answers: 'That paid-down amount as a share of what you owed at the start.',
    formula: 'paid down (MK-CF-M-074) ÷ what every debt together stood at then',
    inputs: ['MK-XS-I-014 debt balance'],
    refusal: 'No earlier total on record, or the debts have not fallen — the line is not drawn.',
    ruled: '2026-10-03',
    worked: { given: `${GIVEN} They stood at $27,100 at the end of January.`, answer: '15%', run: () => theDebts({ ...EXAMPLE, startOfYearDebt: 27_100 }).progress?.share ?? null },
  },
  'MK-CF-M-073': {
    label: '/month', unit: 'money', per: 'month', screens: ['/cashflow', '/bill-calendar'], grain: 'one debt',
    answers: 'What you pay on one debt each month — the payment you set, or its minimum where you set none.',
    formula: 'the payment you chose for the debt; its minimum monthly payment where none is chosen',
    inputs: ['MK-XS-I-016 debt minimum payment', 'MK-XS-I-041 the payment the person chose to make on a debt'],
    refusal: 'A debt due in full on a date has no monthly payment — the line says when the whole balance is due.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$200/month', run: () => requiredPayment(EXAMPLE.debts[0]) },
  },
} as const);
