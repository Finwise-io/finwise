/** A CLOSE NEAR EACH WINDOW'S START, FOR A FIXTURE THAT HOLDS ONLY A FEW (2026-11-01, FX-PF; the lead's ruling R19, NW4-02).
 *  A window starts only from a close at most 7 calendar days before its first day (staleStartClose). A test household written with a
 *  handful of closes measured its windows from closes months away — figures worked by hand from those closes. Where a window's start
 *  (1M, This year, 1Y, 2Y) finds only a stale close, this adds one close on the evening before that window, AT THE SAME PRICE the
 *  window measured from, so every figure the test worked by hand stands and the household reads as a real daily history would.
 *  A test ABOUT a stale start (R19) never uses it. */
import { staleStartClose, startDateFor } from '../domain/performance';

const eveOf = (d: Date): string => {
  const e = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
  return `${e.getFullYear()}-${String(e.getMonth() + 1).padStart(2, '0')}-${String(e.getDate()).padStart(2, '0')}`;
};

export function closeNearEachStart<S extends { ticker?: string; points: { date: string; close: number }[] }>(series: S, now: Date = new Date()): S {
  let out = series;
  for (const p of ['1M', 'YTD', '1Y', '2Y'] as const) {
    const opens = startDateFor(p as any, now);
    if (!opens) continue;
    const eve = eveOf(opens);
    const old = staleStartClose(out as any, eve);
    if (old) out = { ...out, points: [...out.points, { date: eve, close: old.close }].sort((a, b) => String(a.date).localeCompare(String(b.date))) };
  }
  return out;
}

/** every series in a price cache, so treated */
export function closesNearEachStart<C extends Record<string, any>>(cache: C, now: Date = new Date()): C {
  return Object.fromEntries(Object.entries(cache).map(([k, s]) => [k, s && Array.isArray(s.points) ? closeNearEachStart(s, now) : s])) as C;
}
