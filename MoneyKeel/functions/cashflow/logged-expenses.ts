/**  READING A LOGGED EXPENSE — the two things every cash-flow screen needs to know about one.
 *
 *  Both of these were written twice, once in this-month.ts and once in spending.ts, while the two
 *  screens were being built side by side. Two definitions of one rule is how "Out (bills + debt)"
 *  came to sit four rows above a total that disagreed with it: nothing forces the copies to move
 *  together, so eventually one does and the other does not. One definition, imported.
 */
/** One expense the person logged: what it cost, what it was for, and when. */
export interface LoggedExpense { amount: any; category: string; store?: string; date: string; }

/** The category a logged expense carries when it IS a debt payment rather than spending.
 *  It must match what the debt screens write, or a payment is counted twice — once as a debt
 *  payment and once as an expense. */
export const DEBT_CATEGORY = 'Debt payment';

/** Does this logged expense fall in the month `ym` ("2026-08")? Dates are stored as ISO strings,
 *  so the month is the first seven characters — no Date object, no timezone to get wrong. */
/* ─ MK-CF-F-148 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * inMonth
 *
 * Answers ..... Does this logged expense fall in the month `ym` ("2026-08")?
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-CF-F-005 actualMonthFlow · MK-CF-F-150 debtPaymentsCountedAsExpenses
 *               MK-CF-F-151 actualSpending · MK-CF-F-153 radar
 *               MK-CF-F-157 debtPaymentsByDebt
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-005 actualMonthFlow · MK-CF-F-151 actualSpending
 *               MK-CF-F-157 debtPaymentsByDebt · MK-CF-F-150 debtPaymentsCountedAsExpenses
 *               MK-CF-F-153 radar · MK-CF-O-002 spending
 *               MK-CF-O-003 thisMonth
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-148
 * Changed ..... not in git yet (—)
 */
export const inMonth = (e: LoggedExpense, ym: string): boolean =>
  String(e.date ?? '').startsWith(ym);
