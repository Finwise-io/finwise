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
