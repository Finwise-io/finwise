// Goals & Contribution module (spec service 4). Owns `goals/{uid}`.
// Tracks savings goals + a simple priority waterfall for routing surplus cash.
import type { UserId, EntityId } from '../_shared/ids';
import { newEntityId } from '../_shared/ids';
import { toNum } from '../_shared/num';
import { getUserDoc, setUserDoc } from '../_shared/firestore';

export interface Goal {
  goal_id: EntityId;
  label: string;
  target_amount: number;
  target_year: number | null;
}
export interface GoalsDoc { user_id: UserId; goals: Goal[]; last_updated?: any; }

export interface GoalProgress extends Goal { months_to_goal: number | null; }
export interface GoalsState {
  user_id: UserId;
  goals: GoalProgress[];
  monthly_capacity: number;
}

/** Months to reach each goal at the given monthly savings capacity. */
/* ─ MK-PL-F-011 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * buildGoalsState
 *
 * Answers ..... Months to reach each goal at the given monthly savings capacity.
 *
 * Formula .....
 *     user id = uid
 *     goals = progress
 *     monthly capacity = monthly capacity
 *
 * Called by ... MK-XS-F-031 buildSnapshot
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-031 buildSnapshot · MK-XS-F-032 snapshotFromOnboarding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-027 goals (target, saved, date)
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-011
 * Changed ..... 2026-06-05 (f742136)
 */
export function buildGoalsState(uid: UserId, goals: Goal[], monthlyCapacity: number): GoalsState {
  const progress = goals.map((g) => ({
    ...g,
    months_to_goal: monthlyCapacity > 0 ? Math.ceil(g.target_amount / monthlyCapacity) : null,
  }));
  return { user_id: uid, goals: progress, monthly_capacity: (monthlyCapacity) };
}

/** Priority waterfall (spec): emergency fund → toxic debt (>7%) → 401k match → Roth → goals.
 *  Returns the ordered routing of a monthly surplus across the steps. */
export interface WaterfallStep { name: string; allocated: number; }
/* ─ MK-PL-F-012 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * waterfall
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     left = max(0, surplus)
 *     steps = []
 *     a = min(left, max(0, need)); left -= a; steps.push({ name, allocated: (a) })
 *     the answer = steps
 *
 * Called by ... MK-CF-F-092 incomeMonthlyGrid · MK-PL-F-011 buildGoalsState
 *
 * Reaches ..... 69 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-005 actualMonthFlow
 *               MK-CF-F-012 annualCashflow · MK-CF-F-210 annualOfSource
 *               … and 51 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-027 goals (target, saved, date)
 *
 * Decides .....
 *     · If emergency gap is missing it uses 0.
 *     · If toxic debt is missing it uses 0.
 *     · If employer match monthly is missing it uses 0.
 *     · Never lets surplus fall below 0.
 *     · Never lets need fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-012
 * Changed ..... 2026-06-05 (f742136)
 */
export function waterfall(surplus: number, opts: {
  emergencyGap?: number; toxicDebt?: number; employerMatchMonthly?: number; rothRoom?: number;
} = {}): WaterfallStep[] {
  let left = Math.max(0, surplus);
  const steps: WaterfallStep[] = [];
  const take = (name: string, need: number) => {
    const a = Math.min(left, Math.max(0, need)); left -= a; steps.push({ name, allocated: (a) });
  };
  take('Emergency fund', opts.emergencyGap ?? 0);
  take('Toxic debt (>7%)', opts.toxicDebt ?? 0);
  take('401(k) employer match', opts.employerMatchMonthly ?? 0);
  take('Roth IRA', opts.rothRoom ?? Infinity);
  if (left > 0) steps.push({ name: 'Other goals', allocated: (left) });
  return steps;
}

/* ─ MK-PL-F-013 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * goalsFromOnboarding
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     raw = goals   if array.is array(goals)
 *     []   otherwise
 *     the answer:
 *     user id = uid
 *     goals = goals
 *
 * Called by ... MK-XS-F-031 buildSnapshot · MK-XS-F-175 uid
 *
 * Reaches ..... 57 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-NW-F-044 getAssetsState
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               … and 39 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-027 goals (target, saved, date)
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-013
 * Changed ..... 2026-06-05 (f742136)
 */
export function goalsFromOnboarding(uid: UserId, op: Record<string, any> | null): GoalsDoc {
  const a = op ?? {};
  const raw = Array.isArray(a.goals) ? a.goals : [];
  const goals: Goal[] = raw
    .filter((g: any) => toNum(g.target) > 0)
    .map((g: any) => ({
      goal_id: newEntityId('goal'), label: g.label || 'Goal',
      target_amount: toNum(g.target), target_year: g.year ? toNum(g.year) : null,
    }));
  return { user_id: uid, goals };
}

const COLLECTION = 'goals_v2';
/* ─ MK-PL-F-014 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * loadGoals
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     It reaches outside the app for data and hands back what came back — no arithmetic of its own.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-014
 * Changed ..... 2026-06-06 (1a5b20b)
 */
