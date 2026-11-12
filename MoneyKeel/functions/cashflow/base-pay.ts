// Your base pay — gross, the 401(k), and the take-home.
//
// Bonus, stocks and other income are captured on their own screens and are NOT here.
//
// WHY THIS FILE EXISTS. Base pay used to be one field with a Gross / Take-home toggle. When
// someone chose take-home the app inverted tax to find a gross, then taxed it back down — and
// because take-home ALREADY has the 401(k) out of it, the contribution came off twice. Someone
// typing $4,818/month with $20,000/year going into a 401(k) was shown $3,351: $1,467/month
// adrift from what they had just typed. That is finding B27.
//
// The fix is to stop deriving what the person can tell us. Gross is asked for and is required.
// The 401(k) and the take-home are asked for and are optional. Nothing is ever grossed up.
//
// EVERY RULING BELOW IS THE FOUNDER'S, MADE 2026-08-27, and is named where it applies.
import { declareFigures, percentDigits } from '../_figure-spec';
import { PAY_FREQUENCIES, payPeriodsAYear } from '../../../src/domain/income/pay-frequency';   // the one table (R23, 2026-11-01)
import { toNum } from '../../../src/domain/_shared/num';
import { taxOwedFor, marginalBracketFor, type FilingStatus } from '../../../src/domain/income/tax';
import { money } from '../../../src/domain/_shared/num';
import { salaryMonths, salaryCalendarYear } from '../../../src/domain/income/salary-months';
import { rateInForce } from '../../../src/domain/income/tax-rate';
import { wageMatchMonthly, taxableAnnual, rentalNetAnnual, stateRateOf, salaryAnnual } from '../../../src/domain/income/onboarding';

/** How often the person is paid, and how many of those periods make a year. */
export const PAY_PERIODS: Record<string, number> = PAY_FREQUENCIES;   // THE ONE TABLE (R23, 2026-11-01): src/domain/income/pay-frequency.ts

/** What the base-pay screen collects. `byMonth` keys are 'YYYY-MM' — never a position in an
 *  array, because the table runs from last month to twelve ahead and crosses a year boundary. */
export interface BasePayEntry {
  freq: keyof typeof PAY_PERIODS | string;
  varies: boolean;
  grossTypical: any;                          // per period, as typed
  grossByMonth?: Record<string, any>;         // 'YYYY-MM' → amount, when pay varies
  monthly401k: any;                           // their own contribution, per month
  landsTypical?: any;                         // EACH MONTH, whatever the pay frequency — the screen asks "take-home each month" (approved drawing v07, frames 2b and 2c) — OPTIONAL
  landsByMonth?: Record<string, any>;
  hoursPerWeek?: any;
  /** the employer's match as typed — a share of their own 401(k) ('pct', the default every screen shows chosen) or a set
   *  amount a month ('dollar') — so the section can say what it is worth (2026-10-25, IN-04) */
  matchMode?: 'pct' | 'dollar' | string;
  matchValue?: any;
  /** THE BAND IS NOT BASE PAY'S TO WORK OUT. A tax band is set by everything the household is taxed
   *  on together — both wages, the rent kept, the bonus, the dividends — so it is produced ONCE, by
   *  MK-CF-F-084 taxable annual feeding MK-CF-F-090 effective rate, and handed in here. Base pay
   *  reads it. Absent means single, which is what the whole app assumed before the filing-status
   *  question existed, so leaving it out changes no number. Founder ruling 2026-08-27. */
  filingStatus?: FilingStatus;
  over65?: number;
  /** The HOUSEHOLD rate to estimate with, 0–1 of gross — injected by the orchestrator from the one
   *  rate in force. Build 54 let each estimated earner run the federal schedule alone, so each was
   *  granted the FULL joint deduction and the card's own rows disagreed: gross − tax − 401(k)s did
   *  not equal the lands it printed. One rate, applied per earner, makes the identity exact. */
  estRate?: number;
}

/** How many pay periods a year a pay frequency has, taken as 12 when it is monthly or not stated. */
/* ─ MK-CF-F-140 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * periodsAYear
 *
 * Answers ..... How many pay periods a year a pay frequency has, taken as 12 when it is monthly or not stated.
 *
 * Formula .....
 *     pay periods ayear(freq)
 *
 * Called by ... MK-CF-F-141 perMonth · MK-CF-F-297 freqNotRecognised
 *
 * Reaches ..... 561 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 543 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-140
 * Changed ..... not in git yet (—)
 */
const periodsAYear = (e: BasePayEntry): number | null => payPeriodsAYear(e.freq);

/** One period of pay expressed as a month. Hourly multiplies by the hours actually worked. */
/* ─ MK-CF-F-141 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * perMonth
 *
 * Answers ..... One period of pay expressed as a month.
 *
 * Formula .....
 *     n = amount read as a number (0 when it is not one)
 *     nothing   when hours per week = nothing (or string(hours per week).trim() = '' when missing or zero)
 *     the answer = (n × to num(hours per week) × 52) ÷ 12
 *     periods = periods ayear(e)
 *
 * Called by ... MK-CF-F-128 grossByMonth · MK-CF-F-130 enteredMonthlyRaw
 *               MK-CF-F-171 earnerPay · MK-CF-F-243 grossCalendarYear
 *               MK-CF-F-245 hoursNotEntered
 *
 * Reaches ..... 561 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 543 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-075 hours a week, for a wage paid by the hour
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-141
 * Changed ..... not in git yet (—)
 */
function perMonth(amount: any, e: BasePayEntry): number | null {
  const n = toNum(amount);
  if (String(e.freq) === 'hourly') {
    // HOURS A WEEK NOT ENTERED IS NO NUMBER (2026-10-26, FIX-INCOME-A; his DEC-0296 "an unknown input produces no number and a
    // reason — never a default", tenet 3): $25 an hour read $4,333.33 a month on a 40-hour week nobody entered. A typed 0 is an answer.
    if (e.hoursPerWeek == null || String(e.hoursPerWeek).trim() === '') return null;
    return (n * toNum(e.hoursPerWeek) * 52) / 12;
  }
  // a frequency outside the one table is no figure and a reason (R23, DEC-0296) — it was read as a month
  const periods = periodsAYear(e);
  return periods == null ? null : (n * periods) / 12;
}

/** The months the person filled in, in order. Empty when their pay is the same every month. */
/* ─ MK-CF-F-142 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * monthsOf
 *
 * Answers ..... The months the person filled in, in order.
 *
 * Formula .....
 *     []   when table is missing
 *     for each of the names in table, in order: [each, to num(table[each])] as [string, number]
 *
 * Called by ... MK-CF-F-128 grossByMonth · MK-CF-F-144 takeHomeAsEntered
 *               MK-CF-F-146 payFiguresAgree · MK-CF-F-243 grossCalendarYear
 *
 * Reaches ..... 561 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 543 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-142
 * Changed ..... not in git yet (—)
 */
function monthsOf(table: Record<string, any> | undefined): [string, number][] {
  if (!table) return [];
  return Object.keys(table).sort().map((k) => [k, toNum(table[k])] as [string, number]);
}

/** GROSS pay for each month the table covers, or twelve identical months when pay is steady. */
/* ─ MK-CF-F-128 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * grossByMonth
 *
 * Answers ..... GROSS pay for each month the table covers, or twelve identical months when pay is steady.
 *
 * Formula .....
 *     table = months of(gross by month)
 *     table   when count of varies and table
 *     the answer = [['typical', per month(gross typical, e) ?? 0]]
 *
 * Called by ... MK-CF-F-146 payFiguresAgree · MK-CF-F-171 earnerPay
 *               MK-CF-F-243 grossCalendarYear
 *
 * Reaches ..... 561 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 543 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-128
 * Changed ..... not in git yet (—)
 */
export function grossByMonth(e: BasePayEntry): [string, number][] {
  const table = monthsOf(e.grossByMonth);
  if (e.varies && table.length) return table;
  return [['typical', perMonth(e.grossTypical, e) ?? 0]];   // hours a week not entered: no typical month (DEC-0296)
}

/** GROSS PAY ANNUALISED — the figure a tax bracket is read from.
 *
 *  [Founder 2026-08-27] Average the months given and multiply by twelve. NEVER sum the window:
 *  it runs from last month to twelve ahead, so fourteen months totalling $103,000 is an average of
 *  $7,357 and therefore $88,286/year — not $103,000. Summing would tax fourteen months of pay as
 *  if it were twelve, which on those figures is $3,237 of tax nobody owes.
 *
 *  [Founder 2026-08-27] And it is never read from take-home — the take-home also carries
 *  medical cover and anything else bought through work, so it understates the bracket. */
/* ─ MK-CF-F-143 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * annualisedGross
 *
 * Answers ..... GROSS PAY ANNUALISED — the figure a tax bracket is read from.
 *
 * Formula .....
 *     Σ over gross calendar year(e) of (each)
 *
 * Called by ... MK-CF-F-144 takeHomeAsEntered · MK-CF-F-145 deductionsFromPay
 *               MK-CF-F-146 payFiguresAgree · MK-CF-F-171 earnerPay
 *               MK-CF-F-240 PAY_LANDS_TYPED
 *
 * Reaches ..... 561 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 543 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-143
 * Changed ..... not in git yet (—)
 */
