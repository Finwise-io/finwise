// Map onboarding answers → the Income domain (blueprint §5 + the Income service spec).
// Captures the full set of job inflows (salary monthly, bonus annual, RSUs valued as
// shares × price, signing bonus one-time), rental property (income − operating expenses),
// and the tax config (SYSTEM_CALCULATED vs MANUAL_OVERRIDE).
import type { UserId } from '../_shared/ids';
import { newEntityId } from '../_shared/ids';
import { toNum, rentFigure } from '../_shared/num';
import { hasMonthlySalaryTable, salaryCalendarYear } from './salary-months';
import { sumMonthsOverEarners, sumOverEarners, earnerWages } from './earners';
import { IncomeDoc, IncomeSource, WhoEarns, DEFAULT_TAX } from './types';
import type { OnboardingProfile } from '../onboardingProfile';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// How many pay periods per year for each salary cadence (hourly = 40 hours a week × 52).
export const SALARY_PERIODS: Record<string, number> = {
  hourly: 2080, weekly: 52, biweekly: 26, monthly: 12, annually: 1,
};

/** Default weekly hours for an hourly worker when they haven't said otherwise. */
export const DEFAULT_HOURS_PER_WEEK = 40;

/** Annual amount of what the user ENTERED (not grossed up) — for display.
 *  Hourly annualizes by the user's actual hours/week × 52 (no fixed 40h assumption). */
/* ─ MK-CF-F-059 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * annualizedEnteredSalary
 *
 * Answers ..... Annual amount of what the user ENTERED (not grossed up) — for display.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     hrs = hours per week read as a number (0 when it is not one) (or DEFAULT_HOURS_PER_WEEK when missing or zero)
 *     the answer = to num(base salary) × hrs × 52
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-039 how often each income arrives
 *               MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-059
 * Changed ..... 2026-06-10 (66e36dc)
 */
export function annualizedEnteredSalary(op: OnboardingProfile | null): number {
  const a = op ?? {};
  if ((a.salaryFreq ?? 'monthly') === 'hourly') {
    const hrs = toNum(a.hoursPerWeek) || DEFAULT_HOURS_PER_WEEK;
    return toNum(a.baseSalary) * hrs * 52;
  }
  return toNum(a.baseSalary) * (SALARY_PERIODS[a.salaryFreq ?? 'monthly'] ?? 12);
}

/** A single entered base amount expressed per month, before tax gross-up (hourly/weekly/… → monthly). */
/* ─ MK-CF-F-130 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * enteredMonthlyRaw
 *
 * Answers ..... A single entered base amount expressed per month, before tax gross-up (hourly/weekly/… → monthly).
 *
 * Formula .....
 *     hrs = hours per week read as a number (0 when it is not one) (or DEFAULT_HOURS_PER_WEEK when missing or zero)
 *     the answer = (to num(base salary) × hrs × 52) ÷ 12
 *
 * Called by ... MK-CF-F-177 wageGrossByMonth
 *
 * Reaches ..... 144 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 126 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-039 how often each income arrives
 *               MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly
 *
 * Decides .....
 *     · If salary freq] is missing it uses 12.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-130
 * Changed ..... not in git yet (—)
 */
function enteredMonthlyRaw(a: Record<string, any>): number {
  if ((a.salaryFreq ?? 'monthly') === 'hourly') {
    const hrs = toNum(a.hoursPerWeek) || DEFAULT_HOURS_PER_WEEK;
    return (toNum(a.baseSalary) * hrs * 52) / 12;
  }
  return (toNum(a.baseSalary) * (SALARY_PERIODS[a.salaryFreq] ?? 12)) / 12;
}

/** Per-month GROSS base salary, Jan→Dec. The `salaryByMonth` table (12 entries) is the source of
 *  truth when present — set $0 for a gap, raise mid-year, etc.; otherwise a single entered amount is
 *  applied to every month. Take-home entries are grossed up (annual net → gross via the tax schedule,
 *  scaled per month so the month-to-month shape is preserved). */
/* ─ MK-CF-F-060 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * salaryGrossByMonth
 *
 * Answers ..... Per-month GROSS base salary, Jan→Dec.
 *
 * Formula .....
 *     sum months over earners(op, (w) => wage gross by month(w))
 *
 * Called by ... MK-CF-F-020 cashflowYear · MK-CF-F-061 grossSalaryMonthly
 *               MK-CF-F-080 jobActiveMonth · MK-CF-F-081 salaryActiveMonths
 *               MK-CF-F-082 salaryAnnual · MK-CF-F-088 taxableByCalendarMonth
 *               MK-CF-F-092 incomeMonthlyGrid · MK-CF-O-004 incomeSummary
 *               MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 141 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 123 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-060
 * Changed ..... 2026-06-09 (e39df23)
 */
export function salaryGrossByMonth(op: OnboardingProfile | null): number[] {
  // THE HOUSEHOLD's wages, month by month — every earner added together. This is the one place the
  // second wage enters the app: MK-CF-F-082 salaryAnnual sums it, MK-CF-F-084 taxableAnnual reads
  // that, and MK-CF-F-090 effectiveRate reads THAT — so the tax band comes off both incomes without
  // a single function above this one changing. Founder ruling 2026-08-27.
  return sumMonthsOverEarners(op, (w) => wageGrossByMonth(w));
}

/** ONE person's wage, month by month, January first. */
/* ─ MK-CF-F-177 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * wageGrossByMonth
 *
 * Answers ..... ONE person's wage, month by month, January first.
 *
 * Formula .....
 *     a = w (or none when missing)
 *     has = has monthly salary table(a as any)
 *     typical = entered monthly raw(a)
 *     the answer = for each of raw: each
 *
 * Called by ... MK-CF-F-060 salaryGrossByMonth · MK-CF-F-092 incomeMonthlyGrid
 *               MK-CF-F-206 householdK401ByMonth
 *
 * Reaches ..... 143 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 125 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-177
 * Changed ..... not in git yet (—)
 */
export function wageGrossByMonth(w: Record<string, any> | null): number[] {
  const a = w ?? {};
  // Keyed by month, read back as this calendar year — the same twelve numbers as before, but the
  // store can now describe a window that crosses a year boundary. See salary-months.ts.
  const has = hasMonthlySalaryTable(a as any);
  // A month the table does not mention reads as their TYPICAL month, never as $0. The rolling frame
  // lets someone describe Aug 2026 → Jul 2027, so a calendar-year view has months they were never
  // asked about; filling those with zero would halve the year's salary on the day they saved it.
  // Silence is not $0 — the same rule as everywhere else in the app.
  const typical = enteredMonthlyRaw(a);
  const raw: number[] = has
    ? salaryCalendarYear(a as any, new Date().getFullYear(), typical)
    : new Array(12).fill(typical);
  // THE GROSS-UP BRANCH IS GONE (build step 2, 2026-08-28). It used to invert the tax schedule here
  // to find a gross that would produce a take-home someone had typed — a guess laid on an estimate,
  // re-run on every read. The approved screen asks for gross AND the take-home as two figures that must
  // reconcile, and a profile saved before that is converted once on its way into the store.
  return raw.map((x) => (x));
}

/** A representative full-month GROSS salary (the highest month — undiluted by $0 gap months). */
/* ─ MK-CF-F-061 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * grossSalaryMonthly
 *
 * Answers ..... A representative full-month GROSS salary (the highest month — undiluted by $0 gap months).
 *
 * Formula .....
 *     arr = salary gross by month(op)
 *     the answer:
 *     max(...arr)   if count of arr
 *     0   otherwise
 *
 * Called by ... MK-CF-F-019 upcomingBills
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-212 receivedInMonth
 *               MK-CF-F-019 upcomingBills · MK-CF-O-008 whatsComing
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-061
 * Changed ..... 2026-06-09 (e39df23)
 */
export function grossSalaryMonthly(op: OnboardingProfile | null): number {
  const arr = salaryGrossByMonth(op);
  return arr.length ? Math.max(...arr) : 0;
}

/** Value of one vesting-schedule row. RSUs vest at face value (shares × price); stock
 *  options are worth their "spread" — count × (market − strike), floored at $0 when
 *  underwater. Options share a single grant-level strike & market price. */
/* ─ MK-CF-F-062 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * equityRowValue
 *
 * Answers ..... Value of one vesting-schedule row.
 *
 * Formula .....
 *     to num(row.shares) × max(0, to num(market) − to num(strike))   when type = 'option'
 *     to num(row.shares) × to num(row.price)
 *
 * Called by ... MK-CF-F-018 equityByMonth · MK-CF-F-064 equityCashFlow
 *               MK-CF-F-065 equityVestWeights · MK-CF-F-066 rsuAnnual
 *
 * Reaches ..... 142 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 124 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *               MK-XS-I-034 option positions — contracts, strike, expiry, put or call
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-062
 * Changed ..... 2026-06-05 (f742136)
 */
export function equityRowValue(row: any, type: string, strike?: any, market?: any): number {
  if (type === 'option') return toNum(row?.shares) * Math.max(0, toNum(market) - toNum(strike));
  return toNum(row?.shares) * toNum(row?.price);
}

