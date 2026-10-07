// F11 (FCC detailed design, Plan sheet): ONE selector that derives the will-it-last inputs from the
// one shared assumptions object + profile + accounts, and runs the seeded simulation. The Plan hub,
// Home's strip, Cash flow's strip and every decision screen read THIS — never a screen-local copy.
// The derivation mirrors RetirementCockpit's committed-plan inputs exactly (pinned by tests).
import { ageAttainedInYear } from '../income/limits';
import { simulate, retirementSpendMonthly, type RetirementInputs } from './index';
import { inflationRateInForce } from './inflation';
import { ssBenefitAt } from './ssTiming';
import { retirementEarmarkedValue, blendedReturn, blendedVolatility, portfolioActualReturn, monthlyContributionsFromOnboarding, type AssetAccount } from '../assets';
import { taxBucketSplit } from '../decumulation';
import { effectiveRateOnGrossFor } from '../income/tax';
import { totalGrossAnnual, filingStatusOf, stateRateOf } from '../income';
import { retirementIncomeMonthly, guaranteedOutsideStreams, over65CountOf } from '../income';

/* ─ MK-PL-F-079 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * numOrZero
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     n = the number in the text after every character but digits and the decimal point is removed
 *     the answer = 0 when that is not a number, else n
 *
 * Called by ... MK-PL-F-067 willItLastInputs · MK-PL-F-068 selectWillItLast
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-CF-O-017 futurePaycheck · MK-PL-F-068 selectWillItLast
 *               MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-079
 * Changed ..... not in git yet (—)
 */
const numOrZero = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
/* ─ MK-PL-F-077 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * clamp
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     max(lo, min(hi, v))
 *
 * Called by ... MK-PL-F-008 rmdSchedule · MK-PL-F-065 volOf
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-CF-O-017 futurePaycheck · MK-PL-F-008 rmdSchedule
 *               MK-PL-F-068 selectWillItLast · MK-PL-F-065 volOf
 *               MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-077
 * Changed ..... not in git yet (—)
 */
export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Same volatility convention as the cockpit: higher return ⇒ more volatility. */
/** SCENARIO fallback only: when someone types a return on the Plan sliders with nothing held yet,
 *  there are no holdings to measure, so risk is derived from the return. Real portfolios use
 *  blendedVolatility (per-class figures from the same long-run series as the returns). */
/* ─ MK-PL-F-065 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * volOf
 *
 * Answers ..... Same volatility convention as the cockpit: higher return ⇒ more volatility.
 *
 * Formula .....
 *     hold ret × 1.7 between 0.05 and 0.2
 *
 * Called by ... MK-PL-F-067 willItLastInputs
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-CF-O-017 futurePaycheck · MK-PL-F-068 selectWillItLast
 *               MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-026 big costs (amount and year)
 *               MK-XS-I-029 inflation rate
 *               MK-XS-I-044 the person’s own plan overrides
 *
 * Decides .....
 *     · Never lets the answer fall below 5% or rise above 20%.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-065
 * Changed ..... 2026-08-12 (bb56c4d)
 */
export const volOf = (ret: number) => clamp(ret * 1.7, 0.05, 0.2);

// chanceWord (Likely/Uncertain/Unlikely) was deleted 2026-08-12 on the founder's ruling: a
// percentage already carries the uncertainty, so naming it as well said the same thing twice —
// and at 60% it hedged a hedge. The number stands alone now, everywhere.

export interface WillItLastArgs {
  bigCosts?: { amount: number; year: number; label?: string }[];   // store.bigCosts (big one-time costs)
  op: Record<string, any> | null;            // onboarding profile
  accounts: AssetAccount[];                  // resolved rows (resolveNetWorthRows output)
  assumptions: Record<string, any>;          // store.retirementAssumptions (the ONE shared object)
  inflationRate?: number;                    // store economic data, e.g. 3.2 (percent)
  employmentStatus?: string | null;          // store.employmentStatus
  withBand?: boolean;
}