export function annualisedGross(e: BasePayEntry): number {
  // A TABLE OF PAY THAT VARIES IS READ AS THIS CALENDAR YEAR'S TWELVE MONTHS, by the helper every Cash flow month reads
  // (salaryCalendarYear, as wageGrossByMonth does), so Your base pay and Cash flow give one number (2026-10-25, CF-MMFIX-B;
  // drawing check IN-05; the lead's ruling on CFR-5's F7; tenets 4 and 5). A month typed — $0 included — counts as typed: a
  // typed $0 is an answer. A month with nothing typed, never or cleared, counts as the typical month: "Every month below
  // starts from this" (drawing v07, phone 6). It averaged the typed months only, so Sam, paid $2,077 a fortnight with
  // September typed at $6,000, read every month as $6,000 ($72,000) where the year is 11 × $4,500.17 + $6,000 = $55,502; and
  // averaging the screen's fourteen months instead (2026-10-25, briefly) read a worker paid $12,500 from July, $0 before, as
  // $109,091 where this year is $75,000.
  // (2026-10-26, FIX-INCOME-A) one reading of the year for both shapes — steady pay is twelve typical months — so the months the
  // wage is paid (paidMonthsOf) come from the same twelve numbers as its year
  return grossCalendarYear(e).reduce((t, v) => t + v, 0);
}

/** What it is for: ONE WAGE'S GROSS FOR EACH MONTH OF THIS CALENDAR YEAR, January first — a month typed is what was typed ($0
 *  included), a month not typed is the typical month, and steady pay is the typical month twelve times. The same twelve numbers
 *  the Cash flow months read for the stored wage (MK-CF-F-177 wageGrossByMonth, through MK-CF-F-167 salaryCalendarYear), so Your
 *  base pay's year and its paid months cannot drift from them (2026-10-26, FIX-INCOME-A). Hours a week not entered: an hourly
 *  wage has no typical month, so only the months typed count (DEC-0296). */
/* ─ MK-CF-F-243 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * grossCalendarYear
 *
 * Answers ..... What it is for: ONE WAGE'S GROSS FOR EACH MONTH OF THIS CALENDAR YEAR, January first — a month typed is what was typed ($0 included), a month not typed is the typical month, and steady pay is the typical month twelve times.
 *
 * Formula .....
 *     typical = per month(gross typical, e) (or 0 when missing)
 *     table = months of(gross by month)
 *     the answer = salary calendar year({ salary by month: object.from entries(table) } as any, new date().get full year(), typical)
 *
 * Called by ... MK-CF-F-143 annualisedGross · MK-CF-F-244 paidMonthsOf
 *
 * Reaches ..... 561 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 543 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-023 salary and other income
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-243
 * Changed ..... not in git yet (—)
 */
export function grossCalendarYear(e: BasePayEntry): number[] {
  const typical = perMonth(e.grossTypical, e) ?? 0;
  const table = monthsOf(e.grossByMonth);
  if (e.varies && table.length) {
    return salaryCalendarYear({ salaryByMonth: Object.fromEntries(table) } as any, new Date().getFullYear(), typical);
  }
  return new Array(12).fill(typical);
}

/** What it is for: HOW MANY MONTHS OF THIS CALENDAR YEAR THE WAGE IS PAID IN — the months of grossCalendarYear above $0. A
 *  take-home and a 401(k) are each a paid month's (the screen asks for them "each month"), so the year of either is that month
 *  × this — the rule the Cash flow months use (MK-CF-F-206 householdK401ByMonth; MK-CF-F-233 earnerWageShares). It took twelve:
 *  the July starter's $3,799.17 a month read $45,590.04 a year and "Everything else taken out" $700/month where a paid month
 *  takes out $5,699.75 (2026-10-26, FIX-INCOME-A; DEC-7938, DEC-0376, tenets 1 and 4). */
/* ─ MK-CF-F-244 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * paidMonthsOf
 *
 * Answers ..... What it is for: HOW MANY MONTHS OF THIS CALENDAR YEAR THE WAGE IS PAID IN — the months of grossCalendarYear above $0.
 *
 * Formula .....
 *     gross calendar year(e) where each > 0count of
 *
 * Called by ... MK-CF-F-143 annualisedGross · MK-CF-F-144 takeHomeAsEntered
 *               MK-CF-F-145 deductionsFromPay · MK-CF-F-146 payFiguresAgree
 *               MK-CF-F-171 earnerPay
 *
 * Reaches ..... 561 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 543 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-244
 * Changed ..... not in git yet (—)
 */
export function paidMonthsOf(e: BasePayEntry): number {
  return grossCalendarYear(e).filter((g) => g > 0).length;
}

/** What it is for: an hourly wage whose hours a week are not entered — Your base pay says so and counts none of it (DEC-0296). */
/* ─ MK-CF-F-245 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * hoursNotEntered
 *
 * Answers ..... What it is for: an hourly wage whose hours a week are not entered — Your base pay says so and counts none of it (DEC-0296).
 *
 * Formula .....
 *     string(freq) = 'hourly' and to num(gross typical) > 0 and per month(gross typical, e) = nothing
 *
 * Called by ... MK-CF-F-145 deductionsFromPay · MK-CF-F-171 earnerPay
 *               MK-CF-F-308 payPeriodsAYear · MK-CF-O-001 basePay
 *
 * Reaches ..... 561 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 543 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-245
 * Changed ..... not in git yet (—)
 */
export function hoursNotEntered(e: BasePayEntry): boolean {
  return String(e.freq) === 'hourly' && toNum(e.grossTypical) > 0 && perMonth(e.grossTypical, e) == null;
}

/** What it is for: whether a wage's pay frequency is outside the one table (R23, 2026-11-01) — no figure, and the refusal in words. */
/* ─ MK-CF-F-297 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * freqNotRecognised
 *
 * Answers ..... What it is for: whether a wage's pay frequency is outside the one table (R23, 2026-11-01) — no figure, and the refusal in words.
 *
 * Formula .....
 *     periods ayear(e) = nothing
 *
 * Called by ... MK-CF-F-145 deductionsFromPay · MK-CF-F-171 earnerPay
 *               MK-CF-O-001 basePay
 *
 * Reaches ..... 561 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 543 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-297
 * Changed ..... not in git yet (—)
 */
export function freqNotRecognised(e: BasePayEntry): boolean {
  return periodsAYear(e) == null;
}

/** WHAT LANDS IN THE BANK, each month.
 *
 *  [Founder 2026-08-27] If they told us, that IS take-home — used exactly as typed, never
 *  grossed up and never taxed again.
 *
 *  [Founder 2026-08-27] If they did not, estimate it from gross and say so. The estimate deducts
 *  tax only, and NEVER a 401(k) they have not entered — we do not subtract what nobody told us
 *  about. It also knows nothing about state tax or insurance, so it reads high; the caller is
 *  expected to show it prefixed with ≈ and say what it cannot see. */
export interface TakeHome { monthly: number; estimated: boolean; why: string; }

/** A person's monthly take-home exactly as they entered it, averaged over their month-by-month table when their pay varies, or a calculated figure marked as calculated when they entered none. */
/* ─ MK-CF-F-144 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * takeHomeAsEntered
 *
 * Answers ..... A person's monthly take-home exactly as they entered it, averaged over their month-by-month table when their pay varies, or a calculated figure marked as calculated when they entered none.
 *
 * Formula .....
 *     months = months of(lands by month)
 *     entered = lands typical
 *     gross = annualised gross(e)
 *     paid = paid months of(e)
 *     k401 = to num(monthly401k) × paid
 *     per = paid   if paid > 0
 *     12   otherwise
 *     taxable = max(0, gross − k401)
 *     monthly = (gross − k401 − tax owed for(taxable, filing status ?? 'single', 0, over65 ?? 0)) ÷ per
 *
 * Called by ... MK-CF-F-145 deductionsFromPay · MK-CF-F-146 payFiguresAgree
 *               MK-CF-F-171 earnerPay
 *
 * Reaches ..... 561 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 543 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Decides .....
 *     · If over65 is missing it uses 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-144
 * Changed ..... not in git yet (—)
 */
export function takeHomeAsEntered(e: BasePayEntry): TakeHome {
  // A person whose pay varies fills the TABLE, and may never type a typical figure at all. Reading
  // only landsTypical treated them as having entered nothing, so their real figures were thrown
  // away and replaced by an estimate — and the month-by-month check was skipped with them.
  const months = monthsOf(e.landsByMonth);
  if (e.varies && months.length) {
    return { monthly: (months.reduce((t, [, v]) => t + v, 0) / months.length),
             estimated: false, why: 'the take-home you entered, month by month' };
  }
  const entered = e.landsTypical;
  // A TAKE-HOME TYPED AS 0 IS THE PERSON'S ANSWER (2026-10-26, FIX-INCOME-A; tenet 5, the lead's ruling 3 on CFR-1): only a blank
  // is "not entered". It read $0 as nothing typed and put a calculated $3,500 in its place.
  if (entered != null && String(entered).trim() !== '') {
    // The screen asks for the take-home EACH MONTH at every pay frequency (approved drawing v07:
    // "Sam’s take-home each month — $3,300", for someone paid fortnightly). It was being scaled as
    // though it were typed for each pay period, which turned $3,300 into $7,150 (found 2026-10-04
    // holding the screen to its drawing). Used exactly as typed.
    return { monthly: toNum(entered), estimated: false,
             why: 'the take-home you entered' };
  }
  const gross = annualisedGross(e);
  // A PAID MONTH'S TAKE-HOME (2026-10-26, FIX-INCOME-A; DEC-7938, DEC-0376, tenets 1 and 4): the 401(k) comes out of the months the
  // wage is paid, and the take-home is a month you are paid — that month's take-home, as a typed take-home is and as the Cash flow
  // months land it. It took twelve months of 401(k) out of the year and spread what was left over twelve: $10,000/month from July with
  // $1,000 into a 401(k) read $3,642 where each paid month lands $8,283.
  const paid = paidMonthsOf(e);
  const k401 = (toNum(e.monthly401k) * paid);      // zero unless they entered one
  const per = paid > 0 ? paid : 12;                // no month of pay: $0/month, as before
  if (e.estRate != null) {
    // The household rate in force — typed, or the federal estimate on the WHOLE household. Never
    // this wage through the schedule alone: that hands every earner the full standard deduction.
    return { monthly: ((gross * (1 - e.estRate) - k401) / per), estimated: true,
             why: `calculated at the household rate of ${percentDigits(e.estRate, 0)}% — this take-home is higher than it will really be until the real figure is entered` };
  }
  const taxable = Math.max(0, gross - k401);
  // The band is a property of EVERYTHING the household is taxed on, never of this wage alone
  // (founder ruling 2026-08-27). Base pay READS it: the status and the over-65 count come in with
  // the entry, and default to a single filer only because that is what the app assumed before the
  // filing-status question existed.
  const monthly = ((gross - k401 - taxOwedFor(taxable, e.filingStatus ?? 'single', 0, e.over65 ?? 0)) / per);
  return {
    monthly, estimated: true,
    why: k401 > 0
      ? 'calculated from your gross pay, after your 401(k) and federal tax — it knows nothing about your state or your insurance, so this take-home is higher than it will really be'
      : 'calculated from your gross pay and federal tax. Nothing is taken out for a 401(k), because you have not entered one. It knows nothing about your state or your insurance either, so this take-home is higher than it will really be',
  };
}

