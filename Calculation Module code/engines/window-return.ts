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
 *               MK-ST-F-101 daysEarning
 *
 * Reaches ..... 37 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-ST-F-101 daysEarning · MK-PF-F-012 earliestPurchaseDate
 *               MK-PF-F-079 eventDays · MK-PF-F-065 firstDatedPurchase
 *               … and 19 more — the full list is on functions_from_code
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
 * Reaches ..... 36 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-ST-F-101 daysEarning · MK-PF-F-012 earliestPurchaseDate
 *               MK-PF-F-079 eventDays · MK-PF-F-065 firstDatedPurchase
 *               … and 18 more — the full list is on functions_from_code
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
 * Called by ... MK-NW-O-008 thePerformance · MK-PF-F-014 buildPerformance
 *               MK-ST-F-101 daysEarning
 *
 * Reaches ..... 35 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-ST-F-101 daysEarning · MK-PF-F-012 earliestPurchaseDate
 *               MK-PF-F-079 eventDays · MK-PF-F-065 firstDatedPurchase
 *               … and 17 more — the full list is on functions_from_code
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

/** THE DAYS OF A WINDOW A BOND OR CD EARNS ITS STATED RATE (2026-11-12, Performance phase 4 item 3; DEC-7933 and DEC-9675: a bond
 *  past maturity earns $0 interest; DEC-6323: a matured bond or CD shows no yield). It earns up to its maturity date and not after:
 *  the window's own days (both ends inside, D3) where it matures on or after the window's last day or no maturity is on record; the
 *  days from the window's first day to the maturity date where it matures inside the window; 0 where it matured before the window
 *  began. KEY BANK CD 3.85% maturing Aug 24, 2026, over Nov 10, 2025 → Nov 10, 2026: 288 days, not 366. A maturity date that is
 *  not a real day is not on record. To reverse: return windowBounds(start, end).days. */
/* ─ MK-ST-F-101 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * daysEarning
 *
 * Answers ..... THE DAYS OF A WINDOW A BOND OR CD EARNS ITS STATED RATE (2026-11-12, Performance phase 4 item 3; DEC-7933 and DEC-9675: a bond past maturity earns $0 interest; DEC-6323: a matured bond or CD shows no yield).
 *
 * Formula .....
 *     m = the first 10 of string(maturity ?? '').trim()
 *     real = ÷ ^\d{4}-\d{2}-\d{2}$ ÷ .test(m) and number.is finite(to utc(m)) and new date(to utc(m)).to isostring().slice(0, 10) = m
 *     window bounds(start, end).days   when real is missing (or m ≥ end when missing or zero)
 *     0   when m < start
 *     the answer = window bounds(start, m).days
 *
 * Called by ... MK-NW-F-091 pricedGainOf · MK-NW-O-008 thePerformance
 *               MK-PF-F-014 buildPerformance
 *
 * Reaches ..... 34 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-087 CAT
 *               MK-NW-F-086 CATS · MK-NW-F-167 COMPARE
 *               MK-NW-F-080 HOLD · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-PF-F-014 buildPerformance · MK-NW-F-084 categoryEarnings
 *               MK-NW-F-142 classReturnOf · MK-PF-F-068 dayAfterDay
 *               MK-PF-F-012 earliestPurchaseDate · MK-PF-F-079 eventDays
 *               MK-PF-F-065 firstDatedPurchase · MK-PF-F-070 holdingPath
 *               … and 16 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-013 bond maturity date
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-101
 * Changed ..... not in git yet (—)
 */
export function daysEarning(start: string, end: string, maturity?: string | null): number {
  const m = String(maturity ?? '').trim().slice(0, 10);
  const real = /^\d{4}-\d{2}-\d{2}$/.test(m) && Number.isFinite(toUtc(m)) && new Date(toUtc(m)).toISOString().slice(0, 10) === m;
  if (!real || m >= end) return windowBounds(start, end).days;
  if (m < start) return 0;
  return windowBounds(start, m).days;
}
