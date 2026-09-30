// ENGINE — required minimum distributions: ONE dated, sourced table (B4, founder brief 2026-08-20).
//
// THE DEFECT THIS REPLACES: the start age lived as the literal 73 in TWO files (the decumulation
// module and a mirror inside the simulation), for a rule legislation has already moved more than
// once. A rule that changes by statute lives as reference data in one place, with its source and
// date — never as a literal in engine logic.
//
// REFERENCE DATA — checked 2026-08-20 against the statute text; the founder confirms against IRS
// guidance before launch (all statutory figures are directional until then):
//   · SECURE 2.0 Act §107 (Pub. L. 117-328, 2022-12-29): the required beginning age is 73 for
//     people born 1951–1959 and 75 for people born 1960 or later. (Born 1950 or earlier: already
//     under way at 72 or 70½ — ages this audience's rule below returns 73 for, which is correct
//     for anyone the app can still be FORWARD-planning for.)
//   · Roth money: a Roth IRA has no lifetime RMD, and SECURE 2.0 §325 ended lifetime RMDs for
//     workplace Roth (Roth 401(k)) from 2024. The app's bucket math already excludes every
//     ROTH-bucket account from the pre-tax base, so Roth 401(k)s are exempt BY CONSTRUCTION —
//     pinned by test, not by comment.
//   · Divisors: the IRS Uniform Lifetime Table, Treas. Reg. §1.401(a)(9)-9 (post-2022 values).
export const RMD_RULE_ASOF = '2026-08-20';

/** The age required withdrawals begin, by birth year. Unknown birth year → 73, the earlier age —
 *  the conservative direction (planning for withdrawals a year early beats missing one). */
/* ─ MK-ST-F-024 ───────────────────────────────────────────────────────────────── 2 · DISPLAYED
 * rmdStartAge
 *
 * Answers ..... The age required withdrawals begin, by birth year.
 *
 * Formula .....
 *     start age = 75   when born 1960 or later
 *                 73   otherwise
 *
 * Called by ... MK-PL-F-006 rmdDivisor · MK-ST-F-025 rmdStartAgeFromAge
 *
 * Reaches ..... 34 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-101 PLAN · MK-CF-F-107 buildPaycheckYear
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-PL-F-003 depletionAge · MK-PL-F-010 drawOrderOutcome
 *               MK-PL-F-043 howTheGapCloses · MK-PL-F-046 leverDeltas
 *               MK-CF-F-042 mortgageOddsEffect · MK-PL-F-027 nextDecision
 *               MK-PL-F-069 oddsAt · MK-PL-F-071 oddsOf
 *               MK-PL-F-044 planTarget · MK-PL-F-055 projectNestEgg
 *               MK-PL-F-041 requiredAnnualSaving · MK-PL-F-035 retireAgeWithContribution
 *               MK-PL-F-006 rmdDivisor · MK-PL-F-008 rmdSchedule
 *               … and 16 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-017 birth year
 *
 * Decides .....
 *     · When the birth year is missing the start age is taken as 73 — the rule for those born 1951–1959, the middle of the 55–70 audience (A36). The whole schedule is coded: 70½ before 1949, 72 for 1949–1950, 73 for 1951–1959, 75 from 1960.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-024
 * Changed ..... 2026-08-20 (16a56f7)
 */
export function rmdStartAge(birthYear?: number | null): number {
  const y = Number(birthYear);
  if (!y || !Number.isFinite(y)) return 73;   // no birth year: taken as 73 — declared as an assumption on the row (A36)
  // A36 (2026-09-12): the whole SECURE 2.0 schedule — 70½ for those born before 1949 was reached,
  // 72 for 1949–1950, 73 for 1951–1959, 75 from 1960.
  if (y <= 1948) return 70.5;
  if (y <= 1950) return 72;
  return y >= 1960 ? 75 : 73;
}

