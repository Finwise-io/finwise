// Debt & Liability module (spec service 3). Owns `debts/{uid}`.
import type { UserId, EntityId } from '../_shared/ids';
import { newEntityId } from '../_shared/ids';
import { toNum } from '../_shared/num';
import { withArticle } from '../_shared/plural';   // the one article rule (DEC-7306)
/** A sentence's first letter in capitals, the rest as written; words only, it calculates nothing. */
/* ─ MK-CF-F-298 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * capFirst
 *
 * Answers ..... A sentence's first letter in capitals, the rest as written; words only, it calculates nothing.
 *
 * Formula .....
 *     char at(0).to upper case() + slice(1)
 *
 * Called by ... MK-CF-F-302 setupLoanSentences
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-F-302 setupLoanSentences
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-003 institution name
 *               MK-XS-I-014 debt balance
 *               MK-XS-I-015 debt interest rate
 *               MK-XS-I-016 debt minimum payment
 *               MK-XS-I-039 how often each income arrives
 *               MK-XS-I-041 the payment the person chose to make on a debt
 *               MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *               MK-XS-I-052 the day of the month a debt payment is due
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-298
 * Changed ..... not in git yet (—)
 */
const capFirst = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
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
  property_id?: EntityId;          // a mortgage or HELOC: the property in Net worth it is on (founder,
                                   // 2026-10-04: "no mortgage without property"). Older rows carry none
                                   // and are matched by mortgagesByProperty.
  setup_loan?: number;             // a student loan entered in setup that this debt IS (its place in the setup list): saved from that
                                   // loan's row on Net worth, so the two are counted once (R22, 2026-11-01)
}

/** B47 finding 11 — a debt's repayment SHAPE. Cards/lines revolve (a minimum that floats with the
 *  balance); everything else is an installment loan (a real fixed payment + an end date) unless the
 *  user says it's due in full on a date. One function so every editor defaults the same way. */

/** How a kind of debt is normally repaid: a card or a credit line revolves, and every other kind is a loan paid in fixed instalments. */
/* ─ MK-CF-F-021 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * defaultPaymentType
 *
 * Answers ..... How a kind of debt is normally repaid: a card or a credit line revolves, and every other kind is a loan paid in fixed instalments.
 *
 * Formula .....
 *     'revolving'   if t = 'CREDIT_CARD' (or t = 'HELOC' when missing or zero)
 *     'installment'   otherwise
 *
 * Called by ... MK-CF-F-022 paymentShape
 *
 * Reaches ..... 578 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 560 more — the full list is on functions_from_code
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

/** How this debt is repaid: the way the person said, or the normal way for its kind when they did not say. */
/* ─ MK-CF-F-022 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * paymentShape
 *
 * Answers ..... How this debt is repaid: the way the person said, or the normal way for its kind when they did not say.
 *
 * Formula .....
 *     payment type (or default payment type(debt type) when missing)
 *
 * Called by ... MK-CF-F-005 actualMonthFlow · MK-CF-F-023 requiredPayment
 *               MK-CF-F-025 minimumDebtService · MK-CF-F-034 payoffPlan
 *               MK-CF-F-149 recurringDebtPayments · MK-CF-F-150 debtPaymentsCountedAsExpenses
 *               MK-CF-F-152 isRadarItem · MK-CF-F-156 plannedMonthFlow
 *               MK-CF-F-159 isRecurringDebt · MK-CF-F-235 paysInMonth
 *               MK-CF-F-236 paymentInMonth · MK-NW-F-147 paymentNotEntered
 *               MK-NW-O-004 theEmergencyFund · MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 577 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 559 more — the full list is on functions_from_code
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
 *     monthly payment read as a number   when minimum monthly payment = nothing and number(monthly payment) > 0
 *     max(minimum monthly payment, monthly payment (or 0 when missing)) (or minimum monthly payment when missing or zero)
 *
 * Called by ... MK-CF-F-024 totalDebtMonthly · MK-CF-F-034 payoffPlan
 *               MK-CF-F-235 paysInMonth · MK-CF-F-236 paymentInMonth
 *               MK-CF-F-296 LOAD · MK-CF-O-018 theDebts
 *               MK-NW-F-106 mortgagesByProperty · MK-NW-O-003 theNetWorth
 *               MK-PL-F-101 debtGoalPlan · MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 571 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 553 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
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
  // a payment set with no minimum typed is still a payment (2026-10-25, FIX-MONTH — paymentNotEntered's rule, MK-NW-F-147): it read
  // as not a number, so the plan refused a debt Net worth counts
  if (d.minimum_monthly_payment == null && Number(d.monthly_payment) > 0) return Number(d.monthly_payment);
  return Math.max(d.minimum_monthly_payment, d.monthly_payment ?? 0) || d.minimum_monthly_payment;
}

/** What it is for: WHETHER A DEBT'S INTEREST RATE WAS NEVER ENTERED (2026-10-25, FIX-MONTH; tenet 3 of DEC-3523, unknown is not zero,
 *  and his DEC-0296, "an unknown input produces no number and a reason — never a default"). A mortgage added with its property is
 *  never asked its rate, and a rate box left blank in the debt editor was saved as 0, so both read "0.00%" and cost nothing in
 *  interest. Now a rate never entered is kept as not a number: a screen says "rate not entered", and the interest a month and the
 *  payoff plan give no figure for it. A typed 0 is 0%: an entered number, never "not entered". */
