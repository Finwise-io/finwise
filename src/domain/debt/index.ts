// Debt & Liability module (spec service 3). Owns `debts/{uid}`.
import type { UserId, EntityId } from '../_shared/ids';
import { newEntityId } from '../_shared/ids';
import { toNum } from '../_shared/num';
import { getUserDoc, setUserDoc } from '../_shared/firestore';
import { emit } from '../_shared/eventBus';

export type DebtType = 'MORTGAGE' | 'HELOC' | 'CREDIT_CARD' | 'STUDENT_LOAN' | 'AUTO' | 'PERSONAL' | 'MEDICAL' | 'OTHER';

export interface Debt {
  debt_id: EntityId;
  label: string;                   // account name, e.g. "Chase Sapphire"
  institution?: string;
  debt_type: DebtType;
  remaining_balance: number;
  interest_rate_apr: number;       // decimal
  minimum_monthly_payment: number;
  monthly_payment?: number;        // what you actually pay each month (≥ minimum); defaults to minimum
  due_day?: number;                // day of month the payment is due (1–31)
  first_payment_date?: string;     // 'YYYY-MM-DD' — payments START here (deferred/future-start loans);
                                   // absent = already paying. Interest accrues from now either way (F2).
  // #17 / Term #9 / B47 finding 11 — payment shape (drives DTI bucket + how cash flow shows it):
  payoff_date?: string;            // 'YYYY-MM-DD' final payoff / loan maturity (term loans);
                                   // for due_in_full this IS the due date of the lump sum
  payment_frequency?: 'monthly' | 'annual';     // default monthly
  payment_type?: 'installment' | 'revolving' | 'due_in_full';   // fixed loan payment vs revolving
                                   // minimum (cards) vs one lump sum on a date; defaults by debt_type
  origin?: 'onboarding';           // seeded from onboarding answers; re-seeding replaces ONLY these
                                   // rows (absent = user-created, never touched by seeding/restart)
}

/** B47 finding 11 — a debt's repayment SHAPE. Cards/lines revolve (a minimum that floats with the
 *  balance); everything else is an installment loan (a real fixed payment + an end date) unless the
 *  user says it's due in full on a date. One function so every editor defaults the same way. */
/* ─ MK-CF-F-021 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * defaultPaymentType
 *
 * Answers ..... B47 finding 11 — a debt's repayment SHAPE.
 *
 * Formula .....
 *     'revolving'   if t = 'CREDIT_CARD' (or t = 'HELOC' when missing or zero)
 *     'installment'   otherwise
 *
 * Called by ... MK-CF-F-022 paymentShape
 *
 * Reaches ..... 117 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-101 PLAN
 *               MK-CF-F-202 TAX · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-005 actualMonthFlow
 *               MK-XS-F-057 analyzeExpenses · MK-CF-F-012 annualCashflow
 *               … and 99 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-021
 * Changed ..... 2026-07-31 (8428ea8)
 */
export function defaultPaymentType(t: DebtType): NonNullable<Debt['payment_type']> {
  return t === 'CREDIT_CARD' || t === 'HELOC' ? 'revolving' : 'installment';
}
/* ─ MK-CF-F-022 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * paymentShape
 *
 * Answers ..... How is THIS debt repaid?
 *
 * Formula .....
 *     payment type (or default payment type(debt type) when missing)
 *
 * Called by ... MK-CF-F-023 requiredPayment · MK-CF-F-025 minimumDebtService
 *               MK-CF-F-034 payoffPlan · MK-CF-F-149 recurringDebtPayments
 *               MK-CF-F-150 debtPaymentsCountedAsExpenses · MK-CF-F-152 isRadarItem
 *               MK-CF-F-159 isRecurringDebt · MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 116 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-101 PLAN
 *               MK-CF-F-202 TAX · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-005 actualMonthFlow
 *               MK-XS-F-057 analyzeExpenses · MK-CF-F-012 annualCashflow
 *               … and 98 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-022
 * Changed ..... 2026-07-31 (8428ea8)
 */
export function paymentShape(d: Debt): NonNullable<Debt['payment_type']> {
  return d.payment_type ?? defaultPaymentType(d.debt_type);
}