export interface WillItLastResult {
  captured: boolean;                 // the three questions answered (age, expenses, something saved)?
  chance: number | null;             // Monte-Carlo % (null when not captured — never a guessed number)
  /** B6: gone from the result — the 'best-to-worst range' was two extra runs at different return
   *  assumptions, a sensitivity test wearing a distribution's clothes. Dropped, per the founder. */
  band: null;
  /** The unrounded odds, for internal deltas only. The person sees `chance`. */
  chanceExact: number | null;
  horizonAge: number;
  inputs: RetirementInputs | null;   // the exact inputs fed to simulate() (decision screens re-run with patches)
}

/**
 * Derive the committed-plan simulation inputs (identical derivation to the Retirement cockpit):
 * user-set assumption fields win; every null falls back to data-derived defaults (B-31, B-37 lessons).
 */

/** B6 (founder brief 2026-08-20): the odds a person sees, to the nearest 5 — with one honesty
 *  guard at each end: 100 means "every simulated future worked" and 0 means "none did", and
 *  neither claim may be minted by rounding. A 98 shows as 95, never as a certainty. */
/* ─ MK-PL-F-066 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * displayOdds
 *
 * Answers ..... B6 (founder brief 2026-08-20): the odds a person sees, to the nearest 5 — with one honesty guard at each end: 100 means "every simulated future worked" and 0 means "none did", and neither claim may be minted by rounding.
 *
 * Formula .....
 *     min(100, max(0, round(chance, 6 dp)))
 *
 * Called by ... MK-PL-F-068 selectWillItLast
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-PL-F-068 selectWillItLast
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Rounds the answer to 6 decimal places.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-066
 * Changed ..... 2026-08-20 (16a56f7)
 */
export function displayOdds(chance: number): number {
  // founder 2026-09-14: "use exact everywhere no rounding for odds" — replaces B6's nearest 5. Only
  // floating-point noise is removed — never a real digit (400 futures give quarters, 1,000 give tenths).
  return Math.min(100, Math.max(0, Math.round(chance * 1e6) / 1e6));
}

/* ─ MK-PL-F-067 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * willItLastInputs
 *
 * Answers ..... What goes into working out the odds?
 *
 * Formula .....
 *     op = op (or none when missing)
 *     a = assumptions (or none when missing)
 *     age = age attained in year(num or zero(op.birth year) or nothing)
 *     nothing   when age = nothing
 *     nest egg = retirement earmarked value(accounts)
 *     bequest = num or zero(op.legacy target)
 *     spendable egg = max(0, nest egg − bequest)
 *     bench blended = blended return(accounts) (or 0.06 when missing)
 *     actual blended = portfolio actual return(accounts)
 *     return basis = A.return basis (or 'benchmark' when missing)
 *     scenario return = A.expected return (or bench blended when missing)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-O-017 futurePaycheck · MK-PL-F-068 selectWillItLast
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-O-017 futurePaycheck · MK-PL-F-068 selectWillItLast
 *
 * Serves ...... MK-PL-M-008 · MK-PL-M-011 · MK-PL-M-029
 * Reads ....... MK-XS-I-017 birth year
 *               MK-XS-I-018 retirement age
 *               MK-XS-I-020 Social Security monthly amount
 *               MK-XS-I-021 Social Security claim age
 *               MK-XS-I-026 big costs (amount and year)
 *               MK-XS-I-028 assumed return
 *               MK-XS-I-029 inflation rate
 *               MK-XS-I-036 other guaranteed income
 *
 * Decides .....
 *     · If social security claim age is missing it uses 67.
 *     · If monthly is missing it uses 0.
 *     · If salary growth is missing it uses 0.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Rounds the answer to a whole number.
 *     · The current age is birthday-aware when the birth month is known, else the year-attained age (G9, 2026-09-12).
 *     · Inflation: the percent figure entered (2.5) is divided by 100 before use — 0.025 a year (G5). The effective tax rate on pre-tax withdrawals is the person's own, from filing status and income (income floored at $30,000), clamped between 10% and 60% (G7 / G35).
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-067
 * Changed ..... 2026-07-13 (9ac80a7)
 */