/* ─ MK-CF-F-259 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rateNotEntered
 *
 * Answers ..... What it is for: WHETHER A DEBT'S INTEREST RATE WAS NEVER ENTERED (2026-10-25, FIX-MONTH; tenet 3 of DEC-3523, unknown is not zero, and his DEC-0296, "an unknown input produces no number and a reason — never a default").
 *
 * Formula .....
 *     false   when d = nothing
 *     v = (d as any).interest rate apr
 *     the answer = v = nothing (or string(v).trim() = '' (or !number.is finite(number(v)) when missing or zero) when missing or zero)
 *
 * Called by ... MK-CF-F-034 payoffPlan · MK-CF-O-018 theDebts
 *
 * Reaches ..... 16 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-296 LOAD
 *               MK-PL-F-101 debtGoalPlan · MK-CF-F-295 debtLoad
 *               MK-CF-F-315 debtsEntered · MK-CF-F-034 payoffPlan
 *               MK-CF-F-314 setupEntered · MK-CF-F-305 setupLoanDebts
 *               MK-CF-F-302 setupLoanSentences · MK-CF-F-304 setupLoansAll
 *               MK-CF-F-303 setupLoansNotEntered · MK-CF-F-301 setupLoansSplit
 *               MK-CF-F-299 setupStudentLoans · MK-CF-O-018 theDebts
 *               MK-PL-F-037 trimHints · MK-PL-F-036 weighGoals
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-015 debt interest rate
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-259
 * Changed ..... not in git yet (—)
 */
export function rateNotEntered(d: Debt | null | undefined): boolean {
  if (d == null) return false;
  const v: unknown = (d as any).interest_rate_apr;
  return v == null || String(v).trim() === '' || !Number.isFinite(Number(v));
}

/** WHETHER A PAYMENT ON A DEBT FALLS IN ONE CALENDAR MONTH ('YYYY-MM') (2026-10-24, CF-FIX; PF-TOOLS, settling MK-CF-M-001 to
 *  004): a debt counts in a month only if a payment falls in that month. A debt due in full: only the month it is due, while
 *  a balance is owed. Any other debt: from the month of its first payment to the month it is paid off — a date not given sets
 *  no bound. This month's plan (MK-CF-F-156), the dated grid (MK-XS-F-004) and the Expenses tab read it, so This month and
 *  the same month on the calendar count the same debts. */
/* ─ MK-CF-F-235 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * paysInMonth
 *
 * Answers ..... WHETHER A PAYMENT ON A DEBT FALLS IN ONE CALENDAR MONTH ('YYYY-MM') (2026-10-24, CF-FIX; PF-TOOLS, settling MK-CF-M-001 to 004): a debt counts in a month only if a payment falls in that month.
 *
 * Formula .....
 *     month of = (iso?: string) => { const m = string(iso ?? '').match( ÷ ^(\d{4}) − (\d{2}) ÷ ); return m ? +m[1] × 12 + (+m[2] − 1) : nothing; }
 *     at = month of(ym)
 *     false   when at = nothing
 *     remaining balance > 0 and month of(payoff date) = at   when payment shape(d) = 'due_in_full'
 *     first = month of(first payment date), last = month of(payoff date)
 *     the answer = not (first ≠ nothing and at < first) and !(last ≠ nothing and at > last)
 *
 * Called by ... MK-CF-F-005 actualMonthFlow · MK-CF-F-156 plannedMonthFlow
 *               MK-CF-F-236 paymentInMonth
 *
 * Reaches ..... 570 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 552 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-014 debt balance
 *               MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *               MK-XS-I-053 the month a debt is first paid
 *               MK-XS-I-054 the date a debt is due to be paid off in full
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-235
 * Changed ..... not in git yet (—)
 */
export function paysInMonth(d: Debt, ym: string): boolean {
  const monthOf = (iso?: string) => { const m = String(iso ?? '').match(/^(\d{4})-(\d{2})/); return m ? +m[1] * 12 + (+m[2] - 1) : null; };
  const at = monthOf(ym);
  if (at == null) return false;
  if (paymentShape(d) === 'due_in_full') return d.remaining_balance > 0 && monthOf(d.payoff_date) === at;
  const first = monthOf(d.first_payment_date), last = monthOf(d.payoff_date);
  return !(first != null && at < first) && !(last != null && at > last);
}

/** WHAT A DEBT ASKS FOR IN ONE CALENDAR MONTH: nothing in a month no payment falls in (paysInMonth); in one that does, the
 *  whole balance for a debt due in full, and its payment (requiredPayment) for any other. */
/* ─ MK-CF-F-236 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * paymentInMonth
 *
 * Answers ..... WHAT A DEBT ASKS FOR IN ONE CALENDAR MONTH: nothing in a month no payment falls in (paysInMonth); in one that does, the whole balance for a debt due in full, and its payment (requiredPayment) for any other.
 *
 * Formula .....
 *     0   when !pays in month(d, ym)
 *     remaining balance   if payment shape(d) = 'due_in_full'
 *     required payment(d)   otherwise
 *
 * Called by ... MK-CF-F-005 actualMonthFlow · MK-CF-F-149 recurringDebtPayments
 *               MK-CF-F-153 radar · MK-CF-F-156 plannedMonthFlow
 *               MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 569 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 551 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-014 debt balance
 *               MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-236
 * Changed ..... not in git yet (—)
 */
export function paymentInMonth(d: Debt, ym: string): number {
  if (!paysInMonth(d, ym)) return 0;
  return paymentShape(d) === 'due_in_full' ? d.remaining_balance : requiredPayment(d);
}
/** Total monthly debt obligation across all debts (override-aware). */
/* ─ MK-CF-F-024 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * totalDebtMonthly
 *
 * Answers ..... Total monthly debt obligation across all debts (override-aware).
 *
 * Formula .....
 *     Σ over debts of (required payment(each))
 *
 * Called by ... MK-CF-F-026 actualDebtPayment
 *
 * Reaches ..... 568 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 550 more — the full list is on functions_from_code
 *
 * Serves ...... MK-NW-M-012
 * Ruled by .... DEC-0641
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-024
 * Changed ..... 2026-07-31 (8428ea8)
 */
