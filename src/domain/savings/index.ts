// Savings (the FLOW) + savings rate — Term #10. "Savings" is never a balance (that's Cash); it's the
// money set aside per month, and its % of income. Two coherent standard rates (numerator and
// denominator share a basis), researched 2026-06-22:
//   • Cash savings rate (50/30/20): money set aside ÷ TAKE-HOME, excl 401(k) + debt. ~20% benchmark.
//   • Total savings rate (Fidelity): (cash saved + 401(k) + employer match) ÷ GROSS. ~15% benchmark.
import { toNum } from '../_shared/num';
import type { OnboardingProfile } from '../onboardingProfile';
import { incomeMonthlyGrid, totalGrossAnnual, employerMatchMonthly } from '../income';
import { plannedMonthlySpend, savingsByMonth } from '../budget';
import { actualDebtPayment, type Debt } from '../debt';

/** True take-home per month: after tax AND after the 401(k) deduction (the cash that hits your account). */
/* ─ MK-XS-F-027 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * takeHomeMonthly
 *
 * Answers ..... True take-home per month: after tax AND after the 401(k) deduction (the cash that hits your account).
 *
 * Formula .....
 *     grid = income monthly grid(op, 'available')
 *     the answer = Σ over grid of (amount)÷ 12
 *
 * Called by ... MK-CF-F-002 plannedMonthlySpend · MK-CF-F-003 categoryMonthly
 *               MK-CF-F-005 actualMonthFlow · MK-CF-F-156 plannedMonthFlow
 *
 * Reaches ..... 70 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-CF-F-199 ROOM
 *               MK-NW-F-100 TREND · MK-CF-F-215 YEAR
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-005 actualMonthFlow
 *               … and 52 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-027
 * Changed ..... 2026-07-30 (a85874e)
 */
export function takeHomeMonthly(op: OnboardingProfile | null): number {
  const grid = incomeMonthlyGrid(op, 'available');
  return (grid.reduce((t, m) => t + m.amount, 0) / 12);
}

/** Planned SURPLUS, month by month, AFTER debt (the canonical word, per the 2026-06-23 decision).
 *  = the income-vs-spend grid (savingsByMonth) minus the constant monthly debt service.
 *  THE one capacity function (Build-47 walk row 7): everything else derives from this. */
/* ─ MK-XS-F-028 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * surplusByMonth
 *
 * Answers ..... Planned SURPLUS, month by month, AFTER debt (the canonical word, per the 2026-06-23 decision).
 *
 * Formula .....
 *     debt = actual debt payment(debts)
 *     the answer:
 *     for each of savings by month(op): label = label
 *     amount = amount − debt
 *
 * Called by ... MK-XS-F-029 monthlySavings
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-029 monthlySavings
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-028
 * Changed ..... 2026-07-30 (a85874e)
 */
export function surplusByMonth(op: OnboardingProfile | null, debts: Debt[] = []): { label: string; amount: number }[] {
  const debt = actualDebtPayment(debts);
  return savingsByMonth(op).map((m) => ({ label: m.label, amount: (m.amount - debt) }));
}

/** Monthly savings (the FLOW) — Build-47 walk row 7: DERIVED as the 12-month average of
 *  surplusByMonth, so the flat figure and the by-month figures can never drift apart (they used
 *  to be two parallel formulas that merely CLAIMED to reconcile). Can be negative if overspending. */
/* ─ MK-XS-F-029 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * monthlySavings
 *
 * Answers ..... Monthly savings (the FLOW) — Build-47 walk row 7: DERIVED as the 12-month average of surplusByMonth, so the flat figure and the by-month figures can never drift apart (they used to be two parallel formulas that merely CLAIMED to reconcile).
 *
 * Formula .....
 *     months = surplus by month(op, debts)
 *     the answer = Σ over months of (amount)÷ 12
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-029
 * Changed ..... 2026-08-20 (1ca34d7)
 */
export function monthlySavings(op: OnboardingProfile | null, debts: Debt[] = []): number {
  const months = surplusByMonth(op, debts);
  return (months.reduce((t, m) => t + m.amount, 0) / 12);
}

// The savings-rate functions were CUT by the founder 2026-08-20 (brief §C, Q29): a benchmark aimed
// at 30-year-olds; no decision turns on it. The replacement is the expense-to-income ratio (TTM,
// take-home basis) — a Track-5 follow-up build, mock-first. monthlySavings (the FLOW) stays.