/** The same rule when only an age is known (birth year ≈ this year − age; ±1 year of precision,
 *  which is what an age-only caller has). */
/* ─ MK-ST-F-025 ───────────────────────────────────────────────────────────────── 3 · DEPENDENT
 * rmdStartAgeFromAge
 *
 * Answers ..... The same rule when only an age is known (birth year ≈ this year − age; ±1 year of precision, which is what an age-only caller has).
 *
 * Formula .....
 *     rmd start age(now year − age)
 *
 * Called by ... MK-PL-F-005 rmdStartAgeFor · MK-PL-F-050 simulate
 *
 * Reaches ..... 32 functions. Change the arithmetic above and these change with it:
 *               MK-NW-F-101 PLAN · MK-CF-F-107 buildPaycheckYear
 *               MK-PL-F-053 buildRetirementState · MK-XS-F-031 buildSnapshot
 *               MK-PL-F-003 depletionAge · MK-PL-F-010 drawOrderOutcome
 *               MK-PL-F-043 howTheGapCloses · MK-PL-F-046 leverDeltas
 *               MK-CF-F-042 mortgageOddsEffect · MK-PL-F-027 nextDecision
 *               MK-PL-F-069 oddsAt · MK-PL-F-071 oddsOf
 *               MK-PL-F-044 planTarget · MK-PL-F-055 projectNestEgg
 *               MK-PL-F-041 requiredAnnualSaving · MK-PL-F-035 retireAgeWithContribution
 *               MK-PL-F-008 rmdSchedule · MK-PL-F-005 rmdStartAgeFor
 *               … and 14 more — the full list is on functions_from_code
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 *
 * Formula also on the master file · functions_from_code · MK-ST-F-025
 * Changed ..... 2026-08-20 (16a56f7)
 */
export function rmdStartAgeFromAge(age: number, nowYear: number): number {
  return rmdStartAge(nowYear - age);
}

/** IRS Uniform Lifetime Table divisors (post-2022). Interpolated between listed ages. */
// COMPLETE, 72 to 120+, checked against the published IRS table on 2026-09-01. It used to skip
// ages 91, 93–94 and 96–99 and interpolate between neighbours, which read 0.1 LOW at 93, 97, 98
// and 99 — on a $500,000 balance at 98 that is a $925 understatement of a legally required
// withdrawal, and under-withdrawing an RMD is what the IRS penalises. A statutory table is typed
// in whole or not at all.
export const UNIFORM_LIFETIME: Record<number, number> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
  80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4,
  88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
  96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2,
  104: 4.9, 105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4,
  112: 3.3, 113: 3.1, 114: 3.0, 115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3,
  120: 2.0,
};

/** Divisor at an age, 0 before that person's start age. */
/* ─ MK-PL-F-006 ────────────────────────────────────────── 3 · DEPENDENT (feeds an action only)
 * rmdDivisor
 *
 * Answers ..... Divisor at an age, 0 before that person's start age.
 *
 * Formula .....
 *     divisor(age) = 0                        when age is below the start age
 *                    the table value at age   when the table lists that age
 *                    straight-line between the two nearest listed ages   otherwise
 *
 * Called by ... nothing — it is an entry point, or nothing reaches it
 *
 * Serves ...... NO FIGURE ON RECORD names this function. That is an S21 gap, not proof it reaches nobody.
 * Reads ....... MK-XS-I-017 birth year
 *
 * Formula also on the master file · functions_from_code · MK-PL-F-006
 * Changed ..... 2026-08-20 (16a56f7)
 */
export function rmdDivisor(age: number, birthYear?: number | null): number {
  if (age < rmdStartAge(birthYear)) return 0;
  // The table is complete from 72 to 120, so nothing between is ever estimated. Past 120 the IRS
  // row is "120 and over": the 2.0 stands for every later age.
  return UNIFORM_LIFETIME[Math.min(120, Math.max(72, Math.floor(age)))];
}
