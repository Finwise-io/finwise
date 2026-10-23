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


/** A RATE HELD AS 0…1, WRITTEN AS A PERCENT TO TWO DECIMALS, rounded half away from zero (2026-10-19, DEC-6212). The
 *  binary noise past the twelfth figure is cleared first: $85 of interest on $4,000 is exactly 2.125%, which the computer
 *  holds as 2.1249999…, and toFixed wrote it +2.12% where the precision standard's rounding gives +2.13%. */
/* ─ MK-XS-F-185 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * percentDigits
 *
 * Answers ..... A RATE HELD AS 0…1, WRITTEN AS A PERCENT TO TWO DECIMALS, rounded half away from zero (2026-10-19, DEC-6212).
 *
 * Formula .....
 *     pct = (math.abs(rate) × 100).to precision(12) read as a number
 *     hundredths = round((pct × 100).to precision(12) read as a number)
 *     the answer = `${rate < 0 and hundredths ! = 0 ? '-' : ''}${(hundredths ÷ 100).to fixed(2)}`
 *
 * Called by ... MK-NW-F-163 yardstickName · MK-NW-F-164 gapWords
 *               MK-XS-F-183 writeFigure
 *
 * Reaches ..... 13 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-167 COMPARE
 *               MK-NW-F-140 LEFT_OUT · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-F-144 beforeTheRecordSentence · MK-NW-F-164 gapWords
 *               MK-NW-F-130 notIncludedSentence · MK-NW-O-008 thePerformance
 *               MK-NW-F-105 whyNoReturn · MK-XS-F-183 writeFigure
 *               MK-NW-F-163 yardstickName
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *     · Shows 2 decimal places.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-185
 * Changed ..... not in git yet (—)
 */
export function percentDigits(rate: number): string {
  const pct = Number((Math.abs(rate) * 100).toPrecision(12));
  const hundredths = Math.round(Number((pct * 100).toPrecision(12)));
  return `${rate < 0 && hundredths !== 0 ? '-' : ''}${(hundredths / 100).toFixed(2)}`;
}

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
 *     signed = body.replace( ÷ ^- ÷ , '−')   if spec.unit = 'money' (or spec.unit = 'money − compact' (or spec.unit = 'money − cents' when missing or zero) when missing or zero)
 *     body   otherwise
 *     signed + (opts.spoken ? ` a ${spec.per}` : ` ÷ ${spec.per}`)   when opts.with period and spec.per
 *     the answer = signed
 *
 * Called by ... MK-NW-F-105 whyNoReturn · MK-NW-F-130 notIncludedSentence
 *
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-NW-F-130 notIncludedSentence · MK-NW-O-008 thePerformance
 *               MK-NW-F-105 whyNoReturn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · Rounds the answer to 1 decimal place.
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
    : spec.unit === 'percent-2dp' ? `${percentDigits(value)}%`
    : spec.unit === 'percent-signed' ? `${value < 0 ? '−' : '+'}${percentDigits(Math.abs(value))}%`
    : spec.unit === 'months' ? plural(value, 'month', (Math.round(value * 10) / 10).toFixed(1))
    : spec.unit === 'age' ? `${value}`
    : `${value}`;
  // A NEGATIVE AMOUNT IS WRITTEN WITH THE MINUS SIGN "−", never the hyphen "-" the number formatter gives: every
  // approved drawing and the design guidelines write "−$100" (Net worth v08 READ THIS FIRST 2026-10-10, DEC-4036i:
  // "counts as Cash −$100"). Found by the mock-match audit v02, 2026-10-11: an overdrawn account's row read "-$100".
  const signed = spec.unit === 'money' || spec.unit === 'money-compact' || spec.unit === 'money-cents' ? body.replace(/^-/, '−') : body;
  if (opts?.withPeriod && spec.per) return signed + (opts.spoken ? ` a ${spec.per}` : `/${spec.per}`);
  return signed;
}

