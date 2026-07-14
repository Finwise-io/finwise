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