/** Calendar year a row vests (first 4 digits of its date; this year if blank). */
/* ─ MK-CF-F-063 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * rowVestYear
 *
 * Answers ..... Calendar year a row vests (first 4 digits of its date; this year if blank).
 *
 * Formula .....
 *     m = string(row.date ?? '').match( ÷ (\d{4}) ÷ )
 *     the answer:
 *     parse int(m[1], 10)   if m
 *     the date ).get full year(   otherwise
 *
 * Called by ... MK-CF-F-064 equityCashFlow · MK-CF-F-066 rsuAnnual
 *
 * Reaches ..... 141 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 123 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-063
 * Changed ..... 2026-06-09 (e39df23)
 */
export function rowVestYear(row: any): number {
  const m = String(row?.date ?? '').match(/(\d{4})/);
  return m ? parseInt(m[1], 10) : new Date().getFullYear();
}

/** Per-calendar-year vesting cash flow across all schedule rows — drives the chart & table. */
/* ─ MK-CF-F-064 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * equityCashFlow
 *
 * Answers ..... Per-calendar-year vesting cash flow across all schedule rows — drives the chart & table.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     type = equity type (or 'rsu' when missing)
 *     rows = rsu grants   if array.is array(rsu grants)
 *     []   otherwise
 *     by year = new map<number, number>()
 *     v = equity row value(r, type, opt strike, opt market)
 *     the answer = for each of [...by year.entries()].sort((x, y) => x[0] − y[0]): [year, amount]) => ({ year, amount }
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-064
 * Changed ..... 2026-06-09 (e39df23)
 */
export function equityCashFlow(op: OnboardingProfile | null): { year: number; amount: number }[] {
  const a = op ?? {};
  const type = a.equityType ?? 'rsu';
  const rows = Array.isArray(a.rsuGrants) ? a.rsuGrants : [];
  const byYear = new Map<number, number>();
  for (const r of rows) {
    const v = equityRowValue(r, type, a.optStrike, a.optMarket);
    if (v > 0) byYear.set(rowVestYear(r), (byYear.get(rowVestYear(r)) ?? 0) + v);
  }
  return [...byYear.entries()].sort((x, y) => x[0] - y[0]).map(([year, amount]) => ({ year, amount }));
}

/** Vest-month weights (Jan→Dec, summing to 1) from the equity grant rows — THE one placement rule.
 *  Walk row 6 (audit PRD #4): every surface that spreads equity across the year reads this, so the
 *  cash-flow grid, the tax vector and the income function's year view land vests in the SAME months
 *  (no more December lump on one screen and March/September on another). Null = no dated grants. */
/* ─ MK-CF-F-065 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * equityVestWeights
 *
 * Answers ..... Vest-month weights (Jan→Dec, summing to 1) from the equity grant rows — THE one placement rule.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     type = equity type (or 'rsu' when missing)
 *     rows = rsu grants   if array.is array(rsu grants)
 *     []   otherwise
 *     weights = 12 slots, each 0
 *     total v = 0
 *     v = equity row value(r, type, opt strike, opt market)
 *     m = string(date ?? '').match( ÷ \d{4}-(\d{1,2}) ÷ )
 *     idx = min(11, max(0, +m[1] − 1))   if m
 *     11   otherwise
 *     the answer = for each of total v > 0 ? weights: each ÷ total v: nothing
 *
 * Called by ... MK-CF-F-079 incomeFromOnboarding · MK-CF-F-088 taxableByCalendarMonth
 *               MK-CF-F-092 incomeMonthlyGrid
 *
 * Reaches ..... 126 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 108 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in total v of 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-065
 * Changed ..... 2026-07-29 (13c9be6)
 */
export function equityVestWeights(op: OnboardingProfile | null): number[] | null {
  const a = op ?? {};
  const type = a.equityType ?? 'rsu';
  const rows = Array.isArray(a.rsuGrants) ? a.rsuGrants : [];
  const weights = new Array(12).fill(0);
  let totalV = 0;
  for (const r of rows) {
    const v = equityRowValue(r, type, a.optStrike, a.optMarket);
    if (v <= 0) continue;
    const m = String(r?.date ?? '').match(/\d{4}-(\d{1,2})/);
    const idx = m ? Math.min(11, Math.max(0, +m[1] - 1)) : 11;
    weights[idx] += v; totalV += v;
  }
  return totalV > 0 ? weights.map((w) => w / totalV) : null;
}

/** Annual equity-comp run-rate: total scheduled value spread over the years it vests across
 *  (a level annual figure for the income estimate). Falls back to legacy single shares/price. */
/* ─ MK-CF-F-066 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rsuAnnual
 *
 * Answers ..... Annual equity-comp run-rate: total scheduled value spread over the years it vests across (a level annual figure for the income estimate).
 *
 * Formula .....
 *     a = op (or none when missing)
 *     type = equity type (or 'rsu' when missing)
 *     rows = rsu grants   if array.is array(rsu grants)
 *     []   otherwise
 *     valued = for each of rows: v = equity row value(r, type, opt strike, opt market)
 *     y = row vest year(r)
 *     total = valued.reduce((t: number, x: any) => t + v, 0)
 *     years = a list with no repeats of valued where v > 0for each of : size (or 1 when missing or zero)
 *     the answer = total ÷ years
 *
 * Called by ... MK-CF-F-018 equityByMonth · MK-CF-F-079 incomeFromOnboarding
 *               MK-CF-F-083 totalGrossAnnual · MK-CF-F-084 taxableAnnual
 *               MK-CF-F-088 taxableByCalendarMonth · MK-CF-F-092 incomeMonthlyGrid
 *               MK-CF-O-016 incomeSources · MK-CF-O-019 theIncomeManager
 *               MK-PL-F-031 taxOrganizer
 *
 * Reaches ..... 139 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 121 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-066
 * Changed ..... 2026-06-09 (e39df23)
 */
export function rsuAnnual(op: OnboardingProfile | null): number {
  const a = op ?? {};
  const type = a.equityType ?? 'rsu';
  const rows = Array.isArray(a.rsuGrants) ? a.rsuGrants : [];
  if (rows.length) {
    const valued = rows.map((r: any) => ({ v: equityRowValue(r, type, a.optStrike, a.optMarket), y: rowVestYear(r) }));
    const total = valued.reduce((t: number, x: any) => t + x.v, 0);
    const years = new Set(valued.filter((x: any) => x.v > 0).map((x: any) => x.y)).size || 1;
    return total / years;
  }
  return toNum(a.rsuShares) * toNum(a.rsuPrice);
}

/** Normalized list of rental properties, read from the `rentals` array. The old single rent figure
 *  (rentalIncome/rentalExpenses/rentalType) is not read: the store moves it into the list once (old-rent-migration.ts). */
/* ─ MK-CF-F-067 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * rentalList
 *
 * Answers ..... Normalized list of rental properties, read from the `rentals` array.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     norm = (t: any): 'long' | 'short' => (t = 'short' ? 'short' : 'long')
 *     rent = (v: any) => rent figure(v) (or 0 when missing)
 *     the answer = []
 *
 * Called by ... MK-CF-F-068 rentalNetAnnual · MK-CF-F-079 incomeFromOnboarding
 *               MK-CF-O-019 theIncomeManager
 *
 * Reaches ..... 139 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 121 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-067
 * Changed ..... 2026-06-09 (e39df23)
 */
export function rentalList(op: OnboardingProfile | null): { type: 'long' | 'short'; income: number; expenses: number }[] {
  const a = op ?? {};
  const norm = (t: any): 'long' | 'short' => (t === 'short' ? 'short' : 'long');
  // DEC-3768c (2026-10-10): a rent or running-cost figure is read by the one strict reader, rentFigure —
  // "about 2k" is not entered (0 here), never $2. toNum is left alone for every other figure.
  const rent = (v: any) => rentFigure(v) ?? 0;
  // A RENT ENTRY WITH NO PROPERTY IS NOT RENT YET (DEC-4059d, 2026-10-10, "10 - approved"): an entry counts only once
  // it names its property in Net worth. Until then it is kept as typed, asks "Which property is it?" in amber on the
  // Income screen, and is counted nowhere — not in income, not in the emergency fund, not as a rental. The old single
  // rent figure (rentalIncome, from before rent entries named a property) names none, so it is not counted either.
  if (Array.isArray(a.rentals)) {
    return a.rentals
      .filter((r: any) => r?.property_id != null && String(r.property_id).trim() !== '')
      .map((r: any) => ({ type: norm(r?.type), income: rent(r?.income), expenses: rent(r?.expenses) }))
      .filter((r: any) => r.income > 0 || r.expenses > 0);
  }
  return [];
}

/** Total net rental income per year, across all properties (income − operating expenses). */
/* ─ MK-CF-F-068 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rentalNetAnnual
 *
 * Answers ..... Total net rental income per year, across all properties (income − operating expenses).
 *
 * Formula .....
 *     Σ over rental list(op) of (income − expenses)× 12
 *
 * Called by ... MK-CF-F-019 upcomingBills · MK-CF-F-020 cashflowYear
 *               MK-CF-F-083 totalGrossAnnual · MK-CF-F-084 taxableAnnual
 *               MK-CF-F-088 taxableByCalendarMonth · MK-CF-F-092 incomeMonthlyGrid
 *               MK-CF-O-004 incomeSummary · MK-CF-O-016 incomeSources
 *               MK-CF-O-019 theIncomeManager · MK-PL-F-031 taxOrganizer
 *               MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 138 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 120 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-068
 * Changed ..... 2026-06-11 (80c3610)
 */
