/** G12 (founder, 2026-09-12): the month's outflow — expenses + debt paid — has ONE producer. */
import { monthOutflow } from './this-month';

test('a month with a snapshot: expenses plus the debt actually paid', () => {
  expect(monthOutflow({ spending: 3_200, debt_paid: 1_950 }, 999)).toBe(5_150);
  expect(monthOutflow({ spending: 3_200, debt_paid: null }, 999)).toBe(3_200);
});
test('a month without a snapshot: what has been logged so far', () => {
  expect(monthOutflow(null, 480)).toBe(480);
  expect(monthOutflow(undefined, 0)).toBe(0);
});