/** EVERYTHING ELSE TAKEN OUT — gross, less the 401(k), less the take-home.
 *
 *  One number covering federal tax, state tax, medical cover and anything else bought through
 *  work. [Founder 2026-08-27] It is deliberately not split: splitting means asking about each,
 *  and the point of asking for three figures is not having to.
 *
 *  Null when they have not entered a take-home — there is nothing to derive it from, and an estimate
 *  minus an estimate is not a fact. */
/* ─ MK-CF-F-145 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * deductionsFromPay
 *
 * Answers ..... EVERYTHING ELSE TAKEN OUT — gross, less the 401(k), less the take-home.
 *
 * Formula .....
 *     t = take home as entered(e)
 *     nothing   when estimated (or hours not entered(e) (or freq not recognised(e) when missing or zero) when missing or zero)
 *     paid = paid months of(e)
 *     the answer = annualised gross(e) − (to num(monthly401k) × paid) − (monthly × paid)
 *
 * Called by ... MK-CF-F-171 earnerPay
 *
 * Reaches ..... 561 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 543 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in a g r e e t o l e r a n c e of 5.
 *     · Uses a built-in h i g h d e d u c t i o n s h a r e of 60%.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-145
 * Changed ..... not in git yet (—)
 */
export function deductionsFromPay(e: BasePayEntry): number | null {
  const t = takeHomeAsEntered(e);
  if (t.estimated || hoursNotEntered(e) || freqNotRecognised(e)) return null;   // no gross to take it from (DEC-0296; R23)
  // the 401(k) and the take-home of the months paid, never × 12 (2026-10-26, FIX-INCOME-A; DEC-7938, DEC-0376, tenet 1): the July
  // starter's $60,000.30 − $3,006.78 − $22,795.02 = $34,198.50 a year, where twelve of each read $8,396.70
  const paid = paidMonthsOf(e);
  return (annualisedGross(e) - (toNum(e.monthly401k) * paid) - (t.monthly * paid));
}

/** DO THE THREE FIGURES AGREE?
 *
 *  [Founder 2026-08-27] Within $5 either way. That absorbs someone rounding their own figures and
 *  still catches a wrong frequency — a gross entered per fortnight against a monthly take-home is
 *  out by hundreds, not by five.
 *
 *  [Founder 2026-08-27] Deductions over 60% of gross WARN but never block. It usually means a
 *  figure went in at the wrong frequency — but some people really do have deductions that high,
 *  and we do not tell someone their own payslip is impossible. */
export const AGREE_TOLERANCE = 5;
export const HIGH_DEDUCTION_SHARE = 0.6;

export interface PayVerdict { ok: boolean; warn: boolean; say: string; }

/** Checks month by month that gross pay, less the 401(k), is enough to leave the take-home the person entered, and says in words when it is not or when an unusually large share goes elsewhere. */
/* ─ MK-CF-F-146 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * payFiguresAgree
 *
 * Answers ..... Checks month by month that gross pay, less the 401(k), is enough to leave the take-home the person entered, and says in words when it is not or when an unusually large share goes elsewhere.
 *
 * Formula .....
 *     t = take home as entered(e)
 *     ok = true
 *     warn = false
 *     say = ''   when estimated
 *     k401 = monthly401k read as a number (0 when it is not one)
 *     gm = gross by month(e)
 *     lands = a lookup of lm
 *     full = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
 *     in month = the first 4)}` : '' of (key: string) => ( ÷ ^\d{4}-\d{2}$ ÷ .test(key) ? ` in ${FULL[number(key.slice(5)) − 1]} ${key
 *     warning = nothing
 *     landed = lands.get(key) as number   if lands.has(key)
 *     lands typical read as a number (0 when it is not one)   otherwise
 *     left = gross − k401 − landed
 *     when = in month(key)
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-171 earnerPay
 *
 * Reaches ..... 561 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 543 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-146
 * Changed ..... not in git yet (—)
 */
export function payFiguresAgree(e: BasePayEntry): PayVerdict {
  const t = takeHomeAsEntered(e);
  if (t.estimated) return { ok: true, warn: false, say: '' };   // nothing to reconcile against

  // [Founder 2026-08-27, approved mock] EVERY MONTH IS CHECKED ON ITS OWN, not only the total.
  // A year that balances can still hide one month entered at the wrong figure — two months out by
  // equal amounts in opposite directions cancel, and the total says nothing is wrong.
  const k401 = (toNum(e.monthly401k));
  const gm = grossByMonth(e);
  const lm = e.varies && e.landsByMonth
    ? monthsOf(e.landsByMonth)
    : gm.map(([k]) => [k, toNum(e.landsTypical)] as [string, number]);
  const lands = new Map(lm);

  // A MONTH WITH NO PAY IS NOT RECONCILED (2026-10-25, CFR-5 found F6; tenet 1): no 401(k) comes out of a month typed $0, and a
  // take-home typed for the paid months is not that month's. It read "These three cannot all be right in 2026-01. $0 gross, less
  // $501 into your 401(k) …" for a worker paid from July. A take-home typed for that very month is still checked. The month is
  // named in words ("in March 2026"), never as a key ("in 2026-03").
  const FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const inMonth = (key: string) => (/^\d{4}-\d{2}$/.test(key) ? ` in ${FULL[Number(key.slice(5)) - 1]} ${key.slice(0, 4)}` : '');
  // A WARNING NEVER HIDES A LATER MONTH THAT CANNOT BE RIGHT (2026-10-26, FIX-INCOME-A; tenet 1): every month is read before the
  // verdict. It returned on the first warning, so January's 75% "higher than most" stood while February's $3,000.17 − $500.13 −
  // $2,800.19 = −$300.15 was never read, and the check passed. The first month that cannot be right wins; else the first warning.
  let warning: PayVerdict | null = null;
  for (const [key, gross] of gm) {
    if (!(gross > 0) && !(lands.has(key) && (lands.get(key) as number) > 0 && e.varies && e.landsByMonth)) continue;
    const landed = lands.has(key) ? (lands.get(key) as number) : toNum(e.landsTypical);
    const left = gross - k401 - landed;
    if (left < -AGREE_TOLERANCE) {
      const when = inMonth(key);
      return { ok: false, warn: false, say:
        `These three cannot all be right${when}. ${money(gross)} gross, less ${money(k401)} into ` +
        `your 401(k), leaves ${money(gross - k401)} — but you entered a take-home of ${money(landed)}. That is ${money(Math.abs(left))} more than there is. Most likely the gross ` +
        `figure is per fortnight rather than per month, or the 401(k) is a yearly amount.` };
    }
    if (!warning && gross > 0 && left / gross > HIGH_DEDUCTION_SHARE) {
      const when = inMonth(key);
      warning = { ok: true, warn: true, say:
        `That leaves ${percentDigits((left / gross), 0)}% of your pay${when} going somewhere other ` +
        `than your bank, which is higher than most. Worth a look in case a figure went in for the ` +
        `wrong period — but if that is really your payslip, carry on.` };
    }
  }
  return warning ?? { ok: true, warn: false, say: '' };
}



/** ONE PERSON'S BASE PAY — everything their own section of the screen shows.
 *
 *  This was the orchestrator until 2026-08-27, when the approved screen turned out to have two
 *  earners on it. The household function below is what the screen calls now; this answers for one
 *  person, and is called once per section.
 *
 *  It does no arithmetic of its own — it calls the functions above in the order they depend on
 *  each other and hands back everything the screen shows. That is the whole point: a screen that
 *  assembles a figure from pieces keeps the assembly to itself, and the next screen that needs the
 *  same figure assembles it slightly differently. Two screens then disagree, which is exactly how
 *  "Outflow (bills + debt) $8,321" came to sit four rows above "of $0 planned". */