export function rentalNetAnnual(op: OnboardingProfile | null): number {
  return rentalList(op).reduce((t, r) => t + (r.income - r.expenses), 0) * 12;
}

/** Calendar months (1-12) benefits are received — e.g. unemployment that starts in July is
 *  [7..12]. Absent/empty = ongoing, all 12 months. */
/* ─ MK-CF-F-069 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * benefitActiveMonths
 *
 * Answers ..... Calendar months (1-12) benefits are received — e.g.
 *
 * Formula .....
 *     m = array.is array(op.benefit months) ? op!.benefit months! where each ≥ 1 and each ≤ 12: []
 *     the answer:
 *     [...m].sort((a, b) => a − b)   if count of m
 *     [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]   otherwise
 *
 * Called by ... MK-CF-F-020 cashflowYear · MK-CF-F-070 benefitAnnual
 *               MK-CF-F-092 incomeMonthlyGrid · MK-CF-O-004 incomeSummary
 *               MK-CF-O-019 theIncomeManager · MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 138 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 120 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-069
 * Changed ..... 2026-06-11 (80c3610)
 */
export function benefitActiveMonths(op: OnboardingProfile | null): number[] {
  const m = Array.isArray(op?.benefitMonths) ? op!.benefitMonths!.filter((x) => x >= 1 && x <= 12) : [];
  return m.length ? [...m].sort((a, b) => a - b) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
}

/** Annual benefits = monthly amount × the months it's actually received. */
/* ─ MK-CF-F-070 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * benefitAnnual
 *
 * Answers ..... Annual benefits = monthly amount × the months it's actually received.
 *
 * Formula .....
 *     count of to num(op.benefit monthly) × benefit active months(op)
 *
 * Called by ... MK-CF-F-019 upcomingBills · MK-CF-F-071 extraIncome
 *               MK-CF-F-079 incomeFromOnboarding · MK-PL-F-031 taxOrganizer
 *
 * Reaches ..... 137 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 119 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-070
 * Changed ..... 2026-06-11 (7b390f8)
 */
export function benefitAnnual(op: OnboardingProfile | null): number {
  return toNum(op?.benefitMonthly) * benefitActiveMonths(op).length;
}

/** Extra income sources beyond salary/rental/equity (self-employment, investment, benefits, support,
 *  scholarship, other), split into taxable vs non-taxable steady monthly amounts + a one-time Jan amount.
 *  Benefits, support, and scholarships are treated as non-taxable for planning. */
/* ─ MK-CF-F-071 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * extraIncome
 *
 * Answers ..... Extra income sources beyond salary/rental/equity (self-employment, investment, benefits, support, scholarship, other), split into taxable vs non-taxable steady monthly amounts + a one-time Jan amount.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     se m = to num(se amount) ÷ 12   if se freq = 'annual'
 *     se amount read as a number (0 when it is not one)   otherwise
 *     inv m = to num(inv annual) ÷ 12
 *     ben m = benefit annual(a) ÷ 12
 *     sup m = support monthly read as a number (0 when it is not one)
 *     sch list = scholarships   if array.is array(scholarships)
 *     nothing   otherwise
 *     oth freq = other freq (or 'monthly' when missing)
 *     oth m = to num(other amount) ÷ 12   if oth freq = 'annual'
 *     other amount read as a number (0 when it is not one)   if oth freq = 'monthly'
 *     0   otherwise   otherwise
 *     oth once = other amount read as a number (0 when it is not one)   if oth freq = 'onetime'
 *     0   otherwise
 *     oth taxable = other taxable ! = 'no'
 *     reinvested = 0   if inv paid to bank = 'yes'
 *     inv m   otherwise
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-083 totalGrossAnnual · MK-CF-F-084 taxableAnnual
 *               MK-CF-F-088 taxableByCalendarMonth · MK-CF-F-092 incomeMonthlyGrid
 *               MK-CF-O-004 incomeSummary
 *
 * Reaches ..... 136 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 118 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-039 how often each income arrives
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-071
 * Changed ..... 2026-06-11 (7b390f8)
 */
export function extraIncome(op: OnboardingProfile | null): {
  taxableMonthly: number; nontaxMonthly: number; onetimeTaxable: number; onetimeNontax: number;
  reinvestedMonthly: number;
} {
  const a = op ?? {};
  const seM = (a.seFreq === 'annual' ? toNum(a.seAmount) / 12 : toNum(a.seAmount));
  const invM = toNum(a.invAnnual) / 12;
  const benM = benefitAnnual(a) / 12;             // annual average — honors active months
  const supM = toNum(a.supportMonthly);
  const schList = Array.isArray(a.scholarships) ? a.scholarships : null;
  const schM = schList
    ? schList.reduce((t: number, x: any) => t + (x?.freq === 'monthly' ? toNum(x?.amount) : toNum(x?.amount) / 12), 0)
    : (a.scholarshipFreq === 'monthly' ? toNum(a.scholarshipAmount) : toNum(a.scholarshipAmount) / 12);
  const othFreq = a.otherFreq ?? 'monthly';
  const othM = othFreq === 'annual' ? toNum(a.otherAmount) / 12 : othFreq === 'monthly' ? toNum(a.otherAmount) : 0;
  const othOnce = othFreq === 'onetime' ? toNum(a.otherAmount) : 0;
  const othTaxable = a.otherTaxable !== 'no';   // gifts aren't taxable income to the recipient
  // NOTE: tips are job income — handled with salary (gated to active job months), NOT here.
  // TAXED, AND NOT SPENDABLE. Interest and dividends are income you are taxed on, but in most
  // accounts they are reinvested where they are earned and never reach the bank — so they must NOT
  // be counted as money to spend. They were, and that made every surplus, runway and savings figure
  // too generous by the whole dividend: $250/month on $3,000/year. Finding B34, approved mock
  // income-v5 frame 3c. They stay in taxableMonthly, because the tax base is unchanged; what changes
  // is that the income grid now takes this figure back out of the take-home.
  const reinvested = a.invPaidToBank === 'yes' ? 0 : invM;
  return {
    taxableMonthly: (seM + invM + (othTaxable ? othM : 0)),
    nontaxMonthly: (benM + supM + schM + (othTaxable ? 0 : othM)),
    onetimeTaxable: (othTaxable ? othOnce : 0),
    onetimeNontax: (othTaxable ? 0 : othOnce),
    reinvestedMonthly: (reinvested),
  };
}

/** Retirement income (ri_*) counts as CURRENT income only when the user actually receives it
 *  now — i.e. 'retirement_income' is among their selected income sources (or there's no source
 *  list: the legacy retired flow). ri_* set elsewhere (e.g. the outlook's future-Social-Security
 *  editor) feeds the retirement model, NOT today's cash flow — without this gate, a working
 *  40-year-old's future SS inflates today's free cash. */
/* ─ MK-CF-F-072 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * currentRetirementIncomeMonthly
 *
 * Answers ..... Retirement income (ri_*) counts as CURRENT income only when the user actually receives it now — i.e.
 *
 * Formula .....
 *     srcs = op.income sources
 *     0   when array.is array(srcs) and !srcs.includes('retirement_income')
 *     the answer = retirement income monthly(op)
 *
 * Called by ... MK-CF-F-019 upcomingBills · MK-CF-F-020 cashflowYear
 *               MK-CF-F-079 incomeFromOnboarding · MK-CF-F-083 totalGrossAnnual
 *               MK-CF-F-084 taxableAnnual · MK-CF-F-088 taxableByCalendarMonth
 *               MK-CF-F-092 incomeMonthlyGrid · MK-CF-O-004 incomeSummary
 *               MK-CF-O-016 incomeSources · MK-PL-F-031 taxOrganizer
 *               MK-XS-F-004 buildDatedGrid · MK-XS-F-024 resolveLens
 *
 * Reaches ..... 139 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 121 more — the full list is on functions_from_code
 *
 * Serves ...... MK-PL-M-018 · MK-PL-M-032
 * Reads ....... MK-XS-I-020 Social Security monthly amount
 *               MK-XS-I-022 pension monthly amount
 *               MK-XS-I-035 annuity income
 *               MK-XS-I-036 other guaranteed income
 *               MK-XS-I-039 how often each income arrives
 *               MK-XS-I-040 whether a stream is already being received
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-072
 * Changed ..... 2026-06-11 (6224e5b)
 */
export function currentRetirementIncomeMonthly(op: OnboardingProfile | null): number {
  const srcs = op?.incomeSources;
  if (Array.isArray(srcs) && !srcs.includes('retirement_income')) return 0;
  return retirementIncomeMonthly(op);
}

