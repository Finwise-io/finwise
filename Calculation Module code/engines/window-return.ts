// ENGINE — window boundaries and the money-weighted return, with EVERY threshold in this one
// named module (D3 and D4, founder brief 2026-08-20).
//
// D3 — BOTH boundary days are inside the window, app-wide, portfolio and spending alike.
// Two consequences ship with that or the window double-counts:
//   · the beginning value is the close of the day BEFORE the start — 30 June for a July window;
//   · Dietz weights run over the INCLUSIVE day count — a start-day flow carries full weight,
//     a last-day flow essentially none.
// Consecutive windows then tile cleanly. No smoothing anywhere.
//
// D4 — the Return figure is MONEY-WEIGHTED (wealth generated is already money-weighted in
// spirit; a time-weighted figure beside it would disagree irreconcilably). Three thresholds:
//   · the 1% rule is a fallback for when flow DATES are missing only — with dates, Modified
//     Dietz is always available and always better;
//   · the TIMING-SENSITIVITY BAND replaces the old 10% gate: compute the rate with all flows at
//     period start and again at period end; refuse when the band exceeds ~20% of the figure or
//     ~1 percentage point, whichever is TIGHTER, and show the dollar walk instead;
//   · unconditional: refuse when the denominator is at or below zero.
// A refusal is an answer: the reason ships with it, in words a person can read.
import { Dec } from './decimal';

// ── the named thresholds — nowhere else ────────────────────────────────────────────────────────
/** Dateless flows may be absorbed only while they stay under this share of the beginning value. */
export const DATELESS_FLOW_LIMIT = 0.01;          // 1%
/** The sensitivity band may not exceed this share of the rate itself… */
export const BAND_SHARE_OF_RATE = 0.20;           // ~20% of the figure
/** …nor this many percentage points — whichever is tighter. */
export const BAND_ABSOLUTE = 0.01;                // ~1 percentage point

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
 *               MK-ST-F-064 modifiedDietzOverWindow
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-ST-F-064 modifiedDietzOverWindow · MK-ST-F-063 shiftDay
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
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-ST-F-064 modifiedDietzOverWindow · MK-NW-O-008 thePerformance
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
 * Called by ... MK-NW-O-008 thePerformance · MK-ST-F-064 modifiedDietzOverWindow
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-ST-F-064 modifiedDietzOverWindow · MK-NW-O-008 thePerformance
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

// ── D4: the money-weighted return ──────────────────────────────────────────────────────────────
export interface ExternalFlow {
  /** 'YYYY-MM-DD', or absent when the source truly carries no date. */
  date?: string | null;
  /** Signed: positive entered the accounts, negative left them. Exact. */
  amount: Dec;
}

export interface ReturnVerdict {
  /** The rate as a decimal (0.042 = 4.2%), or null when the figure is REFUSED. */
  rate: number | null;
  method: 'dietz' | 'dateless-fallback' | 'refused';
  refused?: 'NON_POSITIVE_DENOMINATOR' | 'TIMING_SENSITIVE' | 'DATELESS_FLOWS_TOO_LARGE';
  /** The rate with every flow at period start, and at period end — how much timing drives the answer. */
  band?: { allAtStart: number; allAtEnd: number; width: number };
  /** The plain-English line the screen shows — especially when the honest answer is the dollar walk. */
  sentence: string;
}

/* ─ MK-ST-F-064 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * modifiedDietzOverWindow
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     w = window bounds(start, end)
 *     flows = flows (or none when missing)
 *     net flows = dec.sum(flows.map((f) => amount))
 *     gain = ending.sub(beginning).sub(net flows)
 *     t = min(max(round((to utc(date) − to utc(start)) ÷ day ms), 0), days − 1)
 *     the answer = (days − t) ÷ days
 *     denom = Σ over flows of (amount.to number(8) × weight(each))  starting from beginning.to number(8)
 *     dateless = flows.some((f) => !date)
 *     limit = beginning.abs().to number(8) × DATELESS_FLOW_LIMIT
 *     r = rate with(() => 0.5)
 *     rate = rate with((f) => weight of(date!))
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-NW-O-008 thePerformance
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-O-008 thePerformance
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-064
 * Changed ..... not in git yet (—)
 */
export function modifiedDietzOverWindow(a: {
  beginning: Dec; ending: Dec; flows: ExternalFlow[]; start: string; end: string;
}): ReturnVerdict {
  const w = windowBounds(a.start, a.end);
  const flows = a.flows ?? [];
  const netFlows = Dec.sum(flows.map((f) => f.amount));
  const gain = a.ending.sub(a.beginning).sub(netFlows);

  // weight for a flow: full on the start day, essentially none on the last (inclusive count)
  const weightOf = (date: string): number => {
    const t = Math.min(Math.max(Math.round((toUtc(date) - toUtc(a.start)) / dayMs), 0), w.days - 1);
    return (w.days - t) / w.days;
  };
  const rateWith = (weight: (f: ExternalFlow) => number): number | null => {
    const denom = flows.reduce((d, f) => d + f.amount.toNumber(8) * weight(f), a.beginning.toNumber(8));
    return denom > 0 ? gain.toNumber(8) / denom : null;
  };

  const dateless = flows.some((f) => !f.date);
  if (dateless) {
    // the 1% rule — dateless flows only, and only while they stay small
    const limit = a.beginning.abs().toNumber(8) * DATELESS_FLOW_LIMIT;
    if (netFlows.abs().toNumber(8) > limit) {
      return { rate: null, method: 'refused', refused: 'DATELESS_FLOWS_TOO_LARGE',
        sentence: 'Money moved in or out without dates, and too much of it to absorb — the dollar change below is the honest figure.' };
    }
    const r = rateWith(() => 0.5);
    if (r == null) return { rate: null, method: 'refused', refused: 'NON_POSITIVE_DENOMINATOR',
      sentence: 'There was no money at work over this window, so a percentage would be meaningless.' };
    return { rate: r, method: 'dateless-fallback',
      sentence: 'Some money movements carried no dates; they were small, so the figure absorbs them at mid-window.' };
  }

  const rate = rateWith((f) => weightOf(f.date!));
  if (rate == null) {
    return { rate: null, method: 'refused', refused: 'NON_POSITIVE_DENOMINATOR',
      sentence: 'There was no money at work over this window, so a percentage would be meaningless.' };
  }

  // the timing-sensitivity band — measured directly, not proxied by a flow-size gate
  const allAtStart = rateWith(() => 1);
  const allAtEnd = rateWith(() => 0);
  if (allAtStart != null && allAtEnd != null) {
    const width = Math.abs(allAtStart - allAtEnd);
    const tighter = Math.min(Math.abs(rate) * BAND_SHARE_OF_RATE, BAND_ABSOLUTE);
    if (width > tighter) {
      return { rate: null, method: 'refused', refused: 'TIMING_SENSITIVE',
        band: { allAtStart, allAtEnd, width },
        sentence: 'Money moved in or out this period in amounts large enough that WHEN it moved drives the percentage — the dollar walk below is the honest answer.' };
    }
    return { rate, method: 'dietz', band: { allAtStart, allAtEnd, width },
      sentence: 'Measured on your money, weighted by how long it was at work.' };
  }
  return { rate, method: 'dietz', sentence: 'Measured on your money, weighted by how long it was at work.' };
}
