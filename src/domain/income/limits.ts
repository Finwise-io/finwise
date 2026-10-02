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

/** THE AGE THE LIMITS USE — the age a person attains at any time in the calendar year, which is
 *  this year minus the birth year. That is the IRS test for every catch-up (IRC §414(v)(1): "attains
 *  age 50 before the close of the taxable year"; the 60–63 super catch-up likewise; HSA 55+ under
 *  IRC §223(b)(3)). Someone turning 60 in November is 60 for the whole year's limit. G1 (founder
 *  agreed 2026-09-12): one convention for limits, stated here; never the birthday-aware age. No birth
 *  year → nothing, and the limit functions then give the base limit with no catch-up. */
/* ─ MK-CF-F-197 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * ageAttainedInYear
 *
 * Answers ..... THE AGE THE LIMITS USE — the age a person attains at any time in the calendar year, which is this year minus the birth year.
 *
 * Formula .....
 *     y = birth year read as a number
 *     nothing   when y is missing (or !number.is finite(y) (or y < 1900 when missing or zero) when missing or zero)
 *     the answer = now.get full year() − y
 *
 * Called by ... MK-CF-O-005 theContributionRoom · MK-PL-F-067 willItLastInputs
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-199 ROOM · MK-CF-O-017 futurePaycheck
 *               MK-PL-F-068 selectWillItLast · MK-CF-O-005 theContributionRoom
 *               MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-017 birth year
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · The IRS convention for limits: a person attains an age at any point in the calendar year, so this year − birth year — not the birthday-aware age used for display (G1 / G9).
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-197
 * Changed ..... not in git yet (—)
 */
export function ageAttainedInYear(birthYear: number | null | undefined, now: Date = new Date()): number | null {
  const y = Number(birthYear);
  if (!y || !Number.isFinite(y) || y < 1900) return null;
  return now.getFullYear() - y;
}

/** Months left in the year INCLUDING the current one — December counts as 1, never 0. G36 (founder,
 *  2026-09-12): the convention is stated here once; the Contribution-room screen used to divide on
 *  the screen itself. */
/* ─ MK-CF-F-195 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * monthsLeftInYear
 *
 * Answers ..... Months left in the year INCLUDING the current one — December counts as 1, never 0.
 *
 * Formula .....
 *     max(1, 12 − now.get month())
 *
 * Called by ... MK-CF-F-196 perMonthToFill · MK-CF-O-005 theContributionRoom
 *
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-199 ROOM · MK-CF-F-196 perMonthToFill
 *               MK-CF-O-005 theContributionRoom
 *
 * Serves ...... MK-MN-M-003 · MK-MN-M-004 · MK-MN-M-005 · MK-MN-M-029
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · The current month counts as remaining, so December divides by 1 (G36, founder 2026-09-12).
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-195
 * Changed ..... not in git yet (—)
 */
export function monthsLeftInYear(now: Date = new Date()): number {
  return Math.max(1, 12 - now.getMonth());
}

/** What to put in each remaining month to use the room left this year, rounded to $100 for display. */
/* ─ MK-CF-F-196 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * perMonthToFill
 *
 * Answers ..... What to put in each remaining month to use the room left this year, rounded to $100 for display.
 *
 * Formula .....
 *     round(room left ÷ months left in year(now) ÷ 100) × 100
 *
 * Called by ... MK-CF-O-005 theContributionRoom
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-199 ROOM · MK-CF-O-005 theContributionRoom
 *
 * Serves ...... MK-MN-M-003 · MK-MN-M-004 · MK-MN-M-005 · MK-MN-M-029
 *
 * Decides .....
 *     · Uses today's date from the device clock, so the answer changes by itself overnight.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-196
 * Changed ..... not in git yet (—)
 */
