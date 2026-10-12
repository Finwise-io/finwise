// DEC-3768b (his approval, 2026-10-10): a window that reaches back whole months stops at the month's last day.
import { startDateFor } from './index';
const ymd = (d: Date | null) => d == null ? null : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

// DEC-4640 (his approval, 2026-10-12): a window name the app does not have gives no start — never a guess.
test('a window name the app does not have refuses', () => {
  expect(startDateFor('5Y' as any, at('2026-10-10'))).toBeNull();
  expect(startDateFor('' as any, at('2026-10-10'))).toBeNull();
});
test('every function that turns a window name into a start refuses the same unknown name (DEC-4640)', () => {
  const { periodReturn, buildPerformance } = require('./index');
  const { windowStartKey } = require('../../../MoneyKeel/functions/networth-and-performance/performance');
  const s = { ticker: 'VTI', points: [{ date: '2020-01-02', close: 100 }, { date: '2026-10-09', close: 200 }] };
  expect(periodReturn(s, '5Y', at('2026-10-10'))).toBeNull();
  const [row] = buildPerformance([{ position_id: 'p', ticker: 'VTI', lots: [{ lot_id: 'l', shares: 1, cost_per_share: 100, purchase_date: '2020-01-02' }] }], () => s, '5Y', at('2026-10-10'));
  expect([row.periodReturn, row.periodTotal, row.cappedSince]).toEqual([null, null, null]);
  expect(windowStartKey('5Y', ['2024-06-03'], '2026-10-10')).toBeNull();
  // the names the screens offer still answer: 1Y from 2026-10-10 opens 2025-10-10
  expect(windowStartKey('1Y', [], '2026-10-10')).toBe('2025-10-10');
  expect(windowStartKey('YTD', [], '2026-10-10')).toBe('2026-01-01');
});

// "SINCE" has no fixed length: its first day is the record's, which the caller hands over. It used to be read as TODAY,
// so a holding's Since figure was that one day's move (found applying DEC-4640, 2026-10-12).
test('Since is measured from the first day handed over — never from today', () => {
  const { buildPerformance } = require('./index');
  const s = { ticker: 'VTI', points: [{ date: '2026-06-30', close: 100 }, { date: '2026-10-08', close: 110 }, { date: '2026-10-09', close: 111 }] };
  const pos = [{ position_id: 'p', ticker: 'VTI', lots: [{ lot_id: 'l', shares: 1, cost_per_share: 90, purchase_date: '2026-01-02' }] }];
  // the record began 2026-06-30, so Since opens 2026-07-01 and its beginning is the 2026-06-30 close: 111 ÷ 100 − 1
  const [since] = buildPerformance(pos, () => s, 'SINCE', at('2026-10-10'), undefined, '2026-07-01');
  expect(since.periodReturn).toBeCloseTo(0.11, 12);
  expect(since.periodTotal).toBeCloseTo(0.11, 12);
  // without its first day, "SINCE" is not a window the app can open: no figure, and not one day's move (111 ÷ 110 − 1)
  const [none] = buildPerformance(pos, () => s, 'SINCE', at('2026-10-10'));
  expect(none.periodReturn).toBeNull();
});
