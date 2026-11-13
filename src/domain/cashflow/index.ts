// Cash-flow / bill-calendar function. Turns onboarding answers into a 12-month picture of money IN
import type { OnboardingProfile } from '../onboardingProfile';
// (paychecks, scholarships, loan disbursements, benefits…) vs money OUT (bills by their due months),
// with a running balance so we can flag the months where you'd come up short.
import { toNum } from '../_shared/num';
import { equityRowValue } from '../income';
import { isoLocalDate, daysInMonth, yearMonthOf } from '../_shared/dates';   // the app's one reader of a day, a month and a typed date
import type { DatedGrid } from '../grid';   // a type only: the grid reads equityByMonth from here
// MK-CF-F-020 cashflowYear — the second twelve-month table, read by tests only — was RETIRED on 2026-10-25 (FIX-BILLS, the
// outside review's part 8): it taxed the wage with the 401(k) left in, counted reinvested dividends as money arriving and had no
// debt in its outflow ($5,211.17 wage, $611.43 into a 401(k), a $250 loan: $5,128.94 in and $2,000 out, where the month table
// every screen draws, MK-XS-F-004 buildDatedGrid, gives $4,517.51 in and $2,250 out). Its tests read the month table now.

/** Twelve zeros: an empty year, one slot for each month. */
/* ─ MK-CF-F-121 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * zero12
 *
 * Answers ..... Twelve zeros: an empty year, one slot for each month.
 *
 * Formula .....
 *     the answer = twelve zeros, one per month
 *
 * Called by ... MK-CF-F-018 equityByMonth
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
 * Formula also on the master file · functions_from_code · MK-CF-F-121
 * Changed ..... not in git yet (—)
 */
function zero12(): number[] { return new Array(12).fill(0); }

/** What it is for: EVERY VEST WITH A VALUE, AND WHAT ITS DATE NAMES — its year, its month, or what is missing (2026-10-25,
 *  FIX-BILLS). The one reading of a vest's date for the month table: a year and a month place it; a year with no month counts in
 *  that year's total and says "vest month not entered"; no date at all is refused — "vest date not entered" (the lead's ruling on
 *  the outside review's open case, under tenet 3 and his DEC-0296 "an unknown input produces no number and a reason — never a
 *  default"). An undated vest used to land in December, and a year with no month was a year with no month in December too. */
/* ─ MK-CF-F-258 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * equityVests
 *
 * Answers ..... What it is for: EVERY VEST WITH A VALUE, AND WHAT ITS DATE NAMES — its year, its month, or what is missing (2026-10-25, FIX-BILLS).
 *
 * Formula .....
 *     a = op (or none when missing)
 *     rows = rsu grants   if array.is array(rsu grants)
 *     []   otherwise
 *     type = equity type (or 'rsu' when missing)
 *     out = []
 *     amount = equity row value(r, type, opt strike, opt market)
 *     when = year month of(date)
 *     the answer = out
 *
 * Called by ... MK-CF-F-018 equityByMonth · MK-CF-F-064 equityCashFlow
 *               MK-CF-F-065 equityVestWeights · MK-CF-F-066 rsuAnnual
 *               MK-CF-F-079 incomeFromOnboarding · MK-CF-F-088 taxableByCalendarMonth
 *               MK-CF-F-092 incomeMonthlyGrid · MK-CF-F-265 vestsOf
 *               MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 575 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 557 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-258
 * Changed ..... not in git yet (—)
 */
export function equityVests(op: Record<string, any> | null): { amount: number; year: number | null; month: number | null; missing: 'vest month not entered' | 'vest date not entered' | null }[] {
  const a = op ?? {};
  const rows = Array.isArray(a.rsuGrants) ? a.rsuGrants : [];
  const type = a.equityType ?? 'rsu';
  const out: { amount: number; year: number | null; month: number | null; missing: 'vest month not entered' | 'vest date not entered' | null }[] = [];
  for (const r of rows) {
    const amount = equityRowValue(r, type, a.optStrike, a.optMarket);
    if (!(amount > 0)) continue;
    const when = yearMonthOf(r?.date);
    out.push({ amount, year: when?.year ?? null, month: when?.month ?? null,
      missing: !when ? 'vest date not entered' : when.month == null ? 'vest month not entered' : null });
  }
  return out;
}

/** What it is for: WHAT VESTS IN EACH MONTH OF ONE CALENDAR YEAR, January first — each vest's own value in the month and the year
 *  its date names (2026-10-25, FIX-BILLS; his DEC-0012 "shares that vest land in the month they vest on every screen", DEC-0003
 *  "every month you enter carries its own month AND year"). It was the year's run-rate (rsuAnnual) spread over the vest months
 *  with the year ignored: vests in March 2026, June 2027 and December 2027 gave 2026 $4,158.72 in March, $660.60 in June and
 *  $2,105.59 in December; 2026 holds March's $8,317.43 and nothing else. A vest with no month is in no month (equityVests). */