export interface EarnerPay {
  grossMonthly: number;
  grossAnnualised: number;
  monthly401k: number;
  landsInBank: number;
  landsIsEstimated: boolean;
  landsWhy: string;
  everythingElse: number | null;          // a year — the laws pin it to the cent
  everythingElseMonthly: number | null;   // the same figure ÷ 12, HERE — a screen never divides
  /** EVERYTHING ELSE AS A SHARE OF THE GROSS, HERE (2026-10-31, FX-CF-B, IN3-01; Q49): $1,200 of $7,000/month is 0.171428… — the
   *  screen prints it once, to two decimals ("17.14% of your gross"); it divided and rounded to a whole percent itself. Null with no
   *  gross or no everything-else. */
  everythingElseShare: number | null;
  verdict: PayVerdict;
  months: [string, number][];
  /** THE TYPICAL GROSS AS A MONTH (2026-10-25, IN-05) — what a month left blank in the table counts as (annualisedGross), so
   *  the screen can show it in that month's box. $2,077 a fortnight is $2,077 × 26 ÷ 12 = $4,500.17. */
  typicalMonth: number;
  /** WHAT THE EMPLOYER'S MATCH IS WORTH A MONTH (2026-10-25, IN-04; MK-CF-F-178 wageMatchMonthly): 50% of $800 is $400. */
  matchMonthly: number;
  /** THE MONTHS OF THIS YEAR THE WAGE IS PAID (2026-10-26, FIX-INCOME-A): the take-home, the 401(k) and everything else taken out
   *  are each a paid month's, and the year of each is that month × this (paidMonthsOf). Twelve for pay that does not vary. */
  paidMonths: number;
  /** An hourly wage with its hours a week not entered: none of it is counted, and the section says so (DEC-0296). */
  hoursNotEntered: boolean;
  /** A pay frequency outside the one table: none of the pay is counted, and the section says so (R23, 2026-11-01). */
  freqNotRecognised: boolean;
}

/** One earner's pay: gross for a month and for a year, their 401(k), their take-home and whether it was entered or calculated, and everything else taken out. */
/* ─ MK-CF-F-171 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * earnerPay
 *
 * Answers ..... One earner's pay: gross for a month and for a year, their 401(k), their take-home and whether it was entered or calculated, and everything else taken out.
 *
 * Formula .....
 *     t = take home as entered(e)
 *     annual = annualised gross(e)
 *     paid = paid months of(e)
 *
 * Called by ... MK-CF-F-240 PAY_LANDS_TYPED · MK-CF-O-001 basePay
 *
 * Reaches ..... 561 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 543 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *               MK-XS-I-043 their own retirement contribution
 *               MK-XS-I-046 how the employer match is expressed — percent or dollars
 *
 * Decides .....
 *     · Treats a year as twelve equal months.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-171
 * Changed ..... not in git yet (—)
 */
export function earnerPay(e: BasePayEntry): EarnerPay {
  const t = takeHomeAsEntered(e);
  const annual = annualisedGross(e);
  const paid = paidMonthsOf(e);
  return {
    grossMonthly: (annual / 12),
    grossAnnualised: annual,
    monthly401k: (toNum(e.monthly401k)),
    landsInBank: t.monthly,
    landsIsEstimated: t.estimated,
    landsWhy: t.why,
    everythingElse: deductionsFromPay(e),
    // Monthly is calculated HERE. Build 54 showed the annual figure in a monthly card ("$5,400"
    // beside a $5,000 paycheck) — and the founder's fix question was the right one: dividing on the
    // screen is how two screens come to divide differently. The screen prints this verbatim.
    // A PAID MONTH'S (2026-10-26, FIX-INCOME-A; DEC-7938, tenet 1): the July starter's $34,198.50 a year over six paid months is
    // $5,699.75 a month taken out — $10,000.05 − $501.13 − $3,799.17 — where ÷ 12 read $700
    everythingElseMonthly: deductionsFromPay(e) == null ? null : ((deductionsFromPay(e) as number) / (paid > 0 ? paid : 12)),
    everythingElseShare: deductionsFromPay(e) == null || !(annual > 0) ? null : (deductionsFromPay(e) as number) / annual,
    verdict: payFiguresAgree(e),
    months: grossByMonth(e),
    typicalMonth: perMonth(e.grossTypical, e) ?? 0,
    matchMonthly: wageMatchMonthly({ c_401k: e.monthly401k, employerMatchMode: e.matchMode, employerMatchValue: e.matchValue }),
    paidMonths: paid,
    hoursNotEntered: hoursNotEntered(e),
    freqNotRecognised: freqNotRecognised(e),
  };
}


/** ── ORCHESTRATOR ────────────────────────────────────────────────────────────────────────────
 *  WHAT DOES THIS HOUSEHOLD EARN? The base-pay screen calls THIS and nothing else.
 *
 *  It does no arithmetic of its own beyond adding earners together — it calls the functions above in
 *  the order they depend on each other and hands back everything the screen shows, both sections and
 *  the household block, so the screen cannot show one without the other and cannot build the total
 *  from a different source than the rows above it.
 *
 *  THE BAND IS READ, NOT MADE. A tax band is set by everything the household is taxed on together,
 *  so it is produced once, by MK-CF-F-084 taxable annual feeding MK-CF-F-090 effective rate, and
 *  comes in with the input. What this does is show BOTH readings — on one wage and on the household
 *  — because the gap between them is the whole reason the question is asked (approved mock, 2a).
 *  Founder ruling 2026-08-27.
 */
export interface HouseholdPayInput {
  /** One entry per person who earns a wage, in the order the screen shows them. */
  earners: { name: string; entry: BasePayEntry }[];
  filingStatus?: FilingStatus;
  over65?: number;
  /** The stored answers, so the tax row can read the rate in force rather than re-deciding it. */
  profile?: Record<string, any> | null;
}

export interface TaxOnPay {
  bracket: number;        // the FEDERAL TAX BRACKET — what the next dollar costs. Named, not implied.
  monthly: number;        // the tax figure shown, in money. A payslip has dollars, not a percentage.
  rate: number;           // the rate in force, 0–1 of gross
  whose: string;          // 'your rate, 24%' · 'your figures, 28%' · 'calculated, 9%'
  estimated: boolean;     // true only when it is OURS — then it is federal-only and says so
  covers: string;         // what that rate includes, in words
  shortBy: number | null; // when estimating: roughly how much a month we are NOT deducting
  /** Which card the screen renders. 'entered': every earner told us — show their own figures back.
   *  'estimated': nobody told us — show the estimate row, and the card ADDS UP: gross − tax −
   *  401(k)s = take-home, exactly. 'mixed': some entered, some calculated — NO tax row at all,
   *  because your tax is already inside your entered figure and one line for the household would be
   *  a number that explains nothing; the take-home sentence carries the split instead. */
  mode: 'entered' | 'estimated' | 'mixed';
  statusAssumed: boolean; // filing status inferred (two wages → jointly), not yet answered
  /** A STATE RATE ENTERED ON THE TAX ORGANIZER IS INSIDE THE CALCULATED TAX, and the words say so (2026-10-25, the lead's ruling
   *  on MK-CF-M-033 t8; canon row 25): "the 5.00% state rate you entered", or null when none was entered. */
  stateWords: string | null;
}

export interface BasePay {
  /** `approx`: this earner's take-home is the app's own estimate — worked with the CALCULATED rate — so it wears ≈. A take-home
   *  worked from the person's own typed rate is theirs and does not (2026-10-25, IN-03; drawing v07 rule 9). `entered`: the
   *  earner has a gross or a take-home on record; one with nothing is left out of the household's sentences (IN-08). */
  /** `waits` (R27, 2026-11-02): this earner's take-home is calculated, and the shared rate it is calculated on rests on another wage
   *  that cannot be read — so it is not worked (Sam's ~$4,318 was worked as if the other $100,000 were $0) */
  earners: { name: string; pay: EarnerPay; approx: boolean; entered: boolean; waits: boolean }[];
  /** No earner has a gross or a take-home on record: the card shows the empty-state line (Q48), never ≈$0 (IN-08). */
  nothingEntered: boolean;
  /** THE EARNERS PAID BY THE HOUR WHOSE HOURS A WEEK ARE NOT ENTERED (2026-10-26, FIX-INCOME-A; DEC-0296, tenet 3): their pay is
   *  no number, so the household card shows no total — it says what is missing instead. Empty when every wage is complete. */
  hoursNotEntered: string[];
  /** the earners whose pay frequency is outside the one table (R23, 2026-11-01) */
  freqNotRecognised: string[];
  /** The band is read on more than the wages — rent kept, a bonus, interest and dividends are entered (DEC-0178), so the note
   *  under it says "and your other income" (2026-10-26, FIX-INCOME-A). */
  bandOnOtherIncome: boolean;
  /** WHAT THE BAND IS READ ON, AND WHAT IS STILL TO ADD (2026-10-25, CFR-5 found F3): everything taxable entered so far — wages,
   *  rent kept, a bonus, interest and dividends (MK-CF-F-084 taxableAnnual, the "= Gross /year" of the Income summary) — and
   *  which of rent, a bonus and a spouse's wage are not entered yet, in the drawn order. */
  bandReadOn: number;
  stillToAdd: string[];
  grossAnnual: number;            // every wage, added
  landsInBank: number;            // every wage's take-home, added, per month
  bandOnOneWage: number;          // the first earner's wage alone
  bandOnEveryWage: number;        // all of them together — what actually applies
  bandNote: string | null;        // what the difference is worth, in words, or null when there is none
  everyFigureAgrees: boolean;     // no earner's three figures contradict each other
  tax: TaxOnPay;                  // the bracket, the tax in money, and whose rate produced it
  landsEstimated: boolean;        // any earner's take-home is the app's estimate (calculated rate) → the total wears ≈ (IN-03)
  landsNote: string | null;       // whose figure is entered and whose is calculated, with the dollars
  monthly401k: number;            // every earner's own contribution, added — the card's 401(k)s row
  otherTakenMonthly: number | null;  // MK-CF-M-036 at the household — the SUM of the earners' own
                                  // everythingElseMonthly, never a second subtraction, so the household
                                  // figure and its parts cannot disagree (rule 2). Null when any earner's
                                  // is unknown: it refuses rather than understating. The base-pay card
                                  // used to subtract this on the screen (rule 5).
}

