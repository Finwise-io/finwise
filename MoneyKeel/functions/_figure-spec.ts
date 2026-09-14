/** WHAT A FIGURE IS — founder rule 11, 2026-09-14.
 *
 *  "Make a figure a named thing in the code, and generate the row from it."
 *
 *  Before this, the master file's 164 figure rows were four hand-typed lists inside the builder, and
 *  the link from a figure to the function behind it was a human judgement that went stale every time
 *  a screen changed. That is where every mismatch we chased for two months lived.
 *
 *  From here a door DECLARES each figure it hands out, beside the code that computes it, and this is
 *  what a declaration holds: everything the master file's row needs, so the row is PRINTED from the
 *  code rather than typed beside it. A screen prints a figure only through `fig(identifier, value)`,
 *  so the place that prints carries the identifier too.
 *
 *  The founder still approves a figure's row before its door is built (step 1 of the six steps). What
 *  changes is that after he approves it, the row lives in one place — here — so the file and the code
 *  cannot disagree; the file is a printout of the code.
 */

/** How a figure is written down. Drives the rounding, so the precision standard (Q49, 2026-09-09) is
 *  applied by the declaration rather than remembered at each of 242 places that print one. */
export type FigureUnit =
  | 'money'         // whole dollars — totals, balances, projections
  | 'money-cents'   // two decimals — prices, per-share figures, a logged expense
  | 'percent'       // a rate held as 0…1, shown as whole percent
  | 'percent-2dp'   // a rate shown to two decimals — returns and yields
  | 'count'         // a plain number of things
  | 'months'        // a number of months
  | 'age'           // a number of years of age
  | 'date'          // a date, already written out
  | 'words';        // a sentence the function composed

export interface FigureSpec {
  /** The words a person reads beside it, exactly as the screen says them. */
  label: string;
  unit: FigureUnit;
  /** Appended after the number: "/month" or "/year". The canon’s form (cluster 14), never an abbreviation. */
  per?: 'month' | 'year' | null;
  /** The routes it appears on. A figure shown on three screens is ONE figure (rule 1). */
  screens: string[];
  /** What it answers, in a sentence a person could check. */
  answers: string;
  /** The formula in plain English, followable by hand. */
  formula: string;
  /** The inputs it rests on, by identifier. */
  inputs: string[];
  /** One figure per WHAT — a household, a person, an account, a month. Defaults to the household. */
  grain?: string;
  /** The decisions and assumptions applied on the way, by identifier or in words. */
  decisions?: string[];
  /** What the screen says when it cannot be computed — never a wrong number, never a bare dash. */
  refusal: string;
  /** Anything a reader of the row would otherwise ask. */
  note?: string;
  /** The date the founder ruled on this row. Absent means DRAFT: the figure is declared and printed,
   *  and its row on the master says it is still waiting for his verdict (rule 10 — the row before the
   *  code). Nothing about the screen changes when he rules; the row's status does. */
  ruled?: string;
}

/** A door's figure declaration. Keyed by identifier — `'MK-CF-M-030': { … }`. */
export type FigureDeclaration = Record<string, FigureSpec>;

/** Declare the figures a door hands out. Returns them unchanged; it exists so the keys keep their
 *  literal types, which is what lets `fig()` refuse an identifier that was never declared. */
/* ─ MK-XS-F-180 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * declareFigures
 *
 * Answers ..... Declare the figures a door hands out.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-CF-F-157 debtPaymentsByDebt · MK-CF-F-171 earnerPay
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-005 actualMonthFlow · MK-CF-O-001 basePay
 *               MK-CF-F-157 debtPaymentsByDebt · MK-CF-F-171 earnerPay
 *               MK-CF-O-004 incomeSummary · MK-CF-O-003 thisMonth
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-180
 * Changed ..... not in git yet (—)
 */
export function declareFigures<T extends FigureDeclaration>(f: T): T { return f; }
