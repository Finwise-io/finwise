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

const PERIODS: Record<string, number> = { hourly: 12, weekly: 52, biweekly: 26, monthly: 12 };

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
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-186 convertTakeHomeMode · MK-XS-F-199 profileOnTheWayIn
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
 *     periods = PERIODS[string(op.salary freq ?? 'monthly')] (or 12 when missing)
 *     net per period = op.base salary read as a number (0 when it is not one)
 *     net annual = net per period × periods
 *     typed rate = to num((op as any).manual tax rate) ÷ 100   if (op as any).tax mode = 'manual'
 *     na n   otherwise
 *     k401 annual = to num((op as any).c 401k) × 12
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
  const periods = PERIODS[String(op.salaryFreq ?? 'monthly')] ?? 12;
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