/** The payment reserved/required each month for a debt (planned payment, else the minimum).
 *  Due-in-full debts have NO monthly payment — they are a dated lump, not a monthly outflow. */
/* ─ MK-CF-F-023 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * requiredPayment
 *
 * Answers ..... The payment reserved/required each month for a debt (planned payment, else the minimum).
 *
 * Formula .....
 *     0   when payment shape(d) = 'due_in_full'
 *     max(minimum monthly payment, monthly payment (or 0 when missing)) (or minimum monthly payment when missing or zero)
 *
 * Called by ... MK-CF-F-005 actualMonthFlow · MK-CF-F-024 totalDebtMonthly
 *               MK-CF-F-149 recurringDebtPayments · MK-CF-F-153 radar
 *               MK-CF-F-156 plannedMonthFlow · MK-NW-O-003 theNetWorth
 *               MK-NW-O-004 theEmergencyFund · MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 110 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-101 PLAN
 *               MK-CF-F-202 TAX · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-005 actualMonthFlow
 *               MK-XS-F-057 analyzeExpenses · MK-CF-F-012 annualCashflow
 *               … and 92 more — the full list is on functions_from_code
 *
 * Serves ...... MK-CF-M-019
 * Reads ....... MK-XS-I-016 debt minimum payment
 *               MK-XS-I-041 the payment the person chose to make on a debt
 *               MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *
 * Decides .....
 *     · If monthly payment is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-023
 * Changed ..... 2026-07-31 (8428ea8)
 */
export function requiredPayment(d: Debt): number {
  if (paymentShape(d) === 'due_in_full') return 0;
  return Math.max(d.minimum_monthly_payment, d.monthly_payment ?? 0) || d.minimum_monthly_payment;
}
/** Total monthly debt obligation across all debts (override-aware). */
/* ─ MK-CF-F-024 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * totalDebtMonthly
 *
 * Answers ..... Total monthly debt obligation across all debts (override-aware).
 *
 * Formula .....
 *     Σ over debts of (required payment(each))
 *
 * Called by ... MK-CF-F-026 actualDebtPayment
 *
 * Reaches ..... 11 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-CF-F-026 actualDebtPayment
 *               MK-CF-F-036 buildDebtState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-041 getDebtState · MK-XS-F-029 monthlySavings
 *               MK-XS-F-032 snapshotFromOnboarding · MK-XS-F-028 surplusByMonth
 *               MK-NW-O-003 theNetWorth
 *
 * Serves ...... MK-NW-M-012
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-024
 * Changed ..... 2026-07-31 (8428ea8)
 */
export function totalDebtMonthly(debts: Debt[]): number {
  return debts.reduce((t, d) => t + requiredPayment(d), 0);
}

// Term #9 — TWO clearly-named monthly-debt numbers (they're different concepts, not a bug to pick one):
/** Σ MINIMUM required payments — the contractual obligation. Use for DEBT-TO-INCOME (DTI). */
/* ─ MK-CF-F-025 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * minimumDebtService
 *
 * Answers ..... Term #9 — TWO clearly-named monthly-debt numbers (they're different concepts, not a bug to pick one): Σ MINIMUM required payments — the contractual obligation.
 *
 * Formula .....
 *     Σ over debts (or none when missing) of (0   if payment shape(each) = 'due_in_full'
 *     minimum monthly payment (or 0 when missing or zero)   otherwise)
 *
 * Called by ... MK-CF-F-036 buildDebtState
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-CF-F-036 buildDebtState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-041 getDebtState
 *               MK-XS-F-032 snapshotFromOnboarding · MK-NW-O-003 theNetWorth
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-016 debt minimum payment
 *               MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *
 * Decides .....
 *     · If minimum monthly payment is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-025
 * Changed ..... 2026-07-31 (8428ea8)
 */
