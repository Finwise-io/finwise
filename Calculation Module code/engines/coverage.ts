// ENGINE — how far back our record actually goes, said out loud.
//
// FOUNDER QUESTION, 2026-08-18: "Is the reasoning displayed to the user? Or is this a gate for a
// human developer?" It was a gate for a developer only — a code comment above the deletion rule.
// Nobody using the app was ever told it has a memory limit.
//
// That silence is the same fault as the trend chart and the back-solved beginning value: a number
// that answers a question it was not asked. Ask for "this year" when the record starts in July and
// the app answers for July onwards, labelled as the year.
//
// TWO SENTENCES CLOSE IT. One names the date a figure is measured FROM. The other states plainly
// how far back the record reaches, wherever a person asks for a window we cannot cover.

// It needs only DATES, not whole snapshots — which means it works with the history the app keeps
// today AND with the new per-account store, so the sentence can appear before that store lands.
export interface Dated { date: string }

export interface Coverage {
  /** The earliest date we hold anything at all. */
  from: string | null;
  /** The earliest date we hold DAILY detail for — two years back, or the start if that is later. */
  dailyFrom: string | null;
  /** True when the record reaches the date being asked about. */
  covers: boolean;
  /** What a figure should say it is measured from — the requested date, or the record's start. */
  measuredFrom: string | null;
  /** The sentence to show. Empty when the record fully covers the window and nothing needs saying. */
  sentence: string;
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

/** "March 2022" — a month a person reads, not a date stamp. */
/* ─ MK-ST-F-002 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * monthWords
 *
 * Answers ..... "March 2022" — a month a person reads, not a date stamp.
 *
 * Formula .....
 *     ''   when iso is missing
 *     `${MONTHS[m − 1]} ${y}`   if m
 *     string(y)   otherwise
 *
 * Called by ... MK-ST-F-003 dayWords · MK-ST-F-004 coverageFor
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-ST-F-004 coverageFor · MK-ST-F-003 dayWords
 *               MK-ST-F-005 measuredFromLabel · MK-PF-F-045 priceHistoryShortSentence
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-002
 * Changed ..... 2026-08-18 (cd2fd51)
 */
export function monthWords(iso: string | null): string {
  if (!iso) return '';
  const [y, m] = iso.split('-').map(Number);
  return m ? `${MONTHS[m - 1]} ${y}` : String(y);
}

/** "14 March 2022". Used where the exact day matters, as it does for a figure's start. */
/* ─ MK-ST-F-003 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * dayWords
 *
 * Answers ..... "14 March 2022".
 *
 * Formula .....
 *     ''   when iso is missing
 *     `${d} ${MONTHS[m − 1]} ${y}`   if m and d
 *     month words(iso)   otherwise
 *
 * Called by ... MK-ST-F-004 coverageFor · MK-ST-F-005 measuredFromLabel
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-ST-F-004 coverageFor · MK-ST-F-005 measuredFromLabel
 *               MK-PF-F-045 priceHistoryShortSentence
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-003
 * Changed ..... 2026-08-18 (cd2fd51)
 */
export function dayWords(iso: string | null): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return m && d ? `${d} ${MONTHS[m - 1]} ${y}` : monthWords(iso);
}

/**
 * What can we honestly say about a window starting on `from`?
 *
 * The sentence is written for someone with no finance background and no interest in how the app
 * stores anything. It says what we have, not what we do.
 */
/* ─ MK-ST-F-004 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * coverageFor
 *
 * Answers ..... What can we honestly say about a window starting on `from`?
 *
 * Formula .....
 *     start = first date(days)
 *     daily cut = the date today
 *     daily from = the first 10) ? start : daily cut.to isostring().slice(0, 10 of start > daily cut.to isostring()   if start
 *     nothing   otherwise
 *     the answer:
 *     from = start
 *     daily from = daily from
 *     covers = true
 *     measured from = from
 *     sentence = ''
 *     has monthly only = daily from ≠ nothing and start < daily from
 *
 * Called by ... MK-PF-F-045 priceHistoryShortSentence
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-PF-F-045 priceHistoryShortSentence
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-004
 * Changed ..... 2026-08-18 (8d0e8be)
 */
export function coverageFor(days: Dated[], from: string, today: string): Coverage {
  const start = firstDate(days);
  const dailyCut = new Date(today);
  dailyCut.setFullYear(dailyCut.getFullYear() - 2);
  const dailyFrom = start ? (start > dailyCut.toISOString().slice(0, 10) ? start : dailyCut.toISOString().slice(0, 10)) : null;

  if (!start) {
    return { from: null, dailyFrom: null, covers: false, measuredFrom: null,
      sentence: 'We have not recorded anything yet. Figures will start once the app has been open for a day.' };
  }
  if (start <= from) {
    // fully covered — say nothing. A sentence here would be noise.
    return { from: start, dailyFrom, covers: true, measuredFrom: from, sentence: '' };
  }

  // the window reaches back further than the record does
  const hasMonthlyOnly = dailyFrom != null && start < dailyFrom;
  const sentence = hasMonthlyOnly
    ? `Measured from ${dayWords(start)}, when your records begin. We have month-by-month figures back to `
      + `${monthWords(start)}, and day-by-day figures for the last two years.`
    : `Measured from ${dayWords(start)}, when your records begin — not from ${dayWords(from)}.`;

  return { from: start, dailyFrom, covers: false, measuredFrom: start, sentence };
}

/**
 * The short label that rides beside a change figure, always — whether the window is covered or not.
 * A figure that never says what it is measured from is the thing that let "+2.0%" stand for a year
 * in which the account actually fell 4.2%.
 */
/* ─ MK-ST-F-005 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * measuredFromLabel
 *
 * Answers ..... The short label that rides beside a change figure, always — whether the window is covered or not.
 *
 * Formula .....
 *     start = first date(days)
 *     ''   when start is missing
 *     actual = start   if start > from
 *     from   otherwise
 *     the answer = `since ${day words(actual)}`
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-005
 * Changed ..... 2026-08-18 (8d0e8be)
 */
export function measuredFromLabel(days: Dated[], from: string): string {
  const start = firstDate(days);
  if (!start) return '';
  const actual = start > from ? start : from;
  return `since ${dayWords(actual)}`;
}

/** Is there any record at all on or before this date? Used to suppress a figure rather than show a
 *  number measured over some other period with a misleading label. */
/* ─ MK-ST-F-006 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * canAnswer
 *
 * Answers ..... Is there any record at all on or before this date?
 *
 * Formula .....
 *     on or before(days, from) ≠ nothing
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-006
 * Changed ..... 2026-08-18 (8d0e8be)
 */
export function canAnswer(days: Dated[], from: string): boolean {
  return onOrBefore(days, from) != null;
}

import { firstDate, onOrBefore } from './snapshots';