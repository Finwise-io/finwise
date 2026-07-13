// F8 — Social Security claim-timing math (FCC detailed design v1.1, Plan sheet).
// The standard Social Security Administration schedule applied to YOUR statement amount (the monthly
// benefit at full retirement age 67): claiming early reduces the check ~6.67%/yr for the first three
// years (then 5%/yr), waiting adds 8%/yr past full age — the same schedule as ssa.gov. Pure math,
// today's dollars, no opinion. The 67 row ALWAYS equals the statement amount (factor 1.0, unit-pinned).

export const FULL_RETIREMENT_AGE = 67;   // for everyone born 1960 or later — the FCC 55-70 audience
export const EARLIEST_CLAIM_AGE = 62;
export const LATEST_CREDIT_AGE = 70;

/** SSA factor for a claim age (62–70), relative to the age-67 statement amount. */
export function ssClaimFactor(claimAge: number): number {
  const a = Math.min(LATEST_CREDIT_AGE, Math.max(EARLIEST_CLAIM_AGE, Math.round(claimAge)));
  if (a === FULL_RETIREMENT_AGE) return 1;
  if (a < FULL_RETIREMENT_AGE) {
    const early = FULL_RETIREMENT_AGE - a;                       // years early (1..5)
    const first3 = Math.min(3, early);
    const beyond = Math.max(0, early - 3);
    return 1 - first3 * (0.20 / 3) - beyond * 0.05;              // 6.67%/yr first 3, then 5%/yr
  }
  return 1 + (a - FULL_RETIREMENT_AGE) * 0.08;                   // delayed credit 8%/yr to 70
}

/** Monthly benefit at a claim age, from the statement amount (today's dollars, whole dollars). */
export function ssBenefitAtClaimAge(statementMonthly: number, claimAge: number): number {
  return Math.round((statementMonthly || 0) * ssClaimFactor(claimAge));
}

/** Total collected from claim age to a live-to age the USER sets (months × monthly, today's dollars). */
export function ssLifetimeTotal(statementMonthly: number, claimAge: number, liveToAge: number): number {
  const months = Math.max(0, Math.round((liveToAge - claimAge) * 12));
  return ssBenefitAtClaimAge(statementMonthly, claimAge) * months;
}

/** The claim window: the month the person turns 62 → the month they turn 70. */
export function claimWindow(birthYear: number | null, birthMonth: number | null): { opens: string; closes: string } | null {
  if (!birthYear) return null;
  const m = birthMonth && birthMonth >= 1 && birthMonth <= 12 ? birthMonth : 1;
  const fmt = (y: number) => `${y}-${String(m).padStart(2, '0')}`;
  return { opens: fmt(birthYear + EARLIEST_CLAIM_AGE), closes: fmt(birthYear + LATEST_CREDIT_AGE) };
}