export function minimumDebtService(debts: Debt[]): number {
  return ((debts ?? []).reduce((t, d) => t + (paymentShape(d) === 'due_in_full' ? 0 : d.minimum_monthly_payment || 0), 0));
}
/** Σ ACTUAL payments (override ≥ minimum) — what actually leaves your account. Use for CASH FLOW. */
/* ─ MK-CF-F-026 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * actualDebtPayment
 *
 * Answers ..... Σ ACTUAL payments (override ≥ minimum) — what actually leaves your account.
 *
 * Formula .....
 *     total debt monthly(debts ?? [])
 *
 * Called by ... MK-CF-F-036 buildDebtState · MK-XS-F-028 surplusByMonth
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-CF-F-036 buildDebtState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-041 getDebtState
 *               MK-XS-F-029 monthlySavings · MK-XS-F-032 snapshotFromOnboarding
 *               MK-XS-F-028 surplusByMonth · MK-NW-O-003 theNetWorth
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-026
 * Changed ..... 2026-06-24 (8dd4f24)
 */
export function actualDebtPayment(debts: Debt[]): number {
  return (totalDebtMonthly(debts ?? []));
}
/** Σ outstanding debt BALANCE — what you still owe (not a monthly payment). The one canonical
 *  "total debt" so net worth, the debt screen, and insurance can't show different totals. */
/* ─ MK-CF-F-027 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * totalDebtBalance
 *
 * Answers ..... Σ outstanding debt BALANCE — what you still owe (not a monthly payment).
 *
 * Formula .....
 *     Σ over debts (or none when missing) of (remaining balance (or 0 when missing or zero))
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-014 debt balance
 *
 * Decides .....
 *     · If remaining balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-027
 * Changed ..... 2026-07-12 (9684f57)
 */
export function totalDebtBalance(debts: Debt[]): number {
  return ((debts ?? []).reduce((t, d) => t + (d.remaining_balance || 0), 0));
}

// ── Loan repayment (standard amortization) — e.g. what a student loan costs once you're repaying ──
export interface LoanPlan { monthly: number; totalInterest: number; totalPaid: number; }
/** UNIT LANDMINE (P0): `aprPct` is a PERCENT (7 = 7%), unlike Debt.interest_rate_apr which is a
 *  DECIMAL (0.07). Passing a decimal here silently computes a ~100× lower rate. The dev-time guard
 *  below flags decimal-looking inputs; term-loan rates genuinely under 1%/year don't occur in our
 *  flows (0% promos pass 0, which is fine). */
/* ─ MK-CF-F-028 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * loanPayment
 *
 * Answers ..... UNIT LANDMINE (P0): `aprPct` is a PERCENT (7 = 7%), unlike Debt.interest_rate_apr which is a DECIMAL (0.07).
 *
 * Formula .....
 *     dev = __DEV__   if __DEV__ is not a undefined
 *     process.env.NODE_ENV ! = 'production'   otherwise
 *     n = round(term years × 12), r = apr pct ÷ 100 ÷ 12
 *     monthly = 0
 *     total interest = 0
 *     total paid = 0   when principal ≤ 0 (or n ≤ 0 when missing or zero)
 *     monthly = (principal × r) ÷ (1 − math.pow(1 + r, -n))   if r > 0
 *     principal ÷ n   otherwise
 *     total paid = monthly × n
 *     the answer:
 *     monthly = monthly
 *     total interest = total paid − principal
 *     total paid = total paid
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-028
 * Changed ..... 2026-07-12 (9684f57)
 */
export function loanPayment(principal: number, aprPct: number, termYears: number): LoanPlan {
  const dev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV !== 'production';
  if (dev && aprPct > 0 && aprPct < 1) {
    console.warn(`loanPayment: aprPct=${aprPct} looks like a DECIMAL rate — this parameter is a percent (7 = 7%). Multiply by 100.`);
  }
  const n = Math.round(termYears * 12), r = aprPct / 100 / 12;
  if (principal <= 0 || n <= 0) return { monthly: 0, totalInterest: 0, totalPaid: 0 };
  const monthly = r > 0 ? (principal * r) / (1 - Math.pow(1 + r, -n)) : principal / n;
  const totalPaid = monthly * n;
  return { monthly: (monthly), totalInterest: (totalPaid - principal), totalPaid: (totalPaid) };
}

