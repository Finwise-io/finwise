// "Sharpen your plan" — completeness checks. Surfaces the steps a user skipped during onboarding
// (or hasn't done yet) so they can fill them in, each routing to an existing edit surface.
export interface PlanCheck { key: string; label: string; detail: string; done: boolean; route: string; }

export interface CompletenessInput {
  incomeAnnual: number;     // totalGrossAnnual(op)
  accountCount: number;     // assetAccounts.length
  hasInvestments: boolean;  // any positions / bonds / alternatives
  goalCount: number;        // goals.length
  ssAnswered: boolean;      // retirementAssumptions.ssEligible != null
  monthlySpending: number;  // expenses captured
  hasDebtsOrSkipped: boolean; // liabilities entered OR user has no debt (we can't tell skipped; treat any as done)
}

/* ─ MK-XS-F-001 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * planCompleteness
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     done count = checks where donecount of
 *     total = count of checks
 *     the answer:
 *     checks = checks
 *     done count = done count
 *     total = total
 *     pct = round((done count ÷ total) × 100)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-027 goals (target, saved, date)
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-001
 * Changed ..... 2026-06-06 (abfe24a)
 */
export function planCompleteness(i: CompletenessInput): { checks: PlanCheck[]; doneCount: number; total: number; pct: number } {
  const checks: PlanCheck[] = [
    { key: 'income', label: 'Add your income', detail: 'Salary, bonus, equity, rental — drives every projection.', done: i.incomeAnnual > 0, route: '/income-manager' },
    { key: 'networth', label: 'Add your accounts', detail: 'Cash, investments, property → your net worth.', done: i.accountCount > 0, route: '/(tabs)/analytics' },
    { key: 'spending', label: 'Set a budget', detail: 'So we can track budget vs actual and savings.', done: i.monthlySpending > 0, route: '/(tabs)/budget' },
    { key: 'investments', label: 'Track investments', detail: 'Holdings, bonds, or alternatives vs benchmark.', done: i.hasInvestments, route: '/performance' },
    { key: 'retirement', label: 'Set up retirement', detail: 'Social Security, target age, drawdown.', done: i.ssAnswered, route: '/retirement' },
    { key: 'goals', label: 'Add a goal', detail: 'Emergency fund, home, a trip — and a debt-payoff plan.', done: i.goalCount > 0, route: '/(tabs)/goals' },
  ];
  const doneCount = checks.filter((c) => c.done).length;
  const total = checks.length;
  return { checks, doneCount, total, pct: Math.round((doneCount / total) * 100) };
}