/** Calendar month (1-12) a one-time "other income" lands in (default January). */
/* ─ MK-CF-F-073 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * otherIncomeMonth
 *
 * Answers ..... Calendar month (1-12) a one-time "other income" lands in (default January).
 *
 * Formula .....
 *     min(12, max(1, op.other month read as a number (0 when it is not one) (or 1 when missing or zero)))
 *
 * Called by ... MK-CF-F-020 cashflowYear · MK-CF-F-088 taxableByCalendarMonth
 *               MK-CF-F-092 incomeMonthlyGrid · MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 126 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 108 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-073
 * Changed ..... 2026-06-11 (7b390f8)
 */
export function otherIncomeMonth(op: OnboardingProfile | null): number {
  return Math.min(12, Math.max(1, toNum(op?.otherMonth) || 1));
}

/** Tips are part of employment income — they only count in the months the job is active, and the
 *  annual figure is prorated like salary (a temp job that ends stops the tips too). */
/* ─ MK-CF-F-074 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * tipsAnnual
 *
 * Answers ..... Tips are part of employment income — they only count in the months the job is active, and the annual figure is prorated like salary (a temp job that ends stops the tips too).
 *
 * Formula .....
 *     to num((op ?? {}).tips monthly) × salary active months(op, now)
 *
 * Called by ... MK-CF-F-079 incomeFromOnboarding · MK-CF-F-083 totalGrossAnnual
 *               MK-CF-F-084 taxableAnnual · MK-PL-F-031 taxOrganizer
 *
 * Reaches ..... 135 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 117 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-023 salary and other income
 *               MK-XS-I-039 how often each income arrives
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-074
 * Changed ..... 2026-06-09 (1db8c6b)
 */
export function tipsAnnual(op: OnboardingProfile | null, now: Date = new Date()): number {
  return toNum((op ?? {}).tipsMonthly) * salaryActiveMonths(op, now);
}

/** Per-month divisor for a cadence (monthly=1, quarterly=3, annual=12). */
const RI_CAD_DIV: Record<string, number> = { monthly: 1, quarterly: 3, annual: 12 };

/** Retirement income (Social Security, pension, withdrawals, RMDs, annuities) per month — taxable.
 *  Each source carries its own cadence in `ri_<k>_freq`; normalize to per-month. */
/* ─ MK-CF-F-075 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * retirementIncomeMonthly
 *
 * Answers ..... Retirement income (Social Security, pension, withdrawals, RMDs, annuities) per month — taxable.
 *
 * Formula .....
 *     a = op (or none when missing)
 *
 * Called by ... MK-CF-F-072 currentRetirementIncomeMonthly · MK-CF-F-210 annualOfSource
 *               MK-CF-O-016 incomeSources · MK-CF-O-019 theIncomeManager
 *
 * Reaches ..... 140 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 122 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-020 Social Security monthly amount
 *               MK-XS-I-022 pension monthly amount
 *               MK-XS-I-035 annuity income
 *               MK-XS-I-036 other guaranteed income
 *               MK-XS-I-037 required-withdrawal income stream (ri_rmd)
 *               MK-XS-I-038 withdrawal income stream (ri_withdrawals)
 *               MK-XS-I-039 how often each income arrives
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-075
 * Changed ..... 2026-08-20 (16a56f7)
 */
export function retirementIncomeMonthly(op: OnboardingProfile | null): number {
  const a = op ?? {};
  return ['ss', 'pension', 'withdrawals', 'rmd', 'annuities', 'other']
    .reduce((t, k) => t + toNum((a as any)['ri_' + k]) / (RI_CAD_DIV[(a as any)['ri_' + k + '_freq']] ?? 1), 0);
}

/** B1 + B5 (founder brief 2026-08-20): the PLAN's guaranteed-income input, as separate streams of
 *  OUTSIDE money only. Social Security defaults to INFLATING (COLA); pensions, annuities and other
 *  income default FLAT — most private pensions are, and the error direction of that default is
 *  conservative. A per-source override (`ri_<k>_inflates`) wins when the person has set it.
 *  Withdrawals and RMDs are EXCLUDED here by design: they are what the simulation computes —
 *  counting them as income lets the pot fund itself, and the odds rise the more a person spends.
 *  The paycheck DISPLAY still lists every line via retirementIncomeMonthly above. */
export interface GuaranteedStream { kind: 'ss' | 'pension' | 'annuity' | 'other'; monthly: number; inflates: boolean }

/** The guaranteed income that comes from outside the person's own savings, one row for each source that pays anything: Social Security, a pension, an annuity or another, each as a monthly amount with whether it rises with prices. */
/* ─ MK-CF-F-076 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * guaranteedOutsideStreams
 *
 * Answers ..... The guaranteed income that comes from outside the person's own savings, one row for each source that pays anything: Social Security, a pension, an annuity or another, each as a monthly amount with whether it rises with prices.
 *
 * Formula .....
 *     a = (op ?? {}) as any
 *     per = (k: string) => to num(a['ri_' + k]) ÷ (RI_CAD_DIV[a['ri_' + k + '_freq']] ?? 1)
 *     flag = (k: string, dflt: boolean) => (typeof a['ri_' + k + '_inflates'] = 'boolean' ? a['ri_' + k + '_inflates'] : dflt)
 *     the answer = rows where monthly > 0
 *
 * Called by ... MK-CF-F-210 annualOfSource · MK-CF-O-017 futurePaycheck
 *               MK-PL-F-067 willItLastInputs · MK-XS-F-031 buildSnapshot
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-210 annualOfSource · MK-XS-F-031 buildSnapshot
 *               MK-CF-O-017 futurePaycheck · MK-PL-F-068 selectWillItLast
 *               MK-XS-F-032 snapshotFromOnboarding · MK-PL-F-067 willItLastInputs
 *
 * Serves ...... MK-CF-M-022 · MK-CF-M-023
 * Reads ....... MK-XS-I-020 Social Security monthly amount
 *               MK-XS-I-022 pension monthly amount
 *               MK-XS-I-035 annuity income
 *               MK-XS-I-036 other guaranteed income
 *               MK-XS-I-039 how often each income arrives
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-076
 * Changed ..... 2026-08-20 (16a56f7)
 */
export function guaranteedOutsideStreams(op: OnboardingProfile | null): GuaranteedStream[] {
  const a = (op ?? {}) as any;
  const per = (k: string) => toNum(a['ri_' + k]) / (RI_CAD_DIV[a['ri_' + k + '_freq']] ?? 1);
  const flag = (k: string, dflt: boolean) => (typeof a['ri_' + k + '_inflates'] === 'boolean' ? a['ri_' + k + '_inflates'] : dflt);
  const rows: GuaranteedStream[] = [
    { kind: 'ss', monthly: per('ss'), inflates: flag('ss', true) },
    { kind: 'pension', monthly: per('pension'), inflates: flag('pension', false) },
    { kind: 'annuity', monthly: per('annuities'), inflates: flag('annuities', false) },
    { kind: 'other', monthly: per('other'), inflates: flag('other', false) },
  ];
  return rows.filter((r) => r.monthly > 0);
}

/** Scholarships/grants placed in the calendar months they actually land (Jan→Dec) — NOT averaged.
 *  A yearly award is split across the months chosen; a monthly award repeats every month. */
/* ─ MK-CF-F-077 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * scholarshipByCalendarMonth
 *
 * Answers ..... Scholarships/grants placed in the calendar months they actually land (Jan→Dec) — NOT averaged.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     out = 12 slots, each 0
 *     list = scholarships   if array.is array(scholarships)
 *     nothing   otherwise
 *     amt = to num(sc.amount); if (amt ≤ 0) continue
 *     months = sc.months   if count of array.is array(sc.months) and sc.months
 *     nothing   otherwise
 *     amt = scholarship amount read as a number (0 when it is not one)
 *     the answer = out
 *
 * Called by ... MK-CF-F-092 incomeMonthlyGrid
 *
 * Reaches ..... 125 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 107 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-077
 * Changed ..... 2026-06-09 (e39df23)
 */
export function scholarshipByCalendarMonth(op: OnboardingProfile | null): number[] {
  const a = op ?? {};
  const out = new Array(12).fill(0);
  const list = Array.isArray(a.scholarships) ? a.scholarships : null;
  if (list) {
    for (const sc of list) {
      const amt = toNum(sc?.amount); if (amt <= 0) continue;
      if (sc?.freq === 'monthly') { for (let i = 0; i < 12; i++) out[i] += amt; continue; }
      const months = Array.isArray(sc?.months) && sc.months.length ? sc.months : null;
      if (months) for (const m of months) out[Math.min(11, Math.max(0, m - 1))] += amt / months.length;
      else for (let i = 0; i < 12; i++) out[i] += amt / 12;
    }
  } else {
    const amt = toNum(a.scholarshipAmount);
    if (amt > 0) { const m = a.scholarshipFreq === 'monthly' ? amt : amt / 12; for (let i = 0; i < 12; i++) out[i] += m; }
  }
  return out;
}

/** Employer match resolved to $/month. A % is of YOUR 401(k) contribution (e.g. a
 *  "50% match" adds half of what you put in), not of salary. */
