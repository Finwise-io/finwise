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
 *               MK-NW-F-046 historyCoverage · MK-NW-F-061 bondSummary
 *               MK-NW-F-090 windowStartKey · MK-NW-F-125 isPastMaturity
 *               MK-NW-O-003 theNetWorth · MK-PF-F-022 factorOverMonths
 *               MK-XS-F-175 uid · MK-XS-F-192 typedValueDatedBack
 *
 * Reaches ..... 272 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-NW-F-080 HOLD
 *               MK-CF-F-201 INCOME · MK-NW-F-081 LB
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               … and 254 more — the full list is on functions_from_code
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
 * Called by ... MK-NW-F-105 whyNoReturn · MK-NW-F-144 beforeTheRecordSentence
 *               MK-NW-F-148 lastCloseLabel · MK-NW-O-008 thePerformance
 *               MK-PF-F-045 priceHistoryShortSentence
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-NW-F-140 LEFT_OUT
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-093 QUIET_PERF · MK-NW-F-144 beforeTheRecordSentence
 *               MK-NW-F-148 lastCloseLabel · MK-PF-F-045 priceHistoryShortSentence
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

/** A maturity date read as a real calendar day (year, month, day), or nothing when it is missing, written another way, or impossible. */
/* ─ MK-NW-F-124 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * maturityParts
 *
 * Answers ..... A maturity date read as a real calendar day (year, month, day), or nothing when it is missing, written another way, or impossible.
 *
 * Formula .....
 *     m = ÷ ^(\d{4}) − (\d{2})(?:-(\d{2}))?$ ÷ .exec(string(maturity ?? '').trim())
 *     nothing   when m is missing
 *     y = m[1]), mo = number(m[2]), d = m[3] = nothing ? 1 : number(m[3] read as a number
 *     nothing   when mo < 1 (or mo > 12 (or d < 1 (or d > new date(date.UTC(y, mo, 0)).get utcdate() when missing or zero) when missing or zero) when missing or zero)
 *     the answer = [y, mo, d]
 *
 * Called by ... MK-NW-F-009 maturityClass · MK-NW-F-056 bondInfo
 *               MK-NW-F-058 yearsToMaturity · MK-NW-F-061 bondSummary
 *               MK-NW-F-119 estimatedAccrued · MK-NW-F-125 isPastMaturity
 *               MK-NW-F-141 holdingBondFacts · MK-NW-O-001 theBonds
 *               MK-PF-F-047 isIndividualBondOrCD · MK-PF-F-052 purchaseDateOnRecord
 *               MK-ST-F-011 classifyHoldingClass
 *
 * Reaches ..... 266 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-NW-F-080 HOLD
 *               MK-CF-F-201 INCOME · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               … and 248 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-013 bond maturity date
 *
 * Formula also on the master file · functions_from_code · MK-NW-F-124
 * Changed ..... not in git yet (—)
 */
export function maturityParts(maturity?: string | null): [number, number, number] | null {
  // ONE READING OF A MATURITY DATE, EVERYWHERE (outside review OpenAI re-run part 4, MK-NW-F-124, SETTLED 2026-10-13;
  // tenet 4). Every function that reads a maturity date asks this one: whether it is a bond (MK-NW-F-009 maturityClass),
  // whether it has matured, the years left, the interest earned so far, which matures next, the order on the Bonds
  // screen. '2028-2-09' used to be no date to maturityClass and 9 Feb 2028 to the interest, so the bond was not called a
  // bond while its interest used the date. A date is a picked day, never typed (DEC-4059b/c): year-month-day with a
  // two-digit month and day, or a year and month alone read as that month's first day (the old typed box asked for
  // that); spaces round it do not unmake it. A day past the end of its month or a month past December is no date, and
  // never rolls into the next month (DEC-0332). Anything else is no date.
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(String(maturity ?? '').trim());
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = m[3] == null ? 1 : Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > new Date(Date.UTC(y, mo, 0)).getUTCDate()) return null;
  return [y, mo, d];
}
