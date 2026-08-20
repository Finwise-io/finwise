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
export function rmdStartAge(birthYear?: number | null): number {
  const y = Number(birthYear);
  if (!y || !Number.isFinite(y)) return 73;
  return y >= 1960 ? 75 : 73;
}

/** The same rule when only an age is known (birth year ≈ this year − age; ±1 year of precision,
 *  which is what an age-only caller has). */
export function rmdStartAgeFromAge(age: number, nowYear: number): number {
  return rmdStartAge(nowYear - age);
}

/** IRS Uniform Lifetime Table divisors (post-2022). Interpolated between listed ages. */
export const UNIFORM_LIFETIME: Record<number, number> = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2,
  81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7,
  89: 12.9, 90: 12.2, 92: 10.8, 95: 8.9, 100: 6.4,
};

/** Divisor at an age, 0 before that person's start age. */
export function rmdDivisor(age: number, birthYear?: number | null): number {
  if (age < rmdStartAge(birthYear)) return 0;
  if (UNIFORM_LIFETIME[age]) return UNIFORM_LIFETIME[age];
  const ages = Object.keys(UNIFORM_LIFETIME).map(Number).sort((a, b) => a - b);
  if (age < ages[0]) return UNIFORM_LIFETIME[ages[0]];
  if (age >= ages[ages.length - 1]) return UNIFORM_LIFETIME[ages[ages.length - 1]];
  let lo = ages[0], hi = ages[ages.length - 1];
  for (const k of ages) { if (k <= age) lo = k; if (k >= age) { hi = k; break; } }
  const t = (age - lo) / (hi - lo || 1);
  return Math.round((UNIFORM_LIFETIME[lo] + t * (UNIFORM_LIFETIME[hi] - UNIFORM_LIFETIME[lo])) * 10) / 10;
}
