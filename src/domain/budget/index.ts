// Dynamic Expense & Budget module (spec service 8). Owns `budgets/{uid}`.
import type { OnboardingProfile } from '../onboardingProfile';
// THE single source of truth for "projected to save" (surplus) — Goals & Retirement read it.
import type { UserId } from '../_shared/ids';
import { toNum } from '../_shared/num';
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
  projected_to_save: number;       // income − expenses (the monthly surplus)
}
// NOTE: the savings RATE is NOT here — it lives in domain/savings (savingsRateCash / savingsRateTotal),
// Term #10. The old budget `savings_rate_pct` was a dead, divergent 4th definition; removed.

/** projected_to_save = net monthly income − monthly expenses. Income comes from the Income module. */
/* ─ MK-CF-F-001 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * buildBudgetState
 *
 * Answers ..... projected_to_save = net monthly income − monthly expenses.
 *
 * Formula .....
 *     spend = doc.monthly expenses (or 0 when missing or zero)
 *     save = net monthly income − spend
 *
 * Called by ... MK-XS-F-031 buildSnapshot
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-031 buildSnapshot · MK-XS-F-032 snapshotFromOnboarding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If monthly expenses is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-001
 * Changed ..... 2026-06-22 (bef9497)
 */
export function buildBudgetState(uid: UserId, netMonthlyIncome: number, doc: BudgetDoc): BudgetState {
  const spend = doc.monthly_spending || 0;
  const save = netMonthlyIncome - spend;
  return {
    user_id: uid,
    monthly_spending: (spend),
    net_monthly_income: (netMonthlyIncome),
    projected_to_save: (save),
  };
}

/** The single canonical "planned monthly spend": the itemized buckets OR the stated total, whichever
 *  is larger (the stated total can include an uncategorized remainder the buckets don't capture).
 *  Every surface that needs "monthly expenses" — budget surplus, emergency-fund runway, essentials —
 *  routes through this so they can't drift apart. */
/* ─ MK-CF-F-002 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * plannedMonthlySpend
 *
 * Answers ..... The single canonical "planned monthly spend": the itemized buckets OR the stated total, whichever is larger (the stated total can include an uncategorized remainder the buckets don't capture).
 *
 * Formula .....
 *     max(spend buckets(op).monthly total, op.monthly expenses read as a number (0 when it is not one))
 *
 * Called by ... MK-CF-F-009 monthlyEssentials · MK-CF-F-013 budgetFromOnboarding
 *               MK-NW-O-004 theEmergencyFund
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-079 EF · MK-CF-F-013 budgetFromOnboarding
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-010 emergencyTest
 *               MK-CF-F-009 monthlyEssentials · MK-XS-F-032 snapshotFromOnboarding
 *               MK-NW-O-004 theEmergencyFund
 *
 * Serves ...... MK-MN-M-007
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-002
 * Changed ..... 2026-06-24 (fa35cf4)
 */
export function plannedMonthlySpend(op: OnboardingProfile | null): number {
  return Math.max(spendBuckets(op).monthly_total, toNum(op?.monthlySpending));
}

// A-1: the %-of-income base = true take-home (after tax AND 401k) — the SAME base the expenses-plan
// screen uses (modules.tsx SpendingEditor → takeHomeMonthly). incomeMonthlyGrid('available') is already
// imported; computing it here avoids a budget→savings import cycle. (Was net-of-tax, which wrongly
// counted 401(k) money as spendable, so a % category's $ on screen ≠ the $ the budget/runway/savings used.)
/* ─ MK-CF-F-120 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * pctBaseMonthly
 *
 * Answers ..... A-1: the %-of-income base = true take-home (after tax AND 401k) — the SAME base the expenses-plan screen uses (modules.tsx SpendingEditor → takeHomeMonthly).
 *
 * Formula .....
 *     grid = income monthly grid(op, 'available')
 *     the answer = Σ over grid of (amount)÷ 12
 *
 * Called by ... MK-CF-F-003 categoryMonthly · MK-CF-F-008 spendByMonth
 *               MK-CF-F-009 monthlyEssentials
 *
 * Reaches ..... 80 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 62 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-120
 * Changed ..... not in git yet (—)
 */
function pctBaseMonthly(op: OnboardingProfile | null): number {
  const grid = incomeMonthlyGrid(op, 'available');
  return grid.reduce((t, m) => t + m.amount, 0) / 12;
}

/** Canonical per-category planned $/month — the ONE conversion the buckets AND the Budget screen share,
 *  so a category's on-screen line item ALWAYS reconciles with its bucket total (build-34 #3). $ as-is;
 *  % resolves against take-home (after tax AND 401(k), per A-1) — NOT net-of-tax; non-monthly (yearly) ÷ 12. */
