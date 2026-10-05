// Shared numeric helpers used across domain modules.
import { formatMoney, formatMoneyCents } from './money';
export { round2 } from '../../../Calculation Module code/engines/money';

/* ─ MK-ST-F-052 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * toNum
 *
 * Answers ..... What number did the person actually type?
 *
 * Formula .....
 *     n = parse float(string(v ?? '').replace( ÷ [^0 − 9.\-] ÷ g, ''))
 *     the answer:
 *     n   if number.is finite(n)
 *     0   otherwise
 *
 * Called by ... MK-CF-F-002 plannedMonthlySpend · MK-CF-F-003 categoryMonthly
 *               MK-CF-F-004 spendBuckets · MK-CF-F-005 actualMonthFlow
 *               MK-CF-F-007 nonMonthlyBasis · MK-CF-F-008 spendByMonth
 *               MK-CF-F-009 monthlyEssentials · MK-CF-F-014 budgetVsActual
 *               MK-CF-F-019 upcomingBills · MK-CF-F-020 cashflowYear
 *               MK-CF-F-038 debtsFromOnboarding · MK-CF-F-059 annualizedEnteredSalary
 *               MK-CF-F-062 equityRowValue · MK-CF-F-066 rsuAnnual
 *               MK-CF-F-067 rentalList · MK-CF-F-070 benefitAnnual
 *               MK-CF-F-071 extraIncome · MK-CF-F-073 otherIncomeMonth
 *               MK-CF-F-074 tipsAnnual · MK-CF-F-075 retirementIncomeMonthly
 *               MK-CF-F-076 guaranteedOutsideStreams · MK-CF-F-077 scholarshipByCalendarMonth
 *               MK-CF-F-079 incomeFromOnboarding · MK-CF-F-083 totalGrossAnnual
 *               MK-CF-F-084 taxableAnnual · MK-CF-F-086 stateRateOf
 *               MK-CF-F-087 monthlyTaxRates · MK-CF-F-088 taxableByCalendarMonth
 *               MK-CF-F-089 over65CountOf · MK-CF-F-092 incomeMonthlyGrid
 *               MK-CF-F-105 guaranteedRows · MK-CF-F-130 enteredMonthlyRaw
 *               MK-CF-F-141 perMonth · MK-CF-F-142 monthsOf
 *               MK-CF-F-144 takeHomeAsEntered · MK-CF-F-145 deductionsFromPay
 *               MK-CF-F-146 payFiguresAgree · MK-CF-F-150 debtPaymentsCountedAsExpenses
 *               MK-CF-F-151 actualSpending · MK-CF-F-153 radar
 *               MK-CF-F-157 debtPaymentsByDebt · MK-CF-F-165 salaryMonths
 *               MK-CF-F-169 withSalaryMonth · MK-CF-F-170 salaryYearFromCells
 *               MK-CF-F-171 earnerPay · MK-CF-F-178 wageMatchMonthly
 *               MK-CF-F-180 enteredLandsAnnual · MK-CF-F-181 rateInForce
 *               MK-CF-F-185 needsTakeHomeConversion · MK-CF-F-186 convertTakeHomeMode
 *               MK-CF-F-188 householdPreTaxContributionsAnnual · MK-CF-F-189 essentialsFromLoggedSpending
 *               MK-CF-F-206 householdK401ByMonth · MK-CF-O-004 incomeSummary
 *               MK-CF-O-016 incomeSources · MK-CF-O-019 theIncomeManager
 *               MK-NW-F-040 assetsFromOnboarding · MK-NW-F-041 monthlyContributionsFromOnboarding
 *               MK-PL-F-013 goalsFromOnboarding · MK-PL-F-031 taxOrganizer
 *               MK-PL-F-049 retirementSpendMonthly · MK-XS-F-004 buildDatedGrid
 *               MK-XS-F-030 effectiveAnnualContribution · MK-XS-F-031 buildSnapshot
 *               MK-XS-F-058 parseReceipt
 *
 * Reaches ..... 222 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               MK-NW-F-093 QUIET_PERF · MK-CF-F-207 SOURCE
 *               … and 204 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-052
 * Changed ..... 2026-06-27 (d8d6acc)
 */
export const toNum = (v: any): number => {
  const n = parseFloat(String(v ?? '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
// Currency/locale-aware (delegates to the active money format; defaults to USD/en-US).
/* ─ MK-ST-F-053 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * money
 *
 * Answers ..... Currency/locale-aware (delegates to the active money format; defaults to USD/en-US).
 *
 * Formula .....
 *     format money(n)
 *
 * Called by ... MK-CF-F-146 payFiguresAgree · MK-CF-F-171 earnerPay
 *               MK-CF-F-184 incomeFromAccounts · MK-CF-O-001 basePay
 *               MK-NW-F-078 ONE · MK-NW-F-081 LB
 *               MK-PF-F-013 benchmarkTicker · MK-PF-F-014 buildPerformance
 *               MK-PL-F-030 onCourseSentence · MK-ST-F-012 toLedgerRow
 *               MK-ST-F-044 setMoneyFormat · MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 135 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-081 LB
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-NW-F-078 ONE
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 117 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-053
 * Changed ..... 2026-06-27 (d8d6acc)
 */
export const money = (n: number): string => formatMoney(n);
// Same, but keeps cents — for precise amounts (transactions, holdings). Masks under hide-balances.
/* ─ MK-ST-F-054 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * money2
 *
 * Answers ..... Same, but keeps cents — for precise amounts (transactions, holdings).
 *
 * Formula .....
 *     format money cents(n)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-054
 * Changed ..... 2026-06-27 (d8d6acc)
 */
export const money2 = (n: number): string => formatMoneyCents(n);

/** The middle value of a list, 0 when it is empty. Two identical copies of this used to sit in
 *  retirement and in transactions/flags; one name must mean one function. */
/* ─ MK-PL-F-074 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * median
 *
 * Answers ..... The middle value of a list, 0 when it is empty.
 *
 * Formula .....
 *     0   when count of xs is missing
 *     s = [...xs].sort((a, b) => a − b)
 *     m = round down(length ÷ 2)
 *     the answer:
 *     s[m]   if length % 2
 *     (s[m − 1] + s[m]) ÷ 2   otherwise
 *
 * Called by ... MK-CF-F-109 reviewTransactions · MK-PL-F-050 simulate
 *
 * Reaches ..... 81 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-CF-F-107 buildPaycheckYear · MK-PL-F-053 buildRetirementState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-072 deleteAccount · MK-XS-F-138 deriveKeyFromSecret
 *               MK-CF-O-017 futurePaycheck · MK-NW-F-044 getAssetsState
 *               … and 63 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-074
 * Changed ..... not in git yet (—)
 */
export const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
