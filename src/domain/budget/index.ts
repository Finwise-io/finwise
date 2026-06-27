// Dynamic Expense & Budget module (spec service 8). Owns `budgets/{uid}`.
import type { OnboardingProfile } from '../onboardingProfile';
// THE single source of truth for "projected to save" (surplus) — Goals & Retirement read it.
import type { UserId } from '../_shared/ids';
import { toNum, round2 } from '../_shared/num';
import { getUserDoc, setUserDoc } from '../_shared/firestore';
import { emit } from '../_shared/eventBus';
import { incomeMonthlyGrid } from '../income';
import { categoryBucketFor } from '../../constants/categories';

export interface BudgetDoc {
  user_id: UserId;
  monthly_spending: number;        // total planned monthly spend
  fixed: number;                   // optional flex buckets
  non_monthly: number;
  flexible: number;
  last_updated?: any;
}

export interface BudgetState {
  user_id: UserId;
  monthly_spending: number;
  net_monthly_income: number;
  projected_to_save: number;       // income − spending (the monthly surplus)
}
// NOTE: the savings RATE is NOT here — it lives in domain/savings (savingsRateCash / savingsRateTotal),
// Term #10. The old budget `savings_rate_pct` was a dead, divergent 4th definition; removed.

/** projected_to_save = net monthly income − monthly spending. Income comes from the Income module. */
export function buildBudgetState(uid: UserId, netMonthlyIncome: number, doc: BudgetDoc): BudgetState {
  const spend = doc.monthly_spending || 0;
  const save = netMonthlyIncome - spend;
  return {
    user_id: uid,
    monthly_spending: round2(spend),
    net_monthly_income: round2(netMonthlyIncome),
    projected_to_save: round2(save),
  };
}

/** The single canonical "planned monthly spend": the itemized buckets OR the stated total, whichever
 *  is larger (the stated total can include an uncategorized remainder the buckets don't capture).
 *  Every surface that needs "monthly spending" — budget surplus, emergency-fund runway, essentials —
 *  routes through this so they can't drift apart. */
export function plannedMonthlySpend(op: OnboardingProfile | null): number {
  return Math.max(spendBuckets(op).monthly_total, toNum(op?.monthlySpending));
}

// A-1: the %-of-income base = true take-home (after tax AND 401k) — the SAME base the spending-plan
// screen uses (modules.tsx SpendingEditor → takeHomeMonthly). incomeMonthlyGrid('available') is already
// imported; computing it here avoids a budget→savings import cycle. (Was net-of-tax, which wrongly
// counted 401(k) money as spendable, so a % category's $ on screen ≠ the $ the budget/runway/savings used.)
function pctBaseMonthly(op: OnboardingProfile | null): number {
  const grid = incomeMonthlyGrid(op, 'available');
  return grid.reduce((t, m) => t + m.amount, 0) / 12;
}

/** Canonical per-category planned $/month — the ONE conversion the buckets AND the Budget screen share,
 *  so a category's on-screen line item ALWAYS reconciles with its bucket total (build-34 #3). $ as-is;
 *  % resolves against take-home (after tax AND 401(k), per A-1) — NOT net-of-tax; non-monthly (yearly) ÷ 12. */
export function categoryMonthly(c: { amount?: any; unit?: string; bucket?: string } | null | undefined, op: OnboardingProfile | null): number {
  const amt = toNum(c?.amount); if (amt <= 0) return 0;
  const pct = c?.unit === 'pct';
  const base = pctBaseMonthly(op);                                              // take-home/month (== takeHomeMonthly)
  if (c?.bucket === 'nonmonthly') return (pct ? (amt / 100) * base * 12 : amt) / 12;   // yearly → monthly
  return pct ? (amt / 100) * base : amt;                                        // fixed / flexible
}

/** Roll the per-category spending up into the three monthly-normalized buckets.
 *  Categories carry a bucket (fixed/nonmonthly/flexible) and an amount in $ or % of take-home;
 *  non-monthly (yearly) amounts are divided by 12. Falls back to the legacy b_* fields. */
export function spendBuckets(op: OnboardingProfile | null): { fixed: number; non_monthly: number; flexible: number; monthly_total: number } {
  const a = op ?? {};
  const cats = Array.isArray(a.spendCats) ? a.spendCats : null;
  if (!cats) {
    const fixed = toNum(a.b_fixed), non = toNum(a.b_nonmonthly), flex = toNum(a.b_flexible);
    return { fixed, non_monthly: non, flexible: flex, monthly_total: round2(fixed + non + flex) };
  }
  let fixed = 0, flex = 0, nonMo = 0;
  for (const c of cats) {
    const m = categoryMonthly(c, op); if (m <= 0) continue;                     // the shared per-category $
    if (c?.bucket === 'nonmonthly') nonMo += m;
    else if (c?.bucket === 'fixed') fixed += m;
    else flex += m;
  }
  return { fixed: round2(fixed), non_monthly: round2(nonMo), flexible: round2(flex), monthly_total: round2(fixed + nonMo + flex) };
}

