import { ageToday } from '../domain/profile/calc';
// Life-stage persona — drives which surfaces the home foregrounds.
export type Persona = 'building' | 'preretiree' | 'retired';

/** THE AGE EVERY RULE AND PROJECTION RUNS ON — the age attained in the calendar year (this year −
 *  birth year). G9 (founder, 2026-09-12): one convention per purpose. The law counts the year you
 *  attain an age (limits, the withdrawal start), and the plan steps calendar years, so both use this.
 *  What a person READS about themselves, and Social Security timing (months matter), use
 *  ageTodayFromProfile below. Nothing when the birth year is unknown. */
export function ageFromProfile(op: Record<string, any> | null): number | null {
  const by = op?.birthYear ? parseInt(String(op.birthYear).replace(/[^0-9]/g, ''), 10) : NaN;
  return Number.isFinite(by) && by > 1900 ? new Date().getFullYear() - by : null;
}

/** THE AGE A PERSON IS TODAY — birthday-aware when the birth month is known (the onboarding asks for
 *  it), the year-attained age when only the year is known, nothing without a year. Never a stand-in. */
export function ageTodayFromProfile(op: Record<string, any> | null): number | null {
  const by = op?.birthYear ? parseInt(String(op.birthYear).replace(/[^0-9]/g, ''), 10) : NaN;
  const bm = op?.birthMonth ? parseInt(String(op.birthMonth).replace(/[^0-9]/g, ''), 10) : NaN;
  return ageToday(Number.isFinite(by) ? by : null, Number.isFinite(bm) ? bm : null);
}

export function personaOf(opts: { age: number | null; employmentStatus?: string | null; targetRetireAge?: number | null }): Persona {
  const { age, employmentStatus } = opts;
  if (employmentStatus === 'retired' || (age != null && age >= (opts.targetRetireAge ?? 65))) return 'retired';
  if (age != null && age >= 50) return 'preretiree';
  return 'building';
}