export async function loadGoals(uid: UserId) { return getUserDoc<GoalsDoc>(COLLECTION, uid); }
/* ─ MK-PL-F-015 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * saveGoals
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     It records or announces something and returns no figure — no arithmetic of its own.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-015
 * Changed ..... 2026-06-06 (1a5b20b)
 */
export async function saveGoals(d: GoalsDoc) { await setUserDoc(COLLECTION, d.user_id, d); }

// ── Smarter savings: capacity is lumpy (some months free up far more than others) ──
export interface SaveCapacity { avg: number; min: number; max: number; lumpy: boolean; }
/** Summarize per-month available-to-save from a 12-month cash-flow grid. */
/* ─ MK-PL-F-016 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * availableToSaveSummary
 *
 * Answers ..... Summarize per-month available-to-save from a 12-month cash-flow grid.
 *
 * Formula .....
 *     amts = for each of grid (or none when missing): amount
 *     avg = 0
 *     min = 0
 *     max = 0
 *     lumpy = false   when count of amts is missing
 *     avg = Σ over amts of (each)count of ÷ amts
 *     min = min(...amts)
 *     max = max(...amts)
 *     the answer:
 *     avg = avg
 *     min = min
 *     max = max
 *     lumpy = max − min > max(50, avg × 0.25)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Applies a built-in rate of 25% to avg.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-016
 * Changed ..... 2026-06-06 (1a5b20b)
 */
export function availableToSaveSummary(grid: { label: string; amount: number }[]): SaveCapacity {
  const amts = (grid ?? []).map((g) => g.amount);
  if (!amts.length) return { avg: 0, min: 0, max: 0, lumpy: false };
  const avg = amts.reduce((t, a) => t + a, 0) / amts.length;   // Q49: full precision inside
  const min = Math.min(...amts);
  const max = Math.max(...amts);
  return { avg, min, max, lumpy: max - min > Math.max(50, avg * 0.25) };   // meaningfully uneven
}

/** A sinking-fund suggestion for non-monthly costs (travel, gifts, repairs): save 1/12 each month. */
export interface SinkingFund { annual: number; monthly: number; }
/* ─ MK-PL-F-017 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * sinkingFund
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     monthly = max(0, monthly non monthly)
 *     the answer:
 *     annual = monthly × 12
 *     monthly = monthly
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-027 goals (target, saved, date)
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Never lets monthly non monthly fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-017
 * Changed ..... 2026-06-26 (b27cd01)
 */
export function sinkingFund(monthlyNonMonthly: number): SinkingFund {
  const monthly = Math.max(0, monthlyNonMonthly);   // Q49
  return { annual: monthly * 12, monthly };
}

// ── B-71: goals funded FROM surplus, tracked from real money ──────────────────────────────────────
// One goal model (the runtime store Goal: { target, saved, targetDate }). Progress + on-track status are
// DERIVED from saved vs target and the actual funding rate vs the target date — never stored (DR-3).
export interface GoalLike { target: number; saved: number; targetDate?: string; duration?: string | number }

/** Whole months from `now` to the target month ('YYYY-MM'); >=1, or null if no/!invalid date. */
/* ─ MK-PL-F-018 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * monthsUntil
 *
 * Answers ..... Whole months from `now` to the target month ('YYYY-MM'); >=1, or null if no/!invalid date.
 *
 * Formula .....
 *     nothing   when target date is missing
 *     nothing   when y is missing (or m is missing when missing or zero)
 *     max(1, (y − now.get full year()) × 12 + (m − 1 − now.get month()))
 *
 * Called by ... MK-PL-F-019 goalMonthsRemaining
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-PL-F-019 goalMonthsRemaining · MK-PL-F-023 goalStatus
 *               MK-PL-F-020 requiredMonthly
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-027 goals (target, saved, date)
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-018
 * Changed ..... 2026-06-26 (b27cd01)
 */
export function monthsUntil(targetDate: string | undefined, now: Date): number | null {
  if (!targetDate) return null;
  const [y, m] = String(targetDate).split('-').map(Number);
  if (!y || !m) return null;
  return Math.max(1, (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()));
}

/** Months remaining: from the target date if set, else the goal's `duration` (months). null if neither. */
/* ─ MK-PL-F-019 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * goalMonthsRemaining
 *
 * Answers ..... Months remaining: from the target date if set, else the goal's `duration` (months).
 *
 * Formula .....
 *     from date = months until(target date, now)
 *     from date   when from date ≠ nothing
 *     d = duration read as a number
 *     the answer:
 *     d   if number.is finite(d) and d > 0
 *     nothing   otherwise
 *
 * Called by ... MK-PL-F-020 requiredMonthly
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-PL-F-023 goalStatus · MK-PL-F-020 requiredMonthly
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-027 goals (target, saved, date)
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-019
 * Changed ..... 2026-06-26 (b27cd01)
 */
