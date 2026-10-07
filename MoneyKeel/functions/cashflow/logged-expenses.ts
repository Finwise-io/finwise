/**  READING A LOGGED EXPENSE — the two things every cash-flow screen needs to know about one.
 *
 *  Both of these were written twice, once in this-month.ts and once in expenses.ts, while the two
 *  screens were being built side by side. Two definitions of one rule is how "Outflow (bills + debt)"
 *  came to sit four rows above a total that disagreed with it: nothing forces the copies to move
 *  together, so eventually one does and the other does not. One definition, imported.
 */
/** One expense the person logged: what it cost, what it was for, and when. */
export interface LoggedExpense { amount: any; category: string; store?: string; date: string;
                                 /** absent = the person typed it; 'imported' = it came from a card
                                  *  or a file. The approved mock draws the two apart. */
                                 origin?: 'imported'; }

/** The category a logged expense carries when it IS a debt payment rather than expenses.
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
 *     the answer = true when the expense date starts with the month text 'YYYY-MM'
 *
 * Called by ... MK-CF-F-005 actualMonthFlow · MK-CF-F-150 debtPaymentsCountedAsExpenses
 *               MK-CF-F-151 actualSpending · MK-CF-F-153 radar
 *               MK-CF-F-157 debtPaymentsByDebt
 *
 * Reaches ..... 127 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               MK-NW-F-093 QUIET_PERF · MK-CF-F-207 SOURCE
 *               … and 109 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-148
 * Changed ..... not in git yet (—)
 */
export const inMonth = (e: LoggedExpense, ym: string): boolean =>
  String(e.date ?? '').startsWith(ym);
