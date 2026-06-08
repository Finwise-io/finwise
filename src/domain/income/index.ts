// Income & Inflow module — public API. Owns the `incomes/{uid}` Firestore doc.
import { getUserDoc, setUserDoc } from '../_shared/firestore';
import { emit } from '../_shared/eventBus';
import type { UserId } from '../_shared/ids';
import { IncomeDoc, IncomeState, DEFAULT_TAX } from './types';
import { buildIncomeState } from './calc';

export * from './types';
export {
  buildIncomeState, grossAnnualBaseline, annualNet, estimateEffectiveTaxRate,
  effectiveTaxRate, employerMatchAnnual,
} from './calc';
export { incomeFromOnboarding, employerMatchMonthly, grossSalaryMonthly, annualizedEnteredSalary, rsuAnnual, equityRowValue, equityCashFlow, rowVestYear, rentalList, rentalNetAnnual, totalGrossAnnual, taxableAnnual, extraIncome, retirementIncomeMonthly, scholarshipByCalendarMonth, tipsAnnual, salaryAnnual, salaryActiveMonths, salaryGrossByMonth, jobActiveMonth, effectiveRate, incomeMonthlyGrid, SALARY_PERIODS } from './onboarding';
export { taxOwed, effectiveRateOnGross, grossFromNet, marginalBracket, TAX_YEAR, TAX_BRACKETS } from './tax';

const COLLECTION = 'incomes';
export const INCOME_UPDATED = 'IncomeUpdated';

export async function loadIncome(uid: UserId): Promise<IncomeDoc | null> {
  return getUserDoc<IncomeDoc>(COLLECTION, uid);
}

export async function saveIncome(docData: IncomeDoc): Promise<void> {
  await setUserDoc(COLLECTION, docData.user_id, docData);
  emit(INCOME_UPDATED, { user_id: docData.user_id });
}

/** The public read-model (spec IncomeState): totals, effective rate, monthly grid. */
export async function getIncomeState(uid: UserId): Promise<IncomeState | null> {
  const d = await loadIncome(uid);
  if (!d) return null;
  return buildIncomeState(uid, d.sources ?? [], d.tax ?? DEFAULT_TAX);
}
