// THE TARGET, SOLVED BACKWARDS — the engine behind the second gauge (founder 2026-08-12).
//
// The founder asked for a nest-egg target and the yearly saving it needs. The danger with a target
// is that a TYPED one fights the odds: someone can be 80% of the way to a number they read in a
// magazine and still have 45% odds, because odds account for spending, Social Security, big costs,
// market luck and the drawdown itself, while a pile is just a pile. So the target is DERIVED from
// the same simulation the odds come from — the pot that puts the odds at 80% — and then the two
// numbers are one fact drawn twice: how likely, and how far.
//
// Both quantities are measured AT RETIREMENT. Comparing money-you-have-today against a
// money-you'll-need-later target would read "48% of the way" for someone genuinely 78% of the way,
// which is the exact contradiction this design exists to avoid.
import { simulate, type RetirementInputs } from '../retirement';

/** 80% is not a round number picked for looks — it is where the odds stop being a coin toss and
 *  the plan holds in four futures out of five. */
export const TARGET_ODDS = 80;

const MAX_TARGET = 100_000_000;      // a ceiling the bisection can never legitimately need
const MAX_SAVING = 5_000_000;        // ditto, per year

/** Smallest x in [lo, hi] where reaching(x) is true, to `tol`. The odds rise monotonically with
 *  money, so a plain bisection is exact enough — and deterministic, because the seed never moves. */
function smallestThatWorks(lo: number, hi: number, tol: number, works: (x: number) => boolean): number | null {
  if (works(lo)) return lo;
  if (!works(hi)) return null;                 // even the ceiling fails — no answer exists
  let a = lo, b = hi;
  while (b - a > tol) {
    const mid = (a + b) / 2;
    if (works(mid)) b = mid; else a = mid;
  }
  return b;
}

const oddsOf = (inp: RetirementInputs) => simulate(inp).chance_of_success;

/** THE TARGET: the balance on day one of retirement that reaches TARGET_ODDS.
 *  Modelled as a plan that starts the day they retire — no more contributions, just the pot and
 *  the years it has to cover. That is what "I need $2M to retire" actually means. */
export function targetAtRetirement(base: RetirementInputs): number | null {
  const atRetirement = (startBalance: number): RetirementInputs => ({
    ...base,
    current_age: base.retire_age,
    retire_age: base.retire_age,
    start_balance: startBalance,
    annual_contribution: 0,
  });
  const found = smallestThatWorks(0, MAX_TARGET, 5_000, (x) => oddsOf(atRetirement(x)) >= TARGET_ODDS);
  // A target is not a precise number, so it rounds — but it rounds UP (founder, 2026-08-13). Rounding
  // to the NEAREST $10,000 could land back BELOW the line the search had just cleared: the audit
  // measured a printed target of $1,370,000 that delivered 76%, not the 80% its own label promised.
  // Erring high keeps the sentence true; erring low makes the app over-promise by a whisker.
  return found == null ? null : Math.ceil(found / 10_000) * 10_000;
}

/** THE YEARLY SAVING: the total annual contribution that reaches TARGET_ODDS on the real plan —
 *  the one with their age, their years left, their spending, their big costs. Returned as the
 *  EXTRA over what they already put away, because that is the number a person can act on. */
export function requiredAnnualSaving(base: RetirementInputs): { total: number; extra: number } | null {
  const withSaving = (annual: number): RetirementInputs => ({ ...base, annual_contribution: annual });
  const found = smallestThatWorks(0, MAX_SAVING, 500, (x) => oddsOf(withSaving(x)) >= TARGET_ODDS);
  if (found == null) return null;
  // rounds UP, same reason as the target above: the bridge sentence says "raises your odds to 80%",
  // and rounding to the nearest $500 delivered 79% (audit, 2026-08-12).
  const total = Math.ceil(found / 500) * 500;
  return { total, extra: Math.max(0, total - (base.annual_contribution ?? 0)) };
}

