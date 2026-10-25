// The ONE place the F5 paycheck function and F2 dated grid are invoked with live store state.
// Every paycheck surface (Home hero card, Cash flow main, month rows, month detail) reads THIS,
// so "hero = bar = month-detail total" is true by construction — one cell, four surfaces.
import { theBudgetCounted } from '../../MoneyKeel/functions/cashflow/budget-counted';
import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { buildPaycheckYear, type PaycheckYear } from '../domain/paycheck';
import { buildDatedGrid, type DatedGrid } from '../domain/grid';
import { resolveLens, type Lens } from '../domain/profile/lens';
import { ageFromProfile } from '../utils/persona';
import { budgetVsActual, spendByMonthByBucket, plannedMonthlySpend } from '../domain/budget';
import { isoLocalDate } from '../domain/_shared/dates';
import type { MonthInput } from '../../MoneyKeel/functions/cashflow/this-month';
import type { ExpensesInput } from '../../MoneyKeel/functions/cashflow/expenses';

export interface CashflowModel {
  lens: Lens;
  year: PaycheckYear;    // F5: the retiree paycheck (12 dated cells + hero + this-year)
  grid: DatedGrid;       // F2: the dated in/out grid (working bars; regular bills for both lenses)
}

/** THE CASH FLOW MODEL every paycheck surface reads — the paycheck year and the dated grid, from the store as it stands, with the
 *  same simulation convention as the Retirement cockpit: assumptions adopted from Plan, seeded, deterministic. */
/* ─ MK-CF-F-225 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * useCashflowModel
 *
 * Answers ..... The Cash flow model every paycheck surface reads — the paycheck year and the dated grid, from the store as it stands, with the same simulation convention as the Retirement cockpit.
 *
 * Called by ... CashFlowScreen · HomeScreen · PlanHubScreen · PaycheckCard
 *
 * Formula also in Calculation Module code/scripts/moneykeel_function_rules.json · MK-CF-F-225 (the master's
 *               functions_from_code does not read src/hooks yet, so it is not listed there; this record is written by hand
 *               in the generated form, as MK-NW-F-145's is)
 * Changed ..... not in git yet (—)
 */
export function useCashflowModel(): CashflowModel {
  const store = useStore() as any;
  const accounts = store.assetAccounts ?? [];
  const liabilities = store.liabilities ?? [];
  // THE BUDGET AS IT IS COUNTED (his rule, 2026-10-04, DEC-1923): a mortgage in Debts is taken from
  // Debts, so the Rent / Mortgage budget line stands down — or the planned month would count it twice.
  const typed = store.onboardingProfile ?? null;
  const op = useMemo(() => (typed ? theBudgetCounted({ profile: typed, accounts, debts: liabilities }).profile : null),
    [typed, accounts, liabilities]);
  const A = store.retirementAssumptions ?? {};
  const lens = resolveLens(op, store.lensOverride);

  return useMemo(() => {
    const age = ageFromProfile(op) ?? 68;
    const mean = A.expectedReturn ?? 0.055;
    const year = buildPaycheckYear(op, {
      accounts, liabilities,
      sim: {
        current_age: age,
        horizon_age: A.horizonAge ?? Math.max(age + 5, 92),
        mean_return: mean,
        vol_return: Math.min(0.2, Math.max(0.05, mean * 1.7)),   // cockpit convention
        inflation: A.inflation ?? 0.025,
        seed: 42, paths: 1000,
      },
    });
    const grid = datedGridOf(op, liabilities, A.rothConversionTax);
    return { lens, year, grid };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op, accounts, liabilities, A.expectedReturn, A.horizonAge, A.inflation, A.rothConversionTax, lens]);
}

// exported 2026-10-24 for the Bill calendar, which built its own grid from the budget as typed — it counted a Rent / Mortgage
// line the Cash flow tab stands down (DEC-1923) — and now reads this one, with its starting balance (Cash flow journey E2E-72)
/** The dated grid every Cash flow surface reads, built in one place (2026-10-23), so the month Home shows and the month the
 *  Cash flow tab shows come from the same cells. */
/* ─ MK-CF-F-226 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * datedGridOf
 *
 * Answers ..... The dated grid every Cash flow surface reads, built in one place, so the month Home shows, the month the Cash flow tab shows and the Bill calendar's months come from the same cells.
 *
 * Called by ... useCashflowModel · useThisMonthInputs · BillCalendarScreen
 *
 * Formula also in Calculation Module code/scripts/moneykeel_function_rules.json · MK-CF-F-226 (the master's
 *               functions_from_code does not read src/hooks yet, so it is not listed there; this record is written by hand
 *               in the generated form, as MK-NW-F-145's is)
 * Changed ..... not in git yet (—)
 */
export function datedGridOf(op: any, liabilities: any[], rothConversionTax: unknown, startBalance?: number): DatedGrid {
  // F11 propagation (design r40 pin): an adopted Roth conversion shows its tax bill in the
  // grid's April of NEXT year — the same dollar figure the adoption sheet previewed.
  const rothTax = Number(rothConversionTax) || 0;
  const oneOffs = rothTax > 0
    ? [{ label: 'Roth conversion tax (from your Plan)', amount: rothTax, month: 4, year: new Date().getFullYear() + 1 }]
    : undefined;
  return buildDatedGrid(op, { liabilities, oneOffs, ...(startBalance != null ? { startBalance } : {}) });
}

/** The budget's three groups, in the words the Expenses tab draws them (cash-flow_v01, frames C and D). */
export const BUCKET_WORDS: Record<'fixed' | 'nonmonthly' | 'flexible', string> = { fixed: 'Bills & fixed', nonmonthly: 'Once in a while', flexible: 'Everyday expenses' };