/** ── THE FIGURES THIS DOOR HANDS OUT (founder rule 11, 2026-09-14) ───────────────────────────────
 *  Declared beside the code that computes them. The master file's rows for the base-pay screen are
 *  PRINTED from this — there is no second copy to keep in agreement.
 */
/** THE WORKED EXAMPLES — ONE HOUSEHOLD IN THREE STATES (six steps, step 6, 2026-09-28).
 *
 *  Two earners: one paid $4,200 every two weeks, one $5,000/month, putting $1,200 and $400/month
 *  into their 401(k)s, filing jointly. $109,200 + $60,000 = $169,200 of wages a year, $14,100/month.
 *  Every figure runs `basePay`, the real door.
 *
 *  THE CARD MUST ADD UP, and that is what these pin. With the rate typed at 22%: $14,100 gross −
 *  $3,102 tax − $1,600 of 401(k)s = $9,398 of take-home, to the dollar. Build 54 shipped a card whose
 *  own rows did not do that, because each earner ran the federal schedule alone and each was granted
 *  the whole joint deduction. One rate, applied per earner, is what makes the identity exact.
 *
 *  Three states, because three of these figures only exist in one of them: a typed rate (the rows
 *  above), nothing told to us at all (the warning about what is not being deducted), and a take-home
 *  typed by each earner (the "everything else" row, which is only knowable once they tell us).
 */
const EXAMPLE_EARNERS = [
  { name: 'Your pay', entry: { freq: 'biweekly', varies: false, grossTypical: 4200, monthly401k: 1200 } },
  { name: 'Sam’s pay', entry: { freq: 'monthly', varies: false, grossTypical: 5000, monthly401k: 400 } },
];
const EXAMPLE_EARNERS_WITH_LANDS = [
  { name: 'Your pay', entry: { freq: 'biweekly', varies: false, grossTypical: 4200, landsTypical: 5850, monthly401k: 1200 } },
  { name: 'Sam’s pay', entry: { freq: 'monthly', varies: false, grossTypical: 5000, landsTypical: 3400, monthly401k: 400 } },
];
const WAGES =
  'Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), '
  + 'paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. ';
const GIVEN = WAGES + 'They have typed their tax rate: 22%.';
const GIVEN_NOTHING_TOLD = WAGES + 'They have told us no tax rate and no take-home, so the take-home shown is ours.';
const GIVEN_LANDS_TYPED = WAGES + 'Each has typed their take-home each month: $5,850 and $3,400.';
const GIVEN_LAW =
  'The payroll-tax figures Congress publishes for the 2026 tax year — not a calculation, and not '
  + 'ours to choose; they are read back so the sentence on screen can be checked against the law.';

/** Example only: runs basePay on the worked example household with a tax rate of their own. */
/* ─ MK-CF-F-238 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * PAY
 *
 * Answers ..... Example only: runs basePay on the worked example household with a tax rate of their own.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-CF-F-079 incomeFromOnboarding · MK-CF-F-233 earnerWageShares
 *               MK-CF-F-240 PAY_LANDS_TYPED
 *
 * Reaches ..... 561 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 543 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-238
 * Changed ..... not in git yet (—)
 */
const PAY = () => basePay({ earners: EXAMPLE_EARNERS as any, filingStatus: 'married', over65: 0,
  profile: { taxMode: 'manual', manualTaxRate: 22 } });

/** Example only: runs basePay on the worked example household with the tax rate calculated. */
/* ─ MK-CF-F-239 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * PAY_ESTIMATED
 *
 * Answers ..... Example only: runs basePay on the worked example household with the tax rate calculated.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-CF-F-240 PAY_LANDS_TYPED
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-F-240 PAY_LANDS_TYPED
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-239
 * Changed ..... not in git yet (—)
 */
const PAY_ESTIMATED = () => basePay({ earners: EXAMPLE_EARNERS as any, filingStatus: 'married', over65: 0, profile: {} });

/** Example only: runs basePay on the worked example household with the take-home entered. */
/* ─ MK-CF-F-240 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * PAY_LANDS_TYPED
 *
 * Answers ..... Example only: runs basePay on the worked example household with the take-home entered.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *               MK-XS-I-039 how often each income arrives
 *               MK-XS-I-043 their own retirement contribution
 *               MK-XS-I-046 how the employer match is expressed — percent or dollars
 *               MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-240
 * Changed ..... not in git yet (—)
 */
const PAY_LANDS_TYPED = () => basePay({ earners: EXAMPLE_EARNERS_WITH_LANDS as any, filingStatus: 'married', over65: 0, profile: {} });

