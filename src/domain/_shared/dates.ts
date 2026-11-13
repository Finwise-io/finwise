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
 *               MK-NW-F-148 lastCloseLabel · MK-NW-F-288 importedListDay
 *               MK-NW-O-003 theNetWorth · MK-PF-F-022 factorOverMonths
 *               MK-ST-F-096 localDay · MK-XS-F-192 typedValueDatedBack
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-219 importedAccountOf
 *               MK-XS-F-221 valueOnlyAccountsOf
 *
 * Reaches ..... 578 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-081 LB
 *               MK-NW-F-097 LEDGER · MK-NW-F-098 LEDGER_BAND
 *               MK-NW-F-140 LEFT_OUT · MK-CF-F-200 LINE
 *               … and 560 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-065
 * Changed ..... not in git yet (—)
 */
export function isoLocalDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** What it is for: THE DAY A STORED DATE MEANS, WHERE THE PERSON IS — "2026-08-01" (2026-10-25, Cash flow drawing match CF-21).
 *  A logged expense or income is stored three ways: a calendar day ("2026-08-01", what the Cash flow sheets write), a clock
 *  time with no zone ("2026-08-01T09:30:00", the Expenses screen), and an instant ("2026-09-01T01:30:00.000Z", what older
 *  builds wrote). `new Date("2026-08-01")` reads a calendar day as midnight in London, which is still Jul 31 in California —
 *  so the budget editor dropped every expense dated the 1st out of its rows. Reading the first seven characters of an
 *  instant files a purchase made on the evening of Aug 31 in September. Every stored day is read here, once:
 *  a calendar day is that day; a clock time with no zone is the day on its clock; an instant is the day it was where the
 *  person is. Anything else is no day (''). */
/* ─ MK-ST-F-096 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * localDay
 *
 * Answers ..... What it is for: THE DAY A STORED DATE MEANS, WHERE THE PERSON IS — "2026-08-01" (2026-10-25, Cash flow drawing match CF-21).
 *
 * Formula .....
 *     s = string(stored ?? '').trim()
 *     s   when ÷ ^\d{4}-\d{2}-\d{2}$ ÷ .test(s)
 *     the first 10 of s   when ÷ ^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$ ÷ .test(s)
 *     ''   when ! ÷ ^\d{4}-\d{2}-\d{2}T ÷ .test(s)
 *     d = the date s
 *     the answer:
 *     ''   if number.is na n(get time())
 *     iso local date(d)   otherwise
 *
 * Called by ... MK-CF-F-014 budgetVsActual · MK-CF-F-148 inMonth
 *               MK-CF-F-151 actualSpending · MK-CF-F-189 essentialsFromLoggedSpending
 *               MK-CF-F-212 receivedInMonth · MK-CF-F-220 pastMonthFlow
 *               MK-CF-F-286 monthBeforeAnyRecord · MK-ST-F-097 localMoment
 *
 * Reaches ..... 570 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 552 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-096
 * Changed ..... not in git yet (—)
 */
export function localDay(stored: unknown): string {
  const s = String(stored ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s)) return s.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(s)) return '';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : isoLocalDate(d);
}

/** What it is for: A STORED DATE AS A MOMENT ON THE PERSON'S OWN CLOCK, for sorting and for writing it in words (2026-10-25).
 *  A calendar day is its own midnight, never London's; a clock time is that time; an instant is that instant. No day → null. */
/* ─ MK-ST-F-097 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * localMoment
 *
 * Answers ..... What it is for: A STORED DATE AS A MOMENT ON THE PERSON'S OWN CLOCK, for sorting and for writing it in words (2026-10-25).
 *
 * Formula .....
 *     day = local day(stored)
 *     nothing   when day is missing
 *     s = string(stored ?? '').trim()
 *     t = the date s
 *     the answer:
 *     nothing   if number.is na n(get time())
 *     t   otherwise
 *
 * Called by ... MK-XS-F-176 useMonthlyStats · MK-XS-F-177 useCategorySpend
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-199 profileOnTheWayIn · MK-XS-F-177 useCategorySpend
 *               MK-XS-F-176 useMonthlyStats
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-097
 * Changed ..... not in git yet (—)
 */
