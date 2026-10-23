/** PRINT A FIGURE BY ITS IDENTIFIER — founder rule 11, step 2 (2026-09-14).
 *
 *  A screen prints a figure only through this, never by formatting a number itself:
 *
 *      <Text>{fig('MK-CF-M-030', pay.grossAnnual)}</Text>        →  "$182,000/year"
 *      accessibilityLabel={figSpoken('MK-CF-M-030', pay.grossAnnual)}
 *
 *  Three things follow from that, and all three were missing before:
 *   · The place that prints carries the identifier, so the census reads figures out of the CODE
 *     rather than matching the words on screen — which is where every mismatch came from.
 *   · The rounding and the "/month" · "/year" wording come from the declaration, so the precision
 *     standard (Q49) and the canon (cluster 14) are applied once, not remembered in 242 places.
 *   · An identifier that was never declared throws, so a figure cannot reach a screen without a row.
 *
 *  Masking stays here at the component layer, as `useMoney.ts` explains: the money functions in
 *  `MoneyKeel/functions` are pure and must not read React state.
 */
import { useStore } from '../store/useStore';
import { figureSpec } from '../../MoneyKeel/functions/figures';
import { writeFigure, type FigureSpec } from '../../MoneyKeel/functions/_figure-spec';

export const BALANCE_MASK = '••••';

/** Every figure printed in this render, in order, with its identifier — read by the figure census. */
export interface FigurePrint { id: string; value: number | null; text: string; spoken: boolean }
const PRINTED: FigurePrint[] = [];
export function figuresPrinted(): FigurePrint[] { return PRINTED.slice(); }
export function resetFiguresPrinted(): void { PRINTED.length = 0; }

const isMoney = (u: FigureSpec['unit']) => u === 'money' || u === 'money-cents';

// ONE WRITER (2026-09-28). The rounding lives in `writeFigure` in the declaration module, where a
// door's worked example can call it too; here it only decides whether balances are masked, because
// that is the one part that needs the store. Two copies of the rounding would have let a worked
// example agree with itself and still disagree with the screen.
function write(spec: FigureSpec, value: number | null, hidden: boolean, spoken: boolean): string {
  if (value == null || !Number.isFinite(value)) return spec.refusal;
  if (isMoney(spec.unit) && hidden) return spoken ? 'hidden' : BALANCE_MASK;
  return writeFigure(spec, value);
}

function print(id: string, raw: number | null, spoken: boolean, withPeriod: boolean, perOverride?: 'month' | 'year'): string {
  // a value that is not a real number (NaN, Infinity) is a refused figure, exactly like null — it
  // never reaches the screen as "NaN" or a number. (outside review OpenAI final, 2026-10-09, DEC-3523)
  const value = raw != null && Number.isFinite(raw) ? raw : null;
  const spec = figureSpec(id);
  const hidden = useStore.getState().hideBalances;
  let text = write(spec, value, hidden, spoken);
  const per = perOverride ?? spec.per;   // a figure that is yearly only sometimes names its period here (2026-10-21)
  if (withPeriod && value != null && per) text += spoken ? ` a ${per}` : `/${per}`;   // spoken keeps "a month" (cluster 14)
  PRINTED.push({ id, value, text, spoken });
  return text;
}

/** The figure as a person reads it — the number alone. Use where the words beside it already say
 *  over what period, as a band heading does ("Take-home each month  $7,200"). */
export const fig = (id: string, value: number | null): string => print(id, value, false, false);
/** A FIGURE WHOSE VALUE IS ALREADY A SENTENCE — "3 shares", "2 bonds · face $25,000", "Matures
 *  30 Sep 2029", "Assets $X − Debts $Y = Net worth $Z".
 *
 *  Most figures are a number this module formats. Some are a sentence a function composed, because
 *  the words and the number cannot be separated: "1 coin" is not "1" with a unit stuck on afterwards,
 *  it is singular BECAUSE the quantity is one. The function that knows that composes the whole thing.
 *
 *  Until 2026-10-01 those figures were printed as plain text, so 16 of the Net worth module's 63
 *  numbers were on screen with nothing linking them to their row on the master file — and the guard
 *  that counts untagged figures only looks for dollar amounts, so it reported none missing. This
 *  records the print with its identifier and hands the sentence back unchanged. */
export const figWords = (id: string, text: string): string => {
  PRINTED.push({ id, value: null, text, spoken: false });
  return text;
};
/** The figure with its period after it — "$108,000/year". Use where the number stands on its own.
 *  The wording comes from the declaration, so the canon (cluster 14) is applied once, not remembered. */
export const figPer = (id: string, value: number | null): string => print(id, value, false, true);
/** The figure as a screen reader says it — with the label, so it is a sentence and not a bare number. */
export const figSpoken = (id: string, value: number | null): string => `${figureSpec(id).label}: ${print(id, value, true, true)}`;
/** THE FIGURE AS A SCREEN READER SAYS IT, WITHOUT ITS LABEL — for the middle of a sentence.
 *
 *  `figSpoken` puts the label in front, which is right when the figure stands alone: "Market value:
 *  $46,600". Used inside a sentence the label lands in the middle of it, and on 2026-10-01 that is
 *  exactly what happened — an activity row came out as "Withdrawal, minus what one record moved:
 *  $300" instead of "Withdrawal, minus $300". The sentence around the figure already names it, so
 *  here the number is said on its own: spoken wording, masked under hide-balances, no label. */
export const figSaid = (id: string, value: number | null, per?: 'month' | 'year'): string => print(id, value, true, true, per);
/*  ↑ `per` (2026-10-21, Performance audit row 29): a return is a yearly rate only over a window longer than a year, so its
    declaration carries no period and the screen wrote " a year" after it by hand. Passing 'year' says it through the one
    spoken writer — "+7.30% a year", never "+7.30%/year" read aloud as "slash year". */
/** A LINE OF PRINTED FIGURES, AS A SCREEN READER SAYS IT (2026-10-22, W-A11Y; the Performance audit's rows 28 and 29, carried
 *  to the account page and the Holding page). A line composed around figures fig() already wrote — "4.00%/year · $400/year",
 *  "HOW •••• BECAME ••••", "~8.20% · estimate" — was read aloud as written: "slash year", "bullet bullet bullet bullet",
 *  "tilde". This says it the way figSaid says one figure: the period the canon prints after a figure is "a year" / "a month"
 *  (cluster 14), a hidden balance is "hidden", and the marks a reader spells out are words ("→" to, "~" about, "＋" plus).
 *  It changes nothing else, so a line with none of these is said exactly as it is printed. */
export const saidSentence = (text: string): string => text
  .split(BALANCE_MASK).join('hidden')
  .replace(/(\d|%|hidden)\/(month|year|quarter|week)\b/g, '$1 a $2')
  .replace(/\s*→\s*/g, ' to ')
  .replace(/~\s?(?=[\d$h])/g, 'about ')
  .replace(/\s*＋\s*/g, ' plus ');
/** The words beside it, from the declaration — so the screen and the master file cannot say different things. */
export const figLabel = (id: string): string => figureSpec(id).label;


/** The lines of a walk as printed, in whole dollars that add up to its ending — written by the one writer
 *  (MoneyKeel/functions/_figure-spec.ts walkShown, 2026-10-21), re-exported here beside fig for the screens. */
export { walkShown, type WalkLines } from '../../MoneyKeel/functions/_figure-spec';
