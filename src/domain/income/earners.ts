/**  WHO EARNS A WAGE — one, or two.
 *
 *  The app has always asked "Who earns this income? You / Spouse / Both", stored the answer, and
 *  then kept ONE salary. Choosing "Both" tagged that single wage as belonging to two people; there
 *  was nowhere to put the second. So a household on $84,000 and $54,000 was read as $84,000 — and
 *  the tax band, which is set by everything the household is taxed on together, was read off the
 *  smaller number. That is finding B32, and it is the larger half of it: the missing salary itself.
 *
 *  The spouse’s wage is stored under THE SAME FIELD NAMES as the person's own, in its own block.
 *  That is deliberate: every function that already reads a wage — hourly vs salaried, the month
 *  table, the take-home gross-up, the employer match — works on either block without being changed,
 *  so nothing about how a single wage is read could drift away from how a spouse’s is.
 *
 *  Approved mock: income-v5, frames 2a–2e ("Each person's pay").
 */
import type { OnboardingProfile, Money } from '../onboardingProfile';
import { toNum } from '../_shared/num';

/** Everything that describes one person's wage. Same names as the top-level profile fields. */
export interface EarnerWage {
  baseSalary?: Money;
  salaryFreq?: 'hourly' | 'weekly' | 'biweekly' | 'monthly';
  salaryMode?: 'gross' | 'takehome';
  hoursPerWeek?: Money;
  salaryByMonth?: Record<string, Money> | Money[];
  salaryMonthMode?: 'same' | 'months';
  c_401k?: Money;
  employerMatchValue?: Money;
  employerMatchMode?: 'pct' | 'dollar';
  /** The take-home they enter, per period. Used as typed — never grossed up. */
  landsTypical?: Money;
}

/** Whether a person has a wage on record: a base salary above zero, or a month-by-month pay table. */
/* ─ MK-CF-F-172 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * hasWage
 *
 * Answers ..... Whether a person has a wage on record: a base salary above zero, or a month-by-month pay table.
 *
 * Formula .....
 *     the answer = w exists and (base salary > 0 or the salary-by-month table has entries)
 *
 * Called by ... MK-CF-F-173 earnerWages
 *
 * Reaches ..... 105 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               MK-NW-F-093 QUIET_PERF · MK-CF-F-207 SOURCE
 *               … and 87 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-023 salary and other income
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-172
 * Changed ..... not in git yet (—)
 */
const hasWage = (w: any): boolean =>
  !!w && (Number(w.baseSalary) > 0 || (w.salaryByMonth && Object.keys(w.salaryByMonth).length > 0));

/** The wages this household actually has, in the order the screen shows them.
 *
 *  `whoEarns` says who the answers describe. 'spouse' means the one wage on record is theirs, which
 *  is how the app has always recorded it — so that wage is still counted, once, and not dropped. */
/* ─ MK-CF-F-173 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * earnerWages
 *
 * Answers ..... The wages this household actually has, in the order the screen shows them.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     own = a
 *     spouse = spouse wage (or nothing when missing)
 *     who = who earns (or 'you' when missing)
 *     out = [own]
 *     the answer = out
 *     [spouse as earner wage]   when who = 'partner' and has wage(spouse)
 *
 * Called by ... MK-CF-F-092 incomeMonthlyGrid · MK-CF-F-174 hasTwoEarners
 *               MK-CF-F-175 sumOverEarners · MK-CF-F-176 sumMonthsOverEarners
 *               MK-CF-F-180 enteredLandsAnnual · MK-CF-F-181 rateInForce
 *               MK-CF-O-004 incomeSummary · MK-CF-O-016 incomeSources
 *               MK-CF-O-019 theIncomeManager
 *
 * Reaches ..... 104 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               MK-NW-F-093 QUIET_PERF · MK-CF-F-207 SOURCE
 *               … and 86 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-173
 * Changed ..... not in git yet (—)
 */
export function earnerWages(op: OnboardingProfile | null): EarnerWage[] {
  const a: any = op ?? {};
  const own: EarnerWage = a;
  const partner: EarnerWage | null = a.partnerWage ?? null;
  const who = a.whoEarns ?? 'you';
  if (who === 'both') {
    const out = [own];
    if (hasWage(partner)) out.push(partner as EarnerWage);
    return out;
  }
  // 'you' or 'spouse' — one wage either way. Which person it belongs to changes the label on the
  // screen, never the arithmetic, so both read the block that holds it.
  if (who === 'partner' && hasWage(partner)) return [partner as EarnerWage];
  return [own];
}

