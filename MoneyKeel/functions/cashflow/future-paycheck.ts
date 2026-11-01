/** YOUR FUTURE PAYCHECK — a projection, an estimate, not a promise (2026-10-02).
 *
 *  This lived inside CashFlowScreen as a useMemo: age, retirement age, the guaranteed streams, the
 *  simulation of the pot and the paycheck year built from it. A screen computes nothing, so it is a
 *  door now, and the three figures it prints have rows, inputs and an example.
 */
import { declareFigures } from '../_figure-spec';
import { guaranteedOutsideStreams } from '../../../src/domain/income';
import { simulate } from '../../../src/domain/retirement';
import { willItLastInputs, planRetireAgeOf } from '../../../src/domain/retirement/willItLast';   // one retirement age (R10)
import { buildPaycheckYear } from '../../../src/domain/paycheck';
import { ageFromProfile } from '../../../src/utils/persona';
import { taxBucketSplit, withdrawalOrder } from '../../../src/domain/decumulation';

export interface FuturePaycheck {
  retireAge: number;
  /** nothing entered: the age is the app's own, and the card says so (R10, 2026-10-31) */
  retireAgeOurs: boolean;
  /** MK-CF-M-022 — about what a month would bring at retirement: guaranteed income + the draw. */
  monthly: number;
  /** MK-CF-M-023 — the guaranteed part: Social Security, pension, annuity, other. */
  guaranteed: number;
  /** MK-CF-M-055 — the draw from savings the pot can support, level. */
  draw: number;
  /** WHAT IT ASSUMES, so the card can say it (2026-10-25, CF-MMFIX-A; DEC-0088 names every figure an explanation assumes, DEC-2164
   *  the dollars are today's): the yearly return and the yearly inflation the projection ran on, as fractions (0.06 = 6%). */
  assumes: { yearlyReturn: number; yearlyInflation: number };
}

/** About what would a month bring in at retirement: the guaranteed income plus a level draw from savings?
 *  ── ORCHESTRATOR ── the one function a screen asks for this.
 *  The one function the Cash flow tab calls for the projection card. Null is an answer: before
 *  retirement age is known, or with no pot to project, nothing is shown — never a guess. */
/* ─ MK-CF-O-017 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * futurePaycheck
 *
 * Answers ..... About what would a month bring in at retirement: the guaranteed income plus a level draw from savings?
 *
 * Formula .....
 *     age = age from profile(op)
 *     retire of = plan retire age of({ assumptions: A, op, retired now: input.employment status = 'retired', age })
 *     retire age = retire of.age
 *     guaranteed = Σ over guaranteed outside streams(op) of (monthly)
 *     nothing   when age = nothing (or age ≥ retire age when missing or zero)
 *     inputs = will it last inputs({ op, accounts: input.accounts ?? [], assumptions: A, big costs: input.big costs, employment status: input.employment status, transactions: input.transactions ?? [] } as any)
 *     nothing   when inputs is missing (or inputs.start balance ≤ 0 when missing or zero)
 *     projected egg = simulate(inputs).projected at retirement
 *     nothing   when projected egg is missing (or projected egg ≤ 0 when missing or zero)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-CF-M-055 · MK-CF-M-070 · MK-CF-M-078 · MK-CF-M-082
 *               MK-CF-M-083
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-017 birth year
 *               MK-XS-I-018 retirement age
 *               MK-XS-I-022 pension monthly amount
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-026 big costs (amount and year)
 *               MK-XS-I-028 assumed return
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-017
 * Changed ..... not in git yet (—)
 */
