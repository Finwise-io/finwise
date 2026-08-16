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

// ── THE TYPED TARGET ──────────────────────────────────────────────────────────────────────────
// FOUNDER CORRECTION, and it reverses the note at the top of this file. The target is NOT ours to
// derive: "target nest egg is a number entered by the user based on what is their target, and odds
// are simply calculated based on target nest egg entered by the user." Two different questions,
// answered separately, and the app must be able to say both without either looking wrong:
//   the TARGET dial  — am I hitting my own number?
//   the ODDS dial    — will the money actually last?
// A typed target CANNOT move the odds. Nothing about naming a number changes whether money survives
// being spent, so the two dials are independent by construction, not by convention.
//
// We still compute the 80%-odds pot, but only as a SUGGESTION offered when the field is blank — and
// it is labelled as ours wherever it appears (founder, 2026-08-14).

/** The yearly saving whose PROJECTION reaches a typed target. A different question from
 *  `requiredAnnualSaving`, which solves for 80% ODDS — and the answers differ a lot.
 *
 *  SOLVED, NOT FORMULA'D. A closed-form annuity calculation lands short of the very target it just
 *  promised to reach, because the projection is a simulated median rather than a smooth compounding
 *  curve. Measured on Pat: the formula gives $82,000 and lands $22,000 SHORT. So: search, then round
 *  UP — the returned figure must actually reach the target and one step lower must miss. */
export function savingToReachTarget(base: RetirementInputs, typedTarget: number): { total: number; extra: number } | null {
  const projectedWith = (annual: number) =>
    simulate({ ...base, annual_contribution: annual }).projected_at_retirement;
  const found = smallestThatWorks(0, MAX_SAVING, 500, (x) => projectedWith(x) >= typedTarget);
  if (found == null) return null;
  const total = Math.ceil(found / 500) * 500;
  return { total, extra: Math.max(0, total - (base.annual_contribution ?? 0)) };
}

/** Where the money to close the gap actually comes from — the breakdown that stops a person
 *  subtracting and concluding the app cannot add up (founder, 2026-08-14).
 *
 *  Pat's own reading of the first draft: "$77,500 x 7 = $542,500, so how does that close $1,090,848?"
 *  It does not. Growth does nearly half the work, and the sentence never said growth existed. */
export function howTheGapCloses(base: RetirementInputs, totalAnnualSaving: number): {
  growthOnExisting: number; putIn: number; growthOnNew: number; projectsTo: number;
} {
  const years = Math.max(0, base.retire_age - base.current_age);
  const noSaving = Math.round(simulate({ ...base, annual_contribution: 0 }).projected_at_retirement);
  const withSaving = Math.round(simulate({ ...base, annual_contribution: totalAnnualSaving }).projected_at_retirement);
  const putIn = totalAnnualSaving * years;
  return {
    growthOnExisting: noSaving - base.start_balance,
    putIn,
    growthOnNew: withSaving - noSaving - putIn,
    projectsTo: withSaving,
  };
}

export interface PlanTarget {
  odds: number;                       // today's odds, the same number every screen shows
  typedTarget: number | null;         // THEIRS — what they entered, null until they do
  suggestedTarget: number | null;     // OURS — the 80%-odds pot, offered only while theirs is blank
  targetPct: number | null;           // today's money ÷ their typed target (never ÷ ours)
  shortOfTarget: number | null;       // typed target − today's money; negative means past it
  savingToTarget: { total: number; extra: number } | null;   // reaches THEIR number
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
export function planTarget(base: RetirementInputs, annualIncome?: number, roomAnnual?: number, typedTarget?: number | null): PlanTarget {
  const sim = simulate(base);
  const odds = sim.chance_of_success;
  const projected = Math.round(sim.projected_at_retirement);
  const alreadyThere = odds >= TARGET_ODDS;
  const target = targetAtRetirement(base);
  // THEIR number against TODAY'S money — this dial answers "how far along am I", so it compares what
  // they have now to what they said they want. It is a plain division, never engine output.
  const typed = typedTarget != null && typedTarget > 0 ? typedTarget : null;
  const savingToTarget = typed == null ? null : savingToReachTarget(base, typed);
  const saving = alreadyThere ? { total: base.annual_contribution ?? 0, extra: 0 } : requiredAnnualSaving(base);
  const extra = saving?.extra ?? null;
  return {
    odds,
    typedTarget: typed,
    // ours is offered ONLY while theirs is blank; the moment they type, our number stops existing
    suggestedTarget: typed == null ? target : null,
    targetPct: typed == null ? null : Math.round((base.start_balance / typed) * 100),
    shortOfTarget: typed == null ? null : typed - base.start_balance,
    savingToTarget,
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
