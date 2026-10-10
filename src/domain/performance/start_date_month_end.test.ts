// DEC-3768b (his approval, 2026-10-10): a window that reaches back whole months stops at the month's last day.
import { startDateFor } from './index';
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const at = (s: string) => new Date(`${s}T12:00:00`);
test('Mar 31 less one month is Feb 28, never Mar 3', () => { expect(ymd(startDateFor('1M', at('2026-03-31')))).toBe('2026-02-28'); });
test('a leap year keeps Feb 29; Feb 29 less a year is Feb 28', () => {
  expect(ymd(startDateFor('1M', at('2024-03-31')))).toBe('2024-02-29');
  expect(ymd(startDateFor('1Y', at('2024-02-29')))).toBe('2023-02-28');
});
test('six months back from Aug 31 is Feb 28; an ordinary day is unchanged', () => {
  expect(ymd(startDateFor('6M', at('2026-08-31')))).toBe('2026-02-28');
  expect(ymd(startDateFor('3M', at('2026-10-09')))).toBe('2026-07-09');
  expect(ymd(startDateFor('YTD', at('2026-10-09')))).toBe('2026-01-01');
});