export const FIGURES = declareFigures({
  'MK-CF-M-030': {
    label: 'Each person’s pay', unit: 'money', per: 'year', screens: ['/base-pay'],
    answers: 'What everyone in the household earns before anything is taken out.',
    formula: 'gross a year = the sum of every earner’s wage, each annualised from the rhythm they are paid in',
    inputs: ['MK-CF-I-001 wage', 'MK-CF-I-002 how often it is paid', 'MK-XS-I-021 spouse wage'],
    decisions: ['A wage entered for a rhythm is annualised by that rhythm, never by a flat twelve.'],
    ruled: '2026-09-14',
    refusal: 'Shows $0 until a wage is entered; the screen offers the door to enter one.',
    worked: {
      given: GIVEN,
      answer: '$109,200/year',
      run: () => PAY().earners[0].pay.grossAnnualised,
    },
  },
  'MK-CF-M-031': {
    label: 'Take-home', unit: 'money', per: 'month', screens: ['/base-pay', '/cashflow', '/income-manager'],
    answers: 'What actually reaches the bank each month, after federal tax and 401(k) — for one earner, and for the household.',
    formula: 'for one earner: what they entered, or their gross less federal tax less their own 401(k). For the household: the sum of the earners’ figures, never a second calculation.',
    inputs: ['MK-CF-I-001 wage', 'MK-CF-I-003 take-home as entered', 'MK-CF-I-004 401(k) contribution', 'MK-CF-I-005 tax rate as entered'],
    // (2026-10-23, CF-FIX; the Cash flow package's check of the declarations) the words said no state tax; the calculated rate
    // (MK-CF-F-181 rateInForce → MK-CF-F-101 taxOwedFor) adds the state rate the person typed on the Tax organizer, whose own
    // words say it tunes every tax estimate — his tenet 5, the person's word outranks the app's guess. The words were wrong.
    decisions: ['Federal income tax when it is calculated, plus the state rate when one was entered (the Tax organizer’s "State income tax %", applied to taxable income) — no Social Security or Medicare, and no state tax when none was entered (MK-CF-D-001, DEC-0384).'],
    ruled: '2026-09-14',
    refusal: 'Shows $0 until a wage is entered.',
    // (2026-10-25, IN-03) ≈ is the app's own estimate only: a take-home worked from the person's typed rate is theirs
    note: 'ONE figure over two sets: one earner, and the household — so a total and its parts cannot disagree (rule 2). It wears ~ whenever the app worked it with the calculated rate; one entered, or worked from the person’s own typed rate, wears none.',
    worked: {
      given: GIVEN,
      answer: '$9,398/month',
      run: () => PAY().landsInBank,
    },
  },
  'MK-CF-M-032': {
    label: 'Federal tax bracket', unit: 'percent', screens: ['/base-pay'],
    answers: 'What the next dollar earned costs in federal income tax.',
    // (2026-10-24, CF-FIX) the band of the wages once each earner's own 401(k) is out (B05), not of the gross wage
    formula: 'the published bracket the household’s wages fall in once each earner’s own 401(k) is out — the 401(k) is not taxed — less the standard deduction, for their filing status',
    inputs: ['MK-CF-M-030 gross a year', 'MK-XS-I-024 filing status'],
    decisions: ['Filing status is assumed to be jointly when two people earn and nobody has said (MK-CF-D-004).'],
    ruled: '2026-09-14',
    refusal: 'The row is not shown until a wage is entered.',
    worked: {
      given: GIVEN,
      answer: '22%',
      run: () => PAY().bandOnEveryWage,
    },
  },
  'MK-CF-M-033': {
    label: 'Calculated federal tax', unit: 'money', per: 'month', screens: ['/base-pay'],
    answers: 'The federal income tax we calculate on the household’s wages, when nobody has entered their own figure.',
    formula: 'tax a month = federal tax on (everything taxable, less the 401(k)s and the standard deduction, at the published bands) ÷ 12 — the same in every month',
    inputs: ['MK-CF-M-030 gross a year', 'MK-XS-I-024 filing status', 'MK-XS-I-025 how many are over 65'],
    decisions: ['Assumes the standard deduction, never itemised (MK-CF-D-002).'],
    ruled: '2026-09-14',
    refusal: 'The row appears only when the figure is ours; an entered take-home already has tax inside it.',
    // THE WORKED EXAMPLE IS THE ONE THE ROW DESCRIBES (2026-10-23, CF-FIX; the Cash flow package's check): it ran the household
    // with a typed 22% — $3,102 = 22% × $14,100, the typed rate, a row the screen never shows under this label — so it now
    // runs the household that told us nothing, which is when "Calculated federal tax" appears
    worked: {
      given: 'One earner filing single: $5,000/month ($60,000/year), paying $400/month into a 401(k); no tax rate and no take-home told us, '
        + 'so the tax is ours. Taxed: $60,000 − $4,800 − $16,100 = $39,100 → $1,240 + 12% × $26,700 = $4,444/year, 7.41% of the $60,000.',
      answer: '$370/month',
      run: () => basePay({ earners: [{ name: 'Your pay', entry: { freq: 'monthly', varies: false, grossTypical: 5000, monthly401k: 400 } }] as any,
        filingStatus: 'single', over65: 0,
        profile: { status: 'employed', baseSalary: '5000', salaryMode: 'gross', salaryFreq: 'monthly', c_401k: '400', filingStatus: 'single' } as any }).tax.monthly,
    },
  },
  'MK-CF-M-034': {
    label: 'Your 401(k)s', unit: 'money', per: 'month', screens: ['/base-pay'],
    answers: 'What everyone in the household puts into their own 401(k) each month.',
    formula: '401(k) a month = the sum of every earner’s own contribution, the employer’s match excluded',
    inputs: ['MK-CF-I-004 401(k) contribution'],
    decisions: ['The employer’s match is not counted here — it is not taken out of take-home (MK-CF-D-003).'],
    ruled: '2026-09-14',
    refusal: 'The row is hidden when nobody contributes.',
    worked: {
      given: GIVEN,
      answer: '$1,600/month',
      run: () => PAY().monthly401k,
    },
  },
  'MK-CF-M-035': {
    label: 'The take-home above is higher than it will really be', unit: 'money', per: 'month', screens: ['/base-pay'],
    answers: 'By roughly how much the calculated take-home overstates what will reach the bank, because only federal income tax is taken out of it.',
    formula: 'overstated by = Σ over earners of (Social Security 6.2% of the wage up to the wage base + Medicare 1.45% of the whole wage + 0.9% of the wage above the additional-tax threshold) ÷ 12',
    inputs: ['MK-CF-I-001 wage', 'MK-ST-I-030 Social Security wage base', 'MK-ST-I-031 Medicare additional-tax threshold'],
    decisions: ['State tax is not in this figure, because we do not know their state (MK-CF-D-005).'],
    ruled: '2026-09-14',
    refusal: 'The warning appears only when the take-home is ours and estimated.',
    worked: {
      given: GIVEN_NOTHING_TOLD,
      answer: '$1,079/month',
      run: () => PAY_ESTIMATED().tax.shortBy,
    },
  },
  'MK-CF-M-036': {
    label: 'Everything else taken out', unit: 'money', per: 'month', screens: ['/base-pay'],
    answers: 'What a payslip takes out beyond the 401(k) — tax, medical cover and anything else bought through work — read back from the figures the person entered.',
    formula: 'for one earner: everything else = (their gross a year − their 401(k) a year − their take-home /year) ÷ 12. For the household: the sum of the earners’ figures, never a second subtraction.',
    inputs: ['MK-CF-I-001 wage', 'MK-CF-I-003 take-home as entered', 'MK-CF-I-004 401(k) contribution'],
    decisions: ['Shown only when the person entered their own take-home, so the difference is theirs and not ours.', 'The household figure is the sum of the earners’, so a total and its parts cannot disagree (rule 2).'],
    ruled: '2026-09-14',
    refusal: 'The row is hidden for anyone whose take-home was calculated rather than entered; the household row is hidden unless every earner entered one.',
    note: 'ONE figure over two sets: one earner, and the household. Moved off the screen into this door on 2026-09-14 — the base-pay card used to do the subtraction itself (rule 5).',
    worked: {
      given: GIVEN_LANDS_TYPED,
      answer: '$3,250/month',
      run: () => PAY_LANDS_TYPED().otherTakenMonthly,
    },
  },
  'MK-CF-M-045': {
    label: 'Social Security takes 6.2% of a wage up to', unit: 'money', per: 'year', screens: ['/base-pay'],
    answers: 'The wage ceiling above which no more Social Security tax is taken, named in the warning so the 6.2% can be checked.',
    formula: 'the published wage base for the tax year',
    inputs: ['MK-ST-I-030 Social Security wage base'],
    decisions: ['Published figure — the source and the year it applies to are on the master file’s Reference tab (guard D4).'],
    ruled: '2026-09-14',
    refusal: 'Never absent — it is a published figure, not a calculation.',
    worked: {
      given: GIVEN_LAW,
      answer: '$184,500/year',
      run: () => SS_WAGE_BASE,
    },
  },
  'MK-CF-M-046': {
    label: 'Medicare 1.45% of everything, 0.9% more above', unit: 'money', per: 'year', screens: ['/base-pay'],
    answers: 'The wage above which the extra Medicare tax starts, named in the warning so the 0.9% can be checked.',
    formula: 'the published additional-Medicare-tax threshold for the tax year',
    inputs: ['MK-ST-I-031 Medicare additional-tax threshold'],
    decisions: ['Published figure — the source and the year it applies to are on the master file’s Reference tab (guard D4).'],
    ruled: '2026-09-14',
    refusal: 'Never absent — it is a published figure, not a calculation.',
    worked: {
      given: GIVEN_LAW,
      answer: '$200,000/year',
      run: () => MEDICARE_ADDITIONAL_THRESHOLD,
    },
  },
  // THE MATCH'S WORTH, IN THE BOX (2026-10-25, CF-MMFIX-B; drawing check IN-04): the drawing prints "50% · $400/month" — every
  // figure says what it is worth before you leave it. It printed "50" and nothing else.
  'MK-CF-M-079': {
    label: 'Your employer’s match', unit: 'money', per: 'month', screens: ['/base-pay'],
    answers: 'What the employer puts into the 401(k) each month, beside the share or the amount typed.',
    formula: 'a share of what they put in: their own 401(k) a month × the share typed ÷ 100; a set amount: the amount typed, a month (MK-CF-F-178 wageMatchMonthly)',
    inputs: ['MK-XS-I-043 their own retirement contribution', 'MK-XS-I-046 how the employer match is expressed — percent or dollars'],
    decisions: ['A match typed with neither choice tapped is read as the choice every screen shows chosen, a share of theirs (2026-10-25; tenets 4 and 5).'],
    ruled: '2026-10-25',
    refusal: 'Nothing is shown beside the box until a match is typed.',
    worked: {
      given: 'One earner putting $800/month into a 401(k); the employer matches 50% of it.',
      answer: '$400/month',
      run: () => wageMatchMonthly({ c_401k: 800, employerMatchValue: 50, employerMatchMode: 'pct' }),
    },
  },
  // A MONTH NOT TYPED, IN THE TABLE OF PAY THAT VARIES (2026-10-25, CF-MMFIX-B; drawing check IN-05): the month the app counts
  // for it — "Every month below starts from this" (phone 6) — where the box showed "2077", the fortnight figure.
  'MK-CF-M-080': {
    label: 'A month not typed', unit: 'money', per: 'month', screens: ['/base-pay'],
    answers: 'What a month left blank in the table counts as: the typical gross pay, as a month.',
    formula: 'the typical gross typed × the pay periods in a year ÷ 12 (an hourly figure × the hours a week × 52 ÷ 12) — MK-CF-F-171 earnerPay, typical month',
    inputs: ['MK-CF-I-001 wage', 'MK-CF-I-002 how often it is paid'],
    decisions: ['A month with nothing typed — never or cleared — counts as the typical month in the year’s gross too (MK-CF-F-143 annualisedGross), so the box shows what is counted; a typed $0 counts as $0 (2026-10-25; tenets 1 and 5).'],
    ruled: '2026-10-25',
    refusal: 'The box is empty until a typical gross is typed.',
    worked: {
      given: 'Sam is paid $2,077 every two weeks and his pay varies; the month is left blank.',
      answer: '$4,500/month',
      run: () => earnerPay({ freq: 'biweekly', varies: true, grossTypical: 2077, grossByMonth: { '2026-09': 6000 }, monthly401k: 400 }).typicalMonth,
    },
  },
  // THE RATE THE TAKE-HOME IS WORKED AT, PRINTED WITH ITS NAME (2026-10-25, CF-MMFIX-B): "· 24%" beside everything else taken out,
  // "We’ll use 24% everywhere …", "using the 24% rate you entered" — three places that printed the rate with no identifier.
  'MK-CF-M-081': {
    // TWO DECIMALS, ONE WAY (2026-10-26, CLEANUP-LEFT; Q49; income-end-to-end_v07 row of that date): it printed whole ("~7%", "24%")
    // while the sign-up recap's sentence wrote the same rate to two decimals
    label: 'The rate in force', unit: 'percent-2dp', screens: ['/base-pay', '/onboarding'],   // and the sign-up recap's "Tax (~X% …)" (2026-10-26)
    answers: 'The share of the gross the take-home is worked at — the rate the person typed, the share their own figures imply, or the calculated rate.',
    formula: 'the rate in force (MK-CF-F-181 rateInForce): a typed rate ÷ 100; else (gross − 401(k)s − take-homes) ÷ gross when every earner typed a take-home; else the year’s tax on what is taxed ÷ everything taxable',
    inputs: ['MK-CF-I-005 tax rate as entered', 'MK-CF-I-003 take-home as entered', 'MK-CF-M-030 gross a year'],
    decisions: ['The person’s rate outranks the calculated one (tenet 5); a take-home worked from it wears no ~ (2026-10-25).'],
    ruled: '2026-10-25',
    refusal: 'Not shown until a wage is entered.',
    worked: {
      given: GIVEN,
      answer: '22.00%',
      run: () => PAY().tax.rate,
    },
  },
} as const);