/* ─ MK-CF-F-003 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * categoryMonthly
 *
 * Answers ..... Canonical per-category planned $/month — the ONE conversion the buckets AND the Budget screen share, so a category's on-screen line item ALWAYS reconciles with its bucket total (build-34 #3).
 *
 * Formula .....
 *     amt = to num(amount); if (amt ≤ 0) return 0
 *     pct = unit = 'pct'
 *     base = pct base monthly(op)
 *     (pct ? (amt ÷ 100) × base × 12 : amt) ÷ 12   when bucket = 'nonmonthly'
 *     the answer:
 *     (amt ÷ 100) × base   if pct
 *     amt   otherwise
 *
 * Called by ... MK-CF-F-004 spendBuckets
 *
 * Reaches ..... 80 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 62 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-003
 * Changed ..... 2026-06-27 (6eb9522)
 */
export function categoryMonthly(c: { amount?: any; unit?: string; bucket?: string } | null | undefined, op: OnboardingProfile | null): number {
  const amt = toNum(c?.amount); if (amt <= 0) return 0;
  const pct = c?.unit === 'pct';
  const base = pctBaseMonthly(op);                                              // take-home/month (== takeHomeMonthly)
  if (c?.bucket === 'nonmonthly') return (pct ? (amt / 100) * base * 12 : amt) / 12;   // yearly → monthly
  return pct ? (amt / 100) * base : amt;                                        // fixed / flexible
}

/** Roll the per-category expenses up into the three monthly-normalized buckets.
 *  Categories carry a bucket (fixed/nonmonthly/flexible) and an amount in $ or % of take-home;
 *  non-monthly (yearly) amounts are divided by 12. Falls back to the legacy b_* fields. */
/* ─ MK-CF-F-004 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * spendBuckets
 *
 * Answers ..... Roll the per-category expenses up into the three monthly-normalized buckets.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     cats = spend cats   if array.is array(spend cats)
 *     nothing   otherwise
 *     fixed = to num(b fixed), non = to num(b nonmonthly), flex = to num(b flexible)
 *     the answer:
 *     fixed = fixed
 *     non monthly = non
 *     flexible = flex
 *     monthly total = fixed + non + flex
 *     fixed = 0, flex = 0, non mo = 0
 *     m = category monthly(c, op); if (m ≤ 0) continue
 *
 * Called by ... MK-CF-F-002 plannedMonthlySpend · MK-CF-F-008 spendByMonth
 *               MK-CF-F-009 monthlyEssentials · MK-CF-F-013 budgetFromOnboarding
 *               MK-CF-F-014 budgetVsActual · MK-CF-F-019 upcomingBills
 *
 * Reaches ..... 80 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 62 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-032 expenses categories the person set up
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-004
 * Changed ..... 2026-06-27 (6eb9522)
 */
export function spendBuckets(op: OnboardingProfile | null): { fixed: number; non_monthly: number; flexible: number; monthly_total: number } {
  const a = op ?? {};
  const cats = Array.isArray(a.spendCats) ? a.spendCats : null;
  if (!cats) {
    const fixed = toNum(a.b_fixed), non = toNum(a.b_nonmonthly), flex = toNum(a.b_flexible);
    return { fixed, non_monthly: non, flexible: flex, monthly_total: (fixed + non + flex) };
  }
  let fixed = 0, flex = 0, nonMo = 0;
  for (const c of cats) {
    const m = categoryMonthly(c, op); if (m <= 0) continue;                     // the shared per-category $
    if (c?.bucket === 'nonmonthly') nonMo += m;
    else if (c?.bucket === 'fixed') fixed += m;
    else flex += m;
  }
  return { fixed: (fixed), non_monthly: (nonMo), flexible: (flex), monthly_total: (fixed + nonMo + flex) };
}


/** What's LEFT of this month's surplus to put to work = surplus − already-allocated this month (never < 0). */
/* ─ MK-CF-F-006 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * allocatableThisMonth
 *
 * Answers ..... What's LEFT of this month's surplus to put to work = surplus − already-allocated this month (never < 0).
 *
 * Formula .....
 *     max(0, surplus − (allocated this month or 0))
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If allocated this month is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-006
 * Changed ..... 2026-06-28 (cb877d4)
 */
export function allocatableThisMonth(surplus: number, allocatedThisMonth: number | undefined): number {
  return Math.max(0, surplus - (allocatedThisMonth || 0));
}

