/* A PERIOD THAT REACHES BACK FURTHER THAN THE PRICES DO — the laws (2026-10-04).
 *
 * Found holding the Holding page to its approved drawing, which says the window out loud ("Prices for
 * this holding go back 14 months, so the 2-year figure covers 14 months — not two years"). The figure
 * beside that sentence was still made yearly as though the prices covered two years.
 */
import { periodReturn } from './index';

const NOW = new Date('2026-10-04T12:00:00');
const iso = (monthsBack: number, daysMore = 0) => { const d = new Date(NOW); d.setMonth(d.getMonth() - monthsBack); d.setDate(d.getDate() - daysMore); return d.toISOString().slice(0, 10); };
// a third figure dates the point that many days further back. Since 2026-10-11 the beginning is the close of the
// day BEFORE the period's first day (DEC-0315; outside review Claude Performance), so the point the law starts
// from is dated that day — the laws and their numbers are unchanged.
const series = (pts: [number, number, number?][]) => ({ ticker: 'X', points: pts.map(([m, close, d]) => ({ date: iso(m, d ?? 0), close })) }) as any;

test('THE LAW: with two full years of prices, the 2-year figure is the yearly rate over two years', () => {
  expect(periodReturn(series([[30, 90], [24, 100, 1], [12, 110], [0, 121]]), '2Y', NOW)).toBeCloseTo(0.1, 9);   // 1.21 over two years
});

test('THE LAW: with fourteen months of prices, the yearly rate is over fourteen months — not two years', () => {
  const r = periodReturn(series([[14, 100], [6, 110], [0, 121]]), '2Y', NOW) as number;
  const years = (new Date(iso(0)).getTime() - new Date(iso(14)).getTime()) / (365.25 * 86_400_000);
  expect(r).toBeCloseTo(Math.pow(1.21, 1 / years) - 1, 9);
  expect(r).toBeGreaterThan(0.17);                                    // about +17.8% a year, where it used to read +10%
  expect(r).toBeLessThan(0.19);
});

test('THE LAW: a history of a year or less is never made yearly', () => {
  expect(periodReturn(series([[8, 100], [0, 121]]), '2Y', NOW)).toBeCloseTo(0.21, 9);                      // the eight months' own total
  expect(periodReturn(series([[12, 100], [0, 121]]), '2Y', NOW)).toBeCloseTo(0.21, 9);                     // exactly a year is not more than a year
});

test('the other periods are the period\'s own total, as before', () => {
  expect(periodReturn(series([[24, 100], [12, 110, 1], [0, 121]]), '1Y', NOW)).toBeCloseTo(0.1, 9);
  expect(periodReturn(series([[3, 100], [0, 121]]), '1Y', NOW)).toBeCloseTo(0.21, 9);
});
