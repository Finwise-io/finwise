/**  THE TAKE-HOME MODE, CONVERTED ONCE AND RETIRED.
 *
 *  `salaryMode: 'takehome'` let someone enter their pay as the amount that reaches the bank. The app
 *  then INVERTED the tax schedule to find a gross that would produce it — a guess laid on top of an
 *  estimate, and the only reason grossFromNet exists.
 *
 *  The approved base-pay screen asks differently: gross AND the take-home, as two figures that must
 *  reconcile. So the mode has nothing left to do — but a profile saved before today may still carry
 *  it, and reading that number as gross would overstate someone's income by their whole tax bill.
 *
 *  So it is converted, once, by the only honest reading of what they told us: the number they typed
 *  IS their take-home. Their gross is worked back through the same schedule that used to do
 *  it silently — and from then on both figures are on record and the screen can check them.
 *
 *  This is the last caller of grossFromNet. When no stored profile carries the mode, both go.
 */
import type { OnboardingProfile } from '../onboardingProfile';
import { toNum } from '../_shared/num';
import { grossFromNet } from './tax';
import { filingStatusOf, over65CountOf } from './onboarding';

// THE ONE PAY-FREQUENCY TABLE (2026-11-01, FX-CF-B; R23): this file kept its own, which counted an HOUR as a MONTH (12 a year) and had
// no 'annually' — a take-home of $25 an hour, 40 hours a week, converted as $25 a MONTH ($300/year). An hourly take-home is now
// worked on the hours a week entered (× 52); with no hours, or a frequency outside the table, nothing is converted — the screens
// say what is missing (DEC-0296).
import { payPeriodsAYear } from './pay-frequency';
/** Pay periods a year for this profile's take-home as typed: the hours a week × 52 for an hourly wage, the one table otherwise. */
/* ─ MK-CF-F-309 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * periodsOf
 *
 * Answers ..... Pay periods a year for this profile's take-home as typed: the hours a week × 52 for an hourly wage, the one table otherwise.
 *
 * Formula .....
 *     h = na n   if string(op.hours per week ?? '').trim() = ''
 *     op.hours per week read as a number (0 when it is not one)   otherwise
 *     the answer:
 *     h × 52   if h > 0
 *     nothing   otherwise
 *
 * Called by ... MK-CF-F-186 convertTakeHomeMode
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-186 convertTakeHomeMode · MK-XS-F-199 profileOnTheWayIn
 *               MK-CF-F-310 repairHourlyTakeHome
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-039 how often each income arrives
 *               MK-XS-I-075 hours a week, for a wage paid by the hour
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-309
 * Changed ..... not in git yet (—)
 */
const periodsOf = (op: Record<string, any>): number | null => {
  if (String(op.salaryFreq ?? 'monthly') === 'hourly') {
    const h = String(op.hoursPerWeek ?? '').trim() === '' ? NaN : toNum(op.hoursPerWeek);
    return h > 0 ? h * 52 : null;
  }
  return payPeriodsAYear(op.salaryFreq);
};

/** True when this profile still holds a pre-2026-08-28 take-home entry. */
/* ─ MK-CF-F-185 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * needsTakeHomeConversion
 *
 * Answers ..... True when this profile still holds a pre-2026-08-28 take-home entry.
 *
 * Formula .....
 *     (op as any).salary mode = 'takehome' and to num((op as any).base salary) > 0
 *
 * Called by ... MK-CF-F-186 convertTakeHomeMode
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-186 convertTakeHomeMode · MK-XS-F-199 profileOnTheWayIn
 *               MK-CF-F-310 repairHourlyTakeHome
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-185
 * Changed ..... not in git yet (—)
 */
export function needsTakeHomeConversion(op: OnboardingProfile | null): boolean {
  return (op as any)?.salaryMode === 'takehome' && toNum((op as any)?.baseSalary) > 0;
}

/** Convert it. What they typed becomes what LANDS; the gross is worked back once and stored. */
/* ─ MK-CF-F-186 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * convertTakeHomeMode
 *
 * Answers ..... Convert it. What they typed becomes what LANDS; the gross is worked back once and stored.
 *
 * Formula .....
 *     op   when !needs take home conversion(op as any)
 *     periods = periods of(op)
 *     op   when periods = nothing
 *     net per period = op.base salary read as a number (0 when it is not one)
 *     net annual = net per period × periods
 *     typed rate = to num((op as any).manual tax rate) ÷ 100   if (op as any).tax mode = 'manual'
 *     na n   otherwise
 *     k401 annual = to num((op as any).c 401k) × 12
 *
 * Called by ... MK-CF-F-310 repairHourlyTakeHome · MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-199 profileOnTheWayIn · MK-CF-F-310 repairHourlyTakeHome
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-043 their own retirement contribution
 *               MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly
 *
 * Decides .....
 *     · Treats a year as twelve equal months.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-186
 * Changed ..... not in git yet (—)
 */
