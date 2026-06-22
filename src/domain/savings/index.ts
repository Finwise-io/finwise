// Savings (the FLOW) + savings rate — Term #10. "Savings" is never a balance (that's Cash); it's the
// money set aside per month, and its % of income. Two coherent standard rates (numerator and
// denominator share a basis), researched 2026-06-22:
//   • Cash savings rate (50/30/20): money set aside ÷ TAKE-HOME, excl 401(k) + debt. ~20% benchmark.
//   • Total savings rate (Fidelity): (cash saved + 401(k) + employer match) ÷ GROSS. ~15% benchmark.
import { round2, toNum } from '../_shared/num';
import type { OnboardingProfile } from '../onboardingProfile';
import { incomeMonthlyGrid, totalGrossAnnual, employerMatchMonthly } from '../income';
import { plannedMonthlySpend } from '../budget';
import { actualDebtPayment, type Debt } from '../debt';

/** True take-home per month: after tax AND after the 401(k) deduction (the cash that hits your account). */
export function takeHomeMonthly(op: OnboardingProfile | null): number {
  const grid = incomeMonthlyGrid(op, 'available');
  return round2(grid.reduce((t, m) => t + m.amount, 0) / 12);
}

/** Monthly savings (the FLOW) = take-home − planned spend − debt payments. Excludes debt payoff (a
 *  product decision) and 401(k) (already out of take-home). Can be negative if overspending. */
export function monthlySavings(op: OnboardingProfile | null, debts: Debt[] = []): number {
  return round2(takeHomeMonthly(op) - plannedMonthlySpend(op) - actualDebtPayment(debts));
}

/** Cash savings rate (%) = monthly savings ÷ take-home. The everyday "are you living below your means". */
export function savingsRateCash(op: OnboardingProfile | null, debts: Debt[] = []): number {
  const th = takeHomeMonthly(op);
  return th > 0 ? round2((monthlySavings(op, debts) / th) * 100) : 0;
}

/** Total savings rate with retirement (%) = (monthly savings + 401(k) + match) ÷ gross. Retirement-
 *  readiness number; plan-based (401k can't be seen in transactions). */
export function savingsRateTotal(op: OnboardingProfile | null, debts: Debt[] = []): number {
  const grossMo = totalGrossAnnual(op) / 12;
  const retire = toNum((op as any)?.c_401k) + employerMatchMonthly(op);   // 401(k) employee + employer match
  return grossMo > 0 ? round2(((monthlySavings(op, debts) + retire) / grossMo) * 100) : 0;
}