/* ─ MK-CF-F-078 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * employerMatchMonthly
 *
 * Answers ..... Employer match resolved to $/month.
 *
 * Formula .....
 *     sum over earners(op, wage match monthly)
 *
 * Called by ... MK-CF-F-079 incomeFromOnboarding · MK-NW-F-041 monthlyContributionsFromOnboarding
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-031 buildSnapshot · MK-XS-F-030 effectiveAnnualContribution
 *               MK-CF-O-017 futurePaycheck · MK-CF-F-079 incomeFromOnboarding
 *               MK-NW-F-041 monthlyContributionsFromOnboarding · MK-PL-F-068 selectWillItLast
 *               MK-XS-F-032 snapshotFromOnboarding · MK-PL-F-067 willItLastInputs
 *
 * Serves ...... MK-MN-M-014
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-078
 * Changed ..... 2026-06-09 (e39df23)
 */
export function employerMatchMonthly(op: OnboardingProfile | null): number {
  // Every earner's section carries its own 401(k) and its own match (approved mock, frames 2b-2c),
  // so the household figure is the sum. One earner is the sum of one.
  return sumOverEarners(op, wageMatchMonthly);
}

/** ONE person's employer match: a share of their own contribution, or a flat amount. */
/* ─ MK-CF-F-178 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * wageMatchMonthly
 *
 * Answers ..... ONE person's employer match: a share of their own contribution, or a flat amount.
 *
 * Formula .....
 *     a = w (or none when missing)
 *     val = employer match value read as a number (0 when it is not one)
 *     the answer:
 *     (to num(c 401k) × val) ÷ 100   if employer match mode = 'pct'
 *     val   otherwise
 *
 * Called by ... MK-CF-F-078 employerMatchMonthly
 *
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-031 buildSnapshot · MK-XS-F-030 effectiveAnnualContribution
 *               MK-CF-F-078 employerMatchMonthly · MK-CF-O-017 futurePaycheck
 *               MK-CF-F-079 incomeFromOnboarding · MK-NW-F-041 monthlyContributionsFromOnboarding
 *               MK-PL-F-068 selectWillItLast · MK-XS-F-032 snapshotFromOnboarding
 *               MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-043 their own retirement contribution
 *               MK-XS-I-046 how the employer match is expressed — percent or dollars
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-178
 * Changed ..... not in git yet (—)
 */
export function wageMatchMonthly(w: Record<string, any> | null): number {
  const a = w ?? {};
  const val = toNum(a.employerMatchValue);
  return a.employerMatchMode === 'pct' ? (toNum(a.c_401k) * val) / 100 : val;
}

/** Turns the income answers given during setup into the list of income sources the app stores. */
/* ─ MK-CF-F-079 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * incomeFromOnboarding
 *
 * Answers ..... Turns the income answers given during setup into the list of income sources the app stores.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     who = who earns as who earns (or 'you' when missing)
 *     sources = []
 *     vest w = equity vest weights(op)
 *     the answer:
 *     user id = uid
 *     sources = sources
 *     tax = tax
 *
 * Called by ... MK-XS-F-031 buildSnapshot
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-031 buildSnapshot · MK-XS-F-032 snapshotFromOnboarding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-023 salary and other income
 *               MK-XS-I-024 logged expenses
 *               MK-XS-I-039 how often each income arrives
 *               MK-XS-I-059 the month a bonus lands
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-079
 * Changed ..... 2026-06-09 (e39df23)
 */
export function incomeFromOnboarding(uid: UserId, op: OnboardingProfile | null): IncomeDoc {
  const a = op ?? {};
  const who = (a.whoEarns as WhoEarns) ?? 'you';
  const sources: IncomeSource[] = [];
  const add = (label: string, type: IncomeSource['income_type'], gross: number,
               frequency: IncomeSource['frequency'], extra: Partial<IncomeSource> = {}) => {
    if (gross > 0) sources.push({
      income_source_id: newEntityId('inc'), label, income_type: type, gross_amount: gross,
      frequency, operating_expenses: 0, who_earns: who, ...extra,
    });
  };

  // B-34: book the TRUE annual salary (sum of the by-month table), expressed as a monthly average so
  // the employer-match annualization stays correct. Using the max month here inflated income for
  // anyone with $0 gap months (e.g. 6-on/6-off), and disagreed with totalGrossAnnual elsewhere.
  add('Base salary', 'W2_JOB', salaryAnnual(op) / 12, 'MONTHLY', { employer_match_amount: employerMatchMonthly(op) });
  add('Bonus', 'W2_JOB', toNum(a.bonusAnnual), 'ANNUAL', { landing_month: Math.min(12, Math.max(1, toNum(a.bonusMonth) || 12)) });
  // Walk row 6 (audit PRD #4): the equity source lands in its VEST months (the same shared weights
  // the cash-flow grid uses), not a default December lump. No dated grants → legacy December stays.
  const vestW = equityVestWeights(op);
  add('Equity comp', 'W2_JOB', rsuAnnual(op), 'ANNUAL',
      vestW ? { landing_months: vestW.map((share, i) => ({ month: i + 1, share })).filter((x) => x.share > 0) } : {});
  add('Signing bonus', 'W2_JOB', toNum(a.signingOnetime), 'ONETIME', { landing_month: 1 });

  for (const r of rentalList(op)) sources.push({
    income_source_id: newEntityId('inc'), label: 'Rental property',
    income_type: r.type === 'short' ? 'SHORT_TERM_RENTAL' : 'LONG_TERM_RENTAL',
    gross_amount: r.income, frequency: 'MONTHLY', operating_expenses: r.expenses, who_earns: who,
  });

  // Additional sources (self-employment, investment, benefits, support, scholarship, other)
  add('Tips', 'W2_JOB', tipsAnnual(op) / 12, 'MONTHLY');   // B-34: tips ride with worked months, not a flat ×12
  add('Retirement income', 'OTHER', currentRetirementIncomeMonthly(op), 'MONTHLY');
  add('Self-employment', 'SELF_EMPLOYMENT', a.seFreq === 'annual' ? toNum(a.seAmount) : toNum(a.seAmount), a.seFreq === 'annual' ? 'ANNUAL' : 'MONTHLY');
  add('Interest & dividends', 'INVESTMENT', toNum(a.invAnnual), 'ANNUAL');
  add('Benefits', 'BENEFIT', benefitAnnual(a) / 12, 'MONTHLY');
  add('Child support / alimony', 'SUPPORT', toNum(a.supportMonthly), 'MONTHLY');
  if (Array.isArray(a.scholarships)) {
    for (const x of a.scholarships) add(x?.label?.trim() || 'Scholarship / grant', 'SCHOLARSHIP', toNum(x?.amount), x?.freq === 'monthly' ? 'MONTHLY' : 'ANNUAL');
  } else {
    add('Scholarship / grant', 'SCHOLARSHIP', toNum(a.scholarshipAmount), a.scholarshipFreq === 'monthly' ? 'MONTHLY' : 'ANNUAL');
  }
  add(a.otherLabel?.trim() || 'Other income', 'OTHER', toNum(a.otherAmount),
      a.otherFreq === 'annual' ? 'ANNUAL' : a.otherFreq === 'onetime' ? 'ONETIME' : 'MONTHLY',
      { landing_month: Math.min(12, Math.max(1, toNum(a.otherMonth) || 1)) });

  const tax = a.taxMode === 'manual'
    ? { use_manual_tax_override: true, manual_effective_tax_rate: Math.min(Math.max(toNum(a.manualTaxRate) / 100, 0), 1) }
    : { ...DEFAULT_TAX };  // system-calculated (progressive estimate)

  return { user_id: uid, sources, tax };
}

/** Is base salary present in calendar month i (0-11)? Driven by the per-month table. */
/* ─ MK-CF-F-080 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * jobActiveMonth
 *
 * Answers ..... Is base salary present in calendar month i (0-11)?
 *
 * Formula .....
 *     salary gross by month(op)[((i % 12) + 12) % 12] > 0
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-080
 * Changed ..... 2026-06-09 (e39df23)
 */
export function jobActiveMonth(op: OnboardingProfile | null, i: number, _now: Date = new Date()): boolean {
  return salaryGrossByMonth(op)[((i % 12) + 12) % 12] > 0;
}
/** How many months of the year you draw a salary. */
/* ─ MK-CF-F-081 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * salaryActiveMonths
 *
 * Answers ..... How many months of the year you draw a salary.
 *
 * Formula .....
 *     salary gross by month(op) where each > 0count of
 *
 * Called by ... MK-CF-F-074 tipsAnnual
 *
 * Reaches ..... 136 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 118 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-081
 * Changed ..... 2026-06-09 (e39df23)
 */
export function salaryActiveMonths(op: OnboardingProfile | null, _now: Date = new Date()): number {
  return salaryGrossByMonth(op).filter((x) => x > 0).length;
}
/** Salary income for the year = sum of the per-month gross salary. */
/* ─ MK-CF-F-082 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * salaryAnnual
 *
 * Answers ..... Salary income for the year = sum of the per-month gross salary.
 *
 * Formula .....
 *     Σ over salary gross by month(op) of (each)
 *
 * Called by ... MK-CF-F-079 incomeFromOnboarding · MK-CF-F-083 totalGrossAnnual
 *               MK-CF-F-084 taxableAnnual · MK-CF-F-181 rateInForce
 *               MK-CF-F-210 annualOfSource · MK-CF-O-004 incomeSummary
 *               MK-PL-F-031 taxOrganizer
 *
 * Reaches ..... 135 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 117 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-023 salary and other income
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-082
 * Changed ..... 2026-06-11 (6224e5b)
 */