/** Spending placed in the calendar months it's actually due (Jan→Dec) — NOT averaged.
 *  Monthly bills repeat; non-monthly costs (tuition, insurance) land in the months chosen;
 *  any estimated-but-uncategorized spend is spread evenly. */
export function spendByMonth(op: OnboardingProfile | null): number[] {
  const a = op ?? {};
  const out = new Array(12).fill(0);
  const cats = Array.isArray(a.spendCats) ? a.spendCats : null;
  const netMonthly = pctBaseMonthly(op);
  if (cats) {
    for (const c of cats) {
      const amt = toNum(c?.amount); if (amt <= 0) continue;
      const pct = c?.unit === 'pct';
      if (c?.bucket === 'nonmonthly') {
        const yearly = pct ? (amt / 100) * netMonthly * 12 : amt;
        const months = Array.isArray(c?.months) && c.months.length ? c.months : null;
        if (months) for (const m of months) out[Math.min(11, Math.max(0, m - 1))] += yearly / months.length;
        else for (let i = 0; i < 12; i++) out[i] += yearly / 12;
      } else {
        const m = pct ? (amt / 100) * netMonthly : amt;
        for (let i = 0; i < 12; i++) out[i] += m;
      }
    }
  } else {
    const flat = spendBuckets(op).monthly_total;
    for (let i = 0; i < 12; i++) out[i] += flat;
  }
  const uncategorized = Math.max(0, toNum(a.monthlySpending) - spendBuckets(op).monthly_total);
  if (uncategorized > 0) for (let i = 0; i < 12; i++) out[i] += uncategorized;
  return out.map(round2);
}

/** Monthly money you MUST keep paying — the recurring (non-monthly excluded) Critical + Important
 *  bills. Falls back to total monthly spend if categories aren't itemized. */
export function monthlyEssentials(op: OnboardingProfile | null): number {
  const a = op ?? {};
  const cats = Array.isArray(a.spendCats) ? a.spendCats : null;
  // B-33: with no itemized categories we can't separate wants from needs, so treat the stated total
  // spend as must-pay (conservative for an emergency-fund target). Returning $0 here let the stress
  // test claim "strong cushion" with $0 cash while also saying the user would go into the red.
  if (!cats) return plannedMonthlySpend(op);
  const netMonthly = pctBaseMonthly(op);
  let ess = 0;
  for (const c of cats) {
    if (c?.bucket === 'nonmonthly') continue;                 // lumpy, planned separately
    if ((c?.tier ?? 'flex') === 'flex') continue;             // wants aren't essentials
    const amt = toNum(c?.amount); if (amt <= 0) continue;
    ess += c?.unit === 'pct' ? (amt / 100) * netMonthly : amt;
  }
  const uncategorized = Math.max(0, toNum(a.monthlySpending) - spendBuckets(op).monthly_total);
  return round2(ess + uncategorized);
}

export interface ShockResult {
  shock: number;
  cashAfter: number;          // cash left right after the hit
  monthlyEssentials: number;  // what you must keep paying each month
  runwayAfter: number;        // months your remaining cash covers essentials after the hit
  jobLossRunway: number;      // months your cash lasts with NO income (no shock)
  coversIt: boolean;          // cash absorbs the shock without going negative
  recommendedFund: number;    // low end of a 3–6 month emergency fund (3× essentials)
  gapToFund: number;          // how far your cash is from that
}
/** "What if a $X emergency hit right now?" — can your cash absorb it, and how long would you last. */
export function emergencyTest(op: OnboardingProfile | null, cash: number, shock: number): ShockResult {
  const ess = monthlyEssentials(op);
  const cashAfter = round2(cash - shock);
  const recommendedFund = round2(ess * 3);
  return {
    shock: round2(shock),
    cashAfter,
    monthlyEssentials: ess,
    runwayAfter: ess > 0 ? round2(Math.max(0, cashAfter) / ess) : 0,
    jobLossRunway: ess > 0 ? round2(cash / ess) : 0,
    coversIt: cashAfter >= 0,
    recommendedFund,
    gapToFund: round2(Math.max(0, recommendedFund - cash)),
  };
}

/** Discretionary amount free to save each month = take-home that month (after tax & 401k) minus
 *  the spending due that month. Lumpy on BOTH sides — income (equity/bonus/scholarships in their
 *  months) and bills (tuition/insurance in their months) — so a big bill shows up as a real dip,
 *  not smeared across the year. This is savings ON TOP of the 401(k). */
