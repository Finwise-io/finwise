// Income & Inflow module — public API. Owns the `incomes/{uid}` Firestore doc.
import { getUserDoc, setUserDoc } from '../_shared/firestore';
import { emit } from '../_shared/eventBus';
import type { UserId } from '../_shared/ids';
import { IncomeDoc, IncomeState, DEFAULT_TAX } from './types';
import { buildIncomeState } from './calc';

export * from './types';
export {
  buildIncomeState, grossAnnualBaseline, annualNet,
  effectiveTaxRate, employerMatchAnnual,
} from './calc';
export { incomeFromOnboarding, employerMatchMonthly, grossSalaryMonthly, annualizedEnteredSalary, rsuAnnual, equityRowValue, equityCashFlow, equityVestWeights, rowVestYear, rentalList, rentalNetAnnual, totalGrossAnnual, taxableAnnual, extraIncome, retirementIncomeMonthly, guaranteedOutsideStreams, over65CountOf, currentRetirementIncomeMonthly, scholarshipByCalendarMonth, tipsAnnual, salaryAnnual, salaryActiveMonths, salaryGrossByMonth, wageGrossByMonth, wageMatchMonthly, jobActiveMonth, effectiveRate, monthlyTaxRates, taxableByCalendarMonth, filingStatusOf, stateRateOf, userCapGainsRates, incomeMonthlyGrid, SALARY_PERIODS, benefitAnnual, benefitActiveMonths, otherIncomeMonth } from './onboarding';
export { taxOwedFor, effectiveRateOnGrossFor, grossFromNet, marginalBracketFor, TAX_YEAR, TAX_BRACKETS } from './tax';

const COLLECTION = 'incomes';
export const INCOME_UPDATED = 'IncomeUpdated';

/* ─ MK-CF-F-050 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * loadIncome
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     get user doc<income doc>(COLLECTION, uid)
 *
 * Called by ... MK-CF-F-052 getIncomeState
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-F-052 getIncomeState
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-050
 * Changed ..... 2026-06-05 (f742136)
 */
export async function loadIncome(uid: UserId): Promise<IncomeDoc | null> {
  return getUserDoc<IncomeDoc>(COLLECTION, uid);
}

/* ─ MK-CF-F-051 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * saveIncome
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     It records or announces something and returns no figure — no arithmetic of its own.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-051
 * Changed ..... 2026-06-05 (f742136)
 */
export async function saveIncome(docData: IncomeDoc): Promise<void> {
  await setUserDoc(COLLECTION, docData.user_id, docData);
  emit(INCOME_UPDATED, { user_id: docData.user_id });
}

/** The public read-model (spec IncomeState): totals, effective rate, monthly grid. */
/* ─ MK-CF-F-052 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * getIncomeState
 *
 * Answers ..... The public read-model (spec IncomeState): totals, effective rate, monthly grid.
 *
 * Formula .....
 *     d = await load income(uid)
 *     nothing   when d is missing
 *     the answer = build income state(uid, sources ?? [], tax ?? DEFAULT_TAX)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-052
 * Changed ..... 2026-06-05 (f742136)
 */
export async function getIncomeState(uid: UserId): Promise<IncomeState | null> {
  const d = await loadIncome(uid);
  if (!d) return null;
  return buildIncomeState(uid, d.sources ?? [], d.tax ?? DEFAULT_TAX);
}