export function willItLastInputs(a: WillItLastArgs): RetirementInputs | null {
  const op = a.op ?? {};
  const A = a.assumptions ?? {};
  const age = ageAttainedInYear(numOrZero(op.birthYear) || null);   // G9: the plan steps calendar YEARS, so its age is the one attained this year — the birthday-aware age is for what a person reads (ageToday)
  if (age == null) return null;

  const nestEgg = retirementEarmarkedValue(a.accounts);
  const bequest = numOrZero(op.legacyTarget);
  const spendableEgg = Math.max(0, nestEgg - bequest);

  // with nothing set aside for retirement there is no blended return (MK-NW-F-037); the plan still needs a
  // rate to run on, and the generic 6% is that rate, chosen here and not inside the function
  const benchBlended = blendedReturn(a.accounts) ?? 0.06;
  const actualBlended = portfolioActualReturn(a.accounts);
  const returnBasis: 'benchmark' | 'actual' | 'scenario' = A.returnBasis ?? 'benchmark';
  const scenarioReturn = A.expectedReturn ?? benchBlended;
  const growthRate = returnBasis === 'actual' ? (actualBlended ?? benchBlended) : returnBasis === 'scenario' ? scenarioReturn : benchBlended;

  // brief Q-50 (2026-08-20) (G30, 2026-09-08): the dated 30-year average — never the feed handed in as inflationRate
  const inflDefault = inflationRateInForce(null).rate;
  // B5: the plan's guaranteed income is OUTSIDE money only — withdrawals and RMDs are what the
  // simulation computes, and counting them let the pot fund itself (the odds rose with expenses).
  const outside = guaranteedOutsideStreams(op);
  const ssBase = outside.find((st) => st.kind === 'ss');
  const flatStreams = outside.filter((st) => st.kind !== 'ss');
  const outsideTotal = outside.reduce((t, st) => t + st.monthly, 0);
  const contribDefault = Math.round(monthlyContributionsFromOnboarding(op) ?? 0);   // not answered → the plan's own default of $0 (Plan build: say "not entered")
  const spendDefault = Math.round(retirementSpendMonthly(op) || numOrZero(op.monthlySpending) || 5000);
  const retireDefault = numOrZero(op.targetRetirementAge) || (a.employmentStatus === 'retired' ? age : 65);
  const horizon = A.horizonAge ?? (numOrZero(op.horizonAge) || 90);
  const ssEligibleEffective = A.ssEligible == null ? outsideTotal > 0 : A.ssEligible;
  const claimAge = A.ssClaimAge ?? 67;
  // B2: ssMonthly is the statement amount at the person's OWN full retirement age (66y2m–67 by
  // birth year), and the factor is anchored there — not at a hard-coded 67.
  const ssIncome = ssEligibleEffective
    ? (A.ssMonthly != null ? ssBenefitAt(A.ssMonthly, claimAge, numOrZero(op.birthYear) || null) : (ssBase?.monthly ?? 0))
    : 0;

  const planRetireAge = A.retireAge ?? retireDefault;
  const planSave = A.contribMonthly ?? contribDefault;
  const planSpend = A.spendMonthly ?? spendDefault;
  const planInfl = A.inflation ?? inflDefault;
  const isRetired = a.employmentStatus === 'retired' || age >= planRetireAge;

  return {
    current_age: age,
    retire_age: isRetired ? age : Math.max(age + 1, planRetireAge),
    horizon_age: Math.max((isRetired ? age : planRetireAge) + 1, horizon),
    // FOUNDER FIX 2026-08-18: money someone means to leave behind comes off the spendable pot
    // ALWAYS, not only once they have retired. It used to be `isRetired ? spendableEgg : nestEgg`,
    // so a person still working saw identical odds with and without a legacy target — 38% either
    // way on a test plan — and then watched the number fall the day they retired, because a promise
    // made years earlier finally started counting. The years when the plan can still be CHANGED
    // were exactly the years it said nothing.
    start_balance: spendableEgg,
    // PRD F9#12: the odds are RMD-tax-aware — the pre-tax slice + the user's own effective rate
    pre_tax_share: (() => {
      const sp = taxBucketSplit(a.accounts ?? []);
      const eggForShare = spendableEgg;   // the same pot the odds run on — see start_balance above
      return eggForShare > 0 ? Math.min(1, sp.preTax / eggForShare) : 0;
    })(),
    rmd_tax_rate: Math.min(0.6, Math.max(0.1, effectiveRateOnGrossFor(Math.max(30000, totalGrossAnnual(op)), filingStatusOf(op), stateRateOf(op), over65CountOf(op)))),
    annual_contribution: (isRetired ? 0 : planSave) * 12,
    contribution_growth: A.salaryGrowth ?? 0,
    retire_monthly_spend_today: planSpend,
    // B1: streams — Social Security inflates from its claim age; pensions/annuities stay flat.
    // The legacy pair carries the outside TOTAL for anything still displaying it.
    guaranteed_streams: [
      ...(ssIncome > 0 ? [{ kind: 'ss' as const, monthly: ssIncome, inflates: true, start_age: claimAge }] : []),
      ...flatStreams.map((st) => ({ kind: st.kind, monthly: st.monthly, inflates: st.inflates })),
    ],
    guaranteed_monthly_income: ssIncome + flatStreams.reduce((t, st) => t + st.monthly, 0),
    guaranteed_start_age: claimAge,
    // founder-approved 2026-08-02: named one-time costs move the odds honestly
    one_off_costs: (a.bigCosts ?? []).map((c: any) => ({ amount: Number(c.amount) || 0, year: Number(c.year) || 0 })).filter((c) => c.amount > 0 && c.year > 0),
    now_year: new Date().getFullYear(),
    inflation: planInfl,
    mean_return: growthRate,
    // 2026-08-11: the portfolio's OWN volatility, weighted like its return — not `return × 1.7`.
    // The scenario rule still applies when the user has typed a return with nothing held yet.
    vol_return: blendedVolatility(a.accounts ?? []) ?? volOf(growthRate),   // nothing set aside → the rate's own band, chosen here
    paths: 1000, seed: 42,   // B6: at 400 draws an 85% result carries ±3.5 points
  } as RetirementInputs;
}

