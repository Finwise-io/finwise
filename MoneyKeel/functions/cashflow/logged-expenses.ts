/**  READING A LOGGED EXPENSE — the two things every cash-flow screen needs to know about one.
 *
 *  Both of these were written twice, once in this-month.ts and once in expenses.ts, while the two
 *  screens were being built side by side. Two definitions of one rule is how "Outflow (bills + debt)"
 *  came to sit four rows above a total that disagreed with it: nothing forces the copies to move
 *  together, so eventually one does and the other does not. One definition, imported.
 */
import { localDay } from '../../../src/domain/_shared/dates';   // the one reader of a stored day (CF-21)
import { toNum } from '../../../src/domain/_shared/num';

/** One expense the person logged: what it cost, what it was for, and when. */
export interface LoggedExpense { amount: any; category: string; store?: string; date: string;
                                 /** absent = the person typed it; 'imported' = it came from a card
                                  *  or a file. The approved mock draws the two apart. */
                                 origin?: 'imported';
                                 /** A DEBT PAYMENT names the debt it was paid on, by the debt's own id (2026-10-25, FIX-MONTH; DEC-1923):
                                  *  "Log a payment" writes it. Payments logged before then carry only the debt's name, in `store`. */
                                 debtId?: string; }

/** The category a logged expense carries when it IS a debt payment rather than expenses.
 *  It must match what the debt screens write, or a payment is counted twice — once as a debt
 *  payment and once as an expense. */
export const DEBT_CATEGORY = 'Debt payment';

/** Does this logged expense fall in the month `ym` ("2026-08")? The expense's own day, read where the person is
 *  (localDay, 2026-10-25 — CF-21): a calendar day is that day, and an instant an older build wrote ("…T01:30:00.000Z")
 *  is the day it was on the person's clock, so a purchase on the evening of Aug 31 in California is August's. */
/* ─ MK-CF-F-148 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * inMonth
 *
 * Answers ..... Does this logged expense fall in the month `ym` ("2026-08")?
 *
 * Formula .....
 *     the answer = true when the expense date starts with the month text 'YYYY-MM'
 *
 * Called by ... MK-CF-F-005 actualMonthFlow · MK-CF-F-146 payFiguresAgree
 *               MK-CF-F-151 actualSpending · MK-CF-F-220 pastMonthFlow
 *               MK-CF-F-231 addedAfterRecord · MK-CF-F-251 debtPaymentsMatched
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
 * Formula also on the master file · functions_from_code · MK-CF-F-148
 * Changed ..... not in git yet (—)
 */
export const inMonth = (e: LoggedExpense, ym: string): boolean =>
  localDay(e.date).startsWith(ym);

/** What it is for: WHICH DEBT EACH LOGGED DEBT PAYMENT WAS PAID ON, in one month — matched by the debt itself, never guessed from
 *  a name (2026-10-25, FIX-MONTH; his rule DEC-1923, "on the actual side nothing is assumed paid"; CFR-2 and CFR-4, MK-CF-F-157-C05
 *  and MK-CF-F-150-C05). A payment "Log a payment" wrote names its debt by id. One logged before then names it only by the debt's
 *  name: that is the debt's when exactly one debt has that name (trimmed, any case); when two or more do, it is given to NONE of
 *  them and is listed as shared, once, with the name it was logged under; when none does (a debt since deleted), it is unmatched.
 *  Every payment lands in exactly one of the three, so nothing is counted twice and nothing is dropped. The one reader for This
 *  month's actual block (MK-CF-F-157), the Expenses tab's debt payments counted as expenses (MK-CF-F-150) and the radar (MK-CF-F-153).
 *  Example: debts A "Loan" and B " loan ", $250 logged to "Loan" with no id → byDebt {}, shared [{ name 'Loan', amount 250, debtIds
 *  [A, B] }], unmatched 0. The same $250 logged with debtId B → byDebt { B: 250 }. */
/* ─ MK-CF-F-251 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * debtPaymentsMatched
 *
 * Answers ..... What it is for: WHICH DEBT EACH LOGGED DEBT PAYMENT WAS PAID ON, in one month — matched by the debt itself, never guessed from a name (2026-10-25, FIX-MONTH; his rule DEC-1923, "on the actual side nothing is assumed paid"; CFR-2 and CFR-4, MK-CF-F-157-C05 and MK-CF-F-150-C05).
 *
 * Formula .....
 *     list = debts (or none when missing)
 *     key = (s: unknown) => string(s ?? '').trim().to lower case()
 *     by debt = new map<string, number>()
 *     shared = new map<string, { name: string; amount: number; debt ids: string[] }>()
 *     unmatched = 0
 *     amount = amount read as a number (0 when it is not one)
 *     d = list.find((x) => string(debt id) = string(debt id))
 *     named = list where key(label) = key(store)
 *     k = key(store)
 *     s = shared.get(k) (or name = string(store ?? '').trim()
 *     amount = 0
 *     debt ids = for each of named: string(debt id) when missing)
 *     the answer:
 *     by debt = by debt
 *     shared = [...shared.values()]
 *     unmatched = unmatched
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-005 actualMonthFlow · MK-CF-F-150 debtPaymentsCountedAsExpenses
 *               MK-CF-F-153 radar · MK-CF-F-157 debtPaymentsByDebt
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
 * Reads ....... MK-XS-I-024 logged expenses
 *               MK-XS-I-078 the debt a logged debt payment was paid on
 *
 * Decides .....
 *     · Uses a built-in unmatched of 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-251
 * Changed ..... not in git yet (—)
 */
export function debtPaymentsMatched(debts: { debt_id: string; label: string }[] | null | undefined, expenses: LoggedExpense[] | null | undefined, ym: string): {
  byDebt: Map<string, number>; shared: { name: string; amount: number; debtIds: string[] }[]; unmatched: number;
} {
  const list = debts ?? [];
  const key = (s: unknown) => String(s ?? '').trim().toLowerCase();
  const byDebt = new Map<string, number>();
  const shared = new Map<string, { name: string; amount: number; debtIds: string[] }>();
  let unmatched = 0;
  for (const e of (expenses ?? [])) {
    if (e.category !== DEBT_CATEGORY || !inMonth(e, ym)) continue;
    const amount = toNum(e.amount);
    if (e.debtId != null && String(e.debtId) !== '') {
      const d = list.find((x) => String(x.debt_id) === String(e.debtId));
      if (d) byDebt.set(String(d.debt_id), (byDebt.get(String(d.debt_id)) ?? 0) + amount);
      else unmatched += amount;                                   // paid on a debt no longer held
      continue;
    }
    const named = list.filter((x) => key(x.label) === key(e.store));
    if (named.length === 1) byDebt.set(String(named[0].debt_id), (byDebt.get(String(named[0].debt_id)) ?? 0) + amount);
    else if (named.length === 0) unmatched += amount;
    else {
      const k = key(e.store);
      const s = shared.get(k) ?? { name: String(e.store ?? '').trim(), amount: 0, debtIds: named.map((x) => String(x.debt_id)) };
      s.amount += amount;
      shared.set(k, s);
    }
  }
  return { byDebt, shared: [...shared.values()], unmatched };
}
