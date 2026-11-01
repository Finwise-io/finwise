// Map onboarding answers → the Income domain (blueprint §5 + the Income service spec).
// Captures the full set of job inflows (salary monthly, bonus annual, RSUs valued as
// shares × price, signing bonus one-time), rental property (income − operating expenses),
// and the tax config (SYSTEM_CALCULATED vs MANUAL_OVERRIDE).
import type { UserId } from '../_shared/ids';
import { newEntityId } from '../_shared/ids';
import { toNum, rentFigure } from '../_shared/num';
import { yearMonthOf } from '../_shared/dates';   // the one reader of a typed month and year (a vest's date, a signing bonus's)
import { hasMonthlySalaryTable, salaryCalendarYear } from './salary-months';
import { sumMonthsOverEarners, sumOverEarners, earnerWages, householdEmployerMatchAnnual } from './earners';
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
 *     nothing   when hours per week = nothing (or string(hours per week).trim() = '' when missing or zero)
 *     the answer = to num(base salary) × to num(hours per week) × 52
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-039 how often each income arrives
 *               MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly
 *               MK-XS-I-075 hours a week, for a wage paid by the hour
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-059
 * Changed ..... 2026-06-10 (66e36dc)
 */
export function annualizedEnteredSalary(op: OnboardingProfile | null): number | null {
  const a = op ?? {};
  if ((a.salaryFreq ?? 'monthly') === 'hourly') {
    // HOURS A WEEK NOT ENTERED IS NO NUMBER (2026-10-26, FIX-INCOME-A; his DEC-0296 "an unknown input produces no number and a
    // reason — never a default", tenet 3): $25 an hour read $52,000/year on a 40-hour week nobody entered. A typed 0 is an answer.
    if (a.hoursPerWeek == null || String(a.hoursPerWeek).trim() === '') return null;
    return toNum(a.baseSalary) * toNum(a.hoursPerWeek) * 52;
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
 *     nothing   when hours per week = nothing (or string(hours per week).trim() = '' when missing or zero)
 *     (to num(base salary) × to num(hours per week) × 52) ÷ 12
 *
 * Called by ... MK-CF-F-177 wageGrossByMonth
 *
 * Reaches ..... 458 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 440 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-039 how often each income arrives
 *               MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly
 *               MK-XS-I-075 hours a week, for a wage paid by the hour
 *
 * Decides .....
 *     · If salary freq] is missing it uses 12.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-130
 * Changed ..... not in git yet (—)
 */
function enteredMonthlyRaw(a: Record<string, any>): number | null {
  if ((a.salaryFreq ?? 'monthly') === 'hourly') {
    // HOURS A WEEK NOT ENTERED IS NO NUMBER (2026-10-26, FIX-INCOME-A; DEC-0296, tenet 3): no 40-hour week is made up — the
    // wage's untyped months read $0 and Your base pay says "Hours a week not entered" (MK-CF-F-141 perMonth, the same rule)
    if (a.hoursPerWeek == null || String(a.hoursPerWeek).trim() === '') return null;
    return (toNum(a.baseSalary) * toNum(a.hoursPerWeek) * 52) / 12;
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
 * Called by ... MK-CF-F-061 grossSalaryMonthly · MK-CF-F-079 incomeFromOnboarding
 *               MK-CF-F-080 jobActiveMonth · MK-CF-F-081 salaryActiveMonths
 *               MK-CF-F-082 salaryAnnual · MK-CF-F-088 taxableByCalendarMonth
 *               MK-CF-F-092 incomeMonthlyGrid · MK-CF-O-004 incomeSummary
 *               MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 448 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 430 more — the full list is on functions_from_code
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
 *     typical = entered monthly raw(a) (or 0 when missing)
 *     the answer = for each of raw: each
 *
 * Called by ... MK-CF-F-060 salaryGrossByMonth · MK-CF-F-084 taxableAnnual
 *               MK-CF-F-143 annualisedGross · MK-CF-F-206 householdK401ByMonth
 *               MK-CF-F-233 earnerWageShares · MK-CF-F-274 taxedSourcesAnnual
 *               MK-CF-F-277 wagePaidMonths
 *
 * Reaches ..... 457 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 439 more — the full list is on functions_from_code
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
  const typical = enteredMonthlyRaw(a) ?? 0;   // an hourly wage with no hours a week has no typical month (DEC-0296; FIX-INCOME-A)
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
/* ─ MK-CF-F-061 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
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
 * Called by ... nothing — it is an entry point, or nothing reaches it
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
 * Called by ... MK-CF-F-258 equityVests
 *
 * Reaches ..... 450 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 432 more — the full list is on functions_from_code
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
/* ─ MK-CF-F-063 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * rowVestYear
 *
 * Answers ..... Calendar year a row vests (first 4 digits of its date; this year if blank).
 *
 * Formula .....
 *     year month of(row.date).year (or nothing when missing)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-063
 * Changed ..... 2026-06-09 (e39df23)
 */
export function rowVestYear(row: any): number | null {
  // NO DATE IS NOT THIS YEAR (2026-10-25, FIX-INCOME-B; the outside review's part 3, MK-CF-F-063-C05; tenet 3 and his DEC-0296
  // "an unknown input produces no number and a reason — never a default"): a vest with no date is "vest date not entered" and
  // is in no year. It was given this year, every year — the same vest counted again in 2027. The date is read by the one
  // reader of a typed date the month table reads too (yearMonthOf; MK-CF-F-018 equityByMonth), so a year means one thing.
  return yearMonthOf(row?.date)?.year ?? null;
}

/** Per-calendar-year vesting cash flow across all schedule rows — drives the chart & table. */
/* ─ MK-CF-F-064 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * equityCashFlow
 *
 * Answers ..... Per-calendar-year vesting cash flow across all schedule rows — drives the chart & table.
 *
 * Formula .....
 *     by year = new map<number, number>()
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-064
 * Changed ..... 2026-06-09 (e39df23)
 */
export function equityCashFlow(op: OnboardingProfile | null): { year: number; amount: number }[] {
  const byYear = new Map<number, number>();
  // read through the one reader of the vests (equityVests); a vest with no date is in no year (2026-10-25, MK-CF-F-064-C05): it
  // was filed under this year
  for (const v of vestsOf(op)) if (v.year != null) byYear.set(v.year, (byYear.get(v.year) ?? 0) + v.amount);
  return [...byYear.entries()].sort((x, y) => x[0] - y[0]).map(([year, amount]) => ({ year, amount }));
}

/** THE ONE READER OF THE VESTS — every vest with a value, its year and month, or what is missing ("vest month not entered",
 *  "vest date not entered"): MK-CF-F-018's neighbour equityVests (src/domain/cashflow, FIX-BILLS, 2026-10-25), read here so the
 *  Income summary, the tax and the Cash flow months put a vest in the same year and month. Loaded when called: that module
 *  reads this one. */
/* ─ MK-CF-F-265 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * vestsOf
 *
 * Answers ..... THE ONE READER OF THE VESTS — every vest with a value, its year and month, or what is missing ("vest month not entered", "vest date not entered"): MK-CF-F-018's neighbour equityVests (src/domain/cashflow, FIX-BILLS, 2026-10-25), read here so the Income summary, the tax and the Cash flow months put a vest in the same year and month.
 *
 * Formula .....
 *     (require('.. ÷ cashflow') as typeof import('.. ÷ cashflow')).equity vests(op as any)
 *
 * Called by ... MK-CF-F-064 equityCashFlow · MK-CF-F-065 equityVestWeights
 *               MK-CF-F-066 rsuAnnual · MK-CF-F-267 vestsNotEntered
 *
 * Reaches ..... 450 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 432 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-265
 * Changed ..... not in git yet (—)
 */
const vestsOf = (op: OnboardingProfile | null) => (require('../cashflow') as typeof import('../cashflow')).equityVests(op as any);

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
 *     weights = 12 slots, each 0
 *     total v = 0
 *     the answer = for each of total v > 0 ? weights: each ÷ total v: nothing
 *
 * Called by ... MK-CF-F-079 incomeFromOnboarding
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-079 incomeFromOnboarding
 *               MK-XS-F-032 snapshotFromOnboarding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in total v of 0.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-065
 * Changed ..... 2026-07-29 (13c9be6)
 */
export function equityVestWeights(op: OnboardingProfile | null, year: number = new Date().getFullYear()): number[] | null {
  const weights = new Array(12).fill(0);
  let totalV = 0;
  // ONE YEAR'S VESTS, EACH IN ITS OWN MONTH (2026-10-25, FIX-INCOME-B; his DEC-0012 and DEC-0003; the outside review's part 3,
  // MK-CF-F-065-C03 to C05): the shares of that calendar year's vests, by the month their date names, read through the one
  // reader of the vests (equityVests). It read every year's vests into one year's months, and a vest with no date into
  // December. A vest with no month, or no date, has no month here (the lead's rulings: "vest month not entered", "vest date not
  // entered").
  for (const v of vestsOf(op)) {
    if (v.year !== year || v.month == null) continue;
    weights[v.month - 1] += v.amount; totalV += v.amount;
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
 *     rows = rsu grants   if array.is array(rsu grants)
 *     []   otherwise
 *     vests = vests of(op)
 *     nothing   when vests.length > 0 and vests.every((v) => year = nothing)
 *     the answer:
 *     Σ over vests of (amount   if year = year
 *     0   otherwise)
 *
 * Called by ... MK-CF-F-079 incomeFromOnboarding · MK-CF-F-084 taxableAnnual
 *               MK-CF-F-258 equityVests · MK-CF-F-274 taxedSourcesAnnual
 *               MK-CF-O-004 incomeSummary · MK-CF-O-016 incomeSources
 *               MK-CF-O-019 theIncomeManager · MK-PL-F-031 taxOrganizer
 *
 * Reaches ..... 450 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 432 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-066
 * Changed ..... 2026-06-09 (e39df23)
 */
export function rsuAnnual(op: OnboardingProfile | null, year: number = new Date().getFullYear()): number | null {
  const a = op ?? {};
  const rows = Array.isArray(a.rsuGrants) ? a.rsuGrants : [];
  if (rows.length) {
    // WHAT VESTS IN THE YEAR, NOT AN AVERAGE OF THE YEARS (2026-10-25, FIX-INCOME-B; his DEC-0012 "shares that vest land in the
    // month they vest on every screen"; the outside review's MK-CF-F-066 and MK-CF-M-009): the vests whose date names that
    // calendar year, a vest with a year and no month among them (the lead's ruling: it counts in that year's total and is off
    // the month table, "vest month not entered"), read through the one reader of the vests (equityVests). It was every vest ÷
    // the number of vest years — 75 shares in March 2026 and 25 in March 2027 at $400 read $20,000/year, where 2026 vests
    // $30,000. Grants with a value and no date at all answer nothing: null, "vest date not entered" (tenet 3, DEC-0296) — they
    // were one more year of the average, counted as this year's.
    const vests = vestsOf(op);
    if (vests.length > 0 && vests.every((v) => v.year == null)) return null;
    return vests.reduce((t, v) => t + (v.year === year ? v.amount : 0), 0);
  }
  // "Stock that vests, a year" typed as one figure (the Bonus and stock editor with no grants): theirs, a year — it has no month
  return toNum(a.rsuShares) * toNum(a.rsuPrice);
}

/** What it is for: WHETHER SHARES THAT VEST ARE MONEY TO SPEND — only when the person says they sell them when they vest (the
 *  lead's ruling of 2026-10-25, the same shape as his DEC-0179 for reinvested dividends and DEC-0198 "does this reach your
 *  bank?"). A vest is taxed in its year either way; held, it is shares, not cash, so it lands in no month's take-home. The one
 *  answer the month grid, the Cash flow months and the Income summary read. Example: 75 shares at $400 vesting in March, not
 *  sold → March's take-home is the usual month, the $30,000 is in What it is taxed on; sold when they vest → it lands in March. */
/* ─ MK-CF-F-266 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * vestsAreCash
 *
 * Answers ..... What it is for: WHETHER SHARES THAT VEST ARE MONEY TO SPEND — only when the person says they sell them when they vest (the lead's ruling of 2026-10-25, the same shape as his DEC-0179 for reinvested dividends and DEC-0198 "does this reach your bank?").
 *
 * Formula .....
 *     (op as any).rsu sold at vest = 'yes'
 *
 * Called by ... MK-CF-F-092 incomeMonthlyGrid · MK-CF-O-004 incomeSummary
 *               MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-072 whether shares are sold when they vest — yes makes a vest money that lands; otherwise it is shares, taxed in its year
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-266
 * Changed ..... not in git yet (—)
 */
export function vestsAreCash(op: OnboardingProfile | null): boolean {
  return (op as any)?.rsuSoldAtVest === 'yes';
}

/** What it is for: THE VESTS THE SCREENS MUST NAME AS NOT ENTERED — how many have no date ("vest date not entered": counted
 *  nowhere) and how many have a year and no month ("vest month not entered": in that year's total, off the month table), from
 *  the one reader of the vests (2026-10-25, the lead's rulings). Example: a grant row with shares and a price and its date left
 *  empty → { dateNotEntered: 1, monthNotEntered: 0 }. */
/* ─ MK-CF-F-267 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * vestsNotEntered
 *
 * Answers ..... What it is for: THE VESTS THE SCREENS MUST NAME AS NOT ENTERED — how many have no date ("vest date not entered": counted nowhere) and how many have a year and no month ("vest month not entered": in that year's total, off the month table), from the one reader of the vests (2026-10-25, the lead's rulings).
 *
 * Formula .....
 *     v = vests of(op)
 *
 * Called by ... MK-CF-O-004 incomeSummary · MK-CF-O-019 theIncomeManager
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-267
 * Changed ..... not in git yet (—)
 */
export function vestsNotEntered(op: OnboardingProfile | null): { dateNotEntered: number; monthNotEntered: number } {
  const v = vestsOf(op);
  return { dateNotEntered: v.filter((x) => x.missing === 'vest date not entered').length,
           monthNotEntered: v.filter((x) => x.missing === 'vest month not entered').length };
}

/** What one rent entry comes to a month, as typed — read by the one strict reader (DEC-3768c, 2026-10-10), the reader
 *  rentalList counts with: "about 2k" is not a number, so it reads as not entered (0), never as $2. The sign-up rent
 *  step shows these figures; it read them with a lenient reader that kept the digits until 2026-10-20. */
/* ─ MK-CF-F-219 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rentEntryMonthly
 *
 * Answers ..... What one rent entry comes to a month, as typed — read by the one strict reader (DEC-3768c, 2026-10-10), the reader rentalList counts with: "about 2k" is not a number, so it reads as not entered (0), never as $2.
 *
 * Formula .....
 *     income = rent figure(income)
 *     expenses = rent figure(expenses) (or 0 when missing)
 *     the answer:
 *     income = income
 *     expenses = expenses
 *     net = nothing   if income = nothing
 *     income − expenses   otherwise
 *
 * Called by ... MK-CF-F-067 rentalList
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-219
 * Changed ..... not in git yet (—)
 */
export function rentEntryMonthly(r: { income?: any; expenses?: any } | null | undefined): { income: number | null; expenses: number; net: number | null } {
  // A RENT NOT ENTERED GIVES NO NET (2026-10-25, FIX-INCOME-B; the outside review's MK-CF-F-219-C05; tenet 3 "unknown is not
  // zero" and DEC-3768c "it counts as not entered"): "about 2k", or a blank rent beside $600 of costs, read the rent as $0 and
  // gave −$600/month — a $7,200 rental loss in income and in the tax. With no rent there is no net and the entry counts
  // nowhere (rentalList) until the rent is typed. A typed 0 is an answer: $0 rent, and the costs are a loss. A blank cost is no
  // cost — the box asks for the running costs and was left empty.
  const income = rentFigure(r?.income);
  const expenses = rentFigure(r?.expenses) ?? 0;
  return { income, expenses, net: income == null ? null : income - expenses };
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
 *     the answer = []
 *
 * Called by ... MK-CF-F-068 rentalNetAnnual · MK-CF-F-079 incomeFromOnboarding
 *               MK-CF-F-219 rentEntryMonthly · MK-CF-F-249 rentalsHeld
 *               MK-CF-O-019 theIncomeManager
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
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
  // DEC-3768c (2026-10-10): a rent or running-cost figure is read by the one strict reader, rentFigure (through
  // rentEntryMonthly) — "about 2k" is not entered (0 here), never $2. toNum is left alone for every other figure.
  // A RENT ENTRY WITH NO PROPERTY IS NOT RENT YET (DEC-4059d, 2026-10-10, "10 - approved"): an entry counts only once
  // it names its property in Net worth. Until then it is kept as typed, asks "Which property is it?" in amber on the
  // Income screen, and is counted nowhere — not in income, not in the emergency fund, not as a rental. The old single
  // rent figure (rentalIncome, from before rent entries named a property) names none, so it is not counted either.
  if (Array.isArray(a.rentals)) {
    return a.rentals
      .filter((r: any) => r?.property_id != null && String(r.property_id).trim() !== '')
      // the same reading the sign-up step shows (rentEntryMonthly, 2026-10-20), so what is shown is what is counted
      .map((r: any) => { const m = rentEntryMonthly(r); return { type: norm(r?.type), income: m.income, expenses: m.expenses }; })
      // a rent not entered is not counted (2026-10-25, MK-CF-F-219-C05); an entry of $0 rent and $0 costs is nothing to count
      .filter((r: any): r is { type: 'long' | 'short'; income: number; expenses: number } => r.income != null && (r.income > 0 || r.expenses > 0));
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
 * Called by ... MK-CF-F-088 taxableByCalendarMonth · MK-CF-F-092 incomeMonthlyGrid
 *               MK-CF-F-249 rentalsHeld · MK-CF-F-274 taxedSourcesAnnual
 *               MK-CF-O-001 basePay · MK-CF-O-004 incomeSummary
 *               MK-CF-O-019 theIncomeManager · MK-PL-F-031 taxOrganizer
 *               MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
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
 * Called by ... MK-CF-F-070 benefitAnnual · MK-CF-F-071 extraIncome
 *               MK-CF-F-088 taxableByCalendarMonth · MK-CF-F-092 incomeMonthlyGrid
 *               MK-CF-F-274 taxedSourcesAnnual · MK-CF-O-004 incomeSummary
 *               MK-CF-O-016 incomeSources · MK-CF-O-019 theIncomeManager
 *               MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
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
 * Called by ... MK-CF-F-071 extraIncome · MK-CF-F-079 incomeFromOnboarding
 *               MK-PL-F-031 taxOrganizer
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-070
 * Changed ..... 2026-06-11 (7b390f8)
 */
export function benefitAnnual(op: OnboardingProfile | null): number {
  return toNum(op?.benefitMonthly) * benefitActiveMonths(op).length;
}

/** What it is for: THE PART OF A MONTH'S BENEFITS THAT IS UNEMPLOYMENT PAY — taxed income (Internal Revenue Code §85(a); IRS
 *  Publication 525), where SNAP, TANF, housing help and the like are not (2026-10-25, FIX-INCOME-B; the outside review's part 4).
 *  Every benefit was untaxed, and the Benefits step said "We won't tax this income." even with Unemployment chosen. With
 *  Unemployment the only kind chosen, the whole monthly amount; chosen beside another kind, the share the person typed for it
 *  ("How much of that is unemployment?", unemploymentMonthly, never more than the total) — or, until they type it, the whole
 *  amount, said on the step (the lead's decision: never less tax than the law asks; reverse: count none until typed). A month
 *  it is paid in, not an average: the year is this × the months benefits are paid. Example: $1,000/month of unemployment,
 *  July to December → $1,000 in each of those months, $6,000 taxed in the year. */
/* ─ MK-CF-F-268 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * unemploymentMonthly
 *
 * Answers ..... What it is for: THE PART OF A MONTH'S BENEFITS THAT IS UNEMPLOYMENT PAY — taxed income (Internal Revenue Code §85(a); IRS Publication 525), where SNAP, TANF, housing help and the like are not (2026-10-25, FIX-INCOME-B; the outside review's part 4).
 *
 * Formula .....
 *     a = op (or none when missing)
 *     types = benefit types   if array.is array(benefit types)
 *     []   otherwise
 *     0   when !types.includes('unemployment')
 *     total = benefit monthly read as a number (0 when it is not one)
 *     total   when types.length = 1
 *     blank = unemployment monthly = nothing (or string(unemployment monthly).trim() = '' when missing or zero)
 *     the answer:
 *     total   if blank
 *     min(total, max(0, unemployment monthly read as a number (0 when it is not one)))   otherwise
 *
 * Called by ... MK-CF-F-070 benefitAnnual · MK-CF-F-071 extraIncome
 *               MK-CF-F-088 taxableByCalendarMonth · MK-CF-F-092 incomeMonthlyGrid
 *               MK-CF-F-274 taxedSourcesAnnual · MK-CF-O-004 incomeSummary
 *               MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-073 the part of a month's benefits that is unemployment pay, when another kind of benefit is chosen beside it
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-268
 * Changed ..... not in git yet (—)
 */
export function unemploymentMonthly(op: OnboardingProfile | null): number {
  const a: any = op ?? {};
  const types: string[] = Array.isArray(a.benefitTypes) ? a.benefitTypes : [];
  if (!types.includes('unemployment')) return 0;
  const total = toNum(a.benefitMonthly);
  if (types.length === 1) return total;
  const blank = a.unemploymentMonthly == null || String(a.unemploymentMonthly).trim() === '';   // blank is not entered, never $0
  return blank ? total : Math.min(total, Math.max(0, toNum(a.unemploymentMonthly)));
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
 *     unemp m = unemployment monthly(a) × benefit active months(a).length ÷ 12
 *     ben m = benefit annual(a) ÷ 12 − unemp m
 *     sup m = support monthly read as a number (0 when it is not one)
 *     sch list = scholarships   if array.is array(scholarships)
 *     nothing   otherwise
 *     oth freq = other freq (or 'monthly' when missing)
 *     oth m = to num(other amount) ÷ 12   if oth freq = 'annual'
 *     other amount read as a number (0 when it is not one)   if oth freq = 'monthly'
 *     0   otherwise   otherwise
 *     once = lands once(a).find((x) => kind = 'other')
 *     oth once = 0   if once is missing
 *     nothing   if once.counts is missing
 *     once.amount   if once.year = now.get full year()
 *     0   otherwise   otherwise   otherwise
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-083 totalGrossAnnual · MK-CF-F-088 taxableByCalendarMonth
 *               MK-CF-F-092 incomeMonthlyGrid · MK-CF-O-004 incomeSummary
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-039 how often each income arrives
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-071
 * Changed ..... 2026-06-11 (7b390f8)
 */
export function extraIncome(op: OnboardingProfile | null, now: Date = new Date()): {
  taxableMonthly: number; nontaxMonthly: number; onetimeTaxable: number | null; onetimeNontax: number | null;
  reinvestedMonthly: number;
  /** the unemployment pay inside taxableMonthly, a month on average over the year (IRC §85(a); 2026-10-25) */
  unemploymentAverageMonthly: number;
} {
  const a = op ?? {};
  const seM = (a.seFreq === 'annual' ? toNum(a.seAmount) / 12 : toNum(a.seAmount));
  const invM = toNum(a.invAnnual) / 12;
  // UNEMPLOYMENT PAY IS TAXED (2026-10-25, FIX-INCOME-B; IRC §85(a), IRS Publication 525): it moves out of the untaxed benefits
  // into what is taxed; the rest of the benefits stay untaxed. Both are annual averages that honour the months benefits are paid.
  const unempM = unemploymentMonthly(a) * benefitActiveMonths(a).length / 12;
  const benM = benefitAnnual(a) / 12 - unempM;    // annual average — honors active months
  const supM = toNum(a.supportMonthly);
  const schList = Array.isArray(a.scholarships) ? a.scholarships : null;
  const schM = schList
    ? schList.reduce((t: number, x: any) => t + (x?.freq === 'monthly' ? toNum(x?.amount) : toNum(x?.amount) / 12), 0)
    : (a.scholarshipFreq === 'monthly' ? toNum(a.scholarshipAmount) : toNum(a.scholarshipAmount) / 12);
  const othFreq = a.otherFreq ?? 'monthly';
  const othM = othFreq === 'annual' ? toNum(a.otherAmount) / 12 : othFreq === 'monthly' ? toNum(a.otherAmount) : 0;
  // ONE-TIME MONEY IS IN ITS OWN YEAR'S INCOME ONLY (2026-10-24, Cash flow journey E2E-70; DEC-0447): with the year it lands
  // in on record, another year's income does not carry it — a $2,000 bonus of 2026 raised the 2027 tax rate on every month.
  // WITH NO YEAR IT WAITS (2026-10-25, FIX-INCOME-B; the outside review's MK-CF-F-071-C05; his DEC-0447 "lands in its own
  // month", DEC-7940 "lands once", DEC-0296): no year is null — "year not entered" — and is counted in no year. It was this
  // year's income, and next year's, and every year's (still $2,000 in 2028). The one reading is landsOnce.
  const once = landsOnce(a).find((x) => x.kind === 'other');
  const othOnce: number | null = !once ? 0 : !once.counts ? null : once.year === now.getFullYear() ? once.amount : 0;
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
    taxableMonthly: (seM + invM + unempM + (othTaxable ? othM : 0)),
    nontaxMonthly: (benM + supM + schM + (othTaxable ? 0 : othM)),
    onetimeTaxable: (othTaxable ? othOnce : 0),
    onetimeNontax: (othTaxable ? 0 : othOnce),
    reinvestedMonthly: (reinvested),
    unemploymentAverageMonthly: unempM,
  };
}

/** What it is for: WHAT LANDS ONCE IN ONE CALENDAR YEAR, OF ONE KIND — the signing bonus, or the one-time payment under "Something
 *  else" — from landsOnce, so a recap's row is the figure that year counts (2026-10-25, FIX-INCOME-B). With no year it is in no
 *  year: $0 here, and "year not entered" / "date not entered" where the source is listed. Example: a $7,311.17 signing bonus dated
 *  2026-10-17 → $7,311.17 in 2026, $0 in 2027. */
/* ─ MK-CF-F-269 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * landsOnceInYear
 *
 * Answers ..... What it is for: WHAT LANDS ONCE IN ONE CALENDAR YEAR, OF ONE KIND — the signing bonus, or the one-time payment under "Something else" — from landsOnce, so a recap's row is the figure that year counts (2026-10-25, FIX-INCOME-B).
 *
 * Formula .....
 *     Σ over lands once(op) where kind = kind and counts and year = year of (amount)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-269
 * Changed ..... not in git yet (—)
 */
export function landsOnceInYear(op: OnboardingProfile | null, kind: 'signing' | 'other', year: number = new Date().getFullYear()): number {
  return landsOnce(op).filter((o) => o.kind === kind && o.counts && o.year === year).reduce((t, o) => t + o.amount, 0);
}

/** What it is for: MONEY THAT LANDS ONCE — a signing bonus, and a one-time payment entered under "Something else" — with the
 *  year and month it lands, or what is missing (2026-10-25, FIX-INCOME-B; the outside review's MK-CF-F-071-C05 and
 *  MK-CF-F-079-C04/C05; his DEC-0447 "income that arrives once lands in its own month", DEC-7940 "lands once"). The one
 *  reading every reader of the year and of the months uses, so a once-only amount is counted in its own year only and in its
 *  own month. With no year it is in no year: "year not entered" for the one-time payment, "date not entered" for the signing
 *  bonus (it had no date question and landed every January). Example: a $7,311.17 signing bonus dated 2026-10-17 → 2026,
 *  October, taxed; read in 2027 it is in no month and not in 2027's income. */
/* ─ MK-CF-F-270 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * landsOnce
 *
 * Answers ..... What it is for: MONEY THAT LANDS ONCE — a signing bonus, and a one-time payment entered under "Something else" — with the year and month it lands, or what is missing (2026-10-25, FIX-INCOME-B; the outside review's MK-CF-F-071-C05 and MK-CF-F-079-C04/C05; his DEC-0447 "income that arrives once lands in its own month", DEC-7940 "lands once").
 *
 * Formula .....
 *     a = op (or none when missing)
 *     out = []
 *     signing = signing onetime read as a number (0 when it is not one)
 *     when = year month of(signing date)
 *     other = other amount read as a number (0 when it is not one)
 *     year = other income year read as a number (0 when it is not one) (or nothing when missing or zero)
 *     m = other month read as a number (0 when it is not one)
 *     month = m   if m ≥ 1 and m ≤ 12
 *     nothing   otherwise
 *     the answer = out
 *
 * Called by ... MK-CF-F-071 extraIncome · MK-CF-F-079 incomeFromOnboarding
 *               MK-CF-F-084 taxableAnnual · MK-CF-F-088 taxableByCalendarMonth
 *               MK-CF-F-092 incomeMonthlyGrid · MK-CF-F-269 landsOnceInYear
 *               MK-CF-F-274 taxedSourcesAnnual · MK-CF-O-004 incomeSummary
 *               MK-CF-O-016 incomeSources · MK-CF-O-019 theIncomeManager
 *               MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 444 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 426 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-023 salary and other income
 *               MK-XS-I-039 how often each income arrives
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-071 the date a signing bonus is paid — its year, and its month when known
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-270
 * Changed ..... not in git yet (—)
 */
export function landsOnce(op: OnboardingProfile | null): {
  kind: 'signing' | 'other'; label: string; amount: number; taxed: boolean; year: number | null; month: number | null;
  missing: 'date not entered' | 'month not entered' | 'year not entered' | null;
  /** whether it counts in its year: a signing bonus once its year is known (its month then places it); a one-time payment only once
   *  BOTH its month and its year are given — the step asks both (the lead, 2026-10-25; tenet 3, DEC-0447) */
  counts: boolean;
}[] {
  const a: any = op ?? {};
  const out: ReturnType<typeof landsOnce> = [];
  const signing = toNum(a.signingOnetime);
  if (signing > 0) {
    const when = yearMonthOf(a.signingDate);
    out.push({ kind: 'signing', label: 'Signing bonus', amount: signing, taxed: true, year: when?.year ?? null, month: when?.month ?? null,
      missing: !when ? 'date not entered' : when.month == null ? 'month not entered' : null, counts: !!when });
  }
  const other = toNum(a.otherAmount);
  if ((a.otherFreq ?? 'monthly') === 'onetime' && other > 0) {
    const year = toNum(a.otherIncomeYear) || null;
    const m = toNum(a.otherMonth);
    const month = m >= 1 && m <= 12 ? m : null;
    out.push({ kind: 'other', label: String(a.otherLabel ?? '').trim() || 'One-time income', amount: other, taxed: a.otherTaxable !== 'no',
      year, month, missing: year == null ? 'year not entered' : month == null ? 'month not entered' : null, counts: year != null && month != null });
  }
  return out;
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
 *     the answer = retirement income monthly(op) − social security not yet monthly(op)
 *
 * Called by ... MK-CF-F-079 incomeFromOnboarding · MK-CF-F-274 taxedSourcesAnnual
 *               MK-CF-F-276 retirementIncomeTaxedMonthly · MK-PL-F-031 taxOrganizer
 *               MK-XS-F-024 resolveLens
 *
 * Reaches ..... 444 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 426 more — the full list is on functions_from_code
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
  // EACH SOURCE ANSWERS FOR ITSELF (2026-10-25, FIX-INCOME-B; found by CF-MMFIX-B): once any retirement income was received, a
  // Social Security amount answered "Not yet" on Your monthly income was counted as this month's income too — a pension plus a
  // $2,900 ssa.gov estimate for later read $2,900 more a month. Social Security is the source with its own answer
  // (ri_ss_receiving); "Not yet" keeps it out of today's money and in the Plan's estimate.
  return retirementIncomeMonthly(op) - socialSecurityNotYetMonthly(op);
}

/** What it is for: THE SOCIAL SECURITY THE PERSON SAID THEY DO NOT RECEIVE YET — an estimate for later, a month (2026-10-25,
 *  FIX-INCOME-B). Your monthly income asks it ("I receive it" / "Not yet", ri_ss_receiving); "Not yet" with an amount is the
 *  Plan's figure, never today's income. Example: $2,900 typed, "Not yet" → $2,900 here, $0 of it received now. */
/* ─ MK-CF-F-271 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * socialSecurityNotYetMonthly
 *
 * Answers ..... What it is for: THE SOCIAL SECURITY THE PERSON SAID THEY DO NOT RECEIVE YET — an estimate for later, a month (2026-10-25, FIX-INCOME-B).
 *
 * Formula .....
 *     a = op (or none when missing)
 *     the answer:
 *     to num(ri ss) ÷ (RI_CAD_DIV[ri ss freq] ?? 1)   if ri ss receiving = 'no'
 *     0   otherwise
 *
 * Called by ... MK-CF-F-072 currentRetirementIncomeMonthly · MK-CF-F-250 guaranteedReceivedNow
 *               MK-CF-F-272 socialSecurityReceivedMonthly · MK-CF-O-019 theIncomeManager
 *
 * Reaches ..... 447 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 429 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-039 how often each income arrives
 *
 * Decides .....
 *     · If ri social security freq] is missing it uses 1.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-271
 * Changed ..... not in git yet (—)
 */
export function socialSecurityNotYetMonthly(op: OnboardingProfile | null): number {
  const a: any = op ?? {};
  return a.ri_ss_receiving === 'no' ? toNum(a.ri_ss) / (RI_CAD_DIV[a.ri_ss_freq] ?? 1) : 0;
}

/** What it is for: THE SOCIAL SECURITY RECEIVED NOW, a month — the part of currentRetirementIncomeMonthly that is Social Security,
 *  which IRS Publication 915 taxes only in part (socialSecurityTaxedAnnual). Example: $2,000/month received → $2,000. */
/* ─ MK-CF-F-272 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * socialSecurityReceivedMonthly
 *
 * Answers ..... What it is for: THE SOCIAL SECURITY RECEIVED NOW, a month — the part of currentRetirementIncomeMonthly that is Social Security, which IRS Publication 915 taxes only in part (socialSecurityTaxedAnnual).
 *
 * Formula .....
 *     a = op (or none when missing)
 *     srcs = income sources
 *     0   when array.is array(srcs) and !srcs.includes('retirement_income')
 *     the answer = to num(ri ss) ÷ (RI_CAD_DIV[ri ss freq] ?? 1) − social security not yet monthly(a)
 *
 * Called by ... MK-CF-F-083 totalGrossAnnual · MK-CF-F-274 taxedSourcesAnnual
 *               MK-CF-F-276 retirementIncomeTaxedMonthly
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-039 how often each income arrives
 *               MK-XS-I-040 whether a stream is already being received
 *
 * Decides .....
 *     · If ri social security freq] is missing it uses 1.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-272
 * Changed ..... not in git yet (—)
 */
export function socialSecurityReceivedMonthly(op: OnboardingProfile | null): number {
  const a: any = op ?? {};
  const srcs = a.incomeSources;
  if (Array.isArray(srcs) && !srcs.includes('retirement_income')) return 0;
  return toNum(a.ri_ss) / (RI_CAD_DIV[a.ri_ss_freq] ?? 1) - socialSecurityNotYetMonthly(a);
}

/** What it is for: HOW MUCH OF A YEAR'S SOCIAL SECURITY IS TAXED — IRS Publication 915, Worksheet 1 (2026-10-25, FIX-INCOME-B;
 *  the outside review's MK-CF-F-084-C05). Every dollar of it was counted as taxed: a single 63-year-old on $2,000/month and
 *  nothing else was charged $790/year, where the law taxes none. The worksheet, line by line: provisional income = the other
 *  income (everything else taxed, after the 401(k)s) + half the benefits; above the first base ($25,000 single or head of
 *  household, $32,000 filing jointly, $0 filing separately — the lead's decision: we cannot know whether a separate filer
 *  lived apart all year, and the law's default for one who did not is $0) up to half the excess is taxed, capped at half the
 *  benefits and at half the gap to the second base ($34,000 / $44,000 / $0); above the second base, 85% of that excess more;
 *  never more than 85% of the benefits. Tax-exempt interest and adjustments are not entered, so they are not counted. Worked:
 *  single, $36,000 of Social Security and $48,000 of pension — $48,000 + $18,000 = $66,000; $66,000 − $25,000 = $41,000;
 *  min($41,000, $9,000) ÷ 2 = $4,500 (≤ $18,000); 85% × ($41,000 − $9,000) = $27,200; $4,500 + $27,200 = $31,700, capped at
 *  85% × $36,000 = $30,600. Social Security only, $24,000, single → $12,000 is under $25,000 → $0. */
/* ─ MK-CF-F-273 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * socialSecurityTaxedAnnual
 *
 * Answers ..... What it is for: HOW MUCH OF A YEAR'S SOCIAL SECURITY IS TAXED — IRS Publication 915, Worksheet 1 (2026-10-25, FIX-INCOME-B; the outside review's MK-CF-F-084-C05).
 *
 * Formula .....
 *     0   when not (benefits > 0)
 *     provisional = other income + benefits ÷ 2
 *     0   when provisional ≤ base1
 *     over1 = provisional − base1
 *     gap = base2 − base1
 *     over2 = max(0, over1 − gap)
 *     half = min(benefits ÷ 2, min(over1, gap) ÷ 2)
 *     the answer = min(half + 0.85 × over2, 0.85 × benefits)
 *
 * Called by ... MK-CF-F-084 taxableAnnual · MK-CF-F-088 taxableByCalendarMonth
 *               MK-CF-F-271 socialSecurityNotYetMonthly · MK-CF-F-274 taxedSourcesAnnual
 *
 * Reaches ..... 448 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 430 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-273
 * Changed ..... not in git yet (—)
 */
export function socialSecurityTaxedAnnual(benefits: number, otherIncome: number, filing: import('./tax').FilingStatus): number {
  if (!(benefits > 0)) return 0;
  const [base1, base2] = filing === 'married' ? [32000, 44000] : filing === 'mfs' ? [0, 0] : [25000, 34000];
  const provisional = otherIncome + benefits / 2;
  if (provisional <= base1) return 0;
  const over1 = provisional - base1;                  // line 10
  const gap = base2 - base1;                          // line 11
  const over2 = Math.max(0, over1 - gap);             // line 12
  const half = Math.min(benefits / 2, Math.min(over1, gap) / 2);   // lines 13–15
  return Math.min(half + 0.85 * over2, 0.85 * benefits);           // lines 16–19
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
 * Called by ... MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-205 COMING · MK-CF-F-237 LATER
 *               MK-XS-F-004 buildDatedGrid · MK-CF-F-107 buildPaycheckYear
 *               MK-CF-O-017 futurePaycheck · MK-CF-F-212 receivedInMonth
 *               MK-CF-O-008 whatsComing · MK-CF-F-242 workedLineAmount
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
 * Called by ... MK-CF-F-079 incomeFromOnboarding · MK-CF-F-274 taxedSourcesAnnual
 *               MK-PL-F-031 taxOrganizer
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
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
 * Called by ... MK-CF-F-072 currentRetirementIncomeMonthly · MK-CF-F-207 SOURCE
 *               MK-CF-O-019 theIncomeManager
 *
 * Reaches ..... 445 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 427 more — the full list is on functions_from_code
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
 * Called by ... MK-CF-F-207 SOURCE · MK-CF-F-249 rentalsHeld
 *               MK-CF-F-250 guaranteedReceivedNow · MK-CF-O-017 futurePaycheck
 *               MK-PL-F-067 willItLastInputs · MK-XS-F-031 buildSnapshot
 *
 * Reaches ..... 444 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 426 more — the full list is on functions_from_code
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
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
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
/* ─ MK-CF-F-178 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * wageMatchMonthly
 *
 * Answers ..... ONE person's employer match: a share of their own contribution, or a flat amount.
 *
 * Formula .....
 *     a = w (or none when missing)
 *     val = employer match value read as a number (0 when it is not one)
 *     the answer:
 *     (to num(c 401k) × val) ÷ 100   if (employer match mode ?? 'pct') = 'pct'
 *     val   otherwise
 *
 * Called by ... MK-CF-F-078 employerMatchMonthly · MK-CF-F-146 payFiguresAgree
 *               MK-CF-F-171 earnerPay · MK-CF-F-188 householdPreTaxContributionsAnnual
 *               MK-CF-F-240 PAY_LANDS_TYPED · MK-CF-F-260 householdEmployerMatchAnnual
 *
 * Reaches ..... 448 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 430 more — the full list is on functions_from_code
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
  // NO CHOICE TAPPED READS AS THE CHOICE EVERY SCREEN SHOWS CHOSEN, % OF THEIRS (2026-10-25, CF-MMFIX-B; drawing check IN-04;
  // tenets 4 and 5). Your base pay and sign-up both highlight "% of theirs" until the other is tapped, and this read the same
  // figure as dollars: 50 typed beside $800 put in counted $50/month while the screen said 50%, which is $400.
  return (a.employerMatchMode ?? 'pct') === 'pct' ? (toNum(a.c_401k) * val) / 100 : val;
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
 *     sal months = salary gross by month(op)
 *     sal year = Σ over sal months of (each)
 *     vest w = equity vest weights(op)
 *     other once = lands once(op).find((o) => kind = 'other')
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
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *               MK-XS-I-059 the month a bonus lands
 *
 * Decides .....
 *     · Treats a year as twelve equal months.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
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
  // EACH MONTH KEEPS ITS OWN PAY (2026-10-25, FIX-INCOME-B; his DEC-0003; the outside review's MK-CF-F-079-C03): pay that differs
  // month to month is stored as the year with each month's share, so July $5,111.17, August $6,111.43 and the spouse's January
  // $3,111.19 stay in their months — they were $1,194.48 in every month (the year ÷ 12). Steady pay stays a month's pay; the
  // employer's match keeps its year either way (a month's match × 12, as before).
  const salMonths = salaryGrossByMonth(op);
  const salYear = salMonths.reduce((t, x) => t + x, 0);
  if (salYear > 0 && salMonths.some((x) => Math.abs(x - salYear / 12) > 0.005)) {
    // the match a year: each earner's match × the months that earner is paid (householdEmployerMatchAnnual, FIX-INCOME-A, 2026-10-26)
    add('Base salary', 'W2_JOB', salYear, 'ANNUAL', { employer_match_amount: householdEmployerMatchAnnual(op),
      landing_months: salMonths.map((x, i) => ({ month: i + 1, share: x / salYear })).filter((x) => x.share > 0) });
  } else {
    add('Base salary', 'W2_JOB', salYear / 12, 'MONTHLY', { employer_match_amount: employerMatchMonthly(op) });
  }
  add('Bonus', 'W2_JOB', toNum(a.bonusAnnual), 'ANNUAL', { landing_month: Math.min(12, Math.max(1, toNum(a.bonusMonth) || 12)) });
  // Walk row 6 (audit PRD #4): the equity source lands in its VEST months — this year's vests, in their own months (2026-10-25,
  // equityVestWeights over equityVests); a vest with no month or no date has none.
  const vestW = equityVestWeights(op);
  add('Equity comp', 'W2_JOB', rsuAnnual(op) ?? 0, 'ANNUAL',
      vestW ? { landing_months: vestW.map((share, i) => ({ month: i + 1, share })).filter((x) => x.share > 0) } : {});
  // MONEY THAT LANDS ONCE LANDS IN ITS OWN YEAR AND MONTH, ONCE (2026-10-25, landsOnce; MK-CF-F-079-C04/C05, DEC-0447, DEC-7940):
  // the signing bonus was stored landing in January, every year; it is stored only in the year its date names, in that month
  for (const o of landsOnce(op)) {
    if (o.kind === 'signing' && o.year === new Date().getFullYear()) add('Signing bonus', 'W2_JOB', o.amount, 'ONETIME', o.month ? { landing_month: o.month } : {});
  }

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
  // a one-time payment is stored in the year it lands only, never with no year (2026-10-25, landsOnce; DEC-0447, DEC-7940)
  const otherOnce = landsOnce(op).find((o) => o.kind === 'other');
  if (a.otherFreq !== 'onetime' || (otherOnce && otherOnce.counts && otherOnce.year === new Date().getFullYear())) {
    add(a.otherLabel?.trim() || 'Other income', 'OTHER', toNum(a.otherAmount),
        a.otherFreq === 'annual' ? 'ANNUAL' : a.otherFreq === 'onetime' ? 'ONETIME' : 'MONTHLY',
        { landing_month: Math.min(12, Math.max(1, toNum(a.otherMonth) || 1)) });
  }

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
 * Reaches ..... 444 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 426 more — the full list is on functions_from_code
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
 * Called by ... MK-CF-F-181 rateInForce · MK-CF-F-207 SOURCE
 *               MK-CF-O-001 basePay · MK-CF-O-004 incomeSummary
 *               MK-PL-F-031 taxOrganizer
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
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
 *     ex = extra income(op, now)
 *     ss year = social security received monthly(op) × 12
 *     rows = taxed sources annual(op, now)
 *     ss taxed = rows.find((r) => key = 'social − security').amount (or 0 when missing)
 *     the answer = Σ over rows of (amount)- ss taxed + ss year + ex.nontax monthly × 12 + (ex.onetime nontax ?? 0)
 *
 * Called by ... MK-CF-F-295 debtLoad · MK-CF-F-296 LOAD
 *               MK-PL-F-067 willItLastInputs
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-296 LOAD · MK-CF-F-295 debtLoad
 *               MK-CF-O-017 futurePaycheck · MK-PL-F-068 selectWillItLast
 *               MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If amount is missing it uses 0.
 *     · If onetime nontax is missing it uses 0.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-083
 * Changed ..... 2026-06-11 (6224e5b)
 */
export function totalGrossAnnual(op: OnboardingProfile | null, now: Date = new Date()): number {
  // everything taxed (taxedSourcesAnnual, 2026-10-25), with the whole of the Social Security received in place of its taxed part,
  // and everything untaxed: a one-time amount in its own year only, a vest of this year, unemployment taxed (FIX-INCOME-B)
  const ex = extraIncome(op, now);
  const ssYear = socialSecurityReceivedMonthly(op) * 12;
  const rows = taxedSourcesAnnual(op, now);
  const ssTaxed = rows.find((r) => r.key === 'social-security')?.amount ?? 0;
  return rows.reduce((t, r) => t + r.amount, 0) - ssTaxed + ssYear + ex.nontaxMonthly * 12 + (ex.onetimeNontax ?? 0);
}

/** Taxable annual income (excludes non-taxable benefits/support/scholarships) — the base for tax estimates. */
/* ─ MK-CF-F-084 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * taxableAnnual
 *
 * Answers ..... Taxable annual income (excludes non-taxable benefits/support/scholarships) — the base for tax estimates.
 *
 * Formula .....
 *     Σ over taxed sources annual(op, now) of (amount)
 *
 * Called by ... MK-CF-F-171 earnerPay · MK-CF-F-181 rateInForce
 *               MK-CF-F-230 taxedAfterPreTax · MK-CF-O-001 basePay
 *               MK-CF-O-004 incomeSummary
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-084
 * Changed ..... 2026-07-14 (d33a0a4)
 */
export function taxableAnnual(op: OnboardingProfile | null, now: Date = new Date()): number {
  // THE SUM OF THE ROWS THE YEAR IS TAXED ON, and nothing else (2026-10-25, FIX-INCOME-B; DEC-0376 "a total agrees with the lines
  // printed above it"): taxedSourcesAnnual names each one, so the Income summary's rows add to this.
  return taxedSourcesAnnual(op, now).reduce((t, r) => t + r.amount, 0);
}

/** One source the year is taxed on: what it is, its words, and the year's amount (signed — a rental loss is a loss). */
export interface TaxedSource {
  key: 'wages' | 'tips' | 'self-employment' | 'bonus' | 'signing' | 'equity' | 'rent' | 'interest-dividends' | 'other' | 'one-time'
     | 'unemployment' | 'retirement' | 'social-security';
  label: string;
  amount: number;
  /** on a wage row: which earner, in earnerWages' order (0 is the person) */
  earner?: number;
}

/** What it is for: EVERY SOURCE THE YEAR IS TAXED ON, ONE ROW EACH, SIGNED — taxableAnnual is their sum and the Income summary's
 *  "What it is taxed on" prints them (2026-10-25, FIX-INCOME-B; the outside review's MK-CF-O-004, MK-CF-M-042 and MK-CF-M-076;
 *  DEC-0376, tenet 2). The summary's rows were the wages, the rent above $0, interest and dividends and the bonus, under a total
 *  that held more: $84,000 of rows under "= Gross /year" $126,000 (self-employment, Social Security and other income had no row),
 *  $195,600 under $264,800 (self-employment, stock and Social Security), and a rental losing $500/month gave one $86,400 row
 *  over $80,400. Each row is read from the source's own function: each earner's wages for the year (wageGrossByMonth, the months
 *  that earner is paid), tips with the job, self-employment, a bonus, a signing bonus and a one-time payment in their own year
 *  only (landsOnce), the stock that vests this calendar year (rsuAnnual), the rent net of its running costs (a loss kept),
 *  interest and dividends (the one yearly figure, interestAndDividendsForYear), other income that is taxed, unemployment pay
 *  (IRC §85(a)), retirement income received now, and the part of Social Security IRS Publication 915 taxes
 *  (socialSecurityTaxedAnnual, on everything else less the 401(k)s). A row of $0 is not printed. */
/* ─ MK-CF-F-274 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * taxedSourcesAnnual
 *
 * Answers ..... What it is for: EVERY SOURCE THE YEAR IS TAXED ON, ONE ROW EACH, SIGNED — taxableAnnual is their sum and the Income summary's "What it is taxed on" prints them (2026-10-25, FIX-INCOME-B; the outside review's MK-CF-O-004, MK-CF-M-042 and MK-CF-M-076; DEC-0376, tenet 2).
 *
 * Formula .....
 *     a = op (or none when missing)
 *     year = now.get full year()
 *     rows = []
 *     oth freq = other freq (or 'monthly' when missing)
 *     ss monthly = social security received monthly(op)
 *     k401 = Σ over household k401 by month(op) of (each)
 *     other = Σ over rows of (amount)- k401
 *     the answer = rows
 *
 * Called by ... MK-CF-F-083 totalGrossAnnual · MK-CF-F-084 taxableAnnual
 *               MK-CF-F-088 taxableByCalendarMonth · MK-CF-F-207 SOURCE
 *               MK-CF-F-276 retirementIncomeTaxedMonthly · MK-CF-O-004 incomeSummary
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-020 Social Security monthly amount
 *               MK-XS-I-023 salary and other income
 *               MK-XS-I-039 how often each income arrives
 *               MK-XS-I-055 the wrapper an account sits in — ISA, 401(k), IRA and the rest
 *
 * Decides .....
 *     · If amount is missing it uses 0.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-274
 * Changed ..... not in git yet (—)
 */
export function taxedSourcesAnnual(op: OnboardingProfile | null, now: Date = new Date()): TaxedSource[] {
  const a: any = op ?? {};
  const year = now.getFullYear();
  const rows: TaxedSource[] = [];
  const add = (key: TaxedSource['key'], label: string, amount: number, extra: Partial<TaxedSource> = {}) => {
    if (amount !== 0 && Number.isFinite(amount)) rows.push({ key, label, amount, ...extra });
  };
  earnerWages(op).forEach((w, i) => add('wages', i === 0 ? 'Your wages' : 'Wages', wageGrossByMonth(w).reduce((t, g) => t + g, 0), { earner: i }));
  add('tips', 'Tips', tipsAnnual(op, now));
  add('self-employment', 'Self-employment', a.seFreq === 'annual' ? toNum(a.seAmount) : toNum(a.seAmount) * 12);
  // in the approved drawing's order (income-end-to-end_v07, frame 16): the rent, interest and dividends, then the bonus
  add('rent', 'Rent, net', rentalNetAnnual(op));
  // the one yearly interest-and-dividends figure (FIX-TAX, 2026-10-25): with the profile only it is the figure typed — a figure
  // calculated from the accounts reaches here through profileWithAccountIncome
  const { interestAndDividendsForYear } = require('./from-accounts') as typeof import('./from-accounts');
  add('interest-dividends', 'Interest & dividends', interestAndDividendsForYear(op, [], [], year, now).amount ?? 0);
  add('bonus', 'Bonus', toNum(a.bonusAnnual));
  for (const o of landsOnce(op)) {
    if (!o.taxed || !o.counts || o.year !== year) continue;
    add(o.kind === 'signing' ? 'signing' : 'one-time', o.label, o.amount);
  }
  add('equity', 'Stock vesting', rsuAnnual(op, year) ?? 0);
  const othFreq = a.otherFreq ?? 'monthly';
  if (a.otherTaxable !== 'no' && (othFreq === 'monthly' || othFreq === 'annual')) {
    add('other', String(a.otherLabel ?? '').trim() || 'Other income', othFreq === 'annual' ? toNum(a.otherAmount) : toNum(a.otherAmount) * 12);
  }
  add('unemployment', 'Unemployment', unemploymentMonthly(op) * benefitActiveMonths(op).length);
  const ssMonthly = socialSecurityReceivedMonthly(op);
  add('retirement', 'Retirement income', (currentRetirementIncomeMonthly(op) - ssMonthly) * 12);
  // Social Security last: Publication 915 reads everything else first (the 401(k)s are not income: DEC-0283)
  const k401 = householdK401ByMonth(op).reduce((t, m) => t + m, 0);
  const other = rows.reduce((t, r) => t + r.amount, 0) - k401;
  // the row is printed whenever Social Security is received, $0 included — so a retiree sees where it went, not a missing row
  if (ssMonthly > 0) rows.push({ key: 'social-security', label: 'Social Security, the part that is taxed',
    amount: socialSecurityTaxedAnnual(ssMonthly * 12, other, filingStatusOf(op)) });
  return rows;
}

/** What it is for: THE PROFILE AS EVERY INCOME FIGURE READS IT ONCE THE ACCOUNTS ARE KNOWN — interest and dividends for the year
 *  from the one figure, interestAndDividendsForYear (FIX-TAX, 2026-10-25: the year's records → the figure typed → calculated
 *  from the accounts' rates, ≈ → not entered). Found by CF-MMFIX-B: a figure calculated from the accounts was shown and not
 *  counted in the tax unless it was typed — $3,000 of taxed income dropped out. The lead's ruling (from his DEC-0179, DEC-0198):
 *  the worked-out figure counts in the tax; it stays out of spendable take-home unless the person says it reaches the bank. So
 *  the figure is handed in where the typed one is read (invAnnual), its basis beside it; nothing is stored. With no accounts or
 *  records and nothing typed the profile is returned as it came. */
/* ─ MK-CF-F-275 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * profileWithAccountIncome
 *
 * Answers ..... What it is for: THE PROFILE AS EVERY INCOME FIGURE READS IT ONCE THE ACCOUNTS ARE KNOWN — interest and dividends for the year from the one figure, interestAndDividendsForYear (FIX-TAX, 2026-10-25: the year's records → the figure typed → calculated from the accounts' rates, ≈ → not entered).
 *
 * Formula .....
 *     op   when op is missing
 *     f = interest and dividends for year(op, accounts ?? [], transactions ?? [], now.get full year(), now)
 *     op   when amount = nothing (or basis = 'entered' when missing or zero)
 *     the answer = { ...(op as any), inv annual: amount, inv basis: basis, inv approx: approx } as any
 *
 * Called by ... MK-CF-O-004 incomeSummary · MK-CF-O-007 theTaxOrganizer
 *               MK-PL-F-067 willItLastInputs
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-024 logged expenses
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-275
 * Changed ..... not in git yet (—)
 */
export function profileWithAccountIncome(op: OnboardingProfile | null, accounts: any[] | null | undefined, transactions: any[] | null | undefined,
  now: Date = new Date()): OnboardingProfile | null {
  if (!op) return op;
  const { interestAndDividendsForYear } = require('./from-accounts') as typeof import('./from-accounts');
  const f = interestAndDividendsForYear(op, accounts ?? [], transactions ?? [], now.getFullYear(), now);
  if (f.amount == null || f.basis === 'entered') return op;
  return { ...(op as any), invAnnual: f.amount, invBasis: f.basis, invApprox: f.approx } as any;
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
 * Called by ... MK-CF-F-089 over65CountOf · MK-CF-F-181 rateInForce
 *               MK-CF-F-186 convertTakeHomeMode · MK-CF-F-274 taxedSourcesAnnual
 *               MK-CF-O-004 incomeSummary · MK-CF-O-019 theIncomeManager
 *               MK-PL-F-067 willItLastInputs · MK-PL-F-082 taxableIncomeSteps
 *
 * Reaches ..... 445 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 427 more — the full list is on functions_from_code
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
 * Called by ... MK-CF-F-181 rateInForce · MK-CF-O-001 basePay
 *               MK-CF-O-004 incomeSummary · MK-PL-F-067 willItLastInputs
 *               MK-PL-F-090 rateWordsOf
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
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
 * Called by ... MK-CF-F-092 incomeMonthlyGrid · MK-CF-F-097 grossFromNet
 *               MK-CF-F-234 wagesLandingByMonth · MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
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
 *               MK-CF-F-181 rateInForce · MK-CF-F-188 householdPreTaxContributionsAnnual
 *               MK-CF-F-230 taxedAfterPreTax · MK-CF-F-234 wagesLandingByMonth
 *               MK-CF-F-274 taxedSourcesAnnual
 *
 * Reaches ..... 445 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 427 more — the full list is on functions_from_code
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
 *     year = now.get full year()
 *     sal by month = salary gross by month(op)
 *     tips m = tips monthly read as a number (0 when it is not one)
 *     rental m = rental net annual(op) ÷ 12
 *     ex = extra income(op, now)
 *     ret taxed monthly = retirement income taxed monthly(op, now).taxed
 *     equity by month = (require('.. ÷ cashflow') as typeof import('.. ÷ cashflow')).equity by month(a as any, year)
 *     unemp m = unemployment monthly(op)
 *     ben set = a list with no repeats of benefit active months(op)
 *     level taxed = ex.taxable monthly − ex.unemployment average monthly
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-092 incomeMonthlyGrid
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-023 salary and other income
 *               MK-XS-I-059 the month a bonus lands
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-088
 * Changed ..... 2026-07-29 (13c9be6)
 */
export function taxableByCalendarMonth(op: OnboardingProfile | null, now: Date = new Date()): number[] {
  const a = op ?? {};
  const year = now.getFullYear();
  const salByMonth = salaryGrossByMonth(op);
  const tipsM = toNum(a.tipsMonthly);
  const rentalM = rentalNetAnnual(op) / 12;
  const ex = extraIncome(op, now);
  // retirement income received now, its taxed part only: Social Security is taxed in part (IRS Publication 915, 2026-10-25)
  const retTaxedMonthly = retirementIncomeTaxedMonthly(op, now).taxed;
  // EACH VEST IN ITS OWN YEAR AND MONTH (2026-10-25, FIX-INCOME-B; DEC-0012, DEC-0003): the year's vests by their months — the
  // one reader the Cash flow months read (MK-CF-F-018 equityByMonth over equityVests). It was the run-rate over every year's
  // vest months: 2026 read $4,158.72 in March, $660.60 in June and $2,105.59 in December, where 2026 vests $8,317.43 in March.
  const equityByMonth = (require('../cashflow') as typeof import('../cashflow')).equityByMonth(a as any, year);
  // unemployment pay is taxed in the months it is paid (IRC §85(a), 2026-10-25); the rest of extraIncome's taxed figure is level
  const unempM = unemploymentMonthly(op);
  const benSet = new Set(benefitActiveMonths(op));
  const levelTaxed = ex.taxableMonthly - ex.unemploymentAverageMonthly;
  const bonusIdx = Math.min(11, Math.max(0, (toNum(a.bonusMonth) || 12) - 1));
  // money that lands once lands in its own year and month (landsOnce, 2026-10-25): a signing bonus was every January
  const onceByMonth = new Array(12).fill(0);
  for (const o of landsOnce(op)) if (o.taxed && o.year === year && o.month != null) onceByMonth[o.month - 1] += o.amount;
  // EVERY earner's contribution, not the first one's — see MK-CF-F-206 householdK401ByMonth.
  const k401ByMonth = householdK401ByMonth(op);
  return new Array(12).fill(0).map((_, i) => {
    // B05 (founder audit 2026-08-26): a traditional 401(k) contribution is taken from pay BEFORE
    // tax, so it was never taxable income. It was being taxed — $4,400/year too much on a
    // $120,000 salary putting in $20,000, and the same wrong base set the withholding rate for
    // every month, so it reached take-home, surplus, essentials and the whole cash-flow module.
    // Only in a month with pay, and per earner: nobody contributes out of a month with none — and never more than the pay.
    const pay = Math.max(0, salByMonth[i] + (salByMonth[i] > 0 ? tipsM : 0) - k401ByMonth[i]);
    // A LOSS IS KEPT, NEVER FLOORED (2026-10-25, FIX-INCOME-B; the outside review's MK-CF-F-088-C04; tenets 1 and 4): a month whose
    // rent costs more than the rest brings in is a loss. It read $0, and the month grid rebuilds the month's pay from this figure,
    // so $1,311.17 of pay, $311.43 into a 401(k) and a rental costing $1,731.19 read $311.43 gross and $0 take-home where the money
    // was −$731.45 — and pay that stops after June beside a rental losing $200 read $0 from July, not −$200. Only the pay less its
    // 401(k) stops at $0 (a 401(k) cannot take more than the pay); every other source is added as it is, a loss included.
    let t = pay + rentalM + equityByMonth[i] + levelTaxed + retTaxedMonthly + (benSet.has(i + 1) ? unempM : 0) + onceByMonth[i];
    if (i === bonusIdx) t += toNum(a.bonusAnnual);
    return t;
  });
}

/** What it is for: THE RETIREMENT INCOME RECEIVED NOW, A MONTH, AND THE PART OF IT THAT IS TAXED (2026-10-25, FIX-INCOME-B) — a
 *  pension, an annuity, withdrawals and required withdrawals in full, Social Security in the share IRS Publication 915 taxes
 *  (socialSecurityTaxedAnnual, through taxedSourcesAnnual). The one answer the month grid, the Cash flow months and the Income
 *  summary read, so a retiree's untaxed Social Security is money that lands with no tax on it. Example: single, $2,000/month
 *  of Social Security and nothing else → received $2,000, taxed $0. */
/* ─ MK-CF-F-276 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * retirementIncomeTaxedMonthly
 *
 * Answers ..... What it is for: THE RETIREMENT INCOME RECEIVED NOW, A MONTH, AND THE PART OF IT THAT IS TAXED (2026-10-25, FIX-INCOME-B) — a pension, an annuity, withdrawals and required withdrawals in full, Social Security in the share IRS Publication 915 taxes (socialSecurityTaxedAnnual, through taxedSourcesAnnual).
 *
 * Formula .....
 *     received = current retirement income monthly(op)
 *     received = received
 *     taxed = 0   when not (received > 0)
 *     ss taxed = taxed sources annual(op, now).find((r) => key = 'social − security').amount (or 0 when missing)
 *     the answer:
 *     received = received
 *     taxed = received − social security received monthly(op) + ss taxed ÷ 12
 *
 * Called by ... MK-CF-F-088 taxableByCalendarMonth · MK-CF-F-092 incomeMonthlyGrid
 *               MK-CF-O-004 incomeSummary · MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If amount is missing it uses 0.
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-276
 * Changed ..... not in git yet (—)
 */
export function retirementIncomeTaxedMonthly(op: OnboardingProfile | null, now: Date = new Date()): { received: number; taxed: number } {
  const received = currentRetirementIncomeMonthly(op);
  if (!(received > 0)) return { received, taxed: 0 };
  const ssTaxed = taxedSourcesAnnual(op, now).find((r) => r.key === 'social-security')?.amount ?? 0;
  return { received, taxed: received - socialSecurityReceivedMonthly(op) + ssTaxed / 12 };
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
 *     joint = filing status of(op) = 'married'
 *     the answer:
 *     2   if over65 who = 'both'
 *     0   if over65 who = 'neither'
 *     1   otherwise   otherwise
 *     y = birth year read as a number (0 when it is not one)
 *     0   when y is missing
 *
 * Called by ... MK-CF-F-181 rateInForce · MK-CF-F-186 convertTakeHomeMode
 *               MK-CF-O-004 incomeSummary · MK-CF-O-019 theIncomeManager
 *               MK-PL-F-067 willItLastInputs · MK-PL-F-082 taxableIncomeSteps
 *
 * Reaches ..... 444 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 426 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-017 birth year
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
  // WHENEVER A JOINT RETURN IS USED, ASSUMED OR ANSWERED (2026-10-25, FIX-INCOME-B; the lead): a spouse entered and the filing
  // question never answered is filed jointly (filingStatusOf, DEC-7944), and the spouse's 65-or-over answer was ignored because
  // the raw answer read "married" only once it was given — a couple both over 65 got one extra deduction, not two.
  const joint = filingStatusOf(op) === 'married';
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
 * Called by ... MK-CF-F-087 monthlyTaxRates · MK-PL-F-031 taxOrganizer
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
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

/** What it is for: each earner's wage by calendar month, with the share of it that earner's own typed take-home says comes
 *  out (null when they typed none, so the household rate in force applies). The one place this is worked, read by the
 *  income grid below and by the wages that land in the Cash flow months (wagesLandingByMonth) — so the two cannot drift. */
/* ─ MK-CF-F-233 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * earnerWageShares
 *
 * Answers ..... What it is for: each earner's wage by calendar month, with the share of it that earner's own typed take-home says comes out (null when they typed none, so the household rate in force applies).
 *
 * Formula .....
 *     gross = wage gross by month(w)
 *     year = Σ over gross of (each)
 *     raw = (w as any).lands typical
 *     typed = raw ≠ nothing and string(raw).trim() ! = ''
 *     paid = wage paid months(w)
 *     k401 year = to num((w as any).c 401k) × paid
 *     own = min(1, max(0, (year − k401 year − to num(raw) × paid) ÷ year))   if typed and year > 0
 *     nothing   otherwise
 *     the answer = { gross, own }
 *
 * Called by ... MK-CF-F-092 incomeMonthlyGrid · MK-CF-F-234 wagesLandingByMonth
 *               MK-CF-F-243 grossCalendarYear
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-043 their own retirement contribution
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-233
 * Changed ..... not in git yet (—)
 */
export function earnerWageShares(op: OnboardingProfile | null): { gross: number[]; own: number | null }[] {
  return earnerWages(op).map((w) => {
    const gross = wageGrossByMonth(w);
    const year = gross.reduce((t, g) => t + g, 0);
    // PART-YEAR PAY, ONE RULE (2026-10-26, FIX-INCOME-A; DEC-7938, DEC-0376, DEC-0176 "if they told us, that IS take-home";
    // tenets 1, 4, 5): the take-home and the 401(k) are each a PAID month's, so the year of each is that month × the months paid
    // (MK-CF-F-206 counts the 401(k) the same way). It took the take-home × 12: the July starter ($60,000.30 over six months,
    // $501.13 into a 401(k), $3,799.17 typed) read 19.01% and landed $7,598.34 a paid month; now 57.00% and $3,799.17. A take-home
    // typed as 0 is the person's answer, not silence (tenet 5): a blank is not typed.
    const raw = (w as any).landsTypical;
    const typed = raw != null && String(raw).trim() !== '';
    const paid = wagePaidMonths(w);
    const k401Year = toNum((w as any).c_401k) * paid;
    const own = typed && year > 0 ? Math.min(1, Math.max(0, (year - k401Year - toNum(raw) * paid) / year)) : null;
    return { gross, own };
  });
}

/** What it is for: HOW MANY MONTHS OF THIS CALENDAR YEAR ONE WAGE IS PAID IN — the months its gross is above $0. A take-home
 *  and a 401(k) are each a paid month's, so the year of either is that month × this (2026-10-26, FIX-INCOME-A; DEC-7938,
 *  DEC-0376). The one count every wage reader uses: the take-home shares above, the yearly entered take-home (MK-CF-F-180), the
 *  rate in force (MK-CF-F-181) and the year's 401(k)s (MK-CF-F-188, through MK-CF-F-206). */
/* ─ MK-CF-F-277 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * wagePaidMonths
 *
 * Answers ..... What it is for: HOW MANY MONTHS OF THIS CALENDAR YEAR ONE WAGE IS PAID IN — the months its gross is above $0.
 *
 * Formula .....
 *     wage gross by month(w) where each > 0count of
 *
 * Called by ... MK-CF-F-180 enteredLandsAnnual · MK-CF-F-188 householdPreTaxContributionsAnnual
 *               MK-CF-F-233 earnerWageShares · MK-CF-F-261 ownK401Annual
 *               MK-CF-F-262 payrollMonths
 *
 * Reaches ..... 449 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 431 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-277
 * Changed ..... not in git yet (—)
 */
export function wagePaidMonths(w: Record<string, any> | null): number {
  return wageGrossByMonth(w).filter((g) => g > 0).length;
}

/** What it is for: THE WAGES THAT LAND, month by month, January first — every earner's pay after its tax and after the
 *  401(k)s, the take-home Your base pay and the Income summary print. Found 2026-10-24 by the Cash flow journey suite
 *  (E2E-71): the Cash flow months took the tax off the wage and left the 401(k) in, so a $9,000 salary putting $1,000 into a
 *  401(k) read $7,976 on This month and Home beside $6,976 on Your base pay, and a take-home typed as $6,200 read $7,200. */
/* ─ MK-CF-F-234 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * wagesLandingByMonth
 *
 * Answers ..... What it is for: THE WAGES THAT LAND, month by month, January first — every earner's pay after its tax and after the 401(k)s, the take-home Your base pay and the Income summary print.
 *
 * Formula .....
 *     rates = monthly tax rates(op, now)
 *     k401 = household k401 by month(op)
 *     shares = earner wage shares(op)
 *     the answer = for each of MONTH_ABBR: Σ over shares of (gross[i] × (1 − (own ?? rates[i])))- k401[i]
 *
 * Called by ... MK-CF-F-090 effectiveRate · MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-004 holding quantity (shares)
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-234
 * Changed ..... not in git yet (—)
 */
export function wagesLandingByMonth(op: OnboardingProfile | null, now: Date = new Date()): number[] {
  const rates = monthlyTaxRates(op, now);
  const k401 = householdK401ByMonth(op);
  const shares = earnerWageShares(op);
  return MONTH_ABBR.map((_, i) => shares.reduce((t, w) => t + w.gross[i] * (1 - (w.own ?? rates[i])), 0) - k401[i]);
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
 *     k401 by month = household k401 by month(op)
 *     rates = monthly tax rates(op, now)
 *     equity by month = (require('.. ÷ cashflow') as typeof import('.. ÷ cashflow')).equity by month(a as any, now.get full year())
 *     vest cash = vests are cash(op)
 *     ex = extra income(op, now)
 *     nontax flat = support monthly read as a number (0 when it is not one)
 *     ben untaxed m = to num(benefit monthly) − unemployment monthly(op)
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-002 plannedMonthlySpend · MK-CF-F-011 savingsByMonth
 *               MK-CF-F-012 annualCashflow · MK-CF-F-049 buildIncomeState
 *               MK-CF-F-120 pctBaseMonthly · MK-CF-O-004 incomeSummary
 *               MK-PL-F-098 goalsCapacity · MK-XS-F-027 takeHomeMonthly
 *
 * Reaches ..... 443 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 425 more — the full list is on functions_from_code
 *
 * Serves ...... MK-XS-M-006
 * Reads ....... MK-XS-I-023 salary and other income
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-092
 * Changed ..... 2026-07-29 (13c9be6)
 */
export function incomeMonthlyGrid(op: OnboardingProfile | null, mode: 'gross' | 'net' | 'available' = 'available', now: Date = new Date()): { label: string; amount: number }[] {
  const a = op ?? {};
  const salByMonth = salaryGrossByMonth(op);   // per-month gross base salary (table-driven)
  const tipsM = toNum(a.tipsMonthly);          // tips ride with the job (only in months you're paid)
  const rentalM = rentalNetAnnual(op) / 12;
  const k401ByMonth = householdK401ByMonth(op);   // EVERY earner's — MK-CF-F-206
  const rates = monthlyTaxRates(op, now);   // one shared vector — the rate in force, every month

  // each vest in its own year and month (equityByMonth over equityVests, 2026-10-25) — taxed in it; SHARES, NOT CASH, unless
  // the person says they sell them when they vest (vestsAreCash; the lead's ruling, like his DEC-0179): held, neither the vest
  // nor a tax on it moves the month's take-home, which stays the usual month (CFR-5's reading B on MK-CF-M-009)
  const equityByMonth = (require('../cashflow') as typeof import('../cashflow')).equityByMonth(a as any, now.getFullYear());
  const vestCash = vestsAreCash(op);

  const ex = extraIncome(op, now);
  const nontaxFlat = toNum(a.supportMonthly);                              // genuinely monthly, non-taxable
  // benefits land in THEIR months; the unemployment pay among them is taxed (in the taxable months, IRC §85(a), 2026-10-25)
  const benUntaxedM = toNum(a.benefitMonthly) - unemploymentMonthly(op);
  const benSet = new Set(benefitActiveMonths(op));
  const schByMonth = scholarshipByCalendarMonth(op);                       // lumpy — placed in its months
  // Social Security lands whole; the part Publication 915 does not tax lands with no tax on it (2026-10-25)
  const ret = retirementIncomeTaxedMonthly(op, now);
  const retUntaxedM = ret.received - ret.taxed;
  // an untaxed one-time amount (a gift) in its own year and month only (landsOnce, 2026-10-25)
  const onceUntaxed = new Array(12).fill(0);
  for (const o of landsOnce(op)) if (!o.taxed && o.year === now.getFullYear() && o.month != null) onceUntaxed[o.month - 1] += o.amount;
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
  // (2026-10-24) worked in one place, earnerWageShares, which the Cash flow months read too
  const wageRows = earnerWageShares(op);
  return MONTH_ABBR.map((label, i) => {
    const taxable = taxableByMonth[i];
    const earnedBefore401k = taxable + k401ByMonth[i];   // what the job actually paid
    const nontax = nontaxFlat + schByMonth[i] + (benSet.has(i + 1) ? benUntaxedM : 0)
      + onceUntaxed[i] + retUntaxedM;    // support steady; benefits/scholarships/gifts in their months; Social Security's untaxed part
    // Interest and dividends are taxed above and then taken back out here: they are reinvested where
    // they are earned and never reach the bank. Say they are paid out and the subtraction stops.
    const vestHeld = vestCash ? 0 : equityByMonth[i];   // shares, not cash: out of the month, and out of its tax
    const gross = earnedBefore401k + nontax - ex.reinvestedMonthly - vestHeld;
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
    // exactly the rent and the interest and dividends, a loss included (2026-10-25): the month is no longer floored, so there is
    // nothing to cap it at
    const notOnThePayslip = rentalM + toNum(a.invAnnual) / 12;
    // a CALCULATED rate is the year's tax ÷ everything taxable, so it is applied to everything taxable
    // (that is how the tax on reinvested dividends still comes out of pay — the law in dividends.test.ts)
    const wages = wageRows.reduce((t, w) => t + w.gross[i], 0);
    const taxOnWages = wageRows.reduce((t, w) => t + w.gross[i] * (w.own ?? rates[i]), 0);
    const tax = taxOnWages + (earnedBefore401k - wages - vestHeld - (rateIsTheirs ? notOnThePayslip : 0)) * rates[i];
    const k401 = k401ByMonth[i];   // nobody contributes out of a month with no pay; every earner counted
    const amount = mode === 'gross' ? gross
                 : mode === 'available' ? gross - tax - k401     // take-home: after tax AND 401(k)
                 : gross - tax;                                   // net: after tax, before the 401(k)
    return { label, amount: (amount) };
  });
}

export { DEFAULT_TAX };
