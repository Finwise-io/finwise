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
import { salaryAnnual, taxableAnnual, filingStatusOf, stateRateOf, over65CountOf, householdK401ByMonth, wagePaidMonths } from './onboarding';
import { taxOwedFor } from './tax';
import { percentDigits } from '../../../MoneyKeel/functions/_figure-spec';   // the one percent writer (R24, 2026-11-01)


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
 *     raw = (w as any).lands typical
 *     nothing   when raw = nothing (or string(raw).trim() = '' when missing or zero)
 *     [LOOP — the answer is found inside a loop the extractor cannot render; the steps above are the ones before it. Read by hand.]
 *
 * Called by ... MK-CF-F-181 rateInForce
 *
 * Reaches ..... 568 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 550 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Uses a built-in total of 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-180
 * Changed ..... not in git yet (—)
 */
export function enteredLandsAnnual(op: OnboardingProfile | null): number | null {
  const wages = earnerWages(op);
  if (!wages.length) return null;
  let total = 0;
  for (const w of wages as EarnerWage[]) {
    const raw = (w as any).landsTypical;
    // one silence and the household figure is a guess — but a take-home typed as 0 is an answer, not silence (2026-10-26,
    // FIX-INCOME-A; tenet 5: the person's word outranks the app's guess)
    if (raw == null || String(raw).trim() === '') return null;
    // the take-home is typed EACH MONTH at every pay frequency (approved drawing v07, frame 2c) — each month the wage is PAID
    // (2026-10-26, FIX-INCOME-A; DEC-7938, DEC-0376, tenet 1): the July starter's $3,799.17 is $22,795.02 over six paid months,
    // where × 12 read $45,590.04
    total += toNum(raw) * wagePaidMonths(w as any);
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
 *     k401 = Σ over household k401 by month(op) of (each)
 *     out = max(0, gross − k401 − lands)
 *     rate = min(max(out ÷ gross, 0), 1)
 *     taxed = taxable annual(op)
 *     state = state rate of(op)
 *
 * Called by ... MK-CF-F-049 buildIncomeState · MK-CF-F-090 effectiveRate
 *               MK-CF-F-092 incomeMonthlyGrid · MK-CF-F-240 PAY_LANDS_TYPED
 *               MK-CF-O-001 basePay · MK-CF-O-004 incomeSummary
 *               MK-PL-F-090 rateWordsOf · MK-XS-F-004 buildDatedGrid
 *
 * Reaches ..... 568 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 550 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-023 salary and other income
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
             label: `your rate, ${percentDigits(rate, 2)}%`,
             covers: 'everything that comes out of your pay, as you entered' };
  }

  const gross = salaryAnnual(op);
  const lands = enteredLandsAnnual(op);
  if (gross > 0 && lands != null) {
    // each earner's 401(k) in the months that earner is paid (MK-CF-F-206), never × 12 (2026-10-26, FIX-INCOME-A; DEC-0376):
    // the July starter's own figures imply 57.00%, where twelve months of 401(k) and take-home read 14%
    const k401 = householdK401ByMonth(op).reduce((t, m) => t + m, 0);
    const out = Math.max(0, gross - k401 - lands);
    const rate = Math.min(Math.max(out / gross, 0), 1);
    return { rate, source: 'implied', mine: true,
             label: `your figures, ${percentDigits(rate, 2)}%`,
             covers: 'everything that comes out, calculated from the take-home you entered' };
  }

  // Audit finding B05 (DEC-0185, 2026-08-26), and his DEC-0283: a 401(k) comes off before tax. The calculated rate was tax on the
  // whole of what the household earns ÷ what it earns — so the base-pay card charged tax on money
  // that had gone into the 401(k) ($185/month too much on the approved drawing's own household),
  // while the month grid took it off first. One sum now: the year's tax on what is left after the
  // 401(k)s, as a share of everything taxable — so gross − tax − 401(k)s still adds up on the card.
  const taxed = taxableAnnual(op);
  const rate = taxed > 0
    ? taxOwedFor(taxedAfterPreTax(op), filingStatusOf(op), stateRateOf(op), over65CountOf(op)) / taxed
    : 0;
  // THE STATE RATE THE PERSON TYPED IS INSIDE THE RATE, so the words say so (2026-10-23, CF-FIX): taxOwedFor adds it to taxable
  // income (E10), and the words read "federal income tax only" whatever was typed on the Tax organizer
  const state = stateRateOf(op);
  return { rate, source: 'estimated', mine: false,
           label: `calculated, ${percentDigits(rate, 2)}%`,
           covers: state > 0
             ? `federal income tax, plus the ${percentDigits(state, 2)}% state rate you entered, assuming the standard deduction`
             : 'federal income tax only, assuming the standard deduction' };
}

/** WHAT THE YEAR IS TAXED ON ONCE THE 401(k)s ARE OUT — everything taxable (taxableAnnual) less each earner's own 401(k) for
 *  the months they are paid, never below $0. Audit finding B05 (DEC-0185) and his DEC-0283: a 401(k) comes off before tax. The one
 *  income the rate in force, the bracket and every tax figure on the income screens read (2026-10-24, CF-FIX): the Income
 *  summary named the bracket of the whole year's gross while the tax was worked on this — single, $70,000 of wages and a
 *  $10,000 401(k) read the 22% bracket ($70,000 − $16,100 = $53,900) while the tax sat in the 12% one ($43,900). */
/* ─ MK-CF-F-230 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * taxedAfterPreTax
 *
 * Answers ..... WHAT THE YEAR IS TAXED ON ONCE THE 401(k)s ARE OUT — everything taxable (taxableAnnual) less each earner's own 401(k) for the months they are paid, never below $0.
 *
 * Formula .....
 *     k401 = Σ over household k401 by month(op) of (each)
 *     the answer = max(0, taxable annual(op) − k401)
 *
 * Called by ... MK-CF-F-181 rateInForce · MK-CF-O-001 basePay
 *               MK-CF-O-004 incomeSummary
 *
 * Reaches ..... 568 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 550 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-230
 * Changed ..... not in git yet (—)
 */
export function taxedAfterPreTax(op: OnboardingProfile | null): number {
  const k401 = householdK401ByMonth(op).reduce((t, m) => t + m, 0);   // only the months each earner is paid
  return Math.max(0, taxableAnnual(op) - k401);
}
