// IRS retirement contribution limits (public domain — published annually by the IRS).
// 2026 employee 401(k) elective-deferral limit = $24,500; age-50+ catch-up = +$8,000.
// Update yearly (or wire to a live source later); kept as data so the UI can compare against it.
export const IRS_LIMITS = {
  year: 2026,
  elective_deferral_401k: 24_500,   // under age 50
  catch_up_50: 8_000,               // additional, age 50+
} as const;

/** Annual employee 401(k) limit for the user's age (adds the 50+ catch-up). */
export function annual401kLimit(age: number | null): number {
  const base = IRS_LIMITS.elective_deferral_401k;
  return age != null && age >= 50 ? base + IRS_LIMITS.catch_up_50 : base;
}