/** What does this household's base pay come to: each earner's pay, and the household's gross, tax bracket, tax, 401(k)s and take-home for a month? */
/* ─ MK-CF-O-001 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * basePay
 *
 * Answers ..... What does this household's base pay come to: each earner's pay, and the household's gross, tax bracket, tax, 401(k)s and take-home for a month?
 *
 * Formula .....
 *     profile = profile
 *     status = filing status (or 'single' when missing)
 *     over65 = over65 (or 0 when missing)
 *     pre rate = rate in force(profile ?? nothing)
 *     pay = earner pay({ ...entry, filing status: status, over65, est rate: pre rate.rate })
 *     entered = pay.gross annualised > 0 (or pay.lands is estimated is missing (or pay.hours not entered (or pay.freq not recognised when missing or zero) when missing or zero) when missing or zero)
 *     the answer:
 *     name = name
 *     pay = pay
 *     entered = entered
 *     approx = entered and pay.lands is estimated and pre rate.source = 'estimated'
 *     waits = false
 *     any unread = earners.some((e) => pay.freq not recognised or pay.hours not entered)
 *     gross annual = Σ over earners of (pay.gross annualised)
 *     lands in bank = Σ over earners of (pay.lands in bank)
 *     first wage = earners[0].pay.gross annualised (or 0 when missing)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-F-238 PAY · MK-CF-F-239 PAY_ESTIMATED
 *               MK-CF-F-240 PAY_LANDS_TYPED · MK-CF-O-004 incomeSummary
 *               MK-CF-O-019 theIncomeManager
 *
 * Reaches ..... 561 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 543 more — the full list is on functions_from_code
 *
 * Serves ...... MK-CF-M-030 · MK-CF-M-031 · MK-CF-M-032 · MK-CF-M-033
 *               MK-CF-M-034 · MK-CF-M-035 · MK-CF-M-036 · MK-CF-M-045
 *               MK-CF-M-046 · MK-CF-M-079 · MK-CF-M-080 · MK-CF-M-081
 * Reads ....... MK-XS-I-023 salary and other income
 *               MK-XS-I-030 tax filing status and age
 * Ruled by .... DEC-0178 · DEC-0184 · DEC-0188 · DEC-0194 · DEC-0195 · DEC-0197
 *               DEC-0205 · DEC-0207 · DEC-0208 · DEC-0209 · DEC-0326 · DEC-0389
 *               DEC-0503
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Decides .....
 *     · If over65 is missing it uses 0.
 *     · If gross annualised is missing it uses 0.
 *     · If monthly401k is missing it uses 0.
 *     · If paid months is missing it uses 0.
 *     · Uses a built-in f i c a s h a r e of 7.65%.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-001
 * Changed ..... not in git yet (—)
 */
export function basePay(h: HouseholdPayInput): BasePay {
  const profile = h.profile;
  const status = h.filingStatus ?? 'single';
  const over65 = h.over65 ?? 0;
  // THE ONE RATE, HANDED TO EVERY EARNER for any estimating they need. It must be computed on the
  // profile BEFORE the earners run, and its own source must ignore half-entered households — see
  // rateInForce. Passing nothing here is what let build 54's card contradict itself.
  const preRate = rateInForce(h.profile ?? null);
  // WHOSE FIGURE WEARS ≈ (2026-10-25, CF-MMFIX-B; drawing check IN-03; rule 9 and tenet 2): a take-home the app works out with
  // its CALCULATED rate is an estimate; one worked from the person's own typed rate is theirs, as the drawn "= Take-home
  // $8,740/month" under a typed 24% has none. An earner with neither a gross nor a take-home entered is not "≈$0 calculated":
  // they are left out of whose-figure-is-whose (IN-08, tenet 3).
  const earners = (h.earners ?? []).map((e) => {
    const pay = earnerPay({ ...e.entry, filingStatus: status, over65, estRate: preRate.rate });
    const entered = pay.grossAnnualised > 0 || !pay.landsIsEstimated || pay.hoursNotEntered || pay.freqNotRecognised;   // $25 an hour typed is entered (DEC-0296)
    return { name: e.name, pay, entered, approx: entered && pay.landsIsEstimated && preRate.source === 'estimated', waits: false };
  });
  // A CALCULATED TAKE-HOME THAT RESTS ON A WAGE NOT READ (R27, 2026-11-02; CF6-15): the shared rate is worked on every wage, so with one
  // unreadable the others' calculated take-homes wait — a take-home typed stands
  const anyUnread = earners.some((e) => e.pay.freqNotRecognised || e.pay.hoursNotEntered);
  for (const e of earners) e.waits = anyUnread && !e.pay.freqNotRecognised && !e.pay.hoursNotEntered && e.pay.landsIsEstimated;

  const grossAnnual = (earners.reduce((t, e) => t + e.pay.grossAnnualised, 0));
  const landsInBank = (earners.reduce((t, e) => t + e.pay.landsInBank, 0));
  const firstWage = earners[0]?.pay.grossAnnualised ?? 0;

  // THE BAND OF WHAT IS TAXED — each wage less that earner's own 401(k), which comes off before tax (B05; 2026-10-24, CF-FIX).
  // It read the band of the gross wage, so near an edge the card named a band the tax was not worked in.
  // ...in the months each earner is paid (2026-10-26, FIX-INCOME-A; DEC-0376, DEC-7797, tenet 4): a worker paid $12,500/month from
  // July with $1,000 into a 401(k) put in $6,000, not $12,000 — the band read 12% where the Income summary reads 22%
  const k401Annual = (earners.reduce((t, e) => t + e.pay.monthly401k * e.pay.paidMonths, 0));
  const bandOnOneWage = marginalBracketFor(Math.max(0, firstWage - (earners[0]?.pay.monthly401k ?? 0) * (earners[0]?.pay.paidMonths ?? 0)), status, over65);
  // THE BAND IS WORKED ONCE, ON EVERYTHING TAXED (2026-10-26, FIX-INCOME-A; his DEC-0178 and DEC-0191; tenet 4): the wages less
  // their 401(k)s, plus everything else the profile is taxed on (rent kept, a bonus, interest and dividends — MK-CF-F-084
  // taxableAnnual less the wages). For the stored household that is exactly MK-CF-F-230 taxedAfterPreTax, the Income summary's
  // bracket (pinned by base_pay_band_agrees_2026_10_26). It read the wages alone: $60,000 of wages and $50,000 of rent, single,
  // read 12% here and 22% there; the next dollar costs 22%.
  const otherTaxed = profile ? Math.max(0, taxableAnnual(profile as any) - salaryAnnual(profile as any)) : 0;
  const bandOnEveryWage = marginalBracketFor(Math.max(0, grossAnnual - k401Annual) + otherTaxed, status, over65);

  // What reading the band off one wage would have cost, per month. Only said when it is not zero:
  // a note explaining a difference of nothing is noise.
  let bandNote: string | null = null;
  if (earners.length > 1 && bandOnOneWage !== bandOnEveryWage) {
    const wrong = ((grossAnnual * bandOnOneWage) / 12);
    const right = ((grossAnnual * bandOnEveryWage) / 12);
    bandNote = `Filing ${status === 'married' ? 'jointly' : 'as you do'}, the band comes from what you earn together. `
      + `On your pay alone we would have read ${percentDigits(bandOnOneWage, 0)}% and shown about `
      + `${money(right - wrong)}/month more than your real take-home.`;
  }

  // THE TAX ON THIS PAY — the bracket by name, the tax in money, and whose rate produced it.
  //
  // Our estimate is FEDERAL INCOME TAX ONLY and stays that way (founder ruling 2026-08-28). Social
  // Security and Medicare are a flat statutory 7.65% — but of WAGES, and the gross above also carries
  // rent, dividends and bonuses, which are not wage income. Applying it to this total would be wrong,
  // not merely imprecise. State cannot be known without asking. So we work out the one thing we can,
  // say what it assumed, and let the person replace it with a figure off their payslip.
  const inForce = rateInForce(profile ?? null);
  const wagesAnnual = earners.reduce((t, e) => t + e.pay.grossAnnualised, 0);
  // EACH "/month" ON THIS CARD IS A MONTH THE WAGE IS PAID (2026-10-26, FIX-INCOME-A; DEC-7938, tenets 1 and 4) — the take-home a
  // person types and the month Cash flow lands — so the card's sum holds: a paid month's gross − its tax − its 401(k) = its take-home.
  // A wage paid every month is twelve, exactly as before.
  const per = (e: { pay: EarnerPay }) => (e.pay.paidMonths > 0 ? e.pay.paidMonths : 12);
  const grossMonth = earners.reduce((t, e) => t + e.pay.grossAnnualised / per(e), 0);
  const monthlyTax = earners.reduce((t, e) => t + (e.pay.grossAnnualised * inForce.rate) / per(e), 0);
  // whose figures are whose is said of the earners with something entered — the rest are not "≈$0 calculated" (IN-08)
  const basis = earners.some((e) => e.entered) ? earners.filter((e) => e.entered) : earners;
  const entered = basis.filter((e) => !e.pay.landsIsEstimated);
  const estimatedE = basis.filter((e) => e.pay.landsIsEstimated);
  const mode: TaxOnPay['mode'] = estimatedE.length === 0 ? 'entered'
    : entered.length === 0 ? 'estimated' : 'mixed';
  const tax: TaxOnPay = {
    bracket: bandOnEveryWage,
    monthly: monthlyTax,
    rate: inForce.rate,
    whose: inForce.label,
    estimated: inForce.source === 'estimated',
    covers: inForce.covers,
    // FICA_SHARE is NEVER added to the estimate — it exists so the screen can say what is missing.
    shortBy: inForce.source === 'estimated' ? earners.reduce((t, e) => t + payrollTaxWithheld(e.pay.grossAnnualised) / per(e), 0) : null,   // G4: per earner, the wage base respected; a paid month's
    mode,
    statusAssumed: (h.profile as any)?.filingStatus == null,
    stateWords: stateRateOf(profile ?? null) > 0 ? `the ${percentDigits(stateRateOf(profile ?? null), 2)}% state rate you entered` : null,
  };

  // WHOSE FIGURE IS WHOSE — the sentence under the lands total, per person, with the dollars.
  // Entered beats estimated and they are never blended silently (founder, 2026-09-02).
  const money0 = (n: number) => money(Math.round(n));
  let landsNote: string | null = null;
  // a gross worked back from a take-home entered before 2026-08-28 was not entered, so the card does not say it was (tenet 3)
  const workedBack = !!(h.profile as any)?.grossWorkedBack;
  if (mode === 'entered' && basis.length > 0) {
    landsNote = workedBack
      ? (basis.length > 1 ? 'Both take-homes are what you entered; your gross was worked back from yours.'
                          : 'The take-home is what you entered; the gross was worked back from it.')
      : basis.length > 1
      ? 'Both figures are what you entered — nothing here is calculated.'
      : 'This is what you entered — nothing here is calculated.';
  } else if (mode === 'mixed') {
    // The founder's wording (2026-09-02): a labelled fact per person, not a paragraph. Each line
    // says WHAT the figure is (take-home), WHOSE it is, and whether it was entered or calculated —
    // his first reading of the prose version took the entered take-home for a gross.
    const how = inForce.mine
      ? `calculated at your ${percentDigits(inForce.rate, 2)}% rate, less 401(k)`
      : 'calculated — gross less federal tax and 401(k)';
    // ≈ only on the app's own estimate: a take-home at their typed rate is theirs (IN-03)
    const line = (e: { name: string; pay: EarnerPay; approx: boolean }) => e.pay.landsIsEstimated
      ? `${e.name === 'You' ? 'Your' : `${e.name}’s`} take-home: ${e.approx ? '~' : ''}${money0(e.pay.landsInBank)} (${how})`
      : `${e.name === 'You' ? 'Your' : `${e.name}’s`} take-home: ${money0(e.pay.landsInBank)} (${e.name === 'You' ? 'you' : e.name} entered)`;
    landsNote = basis.map(line).join('\n');
  } else if (mode === 'estimated' && grossAnnual > 0) {
    // THE CARD SAYS ITS OWN SUM (approved drawing v07, frame 2a-ii): gross − tax − 401(k)s = take-home
    const k401 = earners.reduce((t, e) => t + e.pay.monthly401k, 0);
    landsNote = `${money0(grossMonth)} gross − ${money0(monthlyTax)} tax`
      + `${k401 > 0 ? ` − ${money0(k401)} of 401(k)s` : ''} = ${money0(landsInBank)}.`;
  }
  // THE BAND IS EXPLAINED ONLY BESIDE FIGURES THEY ENTERED (frame 2a) — it speaks of "your real
  // take-home", which exists only once they have given one, and it says whose the share is. Where we
  // calculate the take-home the bracket row says what it assumed instead (frames 2a-ii and 2a-iii).
  if (mode !== 'entered') bandNote = null;
  // THE OWN-FIGURES SENTENCE STANDS ON ITS OWN (2026-10-24, CF-FIX): it rode on the band sentence, so once the bands are read
  // after the 401(k)s (B05) and agree, the drawing's "The 24% is your own figures — …" left with it. Two earners, entered.
  if (mode === 'entered' && basis.length > 1) {
    bandNote = `${bandNote ? bandNote + ' ' : ''}The ${percentDigits(inForce.rate, 2)}% is your own figures — tax, Social Security, Medicare, everything.`;
  }

  // what the band is read on, and the drawn list of what can still be added, less what is already entered (F3)
  const p: any = profile ?? {};
  const stillToAdd = [
    ...(rentalNetAnnual(p) > 0 ? [] : ['rent']),
    ...(toNum(p.bonusAnnual) > 0 ? [] : ['a bonus']),
    ...(earners.filter((e) => e.entered).length > 1 || p.hasPartner === 'no' ? [] : ['a spouse’s wage']),
  ];
  return {
    earners,
    nothingEntered: !earners.some((e) => e.entered),
    hoursNotEntered: earners.filter((e) => e.pay.hoursNotEntered).map((e) => e.name),
    freqNotRecognised: earners.filter((e) => e.pay.freqNotRecognised).map((e) => e.name),
    bandOnOtherIncome: otherTaxed > 0,
    bandReadOn: taxableAnnual(p),
    stillToAdd,
    grossAnnual,
    landsInBank,
    bandOnOneWage,
    bandOnEveryWage,
    bandNote,
    everyFigureAgrees: earners.every((e) => e.pay.verdict.ok),
    tax,
    landsEstimated: basis.some((e) => e.approx),
    landsNote,
    monthly401k: (earners.reduce((t, e) => t + e.pay.monthly401k, 0)),
    otherTakenMonthly: basis.some((e) => e.pay.everythingElseMonthly == null)
      ? null
      : basis.reduce((t, e) => t + (e.pay.everythingElseMonthly as number), 0),
  };
}