// ── B47 finding 11: the installment two-way math — enter the payment OR the end date, the app
// computes the other. Both use Debt's DECIMAL rate (0.0625 = 6.25%), unlike loanPayment's percent.
/** Months to clear `principal` paying `payment`/month at decimal APR. null = never (payment ≤ interest). */
/* ─ MK-CF-F-029 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * monthsToClear
 *
 * Answers ..... ── B47 finding 11: the installment two-way math — enter the payment OR the end date, the app computes the other.
 *
 * Formula .....
 *     0   when principal ≤ 0
 *     nothing   when payment ≤ 0
 *     r = apr decimal ÷ 12
 *     round up(principal ÷ payment)   when r ≤ 0
 *     nothing   when payment ≤ principal × r
 *     the answer = round up(math.log(payment ÷ (payment − principal × r)) ÷ math.log(1 + r))
 *
 * Called by ... MK-CF-F-042 mortgageOddsEffect
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-F-042 mortgageOddsEffect
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-029
 * Changed ..... 2026-07-31 (8428ea8)
 */
export function monthsToClear(principal: number, aprDecimal: number, payment: number): number | null {
  if (principal <= 0) return 0;
  if (payment <= 0) return null;
  const r = aprDecimal / 12;
  if (r <= 0) return Math.ceil(principal / payment);
  if (payment <= principal * r) return null;                       // covers interest only — never clears
  return Math.ceil(Math.log(payment / (payment - principal * r)) / Math.log(1 + r));
}
/** Monthly payment that clears `principal` in `months` at decimal APR (amortization).
 *  Rounded UP to the next cent — the stated payment must actually meet the stated date. */
/* ─ MK-CF-F-030 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * paymentToClearBy
 *
 * Answers ..... Monthly payment that clears `principal` in `months` at decimal APR (amortization).
 *
 * Formula .....
 *     0   when principal ≤ 0 (or months ≤ 0 when missing or zero)
 *     r = apr decimal ÷ 12
 *     monthly = (principal × r) ÷ (1 − math.pow(1 + r, -months))   if r > 0
 *     principal ÷ months   otherwise
 *     the answer = round up(monthly × 100) ÷ 100
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-030
 * Changed ..... 2026-07-31 (8428ea8)
 */
export function paymentToClearBy(principal: number, aprDecimal: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  const r = aprDecimal / 12;
  const monthly = r > 0 ? (principal * r) / (1 - Math.pow(1 + r, -months)) : principal / months;
  return Math.ceil(monthly * 100) / 100;
}

// ── Credit health — utilization (balance ÷ limit) + score band ──
export interface CreditUtil { ratio: number; status: 'good' | 'caution' | 'high'; }
/* ─ MK-CF-F-031 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * creditUtilization
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     ratio = balance ÷ limit   if limit > 0
 *     0   otherwise
 *     status = 'good'   if ratio ≤ 0.30
 *     'caution'   if ratio ≤ 0.50
 *     'high'   otherwise   otherwise
 *     the answer:
 *     ratio = round(ratio, 3 dp)
 *     status = status
 *
 * Called by ... MK-CF-O-006 theCreditLine
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-NW-F-101 PLAN · MK-CF-O-006 theCreditLine
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *
 * Decides .....
 *     · Rounds the answer to 3 decimal places.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-031
 * Changed ..... 2026-06-08 (5568e46)
 */
export function creditUtilization(balance: number, limit: number): CreditUtil {
  const ratio = limit > 0 ? balance / limit : 0;
  const status: CreditUtil['status'] = ratio <= 0.30 ? 'good' : ratio <= 0.50 ? 'caution' : 'high';
  return { ratio: Math.round(ratio * 1000) / 1000, status };
}
/* ─ MK-CF-F-032 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * creditScoreBand
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     label = 'Excellent'
 *     good = true   when score ≥ 800
 *     label = 'very good'
 *     good = true   when score ≥ 740
 *     label = 'Good'
 *     good = true   when score ≥ 670
 *     label = 'Fair'
 *     good = false   when score ≥ 580
 *     label = 'Poor'
 *     good = false
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-032
 * Changed ..... 2026-06-08 (5568e46)
 */
export function creditScoreBand(score: number): { label: string; good: boolean } {
  if (score >= 800) return { label: 'Excellent', good: true };
  if (score >= 740) return { label: 'Very good', good: true };
  if (score >= 670) return { label: 'Good', good: true };
  if (score >= 580) return { label: 'Fair', good: false };
  return { label: 'Poor', good: false };
}