export function goalMonthsRemaining(g: GoalLike, now: Date = new Date()): number | null {
  const fromDate = monthsUntil(g.targetDate, now);
  if (fromDate != null) return fromDate;
  const d = Number(g.duration);
  return Number.isFinite(d) && d > 0 ? d : null;
}

/** $/month still needed to hit the target on time (0 if already funded; null if no date/duration). */
/* ─ MK-PL-F-020 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * requiredMonthly
 *
 * Answers ..... $/month still needed to hit the target on time (0 if already funded; null if no date/duration).
 *
 * Formula .....
 *     remaining = max(0, (target or 0) − (saved or 0))
 *     0   when remaining = 0
 *     months = goal months remaining(g, now)
 *     the answer:
 *     remaining ÷ months   if months
 *     nothing   otherwise
 *
 * Called by ... MK-PL-F-023 goalStatus
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-PL-F-023 goalStatus
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-027 goals (target, saved, date)
 *
 * Decides .....
 *     · If target is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If saved is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-020
 * Changed ..... 2026-06-26 (b27cd01)
 */
export function requiredMonthly(g: GoalLike, now: Date = new Date()): number | null {
  const remaining = Math.max(0, (g.target || 0) - (g.saved || 0));
  if (remaining === 0) return 0;
  const months = goalMonthsRemaining(g, now);
  return months ? (remaining / months) : null;
}

/** Months to reach the goal at a given monthly contribution (0 if funded; null if contribution <= 0). */
/* ─ MK-PL-F-021 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * monthsToGoal
 *
 * Answers ..... Months to reach the goal at a given monthly contribution (0 if funded; null if contribution <= 0).
 *
 * Formula .....
 *     remaining = max(0, (target or 0) − (saved or 0))
 *     0   when remaining = 0
 *     the answer:
 *     round up(remaining ÷ monthly contribution)   if monthly contribution > 0
 *     nothing   otherwise
 *
 * Called by ... MK-PL-F-036 weighGoals
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-PL-F-037 trimHints · MK-PL-F-036 weighGoals
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-027 goals (target, saved, date)
 *
 * Decides .....
 *     · If target is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If saved is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-021
 * Changed ..... 2026-06-25 (93b2b8c)
 */
export function monthsToGoal(g: GoalLike, monthlyContribution: number): number | null {
  const remaining = Math.max(0, (g.target || 0) - (g.saved || 0));
  if (remaining === 0) return 0;
  return monthlyContribution > 0 ? Math.ceil(remaining / monthlyContribution) : null;
}

/** Funded %, clamped 0–100. */
/* ─ MK-PL-F-022 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * goalProgressPct
 *
 * Answers ..... Funded %, clamped 0–100.
 *
 * Formula .....
 *     0   when (target or 0) ≤ 0
 *     min(100, max(0, round(((saved or 0) ÷ target) × 100)))
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-027 goals (target, saved, date)
 *
 * Decides .....
 *     · If target is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If saved is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-022
 * Changed ..... 2026-06-28 (5abbc21)
 */
export function goalProgressPct(g: GoalLike): number {
  if ((g.target || 0) <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(((g.saved || 0) / g.target) * 100)));
}

/** Status judged by REAL money allocated to THIS goal THIS MONTH vs the rate needed to hit the date —
 *  not a typed promise, and not shared free cash (build-34 #1b: spare cash ≠ funding this goal).
 *   • saved ≥ target            → 'fully_funded' (blue)
 *   • no target date            → 'no_date'
 *   • funded this month ≥ need  → 'on_track' (green)   [being ahead lowers `need`, so it stays green]
 *   • else                      → 'behind' (amber)
 *  `fundedThisMonth` = goal.fundedByMonth[current 'YYYY-MM']. */
export type GoalStatus = 'fully_funded' | 'on_track' | 'behind' | 'no_date';
/* ─ MK-PL-F-023 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * goalStatus
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     'fully_funded'   when (saved or 0) ≥ (target or 0) and (target or 0) > 0
 *     req = required monthly(g, now)
 *     'no_date'   when req = nothing
 *     'fully_funded'   when req = 0
 *     the answer:
 *     'on_track'   if (funded this month or 0) + 1e − 6 ≥ req
 *     'behind'   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-MN-M-009
 * Reads ....... MK-XS-I-027 goals (target, saved, date)
 *
 * Decides .....
 *     · If saved is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If target is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · If funded this month is missing it counts as zero, so nothing recorded and a real zero look the same.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-023
 * Changed ..... 2026-06-28 (5abbc21)
 */
export function goalStatus(g: GoalLike, fundedThisMonth: number | null | undefined, now: Date = new Date()): GoalStatus {
  if ((g.saved || 0) >= (g.target || 0) && (g.target || 0) > 0) return 'fully_funded';
  const req = requiredMonthly(g, now);
  if (req == null) return 'no_date';
  if (req === 0) return 'fully_funded';
  return (fundedThisMonth || 0) + 1e-6 >= req ? 'on_track' : 'behind';
}
