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

function print(id: string, value: number | null, spoken: boolean, withPeriod: boolean): string {
  const spec = figureSpec(id);
  const hidden = useStore.getState().hideBalances;
  let text = write(spec, value, hidden, spoken);
  const printable = value != null && Number.isFinite(value);
  if (withPeriod && printable && spec.per) text += spoken ? ` a ${spec.per}` : `/${spec.per}`;   // spoken keeps "a month" (cluster 14)
  PRINTED.push({ id, value, text, spoken });
  return text;
}

/** The figure as a person reads it — the number alone. Use where the words beside it already say
 *  over what period, as a band heading does ("Take-home each month  $7,200"). */
export const fig = (id: string, value: number | null): string => print(id, value, false, false);
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
export const figSaid = (id: string, value: number | null): string => print(id, value, true, true);
/** The words beside it, from the declaration — so the screen and the master file cannot say different things. */
export const figLabel = (id: string): string => figureSpec(id).label;