export interface WalkLines { beginning: number; contributions: number; withdrawals: number; dividends: number; interest: number; marketChange: number; wealthGenerated: number; ending: number }
/** THE LINES OF A WALK IN WHOLE DOLLARS THAT ADD UP TO ITS ENDING (2026-10-21; DEC-3523 tenet 2, the walk's own decision
 *  "THE LINES ALWAYS ADD UP TO THE ENDING"; outside re-run OpenAI part 1, MK-PF-M-003 and MK-PF-M-015).
 *
 *  Each line was rounded on its own, so on unround figures the walk did not add up on screen: $10,001 + $1,001 + $101 +
 *  $399 = $11,502 under an ending of $11,500, and Wealth generated $499 above Dividends $101 + Change $399 = $500. The
 *  figures stay at full precision everywhere else; only what is printed is settled here, once, for every screen that
 *  prints a walk (the Performance tab, an account's page, Home's dollars for the month).
 *
 *  How: the beginning and the ending are rounded as every figure is (the writer's Math.round), so they match the same
 *  figures elsewhere. The lines between them — contributions, withdrawals, dividends, interest and the change in
 *  investment value — must add to the rounded ending less the rounded beginning: each is rounded down, and the dollars
 *  still missing go one each to the lines with the largest part of a dollar left over (the first line wins a tie). So no
 *  line is more than a dollar from its exact value, and a line that is a whole number of dollars is never moved.
 *  Wealth generated is dividends + interest + the change, as the walk draws it. Worked by hand: beginning $10,000.50,
 *  contributions $1,000.50, dividends $100.50, change $398.99, ending $11,500.49. Beginning $10,001 and ending $11,500;
 *  the lines between must make $1,499. Rounded down they are $1,000 + $100 + $398 = $1,498; the one dollar missing goes
 *  to the largest leftover, the change's 99¢ → $399. Shown: $10,001 + $1,000 + $100 + $399 = $11,500, and Wealth
 *  generated $100 + $399 = $499 (exact $499.49). */
/* ─ MK-XS-F-193 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * walkShown
 *
 * Answers ..... THE LINES OF A WALK IN WHOLE DOLLARS THAT ADD UP TO ITS ENDING (2026-10-21; DEC-3523 tenet 2, the walk's own decision "THE LINES ALWAYS ADD UP TO THE ENDING"; outside re-run OpenAI part 1, MK-PF-M-003 and MK-PF-M-015).
 *
 * Formula .....
 *     beginning = round(beginning), ending = math.round(ending)
 *     parts = for each of [contributions, -math.abs(withdrawals), dividends, interest, market change]: each   if number.is finite(each)
 *     0   otherwise
 *     floors = for each of parts: round down(each)
 *     left = for each of parts: each − floors[i]
 *     missing = Σ over ending − beginning − floors of (each)
 *     order = for each of left: { each, i } where r > 1e − 9.sort((a, b) => r − r or i − i)
 *     shown = floors.slice()
 *     the answer:
 *     beginning = beginning
 *     contributions = contributions
 *     withdrawals = -out
 *     dividends = dividends
 *     interest = interest
 *     market change = market change
 *     wealth generated = dividends + interest + market change
 *     ending = ending
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-193
 * Changed ..... not in git yet (—)
 */
export function walkShown(w: Omit<WalkLines, 'wealthGenerated'> & { wealthGenerated?: number }): WalkLines {
  const beginning = Math.round(w.beginning), ending = Math.round(w.ending);
  // the lines between, signed as they add: money taken out counts against the ending
  const parts = [w.contributions, -Math.abs(w.withdrawals), w.dividends, w.interest, w.marketChange].map((v) => (Number.isFinite(v) ? v : 0));
  const floors = parts.map((v) => Math.floor(v));
  const left = parts.map((v, i) => v - floors[i]);
  let missing = ending - beginning - floors.reduce((t, v) => t + v, 0);
  const order = left.map((r, i) => ({ r, i })).filter((x) => x.r > 1e-9).sort((a, b) => b.r - a.r || a.i - b.i);
  const shown = floors.slice();
  for (const { i } of order) { if (missing <= 0) break; shown[i] += 1; missing -= 1; }
  // what cannot be placed that way (the exact lines did not add up to the exact ending) is the change in investment
  // value's, as the walk's own rule has it: the change is what is left
  shown[4] += missing;
  const [contributions, out, dividends, interest, marketChange] = shown;
  return { beginning, contributions, withdrawals: -out, dividends, interest, marketChange, wealthGenerated: dividends + interest + marketChange, ending };
}


export interface FigureSpec {
  /** The words a person reads beside it, exactly as the screen says them. */
  label: string;
  unit: FigureUnit;
  /** Appended after the number: "/month" or "/year". The canon’s form (cluster 14), never an abbreviation. */
  per?: 'month' | 'year' | null;
  /** THE SPAN IT COVERS, when it is neither a moment ("as of today") nor shown per month or per year, and its own words do
   *  not say "window" (2026-10-22, Performance audit: the master's Period column read "as of today" for every such figure).
   *  Printed as written on the master's Period row — "since the previous close", "the trailing twelve months". Write
   *  'the window picked' for a figure over the screen's window whose words do not say so: the master then lists that
   *  screen's window choices, read from its code. Not shown on any screen. */
  period?: string;
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
 *               MK-NW-F-079 EF · MK-NW-F-081 LB
 *               MK-NW-F-088 BENCH · MK-NW-F-167 COMPARE
 *               MK-NW-F-179 balanceWithBondTakenOut · MK-NW-F-185 valueChanged
 *
 * Reaches ..... 307 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-NW-F-081 LB · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               … and 289 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-180
 * Changed ..... not in git yet (—)
 */
export function declareFigures<T extends FigureDeclaration>(f: T): T { return f; }