/** Label basis for the non-monthly bucket (e.g. "15% of take-home pay") — the combined % when EVERY
 *  non-monthly category is %-based, else allPct=false (a plain $ total). For unambiguous UI labelling
 *  (pj build-34: a 15%-of-take-home non-monthly bucket showed an annual $ with no stated basis). */
/* ─ MK-CF-F-007 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * nonMonthlyBasis
 *
 * Answers ..... Label basis for the non-monthly bucket (e.g.
 *
 * Formula .....
 *     cats = op!.spend cats!   if array.is array(op.spend cats)
 *     []   otherwise
 *     nm = cats where bucket = 'nonmonthly' and to num(amount) > 0
 *     all pct = nm.length > 0 and nm.every((c) => unit = 'pct')
 *     pct = round(Σ over nm of (amount read as a number (0 when it is not one)))   if all pct
 *     0   otherwise
 *     the answer = { all pct, pct }
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-MN-M-010
 * Reads ....... MK-XS-I-032 expenses categories the person set up
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-007
 * Changed ..... 2026-06-28 (cad76ca)
 */
export function nonMonthlyBasis(op: OnboardingProfile | null): { allPct: boolean; pct: number } {
  const cats = Array.isArray(op?.spendCats) ? op!.spendCats! : [];
  const nm = cats.filter((c) => c?.bucket === 'nonmonthly' && toNum(c?.amount) > 0);
  const allPct = nm.length > 0 && nm.every((c) => c?.unit === 'pct');
  const pct = allPct ? Math.round(nm.reduce((t, c) => t + toNum(c?.amount), 0)) : 0;
  return { allPct, pct };
}

/** Expenses placed in the calendar months it's actually due (Jan→Dec) — NOT averaged.
 *  Monthly bills repeat; non-monthly costs (tuition, insurance) land in the months chosen;
 *  any estimated-but-uncategorized spend is spread evenly. */
/* ─ MK-CF-F-008 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * spendByMonth
 *
 * Answers ..... Expenses placed in the calendar months it's actually due (Jan→Dec) — NOT averaged.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     out = 12 slots, each 0
 *     cats = spend cats   if array.is array(spend cats)
 *     nothing   otherwise
 *     net monthly = pct base monthly(op)
 *     amt = to num(amount); if (amt ≤ 0) continue
 *     pct = unit = 'pct'
 *     flat = spend buckets(op).monthly total
 *     uncategorized = max(0, to num(monthly expenses) − spend buckets(op).monthly total)
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-CF-F-011 savingsByMonth · MK-CF-F-012 annualCashflow
 *               MK-CF-F-020 cashflowYear · MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 80 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 62 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-032 expenses categories the person set up
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · Treats a year as twelve equal months.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-008
 * Changed ..... 2026-06-24 (fa35cf4)
 */
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
  return out.map(((x: number) => x));
}

/** Monthly money you MUST keep paying — the recurring (non-monthly excluded) Critical + Important
 *  bills. Falls back to total monthly spend if categories aren't itemized. */
/* ─ MK-CF-F-009 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * monthlyEssentials
 *
 * Answers ..... Monthly money you MUST keep paying — the recurring (non-monthly excluded) Critical + Important bills.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     cats = spend cats   if array.is array(spend cats)
 *     nothing   otherwise
 *     planned monthly spend(op)   when cats is missing
 *     net monthly = pct base monthly(op)
 *     ess = 0
 *     amt = to num(amount); if (amt ≤ 0) continue
 *     uncategorized = max(0, to num(monthly expenses) − spend buckets(op).monthly total)
 *     the answer = ess + uncategorized
 *
 * Called by ... MK-CF-F-010 emergencyTest · MK-NW-O-004 theEmergencyFund
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-079 EF · MK-CF-F-010 emergencyTest
 *               MK-NW-O-004 theEmergencyFund
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-025 typical monthly essentials
 *               MK-XS-I-032 expenses categories the person set up
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · Uses a built-in ess of 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-009
 * Changed ..... 2026-06-24 (fa35cf4)
 */