/**
 * The one will-it-last read. `captured` gates the number: no fake percent when the person hasn't
 * answered the three questions (their age, what they spend, what they have) — the design's
 * "never a chance computed from guessed inputs" rule.
 */
/* ─ MK-PL-F-068 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * selectWillItLast
 *
 * Answers ..... The one will-it-last read.
 *
 * Formula .....
 *     op = op (or none when missing)
 *     inputs = will it last inputs(a)
 *     nest egg = retirement earmarked value(accounts)
 *     spend known = (retirement spend monthly(op) or num or zero(op.monthly expenses)) > 0 (or (assumptions.spend monthly ?? nothing) ≠ nothing when missing or zero)
 *     captured = inputs ≠ nothing and spend known and nest egg > 0
 *     the answer:
 *     captured = false
 *     chance = nothing
 *     chance exact = nothing
 *     band = nothing
 *     horizon age = inputs.horizon age (or num or zero(op.horizon age) (or 90 when missing or zero) when missing)
 *     inputs = inputs
 *     sim = simulate(with band ? { ...inputs, with band: true } : inputs) as any
 *     exact = sim.chance of success as number
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-PL-M-034 · MK-XS-M-002
 * Reads ....... MK-XS-I-044 the person’s own plan overrides
 * Ruled by .... DEC-0211 · DEC-0366 · DEC-0505
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-068
 * Changed ..... 2026-08-20 (16a56f7)
 */
export function selectWillItLast(a: WillItLastArgs): WillItLastResult {
  const op = a.op ?? {};
  const inputs = willItLastInputs(a);
  const nestEgg = retirementEarmarkedValue(a.accounts);
  const spendKnown = (retirementSpendMonthly(op) || numOrZero(op.monthlySpending)) > 0 || (a.assumptions?.spendMonthly ?? null) != null;
  const captured = inputs != null && spendKnown && nestEgg > 0;
  if (!captured || !inputs) {
    return { captured: false, chance: null, chanceExact: null, band: null, horizonAge: inputs?.horizon_age ?? (numOrZero(op.horizonAge) || 90), inputs };
  }
  const sim = simulate(a.withBand ? { ...inputs, with_band: true } : inputs) as any;
  const exact = sim.chance_of_success as number;
  // B6: the DISPLAYED odds round to the nearest 5 — even at 1,000 paths the figure carries about
  // ±2 points of sampling noise, and a precise-looking 83% implies knowledge nobody has.
  return { captured: true, chance: displayOdds(exact), chanceExact: exact, band: null, horizonAge: inputs.horizon_age, inputs };
}
