/** YOUR FUTURE PAYCHECK — a projection, an estimate, not a promise (2026-10-02).
 *
 *  This lived inside CashFlowScreen as a useMemo: age, retirement age, the guaranteed streams, the
 *  simulation of the pot and the paycheck year built from it. A screen computes nothing, so it is a
 *  door now, and the three figures it prints have rows, inputs and an example.
 */
import { declareFigures } from '../_figure-spec';
import { guaranteedOutsideStreams } from '../../../src/domain/income';
import { simulate } from '../../../src/domain/retirement';
import { willItLastInputs } from '../../../src/domain/retirement/willItLast';
import { buildPaycheckYear } from '../../../src/domain/paycheck';
import { ageFromProfile } from '../../../src/utils/persona';
import { taxBucketSplit, withdrawalOrder } from '../../../src/domain/decumulation';

export interface FuturePaycheck {
  retireAge: number;
  /** MK-CF-M-022 — about what a month would bring at retirement: guaranteed income + the draw. */
  monthly: number;
  /** MK-CF-M-023 — the guaranteed part: Social Security, pension, annuity, other. */
  guaranteed: number;
  /** MK-CF-M-055 — the draw from savings the pot can support, level. */
  draw: number;
}

/** ── ORCHESTRATOR ────────────────────────────────────────────────────────────────────────────
 *  The one function the Cash flow tab calls for the projection card. Null is an answer: before
 *  retirement age is known, or with no pot to project, nothing is shown — never a guess. */
/* ─ MK-CF-O-017 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * futurePaycheck
 *
 * Answers ..... ── ORCHESTRATOR ──────────────────────────────────────────────────────────────────────────── The one function the Cash flow tab calls for the projection card.
 *
 * Formula .....
 *     age = age from profile(op)
 *     retire age = A.retire age (or op.target retirement age read as a number (or 67 when missing or zero) when missing)
 *     guaranteed = Σ over guaranteed outside streams(op) of (monthly)
 *     nothing   when age = nothing (or age ≥ retire age when missing or zero)
 *     inputs = will it last inputs({ op, accounts: input.accounts ?? [], assumptions: A, big costs: input.big costs, inflation rate: input.inflation rate, employment status: input.employment status } as any)
 *     nothing   when inputs is missing (or inputs.start balance ≤ 0 when missing or zero)
 *     projected egg = simulate(inputs).projected at retirement
 *     nothing   when projected egg is missing (or projected egg ≤ 0 when missing or zero)
 *     the answer:
 *     retire age = retire age
 *     monthly = round(guaranteed + proj year.draw from savings monthly)
 *     guaranteed = round(guaranteed)
 *     draw = round(proj year.draw from savings monthly)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-CF-M-055 · MK-CF-M-070
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-002 account type (taxable, pre-tax, Roth)
 *               MK-XS-I-017 birth year
 *               MK-XS-I-018 retirement age
 *               MK-XS-I-022 pension monthly amount
 *               MK-XS-I-026 big costs (amount and year)
 *               MK-XS-I-028 assumed return
 *               MK-XS-I-029 inflation rate
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-017
 * Changed ..... not in git yet (—)
 */
export function futurePaycheck(input: {
  op: any; accounts: any[]; assumptions: any; bigCosts?: any[]; inflationRate?: number; employmentStatus?: any;
}): FuturePaycheck | null {
  const { op, assumptions: A } = input;
  const age = ageFromProfile(op);
  const retireAge = A?.retireAge ?? (Number(op?.targetRetirementAge) || 67);
  // OUTSIDE money only — Social Security, pension, annuity, other (MK-CF-F-076). The six-source figure
  // also carries planned withdrawals and the required withdrawal; this card prints a draw beside it,
  // and counting both is the double count his ruling Q-38 (2026-08-20) forbids.
  const guaranteed = guaranteedOutsideStreams(op).reduce((t, st) => t + st.monthly, 0);
  if (age == null || age >= retireAge) return null;
  const inputs = willItLastInputs({ op, accounts: input.accounts ?? [], assumptions: A, bigCosts: input.bigCosts, inflationRate: input.inflationRate, employmentStatus: input.employmentStatus } as any);
  if (!inputs || inputs.start_balance <= 0) return null;
  const projectedEgg = simulate(inputs).projected_at_retirement;
  if (!projectedEgg || projectedEgg <= 0) return null;
  const projYear = buildPaycheckYear(op, {
    nestEgg: projectedEgg,
    sim: { current_age: retireAge, horizon_age: Math.max(retireAge + 5, inputs.horizon_age), mean_return: inputs.mean_return, vol_return: inputs.vol_return, inflation: inputs.inflation, seed: 42, paths: 1000 },
  } as any);
  return { retireAge, monthly: Math.round(guaranteed + projYear.safeDrawMonthly), guaranteed: Math.round(guaranteed), draw: Math.round(projYear.safeDrawMonthly) };
}

const NONE = { op: { birthYear: 1980 }, accounts: [], assumptions: {} };
/** A 45-year-old with $200,000 in a pre-tax 401(k) and $2,000/month of Social Security from 67 — seeded, so the same every time. */
const SAVER = {
  op: { birthYear: 1981, targetRetirementAge: 67, ri_ss: '2000', ri_ss_receiving: 'no', ri_ss_freq: 'monthly', monthlySpending: 3000, incomeSources: ['retirement_income'] },
  accounts: [{ asset_id: 'k', label: '401(k)', tax_bucket: 'PRE_TAX', balance: 200_000, target_return: 0.06, retirement_pct: 100 }],
  assumptions: { expectedReturn: 0.06 },
};
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
    label: 'Draw from savings', unit: 'money', per: 'month', screens: ['/cashflow', '/month-detail', '/paycheck-months'],
    answers: 'The level amount a month the pot can support, so the paycheck does not fall when a bill lands.',
    formula: 'the paycheck year’s level draw from the pot, at the assumed return and horizon',
    inputs: ['MK-NW-I-001 your accounts', 'MK-XS-I-028 assumed return', 'MK-XS-I-018 retirement age'],
    refusal: 'No pot — no draw; the paycheck is the guaranteed income alone.',
    ruled: '2026-10-02',
    worked: { given: GIVEN, answer: '$2,345/month', run: () => futurePaycheck(SAVER as any)?.draw ?? null },
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
