/** G9 (founder, 2026-09-12): the age a screen shows and the plan runs on is birthday-aware when the birth
 *  month is known, the year-attained age when only the year is known, and nothing when neither is. The
 *  contribution limits keep the year-attained age (G1). */
import { ageToday } from './calc';
import { ageAttainedInYear } from '../income/limits';

const SEPT_2026 = new Date(2026, 8, 12);

test('born December 1971: 54 today, 55 for the year\'s limits', () => {
  expect(ageToday(1971, 12, SEPT_2026)).toBe(54);
  expect(ageAttainedInYear(1971, SEPT_2026)).toBe(55);
});
test('born March 1971: 55 on both counts', () => {
  expect(ageToday(1971, 3, SEPT_2026)).toBe(55);
});
test('month unknown → the year-attained age, never a stand-in June', () => {
  expect(ageToday(1971, null, SEPT_2026)).toBe(55);
  expect(ageToday(1971, 0, SEPT_2026)).toBe(55);
});
test('birth year unknown → nothing', () => {
  expect(ageToday(null, 12, SEPT_2026)).toBeNull();
  expect(ageToday(undefined, undefined, SEPT_2026)).toBeNull();
});
