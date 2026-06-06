// IRS retirement contribution limits (public domain — published annually by the IRS).
// 2026 employee 401(k) elective-deferral limit = $24,500; age-50+ catch-up = +$8,000.
// Update yearly (or wire to a live source later); kept as data so the UI can compare against it.
export const IRS_LIMITS = {
  year: 2026,
  elective_deferral_401k: 24_500,   // under age 50
  catch_up_50: 8_000,               // additional 401(k), age 50+
  ira: 7_000,                       // Traditional + Roth IRA combined, under 50
  ira_catch_up_50: 1_000,           // additional IRA, age 50+
  hsa_self: 4_400, hsa_family: 8_750, // HSA (single / family), 2026
  hsa_catch_up_55: 1_000,           // additional HSA, age 55+
} as const;

/** Annual employee 401(k) limit for the user's age (adds the 50+ catch-up). */
export function annual401kLimit(age: number | null): number {
  return IRS_LIMITS.elective_deferral_401k + (age != null && age >= 50 ? IRS_LIMITS.catch_up_50 : 0);
}
export function annualIraLimit(age: number | null): number {
  return IRS_LIMITS.ira + (age != null && age >= 50 ? IRS_LIMITS.ira_catch_up_50 : 0);
}
export function annualHsaLimit(age: number | null, family = false): number {
  return (family ? IRS_LIMITS.hsa_family : IRS_LIMITS.hsa_self) + (age != null && age >= 55 ? IRS_LIMITS.hsa_catch_up_55 : 0);
}

export interface Headroom { limit: number; used: number; remaining: number; catchUp: boolean; }
/** How much more you can still put into your 401(k) this year (incl. 50+ catch-up). */
export function k401Headroom(age: number | null, annual401kContribution: number): Headroom {
  const limit = annual401kLimit(age);
  const used = Math.max(0, annual401kContribution);
  return { limit, used: Math.min(used, limit), remaining: Math.max(0, Math.round(limit - used)), catchUp: age != null && age >= 50 };
}

/** Roth vs Traditional lean from current vs expected-retirement marginal rate (decimals). */
export function rothVsTraditional(marginalNow: number, marginalRetire: number): { lean: 'roth' | 'traditional' | 'either'; why: string } {
  if (marginalNow <= 0.12) return { lean: 'roth', why: "You're in a low bracket now — pay the tax now (Roth) and withdraw tax-free later." };
  if (marginalNow >= 0.24 && marginalRetire < marginalNow) return { lean: 'traditional', why: 'High bracket now, likely lower in retirement — deduct now (Traditional), pay tax later.' };
  return { lean: 'either', why: 'Your brackets are similar — splitting Roth and Traditional hedges your future tax rate.' };
}

/** Are you in the low-income "Roth conversion window" (retired, before RMDs/SS push income up)? */
export function rothConversionWindow(age: number, retireAge: number, claimAge: number, rmdAge = 73): boolean {
  return age >= retireAge && age < Math.min(rmdAge, claimAge || rmdAge);
}
