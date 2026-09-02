// Your base pay — gross, the 401(k), and what lands in the bank.
//
// Bonus, stocks and other income are captured on their own screens and are NOT here.
//
// WHY THIS FILE EXISTS. Base pay used to be one field with a Gross / Take-home toggle. When
// someone chose take-home the app inverted tax to find a gross, then taxed it back down — and
// because take-home ALREADY has the 401(k) out of it, the contribution came off twice. Someone
// typing $4,818 a month with $20,000 a year going into a 401(k) was shown $3,351: $1,467 a month
// adrift from what they had just typed. That is finding B27.
//
// The fix is to stop deriving what the person can tell us. Gross is asked for and is required.
// The 401(k) and what lands in the bank are asked for and are optional. Nothing is ever grossed up.
//
// EVERY RULING BELOW IS THE FOUNDER'S, MADE 2026-08-27, and is named where it applies.
import { toNum, round2 } from '../../../src/domain/_shared/num';
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
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-143 annualisedGross · MK-CF-O-001 basePay
 *               MK-CF-F-145 deductionsFromPay · MK-CF-F-171 earnerPay
 *               MK-CF-F-128 grossByMonth · MK-CF-O-004 incomeSummary
 *               MK-CF-F-146 payFiguresAgree · MK-CF-F-141 perMonth
 *               MK-CF-F-144 takeHomeAsEntered
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
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-143 annualisedGross · MK-CF-O-001 basePay
 *               MK-CF-F-145 deductionsFromPay · MK-CF-F-171 earnerPay
 *               MK-CF-F-128 grossByMonth · MK-CF-O-004 incomeSummary
 *               MK-CF-F-146 payFiguresAgree · MK-CF-F-144 takeHomeAsEntered
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Treats a year as twelve equal months.
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
 * Reaches ..... 8 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-143 annualisedGross · MK-CF-O-001 basePay
 *               MK-CF-F-145 deductionsFromPay · MK-CF-F-171 earnerPay
 *               MK-CF-F-128 grossByMonth · MK-CF-O-004 incomeSummary
 *               MK-CF-F-146 payFiguresAgree · MK-CF-F-144 takeHomeAsEntered
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
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-143 annualisedGross · MK-CF-O-001 basePay
 *               MK-CF-F-145 deductionsFromPay · MK-CF-F-171 earnerPay
 *               MK-CF-O-004 incomeSummary · MK-CF-F-146 payFiguresAgree
 *               MK-CF-F-144 takeHomeAsEntered
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
 *  $7,357 and therefore $88,286 a year — not $103,000. Summing would tax fourteen months of pay as
 *  if it were twelve, which on those figures is $3,237 of tax nobody owes.
 *
 *  [Founder 2026-08-27] And it is never read from take-home. What lands in the bank also carries
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
 *     the answer = round(avg × 12, 2 dp)
 *
 * Called by ... MK-CF-F-144 takeHomeAsEntered · MK-CF-F-145 deductionsFromPay
 *               MK-CF-F-171 earnerPay
 *
 * Reaches ..... 6 functions. Change the arithmetic above and these change with it:
 *               MK-CF-O-001 basePay · MK-CF-F-145 deductionsFromPay
 *               MK-CF-F-171 earnerPay · MK-CF-O-004 incomeSummary
 *               MK-CF-F-146 payFiguresAgree · MK-CF-F-144 takeHomeAsEntered
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
  return round2(avg * 12);
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
 *     k401 = round(to num(monthly401k) × 12, 2 dp)
 *     taxable = max(0, gross − k401)
 *     monthly = round((gross − k401 − tax owed for(taxable, filing status ?? 'single', 0, over65 ?? 0)) ÷ 12, 2 dp)
 *
 * Called by ... MK-CF-F-145 deductionsFromPay · MK-CF-F-146 payFiguresAgree
 *               MK-CF-F-171 earnerPay
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-CF-O-001 basePay · MK-CF-F-145 deductionsFromPay
 *               MK-CF-F-171 earnerPay · MK-CF-O-004 incomeSummary
 *               MK-CF-F-146 payFiguresAgree
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Decides .....
 *     · If over65 is missing it uses 0.
 *     · Treats a year as twelve equal months.
 *     · Turns a monthly figure into a year by multiplying by twelve.
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
    return { monthly: round2(months.reduce((t, [, v]) => t + v, 0) / months.length),
             estimated: false, why: 'what you told us lands in your bank, month by month' };
  }
  const entered = e.landsTypical;
  if (entered != null && String(entered).trim() !== '' && toNum(entered) > 0) {
    return { monthly: round2(perMonth(entered, e)), estimated: false,
             why: 'what you told us lands in your bank' };
  }
  const gross = annualisedGross(e);
  const k401 = round2(toNum(e.monthly401k) * 12);      // zero unless they entered one
  const taxable = Math.max(0, gross - k401);
  // The band is a property of EVERYTHING the household is taxed on, never of this wage alone
  // (founder ruling 2026-08-27). Base pay READS it: the status and the over-65 count come in with
  // the entry, and default to a single filer only because that is what the app assumed before the
  // filing-status question existed.
  const monthly = round2((gross - k401 - taxOwedFor(taxable, e.filingStatus ?? 'single', 0, e.over65 ?? 0)) / 12);
  return {
    monthly, estimated: true,
    why: k401 > 0
      ? 'estimated from your gross pay, after your 401(k) and federal tax — it knows nothing about your state or your insurance, so it reads high'
      : 'estimated from your gross pay and federal tax. Nothing is taken out for a 401(k), because you have not told us about one. It knows nothing about your state or your insurance either, so it reads high',
  };
}

