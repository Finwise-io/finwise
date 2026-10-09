/** THE DATE A PERSON IS LIVING IN, not the one UTC is.
 *
 *  `d.toISOString().slice(0, 10)` is the obvious way to write this and it is wrong for anyone west
 *  of UTC: at 6pm in California, toISOString already says tomorrow. Two screens stamped dates that
 *  way while the cash-flow code used the local one — so a transaction logged on the evening of the
 *  31st was filed in the next month, on those screens only. One function, and a name that says why.
 */
/* ─ MK-ST-F-065 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * isoLocalDate
 *
 * Answers ..... THE DATE A PERSON IS LIVING IN, not the one UTC is.
 *
 * Formula .....
 *     `${get full year()}-${string(get month() + 1).pad start(2, '0')}-${string(get date()).pad start(2, '0')}`
 *
 * Called by ... MK-CF-F-019 upcomingBills · MK-CF-F-183 paidOutByAccount
 *               MK-NW-F-061 bondSummary · MK-NW-F-125 isPastMaturity
 *               MK-NW-O-003 theNetWorth · MK-PF-F-022 factorOverMonths
 *               MK-XS-F-175 uid
 *
 * Reaches ..... 145 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-077 ALL · MK-NW-F-076 ALT
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-081 LB
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-NW-F-078 ONE
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               … and 127 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-065
 * Changed ..... not in git yet (—)
 */
export function isoLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** A DAY WRITTEN THE WAY THE APPROVED SCREENS WRITE IT — "Aug 4, 2026".
 *
 *  Performance v17 (approved 2026-10-01) writes every day on its face as month, day, year. The
 *  Account portfolio screen carried its own copy of this; a screen owning a formatter is a second
 *  place for the wording to drift, so it lives here and the screen asks for it.
 */
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/* ─ MK-ST-F-078 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * dateShown
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     ''   when iso is missing
 *     `${MONTH_SHORT[(m or 1) − 1]} ${d}, ${y}`   if y
 *     ''   otherwise
 *
 * Called by ... MK-NW-F-105 whyNoReturn · MK-NW-O-008 thePerformance
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-093 QUIET_PERF
 *               MK-NW-O-008 thePerformance · MK-NW-F-105 whyNoReturn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-078
 * Changed ..... not in git yet (—)
 */
export function dateShown(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return y ? `${MONTH_SHORT[(m || 1) - 1]} ${d}, ${y}` : '';
}
