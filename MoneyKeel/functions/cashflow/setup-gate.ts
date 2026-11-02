// Cash flow · THE ONE SET-UP GATE (2026-11-02, the lead's ruling R26; CF6-09, CF6-10, CF6-13).
//
// One answer to "has this person entered anything yet?", read by Cash flow (its set-up doors), Home (its first-day doors and
// its THIS MONTH'S CASH FLOW box), Insights (the 401(k) room notice) and the sign-up summary. Before it, each screen asked its
// own question: Home counted a wage only when it could be read and never a budget; Cash flow left debts out; Insights and the
// summary read the wage alone. A $600 budget alone showed Home's 'Welcome' doors while Cash flow opened its month; a $9,800 car
// loan alone showed Cash flow's set-up doors beside a Debts tab listing it.
//
// ANY ENTRY OPENS: an inflow (a wage that cannot be read among them — it is entered), an expense logged, a budget set, a debt or a
// student loan entered in setup. The doors show only when nothing at all is entered; what is still missing is offered in words.
// The debt part is Net worth's own rule (debtsEntered, FX-NW 2026-11-02), plus the one debt the sign-up question types.
import { salaryAnnual, retirementIncomeMonthly, currentRetirementIncomeMonthly } from '../../../src/domain/income';
import { hasMonthlySalaryTable } from '../../../src/domain/income/salary-months';
import { wageRefusalOf } from '../../../src/domain/income/pay-frequency';
import { plannedMonthlySpend } from '../../../src/domain/budget';
import { debtsEntered, debtsFromOnboarding, type Debt } from '../../../src/domain/debt';
import { incomeSummary } from './income-summary';
import { theBudgetCounted } from './budget-counted';

export interface SetupEntered {
  /** a pay that reads: a wage, a monthly pay table, self-employment or a retirement income (Cash flow's 'income ready') */
  payRead: boolean;
  /** a wage that reads (the 401(k) room needs earned income) */
  wageRead: boolean;
  /** a wage typed that cannot be read — R23's sentence for it, or null */
  wageRefusal: string | null;
  /** a wage entered, read or not */
  wageEntered: boolean;
  /** any money coming in entered: a pay that reads, a wage that does not, any source on the Income list, an income logged */
  inflow: boolean;
  expense: boolean;
  budget: boolean;
  /** a debt entered, the debt the sign-up question types, or a student loan from setup — owed now or later */
  debt: boolean;
  /** any of the five: the month opens */
  entered: boolean;
}

/** What it is for: THE ONE SET-UP GATE (R26) — which kinds of entry exist, and whether any does. Worked by hand: nothing at all →
 *  entered false; a $9,800 car loan alone → debt true, entered true; rent $1,200 beside a $100,000 wage whose frequency is
 *  'annual' (not recognised) → wageRefusal set, wageRead false, inflow true, entered true; a $600 budget alone → budget true. */
/* ─ MK-CF-F-314 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * setupEntered
 *
 * Answers ..... What it is for: THE ONE SET-UP GATE (R26) — which kinds of entry exist, and whether any does.
 *
 * Formula .....
 *     op = input.op (or nothing when missing)
 *     accounts = input.accounts (or none when missing)
 *     debts = (input.debts ?? []) as debt[]
 *     wage read = salary annual(op) > 0
 *     pay read = !!(wage read or has monthly salary table(op) or op.se amount or retirement income monthly(op) > 0)
 *     wage refusal = wage refusal of(op)
 *     expense = (input.expenses ?? []).length > 0
 *     budget = planned monthly spend(the budget counted({ profile: op, accounts, debts }).profile) > 0
 *     debt = debts entered(op, debts) (or debts from onboarding('' as any, op).debts.length > 0 when missing or zero)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-023 salary and other income
 *               MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-314
 * Changed ..... not in git yet (—)
 */
export function setupEntered(input: {
  op: Record<string, any> | null | undefined;
  accounts?: any[]; transactions?: any[]; expenses?: any[]; incomes?: any[]; debts?: Debt[];
}): SetupEntered {
  const op: any = input.op ?? null;
  const accounts = input.accounts ?? [];
  const debts = (input.debts ?? []) as Debt[];
  const wageRead = salaryAnnual(op) > 0;
  const payRead = !!(wageRead || hasMonthlySalaryTable(op) || op?.seAmount || retirementIncomeMonthly(op) > 0);
  const wageRefusal = wageRefusalOf(op);
  const inflow = payRead || !!wageRefusal || currentRetirementIncomeMonthly(op) > 0 || (input.incomes ?? []).length > 0
    || incomeSummary(op, { accounts, transactions: input.transactions ?? [] }).sources.length > 0;
  const expense = (input.expenses ?? []).length > 0;
  const budget = plannedMonthlySpend(theBudgetCounted({ profile: op, accounts, debts }).profile) > 0;
  const debt = debtsEntered(op, debts) || debtsFromOnboarding('' as any, op).debts.length > 0;
  return { payRead, wageRead, wageRefusal, wageEntered: wageRead || !!wageRefusal, inflow, expense, budget, debt,
    entered: inflow || expense || budget || debt };
}
