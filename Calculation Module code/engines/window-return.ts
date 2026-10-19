// ENGINE — window boundaries (D3, founder brief 2026-08-20).
//
// D3 — BOTH boundary days are inside the window, app-wide, portfolio and spending alike.
// The beginning value is the close of the day BEFORE the start — 30 June for a July window — so
// consecutive windows tile cleanly. No smoothing anywhere.
//
// THE RETURN IS NOT HERE ANY MORE. This file also held the Modified Dietz return (D4), with its
// timing band and its thresholds. Owner decision, 2026-10-04 (DEC-1669): "All return should be True
// Weighted Return and not Dietz return." Every return is worked out in time-weighted-return.ts, and
// the Dietz function was removed the same day.

// ── D3: the window ─────────────────────────────────────────────────────────────────────────────
const dayMs = 86_400_000;
/* ─ MK-ST-F-062 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * toUtc
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     the answer = the milliseconds since 1970 of the date at midnight UTC
 *
 * Called by ... MK-ST-F-038 windowBounds · MK-ST-F-063 shiftDay
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-ST-F-063 shiftDay
 *               MK-NW-O-008 thePerformance · MK-ST-F-038 windowBounds
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-062
 * Changed ..... not in git yet (—)
 */
const toUtc = (d: string) => Date.parse(`${d}T00:00:00Z`);
/* ─ MK-ST-F-063 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * shiftDay
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     the first 10 of the date to utc(d) + by × day ms).to isostring(
 *
 * Called by ... MK-ST-F-038 windowBounds
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-O-008 thePerformance
 *               MK-ST-F-038 windowBounds
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-063
 * Changed ..... not in git yet (—)
 */
const shiftDay = (d: string, by: number) => new Date(toUtc(d) + by * dayMs).toISOString().slice(0, 10);

export interface WindowBounds {
  start: string; end: string;
  /** The date whose CLOSE is the beginning value — the day before the start. */
  beginningAsOf: string;
  /** Inclusive day count: a July window is 31 days, and July windows tile against June's. */
  days: number;
}
/* ─ MK-ST-F-038 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * windowBounds
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     beginning as of = the day before the start
 *     days = round((end − start) in days) + 1
 *
 * Called by ... MK-NW-O-008 thePerformance
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-038
 * Changed ..... 2026-08-20 (9f201fb)
 */
export function windowBounds(start: string, end: string): WindowBounds {
  return {
    start, end,
    beginningAsOf: shiftDay(start, -1),
    days: Math.round((toUtc(end) - toUtc(start)) / dayMs) + 1,
  };
}