/** EVERYTHING ELSE TAKEN OUT — gross, less the 401(k), less what lands in the bank.
 *
 *  One number covering federal tax, state tax, medical cover and anything else bought through
 *  work. [Founder 2026-08-27] It is deliberately not split: splitting means asking about each,
 *  and the point of asking for three figures is not having to.
 *
 *  Null when they have not said what lands — there is nothing to derive it from, and an estimate
 *  minus an estimate is not a fact. */
/* ─ MK-CF-F-145 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * deductionsFromPay
 *
 * Answers ..... EVERYTHING ELSE TAKEN OUT — gross, less the 401(k), less what lands in the bank.
 *
 * Formula .....
 *     t = take home as entered(e)
 *     nothing   when estimated
 *     the answer = round(annualised gross(e) − round2(to num(monthly401k) × 12) − round2(monthly × 12), 2 dp)
 *
 * Called by ... MK-CF-F-171 earnerPay
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-CF-O-001 basePay · MK-CF-F-171 earnerPay
 *               MK-CF-O-004 incomeSummary
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
  return round2(annualisedGross(e) - round2(toNum(e.monthly401k) * 12) - round2(t.monthly * 12));
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
 *     k401 = round(monthly401k read as a number (0 when it is not one), 2 dp)
 *     gm = gross by month(e)
 *     lands = a lookup of lm
 *     landed = lands.get(key) as number   if lands.has(key)
 *     round(per month(lands typical, e), 2 dp)   otherwise
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
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-CF-O-001 basePay · MK-CF-F-171 earnerPay
 *               MK-CF-O-004 incomeSummary
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Multiplies by 100 — a percentage, or an option contract treated as 100 shares. Worth checking which.
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
  const k401 = round2(toNum(e.monthly401k));
  const gm = grossByMonth(e);
  const lm = e.varies && e.landsByMonth
    ? monthsOf(e.landsByMonth)
    : gm.map(([k]) => [k, round2(perMonth(e.landsTypical, e))] as [string, number]);
  const lands = new Map(lm);

  for (const [key, gross] of gm) {
    const landed = lands.has(key) ? (lands.get(key) as number) : round2(perMonth(e.landsTypical, e));
    const left = gross - k401 - landed;
    if (left < -AGREE_TOLERANCE) {
      const when = key === 'typical' ? '' : ` in ${key}`;
      return { ok: false, warn: false, say:
        `These three cannot all be right${when}. ${money(gross)} gross, less ${money(k401)} into ` +
        `your 401(k), leaves ${money(gross - k401)} — but you have said ${money(landed)} lands in ` +
        `your bank. That is ${money(Math.abs(left))} more than there is. Most likely the gross ` +
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
 *  "Out (bills + debt) $8,321" came to sit four rows above "of $0 planned". */