export interface PlanTarget {
  odds: number;                       // today's odds, the same number every screen shows
  targetAtRetirement: number | null;  // the pot that reaches 80%
  projectedAtRetirement: number;      // what today's plan is on track for, same moment in time
  progressPct: number | null;         // projected ÷ target, 0–100+ (null when no target exists)
  requiredExtraAnnual: number | null; // extra per year to reach 80% (0 when already there)
  requiredExtraMonthly: number | null;
  yearsToRetire: number;
  alreadyThere: boolean;              // odds already at or above 80
  impossible: boolean;                // the honest number is more than they earn
  roomAnnual?: number;                // how much of the required saving fits tax-advantaged
}

/** One call, everything the second gauge and the bridge sentence need.
 *  `annualIncome` decides the impossible state — a required saving larger than what someone earns
 *  is a real answer, but it is never "the ask" (founder 2026-08-12). */
export function planTarget(base: RetirementInputs, annualIncome?: number, roomAnnual?: number): PlanTarget {
  const sim = simulate(base);
  const odds = sim.chance_of_success;
  const projected = Math.round(sim.projected_at_retirement);
  const alreadyThere = odds >= TARGET_ODDS;
  const target = targetAtRetirement(base);
  const saving = alreadyThere ? { total: base.annual_contribution ?? 0, extra: 0 } : requiredAnnualSaving(base);
  const extra = saving?.extra ?? null;
  return {
    odds,
    targetAtRetirement: target,
    projectedAtRetirement: projected,
    progressPct: target && target > 0 ? Math.round((projected / target) * 100) : null,
    requiredExtraAnnual: extra,
    requiredExtraMonthly: extra == null ? null : Math.round(extra / 12),
    yearsToRetire: Math.max(0, base.retire_age - base.current_age),
    alreadyThere,
    // no answer at all, or an answer bigger than their whole income — both mean "saving is not the lever"
    impossible: extra != null && annualIncome != null && annualIncome > 0 ? extra > annualIncome : saving == null,
    roomAnnual,
  };
}

// ── THE LEVERS ────────────────────────────────────────────────────────────────────────────────
// When saving cannot be the answer, these are what actually move the odds. Each is the same
// simulation re-run with ONE change applied, so the points are real, not rules of thumb.

export interface Lever { key: string; label: string; points: number; apply: Partial<RetirementInputs> }

/** Social Security pays roughly 8% more for each year you delay past full retirement age — the
 *  claim-later lever has to raise the CHECK, not just move its start date. */
export function ssUpliftFactor(fromAge: number, toAge: number): number {
  return 1 + 0.08 * Math.max(0, toAge - fromAge);
}

export function leverDeltas(base: RetirementInputs, opts: { spendCutMonthly?: number; retireLaterYears?: number; claimAge?: number } = {}): Lever[] {
  const baseOdds = oddsOf(base);
  const later = opts.retireLaterYears ?? 2;
  const cut = opts.spendCutMonthly ?? 400;
  const claim = opts.claimAge ?? 70;
  const from = base.guaranteed_start_age ?? base.retire_age;
  const candidates: { key: string; label: string; apply: Partial<RetirementInputs> }[] = [
    { key: 'retire-later', label: `Retire at ${base.retire_age + later} instead of ${base.retire_age}`,
      apply: { retire_age: base.retire_age + later, horizon_age: Math.max(base.horizon_age, base.retire_age + later + 1) } },
    { key: 'spend-less', label: `Spend $${cut} less a month`,
      apply: { retire_monthly_spend_today: Math.max(0, base.retire_monthly_spend_today - cut) } },
  ];
  // claiming later only exists as a lever if there is a benefit to claim and it is not already claimed
  if ((base.guaranteed_monthly_income ?? 0) > 0 && from < claim) {
    candidates.push({ key: 'claim-later', label: `Claim Social Security at ${claim}`,
      apply: { guaranteed_start_age: claim, guaranteed_monthly_income: Math.round(base.guaranteed_monthly_income * ssUpliftFactor(from, claim)) } });
  }
  return candidates
    .map((c) => ({ ...c, points: oddsOf({ ...base, ...c.apply }) - baseOdds }))
    .filter((c) => c.points > 0)
    .sort((a, b) => b.points - a.points);
}
