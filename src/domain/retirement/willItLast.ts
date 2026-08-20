// F11 (FCC detailed design, Plan sheet): ONE selector that derives the will-it-last inputs from the
// one shared assumptions object + profile + accounts, and runs the seeded simulation. The Plan hub,
// Home's strip, Cash flow's strip and every decision screen read THIS — never a screen-local copy.
// The derivation mirrors RetirementCockpit's committed-plan inputs exactly (pinned by tests).
import { simulate, retirementSpendMonthly, type RetirementInputs } from './index';
import { ssBenefitAt } from './ssTiming';
import { retirementEarmarkedValue, blendedReturn, blendedVolatility, portfolioActualReturn, monthlyContributionsFromOnboarding, type AssetAccount } from '../assets';
import { taxBucketSplit } from '../decumulation';
import { effectiveRateOnGrossFor } from '../income/tax';
import { totalGrossAnnual, filingStatusOf, stateRateOf } from '../income';
import { retirementIncomeMonthly, guaranteedOutsideStreams } from '../income';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Same volatility convention as the cockpit: higher return ⇒ more volatility. */
/** SCENARIO fallback only: when someone types a return on the Plan sliders with nothing held yet,
 *  there are no holdings to measure, so risk is derived from the return. Real portfolios use
 *  blendedVolatility (per-class figures from the same long-run series as the returns). */
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
  captured: boolean;                 // the three questions answered (age, spending, something saved)?
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
export function displayOdds(chance: number): number {
  const r = Math.min(100, Math.max(0, Math.round(chance / 5) * 5));
  if (r === 100 && chance < 99.5) return 95;
  if (r === 0 && chance > 0.5) return 5;
  return r;
}

export function willItLastInputs(a: WillItLastArgs): RetirementInputs | null {
  const op = a.op ?? {};
  const A = a.assumptions ?? {};
  const age = op.birthYear ? new Date().getFullYear() - num(op.birthYear) : null;
  if (age == null) return null;

  const nestEgg = retirementEarmarkedValue(a.accounts);
  const bequest = num(op.legacyTarget);
  const spendableEgg = Math.max(0, nestEgg - bequest);

  const benchBlended = blendedReturn(a.accounts);
  const actualBlended = portfolioActualReturn(a.accounts);
  const returnBasis: 'benchmark' | 'actual' | 'scenario' = A.returnBasis ?? 'benchmark';
  const scenarioReturn = A.expectedReturn ?? benchBlended;
  const growthRate = returnBasis === 'actual' ? (actualBlended ?? benchBlended) : returnBasis === 'scenario' ? scenarioReturn : benchBlended;

  const inflDefault = (a.inflationRate ?? 2.5) / 100;
  // B5: the plan's guaranteed income is OUTSIDE money only — withdrawals and RMDs are what the
  // simulation computes, and counting them let the pot fund itself (the odds rose with spending).
  const outside = guaranteedOutsideStreams(op);
  const ssBase = outside.find((st) => st.kind === 'ss');
  const flatStreams = outside.filter((st) => st.kind !== 'ss');
  const outsideTotal = outside.reduce((t, st) => t + st.monthly, 0);
  const contribDefault = Math.round(monthlyContributionsFromOnboarding(op));
  const spendDefault = Math.round(retirementSpendMonthly(op) || num(op.monthlySpending) || 5000);
  const retireDefault = num(op.targetRetirementAge) || (a.employmentStatus === 'retired' ? age : 65);
  const horizon = A.horizonAge ?? (num(op.horizonAge) || 90);
  const ssEligibleEffective = A.ssEligible == null ? outsideTotal > 0 : A.ssEligible;
  const claimAge = A.ssClaimAge ?? 67;
  // B2: ssMonthly is the statement amount at the person's OWN full retirement age (66y2m–67 by
  // birth year), and the factor is anchored there — not at a hard-coded 67.
  const ssIncome = ssEligibleEffective
    ? (A.ssMonthly != null ? ssBenefitAt(A.ssMonthly, claimAge, num(op.birthYear) || null) : (ssBase?.monthly ?? 0))
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
    rmd_tax_rate: Math.min(0.6, Math.max(0.1, effectiveRateOnGrossFor(Math.max(30000, totalGrossAnnual(op)), filingStatusOf(op), stateRateOf(op)))),
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
    vol_return: (a.accounts ?? []).length ? blendedVolatility(a.accounts) : volOf(growthRate),
    paths: 1000, seed: 42,   // B6: at 400 draws an 85% result carries ±3.5 points
  } as RetirementInputs;
}

/**
 * The one will-it-last read. `captured` gates the number: no fake percent when the person hasn't
 * answered the three questions (their age, what they spend, what they have) — the design's
 * "never a chance computed from guessed inputs" rule.
 */
export function selectWillItLast(a: WillItLastArgs): WillItLastResult {
  const op = a.op ?? {};
  const inputs = willItLastInputs(a);
  const nestEgg = retirementEarmarkedValue(a.accounts);
  const spendKnown = (retirementSpendMonthly(op) || num(op.monthlySpending)) > 0 || (a.assumptions?.spendMonthly ?? null) != null;
  const captured = inputs != null && spendKnown && nestEgg > 0;
  if (!captured || !inputs) {
    return { captured: false, chance: null, chanceExact: null, band: null, horizonAge: inputs?.horizon_age ?? (num(op.horizonAge) || 90), inputs };
  }
  const sim = simulate(a.withBand ? { ...inputs, with_band: true } : inputs) as any;
  const exact = sim.chance_of_success as number;
  // B6: the DISPLAYED odds round to the nearest 5 — even at 1,000 paths the figure carries about
  // ±2 points of sampling noise, and a precise-looking 83% implies knowledge nobody has.
  return { captured: true, chance: displayOdds(exact), chanceExact: exact, band: null, horizonAge: inputs.horizon_age, inputs };
}
