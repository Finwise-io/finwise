/** ONE PAY-FREQUENCY TABLE (2026-11-01, FX-CF-B; the lead's ruling R23, under his DEC-0296 and tenets 2 and 3 of DEC-3523).
 *
 *  How many pay periods make a year, for each way a wage is paid. Every reader of a pay frequency reads this table — the wage
 *  readers in onboarding.ts, Your base pay's MK-CF-O-001 basePay, and the take-home migration. There were three: two agreed, and
 *  the migration's counted an hour as a month (12 a year) and had no 'annually'. A frequency outside the table is no figure and a
 *  reason, never a month; a profile with no frequency saved is the Monthly Your base pay shows chosen. Dated row on
 *  income-end-to-end_v07 of 2026-11-01. Agreement test: src/screens/__tests__/pay_frequency_one_table_2026_11_01.test.tsx.
 */

/** Pay periods a year. Hourly is 40 hours × 52 — the table's own; an hourly wage is worked on the hours a week the person entered,
 *  and with none entered it is no figure (DEC-0296, the row of 2026-10-26). */
/* ─ MK-CF-F-311 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * PAY_FREQUENCIES
 *
 * Answers ..... The one pay-frequency table: pay periods a year for each way a wage is paid — hourly 2,080 (40 hours × 52), weekly 52, every two weeks 26, monthly 12, annually 1 (R23).
 *
 * Called by ... MK-CF-F-308 payPeriodsAYear · MK-CF-F-307 isPayFrequency
 *
 * Numbered by hand 2026-11-01 (PF-TOOLS, the lead's instruction): the scan that issues identifiers reads functions, not
 *               constants, so this one has no generated record; this one is written by hand in the generated form,
 *               as MK-NW-F-145's is
 * Changed ..... not in git yet (—)
 */
export const PAY_FREQUENCIES = { hourly: 2080, weekly: 52, biweekly: 26, monthly: 12, annually: 1 } as const;

/** The five ways a wage can be paid. */
export type PayFrequency = keyof typeof PAY_FREQUENCIES;

/** The refusal, in words, wherever a wage's frequency is not one of the five. */
/* ─ MK-CF-F-312 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * PAY_FREQUENCY_NOT_RECOGNISED
 *
 * Answers ..... The refusal in words wherever a wage's frequency is not one of the five: never a month, always this sentence and the door to Base pay; words only, it calculates nothing.
 *
 * Called by ... MK-CF-F-297 freqNotRecognised
 *
 * Numbered by hand 2026-11-01 (PF-TOOLS, the lead's instruction): the scan that issues identifiers reads functions, not
 *               constants, so this one has no generated record; this one is written by hand in the generated form,
 *               as MK-NW-F-145's is
 * Changed ..... not in git yet (—)
 */
export const PAY_FREQUENCY_NOT_RECOGNISED = 'Pay frequency not recognised — open Base pay to choose one.';

/** The frequency as the screens read it: nothing saved is Monthly (what Your base pay shows chosen); anything else is itself. */
/* ─ MK-CF-F-306 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * payFrequencyOf
 *
 * Answers ..... The frequency as the screens read it: nothing saved is Monthly (what Your base pay shows chosen); anything else is itself.
 *
 * Formula .....
 *     'monthly'   if freq = nothing (or string(freq).trim() = '' when missing or zero)
 *     string(freq)   otherwise
 *
 * Called by ... MK-CF-F-307 isPayFrequency · MK-CF-F-308 payPeriodsAYear
 *               MK-CF-F-313 wageRefusalOf · MK-CF-O-016 incomeSources
 *
 * Reaches ..... 488 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 470 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-306
 * Changed ..... not in git yet (—)
 */
export const payFrequencyOf = (freq: unknown): string => (freq == null || String(freq).trim() === '' ? 'monthly' : String(freq));

/** Whether a frequency is one of the five. */
/* ─ MK-CF-F-307 ──────────────────────────────────────────────────────────────────── 1 · ACTION
 * isPayFrequency
 *
 * Answers ..... Whether a frequency is one of the five.
 *
 * Formula .....
 *     NOT READ YET — the body is not a shape this can render faithfully, so nothing is claimed rather than something being guessed. It needs reading by hand.
 *
 * Called by ... MK-CF-F-308 payPeriodsAYear · MK-CF-F-313 wageRefusalOf
 *               MK-CF-O-016 incomeSources
 *
 * Reaches ..... 488 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 470 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-307
 * Changed ..... not in git yet (—)
 */