// ── Debt-to-income ratio (CFPB) — how much of your gross income goes to debt payments ──
export interface DTI { ratio: number; monthlyDebt: number; grossMonthly: number; guideline: number; status: 'good' | 'caution' | 'high'; }
/* ─ MK-CF-F-033 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * debtToIncome
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     ratio = monthly debt ÷ gross monthly   if gross monthly > 0
 *     0   otherwise
 *     guideline = 0.36   if homeowner
 *     0.20   otherwise
 *     status = 'good'   if ratio ≤ guideline
 *     'caution'   if ratio ≤ guideline × 1.4
 *     'high'   otherwise   otherwise
 *     the answer:
 *     ratio = round(ratio, 3 dp)
 *     monthly debt = monthly debt
 *     gross monthly = gross monthly
 *     guideline = guideline
 *     status = status
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Rounds the answer to 3 decimal places.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-033
 * Changed ..... 2026-06-07 (766aee3)
 */
export function debtToIncome(monthlyDebt: number, grossMonthly: number, homeowner = false): DTI {
  const ratio = grossMonthly > 0 ? monthlyDebt / grossMonthly : 0;
  const guideline = homeowner ? 0.36 : 0.20;   // CFPB: renters 15–20%, homeowners ≤36% (incl. mortgage)
  const status: DTI['status'] = ratio <= guideline ? 'good' : ratio <= guideline * 1.4 ? 'caution' : 'high';
  return { ratio: Math.round(ratio * 1000) / 1000, monthlyDebt: (monthlyDebt), grossMonthly: (grossMonthly), guideline, status };
}

// ── Debt-payoff plan (avalanche = highest APR first; snowball = smallest balance first) ──
export type PayoffMethod = 'avalanche' | 'snowball';
export interface PayoffResult {
  months: number;                 // months to debt-free (0 = already free)
  totalInterest: number;          // interest paid over the plan
  neverPaysOff: boolean;          // payments can't cover interest
  order: { debt_id: EntityId; label: string; payoffMonth: number; interestPaid: number }[];
}
/** Simulate paying off debts with a constant monthly budget (sum of minimums + extra), rolling each
 *  cleared debt's freed-up payment into the next per the chosen method. */
/* ─ MK-CF-F-034 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * payoffPlan
 *
 * Answers ..... Simulate paying off debts with a constant monthly budget (sum of minimums + extra), rolling each cleared debt's freed-up payment into the next per the chosen method.
 *
 * Formula .....
 *     each month:  balance ← balance + balance × rate ÷ 12
 *                  pay each debt its minimum, once its first payment month has arrived
 *                  pay everything left over to ONE debt — highest rate (avalanche)
 *                                                   or smallest balance (snowball)
 *                  a debt clears when its balance falls to a cent or less, and its payment
 *                      rolls into the budget for the next one
 *     stops at 600 months and reports "never pays off"
 *
 * Called by ... MK-PL-F-036 weighGoals
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-PL-F-037 trimHints · MK-PL-F-036 weighGoals
 *
 * Serves ...... MK-PL-M-031
 * Reads ....... MK-XS-I-014 debt balance
 *               MK-XS-I-015 debt interest rate
 *               MK-XS-I-016 debt minimum payment
 *               MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *               MK-XS-I-053 the month a debt is first paid
 *               MK-XS-I-054 the date a debt is due to be paid off in full
 *
 * Decides .....
 *     · Uses a built-in month of 0.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Never lets extra monthly fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-034
 * Changed ..... 2026-07-31 (8428ea8)
 */
