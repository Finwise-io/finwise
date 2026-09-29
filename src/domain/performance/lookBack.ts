// Look back — what if I'd moved money? (FCC detailed design v1.1, Invest sheet). The truth-teller
// answering hindsight with REAL past prices: what the dollars became where they sat, what they would
// have become moved, and the plain difference. Explicitly backward-looking — a fact about the past,
// never a recommendation about tomorrow. null when either series lacks the window (honest absence,
// never an invented price).
import type { PriceSeries } from './index';
import { isoLocalDate } from '../_shared/dates';

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
 *     nothing   when fewer than 2 points
 *     cutoff = the local calendar date `months` before today (year, month − months, day) — built from local date parts, never via UTC
 *     nothing   when the series starts after the cutoff
 *     start = the last point on or before the cutoff; end = the last point
 *     nothing   when start.close is missing or ≤ 0
 *     the answer = end.close ÷ start.close
 *
 * Called by ... MK-PF-F-023 lookBack
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-081 LB · MK-PF-F-023 lookBack
 *               MK-NW-O-007 theLookBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-005 holding price
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · The window boundary is a LOCAL calendar date (the person's own day), so the answer is the same in every timezone (TZ-1, 2026-09-08).
 *
 * Formula also on the master file · functions_from_code · MK-PF-F-022
 * Changed ..... 2026-07-13 (d058ce1)
 */
export function factorOverMonths(series: PriceSeries | null | undefined, months: number, now: Date = new Date()): number | null {
  const pts = series?.points;
  if (!pts || pts.length < 2) return null;
  // The window opens `months` before today, in the PERSON'S OWN calendar day. Built from local date
  // parts — never through UTC: converting local midnight to UTC moves the date back a day anywhere
  // east of Greenwich, and that shift made every look-back answer "nothing" on a device set to India
  // time (found 2026-09-08 when the probe suite ran on a machine in IST).
  const cutoff = isoLocalDate(new Date(now.getFullYear(), now.getMonth() - months, now.getDate()));
  // the series must actually START at/before the window opening — a shorter history can't answer
  if (pts[0].date > cutoff) return null;
  let start = pts[0];
  for (const p of pts) { if (p.date <= cutoff) start = p; else break; }
  const end = pts[pts.length - 1];
  if (!start.close || start.close <= 0) return null;
  return end.close / start.close;
}

/* ─ MK-PF-F-023 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
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
 *     difference = moved.end value − stayed.end value
 *     months = months
 *
 * Called by ... MK-NW-O-007 theLookBack
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-081 LB · MK-NW-O-007 theLookBack
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
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
    endValue: (amount * f),
    delta: (amount * f - amount),
    pct: Math.round((f - 1) * 1000) / 10,
  });
  const stayed = leg(fFrom);
  const moved = leg(fTo);
  return { stayed, moved, difference: (moved.endValue - stayed.endValue), months };
}
