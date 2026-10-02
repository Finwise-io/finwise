// F8 — Social Security claim-timing math (FCC detailed design v1.1, Plan sheet).
// The standard Social Security Administration schedule applied to YOUR statement amount — the
// monthly benefit at YOUR full retirement age: claiming early reduces the check 5/9 of 1% per
// month for the first 36 months and 5/12 of 1% per month beyond, waiting adds 2/3 of 1% per month
// (8%/year) to 70 — the same schedule as ssa.gov. Pure math, today's dollars, no opinion.
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
/* ─ MK-PL-F-057 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * fullRetirementAge
 *
 * Answers ..... Full retirement age in YEARS (fractional — 66y4m = 66.333…), from the birth year.
 *
 * Formula .....
 *     full retirement age = 67                          when born 1960 or later
 *                           66 + (birth year − 1954) × 2 months   when born 1955-1959
 *                           66                          when born 1954 or earlier
 *
 * Called by ... MK-PL-F-058 ssClaimFactorFor · MK-PL-F-063 fraLabel
 *
 * Reaches ..... 9 functions. Change the arithmetic above and these change with it:
 *               MK-PL-F-063 fraLabel · MK-CF-O-017 futurePaycheck
 *               MK-PL-F-068 selectWillItLast · MK-PL-F-060 ssBenefitAt
 *               MK-PL-F-061 ssBenefitAtClaimAge · MK-PL-F-059 ssClaimFactor
 *               MK-PL-F-058 ssClaimFactorFor · MK-PL-F-062 ssLifetimeTotal
 *               MK-PL-F-067 willItLastInputs
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-017 birth year
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-057
 * Changed ..... 2026-08-20 (16a56f7)
 */
export function fullRetirementAge(birthYear?: number | null): number {
  const y = Number(birthYear);
  // no birth year (null coerces to 0) → the 1960+ default, never the ≤1954 branch
  if (!y || !Number.isFinite(y) || y >= 1960) return 67;
  // A39 (2026-09-12): the whole published schedule, not only the 55–70 slice — a silent 66 for
  // someone born in 1940 was a wrong answer, not a refusal.
  if (y <= 1937) return 65;
  if (y <= 1942) return 65 + ((y - 1937) * 2) / 12;   // two months per birth year, 1938–1942
  if (y <= 1954) return 66;
  return 66 + ((y - 1954) * 2) / 12;             // two months per birth year, 1955–1959
}

/** SSA factor for a claim age (62–70), relative to the statement amount at the person's OWN
 *  full retirement age. Month-precise: 5/9 of 1%/month for the first 36 early months, 5/12 of 1%/month
 *  beyond, 2/3 of 1%/month delayed credit to 70. */
/* ─ MK-PL-F-058 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * ssClaimFactorFor
 *
 * Answers ..... SSA factor for a claim age (62–70), relative to the statement amount at the person's OWN full retirement age.
 *
 * Formula .....
 *     months = round(claim age) × 12 − full retirement age × 12
 *     factor = 1                                                   when months = 0
 *              1 − (first 36 early months × 5/9 of 1%)
 *                − (each further early month × 5/12 of 1%)          when claiming early
 *              1 + (each month claimed late × 2/3 of 1%)            when claiming late
 *
 * Called by ... MK-PL-F-059 ssClaimFactor · MK-PL-F-060 ssBenefitAt
 *
 * Reaches ..... 7 functions. Change the arithmetic above and these change with it:
 *               MK-CF-O-017 futurePaycheck · MK-PL-F-068 selectWillItLast
 *               MK-PL-F-060 ssBenefitAt · MK-PL-F-061 ssBenefitAtClaimAge
 *               MK-PL-F-059 ssClaimFactor · MK-PL-F-062 ssLifetimeTotal
 *               MK-PL-F-067 willItLastInputs
 *
 * Serves ...... MK-PL-M-019
 * Reads ....... MK-XS-I-017 birth year
 *               MK-XS-I-021 Social Security claim age
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Caps early at 36.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-058
 * Changed ..... 2026-08-20 (16a56f7)
 */