export function convertTakeHomeMode<T extends Record<string, any>>(op: T): T {
  if (!needsTakeHomeConversion(op as any)) return op;
  const periods = periodsOf(op);
  if (periods == null) return op;   // no hours, or a frequency outside the table: nothing is guessed (R23, DEC-0296)
  const netPerPeriod = toNum(op.baseSalary);
  const netAnnual = netPerPeriod * periods;
  // THEIR OWN RATE, WHEN THEY GAVE ONE (2026-10-24, Cash flow journey E2E-72; tenet 5): the gross is worked back so their typed
  // rate and their typed take-home both hold — take-home = gross × (1 − rate) − the 401(k). It was worked back from the federal
  // schedule whatever they typed, so a typed 0% read "Everything else taken out $475/month · 0%" on $5,000.
  const typedRate = (op as any).taxMode === 'manual' ? toNum((op as any).manualTaxRate) / 100 : NaN;
  // WITH NO RATE OF THEIR OWN, THE 401(k) IS ADDED BACK TOO (2026-10-26, FIX-INCOME-A; the lead's DEC-7942, his DEC-0200 and
  // DEC-0283 — a 401(k) is taken out before the tax is worked): gross − 401(k) − tax on (gross − 401(k)) = the take-home they typed, so what is
  // taxed is worked back from the take-home (grossFromNet) and the year's 401(k) sits on top. $4,211.17 a month with $511.43
  // into a 401(k) read $54,947.77 a year, which leaves $1,723.43 less than they said lands; it is $61,084.93.
  const k401Annual = toNum((op as any).c_401k) * 12;
  const grossAnnual = typedRate >= 0 && typedRate < 1
    ? (netAnnual + k401Annual) / (1 - typedRate)
    : grossFromNet(netAnnual, filingStatusOf(op as any), over65CountOf(op as any)) + k401Annual;
  return {
    ...op,
    baseSalary: String((grossAnnual / periods)),   // gross, as every other screen assumes
    landsTypical: String(netAnnual / 12),                // what they told us, as the month every screen now asks for
    salaryMode: 'gross',
    // NOT TYPED, AND SAID SO (tenet 3): Your base pay prints this gross as worked back from their take-home until they type one
    grossWorkedBack: true,
  };
}

/** What it is for: THE REPAIR OF AN HOURLY TAKE-HOME THE OLD CONVERSION READ AS A MONTH (2026-11-01, FX-CF-B; R23).
 *  From Build 54 (2026-09-01) to 2026-11-01 the conversion above counted an hour as a month. Before Build 54 sign-up offered Hourly
 *  beside Take-home, so a profile saved then as "$25 an hour, take-home, 40 hours a week" came out as a take-home of $25 a MONTH and a
 *  gross of $25 an hour worked back from $300/year. This finds that exact footprint — an hourly wage whose gross was worked back,
 *  whose take-home is the hourly figure itself and whose gross is what the old conversion made of it to the cent — and converts the
 *  hourly take-home again on the hours a week entered. Anything typed since breaks the footprint, so nothing typed is touched; with
 *  no hours entered nothing is changed. By hand: $25 × 40 × 52 = $52,000/year taken home, $4,333.33/month (it read $25). */
/* ─ MK-CF-F-310 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * repairHourlyTakeHome
 *
 * Answers ..... What it is for: THE REPAIR OF AN HOURLY TAKE-HOME THE OLD CONVERSION READ AS A MONTH (2026-11-01, FX-CF-B; R23).
 *
 * Formula .....
 *     a = op (or none when missing)
 *     op   when gross worked back is missing (or string(salary freq) ! = 'hourly' (or salary mode ! = 'gross' when missing or zero) when missing or zero)
 *     net = lands typical read as a number (0 when it is not one)
 *     op   when not (net > 0) or !(to num(hours per week) > 0)
 *     typed rate = to num(manual tax rate) ÷ 100   if tax mode = 'manual'
 *     na n   otherwise
 *     k401 annual = to num(c 401k) × 12
 *     op   when size of(to num(base salary) − old gross ÷ 12) > 0.005
 *     the answer = convert take home mode({ ...op, salary mode: 'takehome', base salary: string(net), lands typical: undefined, gross worked back: undefined })
 *
 * Called by ... MK-XS-F-199 profileOnTheWayIn
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-XS-F-199 profileOnTheWayIn
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-039 how often each income arrives
 *               MK-XS-I-043 their own retirement contribution
 *               MK-XS-I-060 how a person is paid — weekly, fortnightly, monthly
 *               MK-XS-I-075 hours a week, for a wage paid by the hour
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-310
 * Changed ..... not in git yet (—)
 */
export function repairHourlyTakeHome<T extends Record<string, any>>(op: T): T {
  const a: any = op ?? {};
  if (!a.grossWorkedBack || String(a.salaryFreq) !== 'hourly' || a.salaryMode !== 'gross') return op;
  const net = toNum(a.landsTypical);
  if (!(net > 0) || !(toNum(a.hoursPerWeek) > 0)) return op;
  // what the old conversion wrote for a take-home of `net` an hour read as `net` a month (periods 12)
  const typedRate = a.taxMode === 'manual' ? toNum(a.manualTaxRate) / 100 : NaN;
  const k401Annual = toNum(a.c_401k) * 12;
  const oldGross = typedRate >= 0 && typedRate < 1 ? (net * 12 + k401Annual) / (1 - typedRate)
    : grossFromNet(net * 12, filingStatusOf(a), over65CountOf(a)) + k401Annual;
  if (Math.abs(toNum(a.baseSalary) - oldGross / 12) > 0.005) return op;   // not the old conversion's footprint: leave it
  return convertTakeHomeMode({ ...op, salaryMode: 'takehome', baseSalary: String(net), landsTypical: undefined, grossWorkedBack: undefined });
}
