/** THE DOOR FOR "how much room is left" — MK-CF-O-005 theContributionRoom (Q-CF-4, ruled 2026-09-27).
 *  Three of his rulings live here, and these are their laws.
 */
import { theContributionRoom } from './contribution-room';

const thisYear = new Date().getFullYear();

test('G1: the age tested is the age ATTAINED IN THE YEAR, not the age today', () => {
  // someone turning 50 this year gets the catch-up for the whole year, whatever month it is
  const turning50 = theContributionRoom({ profile: { birthYear: thisYear - 50 } });
  expect(turning50.age).toBe(50);
  expect(turning50.k401.catchUp).toBe(true);
  const turning49 = theContributionRoom({ profile: { birthYear: thisYear - 49 } });
  expect(turning49.k401.catchUp).toBe(false);
  expect(turning49.k401.limit).toBeLessThan(turning50.k401.limit);
});

test('G10: enrolled in Medicare means NO HSA contribution at all — not a smaller one', () => {
  const onMedicare = theContributionRoom({ profile: { birthYear: thisYear - 67, medicareEnrolled: 'yes' } });
  expect(onMedicare.hsa.limit).toBe(0);
  expect(onMedicare.hsa.remaining).toBe(0);
  expect(onMedicare.hsaBarredByMedicare).toBe(true);
  const notOnIt = theContributionRoom({ profile: { birthYear: thisYear - 67, medicareEnrolled: 'no' } });
  expect(notOnIt.hsa.limit).toBeGreaterThan(0);
});

test('G36: this month COUNTS as remaining, so the per-month figure is not overstated', () => {
  const r = theContributionRoom({ profile: { birthYear: thisYear - 40 } });
  const monthsLeftIfThisOneCounts = 12 - new Date().getMonth();
  expect(r.monthsLeft).toBe(monthsLeftIfThisOneCounts);
  // rounded to the nearest $100 — a savings instruction to the dollar is false precision
  expect(r.perMonthToFill401k).toBe(Math.round(r.k401.remaining / r.monthsLeft / 100) * 100);
});

test('what has gone in is never shown above the limit', () => {
  const r = theContributionRoom({ profile: { birthYear: thisYear - 40, c_401k: 99999 } });
  expect(r.k401.used).toBe(r.k401.limit);
  expect(r.k401.remaining).toBe(0);
});

test('no birth year: the base limit stands, and no catch-up is claimed', () => {
  const r = theContributionRoom({ profile: {} });
  expect(r.age).toBeNull();
  expect(r.k401.catchUp).toBe(false);
  expect(r.k401.limit).toBeGreaterThan(0);
});
