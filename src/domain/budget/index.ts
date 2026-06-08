// Dynamic Expense & Budget module (spec service 8). Owns `budgets/{uid}`.
// THE single source of truth for "projected to save" (surplus) — Goals & Retirement read it.
import type { UserId } from '../_shared/ids';
import { toNum, round2 } from '../_shared/num';
import { getUserDoc, setUserDoc } from '../_shared/firestore';
import { emit } from '../_shared/eventBus';
import { totalGrossAnnual, effectiveRate, incomeMonthlyGrid } from '../income';
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
  projected_to_save: number;       // income − spending (the renamed "surplus")
  savings_rate_pct: number;        // projected_to_save / income
}

/** projected_to_save = net monthly income − monthly spending. Income comes from the Income module. */
export function buildBudgetState(uid: UserId, netMonthlyIncome: number, doc: BudgetDoc): BudgetState {
  const spend = doc.monthly_spending || 0;
  const save = netMonthlyIncome - spend;
  return {
    user_id: uid,
    monthly_spending: round2(spend),
    net_monthly_income: round2(netMonthlyIncome),
    projected_to_save: round2(save),
    savings_rate_pct: netMonthlyIncome > 0 ? round2((save / netMonthlyIncome) * 100) : 0,
  };
}

/** Roll the per-category spending up into the three monthly-normalized buckets.
 *  Categories carry a bucket (fixed/nonmonthly/flexible) and an amount in $ or % of take-home;
 *  non-monthly (yearly) amounts are divided by 12. Falls back to the legacy b_* fields. */
export function spendBuckets(op: Record<string, any> | null): { fixed: number; non_monthly: number; flexible: number; monthly_total: number } {
  const a = op ?? {};
  const cats = Array.isArray(a.spendCats) ? a.spendCats : null;
  if (!cats) {
    const fixed = toNum(a.b_fixed), non = toNum(a.b_nonmonthly), flex = toNum(a.b_flexible);
    return { fixed, non_monthly: non, flexible: flex, monthly_total: round2(fixed + non + flex) };
  }
  const netMonthly = (totalGrossAnnual(op) * (1 - effectiveRate(op))) / 12;
  let fixed = 0, flex = 0, nonMo = 0;
  for (const c of cats) {
    const amt = toNum(c?.amount); if (amt <= 0) continue;
    const pct = c?.unit === 'pct';
    if (c?.bucket === 'nonmonthly') nonMo += (pct ? (amt / 100) * netMonthly * 12 : amt) / 12;   // yearly → monthly
    else if (c?.bucket === 'fixed') fixed += pct ? (amt / 100) * netMonthly : amt;
    else flex += pct ? (amt / 100) * netMonthly : amt;
  }
  return { fixed: round2(fixed), non_monthly: round2(nonMo), flexible: round2(flex), monthly_total: round2(fixed + nonMo + flex) };
}

/** Spending placed in the calendar months it's actually due (Jan→Dec) — NOT averaged.
 *  Monthly bills repeat; non-monthly costs (tuition, insurance) land in the months chosen;
 *  any estimated-but-uncategorized spend is spread evenly. */
export function spendByMonth(op: Record<string, any> | null): number[] {
  const a = op ?? {};
  const out = new Array(12).fill(0);
  const cats = Array.isArray(a.spendCats) ? a.spendCats : null;
  const netMonthly = (totalGrossAnnual(op) * (1 - effectiveRate(op))) / 12;
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

/** Discretionary amount free to save each month = take-home that month (after tax & 401k) minus
 *  the spending due that month. Lumpy on BOTH sides — income (equity/bonus/scholarships in their
 *  months) and bills (tuition/insurance in their months) — so a big bill shows up as a real dip,
 *  not smeared across the year. This is savings ON TOP of the 401(k). */
export function savingsByMonth(op: Record<string, any> | null): { label: string; amount: number }[] {
  const avail = incomeMonthlyGrid(op, 'available');
  const spend = spendByMonth(op);
  return avail.map((m, i) => ({ label: m.label, amount: round2(m.amount - spend[i]) }));
}

export function budgetFromOnboarding(uid: UserId, op: Record<string, any> | null): BudgetDoc {
  const a = op ?? {};
  const b = spendBuckets(op);
  return {
    user_id: uid,
    monthly_spending: b.monthly_total > 0 ? b.monthly_total : toNum(a.monthlySpending),
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
export function budgetVsActual(expenses: any[], op: Record<string, any> | null, now: Date = new Date()): BudgetVsActual {
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const planned = spendBuckets(op);
  const custom = (Array.isArray(op?.spendCats) ? op!.spendCats : []).filter((c: any) => c?.custom);
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