export function ssClaimFactorFor(claimAge: number, birthYear?: number | null): number {
  const fra = fullRetirementAge(birthYear);
  const a = Math.min(LATEST_CREDIT_AGE, Math.max(EARLIEST_CLAIM_AGE, claimAge));   // A38: months count — 62 and 6 months is not 63
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
/* ─ MK-PL-F-059 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * ssClaimFactor
 *
 * Answers ..... The pre-table factor, anchored at 67 — unchanged behaviour for anyone born 1960+.
 *
 * Formula .....
 *     ss claim factor for(claim age, nothing)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-021 Social Security claim age
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-059
 * Changed ..... 2026-08-20 (16a56f7)
 */
export function ssClaimFactor(claimAge: number): number {
  return ssClaimFactorFor(claimAge, null);
}

/** Monthly benefit at a claim age from the at-FRA statement amount (today's dollars, whole $). */
/* ─ MK-PL-F-060 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * ssBenefitAt
 *
 * Answers ..... Monthly benefit at a claim age from the at-FRA statement amount (today's dollars, whole $).
 *
 * Formula .....
 *     monthly benefit = statement amount at full retirement age × factor(claim age)
 *
 * Called by ... MK-PL-F-061 ssBenefitAtClaimAge · MK-PL-F-062 ssLifetimeTotal
 *               MK-PL-F-067 willItLastInputs
 *
 * Reaches ..... 5 functions. Change the arithmetic above and these change with it:
 *               MK-CF-O-017 futurePaycheck · MK-PL-F-068 selectWillItLast
 *               MK-PL-F-061 ssBenefitAtClaimAge · MK-PL-F-062 ssLifetimeTotal
 *               MK-PL-F-067 willItLastInputs
 *
 * Serves ...... MK-PL-M-017 · MK-PL-M-019
 * Reads ....... MK-XS-I-017 birth year
 *               MK-XS-I-020 Social Security monthly amount
 *               MK-XS-I-021 Social Security claim age
 *
 * Decides .....
 *     · If statement monthly is missing it counts as zero, so nothing recorded and a real zero look the same.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-060
 * Changed ..... 2026-08-20 (16a56f7)
 */
export function ssBenefitAt(statementMonthly: number, claimAge: number, birthYear?: number | null): number {
  return (statementMonthly || 0) * ssClaimFactorFor(claimAge, birthYear);   // Q49: full precision inside
}
/** Kept for callers not yet passing a birth year (behaves as born-1960+). */
/* ─ MK-PL-F-061 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * ssBenefitAtClaimAge
 *
 * Answers ..... Kept for callers not yet passing a birth year (behaves as born-1960+).
 *
 * Formula .....
 *     ss benefit at(statement monthly, claim age, nothing)
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-020 Social Security monthly amount
 *               MK-XS-I-021 Social Security claim age
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-061
 * Changed ..... 2026-08-20 (16a56f7)
 */
export function ssBenefitAtClaimAge(statementMonthly: number, claimAge: number): number {
  return ssBenefitAt(statementMonthly, claimAge, null);
}

/** Total collected from claim age to a live-to age the USER sets (months × monthly, today's dollars). */
/* ─ MK-PL-F-062 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * ssLifetimeTotal
 *
 * Answers ..... Total collected from claim age to a live-to age the USER sets (months × monthly, today's dollars).
 *
 * Formula .....
 *     months = max(0, round((live to age − claim age) × 12))
 *     the answer = ss benefit at(statement monthly, claim age, birth year) × months
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-017 birth year
 *               MK-XS-I-020 Social Security monthly amount
 *               MK-XS-I-021 Social Security claim age
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Rounds the answer to a whole number.
 *     · Monthly benefit × the months from the claim age to the life expectancy, in today's dollars — no cost-of-living rise and no discounting (A40). The retirement paycheck on another screen grows Social Security with inflation; this figure is the real-terms total, and the screen does not yet say so.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-062
 * Changed ..... 2026-08-20 (16a56f7)
 */
export function ssLifetimeTotal(statementMonthly: number, claimAge: number, liveToAge: number, birthYear?: number | null): number {
  const months = Math.max(0, Math.round((liveToAge - claimAge) * 12));
  return ssBenefitAt(statementMonthly, claimAge, birthYear) * months;
}

/** The FRA as words a person recognises — "67", or "66 and 4 months". */
/* ─ MK-PL-F-063 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * fraLabel
 *
 * Answers ..... The FRA as words a person recognises — "67", or "66 and 4 months".
 *
 * Formula .....
 *     fra = full retirement age(birth year)
 *     years = round down(fra)
 *     months = round((fra − years) × 12)
 *     the answer:
 *     string(years)   if months = 0
 *     `${years} and ${months} months`   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-017 birth year
 *
 * Decides .....
 *     · Turns a monthly figure into a year by multiplying by twelve.
 *     · Rounds the answer to a whole number.
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-063
 * Changed ..... 2026-08-20 (16a56f7)
 */
export function fraLabel(birthYear?: number | null): string {
  const fra = fullRetirementAge(birthYear);
  const years = Math.floor(fra);
  const months = Math.round((fra - years) * 12);
  return months === 0 ? String(years) : `${years} and ${months} months`;
}

/** The claim window: the month the person turns 62 → the month they turn 70. */
/* ─ MK-PL-F-064 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * claimWindow
 *
 * Answers ..... The claim window: the month the person turns 62 → the month they turn 70.
 *
 * Formula .....
 *     nothing   when birth year is missing
 *     m = birth month   if birth month and birth month ≥ 1 and birth month ≤ 12
 *     1   otherwise
 *     fmt = (y: number) => `${y}-${string(m).pad start(2, '0')}`
 *     the answer:
 *     opens = fmt(birth year + EARLIEST_CLAIM_AGE)
 *     closes = fmt(birth year + LATEST_CREDIT_AGE)
 *     opens year = birth year + EARLIEST_CLAIM_AGE
 *     opens month = m
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-017 birth year
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-064
 * Changed ..... 2026-08-02 (459ef30)
 */
export function claimWindow(birthYear: number | null, birthMonth: number | null): { opens: string; closes: string; opensYear: number; opensMonth: number } | null {
  if (!birthYear) return null;
  const m = birthMonth && birthMonth >= 1 && birthMonth <= 12 ? birthMonth : 1;
  const fmt = (y: number) => `${y}-${String(m).padStart(2, '0')}`;
  return { opens: fmt(birthYear + EARLIEST_CLAIM_AGE), closes: fmt(birthYear + LATEST_CREDIT_AGE), opensYear: birthYear + EARLIEST_CLAIM_AGE, opensMonth: m };
}