export interface EarnerPay {
  grossMonthly: number;
  grossAnnualised: number;
  monthly401k: number;
  landsInBank: number;
  landsIsEstimated: boolean;
  landsWhy: string;
  everythingElse: number | null;
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
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-O-001 basePay · MK-CF-O-004 incomeSummary
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
    grossMonthly: round2(annual / 12),
    grossAnnualised: annual,
    monthly401k: round2(toNum(e.monthly401k)),
    landsInBank: t.monthly,
    landsIsEstimated: t.estimated,
    landsWhy: t.why,
    everythingElse: deductionsFromPay(e),
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
  whose: string;          // 'your rate, 24%' · 'your figures, 28%' · 'our estimate, 9%'
  estimated: boolean;     // true only when it is OURS — then it is federal-only and says so
  covers: string;         // what that rate includes, in words
  shortBy: number | null; // when estimating: roughly how much a month we are NOT deducting
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
}

/* ─ MK-CF-O-001 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * basePay
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     profile = profile
 *     status = filing status (or 'single' when missing)
 *     over65 = over65 (or 0 when missing)
 *     earners = for each of earners (or none when missing): name = name
 *     pay = earner pay({ ...entry, filing status: status, over65 })
 *     gross annual = round(Σ over earners of (pay.gross annualised), 2 dp)
 *     lands in bank = round(Σ over earners of (pay.lands in bank), 2 dp)
 *     first wage = earners[0].pay.gross annualised (or 0 when missing)
 *     band on one wage = marginal bracket for(first wage, status, over65)
 *     band on every wage = marginal bracket for(gross annual, status, over65)
 *     band note = nothing
 *     wrong = round((gross annual × band on one wage) ÷ 12, 2 dp)
 *     … the first steps only — the rest of the body needs reading by hand.
 *
 * Called by ... MK-CF-O-004 incomeSummary
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-O-004 incomeSummary
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-030 tax filing status and age
 *
 * Decides .....
 *     · If over65 is missing it uses 0.
 *     · If gross annualised is missing it uses 0.
 *     · Uses a built-in f i c a s h a r e of 7.65%.
 *     · Treats a year as twelve equal months.
 *     · Multiplies by 100 — a percentage, or an option contract treated as 100 shares. Worth checking which.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-CF-O-001
 * Changed ..... not in git yet (—)
 */
export function basePay(h: HouseholdPayInput): BasePay {
  const profile = h.profile;
  const status = h.filingStatus ?? 'single';
  const over65 = h.over65 ?? 0;
  const earners = (h.earners ?? []).map((e) => ({ name: e.name, pay: earnerPay({ ...e.entry, filingStatus: status, over65 }) }));

  const grossAnnual = round2(earners.reduce((t, e) => t + e.pay.grossAnnualised, 0));
  const landsInBank = round2(earners.reduce((t, e) => t + e.pay.landsInBank, 0));
  const firstWage = earners[0]?.pay.grossAnnualised ?? 0;

  const bandOnOneWage = marginalBracketFor(firstWage, status, over65);
  const bandOnEveryWage = marginalBracketFor(grossAnnual, status, over65);

  // What reading the band off one wage would have cost, per month. Only said when it is not zero:
  // a note explaining a difference of nothing is noise.
  let bandNote: string | null = null;
  if (earners.length > 1 && bandOnOneWage !== bandOnEveryWage) {
    const wrong = round2((grossAnnual * bandOnOneWage) / 12);
    const right = round2((grossAnnual * bandOnEveryWage) / 12);
    bandNote = `Filing ${status === 'married' ? 'jointly' : 'as you do'}, the band comes from what you earn together. `
      + `On one wage alone we would have read ${Math.round(bandOnOneWage * 100)}% and shown about `
      + `${money(right - wrong)} a month more than really lands.`;
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
  const monthlyTax = round2((grossAnnual * inForce.rate) / 12);
  const tax: TaxOnPay = {
    bracket: bandOnEveryWage,
    monthly: monthlyTax,
    rate: inForce.rate,
    whose: inForce.label,
    estimated: inForce.source === 'estimated',
    covers: inForce.covers,
    // FICA_SHARE is NEVER added to the estimate — it exists so the screen can say what is missing.
    shortBy: inForce.source === 'estimated' ? round2((wagesAnnual * FICA_SHARE) / 12) : null,
  };

  return {
    earners,
    grossAnnual,
    landsInBank,
    bandOnOneWage,
    bandOnEveryWage,
    bandNote,
    everyFigureAgrees: earners.every((e) => e.pay.verdict.ok),
    tax,
  };
}

/** Social Security and Medicare on a wage: 6.2% + 1.45%. Named so a screen can say what our estimate
 *  leaves out, in money. It is never ADDED to the estimate — see the note in basePay above. */
export const FICA_SHARE = 0.0765;


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
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-O-004 incomeSummary
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-043 their own retirement contribution
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