export function salaryAnnual(op: OnboardingProfile | null, _now: Date = new Date()): number {
  return salaryGrossByMonth(op).reduce((t, x) => t + x, 0);
}

/** Total annual income across every inflow (salary for months worked + bonus + signing + equity + net
 *  rental + self-employment/investment/benefits/support/scholarship/other). Includes non-taxable income. */
/* ─ MK-CF-F-083 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * totalGrossAnnual
 *
 * Answers ..... Total annual income across every inflow (salary for months worked + bonus + signing + equity + net rental + self-employment/investment/benefits/support/scholarship/other).
 *
 * Formula .....
 *     a = op (or none when missing)
 *     ex = extra income(op)
 *
 * Called by ... MK-CF-F-019 upcomingBills · MK-CF-F-091 userCapGainsRates
 *               MK-PL-F-067 willItLastInputs
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-O-017 futurePaycheck
 *               MK-CF-F-212 receivedInMonth · MK-PL-F-068 selectWillItLast
 *               MK-CF-F-019 upcomingBills · MK-CF-F-091 userCapGainsRates
 *               MK-CF-O-008 whatsComing · MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-023 salary and other income
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-083
 * Changed ..... 2026-06-11 (6224e5b)
 */
export function totalGrossAnnual(op: OnboardingProfile | null, now: Date = new Date()): number {
  const a = op ?? {};
  const ex = extraIncome(op);
  return salaryAnnual(op, now) + tipsAnnual(op, now) + toNum(a.bonusAnnual) + toNum(a.signingOnetime) + rsuAnnual(op) + rentalNetAnnual(op)
    + ex.taxableMonthly * 12 + ex.nontaxMonthly * 12 + ex.onetimeTaxable + ex.onetimeNontax + currentRetirementIncomeMonthly(op) * 12;
}

/** Taxable annual income (excludes non-taxable benefits/support/scholarships) — the base for tax estimates. */
/* ─ MK-CF-F-084 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * taxableAnnual
 *
 * Answers ..... Taxable annual income (excludes non-taxable benefits/support/scholarships) — the base for tax estimates.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     ex = extra income(op)
 *
 * Called by ... MK-CF-F-019 upcomingBills · MK-CF-F-181 rateInForce
 *               MK-CF-O-004 incomeSummary
 *
 * Reaches ..... 130 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 112 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-023 salary and other income
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-084
 * Changed ..... 2026-07-14 (d33a0a4)
 */
export function taxableAnnual(op: OnboardingProfile | null, now: Date = new Date()): number {
  const a = op ?? {};
  const ex = extraIncome(op);
  return salaryAnnual(op, now) + tipsAnnual(op, now) + toNum(a.bonusAnnual) + toNum(a.signingOnetime) + rsuAnnual(op) + rentalNetAnnual(op)
    + ex.taxableMonthly * 12 + ex.onetimeTaxable + currentRetirementIncomeMonthly(op) * 12;
}

/** Effective tax rate in use: the user's manual rate, else the IRS-schedule estimate on taxable income. */
/** PRD F9#14 — filing status + optional flat state rate, read from the profile in ONE place. */
/* ─ MK-CF-F-085 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * filingStatusOf
 *
 * Answers ..... Effective tax rate in use: the user's manual rate, else the IRS-schedule estimate on taxable income.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     who = who earns
 *     the answer:
 *     'married'   if has spouse = 'yes' (or who = 'both' (or who = 'partner' when missing or zero) when missing or zero)
 *     'single'   otherwise
 *     v = filing status
 *
 * Called by ... MK-CF-F-091 userCapGainsRates · MK-CF-F-181 rateInForce
 *               MK-CF-F-186 convertTakeHomeMode · MK-CF-O-004 incomeSummary
 *               MK-CF-O-019 theIncomeManager · MK-PL-F-067 willItLastInputs
 *               MK-PL-F-082 taxableIncomeSteps
 *
 * Reaches ..... 135 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 117 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-085
 * Changed ..... 2026-07-14 (d33a0a4)
 */
export function filingStatusOf(op: OnboardingProfile | null): import('./tax').FilingStatus {
  const a: any = op ?? {};
  // THE PRE-ANSWER IS REAL, NOT COSMETIC. Someone who has told us they have a spouse and has not yet
  // reached the filing question is far likelier to file jointly than singly — and until 2026-08-27
  // this fell back to 'single' for them, which is finding B31: every couple taxed as one person, on
  // five surfaces, worth $328–$866/month. The screen still asks, and their answer always wins.
  if (a.filingStatus == null || a.filingStatus === '') {
    // Saying "Both of us" (or "Just my spouse") on the base-pay screen is telling us there is a
    // spouse, even though the spouse QUESTION comes later in the flow. Build 54 banded a
    // two-earner household as single because this read only hasPartner — 32% where jointly reads
    // 24% (founder's device test, 2026-09-02). Assumed status is STATED on screen, and the filing
    // answer still always wins.
    const who = a.whoEarns;
    return a.hasPartner === 'yes' || who === 'both' || who === 'partner' ? 'married' : 'single';
  }
  const v = a.filingStatus;
  return v === 'married' || v === 'mfs' || v === 'hoh' ? v : 'single';
}

/** The state income tax rate the person entered, as a share, held between 0% and 15%. */
/* ─ MK-CF-F-086 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * stateRateOf
 *
 * Answers ..... The state income tax rate the person entered, as a share, held between 0% and 15%.
 *
 * Formula .....
 *     min(0.15, max(0, to num((op as any).state tax rate) ÷ 100))
 *
 * Called by ... MK-CF-F-091 userCapGainsRates · MK-CF-F-181 rateInForce
 *               MK-PL-F-067 willItLastInputs
 *
 * Reaches ..... 133 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 115 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-086
 * Changed ..... 2026-07-14 (d33a0a4)
 */
export function stateRateOf(op: OnboardingProfile | null): number {
  return Math.min(0.15, Math.max(0, toNum((op as any)?.stateTaxRate) / 100));
}

/** THE ONE per-calendar-month tax-rate vector (Jan→Dec) — PRD F2#11 as his later rulings left it
 *  (2026-10-04): the rate in force, the same in every month, whether the person gave it or the app
 *  calculated it. Σ monthly tax === the year's tax EXACTLY, and both money grids (this module's and
 *  the dated F2 grid) read THIS vector, so they cannot disagree on take-home. */

/** The tax rate for each of the twelve months, as a share: the one rate in force in every month — the person's own where they gave one, otherwise the calculated rate. */
/* ─ MK-CF-F-087 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * monthlyTaxRates
 *
 * Answers ..... The tax rate for each of the twelve months, as a share: the one rate in force in every month — the person's own where they gave one, otherwise the calculated rate.
 *
 * Formula .....
 *     flat = effective rate(op)
 *     12 slots, each flat   when the person's own rate is in force
 *     taxable = taxable by calendar month(op, now)
 *     12 slots, each flat   when Σ taxable ≤ 0
 *     tax = progressive monthly tax(taxable, filing status, state rate, people 65+)
 *     the answer: for each month, min(60%, max(0, tax ÷ taxable))   if taxable > 0, else flat
 *
 * Called by ... MK-CF-F-092 incomeMonthlyGrid · MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 125 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 107 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-087
 * Changed ..... 2026-08-20 (764ca16)
 */
export function monthlyTaxRates(op: OnboardingProfile | null, now: Date = new Date()): number[] {
  // ONE RATE, EVERY MONTH — theirs when they gave one, the calculated one when they did not.
  // Until 2026-10-04 a calculated rate was laid on the months by filling the tax bands as the year
  // went on, so a steady $7,000 salary read $7,000 of take-home in January and February (no tax yet)
  // and $5,460 in December. No payslip does that: an employer withholds the same from every equal
  // pay cheque. It also made the base-pay card ("≈$6,196/month", level) and the Cash flow months
  // disagree about the same take-home, and gave the Income summary rows that did not add up to its
  // total and a "standout month" that was only January being untaxed. His ruling of 2026-08-28 (G46)
  // is that the rate is used "everywhere your take-home matters — cash flow, budget, the surplus";
  // that now holds for the calculated rate as it did for a typed one. The year's tax is unchanged.
  return new Array(12).fill(effectiveRate(op));
}

