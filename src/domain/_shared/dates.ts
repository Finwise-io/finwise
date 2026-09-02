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
 * Called by ... MK-CF-F-183 paidOutByAccount
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-184 incomeFromAccounts · MK-CF-F-183 paidOutByAccount
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-065
 * Changed ..... not in git yet (—)
 */
export function isoLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
