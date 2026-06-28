// Goals & Contribution module (spec service 4). Owns `goals/{uid}`.
// Tracks savings goals + a simple priority waterfall for routing surplus cash.
import type { UserId, EntityId } from '../_shared/ids';
import { newEntityId } from '../_shared/ids';
import { toNum, round2 } from '../_shared/num';
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
export function buildGoalsState(uid: UserId, goals: Goal[], monthlyCapacity: number): GoalsState {
  const progress = goals.map((g) => ({
    ...g,
    months_to_goal: monthlyCapacity > 0 ? Math.ceil(g.target_amount / monthlyCapacity) : null,
  }));
  return { user_id: uid, goals: progress, monthly_capacity: round2(monthlyCapacity) };
}

/** Priority waterfall (spec): emergency fund → toxic debt (>7%) → 401k match → Roth → goals.
 *  Returns the ordered routing of a monthly surplus across the steps. */
export interface WaterfallStep { name: string; allocated: number; }
export function waterfall(surplus: number, opts: {
  emergencyGap?: number; toxicDebt?: number; employerMatchMonthly?: number; rothRoom?: number;
} = {}): WaterfallStep[] {
  let left = Math.max(0, surplus);
  const steps: WaterfallStep[] = [];
  const take = (name: string, need: number) => {
    const a = Math.min(left, Math.max(0, need)); left -= a; steps.push({ name, allocated: round2(a) });
  };
  take('Emergency fund', opts.emergencyGap ?? 0);
  take('Toxic debt (>7%)', opts.toxicDebt ?? 0);
  take('401(k) employer match', opts.employerMatchMonthly ?? 0);
  take('Roth IRA', opts.rothRoom ?? Infinity);
  if (left > 0) steps.push({ name: 'Other goals', allocated: round2(left) });
  return steps;
}

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
export async function loadGoals(uid: UserId) { return getUserDoc<GoalsDoc>(COLLECTION, uid); }
export async function saveGoals(d: GoalsDoc) { await setUserDoc(COLLECTION, d.user_id, d); }

// ── Smarter savings: capacity is lumpy (some months free up far more than others) ──
export interface SaveCapacity { avg: number; min: number; max: number; lumpy: boolean; }
/** Summarize per-month available-to-save from a 12-month cash-flow grid. */
export function availableToSaveSummary(grid: { label: string; amount: number }[]): SaveCapacity {
  const amts = (grid ?? []).map((g) => g.amount);
  if (!amts.length) return { avg: 0, min: 0, max: 0, lumpy: false };
  const avg = Math.round(amts.reduce((t, a) => t + a, 0) / amts.length);
  const min = Math.round(Math.min(...amts));
  const max = Math.round(Math.max(...amts));
  return { avg, min, max, lumpy: max - min > Math.max(50, avg * 0.25) };   // meaningfully uneven
}

/** A sinking-fund suggestion for non-monthly costs (travel, gifts, repairs): save 1/12 each month. */
export interface SinkingFund { annual: number; monthly: number; }
export function sinkingFund(monthlyNonMonthly: number): SinkingFund {
  const monthly = Math.max(0, Math.round(monthlyNonMonthly));
  return { annual: monthly * 12, monthly };
}

// ── B-71: goals funded FROM surplus, tracked from real money ──────────────────────────────────────
// One goal model (the runtime store Goal: { target, saved, targetDate }). Progress + on-track status are
// DERIVED from saved vs target and the actual funding rate vs the target date — never stored (DR-3).
export interface GoalLike { target: number; saved: number; targetDate?: string; duration?: string | number }

/** Whole months from `now` to the target month ('YYYY-MM'); >=1, or null if no/!invalid date. */
export function monthsUntil(targetDate: string | undefined, now: Date): number | null {
  if (!targetDate) return null;
  const [y, m] = String(targetDate).split('-').map(Number);
  if (!y || !m) return null;
  return Math.max(1, (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth()));
}

/** Months remaining: from the target date if set, else the goal's `duration` (months). null if neither. */
export function goalMonthsRemaining(g: GoalLike, now: Date = new Date()): number | null {
  const fromDate = monthsUntil(g.targetDate, now);
  if (fromDate != null) return fromDate;
  const d = Number(g.duration);
  return Number.isFinite(d) && d > 0 ? d : null;
}

/** $/month still needed to hit the target on time (0 if already funded; null if no date/duration). */
export function requiredMonthly(g: GoalLike, now: Date = new Date()): number | null {
  const remaining = Math.max(0, (g.target || 0) - (g.saved || 0));
  if (remaining === 0) return 0;
  const months = goalMonthsRemaining(g, now);
  return months ? round2(remaining / months) : null;
}

/** Months to reach the goal at a given monthly contribution (0 if funded; null if contribution <= 0). */
export function monthsToGoal(g: GoalLike, monthlyContribution: number): number | null {
  const remaining = Math.max(0, (g.target || 0) - (g.saved || 0));
  if (remaining === 0) return 0;
  return monthlyContribution > 0 ? Math.ceil(remaining / monthlyContribution) : null;
}

/** Funded %, clamped 0–100. */
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
export function goalStatus(g: GoalLike, fundedThisMonth: number | null | undefined, now: Date = new Date()): GoalStatus {
  if ((g.saved || 0) >= (g.target || 0) && (g.target || 0) > 0) return 'fully_funded';
  const req = requiredMonthly(g, now);
  if (req == null) return 'no_date';
  if (req === 0) return 'fully_funded';
  return (fundedThisMonth || 0) + 1e-6 >= req ? 'on_track' : 'behind';
}
