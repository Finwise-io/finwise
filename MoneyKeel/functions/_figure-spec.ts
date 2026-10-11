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

import { plural } from '../../src/domain/_shared/plural';   // the one list of words and plurals (DEC-4082, 2026-10-10)
import { formatMoney, formatMoneyCents, moneyCompact } from '../../src/domain/_shared/money';

/** How a figure is written down. Drives the rounding, so the precision standard (Q49, 2026-09-09) is
 *  applied by the declaration rather than remembered at each of 242 places that print one. */
export type FigureUnit =
  | 'money'         // whole dollars — totals, balances, projections
  | 'money-compact' // $2.43MM / $182K — only where a figure shares a line with several others
  | 'money-cents'   // two decimals — prices, per-share figures, a logged expense
  | 'percent'       // a rate held as 0…1, shown as whole percent
  | 'percent-2dp'   // a rate shown to two decimals — returns and yields
  | 'percent-signed' // a return: its sign always written, two decimals — +16.24%, −0.57%
  | 'count'         // a plain number of things
  | 'months'        // a number of months
  | 'age'           // a number of years of age
  | 'date'          // a date, already written out
  | 'words';        // a sentence the function composed


/** WRITE A FIGURE THE WAY THE SCREEN WRITES IT — one writer, two callers (2026-09-28).
 *
 *  It lived inside `src/components/figure.ts`, which reads the store and so can only be called from a
 *  render. A door's worked example needs the SAME writer — an example whose answer is formatted by a
 *  second copy of the rounding proves nothing about what a person sees. So the writing moved here,
 *  where it needs nothing but the declaration, and `fig()` now calls it too. The precision standard
 *  (Q49) is applied in ONE place; masking stays at the component, which is where the store is.
 */
/* ─ MK-XS-F-183 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * writeFigure
 *
 * Answers ..... WRITE A FIGURE THE WAY THE SCREEN WRITES IT — one writer, two callers (2026-09-28).
 *
 * Formula .....
 *     spec.refusal   when value = nothing (or !number.is finite(value) when missing or zero)
 *     body + (opts.spoken ? ` a ${spec.per}` : ` ÷ ${spec.per}`)   when opts.with period and spec.per
 *     body
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · Rounds the answer to 1 decimal place.
 *     · Shows 2 decimal places.
 *     · Shows 1 decimal place.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-183
 * Changed ..... not in git yet (—)
 */
export function writeFigure(spec: FigureSpec, value: number | null, opts?: { spoken?: boolean; withPeriod?: boolean }): string {
  if (value == null || !Number.isFinite(value)) return spec.refusal;
  const body =
    spec.unit === 'money' ? formatMoney(value)
    : spec.unit === 'money-compact' ? moneyCompact(value, 'MM')
    : spec.unit === 'money-cents' ? formatMoneyCents(value)
    : spec.unit === 'percent' ? `${Math.round(value * 100)}%`
    : spec.unit === 'percent-2dp' ? `${(value * 100).toFixed(2)}%`
    : spec.unit === 'percent-signed' ? `${value < 0 ? '−' : '+'}${Math.abs(value * 100).toFixed(2)}%`
    : spec.unit === 'months' ? plural(value, 'month', (Math.round(value * 10) / 10).toFixed(1))
    : spec.unit === 'age' ? `${value}`
    : `${value}`;
  if (opts?.withPeriod && spec.per) return body + (opts.spoken ? ` a ${spec.per}` : `/${spec.per}`);
  return body;
}

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
  /** THE WORKED EXAMPLE (six steps, step 6 — 2026-09-28). One concrete case in plain English, with
   *  the numbers, that a person can follow by hand: what goes in, and what this figure comes to.
   *  It is not decoration and it is not a comment — `src/__tests__/worked_examples.test.ts` RUNS it
   *  through the real orchestrator and fails when the answer here and the answer the code gives
   *  differ. That is what earns the sentence the objectives standard asks for: *file and code are
   *  both updated and they match 100%*. Before this, no figure on the master carried one. */
  worked?: {
    /** The case, in plain English with its numbers, as it is printed on the master file's row. */
    given: string;
    /** What this figure comes to — written EXACTLY as the screen writes it, down to the $ and the
     *  decimal places. It is checked character for character against what `run` returns. */
    answer: string;
    /** THE SAME CASE, AS THE CODE SEES IT. It builds those inputs, calls the REAL orchestrator — not
     *  a helper beside it, not a copy of the arithmetic — and hands back the raw figure. The test
     *  writes it with THIS declaration's own unit, through `writeFigure`, which is the writer the
     *  screen itself prints through, and asserts the result equals `answer` character for character.
     *  So nothing here re-states the rounding, and the example a person reads on the master file
     *  cannot drift from the answer the code gives without the build going red.
     *
     *  A `words` figure is a sentence the function composed, so there it returns the sentence. */
    run: () => number | string | null;
  };

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
 * Called by ... MK-CF-F-199 ROOM · MK-CF-F-200 LINE
 *               MK-CF-F-202 TAX · MK-CF-F-204 line
 *               MK-CF-F-210 annualOfSource · MK-CF-F-211 DEBTS
 *               MK-CF-F-212 receivedInMonth · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-CF-O-015 workedLineAmount · MK-CF-O-017 futurePaycheck
 *               MK-NW-F-075 ACC · MK-NW-F-076 ALT
 *               MK-NW-F-078 ONE · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-NW-F-081 LB
 *               MK-NW-F-088 BENCH · MK-NW-F-101 PLAN
 *
 * Reaches ..... 85 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-076 ALT
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-081 LB · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-NW-F-078 ONE · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               … and 67 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-180
 * Changed ..... not in git yet (—)
 */
export function declareFigures<T extends FigureDeclaration>(f: T): T { return f; }
