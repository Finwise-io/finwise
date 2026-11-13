// Dynamic Expense & Budget module (spec service 8). Owns `budgets/{uid}`.
import type { OnboardingProfile } from '../onboardingProfile';
// THE single source of truth for "projected to save" (surplus) — Goals & Retirement read it.
import type { UserId } from '../_shared/ids';
import { toNum } from '../_shared/num';
import { getUserDoc, setUserDoc } from '../_shared/firestore';
import { emit } from '../_shared/eventBus';
import { incomeMonthlyGrid } from '../income';
import { categoryBucketFor } from '../../constants/categories';
import { localDay } from '../_shared/dates';   // the one reader of a stored day (CF-21, 2026-10-25)
import { partsShown } from '../../../MoneyKeel/functions/_figure-spec';   // rows in whole dollars that add up to their printed total

export interface BudgetDoc {
  user_id: UserId;
  // the year's planned expenses ÷ 12 (MK-CF-F-002) — null when no budget was entered (2026-10-25, FIX-BUDGET; tenet 3:
  // nothing entered is not a confirmed $0 plan)
  monthly_spending: number | null;
  fixed: number | null;            // the three groups, each the year's ÷ 12 — they add up to monthly_spending
  non_monthly: number | null;
  flexible: number | null;
  last_updated?: any;
}

