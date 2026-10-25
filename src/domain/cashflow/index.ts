// Cash-flow / bill-calendar function. Turns onboarding answers into a 12-month picture of money IN
import type { OnboardingProfile } from '../onboardingProfile';
// (paychecks, scholarships, loan disbursements, benefits…) vs money OUT (bills by their due months),
// with a running balance so we can flag the months where you'd come up short.
import { toNum } from '../_shared/num';
import {
  grossSalaryMonthly, rsuAnnual, rentalNetAnnual, equityRowValue, salaryGrossByMonth,
  effectiveRate, totalGrossAnnual, taxableAnnual, retirementIncomeMonthly, currentRetirementIncomeMonthly,
  benefitAnnual, benefitActiveMonths, otherIncomeMonth,
} from '../income';
import { spendBuckets, spendByMonth } from '../budget';
import type { DatedGrid } from '../grid';   // a type only: the grid reads equityByMonth from here

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Twelve zeros: an empty year, one slot for each month. */
/* ─ MK-CF-F-121 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * zero12
 *
 * Answers ..... Twelve zeros: an empty year, one slot for each month.
 *
 * Formula .....
 *     the answer = twelve zeros, one per month
 *
 * Called by ... MK-CF-F-018 equityByMonth · MK-CF-F-020 cashflowYear
 *
 * Reaches ..... 10 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-237 LATER
 *               MK-XS-F-004 buildDatedGrid · MK-CF-F-107 buildPaycheckYear
 *               MK-CF-F-020 cashflowYear · MK-CF-F-018 equityByMonth
 *               MK-CF-O-017 futurePaycheck · MK-CF-F-212 receivedInMonth
 *               MK-CF-O-008 whatsComing · MK-CF-F-242 workedLineAmount
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-121
 * Changed ..... not in git yet (—)
 */
function zero12(): number[] { return new Array(12).fill(0); }

/** Level annual equity spread across the months it vests (0 for most students). */
/* ─ MK-CF-F-018 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * equityByMonth
 *
 * Answers ..... Level annual equity spread across the months it vests (0 for most students).
 *
 * Formula .....
 *     rows = op.rsu grants   if array.is array(op.rsu grants)
 *     []   otherwise
 *     type = op.equity type (or 'rsu' when missing)
 *     weights = zero12(); let total = 0
 *     v = equity row value(r, type, op.opt strike, op.opt market)
 *     m = string(date ?? '').match( ÷ \d{4}-(\d{1,2}) ÷ )
 *     idx = min(11, max(0, +m[1] − 1))   if m
 *     11   otherwise
 *     annual = rsu annual(op), out = zero12()
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-CF-F-020 cashflowYear · MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-237 LATER
 *               MK-XS-F-004 buildDatedGrid · MK-CF-F-107 buildPaycheckYear
 *               MK-CF-F-020 cashflowYear · MK-CF-O-017 futurePaycheck
 *               MK-CF-F-212 receivedInMonth · MK-CF-O-008 whatsComing
 *               MK-CF-F-242 workedLineAmount
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in total of 0.
 *     · Uses a built-in d a y m s of 86400000.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-018
 * Changed ..... 2026-07-12 (086b68a)
 */
export function equityByMonth(op: Record<string, any>): number[] {
  const rows = Array.isArray(op.rsuGrants) ? op.rsuGrants : [];
  const type = op.equityType ?? 'rsu';
  const weights = zero12(); let total = 0;
  for (const r of rows) {
    const v = equityRowValue(r, type, op.optStrike, op.optMarket);
    if (v <= 0) continue;
    const m = String(r?.date ?? '').match(/\d{4}-(\d{1,2})/);
    const idx = m ? Math.min(11, Math.max(0, +m[1] - 1)) : 11;
    weights[idx] += v; total += v;
  }
  const annual = rsuAnnual(op), out = zero12();
  if (total > 0) for (let i = 0; i < 12; i++) out[i] = annual * (weights[i] / total);
  return out;
}


// ───────────────────────── Day-level "big bill" planner ─────────────────────────
// Answers the real question for a dated bill (e.g. tuition due Sep 15): on the day you need the
// money in the bank, how much will you actually have — and how much (and by when) to ask whoever
// covers your shortfall. Works at DAY resolution for dated items; steady income/spend accrues daily.
const DAY_MS = 86400000;

/** The number of whole days from one date to another. */
/* ─ MK-CF-F-160 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * daysBetweenDates
 *
 * Answers ..... The number of whole days from one date to another.
 *
 * Formula .....
 *     the answer = round((b − a) in milliseconds ÷ 86,400,000)
 *
 * Called by ... MK-CF-F-019 upcomingBills
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-212 receivedInMonth
 *               MK-CF-F-019 upcomingBills · MK-CF-O-008 whatsComing
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-160
 * Changed ..... not in git yet (—)
 */