export function localMoment(stored: unknown): Date | null {
  const day = localDay(stored);
  if (!day) return null;
  const s = String(stored ?? '').trim();
  if (s.length === 10) { const [y, m, d] = day.split('-').map(Number); return new Date(y, m - 1, d); }
  const t = new Date(s);
  return Number.isNaN(t.getTime()) ? null : t;
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
 * Called by ... MK-CF-F-184 incomeFromAccounts · MK-NW-F-105 whyNoReturn
 *               MK-NW-F-130 notIncludedSentence · MK-NW-F-144 beforeTheRecordSentence
 *               MK-NW-F-148 lastCloseLabel · MK-NW-O-008 thePerformance
 *               MK-PF-F-045 priceHistoryShortSentence · MK-PF-F-088 valuedByYouWords
 *
 * Reaches ..... 569 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 551 more — the full list is on functions_from_code
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

/** A whole month written the way dateShown writes a day, without the day: "Sep 2027" (2026-10-24, the Bill calendar's span and
 *  its month rows said aloud read "Sep ’27 2027", the year twice — Cash flow journey E2E-80, the lead's ruling). */
/* ─ MK-ST-F-095 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * monthYearShown
 *
 * Answers ..... A whole month written the way dateShown writes a day, without the day: "Sep 2027" (2026-10-24, the Bill calendar's span and its month rows said aloud read "Sep ’27 2027", the year twice — Cash flow journey E2E-80, the lead's ruling).
 *
 * Formula .....
 *     `${MONTH_SHORT[month1to12 − 1]} ${year}`   if year and month1to12
 *     ''   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-095
 * Changed ..... not in git yet (—)
 */
export function monthYearShown(year: number, month1to12: number): string {
  return year && month1to12 ? `${MONTH_SHORT[month1to12 - 1]} ${year}` : '';
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
 *               MK-PF-F-061 firstClose · MK-PF-F-062 calendarDay
 *               MK-ST-F-011 classifyHoldingClass
 *
 * Reaches ..... 568 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 550 more — the full list is on functions_from_code
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

/** What it is for: HOW MANY DAYS A CALENDAR MONTH HAS — 28 in February 2027, 29 in February 2028, 30 in September (2026-10-25,
 *  FIX-BILLS). A bill typed for the 29th, 30th or 31st falls on the last day of a shorter month; it never rolls into the next
 *  month (tenet 4 — the rule maturityParts keeps for a maturity date, DEC-0332). Counted on the calendar, never in hours. */
/* ─ MK-ST-F-098 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * daysInMonth
 *
 * Answers ..... What it is for: HOW MANY DAYS A CALENDAR MONTH HAS — 28 in February 2027, 29 in February 2028, 30 in September (2026-10-25, FIX-BILLS).
 *
 * Formula .....
 *     the date date.UTC(year, month1to12, 0)).get utcdate(
 *
 * Called by ... MK-CF-F-124 nextOccurrence · MK-NW-F-046 historyCoverage
 *               MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 14 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-237 LATER
 *               MK-CF-F-296 LOAD · MK-XS-F-004 buildDatedGrid
 *               MK-CF-F-107 buildPaycheckYear · MK-XS-F-002 dataGaps
 *               MK-CF-F-295 debtLoad · MK-CF-O-017 futurePaycheck
 *               MK-NW-F-046 historyCoverage · MK-CF-F-124 nextOccurrence
 *               MK-CF-F-212 receivedInMonth · MK-CF-F-019 upcomingBills
 *               MK-CF-O-008 whatsComing · MK-CF-F-242 workedLineAmount
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-098
 * Changed ..... not in git yet (—)
 */
export function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

/** What it is for: THE YEAR AND MONTH A TYPED DATE NAMES, AND NOTHING IT DOES NOT (2026-10-25, FIX-BILLS). A vest date is typed
 *  "YYYY-MM" or as a full day: "2027-06" is June 2027; "2027" is that year with no month; a month that is not 1 to 12 is no
 *  month; blank, or anything else, is no date (null) — never this year and never December (his DEC-0003 and DEC-0296, tenet 3). */
/* ─ MK-ST-F-099 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * yearMonthOf
 *
 * Answers ..... What it is for: THE YEAR AND MONTH A TYPED DATE NAMES, AND NOTHING IT DOES NOT (2026-10-25, FIX-BILLS).
 *
 * Formula .....
 *     m = ÷ ^(\d{4})(?:-(\d{1,2}))?(?![\d]) ÷ .exec(string(stored ?? '').trim())
 *     nothing   when m is missing
 *     month = nothing   if m[2] = nothing
 *     m[2] read as a number   otherwise
 *     the answer:
 *     year = m[1] read as a number
 *     month = month   if month ≠ nothing and month ≥ 1 and month ≤ 12
 *     nothing   otherwise
 *
 * Called by ... MK-CF-F-063 rowVestYear · MK-CF-F-258 equityVests
 *               MK-CF-F-270 landsOnce
 *
 * Reaches ..... 577 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 559 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-099
 * Changed ..... not in git yet (—)
 */
export function yearMonthOf(stored: unknown): { year: number; month: number | null } | null {
  const m = /^(\d{4})(?:-(\d{1,2}))?(?![\d])/.exec(String(stored ?? '').trim());
  if (!m) return null;
  const month = m[2] == null ? null : Number(m[2]);
  return { year: Number(m[1]), month: month != null && month >= 1 && month <= 12 ? month : null };
}
