// Pure profile calculations — no I/O, fully unit-testable.
import { Profile, ProfileReadModel, DEFAULT_PLAN_TO_AGE } from './types';

/** Age in whole years from birth month/year, as of `asOf` (defaults to now). */
/* ─ MK-XS-F-017 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * currentAge
 *
 * Answers ..... Age in whole years from birth month/year, as of `asOf` (defaults to now).
 *
 * Formula .....
 *     nothing   when birth year is missing (or birth month is missing when missing or zero)
 *     age = as of.get full year() − birth year
 *     month idx = birth month − 1
 *     the answer:
 *     age   if age ≥ 0
 *     nothing   otherwise
 *
 * Called by ... MK-XS-F-020 toReadModel · MK-XS-F-179 ageToday
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-179 ageToday · MK-XS-F-031 buildSnapshot
 *               MK-XS-F-023 getProfileReadModel · MK-PL-F-068 selectWillItLast
 *               MK-XS-F-032 snapshotFromOnboarding · MK-XS-F-020 toReadModel
 *               MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-017 birth year
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-017
 * Changed ..... 2026-06-05 (f742136)
 */
export function currentAge(
  birthYear: number | null,
  birthMonth: number | null,
  asOf: Date = new Date(),
): number | null {
  if (!birthYear || !birthMonth) return null;
  let age = asOf.getFullYear() - birthYear;
  const monthIdx = birthMonth - 1;                     // 1–12 → 0–11
  if (asOf.getMonth() < monthIdx) age -= 1;            // birthday not reached this year
  return age >= 0 ? age : null;
}

/** THE AGE A SCREEN SHOWS AND THE PLAN RUNS ON — G9 (founder, 2026-09-12: "ask for it"): the
 *  birthday-aware age when the birth month is known (the onboarding asks for it), otherwise the age
 *  attained in the calendar year (this year − birth year), and NOTHING when the birth year is unknown —
 *  never a stand-in month, never a stand-in age. Contribution limits use ageAttainedInYear instead
 *  (G1): the law counts the age reached at any time in the year. */
/* ─ MK-XS-F-179 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * ageToday
 *
 * Answers ..... THE AGE A SCREEN SHOWS AND THE PLAN RUNS ON — G9 (founder, 2026-09-12: "ask for it"): the birthday-aware age when the birth month is known (the onboarding asks for it), otherwise the age attained in the calendar year (this year − birth year), and NOTHING when the birth year is unknown — never a stand-in month, never a stand-in age.
 *
 * Formula .....
 *     y = number(birth year); if (!y or !number.is finite(y)) return nothing
 *     m = birth month read as a number
 *     current age(y, m, as of)   when m ≥ 1 and m ≤ 12
 *     the answer = as of.get full year() − y
 *
 * Called by ... MK-PL-F-067 willItLastInputs
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-PL-F-068 selectWillItLast · MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-017 birth year
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · G9 (founder, 2026-09-12): birthday-aware when the birth month is known (the onboarding asks for it), the year-attained age when only the year is known, nothing when the birth year is unknown — never a stand-in month or age. Limits use the year-attained age instead (G1).
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-179
 * Changed ..... not in git yet (—)
 */
export function ageToday(birthYear: number | null | undefined, birthMonth: number | null | undefined, asOf: Date = new Date()): number | null {
  const y = Number(birthYear); if (!y || !Number.isFinite(y)) return null;
  const m = Number(birthMonth);
  if (m >= 1 && m <= 12) return currentAge(y, m, asOf);
  return asOf.getFullYear() - y;
}

/** Years until the target retirement age (never negative). */
/* ─ MK-XS-F-018 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * yearsToRetirement
 *
 * Answers ..... Years until the target retirement age (never negative).
 *
 * Formula .....
 *     nothing   when age = nothing (or target retirement age is missing when missing or zero)
 *     max(0, target retirement age − age)
 *
 * Called by ... MK-XS-F-020 toReadModel
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-031 buildSnapshot · MK-XS-F-023 getProfileReadModel
 *               MK-XS-F-032 snapshotFromOnboarding · MK-XS-F-020 toReadModel
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-018 retirement age
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-018
 * Changed ..... 2026-06-05 (f742136)
 */
export function yearsToRetirement(age: number | null, targetRetirementAge: number | null): number | null {
  if (age == null || !targetRetirementAge) return null;
  return Math.max(0, targetRetirementAge - age);
}

/** Years the money must last: retirement → plan-to age (default horizon if unset). */
/* ─ MK-XS-F-019 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * retirementHorizonYears
 *
 * Answers ..... Years the money must last: retirement → plan-to age (default horizon if unset).
 *
 * Formula .....
 *     nothing   when target retirement age is missing
 *     horizon = (plan to age ?? DEFAULT_PLAN_TO_AGE) − target retirement age
 *     the answer:
 *     horizon   if horizon > 0
 *     nothing   otherwise
 *
 * Called by ... MK-XS-F-020 toReadModel
 *
 * Reaches ..... 4 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-031 buildSnapshot · MK-XS-F-023 getProfileReadModel
 *               MK-XS-F-032 snapshotFromOnboarding · MK-XS-F-020 toReadModel
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-018 retirement age
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-019
 * Changed ..... 2026-06-05 (f742136)
 */
export function retirementHorizonYears(targetRetirementAge: number | null, planToAge: number | null): number | null {
  if (!targetRetirementAge) return null;
  const horizon = (planToAge ?? DEFAULT_PLAN_TO_AGE) - targetRetirementAge;
  return horizon > 0 ? horizon : null;
}

/** Build the public read-model (profile + derived planning values). */
/* ─ MK-XS-F-020 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * toReadModel
 *
 * Answers ..... Build the public read-model (profile + derived planning values).
 *
 * Formula .....
 *     age = current age(birth year, birth month, as of)
 *
 * Called by ... MK-XS-F-023 getProfileReadModel · MK-XS-F-031 buildSnapshot
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-XS-F-031 buildSnapshot · MK-XS-F-023 getProfileReadModel
 *               MK-XS-F-032 snapshotFromOnboarding
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-017 birth year
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *
 * Formula also on the master file · functions_from_code · MK-XS-F-020
 * Changed ..... 2026-06-05 (f742136)
 */
export function toReadModel(p: Profile, asOf: Date = new Date()): ProfileReadModel {
  const age = currentAge(p.birth_year, p.birth_month, asOf);
  return {
    ...p,
    current_age: age,
    years_to_retirement: yearsToRetirement(age, p.target_retirement_age),
    retirement_horizon_years: retirementHorizonYears(p.target_retirement_age, p.plan_to_age),
  };
}
