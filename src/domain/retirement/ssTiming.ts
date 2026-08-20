// F8 — Social Security claim-timing math (FCC detailed design v1.1, Plan sheet).
// The standard Social Security Administration schedule applied to YOUR statement amount — the
// monthly benefit at YOUR full retirement age: claiming early reduces the check 5/9 of 1% per
// month for the first 36 months and 5/12 of 1% per month beyond, waiting adds 2/3 of 1% per month
// (8%/yr) to 70 — the same schedule as ssa.gov. Pure math, today's dollars, no opinion.
//
// B2 (founder brief 2026-08-20): the factor used to be anchored at a hard-coded 67. People born
// 1955–1959 have full retirement ages between 66y2m and 66y10m — roughly the OLDEST THIRD of a
// 55–70 audience, the ones closest to claiming. The full-retirement-age table by birth year now
// anchors both the factor AND the meaning of the statement amount.
//
// REFERENCE DATA (Social Security Act §216(l); schedule as published at ssa.gov, checked
// 2026-08-20 — the founder confirms against SSA guidance before launch; born Jan 1 counts as the
// prior year in SSA's own rule, a month-level nuance not modelled at whole-year inputs):
//   born ≤1954: 66 · 1955: 66y2m · 1956: 66y4m · 1957: 66y6m · 1958: 66y8m · 1959: 66y10m ·
//   born ≥1960: 67
export const EARLIEST_CLAIM_AGE = 62;
export const LATEST_CREDIT_AGE = 70;
/** Kept for callers that predate the table — the FRA for everyone born 1960 or later. */
export const FULL_RETIREMENT_AGE = 67;

/** Full retirement age in YEARS (fractional — 66y4m = 66.333…), from the birth year. */
export function fullRetirementAge(birthYear?: number | null): number {
  const y = Number(birthYear);
  // no birth year (null coerces to 0) → the 1960+ default, never the ≤1954 branch
  if (!y || !Number.isFinite(y) || y >= 1960) return 67;
  if (y <= 1954) return 66;
  return 66 + ((y - 1954) * 2) / 12;             // two months per birth year, 1955–1959
}

/** SSA factor for a claim age (62–70), relative to the statement amount at the person's OWN
 *  full retirement age. Month-precise: 5/9 of 1%/mo for the first 36 early months, 5/12 of 1%/mo
 *  beyond, 2/3 of 1%/mo delayed credit to 70. */
export function ssClaimFactorFor(claimAge: number, birthYear?: number | null): number {
  const fra = fullRetirementAge(birthYear);
  const a = Math.min(LATEST_CREDIT_AGE, Math.max(EARLIEST_CLAIM_AGE, Math.round(claimAge)));
  const months = Math.round((a - fra) * 12);
  if (months === 0) return 1;
  if (months < 0) {
    const early = -months;
    const first36 = Math.min(36, early);
    const beyond = Math.max(0, early - 36);
    return 1 - first36 * (5 / 9) / 100 - beyond * (5 / 12) / 100;
  }
  return 1 + months * (2 / 3) / 100;
}

/** The pre-table factor, anchored at 67 — unchanged behaviour for anyone born 1960+. */
export function ssClaimFactor(claimAge: number): number {
  return ssClaimFactorFor(claimAge, null);
}

/** Monthly benefit at a claim age from the at-FRA statement amount (today's dollars, whole $). */
export function ssBenefitAt(statementMonthly: number, claimAge: number, birthYear?: number | null): number {
  return Math.round((statementMonthly || 0) * ssClaimFactorFor(claimAge, birthYear));
}
/** Kept for callers not yet passing a birth year (behaves as born-1960+). */
export function ssBenefitAtClaimAge(statementMonthly: number, claimAge: number): number {
  return ssBenefitAt(statementMonthly, claimAge, null);
}

/** Total collected from claim age to a live-to age the USER sets (months × monthly, today's dollars). */
export function ssLifetimeTotal(statementMonthly: number, claimAge: number, liveToAge: number, birthYear?: number | null): number {
  const months = Math.max(0, Math.round((liveToAge - claimAge) * 12));
  return ssBenefitAt(statementMonthly, claimAge, birthYear) * months;
}

/** The FRA as words a person recognises — "67", or "66 and 4 months". */
export function fraLabel(birthYear?: number | null): string {
  const fra = fullRetirementAge(birthYear);
  const years = Math.floor(fra);
  const months = Math.round((fra - years) * 12);
  return months === 0 ? String(years) : `${years} and ${months} months`;
}

/** The claim window: the month the person turns 62 → the month they turn 70. */
export function claimWindow(birthYear: number | null, birthMonth: number | null): { opens: string; closes: string; opensYear: number; opensMonth: number } | null {
  if (!birthYear) return null;
  const m = birthMonth && birthMonth >= 1 && birthMonth <= 12 ? birthMonth : 1;
  const fmt = (y: number) => `${y}-${String(m).padStart(2, '0')}`;
  return { opens: fmt(birthYear + EARLIEST_CLAIM_AGE), closes: fmt(birthYear + LATEST_CREDIT_AGE), opensYear: birthYear + EARLIEST_CLAIM_AGE, opensMonth: m };
}