export const isPayFrequency = (freq: unknown): freq is PayFrequency =>
  Object.prototype.hasOwnProperty.call(PAY_FREQUENCIES, payFrequencyOf(freq));

/** What it is for: pay periods a year for a frequency — null for one the table does not hold, so no figure is made from it. */
/* ─ MK-CF-F-308 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * payPeriodsAYear
 *
 * Answers ..... What it is for: pay periods a year for a frequency — null for one the table does not hold, so no figure is made from it.
 *
 * Formula .....
 *     f = pay frequency of(freq)
 *     the answer:
 *     PAY_FREQUENCIES[f]   if is pay frequency(f)
 *     nothing   otherwise
 *
 * Called by ... MK-CF-F-059 annualizedEnteredSalary · MK-CF-F-130 enteredMonthlyRaw
 *               MK-CF-F-140 periodsAYear · MK-CF-F-309 periodsOf
 *
 * Reaches ..... 488 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 470 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-308
 * Changed ..... not in git yet (—)
 */
export function payPeriodsAYear(freq: unknown): number | null {
  const f = payFrequencyOf(freq);
  return isPayFrequency(f) ? PAY_FREQUENCIES[f] : null;
}

/** What it is for: WHY A WAGE ENTERED CANNOT BE READ (R23a, 2026-11-01) — the sentence, or null. A wage (yours, or your spouse's)
 *  with a frequency outside the table, or hourly with no hours a week, is entered and gives no figure: every figure that rests on it
 *  (take-home, bracket, tax) refuses with this. The same rules as MK-CF-O-001 basePay's freqNotRecognised and hoursNotEntered,
 *  for readers that do not go through Base pay (the Tax organizer); the agreement test holds the two together. */
/* ─ MK-CF-F-313 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * wageRefusalOf
 *
 * Answers ..... What it is for: WHY A WAGE ENTERED CANNOT BE READ (R23a, 2026-11-01) — the sentence, or null.
 *
 * Formula .....
 *     a = op (or none when missing)
 *     wages = [who earns = 'partner' ? nothing : a, who earns = 'both' or who earns = 'partner' ? spouse wage : nothing] where boolean
 *     typed = (w: any) => number(string(base salary ?? '').replace( ÷ [^0 − 9.] ÷ g, '')) > 0
 *     PAY_FREQUENCY_NOT_RECOGNISED   when wages.some((w: any) => typed(w) and !is pay frequency(salary freq))
 *     the answer = 'hours a week not entered — your hourly pay is not counted until it is.'
 *
 * Called by ... MK-CF-F-314 setupEntered · MK-PL-F-031 taxOrganizer
 *
 * Reaches ..... 488 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-075 ACC · MK-NW-F-077 ALL
 *               MK-NW-F-076 ALT · MK-NW-F-088 BENCH
 *               MK-NW-F-087 CAT · MK-NW-F-086 CATS
 *               MK-CF-F-205 COMING · MK-NW-F-167 COMPARE
 *               MK-CF-F-211 DEBTS · MK-NW-F-079 EF
 *               MK-NW-F-080 HOLD · MK-CF-F-201 INCOME
 *               MK-CF-F-237 LATER · MK-NW-F-097 LEDGER
 *               MK-NW-F-098 LEDGER_BAND · MK-NW-F-140 LEFT_OUT
 *               MK-CF-F-200 LINE · MK-CF-F-296 LOAD
 *               … and 470 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-039 how often each income arrives
 *               MK-XS-I-075 hours a week, for a wage paid by the hour
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-313
 * Changed ..... not in git yet (—)
 */
export function wageRefusalOf(op: Record<string, any> | null | undefined): string | null {
  const a: any = op ?? {};
  const wages = [a.whoEarns === 'partner' ? null : a, a.whoEarns === 'both' || a.whoEarns === 'partner' ? a.partnerWage : null].filter(Boolean);
  const typed = (w: any) => Number(String(w?.baseSalary ?? '').replace(/[^0-9.]/g, '')) > 0;
  if (wages.some((w: any) => typed(w) && !isPayFrequency(w.salaryFreq))) return PAY_FREQUENCY_NOT_RECOGNISED;
  if (wages.some((w: any) => typed(w) && payFrequencyOf(w.salaryFreq) === 'hourly' && String(w.hoursPerWeek ?? '').trim() === ''))
    return 'Hours a week not entered — your hourly pay is not counted until it is.';
  return null;
}