/** Does this household have a second wage on record? */
/* ─ MK-CF-F-174 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * hasTwoEarners
 *
 * Answers ..... Does this household have a second wage on record?
 *
 * Formula .....
 *     earner wages(op).length > 1
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-174
 * Changed ..... not in git yet (—)
 */
export function hasTwoEarners(op: OnboardingProfile | null): boolean {
  return earnerWages(op).length > 1;
}

/** Add up one number per earner. The shape every household figure is built from. */

/** Adds up one figure across every earner in the household. */
/* ─ MK-CF-F-175 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * sumOverEarners
 *
 * Answers ..... Adds up one figure across every earner in the household.
 *
 * Formula .....
 *     Σ over earner wages(op) of (of(each) (or 0 when missing or zero))
 *
 * Called by ... MK-CF-F-078 employerMatchMonthly · MK-CF-F-188 householdPreTaxContributionsAnnual
 *
 * Reaches ..... 14 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-202 TAX · MK-XS-F-031 buildSnapshot
 *               MK-XS-F-030 effectiveAnnualContribution · MK-CF-F-078 employerMatchMonthly
 *               MK-CF-O-017 futurePaycheck · MK-CF-F-188 householdPreTaxContributionsAnnual
 *               MK-CF-F-079 incomeFromOnboarding · MK-NW-F-041 monthlyContributionsFromOnboarding
 *               MK-PL-F-068 selectWillItLast · MK-XS-F-032 snapshotFromOnboarding
 *               MK-PL-F-031 taxOrganizer · MK-PL-F-082 taxableIncomeSteps
 *               MK-CF-O-007 theTaxOrganizer · MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-175
 * Changed ..... not in git yet (—)
 */
export function sumOverEarners(op: OnboardingProfile | null, of: (w: EarnerWage) => number): number {
  return earnerWages(op).reduce((t, w) => t + (of(w) || 0), 0);
}

/** Add up twelve numbers per earner, month by month. */
/* ─ MK-CF-F-176 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * sumMonthsOverEarners
 *
 * Answers ..... Add up twelve numbers per earner, month by month.
 *
 * Formula .....
 *     rows = for each of earner wages(op): of
 *     the answer = array.from({ length: 12 }, (_, i) => rows.reduce((t, r) => t + (r[i] or 0), 0))
 *
 * Called by ... MK-CF-F-060 salaryGrossByMonth · MK-CF-F-206 householdK401ByMonth
 *
 * Reaches ..... 94 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-088 BENCH · MK-CF-F-205 COMING
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-CF-F-201 INCOME · MK-NW-F-098 LEDGER_BAND
 *               MK-CF-F-200 LINE · MK-CF-O-014 M
 *               MK-CF-F-203 MONTH · MK-NW-F-082 NW
 *               MK-CF-O-011 PAY · MK-CF-O-012 PAY_ESTIMATED
 *               MK-CF-O-013 PAY_LANDS_TYPED · MK-NW-F-083 PERF
 *               MK-NW-F-085 PERF_ONE · MK-NW-F-101 PLAN
 *               MK-NW-F-093 QUIET_PERF · MK-CF-F-202 TAX
 *               … and 76 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · If r[i] is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-176
 * Changed ..... not in git yet (—)
 */
export function sumMonthsOverEarners(
  op: OnboardingProfile | null, of: (w: EarnerWage) => number[],
): number[] {
  const rows = earnerWages(op).map(of);
  return Array.from({ length: 12 }, (_, i) => rows.reduce((t, r) => t + (r[i] || 0), 0));
}

/** The household's pre-tax 401(k) contributions for the year — every earner's, added up. */
/* ─ MK-CF-F-188 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * householdPreTaxContributionsAnnual
 *
 * Answers ..... The household's pre-tax 401(k) contributions for the year — every earner's, added up.
 *
 * Formula .....
 *     Σ over every earner of (monthly 401(k) contribution) × 12
 *
 * Called by ... MK-PL-F-082 taxableIncomeSteps
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-202 TAX · MK-PL-F-031 taxOrganizer
 *               MK-PL-F-082 taxableIncomeSteps · MK-CF-O-007 theTaxOrganizer
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-043 their own retirement contribution
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Twelve equal months — a contribution entered monthly is taken as running all year.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-188
 * Changed ..... not in git yet (—)
 */
export function householdPreTaxContributionsAnnual(op: OnboardingProfile | null): number {
  return sumOverEarners(op, (w) => toNum(w.c_401k)) * 12;
}
