// THE TARGET, SOLVED BACKWARDS — the function behind the second gauge (founder 2026-08-12).
//
// The founder asked for a nest-egg target and the yearly saving it needs. The danger with a target
// is that a TYPED one fights the odds: someone can be 80% of the way to a number they read in a
// magazine and still have 45% odds, because odds account for expenses, Social Security, big costs,
// market luck and the drawdown itself, while a pile is just a pile. So the target is DERIVED from
// the same simulation the odds come from — the pot that puts the odds at 80% — and then the two
// numbers are one fact drawn twice: how likely, and how far.
//
// Both quantities are measured AT RETIREMENT. Comparing money-you-have-today against a
// money-you'll-need-later target would read "48% of the way" for someone genuinely 78% of the way,
// which is the exact contradiction this design exists to avoid.
import { simulate, ssStreamOf, withSsStream, type RetirementInputs } from '../retirement';

/** 80% is not a round number picked for looks — it is where the odds stop being a coin toss and
 *  the plan holds in four futures out of five. */
export const TARGET_ODDS = 80;

const MAX_TARGET = 100_000_000;      // a ceiling the bisection can never legitimately need
const MAX_SAVING = 5_000_000;        // ditto, per year

/** Smallest x in [lo, hi] where reaching(x) is true, to `tol`. The odds rise monotonically with
 *  money, so a plain bisection is exact enough — and deterministic, because the seed never moves. */
/* ─ MK-PL-F-070 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * smallestThatWorks
 *
 * Answers ..... Smallest x in [lo, hi] where reaching(x) is true, to `tol`.
 *
 * Formula .....
 *     lo   when works(lo)
 *     nothing   when !works(hi)
 *     a = lo, b = hi
 *     mid = (a + b) ÷ 2
 *     the answer = b
 *
 * Called by ... MK-PL-F-040 targetAtRetirement · MK-PL-F-041 requiredAnnualSaving
 *               MK-PL-F-042 savingToReachTarget
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-PL-F-044 planTarget · MK-PL-F-041 requiredAnnualSaving
 *               MK-PL-F-042 savingToReachTarget · MK-PL-F-040 targetAtRetirement
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-070
 * Changed ..... not in git yet (—)
 */
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

/* ─ MK-PL-F-071 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * oddsOf
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     simulate(inp).chance of success
 *
 * Called by ... MK-PL-F-040 targetAtRetirement · MK-PL-F-041 requiredAnnualSaving
 *               MK-PL-F-046 leverDeltas
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-PL-F-046 leverDeltas · MK-PL-F-044 planTarget
 *               MK-PL-F-041 requiredAnnualSaving · MK-PL-F-040 targetAtRetirement
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-071
 * Changed ..... not in git yet (—)
 */
const oddsOf = (inp: RetirementInputs) => simulate(inp).chance_of_success;

/** THE TARGET: the balance on day one of retirement that reaches TARGET_ODDS.
 *  Modelled as a plan that starts the day they retire — no more contributions, just the pot and
 *  the years it has to cover. That is what "I need $2M to retire" actually means. */
/* ─ MK-PL-F-040 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * targetAtRetirement
 *
 * Answers ..... THE TARGET: the balance on day one of retirement that reaches TARGET_ODDS.
 *
 * Formula .....
 *     found = smallest that works(0, MAX_TARGET, 5000, (x) => odds of(at retirement(x)) ≥ TARGET_ODDS)
 *     nothing   when found = nothing
 *     total = round up(found ÷ 10000) × 10000
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-PL-F-044 planTarget
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-PL-F-044 planTarget
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-018 retirement age
 *               MK-XS-I-043 their own retirement contribution
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-040
 * Changed ..... 2026-08-13 (8ac5226)
 */
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
  if (found == null) return null;
  // Exact odds (founder 2026-09-14): with no rounding to hide it, the halving search can stop a $10,000
  // step high. Walk down while one step lower still holds — the target must reach 80% and one step
  // lower must miss.
  let total = Math.ceil(found / 10_000) * 10_000;
  while (total >= 10_000 && oddsOf(atRetirement(total - 10_000)) >= TARGET_ODDS) total -= 10_000;
  return total;
}