/* ─ MK-CF-F-018 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * equityByMonth
 *
 * Answers ..... What it is for: WHAT VESTS IN EACH MONTH OF ONE CALENDAR YEAR, January first — each vest's own value in the month and the year its date names (2026-10-25, FIX-BILLS; his DEC-0012 "shares that vest land in the month they vest on every screen", DEC-0003 "every month you enter carries its own month AND year").
 *
 * Formula .....
 *     out = zero12()
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-CF-F-063 rowVestYear · MK-CF-F-088 taxableByCalendarMonth
 *               MK-CF-F-092 incomeMonthlyGrid · MK-XS-F-004 buildDatedGrid
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
 * Decides .....
 *     · Uses a built-in d a y m s of 86400000.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-018
 * Changed ..... 2026-07-12 (086b68a)
 */
export function equityByMonth(op: Record<string, any>, year: number): number[] {
  const out = zero12();
  for (const v of equityVests(op)) if (v.year === year && v.month != null) out[v.month - 1] += v.amount;
  return out;
}


// ───────────────────────── Day-level "big bill" planner ─────────────────────────
// Answers the real question for a dated bill (e.g. tuition due Sep 15): on the day you need the
// money in the bank, how much will you actually have — and how much (and by when) to ask whoever
// covers your shortfall. Works at DAY resolution for dated items; steady income/spend accrues daily.
const DAY_MS = 86400000;
// CALENDAR DAYS, NEVER ELAPSED TIME (2026-10-25, FIX-BILLS; his DEC-0189 "every today is the person's OWN calendar day"): the
// three date functions below count and add whole calendar days on the person's own calendar. They worked in milliseconds: a bill
// due today dropped off the list at 13:00 (half a day rounds up to "yesterday"), a bill due 15 March 2027 was asked for a day
// early because the clocks go forward on 14 March (a day that is 23 hours long), and a bill on 29 February was dated 1 March.

/** The number of whole calendar days from one date to another: each date's own calendar day, counted, so 23:59 to 00:01 is one day
 *  and two times on the same day are none. */
/* ─ MK-CF-F-160 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * daysBetweenDates
 *
 * Answers ..... The number of whole calendar days from one date to another: each date's own calendar day, counted, so 23:59 to 00:01 is one day and two times on the same day are none.
 *
 * Formula .....
 *     the answer = the calendar day of b − the calendar day of a (each the local date, counted)
 *
 * Called by ... MK-CF-F-019 upcomingBills
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-212 receivedInMonth
 *               MK-CF-F-019 upcomingBills · MK-CF-O-008 whatsComing
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-160
 * Changed ..... not in git yet (—)
 */
function daysBetweenDates(a: Date, b: Date): number {
  const dayNumber = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS;   // the local day, counted — a whole number
  return dayNumber(b) - dayNumber(a);
}

/** The date a given number of calendar days after another date — the same clock time on that day, however long the days between. */
/* ─ MK-CF-F-122 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * addDays
 *
 * Answers ..... The date a given number of calendar days after another date — the same clock time on that day, however long the days between.
 *
 * Formula .....
 *     the answer = the same clock time, n calendar days after d (year, month, day + n)
 *
 * Called by ... MK-CF-F-019 upcomingBills
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-212 receivedInMonth
 *               MK-CF-F-019 upcomingBills · MK-CF-O-008 whatsComing
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-122
 * Changed ..... not in git yet (—)
 */
function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
}
/** The next time (month, day) occurs on/after `now`, unless an explicit year is given. A day past the end of its month is that
 *  month's last day — a bill on the 29th of February is due the 28th in 2027 — never the first of the next month (tenet 4). */
/* ─ MK-CF-F-124 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * nextOccurrence
 *
 * Answers ..... The next time (month, day) occurs on/after `now`, unless an explicit year is given.
 *
 * Formula .....
 *     d0 = day   if day > 0
 *     1   otherwise
 *     on = (y: number) => new date(y, month1to12 − 1, math.min(d0, days in month(y, month1to12)))
 *     on(year)   when year and year > 0
 *     d = on(now.get full year())
 *     the answer = d
 *
 * Called by ... MK-CF-F-019 upcomingBills
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-212 receivedInMonth
 *               MK-CF-F-019 upcomingBills · MK-CF-O-008 whatsComing
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-124
 * Changed ..... not in git yet (—)
 */