/** THE HOUSEHOLD'S 401(k) CONTRIBUTIONS, MONTH BY MONTH — every earner's, in the months that earner
 *  is actually paid.
 *
 *  It exists because of a defect that had survived three fixes of the same class. MK-CF-F-060
 *  salaryGrossByMonth sums EVERY earner's wage — "the one place the second wage enters the app"
 *  (founder ruling 2026-08-27) — but the 401(k) taken off that household gross was written
 *  `toNum(a.c_401k)`, which reads the FIRST earner's contribution only. A spouse's sits inside
 *  `partnerWage`, so it was never subtracted anywhere the grid is read.
 *
 *  Two things followed, on every household where a spouse contributes:
 *   · the take-home was too HIGH by the spouse's contribution, and
 *   · the taxable base was too HIGH by the same, so the tax rate was set on money never taxed.
 *
 *  It is the third appearance of one class. B05 (founder audit 2026-08-26) was the 401(k) being
 *  taxed at all. The 2026-08-27 row records the same pattern again — "a second implementation cannot
 *  be fixed by fixing the first". And his 2026-09-12 ruling on income-end-to-end v07 is this exact
 *  symptom one screen over: the household row read ≈$10,442/month over a take-home line of ≈$9,242
 *  — "one card disagreeing with itself; corrected to ≈$9,242". The lines are right; the total follows
 *  them. This function is what makes that true in the code rather than in a mock.
 *
 *  Per EARNER per MONTH, not per household: in a month where only one of them is paid, only that one
 *  contributes — which is the rule the single-earner code already carried, kept exactly.
 */
/* ─ MK-CF-F-206 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * householdK401ByMonth
 *
 * Answers ..... THE HOUSEHOLD'S 401(k) CONTRIBUTIONS, MONTH BY MONTH — every earner's, in the months that earner is actually paid.
 *
 * Formula .....
 *     own = wage gross by month(w)
 *     c = (w as any).c 401k read as a number (0 when it is not one)
 *     the answer:
 *     for each of own: c   if each > 0
 *     0   otherwise
 *
 * Called by ... MK-CF-F-088 taxableByCalendarMonth · MK-CF-F-092 incomeMonthlyGrid
 *               MK-CF-F-181 rateInForce
 *
 * Reaches ..... 131 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 113 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-043 their own retirement contribution
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-206
 * Changed ..... not in git yet (—)
 */
export function householdK401ByMonth(op: OnboardingProfile | null): number[] {
  return sumMonthsOverEarners(op, (w) => {
    const own = wageGrossByMonth(w);
    const c = toNum((w as any).c_401k);
    return own.map((g) => (g > 0 ? c : 0));
  });
}

/** The calendar-year TAXABLE profile (Jan→Dec) — the same placement rules incomeMonthlyGrid uses,
 *  extracted so the rate vector and the grid can never drift apart. */
/* ─ MK-CF-F-088 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * taxableByCalendarMonth
 *
 * Answers ..... The calendar-year TAXABLE profile (Jan→Dec) — the same placement rules incomeMonthlyGrid uses, extracted so the rate vector and the grid can never drift apart.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     sal by month = salary gross by month(op)
 *     tips m = tips monthly read as a number (0 when it is not one)
 *     rental m = rental net annual(op) ÷ 12
 *     ex = extra income(op)
 *     ret inc monthly = current retirement income monthly(op)
 *     eq annual = rsu annual(op)
 *     vest w = equity vest weights(op)
 *     equity by month = for each of vest w ? vest w: eq annual × each: 12 slots, each 0
 *     bonus idx = min(11, max(0, (to num(bonus month) or 12) − 1))
 *     other idx = other income month(op) − 1
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-092 incomeMonthlyGrid
 *
 * Reaches ..... 125 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 107 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-023 salary and other income
 *               MK-XS-I-059 the month a bonus lands
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Never lets t fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-088
 * Changed ..... 2026-07-29 (13c9be6)
 */
export function taxableByCalendarMonth(op: OnboardingProfile | null, now: Date = new Date()): number[] {
  const a = op ?? {};
  const salByMonth = salaryGrossByMonth(op);
  const tipsM = toNum(a.tipsMonthly);
  const rentalM = rentalNetAnnual(op) / 12;
  const ex = extraIncome(op);
  const retIncMonthly = currentRetirementIncomeMonthly(op);
  const eqAnnual = rsuAnnual(op);
  const vestW = equityVestWeights(op);
  const equityByMonth = vestW ? vestW.map((w) => eqAnnual * w) : new Array(12).fill(0);
  const bonusIdx = Math.min(11, Math.max(0, (toNum(a.bonusMonth) || 12) - 1));
  const otherIdx = otherIncomeMonth(op) - 1;
  // EVERY earner's contribution, not the first one's — see MK-CF-F-206 householdK401ByMonth.
  const k401ByMonth = householdK401ByMonth(op);
  return new Array(12).fill(0).map((_, i) => {
    let t = salByMonth[i] + (salByMonth[i] > 0 ? tipsM : 0) + rentalM + equityByMonth[i] + ex.taxableMonthly + retIncMonthly;
    if (i === bonusIdx) t += toNum(a.bonusAnnual);
    if (i === 0) t += toNum(a.signingOnetime);
    if (i === otherIdx) t += ex.onetimeTaxable;
    // B05 (founder audit 2026-08-26): a traditional 401(k) contribution is taken from pay BEFORE
    // tax, so it was never taxable income. It was being taxed — $4,400/year too much on a
    // $120,000 salary putting in $20,000, and the same wrong base set the withholding rate for
    // every month, so it reached take-home, surplus, essentials and the whole cash-flow module.
    // Only in a month with pay, and per earner: nobody contributes out of a month with none.
    t -= k401ByMonth[i];
    return Math.max(0, t);
  });
}

/** E8 (founder brief 2026-08-20): how many people on the return are 65+. The app captures the
 *  person's birth year only — a spouse's age is unknown, so a joint return counts the person
 *  alone. The error direction slightly overstates tax: conservative for a plan. */

/** How many people on the tax return are 65 or older: none, one or two. */
/* ─ MK-CF-F-089 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * over65CountOf
 *
 * Answers ..... How many people on the tax return are 65 or older: none, one or two.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     joint = filing status = 'married'
 *     the answer:
 *     2   if over65 who = 'both'
 *     0   if over65 who = 'neither'
 *     1   otherwise   otherwise
 *     y = birth year read as a number (0 when it is not one)
 *     0   when y is missing
 *
 * Called by ... MK-CF-F-091 userCapGainsRates · MK-CF-F-181 rateInForce
 *               MK-CF-F-186 convertTakeHomeMode · MK-CF-O-004 incomeSummary
 *               MK-CF-O-019 theIncomeManager · MK-PL-F-067 willItLastInputs
 *               MK-PL-F-082 taxableIncomeSteps
 *
 * Reaches ..... 135 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 117 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-017 birth year
 *               MK-XS-I-030 tax filing status and age
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-089
 * Changed ..... 2026-08-20 (764ca16)
 */
export function over65CountOf(op: OnboardingProfile | null): number {
  const a: any = op ?? {};
  // A COUPLE CAN BE TWO. This read one birth year and returned 0 or 1, so a joint return where both
  // are 65 or older was short $1,650 of standard deduction — every time. We know the person's age
  // from their birth year; we have never known their spouse’s, so on a joint return we ask, and
  // the answer wins. Founder ruling 2026-08-27 (finding B33, approved mock income-v5 frame 4b).
  const joint = a.filingStatus === 'married';
  if (joint && a.over65Who) {
    return a.over65Who === 'both' ? 2 : a.over65Who === 'neither' ? 0 : 1;
  }
  const y = toNum(a.birthYear);
  if (!y) return 0;
  return new Date().getFullYear() - y >= 65 ? 1 : 0;
}

/** The one tax rate in force for the household, as a share of gross: their own figure where they gave one, otherwise the calculated rate. */
/* ─ MK-CF-F-090 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * effectiveRate
 *
 * Answers ..... The one tax rate in force for the household, as a share of gross: their own figure where they gave one, otherwise the calculated rate.
 *
 * Formula .....
 *     rate in force(op).rate
 *
 * Called by ... MK-CF-F-019 upcomingBills · MK-CF-F-020 cashflowYear
 *               MK-CF-F-087 monthlyTaxRates · MK-PL-F-031 taxOrganizer
 *
 * Reaches ..... 128 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 110 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-090
 * Changed ..... 2026-08-20 (764ca16)
 */
export function effectiveRate(op: OnboardingProfile | null): number {
  // THE RATE IN FORCE, and only that. This used to know two of the three answers: a typed rate, or
  // our own estimate. It never asked the third — what the person told us LANDS in their bank —
  // although that is the least guessed figure of all. So every screen but base pay re-estimated a
  // number the person had already given us, and the two disagreed by $572/month on the founder's
  // own persona. See tax-rate.ts for which answer wins and why.
  const { rateInForce } = require('./tax-rate');
  return rateInForce(op).rate;
}

/** PRD F3#17 — the user's OWN capital-gains rates (long: 0/15/20 ladder by filing status;
 *  short: their marginal bracket), each plus the flat state rate. Still a labeled estimate. */

/** The person's own capital-gains tax rates, long-term and short-term, each with their state rate added. */
/* ─ MK-CF-F-091 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * userCapGainsRates
 *
 * Answers ..... The person's own capital-gains tax rates, long-term and short-term, each with their state rate added.
 *
 * Formula .....
 *     gross = total gross annual(op)
 *     status = filing status of(op)
 *     state = state rate of(op)
 *     over65 = over65 count of(op)
 *     the answer:
 *     lt = ltcg rate for(gross, status, over65) + state
 *     st = marginal bracket for(gross, status, over65) + state
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-091
 * Changed ..... 2026-08-20 (764ca16)
 */
