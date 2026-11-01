/** THE ONE RETIREMENT AGE (the lead's ruling R10, 2026-10-31; NW3-01; tenet 2, DEC-3523). The age the plan retires a person at, and
 *  whether it is the app's own assumption. Net worth's plan line read 67 when nothing was entered while the plan retired the person
 *  at 65, so the line named an age the odds and the pot beside it were never worked at. Every caller reads it here: the plan's
 *  inputs (willItLastInputs), the Retirement cockpit, Net worth's plan line, the Plan tab, What-if, the future paycheck, sign-up's step.
 *  Order: the age set on the Plan → the age typed in sign-up → retired already: today's age → otherwise 65, ours (the Plan's glance
 *  rows tag it 'ours'; the app's glossary: 'If you have not said, we retire you at 65'). */
/* ─ MK-PL-F-103 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * RETIRE_AGE_ASSUMED
 *
 * Answers ..... The age the plan retires a person at when no age is set on the Plan or typed in sign-up and they are not retired yet: 65, the app's own assumption, tagged 'ours' wherever it shows.
 *
 * Called by ... MK-PL-F-102 planRetireAgeOf
 *
 * Numbered by hand 2026-11-01 (PF-TOOLS, the lead's instruction): the scan that issues identifiers reads functions, not
 *               constants, so this one has no generated record; this one is written by hand in the generated form,
 *               as MK-NW-F-145's is
 * Changed ..... not in git yet (—)
 */
export const RETIRE_AGE_ASSUMED = 65;
/** The one retirement age and whether it is the app's own: the age set on the Plan, else the age typed in sign-up, else today's age for someone retired, else RETIRE_AGE_ASSUMED. */
/* ─ MK-PL-F-102 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * planRetireAgeOf
 *
 * Answers ..... The one retirement age and whether it is the app's own: the age set on the Plan, else the age typed in sign-up, else today's age for someone retired, else RETIRE_AGE_ASSUMED.
 *
 * Formula .....
 *     set = assumptions.retire age
 *     age = set read as a number
 *     ours = false   when set ≠ nothing and number.is finite(number(set)) and number(set) > 0
 *     typed = parse float(string(op.target retirement age ?? '').replace( ÷ [^0 − 9.] ÷ g, '')) (or 0 when missing or zero)
 *     age = typed
 *     ours = false   when typed > 0
 *     age = age
 *     ours = false   when retired now and age ≠ nothing
 *     the answer:
 *     age = RETIRE_AGE_ASSUMED
 *     ours = true
 *
 * Called by ... MK-CF-O-017 futurePaycheck · MK-PL-F-067 willItLastInputs
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-CF-O-017 futurePaycheck · MK-PL-F-068 selectWillItLast
 *               MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-018 retirement age
 *               MK-XS-I-044 the person’s own plan overrides
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-102
 * Changed ..... not in git yet (—)
 */
export function planRetireAgeOf(a: { assumptions?: { retireAge?: number | null } | null; op?: Record<string, any> | null; retiredNow?: boolean; age?: number | null }):
  { age: number; ours: boolean } {
  const set = a.assumptions?.retireAge;
  if (set != null && Number.isFinite(Number(set)) && Number(set) > 0) return { age: Number(set), ours: false };
  const typed = parseFloat(String(a.op?.targetRetirementAge ?? '').replace(/[^0-9.]/g, '')) || 0;
  if (typed > 0) return { age: typed, ours: false };
  if (a.retiredNow && a.age != null) return { age: a.age, ours: false };
  return { age: RETIRE_AGE_ASSUMED, ours: true };
}
