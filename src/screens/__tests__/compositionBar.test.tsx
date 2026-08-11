// THE COMPOSITION BAR's arithmetic (founder decision 2026-08-11, audit Q6 — the bar replaces the
// donut on Net worth, and What you owe gets one of its own).
//
// Two promises this pins:
//   1. the percentages ALWAYS total 100 — whole-percent rounding leaves a remainder, and the
//      remainder goes to the largest slice rather than letting the bar over- or under-run;
//   2. nothing is silently dropped — a slice too small to round to 1% still gets a visible mark and
//      still appears in the legend.
import { barSegments } from '../NetWorthScreen';

const row = (key: string, total: number) => ({ key, label: key, color: '#000', total });

test('percentages total exactly 100, even when every slice rounds down', () => {
  // three thirds: 33.33 each → rounds to 99 without the remainder rule
  const segs = barSegments([row('a', 1), row('b', 1), row('c', 1)]);
  expect(segs.reduce((t, s) => t + s.pct, 0)).toBe(100);
});

test('percentages total exactly 100 when rounding overshoots', () => {
  // 5 × 12.5% + 37.5% → naive rounding gives 13×5 + 38 = 103
  const segs = barSegments([row('a', 3), row('b', 1), row('c', 1), row('d', 1), row('e', 1), row('f', 1)]);
  expect(segs.reduce((t, s) => t + s.pct, 0)).toBe(100);
});

test('the remainder lands on the LARGEST slice, never on a sliver', () => {
  const segs = barSegments([row('big', 999), row('tiny', 1)]);
  expect(segs.find((s) => s.key === 'big')!.pct).toBe(100);
  expect(segs.find((s) => s.key === 'tiny')!.pct).toBe(0);   // shown as "<1%" — see below
});

test('the real Net-worth split reconciles: 55 + 43 + 1 + 1 = 100', () => {
  const segs = barSegments([
    row('real_estate', 450000), row('stocks_etf', 348495), row('cash', 8838), row('bonds', 5819),
  ]);
  expect(segs.map((s) => s.pct)).toEqual([55, 43, 1, 1]);
  expect(segs.reduce((t, s) => t + s.pct, 0)).toBe(100);
});

test('the debts split reconciles too: 99 + 1 = 100', () => {
  const segs = barSegments([row('mortgage', 412000), row('card', 6000)]);
  expect(segs.reduce((t, s) => t + s.pct, 0)).toBe(100);
});

test('a sliver still gets a visible mark rather than a zero-width segment', () => {
  const segs = barSegments([row('big', 999999), row('tiny', 1)]);
  expect(segs.find((s) => s.key === 'tiny')!.width).toBeGreaterThan(0);
});

test('nothing to show → no bar at all (never an empty frame or a fake 100%)', () => {
  expect(barSegments([])).toEqual([]);
  expect(barSegments([row('a', 0)])).toEqual([]);
});
