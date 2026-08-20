// Savings (the FLOW) + savings rate — Term #10. "Savings" is never a balance (that's Cash); it's the
// money set aside per month, and its % of income. Two coherent standard rates (numerator and
// denominator share a basis), researched 2026-06-22:
//   • Cash savings rate (50/30/20): money set aside ÷ TAKE-HOME, excl 401(k) + debt. ~20% benchmark.
//   • Total savings rate (Fidelity): (cash saved + 401(k) + employer match) ÷ GROSS. ~15% benchmark.
import { round2, toNum } from '../_shared/num';
import type { OnboardingProfile } from '../onboardingProfile';
import { incomeMonthlyGrid, totalGrossAnnual, employerMatchMonthly } from '../income';
import { plannedMonthlySpend, savingsByMonth } from '../budget';
import { actualDebtPayment, type Debt } from '../debt';

/** True take-home per month: after tax AND after the 401(k) deduction (the cash that hits your account). */
export function takeHomeMonthly(op: OnboardingProfile | null): number {
  const grid = incomeMonthlyGrid(op, 'available');
  return round2(grid.reduce((t, m) => t + m.amount, 0) / 12);
}

/** Planned SURPLUS, month by month, AFTER debt (the canonical word, per the 2026-06-23 decision).
 *  = the income-vs-spend grid (savingsByMonth) minus the constant monthly debt service.
 *  THE one capacity engine (Build-47 walk row 7): everything else derives from this. */
export function surplusByMonth(op: OnboardingProfile | null, debts: Debt[] = []): { label: string; amount: number }[] {
  const debt = actualDebtPayment(debts);
  return savingsByMonth(op).map((m) => ({ label: m.label, amount: round2(m.amount - debt) }));
}

/** Monthly savings (the FLOW) — Build-47 walk row 7: DERIVED as the 12-month average of
 *  surplusByMonth, so the flat figure and the by-month figures can never drift apart (they used
 *  to be two parallel formulas that merely CLAIMED to reconcile). Can be negative if overspending. */
export function monthlySavings(op: OnboardingProfile | null, debts: Debt[] = []): number {
  const months = surplusByMonth(op, debts);
  return round2(months.reduce((t, m) => t + m.amount, 0) / 12);
}

// The savings-rate functions were CUT by the founder 2026-08-20 (brief §C, Q29): a benchmark aimed
// at 30-year-olds; no decision turns on it. The replacement is the expense-to-income ratio (TTM,
// take-home basis) — a Track-5 follow-up build, mock-first. monthlySavings (the FLOW) stays.
