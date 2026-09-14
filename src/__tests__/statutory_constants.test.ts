/**
 * EVERY STATUTORY CONSTANT, CHECKED AGAINST ITS PUBLISHED SOURCE — not against our own code.
 *
 * The founder's question, 2026-09-01: "how do I trust you did not make any mistake in formulas,
 * given the number of errors identified every time I review something?" The honest answer was to
 * stop checking the code against itself. This file types the published figures in by hand, from the
 * IRS releases and the SSA's rules, so the code has something REAL to disagree with.
 *
 * First run against the world found: IRA limits still at the 2025 figures, the 60–63 super catch-up
 * missing entirely, and four RMD divisors read 0.1 low because the table skipped ages and
 * interpolated — a $925 understatement of a required withdrawal on $500,000 at 98.
 */
import { TAX_TABLES, SENIOR_DEDUCTION, TAX_YEAR, seniorDeductionFor, deductionFor, taxOwedFor } from '../domain/income/tax';
import { UNIFORM_LIFETIME, rmdStartAge } from '../../Calculation Module code/engines/rmd';
import { ssClaimFactorFor, fullRetirementAge } from '../domain/retirement/ssTiming';

test('the 2026 bracket tables and deductions are the published ones', () => {
  // IRS tax year 2026 (Rev. Proc. figures as published)
  expect(TAX_TABLES.single.brackets.map((b) => b[0]).slice(0, 6)).toEqual([12_400, 50_400, 105_700, 201_775, 256_225, 640_600]);
  expect(TAX_TABLES.married.brackets.map((b) => b[0]).slice(0, 6)).toEqual([24_800, 100_800, 211_400, 403_550, 512_450, 768_700]);
  expect(TAX_TABLES.single.deduction).toBe(16_100);
  expect(TAX_TABLES.married.deduction).toBe(32_200);
  expect(TAX_TABLES.hoh.deduction).toBe(24_150);
  expect(TAX_TABLES.mfs.deduction).toBe(16_100);
});

test('the senior deduction is the published one — P.L. 119-21 §70103, $6,000 per person 65+, 6% phase-out above $75,000 / $150,000, 2025–2028 (G3, founder ruling 2026-09-08)', () => {
  expect(SENIOR_DEDUCTION.amount).toBe(6_000);
  expect(SENIOR_DEDUCTION.phaseOutStart.single).toBe(75_000);
  expect(SENIOR_DEDUCTION.phaseOutStart.hoh).toBe(75_000);
  expect(SENIOR_DEDUCTION.phaseOutStart.married).toBe(150_000);
  expect(SENIOR_DEDUCTION.phaseOutRate).toBe(0.06);
  expect([SENIOR_DEDUCTION.firstYear, SENIOR_DEDUCTION.lastYear]).toEqual([2025, 2028]);
  expect(SENIOR_DEDUCTION.eligible.mfs).toBe(false);          // married must file jointly to claim it
  expect(TAX_YEAR).toBeGreaterThanOrEqual(2025);
  expect(TAX_YEAR).toBeLessThanOrEqual(2028);                  // the year rolls past 2028 → this test fails on purpose: re-check the law

  // Worked examples, by hand from the published rule:
  expect(seniorDeductionFor('single', 1, 60_000)).toBe(6_000);                 // under the threshold: the full amount
  expect(seniorDeductionFor('single', 1, 100_000)).toBe(4_500);                // 6,000 − 6% × 25,000
  expect(seniorDeductionFor('single', 1, 175_000)).toBe(0);                    // fully phased out at exactly 175,000
  expect(seniorDeductionFor('married', 2, 200_000)).toBe(9_000);               // 12,000 − 6% × 50,000
  expect(seniorDeductionFor('mfs', 1, 30_000)).toBe(0);                        // filing separately: not eligible
  expect(seniorDeductionFor('single', 0, 30_000)).toBe(0);                     // nobody 65+
  expect(seniorDeductionFor('single', 1, null)).toBe(0);                       // income not known → never guessed

  // The reviewers' example (second verification G3): a 66-year-old single on $60,000.
  expect(deductionFor('single', 1, 60_000)).toBe(24_150);                      // 16,100 + 2,050 + 6,000
  expect(deductionFor('single', 0, 60_000)).toBe(16_100);                      // under 65: unchanged
  expect(Math.round(taxOwedFor(60_000, 'single', 0, 1))).toBe(4_054);          // was 4,774 — $720/year less, as the reviewers computed
  expect(deductionFor('married', 2, 200_000)).toBe(32_200 + 2 * 1_650 + 9_000); // 44,500
});

test('the RMD table IS the IRS Uniform Lifetime Table — every age, no gaps, nothing interpolated', () => {
  const IRS: Record<number, number> = {
    72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
    80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4,
    88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
    96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2,
    104: 4.9, 105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4,
    112: 3.3, 113: 3.1, 114: 3.0, 115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3, 120: 2.0,
  };
  expect(UNIFORM_LIFETIME).toEqual(IRS);
});

test('the RMD start age follows SECURE 2.0: 73, and 75 for those born 1960 or later', () => {
  expect(rmdStartAge(1955)).toBe(73);
  expect(rmdStartAge(1959)).toBe(73);
  expect(rmdStartAge(1960)).toBe(75);
  expect(rmdStartAge(1970)).toBe(75);
});

test("Social Security claim factors are the SSA's published ones (FRA 67)", () => {
  // ssa.gov: claim at 62 on an FRA of 67 → 70% of the full benefit; delay to 70 → 124%
  expect(fullRetirementAge(1960)).toBe(67);
  expect(ssClaimFactorFor(62, 1960)).toBeCloseTo(0.70, 4);
  expect(ssClaimFactorFor(65, 1960)).toBeCloseTo(1 - 24 * (5 / 9) / 100, 4);   // 86.67%
  expect(ssClaimFactorFor(67, 1960)).toBe(1);
  expect(ssClaimFactorFor(70, 1960)).toBeCloseTo(1.24, 4);
});