/** THE YEARLY SAVING: the total annual contribution that reaches TARGET_ODDS on the real plan —
 *  the one with their age, their years left, their expenses, their big costs. Returned as the
 *  EXTRA over what they already put away, because that is the number a person can act on. */
/* ─ MK-PL-F-041 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * requiredAnnualSaving
 *
 * Answers ..... THE YEARLY SAVING: the total annual contribution that reaches TARGET_ODDS on the real plan — the one with their age, their years left, their expenses, their big costs.
 *
 * Formula .....
 *     with saving = (annual: number): retirement inputs => ({ ...base, annual contribution: annual })
 *     found = smallest that works(0, MAX_SAVING, 500, (x) => odds of(with saving(x)) ≥ TARGET_ODDS)
 *     nothing   when found = nothing
 *     total = round up(found ÷ 500) × 500
 *     the answer:
 *     total = total
 *     extra = max(0, total − (base.annual contribution ?? 0))
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-PL-F-044 planTarget
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-PL-F-044 planTarget
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-043 their own retirement contribution
 *
 * Decides .....
 *     · If annual contribution is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-041
 * Changed ..... 2026-08-15 (5670c43)
 */
export function requiredAnnualSaving(base: RetirementInputs): { total: number; extra: number } | null {
  const withSaving = (annual: number): RetirementInputs => ({ ...base, annual_contribution: annual });
  const found = smallestThatWorks(0, MAX_SAVING, 500, (x) => oddsOf(withSaving(x)) >= TARGET_ODDS);
  if (found == null) return null;
  // rounds UP, same reason as the target above: the bridge sentence says "raises your odds to 80%",
  // and rounding to the nearest $500 delivered 79% (audit, 2026-08-12). Exact odds: then walk down while
  // one $500 step lower still holds (2026-09-14).
  let total = Math.ceil(found / 500) * 500;
  while (total >= 500 && oddsOf(withSaving(total - 500)) >= TARGET_ODDS) total -= 500;
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
/* ─ MK-PL-F-042 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * savingToReachTarget
 *
 * Answers ..... The yearly saving whose PROJECTION reaches a typed target.
 *
 * Formula .....
 *     found = smallest that works(0, MAX_SAVING, 500, (x) => projected with(x) ≥ typed target)
 *     nothing   when found = nothing
 *     total = round up(found ÷ 500) × 500
 *     the answer:
 *     total = total
 *     extra = max(0, total − (base.annual contribution ?? 0))
 *
 * Called by ... MK-PL-F-044 planTarget
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-PL-F-044 planTarget
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-043 their own retirement contribution
 *
 * Decides .....
 *     · If annual contribution is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-042
 * Changed ..... 2026-08-15 (5670c43)
 */
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
/* ─ MK-PL-F-043 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * howTheGapCloses
 *
 * Answers ..... Where the money to close the gap actually comes from — the breakdown that stops a person subtracting and concluding the app cannot add up (founder, 2026-08-14).
 *
 * Formula .....
 *     years = max(0, base.retire age − base.current age)
 *     no saving = simulate({ ...base, annual contribution: 0 }).projected at retirement
 *     with saving = simulate({ ...base, annual contribution: total annual saving }).projected at retirement
 *     put in = total annual saving × years
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-018 retirement age
 *               MK-XS-I-043 their own retirement contribution
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-043
 * Changed ..... 2026-08-15 (5670c43)
 */
export function howTheGapCloses(base: RetirementInputs, totalAnnualSaving: number): {
  growthOnExisting: number; putIn: number; growthOnNew: number; projectsTo: number;
} {
  const years = Math.max(0, base.retire_age - base.current_age);
  const noSaving = simulate({ ...base, annual_contribution: 0 }).projected_at_retirement;          // Q49: full precision inside
  const withSaving = simulate({ ...base, annual_contribution: totalAnnualSaving }).projected_at_retirement;
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
/* ─ MK-PL-F-044 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * planTarget
 *
 * Answers ..... One call, everything the second gauge and the bridge sentence need.
 *
 * Formula .....
 *     sim = simulate(base)
 *     odds = sim.chance of success
 *     projected = sim.projected at retirement
 *     already there = odds ≥ TARGET_ODDS
 *     target = target at retirement(base)
 *     typed = typed target   if typed target ≠ nothing and typed target > 0
 *     nothing   otherwise
 *     saving to target = nothing   if typed = nothing
 *     saving to reach target(base, typed)   otherwise
 *     saving = total = base.annual contribution (or 0 when missing)
 *     extra = 0   if already there
 *     required annual saving(base)   otherwise
 *     extra = saving.extra (or nothing when missing)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-018 retirement age
 *               MK-XS-I-043 their own retirement contribution
 *
 * Decides .....
 *     · If annual contribution is missing it uses 0.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-044
 * Changed ..... 2026-08-15 (5670c43)
 */
export function planTarget(base: RetirementInputs, annualIncome?: number, roomAnnual?: number, typedTarget?: number | null): PlanTarget {
  const sim = simulate(base);
  const odds = sim.chance_of_success;
  const projected = sim.projected_at_retirement;   // Q49
  const alreadyThere = odds >= TARGET_ODDS;
  const target = targetAtRetirement(base);
  // THEIR number against TODAY'S money — this dial answers "how far along am I", so it compares what
  // they have now to what they said they want. It is a plain division, never function output.
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
    requiredExtraMonthly: extra == null ? null : extra / 12,   // Q49
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
/* ─ MK-PL-F-045 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * ssUpliftFactor
 *
 * Answers ..... Social Security pays roughly 8% more for each year you delay past full retirement age — the claim-later lever has to raise the CHECK, not just move its start date.
 *
 * Formula .....
 *     1 + 0.08 × max(0, to age − from age)
 *
 * Called by ... MK-PL-F-046 leverDeltas
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-PL-F-046 leverDeltas
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-045
 * Changed ..... 2026-08-12 (20ec5e5)
 */
export function ssUpliftFactor(fromAge: number, toAge: number): number {
  return 1 + 0.08 * Math.max(0, toAge - fromAge);
}

/* ─ MK-PL-F-046 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * leverDeltas
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     base odds = odds of(base)
 *     later = opts.retire later years (or 2 when missing)
 *     cut = opts.spend cut monthly (or 400 when missing)
 *     claim = opts.claim age (or 70 when missing)
 *     from = base.guaranteed start age (or base.retire age when missing)
 *     ss now = ss stream of(base).monthly (or base.guaranteed monthly income (or 0 when missing) when missing)
 *     uplifted = with ss stream(base, math.round(ss now × ss uplift factor(from, claim)), claim)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-018 retirement age
 *               MK-XS-I-021 Social Security claim age
 *               MK-XS-I-036 other guaranteed income
 *
 * Decides .....
 *     · If retire later years is missing it uses 2.
 *     · If spend cut monthly is missing it uses 400.
 *     · If claim age is missing it uses 70.
 *     · If guaranteed monthly income is missing it uses 0.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-046
 * Changed ..... 2026-08-12 (20ec5e5)
 */
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
  const ssNow = ssStreamOf(base)?.monthly ?? base.guaranteed_monthly_income ?? 0;
  if (ssNow > 0 && from < claim) {
    const uplifted = withSsStream(base, Math.round(ssNow * ssUpliftFactor(from, claim)), claim);
    candidates.push({ key: 'claim-later', label: `Claim Social Security at ${claim}`,
      apply: { guaranteed_streams: uplifted.guaranteed_streams, guaranteed_start_age: uplifted.guaranteed_start_age, guaranteed_monthly_income: uplifted.guaranteed_monthly_income } });
  }
  return candidates
    .map((c) => ({ ...c, points: oddsOf({ ...base, ...c.apply }) - baseOdds }))
    .filter((c) => c.points > 0)
    .sort((a, b) => b.points - a.points);
}
