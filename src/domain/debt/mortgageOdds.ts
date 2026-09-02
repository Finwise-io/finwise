// WHAT PAYING THE MORTGAGE DOWN DOES TO HOW LONG YOUR MONEY LASTS.
//
// Founder ruling, 2026-08-12, and it is the rule this file exists to obey:
//   "Instead of artificially changing odds — let's look to get the numbers right.
//    Odds are output and we should not modify it."
//
// There is no such thing here as "the mortgage penalty on your odds". There is only: model the
// money honestly, run it, and report what comes out. TWO FULL RUNS, never a subtraction — the
// design's placeholder was `67 − round(extra/500) × 2`, and a formula like that will happily print
// a number that no simulation ever produced.
//
// Modelling the trade honestly means BOTH halves, or it is a smear rather than a comparison:
//   • while the loan runs, the extra payment is money NOT going into savings;
//   • once it clears — sooner, because of the extra — the whole payment stops leaving.
import { simulate, type RetirementInputs } from '../retirement';
import { monthsToClear } from './index';

export interface MortgageOddsEffect {
  /** the plan exactly as it stands today */
  before: number;
  /** the same plan with the extra payment genuinely modelled */
  after: number;
  /** the calendar year the loan clears without the extra payment */
  payoffYear: number;
  /** …and with it */
  fasterPayoffYear: number;
}


/**
 * Run the plan twice and report both results.
 *
 * `base` must be the plan as committed, with the mortgage ALREADY expressed as a `recurring_until`
 * payment — the founder's ruling is that we tell the person we include their loan for as long as it
 * runs, so it is never buried inside their spending answer.
 */
/* ─ MK-CF-F-042 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * mortgageOddsEffect
 *
 * Answers ..... Run the plan twice and report both results.
 *
 * Formula .....
 *     slow = months to clear(balance, annual rate, monthly payment)
 *     fast = months to clear(balance, annual rate, monthly payment + extra monthly)
 *     nothing   when slow = nothing (or fast = nothing (or extra monthly ≤ 0 when missing or zero) when missing or zero)
 *     year of = (months: number) => now year + round down((months − 1) ÷ 12)
 *     payoff year = year of(slow)
 *     faster payoff year = year of(fast)
 *     the answer = { before, after, payoff year, faster payoff year }
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *
 * Decides .....
 *     · Treats a year as twelve equal months.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-042
 * Changed ..... 2026-08-15 (a91c65b)
 */
export function mortgageOddsEffect(args: {
  base: RetirementInputs;
  balance: number;
  annualRate: number;
  monthlyPayment: number;
  extraMonthly: number;
  nowYear: number;
}): MortgageOddsEffect | null {
  const { base, balance, annualRate, monthlyPayment, extraMonthly, nowYear } = args;
  const slow = monthsToClear(balance, annualRate, monthlyPayment);
  const fast = monthsToClear(balance, annualRate, monthlyPayment + extraMonthly);
  if (slow == null || fast == null || extraMonthly <= 0) return null;

  // the calendar year the LAST payment falls in. Rounding up instead put a 338-month loan in 2055
  // when its final payment lands in October 2054 — a year of a payment that does not exist, on the
  // one figure a person will check against their own mortgage statement.
  const yearOf = (months: number) => nowYear + Math.floor((months - 1) / 12);
  const payoffYear = yearOf(slow);
  const fasterPayoffYear = yearOf(fast);

  // RUN ONE — as it stands: the payment runs to its natural end, savings as planned.
  const before = simulate({
    ...base,
    recurring_until: [{ annual: monthlyPayment * 12, through_year: payoffYear }],
  } as RetirementInputs).chance_of_success;

  // RUN TWO — the money genuinely moved. The payment is bigger and ends sooner; the extra comes out
  // of savings until it does, and the whole payment frees back into savings afterwards for any
  // years still before retirement.
  const after = simulate({
    ...base,
    recurring_until: [{ annual: (monthlyPayment + extraMonthly) * 12, through_year: fasterPayoffYear }],
    contribution_adjustments: [
      { annual: -extraMonthly * 12, from_year: nowYear, through_year: fasterPayoffYear },
      { annual: (monthlyPayment + extraMonthly) * 12, from_year: fasterPayoffYear + 1 },
    ],
  } as RetirementInputs).chance_of_success;

  return { before, after, payoffYear, fasterPayoffYear };
}
