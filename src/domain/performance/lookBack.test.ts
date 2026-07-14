// Look-back engine pins: real prices only (no window → null, never an invented number), the design's
// worked example ($20k: BND −3% vs VTI +10.1% → $2,620 difference), and the signed difference
// (a move that would have LOST shows negative — closure, not regret-bait).
import { lookBack, factorOverMonths } from './lookBack';
import type { PriceSeries } from './index';

const NOW = new Date('2026-07-13T12:00:00Z');
const series = (ticker: string, startClose: number, endClose: number, startDate = '2025-06-01'): PriceSeries => ({
  ticker,
  points: [
    { date: startDate, close: startClose },
    { date: '2026-01-05', close: (startClose + endClose) / 2 },
    { date: '2026-07-10', close: endClose },
  ],
});

test("the design's worked example: $20,000, BND −3% vs VTI +10.1% → $2,620 more if moved", () => {
  const bnd = series('BND', 100, 97);
  const vti = series('VTI', 100, 110.1);
  const r = lookBack(20000, bnd, vti, 12, NOW)!;
  expect(r.stayed.endValue).toBe(19400);
  expect(r.stayed.delta).toBe(-600);
  expect(r.stayed.pct).toBe(-3);
  expect(r.moved.endValue).toBe(22020);
  expect(r.moved.pct).toBe(10.1);
  expect(r.difference).toBe(2620);
});

test('a move that would have LOST money reports a negative difference (the honest direction)', () => {
  const r = lookBack(10000, series('VTI', 100, 110), series('GLD', 100, 95), 12, NOW)!;
  expect(r.difference).toBeLessThan(0);
});

test('no window, no answer: a series that starts inside the window returns null — never extrapolated', () => {
  const young = series('NEW', 100, 120, '2026-03-01');   // only ~4 months of history
  expect(factorOverMonths(young, 12, NOW)).toBeNull();
  expect(lookBack(10000, young, series('VTI', 100, 110), 12, NOW)).toBeNull();
  expect(lookBack(10000, series('VTI', 100, 110), young, 12, NOW)).toBeNull();
});

test('zero or missing amount → null; empty series → null', () => {
  expect(lookBack(0, series('A', 1, 2), series('B', 1, 2), 12, NOW)).toBeNull();
  expect(lookBack(1000, { ticker: 'X', points: [] }, series('B', 1, 2), 12, NOW)).toBeNull();
});