export function futurePaycheck(input: {
  // no inflationRate (2026-10-31, the lead's order; DEC-0259): nothing read it, and the store's 3.2% feed was being handed in and ignored —
  // the one inflation is inflationRateInForce, read inside the plan's inputs
  op: any; accounts: any[]; assumptions: any; bigCosts?: any[]; employmentStatus?: any;
  transactions?: any[];   // the year's interest records, for the plan's tax rate (2026-10-26, CLEANUP-LEFT)
}): FuturePaycheck | null {
  const { op, assumptions: A } = input;
  const age = ageFromProfile(op);
  // ONE RETIREMENT AGE (R10, 2026-10-31; cash-flow v01's row of that date): the plan's own age, 65 and ours when nothing is entered —
  // the card read 67 while the odds beside it were worked at 65
  const retireOf = planRetireAgeOf({ assumptions: A, op, retiredNow: input.employmentStatus === 'retired', age });
  const retireAge = retireOf.age;
  // OUTSIDE money only — Social Security, pension, annuity, other (MK-CF-F-076). The six-source figure
  // also carries planned withdrawals and the required withdrawal; this card prints a draw beside it,
  // and counting both is the double count his ruling Q-38 (2026-08-20) forbids.
  const guaranteed = guaranteedOutsideStreams(op).reduce((t, st) => t + st.monthly, 0);
  if (age == null || age >= retireAge) return null;
  const inputs = willItLastInputs({ op, accounts: input.accounts ?? [], assumptions: A, bigCosts: input.bigCosts, employmentStatus: input.employmentStatus, transactions: input.transactions ?? [] } as any);
  if (!inputs || inputs.start_balance <= 0) return null;
  const projectedEgg = simulate(inputs).projected_at_retirement;
  if (!projectedEgg || projectedEgg <= 0) return null;
  const projYear = buildPaycheckYear(op, {
    nestEgg: projectedEgg,
    sim: { current_age: retireAge, horizon_age: Math.max(retireAge + 5, inputs.horizon_age), mean_return: inputs.mean_return, vol_return: inputs.vol_return, inflation: inputs.inflation, seed: 42, paths: 1000 },
  } as any);
  // FULL PRECISION, ROUNDED ONCE AT THE SCREEN (2026-10-25, FIX-ROOM; his PRECISION order, Q49): $2,731.17 guaranteed + a
  // $1,730 draw is $4,461.17, and the card prints $4,461 through fig(). It was rounded here, to 4,461 and 2,731.
  return { retireAge, retireAgeOurs: retireOf.ours, monthly: guaranteed + projYear.safeDrawMonthly, guaranteed, draw: projYear.safeDrawMonthly,
    assumes: { yearlyReturn: inputs.mean_return, yearlyInflation: inputs.inflation } };
}

const NONE = { op: { birthYear: 1980 }, accounts: [], assumptions: {} };
/** A 45-year-old with $200,000 in a pre-tax 401(k) and $2,000/month of Social Security from 67 — seeded, so the same every time. */
const SAVER = {
  op: { birthYear: 1981, targetRetirementAge: 67, ri_ss: '2000', ri_ss_receiving: 'no', ri_ss_freq: 'monthly', monthlySpending: 3000, incomeSources: ['retirement_income'] },
  accounts: [{ asset_id: 'k', label: '401(k)', tax_bucket: 'PRE_TAX', balance: 200_000, target_return: 0.06, retirement_pct: 100 }],
  assumptions: { expectedReturn: 0.06 },
};
/** A retired household on 15 Oct 2026: $2,400/month of Social Security, no savings to draw on, $1,200 of car insurance in October. */
const RETIRED = { status: 'retired', birthYear: '1956', incomeSources: ['retirement_income'], ri_ss: '2400', ri_ss_freq: 'monthly', monthlySpending: '1500',
  spendCats: [{ id: 'ins', label: 'Car insurance', amount: 1_200, bucket: 'nonmonthly', months: [10], tier: 'critical', custom: true }] };
const GIVEN_RETIRED = 'Retired, on 15 Oct 2026: $2,400/month of Social Security, no savings to draw on, and $1,200 of car insurance due in October.';
const GIVEN = 'Born in 1981, retiring at 67, with $200,000 in a 401(k) earning 6% and $2,000/month of Social Security from 67.';

