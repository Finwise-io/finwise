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
import { declareFigures } from '../_figure-spec';
import { toNum } from '../../../src/domain/_shared/num';
import { taxOwedFor, marginalBracketFor, type FilingStatus } from '../../../src/domain/income/tax';
import { money } from '../../../src/domain/_shared/num';
import { salaryMonths } from '../../../src/domain/income/salary-months';
import { rateInForce } from '../../../src/domain/income/tax-rate';

/** How often the person is paid, and how many of those periods make a year. */
export const PAY_PERIODS: Record<string, number> = {
  hourly: 2080, weekly: 52, biweekly: 26, monthly: 12, annually: 1,
};

/** What the base-pay screen collects. `byMonth` keys are 'YYYY-MM' — never a position in an
 *  array, because the table runs from last month to twelve ahead and crosses a year boundary. */
export interface BasePayEntry {
  freq: keyof typeof PAY_PERIODS | string;
  varies: boolean;
  grossTypical: any;                          // per period, as typed
  grossByMonth?: Record<string, any>;         // 'YYYY-MM' → amount, when pay varies
  monthly401k: any;                           // their own contribution, per month
  landsTypical?: any;                         // per period, as typed — OPTIONAL
  landsByMonth?: Record<string, any>;
  hoursPerWeek?: any;
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

/* ─ MK-CF-F-140 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * periodsAYear
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     PAY_PERIODS[string(freq)] (or 12 when missing)
 *
 * Called by ... MK-CF-F-141 perMonth
 *
 * Reaches ..... 28 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-201 INCOME
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-210 annualOfSource
 *               MK-CF-F-143 annualisedGross · MK-CF-O-001 basePay
 *               MK-CF-F-036 buildDebtState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-145 deductionsFromPay · MK-CF-F-171 earnerPay
 *               MK-CF-F-041 getDebtState · MK-CF-F-128 grossByMonth
 *               … and 10 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-140
 * Changed ..... not in git yet (—)
 */
const periodsAYear = (e: BasePayEntry): number => PAY_PERIODS[String(e.freq)] ?? 12;

/** One period of pay expressed as a month. Hourly multiplies by the hours actually worked. */
/* ─ MK-CF-F-141 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * perMonth
 *
 * Answers ..... One period of pay expressed as a month.
 *
 * Formula .....
 *     n = amount read as a number (0 when it is not one)
 *     (n × (to num(hours per week) or 40) × 52) ÷ 12   when string(freq) = 'hourly'
 *     the answer = (n × periods ayear(e)) ÷ 12
 *
 * Called by ... MK-CF-F-128 grossByMonth · MK-CF-F-144 takeHomeAsEntered
 *               MK-CF-F-146 payFiguresAgree
 *
 * Reaches ..... 27 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-201 INCOME
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-210 annualOfSource
 *               MK-CF-F-143 annualisedGross · MK-CF-O-001 basePay
 *               MK-CF-F-036 buildDebtState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-145 deductionsFromPay · MK-CF-F-171 earnerPay
 *               MK-CF-F-041 getDebtState · MK-CF-F-128 grossByMonth
 *               … and 9 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-141
 * Changed ..... not in git yet (—)
 */
function perMonth(amount: any, e: BasePayEntry): number {
  const n = toNum(amount);
  if (String(e.freq) === 'hourly') return (n * (toNum(e.hoursPerWeek) || 40) * 52) / 12;
  return (n * periodsAYear(e)) / 12;
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
 *               MK-CF-F-146 payFiguresAgree
 *
 * Reaches ..... 27 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-201 INCOME
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-210 annualOfSource
 *               MK-CF-F-143 annualisedGross · MK-CF-O-001 basePay
 *               MK-CF-F-036 buildDebtState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-145 deductionsFromPay · MK-CF-F-171 earnerPay
 *               MK-CF-F-041 getDebtState · MK-CF-F-128 grossByMonth
 *               … and 9 more — the full list is on functions_from_code
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
 *     the answer = [['typical', per month(gross typical, e)]]
 *
 * Called by ... MK-CF-F-143 annualisedGross · MK-CF-F-146 payFiguresAgree
 *               MK-CF-F-171 earnerPay
 *
 * Reaches ..... 26 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-201 INCOME
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-210 annualOfSource
 *               MK-CF-F-143 annualisedGross · MK-CF-O-001 basePay
 *               MK-CF-F-036 buildDebtState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-145 deductionsFromPay · MK-CF-F-171 earnerPay
 *               MK-CF-F-041 getDebtState · MK-CF-O-004 incomeSummary
 *               … and 8 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-128
 * Changed ..... not in git yet (—)
 */
export function grossByMonth(e: BasePayEntry): [string, number][] {
  const table = monthsOf(e.grossByMonth);
  if (e.varies && table.length) return table;
  return [['typical', perMonth(e.grossTypical, e)]];
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
 *     months = gross by month(e)
 *     0   when count of months is missing
 *     avg = count of months.reduce((t, [, v]) => t + v, 0) ÷ months
 *     the answer = avg × 12
 *
 * Called by ... MK-CF-F-144 takeHomeAsEntered · MK-CF-F-145 deductionsFromPay
 *               MK-CF-F-171 earnerPay
 *
 * Reaches ..... 25 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-201 INCOME
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-210 annualOfSource
 *               MK-CF-O-001 basePay · MK-CF-F-036 buildDebtState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-145 deductionsFromPay
 *               MK-CF-F-171 earnerPay · MK-CF-F-041 getDebtState
 *               MK-CF-O-004 incomeSummary · MK-XS-F-029 monthlySavings
 *               … and 7 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-143
 * Changed ..... not in git yet (—)
 */
export function annualisedGross(e: BasePayEntry): number {
  const months = grossByMonth(e);
  if (!months.length) return 0;
  const avg = months.reduce((t, [, v]) => t + v, 0) / months.length;
  return (avg * 12);
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

/* ─ MK-CF-F-144 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * takeHomeAsEntered
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     months = months of(lands by month)
 *     entered = lands typical
 *     gross = annualised gross(e)
 *     k401 = to num(monthly401k) × 12
 *     taxable = max(0, gross − k401)
 *     monthly = (gross − k401 − tax owed for(taxable, filing status ?? 'single', 0, over65 ?? 0)) ÷ 12
 *
 * Called by ... MK-CF-F-145 deductionsFromPay · MK-CF-F-146 payFiguresAgree
 *               MK-CF-F-171 earnerPay
 *
 * Reaches ..... 24 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-201 INCOME
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-210 annualOfSource
 *               MK-CF-O-001 basePay · MK-CF-F-036 buildDebtState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-145 deductionsFromPay
 *               MK-CF-F-171 earnerPay · MK-CF-F-041 getDebtState
 *               MK-CF-O-004 incomeSummary · MK-XS-F-029 monthlySavings
 *               … and 6 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Decides .....
 *     · If over65 is missing it uses 0.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Rounds the answer to a whole number.
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
  if (entered != null && String(entered).trim() !== '' && toNum(entered) > 0) {
    return { monthly: (perMonth(entered, e)), estimated: false,
             why: 'the take-home you entered' };
  }
  const gross = annualisedGross(e);
  const k401 = (toNum(e.monthly401k) * 12);      // zero unless they entered one
  if (e.estRate != null) {
    // The household rate in force — typed, or the federal estimate on the WHOLE household. Never
    // this wage through the schedule alone: that hands every earner the full standard deduction.
    return { monthly: ((gross * (1 - e.estRate) - k401) / 12), estimated: true,
             why: `calculated at the household rate of ${Math.round(e.estRate * 100)}% — this take-home is higher than it will really be until the real figure is entered` };
  }
  const taxable = Math.max(0, gross - k401);
  // The band is a property of EVERYTHING the household is taxed on, never of this wage alone
  // (founder ruling 2026-08-27). Base pay READS it: the status and the over-65 count come in with
  // the entry, and default to a single filer only because that is what the app assumed before the
  // filing-status question existed.
  const monthly = ((gross - k401 - taxOwedFor(taxable, e.filingStatus ?? 'single', 0, e.over65 ?? 0)) / 12);
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
 *     nothing   when estimated
 *     the answer = annualised gross(e) − (to num(monthly401k) × 12) − (monthly × 12)
 *
 * Called by ... MK-CF-F-171 earnerPay
 *
 * Reaches ..... 22 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-201 INCOME
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-210 annualOfSource
 *               MK-CF-O-001 basePay · MK-CF-F-036 buildDebtState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-171 earnerPay
 *               MK-CF-F-041 getDebtState · MK-CF-O-004 incomeSummary
 *               MK-XS-F-029 monthlySavings · MK-XS-F-032 snapshotFromOnboarding
 *               … and 4 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in a g r e e t o l e r a n c e of 5.
 *     · Uses a built-in h i g h d e d u c t i o n s h a r e of 60%.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-145
 * Changed ..... not in git yet (—)
 */
export function deductionsFromPay(e: BasePayEntry): number | null {
  const t = takeHomeAsEntered(e);
  if (t.estimated) return null;
  return (annualisedGross(e) - (toNum(e.monthly401k) * 12) - (t.monthly * 12));
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

/* ─ MK-CF-F-146 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * payFiguresAgree
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     t = take home as entered(e)
 *     ok = true
 *     warn = false
 *     say = ''   when estimated
 *     k401 = monthly401k read as a number (0 when it is not one)
 *     gm = gross by month(e)
 *     lands = a lookup of lm
 *     landed = lands.get(key) as number   if lands.has(key)
 *     per month(lands typical, e)   otherwise
 *     left = gross − k401 − landed
 *     when = ''   if key = 'typical'
 *     ` in ${key}`   otherwise
 *     when = ''   if key = 'typical'
 *     ` in ${key}`   otherwise
 *     the answer:
 *     ok = true
 *     warn = false
 *     say = ''
 *
 * Called by ... MK-CF-F-171 earnerPay
 *
 * Reaches ..... 22 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-201 INCOME
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-210 annualOfSource
 *               MK-CF-O-001 basePay · MK-CF-F-036 buildDebtState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-171 earnerPay
 *               MK-CF-F-041 getDebtState · MK-CF-O-004 incomeSummary
 *               MK-XS-F-029 monthlySavings · MK-XS-F-032 snapshotFromOnboarding
 *               … and 4 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
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
    : gm.map(([k]) => [k, (perMonth(e.landsTypical, e))] as [string, number]);
  const lands = new Map(lm);

  for (const [key, gross] of gm) {
    const landed = lands.has(key) ? (lands.get(key) as number) : (perMonth(e.landsTypical, e));
    const left = gross - k401 - landed;
    if (left < -AGREE_TOLERANCE) {
      const when = key === 'typical' ? '' : ` in ${key}`;
      return { ok: false, warn: false, say:
        `These three cannot all be right${when}. ${money(gross)} gross, less ${money(k401)} into ` +
        `your 401(k), leaves ${money(gross - k401)} — but you entered a take-home of ${money(landed)}. That is ${money(Math.abs(left))} more than there is. Most likely the gross ` +
        `figure is per fortnight rather than per month, or the 401(k) is a yearly amount.` };
    }
    if (gross > 0 && left / gross > HIGH_DEDUCTION_SHARE) {
      const when = key === 'typical' ? '' : ` in ${key}`;
      return { ok: true, warn: true, say:
        `That leaves ${Math.round((left / gross) * 100)}% of your pay${when} going somewhere other ` +
        `than your bank, which is higher than most. Worth a look in case a figure went in for the ` +
        `wrong period — but if that is really your payslip, carry on.` };
    }
  }
  return { ok: true, warn: false, say: '' };
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
  verdict: PayVerdict;
  months: [string, number][];
}

/* ─ MK-CF-F-171 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * earnerPay
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     t = take home as entered(e)
 *     annual = annualised gross(e)
 *
 * Called by ... MK-CF-O-001 basePay
 *
 * Reaches ..... 21 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-201 INCOME
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-210 annualOfSource
 *               MK-CF-O-001 basePay · MK-CF-F-036 buildDebtState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-041 getDebtState
 *               MK-CF-O-004 incomeSummary · MK-XS-F-029 monthlySavings
 *               MK-XS-F-032 snapshotFromOnboarding · MK-XS-F-028 surplusByMonth
 *               … and 3 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
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
    everythingElseMonthly: deductionsFromPay(e) == null ? null : ((deductionsFromPay(e) as number) / 12),
    verdict: payFiguresAgree(e),
    months: grossByMonth(e),
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
}

export interface BasePay {
  earners: { name: string; pay: EarnerPay }[];
  grossAnnual: number;            // every wage, added
  landsInBank: number;            // every wage's take-home, added, per month
  bandOnOneWage: number;          // the first earner's wage alone
  bandOnEveryWage: number;        // all of them together — what actually applies
  bandNote: string | null;        // what the difference is worth, in words, or null when there is none
  everyFigureAgrees: boolean;     // no earner's three figures contradict each other
  tax: TaxOnPay;                  // the bracket, the tax in money, and whose rate produced it
  landsEstimated: boolean;        // any earner's take-home is calculated → the total wears ≈
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
  { name: 'Your pay', entry: { freq: 'biweekly', varies: false, grossTypical: 4200, landsTypical: 2700, monthly401k: 1200 } },
  { name: 'Sam’s pay', entry: { freq: 'monthly', varies: false, grossTypical: 5000, landsTypical: 3400, monthly401k: 400 } },
];
const WAGES =
  'Two earners filing jointly: $4,200 every two weeks ($109,200/year) and $5,000/month ($60,000), '
  + 'paying $1,200 and $400/month into their 401(k)s — $14,100/month of wages in all. ';
const GIVEN = WAGES + 'They have typed their tax rate: 22%.';
const GIVEN_NOTHING_TOLD = WAGES + 'They have told us no tax rate and no take-home, so the take-home shown is ours.';
const GIVEN_LANDS_TYPED = WAGES + 'Each has typed what actually lands: $2,700 a period and $3,400/month.';
const GIVEN_LAW =
  'The payroll-tax figures Congress publishes for the 2026 tax year — not a calculation, and not '
  + 'ours to choose; they are read back so the sentence on screen can be checked against the law.';
/* ─ MK-CF-O-011 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * PAY
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-CF-O-013 PAY_LANDS_TYPED
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-O-013 PAY_LANDS_TYPED
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-011
 * Changed ..... not in git yet (—)
 */
const PAY = () => basePay({ earners: EXAMPLE_EARNERS as any, filingStatus: 'married', over65: 0,
  profile: { taxMode: 'manual', manualTaxRate: 22 } });
/* ─ MK-CF-O-012 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * PAY_ESTIMATED
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-CF-O-013 PAY_LANDS_TYPED
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-O-013 PAY_LANDS_TYPED
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-012
 * Changed ..... not in git yet (—)
 */
const PAY_ESTIMATED = () => basePay({ earners: EXAMPLE_EARNERS as any, filingStatus: 'married', over65: 0, profile: {} });
/* ─ MK-CF-O-013 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * PAY_LANDS_TYPED
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *               MK-XS-I-064 the unit beside a quantity — shares, coins, contracts, ounces or units
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-013
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
    label: 'Take-home', unit: 'money', per: 'month', screens: ['/base-pay', '/cashflow'],
    answers: 'What actually reaches the bank each month, after federal tax and 401(k) — for one earner, and for the household.',
    formula: 'for one earner: what they entered, or their gross less federal tax less their own 401(k). For the household: the sum of the earners’ figures, never a second calculation.',
    inputs: ['MK-CF-I-001 wage', 'MK-CF-I-003 take-home as entered', 'MK-CF-I-004 401(k) contribution', 'MK-CF-I-005 tax rate as entered'],
    decisions: ['Federal income tax only when it is calculated — no Social Security, Medicare or state tax (MK-CF-D-001).'],
    ruled: '2026-09-14',
    refusal: 'Shows $0 until a wage is entered.',
    note: 'ONE figure over two sets: one earner, and the household — so a total and its parts cannot disagree (rule 2). It wears ≈ whenever the figure was calculated rather than entered.',
    worked: {
      given: GIVEN,
      answer: '$9,398/month',
      run: () => PAY().landsInBank,
    },
  },
  'MK-CF-M-032': {
    label: 'Federal tax bracket', unit: 'percent', screens: ['/base-pay'],
    answers: 'What the next dollar earned costs in federal income tax.',
    formula: 'the published bracket the household’s gross falls in, for their filing status',
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
    formula: 'tax a month = federal tax on (gross less the standard deduction, at the published bands) ÷ 12',
    inputs: ['MK-CF-M-030 gross a year', 'MK-XS-I-024 filing status', 'MK-XS-I-025 how many are over 65'],
    decisions: ['Assumes the standard deduction, never itemised (MK-CF-D-002).'],
    ruled: '2026-09-14',
    refusal: 'The row appears only when the figure is ours; an entered take-home already has tax inside it.',
    worked: {
      given: GIVEN,
      answer: '$3,102/month',
      run: () => PAY().tax.monthly,
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
} as const);

/* ─ MK-CF-O-001 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * basePay
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     profile = profile
 *     status = filing status (or 'single' when missing)
 *     over65 = over65 (or 0 when missing)
 *     pre rate = rate in force(profile ?? nothing)
 *     gross annual = Σ over earners of (pay.gross annualised)
 *     lands in bank = Σ over earners of (pay.lands in bank)
 *     first wage = earners[0].pay.gross annualised (or 0 when missing)
 *     band on one wage = marginal bracket for(first wage, status, over65)
 *     band on every wage = marginal bracket for(gross annual, status, over65)
 *     band note = nothing
 *     wrong = (gross annual × band on one wage) ÷ 12
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-O-004 incomeSummary · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *
 * Reaches ..... 20 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-201 INCOME
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-210 annualOfSource
 *               MK-CF-F-036 buildDebtState · MK-XS-F-031 buildSnapshot
 *               MK-CF-F-041 getDebtState · MK-CF-O-004 incomeSummary
 *               MK-XS-F-029 monthlySavings · MK-XS-F-032 snapshotFromOnboarding
 *               MK-XS-F-028 surplusByMonth · MK-CF-O-018 theDebts
 *               … and 2 more — the full list is on functions_from_code
 *
 * Serves ...... MK-CF-M-030 · MK-CF-M-031 · MK-CF-M-032 · MK-CF-M-033
 *               MK-CF-M-034 · MK-CF-M-035 · MK-CF-M-036 · MK-CF-M-045
 *               MK-CF-M-046
 * Reads ....... MK-XS-I-030 tax filing status and age
 * Ruled by .... DEC-0178 · DEC-0184 · DEC-0188 · DEC-0192 · DEC-0194 · DEC-0195
 *               DEC-0197 · DEC-0205 · DEC-0207 · DEC-0208 · DEC-0209 · DEC-0326
 *               DEC-0389 · DEC-0503
 *               his decisions, in MoneyKeel/documents/decision-log/moneykeel_log_decisions_v01.xlsx.
 *               Change the arithmetic and one of those stops being obeyed — read them first.
 *
 * Decides .....
 *     · If over65 is missing it uses 0.
 *     · If gross annualised is missing it uses 0.
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
  const earners = (h.earners ?? []).map((e) => ({ name: e.name,
    pay: earnerPay({ ...e.entry, filingStatus: status, over65, estRate: preRate.rate }) }));

  const grossAnnual = (earners.reduce((t, e) => t + e.pay.grossAnnualised, 0));
  const landsInBank = (earners.reduce((t, e) => t + e.pay.landsInBank, 0));
  const firstWage = earners[0]?.pay.grossAnnualised ?? 0;

  const bandOnOneWage = marginalBracketFor(firstWage, status, over65);
  const bandOnEveryWage = marginalBracketFor(grossAnnual, status, over65);

  // What reading the band off one wage would have cost, per month. Only said when it is not zero:
  // a note explaining a difference of nothing is noise.
  let bandNote: string | null = null;
  if (earners.length > 1 && bandOnOneWage !== bandOnEveryWage) {
    const wrong = ((grossAnnual * bandOnOneWage) / 12);
    const right = ((grossAnnual * bandOnEveryWage) / 12);
    bandNote = `Filing ${status === 'married' ? 'jointly' : 'as you do'}, the band comes from what you earn together. `
      + `On one wage alone we would have read ${Math.round(bandOnOneWage * 100)}% and shown about `
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
  const monthlyTax = ((grossAnnual * inForce.rate) / 12);
  const entered = earners.filter((e) => !e.pay.landsIsEstimated);
  const estimatedE = earners.filter((e) => e.pay.landsIsEstimated);
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
    shortBy: inForce.source === 'estimated' ? (earners.reduce((t, e) => t + payrollTaxWithheld(e.pay.grossAnnualised), 0) / 12) : null,   // G4: per earner, the wage base respected
    mode,
    statusAssumed: (h.profile as any)?.filingStatus == null,
  };

  // WHOSE FIGURE IS WHOSE — the sentence under the lands total, per person, with the dollars.
  // Entered beats estimated and they are never blended silently (founder, 2026-09-02).
  const money0 = (n: number) => money(Math.round(n));
  let landsNote: string | null = null;
  if (mode === 'entered' && earners.length > 0) {
    landsNote = earners.length > 1
      ? 'Both figures are what you entered — nothing here is calculated.'
      : 'This is what you entered — nothing here is calculated.';
  } else if (mode === 'mixed') {
    // The founder's wording (2026-09-02): a labelled fact per person, not a paragraph. Each line
    // says WHAT the figure is (take-home), WHOSE it is, and whether it was entered or calculated —
    // his first reading of the prose version took the entered take-home for a gross.
    const how = inForce.mine
      ? `calculated at your ${Math.round(inForce.rate * 100)}% rate, less 401(k)`
      : 'calculated — gross less federal tax and 401(k)';
    const line = (e: { name: string; pay: EarnerPay }) => e.pay.landsIsEstimated
      ? `${e.name === 'You' ? 'Your' : `${e.name}’s`} take-home: ≈${money0(e.pay.landsInBank)} (${how})`
      : `${e.name === 'You' ? 'Your' : `${e.name}’s`} take-home: ${money0(e.pay.landsInBank)} (${e.name === 'You' ? 'you' : e.name} entered)`;
    landsNote = earners.map(line).join('\n');
  }

  return {
    earners,
    grossAnnual,
    landsInBank,
    bandOnOneWage,
    bandOnEveryWage,
    bandNote,
    everyFigureAgrees: earners.every((e) => e.pay.verdict.ok),
    tax,
    landsEstimated: estimatedE.length > 0,
    landsNote,
    monthly401k: (earners.reduce((t, e) => t + e.pay.monthly401k, 0)),
    otherTakenMonthly: earners.some((e) => e.pay.everythingElseMonthly == null)
      ? null
      : earners.reduce((t, e) => t + (e.pay.everythingElseMonthly as number), 0),
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
/* ─ MK-CF-F-198 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * payrollTaxWithheld
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     w = max(0, wage annual)
 *     the answer = min(w, SS_WAGE_BASE) × 0.062 + w × 0.0145 + max(0, w − MEDICARE_ADDITIONAL_THRESHOLD) × 0.009
 *
 * Called by ... MK-CF-O-001 basePay
 *
 * Reaches ..... 21 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-201 INCOME
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-101 PLAN · MK-NW-F-100 TREND
 *               MK-CF-F-026 actualDebtPayment · MK-CF-F-210 annualOfSource
 *               MK-CF-O-001 basePay · MK-CF-F-036 buildDebtState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-041 getDebtState
 *               MK-CF-O-004 incomeSummary · MK-XS-F-029 monthlySavings
 *               MK-XS-F-032 snapshotFromOnboarding · MK-XS-F-028 surplusByMonth
 *               … and 3 more — the full list is on functions_from_code
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
/* ─ MK-CF-F-179 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * entryFromWage
 *
 * Answers ..... WHAT IS STORED → WHAT THIS FILE READS.
 *
 * Formula .....
 *     a = w (or none when missing)
 *     table = salary months(a as any)
 *     varies = salary month mode = 'months' (or object.keys(table).length > 0 when missing or zero)
 *
 * Called by ... MK-CF-O-004 incomeSummary
 *
 * Reaches ..... 17 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-211 DEBTS · MK-CF-F-201 INCOME
 *               MK-NW-F-082 NW · MK-NW-F-101 PLAN
 *               MK-NW-F-100 TREND · MK-CF-F-026 actualDebtPayment
 *               MK-CF-F-210 annualOfSource · MK-CF-F-036 buildDebtState
 *               MK-XS-F-031 buildSnapshot · MK-CF-F-041 getDebtState
 *               MK-CF-O-004 incomeSummary · MK-XS-F-029 monthlySavings
 *               MK-XS-F-032 snapshotFromOnboarding · MK-XS-F-028 surplusByMonth
 *               MK-CF-O-018 theDebts · MK-NW-O-003 theNetWorth
 *               MK-CF-F-024 totalDebtMonthly
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-039 how often each income arrives
 *               MK-XS-I-043 their own retirement contribution
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
  };
}
