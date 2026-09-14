/** A36 (2026-09-12): the required-withdrawal start age follows the whole SECURE 2.0 schedule by birth
 *  year — not 73 for everyone born before 1960. */
import { rmdStartAge } from '../../../Calculation Module code/engines/rmd';

test('the schedule by birth year', () => {
  expect(rmdStartAge(1945)).toBe(70.5);
  expect(rmdStartAge(1948)).toBe(70.5);
  expect(rmdStartAge(1949)).toBe(72);
  expect(rmdStartAge(1950)).toBe(72);
  expect(rmdStartAge(1951)).toBe(73);
  expect(rmdStartAge(1959)).toBe(73);
  expect(rmdStartAge(1960)).toBe(75);
  expect(rmdStartAge(1971)).toBe(75);
});

test('no birth year: 73, declared as an assumption on the row, never silently', () => {
  expect(rmdStartAge(null)).toBe(73);
  expect(rmdStartAge(undefined)).toBe(73);
});