/** THIS MONTH'S INPUTS, ASSEMBLED ONCE (2026-10-23; his rule DEC-0345, "inputs assembled once per family — one function
 *  builds the person's state for a family and every orchestrator in that family reads it; no orchestrator and no screen
 *  assembles its own"). The Cash flow tab's This month and Home's cash-flow box both hand these to MK-CF-O-010 theMonth.
 *  Until 2026-10-23 Home calculated the month itself: the take-home, plus any income recorded as received, less the
 *  expenses logged — without the debt payments made. For one month it read "Left $4,202" against Cash flow's "= Actual
 *  surplus so far +$3,952", the $250 car loan paid (outside re-run of Performance, gap list item 38).
 *  What goes in: this month's cell of the dated grid — its take-home and the sources inside it, and its planned bills (the
 *  budget as counted, DEC-1923); every debt; the budget by category; every expense logged; what the Plan promises to goals.
 *  Its record is MK-CF-F-227. */
/* ─ MK-CF-F-227 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * thisMonthInputs
 *
 * Answers ..... This month's inputs, assembled once, for the month's orchestrator: the take-home and its sources, the debts, the planned bills, the budget by group, the expenses logged and what the Plan promises to goals.
 *
 * Called by ... CashFlowScreen · useThisMonthInputs
 *
 * Formula also in Calculation Module code/scripts/moneykeel_function_rules.json · MK-CF-F-227 (the master's
 *               functions_from_code does not read src/hooks yet, so it is not listed there; this record is written by hand
 *               in the generated form, as MK-NW-F-145's is)
 * Changed ..... not in git yet (—)
 */
export function thisMonthInputs(s: { grid: DatedGrid; bva: any; profile?: any; liabilities: any[]; expenses: any[]; commitments?: any[]; ym?: string }): MonthInput & ExpensesInput {
  const cell: any = s.grid.cells[0];
  const ym = s.ym ?? isoLocalDate(new Date()).slice(0, 7);   // the LOCAL day, never UTC (guard: local_day_not_utc)
  // THE MONTH'S PLANNED EXPENSES BY GROUP, from the one producer the This month row sums (spendByMonthByBucket, 2026-10-23):
  // a once-a-year bill in its own month, never a twelfth — so the Expenses tab's rows add up to This month's Expenses row
  const groups = spendByMonthByBucket(s.profile ?? null)[Number(ym.slice(5, 7)) - 1] ?? { fixed: 0, nonmonthly: 0, flexible: 0 };
  return {
    ym,
    takeHomeMonthly: cell?.inflow ?? 0,
    inflowSources: (cell?.incomeItems ?? []).map((i: any) => i.source),
    debts: s.liabilities as any,
    // THE BUDGET, and nothing when there is none. A person who has not set one gets "not set" and the
    // door, never a planned surplus built on a guess (rule 6 under the drawing). The month cell's own
    // bill items ARE the outflow by construction (grid.test: outflow === sum(billItems)), so the
    // spelled-out rows and the total can never disagree.
    plannedExpenses: (cell?.billItems ?? []).filter((b: any) => b.kind === 'bill').reduce((t: number, b: any) => t + (b.amount || 0), 0),
    // a budget is set when the plan holds any expenses at all — a month with nothing in it is $0, not "not set" (2026-10-23)
    ...(s.profile !== undefined ? { budgetSet: plannedMonthlySpend(s.profile ?? null) > 0 } : {}),
    // the SAME groups the Expenses tab shows, for this month — one budget, read once (until 2026-10-23 the budget's monthly
    // average, rounded, which spread a once-a-year bill across twelve months)
    plannedByCategory: (['fixed', 'nonmonthly', 'flexible'] as const).filter((k) => groups[k] > 0).map((k) => ({ label: BUCKET_WORDS[k], monthly: groups[k] })),
    expenses: (s.expenses ?? []) as any,
    commitments: (s.commitments ?? []) as any,
  };
}

/** Home's way to this month, which calculates nothing of its own: the same inputs, from the store, built the way the Cash flow
 *  tab builds them — the budget as counted (DEC-1923), the same dated grid, the same budget by category. Hand the answer to
 *  theMonth. */
/* ─ MK-CF-F-228 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * useThisMonthInputs
 *
 * Answers ..... Home's way to this month: it reads the store and hands it, built the way the Cash flow tab builds it, to thisMonthInputs — it calculates nothing of its own.
 *
 * Called by ... HomeScreen
 *
 * Formula also in Calculation Module code/scripts/moneykeel_function_rules.json · MK-CF-F-228 (the master's
 *               functions_from_code does not read src/hooks yet, so it is not listed there; this record is written by hand
 *               in the generated form, as MK-NW-F-145's is)
 * Changed ..... not in git yet (—)
 */
export function useThisMonthInputs(): MonthInput & ExpensesInput {
  const store = useStore() as any;
  const typed = store.onboardingProfile ?? null;
  const accounts = store.assetAccounts ?? [];
  const liabilities = store.liabilities ?? [];
  const expenses = store.expenses ?? [];
  const A = store.retirementAssumptions ?? {};
  const budget = useMemo(() => theBudgetCounted({ profile: typed, accounts, debts: liabilities }), [typed, accounts, liabilities]);
  const grid = useMemo(() => datedGridOf(typed ? budget.profile : null, liabilities, A.rothConversionTax), [typed, budget, liabilities, A.rothConversionTax]);
  const bva = useMemo(() => budgetVsActual(expenses, budget.profile, new Date()), [expenses, budget]);
  return useMemo(() => thisMonthInputs({ grid, bva, profile: budget.profile, liabilities, expenses, commitments: A.commitments ?? [] }),
    [grid, bva, budget, liabilities, expenses, A.commitments]);
}
