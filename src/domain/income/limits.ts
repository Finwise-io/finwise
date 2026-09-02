// IRS retirement contribution limits (public domain — published annually by the IRS).
// 2026 employee 401(k) elective-deferral limit = $24,500; age-50+ catch-up = +$8,000.
// Update yearly (or wire to a live source later); kept as data so the UI can compare against it.
export const IRS_LIMITS = {
  year: 2026,
  elective_deferral_401k: 24_500,   // under age 50
  catch_up_50: 8_000,               // additional 401(k), age 50+
  ira: 7_500,                       // Traditional + Roth IRA combined, under 50 — WAS 7,000, the
                                    // 2025 figure; checked against the IRS 2026 release on 2026-09-01
  ira_catch_up_50: 1_100,           // additional IRA, age 50+ — was 1,000, likewise the 2025 figure
  super_catch_up_60_63: 11_250,     // SECURE 2.0: ages 60–63 get this INSTEAD of the 8,000 — the
                                    // heart of this app's 55–70 audience, and it was missing entirely
  hsa_self: 4_400, hsa_family: 8_750, // HSA (single / family), 2026
  hsa_catch_up_55: 1_000,           // additional HSA, age 55+
} as const;

/** Annual employee 401(k) limit for the user's age (adds the 50+ catch-up). */
/* ─ MK-CF-F-053 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * annual401kLimit
 *
 * Answers ..... Annual employee 401(k) limit for the user's age (adds the 50+ catch-up).
 *
 * Formula .....
 *     IRS_LIMITS.elective deferral 401k + IRS_LIMITS.super catch up 6063   when age ≠ nothing and age ≥ 60 and age ≤ 63
 *     IRS_LIMITS.elective deferral 401k + (age ≠ nothing and age ≥ 50 ? IRS_LIMITS.catch up 50 : 0)
 *
 * Called by ... MK-CF-F-056 k401Headroom
 *
 * Reaches ..... 1 function. Change the arithmetic above and these change with it:
 *               MK-CF-F-056 k401Headroom
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-053
 * Changed ..... 2026-06-05 (7f0d417)
 */
export function annual401kLimit(age: number | null): number {
  // SECURE 2.0: at 60 through 63 the catch-up is 11,250, not 8,000 — it drops BACK at 64. Found
  // 2026-09-01 checking every statutory constant against its source: the rule was absent, in an app
  // built for people aged 55 to 70.
  if (age != null && age >= 60 && age <= 63) return IRS_LIMITS.elective_deferral_401k + IRS_LIMITS.super_catch_up_60_63;
  return IRS_LIMITS.elective_deferral_401k + (age != null && age >= 50 ? IRS_LIMITS.catch_up_50 : 0);
}
/* ─ MK-CF-F-054 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * annualIraLimit
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     IRS_LIMITS.ira + (age ≠ nothing and age ≥ 50 ? IRS_LIMITS.ira catch up 50 : 0)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-054
 * Changed ..... 2026-06-05 (7f0d417)
 */
export function annualIraLimit(age: number | null): number {
  return IRS_LIMITS.ira + (age != null && age >= 50 ? IRS_LIMITS.ira_catch_up_50 : 0);
}
/* ─ MK-CF-F-055 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * annualHsaLimit
 *
 * Answers ..... NOT DETERMINED — the code carries no note saying what this is for, and it has no row in the old inventory. Needs reading.
 *
 * Formula .....
 *     (family ? IRS_LIMITS.hsa family : IRS_LIMITS.hsa self) + (age ≠ nothing and age ≥ 55 ? IRS_LIMITS.hsa catch up 55 : 0)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-055
 * Changed ..... 2026-06-05 (7f0d417)
 */
export function annualHsaLimit(age: number | null, family = false): number {
  return (family ? IRS_LIMITS.hsa_family : IRS_LIMITS.hsa_self) + (age != null && age >= 55 ? IRS_LIMITS.hsa_catch_up_55 : 0);
}

export interface Headroom { limit: number; used: number; remaining: number; catchUp: boolean; }
/** How much more you can still put into your 401(k) this year (incl. 50+ catch-up). */
/* ─ MK-CF-F-056 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * k401Headroom
 *
 * Answers ..... How much more you can still put into your 401(k) this year (incl.
 *
 * Formula .....
 *     limit = annual401k limit(age)
 *     used = max(0, annual401k contribution)
 *     the answer:
 *     limit = limit
 *     used = min(used, limit)
 *     remaining = max(0, round(limit − used))
 *     catch up = age ≠ nothing and age ≥ 50
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-056
 * Changed ..... 2026-06-05 (7f0d417)
 */
export function k401Headroom(age: number | null, annual401kContribution: number): Headroom {
  const limit = annual401kLimit(age);
  const used = Math.max(0, annual401kContribution);
  return { limit, used: Math.min(used, limit), remaining: Math.max(0, Math.round(limit - used)), catchUp: age != null && age >= 50 };
}

/** Roth vs Traditional lean from current vs expected-retirement marginal rate (decimals). */
/* ─ MK-CF-F-057 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rothVsTraditional
 *
 * Answers ..... Roth vs Traditional lean from current vs expected-retirement marginal rate (decimals).
 *
 * Formula .....
 *     lean = 'roth'
 *     why = "You're in a low bracket now — pay the tax now (roth) and withdraw tax − free later."   when marginal now ≤ 0.12
 *     lean = 'traditional'
 *     why = 'high bracket now, likely lower in retirement — deduct now (traditional), pay tax later.'   when marginal now ≥ 0.24 and marginal retire < marginal now
 *     lean = 'either'
 *     why = 'your brackets are similar — splitting roth and traditional hedges your future tax rate.'
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-057
 * Changed ..... 2026-06-05 (7f0d417)
 */
export function rothVsTraditional(marginalNow: number, marginalRetire: number): { lean: 'roth' | 'traditional' | 'either'; why: string } {
  if (marginalNow <= 0.12) return { lean: 'roth', why: "You're in a low bracket now — pay the tax now (Roth) and withdraw tax-free later." };
  if (marginalNow >= 0.24 && marginalRetire < marginalNow) return { lean: 'traditional', why: 'High bracket now, likely lower in retirement — deduct now (Traditional), pay tax later.' };
  return { lean: 'either', why: 'Your brackets are similar — splitting Roth and Traditional hedges your future tax rate.' };
}

/** Are you in the low-income "Roth conversion window" (retired, before RMDs/SS push income up)? */
/* ─ MK-CF-F-058 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rothConversionWindow
 *
 * Answers ..... Are you in the low-income "Roth conversion window" (retired, before RMDs/SS push income up)?
 *
 * Formula .....
 *     age ≥ retire age and age < min(rmd age, claim age (or rmd age when missing or zero))
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-018 retirement age
 *               MK-XS-I-021 Social Security claim age
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-058
 * Changed ..... 2026-06-05 (7f0d417)
 */
export function rothConversionWindow(age: number, retireAge: number, claimAge: number, rmdAge = 73): boolean {
  return age >= retireAge && age < Math.min(rmdAge, claimAge || rmdAge);
}