export function totalDebtMonthly(debts: Debt[]): number {
  return debts.reduce((t, d) => t + requiredPayment(d), 0);
}

// Term #9 — TWO clearly-named monthly-debt numbers (they're different concepts, not a bug to pick one):
/** Σ MINIMUM required payments — the contractual obligation. Use for DEBT-TO-INCOME (DTI). */

/** The minimum payments every debt requires in a month, added up, leaving out any debt due in one lump on a date. */
/* ─ MK-CF-F-025 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * minimumDebtService
 *
 * Answers ..... The minimum payments every debt requires in a month, added up, leaving out any debt due in one lump on a date.
 *
 * Formula .....
 *     Σ over debts (or none when missing) of (0   if payment shape(each) = 'due_in_full'
 *     minimum monthly payment (or 0 when missing or zero)   otherwise)
 *
 * Called by ... MK-CF-F-033 debtToIncome · MK-CF-F-036 buildDebtState
 *               MK-CF-F-252 payoffRefusal · MK-CF-F-295 debtLoad
 *               MK-CF-F-296 LOAD · MK-CF-O-018 theDebts
 *
 * Reaches ..... 570 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 552 more — the full list is on functions_from_code
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
/* ─ MK-CF-F-026 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * actualDebtPayment
 *
 * Answers ..... Σ ACTUAL payments (override ≥ minimum) — what actually leaves your account.
 *
 * Formula .....
 *     total debt monthly(debts ?? [])
 *
 * Called by ... MK-CF-F-036 buildDebtState · MK-PL-F-098 goalsCapacity
 *               MK-XS-F-028 surplusByMonth
 *
 * Reaches ..... 568 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 550 more — the full list is on functions_from_code
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
 * Called by ... MK-CF-F-036 buildDebtState
 *
 * Reaches ..... 568 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 550 more — the full list is on functions_from_code
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
  // the sum of KNOWN debts; a debt with no balance adds nothing here and dataGaps names it in the amber
  // box, so the total never passes for complete (outside review OpenAI final, 2026-10-09, DEC-3279e)
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
 * Called by ... MK-CF-F-295 debtLoad · MK-CF-F-296 LOAD
 *               MK-PL-F-100 monthsFrom · MK-PL-F-101 debtGoalPlan
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-296 LOAD · MK-PL-F-101 debtGoalPlan
 *               MK-CF-F-295 debtLoad · MK-PL-F-100 monthsFrom
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

/** How many months it takes to clear a balance at a given yearly rate and monthly payment, or never when the payment does not cover the interest. */
/* ─ MK-CF-F-029 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * monthsToClear
 *
 * Answers ..... How many months it takes to clear a balance at a given yearly rate and monthly payment, or never when the payment does not cover the interest.
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

/** How much of a credit limit is in use, as a share, and whether that is good (30% or less), a caution (up to 50%) or high. */
/* ─ MK-CF-F-031 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * creditUtilization
 *
 * Answers ..... How much of a credit limit is in use, as a share, and whether that is good (30% or less), a caution (up to 50%) or high.
 *
 * Formula .....
 *     ratio = balance ÷ limit   if limit > 0
 *     0   otherwise
 *     status = 'good'   if ratio ≤ 0.30
 *     'caution'   if ratio ≤ 0.50
 *     'high'   otherwise   otherwise
 *     the answer = { ratio, status }
 *
 * Called by ... MK-CF-O-006 theCreditLine
 *
 * Reaches ..... 568 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 550 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-031
 * Changed ..... 2026-06-08 (5568e46)
 */
export function creditUtilization(balance: number, limit: number): CreditUtil {
  const ratio = limit > 0 ? balance / limit : 0;
  const status: CreditUtil['status'] = ratio <= 0.30 ? 'good' : ratio <= 0.50 ? 'caution' : 'high';
  // THE SHARE AT FULL PRECISION, rounded once where it is shown (2026-10-25, FIX-BILLS; his DEC-0264 / Q49). It was rounded to
  // three decimals here: $300.10 of $1,000 read 30.00% beside "caution" (a caution starts above 30%), and $364.90 read 37%.
  return { ratio, status };
}

/** The word for a credit score: Excellent from 800, Very good from 740, Good from 670, Fair from 580 and Poor below that. */
/* ─ MK-CF-F-032 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * creditScoreBand
 *
 * Answers ..... The word for a credit score: Excellent from 800, Very good from 740, Good from 670, Fair from 580 and Poor below that.
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

/** Monthly debt payments as a share of gross monthly income, judged against a guideline of 36% for a homeowner and 20% for anyone else. */
/* ─ MK-CF-F-033 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * debtToIncome
 *
 * Answers ..... Monthly debt payments as a share of gross monthly income, judged against a guideline of 36% for a homeowner and 20% for anyone else.
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
 *     ratio = ratio
 *     monthly debt = monthly debt
 *     gross monthly = gross monthly
 *     guideline = guideline
 *     status = status
 *
 * Called by ... MK-CF-F-295 debtLoad · MK-CF-F-296 LOAD
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-296 LOAD · MK-CF-F-295 debtLoad
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-033
 * Changed ..... 2026-06-07 (766aee3)
 */
export function debtToIncome(monthlyDebt: number, grossMonthly: number, homeowner = false): DTI {
  const ratio = grossMonthly > 0 ? monthlyDebt / grossMonthly : 0;
  const guideline = homeowner ? 0.36 : 0.20;   // CFPB: renters 15–20%, homeowners ≤36% (incl. mortgage)
  const status: DTI['status'] = ratio <= guideline ? 'good' : ratio <= guideline * 1.4 ? 'caution' : 'high';
  // full precision, rounded once where it is shown (2026-10-25, FIX-BILLS; DEC-0264 / Q49): $2,731.17 of $6,111.43 is 0.44690…,
  // not 0.447. The debt it is handed is the MINIMUM the debts oblige (minimumDebtService) — DEC-0641 "the minimum stays … for
  // debt-to-income" — never what someone chooses to pay
  return { ratio, monthlyDebt: (monthlyDebt), grossMonthly: (grossMonthly), guideline, status };
}

