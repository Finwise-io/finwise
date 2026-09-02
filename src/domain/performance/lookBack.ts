// Look back — what if I'd moved money? (FCC detailed design v1.1, Invest sheet). The truth-teller
// answering hindsight with REAL past prices: what the dollars became where they sat, what they would
// have become moved, and the plain difference. Explicitly backward-looking — a fact about the past,
// never a recommendation about tomorrow. null when either series lacks the window (honest absence,
// never an invented price).
import type { PriceSeries } from './index';
import { round2 } from '../_shared/num';

export interface LookBackLeg { endValue: number; delta: number; pct: number }
export interface LookBackResult {
  stayed: LookBackLeg;      // left where it was
  moved: LookBackLeg;       // moved to the other holding
  difference: number;       // moved.endValue − stayed.endValue (signed: negative = the move would have LOST)
  months: number;
}

/** Price factor over the trailing window: last close ÷ the close at (now − months). null when the
 *  series doesn't reach back that far — we never extrapolate a price. */
/* ─ MK-PF-F-022 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * factorOverMonths
 *
 * Answers ..... Price factor over the trailing window: last close ÷ the close at (now − months).
 *
 * Formula .....
 *     pts = series.points
 *     nothing   when pts is missing (or pts.length < 2 when missing or zero)
 *     cutoff = the first 10 of the date now.get full year(), now.get month() − months, now.get date()).to isostring(
 *     nothing   when pts[0].date > cutoff
 *     start = the first of pts
 *     end = pts[pts.length − 1]
 *     nothing   when start.close is missing (or start.close ≤ 0 when missing or zero)
 *     the answer = end.close ÷ start.close
 *
 * Called by ... MK-PF-F-023 lookBack
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-PF-F-023 lookBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-022
 * Changed ..... 2026-07-13 (d058ce1)
 */
export function factorOverMonths(series: PriceSeries | null | undefined, months: number, now: Date = new Date()): number | null {
  const pts = series?.points;
  if (!pts || pts.length < 2) return null;
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate()).toISOString().slice(0, 10);
  // the series must actually START at/before the window opening — a shorter history can't answer
  if (pts[0].date > cutoff) return null;
  let start = pts[0];
  for (const p of pts) { if (p.date <= cutoff) start = p; else break; }
  const end = pts[pts.length - 1];
  if (!start.close || start.close <= 0) return null;
  return end.close / start.close;
}

/* ─ MK-PF-F-023 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * lookBack
 *
 * Answers ..... What if I had moved this money?
 *
 * Formula .....
 *     nothing   when not (amount > 0)
 *     f from = factor over months(from series, months, now)
 *     f to = factor over months(to series, months, now)
 *     nothing   when f from = nothing (or f to = nothing when missing or zero)
 *     stayed = leg(f from)
 *     moved = leg(f to)
 *     the answer:
 *     stayed = stayed
 *     moved = moved
 *     difference = round(moved.end value − stayed.end value, 2 dp)
 *     months = months
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... MK-PF-M-010 · MK-PF-M-011 · MK-PF-M-012
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-023
 * Changed ..... 2026-07-13 (d058ce1)
 */
export function lookBack(amount: number, fromSeries: PriceSeries | null | undefined, toSeries: PriceSeries | null | undefined, months: number, now: Date = new Date()): LookBackResult | null {
  if (!(amount > 0)) return null;
  const fFrom = factorOverMonths(fromSeries, months, now);
  const fTo = factorOverMonths(toSeries, months, now);
  if (fFrom == null || fTo == null) return null;
  const leg = (f: number): LookBackLeg => ({
    endValue: round2(amount * f),
    delta: round2(amount * f - amount),
    pct: Math.round((f - 1) * 1000) / 10,
  });
  const stayed = leg(fFrom);
  const moved = leg(fTo);
  return { stayed, moved, difference: round2(moved.endValue - stayed.endValue), months };
}