function nextOccurrence(month1to12: number, day: number, now: Date, year?: number): Date {
  const d0 = day > 0 ? day : 1;
  const on = (y: number) => new Date(y, month1to12 - 1, Math.min(d0, daysInMonth(y, month1to12)));
  if (year && year > 0) return on(year);
  let d = on(now.getFullYear());
  // THIS MONTH'S BILL IS THIS MONTH'S, even once its day has passed (2026-10-24, found by CJC's E2E-81, placed as the month table
  // places it — buildDatedGrid counts a yearly bill in the next time its MONTH comes, so September's bill seen on Sep 28 is in
  // September's Out; this list dated it Sep 15 of next year, a month the table does not have it in). A passed day is not
  // "coming up": the list leaves it out (daysAway below 0). Only a month already gone rolls to next year.
  if (month1to12 - 1 < now.getMonth()) d = on(now.getFullYear() + 1);
  return d;
}

export interface UpcomingBill {
  id: string;
  label: string;
  amount: number;
  dueDate: string;          // ISO — when the bill is due
  needByDate: string;       // dueDate − buffer (money must be in the account)
  askByDate: string;        // needByDate − lead (when to request the shortfall)
  availableByNeed: number;  // what is there by the need-by date, read from the month table (balanceByDay)
  shortfall: number;        // how much more you need for this bill
  coverSource: string;      // who/what covers the gap
  daysAway: number;         // days from now until due
}

/** What is there by a day, read from the month table — one way, so the Bill calendar's COMING UP line and its End column cannot
 *  disagree (2026-10-24, Cash flow journey E2E-81; DEC-3523 tenets 1 and 4, DEC-0269). The table knows a month, not the day pay
 *  lands, and never invents one. So by a day, the money there is the End of the month before (the starting balance in this
 *  month), plus what that month brings or takes on a day already passed — aid or a loan on the day it lands, a dated bill on
 *  its day (the 1st when it has none, as the bill list shows it) — and the month's regular money (pay, everyday expenses,
 *  monthly debt payments) only when it takes more out than it brings in. That is the lower of the two month-ends either side
 *  of the day, each counting only what is dated by then. The bill a person is asking about falls after its own need-by day, so
 *  it is never counted against itself. */
/* ─ MK-CF-F-232 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * balanceByDay
 *
 * Answers ..... What is there by a day, read from the month table — one way, so the Bill calendar's COMING UP line and its End column cannot disagree (2026-10-24, Cash flow journey E2E-81; DEC-3523 tenets 1 and 4, DEC-0269).
 *
 * Formula .....
 *     cells = grid.cells
 *     0   when count of cells is missing
 *     start = cells[0].running balance − cells[0].net
 *     slot = (y × 12 + (m − 1)) − (cells[0].year × 12 + (cells[0].calendar month − 1))
 *     start   when slot < 0
 *     cells[11].running balance   when slot > 11
 *     before = start   if slot = 0
 *     cells[slot − 1].running balance   otherwise
 *     cell = cells[slot]
 *     dated by then = 0, dated all = 0
 *     regular = cell.net − dated all
 *     the answer = before + dated by then + min(0, regular)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-019 upcomingBills · MK-CF-F-124 nextOccurrence
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-124 nextOccurrence
 *               MK-CF-F-212 receivedInMonth · MK-CF-F-019 upcomingBills
 *               MK-CF-O-008 whatsComing
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If day is missing it uses 1.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Caps regular at 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-232
 * Changed ..... not in git yet (—)
 */
export function balanceByDay(grid: DatedGrid, dayIso: string): number {
  const cells = grid.cells;
  if (!cells.length) return 0;
  const start = cells[0].runningBalance - cells[0].net;                 // the starting balance the table chains from
  const [y, m, d] = String(dayIso).split('-').map(Number);
  const slot = (y * 12 + (m - 1)) - (cells[0].year * 12 + (cells[0].calendarMonth - 1));
  if (slot < 0) return start;                                           // before this month: what is there now
  if (slot > 11) return cells[11].runningBalance;                       // past the table: its last End
  const before = slot === 0 ? start : cells[slot - 1].runningBalance;
  const cell = cells[slot];
  let datedByThen = 0, datedAll = 0;
  for (const i of cell.incomeItems) if (i.day != null) { datedAll += i.amount; if (i.day <= d) datedByThen += i.amount; }
  for (const b of cell.billItems) if (!b.regular) { datedAll -= b.amount; if ((b.day ?? 1) <= d) datedByThen -= b.amount; }
  const regular = cell.net - datedAll;                                  // the month's pay less its everyday and debt payments
  return before + datedByThen + Math.min(0, regular);
}

