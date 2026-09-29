/** THE DOOR FOR "what would this be worth had I moved it" — MK-NW-O-007 theLookBack (Q-PF-2).
 *
 *  On a screen about a road not taken, a filled-in gap does not read as an estimate — it reads as
 *  what would have happened. So: no history, no answer.
 */
import { theLookBack } from './look-back';

const NOW = new Date('2026-09-28T12:00:00Z');
const series = (startClose: number, endClose: number) => ({
  points: [
    { date: '2024-09-28', close: startClose },
    { date: '2026-09-28', close: endClose },
  ],
});

test('each leg is the amount grown by that fund’s own price move', () => {
  const r = theLookBack({ amount: 10000, fromSeries: series(100, 120), toSeries: series(100, 150), months: 24, now: NOW });
  expect(r).not.toBeNull();
  expect(r!.stayed.endValue).toBeCloseTo(12000, 2);
  expect(r!.moved.endValue).toBeCloseTo(15000, 2);
  expect(r!.difference).toBeCloseTo(3000, 2);
});

test('NO HISTORY, NO ANSWER — never a zero, never a shortened window', () => {
  expect(theLookBack({ amount: 10000, fromSeries: null, toSeries: series(100, 150), months: 24, now: NOW })).toBeNull();
  expect(theLookBack({ amount: 10000, fromSeries: series(100, 120), toSeries: null, months: 24, now: NOW })).toBeNull();
  expect(theLookBack({ amount: 10000, fromSeries: null, toSeries: null, months: 24, now: NOW })).toBeNull();
});

test('no amount means no question to answer', () => {
  expect(theLookBack({ amount: 0, fromSeries: series(100, 120), toSeries: series(100, 150), months: 24, now: NOW })).toBeNull();
});