export interface BudgetState {
  user_id: UserId;
  monthly_spending: number | null;
  net_monthly_income: number;
  projected_to_save: number | null;   // income − expenses (the monthly surplus); null when no budget is set (DEC-7939)
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
 *     spend = doc.monthly expenses
 *     user id = uid
 *     monthly expenses = nothing
 *     net monthly income = net monthly income
 *     projected to save = nothing   when spend = nothing (or !number.is finite(spend) when missing or zero)
 *     save = net monthly income − spend
 *
 * Called by ... MK-XS-F-031 buildSnapshot
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-031 buildSnapshot · MK-XS-F-032 snapshotFromOnboarding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-001
 * Changed ..... 2026-06-22 (bef9497)
 */
export function buildBudgetState(uid: UserId, netMonthlyIncome: number, doc: BudgetDoc): BudgetState {
  // NO BUDGET, NO PROJECTED SAVING (2026-10-25, FIX-BUDGET; DEC-7939 "no budget set → no planned surplus", tenet 3). A budget
  // never entered reached here as $0 of expenses, so $5,000 of take-home read as $5,000 projected to save. A typed $0 plan is
  // the person's word and is kept: $3,231.17 take-home − $0 = $3,231.17.
  const spend = doc.monthly_spending;
  if (spend == null || !Number.isFinite(spend)) return { user_id: uid, monthly_spending: null, net_monthly_income: netMonthlyIncome, projected_to_save: null };
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
 *     Σ over spend by month(op) of (each)÷ 12
 *
 * Called by ... MK-CF-F-009 monthlyEssentials · MK-CF-F-013 budgetFromOnboarding
 *               MK-CF-F-314 setupEntered · MK-NW-O-004 theEmergencyFund
 *
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-079 EF · MK-CF-F-013 budgetFromOnboarding
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-010 emergencyTest
 *               MK-CF-F-009 monthlyEssentials · MK-XS-F-199 profileOnTheWayIn
 *               MK-CF-F-314 setupEntered · MK-XS-F-032 snapshotFromOnboarding
 *               MK-NW-O-004 theEmergencyFund
 *
 * Serves ...... MK-MN-M-007
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-002
 * Changed ..... 2026-06-24 (fa35cf4)
 */
export function plannedMonthlySpend(op: OnboardingProfile | null): number {
  // THE YEAR'S PLANNED EXPENSES ÷ 12 — the twelve months the Cash flow tab plans, added up (2026-10-24, CF-FIX; B-24: the
  // budget and the month grid read one figure). A bill with its own month is on top of the typed monthly total, in that
  // month (DEC-0002, DEC-0447), so $2,000/month typed and a $1,200 bill in December is 2,000 + 1,200 ÷ 12 = $2,100. It read
  // the larger of the categories and the typed total, $2,000: the bill taken to be inside the typed total.
  return spendByMonth(op).reduce((t, m) => t + m, 0) / 12;
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
 * Called by ... MK-CF-F-003 categoryMonthly · MK-CF-F-221 spendByMonthByBucket
 *               MK-CF-F-255 spendByMonthByCategory
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
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
/* ─ MK-CF-F-003 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
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
 * Called by ... MK-CF-F-004 spendBuckets · MK-CF-F-009 monthlyEssentials
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
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
 *     cats = categories in force(op)
 *     fixed = to num(b fixed), non = to num(b nonmonthly), flex = to num(b flexible)
 *     the answer:
 *     fixed = fixed
 *     non monthly = non
 *     flexible = flex
 *     monthly total = fixed + non + flex
 *     dated = 0
 *     fixed = 0, flex = 0, non mo = 0, dated = 0, any monthly category = false
 *     m = category monthly(c, op); if (m ≤ 0) continue
 *
 * Called by ... MK-CF-F-221 spendByMonthByBucket
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-032 expenses categories the person set up
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-004
 * Changed ..... 2026-06-27 (6eb9522)
 */
export function spendBuckets(op: OnboardingProfile | null): { fixed: number; non_monthly: number; flexible: number; monthly_total: number; dated: number } {
  const a = op ?? {};
  // `dated` (2026-10-27, FX-CF-B; workplan #322): the part of non_monthly that is bills given their own months, as a month's
  // twelfth — the part spendByMonthByBucket adds on top of the monthly figure typed (DEC-7951), never inside it. Sign-up's budget
  // step reads it so its figures are the recap's: $1,200 given December is $100 here, on top of the $2,000 typed.
  // ONE RULE FOR WHEN CATEGORIES REPLACE THE TOTALS TYPED BY GROUP (categoriesInForce, 2026-10-25, FIX-BUDGET; DEC-7951; tenet 4):
  // an empty category list was read as categories, so typed $1,000 / $100 / $900 became $0 here while the month table read
  // $1,000 + $900 — two readers, two answers. Now both read $1,000 / $100 / $900.
  const cats = categoriesInForce(op);
  if (!cats) {
    const fixed = toNum(a.b_fixed), non = toNum(a.b_nonmonthly), flex = toNum(a.b_flexible);
    return { fixed, non_monthly: non, flexible: flex, monthly_total: (fixed + non + flex), dated: 0 };
  }
  let fixed = 0, flex = 0, nonMo = 0, dated = 0, anyMonthlyCategory = false;
  for (const c of cats) {
    const m = categoryMonthly(c, op); if (m <= 0) continue;                     // the shared per-category $
    if (c?.bucket === 'nonmonthly') { nonMo += m; if (Array.isArray(c?.months) && c.months.length > 0) dated += m; }
    else { if (c?.bucket === 'fixed') fixed += m; else flex += m; anyMonthlyCategory = true; }
  }
  // the typed bills & fixed / everyday split stands while no category of either kind replaces it — as the month table reads it
  // (spendByMonthByBucket): his DEC-7951 household, $1,100 / $900 typed beside a $1,200 December bill, is 1,100 + 100 + 900
  if (!anyMonthlyCategory) { fixed += toNum(a.b_fixed); flex += toNum(a.b_flexible); }
  return { fixed: (fixed), non_monthly: (nonMo), flexible: (flex), monthly_total: (fixed + nonMo + flex), dated };
}

/** What it is for: THE ONE RULE FOR WHEN THE BUDGET'S CATEGORIES REPLACE THE TOTALS TYPED BY GROUP (2026-10-25, FIX-BUDGET; the
 *  outside audit MK-CF-F-004-C02; DEC-7951; tenet 4). The categories count once at least one of them is given an amount; a list
 *  that is empty, or holds only categories left at $0, is no categories, and the totals typed by group (b_fixed, b_nonmonthly,
 *  b_flexible) stand. spendBuckets, spendByMonthByBucket and monthlyEssentials all ask it, so they cannot read one budget two
 *  ways. Worked by hand: no categories and $1,000 / $100 / $900 typed → $1,000 / $100 / $900 (an empty list read $0 / $0 / $0). */
/* ─ MK-CF-F-254 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * categoriesInForce
 *
 * Answers ..... What it is for: THE ONE RULE FOR WHEN THE BUDGET'S CATEGORIES REPLACE THE TOTALS TYPED BY GROUP (2026-10-25, FIX-BUDGET; the outside audit MK-CF-F-004-C02; DEC-7951; tenet 4).
 *
 * Formula .....
 *     cats = op!.spend cats!   if array.is array(op.spend cats)
 *     nothing   otherwise
 *     the answer:
 *     cats   if cats and cats.some((c) => to num(amount) > 0)
 *     nothing   otherwise
 *
 * Called by ... MK-CF-F-004 spendBuckets · MK-CF-F-009 monthlyEssentials
 *               MK-CF-F-221 spendByMonthByBucket · MK-CF-F-257 budgetEntered
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-032 expenses categories the person set up
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-254
 * Changed ..... not in git yet (—)
 */
function categoriesInForce(op: OnboardingProfile | null): NonNullable<OnboardingProfile['spendCats']> | null {
  const cats = Array.isArray(op?.spendCats) ? op!.spendCats! : null;
  return cats && cats.some((c) => toNum(c?.amount) > 0) ? cats : null;
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
 *     pct = Σ over all pct ? nm of (amount read as a number (0 when it is not one)): 0
 *     the answer = { all pct, pct }
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-MN-M-010
 * Reads ....... MK-XS-I-032 expenses categories the person set up
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-007
 * Changed ..... 2026-06-28 (cad76ca)
 */
export function nonMonthlyBasis(op: OnboardingProfile | null): { allPct: boolean; pct: number } {
  const cats = Array.isArray(op?.spendCats) ? op!.spendCats! : [];
  const nm = cats.filter((c) => c?.bucket === 'nonmonthly' && toNum(c?.amount) > 0);
  const allPct = nm.length > 0 && nm.every((c) => c?.unit === 'pct');
  // the share kept whole, rounded only when printed (2026-10-26, CLEANUP-LEFT; Q49): it was rounded to a whole percent here
  const pct = allPct ? nm.reduce((t, c) => t + toNum(c?.amount), 0) : 0;
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
 *     for each of spend by month by bucket(op): fixed + nonmonthly + flexible
 *
 * Called by ... MK-CF-F-002 plannedMonthlySpend · MK-CF-F-011 savingsByMonth
 *               MK-CF-F-012 annualCashflow · MK-PL-F-098 goalsCapacity
 *               MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-008
 * Changed ..... 2026-06-24 (fa35cf4)
 */
export function spendByMonth(op: OnboardingProfile | null): number[] {
  // ONE PRODUCER (2026-10-23): the month's planned expenses are the three groups of spendByMonthByBucket added up, so the
  // This month row and the Expenses tab's rows can never give two answers for one month
  return spendByMonthByBucket(op).map((b) => b.fixed + b.nonmonthly + b.flexible);
}

/** THE MONTH'S PLANNED EXPENSES, BY THE BUDGET'S OWN THREE GROUPS — each calendar month, January first (2026-10-23).
 *  Bills & fixed and everyday expenses come every month; a once-a-year (or once-in-a-while) bill counts in the months it
 *  falls in, never spread — his rules DEC-0002 (big bills that come once get their own list) and DEC-0447 (money that arrives
 *  once lands in its own month, not spread across twelve), and MK-CF-M-048's "a bill that falls once a year is shown in its
 *  own month, never spread". A once-in-a-while bill with no months set is the one exception: it has no month to land in, so
 *  it is a twelfth a month, as it always was. What the plan's total holds beyond its categories counts with everyday
 *  expenses. Until 2026-10-23 the Expenses tab's rows read the budget's monthly average (budgetVsActual), so a September with a
 *  $1,200 December bill read Expenses −$700 on This month and PLANNED EXPENSES $800 on the Expenses tab. */
/* ─ MK-CF-F-221 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * spendByMonthByBucket
 *
 * Answers ..... THE MONTH'S PLANNED EXPENSES, BY THE BUDGET'S OWN THREE GROUPS — each calendar month, January first (2026-10-23).
 *
 * Formula .....
 *     a = op (or none when missing)
 *     out = array.from({ length: 12 }, () => ({ fixed: 0, nonmonthly: 0, flexible: 0 }))
 *     cats = categories in force(op)
 *     net monthly = pct base monthly(op)
 *     every month = 0
 *     any monthly category = false
 *     amt = to num(amount); if (amt ≤ 0) continue
 *     pct = unit = 'pct'
 *     typed fixed = to num(b fixed), typed flexible = to num(b flexible)
 *     flat = spend buckets(op)
 *     uncategorized = max(0, to num(monthly expenses) − every month)
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-004 spendBuckets · MK-CF-F-008 spendByMonth
 *               MK-CF-F-013 budgetFromOnboarding · MK-CF-F-014 budgetVsActual
 *               MK-CF-F-157 debtPaymentsByDebt · MK-CF-F-204 line
 *               MK-CF-F-255 spendByMonthByCategory · MK-CF-F-256 budgetEditorBuckets
 *               MK-CF-O-010 theMonth
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *               MK-XS-I-032 expenses categories the person set up
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · Uses a built-in every month of 0.
 *     · Treats a year as twelve equal months.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-221
 * Changed ..... not in git yet (—)
 */
export function spendByMonthByBucket(op: OnboardingProfile | null): { fixed: number; nonmonthly: number; flexible: number }[] {
  const a = op ?? {};
  const out = Array.from({ length: 12 }, () => ({ fixed: 0, nonmonthly: 0, flexible: 0 }));
  // categories count once one is given an amount (categoriesInForce, 2026-10-25, FIX-BUDGET): an empty list kept the typed $1,000 /
  // $900 but dropped the typed $100 once in a while, while spendBuckets dropped all three
  const cats = categoriesInForce(op);
  const netMonthly = pctBaseMonthly(op);
  // WHAT THE PLAN PUTS IN EVERY MONTH — the yardstick the typed monthly total is measured against. A bill with its own months
  // is not in it: it is added in the months it falls, never taken out of everyday expenses as a twelfth (DEC-0002, DEC-0447;
  // 2026-10-24, CF-FIX). Until then the typed $2,000 was read as already holding a twelfth of a $1,200 bill added on the Bill
  // calendar — everyday expenses fell to $1,900 in every month — and the typed $1,100 / $900 split was dropped once any
  // category existed.
  let everyMonth = 0;
  if (cats) {
    let anyMonthlyCategory = false;
    for (const c of cats) {
      const amt = toNum(c?.amount); if (amt <= 0) continue;
      const pct = c?.unit === 'pct';
      if (c?.bucket === 'nonmonthly') {
        const yearly = pct ? (amt / 100) * netMonthly * 12 : amt;
        const months = Array.isArray(c?.months) && c.months.length ? c.months : null;
        if (months) for (const m of months) out[Math.min(11, Math.max(0, m - 1))].nonmonthly += yearly / months.length;
        else { for (let i = 0; i < 12; i++) out[i].nonmonthly += yearly / 12; everyMonth += yearly / 12; }
      } else {
        const m = pct ? (amt / 100) * netMonthly : amt;
        const group = c?.bucket === 'fixed' ? 'fixed' : 'flexible';
        for (let i = 0; i < 12; i++) out[i][group] += m;
        everyMonth += m; anyMonthlyCategory = true;
      }
    }
    // the typed bills & fixed / everyday split stands while no category of either kind replaces it
    if (!anyMonthlyCategory) {
      const typedFixed = toNum(a.b_fixed), typedFlexible = toNum(a.b_flexible);
      for (let i = 0; i < 12; i++) { out[i].fixed += typedFixed; out[i].flexible += typedFlexible; }
      everyMonth += typedFixed + typedFlexible;
    }
  } else {
    const flat = spendBuckets(op);
    for (let i = 0; i < 12; i++) { out[i].fixed += flat.fixed; out[i].nonmonthly += flat.non_monthly; out[i].flexible += flat.flexible; }
    everyMonth = flat.monthly_total;
  }
  const uncategorized = Math.max(0, toNum(a.monthlySpending) - everyMonth);
  if (uncategorized > 0) for (let i = 0; i < 12; i++) out[i].flexible += uncategorized;
  return out;
}

/** The words for the budget's three groups, written once: Expenses' planned rows and This month read them. */
/* ─ MK-CF-F-283 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * PLANNED_GROUP_WORDS
 *
 * Answers ..... The budget's three groups in the words the Expenses tab draws them — Bills & fixed, Once in a while, Everyday expenses; words only, it calculates nothing.
 *
 * Called by ... MK-CF-F-255 spendByMonthByCategory · useCashflowModel (BUCKET_WORDS)
 *
 * Numbered by hand 2026-10-26 (PF-TOOLS, the lead's instruction): the scan that issues identifiers reads functions in the
 *               calculation folders only, so this constant has no generated record; this one is written by hand in the generated form,
 *               as MK-NW-F-145's is
 * Changed ..... not in git yet (—)
 */
export const PLANNED_GROUP_WORDS: Record<'fixed' | 'nonmonthly' | 'flexible', string> = { fixed: 'Bills & fixed', nonmonthly: 'Once in a while', flexible: 'Everyday expenses' };

/** What it is for: THE MONTH'S PLANNED EXPENSES THE WAY THE BUDGET WAS ENTERED — each calendar month, January first (2026-10-25,
 *  Cash flow drawing match CF-09). The approved Expenses tab (cash-flow_v01, frame C) lists the budget by its own categories —
 *  Gas $200 · Grocery $900 · Utilities $200 · Other $700 · = Total $2,000 — and the tab listed only the three groups (Bills &
 *  fixed $200 · Everyday expenses $1,800). Each category given an amount is a row, in the order it was entered: one that
 *  comes once a year in the months it falls, never as a twelfth elsewhere (DEC-0002, DEC-0447). What the categories leave of
 *  a month's group is one more row: "Other" when it is the rest of the monthly total; the group's own name when no category
 *  of that kind replaced a split typed by group. A budget typed only by group reads by group, as before. Each month's rows
 *  add up, group by group, to spendByMonthByBucket (MK-CF-F-221) — the same arithmetic, so This month's Expenses row and
 *  this list are one figure. Worked by hand: $2,000/month, Gas $200, Grocery $900, Utilities $200 → Gas 200 · Grocery
 *  900 · Utilities 200 · Other 2,000 − 1,300 = 700. */
/* ─ MK-CF-F-255 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * spendByMonthByCategory
 *
 * Answers ..... What it is for: THE MONTH'S PLANNED EXPENSES THE WAY THE BUDGET WAS ENTERED — each calendar month, January first (2026-10-25, Cash flow drawing match CF-09).
 *
 * Formula .....
 *     a = op (or none when missing)
 *     by bucket = spend by month by bucket(op)
 *     keys = ['fixed', 'nonmonthly', 'flexible'] as const
 *     named = spend cats   if array.is array(spend cats)
 *     []   otherwise where to num(amount) > 0 and string(label ?? '').trim() ! = ''
 *     for each of by bucket: KEYS where each[each] > 0for each of : label = PLANNED_GROUP_WORDS[each]
 *     bucket = each
 *     monthly = each[each]   when count of named is missing
 *     net monthly = pct base monthly(op)
 *     out = array.from({ length: 12 }, () => new map<string, row>())
 *     r = out[i].get(label) (or { label, bucket, monthly: 0 }; monthly += v; out[i].set(label, r) when missing)
 *     any monthly category = false
 *     amt = amount read as a number (0 when it is not one)
 *     pct = unit = 'pct'
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-256 budgetEditorBuckets · MK-CF-O-010 theMonth
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-032 expenses categories the person set up
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · Treats a year as twelve equal months.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-255
 * Changed ..... not in git yet (—)
 */
export function spendByMonthByCategory(op: OnboardingProfile | null): { label: string; bucket: 'fixed' | 'nonmonthly' | 'flexible'; monthly: number }[][] {
  type Row = { label: string; bucket: 'fixed' | 'nonmonthly' | 'flexible'; monthly: number };
  const a = op ?? {};
  const byBucket = spendByMonthByBucket(op);
  const KEYS = ['fixed', 'nonmonthly', 'flexible'] as const;
  const named = (Array.isArray(a.spendCats) ? a.spendCats : []).filter((c: any) => toNum(c?.amount) > 0 && String(c?.label ?? '').trim() !== '');
  if (!named.length) return byBucket.map((g) => KEYS.filter((k) => g[k] > 0).map((k) => ({ label: PLANNED_GROUP_WORDS[k], bucket: k, monthly: g[k] })));
  const netMonthly = pctBaseMonthly(op);
  const out = Array.from({ length: 12 }, () => new Map<string, Row>());
  const add = (i: number, label: string, bucket: Row['bucket'], v: number) => {
    const r = out[i].get(label) ?? { label, bucket, monthly: 0 }; r.monthly += v; out[i].set(label, r);
  };
  let anyMonthlyCategory = false;
  for (const c of named as any[]) {
    const amt = toNum(c.amount);
    const pct = c.unit === 'pct';
    if (c.bucket === 'nonmonthly') {
      const yearly = pct ? (amt / 100) * netMonthly * 12 : amt;
      const months = Array.isArray(c.months) && c.months.length ? c.months : null;
      if (months) for (const m of months) add(Math.min(11, Math.max(0, m - 1)), String(c.label), 'nonmonthly', yearly / months.length);
      else for (let i = 0; i < 12; i++) add(i, String(c.label), 'nonmonthly', yearly / 12);
    } else {
      const m = pct ? (amt / 100) * netMonthly : amt;
      for (let i = 0; i < 12; i++) add(i, String(c.label), c.bucket === 'fixed' ? 'fixed' : 'flexible', m);
      anyMonthlyCategory = true;
    }
  }
  return out.map((rows, i) => {
    for (const k of KEYS) {
      const placed = [...rows.values()].filter((r) => r.bucket === k).reduce((t, r) => t + r.monthly, 0);
      const rest = byBucket[i][k] - placed;
      if (rest > 1e-9) add(i, anyMonthlyCategory ? 'Other' : PLANNED_GROUP_WORDS[k], k, rest);
    }
    return [...rows.values()].filter((r) => r.monthly > 0);
  });
}

/** What it is for: THE BUDGET EDITOR'S BUCKETS AND THE ROWS UNDER THEM, FOR THIS MONTH (2026-10-25, Cash flow drawing match CF-21;
 *  DEC-3523 tenet 2, the rows under a total add up to it). Each bucket's plan is this month's (spendByMonthByBucket), so the buckets
 *  add up to the card's "− Expenses (plan)"; what is spent is the month's expenses read once (budgetVsActual), so the rows add up
 *  to their bucket. A budget entered by category lists each category with its plan this month and the rest of the monthly total
 *  as Other (spendByMonthByCategory, the list the Expenses tab prints); a budget typed by group lists what was spent by category,
 *  with no plan of its own. Each row's printed spend shares its bucket's printed spend (partsShown), so the rows as printed add up.
 *  The editor had read its rows from a second sum that dated "2026-08-01" Jul 31 in a US time zone and counted debt payments:
 *  Fixed $22 over rows of $400 + $22, Flexible $1,678 over rows of $1,256. Worked by hand, frame C's month with Gas $200, Grocery
 *  $900, Utilities $200 and $2,000 in all: Fixed $22 of $200 — Utilities $22 of $200; Flexible $1,678 of $1,800 — Other $1,075 of
 *  $700, Grocery $418 of $900, Gas $185 of $200 (1,075 + 418 + 185 = 1,678; 700 + 900 + 200 = 1,800; 200 + 1,800 = 2,000). */
/* ─ MK-CF-F-256 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * budgetEditorBuckets
 *
 * Answers ..... What it is for: THE BUDGET EDITOR'S BUCKETS AND THE ROWS UNDER THEM, FOR THIS MONTH (2026-10-25, Cash flow drawing match CF-21; DEC-3523 tenet 2, the rows under a total add up to it).
 *
 * Formula .....
 *     m = now.get month()
 *     bva = budget vs actual(expenses, op, now)
 *     planned of = (k: 'fixed' | 'nonmonthly' | 'flexible') => bva.buckets.find((b) => key = k).planned (or 0 when missing)
 *     spent of = a lookup of for each of bva.categories: [label, each]
 *     by category = (array.is array(op.spend cats) ? op!.spend cats : []).some((c: any) => to num(amount) > 0 and string(label ?? '').trim() ! = '')
 *     keys = ['fixed', 'nonmonthly', 'flexible'] as const
 *     rows = fixed = []
 *     nonmonthly = []
 *     flexible = []
 *     seen = new set<string>()
 *     bucket = spent of.get(label).bucket (or bucket when missing)
 *     sorted = rows[k].slice().sort((a, b) => spent − spent)
 *     shown = parts shown(sorted.map((r) => spent)).parts
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *               MK-XS-I-032 expenses categories the person set up
 *
 * Decides .....
 *     · If planned is missing it uses 0.
 *     · If spent is missing it uses 0.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-256
 * Changed ..... not in git yet (—)
 */
export function budgetEditorBuckets(expenses: any[], op: OnboardingProfile | null, now: Date = new Date()): {
  key: 'fixed' | 'nonmonthly' | 'flexible'; planned: number; spent: number;
  rows: { label: string; planned: number; spent: number; spentShown: number }[];
}[] {
  const m = now.getMonth();
  // the month's plan and what is spent, both from budgetVsActual — since 2026-10-25 (FIX-BUDGET, MK-CF-F-014) its plan is this
  // month's own (spendByMonthByBucket), so the buckets and the budget card are one reading
  const bva = budgetVsActual(expenses, op, now);
  const plannedOf = (k: 'fixed' | 'nonmonthly' | 'flexible') => bva.buckets.find((b) => b.key === k)?.planned ?? 0;
  const spentOf = new Map(bva.categories.map((c) => [c.label, c]));
  const byCategory = (Array.isArray(op?.spendCats) ? op!.spendCats : []).some((c: any) => toNum(c?.amount) > 0 && String(c?.label ?? '').trim() !== '');
  const KEYS = ['fixed', 'nonmonthly', 'flexible'] as const;
  const rows: Record<string, { label: string; planned: number; spent: number }[]> = { fixed: [], nonmonthly: [], flexible: [] };
  const seen = new Set<string>();
  for (const r of byCategory ? (spendByMonthByCategory(op)[m] ?? []) : []) {
    // a category with spend sits in the bucket its spend is counted in, so its row is inside that bucket's total
    const bucket = spentOf.get(r.label)?.bucket ?? r.bucket;
    rows[bucket].push({ label: r.label, planned: r.monthly, spent: spentOf.get(r.label)?.spent ?? 0 });
    seen.add(r.label);
  }
  for (const c of bva.categories) if (!seen.has(c.label)) rows[c.bucket].push({ label: c.label, planned: 0, spent: c.spent });
  return KEYS.map((k) => {
    const sorted = rows[k].slice().sort((a, b) => b.spent - a.spent);
    const shown = partsShown(sorted.map((r) => r.spent)).parts;
    return { key: k, planned: plannedOf(k), spent: bva.buckets.find((b) => b.key === k)?.spent ?? 0,
      rows: sorted.map((r, i) => ({ ...r, spentShown: shown[i] })) };
  });
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
 *     cats = categories in force(op)
 *     planned monthly spend(op)   when cats is missing
 *     ess = 0
 *     every month = 0
 *     m = category monthly(c, op); if (m ≤ 0) continue
 *     dated = bucket = 'nonmonthly' and array.is array(months) and months.length > 0
 *     uncategorized = max(0, to num(monthly expenses) − every month)
 *     the answer = ess + uncategorized
 *
 * Called by ... MK-CF-F-010 emergencyTest · MK-NW-O-004 theEmergencyFund
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-079 EF · MK-CF-F-010 emergencyTest
 *               MK-XS-F-199 profileOnTheWayIn · MK-NW-O-004 theEmergencyFund
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-025 typical monthly essentials
 *
 * Decides .....
 *     · Uses a built-in ess of 0.
 *     · Uses a built-in every month of 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-009
 * Changed ..... 2026-06-24 (fa35cf4)
 */
export function monthlyEssentials(op: OnboardingProfile | null): number {
  const a = op ?? {};
  // categories count once one is given an amount (categoriesInForce, 2026-10-25, FIX-BUDGET) — the rule the buckets and the month
  // table read; an empty list or only $0 categories is no categories
  const cats = categoriesInForce(op);
  // B-33: with no itemized categories we can't separate wants from needs, so treat the stated total
  // spend as must-pay (conservative for an emergency-fund target). Returning $0 here let the stress
  // test claim "strong emergency fund" with $0 cash while also saying the user would go into the red.
  if (!cats) return plannedMonthlySpend(op);
  let ess = 0;
  // the typed total is measured against what the categories put in every month: a bill with its own months is not in it
  // (DEC-0002, DEC-0447; 2026-10-24, CF-FIX — it was, so $2,000 typed beside a $1,200 dated bill read $1,900 of must-pay). Added
  // here from the categories themselves (2026-10-25, FIX-BUDGET): spendBuckets now also holds the typed split beside
  // once-a-year-only categories (DEC-7951), which is the typed total's own content, not a category's
  let everyMonth = 0;
  for (const c of cats) {
    const m = categoryMonthly(c, op); if (m <= 0) continue;   // the shared per-category $ (a % of take-home after tax and 401(k))
    const dated = c?.bucket === 'nonmonthly' && Array.isArray(c?.months) && c.months.length > 0;
    if (!dated) everyMonth += m;
    if (c?.bucket === 'nonmonthly') continue;                 // lumpy, planned separately
    if ((c?.tier ?? 'flex') === 'flex') continue;             // wants aren't essentials
    ess += m;
  }
  const uncategorized = Math.max(0, toNum(a.monthlySpending) - everyMonth);
  return (ess + uncategorized);
}

export interface ShockResult {
  shock: number;
  cashAfter: number;          // cash left right after the hit
  monthlyEssentials: number;  // what you must keep paying each month
  // the four below are null with $0 of essentials: cash ÷ $0 is no count of months, and a $0 target is no fund (2026-10-25)
  runwayAfter: number | null;      // months your remaining cash covers essentials after the hit
  jobLossRunway: number | null;    // months your cash lasts with NO income (no shock)
  coversIt: boolean;          // cash absorbs the shock without going negative
  recommendedFund: number | null;  // low end of a 3–6 month emergency fund (3× essentials)
  gapToFund: number | null;        // how far your cash is from that
}
/** "What if a $X emergency hit right now?" — can your cash absorb it, and how long would you last. */
/* ─ MK-CF-F-010 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * emergencyTest
 *
 * Answers ..... "What if a $X emergency hit right now?" — can your cash absorb it, and how long would you last.
 *
 * Formula .....
 *     ess = essentials override   if essentials override ≠ nothing and number.is finite(essentials override)
 *     monthly essentials(op)   otherwise
 *     cash after = cash − shock
 *     known = ess > 0
 *     recommended fund = ess × 3   if known
 *     nothing   otherwise
 *
 * Called by ... MK-NW-O-004 theEmergencyFund
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-079 EF · MK-XS-F-199 profileOnTheWayIn
 *               MK-NW-O-004 theEmergencyFund
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
  // A FIGURE HANDED IN IS KEPT, $0 INCLUDED (2026-10-25, FIX-BUDGET; the outside audit MK-CF-F-010; tenets 1, 3, 5): a $0 handed
  // in was replaced by the typed plan ($2,000), so the months were worked on a figure the screen never showed.
  const ess = essentialsOverride != null && Number.isFinite(essentialsOverride) ? essentialsOverride : monthlyEssentials(op);
  const cashAfter = (cash - shock);
  // NO ESSENTIALS, NO MONTHS AND NO TARGET — never a 0 that reads as an answer (2026-10-25, FIX-BUDGET; MK-CF-F-010-C05). $6,000
  // of cash, a $1,000 hit and $0 of essentials read "0 months" before and after the hit, a $0 fund and no gap — and the Stress
  // test printed "about 0.0 months" over "✓ You already have at least 3 months". Its door, MK-NW-O-004, already refuses both
  // ("never divided by nothing"); the hit itself (covered, $5,000 left) is a real answer and stands.
  const known = ess > 0;
  const recommendedFund = known ? (ess * 3) : null;
  return {
    shock: (shock),
    cashAfter,
    monthlyEssentials: ess,
    runwayAfter: known ? (Math.max(0, cashAfter) / ess) : null,
    jobLossRunway: known ? (cash / ess) : null,
    coversIt: cashAfter >= 0,
    recommendedFund,
    gapToFund: recommendedFund == null ? null : (Math.max(0, recommendedFund - cash)),
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
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
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
 *     user id = uid
 *     monthly expenses = nothing
 *     fixed = nothing
 *     non monthly = nothing
 *     flexible = nothing   when !budget entered(op)
 *     months = spend by month by bucket(op)
 *     year of = Σ over (k: 'fixed' | 'nonmonthly' | 'flexible') => months of (each[k])÷ 12
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
  // NOTHING ENTERED IS NOT A $0 PLAN (2026-10-25, FIX-BUDGET; the outside audit MK-CF-F-013-C02; tenet 3): a budget never entered was
  // stored exactly as a confirmed $0 plan, and buildBudgetState then called the whole take-home projected to save. A typed $0
  // is the person's word and is stored as $0.
  if (!budgetEntered(op)) return { user_id: uid, monthly_spending: null, fixed: null, non_monthly: null, flexible: null };
  // THE PARTS ADD UP TO THE TOTAL, FROM ONE PRODUCER (2026-10-25, FIX-BUDGET; the outside verdict on MK-CF-F-013; DEC-7951; tenet 2): the total
  // is the year's planned expenses ÷ 12 (MK-CF-F-002) and each group is that group's year ÷ 12 (spendByMonthByBucket, the month
  // table's own). His DEC-7951 household — $2,000 typed as $1,100 / $900 and a $1,200 December bill — is stored as $2,100 = 1,100
  // + 100 + 900; it was $2,100 over parts of $0 / $100 / $0. The average is stored once and every dated bill is inside it once:
  // nothing reads a stored budget back into the typed total (saveBudget and loadBudget have no caller), so the December bill
  // cannot be added a second time.
  const months = spendByMonthByBucket(op);
  const yearOf = (k: 'fixed' | 'nonmonthly' | 'flexible') => months.reduce((t, m) => t + m[k], 0) / 12;
  return {
    user_id: uid,
    // B-24/B-50: count the full stated total (itemized buckets PLUS any uncategorized remainder) via
    // the shared plannedMonthlySpend helper — one definition for budget, runway, and essentials.
    monthly_spending: plannedMonthlySpend(op),
    fixed: yearOf('fixed'), non_monthly: yearOf('nonmonthly'), flexible: yearOf('flexible'),
  };
}

/** What it is for: WHETHER A BUDGET WAS ENTERED AT ALL (2026-10-25, FIX-BUDGET; tenet 3, unknown is not zero). Something
 *  typed counts — a monthly total, $0 included (the person's word), a total typed by group, or a category given an amount; no
 *  profile, or none of these, is no plan. budgetFromOnboarding asks it before it stores anything. Worked by hand: no profile →
 *  no plan; "monthlySpending: 0" → a $0 plan; one $1,231.17 December bill and nothing else → a plan. */
/* ─ MK-CF-F-257 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * budgetEntered
 *
 * Answers ..... What it is for: WHETHER A BUDGET WAS ENTERED AT ALL (2026-10-25, FIX-BUDGET; tenet 3, unknown is not zero).
 *
 * Formula .....
 *     false   when op is missing
 *     typed = (v: unknown) => v ≠ nothing and string(v).trim() ! = '' and number.is finite(number(string(v).replace( ÷ [$,\s] ÷ g, '')))
 *     true   when [op.monthly expenses, op.b fixed, op.b nonmonthly, op.b flexible].some(typed)
 *     the answer = categories in force(op) ≠ nothing
 *
 * Called by ... MK-CF-F-013 budgetFromOnboarding · MK-CF-O-020 theBudgetCounted
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-032 expenses categories the person set up
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-257
 * Changed ..... not in git yet (—)
 */
export function budgetEntered(op: OnboardingProfile | null): boolean {
  if (!op) return false;
  const typed = (v: unknown) => v != null && String(v).trim() !== '' && Number.isFinite(Number(String(v).replace(/[$,\s]/g, '')));
  if ([op.monthlySpending, op.b_fixed, op.b_nonmonthly, op.b_flexible].some(typed)) return true;
  return categoriesInForce(op) != null;
}

export interface BucketActual { key: 'fixed' | 'nonmonthly' | 'flexible'; planned: number; spent: number; remaining: number; }
export interface BudgetVsActual {
  month: string;            // 'YYYY-MM'
  planned_total: number;    // this calendar month's planned expenses (the dated plan, MK-CF-F-221 — never the year's average)
  spent_total: number;      // month-to-date actual
  remaining: number;        // planned − spent
  buckets: BucketActual[];
  /** each category's month-to-date spend and the bucket it is counted in — the rows under a bucket on the budget editor,
   *  read from the same expenses by the same rules as the bucket, so the rows add up to it (2026-10-25, CF-21) */
  categories: { label: string; bucket: BucketActual['key']; spent: number }[];
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
 *     g = spend by month by bucket(op)[now.get month()] (or fixed = 0
 *     nonmonthly = 0
 *     flexible = 0 when missing)
 *     planned = fixed = fixed
 *     non monthly = nonmonthly
 *     flexible = flexible
 *     monthly total = fixed + nonmonthly + flexible
 *     spent = fixed = 0
 *     nonmonthly = 0
 *     flexible = 0
 *     by category = new map<string, { label: string; bucket: bucket actual['key']; spent: number }>()
 *     bucket = category bucket for(category, custom) as bucket actual['key']
 *     label = string(category ?? '')
 *     row = by category.get(label) (or label = label
 *     bucket = bucket
 *     spent = 0 when missing)
 *     spent total = spent.fixed + spent.nonmonthly + spent.flexible
 *     the answer:
 *     month = ym
 *     planned total = planned.monthly total
 *     spent total = spent total
 *     remaining = planned.monthly total − spent total
 *     buckets = buckets
 *     categories = [...by category.values()]
 *
 * Called by ... MK-CF-F-008 spendByMonth · MK-CF-F-255 spendByMonthByCategory
 *               MK-CF-F-256 budgetEditorBuckets
 *
 * Reaches ..... 689 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 671 more — the full list is on functions_from_code
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
  // THE MONTH'S OWN PLAN, NEVER THE YEAR'S AVERAGE (2026-10-25, FIX-BUDGET; the outside audit MK-CF-F-014; DEC-7611, DEC-7951;
  // tenet 4): the plan is that calendar month's from spendByMonthByBucket (MK-CF-F-221), the producer This month and the Expenses
  // tab read. $2,000/month and $1,200 of insurance due in December plan $2,000 in September and $3,200 in December — $25,200 in
  // the year; it planned the $2,100 average in both. A month with only another month's bill plans $0 (it planned $100).
  const g = spendByMonthByBucket(op)[now.getMonth()] ?? { fixed: 0, nonmonthly: 0, flexible: 0 };
  const planned = { fixed: g.fixed, non_monthly: g.nonmonthly, flexible: g.flexible, monthly_total: g.fixed + g.nonmonthly + g.flexible };
  const custom = (Array.isArray(op?.spendCats) ? op!.spendCats : [])
    .filter((c) => c?.custom && !!c.label)
    .map((c) => ({ label: c.label!, bucket: c.bucket }));
  const spent: Record<string, number> = { fixed: 0, nonmonthly: 0, flexible: 0 };
  const byCategory = new Map<string, { label: string; bucket: BucketActual['key']; spent: number }>();
  for (const e of expenses ?? []) {
    if (!localDay(e?.date).startsWith(ym)) continue;      // the expense's own day, where the person is (CF-21)
    if (e?.category === 'Debt payment') continue;          // debt is tracked separately, not in the expense budget
    const bucket = categoryBucketFor(e.category, custom) as BucketActual['key'];
    spent[bucket] += toNum(e.amount);
    const label = String(e?.category ?? '');
    const row = byCategory.get(label) ?? { label, bucket, spent: 0 };
    row.spent += toNum(e.amount);
    byCategory.set(label, row);
  }
  const buckets: BucketActual[] = [
    { key: 'fixed', planned: planned.fixed, spent: (spent.fixed), remaining: (planned.fixed - spent.fixed) },
    { key: 'nonmonthly', planned: planned.non_monthly, spent: (spent.nonmonthly), remaining: (planned.non_monthly - spent.nonmonthly) },
    { key: 'flexible', planned: planned.flexible, spent: (spent.flexible), remaining: (planned.flexible - spent.flexible) },
  ];
  const spent_total = (spent.fixed + spent.nonmonthly + spent.flexible);
  return { month: ym, planned_total: planned.monthly_total, spent_total, remaining: (planned.monthly_total - spent_total), buckets, categories: [...byCategory.values()] };
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