export function monthlyEssentials(op: OnboardingProfile | null): number {
  const a = op ?? {};
  const cats = Array.isArray(a.spendCats) ? a.spendCats : null;
  // B-33: with no itemized categories we can't separate wants from needs, so treat the stated total
  // spend as must-pay (conservative for an emergency-fund target). Returning $0 here let the stress
  // test claim "strong emergency fund" with $0 cash while also saying the user would go into the red.
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
  return (ess + uncategorized);
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
/* ─ MK-CF-F-010 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * emergencyTest
 *
 * Answers ..... "What if a $X emergency hit right now?" — can your cash absorb it, and how long would you last.
 *
 * Formula .....
 *     ess = essentials override   if essentials override ≠ nothing and essentials override > 0
 *     monthly essentials(op)   otherwise
 *     cash after = cash − shock
 *     recommended fund = ess × 3
 *
 * Called by ... MK-NW-O-004 theEmergencyFund
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-079 EF · MK-NW-O-004 theEmergencyFund
 *
 * Serves ...... MK-MN-M-024 · MK-MN-M-025
 * Reads ....... MK-XS-I-025 typical monthly essentials
 * Ruled by .... DEC-0260
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Decides .....
 *     · Never lets cash after fall below 0.
 *     · G21 (2026-09-08): essentials a month = the figure handed in by the screen (MK-CF-F-190: logged average, else typed), falling back to the typed categories only when nothing is handed in.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-010
 * Changed ..... 2026-06-09 (e39df23)
 */
export function emergencyTest(op: OnboardingProfile | null, cash: number, shock: number, essentialsOverride?: number): ShockResult {
  // G21 (2026-09-08): the screen hands in the ONE essentials figure (MK-CF-F-190, logged average first);
  // the typed categories remain the fallback when nothing is handed in.
  const ess = essentialsOverride != null && essentialsOverride > 0 ? essentialsOverride : monthlyEssentials(op);
  const cashAfter = (cash - shock);
  const recommendedFund = (ess * 3);
  return {
    shock: (shock),
    cashAfter,
    monthlyEssentials: ess,
    runwayAfter: ess > 0 ? (Math.max(0, cashAfter) / ess) : 0,
    jobLossRunway: ess > 0 ? (cash / ess) : 0,
    coversIt: cashAfter >= 0,
    recommendedFund,
    gapToFund: (Math.max(0, recommendedFund - cash)),
  };
}

/** Discretionary amount free to save each month = take-home that month (after tax & 401k) minus
 *  the expenses due that month. Lumpy on BOTH sides — income (equity/bonus/scholarships in their
 *  months) and bills (tuition/insurance in their months) — so a big bill shows up as a real dip,
 *  not smeared across the year. This is savings ON TOP of the 401(k). */
/* ─ MK-CF-F-011 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * savingsByMonth
 *
 * Answers ..... Discretionary amount free to save each month = take-home that month (after tax & 401k) minus the expenses due that month.
 *
 * Formula .....
 *     avail = income monthly grid(op, 'available')
 *     spend = spend by month(op)
 *     the answer:
 *     for each of avail: label = label
 *     amount = amount − spend[i]
 *
 * Called by ... MK-XS-F-027 takeHomeMonthly · MK-XS-F-028 surplusByMonth
 *               MK-XS-F-030 effectiveAnnualContribution
 *
 * Reaches ..... 80 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 62 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-011
 * Changed ..... 2026-06-22 (9fddd8e)
 */
export function savingsByMonth(op: OnboardingProfile | null): { label: string; amount: number }[] {
  const avail = incomeMonthlyGrid(op, 'available');
  const spend = spendByMonth(op);
  return avail.map((m, i) => ({ label: m.label, amount: (m.amount - spend[i]) }));
}

/** ONE annual cash-flow roll-up, derived entirely from the per-month income grid + spendByMonth — the
 *  SAME bases the savings-plan and budget already use. The recap must use this (not a separate flat
 *  grossAnnual − tax computation) so "Surplus /year" reconciles exactly with the savings screen's
 *  monthly average × 12 (#6: they disagreed because the recap annualized flatly while the savings plan
 *  summed the month-by-month grid). saveYr === Σ savingsByMonth by construction. */
/* ─ MK-CF-F-012 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * annualCashflow
 *
 * Answers ..... ONE annual cash-flow roll-up, derived entirely from the per-month income grid + spendByMonth — the SAME bases the savings-plan and budget already use.
 *
 * Formula .....
 *     sum = Σ over (rows: { amount: number }[]) => rows of (amount)
 *     gross yr = sum(income monthly grid(op, 'gross'))
 *     net yr = sum(income monthly grid(op, 'net'))
 *     available yr = sum(income monthly grid(op, 'available'))
 *     spend yr = Σ over spend by month(op) of (each)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-012
 * Changed ..... 2026-06-22 (080d3c0)
 */
export function annualCashflow(op: OnboardingProfile | null): {
  grossYr: number; taxYr: number; netYr: number; k401Yr: number; availableYr: number; spendYr: number; saveYr: number;
} {
  const sum = (rows: { amount: number }[]) => rows.reduce((t, m) => t + m.amount, 0);
  const grossYr = (sum(incomeMonthlyGrid(op, 'gross')));
  const netYr = (sum(incomeMonthlyGrid(op, 'net')));
  const availableYr = (sum(incomeMonthlyGrid(op, 'available')));
  const spendYr = (spendByMonth(op).reduce((t, m) => t + m, 0));
  return {
    grossYr,
    netYr,
    availableYr,
    spendYr,
    taxYr: (grossYr - netYr),
    k401Yr: (netYr - availableYr),          // available = net − employee 401(k)
    saveYr: (availableYr - spendYr),        // === Σ savingsByMonth
  };
}

/** Turns the answers about expenses given during setup into the stored budget: the monthly total and its three parts, which are fixed bills, once-in-a-while costs and everyday expenses. */
/* ─ MK-CF-F-013 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * budgetFromOnboarding
 *
 * Answers ..... Turns the answers about expenses given during setup into the stored budget: the monthly total and its three parts, which are fixed bills, once-in-a-while costs and everyday expenses.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     b = spend buckets(op)
 *
 * Called by ... MK-XS-F-031 buildSnapshot
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-031 buildSnapshot · MK-XS-F-032 snapshotFromOnboarding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-013
 * Changed ..... 2026-06-13 (bff3637)
 */
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

/** Month-to-date actual expenses vs the planned budget, bucketed. `expenses` is the store's
 *  ExpenseEntry[] (each has amount, category, date 'YYYY-MM-DD'). */
/* ─ MK-CF-F-014 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * budgetVsActual
 *
 * Answers ..... Month-to-date actual expenses vs the planned budget, bucketed.
 *
 * Formula .....
 *     ym = `${now.get full year()}-${string(now.get month() + 1).pad start(2, '0')}`
 *     planned = spend buckets(op)
 *     spent = fixed = 0
 *     nonmonthly = 0
 *     flexible = 0
 *     spent total = spent.fixed + spent.nonmonthly + spent.flexible
 *     the answer:
 *     month = ym
 *     planned total = planned.monthly total
 *     spent total = spent total
 *     remaining = planned.monthly total − spent total
 *     buckets = buckets
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-XS-M-005
 * Reads ....... MK-XS-I-024 logged expenses
 *               MK-XS-I-032 expenses categories the person set up
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-014
 * Changed ..... 2026-06-10 (66e36dc)
 */
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
    { key: 'fixed', planned: planned.fixed, spent: (spent.fixed), remaining: (planned.fixed - spent.fixed) },
    { key: 'nonmonthly', planned: planned.non_monthly, spent: (spent.nonmonthly), remaining: (planned.non_monthly - spent.nonmonthly) },
    { key: 'flexible', planned: planned.flexible, spent: (spent.flexible), remaining: (planned.flexible - spent.flexible) },
  ];
  const spent_total = (spent.fixed + spent.nonmonthly + spent.flexible);
  return { month: ym, planned_total: planned.monthly_total, spent_total, remaining: (planned.monthly_total - spent_total), buckets };
}