export function userCapGainsRates(op: OnboardingProfile | null): { lt: number; st: number } {
  const { ltcgRateFor, marginalBracketFor } = require('./tax');
  const gross = totalGrossAnnual(op);
  const status = filingStatusOf(op);
  const state = stateRateOf(op);
  const over65 = over65CountOf(op);
  return { lt: ltcgRateFor(gross, status, over65) + state, st: marginalBracketFor(gross, status, over65) + state };
}

/** A representative 12-month cash-flow grid (Jan→Dec) that honors lumpiness:
 *  salary & net rental are steady every month; the annual bonus lands in December; the
 *  signing bonus is one-time (January); equity is the level annual vesting spread across the
 *  month-of-year its vest dates fall on (so quarterly vesting shows up as quarterly spikes).
 *  mode: 'gross' (pre-tax), 'net' (after tax), or 'available' (net minus the locked 401(k)). */
/* ─ MK-CF-F-092 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * incomeMonthlyGrid
 *
 * Answers ..... A representative 12-month cash-flow grid (Jan→Dec) that honors lumpiness: salary & net rental are steady every month; the annual bonus lands in December; the signing bonus is one-time (January); equity is the level annual vesting spread across the month-of-year its vest dates fall on (so quarterly vesting shows up as quarterly spikes).
 *
 * Formula .....
 *     a = op (or none when missing)
 *     sal by month = salary gross by month(op)
 *     tips m = tips monthly read as a number (0 when it is not one)
 *     rental m = rental net annual(op) ÷ 12
 *     bonus = bonus annual read as a number (0 when it is not one)
 *     signing = signing onetime read as a number (0 when it is not one)
 *     k401 by month = household k401 by month(op)
 *     rates = monthly tax rates(op, now)
 *     eq annual = rsu annual(op)
 *     vest w = equity vest weights(op)
 *     equity by month = for each of vest w ? vest w: eq annual × each: 12 slots, each 0
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-002 plannedMonthlySpend · MK-CF-F-011 savingsByMonth
 *               MK-CF-F-012 annualCashflow · MK-CF-F-120 pctBaseMonthly
 *               MK-CF-O-004 incomeSummary · MK-XS-F-027 takeHomeMonthly
 *
 * Reaches ..... 125 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               … and 107 more — the full list is on functions_from_code
 *
 * Serves ...... MK-XS-M-006
 * Reads ....... MK-XS-I-023 salary and other income
 *               MK-XS-I-043 their own retirement contribution
 *               MK-XS-I-059 the month a bonus lands
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Never lets earned before401k fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-092
 * Changed ..... 2026-07-29 (13c9be6)
 */
export function incomeMonthlyGrid(op: OnboardingProfile | null, mode: 'gross' | 'net' | 'available' = 'available', now: Date = new Date()): { label: string; amount: number }[] {
  const a = op ?? {};
  const salByMonth = salaryGrossByMonth(op);   // per-month gross base salary (table-driven)
  const tipsM = toNum(a.tipsMonthly);          // tips ride with the job (only in months you're paid)
  const rentalM = rentalNetAnnual(op) / 12;
  const bonus = toNum(a.bonusAnnual);
  const signing = toNum(a.signingOnetime);
  const k401ByMonth = householdK401ByMonth(op);   // EVERY earner's — MK-CF-F-206
  const rates = monthlyTaxRates(op, now);   // one shared vector — the rate in force, every month

  // distribute the level annual equity by the months its vests land on — the ONE placement rule
  const eqAnnual = rsuAnnual(op);
  const vestW = equityVestWeights(op);
  const equityByMonth = vestW ? vestW.map((w) => eqAnnual * w) : new Array(12).fill(0);

  const ex = extraIncome(op);
  const retIncMonthly = currentRetirementIncomeMonthly(op);
  const nontaxFlat = toNum(a.supportMonthly);                              // genuinely monthly, non-taxable
  const benM = toNum(a.benefitMonthly);                                    // benefits land in THEIR months
  const benSet = new Set(benefitActiveMonths(op));
  const schByMonth = scholarshipByCalendarMonth(op);                       // lumpy — placed in its months
  const bonusIdx = Math.min(11, Math.max(0, (toNum(a.bonusMonth) || 12) - 1));   // bonus month (default December)
  const otherIdx = otherIncomeMonth(op) - 1;                                      // one-time other → its month
  // B05 (2026-08-26): ONE definition of the taxable base, shared with the withholding rate.
  // These four lines used to be copied here verbatim. The rate is calculated as tax ÷ taxable in
  // taxableByCalendarMonth and then applied to this number, so if the two ever drifted apart the
  // tax would be wrong in a way nothing could see. They cannot drift now.
  const taxableByMonth = taxableByCalendarMonth(op, now);   // 401(k) already removed — it is pre-tax
  const rateIsTheirs = require('./tax-rate').rateInForce(op).mine;
  // EACH EARNER'S OWN WAGE, EACH EARNER'S OWN ANSWER (approved drawing v07, frame 2a-iii: "Entered and
  // estimated are never blended silently"). Someone who typed their take-home lands exactly that; the
  // household rate is for a wage nobody gave a take-home for. Until 2026-10-04 the grid taxed every
  // wage at one household rate, so where one of two earners had entered a take-home it was thrown
  // away here — the base-pay card said $8,720 and the months said $10,130.
  const wageRows = earnerWages(op).map((w) => {
    const gross = wageGrossByMonth(w);
    const year = gross.reduce((t, g) => t + g, 0);
    const typed = toNum((w as any).landsTypical);
    const k401Year = toNum((w as any).c_401k) * gross.filter((g) => g > 0).length;
    const own = typed > 0 && year > 0 ? Math.min(1, Math.max(0, (year - k401Year - typed * 12) / year)) : null;
    return { gross, own };
  });
  return MONTH_ABBR.map((label, i) => {
    const taxable = taxableByMonth[i];
    const earnedBefore401k = taxable + k401ByMonth[i];   // what the job actually paid
    const nontax = nontaxFlat + schByMonth[i] + (benSet.has(i + 1) ? benM : 0)
      + (i === otherIdx ? ex.onetimeNontax : 0);    // support steady; benefits/scholarships/gifts in their months
    // Interest and dividends are taxed above and then taken back out here: they are reinvested where
    // they are earned and never reach the bank. Say they are paid out and the subtraction stops.
    const gross = earnedBefore401k + nontax - ex.reinvestedMonthly;
    // The three stages stay three stages, and the waterfall still reads
    //     gross − tax = net,   net − 401(k) = available.
    // What changed on 2026-08-26 is only the BASE the tax is calculated on: `taxable` now has the
    // 401(k) already removed, because it is taken from pay before tax. Collapsing net into
    // available — which an earlier attempt at this fix did — makes the 401(k) stage read zero and
    // breaks that waterfall, so the two are kept apart deliberately.
    // WHOSE RATE DECIDES WHAT IT IS A SHARE OF. Ours is calculated as tax ÷ taxable, so it applies to
    // `taxable`. Theirs comes off a payslip — everything that came out, divided by everything they
    // earned — so it applies to what the job actually paid, BEFORE the 401(k). Applying a rate of
    // gross to a base that already has the 401(k) removed understates the tax by the rate times the
    // contribution: $137/month on the founder's persona, which is exactly how far the base-pay
    // screen and the income grid still disagreed after the first half of this fix.
    // A PAYSLIP RATE IS A RATE ON THE PAYSLIP (found 2026-10-03, holding the Income summary to its
    // approved drawing). When the person has entered their take-home, the rate is theirs: everything
    // that came out of the pay, as a share of the pay. It says nothing about their tenant's rent or
    // about interest and dividends, yet it was applied to both — so a household entering take-homes of
    // $5,000 and $3,300 with $1,200 of rent read $9,248/month over three rows adding to $9,500. The
    // approved design draws exactly that household at $9,500 (income-end-to-end_v07, frame 16), and
    // its rule 5 is "the take-home someone enters IS the take-home". Rent and investment income stay
    // in "what it is taxed on" and in the yearly tax; their own rate no longer reaches them.
    // The CALCULATED rate is unchanged: it is tax ÷ everything taxable, so it still spreads the tax on
    // dividends over the pay that does reach the bank (the law in dividends.test.ts, finding B34).
    const notOnThePayslip = Math.min(rentalM + toNum(a.invAnnual) / 12, Math.max(0, earnedBefore401k));
    // a CALCULATED rate is the year's tax ÷ everything taxable, so it is applied to everything taxable
    // (that is how the tax on reinvested dividends still comes out of pay — the law in dividends.test.ts)
    const wages = wageRows.reduce((t, w) => t + w.gross[i], 0);
    const taxOnWages = wageRows.reduce((t, w) => t + w.gross[i] * (w.own ?? rates[i]), 0);
    const tax = taxOnWages + (earnedBefore401k - wages - (rateIsTheirs ? notOnThePayslip : 0)) * rates[i];
    const k401 = k401ByMonth[i];   // nobody contributes out of a month with no pay; every earner counted
    const amount = mode === 'gross' ? gross
                 : mode === 'available' ? gross - tax - k401     // take-home: after tax AND 401(k)
                 : gross - tax;                                   // net: after tax, before the 401(k)
    return { label, amount: (amount) };
  });
}

export { DEFAULT_TAX };
