/**
 * THE LAWS THE MONTH TABLE MUST OBEY — rung 5 of the verification ladder.
 *
 * `salaryByMonth` was twelve positions meaning January to December. The rolling frame let someone
 * describe the next twelve months, so a chip labelled JAN '27 wrote slot 0 — which the domain read
 * back as January of THIS year. The label said one year and the store meant another, and nothing
 * could tell them apart, because a slot carries no year to disagree with.
 *
 * These are laws, not worked examples: they must hold for every input, including the ones nobody
 * thought to try.
 */
import {
  monthKey, monthWindow, salaryMonths, hasMonthlySalaryTable,
  salaryCalendarYear, salaryWindow, withSalaryMonth, salaryYearFromCells,
} from './salary-months';

test('a month key is the LOCAL month, never the UTC one', () => {
  // 23:30 on the 31st, local. toISOString would already say the next month — and in the rolling
  // frame that is a whole month of pay filed under the wrong heading.
  const late = new Date(2026, 6, 31, 23, 30);
  expect(monthKey(late)).toBe('2026-07');
  expect(monthKey(new Date(2026, 0, 1, 0, 5))).toBe('2026-01');
});

test('a window keeps its own year when it runs past December', () => {
  const keys = monthWindow(new Date(2026, 7, 15), 1, 14);   // fourteen months from July 2026
  expect(keys).toHaveLength(14);
  expect(keys[0]).toBe('2026-07');
  expect(keys[13]).toBe('2027-08');
  expect(keys).toContain('2027-01');                        // the month that used to collide
  expect(new Set(keys).size).toBe(14);                      // no key means two different months
  expect([...keys].sort()).toEqual(keys);                   // strictly forward in time
});

test('an older twelve-slot table reads as this calendar year, unchanged', () => {
  const now = new Date(2026, 7, 15);
  const op: any = { salaryByMonth: Array.from({ length: 12 }, (_, i) => String((i + 1) * 100)) };
  const t = salaryMonths(op, now);
  expect(t['2026-01']).toBe(100);
  expect(t['2026-12']).toBe(1200);
  expect(Object.keys(t)).toHaveLength(12);
  // and the calendar-year view gives back exactly what it always did
  expect(salaryCalendarYear(op, 2026, 0, now)).toEqual([100,200,300,400,500,600,700,800,900,1000,1100,1200]);
});

test('a keyed table survives a round trip, across a year boundary', () => {
  const op: any = { salaryByMonth: { '2026-11': 4000, '2026-12': 9000, '2027-01': 4000 } };
  const t = salaryMonths(op);
  expect(t['2026-12']).toBe(9000);
  expect(t['2027-01']).toBe(4000);
  // December 2026 and January 2027 are different months and stay different
  expect(salaryCalendarYear(op, 2026, 0)[11]).toBe(9000);
  expect(salaryCalendarYear(op, 2027, 0)[0]).toBe(4000);
});

test('a month the table never mentions reads as the fallback, not as zero', () => {
  const op: any = { salaryByMonth: { '2026-08': 5000 } };
  expect(salaryCalendarYear(op, 2026, 3000)[0]).toBe(3000);   // January was never asked about
  expect(salaryCalendarYear(op, 2026, 3000)[7]).toBe(5000);   // August was
});

test('an empty table and a table of zeros are different answers', () => {
  expect(hasMonthlySalaryTable({} as any)).toBe(false);
  expect(hasMonthlySalaryTable({ salaryByMonth: {} } as any)).toBe(false);
  expect(hasMonthlySalaryTable({ salaryByMonth: { '2026-01': 0 } } as any)).toBe(true);
});

test('writing one month disturbs no other', () => {
  const op: any = { salaryByMonth: { '2026-07': 1000, '2026-08': 2000 } };
  const next = withSalaryMonth(op, '2026-08', 2500);
  expect(next).toEqual({ '2026-07': 1000, '2026-08': 2500 });
});

test('a window reads back in the order it was asked for', () => {
  const op: any = { salaryByMonth: { '2026-12': 9000 } };
  const rows = salaryWindow(op, monthWindow(new Date(2026, 11, 1), 1, 3), 4000);
  expect(rows).toEqual([['2026-11', 4000], ['2026-12', 9000], ['2027-01', 4000]]);
});

test('twelve cells written for a year land on that year', () => {
  const t = salaryYearFromCells(['1','2','3','4','5','6','7','8','9','10','11','12'], 2027);
  expect(t['2027-01']).toBe(1);
  expect(t['2027-12']).toBe(12);
  expect(Object.keys(t).every((k) => k.startsWith('2027-'))).toBe(true);
});