/** Social Security and Medicare on a wage: 6.2% + 1.45%. Named so a screen can say what the calculated rate
 *  leaves out, in money. It is never ADDED to the estimate — see the note in basePay above. */
export const FICA_SHARE = 0.0765;   // kept for the record: the flat share the caveat used before G4

/** THE PAYROLL TAX A PAYCHECK WITHHOLDS — what the federal-only estimate leaves out (G4, founder
 *  2026-09-12). Social Security takes 6.2% of a wage up to the wage base, Medicare 1.45% of all of it,
 *  and 0.9% more is withheld above $200,000 of wages (IRC §3101, §3121(a); the additional Medicare
 *  tax is withheld per employer at $200,000 regardless of filing status). Per earner, a year. */
export const SS_WAGE_BASE = 184_500;                 // 2026 Social Security wage base (SSA, October 2025 announcement)
export const MEDICARE_ADDITIONAL_THRESHOLD = 200_000; // wages above this carry 0.9% more (IRC §3101(b)(2))

/** Social Security and Medicare tax on a year's wages: 6.2% up to the wage cap, 1.45% of all of it, and 0.9% more above the higher-earner threshold. */
/* ─ MK-CF-F-198 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * payrollTaxWithheld
 *
 * Answers ..... Social Security and Medicare tax on a year's wages: 6.2% up to the wage cap, 1.45% of all of it, and 0.9% more above the higher-earner threshold.
 *
 * Formula .....
 *     w = max(0, wage annual)
 *     the answer = min(w, SS_WAGE_BASE) × 0.062 + w × 0.0145 + max(0, w − MEDICARE_ADDITIONAL_THRESHOLD) × 0.009
 *
 * Called by ... MK-CF-O-001 basePay
 *
 * Reaches ..... 561 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 543 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Applies a built-in rate of 1.45% to w.
 *     · Never lets wage annual fall below 0.
 *     · G4 (founder agreed 2026-09-12): per earner, 6.2% of the wage up to the Social Security wage base ($184,500 in 2026), 1.45% of the whole wage, and 0.9% more above $200,000 — what a paycheck withholds. It is NEVER deducted from the take-home estimate; it sizes the sentence "the take-home above is higher than it will really be, by roughly $X a month".
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-198
 * Changed ..... not in git yet (—)
 */
export function payrollTaxWithheld(wageAnnual: number): number {
  const w = Math.max(0, wageAnnual);
  return Math.min(w, SS_WAGE_BASE) * 0.062 + w * 0.0145 + Math.max(0, w - MEDICARE_ADDITIONAL_THRESHOLD) * 0.009;
}


/** WHAT IS STORED → WHAT THIS FILE READS.
 *
 *  The screen holds a wage the way the profile stores it; every function here takes a BasePayEntry.
 *  This is the ONE place the two shapes meet. It is here rather than on the screen because a screen
 *  that assembles an input keeps the assembly to itself, and the next screen assembles it slightly
 *  differently — which is the same fault as a screen assembling a figure.
 */

/** Turns a wage as the profile stores it into the form the pay calculations read: how often it is paid, whether it varies, the gross, the 401(k) and the take-home entered. */
/* ─ MK-CF-F-179 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * entryFromWage
 *
 * Answers ..... Turns a wage as the profile stores it into the form the pay calculations read: how often it is paid, whether it varies, the gross, the 401(k) and the take-home entered.
 *
 * Formula .....
 *     a = w (or none when missing)
 *     table = salary months(a as any)
 *     varies = salary month mode = 'months' (or object.keys(table).length > 0 when missing or zero)
 *
 * Called by ... MK-CF-O-004 incomeSummary · MK-CF-O-019 theIncomeManager
 *
 * Reaches ..... 561 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 543 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-039 how often each income arrives
 *               MK-XS-I-043 their own retirement contribution
 *               MK-XS-I-046 how the employer match is expressed — percent or dollars
 *               MK-XS-I-075 hours a week, for a wage paid by the hour
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-179
 * Changed ..... not in git yet (—)
 */
export function entryFromWage(w: Record<string, any> | null | undefined): BasePayEntry {
  const a = w ?? {};
  const table = salaryMonths(a as any);
  const varies = a.salaryMonthMode === 'months' || Object.keys(table).length > 0;
  return {
    freq: (a.salaryFreq as any) ?? 'monthly',
    varies,
    grossTypical: a.baseSalary,
    grossByMonth: varies ? (table as any) : undefined,
    monthly401k: a.c_401k,
    landsTypical: a.landsTypical,
    hoursPerWeek: a.hoursPerWeek,
    matchMode: a.employerMatchMode,
    matchValue: a.employerMatchValue,
  };
}