export function payoffPlan(debts: Debt[], extraMonthly: number, method: PayoffMethod = 'avalanche', now: Date = new Date()): PayoffResult {
  // B47 finding 11 — due-in-full debts are NOT part of the monthly-budget simulation (a $15k lump
  // isn't paid from the monthly debt budget; it's a dated big-ticket the cash-flow grid schedules).
  // They still count toward "debt-free by": cleared in their due month, interest accrued until then.
  const lumps = (debts ?? []).filter((d) => d.remaining_balance > 0 && paymentShape(d) === 'due_in_full')
    .map((d) => {
      const m = d.payoff_date?.match(/^(\d{4})-(\d{2})/);
      const dueMonth = m ? Math.max(1, (+m[1] * 12 + (+m[2] - 1)) - (now.getFullYear() * 12 + now.getMonth())) : 1;
      const interest = d.remaining_balance * (Math.pow(1 + d.interest_rate_apr / 12, dueMonth) - 1);
      return { debt_id: d.debt_id, label: d.label, payoffMonth: dueMonth, interestPaid: (interest) };
    });
  const live = (debts ?? []).filter((d) => d.remaining_balance > 0 && paymentShape(d) !== 'due_in_full')
    .map((d) => {
      // deferred loans (first_payment_date in the future): interest accrues from now, but no
      // payment leaves until that month (founder review F2 #17 — a loan due in 3 years is real)
      const fm = d.first_payment_date?.match(/^(\d{4})-(\d{2})/);
      const startAfter = fm ? Math.max(0, (+fm[1] * 12 + (+fm[2] - 1)) - (now.getFullYear() * 12 + now.getMonth())) : 0;
      return { id: d.debt_id, label: d.label, bal: d.remaining_balance, apr: d.interest_rate_apr, min: d.minimum_monthly_payment, interest: 0, payoffMonth: 0, startAfter };
    });
  const lumpMonths = lumps.reduce((m, l) => Math.max(m, l.payoffMonth), 0);
  const lumpInterest = (lumps.reduce((t, l) => t + l.interestPaid, 0));
  if (!live.length) return { months: lumpMonths, totalInterest: lumpInterest, neverPaysOff: false, order: lumps.sort((a, b) => a.payoffMonth - b.payoffMonth) };
  // budget grows as deferred debts come due (their minimum joins when payments start)
  const budgetAt = (month: number) => live.concat(cleared).reduce((t, d) => t + (month > d.startAfter ? d.min : 0), 0) + Math.max(0, extraMonthly);
  const cleared: typeof live = [];
  let month = 0;
  while (live.some((d) => d.bal > 0) && month < 600) {
    month++;
    for (const d of live) { const i = (d.bal * d.apr) / 12; d.bal += i; d.interest += i; }            // accrue interest
    let pool = budgetAt(month);
    for (const d of live) { if (month <= d.startAfter) continue; const pay = Math.min(d.min, d.bal, pool); d.bal -= pay; pool -= pay; }     // pay minimums (deferred debts wait)
    const priority = [...live].filter((d) => d.bal > 0 && month > d.startAfter).sort((a, b) => (method === 'avalanche' ? b.apr - a.apr : a.bal - b.bal));
    for (const d of priority) { if (pool <= 0) break; const pay = Math.min(pool, d.bal); d.bal -= pay; pool -= pay; }   // extra to priority
    for (let j = live.length - 1; j >= 0; j--) { if (live[j].bal <= 0.01) { live[j].payoffMonth = month; cleared.push(live[j]); live.splice(j, 1); } }
  }
  const neverPaysOff = live.length > 0;
  const all = [...cleared, ...live];
  return {
    months: neverPaysOff ? 600 : Math.max(month, lumpMonths),
    totalInterest: (all.reduce((t, d) => t + d.interest, 0) + lumpInterest),
    neverPaysOff,
    order: cleared.map((d) => ({ debt_id: d.id, label: d.label, payoffMonth: d.payoffMonth, interestPaid: (d.interest) }))
      .concat(lumps).sort((a, b) => a.payoffMonth - b.payoffMonth),
  };
}

// Capture types for debts (id maps to DebtType).
export const DEBT_KINDS: { id: DebtType; label: string; icon: string }[] = [
  { id: 'MORTGAGE', label: 'Mortgage', icon: '🏠' },
  { id: 'HELOC', label: 'HELOC', icon: '🏡' },
  { id: 'STUDENT_LOAN', label: 'Student loan', icon: '🎓' },
  { id: 'CREDIT_CARD', label: 'Credit card', icon: '💳' },
  { id: 'AUTO', label: 'Auto loan', icon: '🚗' },
  { id: 'PERSONAL', label: 'Personal loan', icon: '🧾' },
  { id: 'MEDICAL', label: 'Medical', icon: '🏥' },
  { id: 'OTHER', label: 'Other', icon: '📦' },
];
/* ─ MK-CF-F-035 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * debtKind
 *
 * Answers ..... What do we know about this kind of debt?
 *
 * Formula .....
 *     id = id); }
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in t o x i c a p r of 7%.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-035
 * Changed ..... 2026-06-22 (b8657c4)
 */
