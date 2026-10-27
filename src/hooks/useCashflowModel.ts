// The ONE place the F5 paycheck function and F2 dated grid are invoked with live store state.
// Every paycheck surface (Home hero card, Cash flow main, month rows, month detail) reads THIS,
// so "hero = bar = month-detail total" is true by construction — one cell, four surfaces.
import { theBudgetCounted, expensesAsCounted } from '../../MoneyKeel/functions/cashflow/budget-counted';
import { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { buildPaycheckYear, paycheckReturn, type PaycheckYear, type PaycheckReturn } from '../domain/paycheck';
import { buildDatedGrid, datedBillsIn, type DatedGrid } from '../domain/grid';
import { resolveLens, type Lens } from '../domain/profile/lens';
import { ageFromProfile } from '../utils/persona';
import { budgetVsActual, spendByMonthByCategory, budgetEntered, PLANNED_GROUP_WORDS } from '../domain/budget';
import { isoLocalDate } from '../domain/_shared/dates';
import { profileWithAccountIncome } from '../domain/income/onboarding';
import type { MonthInput } from '../../MoneyKeel/functions/cashflow/this-month';
import type { ExpensesInput } from '../../MoneyKeel/functions/cashflow/expenses';

export interface CashflowModel {
  lens: Lens;
  /** F5: the retiree paycheck (12 dated cells + hero + this-year). NULL when it cannot be calculated — no birth year entered
   *  (2026-10-25, FIX-MONTH; DEC-0296): `paycheck.refusal` says why. */
  year: PaycheckYear | null;
  grid: DatedGrid;       // F2: the dated in/out grid (working bars; regular bills for both lenses)
  /** WHAT THE PAYCHECK RUNS ON, said where it is shown (2026-10-25, FIX-MONTH; the lead's ruling 2 on CFR-4): the return the
   *  Retirement cockpit runs (paycheckReturn), and why there is no paycheck when there is none. */
  paycheck: { return: PaycheckReturn; refusal: string | null };
}

/** The words the paycheck card prints when there is no birth year to work the draw out from (2026-10-25, FIX-MONTH). */
export const PAYCHECK_NO_AGE = 'Your birth year is not entered, so there is no paycheck to work out — we won’t guess one.';

/** THE CASH FLOW MODEL every paycheck surface reads — the paycheck year and the dated grid, from the store as it stands, with the
 *  same simulation convention as the Retirement cockpit: assumptions adopted from Plan, seeded, deterministic. */
/* ─ MK-CF-F-225 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * useCashflowModel
 *
 * Answers ..... The Cash flow model every paycheck surface reads — the paycheck year and the dated grid, from the store as it stands, with the same simulation convention as the Retirement cockpit.
 *
 * Called by ... CashFlowScreen · PlanHubScreen · PaycheckCard (on Home and on Cash flow)
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
  const transactions = store.transactions ?? [];
  // AND THE INCOME AS EVERY INCOME FIGURE READS IT ONCE THE ACCOUNTS ARE KNOWN (2026-10-25, the lead's ruling; FIX-INCOME-B's
  // profileWithAccountIncome): interest and dividends calculated from the accounts count in the rate in force here, as on the Income
  // summary — $10,000 of savings at 4% with nothing typed is $400 of taxed income on every screen
  const op = useMemo(() => (typed ? profileWithAccountIncome(theBudgetCounted({ profile: typed, accounts, debts: liabilities }).profile, accounts, transactions) : null),
    [typed, accounts, liabilities, transactions]);
  const A = store.retirementAssumptions ?? {};
  const lens = resolveLens(op, store.lensOverride);

  return useMemo(() => {
    // NO BIRTH YEAR, NO PAYCHECK (2026-10-25, FIX-MONTH; his DEC-0296 "an unknown input produces no number and a reason — never a
    // default", tenet 3; CFR-4, MK-CF-F-225-C05): the draw was calculated at age 68 for anyone whose birth year was blank. The
    // cockpit whose convention this follows refuses without an age (willItLastInputs returns null) — so does this.
    const age = ageFromProfile(op);
    // THE COCKPIT'S RETURN (2026-10-25, the lead's ruling 2 on CFR-4, under tenet 4; FIX-ROOM's paycheckReturn): the return set on
    // the Plan, else the blended benchmark of the accounts set aside for retirement, else 6% — the figure the odds run on. It was a
    // flat 5.5% with a 1.7 × spread whenever no return was set: accounts blending to 7.0% put the odds on 7.0% and the paycheck on 5.5%.
    const ret = paycheckReturn(accounts, A, op);
    const year = age == null ? null : buildPaycheckYear(op, {
      accounts, liabilities,
      sim: {
        current_age: age,
        horizon_age: A.horizonAge ?? Math.max(age + 5, 92),
        mean_return: ret.mean_return,
        vol_return: ret.vol_return,
        inflation: A.inflation ?? 0.025,
        seed: 42, paths: 1000,
      },
    });
    const grid = datedGridOf(op, liabilities, A.rothConversionTax, undefined, A.rothConversionYear);
    return { lens, year, grid, paycheck: { return: ret, refusal: year ? null : PAYCHECK_NO_AGE } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [op, accounts, liabilities, A.expectedReturn, A.returnBasis, A.horizonAge, A.inflation, A.rothConversionTax, A.rothConversionYear, lens]);
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
export function datedGridOf(op: any, liabilities: any[], rothConversionTax: unknown, startBalance?: number, rothConversionYear?: unknown): DatedGrid {
  // F11 propagation (design r40 pin): an adopted Roth conversion shows its tax bill in the
  // grid's April of NEXT year — the same dollar figure the adoption sheet previewed.
  // THE APRIL AFTER THE YEAR OF THE CONVERSION, NOT AFTER TODAY (2026-10-25, FIX-MONTH; CFR-4, MK-CF-F-226-C04; IRS Publication
  // 590-A — a conversion is income in the year it is made, so its tax is due with that year's return): read on 2027-01-17, a 2026
  // conversion's $1,831.17 moved to April 2028 and out of the twelve months shown. The Roth screen saves the year it was adopted
  // for (rothConversionYear); an adoption saved before that has no year, and keeps the old reading — the April after today.
  const rothTax = Number(rothConversionTax) || 0;
  const convertedIn = Number(rothConversionYear) > 0 ? Number(rothConversionYear) : new Date().getFullYear();
  const oneOffs = rothTax > 0
    ? [{ label: 'Roth conversion tax (from your Plan)', amount: rothTax, month: 4, year: convertedIn + 1 }]
    : undefined;
  return buildDatedGrid(op, { liabilities, oneOffs, ...(startBalance != null ? { startBalance } : {}) });
}

/** The budget's three groups, in the words the Expenses tab draws them (cash-flow_v01, frames C and D). */
export const BUCKET_WORDS = PLANNED_GROUP_WORDS;   // written once, in the budget (2026-10-25)

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
  const ym = s.ym ?? isoLocalDate(new Date()).slice(0, 7);   // the LOCAL day, never UTC (guard: local_day_not_utc)
  // THE CELL OF THE MONTH ASKED FOR (2026-10-25, FIX-MONTH; DEC-0345; CFR-4, MK-CF-F-227-C03): it read the grid's first cell
  // whatever month was asked, so December's inputs carried October's take-home and bills ($5,111.17 and $2,311.43 for $7,311.19
  // and $4,131.37). A month the grid does not hold has no cell: nothing comes in and nothing is planned from it.
  const [askY, askM] = ym.split('-').map(Number);
  const cell: any = (s.grid.cells ?? []).find((c: any) => c.year === askY && c.calendarMonth === askM);
  // THE MONTH'S PLANNED EXPENSES THE WAY THE BUDGET WAS ENTERED (spendByMonthByCategory, 2026-10-25, CF-09 — its rows add up to the
  // one producer the This month row sums, spendByMonthByBucket, 2026-10-23): each category with its amount and the rest as Other,
  // or the groups when the budget was typed by group; a once-a-year bill in its own month, never a twelfth
  const planRows = spendByMonthByCategory(s.profile ?? null)[Number(ym.slice(5, 7)) - 1] ?? [];
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
    // A BUDGET IS SET WHEN ONE WAS ENTERED (2026-10-25, FIX-MONTH, under FIX-BUDGET's one rule budgetEntered — tenets 3 and 5): a typed
    // $0 is a $0 plan, nothing entered is no plan. It was "the plan holds more than $0", so a typed $0 read "not set" here while the stored
    // budget held it. A budget whose every line stood down for a debt was entered too (theBudgetCounted marks it).
    ...(s.profile !== undefined ? { budgetSet: s.profile?.budgetEnteredAsTyped ?? budgetEntered(s.profile ?? null) } : {}),
    // the SAME groups the Expenses tab shows, for this month — one budget, read once (until 2026-10-23 the budget's monthly
    // average, rounded, which spread a once-a-year bill across twelve months)
    plannedByCategory: planRows.map((r) => ({ label: r.label, monthly: r.monthly })),
    // what was logged under a budget line that stood down for a debt is that debt's payment — the mortgage counted once, on the plan
    // and on what has happened (expensesAsCounted, 2026-10-25, FIX-MONTH)
    expenses: expensesAsCounted(s.expenses ?? [], s.profile) as any,
    commitments: (s.commitments ?? []) as any,
    // THE MONTH'S DATED BILLS, FOR THE BIG-TICKET RADAR (2026-10-25, FIX-MONTH; the lead's ruling on CFR-2's MK-CF-F-153-C05, under
    // DEC-0002): a bill with its own month is on the radar in that month only — read off this month's cell by the grid's one
    // reader of a month's dated bills (datedBillsIn, MK-XS-F-004's), never a second one. The radar keeps those of $500 or more.
    bigBills: datedBillsIn(cell).map((b) => ({ label: b.label, amount: b.amount,
      dueLabel: b.day ? `${MON3[askM - 1]} ${b.day}` : `in ${MONTH_WORDS[askM - 1]}` })),
  };
}
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_WORDS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Home's way to this month, which calculates nothing of its own: the same inputs, from the store, built the way the Cash flow
 *  tab builds them — the budget as counted (DEC-1923), the same dated grid, the same budget by category. Hand the answer to
 *  theMonth. */
/* ─ MK-CF-F-228 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * useThisMonthInputs
 *
 * Answers ..... Home's way to this month: it reads the store and hands it, built the way the Cash flow tab builds it, to thisMonthInputs — it calculates nothing of its own.
 *
 * Called by ... HomeScreen · BudgetScreen
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
  const transactions = store.transactions ?? [];
  // the grid reads the income with what the accounts pay (profileWithAccountIncome, 2026-10-25) — the same profile useCashflowModel hands its grid
  const grid = useMemo(() => datedGridOf(typed ? profileWithAccountIncome(budget.profile, accounts, transactions) : null, liabilities, A.rothConversionTax, undefined, A.rothConversionYear),
    [typed, budget, accounts, transactions, liabilities, A.rothConversionTax, A.rothConversionYear]);
  const bva = useMemo(() => budgetVsActual(expensesAsCounted(expenses, budget.profile), budget.profile, new Date()), [expenses, budget]);
  return useMemo(() => thisMonthInputs({ grid, bva, profile: budget.profile, liabilities, expenses, commitments: A.commitments ?? [] }),
    [grid, bva, budget, liabilities, expenses, A.commitments]);
}
