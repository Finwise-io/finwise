// F11 (FCC detailed design, Plan sheet): ONE selector that derives the will-it-last inputs from the
// one shared assumptions object + profile + accounts, and runs the seeded simulation. The Plan hub,
// Home's strip, Cash flow's strip and every decision screen read THIS — never a screen-local copy.
// The derivation mirrors RetirementCockpit's committed-plan inputs exactly (pinned by tests).
import { simulate, retirementSpendMonthly, type RetirementInputs } from './index';
import { ssBenefitAtClaimAge } from './ssTiming';
import { retirementEarmarkedValue, blendedReturn, portfolioActualReturn, monthlyContributionsFromOnboarding, type AssetAccount } from '../assets';
import { taxBucketSplit } from '../decumulation';
import { effectiveRateOnGrossFor } from '../income/tax';
import { totalGrossAnnual, filingStatusOf, stateRateOf } from '../income';
import { retirementIncomeMonthly } from '../income';

const num = (v: any) => { const n = parseFloat(String(v ?? '').replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Same volatility convention as the cockpit: higher return ⇒ more volatility. */
export const volOf = (ret: number) => clamp(ret * 1.7, 0.05, 0.2);

/** Chance band → plain word (word pairs the number so color is never the only signal). */
export function chanceWord(chance: number): 'Likely' | 'Uncertain' | 'Unlikely' {
  return chance >= 80 ? 'Likely' : chance >= 60 ? 'Uncertain' : 'Unlikely';
}

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
  word: 'Likely' | 'Uncertain' | 'Unlikely' | null;
  band: { low: number; high: number } | null;   // best-to-worst chance range when withBand
  horizonAge: number;
  inputs: RetirementInputs | null;   // the exact inputs fed to simulate() (decision screens re-run with patches)
}

/**
 * Derive the committed-plan simulation inputs (identical derivation to the Retirement cockpit):
 * user-set assumption fields win; every null falls back to data-derived defaults (B-31, B-37 lessons).
 */
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
  const guaranteedDefault = retirementIncomeMonthly(op);
  const contribDefault = Math.round(monthlyContributionsFromOnboarding(op));
  const spendDefault = Math.round(retirementSpendMonthly(op) || num(op.monthlySpending) || 5000);
  const retireDefault = num(op.targetRetirementAge) || (a.employmentStatus === 'retired' ? age : 65);
  const horizon = A.horizonAge ?? (num(op.horizonAge) || 90);
  const ssEligibleEffective = A.ssEligible == null ? guaranteedDefault > 0 : A.ssEligible;
  const claimAge = A.ssClaimAge ?? 67;
  // ssMonthly is the age-67 STATEMENT amount; the odds must use the check the chosen claim age
  // actually pays — the same number the SS screen's own compare showed (claim-62 ⇒ ~70% of it).
  const ssIncome = ssEligibleEffective ? (A.ssMonthly != null ? ssBenefitAtClaimAge(A.ssMonthly, claimAge) : guaranteedDefault) : 0;

  const planRetireAge = A.retireAge ?? retireDefault;
  const planSave = A.contribMonthly ?? contribDefault;
  const planSpend = A.spendMonthly ?? spendDefault;
  const planInfl = A.inflation ?? inflDefault;
  const isRetired = a.employmentStatus === 'retired' || age >= planRetireAge;

  return {
    current_age: age,
    retire_age: isRetired ? age : Math.max(age + 1, planRetireAge),
    horizon_age: Math.max((isRetired ? age : planRetireAge) + 1, horizon),
    start_balance: isRetired ? spendableEgg : nestEgg,
    // PRD F9#12: the odds are RMD-tax-aware — the pre-tax slice + the user's own effective rate
    pre_tax_share: (() => {
      const sp = taxBucketSplit(a.accounts ?? []);
      const eggForShare = isRetired ? spendableEgg : nestEgg;
      return eggForShare > 0 ? Math.min(1, sp.preTax / eggForShare) : 0;
    })(),
    rmd_tax_rate: Math.min(0.6, Math.max(0.1, effectiveRateOnGrossFor(Math.max(30000, totalGrossAnnual(op)), filingStatusOf(op), stateRateOf(op)))),
    annual_contribution: (isRetired ? 0 : planSave) * 12,
    contribution_growth: A.salaryGrowth ?? 0,
    retire_monthly_spend_today: planSpend,
    guaranteed_monthly_income: ssIncome,
    guaranteed_start_age: claimAge,
    // founder-approved 2026-08-02: named one-time costs move the odds honestly
    one_off_costs: (a.bigCosts ?? []).map((c: any) => ({ amount: Number(c.amount) || 0, year: Number(c.year) || 0 })).filter((c) => c.amount > 0 && c.year > 0),
    now_year: new Date().getFullYear(),
    inflation: planInfl,
    mean_return: growthRate,
    vol_return: volOf(growthRate),
    paths: 400, seed: 42,
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
    return { captured: false, chance: null, word: null, band: null, horizonAge: inputs?.horizon_age ?? (num(op.horizonAge) || 90), inputs };
  }
  const sim = simulate(a.withBand ? { ...inputs, with_band: true } : inputs) as any;
  const chance = sim.chance_of_success as number;
  // best-to-worst chance range: re-run at pessimistic/optimistic return (±1 vol step) — a plain
  // "range 71–95%" read, not a promise. Deterministic (same seed).
  let band: { low: number; high: number } | null = null;
  if (a.withBand) {
    const lo = simulate({ ...inputs, mean_return: (inputs.mean_return ?? 0.05) - 0.02 } as RetirementInputs).chance_of_success;
    const hi = simulate({ ...inputs, mean_return: (inputs.mean_return ?? 0.05) + 0.02 } as RetirementInputs).chance_of_success;
    band = { low: Math.min(lo, hi, chance), high: Math.max(lo, hi, chance) };
  }
  return { captured: true, chance, word: chanceWord(chance), band, horizonAge: inputs.horizon_age, inputs };
}