export function debtKind(id?: string) { return DEBT_KINDS.find((k) => k.id === id); }
export interface DebtDoc { user_id: UserId; debts: Debt[]; last_updated?: any; }

export interface DebtState {
  user_id: UserId;
  total_debt_balance: number;
  total_monthly_debt_service: number;   // Σ MINIMUM payments — the obligation (use for DTI)
  total_actual_payment: number;         // Σ ACTUAL payments (override-aware) — use for cash flow
  debts: Debt[];
  highest_rate_debt: Debt | null;   // the "pay this first" (avalanche) target
  toxic_debt_balance: number;       // balances above ~7% APR
}

/** APR above which debt is "toxic" — paying it down beats almost any investment return. The single
 *  source of truth for "high-interest / toxic" debt across the debt module, Net Worth, and Insights. */
export const TOXIC_APR = 0.07;

/* ─ MK-CF-F-036 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * buildDebtState
 *
 * Answers ..... What is the whole debt picture?
 *
 * Formula .....
 *     total debt balance = round(Σ over every debt of (remaining balance), 2 dp)
 *     toxic debt         = round(Σ over debts where rate > 10% of (remaining balance), 2 dp)
 *     highest rate debt  = the debt with the largest rate
 *
 * Called by ... MK-CF-F-041 getDebtState · MK-NW-O-003 theNetWorth
 *               MK-XS-F-031 buildSnapshot
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-041 getDebtState · MK-XS-F-032 snapshotFromOnboarding
 *               MK-NW-O-003 theNetWorth
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-014 debt balance
 *               MK-XS-I-015 debt interest rate
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-036
 * Changed ..... 2026-06-22 (b8657c4)
 */
export function buildDebtState(uid: UserId, debts: Debt[]): DebtState {
  const total = debts.reduce((t, d) => t + d.remaining_balance, 0);
  const highest = debts.length ? debts.reduce((m, d) => (d.interest_rate_apr > m.interest_rate_apr ? d : m)) : null;
  const toxic = debts.filter((d) => d.interest_rate_apr > TOXIC_APR).reduce((t, d) => t + d.remaining_balance, 0);
  return {
    user_id: uid, total_debt_balance: (total),
    total_monthly_debt_service: minimumDebtService(debts),   // DTI obligation (Σ minimum)
    total_actual_payment: actualDebtPayment(debts),          // cash-flow outflow (override-aware)
    debts, highest_rate_debt: highest, toxic_debt_balance: (toxic),
  };
}

/** B-30: infer the debt type from its name so a "Mortgage" is treated as a mortgage (homeowner DTI
 *  guideline), not lumped into OTHER (renter guideline). */
/* ─ MK-CF-F-037 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * inferDebtType
 *
 * Answers ..... B-30: infer the debt type from its name so a "Mortgage" is treated as a mortgage (homeowner DTI guideline), not lumped into OTHER (renter guideline).
 *
 * Formula .....
 *     s = (label ?? '').to lower case()
 *     'HELOC'   when ÷ heloc|home\s × equity ÷ .test(s)
 *     'MORTGAGE'   when ÷ mortgage|home\s × loan ÷ .test(s)
 *     'AUTO'   when ÷ auto|car\s × loan|vehicle ÷ .test(s)
 *     'STUDENT_LOAN'   when ÷ student|tuition ÷ .test(s)
 *     'CREDIT_CARD'   when ÷ credit\s × card|visa|mastercard|amex ÷ .test(s)
 *     'MEDICAL'   when ÷ medical|hospital|dental ÷ .test(s)
 *     'PERSONAL'   when ÷ personal ÷ .test(s)
 *     the answer = 'OTHER'
 *
 * Called by ... MK-CF-F-038 debtsFromOnboarding
 *
 * Reaches ..... 57 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-NW-F-044 getAssetsState
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               … and 39 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-037
 * Changed ..... 2026-06-22 (b8657c4)
 */