function daysBetweenDates(a: Date, b: Date): number { return Math.round((b.getTime() - a.getTime()) / DAY_MS); }

/** The date a given number of days after another date. */
/* ─ MK-CF-F-122 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * addDays
 *
 * Answers ..... The date a given number of days after another date.
 *
 * Formula .....
 *     the answer = d + n × 86,400,000 milliseconds
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
function addDays(d: Date, n: number): Date { return new Date(d.getTime() + n * DAY_MS); }
import { isoLocalDate } from '../_shared/dates';
/** The next time (month, day) occurs on/after `now`, unless an explicit year is given. */
/* ─ MK-CF-F-124 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * nextOccurrence
 *
 * Answers ..... The next time (month, day) occurs on/after `now`, unless an explicit year is given.
 *
 * Formula .....
 *     d0 = day   if day > 0
 *     1   otherwise
 *     the date year, month1to12 − 1, d0   when year and year > 0
 *     d = the date now.get full year(), month1to12 − 1, d0
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
  if (year && year > 0) return new Date(year, month1to12 - 1, d0);
  let d = new Date(now.getFullYear(), month1to12 - 1, d0);
  // THIS MONTH'S BILL IS THIS MONTH'S, even once its day has passed (2026-10-24, found by CJC's E2E-81, placed as the month table
  // places it — buildDatedGrid counts a yearly bill in the next time its MONTH comes, so September's bill seen on Sep 28 is in
  // September's Out; this list dated it Sep 15 of next year, a month the table does not have it in). A passed day is not
  // "coming up": the list leaves it out (daysAway below 0). Only a month already gone rolls to next year.
  if (month1to12 - 1 < now.getMonth()) d = new Date(now.getFullYear() + 1, month1to12 - 1, d0);
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
 *     ms = months   if count of array.is array(months) and months
 *     [1]   otherwise
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
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-032 expenses categories the person set up
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
    const ms = Array.isArray(c?.months) && c.months.length ? c.months : [1];
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

export interface MonthFlow { label: string; inflow: number; outflow: number; net: number; balance: number; }
export interface CashflowYear {
  months: MonthFlow[];
  shortMonths: string[];      // months where the running balance dips below 0
  lowestBalance: number;
  totalIn: number;
  totalOut: number;
  beyondWindow: number;       // dated items (scholarships/loans) that fall outside the next 12 months
}

/** Build the 12-month cash-flow picture. `startBalance` = cash on hand today (default 0).
 *  Salary timing comes from the per-month base-salary table (a $0 month = no pay that month). */
/* ─ MK-CF-F-020 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * cashflowYear
 *
 * Answers ..... Build the 12-month cash-flow picture.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     rate = effective rate(op)
 *     start month = now.get month()
 *     start year = now.get full year()
 *     cal month = (s: number) => (start month + s) % 12
 *     slot of = (m1to12: number) => ((m1to12 − 1) − start month + 12) % 12
 *     now idx = start year × 12 + start month
 *     slot of(m1to12)   when year is missing
 *     idx = year × 12 + (m1to12 − 1) − now idx
 *     the answer:
 *     idx   if idx ≥ 0 and idx < 12
 *     -1   otherwise
 *     beyond window = 0
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-001 account balance
 *               MK-XS-I-023 salary and other income
 *               MK-XS-I-039 how often each income arrives
 *               MK-XS-I-059 the month a bonus lands
 *
 * Decides .....
 *     · Uses a built-in beyond window of 0.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-020
 * Changed ..... 2026-06-09 (e39df23)
 */
