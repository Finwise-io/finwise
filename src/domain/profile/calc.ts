// Pure profile calculations — no I/O, fully unit-testable.
import { Profile, ProfileReadModel, DEFAULT_PLAN_TO_AGE } from './types';

/** Age in whole years from birth month/year, as of `asOf` (defaults to now). */
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

/** Years until the target retirement age (never negative). */
export function yearsToRetirement(age: number | null, targetRetirementAge: number | null): number | null {
  if (age == null || !targetRetirementAge) return null;
  return Math.max(0, targetRetirementAge - age);
}

/** Years the money must last: retirement → plan-to age (default horizon if unset). */
export function retirementHorizonYears(targetRetirementAge: number | null, planToAge: number | null): number | null {
  if (!targetRetirementAge) return null;
  const horizon = (planToAge ?? DEFAULT_PLAN_TO_AGE) - targetRetirementAge;
  return horizon > 0 ? horizon : null;
}

/** Build the public read-model (profile + derived planning values). */
export function toReadModel(p: Profile, asOf: Date = new Date()): ProfileReadModel {
  const age = currentAge(p.birth_year, p.birth_month, asOf);
  return {
    ...p,
    current_age: age,
    years_to_retirement: yearsToRetirement(age, p.target_retirement_age),
    retirement_horizon_years: retirementHorizonYears(p.target_retirement_age, p.plan_to_age),
  };
}