export function savingsByMonth(op: OnboardingProfile | null): { label: string; amount: number }[] {
  const avail = incomeMonthlyGrid(op, 'available');
  const spend = spendByMonth(op);
  return avail.map((m, i) => ({ label: m.label, amount: round2(m.amount - spend[i]) }));
}

/** ONE annual cash-flow roll-up, derived entirely from the per-month income grid + spendByMonth — the
 *  SAME bases the savings-plan and budget already use. The recap must use this (not a separate flat
 *  grossAnnual − tax computation) so "Surplus / yr" reconciles exactly with the savings screen's
 *  monthly average × 12 (#6: they disagreed because the recap annualized flatly while the savings plan
 *  summed the month-by-month grid). saveYr === Σ savingsByMonth by construction. */
export function annualCashflow(op: OnboardingProfile | null): {
  grossYr: number; taxYr: number; netYr: number; k401Yr: number; availableYr: number; spendYr: number; saveYr: number;
} {
  const sum = (rows: { amount: number }[]) => rows.reduce((t, m) => t + m.amount, 0);
  const grossYr = round2(sum(incomeMonthlyGrid(op, 'gross')));
  const netYr = round2(sum(incomeMonthlyGrid(op, 'net')));
  const availableYr = round2(sum(incomeMonthlyGrid(op, 'available')));
  const spendYr = round2(spendByMonth(op).reduce((t, m) => t + m, 0));
  return {
    grossYr,
    netYr,
    availableYr,
    spendYr,
    taxYr: round2(grossYr - netYr),
    k401Yr: round2(netYr - availableYr),          // available = net − employee 401(k)
    saveYr: round2(availableYr - spendYr),        // === Σ savingsByMonth
  };
}

export function budgetFromOnboarding(uid: UserId, op: OnboardingProfile | null): BudgetDoc {
  const a = op ?? {};
  const b = spendBuckets(op);
  return {
    user_id: uid,
    // B-24/B-50: count the full stated total (itemized buckets PLUS any uncategorized remainder) via
    // the shared plannedMonthlySpend helper — one definition for budget, runway, and essentials.
    monthly_spending: plannedMonthlySpend(op),
    fixed: b.fixed, non_monthly: b.non_monthly, flexible: b.flexible,
  };
}

export interface BucketActual { key: 'fixed' | 'nonmonthly' | 'flexible'; planned: number; spent: number; remaining: number; }
export interface BudgetVsActual {
  month: string;            // 'YYYY-MM'
  planned_total: number;    // planned monthly budget (from onboarding)
  spent_total: number;      // month-to-date actual
  remaining: number;        // planned − spent
  buckets: BucketActual[];
}

/** Month-to-date actual spending vs the planned budget, bucketed. `expenses` is the store's
 *  ExpenseEntry[] (each has amount, category, date 'YYYY-MM-DD'). */
export function budgetVsActual(expenses: any[], op: OnboardingProfile | null, now: Date = new Date()): BudgetVsActual {
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const planned = spendBuckets(op);
  const custom = (Array.isArray(op?.spendCats) ? op!.spendCats : [])
    .filter((c) => c?.custom && !!c.label)
    .map((c) => ({ label: c.label!, bucket: c.bucket }));
  const spent: Record<string, number> = { fixed: 0, nonmonthly: 0, flexible: 0 };
  for (const e of expenses ?? []) {
    if (!String(e?.date ?? '').startsWith(ym)) continue;
    if (e?.category === 'Debt payment') continue;          // debt is tracked separately, not in the expense budget
    spent[categoryBucketFor(e.category, custom)] += toNum(e.amount);
  }
  const buckets: BucketActual[] = [
    { key: 'fixed', planned: planned.fixed, spent: round2(spent.fixed), remaining: round2(planned.fixed - spent.fixed) },
    { key: 'nonmonthly', planned: planned.non_monthly, spent: round2(spent.nonmonthly), remaining: round2(planned.non_monthly - spent.nonmonthly) },
    { key: 'flexible', planned: planned.flexible, spent: round2(spent.flexible), remaining: round2(planned.flexible - spent.flexible) },
  ];
  const spent_total = round2(spent.fixed + spent.nonmonthly + spent.flexible);
  return { month: ym, planned_total: planned.monthly_total, spent_total, remaining: round2(planned.monthly_total - spent_total), buckets };
}

const COLLECTION = 'budgets';
export const SURPLUS_CALCULATED = 'SurplusCalculatedEvent';
export async function loadBudget(uid: UserId) { return getUserDoc<BudgetDoc>(COLLECTION, uid); }
export async function saveBudget(d: BudgetDoc) { await setUserDoc(COLLECTION, d.user_id, d); }
/** Publish the authoritative surplus for Goals/Retirement to consume. */
export function publishSurplus(uid: UserId, projectedToSave: number) {
  emit(SURPLUS_CALCULATED, { user_id: uid, calculated_surplus_cash: projectedToSave });
}