export const FUTURE_PAYCHECK_FIGURES = declareFigures({
  'MK-CF-M-022': {
    label: 'YOUR FUTURE PAYCHECK — At <age>: ~$X/month', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'About what a month would bring at retirement: the guaranteed income plus a level draw from the projected pot.',
    formula: 'guaranteed income a month + the draw the projected pot can support (the paycheck year’s level draw)',
    inputs: ['MK-NW-I-001 your accounts', 'MK-XS-I-017 birth year', 'MK-XS-I-018 retirement age', 'MK-XS-I-028 assumed return', 'MK-XS-I-020 Social Security monthly amount'],
    decisions: ['AN ESTIMATE, SAID TO BE ONE on the screen — never a promise.', 'NOTHING BEFORE THERE IS A POT: with no accounts, or past retirement age, the card is not drawn.'],
    refusal: 'No pot to project from, or retirement age already reached — the card is not drawn.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$4,345/month', run: () => futurePaycheck(SAVER as any)?.monthly ?? null },
  },
  'MK-CF-M-023': {
    label: 'YOUR FUTURE PAYCHECK — Social Security · pension', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'The guaranteed part of that future month: Social Security, pension, annuity, other.',
    formula: 'the outside guaranteed streams a month, added up',
    inputs: ['MK-XS-I-020 Social Security monthly amount', 'MK-XS-I-022 pension monthly amount', 'MK-XS-I-035 annuity income', 'MK-XS-I-036 other guaranteed income'],
    refusal: 'No pot to project from, or retirement age already reached — the card is not drawn.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$2,000/month', run: () => futurePaycheck(SAVER as any)?.guaranteed ?? null },
  },
  'MK-CF-M-055': {
    label: 'Draw from savings', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'The level amount a month the pot can support, so the paycheck does not fall when a bill lands.',
    decisions: [
      'IN TODAY\u2019S DOLLARS (decided 2026-10-03, the master\u2019s old Q30): the draw keeps its buying power \u2014 the figure shown is '
      + 'what it buys today, and the dollars paid rise with inflation each year. It is what the simulation behind the odds already '
      + 'charges, so the draw shown and the odds beside it are the same plan. To reverse: hold the dollars flat instead, and the odds must be re-run that way.',
    ],
    formula: 'the paycheck year’s level draw from the pot, at the assumed return and horizon',
    inputs: ['MK-NW-I-001 your accounts', 'MK-XS-I-028 assumed return', 'MK-XS-I-018 retirement age'],
    // THE REFUSAL NOW SAYS WHAT THE SCREEN DOES (2026-10-27, PF-TOOLS; the screens measurement, MK-CF-M-055 tenet 3): with no pot
    // futurePaycheck returns nothing and the card is not drawn — it never shows a $0 draw. Its three stops, read from the code:
    // no age, already at the retirement age, no pot (or none projected). To reverse: the old words.
    refusal: 'No age entered, retirement age already reached, or no pot to project from — the card is not drawn.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$2,345/month', run: () => futurePaycheck(SAVER as any)?.draw ?? null },
  },
  // ITS OWN NUMBER (2026-10-24, CF-FIX; PF-TOOLS, settling MK-CF-M-001 to 004): the retired view's paycheck this month — the
  // paycheck card's hero and the pace line's $Y (named a surplus until 2026-10-25: canon row 25) — was printed under
  // MK-CF-M-049, the later-month card's planned surplus, a third figure under one number. The register issued MK-CF-M-078.
  'MK-CF-M-078': {
    label: 'YOUR PAYCHECK — <MONTH> (retired)', unit: 'money', per: 'month', screens: ['/cashflow'],
    answers: 'What a retired person can spend this month: the guaranteed income that lands this month, plus the level draw from savings, less the big dated bills that fall in it.',
    formula: 'this month’s paycheck = guaranteed income landing this month + the level draw the savings can support − the big dated bills in this month (everyday expenses and monthly debt payments are what it is for, so they are not taken off)',
    inputs: ['MK-XS-I-020 Social Security monthly amount', 'MK-XS-I-022 pension monthly amount', 'MK-NW-I-001 your accounts', 'MK-CF-I-014 big bill'],
    decisions: ['A short month shows the minus with the word “short” and the bill named — never smoothed, never clipped to zero.'],
    grain: 'one figure per household per month',
    refusal: 'No guaranteed income entered: the card asks for Social Security and pension; with nothing to spend, the pace line is not drawn.',
    note: 'Printed in the retired view of This month: the paycheck card’s hero, and the $Y of the pace line (drawn only when it is above $0).',
    worked: { given: GIVEN_RETIRED, answer: '$1,200/month', run: () => buildPaycheckYear(RETIRED as any, { nestEgg: 0, now: new Date(2026, 9, 15),
      sim: { current_age: 70, horizon_age: 95, mean_return: 0.05, vol_return: 0.1, inflation: 0.024, seed: 42, paths: 100 } } as any).thisMonth.netSafeToSpend },
  },
  'MK-CF-M-070': {
    label: 'each step of the withdrawal order', unit: 'money', screens: ['/cashflow'], grain: 'one step',
    answers: 'Which pot the retired paycheck draws from first, second and so on, and how much sits in each.',
    formula: 'cash first, then taxable, then pre-tax, then Roth — each with what is earmarked for retirement in it',
    inputs: ['MK-NW-I-001 your accounts', 'MK-XS-I-002 account type (taxable, pre-tax, Roth)', 'MK-XS-I-050 the share of an account earmarked for retirement'],
    refusal: 'No retirement money in any pot — no order to explain.',
    ruled: '2026-10-02',
    worked: { given: 'A $50,000 taxable brokerage account and a $120,000 pre-tax 401(k), both for retirement, at 68.', answer: '$50,000',
      run: () => withdrawalOrder(taxBucketSplit([{ asset_id: 'b', label: 'Brokerage', tax_bucket: 'TAXABLE', balance: 50_000, target_return: 0.05, retirement_pct: 100 },
        { asset_id: 'k', label: '401(k)', tax_bucket: 'PRE_TAX', balance: 120_000, target_return: 0.05, retirement_pct: 100 }] as any), 68).find((st) => st.amount > 0)?.amount ?? null },
  },
} as const);
