/** G1 (founder agreed 2026-09-12): every contribution limit uses the age attained at any time in the
 *  calendar year — the IRS test — never the birthday-aware age. */
import { ageAttainedInYear, annual401kLimit, annualIraLimit, annualHsaLimit, IRS_LIMITS } from './limits';

const SEPT_2026 = new Date(2026, 8, 12);

test('someone turning 60 in November is 60 for the whole year — the super catch-up applies now', () => {
  const age = ageAttainedInYear(1966, SEPT_2026);
  expect(age).toBe(60);
  expect(annual401kLimit(age)).toBe(IRS_LIMITS.elective_deferral_401k + IRS_LIMITS.super_catch_up_60_63);
  // the birthday-aware reading (59 until November) would have offered only the 50+ catch-up
  expect(annual401kLimit(59)).toBe(IRS_LIMITS.elective_deferral_401k + IRS_LIMITS.catch_up_50);
});

test('turning 50 in December still counts; turning 55 counts for the HSA', () => {
  expect(annualIraLimit(ageAttainedInYear(1976, SEPT_2026))).toBe(IRS_LIMITS.ira + IRS_LIMITS.ira_catch_up_50);
  expect(annualHsaLimit(ageAttainedInYear(1971, SEPT_2026)!, false, false)).toBeGreaterThan(annualHsaLimit(54, false, false));
});

test('no birth year → no age, and the limit is the base with no catch-up', () => {
  expect(ageAttainedInYear(null)).toBeNull();
  expect(ageAttainedInYear(undefined)).toBeNull();
  expect(annual401kLimit(null)).toBe(IRS_LIMITS.elective_deferral_401k);
});