/** The dated bills coming due over the next year, each with the day the money must be there, what the month table has there by that day and how much short it would be. */
/* ─ MK-CF-F-019 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * upcomingBills
 *
 * Answers ..... The dated bills coming due over the next year, each with the day the money must be there, what the month table has there by that day and how much short it would be.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     buffer = opts.buffer days (or 2, lead = opts.ask lead days (or 10, horizon = opts.horizon days (or 365 when missing) when missing) when missing)
 *     bills out = []
 *     amt = to num(amount); if (amt ≤ 0) continue
 *     yearly = (amt ÷ 100) × grid.total in   if unit = 'pct'
 *     amt   otherwise
 *     ms = months
 *     cover source = 'your family'   if (income sources ?? []).includes('support')
 *     'your savings or a backup'   otherwise
 *     need by = add days(bill.date, -buffer)
 *     avail = balance by day(grid, iso local date(need by)) − ahead of it
 *     shortfall = max(0, bill.amount − avail)
 *
 * Called by ... MK-CF-O-008 whatsComing
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-212 receivedInMonth
 *               MK-CF-O-008 whatsComing
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-032 expenses categories the person set up
 *               MK-XS-I-040 whether a stream is already being received
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Decides .....
 *     · If buffer days is missing it uses 2.
 *     · If ask lead days is missing it uses 10.
 *     · If horizon days is missing it uses 365.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-019
 * Changed ..... 2026-06-09 (e39df23)
 */
export function upcomingBills(
  op: OnboardingProfile | null,
  grid: DatedGrid,
  now: Date = new Date(),
  opts: { bufferDays?: number; askLeadDays?: number; horizonDays?: number } = {},
): UpcomingBill[] {
  const a = op ?? {};
  const buffer = opts.bufferDays ?? 2, lead = opts.askLeadDays ?? 10, horizon = opts.horizonDays ?? 365;

  // dated bills OUT (non-monthly categories on their due dates). WHAT IS THERE BY EACH ONE'S DAY IS READ FROM THE MONTH TABLE
  // (balanceByDay, 2026-10-24): it was worked a second way here — the take-home before the 401(k) and with no debt payment,
  // spread evenly over the days from today — so on 28 Sep, with $5,000 take-home, $700 of groceries and $2,650 of debt payments
  // a month, the line read about $10,744 by 13 Dec where the table's November End reads $4,950. A bill typed as a share of
  // income is that share of the take-home the table carries over its twelve months, as the table counts it.
  const billsOut: { id: string; label: string; amount: number; date: Date; critical: boolean }[] = [];
  for (const c of (Array.isArray(a.spendCats) ? a.spendCats : [])) {
    if (c?.bucket !== 'nonmonthly') continue;
    const amt = toNum(c?.amount); if (amt <= 0) continue;
    const yearly = c?.unit === 'pct' ? (amt / 100) * grid.totalIn : amt;
    // A BILL WITH NO MONTH HAS NO DATE, SO IT IS NOT LISTED (2026-10-25, FIX-BILLS; MK-CF-M-028 "a date nobody gave would be read
    // as one they did"; DEC-7611 — it is a twelfth a month in the budget and on the month table). A $1,200 yearly bill with no
    // month read "due Jan 1", and the table counted $1,200 in January on top of $100 in every month: $2,300/year.
    if (!(Array.isArray(c?.months) && c.months.length)) continue;
    const ms: number[] = c.months;
    // a one-time bill keeps its YEAR, as the table places it — it was dated at its next month, so a bill for March 2028 was listed
    // as due in March 2027, a month the table does not have it in
    for (const m of ms) billsOut.push({ id: `${c.id}-${m}`, label: c.label ?? c.id ?? 'Bill', amount: yearly / ms.length, date: nextOccurrence(m, toNum(c?.dueDay), now, toNum((c as any)?.year)), critical: (c.tier ?? 'flex') === 'critical' });
  }

  const coverSource = (a.incomeSources ?? []).includes('support') ? 'your family' : 'your savings or a backup';
  const listed = billsOut
    .filter((bill) => { const d = daysBetweenDates(now, bill.date); return d >= 0 && d <= horizon; })
    .sort((x, y) => x.date.getTime() - y.date.getTime());
  return listed
    .map((bill, k) => {
      const needBy = addDays(bill.date, -buffer);
      // A BILL LISTED ABOVE THIS ONE, due after this one's need-by day but by its due date, is not in the table's reading of that
      // day yet, and its money goes first (2026-10-24, E2E-81): two bills due on Dec 15 each read "Covered" by the whole
      // November End, as if the other were not there
      const aheadOfIt = listed.slice(0, k)
        .filter((o) => isoLocalDate(o.date) > isoLocalDate(needBy) && o.date.getTime() <= bill.date.getTime())
        .reduce((t, o) => t + o.amount, 0);
      const avail = balanceByDay(grid, isoLocalDate(needBy)) - aheadOfIt;
      const shortfall = Math.max(0, (bill.amount - avail));
      return {
        id: bill.id, label: bill.label, amount: (bill.amount),
        dueDate: isoLocalDate(bill.date), needByDate: isoLocalDate(needBy), askByDate: isoLocalDate(addDays(needBy, -lead)),
        availableByNeed: (avail), shortfall, coverSource, daysAway: daysBetweenDates(now, bill.date),
      };
    });
}

