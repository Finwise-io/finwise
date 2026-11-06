/** THE INCOME TAB'S SOURCE ROWS THAT THE SOURCE'S OWN FUNCTIONS DO NOT ANSWER IN ONE CALL (2026-10-25, Cash flow drawing match CF-12).
 *
 *  The approved Income tab (cash-flow_v01, frame 5) lists a source the household HAS even when it is worth nothing yet —
 *  "Rental income · 2 properties · $0 ›". The tab could only ask for the rent's net figure, which is $0 both for two rentals
 *  that cover their own costs and for no rental at all, so the row was drawn only once the net passed $0.
 */
import { rentalList, rentalNetAnnual, guaranteedOutsideStreams, socialSecurityNotYetMonthly } from '../../../src/domain/income/onboarding';

/** What it is for: THE RENTALS THE HOUSEHOLD HAS, AND WHAT THEY CLEAR A MONTH — the Income tab's "Rental income" row (2026-10-25,
 *  CF-12). A rent entry counts once it names its property (his rule DEC-4059d, read by rentalList), and the month's figure is
 *  the year's net ÷ 12 (rentalNetAnnual). Null when there is none. Worked by hand: two rentals, $1,500 in and $1,500 out and
 *  $900 in and $900 out → 2 properties, (0 + 0) × 12 ÷ 12 = $0. */
/* ─ MK-CF-F-249 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * rentalsHeld
 *
 * Answers ..... What it is for: THE RENTALS THE HOUSEHOLD HAS, AND WHAT THEY CLEAR A MONTH — the Income tab's "Rental income" row (2026-10-25, CF-12).
 *
 * Formula .....
 *     count = count of rental list(op as any)
 *     the answer:
 *     count = count
 *     monthly net = rental net annual(op as any) ÷ 12   if count > 0
 *     nothing   otherwise
 *
 * Called by ... MK-CF-O-016 incomeSources
 *
 * Reaches ..... 487 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 469 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-249
 * Changed ..... not in git yet (—)
 */
export function rentalsHeld(op: Record<string, any> | null): { count: number; monthlyNet: number } | null {
  const count = rentalList(op as any).length;
  return count > 0 ? { count, monthlyNet: rentalNetAnnual(op as any) / 12 } : null;
}

/** What it is for: THE GUARANTEED INCOME BEING RECEIVED NOW — the Income tab's "Social Security · pension · guaranteed income" row
 *  (2026-10-25, MK-CF-M-011, the outside measurement's tenets 4 and 5). The four sources from outside the person's own savings
 *  (guaranteedOutsideStreams, MK-CF-F-076: Social Security, a pension, an annuity, another), added up a month — and only when
 *  retirement income is something the person said they receive now (their answers name retirement income, as
 *  currentRetirementIncomeMonthly reads it). A 401(k) withdrawal or a required withdrawal is a draw on savings, not guaranteed
 *  income; a Social Security estimate typed in the Plan is a figure for later, not money arriving. Worked by hand: $2,400 of
 *  Social Security received and $1,500/month taken from a 401(k) → $2,400 (it read $3,900); a worker's $2,900 ssa.gov estimate
 *  with retirement income not among their sources → 0, and no row (it read $2,900). */
/* ─ MK-CF-F-250 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * guaranteedReceivedNow
 *
 * Answers ..... What it is for: THE GUARANTEED INCOME BEING RECEIVED NOW — the Income tab's "Social Security · pension · guaranteed income" row (2026-10-25, MK-CF-M-011, the outside measurement's tenets 4 and 5).
 *
 * Formula .....
 *     srcs = op.income sources
 *     0   when array.is array(srcs) and !srcs.includes('retirement_income')
 *     the answer = Σ over guaranteed outside streams(op as any) of (monthly)- social security not yet monthly(op as any)
 *
 * Called by ... MK-CF-O-016 incomeSources
 *
 * Reaches ..... 487 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 469 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-040 whether a stream is already being received
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-250
 * Changed ..... not in git yet (—)
 */
export function guaranteedReceivedNow(op: Record<string, any> | null): number {
  const srcs = op?.incomeSources;
  if (Array.isArray(srcs) && !srcs.includes('retirement_income')) return 0;
  // each source answers for itself (2026-10-25, FIX-INCOME-B; found by CF-MMFIX-B): Social Security answered "Not yet" is not
  // received now, though a pension is — it read $2,900 more a month
  return guaranteedOutsideStreams(op as any).reduce((t, st) => t + st.monthly, 0) - socialSecurityNotYetMonthly(op as any);
}