const COLLECTION = 'budgets';
export const SURPLUS_CALCULATED = 'SurplusCalculatedEvent';

/** Reads a person's saved budget from storage and calculates nothing. */
/* ─ MK-CF-F-015 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * loadBudget
 *
 * Answers ..... Reads a person's saved budget from storage and calculates nothing.
 *
 * Formula .....
 *     It reaches outside the app for data and hands back what came back — no arithmetic of its own.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-015
 * Changed ..... 2026-06-05 (f742136)
 */
export async function loadBudget(uid: UserId) { return getUserDoc<BudgetDoc>(COLLECTION, uid); }

/** Saves a person's budget to storage and calculates nothing. */
/* ─ MK-CF-F-016 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * saveBudget
 *
 * Answers ..... Saves a person's budget to storage and calculates nothing.
 *
 * Formula .....
 *     It records or announces something and returns no figure — no arithmetic of its own.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-016
 * Changed ..... 2026-06-05 (f742136)
 */
export async function saveBudget(d: BudgetDoc) { await setUserDoc(COLLECTION, d.user_id, d); }
/** Publish the authoritative surplus for Goals/Retirement to consume. */
/* ─ MK-CF-F-017 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * publishSurplus
 *
 * Answers ..... Publish the authoritative surplus for Goals/Retirement to consume.
 *
 * Formula .....
 *     It records or announces something and returns no figure — no arithmetic of its own.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-017
 * Changed ..... 2026-06-05 (f742136)
 */
export function publishSurplus(uid: UserId, projectedToSave: number) {
  emit(SURPLUS_CALCULATED, { user_id: uid, calculated_surplus_cash: projectedToSave });
}