export function perMonthToFill(roomLeft: number, now: Date = new Date()): number {
  return Math.round(roomLeft / monthsLeftInYear(now) / 100) * 100;
}

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
 * Reaches ..... 3 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-199 ROOM · MK-CF-F-056 k401Headroom
 *               MK-CF-O-005 theContributionRoom
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Decides .....
 *     · Age = the age attained at any time in the calendar year (this year − birth year), the IRS test for the 50+ catch-up and the 60–63 super catch-up (IRC §414(v)) — never the birthday-aware age (G1). No age → the base limit, no catch-up.
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
 * Called by ... MK-CF-O-005 theContributionRoom
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-199 ROOM · MK-CF-O-005 theContributionRoom
 *
 * Serves ...... MK-MN-M-003 · MK-MN-M-004
 *
 * Decides .....
 *     · Age = the age attained at any time in the calendar year (this year − birth year), the IRS test for the 50+ catch-up (IRC §219(b)(5)(B)) — never the birthday-aware age (G1).
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-054
 * Changed ..... 2026-06-05 (7f0d417)
 */
export function annualIraLimit(age: number | null): number {
  return IRS_LIMITS.ira + (age != null && age >= 50 ? IRS_LIMITS.ira_catch_up_50 : 0);
}
/** How much can this person put into a health savings account this year? (Enrolled in Medicare → nothing; founder ruling 2026-09-08, G10.) */
/* ─ MK-CF-F-055 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * annualHsaLimit
 *
 * Answers ..... How much can this person put into a health savings account this year?
 *
 * Formula .....
 *     0   when enrolled in Medicare (no contribution is allowed)
 *     (family ? family limit : self-only limit) + (age ≥ 55 ? the 55+ catch-up : 0)   otherwise
 *
 * Called by ... MK-CF-O-005 theContributionRoom
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-199 ROOM · MK-CF-O-005 theContributionRoom
 *
 * Serves ...... MK-MN-M-003 · MK-MN-M-004
 * Reads ....... MK-XS-I-062 enrolled in Medicare (yes / no)
 *
 * Decides .....
 *     · Enrolled in Medicare → 0 (IRS Publication 969: no HSA contribution while enrolled). Not enrolled, or not answered → the limit, and at 65+ the screen says "if you are not enrolled in Medicare" and asks — founder ruling 2026-09-08 (second verification G10).
 *     · Self-only limit unless told it is a family plan.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-055
 * Changed ..... 2026-06-05 (7f0d417)
 */
export function annualHsaLimit(age: number | null, family = false, medicareEnrolled: boolean | null = null): number {
  if (medicareEnrolled === true) return 0;
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
 *     remaining = max(0, limit − used)
 *     catch up = age ≠ nothing and age ≥ 50
 *
 * Called by ... MK-CF-O-005 theContributionRoom
 *
 * Reaches ..... 2 functions. Change the arithmetic above and these change with it:
 *               MK-CF-F-199 ROOM · MK-CF-O-005 theContributionRoom
 *
 * Serves ...... MK-MN-M-003 · MK-MN-M-004
 *
 * Decides .....
 *     · Never lets annual401k contribution fall below 0.
 *
 * Formula also on the master file · functions_from_code · MK-CF-F-056
 * Changed ..... 2026-06-05 (7f0d417)
 */
export function k401Headroom(age: number | null, annual401kContribution: number): Headroom {
  const limit = annual401kLimit(age);
  const used = Math.max(0, annual401kContribution);
  return { limit, used: Math.min(used, limit), remaining: Math.max(0, limit - used), catchUp: age != null && age >= 50 };
}

/** Roth vs Traditional lean from current vs expected-retirement marginal rate (decimals). */
/* ─ MK-CF-F-057 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rothVsTraditional
 *
 * Answers ..... Roth vs Traditional lean from current vs expected-retirement marginal rate (decimals).
 *
 * Formula .....
 *     lean = 'roth'            when marginal now ≤ 12%     why = "You're in a low bracket now — pay the tax now (Roth) and withdraw tax-free later."
 *     lean = 'traditional'     when marginal now ≥ 24% and marginal retire < marginal now     why = "High bracket now, likely lower in retirement — deduct now (Traditional), pay tax later."
 *     lean = 'either'          otherwise     why = "Your brackets are similar — splitting Roth and Traditional hedges your future tax rate."
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