export function inferDebtType(label: string | undefined): DebtType {
  const s = (label ?? '').toLowerCase();
  if (/heloc|home\s*equity/.test(s)) return 'HELOC';
  if (/mortgage|home\s*loan/.test(s)) return 'MORTGAGE';
  if (/auto|car\s*loan|vehicle/.test(s)) return 'AUTO';
  if (/student|tuition/.test(s)) return 'STUDENT_LOAN';
  if (/credit\s*card|visa|mastercard|amex/.test(s)) return 'CREDIT_CARD';
  if (/medical|hospital|dental/.test(s)) return 'MEDICAL';
  if (/personal/.test(s)) return 'PERSONAL';
  return 'OTHER';
}

/* ─ MK-CF-F-038 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * debtsFromOnboarding
 *
 * Answers ..... What debts should exist from the setup answers?
 *
 * Formula .....
 *     a = op (or none when missing)
 *     debts = []
 *     bal = debt balance read as a number (0 when it is not one)
 *     label = debt name (or 'Debt' when missing) (or 'Debt' when missing or zero)
 *     the answer:
 *     user id = uid
 *     debts = debts
 *
 * Called by ... MK-XS-F-032 snapshotFromOnboarding · MK-XS-F-033 resolveNetWorthRows
 *               MK-XS-F-174 recomputeBalances · MK-XS-F-175 uid
 *
 * Reaches ..... 57 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-NW-F-040 assetsFromOnboarding
 *               MK-CF-F-013 budgetFromOnboarding · MK-NW-F-039 buildAssetsState
 *               MK-CF-F-001 buildBudgetState · MK-CF-F-036 buildDebtState
 *               MK-PL-F-011 buildGoalsState · MK-NW-F-065 buildNetWorth
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-038 debtsFromOnboarding · MK-XS-F-072 deleteAccount
 *               MK-XS-F-138 deriveKeyFromSecret · MK-NW-F-044 getAssetsState
 *               MK-CF-F-041 getDebtState · MK-CF-F-052 getIncomeState
 *               … and 39 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-014 debt balance
 *               MK-XS-I-015 debt interest rate
 *               MK-XS-I-016 debt minimum payment
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-038
 * Changed ..... 2026-06-13 (a0cd4a9)
 */
export function debtsFromOnboarding(uid: UserId, op: Record<string, any> | null): DebtDoc {
  const a = op ?? {};
  const debts: Debt[] = [];
  const bal = toNum(a.debtBalance);
  if (bal > 0) {
    const label = (a.debtName ?? 'Debt') || 'Debt';
    debts.push({
      debt_id: newEntityId('debt'), label, debt_type: inferDebtType(label),
      remaining_balance: bal, interest_rate_apr: toNum(a.debtRate) / 100, minimum_monthly_payment: toNum(a.debtPayment),
      origin: 'onboarding',
    });
  }
  return { user_id: uid, debts };
}

const COLLECTION = 'debts';
export const DEBT_UPDATED = 'DebtUpdated';
/* ─ MK-CF-F-039 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * loadDebt
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     It reaches outside the app for data and hands back what came back — no arithmetic of its own.
 *
 * Called by ... MK-CF-F-041 getDebtState
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-F-041 getDebtState
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-039
 * Changed ..... 2026-06-05 (f742136)
 */
export async function loadDebt(uid: UserId) { return getUserDoc<DebtDoc>(COLLECTION, uid); }
/* ─ MK-CF-F-040 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * saveDebt
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
 * Formula also on the master file · functions_from_code · MK-CF-F-040
 * Changed ..... 2026-06-05 (f742136)
 */
export async function saveDebt(d: DebtDoc) { await setUserDoc(COLLECTION, d.user_id, d); emit(DEBT_UPDATED, { user_id: d.user_id }); }
/* ─ MK-CF-F-041 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * getDebtState
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     d = build debt state(uid, debts ?? [])   if await load debt(uid); return d
 *     nothing   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-041
 * Changed ..... 2026-06-05 (f742136)
 */
export async function getDebtState(uid: UserId) {
  const d = await loadDebt(uid); return d ? buildDebtState(uid, d.debts ?? []) : null;
}
