/**  THE TAX RATE IN FORCE — whose it is, what it is, and what it covers.
 *
 *  Three answers, in this order:
 *
 *  1 · THEIRS, TYPED. Someone entered what really comes out of their pay, off a payslip. It is an
 *      AVERAGE — everything withheld, divided by everything earned — and it beats anything we work
 *      out, because they can see it and we cannot.
 *  2 · THEIRS, IMPLIED. They entered their take-home. Then the rate is not a guess either: it
 *      is their own gross, less their own 401(k), less what they said lands. Until 2026-08-28 this
 *      was thrown away — every screen but base pay re-estimated a figure the person had already
 *      given us, and disagreed with itself by $572/month on the founder's own persona.
 *  3 · OURS, ESTIMATED. Federal income tax only, assuming the standard deduction. It does not
 *      include Social Security and Medicare (about 7.7% of a wage) or any state tax, so it reads low
 *      as a deduction and high as take-home. Founder ruling 2026-08-28: it stays federal, because
 *      payroll tax applies to WAGES and our gross also carries rent, dividends and bonuses.
 *
 *  WHAT IT IS NOT FOR. This is an average rate. Four figures need a MARGINAL one — what the NEXT
 *  dollar costs: the Roth conversion's tax bill, the Roth-vs-Traditional lean, capital-gains rates,
 *  and the tax drag in the retirement odds. Those read the bracket tables directly and MUST keep
 *  doing so. Someone averaging 24% whose next dollar is taxed at 32% would otherwise be told a
 *  conversion costs $2,400 when it costs $3,200 — and advised to make it on that basis.
 */
import type { OnboardingProfile } from '../onboardingProfile';
import { toNum } from '../_shared/num';
import { earnerWages, type EarnerWage } from './earners';
import { salaryAnnual, taxableAnnual, filingStatusOf, stateRateOf, over65CountOf, householdK401ByMonth } from './onboarding';
import { taxOwedFor } from './tax';


export type RateSource = 'typed' | 'implied' | 'estimated';

export interface RateInForce {
  rate: number;          // 0–1, of gross
  source: RateSource;
  mine: boolean;         // true when it is the person's own figure, not ours
  label: string;         // what a screen prints beside the number
  covers: string;        // what the rate includes, in words
}

/** Every earner’s entered take-home, a year — or null when any of them did not say. */
/* ─ MK-CF-F-180 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * enteredLandsAnnual
 *
 * Answers ..... Every earner’s entered take-home, a year — or null when any of them did not say.
 *
 * Formula .....
 *     wages = earner wages(op)
 *     nothing   when count of wages is missing
 *     total = 0
 *     v = (w as any).lands typical read as a number (0 when it is not one)
 *     nothing   when not (v > 0)
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-CF-F-181 rateInForce
 *
 * Reaches ..... 85 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 67 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in total of 0.
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-180
 * Changed ..... not in git yet (—)
 */
export function enteredLandsAnnual(op: OnboardingProfile | null): number | null {
  const wages = earnerWages(op);
  if (!wages.length) return null;
  let total = 0;
  for (const w of wages as EarnerWage[]) {
    const v = toNum((w as any).landsTypical);
    if (!(v > 0)) return null;                       // one silence and the household figure is a guess
    total += v * 12;   // the take-home is typed EACH MONTH at every pay frequency (approved drawing v07, frame 2c)
  }
  return (total);
}

/** THE ONE ANSWER every screen reads. */
/* ─ MK-CF-F-181 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * rateInForce
 *
 * Answers ..... THE ONE ANSWER every screen reads.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     rate = min(max(to num(manual tax rate) ÷ 100, 0), 1)
 *     gross = salary annual(op)
 *     lands = entered lands annual(op)
 *     k401 = Σ over earner wages(op) of (to num((each as any).c 401k) × 12)
 *     out = max(0, gross − k401 − lands)
 *     rate = min(max(out ÷ gross, 0), 1)
 *     taxed = taxable annual(op)
 *     k401 = Σ over household k401 by month(op) of (each)
 *
 * Called by ... MK-CF-F-090 effectiveRate · MK-CF-F-092 incomeMonthlyGrid
 *               MK-CF-O-001 basePay · MK-CF-O-004 incomeSummary
 *
 * Reaches ..... 84 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-CF-F-205 COMING · MK-CF-F-211 DEBTS
 *               MK-NW-F-079 EF · MK-CF-F-201 INCOME
 *               MK-NW-F-098 LEDGER_BAND · MK-CF-F-200 LINE
 *               MK-CF-O-014 M · MK-CF-F-203 MONTH
 *               MK-NW-F-082 NW · MK-CF-O-011 PAY
 *               MK-CF-O-012 PAY_ESTIMATED · MK-CF-O-013 PAY_LANDS_TYPED
 *               MK-NW-F-083 PERF · MK-NW-F-085 PERF_ONE
 *               MK-NW-F-101 PLAN · MK-NW-F-093 QUIET_PERF
 *               … and 66 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-023 salary and other income
 *               MK-XS-I-043 their own retirement contribution
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-181
 * Changed ..... not in git yet (—)
 */
export function rateInForce(op: OnboardingProfile | null): RateInForce {
  const a: any = op ?? {};

  // taxMode alone decides, never the value: 0% is a real answer (someone with no tax liability),
  // and requiring a positive number quietly sent those people back to the calculated rate.
  if (a.taxMode === 'manual') {
    const rate = Math.min(Math.max(toNum(a.manualTaxRate) / 100, 0), 1);
    return { rate, source: 'typed', mine: true,
             label: `your rate, ${Math.round(rate * 100)}%`,
             covers: 'everything that comes out of your pay, as you entered' };
  }

  const gross = salaryAnnual(op);
  const lands = enteredLandsAnnual(op);
  if (gross > 0 && lands != null) {
    const k401 = earnerWages(op).reduce((t, w) => t + toNum((w as any).c_401k) * 12, 0);
    const out = Math.max(0, gross - k401 - lands);
    const rate = Math.min(Math.max(out / gross, 0), 1);
    return { rate, source: 'implied', mine: true,
             label: `your figures, ${Math.round(rate * 100)}%`,
             covers: 'everything that comes out, calculated from the take-home you entered' };
  }

  // B05 (founder audit 2026-08-26): a 401(k) comes off BEFORE tax. The calculated rate was tax on the
  // whole of what the household earns ÷ what it earns — so the base-pay card charged tax on money
  // that had gone into the 401(k) ($185/month too much on the approved drawing's own household),
  // while the month grid took it off first. One sum now: the year's tax on what is left after the
  // 401(k)s, as a share of everything taxable — so gross − tax − 401(k)s still adds up on the card.
  const taxed = taxableAnnual(op);
  const k401 = householdK401ByMonth(op).reduce((t, m) => t + m, 0);   // only the months each earner is paid
  const rate = taxed > 0
    ? taxOwedFor(Math.max(0, taxed - k401), filingStatusOf(op), stateRateOf(op), over65CountOf(op)) / taxed
    : 0;
  return { rate, source: 'estimated', mine: false,
           label: `calculated, ${Math.round(rate * 100)}%`,
           covers: 'federal income tax only, assuming the standard deduction' };
}