// ── Debt-payoff plan (avalanche = highest APR first; snowball = smallest balance first) ──
export type PayoffMethod = 'avalanche' | 'snowball';
export interface PayoffResult {
  months: number;                 // months to debt-free (0 = already free). When it never clears or is still owed at the walk's
                                  // end, the month the walk stopped — never a payoff month: read neverPaysOff and pastHorizon first
  totalInterest: number;          // interest paid over the plan (when it never clears: until the walk stopped)
  neverPaysOff: boolean;          // PROVEN: the payments can never get ahead of the interest
  pastHorizon: boolean;           // still owed after PAYOFF_HORIZON_MONTHS of payments that do get ahead — not "never"
  stillOwed: number;              // what is still owed when the walk stops; 0 when everything clears
  order: { debt_id: EntityId; label: string; payoffMonth: number; interestPaid: number }[];
  /** NO PLAN FROM WHAT WAS NEVER ENTERED (2026-10-25, FIX-MONTH; tenet 3, DEC-0296): each debt still owed whose payment or rate
   *  was never entered. When any is, the walk is not run — months, interest and what is still owed are not numbers, neverPaysOff
   *  and pastHorizon are false — and a screen says which is missing. Empty when the plan was calculated. */
  notEntered: { debt_id: EntityId; label: string; what: ('payment' | 'rate')[] }[];
}
/** How far the payoff walk goes: 12,000 months, a thousand years. Still owed then, and shrinking, is "past the horizon" with what
 *  is still owed — never "never" (2026-10-25, FIX-BILLS: an iteration cap is not an answer). */
export const PAYOFF_HORIZON_MONTHS = 12_000;
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
 *     never pays off ONLY when proven: once every payment has started, the budget is no more than
 *         what the highest-rate debts earn at the lowest of their rates (what they owe can never fall)
 *     walks at most 12,000 months; still owed then and falling = past the horizon, with what is still owed
 *
 * Called by ... MK-CF-F-296 LOAD · MK-CF-O-018 theDebts
 *               MK-PL-F-036 weighGoals · MK-PL-F-101 debtGoalPlan
 *
 * Reaches ..... 15 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-296 LOAD
 *               MK-PL-F-101 debtGoalPlan · MK-CF-F-295 debtLoad
 *               MK-CF-F-315 debtsEntered · MK-CF-F-314 setupEntered
 *               MK-CF-F-305 setupLoanDebts · MK-CF-F-302 setupLoanSentences
 *               MK-CF-F-304 setupLoansAll · MK-CF-F-303 setupLoansNotEntered
 *               MK-CF-F-301 setupLoansSplit · MK-CF-F-299 setupStudentLoans
 *               MK-CF-O-018 theDebts · MK-PL-F-037 trimHints
 *               MK-PL-F-036 weighGoals
 *
 * Serves ...... MK-PL-M-031
 * Reads ....... MK-XS-I-014 debt balance
 *               MK-XS-I-015 debt interest rate
 *               MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *               MK-XS-I-053 the month a debt is first paid
 *               MK-XS-I-054 the date a debt is due to be paid off in full
 *
 * Decides .....
 *     · Uses a built-in owed of 0.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Never lets extra monthly fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-034
 * Changed ..... 2026-07-31 (8428ea8)
 */
