/** G36 (founder, 2026-09-12): the current month counts as remaining — December divides by 1. */
import { monthsLeftInYear, perMonthToFill } from './limits';

test('the current month counts', () => {
  expect(monthsLeftInYear(new Date(2026, 0, 15))).toBe(12);
  expect(monthsLeftInYear(new Date(2026, 8, 12))).toBe(4);
  expect(monthsLeftInYear(new Date(2026, 11, 31))).toBe(1);
});
test('per month to fill the room, rounded to $100 for display', () => {
  expect(perMonthToFill(8_000, new Date(2026, 8, 12))).toBe(2_000);
  expect(perMonthToFill(8_000, new Date(2026, 11, 1))).toBe(8_000);
  expect(perMonthToFill(1_234, new Date(2026, 8, 12))).toBe(300);
});