export function cashflowYear(op: OnboardingProfile | null, startBalance = 0, now: Date = new Date()): CashflowYear {
  const a = op ?? {};
  const rate = effectiveRate(op);

  // Rolling 12-month window anchored to THIS month, so timing is real: each chosen month maps to
  // its NEXT occurrence (e.g. with "now" = June, "September" = this Sep, "January" = next Jan, which
  // therefore lands AFTER September — never propping up an earlier month's balance).
  const startMonth = now.getMonth();                          // 0–11
  const startYear = now.getFullYear();
  const calMonth = (s: number) => (startMonth + s) % 12;      // calendar month (0–11) at slot s
  const slotOf = (m1to12: number) => ((m1to12 - 1) - startMonth + 12) % 12;   // slot for a calendar month (next occurrence)
  const nowIdx = startYear * 12 + startMonth;
  // slot for an explicit month + year; -1 if outside the next-12-month window. No year → next occurrence.
  const slotForMY = (m1to12: number, year: number) => {
    if (!year) return slotOf(m1to12);
    const idx = year * 12 + (m1to12 - 1) - nowIdx;
    return idx >= 0 && idx < 12 ? idx : -1;
  };
  let beyondWindow = 0;

  // ── money in (net of tax for taxable sources; non-taxable lands in full) ──
  const taxableMo = zero12(), nontaxMo = zero12();
  const salByMonth = salaryGrossByMonth(op), rentalM = rentalNetAnnual(op) / 12;
  const seM = a.seFreq === 'annual' ? toNum(a.seAmount) / 12 : toNum(a.seAmount);
  const invM = toNum(a.invAnnual) / 12;
  const otherFreq = a.otherFreq ?? 'monthly';
  const otherTaxable = a.otherTaxable !== 'no';
  const otherM = otherFreq === 'monthly' ? toNum(a.otherAmount) : otherFreq === 'annual' ? toNum(a.otherAmount) / 12 : 0;
  const eq = equityByMonth(a);
  const retIncM = currentRetirementIncomeMonthly(op), tipsM = toNum(a.tipsMonthly);
  const benM = toNum(a.benefitMonthly); const benSet = new Set(benefitActiveMonths(op));
  for (let s = 0; s < 12; s++) {
    const cm = calMonth(s);
    const sal = salByMonth[cm];                                           // base salary for that calendar month
    const job = sal + (sal > 0 ? tipsM : 0);                              // wage + tips (tips only in paid months)
    taxableMo[s] += job + seM + rentalM + invM + (otherTaxable ? otherM : 0) + eq[cm] + retIncM;
    nontaxMo[s] += (benSet.has(cm + 1) ? benM : 0) + toNum(a.supportMonthly)
      + (otherTaxable ? 0 : otherM);                                        // benefits in THEIR months; gifts non-taxable
  }
  if (toNum(a.bonusAnnual) > 0) taxableMo[slotOf(Math.min(12, Math.max(1, toNum(a.bonusMonth) || 12)))] += toNum(a.bonusAnnual);   // bonus → its month
  if (toNum(a.signingOnetime) > 0) taxableMo[0] += toNum(a.signingOnetime);            // signing → now
  if (otherFreq === 'onetime' && toNum(a.otherAmount) > 0) {
    const slot = slotOf(otherIncomeMonth(op));                              // one-time other → ITS month
    (otherTaxable ? taxableMo : nontaxMo)[slot] += toNum(a.otherAmount);
  }

  // scholarships/grants land on their disbursement months (+ optional year); yearly total split across them
  for (const sc of (Array.isArray(a.scholarships) ? a.scholarships : [])) {
    if (sc?.freq === 'monthly') { for (let s = 0; s < 12; s++) nontaxMo[s] += toNum(sc.amount); continue; }
    const amt = toNum(sc?.amount); if (amt <= 0) continue;
    const ms = Array.isArray(sc?.months) && sc.months.length ? sc.months : null;
    const yr = toNum(sc?.year);
    if (ms) for (const m of ms) { const slot = slotForMY(m, yr); if (slot >= 0) nontaxMo[slot] += amt / ms.length; else beyondWindow++; }
    else for (let s = 0; s < 12; s++) nontaxMo[s] += amt / 12;
  }
  // student loans disburse (per-occurrence amount) in each chosen month (+ optional year) — borrowed cash in
  for (const ln of (Array.isArray(a.loans) ? a.loans : [])) {
    const amt = toNum(ln?.amount); if (amt <= 0) continue;
    const ms = Array.isArray(ln?.months) && ln.months.length ? ln.months : null;
    const yr = toNum(ln?.year);
    if (ms) for (const m of ms) { const slot = slotForMY(m, yr); if (slot >= 0) nontaxMo[slot] += amt; else beyondWindow++; }
    else nontaxMo[0] += amt;   // unspecified → assume this month
  }

  // ── money out (bills by due month) — single source of truth: budget.spendByMonth (calendar),
  //    remapped onto the rolling timeline. ──
  const out = zero12();
  const spendCal = spendByMonth(op);                       // Jan→Dec: monthly bills + non-monthly in their months + uncategorized
  for (let s = 0; s < 12; s++) out[s] += spendCal[calMonth(s)];

  // ── roll into a running balance over the real timeline ──
  let bal = startBalance, totalIn = 0, totalOut = 0;
  const months: MonthFlow[] = Array.from({ length: 12 }, (_, s) => {
    const cm = calMonth(s);
    const yr = startYear + Math.floor((startMonth + s) / 12);
    const label = MONTHS[cm] + (yr > startYear ? ` ’${String(yr).slice(2)}` : '');
    const inflow = taxableMo[s] * (1 - rate) + nontaxMo[s];
    const outflow = out[s];
    bal += inflow - outflow;
    totalIn += inflow; totalOut += outflow;
    return { label, inflow: (inflow), outflow: (outflow), net: (inflow - outflow), balance: (bal) };
  });
  const shortMonths = months.filter((m) => m.balance < -0.005).map((m) => m.label);
  const lowestBalance = (Math.min(...months.map((m) => m.balance)));
  return { months, shortMonths, lowestBalance, totalIn: (totalIn), totalOut: (totalOut), beyondWindow };
}