export function payoffPlan(debts: Debt[], extraMonthly: number, method: PayoffMethod = 'avalanche', now: Date = new Date()): PayoffResult {
  // NOTHING IS WORKED OUT FROM WHAT WAS NEVER ENTERED (2026-10-25, FIX-MONTH; tenet 3, DEC-0296; CFR-3, MK-CF-O-018-C03): a payment
  // never entered made the budget not a number and the plan said "never" — the Debts tab printed "never at this rate" and the Goals
  // tab "Minimum payments don't cover the interest" for a payment nobody typed — and a rate never entered was read as 0%.
  const notEntered = (debts ?? []).filter((d) => d.remaining_balance > 0).map((d) => ({ debt_id: d.debt_id, label: d.label,
    what: [...(paymentShape(d) !== 'due_in_full' && !Number.isFinite(Number(requiredPayment(d))) ? ['payment' as const] : []),
      ...(rateNotEntered(d) ? ['rate' as const] : [])] })).filter((x) => x.what.length > 0);
  if (notEntered.length) return { months: NaN, totalInterest: NaN, neverPaysOff: false, pastHorizon: false, stillOwed: NaN, order: [], notEntered };
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
      // THE PLAN PAYS WHAT THE PERSON PAYS (2026-10-25, FIX-MONTH; his DEC-0641, Q53 "what actually leaves"; CFR-5, MK-CF-M-073):
      // each debt at the payment they set, never less than its minimum (requiredPayment, the payment the Debts row and "in payments"
      // print). It ran on the minimums: a $300 payment set on a $200-minimum card and a $250 car loan planned $450/month, Oct 2033
      // and $14,787 of interest, where $550/month clears it Jun 2031 with $7,647.
      return { id: d.debt_id, label: d.label, bal: d.remaining_balance, apr: d.interest_rate_apr, min: requiredPayment(d), interest: 0, payoffMonth: 0, startAfter };
    });
  const lumpMonths = lumps.reduce((m, l) => Math.max(m, l.payoffMonth), 0);
  const lumpInterest = (lumps.reduce((t, l) => t + l.interestPaid, 0));
  if (!live.length) return { months: lumpMonths, totalInterest: lumpInterest, neverPaysOff: false, pastHorizon: false, stillOwed: 0, order: lumps.sort((a, b) => a.payoffMonth - b.payoffMonth), notEntered: [] };
  // budget grows as deferred debts come due (their minimum joins when payments start)
  const budgetAt = (month: number) => live.concat(cleared).reduce((t, d) => t + (month > d.startAfter ? d.min : 0), 0) + Math.max(0, extraMonthly);
  const cleared: typeof live = [];
  const lastStart = live.reduce((m, d) => Math.max(m, d.startAfter), 0);
  let month = 0, never = false;
  // NEVER IS PROVEN, NEVER ASSUMED FROM A STOP (2026-10-25, FIX-BILLS; DEC-3523 tenet 1). The walk stopped at 600 months and called
  // whatever was still owed "never": $60,100 at 0% with $100/month clears in month 601, and $100,000 at 6% with $501 in month
  // 1,247, yet both read "never at this rate" and "your balance grows faster than you pay it down" while the balance fell every month.
  while (live.length && month < PAYOFF_HORIZON_MONTHS) {
    month++;
    for (const d of live) { const i = (d.bal * d.apr) / 12; d.bal += i; d.interest += i; }            // accrue interest
    let pool = budgetAt(month);
    for (const d of live) { if (month <= d.startAfter) continue; const pay = Math.min(d.min, d.bal, pool); d.bal -= pay; pool -= pay; }     // pay minimums (deferred debts wait)
    const priority = [...live].filter((d) => d.bal > 0 && month > d.startAfter).sort((a, b) => (method === 'avalanche' ? b.apr - a.apr : a.bal - b.bal));
    for (const d of priority) { if (pool <= 0) break; const pay = Math.min(pool, d.bal); d.bal -= pay; pool -= pay; }   // extra to priority
    for (let j = live.length - 1; j >= 0; j--) { if (live[j].bal <= 0.01) { live[j].payoffMonth = month; cleared.push(live[j]); live.splice(j, 1); } }
    // Once every payment has started, the monthly budget is fixed. Take the debts with the highest rates, one more at a time: when
    // the budget is no more than what those debts earn at the LOWEST of their rates, what they owe together can never fall again,
    // so they never clear. (A payment or a rate never entered no longer reaches the walk: the plan refuses above, 2026-10-25.)
    if (live.length && month >= lastStart) {
      const pay = budgetAt(month + 1);
      const byRate = [...live].sort((a, b) => b.apr - a.apr);
      let owed = 0;
      for (const d of byRate) { owed += d.bal; if (!(pay > (owed * d.apr) / 12)) { never = true; break; } }
      if (never) break;
    }
  }
  const pastHorizon = !never && live.length > 0;
  const all = [...cleared, ...live];
  return {
    months: live.length ? month : Math.max(month, lumpMonths),
    totalInterest: (all.reduce((t, d) => t + d.interest, 0) + lumpInterest),
    neverPaysOff: never,
    pastHorizon,
    stillOwed: live.reduce((t, d) => t + d.bal, 0),
    order: cleared.map((d) => ({ debt_id: d.id, label: d.label, payoffMonth: d.payoffMonth, interestPaid: (d.interest) }))
      .concat(lumps).sort((a, b) => a.payoffMonth - b.payoffMonth),
    notEntered: [],
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
 *  source of truth for "high-interest / toxic" debt across the debt module, Net worth, and Insights. */
export const TOXIC_APR = 0.07;

/* ─ MK-CF-F-036 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * buildDebtState
 *
 * Answers ..... What is the whole debt picture?
 *
 * Formula .....
 *     total debt balance = Σ over the debts whose balance is known of (remaining balance)   — a debt with no balance is left out (totalDebtBalance)
 *     toxic debt         = Σ over debts whose yearly rate is above 7% of (remaining balance)
 *     highest rate debt  = the debt with the largest rate (the first of equals)
 *     minimum a month    = minimum debt service · actual payment a month = actual debt payment
 *
 * Called by ... MK-CF-F-041 getDebtState · MK-NW-O-003 theNetWorth
 *               MK-XS-F-031 buildSnapshot
 *
 * Reaches ..... 568 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 550 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-014 debt balance
 *               MK-XS-I-015 debt interest rate
 *
 * Decides .....
 *     · If remaining balance is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-036
 * Changed ..... 2026-06-22 (b8657c4)
 */
export function buildDebtState(uid: UserId, debts: Debt[]): DebtState {
  // the sum of KNOWN debts (DEC-3279e, MK-NW-F-065: "Net worth counts the debts that are known"): one debt
  // with no balance made this NaN, and the Net worth hero printed "Owe No debts entered." with a sentence
  // where its figure belongs (mock-match audit, 2026-10-11). The one canonical sum is totalDebtBalance.
  const total = totalDebtBalance(debts);
  const highest = debts.length ? debts.reduce((m, d) => (d.interest_rate_apr > m.interest_rate_apr ? d : m)) : null;
  const toxic = debts.filter((d) => d.interest_rate_apr > TOXIC_APR).reduce((t, d) => t + (d.remaining_balance || 0), 0);
  return {
    user_id: uid, total_debt_balance: (total),
    total_monthly_debt_service: minimumDebtService(debts),   // DTI obligation (Σ minimum)
    total_actual_payment: actualDebtPayment(debts),          // cash-flow outflow (override-aware)
    debts, highest_rate_debt: highest, toxic_debt_balance: (toxic),
  };
}

/** B-30: infer the debt type from its name so a "Mortgage" is treated as a mortgage (homeowner DTI
 *  guideline), not lumped into OTHER (renter guideline). */

/** The kind of debt, judged from its name: a home-equity credit line, a mortgage, a car loan, a student loan, a credit card, a medical debt, a personal loan or something else. */
/* ─ MK-CF-F-037 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * inferDebtType
 *
 * Answers ..... The kind of debt, judged from its name: a home-equity credit line, a mortgage, a car loan, a student loan, a credit card, a medical debt, a personal loan or something else.
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
 * Called by ... MK-CF-F-038 debtsFromOnboarding · MK-CF-F-304 setupLoansAll
 *
 * Reaches ..... 15 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-296 LOAD · MK-CF-F-295 debtLoad
 *               MK-CF-F-315 debtsEntered · MK-CF-F-038 debtsFromOnboarding
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-033 resolveNetWorthRows
 *               MK-CF-F-314 setupEntered · MK-CF-F-305 setupLoanDebts
 *               MK-CF-F-302 setupLoanSentences · MK-CF-F-304 setupLoansAll
 *               MK-CF-F-303 setupLoansNotEntered · MK-CF-F-301 setupLoansSplit
 *               MK-CF-F-299 setupStudentLoans · MK-XS-F-032 snapshotFromOnboarding
 *               MK-XS-F-192 typedValueDatedBack
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

/** What it is for: THE STUDENT LOANS ENTERED IN SETUP ARE A DEBT (2026-11-01, FX-CF-A; the lead's ruling R22, one debt total): what
 *  they come to, so every total of what is owed counts them once — the Debts tab's YOUR DEBT, and Net worth's debts beside it. Each
 *  loan's amount as entered ("How much (this disbursement)"), added up; a loan with no amount adds nothing. Worked by hand: one
 *  $30,000 loan → $30,000 owed, 1 loan. */
/* ─ MK-CF-F-299 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * setupStudentLoans
 *
 * Answers ..... What it is for: THE STUDENT LOANS ENTERED IN SETUP ARE A DEBT (2026-11-01, FX-CF-A; the lead's ruling R22, one debt total): what they come to, so every total of what is owed counts them once — the Debts tab's YOUR DEBT, and Net worth's debts beside it.
 *
 * Formula .....
 *     owed = 0, count = 0
 *     the answer = { owed, count }
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-299
 * Changed ..... not in git yet (—)
 */
export function setupStudentLoans(op: Record<string, any> | null | undefined, debts?: Debt[] | null, today: Date = new Date()): { owed: number; count: number } {
  // handed the debts entered, it counts only the setup loans none of them is (2026-11-01, FX-NW, R22: every dollar once)
  let owed = 0, count = 0;
  for (const l of setupLoansNotEntered(op, debts ?? [], today)) { owed += l.amount; count += 1; }   // owed today only (R22a)
  return { owed, count };
}

/** A STUDENT LOAN ENTERED IN SETUP, WHICH NO DEBT ENTERED IS (2026-11-01, FX-NW; the lead's ruling R22 — every dollar is counted once).
 *  A setup loan is the same loan as a debt entered when (1) the debt was saved from that loan's row (its setup_loan names the loan's
 *  place in the list), or else (2) the debt is a student loan (its kind, or a name that reads as one) with the same name — letters and
 *  digits, any case — or the same amount to the dollar. Each debt is matched to one setup loan at most, in the setup list's order.
 *  Worked by hand: setup loans [Student loan $30,000], debts [Visa $3,200, Car loan $9,800] → the $30,000 loan, not entered; add a
 *  debt 'Student loan', STUDENT_LOAN, $30,000 → nothing left (it is that debt). */
export interface SetupLoan { index: number; label: string; amount: number; aprPct: number | null; termYears: number | null;
  /** its first month paid out, 'YYYY-MM', or null when no month (or no year) was entered (R22a) */
  startsOn: string | null }
const MONTH3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** A setup loan's first month paid out: the earliest of its months in its year, 'YYYY-MM'; null when either is not entered. */
/* ─ MK-CF-F-300 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * loanStartsOn
 *
 * Answers ..... A setup loan's first month paid out: the earliest of its months in its year, 'YYYY-MM'; null when either is not entered.
 *
 * Formula .....
 *     months = for each of months   if array.is array(months)
 *     []   otherwise: number where m ≥ 1 and m ≤ 12
 *     year = parse int(string(year ?? ''), 10)
 *     nothing   when count of months is missing (or not (year > 1900) when missing or zero)
 *     the answer = `${year}-${string(math.min(...months)).pad start(2, '0')}`
 *
 * Called by ... MK-CF-F-304 setupLoansAll
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-296 LOAD · MK-CF-F-295 debtLoad
 *               MK-CF-F-315 debtsEntered · MK-CF-F-314 setupEntered
 *               MK-CF-F-305 setupLoanDebts · MK-CF-F-302 setupLoanSentences
 *               MK-CF-F-304 setupLoansAll · MK-CF-F-303 setupLoansNotEntered
 *               MK-CF-F-301 setupLoansSplit · MK-CF-F-299 setupStudentLoans
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-300
 * Changed ..... not in git yet (—)
 */
function loanStartsOn(l: any): string | null {
  const months = (Array.isArray(l?.months) ? l.months : []).map(Number).filter((m: number) => m >= 1 && m <= 12);
  const year = parseInt(String(l?.year ?? ''), 10);
  if (!months.length || !(year > 1900)) return null;
  return `${year}-${String(Math.min(...months)).padStart(2, '0')}`;
}
/** The setup loans no debt entered is, of which: OWED TODAY — first paid out this month or before, or with no start month entered —
 *  and LATER — first paid out in a month still ahead, not owed yet (the lead's ruling R22a, 2026-11-01: nothing is owed before the
 *  money is lent). Worked by hand on Nov 1, 2026: Sep 2027 → later; Sep 2026 → owed; Nov 2026 → owed (its month has arrived). */
/* ─ MK-CF-F-301 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * setupLoansSplit
 *
 * Answers ..... The setup loans no debt entered is, of which: OWED TODAY — first paid out this month or before, or with no start month entered — and LATER — first paid out in a month still ahead, not owed yet (the lead's ruling R22a, 2026-11-01: nothing is owed before the money is lent).
 *
 * Formula .....
 *     now = `${today.get full year()}-${string(today.get month() + 1).pad start(2, '0')}`
 *     all = setup loans all(op, debts)
 *     the answer:
 *     owed = all where starts on = nothing (or starts on ≤ now when missing or zero)
 *     later = all where starts on ≠ nothing and starts on > now
 *
 * Called by ... MK-CF-F-295 debtLoad · MK-CF-F-302 setupLoanSentences
 *               MK-CF-F-303 setupLoansNotEntered · MK-CF-F-315 debtsEntered
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-296 LOAD · MK-CF-F-295 debtLoad
 *               MK-CF-F-315 debtsEntered · MK-CF-F-314 setupEntered
 *               MK-CF-F-305 setupLoanDebts · MK-CF-F-302 setupLoanSentences
 *               MK-CF-F-303 setupLoansNotEntered · MK-CF-F-299 setupStudentLoans
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-301
 * Changed ..... not in git yet (—)
 */
export function setupLoansSplit(op: Record<string, any> | null | undefined, debts: Debt[], today: Date = new Date()): { owed: SetupLoan[]; later: SetupLoan[] } {
  const now = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const all = setupLoansAll(op, debts);
  return { owed: all.filter((l) => l.startsOn == null || l.startsOn <= now), later: all.filter((l) => l.startsOn != null && l.startsOn > now) };
}
/** What the screens say about the setup loans (R22a), one sentence each, the same on Net worth and Debts:
 *  a later loan — 'A $30,000 student loan starts in Sep 2027, not counted until then.'; a loan with no start month —
 *  'The $30,000 student loan has no start month entered, so it counts as owed today.' (its own name when it has one). */
/* ─ MK-CF-F-302 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * setupLoanSentences
 *
 * Answers ..... What the screens say about the setup loans (R22a), one sentence each, the same on Net worth and Debts: a later loan — 'A $30,000 student loan starts in Sep 2027, not counted until then.'; a loan with no start month — 'The $30,000 student loan has no start month entered, so it counts as owed today.' (its own name when it has one).
 *
 * Formula .....
 *     named = (l: setup loan) => (label and ! ÷ ^student loan$ ÷ test(label) ? `student loan, ${label},` : 'student loan')
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-302
 * Changed ..... not in git yet (—)
 */
export function setupLoanSentences(op: Record<string, any> | null | undefined, debts: Debt[], printed: (n: number) => string, today: Date = new Date()): string[] {   // printed: the screen's fig() for the amount
  const { owed, later } = setupLoansSplit(op, debts, today);
  const named = (l: SetupLoan) => (l.label && !/^student loan$/i.test(l.label) ? `student loan, ${l.label},` : 'student loan');
  return [
    // the article read off the figure by the one rule (withArticle): 'A $30,000 …', 'An $8,000 …', 'An $11,000 …' (2026-11-01)
    ...later.map((l) => `${capFirst(withArticle(`${printed(l.amount)} ${named(l)}`))} starts in ${MONTH3[Number(l.startsOn!.slice(5)) - 1]} ${l.startsOn!.slice(0, 4)}, not counted until then.`),
    ...owed.filter((l) => l.startsOn == null).map((l) => `The ${printed(l.amount)} ${named(l)} has no start month entered, so it counts as owed today.`),
  ];
}
/** ANY DEBT ENTERED (2026-11-02, FX-NW, CF6-02): a debt entered, or a student loan from setup — owed now or later. The one answer
 *  to "has this person entered a debt?" — Net worth's DEBTS reads it for its 'Nothing entered yet.', and the set-up gate (R26) is to
 *  read it for its debt part. Worked by hand: no debts, one setup loan starting Sep 2027 → true; no debts, no setup loans → false. */
/* ─ MK-CF-F-315 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * debtsEntered
 *
 * Answers ..... ANY DEBT ENTERED (2026-11-02, FX-NW, CF6-02): a debt entered, or a student loan from setup — owed now or later.
 *
 * Formula .....
 *     true   when (debts ?? []).length > 0
 *     owed.length + later.length > 0
 *
 * Called by ... MK-CF-F-314 setupEntered
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-F-314 setupEntered
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-315
 * Changed ..... not in git yet (—)
 */
export function debtsEntered(op: Record<string, any> | null | undefined, debts: Debt[]): boolean {
  if ((debts ?? []).length > 0) return true;
  const { owed, later } = setupLoansSplit(op, debts ?? []);
  return owed.length + later.length > 0;
}
/** owed today, the ones every total counts */
/* ─ MK-CF-F-303 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * setupLoansNotEntered
 *
 * Answers ..... owed today, the ones every total counts
 *
 * Formula .....
 *     setup loans split(op, debts, today).owed
 *
 * Called by ... MK-CF-F-299 setupStudentLoans · MK-CF-F-305 setupLoanDebts
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-305 setupLoanDebts · MK-CF-F-299 setupStudentLoans
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-303
 * Changed ..... not in git yet (—)
 */
export function setupLoansNotEntered(op: Record<string, any> | null | undefined, debts: Debt[], today: Date = new Date()): SetupLoan[] {
  return setupLoansSplit(op, debts, today).owed;
}
/** Every student loan entered in setup that is not already a debt in Debts — matched by the loan it came from, else by a student-loan debt of the same name or the same balance; each with its amount, rate and term when entered, and its first month paid out. */
/* ─ MK-CF-F-304 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * setupLoansAll
 *
 * Answers ..... Every student loan entered in setup that is not already a debt in Debts — matched by the loan it came from, else by a student-loan debt of the same name or the same balance; each with its amount, rate and term when entered, and its first month paid out.
 *
 * Formula .....
 *     list = (array.is array(op.loans) ? op!.loans : []) as any[]
 *     key = (t: unknown) => string(t ?? '').to lower case().replace( ÷ [^a − z0 − 9] ÷ g, '')
 *     used = new set<number>()
 *     out = []
 *     amount = amount read as a number (0 when it is not one)
 *     label = string(label ?? '').trim()
 *     at = debts.find index((d, k) => !used.has(k) and setup loan = index)
 *     apr = to num(apr), term = to num(term years)
 *     the answer = out
 *
 * Called by ... MK-CF-F-301 setupLoansSplit
 *
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-296 LOAD · MK-CF-F-295 debtLoad
 *               MK-CF-F-315 debtsEntered · MK-CF-F-314 setupEntered
 *               MK-CF-F-305 setupLoanDebts · MK-CF-F-302 setupLoanSentences
 *               MK-CF-F-303 setupLoansNotEntered · MK-CF-F-301 setupLoansSplit
 *               MK-CF-F-299 setupStudentLoans
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-014 debt balance
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-304
 * Changed ..... not in git yet (—)
 */
function setupLoansAll(op: Record<string, any> | null | undefined, debts: Debt[]): SetupLoan[] {
  const list = (Array.isArray(op?.loans) ? op!.loans : []) as any[];
  const key = (t: unknown) => String(t ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const used = new Set<number>();
  const out: SetupLoan[] = [];
  list.forEach((l, index) => {
    const amount = toNum(l?.amount);
    if (!(amount > 0)) return;
    const label = String(l?.label ?? '').trim();
    let at = debts.findIndex((d, k) => !used.has(k) && d.setup_loan === index);
    if (at < 0) at = debts.findIndex((d, k) => !used.has(k) && d.setup_loan == null
      && (d.debt_type === 'STUDENT_LOAN' || inferDebtType(d.label) === 'STUDENT_LOAN')
      && ((label !== '' && key(d.label) === key(label)) || (Number.isFinite(d.remaining_balance) && Math.round(d.remaining_balance) === Math.round(amount))));
    if (at >= 0) { used.add(at); return; }
    const apr = toNum(l?.apr), term = toNum(l?.termYears);
    out.push({ index, label, amount, aprPct: apr > 0 ? apr : null, termYears: term > 0 ? term : null, startsOn: loanStartsOn(l) });
  });
  return out;
}

/** THE SETUP LOANS NO DEBT IS, AS DEBTS (2026-11-01, FX-NW, R22): one row each, so Net worth's DEBTS, its total and every screen that
 *  reads Net worth's inputs count them once. Named as entered ('Student loan' when unnamed), the amount as the balance; the rate and the
 *  payment only when setup gave them (the payment worked by loanPayment from the rate and the years), else not entered. */
/* ─ MK-CF-F-305 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * setupLoanDebts
 *
 * Answers ..... THE SETUP LOANS NO DEBT IS, AS DEBTS (2026-11-01, FX-NW, R22): one row each, so Net worth's DEBTS, its total and every screen that reads Net worth's inputs count them once.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-014 debt balance
 *               MK-XS-I-015 debt interest rate
 *               MK-XS-I-016 debt minimum payment
 *               MK-XS-I-042 how a stream is paid — monthly, yearly or one lump
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-305
 * Changed ..... not in git yet (—)
 */
export function setupLoanDebts(op: Record<string, any> | null | undefined, debts: Debt[], today: Date = new Date()): Debt[] {
  return setupLoansNotEntered(op, debts, today).map((l) => ({
    debt_id: `setup-loan-${l.index}`, label: `${l.label || 'Student loan'} (from setup)`, debt_type: 'STUDENT_LOAN',   // one name on every screen (NW6-03, 2026-11-02)
    remaining_balance: l.amount,
    interest_rate_apr: (l.aprPct != null ? l.aprPct / 100 : undefined) as any,
    // THE BALANCE IS OWED, THE PAYMENT IS NOT ASSUMED (2026-11-02, the lead's R22d; DEC-0296): setup never asks when repayment starts,
    // so no monthly payment is counted — it read $325.58 worked from the rate and term (the outlook keeps that, as an estimate)
    minimum_monthly_payment: undefined as any,
    payment_type: 'installment', setup_loan: l.index, repayment_start_unknown: true,
  } as Debt));
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
 * Called by ... MK-CF-F-314 setupEntered · MK-XS-F-032 snapshotFromOnboarding
 *               MK-XS-F-033 resolveNetWorthRows · MK-XS-F-192 typedValueDatedBack
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-033 resolveNetWorthRows
 *               MK-CF-F-314 setupEntered · MK-XS-F-032 snapshotFromOnboarding
 *               MK-XS-F-192 typedValueDatedBack
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

/** Reads a person's saved debts from storage and calculates nothing. */
/* ─ MK-CF-F-039 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * loadDebt
 *
 * Answers ..... Reads a person's saved debts from storage and calculates nothing.
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

/** Saves a person's debts to storage, tells the rest of the app it changed, and calculates nothing. */
/* ─ MK-CF-F-040 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * saveDebt
 *
 * Answers ..... Saves a person's debts to storage, tells the rest of the app it changed, and calculates nothing.
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

/** Reads a person's saved debts and returns their totals, or nothing when none are saved. */
/* ─ MK-CF-F-041 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * getDebtState
 *
 * Answers ..... Reads a person's saved debts and returns their totals, or nothing when none are saved.
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
